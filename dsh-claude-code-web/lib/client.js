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
.ccw-ws-name { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ccw-srow { display:flex; align-items:center; gap:6px; padding:5px 6px 5px 18px; border-radius:6px; cursor:pointer; }
.ccw-srow:hover { background:var(--dsw-alias-bg-layer-2,#f3f4f6); }
.ccw-srow.active { background:rgba(79,140,255,.14); }
.ccw-stitle { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
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
.ccw-ctl { align-self:stretch; border:1px solid #f59e0b; background:var(--dsw-alias-bg-layer-1,#f3f4f6); border-radius:10px; padding:10px 12px; }
.ccw-ctl-head { font-weight:600; color:var(--dsw-alias-label-primary,#1f2937); margin-bottom:4px; }
.ccw-ctl-input { font-family:ui-monospace,monospace; font-size:11px; background:rgba(127,127,127,.14); padding:6px 8px; border-radius:6px; white-space:pre-wrap; max-height:140px; overflow-y:auto; margin-bottom:8px; }
.ccw-ctl-actions { display:flex; gap:8px; flex-wrap:wrap; }
.ccw-dot { display:inline-block; width:8px; height:8px; border-radius:50%; }
.ccw-pop-list { background:var(--dsw-alias-bg-base,#fff); border:1px solid var(--dsw-alias-border-l2,#d1d5db); border-radius:8px; max-height:220px; overflow-y:auto; box-shadow:0 4px 16px rgba(0,0,0,.12); margin-bottom:4px; }
.ccw-pop-item { padding:7px 10px; cursor:pointer; }
.ccw-pop-item:hover, .ccw-pop-item.sel { background:var(--dsw-alias-bg-layer-2,#f3f4f6); }
.ccw-pop-kind { display:inline-block; font-size:10px; line-height:1; padding:2px 5px; border-radius:4px; margin-right:6px; vertical-align:1px; background:rgba(37,99,235,.12); color:#2563eb; }
.ccw-pop-kind.skill { background:rgba(217,119,87,.16); color:#b45309; }
.ccw-resize { height:6px; cursor:ns-resize; margin:-4px 0 4px; border-radius:3px; flex:none; }
.ccw-resize:hover { background:var(--dsw-alias-bg-layer-2,#f3f4f6); }
.ccw-empty { color:var(--dsw-alias-label-secondary,#9ca3af); padding:20px; text-align:center; }
.ccw-dim { color:var(--dsw-alias-label-secondary,#9ca3af); font-size:11px; }
.ccw-status { display:inline-flex; align-items:center; gap:4px; font-size:11px; line-height:1; padding:3px 8px; border-radius:10px; white-space:nowrap; font-weight:500; }
.ccw-status.running, .ccw-status.starting { background:rgba(37,99,235,.14); color:#3b82f6; }
.ccw-status.done { background:rgba(34,197,94,.16); color:#22c55e; }
.ccw-status.error { background:rgba(239,68,68,.16); color:#ef4444; }
.ccw-status.stopped { background:rgba(107,114,128,.16); color:#6b7280; }
.ccw-status.idle { background:rgba(107,114,128,.12); color:#6b7280; }
.ccw-icbtn { border:none; background:transparent; cursor:pointer; padding:0 2px; font-size:12px; opacity:.55; line-height:1; }
.ccw-icbtn:hover { opacity:1; }
.ccw-srow-actions { display:none; flex:none; gap:2px; }
.ccw-srow:hover .ccw-srow-actions { display:inline-flex; }
.ccw-modal { position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; z-index:1000; }
.ccw-modal-box { width:min(480px,90vw); max-height:80vh; overflow-y:auto; background:var(--dsw-alias-bg-layer-1,#fff); border:1px solid var(--dsw-alias-border-l2,#d1d5db); border-radius:12px; padding:16px; box-shadow:0 10px 40px rgba(0,0,0,.25); }
.ccw-modal-head { font-weight:600; margin-bottom:12px; }
.ccw-modal-log { font-family:ui-monospace,monospace; font-size:11px; background:rgba(0,0,0,.04); padding:8px; border-radius:6px; white-space:pre-wrap; max-height:200px; overflow-y:auto; margin-top:8px; }
.ccw-modal-actions { margin-top:16px; display:flex; justify-content:flex-end; gap:8px; }
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
            out.push('<pre class="ccw-pre"' + (codeLang ? ' data-lang="' + escapeHtml(codeLang) + '"' : "") + '><code>' + codeBuf.join("\n") + "</code></pre>");
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
      if (codeBuf !== null) out.push('<pre class="ccw-pre"><code>' + codeBuf.join("\n") + "</code></pre>");
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
      const answered = msg.decision != null;
      const label = answered
        ? (msg.decision === "allow" ? "已允许" : msg.decision === "always" ? "已始终允许" : "已拒绝")
        : null;
      const inputText = typeof msg.input === "string" ? msg.input : JSON.stringify(msg.input || {});
      return React.createElement("div", { className: "ccw-msg ccw-ctl" },
        React.createElement("div", { className: "ccw-ctl-head" },
          "🔐 " + (msg.displayName || msg.toolName || "工具") + " 请求授权"),
        inputText ? React.createElement("div", { className: "ccw-ctl-input" }, String(inputText).slice(0, 2000)) : null,
        answered
          ? React.createElement("div", { className: "ccw-dim" }, "状态：" + label)
          : React.createElement("div", { className: "ccw-ctl-actions" },
              React.createElement("button", { className: "ccw-btn small primary", onClick: () => api("answer-control", { requestId: msg.requestId, behavior: "allow" }) }, "允许"),
              React.createElement("button", { className: "ccw-btn small", onClick: () => api("answer-control", { requestId: msg.requestId, behavior: "always" }) }, "始终允许"),
              React.createElement("button", { className: "ccw-btn small danger", onClick: () => api("answer-control", { requestId: msg.requestId, behavior: "deny" }) }, "拒绝"),
            ),
      );
    }

    function MessageView({ msg, live }) {
      const [thinkingOpen, setThinkingOpen] = React.useState(false);
      if (msg.role === "user") {
        return React.createElement("div", { className: "ccw-msg user" }, msg.text || "");
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
          React.createElement("div", { className: "ccw-md", dangerouslySetInnerHTML: { __html: renderMarkdown(msg.text) } }),
        );
      }
      if (msg.role === "tool") {
        return React.createElement("div", { className: "ccw-msg tool" },
          "🛠 " + (msg.name || "工具") + (msg.status === "running" ? "（运行中…）" : ""));
      }
      if (msg.role === "result") {
        return React.createElement("div", { className: "ccw-msg result" + (msg.isError ? " err" : "") },
          (msg.isError ? "⚠ " : "✓ ") + (msg.text || ""));
      }
      if (msg.role === "control") {
        return React.createElement(ControlCard, { msg: msg });
      }
      return null;
    }

    // ------------------------------------------------------------------
    // 侧边栏
    // ------------------------------------------------------------------
    function Sidebar({ snap, collapsed, toggleWs, onNew, onSwitch, onAddWs, onRenameSession, onDeleteSession, onRenameWs, onDeleteWs, width, pickingWs }) {
      const ws = (snap && snap.workspaces) || [];
      return React.createElement("div", { className: "ccw-sidebar", style: { width: width } },
        React.createElement("button", { className: "ccw-btn primary", style: { width: "100%", marginBottom: 8 }, onClick: onNew }, "＋ 新会话"),
        React.createElement("button", { className: "ccw-btn small", style: { width: "100%", marginBottom: 8 }, onClick: onAddWs, disabled: pickingWs }, pickingWs ? "正在打开目录选择…" : "＋ 添加工作区"),
        ws.map(function (w) {
          const open = !collapsed.has(w.path);
          return React.createElement("div", { className: "ccw-ws", key: w.path },
            React.createElement("div", { className: "ccw-ws-head" },
              React.createElement("span", { style: { cursor: "pointer", flex: 1, display: "flex", alignItems: "center", gap: 4, minWidth: 0 }, onClick: () => toggleWs(w.path) },
                React.createElement("span", null, open ? "▾" : "▸"),
                React.createElement("span", { className: "ccw-ws-name", title: w.path }, w.name || w.path),
              ),
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
    function StatusBadge({ status, startedAt, durationMs, now }) {
      const label = STATUS_LABEL[status] || String(status || "");
      let time = "";
      if (durationMs != null) time = formatDuration(durationMs);
      else if (startedAt != null && (status === "running" || status === "starting")) time = formatDuration(now - startedAt);
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
      const [pop, setPop] = React.useState(null);
      const [inputH, setInputH] = React.useState(null);
      const inputHRef = React.useRef(40);
      const msgsRef = React.useRef(null);
      const stickRef = React.useRef(true); // 是否“跟随底部”：用户上翻后置 false，回到底部附近再置 true
      const [showUpdate, setShowUpdate] = React.useState(false);
      const [updateInfo, setUpdateInfo] = React.useState(null);
      const [updating, setUpdating] = React.useState(false);
      const [pickingWs, setPickingWs] = React.useState(false);
      // 面板几何：left/top/width/height（初始居中）
      const [geom, setGeom] = React.useState(() => {
        const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
        const vh = typeof window !== "undefined" ? window.innerHeight : 900;
        const w = Math.max(480, Math.min(1100, vw - 24));
        const h = Math.max(360, Math.min(720, vh - 24));
        return { left: Math.max(0, (vw - w) / 2), top: Math.max(0, (vh - h) / 2), width: w, height: h };
      });
      const [maximized, setMaximized] = React.useState(false);
      const toggleMaximize = () => setMaximized((v) => !v);
      const [sidebarW, setSidebarW] = React.useState(240);

      // 活跃会话与运行状态（提前推导，供计时 effect 与渲染共用）
      const active = snap && snap.active;
      const running = !!(active && (active.status === "running" || active.status === "starting"));
      const [now, setNow] = React.useState(function () { return Date.now(); });

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
          reconnectTimer = setTimeout(function () { reconnectTimer = null; connect(); }, delay);
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
          sock.onopen = function () { if (alive) { setConn(true); attempt = 0; } };
          sock.onmessage = function (ev) {
            if (!alive) return;
            try { setSnap(JSON.parse(ev.data)); } catch (e) {}
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
      }, [open]);

      // 目录 + 模型
      React.useEffect(() => {
        if (!open) return;
        fetch(API + "/catalog", { cache: "no-store" }).then(r => r.json()).then(d => setCatalog(d)).catch(() => {});
        fetch(API + "/models", { cache: "no-store" }).then(r => r.json()).then(d => setModels((d && d.models) || [])).catch(() => {});
      }, [open]);

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

      // 自动滚到底部（仅当用户未上翻时；上翻后不再强制拉回底部）
      React.useEffect(() => {
        if (!stickRef.current) return;
        const el = msgsRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      }, [snap]);

      // 运行中每秒刷新一次“执行时长”
      React.useEffect(() => {
        if (!running) return;
        const t = setInterval(function () { setNow(Date.now()); }, 1000);
        return function () { clearInterval(t); };
      }, [running]);

      if (!open) return null;

      function send() {
        const text = (draft || "").trim();
        if (!text || running) return;
        const expanded = expandCommand(text, catalog);
        setDraft("");
        setPop(null);
        stickRef.current = true; // 发送后跟随底部
        api("send", { text: text, expanded: expanded, model: modelId, permissionMode: "default" });
      }

      function onSwitch(s) {
        stickRef.current = true; // 切换会话后跟随底部
        if (s.key) api("switch", { key: s.key });
        else if (s.id) api("switch", { sessionId: s.id });
      }

      function onNew() { stickRef.current = true; api("new-session", { permissionMode: "default" }); }

      async function onAddWs() {
        if (pickingWs) return;
        setPickingWs(true);
        try {
          const res = await api("pick-directory", {});
          if (res && res.ok && res.path) {
            await api("ws-add", { path: res.path });
          } else if (res && res.cancelled) {
            // 用户取消，不做任何事
          } else {
            // 原生选择器不可用/失败：回退到手动输入
            const p = window.prompt("输入工作区目录路径");
            if (p && p.trim()) await api("ws-add", { path: p.trim() });
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

      // ── 会话 / 工作区 重命名与删除 ──
      function onRenameSession(s) {
        const sid = s.id || "";
        if (!sid) return;
        const t = window.prompt("会话名称", s.title || "");
        if (t != null) api("session-rename", { sessionId: sid, title: t });
      }
      function onDeleteSession(s) {
        const sid = s.id || "";
        if (!sid) return;
        if (window.confirm("删除会话「" + (s.title || sid) + "」？")) api("session-delete", { sessionId: sid });
      }
      function onRenameWs(w) {
        const t = window.prompt("工作区显示名（不改目录路径）", w.name || "");
        if (t != null) api("ws-rename", { path: w.path, name: t });
      }
      function onDeleteWs(w) {
        if (window.confirm("从注册表移除工作区「" + (w.name || w.path) + "」？\n（不删除磁盘文件）")) api("ws-delete", { path: w.path });
      }

      function onInputChange(e) {
        const v = e.target.value;
        setDraft(v);
        if (v.startsWith("/") && catalog) {
          const q = v.replace(/^\/+/, "");
          const cmds = (catalog.commands || []).map(function (c) { return Object.assign({}, c, { kind: "command" }); });
          const skills = (catalog.skills || []).map(function (s) { return Object.assign({}, s, { kind: "skill" }); });
          const seen = new Set(cmds.map(function (c) { return c.name; }));
          const items = cmds
            .concat(skills.filter(function (s) { return !seen.has(s.name); }))
            .filter(function (c) { return c.name.indexOf(q) === 0; });
          setPop(items.length ? { items: items, sel: 0 } : null);
        } else setPop(null);
      }

      function pickCommand(c) {
        setDraft("/" + c.name + " ");
        setPop(null);
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
        };
        try { if (el.setPointerCapture) el.setPointerCapture(pointerId); } catch (e2) {}
        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerup", onUp);
        el.addEventListener("pointercancel", onUp);
        if (typeof document !== "undefined") { document.body.style.userSelect = "none"; document.body.style.cursor = "col-resize"; }
      }

      const messages = active && active.messages ? active.messages : [];

      const panelStyle = maximized
        ? { left: 8, top: 8, width: "calc(100vw - 16px)", height: "calc(100vh - 16px)" }
        : { left: geom.left, top: geom.top, width: geom.width, height: geom.height };

      return React.createElement("div", {
        className: "ccw",
        style: panelStyle,
      },
        React.createElement("div", { className: "ccw-titlebar", onPointerDown: beginDrag, title: maximized ? "" : "拖拽移动面板" },
          React.createElement("span", { className: "ccw-brand" }, React.createElement(ClaudeLogo, { size: 15 }), "Claude Code"),
          React.createElement("span", { className: "ccw-conn" }, conn ? "🟢 已连接" : "🔴 未连接"),
          React.createElement("div", { style: { flex: 1 } }),
          React.createElement("button", { className: "ccw-max", title: maximized ? "还原窗口" : "最大化窗口", onClick: toggleMaximize }, maximized ? "还原" : "最大化"),
          React.createElement("button", { className: "ccw-close", title: "关闭", onClick: () => setOpen(false) }, "✕"),
        ),
        maximized ? null : React.createElement("div", { className: "ccw-resize-se", onPointerDown: beginPanelResize, title: "拖拽调整面板尺寸" }),
        React.createElement("div", { className: "ccw-topbar" },
          React.createElement("span", { className: "ccw-dim" }, active ? (active.title || "会话") : "暂无活跃会话"),
          active ? React.createElement(StatusBadge, { status: active.status, startedAt: active.startedAt, durationMs: active.durationMs, now: now }) : null,
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
          React.createElement("button", { className: "ccw-btn small", onClick: openUpdate, title: "检查并更新本机 Claude Code" }, "🔄 检查更新"),
        ),
        React.createElement("div", { className: "ccw-body" },
          React.createElement(Sidebar, {
            snap: snap, collapsed: collapsed, toggleWs: toggleWs,
            onNew: onNew, onSwitch: onSwitch, onAddWs: onAddWs,
            onRenameSession: onRenameSession, onDeleteSession: onDeleteSession,
            onRenameWs: onRenameWs, onDeleteWs: onDeleteWs,
            width: sidebarW, pickingWs: pickingWs,
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
              messages.length === 0
                ? React.createElement("div", { className: "ccw-empty" }, "开始一个新会话，或从左侧选择历史会话")
                : messages.map(function (m, i) {
                    const live = running && i === messages.length - 1;
                    return React.createElement(MessageView, { key: m.id != null ? m.id : Math.random(), msg: m, live: live });
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
                "/" + c.name + " — " + (c.description || ""));
            }),
          ) : null,
          React.createElement("div", { className: "ccw-resize", onMouseDown: onResizeStart, title: "拖拽调整输入框高度" }),
          React.createElement("div", { className: "ccw-input-row" },
            React.createElement("textarea", {
              className: "ccw-input",
              style: inputH ? { height: inputH + "px" } : null,
              placeholder: "输入消息，Enter 发送，Shift+Enter 换行（/ 开头触发命令）",
              value: draft,
              onChange: onInputChange,
              onKeyDown: function (e) {
                if (e.key === "Escape") { setPop(null); return; }
                if (pop && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
                  e.preventDefault();
                  const dir = e.key === "ArrowDown" ? 1 : -1;
                  setPop(function (p) { return p ? { items: p.items, sel: (p.sel + dir + p.items.length) % p.items.length } : p; });
                  return;
                }
                if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
                  if (pop && pop.items[pop.sel]) { e.preventDefault(); pickCommand(pop.items[pop.sel]); return; }
                  e.preventDefault();
                  send();
                }
              },
            }),
            running
              ? React.createElement("button", { className: "ccw-btn danger", onClick: () => api("stop", {}) }, "⏹ 停止")
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
        title: "Claude Code 工作台",
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
