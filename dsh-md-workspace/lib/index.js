// dsh-md-workspace — host half.
//
// Registers a small set of exact HTTP routes on ctx.webServer that expose a
// workspace-confined file surface for the browser half:
//
//   GET  /mdw/root             -> { root }          (the current live session's workspace,
//                                                    falling back to the sandbox workspace root)
//   GET  /mdw/list?path=…      -> one-level listing (bounded)
//   GET  /mdw/read?path=…      -> text content { content, version, size }
//   POST /mdw/write            -> { path, content, version?, force? } atomic write
//
// Confinement: every path is resolved through ctx.fs (which realpaths, so a
// symlink inside the workspace cannot smuggle in an outside target) and then
// checked with fs.contains() against the allowed roots — the current live
// sessions' cwds, ctx.sandboxPolicy.workspaceRoot, plus any EXTRA_ROOTS you
// opt into. Writes additionally carry the resolved sandbox policy into
// fs.writeText so the sandboxing backend can fence them itself.
//
// Trust fence: every route rejects requests whose Host is not loopback, whose
// Origin (when present) does not match the Host authority, or whose
// Sec-Fetch-Site marks a cross-site request. This closes the DNS-rebinding
// read path and the cross-site write (CSRF) path on plain localhost HTTP.

import { isAbsolute } from "node:path";

const name = "dsh-md-workspace";
const inject = ["fs", "webServer", "sandboxPolicy", "sessions"];

// Absolute directories additionally allowed for reads/writes beyond the
// workspace root. Keep empty for strict workspace confinement.
const EXTRA_ROOTS = [];

const MAX_LIST_ENTRIES = 2000;
const MAX_READ_BYTES = 8 * 1024 * 1024; // 8 MiB text reads
const MAX_WRITE_BYTES = 20 * 1024 * 1024; // 20 MiB writes

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(data);
}

function sendError(res, status, code, message) {
  sendJson(res, status, { error: { code, message } });
}

function errorCode(error) {
  if (error && typeof error === "object" && typeof error.code === "string") return error.code;
  return "FS_IO_ERROR";
}

function errorMessage(error) {
  if (error && typeof error === "object" && typeof error.message === "string") return error.message;
  return String(error);
}

function codeError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

function header(headers, name) {
  const value = headers[name];
  return typeof value === "string" ? value : undefined;
}

function parseAuthority(authority) {
  try {
    return new URL(`http://${authority}`);
  } catch {
    return undefined;
  }
}

function isLoopbackHostname(hostname) {
  if (hostname === "localhost" || hostname === "[::1]") return true;
  const parts = hostname.split(".");
  return parts.length === 4 && parts[0] === "127"
    && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}

/** Browser-trust fence: loopback Host + same-origin browser markers only. */
function isTrustedRequest(req) {
  const host = header(req.headers, "host");
  if (host === undefined) return false;
  const hostUrl = parseAuthority(host);
  if (hostUrl === undefined) return false;
  if (!isLoopbackHostname(hostUrl.hostname)) return false;
  if (header(req.headers, "sec-fetch-site") === "cross-site") return false;
  const origin = header(req.headers, "origin");
  if (origin === undefined) return true;
  try {
    return new URL(origin).host === hostUrl.host;
  } catch {
    return false;
  }
}

/** Read the request body as UTF-8, bounded. */
async function readBody(req, maxBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw codeError("TOO_LARGE", "request body too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function requireAbsolute(path) {
  if (typeof path !== "string" || path.length === 0) {
    return { error: "a non-empty absolute path is required" };
  }
  if (!isAbsolute(path)) {
    return { error: `"${path}" is not an absolute path` };
  }
  return { path };
}

/** Decode a bounded byte read as strict UTF-8 text, rejecting binary. */
function decodeText(bytes) {
  if (bytes.length === 0) return "";
  const head = bytes.subarray(0, Math.min(bytes.length, 8192));
  for (let i = 0; i < head.length; i++) {
    if (head[i] === 0) throw codeError("FS_NOT_TEXT", "not a UTF-8 text file (contains NUL bytes)");
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw codeError("FS_NOT_TEXT", "not a valid UTF-8 text file");
  }
}

async function apply(ctx) {
  ctx.effect(() => {
    const disposers = [];
    const routes = [];

    const root = () => ctx.sandboxPolicy.workspaceRoot;

    /** Absolute workspace cwds of every live session, deduped, in creation order. */
    function liveRoots() {
      const out = [];
      try {
        const sessions = ctx.sessions && typeof ctx.sessions.list === "function" ? ctx.sessions.list() : [];
        for (const s of sessions) {
          const cwd = s && s.header && s.header.cwd;
          if (typeof cwd === "string" && isAbsolute(cwd) && !out.includes(cwd)) out.push(cwd);
        }
      } catch {
        // session store unavailable — fall back to the sandbox workspace root only
      }
      return out;
    }

    /** Resolve an absolute path and require it to live under an allowed root. */
    async function resolveWithin(rawPath) {
      const target = await ctx.fs.resolve(rawPath);
      const roots = [root(), ...liveRoots(), ...EXTRA_ROOTS].filter((p) => typeof p === "string" && p.length > 0);
      for (const r of roots) {
        const parent = await ctx.fs.resolve(r);
        if (ctx.fs.contains(parent, target)) return { target };
      }
      return { error: `"${rawPath}" is outside the allowed workspace roots` };
    }

    // GET /mdw/root
    routes.push({
      kind: "exact",
      path: "/mdw/root",
      handler(req, res) {
        if (!isTrustedRequest(req)) return sendError(res, 403, "FORBIDDEN", "untrusted request origin/host");
        if (req.method !== "GET") return sendError(res, 405, "METHOD_NOT_ALLOWED", "GET only");
        const live = liveRoots();
        sendJson(res, 200, { root: live.length > 0 ? live[live.length - 1] : root() });
      },
    });

    // GET /mdw/list?path=…
    routes.push({
      kind: "exact",
      path: "/mdw/list",
      async handler(req, res) {
        if (!isTrustedRequest(req)) return sendError(res, 403, "FORBIDDEN", "untrusted request origin/host");
        if (req.method !== "GET") return sendError(res, 405, "METHOD_NOT_ALLOWED", "GET only");
        const url = new URL(req.url ?? "/", "http://localhost");
        const check = requireAbsolute(url.searchParams.get("path"));
        if (check.error) return sendError(res, 400, "BAD_PATH", check.error);
        try {
          const r = await resolveWithin(check.path);
          if (r.error) return sendError(res, 403, "FS_OUTSIDE_WORKSPACE", r.error);
          const entries = await ctx.fs.listDir(r.target);
          const truncated = entries.length > MAX_LIST_ENTRIES;
          const rows = (truncated ? entries.slice(0, MAX_LIST_ENTRIES) : entries).map((entry) => ({
            name: entry.name,
            type: entry.type,
            ...(entry.size !== undefined ? { size: entry.size } : {}),
            ...(entry.version !== undefined ? { version: entry.version } : {}),
          }));
          sendJson(res, 200, {
            path: r.target.displayPath,
            root: root(),
            entries: rows,
            truncated,
          });
        } catch (error) {
          const status = errorCode(error) === "FS_NOT_FOUND" ? 404
            : errorCode(error) === "FS_NOT_DIRECTORY" ? 400
            : errorCode(error) === "FS_PERMISSION_DENIED" ? 403 : 500;
          sendError(res, status, errorCode(error), errorMessage(error));
        }
      },
    });

    // GET /mdw/read?path=…
    routes.push({
      kind: "exact",
      path: "/mdw/read",
      async handler(req, res) {
        if (!isTrustedRequest(req)) return sendError(res, 403, "FORBIDDEN", "untrusted request origin/host");
        if (req.method !== "GET") return sendError(res, 405, "METHOD_NOT_ALLOWED", "GET only");
        const url = new URL(req.url ?? "/", "http://localhost");
        const check = requireAbsolute(url.searchParams.get("path"));
        if (check.error) return sendError(res, 400, "BAD_PATH", check.error);
        try {
          const r = await resolveWithin(check.path);
          if (r.error) return sendError(res, 403, "FS_OUTSIDE_WORKSPACE", r.error);
          const info = await ctx.fs.stat(r.target);
          if (!info) return sendJson(res, 200, { path: r.target.displayPath, missing: true });
          if (info.type !== "file") {
            return sendJson(res, 200, { path: r.target.displayPath, type: info.type, content: "" });
          }
          // Bounded at the seam: readBytes fails with FS_TOO_LARGE instead of buffering.
          const bytes = await ctx.fs.readBytes(r.target, undefined, MAX_READ_BYTES);
          const content = decodeText(bytes);
          sendJson(res, 200, {
            path: r.target.displayPath,
            type: info.type,
            content,
            ...(info.version !== undefined ? { version: info.version } : {}),
            ...(info.size !== undefined ? { size: info.size } : {}),
          });
        } catch (error) {
          const status = errorCode(error) === "FS_NOT_TEXT" ? 415
            : errorCode(error) === "FS_TOO_LARGE" ? 413
            : errorCode(error) === "FS_NOT_FOUND" ? 404
            : errorCode(error) === "FS_PERMISSION_DENIED" ? 403 : 500;
          sendError(res, status, errorCode(error), errorMessage(error));
        }
      },
    });

    // POST /mdw/write   body: { path, content, version?, force? }
    routes.push({
      kind: "exact",
      path: "/mdw/write",
      async handler(req, res) {
        if (!isTrustedRequest(req)) return sendError(res, 403, "FORBIDDEN", "untrusted request origin/host");
        if (req.method !== "POST") return sendError(res, 405, "METHOD_NOT_ALLOWED", "POST only");
        let body;
        try {
          body = JSON.parse(await readBody(req, MAX_WRITE_BYTES + 4096));
        } catch (error) {
          return sendError(res, 400, "BAD_BODY", errorCode(error) === "TOO_LARGE" ? "body too large" : "invalid JSON body");
        }
        const check = requireAbsolute(body?.path);
        if (check.error) return sendError(res, 400, "BAD_PATH", check.error);
        if (typeof body.content !== "string") return sendError(res, 400, "BAD_CONTENT", "content must be a string");
        try {
          const r = await resolveWithin(body.path);
          if (r.error) return sendError(res, 403, "FS_OUTSIDE_WORKSPACE", r.error);
          const force = body.force === true;
          const expected = !force && body.version ? { kind: "replaceIfVersion", version: body.version } : undefined;
          const policy = ctx.sandboxPolicy.resolve();
          const outcome = await ctx.fs.writeText(r.target, body.content, expected, undefined, policy);
          sendJson(res, 200, {
            ok: true,
            path: r.target.displayPath,
            operation: outcome.operation,
            version: outcome.version,
          });
        } catch (error) {
          const code = errorCode(error);
          const status = code === "FS_STALE_VERSION" || code === "FS_NOT_OBSERVED" ? 409
            : code === "FS_SANDBOX_DENIED" ? 403
            : code === "FS_NOT_REGULAR_FILE" ? 400
            : code === "FS_PERMISSION_DENIED" ? 403 : 500;
          sendError(res, status, code, errorMessage(error));
        }
      },
    });

    for (const route of routes) disposers.push(ctx.webServer.register(route));
    return () => {
      for (const dispose of disposers) dispose();
    };
  }, "dsh-md-workspace: http routes");
}

export { apply, inject, name };
