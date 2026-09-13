window.__ModuleLoader__.load({
  id: "dsh-claude-code-web",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");

    const API = "/claude/api";

    // 全局入口：侧边栏底部按钮（sidebar.footer.action）<-> 悬浮面板（shell.overlay）共享显隐状态
    let panelOpen = false;
    const openListeners = new Set();
    const subscribeOpen = (l) => { openListeners.add(l); return () => { openListeners.delete(l); }; };
    const getOpen = () => panelOpen;
    const setOpen = (v) => { if (panelOpen === v) return; panelOpen = v; for (const l of [...openListeners]) l(); };
    const usePanelOpen = () => React.useSyncExternalStore(subscribeOpen, getOpen);

    // ------------------------------------------------------------------
    // 样式注入（跟随 md-workspace 的做法：document 注入 <style>）
    // ------------------------------------------------------------------
    const CSS = `
.ccw { position:absolute; display:flex; flex-direction:column; background:var(--dsw-alias-bg-base,#151517); color:var(--dsw-alias-label-primary,#1f2937); font-size:13px; border:1px solid var(--dsw-alias-border-l2,#e5e7eb); border-radius:12px; box-shadow:0 16px 48px rgba(0,0,0,.18); overflow:hidden; pointer-events:auto; z-index:40; }
.ccw * { box-sizing:border-box; }
.ccw-resize-se { position:absolute; right:0; bottom:0; width:18px; height:18px; cursor:nwse-resize; z-index:41; }
.ccw-resize-se::after { content:""; position:absolute; right:4px; bottom:4px; width:9px; height:9px; border-right:2px solid var(--dsw-alias-label-secondary,#9ca3af); border-bottom:2px solid var(--dsw-alias-label-secondary,#9ca3af); opacity:.6; }
.ccw-titlebar { display:flex; align-items:center; gap:8px; padding:8px 12px; border-bottom:1px solid var(--dsw-alias-border-l1,#e5e7eb); flex:none; cursor:grab; }
.ccw-titlebar:active { cursor:grabbing; }
.ccw-brand { font-weight:600; font-size:13px; white-space:nowrap; display:inline-flex; align-items:center; gap:6px; }
.ccw-logo { flex:none; display:block; }
.ccw-conn { font-size:11px; white-space:nowrap; }
.ccw-close { border:none; background:transparent; color:inherit; cursor:pointer; font-size:16px; line-height:1; padding:4px 6px; border-radius:6px; }
.ccw-close:hover { background:var(--dsw-alias-bg-layer-2,#f3f4f6); }
.ccw-max { border:none; background:transparent; color:inherit; cursor:pointer; font-size:12px; line-height:1; padding:5px 8px; border-radius:6px; white-space:nowrap; }
.ccw-max:hover { background:var(--dsw-alias-bg-layer-2,#f3f4f6); }
.ccw-toggle { display:inline-flex; align-items:center; gap:6px; height:30px; padding:0 9px; border:1px solid transparent; border-radius:7px; background:transparent; color:inherit; cursor:pointer; font-size:12px; }
.ccw-toggle:hover { background:var(--dsw-alias-button-floating-hover,rgba(0,0,0,.06)); }
.ccw-toggle-active { background:var(--dsw-alias-button-floating-fill,rgba(37,99,235,.12)); color:#2563eb; }
.ccw-topbar { display:flex; align-items:center; gap:8px; padding:6px 10px; border-bottom:1px solid var(--dsw-alias-border-l1,#e5e7eb); flex:none; }
.ccw-body { flex:1; display:flex; min-height:0; }
.ccw-sidebar { flex:none; overflow-y:auto; border-right:1px solid var(--dsw-alias-border-l1,#e5e7eb); padding:8px; }
.ccw-split { flex:none; width:5px; cursor:col-resize; background:var(--dsw-alias-border-l2,#e5e7eb); touch-action:none; z-index:2; }
.ccw-split:hover { background:#4f8cff; }
.ccw-main { flex:1; min-width:0; display:flex; flex-direction:column; }
.ccw-msgs { flex:1; overflow-y:auto; padding:12px 14px; display:flex; flex-direction:column; gap:10px; }
.ccw-footer { flex:none; border-top:1px solid var(--dsw-alias-border-l1,#e5e7eb); padding:8px 10px 10px; display:flex; flex-direction:column; }
.ccw-input-row { display:flex; align-items:flex-end; gap:8px; }
.ccw-input { flex:1; resize:none; min-height:40px; max-height:360px; padding:8px 10px; border:1px solid var(--dsw-alias-border-l2,#d1d5db); border-radius:8px; font:inherit; background:var(--dsw-alias-bg-base,#fff); color:var(--dsw-alias-label-primary,#1f2937); }
.ccw-input:focus { outline:none; border-color:#4f8cff; }
.ccw-btn { border:1px solid var(--dsw-alias-border-l2,#d1d5db); background:var(--dsw-alias-bg-base,#fff); color:var(--dsw-alias-label-primary,#1f2937); border-radius:8px; padding:8px 12px; cursor:pointer; font:inherit; white-space:nowrap; }
.ccw-btn:hover { background:var(--dsw-alias-bg-layer-2,#f3f4f6); }
.ccw-btn.primary { background:#2563eb; border-color:#2563eb; color:#fff; }
.ccw-btn.primary:hover { background:#1d4ed8; }
.ccw-btn.danger { background:var(--dsw-alias-state-error-primary,#dc2626); border-color:var(--dsw-alias-state-error-primary,#dc2626); color:#fff; }
.ccw-btn.small { padding:4px 8px; font-size:12px; border-radius:6px; }
.ccw-btn:disabled { opacity:.5; cursor:not-allowed; }
.ccw-ws { margin-bottom:6px; }
.ccw-ws-head { display:flex; align-items:center; gap:4px; cursor:pointer; padding:4px 6px; border-radius:6px; font-weight:600; }
.ccw-ws-head:hover { background:var(--dsw-alias-bg-layer-2,#f3f4f6); }
.ccw-ws-head.current { background:rgba(79,140,255,.14); }
.ccw-ws-cur { width:7px; height:7px; border-radius:50%; background:#4f8cff; flex:none; }
.ccw-ws-name { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ccw-srow { display:flex; align-items:center; gap:6px; padding:5px 6px 5px 18px; border-radius:6px; cursor:pointer; }
.ccw-srow:hover { background:var(--dsw-alias-bg-layer-2,#f3f4f6); }
.ccw-srow.active { background:rgba(79,140,255,.14); }
.ccw-stitle { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ccw-sdim { flex:none; font-size:11px; color:var(--dsw-alias-label-secondary,#9ca3af); white-space:nowrap; padding-left:6px; }
.ccw-sdot { width:8px; height:8px; border-radius:50%; flex:none; }
.ccw-msg { max-width:86%; padding:8px 12px; border-radius:10px; line-height:1.55; overflow-wrap:anywhere; }
.ccw-msg.user { align-self:flex-end; background:#2563eb; color:#fff; white-space:pre-wrap; }
.ccw-msg.assistant { align-self:flex-start; background:var(--dsw-alias-bg-layer-1,#f3f4f6); }
.ccw-msg.tool { align-self:flex-start; background:var(--dsw-alias-bg-layer-1,#f3f4f6); font-size:12px; opacity:.85; }
.ccw-msg.result { align-self:flex-start; font-size:12px; }
.ccw-msg.result.err { color:var(--dsw-alias-state-error-primary,#dc2626); }
.ccw-thinking { font-size:12px; opacity:.65; white-space:pre-wrap; border-left:3px solid #cbd5e1; padding-left:8px; margin-bottom:6px; }
.ccw-think-toggle { display:inline-flex; align-items:center; gap:6px; border:none; background:transparent; color:var(--dsw-alias-label-secondary,#9ca3af); font-size:12px; cursor:pointer; padding:2px 0; margin-bottom:4px; }
.ccw-think-toggle:hover { color:var(--dsw-alias-label-primary,#1f2937); }
.ccw-think-chev { font-size:10px; line-height:1; }
.ccw-think-label { font-weight:500; }
.ccw-think-pulse { width:6px; height:6px; border-radius:50%; background:#9ca3af; animation:ccwPulse 1s ease-in-out infinite; }
@keyframes ccwPulse { 0%,100% { opacity:.2; } 50% { opacity:1; } }
.ccw-md { line-height:1.6; overflow-wrap:anywhere; }
.ccw-md .ccw-p { margin:4px 0; }
.ccw-md .ccw-pre { background:rgba(0,0,0,.05); border:1px solid var(--dsw-alias-border-l2,#d1d5db); border-radius:6px; padding:8px 10px; overflow-x:auto; margin:6px 0; font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size:12px; }
.ccw-md .ccw-pre code { font-family:inherit; white-space:pre; }
.ccw-md .ccw-icode { background:rgba(0,0,0,.06); border-radius:4px; padding:1px 5px; font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size:12px; }
.ccw-md .ccw-h { margin:8px 0 4px; font-weight:600; line-height:1.3; }
.ccw-md h1.ccw-h { font-size:17px; }
.ccw-md h2.ccw-h { font-size:15px; }
.ccw-md h3.ccw-h, .ccw-md h4.ccw-h, .ccw-md h5.ccw-h, .ccw-md h6.ccw-h { font-size:13.5px; }
.ccw-md .ccw-ul, .ccw-md .ccw-ol { margin:4px 0; padding-left:20px; }
.ccw-md .ccw-ul li, .ccw-md .ccw-ol li { margin:2px 0; }
.ccw-md .ccw-bq { border-left:3px solid var(--dsw-alias-border-l2,#cbd5e1); padding:2px 10px; margin:6px 0; opacity:.85; }
.ccw-md .ccw-table-wrap { overflow-x:auto; margin:6px 0; }
.ccw-md .ccw-table { border-collapse:collapse; width:100%; min-width:320px; }
.ccw-md .ccw-table th, .ccw-md .ccw-table td { border:1px solid var(--dsw-alias-border-l2,#d1d5db); padding:5px 10px; font-size:12px; text-align:left; }
.ccw-md .ccw-table th { background:var(--dsw-alias-bg-layer-2,#f3f4f6); font-weight:600; }
.ccw-md .ccw-hr { border:none; border-top:1px solid var(--dsw-alias-border-l2,#d1d5db); margin:8px 0; }
.ccw-md .ccw-a { color:#2563eb; text-decoration:none; }
.ccw-md .ccw-a:hover { text-decoration:underline; }
.ccw-md strong { font-weight:600; }
.ccw-md em { font-style:italic; }
.ccw-pre-wrap { position:relative; }
.ccw-code-copy { position:absolute; top:6px; right:6px; border:1px solid var(--dsw-alias-border-l2,#d1d5db); background:var(--dsw-alias-bg-base,#fff); color:var(--dsw-alias-label-primary,#1f2937); border-radius:4px; font-size:10px; padding:2px 6px; cursor:pointer; opacity:.55; }
.ccw-code-copy:hover { opacity:1; }
.ccw-msgtime-in { font-size:10px; opacity:.55; margin-top:3px; text-align:right; }
.ccw-tool-out { font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size:11px; background:rgba(127,127,127,.12); border-radius:6px; padding:6px 8px; white-space:pre-wrap; max-height:220px; overflow-y:auto; margin-top:4px; }
.ccw-toasts { position:absolute; left:50%; bottom:64px; transform:translateX(-50%); display:flex; flex-direction:column; align-items:center; gap:6px; z-index:1200; pointer-events:none; }
.ccw-toast { background:rgba(20,20,24,.92); color:#fff; font-size:12px; padding:7px 14px; border-radius:8px; box-shadow:0 4px 16px rgba(0,0,0,.25); max-width:76%; }
.ccw-toast.err { background:rgba(220,38,38,.95); }
.ccw-toast.ok { background:rgba(22,163,74,.95); }
.ccw-mini-pill { position:absolute; right:20px; bottom:20px; display:inline-flex; align-items:center; gap:7px; padding:8px 14px; border-radius:999px; background:var(--dsw-alias-bg-base,#151517); border:1px solid var(--dsw-alias-border-l2,#e5e7eb); box-shadow:0 8px 24px rgba(0,0,0,.25); cursor:pointer; font-size:12px; font-weight:600; color:var(--dsw-alias-label-primary,#1f2937); z-index:40; }
.ccw-wsfilter { width:100%; margin-bottom:8px; padding:5px 8px; border:1px solid var(--dsw-alias-border-l2,#d1d5db); border-radius:6px; font:inherit; font-size:12px; background:var(--dsw-alias-bg-base,#fff); color:var(--dsw-alias-label-primary,#1f2937); }
.ccw-loadmore { align-self:center; margin-bottom:4px; }
.ccw-batchbar { align-self:stretch; display:flex; align-items:center; gap:8px; padding:6px 10px; border:1px solid #f59e0b; background:rgba(245,158,11,.08); border-radius:8px; font-size:12px; margin-bottom:2px; }
.ccw-queued { display:flex; align-items:center; gap:6px; font-size:11px; color:var(--dsw-alias-label-secondary,#9ca3af); padding:0 2px 4px; }
.ccw-img-chips { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:4px; padding:0 2px; }
.ccw-img-chip { display:inline-flex; align-items:center; gap:4px; font-size:11px; border:1px solid var(--dsw-alias-border-l2,#d1d5db); border-radius:6px; padding:2px 6px; background:var(--dsw-alias-bg-layer-2,#f3f4f6); }
.ccw-pop-hint { color:var(--dsw-alias-label-secondary,#9ca3af); font-size:10px; margin-left:4px; }
.ccw-umsg-edit { float:right; border:none; background:rgba(255,255,255,.25); color:#fff; cursor:pointer; font-size:10px; border-radius:4px; padding:1px 5px; margin-left:8px; opacity:.75; }
.ccw-umsg-edit:hover { opacity:1; }
.ccw-dialog-input { width:100%; padding:7px 9px; border:1px solid var(--dsw-alias-border-l2,#d1d5db); border-radius:6px; font:inherit; background:var(--dsw-alias-bg-base,#fff); color:var(--dsw-alias-label-primary,#1f2937); }
.ccw-dim { color:var(--dsw-alias-label-secondary,#9ca3af); font-size:12px; }
.ccw-icbtn { flex:none; border:none; background:transparent; color:var(--dsw-alias-label-secondary,#9ca3af); cursor:pointer; font-size:11px; line-height:1; padding:3px 4px; border-radius:4px; opacity:.65; }
.ccw-icbtn:hover { background:var(--dsw-alias-bg-layer-2,rgba(127,127,127,.18)); color:var(--dsw-alias-label-primary,#1f2937); opacity:1; }
.ccw-srow-actions { display:inline-flex; gap:2px; flex:none; margin-left:4px; opacity:.35; transition:opacity .12s; }
.ccw-srow:hover .ccw-srow-actions { opacity:1; }
.ccw-ctl { align-self:stretch; max-width:100%; border:1px solid #f59e0b; background:rgba(245,158,11,.06); }
.ccw-ctl-head { font-weight:600; margin-bottom:6px; }
.ccw-ctl-input { font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size:11px; background:rgba(127,127,127,.12); border-radius:6px; padding:6px 8px; white-space:pre-wrap; max-height:180px; overflow-y:auto; margin-bottom:8px; }
.ccw-ctl-actions { display:flex; gap:8px; }
.ccw-pop-list { display:flex; flex-direction:column; gap:2px; max-height:240px; overflow-y:auto; margin-bottom:6px; border:1px solid var(--dsw-alias-border-l1,#e5e7eb); border-radius:8px; padding:4px; background:var(--dsw-alias-bg-layer-1,#f9fafb); }
.ccw-pop-item { display:flex; align-items:center; gap:6px; padding:5px 8px; border-radius:6px; cursor:pointer; font-size:12px; white-space:nowrap; overflow:hidden; }
.ccw-pop-item:hover, .ccw-pop-item.sel { background:rgba(79,140,255,.14); }
.ccw-pop-kind { flex:none; font-size:10px; color:var(--dsw-alias-label-secondary,#9ca3af); border:1px solid var(--dsw-alias-border-l2,#d1d5db); border-radius:4px; padding:0 4px; }
.ccw-pop-kind.skill { color:#7c3aed; border-color:#7c3aed; }
.ccw-resize { height:6px; cursor:row-resize; margin:0 2px 6px; border-radius:3px; background:var(--dsw-alias-border-l2,#d1d5db); opacity:.5; }
.ccw-resize:hover { opacity:1; background:#4f8cff; }
.ccw-empty { align-self:center; margin:auto; color:var(--dsw-alias-label-secondary,#9ca3af); font-size:13px; text-align:center; }
.ccw-status { font-size:12px; color:var(--dsw-alias-label-secondary,#9ca3af); white-space:nowrap; }
.ccw-status.running, .ccw-status.starting { color:#f59e0b; }
.ccw-status.error { color:var(--dsw-alias-state-error-primary,#dc2626); }
.ccw-status.done, .ccw-status.stopped { color:#16a34a; }
.ccw-modal { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,.4); z-index:1100; }
.ccw-modal-box { background:var(--dsw-alias-bg-base,#fff); color:var(--dsw-alias-label-primary,#1f2937); border:1px solid var(--dsw-alias-border-l2,#e5e7eb); border-radius:12px; box-shadow:0 16px 48px rgba(0,0,0,.2); padding:16px; min-width:320px; max-width:480px; max-height:80%; overflow-y:auto; }
.ccw-modal-head { font-weight:600; font-size:14px; margin-bottom:10px; white-space:pre-wrap; }
.ccw-modal-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:14px; }
.ccw-modal-log { font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size:11px; background:rgba(0,0,0,.05); border-radius:6px; padding:8px; max-height:200px; overflow-y:auto; white-space:pre-wrap; margin-top:8px; }
`;

    let cssInjected = false;
    function ensureCss() {
      if (cssInjected || typeof document === "undefined") return;
      const tag = document.createElement("style");
      tag.setAttribute("data-plugin-css", "dsh-claude-code-web");
      tag.textContent = CSS;
      document.head.appendChild(tag);
      cssInjected = true;
    }

    // ------------------------------------------------------------------
    // 数据层：fetch POST 到宿主半部的 /claude/api/*
    // ------------------------------------------------------------------
    function api(method, body) {
      return fetch(API + "/" + method, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body || {}),
      }).then(function (r) { return r.json(); }).catch(function (e) {
        return { ok: false, error: String(e && e.message || e) };
      });
    }

    // ------------------------------------------------------------------
    // 本地存储小工具（localStorage 只存界面偏好，不产生任何网络请求）
    // ------------------------------------------------------------------
    function loadNum(key, dft) {
      try { const v = parseInt(localStorage.getItem(key), 10); if (isFinite(v) && v > 0) return v; } catch (e) {}
      return dft;
    }
    function saveNum(key, v) {
      try { localStorage.setItem(key, String(v)); } catch (e) {}
    }
    function loadGeom() {
      const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
      const vh = typeof window !== "undefined" ? window.innerHeight : 900;
      const w = Math.max(480, Math.min(1100, vw - 24));
      const h = Math.max(360, Math.min(720, vh - 24));
      const base = { left: Math.max(0, (vw - w) / 2), top: Math.max(0, (vh - h) / 2), width: w, height: h };
      try {
        const s = localStorage.getItem("ccwGeom");
        if (s) {
          const g = JSON.parse(s);
          if (g && typeof g.left === "number" && typeof g.top === "number" && typeof g.width === "number" && typeof g.height === "number") {
            // 防止窗口变小后面板完全出界
            return {
              left: Math.min(Math.max(0, g.left), Math.max(0, vw - 80)),
              top: Math.min(Math.max(0, g.top), Math.max(0, vh - 60)),
              width: Math.max(480, Math.min(g.width, vw - 8)),
              height: Math.max(360, Math.min(g.height, vh - 8)),
            };
          }
        }
      } catch (e) {}
      return base;
    }
    function getRecentCmds() {
      try { const l = JSON.parse(localStorage.getItem("ccwRecentCmds") || "[]"); return Array.isArray(l) ? l : []; } catch (e) { return []; }
    }
    function recordRecent(name) {
      try {
        let list = getRecentCmds();
        list = list.filter(function (n) { return n !== name; });
        list.unshift(name);
        localStorage.setItem("ccwRecentCmds", JSON.stringify(list.slice(0, 10)));
      } catch (e) {}
    }

    // 剪贴板复制（clipboard API 优先，execCommand 兜底）
    function copyText(text) {
      return new Promise(function (resolve) {
        try {
          if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () { resolve(true); }, function () { resolve(fallbackCopy(text)); });
            return;
          }
        } catch (e) {}
        resolve(fallbackCopy(text));
      });
    }
    function fallbackCopy(text) {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return ok;
      } catch (e) { return false; }
    }

    function expandCommand(text, catalog) {
      if (!catalog || !/^\//.test(text)) return text;
      const m = /^\/([A-Za-z0-9_-]+)(?:[\s]+([\s\S]*))?$/.exec(text);
      if (!m) return text;
      const name = m[1];
      const args = (m[2] || "").trim();
      const cmd = (catalog.commands || []).find(function (c) { return c.name === name; })
        || (catalog.skills || []).find(function (s) { return s.name === name; });
      if (!cmd || !cmd.body) return text;
      let body = cmd.body;
      if (/\$ARGUMENTS/.test(body)) body = body.replace(/\$ARGUMENTS/g, args || "");
      else if (args) body = body + "\n\n用户请求：\n" + args;
      return body;
    }

    // ------------------------------------------------------------------
    // Markdown 渲染（先转义 HTML 防注入，再做轻量 md → HTML）
    // ------------------------------------------------------------------
    function escapeHtml(s) {
      return String(s == null ? "" : s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }
    function inlineMd(s) {
      // 行内代码 `...`
      s = s.replace(/`([^`]+)`/g, '<code class="ccw-icode">$1</code>');
      // 链接 [text](url)
      s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a class="ccw-a" href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
      // 粗体 **...**
      s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      // 斜体 *...*（避开已被粗体处理的）
      s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
      return s;
    }
    // 表格辅助：解析一行单元格 / 判断分隔行 / 对齐方式
    function splitTableRow(line) {
      let s = String(line == null ? "" : line).trim();
      if (s.charAt(0) === "|") s = s.slice(1);
      if (s.charAt(s.length - 1) === "|") s = s.slice(0, -1);
      return s.split("|").map(function (c) { return c.trim(); });
    }
    function isTableRow(line) {
      return String(line == null ? "" : line).indexOf("|") !== -1;
    }
    function isSeparatorRow(line) {
      if (!isTableRow(line)) return false;
      const cells = splitTableRow(line);
      if (cells.length === 0) return false;
      return cells.every(function (c) { return /^:?-{2,}:?$/.test(c); });
    }
    function alignOf(cell) {
      const c = String(cell == null ? "" : cell).trim();
      if (c.charAt(0) === ":" && c.charAt(c.length - 1) === ":") return "center";
      if (c.charAt(c.length - 1) === ":") return "right";
      if (c.charAt(0) === ":") return "left";
      return "";
    }
    function renderTable(header, aligns, rows) {
      const h = ["<div class=\"ccw-table-wrap\"><table class=\"ccw-table\"><thead><tr>"];
      header.forEach(function (cell, ci) {
        const al = aligns[ci];
        h.push("<th" + (al ? ' style="text-align:' + al + '"' : "") + ">" + inlineMd(escapeHtml(cell)) + "</th>");
      });
      h.push("</tr></thead>");
      if (rows.length) {
        h.push("<tbody>");
        rows.forEach(function (r) {
          h.push("<tr>");
          const cols = Math.max(header.length, r.length);
          for (let ci = 0; ci < cols; ci++) {
            const cell = r[ci] != null ? r[ci] : "";
            const al = aligns[ci];
            h.push("<td" + (al ? ' style="text-align:' + al + '"' : "") + ">" + inlineMd(escapeHtml(cell)) + "</td>");
          }
          h.push("</tr>");
        });
        h.push("</tbody>");
      }
      h.push("</table></div>");
      return h.join("");
    }
    function renderMarkdown(text) {
      const src = String(text == null ? "" : text);
      const lines = src.split("\n");
      const out = [];
      let codeBuf = null;
      let codeLang = "";
      let list = null; // { tag: 'ul'|'ol' }
      const closeList = () => { if (list) { out.push("</" + list.tag + ">"); list = null; } };
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const fence = /^```([A-Za-z0-9_+-]*)\s*$/.exec(line);
        if (fence) {
          if (codeBuf !== null) {
            out.push('<div class="ccw-pre-wrap"><button type="button" class="ccw-code-copy" data-ccw-copy>复制</button><pre class="ccw-pre"' + (codeLang ? ' data-lang="' + escapeHtml(codeLang) + '"' : "") + '><code>' + codeBuf.join("\n") + "</code></pre></div>");
            codeBuf = null; codeLang = "";
          } else { codeBuf = []; codeLang = fence[1] || ""; closeList(); }
          continue;
        }
        if (codeBuf !== null) { codeBuf.push(escapeHtml(line)); continue; }

        const esc = escapeHtml(line);
        const h = /^(#{1,6})\s+(.*)$/.exec(esc);
        if (h) { closeList(); out.push('<h' + h[1].length + ' class="ccw-h">' + inlineMd(h[2]) + "</h" + h[1].length + ">"); continue; }
        if (/^\s*$/.test(esc)) { closeList(); continue; }
        const hr = /^\s*([-*_])(\s*\1){2,}\s*$/.exec(esc);
        if (hr) { closeList(); out.push('<hr class="ccw-hr">'); continue; }
        const bq = /^&gt;\s?(.*)$/.exec(esc);
        if (bq) { closeList(); out.push('<blockquote class="ccw-bq">' + inlineMd(bq[1]) + "</blockquote>"); continue; }
        const ul = /^\s*[-*]\s+(.*)$/.exec(esc);
        if (ul) { if (!list || list.tag !== "ul") { closeList(); out.push('<ul class="ccw-ul">'); list = { tag: "ul" }; } out.push("<li>" + inlineMd(ul[1]) + "</li>"); continue; }
        const ol = /^\s*\d+[.)]\s+(.*)$/.exec(esc);
        if (ol) { if (!list || list.tag !== "ol") { closeList(); out.push('<ol class="ccw-ol">'); list = { tag: "ol" }; } out.push("<li>" + inlineMd(ol[1]) + "</li>"); continue; }

        // 表格：当前行含 | 且下一行是分隔行（| --- | --- |）
        if (isTableRow(line) && isSeparatorRow(lines[i + 1])) {
          closeList();
          const header = splitTableRow(line);
          const aligns = splitTableRow(lines[i + 1]).map(alignOf);
          i += 2;
          const rows = [];
          while (i < lines.length && isTableRow(lines[i])) {
            rows.push(splitTableRow(lines[i]));
            i++;
          }
          i--; // 让 for 循环的 i++ 落到第一个非表格行
          out.push(renderTable(header, aligns, rows));
          continue;
        }

        closeList();
        out.push('<div class="ccw-p">' + inlineMd(esc) + "</div>");
      }
      if (codeBuf !== null) out.push('<div class="ccw-pre-wrap"><button type="button" class="ccw-code-copy" data-ccw-copy>复制</button><pre class="ccw-pre"><code>' + codeBuf.join("\n") + "</code></pre></div>");
      closeList();
      return out.join("\n");
    }

    // ------------------------------------------------------------------
    // Claude 品牌 logo（橙色星形，内联 SVG）
    // ------------------------------------------------------------------
    function ClaudeLogo(props) {
      const size = (props && props.size) || 15;
      return React.createElement("svg", {
        className: "ccw-logo",
        viewBox: "0 0 24 24",
        width: size, height: size,
        fill: "#D97757",
        "aria-hidden": "true",
      },
        React.createElement("path", { d: "M12 1.5 L14.5 9.5 L22.5 12 L14.5 14.5 L12 22.5 L9.5 14.5 L1.5 12 L9.5 9.5 Z" }),
      );
    }

    // ------------------------------------------------------------------
    // 消息渲染
    // ------------------------------------------------------------------
    function ControlCard({ msg }) {
      const [expanded, setExpanded] = React.useState(false);
      const answered = msg.decision != null;
      const label = answered
        ? (msg.decision === "allow" ? "已允许" : msg.decision === "always" ? "已始终允许" : "已拒绝")
        : null;
      const inputText = typeof msg.input === "string" ? msg.input : JSON.stringify(msg.input || {});
      const tooLong = String(inputText).length > 2000;
      return React.createElement("div", { className: "ccw-msg ccw-ctl" },
        React.createElement("div", { className: "ccw-ctl-head" },
          "🔐 " + (msg.displayName || msg.toolName || "工具") + " 请求授权"),
        inputText ? React.createElement("div", { className: "ccw-ctl-input" },
          expanded ? String(inputText) : String(inputText).slice(0, 2000),
          tooLong ? React.createElement("button", {
            type: "button", className: "ccw-think-toggle", style: { marginTop: 4, marginBottom: 0 },
            onClick: function () { setExpanded(function (v) { return !v; }); },
          }, expanded ? "收起" : "展开全部（共 " + String(inputText).length + " 字符）") : null,
        ) : null,
        answered
          ? React.createElement("div", { className: "ccw-dim" }, "状态：" + label)
          : React.createElement("div", null,
              React.createElement("div", { className: "ccw-ctl-actions" },
                React.createElement("button", { className: "ccw-btn small primary", onClick: () => api("answer-control", { requestId: msg.requestId, behavior: "allow" }) }, "允许"),
                React.createElement("button", { className: "ccw-btn small", onClick: () => api("answer-control", { requestId: msg.requestId, behavior: "always" }) }, "始终允许"),
                React.createElement("button", { className: "ccw-btn small danger", onClick: () => api("answer-control", { requestId: msg.requestId, behavior: "deny" }) }, "拒绝"),
              ),
              React.createElement("div", { className: "ccw-dim", style: { marginTop: 6 } }, "「始终允许」仅在本会话内对相同命令 / 文件路径生效"),
            ),
      );
    }

    // memo 比较器：服务端会原位更新消息对象（引用不变），必须逐字段比较才有意义
    function messagePropsEqual(a, b) {
      return a.msg === b.msg
        && a.msg.text === b.msg.text
        && a.msg.thinking === b.msg.thinking
        && a.msg.status === b.msg.status
        && a.msg.decision === b.msg.decision
        && a.msg.result === b.msg.result
        && a.msg.isError === b.msg.isError
        && a.live === b.live
        && a.onFill === b.onFill;
    }
    const MessageView = React.memo(function MessageView({ msg, live, onFill }) {
      const [thinkingOpen, setThinkingOpen] = React.useState(false);
      const [toolOpen, setToolOpen] = React.useState(false);
      // Markdown 解析按内容缓存：整树重渲染时不再对每条消息重跑正则
      const mdHtml = React.useMemo(function () { return renderMarkdown(msg.text); }, [msg.text]);
      const ts = msg.ts ? formatClock(msg.ts) : "";
      if (msg.role === "user") {
        return React.createElement("div", { className: "ccw-msg user" },
          msg.text || "",
          msg.images && msg.images.length ? React.createElement("div", { style: { opacity: .8, marginTop: 2 } }, "🖼 图片 ×" + msg.images.length) : null,
          onFill ? React.createElement("button", {
            type: "button", className: "ccw-umsg-edit", title: "填入输入框重新编辑",
            onClick: function (e) { e.stopPropagation(); onFill(msg.text || ""); },
          }, "✎") : null,
          ts ? React.createElement("div", { className: "ccw-msgtime-in" }, ts) : null,
        );
      }
      if (msg.role === "assistant") {
        const hasThinking = !!msg.thinking;
        const thinkingActive = hasThinking && !!live && !msg.text;
        return React.createElement("div", { className: "ccw-msg assistant" },
          hasThinking ? React.createElement("button", {
            type: "button",
            className: "ccw-think-toggle" + (thinkingOpen ? " open" : ""),
            onClick: function () { setThinkingOpen(function (v) { return !v; }); },
            title: thinkingOpen ? "收起思考过程" : "展开思考过程",
          },
            React.createElement("span", { className: "ccw-think-chev" }, thinkingOpen ? "▾" : "▸"),
            React.createElement("span", { className: "ccw-think-label" }, thinkingActive ? "思考中…" : "思考过程"),
            thinkingActive ? React.createElement("span", { className: "ccw-think-pulse" }) : null,
          ) : null,
          hasThinking && thinkingOpen ? React.createElement("div", { className: "ccw-thinking" }, msg.thinking) : null,
          React.createElement("div", {
            className: "ccw-md",
            dangerouslySetInnerHTML: { __html: mdHtml },
            onClick: function (e) {
              // 代码块复制按钮（dangerouslySetInnerHTML 内的元素无法绑 React 事件，用事件委托）
              const t = e.target;
              if (t && t.classList && t.classList.contains("ccw-code-copy")) {
                const wrap = t.parentElement;
                const code = wrap ? wrap.querySelector("pre code") : null;
                if (code) {
                  copyText(code.textContent || "").then(function (ok) {
                    t.textContent = ok ? "已复制 ✓" : "复制失败";
                    setTimeout(function () { t.textContent = "复制"; }, 1500);
                  });
                }
              }
            },
          }),
          ts ? React.createElement("div", { className: "ccw-msgtime-in" }, ts) : null,
        );
      }
      if (msg.role === "tool") {
        const hasResult = msg.result != null && String(msg.result).length > 0;
        return React.createElement("div", { className: "ccw-msg tool" },
          "🛠 " + (msg.name || "工具") + (msg.status === "running" ? "（运行中…）" : " ✓"),
          hasResult ? React.createElement("button", {
            type: "button", className: "ccw-think-toggle", style: { marginLeft: 6, marginBottom: 0 },
            onClick: function () { setToolOpen(function (v) { return !v; }); },
          }, toolOpen ? "▾ 收起输出" : "▸ 查看输出") : null,
          hasResult && toolOpen ? React.createElement("div", { className: "ccw-tool-out" },
            String(msg.result).length > 20000 ? String(msg.result).slice(0, 20000) + "\n…（过长已截断）" : String(msg.result),
          ) : null,
        );
      }
      if (msg.role === "result") {
        return React.createElement("div", { className: "ccw-msg result" + (msg.isError ? " err" : "") },
          (msg.isError ? "⚠ " : "✓ ") + (msg.text || ""));
      }
      if (msg.role === "control") {
        return React.createElement(ControlCard, { msg: msg });
      }
      return null;
    }, messagePropsEqual);

    // ------------------------------------------------------------------
    // 侧边栏
    // ------------------------------------------------------------------
    function Sidebar({ snap, collapsed, toggleWs, onNew, onSwitch, onAddWs, onRenameSession, onDeleteSession, onRenameWs, onDeleteWs, width, pickingWs, currentWs, onSelectWs }) {
      // 相对时间显示所需的本地计时（30s 一跳，纯本地渲染，不产生网络请求）
      const [now, setNow] = React.useState(function () { return Date.now(); });
      const [kw, setKw] = React.useState("");
      React.useEffect(function () {
        const t = setInterval(function () { setNow(Date.now()); }, 30000);
        return function () { clearInterval(t); };
      }, []);
      const all = (snap && snap.workspaces) || [];
      const q = kw.trim().toLowerCase();
      let ws = all;
      if (q) {
        ws = [];
        for (const w of all) {
          const wName = ((w.name || "") + " " + (w.path || "")).toLowerCase();
          const sessions = (w.sessions || []).filter(function (s) {
            return wName.indexOf(q) !== -1 || (s.title || "").toLowerCase().indexOf(q) !== -1;
          });
          if (sessions.length > 0) ws.push(Object.assign({}, w, { sessions: sessions }));
        }
      }
      return React.createElement("div", { className: "ccw-sidebar", style: { width: width } },
        React.createElement("button", { className: "ccw-btn primary", style: { width: "100%", marginBottom: 8 }, onClick: onNew }, "＋ 新会话"),
        React.createElement("button", { className: "ccw-btn small", style: { width: "100%", marginBottom: 8 }, onClick: onAddWs, disabled: pickingWs }, pickingWs ? "正在打开目录选择…" : "＋ 添加工作区"),
        React.createElement("input", {
          className: "ccw-wsfilter", placeholder: "搜索会话 / 工作区…", value: kw,
          onChange: function (e) { setKw(e.target.value); },
        }),
        ws.length === 0 ? React.createElement("div", { className: "ccw-dim", style: { padding: "8px 6px" } }, q ? "无匹配的会话或工作区" : "暂无工作区") : null,
        ws.map(function (w) {
          const open = !collapsed.has(w.path);
          return React.createElement("div", { className: "ccw-ws", key: w.path },
            React.createElement("div", { className: "ccw-ws-head" + (currentWs === w.path ? " current" : "") },
              React.createElement("span", { style: { cursor: "pointer" }, title: open ? "收起" : "展开", onClick: () => toggleWs(w.path) },
                React.createElement("span", null, open ? "▾" : "▸"),
              ),
              currentWs === w.path ? React.createElement("span", { className: "ccw-ws-cur", title: "当前工作区" }) : null,
              React.createElement("span", {
                className: "ccw-ws-name",
                style: { cursor: "pointer", minWidth: 0 },
                title: currentWs === w.path ? "当前工作区：" + w.path : "设为当前工作区：" + w.path,
                onClick: () => onSelectWs(w),
              }, w.name || w.path),
              React.createElement("span", { className: "ccw-dim" }, "(" + w.sessions.length + ")"),
              React.createElement("button", { className: "ccw-icbtn", title: "重命名工作区", onClick: () => onRenameWs(w) }, "✎"),
              React.createElement("button", { className: "ccw-icbtn", title: "移除工作区（不删文件）", onClick: () => onDeleteWs(w) }, "🗑"),
            ),
            open ? w.sessions.map(function (s) {
              return React.createElement("div", {
                key: s.id || s.key || s.title,
                className: "ccw-srow" + (s.active ? " active" : ""),
                onClick: () => onSwitch(s),
              },
                React.createElement("span", { className: "ccw-sdot", style: { background: s.status === "running" || s.status === "starting" ? "#f59e0b" : s.active ? "#2563eb" : "#d1d5db" } }),
                React.createElement("span", { className: "ccw-stitle", title: s.title }, s.title || s.id || "（会话）"),
                s.mtimeMs ? React.createElement("span", { className: "ccw-sdim", title: "最后变更：" + formatFullTime(s.mtimeMs) }, formatRelativeTime(s.mtimeMs, now)) : null,
                s.id ? React.createElement("span", { className: "ccw-srow-actions" },
                  React.createElement("button", { className: "ccw-icbtn", title: "重命名会话", onClick: (e) => { e.stopPropagation(); onRenameSession(s); } }, "✎"),
                  React.createElement("button", { className: "ccw-icbtn", title: "删除会话", onClick: (e) => { e.stopPropagation(); onDeleteSession(s); } }, "🗑"),
                ) : null,
              );
            }) : null,
          );
        }),
      );
    }

    // ------------------------------------------------------------------
    // 主视图
    // ------------------------------------------------------------------
    const STATUS_LABEL = {
      idle: "空闲",
      starting: "启动中",
      running: "运行中",
      done: "已完成",
      error: "出错",
      stopped: "已停止",
    };
    function formatDuration(ms) {
      if (ms == null || !isFinite(ms) || ms < 0) return "";
      const s = Math.floor(ms / 1000);
      if (s < 60) return s + "s";
      const m = Math.floor(s / 60), sec = s % 60;
      if (m < 60) return m + "m " + sec + "s";
      const h = Math.floor(m / 60);
      return h + "h " + (m % 60) + "m";
    }
    function formatClock(ms) {
      const dt = new Date(ms);
      const pad = function (n) { return (n < 10 ? "0" : "") + n; };
      return pad(dt.getHours()) + ":" + pad(dt.getMinutes());
    }
    // 相对时间：会话最后变更距现在的间隔（中文友好格式）
    function formatRelativeTime(ms, now) {
      if (ms == null || !isFinite(ms) || ms <= 0) return "";
      const diff = Math.max(0, (now || Date.now()) - ms);
      const s = Math.floor(diff / 1000);
      if (s < 60) return "刚刚";
      const m = Math.floor(s / 60);
      if (m < 60) return m + "分钟前";
      const h = Math.floor(m / 60);
      if (h < 24) return h + "小时前";
      const d = Math.floor(h / 24);
      if (d < 30) return d + "天前";
      const dt = new Date(ms);
      return (dt.getMonth() + 1) + "月" + dt.getDate() + "日";
    }
    // 完整时间：悬浮提示用
    function formatFullTime(ms) {
      if (ms == null || !isFinite(ms) || ms <= 0) return "";
      const dt = new Date(ms);
      const pad = function (n) { return (n < 10 ? "0" : "") + n; };
      return dt.getFullYear() + "-" + pad(dt.getMonth() + 1) + "-" + pad(dt.getDate()) + " " + pad(dt.getHours()) + ":" + pad(dt.getMinutes());
    }
    // 状态徽章：运行中时自己每秒刷新（局部重渲染，不拖动整棵树）
    function StatusBadge({ status, startedAt, durationMs }) {
      const [now, setNow] = React.useState(function () { return Date.now(); });
      const running = status === "running" || status === "starting";
      React.useEffect(function () {
        if (!running) return;
        const t = setInterval(function () { setNow(Date.now()); }, 1000);
        return function () { clearInterval(t); };
      }, [running]);
      const label = STATUS_LABEL[status] || String(status || "");
      let time = "";
      if (durationMs != null) time = formatDuration(durationMs);
      else if (startedAt != null && running) time = formatDuration(now - startedAt);
      return React.createElement("span", { className: "ccw-status " + (status || "idle") },
        label + (time ? " · " + time : ""));
    }
    function ClaudeCodeView() {
      const open = usePanelOpen();
      const [snap, setSnap] = React.useState(null);
      const [draft, setDraft] = React.useState("");
      const [catalog, setCatalog] = React.useState(null);
      const [models, setModels] = React.useState([]);
      const [modelId, setModelId] = React.useState("");
      const [collapsed, setCollapsed] = React.useState(() => new Set());
      const [conn, setConn] = React.useState(false);
      const [reconn, setReconn] = React.useState(0);
      const [pop, setPop] = React.useState(null);
      const [inputH, setInputH] = React.useState(null);
      const inputHRef = React.useRef(40);
      const msgsRef = React.useRef(null);
      const stickRef = React.useRef(true); // 是否“跟随底部”：用户上翻后置 false，回到底部附近再置 true
      const [showUpdate, setShowUpdate] = React.useState(false);
      const [updateInfo, setUpdateInfo] = React.useState(null);
      const [updating, setUpdating] = React.useState(false);
      const [pickingWs, setPickingWs] = React.useState(false);
      // 当前选中的工作区（新会话/首条消息将创建到这里）；首次快照时用服务器当前值初始化
      const [selWs, setSelWs] = React.useState("");
      // 面板几何：left/top/width/height（localStorage 持久化，刷新页面不丢）
      const [geom, setGeom] = React.useState(loadGeom);
      const geomRef = React.useRef(geom);
      geomRef.current = geom;
      const [maximized, setMaximized] = React.useState(false);
      const toggleMaximize = () => setMaximized((v) => !v);
      const [sidebarW, setSidebarW] = React.useState(() => loadNum("ccwSidebarW", 240));
      const sidebarWRef = React.useRef(sidebarW);
      sidebarWRef.current = sidebarW;
      const [minimized, setMinimized] = React.useState(false);
      const [toasts, setToasts] = React.useState([]);
      const [dialog, setDialog] = React.useState(null);
      const dialogInputRef = React.useRef(null);
      const [queued, setQueued] = React.useState(null);
      const [pendingImages, setPendingImages] = React.useState([]);
      const [msgLimit, setMsgLimit] = React.useState(120);
      const inputRef = React.useRef(null);
      const draftRef = React.useRef("");
      draftRef.current = draft;
      const histRef = React.useRef({ list: [], idx: -1 });
      const draftStoreRef = React.useRef({}); // 会话 key -> 草稿
      const pagRef = React.useRef(null);      // “加载更早”前记录滚动位置，避免跳动

      // 活跃会话与运行状态
      const active = snap && snap.active;
      const activeKey = active ? active.key : "";
      const running = !!(active && (active.status === "running" || active.status === "starting"));

      // ── toast：所有失败必须可见 ──
      const toastSeq = React.useRef(0);
      const toast = React.useCallback(function (text, kind) {
        const id = ++toastSeq.current;
        setToasts(function (list) { return list.concat([{ id: id, text: String(text || ""), kind: kind || "" }]); });
        setTimeout(function () {
          setToasts(function (list) { return list.filter(function (t) { return t.id !== id; }); });
        }, 4000);
      }, []);
      // 统一的带检查 api 调用：失败弹 toast，成功可选提示；返回 null 表示失败
      const apiChecked = React.useCallback(function (method, body, okMsg) {
        return api(method, body).then(function (res) {
          if (!res || res.ok === false) { toast((res && res.error) || "操作失败", "err"); return null; }
          if (okMsg) toast(okMsg, "ok");
          return res;
        });
      }, [toast]);

      // ── 自定义弹层（替代原生 prompt/confirm）──
      const uiPrompt = React.useCallback(function (title, value) {
        return new Promise(function (resolve) { setDialog({ kind: "prompt", title: title, value: value || "", resolve: resolve }); });
      }, []);
      const uiConfirm = React.useCallback(function (title) {
        return new Promise(function (resolve) { setDialog({ kind: "confirm", title: title, resolve: resolve }); });
      }, []);

      // ── 目录/模型拉取：面板打开、WS 重连成功、手动刷新按钮（事件驱动，绝不定时轮询）──
      const refetchCatalog = React.useCallback(function () {
        fetch(API + "/catalog", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (d) { setCatalog(d); }).catch(function () {});
        fetch(API + "/models", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (d) { setModels((d && d.models) || []); }).catch(function () {});
      }, []);

      // WebSocket 下行 + 指数退避重连（面板关闭时不连）
      React.useEffect(() => {
        if (!open) return;
        stickRef.current = true; // 打开面板时回到“跟随底部”
        let alive = true;
        let ws = null;
        let attempt = 0;
        let reconnectTimer = null;

        function schedule() {
          if (!alive || reconnectTimer) return;
          // 500ms 起步 ×2，封顶 10s，外加抖动
          const base = Math.min(10000, 500 * Math.pow(2, attempt));
          const delay = base + Math.floor(Math.random() * 250);
          attempt += 1;
          setReconn(attempt);
          reconnectTimer = setTimeout(function () { reconnectTimer = null; connect(); }, delay);
        }

        // 增量流式帧：只更新正在输出的那条消息，避免整包快照引发的整树重渲染
        function applyFrame(d) {
          if (d && d.type === "stream-delta" && d.delta) {
            setSnap(function (prev) {
              if (!prev || !prev.active || prev.active.key !== d.delta.key) return prev;
              const msgs = prev.active.messages || [];
              let idx = -1;
              for (let i = msgs.length - 1; i >= 0; i--) {
                if (msgs[i].messageKey === d.delta.messageKey) { idx = i; break; }
              }
              if (idx === -1) return prev; // 尚未收到含该消息的快照，等下一帧全量兜底
              const nm = Object.assign({}, msgs[idx], { text: d.delta.text, thinking: d.delta.thinking });
              const nmsgs = msgs.slice();
              nmsgs[idx] = nm;
              return Object.assign({}, prev, { active: Object.assign({}, prev.active, { messages: nmsgs }) });
            });
            return;
          }
          setSnap(d);
        }

        function connect() {
          if (!alive) return;
          let proto = "ws";
          try { if (window.location.protocol === "https:") proto = "wss"; } catch (e) {}
          let url = proto + "://" + window.location.host + API + "/stream";
          let sock;
          try { sock = new WebSocket(url); } catch (e) {
            if (alive) { setConn(false); schedule(); }
            return;
          }
          ws = sock;
          sock.onopen = function () {
            if (alive) { setConn(true); setReconn(0); attempt = 0; refetchCatalog(); }
          };
          sock.onmessage = function (ev) {
            if (!alive) return;
            try { applyFrame(JSON.parse(ev.data)); } catch (e) {}
          };
          sock.onerror = function () { if (alive) setConn(false); };
          sock.onclose = function () {
            if (ws === sock) ws = null;
            if (alive) { setConn(false); schedule(); }
          };
        }

        connect();
        return function () {
          alive = false;
          if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
          if (ws) {
            ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null;
            try { ws.close(); } catch (e) {}
            ws = null;
          }
        };
      }, [open, refetchCatalog]);

      // 目录 + 模型（打开面板时拉一次；其余靠 WS 重连 / 手动刷新，事件驱动）
      React.useEffect(() => {
        if (!open) return;
        refetchCatalog();
      }, [open, refetchCatalog]);

      // 挂载时载入本地偏好：按会话保存的草稿 + 输入历史
      React.useEffect(function () {
        try { const s = localStorage.getItem("ccwDrafts"); if (s) { const d = JSON.parse(s); if (d && typeof d === "object") draftStoreRef.current = d; } } catch (e) {}
        try { const h = localStorage.getItem("ccwHistory"); if (h) { const l = JSON.parse(h); if (Array.isArray(l)) histRef.current.list = l; } } catch (e) {}
      }, []);

      // 工作区选中状态：仅首次拿到快照时用服务器的 current 初始化一次，
      // 之后完全由用户的“点击选中 / 添加 / 删除”动作维护，避免被稍后到达的旧快照覆盖。
      React.useEffect(() => {
        if (snap && typeof snap.current === "string" && snap.current) {
          setSelWs(function (prev) { return prev || snap.current; });
        }
      }, [snap]);

      // 输入框初始高度
      React.useEffect(() => {
        let saved = null;
        try { saved = localStorage.getItem("ccwInputHeight"); } catch (e) {}
        if (saved && /^\d+$/.test(saved)) {
          const h = parseInt(saved, 10);
          inputHRef.current = h;
          setInputH(h);
        }
      }, []);

      function persistDrafts() {
        try { localStorage.setItem("ccwDrafts", JSON.stringify(draftStoreRef.current)); } catch (e) {}
      }
      // 切换会话：保存离开会话的草稿，载入目标会话草稿；重置分页窗口与排队消息
      React.useEffect(function () {
        setDraft((activeKey && draftStoreRef.current[activeKey]) || "");
        setPop(null);
        setMsgLimit(120);
        setQueued(null);
        return function () {
          if (activeKey) { draftStoreRef.current[activeKey] = draftRef.current; persistDrafts(); }
        };
      }, [activeKey]);

      // 自动滚到底部（仅当用户未上翻时；上翻后不再强制拉回底部）
      // 使用 useLayoutEffect：新消息 DOM 提交后、浏览器绘制前立即滚动，
      // 避免 useEffect 异步执行前被 scroll 事件把 stickRef 置回 false，导致停在历史位置。
      React.useLayoutEffect(() => {
        const el = msgsRef.current;
        // “加载更早”后保持视口位置（内容在顶部追加）
        if (pagRef.current && el) {
          const prev = pagRef.current;
          pagRef.current = null;
          el.scrollTop = el.scrollHeight - prev.height + prev.top;
          return;
        }
        if (stickRef.current && el) el.scrollTop = el.scrollHeight;
      }, [snap, msgLimit]);

      // 回合结束后自动发送排队的消息（本地队列，无网络轮询）
      React.useEffect(function () {
        if (!running && queued) {
          const t = queued;
          setQueued(null);
          sendRaw(t, []);
        }
      }, [running, queued]);

      // 全局快捷键：Alt+C 开关面板
      React.useEffect(function () {
        function onKey(e) {
          if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && (e.key === "c" || e.key === "C")) {
            e.preventDefault();
            setOpen(!panelOpen);
          }
        }
        window.addEventListener("keydown", onKey);
        return function () { window.removeEventListener("keydown", onKey); };
      }, []);

      // ✎ 编辑重发：填入输入框（useCallback 保持稳定引用，供 MessageView memo 比较；
      //   必须声明在上面的提前 return 之前——早退后不得再调用任何 hook）
      const fillInput = React.useCallback(function (text) {
        setDraft(text);
        setPop(null);
        if (inputRef.current) { try { inputRef.current.focus(); } catch (e) {} }
      }, []);

      if (!open) return null;

      function sendRaw(text, imgs) {
        const expanded = expandCommand(text, catalog);
        const images = imgs || [];
        stickRef.current = true;
        apiChecked("send", {
          text: text, expanded: expanded, model: modelId, permissionMode: "default", cwd: selWs,
          images: images.length ? images : undefined,
        }).then(function (res) {
          if (!res) { setDraft(text); setPendingImages(images); return; } // 失败：还原文稿与图片
          if (text.charAt(0) === "/") {
            const m = /^\/([A-Za-z0-9_-]+)/.exec(text);
            if (m) recordRecent(m[1]);
          }
          // 记入输入历史（↑ 键调出）
          const h = histRef.current;
          if (h.list[h.list.length - 1] !== text) h.list.push(text);
          if (h.list.length > 50) h.list = h.list.slice(-50);
          h.idx = -1;
          try { localStorage.setItem("ccwHistory", JSON.stringify(h.list)); } catch (e) {}
          if (activeKey) { delete draftStoreRef.current[activeKey]; persistDrafts(); }
        });
      }

      function send() {
        const text = (draft || "").trim();
        if (!text) return;
        if (running) { setQueued(text); setDraft(""); setPop(null); return; } // 运行中 → 排队
        const imgs = pendingImages;
        setDraft(""); setPop(null); setPendingImages([]);
        sendRaw(text, imgs);
      }

      function loadMore() {
        const el = msgsRef.current;
        if (el) pagRef.current = { height: el.scrollHeight, top: el.scrollTop };
        setMsgLimit(function (l) { return l + 200; });
      }

      function onSwitch(s) {
        stickRef.current = true; // 切换会话后跟随底部
        if (s.key) apiChecked("switch", { key: s.key });
        else if (s.id) apiChecked("switch", { sessionId: s.id });
      }

      function onNew() {
        stickRef.current = true;
        apiChecked("new-session", { permissionMode: "default", cwd: selWs });
      }

      function onSelectWs(w) {
        if (!w || !w.path) return;
        setSelWs(w.path);                       // 立即更新选中态，避免与新会话请求竞态
        apiChecked("set-workspace", { path: w.path });  // 同步服务端“当前工作区”（用于目录/命令等）
      }

      async function onAddWs() {
        if (pickingWs) return;
        setPickingWs(true);
        try {
          const res = await api("pick-directory", {});
          if (res && res.ok && res.path) {
            const added = await apiChecked("ws-add", { path: res.path });
            if (added && added.path) setSelWs(added.path);
          } else if (res && res.cancelled) {
            // 用户取消，不做任何事
          } else {
            // 原生选择器不可用/失败：回退到应用内弹层输入
            const p = await uiPrompt("输入工作区目录路径");
            if (p && p.trim()) {
              const added = await apiChecked("ws-add", { path: p.trim() });
              if (added && added.path) setSelWs(added.path);
            }
          }
        } finally {
          setPickingWs(false);
        }
      }

      function toggleWs(p) {
        setCollapsed(function (prev) {
          const next = new Set(prev);
          if (next.has(p)) next.delete(p); else next.add(p);
          return next;
        });
      }

      // ── 清空当前会话（/clear 语义：重置上下文重新开始，磁盘对话文件保留）──
      async function onClearSession() {
        if (!active) return;
        const yes = await uiConfirm("清空当前会话上下文？\n（界面记录一并清除，磁盘对话文件保留）");
        if (!yes) return;
        apiChecked("clear-session", {}, "已清空，可以开始新对话");
      }

      // ── 更新检查 ──
      function openUpdate() {
        setShowUpdate(true);
        setUpdateInfo(null);
        setUpdating(false);
        api("claude-check-update", {}).then(function (d) { setUpdateInfo(d); });
      }
      function doUpdate() {
        setUpdating(true);
        api("claude-update", {}).then(function (d) { setUpdateInfo(d); setUpdating(false); });
      }

      // ── 会话 / 工作区 重命名与删除（应用内弹层，替代原生 prompt/confirm）──
      async function onRenameSession(s) {
        const sid = s.id || "";
        if (!sid) return;
        const t = await uiPrompt("会话名称", s.title || "");
        if (t != null) apiChecked("session-rename", { sessionId: sid, title: t }, "已重命名");
      }
      async function onDeleteSession(s) {
        const sid = s.id || "";
        if (!sid) return;
        if (await uiConfirm("删除会话「" + (s.title || sid) + "」？\n（同时删除磁盘对话文件，不可恢复）")) {
          apiChecked("session-delete", { sessionId: sid }, "已删除");
        }
      }
      async function onRenameWs(w) {
        const t = await uiPrompt("工作区显示名（不改目录路径）", w.name || "");
        if (t != null) apiChecked("ws-rename", { path: w.path, name: t }, "已重命名");
      }
      async function onDeleteWs(w) {
        if (!(await uiConfirm("从注册表移除工作区「" + (w.name || w.path) + "」？\n（不删除磁盘文件）"))) return;
        const res = await apiChecked("ws-delete", { path: w.path });
        if (res && res.current) setSelWs(res.current);
      }

      function onInputChange(e) {
        const v = e.target.value;
        setDraft(v);
        if (v.startsWith("/") && catalog) {
          const q = v.replace(/^\/+/, "");
          const cmds = (catalog.commands || []).map(function (c) { return Object.assign({}, c, { kind: "command" }); });
          const skills = (catalog.skills || []).map(function (s) { return Object.assign({}, s, { kind: "skill" }); });
          const seen = new Set(cmds.map(function (c) { return c.name; }));
          const all = cmds.concat(skills.filter(function (s) { return !seen.has(s.name); }));
          // 模糊匹配：前缀 > 包含 > 描述包含；空查询时最近使用优先
          const recent = getRecentCmds();
          const kw = q.toLowerCase();
          const scored = [];
          for (const c of all) {
            const name = c.name || "";
            const desc = (c.description || "").toLowerCase();
            let rank = -1;
            if (kw === "") {
              const ri = recent.indexOf(name);
              rank = ri === -1 ? 100 : ri;
            } else if (name.toLowerCase().indexOf(kw) === 0) rank = 0;
            else if (name.toLowerCase().indexOf(kw) !== -1) rank = 1;
            else if (desc.indexOf(kw) !== -1) rank = 2;
            if (rank !== -1) scored.push({ c: c, rank: rank });
          }
          scored.sort(function (a, b) { return a.rank - b.rank; });
          const items = scored.map(function (x) { return x.c; }).slice(0, 30);
          setPop(items.length ? { items: items, sel: 0 } : null);
        } else setPop(null);
      }

      function pickCommand(c) {
        setDraft("/" + c.name + (c.argumentHint ? " " : " "));
        setPop(null);
        recordRecent(c.name);
      }

      // 粘贴图片 → 待发送附件（base64）
      function addImages(fileList) {
        const files = Array.prototype.slice.call(fileList || []).filter(function (f) { return f && /^image\//.test(f.type); });
        if (!files.length) return;
        const room = 4 - pendingImages.length;
        if (room <= 0) { toast("最多附带 4 张图片", "err"); return; }
        files.slice(0, room).forEach(function (f) {
          if (f.size > 4 * 1024 * 1024) { toast("图片过大（>4MB）：" + (f.name || "图片"), "err"); return; }
          const reader = new FileReader();
          reader.onload = function () {
            const dataUrl = String(reader.result || "");
            const comma = dataUrl.indexOf(",");
            if (comma === -1) return;
            setPendingImages(function (p) {
              return p.length >= 4 ? p : p.concat([{ name: f.name || "图片", mediaType: f.type, data: dataUrl.slice(comma + 1) }]);
            });
          };
          reader.readAsDataURL(f);
        });
      }

      function onResizeStart(e) {
        e.preventDefault();
        const startY = e.clientY;
        const startH = inputHRef.current;
        function move(ev) {
          // 拖拽把手在输入框上方：向上拖（clientY 减小）→ 高度增大；向下拖 → 高度减小
          const h = Math.min(360, Math.max(40, startH - (ev.clientY - startY)));
          inputHRef.current = h;
          setInputH(h);
        }
        function up() {
          document.removeEventListener("mousemove", move);
          document.removeEventListener("mouseup", up);
          try { localStorage.setItem("ccwInputHeight", String(inputHRef.current)); } catch (e) {}
        }
        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", up);
      }

      // ── 面板拖拽（标题栏）──
      function beginDrag(e) {
        if (maximized) return;
        if (e.target && typeof e.target.closest === "function" && e.target.closest("button")) return; // 标题栏按钮不触发拖拽
        e.preventDefault();
        const el = e.currentTarget;
        const pointerId = e.pointerId;
        const startX = e.clientX, startY = e.clientY;
        const startLeft = geom.left, startTop = geom.top;
        const onMove = (ev) => {
          const vw = window.innerWidth, vh = window.innerHeight;
          const l = Math.min(Math.max(0, startLeft + (ev.clientX - startX)), Math.max(0, vw - 60));
          const t = Math.min(Math.max(0, startTop + (ev.clientY - startY)), Math.max(0, vh - 40));
          setGeom((g) => ({ ...g, left: l, top: t }));
        };
        const onUp = () => {
          el.removeEventListener("pointermove", onMove);
          el.removeEventListener("pointerup", onUp);
          el.removeEventListener("pointercancel", onUp);
          try { if (el.releasePointerCapture) el.releasePointerCapture(pointerId); } catch (e2) {}
          if (typeof document !== "undefined") { document.body.style.userSelect = ""; document.body.style.cursor = ""; }
          try { localStorage.setItem("ccwGeom", JSON.stringify(geomRef.current)); } catch (e2) {}
        };
        try { if (el.setPointerCapture) el.setPointerCapture(pointerId); } catch (e2) {}
        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerup", onUp);
        el.addEventListener("pointercancel", onUp);
        if (typeof document !== "undefined") { document.body.style.userSelect = "none"; document.body.style.cursor = "grabbing"; }
      }

      // ── 面板缩放（右下角）──
      function beginPanelResize(e) {
        e.preventDefault();
        const el = e.currentTarget;
        const pointerId = e.pointerId;
        const startX = e.clientX, startY = e.clientY;
        const startW = geom.width, startH = geom.height;
        const onMove = (ev) => {
          const vw = window.innerWidth, vh = window.innerHeight;
          const w = Math.min(Math.max(480, startW + (ev.clientX - startX)), vw - 8);
          const h = Math.min(Math.max(360, startH + (ev.clientY - startY)), vh - 8);
          setGeom((g) => ({ ...g, width: w, height: h }));
        };
        const onUp = () => {
          el.removeEventListener("pointermove", onMove);
          el.removeEventListener("pointerup", onUp);
          el.removeEventListener("pointercancel", onUp);
          try { if (el.releasePointerCapture) el.releasePointerCapture(pointerId); } catch (e2) {}
          if (typeof document !== "undefined") { document.body.style.userSelect = ""; document.body.style.cursor = ""; }
          try { localStorage.setItem("ccwGeom", JSON.stringify(geomRef.current)); } catch (e2) {}
        };
        try { if (el.setPointerCapture) el.setPointerCapture(pointerId); } catch (e2) {}
        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerup", onUp);
        el.addEventListener("pointercancel", onUp);
        if (typeof document !== "undefined") { document.body.style.userSelect = "none"; document.body.style.cursor = "nwse-resize"; }
      }

      // ── 工作区/聊天区 分栏拖拽（左右调整侧边栏宽度）──
      function beginSidebarResize(e) {
        e.preventDefault();
        const el = e.currentTarget;
        const pointerId = e.pointerId;
        const startX = e.clientX;
        const startW = sidebarW;
        const onMove = (ev) => {
          const maxW = Math.max(160, geom.width - 320);
          const w = Math.max(160, Math.min(maxW, startW + (ev.clientX - startX)));
          setSidebarW(w);
        };
        const onUp = () => {
          el.removeEventListener("pointermove", onMove);
          el.removeEventListener("pointerup", onUp);
          el.removeEventListener("pointercancel", onUp);
          try { if (el.releasePointerCapture) el.releasePointerCapture(pointerId); } catch (e2) {}
          if (typeof document !== "undefined") { document.body.style.userSelect = ""; document.body.style.cursor = ""; }
          saveNum("ccwSidebarW", sidebarWRef.current);
        };
        try { if (el.setPointerCapture) el.setPointerCapture(pointerId); } catch (e2) {}
        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerup", onUp);
        el.addEventListener("pointercancel", onUp);
        if (typeof document !== "undefined") { document.body.style.userSelect = "none"; document.body.style.cursor = "col-resize"; }
      }

      const messages = active && active.messages ? active.messages : [];
      // 分页渲染：只渲染最近 N 条，避免长会话整列表全量挂载
      const startIdx = Math.max(0, messages.length - msgLimit);
      const visible = startIdx > 0 ? messages.slice(startIdx) : messages;
      // 待授权卡（≥2 个时显示批量操作）
      const unanswered = messages.filter(function (m) { return m.role === "control" && m.decision == null && m.requestId; });
      function answerAll(behavior) {
        const list = unanswered.slice();
        if (!list.length) return;
        let okCount = 0;
        Promise.all(list.map(function (m) {
          return api("answer-control", { requestId: m.requestId, behavior: behavior }).then(function (r) { if (r && r.ok) okCount += 1; });
        })).then(function () {
          toast("已批量" + (behavior === "deny" ? "拒绝" : "允许") + " " + okCount + "/" + list.length + " 个授权", okCount ? "ok" : "err");
        });
      }

      // 成功回合的耗时 / 费用（数据来自 WS 已推送的 lastResult，纯渲染）
      let resultMeta = null;
      if (active && (active.status === "done" || active.status === "error") && active.lastResult) {
        const dur = active.lastResult.durationMs != null ? active.lastResult.durationMs : active.durationMs;
        const parts = [];
        if (dur != null) parts.push(formatDuration(dur));
        if (active.lastResult.costUsd != null) parts.push("$" + (Math.round(active.lastResult.costUsd * 1000) / 1000));
        if (parts.length) resultMeta = parts.join(" · ");
      }

      const panelStyle = maximized
        ? { left: 8, top: 8, width: "calc(100vw - 16px)", height: "calc(100vh - 16px)" }
        : { left: geom.left, top: geom.top, width: geom.width, height: geom.height };

      // 最小化：收起为角落胶囊（WS 保持连接，状态持续推送）
      if (minimized) {
        return React.createElement("button", {
          className: "ccw-mini-pill", title: "点击恢复 Claude Code 面板",
          onClick: function () { setMinimized(false); },
        },
          React.createElement(ClaudeLogo, { size: 14 }),
          "Claude Code",
          React.createElement("span", { style: { display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: conn ? "#22c55e" : "#9ca3af" } }),
        );
      }

      return React.createElement("div", {
        className: "ccw",
        style: panelStyle,
      },
        React.createElement("div", { className: "ccw-titlebar", onPointerDown: beginDrag, title: maximized ? "" : "拖拽移动面板" },
          React.createElement("span", { className: "ccw-brand" }, React.createElement(ClaudeLogo, { size: 15 }), "Claude Code"),
          React.createElement("span", { className: "ccw-conn" }, conn ? "🟢 已连接" : (reconn > 0 ? "🟡 重连中(第" + reconn + "次)" : "🔴 未连接")),
          React.createElement("div", { style: { flex: 1 } }),
          React.createElement("button", { className: "ccw-max", title: "最小化到角落", onClick: function () {
            if (dialog) { dialog.resolve(null); setDialog(null); }
            setMinimized(true);
          } }, "—"),
          React.createElement("button", { className: "ccw-max", title: maximized ? "还原窗口" : "最大化窗口", onClick: toggleMaximize }, maximized ? "还原" : "最大化"),
          React.createElement("button", { className: "ccw-close", title: "关闭", onClick: () => setOpen(false) }, "✕"),
        ),
        maximized ? null : React.createElement("div", { className: "ccw-resize-se", onPointerDown: beginPanelResize, title: "拖拽调整面板尺寸" }),
        React.createElement("div", { className: "ccw-topbar" },
          React.createElement("span", { className: "ccw-dim" }, active ? (active.title || "会话") : "暂无活跃会话"),
          active ? React.createElement(StatusBadge, { status: active.status, startedAt: active.startedAt, durationMs: active.durationMs }) : null,
          resultMeta ? React.createElement("span", { className: "ccw-dim", title: "本回合耗时与费用" }, "· " + resultMeta) : null,
          React.createElement("div", { style: { flex: 1 } }),
          React.createElement("select", {
            className: "ccw-btn small",
            value: modelId,
            onChange: (e) => setModelId(e.target.value),
            title: "模型（--model）",
          },
            React.createElement("option", { value: "" }, "默认模型"),
            models.map(function (mm) { return React.createElement("option", { key: mm.id, value: mm.id }, mm.label); }),
          ),
          React.createElement("button", { className: "ccw-btn small", onClick: onClearSession, disabled: !active, title: "清空当前会话上下文，重新开始（磁盘对话文件保留）" }, "🧹 清空"),
          React.createElement("button", { className: "ccw-btn small", onClick: function () { refetchCatalog(); toast("已刷新指令与模型列表", "ok"); }, title: "刷新指令与模型列表（在 ~/.claude 新增指令后无需重开面板）" }, "⟳"),
          React.createElement("button", { className: "ccw-btn small", onClick: openUpdate, title: "检查并更新本机 Claude Code" }, "🔄 检查更新"),
        ),
        React.createElement("div", { className: "ccw-body" },
          React.createElement(Sidebar, {
            snap: snap, collapsed: collapsed, toggleWs: toggleWs,
            onNew: onNew, onSwitch: onSwitch, onAddWs: onAddWs,
            onRenameSession: onRenameSession, onDeleteSession: onDeleteSession,
            onRenameWs: onRenameWs, onDeleteWs: onDeleteWs,
            width: sidebarW, pickingWs: pickingWs,
            currentWs: selWs, onSelectWs: onSelectWs,
          }),
          React.createElement("div", { className: "ccw-split", title: "拖拽调整工作区宽度", onPointerDown: beginSidebarResize }),
          React.createElement("div", { className: "ccw-main" },
            React.createElement("div", {
              className: "ccw-msgs",
              ref: msgsRef,
              onScroll: function (e) {
                const el = e.currentTarget;
                // 距底部不足 40px 视为“跟随底部”，否则视为用户在上翻查看历史
                stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
              },
            },
              unanswered.length >= 2 ? React.createElement("div", { className: "ccw-batchbar" },
                "⚠ " + unanswered.length + " 个工具待授权",
                React.createElement("button", { className: "ccw-btn small primary", onClick: function () { answerAll("allow"); } }, "全部允许"),
                React.createElement("button", { className: "ccw-btn small danger", onClick: function () { answerAll("deny"); } }, "全部拒绝"),
              ) : null,
              messages.length === 0
                ? React.createElement("div", { className: "ccw-empty" }, "开始一个新会话，或从左侧选择历史会话")
                : null,
              startIdx > 0 ? React.createElement("button", { className: "ccw-btn small ccw-loadmore", onClick: loadMore }, "加载更早（还有 " + startIdx + " 条）") : null,
              visible.map(function (m, vi) {
                const i = startIdx + vi;
                const live = running && i === messages.length - 1;
                return React.createElement(MessageView, { key: m.id != null ? m.id : "i" + i, msg: m, live: live, onFill: fillInput });
              }),
              active && active.status === "starting" ? React.createElement("div", { className: "ccw-msg assistant" }, "…") : null,
            ),
          ),
        ),
        React.createElement("div", { className: "ccw-footer" },
          pop ? React.createElement("div", { className: "ccw-pop-list" },
            pop.items.map(function (c, i) {
              return React.createElement("div", {
                key: c.name,
                className: "ccw-pop-item" + (i === pop.sel ? " sel" : ""),
                onMouseDown: () => pickCommand(c),
              },
                React.createElement("span", { className: "ccw-pop-kind" + (c.kind === "skill" ? " skill" : "") }, c.kind === "skill" ? "技能" : "指令"),
                "/" + c.name,
                c.argumentHint ? React.createElement("span", { className: "ccw-pop-hint" }, " " + c.argumentHint) : null,
                " — " + (c.description || ""),
                i === pop.sel ? React.createElement("span", { className: "ccw-pop-hint" }, "（Enter 发送 / Tab 补全）") : null,
              );
            }),
          ) : null,
          queued ? React.createElement("div", { className: "ccw-queued" },
            "⏳ 运行结束后将自动发送：" + (queued.length > 60 ? queued.slice(0, 60) + "…" : queued),
            React.createElement("button", { className: "ccw-icbtn", title: "取消排队", onClick: function () { setQueued(null); } }, "×"),
          ) : null,
          pendingImages.length ? React.createElement("div", { className: "ccw-img-chips" },
            pendingImages.map(function (im, ix) {
              return React.createElement("span", { key: ix, className: "ccw-img-chip" },
                "🖼 " + (im.name || "图片"),
                React.createElement("button", { className: "ccw-icbtn", title: "移除", onClick: function () { setPendingImages(function (p) { return p.filter(function (_, j) { return j !== ix; }); }); } }, "×"),
              );
            }),
          ) : null,
          React.createElement("div", { className: "ccw-resize", onMouseDown: onResizeStart, title: "拖拽调整输入框高度" }),
          React.createElement("div", { className: "ccw-input-row" },
            React.createElement("textarea", {
              ref: inputRef,
              className: "ccw-input",
              style: inputH ? { height: inputH + "px" } : null,
              placeholder: "输入消息，Enter 发送，Shift+Enter 换行；/ 触发指令（Tab 补全）；可粘贴图片；↑ 调上一条",
              value: draft,
              onChange: onInputChange,
              onPaste: function (e) {
                const files = e.clipboardData && e.clipboardData.files;
                if (files && files.length) {
                  const imgs = Array.prototype.filter.call(files, function (f) { return /^image\//.test(f.type); });
                  if (imgs.length) { e.preventDefault(); addImages(imgs); }
                }
              },
              onKeyDown: function (e) {
                if (e.key === "Escape") { setPop(null); return; }
                if (pop && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
                  e.preventDefault();
                  const dir = e.key === "ArrowDown" ? 1 : -1;
                  setPop(function (p) { return p ? { items: p.items, sel: (p.sel + dir + p.items.length) % p.items.length } : p; });
                  return;
                }
                if (e.key === "Tab" && pop && pop.items[pop.sel]) {
                  e.preventDefault();
                  pickCommand(pop.items[pop.sel]);
                  return;
                }
                const h = histRef.current;
                if (!pop && e.key === "ArrowUp" && draft === "" && h.list.length) {
                  e.preventDefault();
                  h.idx = h.idx < 0 ? h.list.length - 1 : Math.max(0, h.idx - 1);
                  setDraft(h.list[h.idx]);
                  return;
                }
                if (!pop && e.key === "ArrowDown" && h.idx >= 0) {
                  e.preventDefault();
                  const idx = h.idx + 1;
                  if (idx >= h.list.length) { h.idx = -1; setDraft(""); }
                  else { h.idx = idx; setDraft(h.list[idx]); }
                  return;
                }
                if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
                  e.preventDefault();
                  // 输入内容与高亮命令完全一致时直接发送，省一次回车
                  if (pop && pop.items[pop.sel] && draft.trim() === "/" + pop.items[pop.sel].name) { send(); return; }
                  if (pop && pop.items[pop.sel]) { pickCommand(pop.items[pop.sel]); return; }
                  send();
                }
              },
            }),
            running
              ? React.createElement("button", { className: "ccw-btn danger", onClick: function () { apiChecked("stop", {}); } }, "⏹ 停止")
              : React.createElement("button", { className: "ccw-btn primary", onClick: send }, "发送"),
          ),
        ),
        showUpdate ? React.createElement("div", { className: "ccw-modal" },
          React.createElement("div", { className: "ccw-modal-box" },
            React.createElement("div", { className: "ccw-modal-head" }, "🔄 Claude Code 更新"),
            updateInfo == null
              ? React.createElement("div", { className: "ccw-dim" }, "正在检查版本…")
              : updating
                ? React.createElement("div", { className: "ccw-dim" }, "正在更新，请稍候（可能需要 1-2 分钟）…")
                : updateInfo.ok === false
                  ? React.createElement("div", { className: "ccw-msg result err" }, updateInfo.error || "检查失败")
                  : updateInfo.version
                    ? React.createElement("div", null,
                        React.createElement("div", null, "✅ 已更新到 " + updateInfo.version),
                        updateInfo.log ? React.createElement("pre", { className: "ccw-modal-log" }, updateInfo.log) : null,
                      )
                    : React.createElement("div", null,
                        React.createElement("div", null, "当前版本：" + (updateInfo.current || "未知")),
                        React.createElement("div", null, "最新版本：" + (updateInfo.latest || "未知")),
                        updateInfo.latestError ? React.createElement("div", { className: "ccw-dim" }, updateInfo.latestError) : null,
                        updateInfo.hasUpdate
                          ? React.createElement("button", { className: "ccw-btn primary", style: { marginTop: 10 }, onClick: doUpdate }, "立即更新")
                          : React.createElement("div", { className: "ccw-dim", style: { marginTop: 8 } }, "已是最新版本 ✓"),
                      ),
            React.createElement("div", { className: "ccw-modal-actions" },
              React.createElement("button", { className: "ccw-btn small", onClick: () => setShowUpdate(false) }, "关闭"),
            ),
          ),
        ) : null,
        dialog ? React.createElement("div", {
          className: "ccw-modal",
          onClick: function (e) { if (e.target === e.currentTarget) { dialog.resolve(null); setDialog(null); } },
        },
          React.createElement("div", { className: "ccw-modal-box", style: { width: "min(440px,90vw)" } },
            React.createElement("div", { className: "ccw-modal-head" }, dialog.title),
            dialog.kind === "prompt" ? React.createElement("input", {
              ref: dialogInputRef,
              className: "ccw-dialog-input",
              defaultValue: dialog.value,
              autoFocus: true,
              onKeyDown: function (e) {
                if (e.key === "Enter") { e.preventDefault(); dialog.resolve(dialogInputRef.current ? dialogInputRef.current.value : null); setDialog(null); }
                if (e.key === "Escape") { dialog.resolve(null); setDialog(null); }
              },
            }) : null,
            React.createElement("div", { className: "ccw-modal-actions" },
              React.createElement("button", { className: "ccw-btn small", onClick: function () { dialog.resolve(null); setDialog(null); } }, "取消"),
              React.createElement("button", { className: "ccw-btn small primary", onClick: function () {
                const v = dialog.kind === "prompt" ? (dialogInputRef.current ? dialogInputRef.current.value : null) : true;
                dialog.resolve(v);
                setDialog(null);
              } }, dialog.kind === "prompt" ? "确定" : "确认"),
            ),
          ),
        ) : null,
        React.createElement("div", { className: "ccw-toasts" },
          toasts.map(function (t) {
            return React.createElement("div", { key: t.id, className: "ccw-toast " + t.kind }, t.text);
          }),
        ),
      );
    }

    // ------------------------------------------------------------------
    // 全局入口按钮（sidebar.footer.action）
    // ------------------------------------------------------------------
    function ClaudeCodeToggle(props) {
      const open = usePanelOpen();
      const wide = !!props.wide;
      return React.createElement("button", {
        type: "button",
        className: "ccw-toggle" + (open ? " ccw-toggle-active" : ""),
        title: "Claude Code 工作台（Alt+C 开关）",
        "aria-pressed": open,
        onClick: () => setOpen(!open),
      }, React.createElement(ClaudeLogo, { size: 14 }), wide ? React.createElement("span", null, "Claude Code") : null);
    }

    // ------------------------------------------------------------------
    // Plugin body
    // ------------------------------------------------------------------
    const inject = ["slots"];
    function apply(ctx) {
      ensureCss();
      ctx.effect(() => {
        const waiters = [
          ctx.slots.inject("shell.overlay", () =>
            ctx.slots.register({ name: "shell.overlay", id: "claude-code.panel" }, ClaudeCodeView),
          ),
          ctx.slots.inject("sidebar.footer.action", () =>
            ctx.slots.register({ name: "sidebar.footer.action", id: "claude-code.toggle" }, ClaudeCodeToggle),
          ),
        ];
        return () => { for (const w of waiters) w(); };
      }, "dsh-claude-code-web: slot registrations");
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
