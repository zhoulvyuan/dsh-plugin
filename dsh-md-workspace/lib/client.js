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
      ".mdw-md pre{background:var(--dsw-alias-border-l1,rgba(0,0,0,.04));border:1px solid var(--dsw-alias-border-l2,#e5e7eb);border-radius:8px;padding:10px 12px;overflow:auto;max-height:300px}",
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
      ".mdw-fileicon{color:#94a3b8}.mdw-diricon{color:#60a5fa}",
      ".mdw-md .mdw-mermaid{margin:10px 0;overflow:auto;max-height:340px;background:var(--dsw-alias-border-l1,rgba(0,0,0,.04));border:1px solid var(--dsw-alias-border-l2,#e5e7eb);border-radius:8px;padding:8px}",
      ".mdw-md .mdw-mermaid svg{display:block;max-width:100%;height:auto}",
      ".mdw-md .mdw-mermaid .mdw-mermaid-node rect,.mdw-md .mdw-mermaid .mdw-mermaid-node ellipse,.mdw-md .mdw-mermaid .mdw-mermaid-node polygon,.mdw-md .mdw-mermaid .mdw-mermaid-node path{fill:var(--dsw-alias-bg-base,#fff);stroke:var(--dsw-alias-label-secondary,#6b7280);stroke-width:1.2}",
      ".mdw-md .mdw-mermaid .mdw-mermaid-node text{fill:var(--dsw-alias-label-primary,#1f2328);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}",
      ".mdw-md .mdw-mermaid .mdw-mermaid-edge{stroke:var(--dsw-alias-label-secondary,#6b7280);color:var(--dsw-alias-label-secondary,#6b7280);fill:none;stroke-width:1.4}",
      ".mdw-md .mdw-mermaid .mdw-mermaid-edge.mdw-dotted{stroke-dasharray:5 4}",
      ".mdw-md .mdw-mermaid .mdw-mermaid-edge.mdw-thick{stroke-width:2.4}",
      ".mdw-md .mdw-mermaid .mdw-mermaid-label{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;fill:var(--dsw-alias-label-secondary,#6b7280)}",
      ".mdw-md .mdw-mermaid .mdw-mermaid-subgraph rect{fill:var(--dsw-alias-border-l1,rgba(0,0,0,.03));stroke:var(--dsw-alias-border-l2,#d1d5db);stroke-dasharray:6 4}",
      ".mdw-md .mdw-mermaid .mdw-mermaid-subgraph-title{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;fill:var(--dsw-alias-label-secondary,#6b7280)}",
      ".mdw-grip{height:14px;margin:1px 0 4px;display:flex;align-items:center;justify-content:center;cursor:ns-resize;touch-action:none;user-select:none;-webkit-user-select:none;border-radius:4px}",
      ".mdw-grip::before{content:'';display:block;width:44px;height:3px;border-radius:3px;background:var(--dsw-alias-border-l3,#cbd5e1);transition:background .15s}",
      ".mdw-grip:hover::before,.mdw-grip:active::before{background:#2563eb}",
      ".mdw-grip:active{background:rgba(37,99,235,.08)}"
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
    /**
     * Reject javascript:/vbscript:/file: schemes, and non-image data: URIs.
     * Accepts http/https/mailto and data:image/<raster>;base64,… (base64 内嵌图).
     * Called with an already-escaped URL.
     */
    function unsafeScheme(escapedUrl) {
      if (typeof escapedUrl !== "string") return true;
      const probe = escapedUrl.replace(/&amp;/gi, "&");
      const m = /^\s*([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(probe);
      if (!m) return false; // relative or fragment — allow
      const scheme = m[1].toLowerCase();
      if (scheme === "http" || scheme === "https" || scheme === "mailto") return false;
      // data: URIs — allow only raster images (svg can embed scripts → blocked)
      if (scheme === "data") {
        return !/^data:image\/(png|jpe?g|gif|webp|bmp);base64,/i.test(probe.trim());
      }
      return true;
    }
    function inlineMarkdown(s) {
      let t = escapeHtml(s);
      // 行内代码先用占位符保护，避免被后续加粗/斜体/删除线正则误伤
      const codes = [];
      t = t.replace(/`([^`\n]+)`/g, (m, c) => {
        codes.push(c);
        return "\u0000" + (codes.length - 1) + "\u0000";
      });
      t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (m, alt, src) => {
        if (unsafeScheme(src)) return alt;
        return '<img alt="' + alt + '" src="' + src + '" />';
      });
      // 原生 <img> 标签（已经过 escapeHtml：&lt;img src=&quot;…&quot; …&gt;）。
      // 只保留 src / alt，其余属性（含事件处理器）一律丢弃，src 仍需过 unsafeScheme。
      t = t.replace(/&lt;img\s+([^<]*?)(\/?)&gt;/gi, (m, attrStr) => {
        const attrs = attrStr
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">");
        const srcM = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs);
        if (!srcM) return m; // 没有 src，保持原样
        const src = srcM[1] != null ? srcM[1] : srcM[2];
        if (unsafeScheme(src)) return "";
        const altM = /\balt\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs);
        const alt = altM ? (altM[1] != null ? altM[1] : altM[2]) : "";
        return '<img alt="' + escapeHtml(alt) + '" src="' + escapeHtml(src) + '" />';
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
      t = t.replace(/\u0000(\d+)\u0000/g, (m, idx) => "<code>" + codes[+idx] + "</code>");
      return t;
    }

    // ------------------------------------------------------------------
    // Mermaid flowchart renderer (self-contained, no external CDN).
    // Renders ```mermaid / ```flowchart fenced blocks as inline SVG.
    // ------------------------------------------------------------------
    function mermaidXml(s) {
      return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }
    function mermaidCleanLabel(s) {
      let t = String(s)
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&nbsp;/g, " ");
      t = t.replace(/<br\s*\/?>/gi, "\n");
      t = t.replace(/<[^>]*>/g, "");
      t = t.trim();
      if (t.length >= 2 && t.charAt(0) === '"' && t.charAt(t.length - 1) === '"') t = t.slice(1, -1);
      return t;
    }
    let mermaidMeasureCtx = null;
    function mermaidMeasure(text) {
      const s = String(text);
      if (typeof document === "undefined") return Math.max(8, s.length * 7);
      if (!mermaidMeasureCtx) {
        try { mermaidMeasureCtx = document.createElement("canvas").getContext("2d"); } catch (e) {}
      }
      if (mermaidMeasureCtx) {
        try {
          mermaidMeasureCtx.font = "12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
          return mermaidMeasureCtx.measureText(s).width;
        } catch (e) {}
      }
      return Math.max(8, s.length * 7);
    }
    const MERMAID_ID_RE = /^[A-Za-z0-9_][A-Za-z0-9_.]*/;
    const MERMAID_EDGE_RE = /^(?:==>|-->|---|--o|--x|-\.->|-\.-|\.->|--|-\.)/;
    function mermaidScanNode(line, pos) {
      const rest = line.slice(pos);
      const m = MERMAID_ID_RE.exec(rest);
      if (!m) return null;
      let end = pos + m[0].length;
      const tail = line.slice(end);
      let sm = null, shape = null, label = null;
      if ((sm = /^\[\[([^\]]*)\]\]/.exec(tail))) { shape = "subroutine"; label = sm[1]; }
      else if ((sm = /^\[\(([^)]*)\)\]/.exec(tail))) { shape = "cylinder"; label = sm[1]; }
      else if ((sm = /^\[([^\]]*)\]/.exec(tail))) { shape = "rect"; label = sm[1]; }
      else if ((sm = /^\(\(([^)]*)\)\)/.exec(tail))) { shape = "circle"; label = sm[1]; }
      else if ((sm = /^\(([^)]*)\)/.exec(tail))) { shape = "rounded"; label = sm[1]; }
      else if ((sm = /^\{([^}]*)\}/.exec(tail))) { shape = "diamond"; label = sm[1]; }
      else if ((sm = /^>([^\]]*)\]/.exec(tail))) { shape = "flag"; label = sm[1]; }
      if (sm) end += sm[0].length;
      return { id: m[0], shape: shape, label: label == null ? null : label.trim(), end: end };
    }
    function mermaidTokenize(line) {
      const tokens = [];
      let pos = 0;
      let pendingLabel = null;
      let pendingDotted = false;
      while (pos < line.length) {
        while (pos < line.length && /\s/.test(line[pos])) pos++;
        if (pos >= line.length) break;
        const e = MERMAID_EDGE_RE.exec(line.slice(pos));
        if (e) {
          const raw = e[0];
          pos += raw.length;
          let label = null;
          if (line[pos] === "|") {
            const close = line.indexOf("|", pos + 1);
            if (close !== -1) { label = line.slice(pos + 1, close).trim(); pos = close + 1; }
          }
          if (raw === "--" || raw === "-.") {
            pendingDotted = raw === "-.";
            if (label == null) {
              const rest = line.slice(pos);
              const nm = /(?:==>|-->|---|--o|--x|-\.->|-\.-|\.->)/.exec(rest.trimStart());
              if (nm) { label = rest.slice(0, rest.indexOf(nm[0])).trim(); pos += rest.indexOf(nm[0]); }
              else { label = rest.trim(); pos = line.length; }
            }
            pendingLabel = label || null;
            continue;
          }
          tokens.push({
            type: "edge",
            arrow: raw !== "---" && raw !== "-.-",
            dotted: pendingDotted || raw === "-.->" || raw === "-.-",
            thick: raw === "==>",
            label: label != null ? label : pendingLabel
          });
          pendingLabel = null;
          pendingDotted = false;
          continue;
        }
        const nd = mermaidScanNode(line, pos);
        if (nd) { tokens.push({ type: "node", id: nd.id, shape: nd.shape, label: nd.label }); pos = nd.end; continue; }
        pos++;
      }
      return tokens;
    }
    function parseMermaid(src) {
      const nodes = new Map();
      const edges = [];
      const subgraphs = new Map();
      const subStack = [];
      let direction = "TD";
      let order = 0;
      function ensureNode(id, label, shape) {
        let node = nodes.get(id);
        if (!node) {
          node = { id: id, label: label == null ? id : label, shape: shape || null, subgraphId: subStack.length ? subStack[subStack.length - 1] : null, order: order++ };
          nodes.set(id, node);
        } else {
          if (label != null) node.label = label;
          if (shape) node.shape = shape;
        }
        return node;
      }
      function processLine(line) {
        const tokens = mermaidTokenize(line);
        let lastNode = null;
        let pending = null;
        for (const tk of tokens) {
          if (tk.type === "node") {
            const node = ensureNode(tk.id, tk.label, tk.shape);
            if (pending) { pending.to = node.id; edges.push(pending); pending = null; }
            lastNode = node;
          } else if (tk.type === "edge" && lastNode) {
            pending = { from: lastNode.id, to: null, label: tk.label || "", arrow: tk.arrow, dotted: tk.dotted, thick: tk.thick };
          }
        }
      }
      for (const rawLine of String(src).replace(/\r\n?/g, "\n").split("\n")) {
        const line = rawLine.trim();
        if (!line || line.startsWith("%%")) continue;
        const dir = /^(?:flowchart|graph)\s+([A-Za-z]+)\s*$/i.exec(line);
        if (dir) {
          const d = dir[1].toUpperCase();
          if (d === "TB") direction = "TD";
          else if (d === "TD" || d === "BT" || d === "LR" || d === "RL") direction = d;
          continue;
        }
        if (/^subgraph\b/i.test(line)) {
          const sm = /^subgraph\s+([A-Za-z0-9_]+)(?:\s+\[([^\]]*)\])?\s*$/i.exec(line);
          let id, title;
          if (sm) { id = sm[1]; title = sm[2] != null ? sm[2] : sm[1]; }
          else {
            const rest = line.replace(/^subgraph\s+/i, "").trim();
            const bare = /^\[([^\]]*)\]$/.exec(rest);
            const t = bare ? bare[1] : rest;
            id = "subgraph" + (subgraphs.size + 1);
            title = t || id;
          }
          subgraphs.set(id, { id: id, title: title, parentId: subStack.length ? subStack[subStack.length - 1] : null });
          subStack.push(id);
          continue;
        }
        if (/^end\s*$/i.test(line)) { subStack.pop(); continue; }
        if (/^(classDef|class\s|style\s|linkStyle\s|click\s|direction\s|accTitle|accDescr|title\s)/i.test(line)) continue;
        for (const seg of line.split(";")) if (seg.trim()) processLine(seg.trim());
      }
      return { nodes: nodes, edges: edges, subgraphs: subgraphs, direction: direction };
    }
    let mermaidSeq = 0;
    function renderMermaid(src) {
      try {
        const p = parseMermaid(src);
        if (!p.nodes.size) return null;
        const hasExplicit = [...p.nodes.values()].some((n) => n.shape != null);
        if (!p.edges.length && !hasExplicit) return null;
        const nodes = [...p.nodes.values()];
        const nodeById = new Map(nodes.map((n) => [n.id, n]));
        const MARGIN = 16, GAP_X = 46, GAP_Y = 30, PAD_X = 12, PAD_Y = 7, LINE_H = 15, FONT = 12;
        for (const n of nodes) {
          const lines = (mermaidCleanLabel(n.label) || n.id).split("\n").map((s) => s.trim() || " ");
          let maxW = 0;
          for (const ln of lines) maxW = Math.max(maxW, mermaidMeasure(ln));
          let w = maxW + PAD_X * 2;
          let h = lines.length * LINE_H + PAD_Y * 2;
          if (n.shape === "diamond") { w = Math.max(w + 22, 64); h = Math.max(h + 14, 46); }
          else if (n.shape === "circle") { const d = Math.max(w, h) + PAD_X; w = d; h = d; }
          n.lines = lines; n.w = Math.max(36, w); n.h = Math.max(28, h);
        }
        const incoming = new Map(), adj = new Map();
        for (const n of nodes) { incoming.set(n.id, 0); adj.set(n.id, []); }
        for (const e of p.edges) {
          if (!adj.has(e.from) || !adj.has(e.to)) continue;
          adj.get(e.from).push(e.to);
          incoming.set(e.to, (incoming.get(e.to) || 0) + 1);
        }
        const rank = new Map(), indeg = new Map(incoming);
        for (const n of nodes) rank.set(n.id, 0);
        const queue = [];
        for (const n of nodes) if (indeg.get(n.id) === 0) queue.push(n.id);
        while (queue.length) {
          const id = queue.shift();
          for (const t of adj.get(id) || []) {
            rank.set(t, Math.max(rank.get(t), rank.get(id) + 1));
            indeg.set(t, indeg.get(t) - 1);
            if (indeg.get(t) === 0) queue.push(t);
          }
        }
        const layers = [];
        for (const n of nodes) { const r = rank.get(n.id); (layers[r] = layers[r] || []).push(n); }
        for (let r = 0; r < layers.length; r++) if (!layers[r]) layers[r] = [];
        for (const l of layers) l.sort((a, b) => a.order - b.order);
        function barycenter(id, pos) {
          let sum = 0, cnt = 0;
          for (const e of p.edges) {
            if (e.to === id && pos.has(e.from)) { sum += pos.get(e.from); cnt++; }
            else if (e.from === id && pos.has(e.to)) { sum += pos.get(e.to); cnt++; }
          }
          return cnt ? sum / cnt : 1e9;
        }
        for (let iter = 0; iter < 5; iter++) {
          for (let i = 0; i < layers.length - 1; i++) {
            const pos = new Map();
            layers[i].forEach((n, idx) => pos.set(n.id, idx));
            layers[i + 1].sort((a, b) => barycenter(a.id, pos) - barycenter(b.id, pos) || a.order - b.order);
          }
        }
        const vertical = p.direction === "TD" || p.direction === "BT";
        const nodeXY = new Map();
        let cursor = 0;
        for (let ri = 0; ri < layers.length; ri++) {
          const l = layers[ri];
          let cross = 0;
          for (const n of l) cross += (vertical ? n.w : n.h);
          cross += GAP_Y * Math.max(0, l.length - 1);
          let rankSize = 0;
          for (const n of l) rankSize = Math.max(rankSize, vertical ? n.h : n.w);
          let c = -cross / 2;
          for (const n of l) {
            const size = vertical ? n.w : n.h;
            let cx, cy;
            if (vertical) { cx = c + size / 2; cy = cursor + rankSize / 2; }
            else { cx = cursor + rankSize / 2; cy = c + size / 2; }
            nodeXY.set(n.id, { cx: cx, cy: cy });
            c += size + GAP_Y;
          }
          cursor += rankSize + GAP_X;
        }
        function subDepth(s) { let d = 0, cur = s; while (cur.parentId) { d++; cur = p.subgraphs.get(cur.parentId); } return d; }
        const subOrder = [...p.subgraphs.values()].sort((a, b) => subDepth(a) - subDepth(b));
        const subBoxes = [];
        for (const s of subOrder) {
          const members = [];
          for (const n of nodes) {
            let cur = n.subgraphId;
            while (cur) { if (cur === s.id) { members.push(n); break; } cur = p.subgraphs.get(cur) ? p.subgraphs.get(cur).parentId : null; }
          }
          if (!members.length) continue;
          let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
          for (const n of members) {
            const g = nodeXY.get(n.id);
            x1 = Math.min(x1, g.cx - n.w / 2); x2 = Math.max(x2, g.cx + n.w / 2);
            y1 = Math.min(y1, g.cy - n.h / 2); y2 = Math.max(y2, g.cy + n.h / 2);
          }
          const pad = 10, titleH = 16;
          subBoxes.push({ x: x1 - pad, y: y1 - pad - titleH, w: (x2 - x1) + pad * 2, h: (y2 - y1) + pad * 2 + titleH, title: mermaidCleanLabel(s.title) || s.id });
        }
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const n of nodes) {
          const g = nodeXY.get(n.id);
          minX = Math.min(minX, g.cx - n.w / 2); maxX = Math.max(maxX, g.cx + n.w / 2);
          minY = Math.min(minY, g.cy - n.h / 2); maxY = Math.max(maxY, g.cy + n.h / 2);
        }
        for (const b of subBoxes) { minX = Math.min(minX, b.x); minY = Math.min(minY, b.y); maxX = Math.max(maxX, b.x + b.w); maxY = Math.max(maxY, b.y + b.h); }
        if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 120; maxY = 60; }
        const ox = MARGIN - minX, oy = MARGIN - minY;
        const W = Math.ceil(maxX - minX) + MARGIN * 2;
        const H = Math.ceil(maxY - minY) + MARGIN * 2;
        function fmt(v) { return Math.round(v * 10) / 10; }
        function edgeGeom(aId, bId) {
          const ga = nodeXY.get(aId), gb = nodeXY.get(bId);
          const ha = nodeById.get(aId), hb = nodeById.get(bId);
          let dx = gb.cx - ga.cx, dy = gb.cy - ga.cy;
          const len = Math.hypot(dx, dy) || 1;
          dx /= len; dy /= len;
          function tOut(hw, hh, ddx, ddy) {
            const tx = ddx !== 0 ? hw / Math.abs(ddx) : Infinity;
            const ty = ddy !== 0 ? hh / Math.abs(ddy) : Infinity;
            return Math.min(tx, ty);
          }
          const ta = tOut(ha.w / 2, ha.h / 2, dx, dy);
          const tb = tOut(hb.w / 2, hb.h / 2, dx, dy);
          return { x1: ga.cx + dx * ta, y1: ga.cy + dy * ta, x2: gb.cx - dx * tb, y2: gb.cy - dy * tb };
        }
        function nodeSvg(n) {
          const g = nodeXY.get(n.id);
          const cx = g.cx + ox, cy = g.cy + oy;
          const w = n.w, h = n.h;
          let shapes;
          if (n.shape === "circle") shapes = '<ellipse cx="' + fmt(cx) + '" cy="' + fmt(cy) + '" rx="' + fmt(w / 2) + '" ry="' + fmt(h / 2) + '"/>';
          else if (n.shape === "rounded") shapes = '<rect x="' + fmt(cx - w / 2) + '" y="' + fmt(cy - h / 2) + '" width="' + fmt(w) + '" height="' + fmt(h) + '" rx="' + fmt(h / 2) + '"/>';
          else if (n.shape === "diamond") shapes = '<polygon points="' + fmt(cx) + ',' + fmt(cy - h / 2) + ' ' + fmt(cx + w / 2) + ',' + fmt(cy) + ' ' + fmt(cx) + ',' + fmt(cy + h / 2) + ' ' + fmt(cx - w / 2) + ',' + fmt(cy) + '"/>';
          else if (n.shape === "subroutine") shapes = '<rect x="' + fmt(cx - w / 2) + '" y="' + fmt(cy - h / 2) + '" width="' + fmt(w) + '" height="' + fmt(h) + '" rx="3"/><rect x="' + fmt(cx - w / 2 + 3) + '" y="' + fmt(cy - h / 2 + 3) + '" width="' + fmt(w - 6) + '" height="' + fmt(h - 6) + '" rx="2"/>';
          else if (n.shape === "cylinder") shapes = '<path d="M ' + fmt(cx - w / 2) + ' ' + fmt(cy - h / 2 + 5) + ' a ' + fmt(w / 2) + ' 5 0 0 0 ' + fmt(w) + ' 0 l 0 ' + fmt(h - 10) + ' a ' + fmt(w / 2) + ' 5 0 0 0 ' + fmt(-w) + ' 0 z"/><ellipse cx="' + fmt(cx) + '" cy="' + fmt(cy - h / 2 + 5) + '" rx="' + fmt(w / 2) + '" ry="5"/>';
          else shapes = '<rect x="' + fmt(cx - w / 2) + '" y="' + fmt(cy - h / 2) + '" width="' + fmt(w) + '" height="' + fmt(h) + '" rx="4"/>';
          if (n.shape === "flag") shapes += '<polygon points="' + fmt(cx - w / 2) + ',' + fmt(cy - h / 2) + ' ' + fmt(cx - w / 2 + w) + ',' + fmt(cy) + ' ' + fmt(cx - w / 2) + ',' + fmt(cy + h / 2) + '"/>';
          const startY = cy - (n.lines.length - 1) * LINE_H / 2 + FONT * 0.35;
          const tspans = n.lines.map((ln, i) => '<tspan x="' + fmt(cx) + '" y="' + fmt(startY + i * LINE_H) + '">' + mermaidXml(ln) + '</tspan>').join("");
          return '<g class="mdw-mermaid-node">' + shapes + '<text text-anchor="middle" font-size="' + FONT + '">' + tspans + '</text></g>';
        }
        const arrowId = "mdw-mermaid-arrow-" + (++mermaidSeq);
        let svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">';
        svg += '<defs><marker id="' + arrowId + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7.5" markerHeight="7.5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>';
        for (const b of subBoxes) {
          svg += '<g class="mdw-mermaid-subgraph"><rect x="' + fmt(b.x + ox) + '" y="' + fmt(b.y + oy) + '" width="' + fmt(b.w) + '" height="' + fmt(b.h) + '" rx="6"/><text class="mdw-mermaid-subgraph-title" x="' + fmt(b.x + ox + 8) + '" y="' + fmt(b.y + oy + 12) + '">' + mermaidXml(b.title) + '</text></g>';
        }
        for (const e of p.edges) {
          const a = nodeById.get(e.from), b = nodeById.get(e.to);
          if (!a || !b) continue;
          const g = edgeGeom(e.from, e.to);
          const cls = "mdw-mermaid-edge" + (e.dotted ? " mdw-dotted" : "") + (e.thick ? " mdw-thick" : "");
          const marker = e.arrow ? ' marker-end="url(#' + arrowId + ')"' : "";
          svg += '<path class="' + cls + '" d="M ' + fmt(g.x1 + ox) + ' ' + fmt(g.y1 + oy) + ' L ' + fmt(g.x2 + ox) + ' ' + fmt(g.y2 + oy) + '"' + marker + '/>';
          if (e.label) {
            const label = mermaidCleanLabel(e.label);
            if (label) {
              const mx = (g.x1 + g.x2) / 2, my = (g.y1 + g.y2) / 2;
              const lw = mermaidMeasure(label) + 8;
              svg += '<rect x="' + fmt(mx + ox - lw / 2) + '" y="' + fmt(my + oy - 8) + '" width="' + fmt(lw) + '" height="16" fill="var(--dsw-alias-bg-base,#fff)"/><text class="mdw-mermaid-label" text-anchor="middle" x="' + fmt(mx + ox) + '" y="' + fmt(my + oy + 3.5) + '">' + mermaidXml(label) + '</text>';
            }
          }
        }
        for (const n of nodes) svg += nodeSvg(n);
        svg += "</svg>";
        return '<div class="mdw-mermaid">' + svg + "</div>";
      } catch (e) {
        return null;
      }
    }
    function splitTableRow(line) {
      let s = line.trim();
      if (s.startsWith("|")) s = s.slice(1);
      if (s.endsWith("|")) s = s.slice(0, -1);
      return s.split("|").map((c) => c.trim());
    }
    /** Indented code block: a line indented by 4+ spaces or a single tab. */
    function isIndentedCode(l) {
      return /^\t/.test(l) || /^ {4}/.test(l);
    }
    function stripCodeIndent(l) {
      if (/^\t/.test(l)) return l.slice(1);
      return l.replace(/^ {1,4}/, "");
    }
    function renderMarkdown(src) {
      const lines = String(src ?? "").replace(/\r\n?/g, "\n").split("\n");
      const out = [];
      let i = 0;
      while (i < lines.length) {
        const line = lines[i];
        const fence = line.match(/^\s{0,3}(`{3,}|~{3,})(.*)$/);
        if (fence) {
          const fenceChar = fence[1][0];
          const fenceLen = fence[1].length;
          const lang = fence[2].trim();
          const buf = [];
          i++;
          while (i < lines.length) {
            const close = lines[i].match(/^\s{0,3}(`{3,}|~{3,})\s*$/);
            if (close && close[1][0] === fenceChar && close[1].length >= fenceLen) break;
            buf.push(lines[i]);
            i++;
          }
          i++;
          const codeText = buf.join("\n");
          if (/^(mermaid|flowchart|graph)$/i.test(lang)) {
            const diagram = renderMermaid(codeText);
            if (diagram) { out.push(diagram + '<div class="mdw-grip" title="拖动调整高度"></div>'); continue; }
          }
          out.push("<pre><code" + (lang ? ' class="language-' + escapeHtml(lang) + '"' : "") + ">" + escapeHtml(codeText) + "</code></pre>" + '<div class="mdw-grip" title="拖动调整高度"></div>');
          continue;
        }
        if (line.trim() === "") { i++; continue; }
        // 缩进代码块（4 空格或 1 Tab）：整块收集，去掉缩进，渲染为 <pre><code>
        if (isIndentedCode(line)) {
          const buf = [];
          while (i < lines.length) {
            const l = lines[i];
            if (l.trim() === "") { buf.push(""); i++; continue; }
            if (!isIndentedCode(l)) break;
            buf.push(stripCodeIndent(l));
            i++;
          }
          while (buf.length && buf[buf.length - 1] === "") buf.pop();
          if (buf.length) out.push("<pre><code>" + escapeHtml(buf.join("\n")) + "</code></pre>" + '<div class="mdw-grip" title="拖动调整高度"></div>');
          continue;
        }
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
          if (/^\s{0,3}(`{3,}|~{3,})/.test(l)) break;
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

      // 代码块 / Mermaid 图：拖动 .mdw-grip 把手纵向调整高度（事件委托，兼容 dangerouslySetInnerHTML）。
      React.useEffect(() => {
        if (typeof document === "undefined") return;
        const onDown = (e) => {
          const grip = e.target && e.target.closest ? e.target.closest(".mdw-grip") : null;
          if (!grip) return;
          const target = grip.previousElementSibling;
          if (!target) return;
          if (!(target.matches && (target.matches("pre") || target.matches(".mdw-mermaid")))) return;
          e.preventDefault();
          const pointerId = e.pointerId;
          const startY = e.clientY;
          const startH = target.getBoundingClientRect().height;
          const MIN_H = 80;
          const maxH = () => (typeof window !== "undefined" ? Math.max(200, window.innerHeight * 0.9) : 1000);
          const onMove = (ev) => {
            const h = Math.max(MIN_H, Math.min(maxH(), startH + (ev.clientY - startY)));
            target.style.maxHeight = "none";
            target.style.height = h + "px";
          };
          const onUp = () => {
            document.removeEventListener("pointermove", onMove);
            document.removeEventListener("pointerup", onUp);
            document.removeEventListener("pointercancel", onUp);
            try { if (grip.releasePointerCapture) grip.releasePointerCapture(pointerId); } catch {}
            if (typeof document !== "undefined") { document.body.style.userSelect = ""; document.body.style.cursor = ""; }
          };
          try { if (grip.setPointerCapture) grip.setPointerCapture(pointerId); } catch {}
          document.addEventListener("pointermove", onMove);
          document.addEventListener("pointerup", onUp);
          document.addEventListener("pointercancel", onUp);
          if (typeof document !== "undefined") { document.body.style.userSelect = "none"; document.body.style.cursor = "ns-resize"; }
        };
        document.addEventListener("pointerdown", onDown);
        return () => document.removeEventListener("pointerdown", onDown);
      }, []);

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
