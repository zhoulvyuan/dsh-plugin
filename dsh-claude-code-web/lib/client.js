function build(React, opts) {
    opts = opts || {};
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    const API = "/claude/api";
    const STANDALONE = opts.standalone === true;

    // 全局入口：侧边栏底部按钮（sidebar.footer.action）<-> 悬浮面板（shell.overlay）共享显隐状态
    let panelOpen = STANDALONE;
    const openListeners = new Set();
    const subscribeOpen = (l) => { openListeners.add(l); return () => { openListeners.delete(l); }; };
    const getOpen = () => panelOpen;
    const setOpen = (v) => { if (panelOpen === v) return; panelOpen = v; for (const l of [...openListeners]) l(); };
    const usePanelOpen = () => React.useSyncExternalStore(subscribeOpen, getOpen);

    // 弹出到独立窗口/标签页：优先 DSH transport 基址（桌面端），否则同源相对地址
    function openStandalone() {
      const base = (typeof globalThis !== "undefined" && globalThis.__DSH_TRANSPORT__ && globalThis.__DSH_TRANSPORT__.streamBaseUrl)
        || (typeof document !== "undefined" && document.baseURI)
        || (typeof location !== "undefined" && location.origin);
      let url;
      try { url = new URL("/claude", base).href; } catch (e) { url = "/claude"; }
      try { window.open(url, "_blank", "noopener"); } catch (e) {}
    }

    // ------------------------------------------------------------------
    // 样式注入（跟随 md-workspace 的做法：document 注入 <style>）
    // ------------------------------------------------------------------
    const CSS = `
.ccw, .ccw-mini-pill {
    /* ===== Claude 风格令牌（浅色） ===== */
  --ccw-bg:#FBFAF7; --ccw-surface:#FFFFFF; --ccw-surface-2:#F5F3EE; --ccw-surface-3:#EDEAE2;
  --ccw-border:#E7E4DC; --ccw-border-strong:#D6D1C6;
  --ccw-text:#141413; --ccw-text-2:#55544F; --ccw-text-3:#8A877E;
  --ccw-accent:#C96442; --ccw-accent-hover:#B4563A; --ccw-accent-fg:#FFFFFF; --ccw-accent-soft:#F6E7E0;
  --ccw-success:#2F7D5B; --ccw-success-soft:rgba(47,125,91,.10);
  --ccw-warn:#B7791F; --ccw-warn-soft:rgba(183,121,31,.10);
  --ccw-danger:#B4453A; --ccw-danger-fg:#FFFFFF; --ccw-danger-soft:rgba(180,69,58,.10);
  --ccw-selected:#F6E7E0; --ccw-code:#F1EEE6; --ccw-mark:#F2D98B; --ccw-mark-fg:#141413;
  --ccw-toast-bg:#1F1E1B; --ccw-toast-fg:#F2F0EA;
}
.ccw {
  position:absolute; display:flex; flex-direction:column;
  background:var(--ccw-bg); color:var(--ccw-text); font-size:13px;
  border:1px solid var(--ccw-border); border-radius:14px;
  box-shadow:0 24px 64px -24px rgba(24,20,14,.45), 0 6px 18px -10px rgba(24,20,14,.18);
  overflow:hidden; pointer-events:auto; z-index:40;
}
.ccw[data-ccw-theme="dark"], .ccw-mini-pill[data-ccw-theme="dark"] {
  --ccw-bg:#1C1B19; --ccw-surface:#232220; --ccw-surface-2:#1F1E1B; --ccw-surface-3:#2A2825;
  --ccw-border:#33312C; --ccw-border-strong:#44413A;
  --ccw-text:#F2F0EA; --ccw-text-2:#B5B1A7; --ccw-text-3:#8A867C;
  --ccw-accent:#E08A6D; --ccw-accent-hover:#EBA083; --ccw-accent-fg:#1C1B19; --ccw-accent-soft:#3A2A22;
  --ccw-success:#6FBF95; --ccw-success-soft:rgba(111,191,149,.14);
  --ccw-warn:#D9A441; --ccw-warn-soft:rgba(217,164,65,.14);
  --ccw-danger:#E07A6E; --ccw-danger-fg:#1C1B19; --ccw-danger-soft:rgba(224,122,110,.14);
  --ccw-selected:#3A2A22; --ccw-code:#2A2825; --ccw-mark:#6B5A2A; --ccw-mark-fg:#F2F0EA;
  --ccw-toast-bg:#2A2825; --ccw-toast-fg:#F2F0EA;
}

.ccw * { box-sizing:border-box; }
.ccw-resize-se { position:absolute; right:0; bottom:0; width:18px; height:18px; cursor:nwse-resize; z-index:41; }
.ccw-resize-se::after { content:""; position:absolute; right:4px; bottom:4px; width:9px; height:9px; border-right:2px solid var(--ccw-text-3); border-bottom:2px solid var(--ccw-text-3); opacity:.6; }
.ccw-titlebar { display:flex; align-items:center; gap:8px; padding:8px 12px; border-bottom:1px solid var(--ccw-border); flex:none; cursor:grab; }
.ccw-titlebar:active { cursor:grabbing; }
.ccw-brand { font-weight:600; font-size:13px; white-space:nowrap; display:inline-flex; align-items:center; gap:6px; }
.ccw-local { flex:none; padding:1px 4px; border:1px solid var(--ccw-border); border-radius:3px; color:var(--ccw-text-3); font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size:9px; font-weight:400; line-height:12px; letter-spacing:.05em; }
.ccw-logo { flex:none; display:block; }
.ccw-conn { font-size:11px; white-space:nowrap; }
.ccw-close { border:none; background:transparent; color:inherit; cursor:pointer; font-size:16px; line-height:1; padding:4px 6px; border-radius:6px; }
.ccw-close:hover { background:var(--ccw-surface-3); }
.ccw-max { border:none; background:transparent; color:inherit; cursor:pointer; font-size:12px; line-height:1; padding:5px 8px; border-radius:6px; white-space:nowrap; }
.ccw-max:hover { background:var(--ccw-surface-3); }
.ccw-toggle { display:inline-flex; align-items:center; gap:6px; height:30px; padding:0 9px; border:1px solid transparent; border-radius:7px; background:transparent; color:inherit; cursor:pointer; font-size:12px; }
.ccw-toggle:hover { background:var(--ccw-surface-3); }
.ccw-toggle-active { background:var(--ccw-accent-soft); color:var(--ccw-accent); }
.ccw-topbar { display:flex; align-items:center; gap:8px; padding:6px 10px; border-bottom:1px solid var(--ccw-border); flex:none; }
.ccw-body { flex:1; display:flex; min-height:0; }
.ccw-sidebar { flex:none; overflow-y:auto; border-right:1px solid var(--ccw-border); padding:8px; }
.ccw-split { flex:none; width:5px; cursor:col-resize; background:var(--ccw-border-strong); touch-action:none; z-index:2; }
.ccw-split:hover { background:var(--ccw-accent); }
.ccw-main { flex:1; min-width:0; min-height:0; display:flex; flex-direction:column; }
.ccw-msgs { flex:1; overflow-y:auto; padding:12px 14px; display:flex; flex-direction:column; gap:10px; }
.ccw-footer { flex:none; border-top:1px solid var(--ccw-border); padding:8px 10px 10px; display:flex; flex-direction:column; }
.ccw-input-row { display:flex; align-items:flex-end; gap:8px; }
.ccw-input { flex:1; resize:none; min-height:40px; max-height:360px; padding:8px 10px; border:1px solid var(--ccw-border-strong); border-radius:8px; font:inherit; background:var(--ccw-surface); color:var(--ccw-text); }
.ccw-input:focus { outline:none; border-color:var(--ccw-accent); }
.ccw-btn { border:1px solid var(--ccw-border-strong); background:var(--ccw-surface); color:var(--ccw-text); border-radius:8px; padding:8px 12px; cursor:pointer; font:inherit; white-space:nowrap; }
.ccw-btn:hover { background:var(--ccw-surface-3); }
.ccw-btn.primary { background:var(--ccw-accent); border-color:var(--ccw-accent); color:#fff; }
.ccw-btn.primary:hover { background:var(--ccw-accent-hover); }
.ccw-btn.danger { background:var(--ccw-danger); border-color:var(--ccw-danger); color:#fff; }
.ccw-btn.small { padding:4px 8px; font-size:12px; border-radius:6px; }
.ccw-btn:disabled { opacity:.5; cursor:not-allowed; }
.ccw-ws { margin-bottom:6px; }
.ccw-ws-head { display:flex; align-items:center; gap:4px; cursor:pointer; padding:4px 6px; border-radius:6px; font-weight:600; }
.ccw-ws-head:hover { background:var(--ccw-surface-3); }
.ccw-ws-head.current { background:var(--ccw-selected); }
.ccw-ws-cur { width:7px; height:7px; border-radius:50%; background:var(--ccw-accent); flex:none; }
.ccw-ws-name { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ccw-srow { display:flex; align-items:center; gap:6px; padding:5px 6px 5px 18px; border-radius:6px; cursor:pointer; }
.ccw-srow:hover { background:var(--ccw-surface-3); }
.ccw-srow .ccw-sdim { transition:opacity .12s; }
.ccw-srow:hover .ccw-sdim { opacity:0; }
.ccw-srow-actions { position:absolute; right:6px; top:50%; transform:translateY(-50%); margin:0; padding:0 2px 0 10px; background:inherit; border-radius:6px; display:inline-flex; gap:2px; opacity:0; pointer-events:none; transition:opacity .12s; }
.ccw-srow:hover .ccw-srow-actions, .ccw-srow:focus-within .ccw-srow-actions { opacity:1; pointer-events:auto; }
.ccw-ws-head .ccw-icbtn { opacity:0; pointer-events:none; }
.ccw-ws-head:hover .ccw-icbtn, .ccw-ws-head:focus-within .ccw-icbtn { opacity:1; pointer-events:auto; }
.ccw-srow.active { background:var(--ccw-selected); }
.ccw-stitle { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ccw-sdim { flex:none; font-size:11px; color:var(--ccw-text-3); white-space:nowrap; padding-left:6px; }
.ccw-sdot { width:8px; height:8px; border-radius:50%; flex:none; }
.ccw-msg { max-width:86%; padding:8px 12px; border-radius:10px; line-height:1.55; overflow-wrap:anywhere; }
.ccw-msg.user { align-self:flex-end; background:var(--ccw-accent); color:#fff; white-space:pre-wrap; }
.ccw-msg.assistant { align-self:flex-start; background:var(--ccw-surface-2); }
.ccw-msg.tool { align-self:flex-start; background:var(--ccw-surface-2); font-size:12px; opacity:.85; }
.ccw-msg.result { align-self:flex-start; font-size:12px; }
.ccw-msg.result.err { color:var(--ccw-danger); }
.ccw-thinking { font-size:12px; opacity:.65; white-space:pre-wrap; border-left:3px solid var(--ccw-border-strong); padding-left:8px; margin-bottom:6px; }
.ccw-think-toggle { display:inline-flex; align-items:center; gap:6px; border:none; background:transparent; color:var(--ccw-text-3); font-size:12px; cursor:pointer; padding:2px 0; margin-bottom:4px; }
.ccw-think-toggle:hover { color:var(--ccw-text); }
.ccw-think-chev { font-size:10px; line-height:1; }
.ccw-think-label { font-weight:500; }
.ccw-think-pulse { width:6px; height:6px; border-radius:50%; background:var(--ccw-text-3); animation:ccwPulse 1s ease-in-out infinite; }
@keyframes ccwPulse { 0%,100% { opacity:.2; } 50% { opacity:1; } }
.ccw-md { line-height:1.6; overflow-wrap:anywhere; }
.ccw-md .ccw-p { margin:4px 0; }
.ccw-md .ccw-pre { background:var(--ccw-code); border:1px solid var(--ccw-border-strong); border-radius:6px; padding:8px 10px; overflow-x:auto; margin:6px 0; font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size:12px; }
.ccw-md .ccw-pre code { font-family:inherit; white-space:pre; }
.ccw-md .ccw-icode { background:var(--ccw-code); border-radius:4px; padding:1px 5px; font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size:12px; }
.ccw-md .ccw-h { margin:8px 0 4px; font-weight:600; line-height:1.3; }
.ccw-md h1.ccw-h { font-size:17px; }
.ccw-md h2.ccw-h { font-size:15px; }
.ccw-md h3.ccw-h, .ccw-md h4.ccw-h, .ccw-md h5.ccw-h, .ccw-md h6.ccw-h { font-size:13.5px; }
.ccw-md .ccw-ul, .ccw-md .ccw-ol { margin:4px 0; padding-left:20px; }
.ccw-md .ccw-ul li, .ccw-md .ccw-ol li { margin:2px 0; }
.ccw-md .ccw-bq { border-left:3px solid var(--ccw-border-strong); padding:2px 10px; margin:6px 0; opacity:.85; }
.ccw-md .ccw-table-wrap { overflow-x:auto; margin:6px 0; }
.ccw-md .ccw-table { border-collapse:collapse; width:100%; min-width:320px; }
.ccw-md .ccw-table th, .ccw-md .ccw-table td { border:1px solid var(--ccw-border-strong); padding:5px 10px; font-size:12px; text-align:left; }
.ccw-md .ccw-table th { background:var(--ccw-surface-3); font-weight:600; }
.ccw-md .ccw-hr { border:none; border-top:1px solid var(--ccw-border-strong); margin:8px 0; }
.ccw-md .ccw-a { color:var(--ccw-accent); text-decoration:none; }
.ccw-md .ccw-a:hover { text-decoration:underline; }
.ccw-md strong { font-weight:600; }
.ccw-md em { font-style:italic; }
.ccw-md .ccw-mermaid { margin:8px 0; border:1px solid var(--ccw-border-strong); border-radius:8px; padding:8px 10px; background:var(--ccw-surface); overflow-x:auto; }
.ccw-md .ccw-mermaid-status { font-size:12px; color:var(--ccw-text-3); padding:2px 0; }
.ccw-md .ccw-mermaid-svg { text-align:center; }
.ccw-md .ccw-mermaid-svg svg { max-width:100%; height:auto; display:inline-block; }
.ccw-md .ccw-mermaid-bar { display:flex; justify-content:flex-end; gap:6px; margin-top:4px; }
.ccw-md .ccw-mermaid-err { font-size:12px; color:var(--ccw-danger); margin-bottom:4px; white-space:pre-wrap; }
.ccw-md .ccw-mermaid .ccw-mermaid-src { margin:4px 0 0; }
.ccw-pre-wrap { position:relative; }
.ccw-code-copy { position:absolute; top:6px; right:6px; border:1px solid var(--ccw-border-strong); background:var(--ccw-surface); color:var(--ccw-text); border-radius:4px; font-size:10px; padding:2px 6px; cursor:pointer; opacity:.55; }
.ccw-code-copy:hover { opacity:1; }
.ccw-msgtime-in { font-size:10px; opacity:.55; margin-top:3px; text-align:right; }
.ccw-tool-out { font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size:11px; background:var(--ccw-code); border-radius:6px; padding:6px 8px; white-space:pre-wrap; max-height:220px; overflow-y:auto; margin-top:4px; }
.ccw-tool-fold { font-size:11px; opacity:.6; color:var(--ccw-text-3); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:3px; max-width:100%; }
.ccw-sub-head { display:flex; align-items:center; gap:6px; flex-wrap:wrap; font-weight:600; }
.ccw-sub-badge { font-size:11px; font-weight:600; padding:1px 7px; border-radius:999px; background:var(--ccw-accent-soft); color:var(--ccw-accent); }
.ccw-sub-meta { font-size:11px; color:var(--ccw-text-3); margin-top:3px; }
.ccw-sub-body { margin-top:6px; max-height:420px; overflow:auto; }
.ccw-toasts { position:absolute; left:50%; bottom:64px; transform:translateX(-50%); display:flex; flex-direction:column; align-items:center; gap:6px; z-index:1200; pointer-events:none; width:max-content; max-width:calc(100% - 32px); }
.ccw-toast { background:var(--ccw-toast-bg); color:var(--ccw-toast-fg); font-size:12px; padding:7px 14px; border-radius:8px; box-shadow:0 4px 16px rgba(0,0,0,.25); max-width:min(420px,90vw); box-sizing:border-box; }
.ccw-toast.err { background:var(--ccw-danger); }
.ccw-toast.ok { background:var(--ccw-success); }
.ccw-mini-pill { position:absolute; right:20px; bottom:20px; display:inline-flex; align-items:center; gap:7px; padding:8px 14px; border-radius:999px; background:var(--ccw-surface); border:1px solid var(--ccw-border-strong); box-shadow:0 8px 24px rgba(0,0,0,.25); cursor:pointer; font-size:12px; font-weight:600; color:var(--ccw-text); z-index:40; }
.ccw-wsfilter { width:100%; margin-bottom:8px; padding:5px 8px; border:1px solid var(--ccw-border-strong); border-radius:6px; font:inherit; font-size:12px; background:var(--ccw-surface); color:var(--ccw-text); }
.ccw-loadmore { align-self:center; margin-bottom:4px; }
.ccw-batchbar { align-self:stretch; display:flex; align-items:center; gap:8px; padding:6px 10px; border:1px solid var(--ccw-warn); background:var(--ccw-warn-soft); border-radius:8px; font-size:12px; margin-bottom:2px; }
.ccw-queued { display:flex; align-items:center; gap:6px; font-size:11px; color:var(--ccw-text-3); padding:0 2px 4px; }
.ccw-img-chips { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:4px; padding:0 2px; }
.ccw-img-chip { display:inline-flex; align-items:center; gap:4px; font-size:11px; border:1px solid var(--ccw-border-strong); border-radius:6px; padding:2px 6px; background:var(--ccw-surface-3); }
.ccw-pop-hint { color:var(--ccw-text-3); font-size:10px; margin-left:4px; }
.ccw-umsg-edit { float:right; border:none; background:var(--ccw-surface-3); color:var(--ccw-text-3); cursor:pointer; font-size:10px; border-radius:4px; padding:1px 5px; margin-left:8px; opacity:.75; }
.ccw-umsg-edit:hover { opacity:1; }
.ccw-dialog-input { width:100%; padding:7px 9px; border:1px solid var(--ccw-border-strong); border-radius:6px; font:inherit; background:var(--ccw-surface); color:var(--ccw-text); }
.ccw-dim { color:var(--ccw-text-3); font-size:12px; }
.ccw-icbtn { flex:none; border:none; background:transparent; color:var(--ccw-text-3); cursor:pointer; font-size:11px; line-height:1; padding:3px 4px; border-radius:4px; opacity:.65; }
.ccw-icbtn:hover { background:var(--ccw-surface-3); color:var(--ccw-text); opacity:1; }
.ccw-srow-actions { display:inline-flex; gap:2px; flex:none; margin-left:4px; opacity:.35; transition:opacity .12s; }
.ccw-srow:hover .ccw-srow-actions { opacity:1; }
.ccw-ctl { align-self:stretch; max-width:100%; border:1px solid var(--ccw-warn); background:var(--ccw-warn-soft); }
.ccw-ctl-head { font-weight:600; margin-bottom:6px; }
.ccw-ctl-input { font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size:11px; background:var(--ccw-code); border-radius:6px; padding:6px 8px; white-space:pre-wrap; max-height:180px; overflow-y:auto; margin-bottom:8px; }
.ccw-ctl-actions { display:flex; gap:8px; }
.ccw-pop-list { display:flex; flex-direction:column; gap:2px; max-height:240px; overflow-y:auto; margin-bottom:6px; border:1px solid var(--ccw-border); border-radius:8px; padding:4px; background:var(--ccw-surface-2); }
.ccw-pop-item { display:flex; align-items:center; gap:6px; padding:5px 8px; border-radius:6px; cursor:pointer; font-size:12px; white-space:nowrap; overflow:hidden; }
.ccw-pop-item:hover, .ccw-pop-item.sel { background:var(--ccw-selected); }
.ccw-pop-kind { flex:none; font-size:10px; color:var(--ccw-text-3); border:1px solid var(--ccw-border-strong); border-radius:4px; padding:0 4px; }
.ccw-pop-kind.skill { color:var(--ccw-accent); border-color:var(--ccw-accent); }
.ccw-resize { height:6px; cursor:row-resize; margin:0 2px 6px; border-radius:3px; background:var(--ccw-border-strong); opacity:.5; }
.ccw-resize:hover { opacity:1; background:var(--ccw-accent); }
.ccw-empty { align-self:center; margin:auto; color:var(--ccw-text-3); font-size:13px; text-align:center; }
.ccw-status { font-size:12px; color:var(--ccw-text-3); white-space:nowrap; }
.ccw-status.running, .ccw-status.starting { color:var(--ccw-warn); }
.ccw-status.error { color:var(--ccw-danger); }
.ccw-status.done, .ccw-status.stopped { color:var(--ccw-success); }
.ccw-modal { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,.4); z-index:1100; }
.ccw-modal-box { background:var(--ccw-surface); color:var(--ccw-text); border:1px solid var(--ccw-border-strong); border-radius:12px; box-shadow:0 16px 48px rgba(0,0,0,.2); padding:16px; min-width:320px; max-width:480px; max-height:80%; overflow-y:auto; }
.ccw-modal-head { font-weight:600; font-size:14px; margin-bottom:10px; white-space:pre-wrap; }
.ccw-modal-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:14px; }
.ccw-modal-log { font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size:11px; background:var(--ccw-code); border-radius:6px; padding:8px; max-height:200px; overflow-y:auto; white-space:pre-wrap; margin-top:8px; }
.ccw-main { position:relative; }
.ccw-searchbar { flex:none; display:flex; align-items:center; gap:6px; padding:6px 10px; border-bottom:1px solid var(--ccw-border); background:var(--ccw-surface-2); }
.ccw-search-input { flex:1; min-width:0; padding:5px 9px; border:1px solid var(--ccw-border-strong); border-radius:6px; font:inherit; font-size:12px; background:var(--ccw-surface); color:var(--ccw-text); }
.ccw-search-input:focus { outline:none; border-color:var(--ccw-accent); }
.ccw-search-count { flex:none; font-size:11px; color:var(--ccw-text-3); white-space:nowrap; }
.ccw-msg.ccw-search-hit { outline:2px solid var(--ccw-warn); outline-offset:2px; box-shadow:0 0 0 5px var(--ccw-warn-soft); }
.ccw-mark { background:rgba(250,204,21,.5); color:inherit; border-radius:2px; padding:0 1px; }
.ccw-msg.user .ccw-mark { background:var(--ccw-mark); color:var(--ccw-text); }
.ccw-turn { align-self:stretch; display:flex; align-items:center; gap:10px; color:var(--ccw-text-3); font-size:11px; margin:4px 0; white-space:nowrap; }
.ccw-turn::before, .ccw-turn::after { content:""; flex:1; height:1px; background:var(--ccw-border); }
.ccw-toc { position:absolute; top:8px; right:10px; width:min(280px, 62%); max-height:74%; display:flex; flex-direction:column; background:var(--ccw-surface); color:var(--ccw-text); border:1px solid var(--ccw-border-strong); border-radius:10px; box-shadow:0 12px 32px rgba(0,0,0,.28); z-index:50; overflow:hidden; }
.ccw-toc-head { display:flex; align-items:center; gap:6px; padding:8px 10px; border-bottom:1px solid var(--ccw-border); font-weight:600; font-size:12px; }
.ccw-toc-list { overflow-y:auto; padding:4px; }
.ccw-toc-item { display:flex; align-items:baseline; gap:8px; padding:6px 8px; border-radius:6px; cursor:pointer; font-size:12px; }
.ccw-toc-item:hover { background:var(--ccw-surface-3); }
.ccw-toc-n { flex:none; font-weight:600; color:var(--ccw-accent); min-width:46px; }
.ccw-toc-time { flex:none; font-size:10px; color:var(--ccw-text-3); }
.ccw-toc-txt { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--ccw-text-3); }
/* ===== P0：窗口壳 / 图标 / 菜单 / 焦点 ===== */
.ccw-i { width:16px; height:16px; flex:none; display:block; fill:none; stroke:currentColor; stroke-width:1.75; stroke-linecap:round; stroke-linejoin:round; }
.ccw-iconbtn { display:inline-flex; align-items:center; justify-content:center; width:28px; height:28px; padding:0; border:0; border-radius:6px; background:transparent; color:var(--ccw-text-3); cursor:pointer; transition:background .12s, color .12s; }
.ccw-iconbtn:hover { background:var(--ccw-surface-3); color:var(--ccw-text); }
.ccw-iconbtn.active { background:var(--ccw-accent-soft); color:var(--ccw-accent); }
.ccw-iconbtn:disabled { opacity:.4; cursor:not-allowed; }

.ccw-titlebar { height:42px; padding:0 8px 0 14px; gap:8px; background:var(--ccw-bg); }
.ccw-titlebar .ccw-iconbtn { cursor:pointer; }
.ccw-brand { font-size:12.5px; font-weight:640; letter-spacing:.005em; }
.ccw-logo { color:var(--ccw-accent); }
.ccw-conn { display:inline-flex; align-items:center; gap:6px; margin-left:4px; font-size:11px; color:var(--ccw-text-3); }
.ccw-dot { display:inline-block; width:6px; height:6px; border-radius:50%; background:var(--ccw-text-3); flex:none; }
.ccw-dot.ok { background:var(--ccw-success); }
.ccw-dot.run { background:var(--ccw-warn); }
.ccw-dot.acc { background:var(--ccw-accent); }
.ccw-dot.err { background:var(--ccw-danger); }

.ccw-topbar { height:46px; padding:0 10px 0 16px; gap:10px; background:var(--ccw-surface); min-width:0; }
.ccw-crumb { flex:0 1 auto; }
.ccw-status, .ccw-meta, .ccw-model, .ccw-iconbtn, .ccw-menu-wrap { flex:none; }
.ccw-crumb { display:flex; align-items:center; gap:6px; min-width:0; font-size:12.5px; color:var(--ccw-text-3); }
.ccw-crumb .ccw-i { color:var(--ccw-text-3); }
.ccw-crumb b { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:340px; color:var(--ccw-text); font-weight:600; }
.ccw-crumb-ws { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:160px; }
.ccw-meta { font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size:10.5px; color:var(--ccw-text-3); white-space:nowrap; max-width:130px; overflow:hidden; text-overflow:ellipsis; }
.ccw-model { height:26px; max-width:132px; padding:0 24px 0 8px; appearance:none; -webkit-appearance:none; background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%238A877E' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 7px center; border:1px solid var(--ccw-border); border-radius:6px; background:var(--ccw-surface); color:var(--ccw-text-2); font:inherit; font-size:11px; cursor:pointer; }
.ccw-model:hover { border-color:var(--ccw-border-strong); color:var(--ccw-text); }
.ccw-status { display:inline-flex; align-items:center; gap:6px; font-size:11px; color:var(--ccw-text-3); white-space:nowrap; }
.ccw-status.running .ccw-dot, .ccw-status.starting .ccw-dot { background:var(--ccw-warn); }
.ccw-status.done .ccw-dot, .ccw-status.stopped .ccw-dot { background:var(--ccw-success); }
.ccw-status.error .ccw-dot { background:var(--ccw-danger); }

.ccw-menu-wrap { position:relative; display:inline-flex; }
.ccw-menu { position:absolute; top:34px; right:0; min-width:210px; padding:4px; background:var(--ccw-surface); border:1px solid var(--ccw-border); border-radius:10px; box-shadow:0 18px 40px -18px rgba(20,18,14,.45); z-index:80; }
.ccw-menu-item { display:flex; align-items:center; gap:8px; width:100%; height:32px; padding:0 9px; border:0; border-radius:6px; background:transparent; color:var(--ccw-text-2); font:inherit; font-size:12px; text-align:left; cursor:pointer; }
.ccw-menu-item:hover { background:var(--ccw-surface-2); color:var(--ccw-text); }
.ccw-menu-item:disabled { opacity:.4; cursor:not-allowed; }
.ccw-menu-item .ccw-i { width:14px; height:14px; color:var(--ccw-text-3); }
.ccw-menu-sep { height:1px; margin:4px 2px; background:var(--ccw-border); }
.ccw-narrow .ccw-topbar { padding:0 8px 0 12px; gap:6px; }
.ccw-narrow .ccw-meta, .ccw-narrow .ccw-crumb-ws { display:none; }
.ccw-narrow .ccw-crumb b { max-width:190px; }
.ccw-narrow .ccw-model { max-width:104px; }

.ccw-sidebar { background:var(--ccw-surface-2); padding:10px 8px; }
.ccw-btn { display:inline-flex; align-items:center; justify-content:center; gap:6px; height:30px; padding:0 11px; border-radius:8px; font-size:12px; transition:background .12s, border-color .12s, color .12s; }
.ccw-btn .ccw-i { width:14px; height:14px; }
.ccw-btn.small { height:26px; padding:0 8px; font-size:11.5px; border-radius:6px; }
.ccw-btn.primary { color:var(--ccw-accent-fg); }
.ccw-btn.primary:hover { background:var(--ccw-accent-hover); border-color:var(--ccw-accent-hover); }
.ccw-btn.danger { background:var(--ccw-danger); border-color:var(--ccw-danger); color:var(--ccw-danger-fg); }
.ccw-btn.danger:hover { background:var(--ccw-danger); opacity:.9; }
.ccw-input { min-height:44px; padding:9px 11px; border-radius:10px; font-size:13.5px; transition:border-color .12s, box-shadow .12s; }
.ccw-input:focus { border-color:var(--ccw-accent); box-shadow:0 0 0 3px var(--ccw-accent-soft); }
.ccw-footer { padding:8px 12px 12px; background:var(--ccw-surface); }
.ccw-msg.user { background:var(--ccw-accent-soft); color:var(--ccw-text); }
.ccw-msg.tool { background:var(--ccw-surface-2); color:var(--ccw-text-2); opacity:1; }
.ccw-ws-chev { color:var(--ccw-text-3); transition:transform .16s ease; }
.ccw-ws-chev.open { transform:rotate(90deg); }
.ccw-ws-head { height:28px; padding:0 6px 0 4px; border-radius:6px; }
.ccw-ws-head:hover { background:var(--ccw-surface-3); }
.ccw-ws-head.current { background:var(--ccw-selected); }
.ccw-srow { height:30px; border-radius:7px; position:relative; }
.ccw-sdot { background:var(--ccw-border-strong); }
.ccw-sdot.run { background:var(--ccw-warn); }
.ccw-sdot.acc { background:var(--ccw-accent); }
.ccw-icbtn { display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; padding:0; border:0; border-radius:5px; background:transparent; color:var(--ccw-text-3); cursor:pointer; }
.ccw-icbtn:hover { background:var(--ccw-surface-3); color:var(--ccw-text); }
.ccw-srow:hover { background:var(--ccw-surface-3); }
.ccw-srow .ccw-sdim { transition:opacity .12s; }
.ccw-srow:hover .ccw-sdim { opacity:0; }
.ccw-srow-actions { position:absolute; right:6px; top:50%; transform:translateY(-50%); margin:0; padding:0 2px 0 10px; background:inherit; border-radius:6px; display:inline-flex; gap:2px; opacity:0; pointer-events:none; transition:opacity .12s; }
.ccw-srow:hover .ccw-srow-actions, .ccw-srow:focus-within .ccw-srow-actions { opacity:1; pointer-events:auto; }
.ccw-ws-head .ccw-icbtn { opacity:0; pointer-events:none; }
.ccw-ws-head:hover .ccw-icbtn, .ccw-ws-head:focus-within .ccw-icbtn { opacity:1; pointer-events:auto; }
.ccw-srow.active { background:var(--ccw-surface); box-shadow:inset 2px 0 0 var(--ccw-accent); }
.ccw-searchbar { background:var(--ccw-surface-2); }
.ccw-toast.ok, .ccw-toast.err { background:var(--ccw-toast-bg); color:var(--ccw-toast-fg); }
.ccw-toast.ok { border-left:3px solid var(--ccw-success); }
.ccw-toast.err { border-left:3px solid var(--ccw-danger); }
.ccw-tool-icon { display:inline-block; vertical-align:-3px; margin-right:4px; color:var(--ccw-text-3); }
.ccw-tool-name { font-weight:500; color:var(--ccw-text-2); }
.ccw-chev { display:inline-block; vertical-align:-2px; margin-right:3px; transition:transform .16s ease; }
.ccw-chev.open { transform:rotate(90deg); }
.ccw-think-chev { display:inline-flex; align-items:center; }
.ccw-think-chev .ccw-i { transition:transform .16s ease; }
.ccw-think-toggle.open .ccw-think-chev .ccw-i { transform:rotate(90deg); }
.ccw-result-icon { display:inline-block; vertical-align:-2px; margin-right:5px; }
.ccw-ctl-icon { display:inline-block; vertical-align:-3px; margin-right:5px; color:var(--ccw-warn); }
.ccw-sub-head { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
.ccw-queue-icon { display:inline-block; vertical-align:-2px; margin-right:4px; color:var(--ccw-text-3); }
.ccw-updated { display:flex; align-items:center; gap:5px; }
.ccw-modal-head { display:flex; align-items:center; gap:7px; }
.ccw-toolstate { display:inline-flex; align-items:center; gap:5px; font-size:11px; color:var(--ccw-text-3); }
.ccw-toolstate .ccw-dot { width:5px; height:5px; }
.ccw-toolstate.run .ccw-dot { background:var(--ccw-warn); }
.ccw-toolstate.done .ccw-dot { background:var(--ccw-success); }
.ccw-msgs, .ccw-sidebar, .ccw-toc-list, .ccw-pop-list { scrollbar-width:thin; scrollbar-color:var(--ccw-border-strong) transparent; }
.ccw-msgs::-webkit-scrollbar, .ccw-sidebar::-webkit-scrollbar, .ccw-toc-list::-webkit-scrollbar { width:10px; }
.ccw-msgs::-webkit-scrollbar-thumb, .ccw-sidebar::-webkit-scrollbar-thumb, .ccw-toc-list::-webkit-scrollbar-thumb { background:var(--ccw-border-strong); border:3px solid transparent; background-clip:padding-box; border-radius:8px; }
.ccw :focus-visible { outline:2px solid var(--ccw-accent); outline-offset:2px; }
.ccw input:focus-visible, .ccw textarea:focus-visible, .ccw select:focus-visible { outline:2px solid var(--ccw-accent); outline-offset:1px; }
.ccw-search-hit { outline:2px solid var(--ccw-warn); outline-offset:2px; }
.ccw-mark { background:var(--ccw-mark); color:var(--ccw-mark-fg); }

/* ===== P1：文档流消息 / 统一工具卡 / 输入区 / 侧栏密度 ===== */
.ccw-msgs { padding:18px 26px 22px; gap:16px; }
.ccw-turnblk { width:100%; align-self:stretch; display:flex; flex-direction:column; }
.ccw-turnbody { width:100%; display:flex; flex-direction:column; gap:16px; }
.ccw-turn { position:sticky; top:-18px; z-index:2; display:flex; align-items:center; gap:8px; align-self:stretch; width:100%; max-width:100%; margin:0 0 6px; padding:4px 0 8px; background:linear-gradient(var(--ccw-bg) 70%, transparent); font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size:9.5px; letter-spacing:.07em; color:var(--ccw-text-3); white-space:nowrap; }
.ccw-turn::before { content:none; }
.ccw-turn::after { content:""; width:38px; height:1px; flex:none; background:var(--ccw-border); }
.ccw-msg { width:100%; max-width:100%; padding:0; border-radius:0; background:transparent; font-size:13.5px; line-height:1.7; }
.ccw-msg.user { align-self:flex-start; background:var(--ccw-surface-2); color:var(--ccw-text); border-left:2px solid var(--ccw-accent); border-radius:0 8px 8px 0; padding:10px 13px 8px; white-space:normal; }
.ccw-user-text { white-space:pre-wrap; word-break:break-word; line-height:1.62; }
.ccw-user-images { display:flex; align-items:center; gap:4px; margin-top:6px; font-size:11px; color:var(--ccw-text-3); }
.ccw-user-foot { display:flex; align-items:center; justify-content:flex-end; gap:8px; margin-top:5px; min-height:16px; }
.ccw-msg.user .ccw-umsg-edit { float:none; margin:0; padding:1px 3px; background:transparent; opacity:.55; display:inline-flex; align-items:center; gap:4px; font-size:10.5px; }
.ccw-msg.user .ccw-umsg-edit:hover { opacity:1; background:var(--ccw-surface-3); }
.ccw-msg.assistant { align-self:flex-start; background:transparent; padding:0; }
.ccw-msg.assistant .ccw-md { color:var(--ccw-text); }
.ccw-msgtime-in { font-size:10.5px; color:var(--ccw-text-3); opacity:1; margin:0; text-align:right; font-variant-numeric:tabular-nums; }
.ccw-thinking { border-left:2px solid var(--ccw-border-strong); padding:1px 0 1px 11px; margin:0 0 10px; font-size:12.5px; line-height:1.65; color:var(--ccw-text-3); }
.ccw-think-toggle { margin-bottom:7px; padding:2px 6px 2px 3px; border-radius:5px; font-size:11.5px; }
.ccw-think-toggle:hover { background:var(--ccw-surface-2); }
.ccw-md { line-height:1.7; font-size:13.5px; }
.ccw-md .ccw-p { margin:0 0 10px; }
.ccw-md .ccw-p:last-child { margin-bottom:0; }
.ccw-md .ccw-h { margin:14px 0 6px; }
.ccw-md .ccw-ul, .ccw-md .ccw-ol { margin:6px 0 10px; }
.ccw-md .ccw-ul li, .ccw-md .ccw-ol li { margin:3px 0; }
.ccw-md .ccw-bq { border-left:2px solid var(--ccw-border-strong); padding:2px 12px; margin:10px 0; color:var(--ccw-text-2); }
.ccw-md .ccw-pre { background:var(--ccw-code); border:1px solid var(--ccw-border); border-radius:9px; padding:10px 12px; margin:8px 0 12px; font-size:12px; line-height:1.6; }
.ccw-md .ccw-table th, .ccw-md .ccw-table td { border-color:var(--ccw-border); }
.ccw-md a { color:var(--ccw-accent); text-decoration:none; }
.ccw-md a:hover { text-decoration:underline; }

/* 统一工具卡 */
.ccw-msg.tool { align-self:flex-start; padding:0; background:transparent; opacity:1; font-size:13.5px; line-height:1.6; }
.ccw-tool-card { border:1px solid var(--ccw-border); border-radius:10px; background:var(--ccw-surface); overflow:hidden; }
.ccw-tool-card.running { border-color:var(--ccw-border-strong); }
.ccw-tool-card.err { border-color:var(--ccw-danger); }
.ccw-tool-head { display:flex; align-items:center; gap:9px; width:100%; padding:8px 10px; border:0; background:transparent; color:inherit; font:inherit; text-align:left; cursor:pointer; }
.ccw-tool-head:hover { background:var(--ccw-surface-2); }
.ccw-tool-head:disabled { cursor:default; opacity:1; color:inherit; }
.ccw-tool-head:disabled:hover { background:transparent; }
.ccw-tool-glyph { flex:none; width:24px; height:24px; border-radius:6px; background:var(--ccw-surface-2); color:var(--ccw-text-3); display:inline-flex; align-items:center; justify-content:center; }
.ccw-tool-card[data-kind="sub"] .ccw-tool-glyph { background:var(--ccw-accent-soft); color:var(--ccw-accent); }
.ccw-tool-title { flex:1; min-width:0; display:flex; align-items:center; gap:7px; overflow:hidden; }
.ccw-tool-name { flex:none; font-size:12.5px; font-weight:600; color:var(--ccw-text); }
.ccw-tool-target { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--ccw-text-3); font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size:11px; }
.ccw-tool-target.ccw-tool-desc { font-family:inherit; font-size:12px; }
.ccw-tool-head .ccw-sub-badge { flex:none; }
.ccw-tool-head .ccw-toolstate { flex:none; }
.ccw-tool-card .ccw-toolstate .ccw-dot { width:6px; height:6px; }
.ccw-tool-card .ccw-toolstate.run .ccw-dot { background:var(--ccw-warn); animation:ccwPulse 1.2s ease-in-out infinite; }
.ccw-tool-card .ccw-toolstate.done .ccw-dot { background:var(--ccw-success); }
.ccw-tool-card .ccw-toolstate.err { color:var(--ccw-danger); }
.ccw-tool-card .ccw-toolstate.err .ccw-dot { background:var(--ccw-danger); }
.ccw-tool-size { flex:none; font-size:10px; color:var(--ccw-text-3); font-variant-numeric:tabular-nums; }
.ccw-tool-time { flex:none; width:38px; text-align:right; font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size:9.5px; color:var(--ccw-text-3); font-variant-numeric:tabular-nums; }
.ccw-tool-head .ccw-chev { flex:none; margin:0; vertical-align:0; color:var(--ccw-text-3); }
.ccw-tool-meta { padding:0 10px 7px 43px; margin-top:-2px; font-size:10.5px; color:var(--ccw-text-3); }
.ccw-tool-body { border-top:1px solid var(--ccw-border); padding:9px 12px; background:var(--ccw-surface-2); }
.ccw-tool-body.ccw-sub-body { margin:0; max-height:420px; overflow:auto; }
.ccw-tool-body .ccw-md { font-size:12.5px; }
.ccw-tool-body .ccw-md h1.ccw-h { font-size:15px; }
.ccw-tool-body .ccw-md h2.ccw-h { font-size:14px; }
.ccw-tool-body .ccw-md .ccw-h:first-child { margin-top:2px; }
.ccw-tool-out { padding:0; margin:0; background:transparent; border:0; border-radius:0; font-size:11.5px; line-height:1.6; max-height:280px; overflow:auto; white-space:pre-wrap; }
.ccw-tool-card.err .ccw-tool-body { background:var(--ccw-danger-soft); }
.ccw-tool-card.err .ccw-tool-out { color:var(--ccw-danger); }

/* 输入区 */
.ccw-footer { padding:8px 12px 11px; }
.ccw-resize { flex:none; width:100%; height:14px; margin:0 0 2px; display:flex; align-items:center; justify-content:center; cursor:row-resize; touch-action:none; background:transparent; opacity:1; border-radius:0; }
.ccw-resize-grip { width:34px; height:4px; border-radius:2px; background:var(--ccw-border-strong); opacity:.55; transition:background .12s, opacity .12s; }
.ccw-resize:hover .ccw-resize-grip, .ccw-resize:focus-visible .ccw-resize-grip { background:var(--ccw-accent); opacity:.9; }
.ccw-resize:focus-visible { outline:none; }
.ccw-composer { display:flex; flex-direction:column; border:1px solid var(--ccw-border-strong); border-radius:12px; background:var(--ccw-surface); transition:border-color .12s, box-shadow .12s; }
.ccw-composer:focus-within { border-color:var(--ccw-accent); }
.ccw-composer .ccw-input { flex:none; width:100%; min-height:46px; padding:12px 14px 4px; border:0; border-radius:12px 12px 0 0; background:transparent; box-shadow:none; }
.ccw-composer .ccw-input:focus, .ccw-composer .ccw-input:focus-visible { border:0; box-shadow:none; outline:none; }
.ccw-composer-bar { display:flex; align-items:center; gap:6px; padding:6px 8px 8px 10px; min-width:0; }
.ccw-composer-hint { display:inline-flex; align-items:center; gap:3px; padding:3px 5px; border-radius:5px; font-size:10.5px; color:var(--ccw-text-3); }
.ccw-composer .ccw-model { flex:none; height:26px; max-width:132px; appearance:none; -webkit-appearance:none; border:1px solid var(--ccw-border); border-radius:6px; background-color:var(--ccw-surface); background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%238A877E' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 7px center; padding:0 22px 0 8px; font-size:11px; color:var(--ccw-text-2); cursor:pointer; }
.ccw-composer .ccw-model:hover { border-color:var(--ccw-border-strong); color:var(--ccw-text); }
.ccw-composer .ccw-model:focus, .ccw-composer .ccw-model:focus-visible { outline:none; border-color:var(--ccw-accent); box-shadow:0 0 0 3px var(--ccw-accent-soft); }
.ccw-sendbtn { flex:none; width:28px; height:28px; border-radius:50%; border:1px solid var(--ccw-accent); background:var(--ccw-accent); color:var(--ccw-accent-fg); display:inline-flex; align-items:center; justify-content:center; cursor:pointer; padding:0; transition:background .12s, border-color .12s; }
.ccw-sendbtn:hover { background:var(--ccw-accent-hover); border-color:var(--ccw-accent-hover); }
.ccw-stopbtn { flex:none; height:26px; padding:0 9px; border-radius:6px; border:1px solid var(--ccw-border); background:var(--ccw-surface); color:var(--ccw-text-2); display:inline-flex; align-items:center; justify-content:center; gap:5px; font:inherit; font-size:11px; cursor:pointer; }
.ccw-stopbtn:hover { border-color:var(--ccw-border-strong); color:var(--ccw-text); }
.ccw-stop-sq { width:8px; height:8px; border-radius:2px; background:currentColor; flex:none; }

/* 侧栏密度 */
.ccw-sidebar { padding:10px 8px; }
.ccw-ws { margin-bottom:4px; }
.ccw-ws-head { height:30px; padding:0 6px; border-radius:6px; font-size:12px; }
.ccw-ws-orphan .ccw-ws-name { color:var(--ccw-text-3); }
.ccw-srow { height:32px; padding:0 6px 0 18px; gap:7px; }
.ccw-stitle { font-size:12.5px; }
.ccw-sdim { font-size:10.5px; padding-left:4px; }
.ccw-searchbox { position:relative; margin-bottom:8px; }
.ccw-searchbox-icon { position:absolute; left:8px; top:50%; transform:translateY(-50%); color:var(--ccw-text-3); pointer-events:none; }
.ccw-searchbox .ccw-wsfilter { margin:0; height:30px; padding:0 8px 0 27px; border-radius:8px; font-size:11.5px; }
.ccw-narrow .ccw-msgs { padding:14px 16px 18px; }
.ccw-narrow .ccw-tool-target, .ccw-narrow .ccw-tool-size, .ccw-narrow .ccw-tool-time, .ccw-narrow .ccw-composer-hint { display:none; }
.ccw-narrow .ccw-tool-card[data-kind="sub"] .ccw-toolstate { font-size:0; gap:0; }

/* P2：窄面板侧栏抽屉 */
.ccw-body { position:relative; }
.ccw-scrim { position:absolute; inset:0; z-index:60; background:rgba(20,20,19,.18); animation:ccwFadeIn .15s ease-out; }
.ccw-drawer-head { display:flex; align-items:center; justify-content:space-between; height:30px; padding:0 2px 0 6px; margin-bottom:6px; color:var(--ccw-text-2); font-size:12px; font-weight:600; }
.ccw-drawer-mode .ccw-sidebar { position:absolute; left:0; top:0; bottom:0; z-index:70; height:100%; border-right:1px solid var(--ccw-border-strong); background:var(--ccw-surface); box-shadow:14px 0 36px rgba(0,0,0,.14); transform:translateX(-100%); visibility:hidden; transition:transform .18s ease, visibility .18s; }
.ccw-drawer-mode.ccw-drawer-open .ccw-sidebar { transform:none; visibility:visible; }
.ccw-drawer-mode .ccw-split { display:none; }
.ccw-drawer-mode .ccw-crumb b { max-width:170px; }
.ccw-narrow.ccw-drawer-mode .ccw-crumb b { max-width:128px; }

/* P2：首帧骨架 */
.ccw-skel { width:100%; max-width:100%; align-self:stretch; display:flex; flex-direction:column; gap:18px; padding:8px 0; }
.ccw-skel-row { display:flex; gap:10px; align-items:flex-start; }
.ccw-skel-avatar { width:24px; height:24px; border-radius:7px; background:var(--ccw-surface-3); flex:none; }
.ccw-skel-lines { flex:1; display:flex; flex-direction:column; gap:7px; padding-top:2px; }
.ccw-skel-line { height:10px; border-radius:5px; background:linear-gradient(90deg,var(--ccw-surface-2) 25%,var(--ccw-surface-3) 37%,var(--ccw-surface-2) 63%); background-size:400% 100%; animation:ccwShimmer 1.5s ease infinite; }
.ccw-skel-side { display:flex; flex-direction:column; gap:8px; padding:8px 6px; }
.ccw-skel-side-row { display:flex; align-items:center; gap:8px; height:24px; }
.ccw[data-ccw-theme="dark"] .ccw-skel-line, .ccw[data-ccw-theme="dark"] .ccw-skel-bar { background:linear-gradient(90deg,var(--ccw-surface-3) 25%,var(--ccw-border-strong) 37%,var(--ccw-surface-3) 63%); background-size:400% 100%; }
.ccw-skel-dot { width:6px; height:6px; border-radius:50%; background:var(--ccw-surface-3); flex:none; }
.ccw-skel-bar { height:9px; border-radius:5px; background:linear-gradient(90deg,var(--ccw-surface-2) 25%,var(--ccw-surface-3) 37%,var(--ccw-surface-2) 63%); background-size:400% 100%; animation:ccwShimmer 1.5s ease infinite; }

/* P2：空态 */
.ccw-empty { align-self:center; margin:auto; max-width:360px; padding:24px 16px; text-align:center; color:var(--ccw-text-3); }
.ccw-empty-mark { width:44px; height:44px; margin:0 auto 12px; border-radius:12px; background:var(--ccw-accent-soft); color:var(--ccw-accent); display:flex; align-items:center; justify-content:center; }
.ccw-empty-title { font-size:14.5px; font-weight:600; color:var(--ccw-text); margin-bottom:6px; }
.ccw-empty-desc { font-size:12px; line-height:1.7; color:var(--ccw-text-3); margin-bottom:14px; }
.ccw-empty-actions { display:flex; gap:8px; justify-content:center; flex-wrap:wrap; }
.ccw-empty-hint { margin-top:12px; font-size:10.5px; color:var(--ccw-text-3); opacity:.8; }

/* P2：toast / dialog 动效 */
.ccw-toast { display:flex; align-items:center; gap:7px; animation:ccwToastIn .18s ease-out; }
.ccw-toast-ic { display:inline-flex; flex:none; opacity:.9; }
.ccw-toast-text { min-width:0; line-height:1.5; }
.ccw-modal { backdrop-filter:blur(2px); animation:ccwFadeIn .14s ease-out; }
.ccw-modal-box { animation:ccwPopIn .16s cubic-bezier(.2,.8,.2,1); }

@keyframes ccwShimmer { 0% { background-position:100% 0; } 100% { background-position:-100% 0; } }
@keyframes ccwToastIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:none; } }
@keyframes ccwFadeIn { from { opacity:0; } to { opacity:1; } }
@keyframes ccwPopIn { from { opacity:0; transform:translateY(4px) scale(.98); } to { opacity:1; transform:none; } }

@media (prefers-reduced-motion: reduce) {
  .ccw-scrim, .ccw-toast, .ccw-modal, .ccw-modal-box { animation:none; }
  .ccw-skel-line, .ccw-skel-bar { animation:none; }
  .ccw-drawer-mode .ccw-sidebar { transition:none; }
}

/* P3：输入区与正文列对齐，toast 上移到输入区之上 */
.ccw-footer { position:relative; padding:10px 20px 16px; }
.ccw-footer-inner { width:100%; max-width:none; min-width:0; }
.ccw-narrow .ccw-footer { padding:10px 16px 14px; }
.ccw-footer > .ccw-toasts { left:20px; bottom:calc(100% + 8px); transform:none; align-items:flex-start; width:max-content; max-width:calc(100% - 52px); }
.ccw-narrow .ccw-footer > .ccw-toasts { left:16px; max-width:calc(100% - 32px); }

/* P3：搜索条 */
.ccw-searchbar { padding:7px 12px; gap:7px; background:var(--ccw-surface); border-bottom:1px solid var(--ccw-border); }
.ccw-search-input { height:30px; padding:0 10px; border-radius:7px; font-size:12.5px; border-color:var(--ccw-border); background:var(--ccw-surface-2); transition:border-color .12s, box-shadow .12s, background .12s; }
.ccw-search-input:focus { border-color:var(--ccw-accent); background:var(--ccw-surface); box-shadow:0 0 0 3px var(--ccw-accent-soft); }
.ccw-search-count { font-variant-numeric:tabular-nums; }
.ccw-searchbar .ccw-btn.small { height:28px; padding:0 8px; }
.ccw-narrow .ccw-searchbar { padding:6px 8px; gap:4px; }
.ccw-narrow .ccw-search-count { font-size:11px; }
.ccw-msg.ccw-search-hit { outline:2px solid var(--ccw-accent); box-shadow:0 0 0 5px var(--ccw-accent-soft); }
.ccw-mark { background:var(--ccw-accent-soft); color:var(--ccw-text); box-shadow:inset 0 -1px 0 var(--ccw-accent); }
.ccw-msg.user .ccw-mark { background:var(--ccw-accent-soft); color:var(--ccw-text); }

/* P3：轮次目录 */
.ccw-toc { top:10px; right:12px; width:min(320px,78%); border-radius:12px; border-color:var(--ccw-border); box-shadow:0 18px 44px -22px rgba(20,18,14,.55); }
.ccw-toc-head { height:38px; padding:0 10px; border-bottom-color:var(--ccw-border); }
.ccw-toc-list { padding:4px 6px 6px; }
.ccw-toc-item { width:100%; box-sizing:border-box; padding:7px 8px; border:0; border-radius:7px; background:transparent; color:inherit; font:inherit; font-size:12px; text-align:left; cursor:pointer; }
.ccw-toc-item:hover { background:var(--ccw-surface-2); }
.ccw-toc-n { color:var(--ccw-text-2); }
.ccw-narrow .ccw-toc { top:8px; right:8px; width:min(300px,86%); }

/* P3：指令弹层 */
.ccw-pop-list { padding:4px; border-radius:10px; border-color:var(--ccw-border); background:var(--ccw-surface); box-shadow:0 14px 34px -22px rgba(20,18,14,.5); }
.ccw-pop-item { padding:6px 8px; border-radius:7px; font-size:12.5px; }
.ccw-pop-item.sel { background:var(--ccw-accent-soft); color:var(--ccw-text); }
.ccw-pop-kind { background:var(--ccw-surface-2); border-color:var(--ccw-border); }
.ccw-pop-kind.skill { background:var(--ccw-accent-soft); border-color:transparent; }

/* P4：侧栏对齐示例（新会话 → 搜索 → 分组滚动 → 底部添加工作区） */
.ccw-sidebar { display:flex; flex-direction:column; gap:10px; padding:12px 10px; overflow:hidden; }
.ccw-drawer-head { margin-bottom:0; }
.ccw-sidebar .ccw-btn.primary { flex:none; width:100%; height:32px; margin:0; font-size:12px; font-weight:620; }
.ccw-searchbox { flex:none; margin:0; }
.ccw-searchbox .ccw-wsfilter { padding:0 43px 0 27px; }
.ccw-search-kbd { position:absolute; right:7px; top:50%; transform:translateY(-50%); padding:0 4px; border:1px solid var(--ccw-border); border-radius:4px; background:var(--ccw-surface); color:var(--ccw-text-3); font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size:9px; line-height:15px; letter-spacing:0; pointer-events:none; }
.ccw-searchbox .ccw-wsfilter { margin:0; }
.ccw-sgroups { flex:1; min-height:0; overflow-y:auto; display:flex; flex-direction:column; gap:10px; padding-right:2px; scrollbar-width:thin; scrollbar-color:var(--ccw-border-strong) transparent; }
.ccw-sgroups::-webkit-scrollbar { width:10px; }
.ccw-sgroups::-webkit-scrollbar-thumb { background:var(--ccw-border-strong); border:3px solid transparent; background-clip:padding-box; border-radius:8px; }
.ccw-ws { margin:0; }
.ccw-ws-head { height:28px; padding:0 6px 0 4px; gap:6px; font-size:11.5px; font-weight:620; color:var(--ccw-text-2); }
.ccw-ws-head.current { background:transparent; }
.ccw-ws-name { min-width:0; }
.ccw-ws-count { flex:none; font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size:10px; font-weight:400; color:var(--ccw-text-3); }
.ccw-ws-head .ccw-icbtn { width:22px; height:22px; }
.ccw-srow { height:32px; padding:0 8px 0 10px; gap:8px; border-radius:8px; font-size:12px; color:var(--ccw-text-2); }
.ccw-srow.active { color:var(--ccw-text); }
.ccw-srow.active .ccw-stitle { font-weight:560; }
.ccw-sdot { width:6px; height:6px; }
.ccw-sdim { font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size:9.5px; }
.ccw-srow-actions .ccw-icbtn { width:22px; height:22px; }
.ccw-sidefoot { flex:none; margin-top:auto; padding-top:6px; border-top:1px solid var(--ccw-border); }
.ccw-ghostbtn { display:flex; align-items:center; gap:7px; width:100%; height:30px; padding:0 8px; border:0; border-radius:7px; background:transparent; color:var(--ccw-text-3); font:inherit; font-size:11.5px; cursor:pointer; text-align:left; }
.ccw-ghostbtn:hover { background:var(--ccw-surface-3); color:var(--ccw-text-2); }
.ccw-ghostbtn:disabled { opacity:.55; cursor:default; }
.ccw-ghostbtn .ccw-i { width:14px; height:14px; }

/* P5：输入区与底部工具栏保持同一块表面，不出现内部分割线 */
.ccw-composer { background:var(--ccw-surface); }
.ccw-composer .ccw-input,
.ccw-composer .ccw-input:focus,
.ccw-composer .ccw-input:focus-visible {
  display:block;
  border:0 !important;
  outline:0 !important;
  outline-offset:0 !important;
  box-shadow:none !important;
  background:transparent !important;
}
.ccw-composer-bar { border-top:0 !important; border-bottom:0 !important; background:transparent; }

/* P3：触屏上常显会话操作 */
@media (hover: none) {
  .ccw-srow-actions { opacity:1; pointer-events:auto; background:transparent; }
}

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
    // 代码围栏收尾：mermaid 单独渲染为图表容器，其余语言渲染为可复制代码块
    function flushCodeFence(out, lang, buf, pending) {
      const body = buf.join("\n");
      if (lang === "mermaid") {
        out.push(
          '<div class="ccw-mermaid"' + (pending ? ' data-pending="1"' : "") +
          ' data-src="' + encodeURIComponent(body) + '">' +
          '<pre class="ccw-pre ccw-mermaid-src"><code>' + escapeHtml(body) + "</code></pre></div>"
        );
        return;
      }
      out.push('<div class="ccw-pre-wrap"><button type="button" class="ccw-code-copy" data-ccw-copy>复制</button><pre class="ccw-pre"' + (lang ? ' data-lang="' + escapeHtml(lang) + '"' : "") + '><code>' + escapeHtml(body) + "</code></pre></div>");
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
            flushCodeFence(out, codeLang.toLowerCase(), codeBuf, false);
            codeBuf = null; codeLang = "";
          } else { codeBuf = []; codeLang = fence[1] || ""; closeList(); }
          continue;
        }
        if (codeBuf !== null) { codeBuf.push(line); continue; }

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
      if (codeBuf !== null) flushCodeFence(out, codeLang.toLowerCase(), codeBuf, true);
      closeList();
      return out.join("\n");
    }

    // ------------------------------------------------------------------
    // Mermaid 图表渲染
    //   - 本地 mermaid.min.js（宿主半部 public/ 静态目录，随插件分发，离线可用）
    //   - 首次遇到 ```mermaid 代码块时才注入 <script>，加载成功后全局 window.mermaid
    //   - 渲染结果按「主题 + 源码」缓存，流式重渲染时不重复计算
    // ------------------------------------------------------------------
    const MERMAID_SRC = API.replace(/\/api\/?$/, "") + "/mermaid.min.js";
    let mermaidLibPromise = null;
    const mermaidSvgCache = new Map();
    let mermaidSeed = 0;

    // 主题判定：类名 / data 属性 → body 背景亮度 → 系统偏好
    function detectDark(el) {
      try {
        if (typeof document !== "undefined") {
          const de = document.documentElement;
          const b = document.body;
          const attr = (de && (de.getAttribute("data-dsw-theme") || de.getAttribute("data-theme"))) ||
                       (b && (b.getAttribute("data-dsw-theme") || b.getAttribute("data-theme"))) || "";
          if (de && de.classList.contains("theme-with-dark-background")) return true;
          if (/dark/i.test(attr)) return true;
          if (/light/i.test(attr)) return false;
          if ((de && de.classList.contains("dark")) || (b && b.classList.contains("dark"))) return true;
          if ((de && de.classList.contains("light")) || (b && b.classList.contains("light"))) return false;
        }
        const node = (el && el.ownerDocument && el.ownerDocument.body) || (typeof document !== "undefined" ? document.body : null);
        if (node && typeof getComputedStyle === "function") {
          const bg = getComputedStyle(node).backgroundColor || "";
          const m = /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/.exec(bg);
          if (m) {
            const lum = 0.299 * parseFloat(m[1]) + 0.587 * parseFloat(m[2]) + 0.114 * parseFloat(m[3]);
            if (isFinite(lum) && lum > 0) return lum < 128;
          }
        }
        if (typeof window !== "undefined" && window.matchMedia) return window.matchMedia("(prefers-color-scheme: dark)").matches;
      } catch (e) {}
      return false;
    }

    // 明暗：跟随 DSH 的 data 属性 / class 变化，切换面板自己的令牌
    function useCcwTheme() {
      const [dark, setDark] = React.useState(function () { return detectDark(); });
      React.useEffect(function () {
        function sync() { setDark(detectDark()); }
        sync();
        if (typeof MutationObserver === "undefined") return;
        const mo = new MutationObserver(sync);
        const opts = { attributes: true, attributeFilter: ["class", "data-theme", "data-dsw-theme", "style"] };
        mo.observe(document.documentElement, opts);
        if (document.body) mo.observe(document.body, opts);
        const mq = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
        if (mq && mq.addEventListener) mq.addEventListener("change", sync);
        return function () {
          mo.disconnect();
          if (mq && mq.removeEventListener) mq.removeEventListener("change", sync);
        };
      }, []);
      return dark;
    }

    function loadMermaid() {
      if (typeof document === "undefined") return Promise.reject(new Error("当前环境不支持 Mermaid 渲染"));
      if (typeof window !== "undefined" && window.mermaid && typeof window.mermaid.render === "function") {
        return Promise.resolve(window.mermaid);
      }
      if (mermaidLibPromise) return mermaidLibPromise;
      mermaidLibPromise = new Promise(function (resolve, reject) {
        const done = function () {
          if (window.mermaid && typeof window.mermaid.render === "function") resolve(window.mermaid);
          else { mermaidLibPromise = null; reject(new Error("mermaid.min.js 已加载但未暴露 render 接口")); }
        };
        const fail = function () {
          mermaidLibPromise = null;
          // 移除加载失败的 <script>，使后续「重试」能重新发起加载
          try {
            const bad = document.querySelector("script[data-ccw-mermaid]");
            if (bad && bad.parentNode) bad.parentNode.removeChild(bad);
          } catch (e) {}
          reject(new Error("无法加载 " + MERMAID_SRC));
        };
        const prev = document.querySelector("script[data-ccw-mermaid]");
        if (prev) {
          if (prev.getAttribute("data-ccw-loaded") === "1") { done(); return; }
          prev.addEventListener("load", function () { prev.setAttribute("data-ccw-loaded", "1"); done(); });
          prev.addEventListener("error", fail);
          return;
        }
        const s = document.createElement("script");
        s.setAttribute("data-ccw-mermaid", "1");
        s.async = true;
        s.src = MERMAID_SRC;
        s.addEventListener("load", function () { s.setAttribute("data-ccw-loaded", "1"); done(); });
        s.addEventListener("error", fail);
        document.head.appendChild(s);
      });
      return mermaidLibPromise;
    }

    // 渲染成功后：SVG + 「查看源码」工具栏
    function paintMermaidSvg(el, svg, src) {
      el.setAttribute("data-ccw-mstate", "done");
      el.classList.add("ccw-mermaid-done");
      el.textContent = "";
      const box = document.createElement("div");
      box.className = "ccw-mermaid-svg";
      box.innerHTML = svg;
      el.appendChild(box);

      const pre = document.createElement("pre");
      pre.className = "ccw-pre ccw-mermaid-src";
      pre.style.display = "none";
      const code = document.createElement("code");
      code.textContent = src;
      pre.appendChild(code);

      const bar = document.createElement("div");
      bar.className = "ccw-mermaid-bar";
      const t = document.createElement("button");
      t.type = "button";
      t.className = "ccw-think-toggle";
      t.style.marginBottom = "0";
      t.textContent = "查看源码";
      t.addEventListener("click", function () {
        const open = pre.style.display !== "none";
        pre.style.display = open ? "none" : "block";
        t.textContent = open ? "查看源码" : "收起源码";
      });
      bar.appendChild(t);
      el.appendChild(bar);
      el.appendChild(pre);
    }

    // 渲染失败：错误信息 + 源码 + 重试
    function paintMermaidError(el, src, err) {
      el.setAttribute("data-ccw-mstate", "error");
      el.classList.add("ccw-mermaid-error");
      el.textContent = "";
      const msg = document.createElement("div");
      msg.className = "ccw-mermaid-err";
      msg.textContent = "Mermaid 渲染失败：" + (err && err.message ? err.message : String(err));
      el.appendChild(msg);

      const pre = document.createElement("pre");
      pre.className = "ccw-pre ccw-mermaid-src";
      const code = document.createElement("code");
      code.textContent = src;
      pre.appendChild(code);
      el.appendChild(pre);

      const bar = document.createElement("div");
      bar.className = "ccw-mermaid-bar";
      const r = document.createElement("button");
      r.type = "button";
      r.className = "ccw-think-toggle";
      r.style.marginBottom = "0";
      r.textContent = "重试";
      r.addEventListener("click", function () {
        el.removeAttribute("data-ccw-mstate");
        el.classList.remove("ccw-mermaid-error");
        renderMermaidBlock(el);
      });
      bar.appendChild(r);
      el.appendChild(bar);
    }

    // —— Mermaid 源码清洗（新增）——
    // Claude Code 转录里存的内容会被 HTML 转义（--> 变 --&gt;、->> 变 -&gt;&gt;、
    // <br/> 变 &lt;br/&gt;、&& 变 &amp;&amp;），部分还会带行号前缀（70\t / 34- / 35:）。
    // 直接交给 mermaid.render 会解析失败（报 "Syntax error in text"）。
    // 这里在渲染前统一清洗。用字符串替换而非 innerHTML 解码，避免误吞干净的 <br/>。
    function normalizeMermaidSource(raw) {
      return String(raw == null ? "" : raw)
        // 1) 剥行号前缀：只匹配「数字 + 制表符/短横/冒号」开头，不误伤 mermaid 语句
        .split("\n")
        .map(function (line) {
          return line.replace(/^\s*\d{1,6}(?:[\t-]|:\s+)\s*/, "");
        })
        .join("\n")
        // 2) HTML 实体反转义：先 &amp; 再 &lt;/&gt;，避免 &amp;lt; 只解开一半
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&nbsp;/g, " ");
    }

    // —— Mermaid 标签保护（新增）——
    // Mermaid 11 的词法会把紧跟文字的 @ 当成 LINK_ID / @{} 形状标记，
    // 未加引号的标签里出现 () 也会报 Parse error（例如 OCR(双模型融合)）。
    // 仅在首次渲染失败后作为兜底：把流程图节点/子图标题里的这类裸标签用双引号
    // 包起来（mermaid 合法的 quoted label 语法），标签文字原样保留。
    function quoteMermaidLabels(src) {
      const lines = String(src == null ? "" : src).split("\n");
      let head = "";
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim()) { head = lines[i].trim(); break; }
      }
      // 只处理流程图；其它图种的 [] () {} 语义不同，避免误伤
      if (!/^(flowchart|graph)\b/i.test(head)) return src;
      return lines.map(function (line) {
        if (!/[@()]/.test(line)) return line;
        // 1) 复合形状：[[..]]、[(..)]、([..])、((..))、{{..}}
        line = line.replace(/(\[\[|\[\(|\(\(|\{\{)([^\[\](){}]*@[^\[\](){}]*)(\]\]|\)\]|\)\)|\}\})/g,
          function (m, open, body, close) {
            const t = body.trim();
            if (!t || (t.charAt(0) === '"' && t.charAt(t.length - 1) === '"')) return m;
            return open + '"' + body.replace(/"/g, "#quot;") + '"' + close;
          });
        // 2) 普通方括号标签：[..]（节点、子图标题）
        return line.replace(/(\[)([^\[\]\n]*[@()][^\[\]\n]*)(\])/g, function (m, open, body, close) {
          const t = body.trim();
          if (!t) return m;
          if (t.charAt(0) === '"' && t.charAt(t.length - 1) === '"') return m; // 已带引号
          if (/^\(.*\)$/.test(t)) return m;                                    // [(..)] 圆柱形状语法，保持原样
          return open + '"' + body.replace(/"/g, "#quot;") + '"' + close;
        });
      }).join("\n");
    }

    // 清理旧版渲染失败时被 mermaid 挂到 <body> 末尾的临时错误图（#dccw-mm-*）。
    // 新版 render 传入游离容器，不会再向 body 注入节点；这里负责清历史残留。
    function cleanupMermaidTempNodes() {
      try {
        const nodes = document.querySelectorAll('[id^="dccw-mm-"]');
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          if (n && n.parentNode === document.body) n.parentNode.removeChild(n);
        }
      } catch (e) {}
    }

    // 渲染单张图：失败时确保清掉 mermaid 临时注入到 <body> 的节点。
    // 配合 initialize 的 suppressErrorRendering，解析失败不会再生成底部错误卡。
    function renderMermaidSvg(mm, src) {
      const id = "ccw-mm-" + Date.now().toString(36) + "-" + (++mermaidSeed);
      return mm.render(id, src).then(function (res) {
        const svg = res && res.svg ? String(res.svg) : "";
        if (!svg) throw new Error("渲染结果为空");
        return svg;
      }).catch(function (err) {
        // 双保险：清掉 mermaid 可能挂到 body 的临时节点
        try {
          const d = document.getElementById("d" + id);
          if (d && d.parentNode) d.parentNode.removeChild(d);
          const s = document.getElementById(id);
          if (s && s.parentNode) s.parentNode.removeChild(s);
        } catch (e) {}
        throw err;
      });
    }

    // 渲染一个 .ccw-mermaid 占位容器（幂等：已渲染/正在流式接收的跳过）
    function renderMermaidBlock(el) {
      if (!el || !el.getAttribute) return;
      if (el.getAttribute("data-ccw-mstate")) return;         // 已处理
      if (el.getAttribute("data-pending") === "1") return;     // 围栏尚未闭合，等下一帧
      let src = el.getAttribute("data-src") || "";
      try { src = decodeURIComponent(src); } catch (e) {}
      src = normalizeMermaidSource(src);   // ← 新增：剥行号 + HTML 反转义
      if (!src.trim()) { el.setAttribute("data-ccw-mstate", "empty"); return; }

      const theme = detectDark(el) ? "dark" : "default";
      const cacheKey = theme + "\u0000" + src;
      const cached = mermaidSvgCache.get(cacheKey);
      if (cached) { paintMermaidSvg(el, cached.svg, cached.src); return; }

      el.setAttribute("data-ccw-mstate", "loading");
      el.textContent = "";
      const status = document.createElement("div");
      status.className = "ccw-mermaid-status";
      status.textContent = "正在渲染 Mermaid 图表…";
      el.appendChild(status);

      loadMermaid().then(function (mm) {
        try {
          mm.initialize({
            startOnLoad: false,
            securityLevel: "strict",
            suppressErrorRendering: true,
            theme: theme,
          });
        } catch (e) {}
        cleanupMermaidTempNodes();
        // 第一次用原样源码；失败则用「引号包裹 @ 标签」的兜底源码再试一次
        const variants = [src];
        const quoted = quoteMermaidLabels(src);
        if (quoted && quoted !== src) variants.push(quoted);
        let lastErr = null;
        function attempt(i) {
          if (i >= variants.length) return Promise.reject(lastErr || new Error("渲染失败"));
          return renderMermaidSvg(mm, variants[i]).then(function (svg) {
            return { svg: svg, src: variants[i] };
          }, function (err) {
            lastErr = err;
            return attempt(i + 1);
          });
        }
        return attempt(0);
      }).then(function (out) {
        if (!out || !out.svg) throw new Error("渲染结果为空");
        if (mermaidSvgCache.size > 60) mermaidSvgCache.clear();
        mermaidSvgCache.set(cacheKey, { svg: out.svg, src: out.src });
        paintMermaidSvg(el, out.svg, out.src);
      }).catch(function (err) {
        paintMermaidError(el, src, err);
      });
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
        fill: "currentColor",
        "aria-hidden": "true",
      },
        React.createElement("path", { d: "M12 1.5 L14.5 9.5 L22.5 12 L14.5 14.5 L12 22.5 L9.5 14.5 L1.5 12 L9.5 9.5 Z" }),
      );
    }


    // ------------------------------------------------------------------
    // 图标：内联 SVG（24 网格，1.75 描边），替代 emoji / Unicode 符号
    // ------------------------------------------------------------------
    const CCW_ICONS = {
      minus: [["path", { d: "M5 12h14" }]],
      x: [["path", { d: "M6 6l12 12M18 6L6 18" }]],
      square: [["rect", { x: 5, y: 5, width: 14, height: 14, rx: 2 }]],
      restore: [["rect", { x: 8.5, y: 8.5, width: 11, height: 11, rx: 2 }], ["path", { d: "M5.5 15.5H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v.5" }]],
      search: [["circle", { cx: 11, cy: 11, r: 7 }], ["path", { d: "M16.5 16.5L21 21" }]],
      list: [["path", { d: "M8 6h13M8 12h13M8 18h13" }],
        ["circle", { cx: 3.5, cy: 6, r: 1, fill: "currentColor", stroke: "none" }],
        ["circle", { cx: 3.5, cy: 12, r: 1, fill: "currentColor", stroke: "none" }],
        ["circle", { cx: 3.5, cy: 18, r: 1, fill: "currentColor", stroke: "none" }]],
      more: [["circle", { cx: 5, cy: 12, r: 1.6, fill: "currentColor", stroke: "none" }],
        ["circle", { cx: 12, cy: 12, r: 1.6, fill: "currentColor", stroke: "none" }],
        ["circle", { cx: 19, cy: 12, r: 1.6, fill: "currentColor", stroke: "none" }]],
      "chev-r": [["path", { d: "M9 6l6 6-6 6" }]],
      "chev-d": [["path", { d: "M6 9l6 6 6-6" }]],
      plus: [["path", { d: "M12 5v14M5 12h14" }]],
      pencil: [["path", { d: "M4 20h4L19 9l-4-4L4 16v4z" }], ["path", { d: "M13.5 6.5l4 4" }]],
      trash: [["path", { d: "M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13" }]],
      refresh: [["path", { d: "M20 12a8 8 0 1 1-2.4-5.7" }], ["path", { d: "M20 4v5h-5" }]],
      update: [["path", { d: "M12 3.5v10M7.5 9l4.5 4.5L16.5 9" }], ["path", { d: "M4.5 19.5h15" }]],
      stop: [["rect", { x: 6.5, y: 6.5, width: 11, height: 11, rx: 2.2 }]],
      "arrow-up": [["path", { d: "M12 19V5M6 11l6-6 6 6" }]],
      "arrow-down": [["path", { d: "M12 5v14M6 13l6 6 6-6" }]],
      check: [["path", { d: "M5 12.5l4.5 4.5L19 6.5" }]],
      alert: [["path", { d: "M12 3.5L2.5 20.5h19L12 3.5z" }], ["path", { d: "M12 9.5v4.5M12 17.2v.1" }]],
      image: [["rect", { x: 3, y: 4, width: 18, height: 16, rx: 2 }], ["circle", { cx: 8.5, cy: 9.5, r: 1.5 }], ["path", { d: "M21 15l-5-5L5 21" }]],
      folder: [["path", { d: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" }]],
      "panel-left": [["rect", { x: 3, y: 4, width: 18, height: 16, rx: 2 }], ["path", { d: "M9 4v16" }]],
      bot: [["rect", { x: 4, y: 8, width: 16, height: 12, rx: 3 }], ["path", { d: "M12 4v4M8.5 14h.1M15.5 14h.1M9 17.5h6" }]],
      file: [["path", { d: "M6 3h8l4 4v14H6V3z" }], ["path", { d: "M14 3v4h4" }]],
      clock: [["circle", { cx: 12, cy: 12, r: 9 }], ["path", { d: "M12 7v5l3 2" }]],
      slash: [["path", { d: "M15 4L9 20" }]],
      info: [["circle", { cx: 12, cy: 12, r: 9 }], ["path", { d: "M12 11v5.5M12 7.6v.1" }]],
      eraser: [["path", { d: "M4 20h16" }], ["path", { d: "M8.5 20L4 15.5 14.5 5l5 5L9.5 20z" }]],
      terminal: [["rect", { x: 3, y: 5, width: 18, height: 14, rx: 2 }], ["path", { d: "M7.5 9.5l3 2.5-3 2.5M13.5 15h4" }]],
      lock: [["rect", { x: 5, y: 11, width: 14, height: 10, rx: 2 }], ["path", { d: "M8 11V8a4 4 0 0 1 8 0v3" }]],
      external: [["path", { d: "M14 4h6v6" }], ["path", { d: "M20 4L10 14" }], ["path", { d: "M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5" }]],
    };

    function CcwIcon(props) {
      const size = (props && props.size) || 16;
      const nodes = CCW_ICONS[props && props.name] || [];
      return React.createElement("svg", {
        className: "ccw-i" + (props && props.className ? " " + props.className : ""),
        viewBox: "0 0 24 24",
        width: size, height: size,
        "aria-hidden": "true", focusable: "false",
      }, nodes.map(function (n, i) {
        return React.createElement(n[0], Object.assign({ key: i }, n[1]));
      }));
    }

    // ------------------------------------------------------------------
    // 消息渲染
    // ------------------------------------------------------------------
    // 提取一条消息的可搜索文本（会话内搜索基于它）
    function messageSearchText(m) {
      if (!m) return "";
      const parts = [];
      if (m.role === "tool") { parts.push(m.name, m.result); }
      else if (m.role === "control") { parts.push(m.displayName, m.toolName, m.input); }
      else { parts.push(m.text, m.thinking); }
      return parts.map(function (p) { return p == null ? "" : String(p); }).join("\n");
    }
    // 轮次摘要：用户消息压平后截断，供目录展示
    function turnSnippet(text) {
      const s = String(text == null ? "" : text).replace(/\s+/g, " ").trim();
      return s.length > 40 ? s.slice(0, 40) + "…" : s;
    }
    // 纯文本内联高亮：大小写不敏感地把命中片段包成 <mark>（返回 React 节点）
    function highlightNodes(text, query) {
      const s = String(text == null ? "" : text);
      const q = String(query || "").trim();
      if (!q) return s;
      const ql = q.toLowerCase();
      const sl = s.toLowerCase();
      const nodes = [];
      let last = 0;
      let idx = sl.indexOf(ql);
      while (idx !== -1) {
        if (idx > last) nodes.push(s.slice(last, idx));
        nodes.push(React.createElement("mark", { key: idx, className: "ccw-mark" }, s.slice(idx, idx + ql.length)));
        last = idx + ql.length;
        idx = sl.indexOf(ql, last);
      }
      if (last < s.length) nodes.push(s.slice(last));
      return nodes.length ? nodes : s;
    }
    // 在已渲染的 HTML 文本节点内做内联高亮（不触碰标签；跳过 &...; 实体避免破坏转义）
    function highlightPlainSegment(text, ql) {
      if (!ql) return text;
      const tl = text.toLowerCase();
      let out = "";
      let i = 0;
      const n = text.length;
      while (i < n) {
        if (text[i] === "&") {
          const semi = text.indexOf(";", i);
          if (semi !== -1 && semi - i <= 10) { out += text.slice(i, semi + 1); i = semi + 1; continue; }
          out += text[i]; i += 1; continue;
        }
        if (tl.startsWith(ql, i)) {
          out += '<mark class="ccw-mark">' + text.slice(i, i + ql.length) + "</mark>";
          i += ql.length;
        } else { out += text[i]; i += 1; }
      }
      return out;
    }
    function highlightHtml(html, query) {
      const q = String(query || "").trim();
      if (!q) return html;
      const ql = q.toLowerCase();
      let out = "";
      let i = 0;
      const n = html.length;
      while (i < n) {
        const lt = html.indexOf("<", i);
        if (lt === -1) { out += highlightPlainSegment(html.slice(i), ql); break; }
        out += highlightPlainSegment(html.slice(i, lt), ql);
        const gt = html.indexOf(">", lt);
        if (gt === -1) { out += html.slice(lt); break; }
        out += html.slice(lt, gt + 1);
        i = gt + 1;
      }
      return out;
    }

    function ControlCard({ msg, hl, dataIndex, query }) {
      const [expanded, setExpanded] = React.useState(false);
      const answered = msg.decision != null;
      const label = answered
        ? (msg.decision === "allow" ? "已允许" : msg.decision === "always" ? "已始终允许" : "已拒绝")
        : null;
      const inputText = typeof msg.input === "string" ? msg.input : JSON.stringify(msg.input || {});
      const tooLong = String(inputText).length > 2000;
      return React.createElement("div", { className: "ccw-msg ccw-ctl" + (hl ? " ccw-search-hit" : ""), "data-ccw-i": dataIndex },
        React.createElement("div", { className: "ccw-ctl-head" },
          React.createElement(CcwIcon, { name: "lock", size: 14, className: "ccw-ctl-icon" }), highlightNodes(msg.displayName || msg.toolName || "工具", query), " 请求授权"),
        inputText ? React.createElement("div", { className: "ccw-ctl-input" },
          highlightNodes(expanded ? String(inputText) : String(inputText).slice(0, 2000), query),
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
        && a.msg.sub === b.msg.sub
        && a.msg.meta === b.msg.meta
        && a.live === b.live
        && a.onFill === b.onFill
        && a.hl === b.hl
        && a.dataIndex === b.dataIndex
        && a.query === b.query;
    }
    // 工具卡副标题：从 input 里挑一个最能说明“做了什么”的字段（纯展示，不改数据）
    function toolInputHint(msg) {
      const input = msg && msg.input;
      if (!input || typeof input !== "object") return "";
      const keys = ["file_path", "notebook_path", "path", "command", "pattern", "url", "query", "description"];
      for (let i = 0; i < keys.length; i++) {
        const v = input[keys[i]];
        if (typeof v === "string" && v.trim()) return v.replace(/\s+/g, " ").trim();
      }
      return "";
    }
    const MessageView = React.memo(function MessageView({ msg, live, onFill, hl, dataIndex, query }) {
      const [thinkingOpen, setThinkingOpen] = React.useState(false);
      const [toolOpen, setToolOpen] = React.useState(false);
      // Markdown 解析按内容缓存：整树重渲染时不再对每条消息重跑正则
      const mdHtml = React.useMemo(function () { return renderMarkdown(msg.text); }, [msg.text]);
      // 命中词在渲染后的 HTML 内做内联高亮（标签/实体不触碰）
      const mdHighlighted = React.useMemo(function () { return query ? highlightHtml(mdHtml, query) : mdHtml; }, [mdHtml, query]);
      // Mermaid 图表：HTML 注入 DOM 后按需渲染（懒加载 mermaid.min.js，已渲染的跳过）
      const mdRef = React.useRef(null);
      React.useEffect(function () {
        const root = mdRef.current;
        if (!root) return;
        const nodes = root.querySelectorAll(".ccw-mermaid[data-src]");
        for (let i = 0; i < nodes.length; i++) renderMermaidBlock(nodes[i]);
      }, [mdHighlighted]);
      const ts = msg.ts ? formatClock(msg.ts) : "";
      if (msg.role === "user") {
        return React.createElement("div", { className: "ccw-msg user" + (hl ? " ccw-search-hit" : ""), "data-ccw-i": dataIndex },
          React.createElement("div", { className: "ccw-user-text" }, highlightNodes(msg.text, query)),
          msg.images && msg.images.length ? React.createElement("div", { className: "ccw-user-images" }, React.createElement(CcwIcon, { name: "image", size: 12 }), "图片 ×" + msg.images.length) : null,
          (onFill || ts) ? React.createElement("div", { className: "ccw-user-foot" },
            onFill ? React.createElement("button", {
              type: "button", className: "ccw-umsg-edit", title: "填入输入框重新编辑", "aria-label": "填入输入框重新编辑",
              onClick: function (e) { e.stopPropagation(); onFill(msg.text || ""); },
            }, React.createElement(CcwIcon, { name: "pencil", size: 11 })) : null,
            ts ? React.createElement("span", { className: "ccw-msgtime-in" }, ts) : null,
          ) : null,
        );
      }
      if (msg.role === "assistant") {
        const hasThinking = !!msg.thinking;
        const thinkingActive = hasThinking && !!live && !msg.text;
        return React.createElement("div", { className: "ccw-msg assistant" + (hl ? " ccw-search-hit" : ""), "data-ccw-i": dataIndex },
          hasThinking ? React.createElement("button", {
            type: "button",
            className: "ccw-think-toggle" + (thinkingOpen ? " open" : ""),
            onClick: function () { setThinkingOpen(function (v) { return !v; }); },
            title: thinkingOpen ? "收起思考过程" : "展开思考过程",
          },
            React.createElement("span", { className: "ccw-think-chev" }, React.createElement(CcwIcon, { name: "chev-r", size: 11 })),
            React.createElement("span", { className: "ccw-think-label" }, thinkingActive ? "思考中…" : "思考过程"),
            thinkingActive ? React.createElement("span", { className: "ccw-think-pulse" }) : null,
          ) : null,
          hasThinking && thinkingOpen ? React.createElement("div", { className: "ccw-thinking" }, highlightNodes(msg.thinking, query)) : null,
          React.createElement("div", {
            className: "ccw-md",
            ref: mdRef,
            dangerouslySetInnerHTML: { __html: mdHighlighted },
            onClick: function (e) {
              // 代码块复制按钮（dangerouslySetInnerHTML 内的元素无法绑 React 事件，用事件委托）
              const t = e.target;
              if (t && t.classList && t.classList.contains("ccw-code-copy")) {
                const wrap = t.parentElement;
                const code = wrap ? wrap.querySelector("pre code") : null;
                if (code) {
                  copyText(code.textContent || "").then(function (ok) {
                    t.textContent = ok ? "已复制" : "复制失败";
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
        const r = hasResult ? String(msg.result) : "";
        const shown = r.length > 20000 ? r.slice(0, 20000) + "\n…（过长已截断）" : r;
        const sizeHint = hasResult ? formatChars(r.length) : "";
        const isSub = !!msg.sub;
        const st = msg.isError ? { cls: "err", text: "失败" } : (msg.status === "running" ? { cls: "run", text: "运行中" } : { cls: "done", text: "已完成" });
        const target = isSub ? (msg.sub.description || "") : toolInputHint(msg);
        const metaBits = [];
        let metaTitle = "";
        if (isSub && msg.meta) {
          if (msg.meta.tokens != null) { metaBits.push(formatTokensCompact(msg.meta.tokens) + " tokens"); metaTitle = formatTokensFull(msg.meta.tokens); }
          if (msg.meta.durationMs != null) metaBits.push(formatDuration(msg.meta.durationMs));
          if (msg.meta.toolUses != null) metaBits.push(msg.meta.toolUses + " 次工具调用");
        }
        const subMd = isSub && hasResult && toolOpen ? renderMarkdown(shown) : "";
        const subHtml = subMd && query ? highlightHtml(subMd, query) : subMd;
        const toggle = function () { if (hasResult) setToolOpen(function (v) { return !v; }); };
        return React.createElement("div", { className: "ccw-msg tool" + (isSub ? " sub" : "") + (hl ? " ccw-search-hit" : ""), "data-ccw-i": dataIndex },
          React.createElement("div", {
            className: "ccw-tool-card" + (msg.status === "running" ? " running" : "") + (msg.isError ? " err" : "") + (toolOpen ? " open" : ""),
            "data-kind": isSub ? "sub" : "tool",
          },
            React.createElement("button", {
              type: "button",
              className: "ccw-tool-head",
              onClick: toggle,
              disabled: !hasResult,
              "aria-expanded": hasResult ? toolOpen : undefined,
              title: hasResult ? (toolOpen ? "收起" + (isSub ? "报告" : "输出") : "展开" + (isSub ? "报告" : "输出")) : undefined,
            },
              React.createElement("span", { className: "ccw-tool-glyph" }, React.createElement(CcwIcon, { name: isSub ? "bot" : "terminal", size: 14 })),
              React.createElement("span", { className: "ccw-tool-title" },
                React.createElement("span", { className: "ccw-tool-name" }, isSub ? "子代理" : highlightNodes(msg.name || "工具", query)),
                isSub && msg.sub.type ? React.createElement("span", { className: "ccw-sub-badge" }, msg.sub.type) : null,
                target ? React.createElement("span", { className: "ccw-tool-target" + (isSub ? " ccw-tool-desc" : ""), title: target }, target) : null,
              ),
              React.createElement("span", { className: "ccw-toolstate " + st.cls },
                React.createElement("span", { className: "ccw-dot" }), st.text),
              hasResult ? React.createElement("span", { className: "ccw-tool-size" }, sizeHint) : null,
              ts ? React.createElement("span", { className: "ccw-tool-time", title: "调用时间：" + ts }, ts) : null,
              hasResult ? React.createElement(CcwIcon, { name: "chev-r", size: 12, className: "ccw-chev" + (toolOpen ? " open" : "") }) : null,
            ),
            isSub && toolOpen && metaBits.length ? React.createElement("div", { className: "ccw-tool-meta", title: metaTitle || undefined }, metaBits.join(" · ")) : null,
            subHtml ? React.createElement("div", { className: "ccw-tool-body ccw-sub-body" },
              React.createElement("div", { className: "ccw-md", dangerouslySetInnerHTML: { __html: subHtml } })) : null,
            !isSub && hasResult && toolOpen ? React.createElement("div", { className: "ccw-tool-body" },
              React.createElement("div", { className: "ccw-tool-out" }, highlightNodes(shown, query))) : null,
          ),
        );
      }
      if (msg.role === "result") {
        return React.createElement("div", { className: "ccw-msg result" + (msg.isError ? " err" : "") + (hl ? " ccw-search-hit" : ""), "data-ccw-i": dataIndex },
          React.createElement(CcwIcon, { name: msg.isError ? "alert" : "check", size: 13, className: "ccw-result-icon" }), highlightNodes(msg.text, query));
      }
      if (msg.role === "control") {
        return React.createElement(ControlCard, { msg: msg, hl: hl, dataIndex: dataIndex, query: query });
      }
      return null;
    }, messagePropsEqual);

    // ------------------------------------------------------------------
    // 侧边栏
    // ------------------------------------------------------------------
    function wsDisplayName(w) {
      const name = ((w && w.name) || "").trim();
      if (name) return name;
      const p = ((w && w.path) || "").replace(/[\\/]+$/, "");
      if (!p) return "未关联工作区";
      const parts = p.split(/[\\/]/);
      return parts[parts.length - 1] || p;
    }

    // 工作区归一化：历史扫描可能把某个会话的子目录也登记成“工作区”。
    // 展示时只保留最外层工作区，把其子目录里的会话并回父工作区，避免出现幽灵分组。
    function wsCleanPath(p) {
      return String(p || "").replace(/[\\/]+$/, "");
    }
    function wsIsSubpath(p, parent) {
      const child = wsCleanPath(p);
      const base = wsCleanPath(parent);
      if (!child || !base || child === base) return false;
      return child.indexOf(base + "/") === 0 || child.indexOf(base + "\\") === 0;
    }
    function wsRootForPath(p, list) {
      let cur = wsCleanPath(p);
      if (!cur) return "";
      const paths = (list || []).filter(function (w) { return w && w.path; });
      const seen = {};
      for (let guard = 0; guard < 50; guard++) {
        if (seen[cur]) break;
        seen[cur] = true;
        let parent = "";
        for (const w of paths) {
          const q = wsCleanPath(w.path);
          if (!q || q === cur) continue;
          if (wsIsSubpath(cur, q) && q.length > parent.length) parent = q;
        }
        if (!parent) break;
        cur = parent;
      }
      return cur;
    }
    function normalizeWorkspaces(raw) {
      const list = (raw || []).filter(function (w) {
        return w && (w.path || w.name || (w.sessions && w.sessions.length));
      });
      const pathList = list.filter(function (w) { return !!w.path; });
      const groups = [];
      const byRoot = {};
      for (const w of pathList) {
        const root = wsRootForPath(w.path, pathList);
        if (!byRoot[root]) {
          byRoot[root] = { path: root, name: "", sessions: [] };
          groups.push(byRoot[root]);
        }
        if (w.path === root && w.name) byRoot[root].name = w.name;
      }
      for (const w of pathList) {
        const root = wsRootForPath(w.path, pathList);
        const g = byRoot[root];
        if (!g) continue;
        // 只沿用根工作区自己的名字；子目录工作区的自定义名不应覆盖父工作区
        const sessions = w.sessions || [];
        for (const s of sessions) g.sessions.push(s);
      }
      for (const g of groups) {
        const seen = {};
        g.sessions = g.sessions.filter(function (s) {
          const id = s && (s.id || s.key);
          if (!id) return true;
          if (seen[id]) return false;
          seen[id] = true;
          return true;
        });
        g.sessions.sort(function (a, b) {
          const ap = a.active ? 0 : (a.status === "running" || a.status === "starting") ? 1 : 2;
          const bp = b.active ? 0 : (b.status === "running" || b.status === "starting") ? 1 : 2;
          if (ap !== bp) return ap - bp;
          return (b.mtimeMs || 0) - (a.mtimeMs || 0);
        });
      }
      // path 为空的历史分组（没有 cwd 的会话）保持独立，固定在末尾。
      const orphans = list.filter(function (w) { return !w.path; });
      return groups.concat(orphans);
    }

    function Sidebar({ snap, collapsed, toggleWs, onNew, onSwitch, onAddWs, onRenameSession, onDeleteSession, onRenameWs, onDeleteWs, width, pickingWs, currentWs, onSelectWs, drawerMode, drawerOpen, onCloseDrawer, sidebarRef }) {
      // 相对时间显示所需的本地计时（30s 一跳，纯本地渲染，不产生网络请求）
      const [now, setNow] = React.useState(function () { return Date.now(); });
      const [kw, setKw] = React.useState("");
      const filterRef = React.useRef(null);
      React.useEffect(function () {
        const t = setInterval(function () { setNow(Date.now()); }, 30000);
        return function () { clearInterval(t); };
      }, []);
      React.useEffect(function () {
        function onKey(e) {
          if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey) return;
          if (String(e.key || "").toLowerCase() !== "k") return;
          const el = filterRef.current;
          if (!el) return;
          const side = sidebarRef && sidebarRef.current;
          if (!side || side.getAttribute("aria-hidden") === "true") return;
          const host = side.closest && side.closest(".ccw");
          if (!host || host.offsetParent === null) return;
          e.preventDefault();
          el.focus();
          el.select();
        }
        window.addEventListener("keydown", onKey);
        return function () { window.removeEventListener("keydown", onKey); };
      }, []);
      // 工作区头、会话行是 div/span，补上 Enter / Space 激活，避免只能鼠标操作
      function activateOnKey(e, fn) {
        if (e.target !== e.currentTarget) return;
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        fn();
      }
      const all = normalizeWorkspaces((snap && snap.workspaces) || []);
      // 历史会话可能没有记录 cwd，服务端会生成 path 为空的分组；固定放到末尾并给出可读名称
      const ordered = all.filter(function (w) { return !!w.path; })
        .concat(all.filter(function (w) { return !w.path; }));
      const q = kw.trim().toLowerCase();
      let ws = ordered;
      if (q) {
        ws = [];
        for (const w of ordered) {
          const wName = ((w.name || "") + " " + (w.path || "")).toLowerCase();
          const sessions = (w.sessions || []).filter(function (s) {
            return wName.indexOf(q) !== -1 || (s.title || "").toLowerCase().indexOf(q) !== -1;
          });
          if (sessions.length > 0) ws.push(Object.assign({}, w, { sessions: sessions }));
        }
      }
      return React.createElement("div", {
        className: "ccw-sidebar", id: "ccw-sidebar", ref: sidebarRef,
        role: drawerMode && drawerOpen ? "dialog" : undefined,
        "aria-modal": drawerMode && drawerOpen ? "true" : undefined,
        "aria-hidden": drawerMode && !drawerOpen ? "true" : undefined,
        "aria-label": "会话列表",
        tabIndex: -1,
        style: { width: width },
      },
        drawerMode ? React.createElement("div", { className: "ccw-drawer-head" },
          React.createElement("span", { className: "ccw-drawer-title" }, "会话"),
          React.createElement("button", {
            className: "ccw-icbtn", title: "关闭会话列表", "aria-label": "关闭会话列表",
            "data-drawer-autofocus": "true",
            onClick: onCloseDrawer,
          }, React.createElement(CcwIcon, { name: "x", size: 15 }))
        ) : null,
        React.createElement("button", { className: "ccw-btn primary", onClick: onNew }, React.createElement(CcwIcon, { name: "plus", size: 15 }), "新会话"),
        React.createElement("div", { className: "ccw-searchbox" },
          React.createElement(CcwIcon, { name: "search", size: 13, className: "ccw-searchbox-icon" }),
          React.createElement("input", {
            ref: filterRef,
            className: "ccw-wsfilter", placeholder: "搜索会话 / 工作区…", value: kw,
            "aria-label": "搜索会话或工作区",
            "aria-keyshortcuts": "Meta+K Control+K",
            onChange: function (e) { setKw(e.target.value); },
          }),
          React.createElement("kbd", { className: "ccw-search-kbd", "aria-hidden": "true" }, (typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || "")) ? "⌘K" : "Ctrl K"),
        ),
        React.createElement("div", { className: "ccw-sgroups" },
        !snap ? React.createElement("div", { className: "ccw-skel-side", "aria-hidden": "true" },
          [0, 1, 2].map(function (i) {
            return React.createElement("div", { className: "ccw-skel-side-row", key: i },
              React.createElement("span", { className: "ccw-skel-dot" }),
              React.createElement("span", { className: "ccw-skel-bar", style: { width: ["72%", "58%", "66%"][i] } })
            );
          })
        ) : ws.length === 0 ? React.createElement("div", { className: "ccw-dim", style: { padding: "8px 6px" } }, q ? "无匹配的会话或工作区" : "暂无工作区") : null,
        ws.map(function (w, wi) {
          const isOrphan = !w.path;
          const label = wsDisplayName(w);
          const sessions = w.sessions || [];
          const open = !collapsed.has(w.path);
          return React.createElement("div", { className: "ccw-ws" + (isOrphan ? " ccw-ws-orphan" : ""), key: w.path || ("__orphan_" + wi) },
            React.createElement("div", { className: "ccw-ws-head" + (!isOrphan && currentWs === w.path ? " current" : "") },
              React.createElement("span", {
                role: "button", tabIndex: 0,
                "aria-label": (open ? "收起" : "展开") + "工作区 " + label,
                "aria-expanded": open,
                style: { cursor: "pointer", display: "inline-flex", alignItems: "center", flex: "none" },
                title: open ? "收起" : "展开",
                onClick: () => toggleWs(w.path),
                onKeyDown: (e) => activateOnKey(e, () => toggleWs(w.path)),
              },
                React.createElement(CcwIcon, { name: "chev-r", size: 12, className: "ccw-ws-chev" + (open ? " open" : "") }),
              ),
              React.createElement("span", {
                className: "ccw-ws-name",
                role: isOrphan ? undefined : "button",
                tabIndex: isOrphan ? undefined : 0,
                "aria-current": !isOrphan && currentWs === w.path ? "true" : undefined,
                style: { cursor: isOrphan ? "default" : "pointer", minWidth: 0 },
                title: isOrphan ? "这些历史会话没有记录工作区路径" : (currentWs === w.path ? "当前工作区：" + w.path : "设为当前工作区：" + w.path),
                onClick: isOrphan ? undefined : () => onSelectWs(w),
                onKeyDown: isOrphan ? undefined : (e) => activateOnKey(e, () => onSelectWs(w)),
              }, label),
              React.createElement("span", { className: "ccw-ws-count" }, sessions.length),
              isOrphan ? null : React.createElement("button", { className: "ccw-icbtn", title: "重命名工作区", "aria-label": "重命名工作区 " + label, onClick: () => onRenameWs(w) }, React.createElement(CcwIcon, { name: "pencil", size: 13 })),
              isOrphan ? null : React.createElement("button", { className: "ccw-icbtn", title: "移除工作区（不删文件）", "aria-label": "移除工作区 " + label, onClick: () => onDeleteWs(w) }, React.createElement(CcwIcon, { name: "trash", size: 13 })),
            ),
            open ? sessions.map(function (s, si) {
              const sTitle = ((s.title || "").trim()) || s.id || "（会话）";
              return React.createElement("div", {
                key: s.id || s.key || ("s" + si),
                className: "ccw-srow" + (s.active ? " active" : ""),
                role: "button",
                tabIndex: 0,
                "aria-label": "打开会话 " + sTitle + (s.active ? "（当前会话）" : ""),
                "aria-current": s.active ? "true" : undefined,
                onClick: () => onSwitch(s),
                onKeyDown: (e) => activateOnKey(e, () => onSwitch(s)),
              },
                React.createElement("span", { className: "ccw-sdot" + (s.status === "running" || s.status === "starting" ? " run" : s.active ? " acc" : "") }),
                React.createElement("span", { className: "ccw-stitle", title: s.title || sTitle }, sTitle),
                s.mtimeMs ? React.createElement("span", { className: "ccw-sdim", title: "最后变更：" + formatFullTime(s.mtimeMs) }, formatRelativeTime(s.mtimeMs, now)) : null,
                s.id ? React.createElement("span", { className: "ccw-srow-actions" },
                  React.createElement("button", { className: "ccw-icbtn", title: "重命名会话", "aria-label": "重命名会话 " + sTitle, onClick: (e) => { e.stopPropagation(); onRenameSession(s); } }, React.createElement(CcwIcon, { name: "pencil", size: 13 })),
                  React.createElement("button", { className: "ccw-icbtn", title: "删除会话", "aria-label": "删除会话 " + sTitle, onClick: (e) => { e.stopPropagation(); onDeleteSession(s); } }, React.createElement(CcwIcon, { name: "trash", size: 13 })),
                ) : null,
              );
            }) : null,
          );
        }),
        ),
        React.createElement("div", { className: "ccw-sidefoot" },
          React.createElement("button", {
            className: "ccw-ghostbtn", onClick: onAddWs, disabled: pickingWs, title: "添加工作区",
          }, pickingWs ? "正在打开目录选择…" : React.createElement(React.Fragment, null, React.createElement(CcwIcon, { name: "plus", size: 14 }), "添加工作区"))
        ),
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
    // token 量（统一以 M 为单位）：>=0.01M 保留 2 位小数；更小的量用 2 位有效数字，避免显示成 0.00M
    function formatTokens(n) {
      if (n == null || !isFinite(n) || n < 0) return null;
      const m = n / 1000000;
      if (m < 0.01) return m > 0 ? m.toPrecision(2) + "M" : "0M";
      return m.toFixed(2) + "M";
    }
    function formatTokensFull(n) {
      if (n == null || !isFinite(n) || n < 0) return "";
      return n.toLocaleString("en-US") + " tokens";
    }
    // token 量（紧凑自适应：<1K 原样、<1M 用 K、否则用 M），子代理卡片等窄处使用
    function formatTokensCompact(n) {
      if (n == null || !isFinite(n) || n < 0) return null;
      if (n < 1000) return String(n);
      if (n < 1000000) return (n / 1000).toFixed(1) + "K";
      return (n / 1000000).toFixed(2) + "M";
    }
    // 字符量：工具输出折叠提示用（<1000 原样，<10000 用 K，否则用 万）
    function formatChars(n) {
      if (n == null || !isFinite(n) || n < 0) return "";
      if (n < 1000) return n + " 字符";
      if (n < 10000) return (n / 1000).toFixed(1) + "K 字符";
      return (n / 10000).toFixed(1) + " 万字符";
    }
    function formatClock(ms) {
      const dt = new Date(ms);
      const pad = function (n) { return (n < 10 ? "0" : "") + n; };
      return pad(dt.getHours()) + ":" + pad(dt.getMinutes());
    }
    // 相对时间：侧栏行密度优先，用紧凑写法（完整时间在 title 里）
    function formatRelativeTime(ms, now) {
      if (ms == null || !isFinite(ms) || ms <= 0) return "";
      const diff = Math.max(0, (now || Date.now()) - ms);
      const s = Math.floor(diff / 1000);
      if (s < 60) return "刚刚";
      const m = Math.floor(s / 60);
      if (m < 60) return m + "m";
      const h = Math.floor(m / 60);
      if (h < 24) return h + "h";
      const d = Math.floor(h / 24);
      if (d === 1) return "昨天";
      if (d < 7) return d + "d";
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
        React.createElement("span", { className: "ccw-dot" }),
        label + (time ? " · " + time : ""));
    }
    // 加载骨架：只在首帧快照到达前出现，避免空白闪一下
    function CcwSkeleton() {
      const widths = ["82%", "56%", "68%"];
      return React.createElement("div", { className: "ccw-skel", "aria-hidden": "true" },
        widths.map(function (w, i) {
          return React.createElement("div", { className: "ccw-skel-row", key: i },
            React.createElement("span", { className: "ccw-skel-avatar" }),
            React.createElement("span", { className: "ccw-skel-lines" },
              React.createElement("span", { className: "ccw-skel-line", style: { width: w } }),
              React.createElement("span", { className: "ccw-skel-line", style: { width: i === 0 ? "64%" : "42%" } })
            )
          );
        })
      );
    }

    function ClaudeCodeView() {
      const open = usePanelOpen();
      const dark = useCcwTheme();
      const [menuOpen, setMenuOpen] = React.useState(false);
      const [drawerOpen, setDrawerOpen] = React.useState(false);
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
      const [maximized, setMaximized] = React.useState(STANDALONE);
      const toggleMaximize = () => setMaximized((v) => !v);
      // 最大化时按视口宽度判断响应式，避免沿用最大化前的窄面板状态
      const effectiveW = maximized ? (typeof window !== "undefined" ? window.innerWidth : geom.width) : geom.width;
      const compact = (effectiveW || 0) < 640;   // 文本/工具卡密度
      const drawerMode = (effectiveW || 0) < 760; // 侧栏改为抽屉
      const [sidebarW, setSidebarW] = React.useState(() => loadNum("ccwSidebarW", 248));
      const sidebarWRef = React.useRef(sidebarW);
      sidebarWRef.current = sidebarW;
      const [minimized, setMinimized] = React.useState(false);
      const [toasts, setToasts] = React.useState([]);
      const [dialog, setDialog] = React.useState(null);
      const dialogInputRef = React.useRef(null);
      const sidebarRef = React.useRef(null);
      const dialogBoxRef = React.useRef(null);
      const updateBoxRef = React.useRef(null);
      const [queued, setQueued] = React.useState(null);
      const [pendingImages, setPendingImages] = React.useState([]);
      const [msgLimit, setMsgLimit] = React.useState(120);
      // 会话内搜索 + 轮次目录（全部本地渲染，无任何网络轮询）
      const [searchOpen, setSearchOpen] = React.useState(false);
      const [searchQ, setSearchQ] = React.useState("");
      const [searchIdx, setSearchIdx] = React.useState(-1);
      const [tocOpen, setTocOpen] = React.useState(false);
      const [jump, setJump] = React.useState(null); // {i}：待滚动到的绝对消息索引
      const searchInputRef = React.useRef(null);
      const inputRef = React.useRef(null);
      const draftRef = React.useRef("");
      draftRef.current = draft;
      const histRef = React.useRef({ list: [], idx: -1 });
      const draftStoreRef = React.useRef({}); // 会话 key -> 草稿
      const pagRef = React.useRef(null);      // “加载更早”前记录滚动位置，避免跳动
      const minAnchorRef = React.useRef(null); // 最小化前记录视口锚点 {i, offset}，恢复时还原

      // 顶栏 ⋯ 菜单：点击外部或 Esc 关闭
      React.useEffect(function () {
        if (!menuOpen) return;
        function onDown(e) {
          if (!(e.target && e.target.closest && e.target.closest(".ccw-menu-wrap"))) setMenuOpen(false);
        }
        function onKey(e) { if (e.key === "Escape") setMenuOpen(false); }
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        return function () {
          document.removeEventListener("mousedown", onDown);
          document.removeEventListener("keydown", onKey);
        };
      }, [menuOpen]);

      // 抽屉：Esc 关闭；面板变宽或关闭时自动收起
      React.useEffect(function () {
        if (!drawerOpen) return;
        function onKey(e) { if (e.key === "Escape") setDrawerOpen(false); }
        document.addEventListener("keydown", onKey);
        return function () { document.removeEventListener("keydown", onKey); };
      }, [drawerOpen]);
      React.useEffect(function () {
        if (!drawerMode) setDrawerOpen(false);
      }, [drawerMode]);
      React.useEffect(function () {
        if (!open) setDrawerOpen(false);
      }, [open]);

      // 抽屉打开时：焦点进入、Tab 留在抽屉内、关闭后还原
      React.useEffect(function () {
        if (!drawerMode || !drawerOpen) return;
        const box = sidebarRef.current;
        if (!box) return;
        const prev = document.activeElement;
        let retry = 0;
        let tries = 0;
        function focusables() {
          return Array.prototype.slice.call(box.querySelectorAll(
            'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
          )).filter(function (el) { return el.offsetParent !== null; });
        }
        // 抽屉有 180ms 的 visibility 过渡，隐藏时 focus() 不会生效，需要等过渡结束再重试
        function focusInitial() {
          if (tries++ > 6) return;
          const initial = box.querySelector("[data-drawer-autofocus]") || focusables()[0] || box;
          if (initial && initial.focus) initial.focus();
          if (initial && document.activeElement !== initial) {
            retry = setTimeout(focusInitial, 80);
          }
        }
        const t = setTimeout(focusInitial, 0);
        function onKey(e) {
          if (e.key !== "Tab") return;
          const list = focusables();
          if (!list.length) return;
          const first = list[0], last = list[list.length - 1];
          if (e.shiftKey) {
            if (document.activeElement === first || !box.contains(document.activeElement)) {
              e.preventDefault(); last.focus();
            }
          } else if (document.activeElement === last || !box.contains(document.activeElement)) {
            e.preventDefault(); first.focus();
          }
        }
        document.addEventListener("keydown", onKey, true);
        return function () {
          clearTimeout(t);
          clearTimeout(retry);
          document.removeEventListener("keydown", onKey, true);
          if (prev && prev.focus && prev.isConnected) prev.focus();
        };
      }, [drawerMode, drawerOpen]);

      // Dialog：焦点陷阱 + Esc + 关闭后还原焦点
      React.useEffect(function () {
        if (!dialog) return;
        const box = dialogBoxRef.current;
        if (!box) return;
        const prev = document.activeElement;
        function focusables() {
          return Array.prototype.slice.call(box.querySelectorAll(
            'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
          )).filter(function (el) { return el.offsetParent !== null; });
        }
        const t = setTimeout(function () {
          if (dialog.kind === "prompt" && dialogInputRef.current) {
            dialogInputRef.current.focus();
            dialogInputRef.current.select();
          } else {
            const list = focusables();
            if (list.length) list[list.length - 1].focus();
          }
        }, 0);
        function onKey(e) {
          if (e.key === "Escape") {
            e.preventDefault(); e.stopPropagation();
            if (dialog.resolve) dialog.resolve(null);
            setDialog(null);
            return;
          }
          if (e.key !== "Tab") return;
          const list = focusables();
          if (!list.length) return;
          const first = list[0], last = list[list.length - 1];
          if (e.shiftKey) {
            if (document.activeElement === first || !box.contains(document.activeElement)) {
              e.preventDefault(); last.focus();
            }
          } else if (document.activeElement === last || !box.contains(document.activeElement)) {
            e.preventDefault(); first.focus();
          }
        }
        document.addEventListener("keydown", onKey, true);
        return function () {
          clearTimeout(t);
          document.removeEventListener("keydown", onKey, true);
          if (prev && prev.focus && prev.isConnected) prev.focus();
        };
      }, [dialog]);

      // 更新弹窗：焦点陷阱 + Esc + 关闭后还原
      React.useEffect(function () {
        if (!showUpdate) return;
        const box = updateBoxRef.current;
        if (!box) return;
        const prev = document.activeElement;
        function focusables() {
          return Array.prototype.slice.call(box.querySelectorAll(
            'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
          )).filter(function (el) { return el.offsetParent !== null; });
        }
        const t = setTimeout(function () {
          const list = focusables();
          if (list.length) list[0].focus();
          else box.focus();
        }, 0);
        function onKey(e) {
          if (e.key === "Escape") {
            e.preventDefault(); e.stopPropagation();
            setShowUpdate(false);
            return;
          }
          if (e.key !== "Tab") return;
          const list = focusables();
          if (!list.length) return;
          const first = list[0], last = list[list.length - 1];
          if (e.shiftKey) {
            if (document.activeElement === first || !box.contains(document.activeElement)) {
              e.preventDefault(); last.focus();
            }
          } else if (document.activeElement === last || !box.contains(document.activeElement)) {
            e.preventDefault(); first.focus();
          }
        }
        document.addEventListener("keydown", onKey, true);
        return function () {
          clearTimeout(t);
          document.removeEventListener("keydown", onKey, true);
          if (prev && prev.focus && prev.isConnected) prev.focus();
        };
      }, [showUpdate]);

      // 轮次目录：Esc 或点击外部关闭
      React.useEffect(function () {
        if (!tocOpen) return;
        function onKey(e) { if (e.key === "Escape") setTocOpen(false); }
        function onDown(e) {
          const t = e.target;
          if (t && t.closest && (t.closest(".ccw-toc") || t.closest('[aria-label="轮次目录"]'))) return;
          setTocOpen(false);
        }
        document.addEventListener("keydown", onKey);
        document.addEventListener("mousedown", onDown);
        return function () {
          document.removeEventListener("keydown", onKey);
          document.removeEventListener("mousedown", onDown);
        };
      }, [tocOpen]);

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
          // 连接地址必须用 DSH 注入的 transport 基址：桌面端主窗口是从自定义协议
          // dsh-app://app/ 加载的，window.location.host 会是 "app"，直接拼出的
          // ws://app/... 连不上。官方客户端同样用 __DSH_TRANSPORT__.streamBaseUrl
          // （见 @deepseek-ai/dsh-api-gateway/lib/client.js）。取不到时退回原逻辑。
          let url;
          try {
            const transport = globalThis.__DSH_TRANSPORT__;
            const base = (transport && transport.streamBaseUrl) || document.baseURI;
            const u = new URL(API + "/stream", base);
            u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
            url = u.href;
          } catch (e) {
            let proto = "ws";
            try { if (window.location.protocol === "https:") proto = "wss"; } catch (e2) {}
            url = proto + "://" + window.location.host + API + "/stream";
          }
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
          const rootCurrent = wsRootForPath(snap.current, (snap.workspaces || []).filter(function (w) { return w && w.path; }));
          setSelWs(function (prev) { return prev || rootCurrent || snap.current; });
        }
      }, [snap]);

      // 切换到一个已有会话时，让顶栏工作区跟随该会话的 cwd。只在该会话 key 或
      // 服务端补全后的 cwd 变化时触发，不覆盖用户手动点击工作区的选择。
      const activeSessionKey = snap && snap.active ? (snap.active.key || snap.active.sessionId || "") : "";
      const activeSessionCwd = snap && snap.active ? (snap.active.cwd || "") : "";
      React.useEffect(() => {
        if (!snap || !snap.active || !snap.active.cwd) return;
        const root = wsRootForPath(snap.active.cwd, (snap.workspaces || []).filter(function (w) { return w && w.path; }));
        if (root) setSelWs(root);
      }, [activeSessionKey, activeSessionCwd]);

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
        setSearchOpen(false);
        setSearchQ("");
        setSearchIdx(-1);
        setTocOpen(false);
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

      // 从最小化恢复：消息容器被卸载后重新挂载、滚动位置归零，按最小化前记录的锚点还原
      // （open 未变、WS 未重连，故上面的 auto-follow effect 不会触发；这里补上）
      React.useLayoutEffect(function () {
        if (minimized) return;
        const el = msgsRef.current;
        const anchor = minAnchorRef.current;
        minAnchorRef.current = null;
        if (!el || !anchor) return;
        const target = el.querySelector('[data-ccw-i="' + anchor.i + '"]');
        if (target) {
          const elRect = el.getBoundingClientRect();
          const tRect = target.getBoundingClientRect();
          el.scrollTop += (tRect.top - elRect.top) - anchor.offset;
        } else {
          // 锚点消息已不在渲染窗口（期间消息大量增长）→ 回到底部兜底
          el.scrollTop = el.scrollHeight;
        }
        // 按还原后的位置重算“跟随底部”标记
        stickRef.current = (el.scrollHeight - el.scrollTop - el.clientHeight) < 40;
      }, [minimized]);

      // 搜索/目录跳转：目标消息 DOM 提交后滚到视口中部（避免 auto-follow 拉回底部）
      React.useLayoutEffect(function () {
        if (!jump) return;
        const el = msgsRef.current;
        if (el) {
          const target = el.querySelector('[data-ccw-i="' + jump.i + '"]');
          if (target) {
            const elRect = el.getBoundingClientRect();
            const tRect = target.getBoundingClientRect();
            el.scrollTop += (tRect.top - elRect.top) - el.clientHeight / 2 + tRect.height / 2;
          }
        }
        setJump(null);
      }, [jump]);

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

      // 会话内搜索快捷键：Ctrl/Cmd+F 打开搜索，Esc 关闭搜索/目录
      React.useEffect(function () {
        function onKey(e) {
          if (!open) return;
          if ((e.metaKey || e.ctrlKey) && !e.altKey && (e.key === "f" || e.key === "F")) {
            e.preventDefault();
            setSearchOpen(true);
            setTocOpen(false);
            setTimeout(function () { if (searchInputRef.current) searchInputRef.current.focus(); }, 0);
          } else if (e.key === "Escape") {
            setSearchOpen(false);
            setTocOpen(false);
          }
        }
        window.addEventListener("keydown", onKey);
        return function () { window.removeEventListener("keydown", onKey); };
      }, [open]);

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

      // 最小化前记录视口锚点：取视口顶部第一条可见消息 + 其顶部相对容器顶的偏移
      function captureMinAnchor() {
        const el = msgsRef.current;
        if (!el) { minAnchorRef.current = null; return; }
        const topY = el.getBoundingClientRect().top;
        const items = el.querySelectorAll("[data-ccw-i]");
        let anchor = null;
        for (let k = 0; k < items.length; k++) {
          const r = items[k].getBoundingClientRect();
          if (r.bottom > topY + 1) { anchor = { i: items[k].getAttribute("data-ccw-i"), offset: r.top - topY }; break; }
        }
        minAnchorRef.current = anchor;
      }

      // ── 会话内搜索 + 轮次目录（纯本地，无网络请求）──
      function jumpToMessage(i) {
        if (i < 0 || !messages.length) return;
        stickRef.current = false; // 跳离底部后不再 auto-follow
        const start = Math.max(0, messages.length - msgLimit);
        if (i < start) setMsgLimit(messages.length - i + 10); // 目标在视窗外 → 先扩窗
        setJump({ i: i });
      }
      function searchStep(dir) {
        if (!searchMatches.length) return;
        let idx = searchIdx;
        idx = idx < 0 ? (dir > 0 ? 0 : searchMatches.length - 1) : (idx + dir + searchMatches.length) % searchMatches.length;
        setSearchIdx(idx);
        jumpToMessage(searchMatches[idx]);
      }
      function onSearchChange(v) {
        setSearchQ(v);
        const q = String(v || "").trim().toLowerCase();
        if (q) {
          for (let i = 0; i < messages.length; i++) {
            if (messageSearchText(messages[i]).toLowerCase().indexOf(q) !== -1) {
              setSearchIdx(0);
              jumpToMessage(i);
              return;
            }
          }
          setSearchIdx(-1);
        } else {
          setSearchIdx(-1);
        }
      }
      function toggleSearch() {
        const nv = !searchOpen;
        setSearchOpen(nv);
        setTocOpen(false);
        if (!nv) { setSearchQ(""); setSearchIdx(-1); }
        else setTimeout(function () { if (searchInputRef.current) searchInputRef.current.focus(); }, 0);
      }
      function toggleToc() {
        const nv = !tocOpen;
        setTocOpen(nv);
        setSearchOpen(false);
      }
      function jumpToTurn(t) {
        if (!t) return;
        jumpToMessage(t.i);
        setTocOpen(false);
      }

      function onSwitch(s) {
        stickRef.current = true; // 切换会话后跟随底部
        if (drawerMode) setDrawerOpen(false);
        if (s.key) apiChecked("switch", { key: s.key });
        else if (s.id) apiChecked("switch", { sessionId: s.id });
      }

      function onNew() {
        stickRef.current = true;
        if (drawerMode) setDrawerOpen(false);
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
        if (e.button != null && e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        const startY = e.clientY;
        const startH = inputHRef.current;
        const prevCursor = document.body.style.cursor;
        const prevSelect = document.body.style.userSelect;
        document.body.style.cursor = "row-resize";
        document.body.style.userSelect = "none";
        function move(ev) {
          // 拖拽把手在输入框上方：向上拖（clientY 减小）→ 高度增大；向下拖 → 高度减小
          const h = Math.min(360, Math.max(44, startH - (ev.clientY - startY)));
          inputHRef.current = h;
          setInputH(h);
        }
        function up() {
          document.removeEventListener("pointermove", move);
          document.removeEventListener("pointerup", up);
          document.removeEventListener("pointercancel", up);
          document.body.style.cursor = prevCursor;
          document.body.style.userSelect = prevSelect;
          try { localStorage.setItem("ccwInputHeight", String(inputHRef.current)); } catch (e) {}
        }
        document.addEventListener("pointermove", move);
        document.addEventListener("pointerup", up);
        document.addEventListener("pointercancel", up);
      }

      function onResizeKeyDown(e) {
        if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
        e.preventDefault();
        const h = Math.min(360, Math.max(44, inputHRef.current + (e.key === "ArrowUp" ? 10 : -10)));
        inputHRef.current = h;
        setInputH(h);
        try { localStorage.setItem("ccwInputHeight", String(h)); } catch (e2) {}
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
      const wsList = snap ? normalizeWorkspaces(snap.workspaces || []) : [];
      const workspaceCount = wsList.length;
      // 轮次：每个 user 消息开启一轮（目录 + 流程分隔线共用）
      const turns = [];
      const turnByIndex = new Map();
      for (let i = 0; i < messages.length; i++) {
        if (messages[i].role === "user") {
          const t = { i: i, n: turns.length + 1, ts: messages[i].ts, text: messages[i].text };
          turns.push(t);
          turnByIndex.set(i, t);
        }
      }
      // 搜索命中：在全量消息上匹配（含尚未渲染进视窗的早期消息）
      const sq = searchQ.trim().toLowerCase();
      const searchMatches = [];
      if (sq) {
        for (let i = 0; i < messages.length; i++) {
          if (messageSearchText(messages[i]).toLowerCase().indexOf(sq) !== -1) searchMatches.push(i);
        }
      }
      const searchMatchSet = new Set(searchMatches);
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

      // 当前会话累计费用（费用取 sessionCostUsd，跨 query 生命周期累计；缺失时回退本 query 值）
      let resultMeta = null;
      if (active && active.lastResult) {
        const lr = active.lastResult;
        const sessionCost = lr.sessionCostUsd != null ? lr.sessionCostUsd : lr.costUsd;
        if (sessionCost != null) resultMeta = "$" + (Math.round(sessionCost * 1000) / 1000);
      }

      // 当前会话累计 token 用量（以 M 为单位，跨 query 生命周期累计）
      let tokenMeta = null;
      let tokenMetaFull = "";
      if (active && active.lastResult) {
        const st = active.lastResult.sessionTokens != null ? active.lastResult.sessionTokens : active.lastResult.tokens;
        if (st != null) { tokenMeta = formatTokens(st); tokenMetaFull = formatTokensFull(st); }
      }

      // 面包屑优先用工作区的显示名（可能是用户重命名过的），取不到再回退目录名
      const wsNameEntry = wsList.find(function (w) { return w.path && w.path === selWs; });
      const wsName = wsNameEntry ? wsDisplayName(wsNameEntry)
        : (selWs ? String(selWs).split(/[\\/]/).filter(Boolean).pop() : "");
      const crumbTitle = !snap ? "加载中…" : active ? (active.title || "会话") : "暂无活跃会话";
      const panelStyle = maximized
        ? { left: 8, top: 8, width: "calc(100vw - 16px)", height: "calc(100vh - 16px)" }
        : { left: geom.left, top: geom.top, width: geom.width, height: geom.height };

      // 最小化：收起为角落胶囊（WS 保持连接，状态持续推送）
      if (minimized) {
        return React.createElement("button", {
          className: "ccw-mini-pill", title: "点击恢复 Claude Code 面板", "data-ccw-theme": dark ? "dark" : "light",
          onClick: function () { setMinimized(false); },
        },
          React.createElement(ClaudeLogo, { size: 14 }),
          "Claude Code",
          React.createElement("span", { className: "ccw-dot " + (conn ? "ok" : "") }),
        );
      }

      return React.createElement("div", {
        className: "ccw" + (compact ? " ccw-narrow" : "") + (drawerMode ? " ccw-drawer-mode" : "") + (drawerMode && drawerOpen ? " ccw-drawer-open" : ""),
        "data-ccw-theme": dark ? "dark" : "light",
        style: panelStyle,
      },
        React.createElement("div", { className: "ccw-titlebar", onPointerDown: beginDrag, title: maximized ? "" : "拖拽移动面板" },
          React.createElement("span", { className: "ccw-brand" }, React.createElement(ClaudeLogo, { size: 16 }), "Claude Code"),
          React.createElement("span", { className: "ccw-local", title: "插件服务运行在本机 DSH 宿主内" }, "本地"),
          React.createElement("span", { className: "ccw-conn" },
            React.createElement("span", { className: "ccw-dot " + (conn ? "ok" : (reconn > 0 ? "run" : "err")) }),
            conn ? "已连接" : (reconn > 0 ? "重连中 · 第 " + reconn + " 次" : "未连接")),
          React.createElement("div", { style: { flex: 1 } }),
          STANDALONE ? null : React.createElement(React.Fragment, null,
            React.createElement("button", { className: "ccw-iconbtn", title: "在独立窗口打开", "aria-label": "在独立窗口打开", onClick: function () { openStandalone(); setOpen(false); } }, React.createElement(CcwIcon, { name: "external" })),
            React.createElement("button", { className: "ccw-iconbtn", title: "最小化到角落", "aria-label": "最小化", onClick: function () {
              if (dialog) { dialog.resolve(null); setDialog(null); }
              captureMinAnchor();
              setMinimized(true);
            } }, React.createElement(CcwIcon, { name: "minus" })),
            React.createElement("button", { className: "ccw-iconbtn", title: maximized ? "还原窗口" : "最大化窗口", "aria-label": maximized ? "还原窗口" : "最大化窗口", onClick: toggleMaximize }, React.createElement(CcwIcon, { name: maximized ? "restore" : "square" })),
            React.createElement("button", { className: "ccw-iconbtn", title: "关闭", "aria-label": "关闭", onClick: () => setOpen(false) }, React.createElement(CcwIcon, { name: "x" })),
          ),
        ),
        maximized ? null : React.createElement("div", { className: "ccw-resize-se", onPointerDown: beginPanelResize, title: "拖拽调整面板尺寸" }),
        React.createElement("div", { className: "ccw-topbar" },
          drawerMode ? React.createElement("button", {
            className: "ccw-iconbtn ccw-drawer-toggle" + (drawerOpen ? " active" : ""),
            title: drawerOpen ? "关闭会话列表" : "打开会话列表",
            "aria-label": drawerOpen ? "关闭会话列表" : "打开会话列表",
            "aria-expanded": drawerOpen, "aria-controls": "ccw-sidebar",
            onClick: function () { setDrawerOpen(function (v) { return !v; }); },
          }, React.createElement(CcwIcon, { name: "panel-left" })) : null,
          React.createElement("div", { className: "ccw-crumb" },
            React.createElement(CcwIcon, { name: "folder", size: 13 }),
            wsName ? React.createElement("span", { className: "ccw-crumb-ws", title: selWs }, wsName) : null,
            wsName ? React.createElement(CcwIcon, { name: "chev-r", size: 11 }) : null,
            React.createElement("b", { title: crumbTitle }, crumbTitle)
          ),
          active ? React.createElement(StatusBadge, { status: active.status, startedAt: active.startedAt, durationMs: active.durationMs }) : null,
          resultMeta ? React.createElement("span", { className: "ccw-meta", title: "当前会话累计费用" }, "· " + resultMeta) : null,
          tokenMeta != null ? React.createElement("span", { className: "ccw-meta", title: "当前会话累计 token：" + tokenMetaFull }, "· " + tokenMeta + " tokens") : null,
          React.createElement("div", { style: { flex: 1 } }),
          React.createElement("button", { className: "ccw-iconbtn" + (searchOpen ? " active" : ""), title: "会话内搜索（Ctrl/Cmd+F）", "aria-label": "会话内搜索", onClick: toggleSearch }, React.createElement(CcwIcon, { name: "search" })),
          React.createElement("button", { className: "ccw-iconbtn" + (tocOpen ? " active" : ""), title: "轮次目录（跳到某轮）", "aria-label": "轮次目录", onClick: toggleToc }, React.createElement(CcwIcon, { name: "list" })),
          React.createElement("div", { className: "ccw-menu-wrap" },
            React.createElement("button", { className: "ccw-iconbtn" + (menuOpen ? " active" : ""), title: "更多操作", "aria-label": "更多操作", "aria-haspopup": "menu", "aria-expanded": menuOpen, onClick: function () { setMenuOpen(function (v) { return !v; }); } }, React.createElement(CcwIcon, { name: "more" })),
            menuOpen ? React.createElement("div", { className: "ccw-menu", role: "menu" },
              React.createElement("button", { className: "ccw-menu-item", role: "menuitem", disabled: !active, onClick: function () { setMenuOpen(false); onClearSession(); } }, React.createElement(CcwIcon, { name: "eraser" }), "清空当前会话"),
              React.createElement("div", { className: "ccw-menu-sep" }),
              React.createElement("button", { className: "ccw-menu-item", role: "menuitem", onClick: function () { setMenuOpen(false); refetchCatalog(); toast("已刷新指令与模型列表", "ok"); } }, React.createElement(CcwIcon, { name: "refresh" }), "刷新指令与模型"),
              React.createElement("button", { className: "ccw-menu-item", role: "menuitem", onClick: function () { setMenuOpen(false); openUpdate(); } }, React.createElement(CcwIcon, { name: "update" }), "检查更新")
            ) : null
          )
        ),
        React.createElement("div", { className: "ccw-body" },
          drawerMode && drawerOpen ? React.createElement("div", {
            className: "ccw-scrim", "aria-hidden": "true",
            onClick: function () { setDrawerOpen(false); },
          }) : null,
          React.createElement(Sidebar, {
            snap: snap, collapsed: collapsed, toggleWs: toggleWs,
            onNew: onNew, onSwitch: onSwitch, onAddWs: onAddWs,
            onRenameSession: onRenameSession, onDeleteSession: onDeleteSession,
            onRenameWs: onRenameWs, onDeleteWs: onDeleteWs,
            width: drawerMode ? 280 : sidebarW, pickingWs: pickingWs,
            currentWs: selWs, onSelectWs: onSelectWs,
            drawerMode: drawerMode, drawerOpen: drawerOpen, onCloseDrawer: function () { setDrawerOpen(false); },
            sidebarRef: sidebarRef,
          }),
          React.createElement("div", { className: "ccw-split", title: "拖拽调整工作区宽度", onPointerDown: beginSidebarResize }),
          React.createElement("div", { className: "ccw-main" },
        searchOpen ? React.createElement("div", { className: "ccw-searchbar", role: "search", "aria-label": "会话内搜索" },
          React.createElement("input", {
            ref: searchInputRef,
            className: "ccw-search-input",
            "aria-label": "搜索会话内容",
            placeholder: "搜索会话内容…（Enter 下一个 / Shift+Enter 上一个 / Esc 关闭）",
            value: searchQ,
            onChange: function (e) { onSearchChange(e.target.value); },
            onKeyDown: function (e) {
              if (e.key === "Escape") { setSearchOpen(false); setTocOpen(false); return; }
              if (e.key === "Enter") { e.preventDefault(); searchStep(e.shiftKey ? -1 : 1); }
            },
          }),
          sq ? React.createElement("span", { className: "ccw-search-count", "aria-live": "polite" },
            searchMatches.length ? (searchIdx + 1) + " / " + searchMatches.length : "无匹配") : null,
          React.createElement("button", { className: "ccw-btn small", title: "上一个（Shift+Enter）", "aria-label": "上一个匹配", disabled: !searchMatches.length, onClick: function () { searchStep(-1); } }, React.createElement(CcwIcon, { name: "arrow-up", size: 13 })),
          React.createElement("button", { className: "ccw-btn small", title: "下一个（Enter）", "aria-label": "下一个匹配", disabled: !searchMatches.length, onClick: function () { searchStep(1); } }, React.createElement(CcwIcon, { name: "arrow-down", size: 13 })),
          React.createElement("button", { className: "ccw-btn small", title: "关闭搜索", "aria-label": "关闭搜索", onClick: function () { setSearchOpen(false); setSearchQ(""); setSearchIdx(-1); } }, React.createElement(CcwIcon, { name: "x", size: 13 })),
        ) : null,
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
                React.createElement(CcwIcon, { name: "alert", size: 14 }), unanswered.length + " 个工具待授权",
                React.createElement("button", { className: "ccw-btn small primary", onClick: function () { answerAll("allow"); } }, "全部允许"),
                React.createElement("button", { className: "ccw-btn small danger", onClick: function () { answerAll("deny"); } }, "全部拒绝"),
              ) : null,
              !snap ? React.createElement(CcwSkeleton) : messages.length === 0 ? React.createElement("div", { className: "ccw-empty" },
                React.createElement("div", { className: "ccw-empty-mark" }, React.createElement(ClaudeLogo, { size: 22 })),
                React.createElement("div", { className: "ccw-empty-title" }, active ? "开始这个会话" : "还没有会话"),
                React.createElement("div", { className: "ccw-empty-desc" }, active
                  ? "在下方输入消息，或输入 / 调用指令。"
                  : "选择左侧工作区，或直接开始一个新会话。"),
                React.createElement("div", { className: "ccw-empty-actions" },
                  !active && workspaceCount === 0
                    ? React.createElement("button", { className: "ccw-btn primary", onClick: onAddWs, disabled: pickingWs }, pickingWs ? "正在打开目录选择…" : "添加工作区")
                    : !active
                      ? React.createElement("button", { className: "ccw-btn primary", onClick: onNew }, React.createElement(CcwIcon, { name: "plus", size: 14 }), "新会话")
                      : null,
                  drawerMode ? React.createElement("button", { className: "ccw-btn", onClick: function () { setDrawerOpen(true); } }, React.createElement(CcwIcon, { name: "panel-left", size: 14 }), "历史会话") : null
                ),
                React.createElement("div", { className: "ccw-empty-hint" }, "Enter 发送 · Shift+Enter 换行 · / 调用指令")
              ) : null,
              startIdx > 0 ? React.createElement("button", { className: "ccw-btn small ccw-loadmore", onClick: loadMore }, "加载更早（还有 " + startIdx + " 条）") : null,
              (function () {
                const blocks = [];
                let block = null;
                visible.forEach(function (m, vi) {
                  const i = startIdx + vi;
                  const live = running && i === messages.length - 1;
                  const turn = turnByIndex.get(i);
                  if (turn) {
                    block = {
                      key: "tb" + turn.n + "-" + i,
                      label: React.createElement("div", { className: "ccw-turn" }, "第 " + turn.n + " 轮" + (turn.ts ? " · " + formatClock(turn.ts) : "")),
                      items: [],
                    };
                    blocks.push(block);
                  }
                  if (!block) {
                    block = { key: "tb-pre-" + i, label: null, items: [] };
                    blocks.push(block);
                  }
                  const isHit = searchIdx >= 0 && searchMatches[searchIdx] === i;
                  const query = searchMatchSet.has(i) ? sq : "";
                  block.items.push(React.createElement(MessageView, { key: m.id != null ? m.id : "i" + i, msg: m, live: live, onFill: fillInput, hl: isHit, dataIndex: i, query: query }));
                });
                return blocks.map(function (b) {
                  return React.createElement("div", { className: "ccw-turnblk", key: b.key },
                    b.label,
                    React.createElement("div", { className: "ccw-turnbody" }, b.items)
                  );
                });
              })(),
              active && active.status === "starting" ? React.createElement("div", { className: "ccw-msg assistant" }, "…") : null,
            ),
            tocOpen ? React.createElement("div", { className: "ccw-toc", role: "group", "aria-label": "轮次目录" },
              React.createElement("div", { className: "ccw-toc-head" },
                React.createElement(CcwIcon, { name: "list", size: 14 }),
                "轮次目录",
                React.createElement("span", { className: "ccw-search-count" }, "共 " + turns.length + " 轮"),
                React.createElement("div", { style: { flex: 1 } }),
                React.createElement("button", { className: "ccw-icbtn", title: "关闭目录", "aria-label": "关闭轮次目录", onClick: function () { setTocOpen(false); } }, React.createElement(CcwIcon, { name: "x", size: 13 })),
              ),
              React.createElement("div", { className: "ccw-toc-list" },
                turns.length === 0 ? React.createElement("div", { className: "ccw-dim", style: { padding: "8px" } }, "暂无对话轮次") : null,
                turns.map(function (t) {
                  return React.createElement("button", { key: t.n, type: "button", className: "ccw-toc-item", title: "跳到第 " + t.n + " 轮", onClick: function () { jumpToTurn(t); } },
                    React.createElement("span", { className: "ccw-toc-n" }, "第" + t.n + "轮"),
                    t.ts ? React.createElement("span", { className: "ccw-toc-time" }, formatClock(t.ts)) : null,
                    React.createElement("span", { className: "ccw-toc-txt" }, turnSnippet(t.text) || "（图片/空消息）"),
                  );
                }),
              ),
            ) : null,
        React.createElement("div", { className: "ccw-footer" },
          React.createElement("div", { className: "ccw-footer-inner" },
          pop ? React.createElement("div", { className: "ccw-pop-list", id: "ccw-pop-list", role: "listbox", "aria-label": "指令和技能" },
            pop.items.map(function (c, i) {
              return React.createElement("div", {
                key: c.name,
                className: "ccw-pop-item" + (i === pop.sel ? " sel" : ""),
                role: "option", "aria-selected": i === pop.sel,
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
            React.createElement(CcwIcon, { name: "clock", size: 12, className: "ccw-queue-icon" }),
            "运行结束后将自动发送：" + (queued.length > 60 ? queued.slice(0, 60) + "…" : queued),
            React.createElement("button", { className: "ccw-icbtn", title: "取消排队", "aria-label": "取消排队", onClick: function () { setQueued(null); } }, React.createElement(CcwIcon, { name: "x", size: 12 })),
          ) : null,
          pendingImages.length ? React.createElement("div", { className: "ccw-img-chips" },
            pendingImages.map(function (im, ix) {
              return React.createElement("span", { key: ix, className: "ccw-img-chip" },
                React.createElement(CcwIcon, { name: "image", size: 12 }),
                (im.name || "图片"),
                React.createElement("button", { className: "ccw-icbtn", title: "移除", "aria-label": "移除图片 " + (im.name || ""), onClick: function () { setPendingImages(function (p) { return p.filter(function (_, j) { return j !== ix; }); }); } }, React.createElement(CcwIcon, { name: "x", size: 11 })),
              );
            }),
          ) : null,
          React.createElement("div", {
            className: "ccw-resize", onPointerDown: onResizeStart, onKeyDown: onResizeKeyDown,
            role: "separator", "aria-orientation": "horizontal", "aria-label": "拖拽调整输入框高度",
            tabIndex: 0, title: "拖拽调整输入框高度",
          }, React.createElement("span", { className: "ccw-resize-grip" })),
          React.createElement("div", {
            className: "ccw-composer",
            onPointerDown: function () { if (drawerOpen) setDrawerOpen(false); },
          },
            React.createElement("textarea", {
              ref: inputRef,
              className: "ccw-input",
              "aria-label": "输入消息",
              style: inputH ? { height: inputH + "px" } : null,
              placeholder: "输入消息，/ 调用指令，可粘贴图片",
              title: "Enter 发送，Shift+Enter 换行；输入 / 触发指令（Tab 补全）；可粘贴图片；↑ 调上一条",
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
            React.createElement("div", { className: "ccw-composer-bar" },
              React.createElement("span", { className: "ccw-composer-hint" },
                React.createElement(CcwIcon, { name: "slash", size: 11 }), "指令"),
              React.createElement("div", { style: { flex: 1 } }),
              React.createElement("select", {
                className: "ccw-model ccw-model-inline",
                value: modelId,
                onChange: (e) => setModelId(e.target.value),
                "aria-label": "选择模型",
                title: "模型（--model）",
              },
                React.createElement("option", { value: "" }, "默认模型"),
                models.map(function (mm) { return React.createElement("option", { key: mm.id, value: mm.id }, mm.label); }),
              ),
              running ? React.createElement("button", {
                className: "ccw-stopbtn", onClick: function () { apiChecked("stop", {}); },
                title: "停止当前会话", "aria-label": "停止当前会话",
              }, React.createElement("span", { className: "ccw-stop-sq", "aria-hidden": "true" }), "停止") : null,
              React.createElement("button", { className: "ccw-sendbtn", onClick: send, title: running ? "发送（运行中排队）" : "发送（Enter）", "aria-label": running ? "发送并排队" : "发送" }, React.createElement(CcwIcon, { name: "arrow-up", size: 15 })),
            ),
          ),
          ),
          React.createElement("div", { className: "ccw-toasts", role: "status", "aria-live": "polite", "aria-atomic": "false" },
            toasts.map(function (t) {
              return React.createElement("div", { key: t.id, className: "ccw-toast " + t.kind },
                React.createElement("span", { className: "ccw-toast-ic" }, React.createElement(CcwIcon, {
                  name: t.kind === "err" ? "alert" : t.kind === "ok" ? "check" : "info", size: 13,
                })),
                React.createElement("span", { className: "ccw-toast-text" }, t.text)
              );
            }),
          ),
        ),
          ),
        ),
        showUpdate ? React.createElement("div", { className: "ccw-modal" },
          React.createElement("div", {
            className: "ccw-modal-box", ref: updateBoxRef,
            role: "dialog", "aria-modal": "true", "aria-labelledby": "ccw-update-title",
            tabIndex: -1,
          },
            React.createElement("div", { className: "ccw-modal-head", id: "ccw-update-title" }, React.createElement(CcwIcon, { name: "update", size: 15 }), "Claude Code 更新"),
            updateInfo == null
              ? React.createElement("div", { className: "ccw-dim" }, "正在检查版本…")
              : updating
                ? React.createElement("div", { className: "ccw-dim" }, "正在更新，请稍候（可能需要 1-2 分钟）…")
                : updateInfo.ok === false
                  ? React.createElement("div", { className: "ccw-msg result err" }, updateInfo.error || "检查失败")
                  : updateInfo.version
                    ? React.createElement("div", null,
                        React.createElement("div", { className: "ccw-updated" }, React.createElement(CcwIcon, { name: "check", size: 14 }), "已更新到 " + updateInfo.version),
                        updateInfo.log ? React.createElement("pre", { className: "ccw-modal-log" }, updateInfo.log) : null,
                      )
                    : React.createElement("div", null,
                        React.createElement("div", null, "当前版本：" + (updateInfo.current || "未知")),
                        React.createElement("div", null, "最新版本：" + (updateInfo.latest || "未知")),
                        updateInfo.latestError ? React.createElement("div", { className: "ccw-dim" }, updateInfo.latestError) : null,
                        updateInfo.hasUpdate
                          ? React.createElement("button", { className: "ccw-btn primary", style: { marginTop: 10 }, onClick: doUpdate }, "立即更新")
                          : React.createElement("div", { className: "ccw-dim ccw-updated", style: { marginTop: 8 } }, React.createElement(CcwIcon, { name: "check", size: 13 }), "已是最新版本"),
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
          React.createElement("div", {
            className: "ccw-modal-box", ref: dialogBoxRef,
            role: "dialog", "aria-modal": "true", "aria-labelledby": "ccw-dialog-title",
            tabIndex: -1, style: { width: "min(440px,90vw)" },
          },
            React.createElement("div", { className: "ccw-modal-head", id: "ccw-dialog-title" }, dialog.title),
            dialog.kind === "prompt" ? React.createElement("input", {
              ref: dialogInputRef,
              className: "ccw-dialog-input",
              "aria-label": "会话名称",
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
      cleanupMermaidTempNodes();   // 清掉旧版失败渲染残留在 body 底部的错误图
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
    exports.ClaudeCodeView = ClaudeCodeView;
    exports.ensureCss = ensureCss;

    // 独立页挂载：注入样式 + 常开全窗口渲染（ReactDOM 由独立页 UMD 提供）
    function mountStandalone(rootEl) {
      ensureCss();
      setOpen(true);
      const ReactDOM = (typeof window !== "undefined" && window.ReactDOM) || null;
      if (!rootEl || !ReactDOM || typeof ReactDOM.createRoot !== "function") {
        if (typeof console !== "undefined") console.error("[dsh-claude-code-web] 独立页缺少 ReactDOM.createRoot，请确认已引入 react-dom UMD");
        return;
      }
      ReactDOM.createRoot(rootEl).render(React.createElement(ClaudeCodeView));
    }
    exports.mountStandalone = mountStandalone;

    return module.exports;
}

// DSH 客户端入口：经模块装载器注册 factory（惰性物化）
// id 须与 npm 包名一致（含 scope），DSH 依此匹配客户端半部。
if (typeof window !== "undefined" && window.__ModuleLoader__) {
  window.__ModuleLoader__.load({
    id: "@zhoulvyuan/dsh-claude-code-web",
    factory: function (require) { return build(require("react")); }
  });
}

// 独立页入口：暴露 build 供 public/index.html 调用
if (typeof window !== "undefined") {
  window.__CCW_UI__ = { build: build };
}
