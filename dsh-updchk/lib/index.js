// dsh-updchk — host half (v4, cross-platform).
//
// Registers HTTP routes on ctx.webServer:
//
//   GET  /updk/status        -> { ok, current, layout, customPluginCount, webPort, webPortListening }
//   GET  /updk/check         -> { ok, current, latest, next, target, hasUpdate, risk }
//   POST /updk/update        -> body { version } -> { ok, job }  (runs in background)
//   GET  /updk/progress?job= -> progress snapshot
//   POST /updk/cancel        -> body { job } -> { ok }
//
// Update design (staged runtime):
//   ~/.dsh/runtime/versions/<v>/   installed version trees (previous kept)
//   ~/.dsh/runtime/current.json    { version, path, installedAt, validated }
//   ~/.dsh/runtime/previous.json   last known-good
//
// Cross-platform contract (macOS / Windows / Linux):
//   - Local discovery, custom-plugin scanning and registry detection are done
//     IN-PROCESS with node:fs / node:path / node:os — no grep / command -v /
//     mkdir -p / printf / env, so nothing depends on bash or PowerShell syntax.
//   - The only subprocesses are the package-manager install and the native-module
//     validation, both invoked as a single flat command with no path tokens in
//     the command string (paths travel via `workdir`, the version via `env`),
//     which parses identically under sh and pwsh.
//   - The install runs with danger-full-access: this plugin is a local,
//     user-installed updater, and pinning it to a workspace-write sandbox would
//     make it fail on hosts whose sandbox backend is unavailable or whose
//     package-manager caches live outside the workspace root (e.g. Windows
//     LOCALAPPDATA). The staging directory itself is still isolated under
//     ~/.dsh/runtime and is removed on any failure.

import { join, delimiter } from "node:path";
import { homedir } from "node:os";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, statSync, realpathSync } from "node:fs";
import net from "node:net";

const name = "dsh-updchk";
const inject = ["shell", "webServer", "sandboxPolicy"];

const REGISTRY = "https://registry.npmjs.org";
const DSH_PKG = "@deepseek-ai/dsh";
const CLOSURE_ROOTS = ["@deepseek-ai/dsh", "@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app"];

const DSH_HOME = process.env.DSH_HOME || join(homedir(), ".dsh");
const RUNTIME_DIR = join(DSH_HOME, "runtime");
const VERSIONS_DIR = join(RUNTIME_DIR, "versions");
const CURRENT_FILE = join(RUNTIME_DIR, "current.json");
const PREVIOUS_FILE = join(RUNTIME_DIR, "previous.json");
const PROFILES_DIR = join(DSH_HOME, "profiles");

const INSTALL_TIMEOUT_MS = 30 * 60 * 1000; // 30 min 总硬超时兜底（冷缓存全量安装可能很慢）
const STALL_WARN_MS = 45 * 1000; // 前端显示"疑似卡住"的阈值
const STALL_KILL_MS = 3 * 60 * 1000; // 持续无输出达到该时长 → 判定卡住并强制中止

// ------------------------------------------------------------------
// semver
// ------------------------------------------------------------------
function parseVer(v) {
  const s = String(v).trim();
  let pre = null;
  const i = s.indexOf("-");
  const main = i >= 0 ? s.slice(0, i) : s;
  if (i >= 0) pre = s.slice(i + 1);
  const parts = main.split(".").map((x) => parseInt(x, 10) || 0);
  return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0, pre: pre === null ? null : pre.split(".") };
}

function cmpPre(a, b) {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  const n = Math.max(a.length, b.length);
  for (let k = 0; k < n; k++) {
    const x = a[k], y = b[k];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const xn = /^\d+$/.test(x) ? parseInt(x, 10) : null;
    const yn = /^\d+$/.test(y) ? parseInt(y, 10) : null;
    if (xn !== null && yn !== null) { if (xn !== yn) return xn < yn ? -1 : 1; }
    else if (xn !== null) return -1;
    else if (yn !== null) return 1;
    else if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

function cmpVer(a, b) {
  const x = parseVer(a), y = parseVer(b);
  if (x.major !== y.major) return x.major < y.major ? -1 : 1;
  if (x.minor !== y.minor) return x.minor < y.minor ? -1 : 1;
  if (x.patch !== y.patch) return x.patch < y.patch ? -1 : 1;
  return cmpPre(x.pre, y.pre);
}

// ------------------------------------------------------------------
// misc helpers
// ------------------------------------------------------------------
/** JSON.stringify double-quoting: safe for both sh and pwsh once a token has no
 *  backslashes, '$' or backticks (package specs and registry URLs qualify). */
const shq = (s) => JSON.stringify(String(s));

function errText(e) {
  return String((e && e.message) || e);
}

/** Resolve an executable on PATH (cross-platform, honours PATHEXT on Windows). */
function which(cmd) {
  const pathEnv = process.env.PATH || "";
  const exts = process.platform === "win32"
    ? (process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM;.PS1").split(";").filter(Boolean)
    : [""];
  for (const dir of pathEnv.split(delimiter)) {
    if (!dir) continue;
    for (const ext of exts) {
      const fp = join(dir, cmd + ext);
      try {
        if (existsSync(fp) && statSync(fp).isFile()) return fp;
      } catch { /* keep scanning */ }
    }
  }
  return null;
}

// ------------------------------------------------------------------
// registry / package-manager detection (in-process)
// ------------------------------------------------------------------
function npmRegistry() {
  if (typeof process.env.npm_config_registry === "string" && process.env.npm_config_registry.trim()) {
    return process.env.npm_config_registry.trim();
  }
  const files = [join(DSH_HOME, ".npmrc"), join(homedir(), ".npmrc")];
  for (const file of files) {
    try {
      const text = readFileSync(file, "utf8");
      for (const line of text.split(/\r?\n/)) {
        const m = /^\s*registry\s*=\s*"?([^"\s]+)"?/.exec(line);
        if (m) return m[1];
      }
    } catch { /* skip */ }
  }
  return REGISTRY;
}

function pnpmAvailable() {
  return which("pnpm") !== null;
}

// ------------------------------------------------------------------
// local discovery (in-process)
// ------------------------------------------------------------------
function readPointer(file) {
  try {
    if (!existsSync(file)) return null;
    return JSON.parse(readFileSync(file, "utf8"));
  } catch { return null; }
}

function writePointer(file, value) {
  mkdirSync(RUNTIME_DIR, { recursive: true });
  writeFileSync(file, JSON.stringify(value, null, 2));
}

function runtimeCurrent() {
  const cur = readPointer(CURRENT_FILE);
  if (cur && cur.path) {
    const pj = join(cur.path, "node_modules", "@deepseek-ai", "dsh", "package.json");
    if (existsSync(pj)) {
      try {
        const v = JSON.parse(readFileSync(pj, "utf8")).version || cur.version || "";
        return { root: cur.path, version: v, layout: "runtime" };
      } catch { /* fall through */ }
    }
  }
  // Flat layout: a recovered/full install sitting directly under RUNTIME_DIR.
  const flatPj = join(RUNTIME_DIR, "node_modules", "@deepseek-ai", "dsh", "package.json");
  if (existsSync(flatPj)) {
    try {
      const v = JSON.parse(readFileSync(flatPj, "utf8")).version || "";
      return { root: RUNTIME_DIR, version: v, layout: "runtime-flat" };
    } catch { /* fall through */ }
  }
  return null;
}

// 当前进程实际从哪个目录运行（从 argv[1] 的 bin.js 路径反推；分隔符归一化后匹配，Windows 反斜杠同样命中）
function runningDir() {
  const a = process.argv[1] || "";
  if (!a) return "";
  const marker = "/node_modules/@deepseek-ai/dsh/";
  const idx = a.replace(/\\/g, "/").indexOf(marker);
  return idx > 0 ? a.slice(0, idx) : "";
}

function runningVersion() {
  const dir = runningDir();
  if (!dir) return null;
  const pj = join(dir, "node_modules", "@deepseek-ai", "dsh", "package.json");
  try { return JSON.parse(readFileSync(pj, "utf8")).version || null; } catch { return null; }
}

// Last-resort: resolve a `dsh` executable on PATH and infer its install root.
function findDshRoot() {
  const bin = which("dsh");
  if (!bin) return null;
  let real = bin;
  try { real = realpathSync(bin); } catch { /* keep bin */ }
  const idx = real.replace(/\\/g, "/").indexOf("/node_modules/");
  if (idx <= 0) return null;
  const root = real.slice(0, idx);
  const pj = join(root, "node_modules", "@deepseek-ai", "dsh", "package.json");
  try {
    return { root, version: JSON.parse(readFileSync(pj, "utf8")).version || "", layout: "npx" };
  } catch { return null; }
}

function localInfo() {
  const rc = runtimeCurrent();
  if (rc && rc.version) return rc;
  const rv = runningVersion();
  if (rv) return { root: runningDir() || "", version: rv, layout: "npx" };
  const pathRoot = findDshRoot();
  if (pathRoot && pathRoot.version) return pathRoot;
  throw new Error("无法确定当前 dsh 版本");
}

// ------------------------------------------------------------------
// custom-plugin discovery (in-process, profile-agnostic)
// ------------------------------------------------------------------
function listProfileDirs() {
  const out = [];
  try {
    for (const entry of readdirSync(PROFILES_DIR, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === "node_modules") continue;
      const dir = join(PROFILES_DIR, entry.name);
      if (existsSync(join(dir, "package.json"))) out.push(dir);
    }
  } catch { /* no profiles dir yet */ }
  return out;
}

function resolvePluginDir(pkgName, preferredProfileDir) {
  const cands = [];
  if (preferredProfileDir) cands.push(join(preferredProfileDir, "node_modules", pkgName));
  for (const prof of listProfileDirs()) cands.push(join(prof, "node_modules", pkgName));
  cands.push(join(PROFILES_DIR, "node_modules", pkgName));
  cands.push(join(DSH_HOME, "node_modules", pkgName));
  for (const dir of cands) {
    if (dir && existsSync(join(dir, "package.json"))) return dir;
  }
  return null;
}

function isDshPluginDir(dir) {
  try {
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    return !!(pkg && pkg.dsh);
  } catch { return false; }
}

const REF_RE = /@deepseek-ai\/[a-z0-9.-]+/g;

function scanPluginRefs(dir) {
  const refs = new Set();
  try {
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    for (const k of Object.keys(pkg.dependencies || {})) refs.add(k);
    const dc = pkg.dsh && pkg.dsh.client;
    if (dc && Array.isArray(dc.inject)) for (const k of dc.inject) refs.add(k);
    const walk = (d, depth) => {
      if (depth > 3) return;
      let ents;
      try { ents = readdirSync(d, { withFileTypes: true }); } catch { return; }
      for (const e of ents) {
        const fp = join(d, e.name);
        if (e.isDirectory()) { if (e.name !== "node_modules") walk(fp, depth + 1); }
        else if (/\.(js|mjs|cjs|ts)$/.test(e.name)) {
          try {
            const src = readFileSync(fp, "utf8");
            for (const m of src.matchAll(REF_RE)) refs.add(m[0]);
          } catch { /* unreadable/binary — skip */ }
        }
      }
    };
    walk(dir, 0);
  } catch { /* unreadable plugin dir — report no refs */ }
  return [...refs].filter((k) => k.indexOf("@deepseek-ai/") === 0).sort();
}

/** Custom plugin names = non-@deepseek-ai bundles + dsh-typed deps + cordis.patch.yml inserts. */
function collectCustomNames() {
  const out = [];
  const seen = new Set();
  const push = (n) => {
    if (typeof n !== "string" || !n || n.startsWith("@deepseek-ai/") || seen.has(n)) return;
    seen.add(n);
    out.push(n);
  };
  for (const dir of listProfileDirs()) {
    let pkg = null;
    try { pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")); } catch { /* skip */ }
    if (pkg) {
      for (const b of pkg.dsh?.profile?.bundles ?? []) push(b);
      for (const dep of Object.keys(pkg.dependencies ?? {})) {
        if (dep.startsWith("@deepseek-ai/")) continue;
        const d = resolvePluginDir(dep, dir);
        if (d && isDshPluginDir(d)) push(dep);
      }
    }
    for (const f of ["cordis.patch.yml", "cordis.yml"]) {
      try {
        const src = readFileSync(join(dir, f), "utf8");
        for (const m of src.matchAll(/(?:^|\n)\s*-?\s*name:\s*([A-Za-z0-9@][A-Za-z0-9@/._-]*)/g)) push(m[1]);
      } catch { /* skip */ }
    }
  }
  return out;
}

function customPlugins() {
  const out = [];
  for (const n of collectCustomNames()) {
    const dir = resolvePluginDir(n);
    if (!dir) continue;
    let version = "";
    try { version = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")).version || ""; } catch { /* keep empty */ }
    out.push({ name: n, version, refs: scanPluginRefs(dir) });
  }
  return out;
}

/** @deepseek-ai/* references mentioned in profile / home YAML config layers. */
function profileYmlRefs() {
  const refs = new Set();
  const roots = listProfileDirs();
  const walk = (dir) => {
    let ents;
    try { ents = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      const fp = join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== "node_modules") walk(fp); }
      else if (/\.ya?ml$/i.test(e.name)) {
        try {
          const src = readFileSync(fp, "utf8");
          for (const m of src.matchAll(REF_RE)) refs.add(m[0]);
        } catch { /* skip */ }
      }
    }
  };
  for (const r of roots) walk(r);
  const homePatch = join(DSH_HOME, "cordis.patch.yml");
  try {
    const src = readFileSync(homePatch, "utf8");
    for (const m of src.matchAll(REF_RE)) refs.add(m[0]);
  } catch { /* skip */ }
  return [...refs].sort();
}

// ------------------------------------------------------------------
// web port (derived from the live server, not hardcoded)
// ------------------------------------------------------------------
function webPort(ctx) {
  try {
    const p = ctx.webServer && ctx.webServer.port;
    return typeof p === "number" && p > 0 ? p : null;
  } catch { return null; }
}

function portListening(port) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    const s = net.connect({ host: "127.0.0.1", port }, () => { s.destroy(); finish(true); });
    s.on("error", () => { s.destroy(); finish(false); });
    s.setTimeout(600, () => { s.destroy(); finish(false); });
  });
}

// ------------------------------------------------------------------
// registry closure + custom-plugin risk
// ------------------------------------------------------------------
async function fetchJson(url) {
  const r = await fetch(url, { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error("registry 请求失败 HTTP " + r.status + " " + url);
  return await r.json();
}

async function depClosure(target) {
  const depSet = {};
  for (const pkg of CLOSURE_ROOTS) {
    let pack;
    try { pack = await fetchJson(REGISTRY + "/" + pkg); } catch { continue; }
    const versions = pack.versions || {};
    let v = versions[target] ? target : null;
    if (!v) {
      for (const cand of Object.keys(versions)) if (v === null || cmpVer(cand, v) > 0) v = cand;
    }
    if (!v) continue;
    for (const dep of Object.keys(versions[v].dependencies || {})) depSet[dep] = versions[v].dependencies[dep];
  }
  return depSet;
}

async function packageExists(pkg) {
  try {
    const r = await fetch(REGISTRY + "/" + pkg, { method: "HEAD" });
    return r.ok;
  } catch { return false; }
}

async function assessCustom(plugins, ymlRefs, depSet) {
  const items = [];
  let level = "none";
  let checkedRefs = 0;
  const consumers = {};
  const addRef = (ref, consumer) => {
    if (ref.indexOf("@deepseek-ai/") !== 0) return;
    if (!consumers[ref]) consumers[ref] = [];
    consumers[ref].push(consumer);
  };
  for (const plugin of plugins) for (const ref of plugin.refs) addRef(ref, plugin.name);
  for (const ref of ymlRefs) addRef(ref, "profile 配置层(cordis.patch.yml)");

  const missing = [];
  for (const ref of Object.keys(consumers).sort()) {
    checkedRefs += 1;
    if (ref in depSet) continue;
    const exists = await packageExists(ref);
    if (!exists) {
      missing.push(ref);
      items.push({ severity: "high", text: `自定义插件 [${consumers[ref].join(", ")}] 依赖的 ${ref} 已从 npm registry 消失，更新后该插件必然不可用。` });
      level = "high";
    } else {
      items.push({ severity: "medium", text: `${ref} 不在新版 dsh 的依赖树中（npm 上仍存在，可能已更名或改为独立安装）。使用它的 [${consumers[ref].join(", ")}] 更新后可能失效，建议先确认。` });
      if (level !== "high") level = "medium";
    }
  }
  if (missing.length === 0) {
    items.unshift({ severity: "low", text: `已校验 ${plugins.length} 个自定义插件对 ${checkedRefs} 个 @deepseek-ai 包的引用，全部存在于新版依赖树中。` });
    if (level === "none") level = "low";
  }
  return { level, items, customPluginCount: plugins.length, checkedRefs };
}

// ------------------------------------------------------------------
// background update job
// ------------------------------------------------------------------
const jobs = new Map();
let jobSeq = 0;

// The updater is a local, trusted plugin; the install step runs unconfined so it
// works on every host regardless of sandbox backend availability and of where the
// package manager keeps its cache (LOCALAPPDATA on Windows, ~/.cache elsewhere).
const FULL_ACCESS = { mode: "danger-full-access", workspaceRoot: RUNTIME_DIR };

function snapshot(job) {
  const now = Date.now();
  return {
    job: job.id,
    version: job.version,
    stage: job.stage,
    status: job.status,
    engine: job.engine,
    startedAt: job.startedAt,
    elapsedMs: now - job.startedAt,
    lastActivityAt: job.lastActivityAt,
    stallMs: now - job.lastActivityAt,
    bytes: job.bytes,
    logTail: job.logTail,
    error: job.error,
    installed: job.installed,
    note: job.note,
  };
}

function setStage(job, stage, note) {
  job.stage = stage;
  job.lastActivityAt = Date.now();
  if (note) job.note = note;
}

/** Run one foreground command via ctx.shell (cross-platform request shape). */
async function runCmd(ctx, request) {
  const spec = ctx.shell.resolve(request);
  const res = await ctx.shell.run(spec);
  return { code: res.exitCode, out: (res.stdout && res.stdout.text) || "", err: (res.stderr && res.stderr.text) || "" };
}

// Run one shell command as a background process, draining output into the job.
function runStream(ctx, job, request, timeoutMs) {
  return new Promise((resolve) => {
    let proc;
    try {
      const spec = ctx.shell.resolve(request);
      proc = ctx.shell.start(spec);
    } catch (e) {
      resolve({ spawnError: errText(e) });
      return;
    }
    job.proc = proc;
    let timedOut = false;
    let stalled = false;
    const deadline = setTimeout(() => {
      timedOut = true;
      try { proc.kill(); } catch {}
    }, timeoutMs);
    const iv = setInterval(() => {
      try {
        const r = proc.readOutput();
        const d = r && r.delta ? r.delta : "";
        if (d) {
          job.logTail = (job.logTail + d).slice(-2048);
          job.bytes += d.length;
          job.lastActivityAt = Date.now();
        }
      } catch {}
      if (!stalled && !timedOut && Date.now() - job.lastActivityAt > STALL_KILL_MS) {
        stalled = true;
        try { proc.kill(); } catch {}
      }
    }, 500);
    const finish = (res) => {
      clearTimeout(deadline);
      clearInterval(iv);
      for (let g = 0; g < 8; g++) {
        try {
          const r = proc.readOutput();
          const d = r && r.delta ? r.delta : "";
          if (!d) break;
          job.logTail = (job.logTail + d).slice(-2048);
          job.bytes += d.length;
          job.lastActivityAt = Date.now();
        } catch { break; }
      }
      resolve(res);
    };
    proc.done.then(() => finish({ timedOut, stalled, exitCode: proc.exitCode, signal: proc.signal }));
  });
}

/** Write the standalone native-module validator; run as `node validate.cjs` in installDir. */
function writeValidateScript(installDir) {
  const script = [
    '"use strict";',
    'const path = require("path");',
    'const { createRequire } = require("module");',
    'const dir = process.cwd();',
    'const expected = process.env.DSH_UPDCHK_VERSION || "";',
    'const entry = path.join(dir, "node_modules", "@deepseek-ai", "dsh", "package.json");',
    'const pkg = require(entry);',
    'if (expected && pkg.version !== expected) { console.error("version mismatch: " + pkg.version); process.exit(2); }',
    'const rq = createRequire(entry);',
    'try { rq("node-pty"); } catch (e) { console.error("node-pty load failed: " + e.message); process.exit(3); }',
    'try { rq("koffi"); } catch (e) { console.error("koffi load failed: " + e.message); process.exit(4); }',
    'console.log("VALIDATED " + pkg.version);',
    "",
  ].join("\n");
  writeFileSync(join(installDir, "validate.cjs"), script, "utf8");
}

/** One flat package-manager command: no path tokens, so sh and pwsh parse it identically. */
function installRequest(installDir, version, reg, usePnpm) {
  const spec = `${DSH_PKG}@${version}`;
  const command = usePnpm
    ? `pnpm add ${shq(spec)} --registry ${shq(reg)} --reporter=append-only --dangerously-allow-all-builds`
    : `npm install ${shq(spec)} --no-save --no-audit --no-fund --loglevel=http --prefer-offline --registry ${shq(reg)}`;
  return {
    command,
    workdir: installDir,
    env: { npm_config_registry: reg },
    sandboxPolicy: FULL_ACCESS,
  };
}

async function performUpdate(ctx, job) {
  const version = job.version;
  try {
    setStage(job, "preparing", "定位当前安装");
    const local = localInfo();
    if (!local.root) throw new Error("无法定位当前 dsh 安装目录");

    mkdirSync(VERSIONS_DIR, { recursive: true });
    const installDir = join(VERSIONS_DIR, version);
    if (existsSync(installDir)) rmSync(installDir, { recursive: true, force: true });

    setStage(job, "preflight", "选择安装引擎并读取 registry 配置");
    const reg = npmRegistry();
    const usePnpm = pnpmAvailable();
    job.engine = usePnpm ? "pnpm" : "npm";

    // Prepare the staging project in-process (no mkdir -p / printf shell strings).
    mkdirSync(installDir, { recursive: true });
    writeFileSync(join(installDir, "package.json"), JSON.stringify({ name: "dsh-updchk-staging", version: "0.0.0", private: true }, null, 2) + "\n");

    setStage(job, "installing", job.engine + " 安装到 " + installDir);
    const req = installRequest(installDir, version, reg, usePnpm);
    const res = await runStream(ctx, job, req, INSTALL_TIMEOUT_MS);
    if (job.aborted) throw new Error("已中止更新");
    if (res.spawnError) throw new Error("安装进程启动失败: " + res.spawnError);
    if (res.stalled) throw new Error(`安装持续 ${STALL_KILL_MS / 60000} 分钟无任何输出，判定为卡住（依赖解析死循环特征），已强制中止（旧版不受影响）`);
    if (res.timedOut) throw new Error(`安装超过 ${INSTALL_TIMEOUT_MS / 60000} 分钟总超时，已强制中止（旧版不受影响）`);
    if (res.exitCode !== 0) throw new Error(job.engine + " install 退出码 " + res.exitCode);

    setStage(job, "validating", "校验版本与原生模块");
    writeValidateScript(installDir);
    const vres = await runCmd(ctx, {
      command: "node validate.cjs",
      workdir: installDir,
      timeoutMs: 120000,
      env: { DSH_UPDCHK_VERSION: version },
      sandboxPolicy: FULL_ACCESS,
    });
    if (vres.code !== 0) throw new Error("校验未通过: " + ((vres.err || vres.out) || "").trim().slice(-500));

    setStage(job, "switching", "切换版本指针");
    let prev = readPointer(CURRENT_FILE);
    if (!prev || !prev.path) {
      // 首次从扁平布局升级：把扁平运行时目录记为上一版本，作为可回滚目标
      const flatPj = join(RUNTIME_DIR, "node_modules", "@deepseek-ai", "dsh", "package.json");
      if (existsSync(flatPj)) {
        try {
          const fv = JSON.parse(readFileSync(flatPj, "utf8")).version || "";
          if (fv && fv !== version) prev = { version: fv, path: RUNTIME_DIR, flat: true, installedAt: null };
        } catch { /* ignore */ }
      }
    }
    writePointer(PREVIOUS_FILE, prev);
    writePointer(CURRENT_FILE, { version, path: installDir, installedAt: new Date().toISOString(), validated: true });

    job.status = "done";
    job.installed = version;
    job.note = "已准备 " + version + "，重启 dsh 后生效；旧版可回滚。";
  } catch (e) {
    job.status = "failed";
    job.error = errText(e);
    try {
      const installDir = join(VERSIONS_DIR, job.version);
      if (existsSync(installDir)) rmSync(installDir, { recursive: true, force: true });
    } catch {}
  }
}

// ------------------------------------------------------------------
// HTTP plumbing + trust fence
// ------------------------------------------------------------------
function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

function isTrustedRequest(req) {
  const host = String(req.headers.host || "");
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)) return false;
  const origin = req.headers.origin;
  if (origin !== undefined) {
    try { if (new URL(origin).host !== host) return false; } catch { return false; }
  }
  const site = req.headers["sec-fetch-site"];
  if (site !== undefined && site !== "same-origin" && site !== "same-site" && site !== "none") return false;
  return true;
}

function readBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > maxBytes) { reject(new Error("TOO_LARGE")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function apply(ctx) {
  ctx.effect(() => {
    const routes = [
      {
        kind: "exact",
        path: "/updk/status",
        async handler(req, res) {
          if (!isTrustedRequest(req)) return sendJson(res, 403, { ok: false, error: "untrusted request" });
          if (req.method !== "GET") return sendJson(res, 405, { ok: false, error: "GET only" });
          try {
            const local = localInfo();
            const plugins = customPlugins();
            const port = webPort(ctx);
            const webListening = port === null ? false : await portListening(port);
            const prev = readPointer(PREVIOUS_FILE);
            const rv = runningVersion();
            const pendingRestart = local.layout === "runtime" && rv !== null && rv !== local.version;
            return sendJson(res, 200, {
              ok: true,
              current: local.version,
              layout: local.layout,
              customPluginCount: plugins.length,
              webPort: port,
              webPortListening: webListening,
              previousVersion: prev && prev.version ? prev.version : null,
              runningVersion: rv,
              pendingRestart,
            });
          } catch (e) { return sendJson(res, 500, { ok: false, error: errText(e) }); }
        },
      },
      {
        kind: "exact",
        path: "/updk/check",
        async handler(req, res) {
          if (!isTrustedRequest(req)) return sendJson(res, 403, { ok: false, error: "untrusted request" });
          if (req.method !== "GET") return sendJson(res, 405, { ok: false, error: "GET only" });
          try {
            const local = localInfo();
            const plugins = customPlugins();
            const ymlRefs = profileYmlRefs();
            const pack = await fetchJson(REGISTRY + "/" + DSH_PKG);
            const tags = pack["dist-tags"] || {};
            let target = local.version;
            for (const v of Object.keys(pack.versions || {})) {
              if (cmpVer(v, target) > 0) target = v;
            }
            const hasUpdate = target !== local.version;
            let risk = { level: "none", items: [], customPluginCount: plugins.length, checkedRefs: 0, crossLine: false, crossLineNote: "" };
            if (hasUpdate) {
              const depSet = await depClosure(target);
              risk = await assessCustom(plugins, ymlRefs, depSet);
              const cur = parseVer(local.version), tgt = parseVer(target);
              const crossLine = cur.major !== tgt.major || cur.minor !== tgt.minor;
              const bothRc = cur.pre !== null && tgt.pre !== null;
              risk.crossLine = crossLine;
              risk.crossLineNote = crossLine && bothRc
                ? "跨次版本线的 rc 更新，可能存在破坏性变更；安装将优先使用 pnpm（无 npm 解析死循环风险），自定义插件兼容性仍建议二次确认。"
                : crossLine
                  ? "跨次版本线更新，可能存在破坏性变更。"
                  : "";
            }
            return sendJson(res, 200, {
              ok: true,
              current: local.version,
              latest: tags.latest || "",
              next: tags.next || "",
              target,
              hasUpdate,
              risk,
            });
          } catch (e) { return sendJson(res, 500, { ok: false, error: errText(e) }); }
        },
      },
      {
        kind: "exact",
        path: "/updk/update",
        async handler(req, res) {
          if (!isTrustedRequest(req)) return sendJson(res, 403, { ok: false, error: "untrusted request" });
          if (req.method !== "POST") return sendJson(res, 405, { ok: false, error: "POST only" });
          let body;
          try { body = JSON.parse(await readBody(req, 65536)); }
          catch { return sendJson(res, 400, { ok: false, error: "invalid JSON body" }); }
          const version = body && body.version;
          if (!version || !/^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$/.test(version)) {
            return sendJson(res, 400, { ok: false, error: "非法版本号" });
          }
          const job = {
            id: "j" + (++jobSeq),
            version,
            stage: "queued",
            status: "running",
            engine: null,
            startedAt: Date.now(),
            lastActivityAt: Date.now(),
            bytes: 0,
            logTail: "",
            error: null,
            installed: null,
            note: null,
            proc: null,
            aborted: false,
          };
          jobs.set(job.id, job);
          // Run in background; client polls /updk/progress.
          performUpdate(ctx, job);
          return sendJson(res, 200, { ok: true, job: job.id });
        },
      },
      {
        kind: "exact",
        path: "/updk/progress",
        async handler(req, res) {
          if (!isTrustedRequest(req)) return sendJson(res, 403, { ok: false, error: "untrusted request" });
          if (req.method !== "GET") return sendJson(res, 405, { ok: false, error: "GET only" });
          try {
            const id = new URL(req.url, "http://x").searchParams.get("job");
            const job = jobs.get(id);
            if (!job) return sendJson(res, 404, { ok: false, error: "unknown job" });
            return sendJson(res, 200, { ok: true, ...snapshot(job) });
          } catch (e) { return sendJson(res, 500, { ok: false, error: errText(e) }); }
        },
      },
      {
        kind: "exact",
        path: "/updk/cancel",
        async handler(req, res) {
          if (!isTrustedRequest(req)) return sendJson(res, 403, { ok: false, error: "untrusted request" });
          if (req.method !== "POST") return sendJson(res, 405, { ok: false, error: "POST only" });
          let body;
          try { body = JSON.parse(await readBody(req, 65536)); }
          catch { return sendJson(res, 400, { ok: false, error: "invalid JSON body" }); }
          const job = jobs.get(body && body.job);
          if (!job || job.status !== "running") return sendJson(res, 404, { ok: false, error: "无此任务或任务已结束" });
          job.aborted = true;
          if (job.proc) { try { job.proc.kill(); } catch {} }
          return sendJson(res, 200, { ok: true });
        },
      },
      {
        kind: "exact",
        path: "/updk/rollback",
        async handler(req, res) {
          if (!isTrustedRequest(req)) return sendJson(res, 403, { ok: false, error: "untrusted request" });
          if (req.method !== "POST") return sendJson(res, 405, { ok: false, error: "POST only" });
          try {
            const prev = readPointer(PREVIOUS_FILE);
            if (!prev || !prev.path) return sendJson(res, 404, { ok: false, error: "没有可回滚的上一个版本" });
            const pj = join(prev.path, "node_modules", "@deepseek-ai", "dsh", "package.json");
            if (!existsSync(pj)) return sendJson(res, 404, { ok: false, error: "上一版本目录不存在，无法回滚" });
            const cur = readPointer(CURRENT_FILE);
            writePointer(CURRENT_FILE, prev);
            writePointer(PREVIOUS_FILE, cur);
            return sendJson(res, 200, { ok: true, rolledTo: prev.version || "", note: "已切回 " + (prev.version || "") + "，重启 dsh 生效。" });
          } catch (e) { return sendJson(res, 500, { ok: false, error: errText(e) }); }
        },
      },
    ];
    const disposers = routes.map((route) => ctx.webServer.register(route));
    return () => {
      for (const d of disposers) d();
      for (const job of jobs.values()) {
        if (job.proc) { try { job.proc.kill(); } catch {} }
      }
    };
  }, "dsh-updchk: http routes");
}

export { apply, inject, name };
