window.__ModuleLoader__.load({
  id: "dsh-md-workspace",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");

    // ------------------------------------------------------------------
    // CSS
    // ------------------------------------------------------------------
    const css = [
      ".mdw-panel{position:absolute;top:12px;right:12px;min-width:360px;min-height:280px;display:flex;flex-direction:column;background:var(--dsw-alias-bg-base,#fff);border:1px solid var(--dsw-alias-border-l2,#e5e7eb);border-radius:12px;box-shadow:0 16px 48px rgba(0,0,0,.18);overflow:hidden;pointer-events:auto;z-index:30;color:var(--dsw-alias-label-primary,#1f2328);font-size:13px}",
      ".mdw-panel *{box-sizing:border-box}",
      ".mdw-resize-w{position:absolute;top:0;bottom:0;left:0;width:6px;cursor:ew-resize;z-index:20;touch-action:none}",
      ".mdw-resize-nw{position:absolute;bottom:0;left:0;width:16px;height:16px;cursor:nwse-resize;z-index:21;touch-action:none}",
      ".mdw-head{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--dsw-alias-border-l2,#e5e7eb);flex:none}",
      ".mdw-title{font-weight:600;font-size:14px;margin-right:4px;white-space:nowrap}",
      ".mdw-path{flex:1;min-width:0;display:flex;gap:6px;align-items:center}",
      ".mdw-path input{flex:1;min-width:0;height:28px;padding:0 8px;border:1px solid var(--dsw-alias-border-l2,#d1d5db);border-radius:6px;background:transparent;color:inherit;font-size:12px;font-family:inherit}",
      ".mdw-btn{display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2,#d1d5db);border-radius:6px;background:transparent;color:inherit;font-size:12px;cursor:pointer;white-space:nowrap}",
      ".mdw-btn:hover{background:var(--dsw-alias-button-floating-hover,rgba(0,0,0,.06))}",
      ".mdw-btn:disabled{opacity:.45;cursor:default}",
      ".mdw-btn.primary{background:#2563eb;border-color:#2563eb;color:#fff}",
      ".mdw-btn.primary:hover{background:#1d4ed8}",
      ".mdw-btn.active{background:var(--dsw-alias-button-floating-fill,rgba(37,99,235,.12));border-color:#2563eb;color:#2563eb}",
      ".mdw-close{border:none;background:transparent;cursor:pointer;color:var(--dsw-alias-label-secondary,#6b7280);font-size:18px;line-height:1;padding:2px 6px;border-radius:6px}",
      ".mdw-close:hover{background:var(--dsw-alias-button-floating-hover,rgba(0,0,0,.08))}",
      ".mdw-body{flex:1;min-height:0;display:flex}",
      ".mdw-tree{flex:none;width:300px;overflow:auto;padding:6px 4px}",
      ".mdw-splitter{flex:none;width:5px;cursor:col-resize;background:var(--dsw-alias-border-l2,#e5e7eb);touch-action:none;z-index:2}",
      ".mdw-splitter:hover{background:#2563eb}",
      ".mdw-view{flex:1;min-width:0;display:flex;flex-direction:column}",
      ".mdw-viewbar{display:flex;align-items:center;gap:6px;padding:6px 10px;border-bottom:1px solid var(--dsw-alias-border-l2,#e5e7eb);flex:none}",
      ".mdw-fname{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:var(--dsw-alias-label-secondary,#6b7280)}",
      ".mdw-btn.mdw-copied{background:#dcfce7;border-color:#86efac;color:#15803d}",
      ".mdw-split{display:flex;flex:1;min-height:0;align-items:stretch}",
      ".mdw-split .mdw-editor,.mdw-split .mdw-md,.mdw-split .mdw-plain{flex:1 1 0%;min-width:0;height:100%;overflow:auto}",
      ".mdw-splitdiv{flex:none;width:5px;cursor:col-resize;touch-action:none;background:var(--dsw-alias-border-l2,#e5e7eb)}",
      ".mdw-splitdiv:hover{background:#2563eb}",
      ".mdw-editor{width:100%;height:100%;border:none;outline:none;resize:none;padding:12px;background:transparent;color:inherit;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12.5px;line-height:1.6}",
      ".mdw-md{padding:12px 16px;line-height:1.7;word-wrap:break-word}",
      ".mdw-md h1,.mdw-md h2,.mdw-md h3,.mdw-md h4,.mdw-md h5,.mdw-md h6{margin:16px 0 8px;line-height:1.3;font-weight:600}",
      ".mdw-md h1{font-size:1.5em;border-bottom:1px solid var(--dsw-alias-border-l2,#e5e7eb);padding-bottom:6px}",
      ".mdw-md h2{font-size:1.3em;border-bottom:1px solid var(--dsw-alias-border-l2,#e5e7eb);padding-bottom:5px}",
      ".mdw-md h3{font-size:1.15em}.mdw-md h4{font-size:1.05em}",
      ".mdw-md p{margin:8px 0}",
      ".mdw-md pre{background:var(--dsw-alias-border-l1,rgba(0,0,0,.04));border:1px solid var(--dsw-alias-border-l2,#e5e7eb);border-radius:8px;padding:10px 12px;overflow:auto}",
      ".mdw-md code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.92em}",
      ".mdw-md :not(pre)>code{background:var(--dsw-alias-border-l1,rgba(0,0,0,.05));border-radius:4px;padding:1px 5px}",
      ".mdw-md pre code{background:none;padding:0}",
      ".mdw-md blockquote{border-left:3px solid var(--dsw-alias-border-l2,#d1d5db);margin:8px 0;padding:2px 12px;color:var(--dsw-alias-label-secondary,#6b7280)}",
      ".mdw-md ul,.mdw-md ol{margin:8px 0;padding-left:24px}",
      ".mdw-md li{margin:3px 0}",
      ".mdw-md table{border-collapse:collapse;margin:10px 0;max-width:100%;display:block;overflow:auto}",
      ".mdw-md th,.mdw-md td{border:1px solid var(--dsw-alias-border-l2,#d1d5db);padding:5px 10px;text-align:left}",
      ".mdw-md th{background:var(--dsw-alias-border-l1,rgba(0,0,0,.04));font-weight:600}",
      ".mdw-md img{max-width:100%}",
      ".mdw-md hr{border:none;border-top:1px solid var(--dsw-alias-border-l2,#e5e7eb);margin:14px 0}",
      ".mdw-md a{color:#2563eb;text-decoration:none}.mdw-md a:hover{text-decoration:underline}",
      ".mdw-plain{white-space:pre-wrap;word-break:break-word;padding:12px 16px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12.5px;line-height:1.6}",
      ".mdw-trow{display:flex;align-items:center;gap:6px;padding:3px 6px;border-radius:6px;cursor:pointer;white-space:nowrap}",
      ".mdw-trow:hover{background:var(--dsw-alias-button-floating-hover,rgba(0,0,0,.05))}",
      ".mdw-trow.sel{background:rgba(37,99,235,.14)}",
      ".mdw-ticon{flex:none;display:inline-flex;color:var(--dsw-alias-label-secondary,#6b7280)}",
      ".mdw-tname{overflow:hidden;text-overflow:ellipsis;min-width:0}",
      ".mdw-empty{flex:1;display:flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary,#9ca3af);font-size:12px;padding:20px}",
      ".mdw-err{background:rgba(220,38,38,.1);color:#b91c1c;border:1px solid rgba(220,38,38,.3);border-radius:6px;padding:6px 10px;margin:8px 10px;font-size:12px;white-space:pre-wrap}",
      ".mdw-conflict{display:flex;align-items:center;gap:8px;background:rgba(217,119,6,.12);color:#b45309;border:1px solid rgba(217,119,6,.35);border-radius:6px;padding:6px 10px;margin:8px 10px;font-size:12px}",
      ".mdw-conflict span{flex:1;min-width:0}",
      ".mdw-saved{color:#15803d;font-size:12px;margin-left:4px}",
      ".mdw-toggle{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 9px;border:1px solid transparent;border-radius:7px;background:transparent;color:inherit;cursor:pointer;font-size:12px}",
      ".mdw-toggle:hover{background:var(--dsw-alias-button-floating-hover,rgba(0,0,0,.06))}",
      ".mdw-toggle-active{background:var(--dsw-alias-button-floating-fill,rgba(37,99,235,.12));color:#2563eb}",
      ".mdw-fileicon{color:#94a3b8}.mdw-diricon{color:#60a5fa}"
    ].join("\n");
    if (typeof document !== "undefined") {
      const tagId = "dsh-md-workspace/style";
      if (!document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]")) {
        const tag = document.createElement("style");
        tag.dataset.plugin = "dsh-md-workspace";
        tag.dataset.pluginCss = tagId;
        tag.textContent = css;
        document.head.appendChild(tag);
      }
    }

    // ------------------------------------------------------------------
    // Shared visibility store (footer toggle <-> overlay panel)
    // ------------------------------------------------------------------
    let panelOpen = false;
    let lastRoot = null; // 上次浏览的目录，开关面板间保持
    let sessionsService = null; // 客户端 sessions 服务（读取当前会话工作区）
    const openListeners = new Set();
    const subscribeOpen = (l) => { openListeners.add(l); return () => { openListeners.delete(l); }; };
    const getOpen = () => panelOpen;
    const setOpen = (v) => {
      if (panelOpen === v) return;
      panelOpen = v;
      for (const l of [...openListeners]) l();
    };
    const usePanelOpen = () => React.useSyncExternalStore(subscribeOpen, getOpen);

    // ------------------------------------------------------------------
    // Icons (small inline SVGs)
    // ------------------------------------------------------------------
    const FolderIcon = React.createElement("svg", { width: 14, height: 14, viewBox: "0 0 16 16", fill: "currentColor", "aria-hidden": true },
      React.createElement("path", { d: "M1.75 2.5A1.75 1.75 0 0 0 0 4.25v7.5A1.75 1.75 0 0 0 1.75 13.5h12.5A1.75 1.75 0 0 0 16 11.75V5.5a1.75 1.75 0 0 0-1.75-1.75H8.28L6.78 2.5H1.75Z" })
    );
    const FileIcon = React.createElement("svg", { width: 14, height: 14, viewBox: "0 0 16 16", fill: "currentColor", "aria-hidden": true },
      React.createElement("path", { d: "M3 1.5A1.5 1.5 0 0 0 1.5 3v10A1.5 1.5 0 0 0 3 14.5h10a1.5 1.5 0 0 0 1.5-1.5V5.6a1.5 1.5 0 0 0-.44-1.06l-2.6-2.6A1.5 1.5 0 0 0 10.4 1.5H3Zm1.75 2.25h4v1.5h-4v-1.5Zm0 3h6.5v1.5h-6.5v-1.5Zm0 3h6.5v1.5h-6.5v-1.5Z" })
    );
    const CloseIcon = React.createElement("svg", { width: 14, height: 14, viewBox: "0 0 16 16", fill: "currentColor", "aria-hidden": true },
      React.createElement("path", { d: "M4.28 3.22a.75.75 0 0 0-1.06 1.06L6.94 8l-3.72 3.72a.75.75 0 1 0 1.06 1.06L8 9.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L9.06 8l3.72-3.72a.75.75 0 0 0-1.06-1.06L8 6.94 4.28 3.22Z" })
    );

    // ------------------------------------------------------------------
    // API helper
    // ------------------------------------------------------------------
    async function api(url, options) {
      const res = await fetch(url, options);
      let data = null;
      try { data = await res.json(); } catch { /* ignore */ }
      if (!res.ok) {
        const err = new Error((data && data.error && data.error.message) || ("HTTP " + res.status));
        err.code = (data && data.error && data.error.code) || ("HTTP_" + res.status);
        throw err;
      }
      return data;
    }

    // ------------------------------------------------------------------
    // Markdown renderer (self-contained; no raw HTML passthrough)
    // ------------------------------------------------------------------
    function escapeHtml(s) {
      return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
    /** Reject javascript:/data:/etc. schemes on an already-escaped URL. */
    function unsafeScheme(escapedUrl) {
      if (typeof escapedUrl !== "string") return true;
      const probe = escapedUrl.replace(/&amp;/gi, "&");
      const m = /^\s*([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(probe);
      if (!m) return false; // relative or fragment — allow
      const scheme = m[1].toLowerCase();
      return scheme !== "http" && scheme !== "https" && scheme !== "mailto";
    }
    function inlineMarkdown(s) {
      let t = escapeHtml(s);
      t = t.replace(/`([^`\n]+)`/g, (m, c) => "<code>" + c + "</code>");
      t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (m, alt, src) => {
        if (unsafeScheme(src)) return alt;
        return '<img alt="' + alt + '" src="' + src + '" />';
      });
      t = t.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (m, text, href) => {
        if (unsafeScheme(href)) return text;
        return '<a href="' + href + '" target="_blank" rel="noreferrer">' + text + "</a>";
      });
      t = t.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
      t = t.replace(/__([^_\n]+)__/g, "<strong>$1</strong>");
      t = t.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
      t = t.replace(/(^|[^\w])_([^_\n]+)_(?!\w)/g, "$1<em>$2</em>");
      t = t.replace(/~~([^~\n]+)~~/g, "<del>$1</del>");
      return t;
    }
    function splitTableRow(line) {
      let s = line.trim();
      if (s.startsWith("|")) s = s.slice(1);
      if (s.endsWith("|")) s = s.slice(0, -1);
      return s.split("|").map((c) => c.trim());
    }
    function renderMarkdown(src) {
      const lines = String(src ?? "").replace(/\r\n?/g, "\n").split("\n");
      const out = [];
      let i = 0;
      while (i < lines.length) {
        const line = lines[i];
        const fence = line.match(/^\s{0,3}(```|~~~)(.*)$/);
        if (fence) {
          const lang = fence[2].trim();
          const buf = [];
          i++;
          while (i < lines.length && !/^\s{0,3}(```|~~~)\s*$/.test(lines[i])) { buf.push(lines[i]); i++; }
          i++;
          out.push("<pre><code" + (lang ? ' class="language-' + escapeHtml(lang) + '"' : "") + ">" + escapeHtml(buf.join("\n")) + "</code></pre>");
          continue;
        }
        if (line.trim() === "") { i++; continue; }
        const h = line.match(/^(#{1,6})\s+(.*)$/);
        if (h) { out.push("<h" + h[1].length + ">" + inlineMarkdown(h[2]) + "</h" + h[1].length + ">"); i++; continue; }
        if (/^\s{0,3}(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { out.push("<hr/>"); i++; continue; }
        if (/^\s{0,3}>\s?/.test(line)) {
          const buf = [];
          while (i < lines.length && /^\s{0,3}>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^\s{0,3}>\s?/, "")); i++; }
          out.push("<blockquote>" + renderMarkdown(buf.join("\n")) + "</blockquote>");
          continue;
        }
        if (line.includes("|") && i + 1 < lines.length && lines[i + 1].includes("-") && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
          const header = splitTableRow(line);
          i += 2;
          const rows = [];
          while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") { rows.push(splitTableRow(lines[i])); i++; }
          let html = "<table><thead><tr>";
          for (const c of header) html += "<th>" + inlineMarkdown(c) + "</th>";
          html += "</tr></thead><tbody>";
          for (const r of rows) {
            html += "<tr>";
            for (let k = 0; k < header.length; k++) html += "<td>" + inlineMarkdown(r[k] ?? "") + "</td>";
            html += "</tr>";
          }
          html += "</tbody></table>";
          out.push(html);
          continue;
        }
        const ul = line.match(/^\s{0,3}[-*+]\s+(.*)$/);
        const ol = line.match(/^\s{0,3}\d+[.)]\s+(.*)$/);
        if (ul || ol) {
          const isUl = !!ul;
          const tag = isUl ? "ul" : "ol";
          const buf = [];
          while (i < lines.length) {
            const m = isUl ? lines[i].match(/^\s{0,3}[-*+]\s+(.*)$/) : lines[i].match(/^\s{0,3}\d+[.)]\s+(.*)$/);
            if (!m) break;
            buf.push("<li>" + inlineMarkdown(m[1]) + "</li>");
            i++;
          }
          out.push("<" + tag + ">" + buf.join("") + "</" + tag + ">");
          continue;
        }
        const buf = [line];
        i++;
        while (i < lines.length) {
          const l = lines[i];
          if (l.trim() === "") break;
          if (/^\s{0,3}(```|~~~)/.test(l)) break;
          if (/^(#{1,6})\s+/.test(l)) break;
          if (/^\s{0,3}(-{3,}|\*{3,}|_{3,})\s*$/.test(l)) break;
          if (/^\s{0,3}>\s?/.test(l)) break;
          if (/^\s{0,3}[-*+]\s+/.test(l)) break;
          if (/^\s{0,3}\d+[.)]\s+/.test(l)) break;
          if (l.includes("|") && i + 1 < lines.length && lines[i + 1].includes("-") && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1])) break;
          buf.push(l);
          i++;
        }
        out.push("<p>" + buf.map(inlineMarkdown).join("<br/>") + "</p>");
      }
      return out.join("\n");
    }

    // ------------------------------------------------------------------
    // File tree
    // ------------------------------------------------------------------
    function DirList({ path, refreshKey, onOpenFile, selectedPath }) {
      const [state, setState] = React.useState({ loading: true, entries: null, error: null });
      React.useEffect(() => {
        let cancelled = false;
        setState((s) => ({ ...s, loading: true, error: null }));
        api("/mdw/list?path=" + encodeURIComponent(path))
          .then((data) => { if (!cancelled) setState({ loading: false, entries: data.entries || [], error: null }); })
          .catch((e) => { if (!cancelled) setState({ loading: false, entries: null, error: e.message || String(e) }); });
        return () => { cancelled = true; };
      }, [path, refreshKey]);

      if (state.loading) return React.createElement("div", { className: "mdw-empty" }, "加载中…");
      if (state.error) return React.createElement("div", { className: "mdw-err" }, state.error);
      if (!state.entries || state.entries.length === 0) return React.createElement("div", { className: "mdw-empty" }, "空目录");
      const dirs = state.entries.filter((e) => e.type === "directory");
      const files = state.entries.filter((e) => e.type !== "directory");
      const sorted = [...dirs, ...files];
      return React.createElement("div", null, sorted.map((entry) =>
        React.createElement(TreeNode, {
          key: entry.name,
          entry,
          parent: path,
          depth: 0,
          onOpenFile,
          selectedPath,
          refreshKey
        })
      ));
    }

    function TreeNode({ entry, parent, depth, onOpenFile, selectedPath, refreshKey }) {
      const isDir = entry.type === "directory";
      const childPath = parent.replace(/\/+$/, "") + "/" + entry.name;
      const [expanded, setExpanded] = React.useState(false);
      const [kids, setKids] = React.useState(null);
      const [kidErr, setKidErr] = React.useState(null);
      const [loadingKids, setLoadingKids] = React.useState(false);

      React.useEffect(() => {
        if (!isDir || !expanded) return;
        let cancelled = false;
        setLoadingKids(true);
        setKidErr(null);
        api("/mdw/list?path=" + encodeURIComponent(childPath))
          .then((data) => { if (!cancelled) { setKids(data.entries || []); setLoadingKids(false); } })
          .catch((e) => { if (!cancelled) { setKidErr(e.message || String(e)); setLoadingKids(false); } });
        return () => { cancelled = true; };
      }, [childPath, expanded, refreshKey]);

      const row = React.createElement("div", {
        className: "mdw-trow" + (selectedPath === childPath ? " sel" : ""),
        style: { paddingLeft: 6 + depth * 14 },
        onClick: () => { if (isDir) setExpanded(!expanded); else onOpenFile(childPath); },
        title: childPath
      },
        React.createElement("span", { className: "mdw-ticon" + (isDir ? " mdw-diricon" : " mdw-fileicon") }, isDir ? FolderIcon : FileIcon),
        React.createElement("span", { className: "mdw-tname" }, entry.name),
        isDir ? React.createElement("span", { className: "mdw-ticon", style: { fontSize: 10 } }, expanded ? "▾" : "▸") : null
      );

      const children = [];
      if (isDir && expanded) {
        children.push(loadingKids ? React.createElement("div", { key: "l", className: "mdw-empty", style: { padding: 4 } }, "…") : null);
        if (kidErr) children.push(React.createElement("div", { key: "e", className: "mdw-err", style: { margin: "4px 8px" } }, kidErr));
        if (kids) {
          const d = kids.filter((e) => e.type === "directory");
          const f = kids.filter((e) => e.type !== "directory");
          [...d, ...f].forEach((k) => children.push(
            React.createElement(TreeNode, { key: k.name, entry: k, parent: childPath, depth: depth + 1, onOpenFile, selectedPath, refreshKey })
          ));
        }
      }
      return React.createElement(React.Fragment, null, row, ...children);
    }

    // ------------------------------------------------------------------
    // Editor + preview panel
    // ------------------------------------------------------------------
    function MdWorkspacePanel() {
      const open = usePanelOpen();
      // 当前会话的工作区目录（cwd）：来自客户端 sessions 服务的 list 快照。
      const currentCwd = React.useSyncExternalStore(
        (cb) => {
          const s = sessionsService;
          if (s && s.list && typeof s.list.subscribe === "function") return s.list.subscribe(cb);
          return () => {};
        },
        () => {
          const s = sessionsService;
          if (!s || !s.list || typeof s.list.getSnapshot !== "function") return undefined;
          const snap = s.list.getSnapshot();
          if (!snap || typeof snap !== "object" || snap.byId === undefined) return undefined;
          const id = snap.current;
          if (typeof id !== "string") return undefined;
          const summary = snap.byId[id];
          const cwd = summary && typeof summary.cwd === "string" ? summary.cwd : "";
          return cwd.length > 0 ? cwd : undefined;
        }
      );
      const [root, setRoot] = React.useState(lastRoot);
      const [pathDraft, setPathDraft] = React.useState(lastRoot ?? "");
      const [size, setSize] = React.useState(() => {
        const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
        const vh = typeof window !== "undefined" ? window.innerHeight : 900;
        return { width: Math.max(360, Math.min(880, vw - 24)), height: Math.max(280, Math.min(760, vh - 24)) };
      });
      const [maximized, setMaximized] = React.useState(false);
      const [treeWidth, setTreeWidth] = React.useState(300);
      const [treeVisible, setTreeVisible] = React.useState(true);
      const [refreshKey, setRefreshKey] = React.useState(0);
      const [selected, setSelected] = React.useState(null); // {path, content, version, type}
      const [dirty, setDirty] = React.useState(false);
      const [mode, setMode] = React.useState("split"); // edit | preview | split
      const [error, setError] = React.useState(null);
      const [conflict, setConflict] = React.useState(false);
      const [saving, setSaving] = React.useState(false);
      const [opening, setOpening] = React.useState(false);
      const [savedAt, setSavedAt] = React.useState(null);
      const [autosave, setAutosave] = React.useState(true);
      const [copied, setCopied] = React.useState(false);
      const copyTimer = React.useRef(null);
      const [splitRatio, setSplitRatio] = React.useState(0.5);
      const splitRef = React.useRef(null);
      const openSeq = React.useRef(0);

      React.useEffect(() => {
        if (!open) return;
        if (root !== null) return;
        // 首次打开：优先当前会话工作区，其次宿主 /mdw/root 兜底。
        if (currentCwd) {
          setRoot(currentCwd);
          setPathDraft(currentCwd);
          lastRoot = currentCwd;
          return;
        }
        api("/mdw/root").then((d) => { if (d && d.root) { setRoot(d.root); setPathDraft(d.root); lastRoot = d.root; } })
          .catch((e) => setError(e.message || String(e)));
      }, [open, root, currentCwd]);

      // Keep the tree pane clamped when the panel is resized narrower.
      React.useEffect(() => {
        setTreeWidth((w) => Math.max(140, Math.min(w, Math.max(140, size.width - 200))));
      }, [size.width]);

      const confirmDiscard = () => {
        if (!dirty) return true;
        if (typeof window !== "undefined" && typeof window.confirm === "function") {
          return window.confirm("当前文件有未保存的修改，确定放弃？");
        }
        return false;
      };

      const readInto = (path, confirm) => {
        if (confirm && !confirmDiscard()) return;
        const seq = ++openSeq.current;
        setError(null);
        setConflict(false);
        setOpening(true);
        api("/mdw/read?path=" + encodeURIComponent(path))
          .then((data) => {
            if (seq !== openSeq.current) return;
            setOpening(false);
            if (data.missing) { setError("文件不存在: " + path); return; }
            setSelected({ path: data.path, content: data.content || "", version: data.version, type: data.type });
            setDirty(false);
            setSavedAt(null);
          })
          .catch((e) => {
            if (seq !== openSeq.current) return;
            setOpening(false);
            setError(e.message || String(e));
          });
      };

      const openFile = (path) => readInto(path, true);
      const reloadFromDisk = (path) => readInto(path, false);

      const save = React.useCallback((force = false) => {
        if (!selected || !dirty || saving) return;
        setSaving(true);
        setError(null);
        setConflict(false);
        api("/mdw/write", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            path: selected.path,
            content: selected.content,
            ...(force ? {} : { version: selected.version }),
            force
          })
        })
          .then((data) => {
            setSelected((s) => s ? { ...s, version: data.version } : s);
            setDirty(false);
            setSaving(false);
            setSavedAt(new Date());
          })
          .catch((e) => {
            setSaving(false);
            if (e.code === "FS_STALE_VERSION") {
              setConflict(true);
              setError("磁盘上的文件已被其他程序修改。请选择：重载磁盘内容，或强制覆盖。");
            } else {
              setError(e.message || String(e));
            }
          });
      }, [selected, dirty, saving]);

      // Debounced autosave (pauses while a conflict is pending, so it never loops).
      React.useEffect(() => {
        if (!autosave || !dirty || saving || conflict) return;
        const t = setTimeout(() => save(), 1200);
        return () => clearTimeout(t);
      }, [selected?.content, dirty, saving, conflict, autosave, save]);

      if (!open) return null;

      const navigate = () => {
        const p = pathDraft.trim();
        if (!p) return;
        if (!confirmDiscard()) return;
        setError(null);
        setConflict(false);
        setRoot(p);
        lastRoot = p;
        setSelected(null);
        setDirty(false);
        setRefreshKey((k) => k + 1);
      };

      const toggleMaximize = () => setMaximized((m) => !m);

      // Drag the tree/view divider to change the directory pane width.
      const beginTreeResize = (e) => {
        e.preventDefault();
        const el = e.currentTarget;
        const pointerId = e.pointerId;
        const startX = e.clientX;
        const startW = treeWidth;
        const MIN_TREE = 140;
        const maxTree = () => Math.max(MIN_TREE, size.width - 200);
        const onMove = (ev) => {
          const w = Math.max(MIN_TREE, Math.min(maxTree(), startW + (ev.clientX - startX)));
          setTreeWidth(w);
        };
        const onUp = () => {
          el.removeEventListener("pointermove", onMove);
          el.removeEventListener("pointerup", onUp);
          el.removeEventListener("pointercancel", onUp);
          try { if (el.releasePointerCapture) el.releasePointerCapture(pointerId); } catch {}
          if (typeof document !== "undefined") { document.body.style.userSelect = ""; document.body.style.cursor = ""; }
        };
        try { if (el.setPointerCapture) el.setPointerCapture(pointerId); } catch {}
        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerup", onUp);
        el.addEventListener("pointercancel", onUp);
        if (typeof document !== "undefined") { document.body.style.userSelect = "none"; document.body.style.cursor = "col-resize"; }
      };

      // Drag the split divider to change the editor/preview ratio.
      const beginSplitResize = (e) => {
        e.preventDefault();
        const el = e.currentTarget;
        const pointerId = e.pointerId;
        const onMove = (ev) => {
          const wrap = splitRef.current;
          if (!wrap) return;
          const rect = wrap.getBoundingClientRect();
          if (rect.width <= 0) return;
          const ratio = (ev.clientX - rect.left) / rect.width;
          setSplitRatio(Math.max(0.15, Math.min(0.85, ratio)));
        };
        const onUp = () => {
          el.removeEventListener("pointermove", onMove);
          el.removeEventListener("pointerup", onUp);
          el.removeEventListener("pointercancel", onUp);
          try { if (el.releasePointerCapture) el.releasePointerCapture(pointerId); } catch {}
          if (typeof document !== "undefined") { document.body.style.userSelect = ""; document.body.style.cursor = ""; }
        };
        try { if (el.setPointerCapture) el.setPointerCapture(pointerId); } catch {}
        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerup", onUp);
        el.addEventListener("pointercancel", onUp);
        if (typeof document !== "undefined") { document.body.style.userSelect = "none"; document.body.style.cursor = "col-resize"; }
      };

      // Drag-to-resize: "w" resizes width from the left edge, "nw" also resizes
      // height from the bottom edge (panel is anchored top-right).
      const beginResize = (mode) => (e) => {
        if (maximized) return;
        e.preventDefault();
        const el = e.currentTarget;
        const pointerId = e.pointerId;
        const startX = e.clientX;
        const startY = e.clientY;
        const startW = size.width;
        const startH = size.height;
        const MIN_W = 360;
        const MIN_H = 280;
        const maxW = () => (typeof window !== "undefined" ? window.innerWidth : 1200) - 24;
        const maxH = () => (typeof window !== "undefined" ? window.innerHeight : 900) - 24;
        const onMove = (ev) => {
          if (mode === "w" || mode === "nw") {
            const w = Math.max(MIN_W, Math.min(maxW(), startW + (startX - ev.clientX)));
            setSize((s) => ({ ...s, width: w }));
          }
          if (mode === "nw") {
            const h = Math.max(MIN_H, Math.min(maxH(), startH + (ev.clientY - startY)));
            setSize((s) => ({ ...s, height: h }));
          }
        };
        const onUp = () => {
          el.removeEventListener("pointermove", onMove);
          el.removeEventListener("pointerup", onUp);
          el.removeEventListener("pointercancel", onUp);
          try { if (el.releasePointerCapture) el.releasePointerCapture(pointerId); } catch {}
          if (typeof document !== "undefined") { document.body.style.userSelect = ""; document.body.style.cursor = ""; }
        };
        try { if (el.setPointerCapture) el.setPointerCapture(pointerId); } catch {}
        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerup", onUp);
        el.addEventListener("pointercancel", onUp);
        if (typeof document !== "undefined") { document.body.style.userSelect = "none"; document.body.style.cursor = mode === "w" ? "ew-resize" : "nwse-resize"; }
      };

      const isMarkdown = !selected || /\.(md|markdown|mdown|mkd)$/i.test(selected.path);
      const showEdit = mode === "edit" || mode === "split";
      const showPreview = mode === "preview" || mode === "split";

      /** 复制当前文件的全路径（未选中文件时复制当前目录）。 */
      const copyPath = () => {
        const text = selected ? selected.path : root;
        if (!text) return;
        const fallback = () => {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.setAttribute("readonly", "");
          ta.style.position = "fixed";
          ta.style.left = "-9999px";
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand("copy"); } finally { document.body.removeChild(ta); }
        };
        const done = () => {
          setCopied(true);
          if (copyTimer.current) clearTimeout(copyTimer.current);
          copyTimer.current = setTimeout(() => setCopied(false), 1200);
        };
        if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
          navigator.clipboard.writeText(text).then(done, () => { try { fallback(); done(); } catch (e) { setError("复制失败: " + (e && e.message ? e.message : String(e))); } });
        } else {
          try { fallback(); done(); } catch (e) { setError("复制失败: " + (e && e.message ? e.message : String(e))); }
        }
      };

      const viewBar = React.createElement("div", { className: "mdw-viewbar" },
        React.createElement("span", { className: "mdw-fname" }, opening ? "打开中…" : (selected ? selected.path : "选择左侧文件以打开")),
        React.createElement("button", { type: "button", className: "mdw-btn" + (copied ? " mdw-copied" : ""), title: selected ? "复制文件全路径" : "复制当前目录路径", onClick: copyPath }, copied ? "已复制" : "复制路径"),
        React.createElement("button", { type: "button", className: "mdw-btn" + (mode === "edit" ? " active" : ""), onClick: () => setMode("edit") }, "编辑"),
        React.createElement("button", { type: "button", className: "mdw-btn" + (mode === "preview" ? " active" : ""), onClick: () => setMode("preview") }, "预览"),
        React.createElement("button", { type: "button", className: "mdw-btn" + (mode === "split" ? " active" : ""), onClick: () => setMode("split") }, "分栏"),
        React.createElement("button", { type: "button", className: "mdw-btn" + (autosave ? " active" : ""), title: "停止输入后自动保存", onClick: () => setAutosave(!autosave) }, autosave ? "自动:开" : "自动:关"),
        dirty ? React.createElement("button", { type: "button", className: "mdw-btn primary", onClick: () => save(), disabled: saving }, saving ? "保存中…" : "保存") : null,
        savedAt && !dirty ? React.createElement("span", { className: "mdw-saved" }, "已保存") : null
      );

      const splitActive = showEdit && showPreview;
      const editor = React.createElement("textarea", {
        className: "mdw-editor",
        style: splitActive ? { flex: splitRatio } : undefined,
        value: selected ? selected.content : "",
        spellCheck: false,
        placeholder: selected ? "" : "打开文件后在此编辑",
        onChange: (e) => { setSelected((s) => s ? { ...s, content: e.target.value } : s); setDirty(true); setSavedAt(null); },
        onKeyDown: (e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); save(); }
        }
      });

      const preview = isMarkdown
        ? React.createElement("div", { className: "mdw-md", style: splitActive ? { flex: 1 - splitRatio } : undefined, dangerouslySetInnerHTML: { __html: selected ? renderMarkdown(selected.content) : "" } })
        : React.createElement("pre", { className: "mdw-plain", style: splitActive ? { flex: 1 - splitRatio } : undefined }, selected ? selected.content : "");

      const splitBody = React.createElement("div", { className: "mdw-split", ref: splitRef },
        showEdit ? editor : null,
        showEdit && showPreview ? React.createElement("div", { className: "mdw-splitdiv", title: "拖拽调整分栏宽度", onPointerDown: beginSplitResize }) : null,
        showPreview ? preview : null
      );

      const viewBody = selected ? splitBody : React.createElement("div", { className: "mdw-empty" }, "从左侧目录选择文件（.md 支持实时预览）");

      const panelStyle = maximized
        ? { top: 8, right: 8, width: "calc(100vw - 16px)", height: "calc(100vh - 16px)" }
        : { top: 12, right: 12, width: size.width, height: size.height };

      return React.createElement("div", { className: "mdw-panel", role: "dialog", "aria-label": "文件浏览器", style: panelStyle },
        maximized ? null : React.createElement("div", { className: "mdw-resize-w", onPointerDown: beginResize("w") }),
        maximized ? null : React.createElement("div", { className: "mdw-resize-nw", onPointerDown: beginResize("nw") }),
        React.createElement("div", { className: "mdw-head" },
          React.createElement("span", { className: "mdw-title" }, "文件浏览器"),
          React.createElement("button", { type: "button", className: "mdw-btn" + (treeVisible ? " active" : ""), title: treeVisible ? "隐藏目录栏" : "显示目录栏", onClick: () => setTreeVisible((v) => !v) }, "目录"),
          React.createElement("div", { className: "mdw-path" },
            React.createElement("input", {
              value: pathDraft,
              spellCheck: false,
              placeholder: "/absolute/path",
              onChange: (e) => setPathDraft(e.target.value),
              onKeyDown: (e) => { if (e.key === "Enter") navigate(); }
            }),
            React.createElement("button", { type: "button", className: "mdw-btn", onClick: navigate }, "打开"),
            React.createElement("button", { type: "button", className: "mdw-btn", onClick: () => { setRefreshKey((k) => k + 1); } }, "刷新")
          ),
          React.createElement("button", { type: "button", className: "mdw-btn", title: maximized ? "还原" : "最大化", onClick: toggleMaximize }, maximized ? "还原" : "最大化"),
          React.createElement("button", { type: "button", className: "mdw-close", "aria-label": "关闭", onClick: () => setOpen(false) }, CloseIcon)
        ),
        error ? React.createElement("div", { className: "mdw-err" }, error) : null,
        conflict ? React.createElement("div", { className: "mdw-conflict" },
          React.createElement("span", null, "磁盘内容已变化"),
          React.createElement("button", { type: "button", className: "mdw-btn", onClick: () => { if (selected) reloadFromDisk(selected.path); } }, "重载磁盘"),
          React.createElement("button", { type: "button", className: "mdw-btn primary", onClick: () => save(true) }, "强制覆盖")
        ) : null,
        React.createElement("div", { className: "mdw-body" },
          treeVisible ? React.createElement("div", { className: "mdw-tree", style: { width: treeWidth } },
            root ? React.createElement(DirList, { path: root, refreshKey, onOpenFile: openFile, selectedPath: selected ? selected.path : null }) : React.createElement("div", { className: "mdw-empty" }, "…")
          ) : null,
          treeVisible ? React.createElement("div", { className: "mdw-splitter", title: "拖拽调整目录栏宽度", onPointerDown: beginTreeResize }) : null,
          React.createElement("div", { className: "mdw-view" }, viewBar, viewBody)
        )
      );
    }

    function MdWorkspaceToggle(props) {
      const open = usePanelOpen();
      const wide = !!props.wide;
      return React.createElement("button", {
        type: "button",
        className: "mdw-toggle" + (open ? " mdw-toggle-active" : ""),
        title: "文件浏览器 / Markdown 预览",
        "aria-pressed": open,
        onClick: () => setOpen(!open)
      }, FolderIcon, wide ? React.createElement("span", null, "文件") : null);
    }

    // ------------------------------------------------------------------
    // Plugin body
    // ------------------------------------------------------------------
    const inject = ["slots"];
    function apply(ctx) {
      sessionsService = ctx.get("sessions") ?? null;
      ctx.effect(() => {
        const waiters = [
          ctx.slots.inject("shell.overlay", () => ctx.slots.register({ name: "shell.overlay", id: "md-workspace.panel" }, MdWorkspacePanel)),
          ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({ name: "sidebar.footer.action", id: "md-workspace.toggle" }, MdWorkspaceToggle))
        ];
        return () => { for (const w of waiters) w(); };
      }, "md-workspace: slot registrations");
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
