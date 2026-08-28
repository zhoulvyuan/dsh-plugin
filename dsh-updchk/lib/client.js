window.__ModuleLoader__.load({
  id: "dsh-updchk",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");

    // ------------------------------------------------------------------
    // CSS
    // ------------------------------------------------------------------
    const css = [
      ".updk-panel{position:absolute;top:12px;right:12px;width:480px;max-height:calc(100vh - 24px);display:flex;flex-direction:column;background:var(--dsw-alias-bg-base,#fff);border:1px solid var(--dsw-alias-border-l2,#e5e7eb);border-radius:12px;box-shadow:0 16px 48px rgba(0,0,0,.18);overflow:hidden;pointer-events:auto;z-index:30;color:var(--dsw-alias-label-primary,#1f2328);font-size:13px}",
      ".updk-panel *{box-sizing:border-box}",
      ".updk-head{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--dsw-alias-border-l2,#e5e7eb);flex:none}",
      ".updk-title{font-weight:600;font-size:14px;margin-right:auto;white-space:nowrap}",
      ".updk-close{border:none;background:transparent;cursor:pointer;color:var(--dsw-alias-label-secondary,#6b7280);font-size:18px;line-height:1;padding:2px 6px;border-radius:6px}",
      ".updk-close:hover{background:var(--dsw-alias-button-floating-hover,rgba(0,0,0,.08))}",
      ".updk-body{flex:1;min-height:0;overflow:auto;padding:12px 14px;line-height:1.6}",
      ".updk-body .row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}",
      ".updk-body button{cursor:pointer;border-radius:6px;border:1px solid var(--dsw-alias-border-l2,#ccc);background:var(--dsw-alias-bg-base,#fff);color:inherit;padding:4px 12px;font-size:13px}",
      ".updk-body button.primary{background:#2563eb;border-color:#2563eb;color:#fff}",
      ".updk-body button.danger{background:#dc2626;border-color:#dc2626;color:#fff}",
      ".updk-body button:disabled{opacity:.5;cursor:not-allowed}",
      ".updk-body .muted{opacity:.65}",
      ".updk-body .warn{border-left:3px solid #f59e0b;background:rgba(245,158,11,.08);padding:6px 10px;margin:6px 0;border-radius:4px}",
      ".updk-body .dangerbox{border-left:3px solid #dc2626;background:rgba(220,38,38,.08);padding:6px 10px;margin:6px 0;border-radius:4px}",
      ".updk-body .okbox{border-left:3px solid #16a34a;background:rgba(22,163,74,.08);padding:6px 10px;margin:6px 0;border-radius:4px}",
      ".updk-body .infobox{border-left:3px solid #2563eb;background:rgba(37,99,235,.08);padding:6px 10px;margin:6px 0;border-radius:4px}",
      ".updk-body ul{margin:4px 0;padding-left:18px}",
      ".updk-body pre{white-space:pre-wrap;word-break:break-all;max-height:180px;overflow:auto;background:rgba(127,127,127,.08);padding:8px;border-radius:6px;font-size:12px}",
      ".updk-steps{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0}",
      ".updk-step{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2,#d1d5db);font-size:12px;color:var(--dsw-alias-label-secondary,#6b7280)}",
      ".updk-step.active{background:#2563eb;border-color:#2563eb;color:#fff}",
      ".updk-step.done{background:rgba(22,163,74,.12);border-color:#16a34a;color:#15803d}",
      ".updk-step.fail{background:rgba(220,38,38,.12);border-color:#dc2626;color:#b91c1c}",
      ".updk-meter{height:6px;border-radius:999px;background:rgba(127,127,127,.15);overflow:hidden;margin:6px 0}",
      ".updk-meter > i{display:block;height:100%;width:40%;border-radius:999px;background:#2563eb;animation:updk-slide 1.2s ease-in-out infinite}",
      "@keyframes updk-slide{0%{margin-left:-40%}100%{margin-left:100%}}",
      ".updk-stats{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--dsw-alias-label-secondary,#6b7280)}",
      ".updk-stats b{color:var(--dsw-alias-label-primary,#1f2328);font-variant-numeric:tabular-nums}",
    ].join("\n");
    if (typeof document !== "undefined" && document.head) {
      const style = document.createElement("style");
      style.setAttribute("data-updk", "");
      style.textContent = css;
      document.head.appendChild(style);
    }

    // ------------------------------------------------------------------
    // Shared visibility store (footer toggle <-> overlay panel)
    // ------------------------------------------------------------------
    let panelOpen = false;
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
    // API client (host REST routes)
    // ------------------------------------------------------------------
    async function api(path, body) {
      const res = await fetch(path, body === undefined ? { method: "GET" } : {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      return await res.json();
    }

    function fmtElapsed(ms) {
      const s = Math.floor((ms || 0) / 1000);
      const m = Math.floor(s / 60);
      const r = s % 60;
      return (m > 0 ? m + "分" : "") + (r < 10 ? "0" : "") + r + "秒";
    }

    function fmtBytes(n) {
      if (n < 1024) return n + " B";
      if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
      return (n / 1024 / 1024).toFixed(2) + " MB";
    }

    const STAGES = ["queued", "preparing", "preflight", "installing", "validating", "switching", "done"];
    const STAGE_LABEL = {
      queued: "排队", preparing: "准备", preflight: "预检",
      installing: "安装", validating: "校验", switching: "切换指针", done: "完成",
    };

    // ------------------------------------------------------------------
    // Panel
    // ------------------------------------------------------------------
    function UpdPanel() {
      const [status, setStatus] = React.useState(null);
      const [check, setCheck] = React.useState(null);
      const [isBusy, setBusy] = React.useState(false);
      const [askConfirm, setConfirming] = React.useState(false);
      const [isDeclined, setDeclined] = React.useState(false);
      const [jobId, setJobId] = React.useState(null);
      const [progress, setProgress] = React.useState(null);
      const [rollbackNote, setRollbackNote] = React.useState(null);
      const pollRef = React.useRef(null);

      React.useEffect(() => {
        api("/updk/status").then(setStatus, (e) => setStatus({ ok: false, error: String(e) }));
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
      }, []);

      const clearPoll = () => {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      };

      const doCheck = () => {
        setBusy(true); setCheck(null); setConfirming(false); setDeclined(false);
        setJobId(null); setProgress(null); clearPoll();
        api("/updk/check").then((r) => { setCheck(r); setBusy(false); }, (e) => {
          setCheck({ ok: false, error: String(e) }); setBusy(false);
        });
      };

      const startUpdate = () => {
        if (!check || !check.ok) return;
        setConfirming(false); setDeclined(false); setProgress(null);
        api("/updk/update", { version: check.target }).then((r) => {
          if (r && r.ok && r.job) {
            setJobId(r.job);
            clearPoll();
            pollRef.current = setInterval(() => {
              api("/updk/progress?job=" + r.job).then((p) => {
                setProgress(p);
                if (p && (p.status === "done" || p.status === "failed" || p.status === "killed")) {
                  clearPoll();
                  setBusy(false);
                }
              }, () => { /* transient poll error, keep going */ });
            }, 1000);
          } else {
            setProgress({ status: "failed", error: (r && r.error) || "启动更新失败" });
          }
        }, (e) => setProgress({ status: "failed", error: String(e) }));
      };

      const doCancel = () => {
        if (!jobId) return;
        api("/updk/cancel", { job: jobId }).then(() => {
          clearPoll();
          setProgress((p) => ({ ...(p || {}), status: "killed", error: "已中止更新" }));
          setBusy(false);
        }, () => {});
      };

      const el = React.createElement;
      const risk = check && check.ok && check.risk ? check.risk : null;
      const riskHigh = risk !== null && risk.level === "high";
      const riskMedium = risk !== null && risk.level === "medium";
      const crossLine = risk !== null && risk.crossLine;
      const running = progress !== null && progress.status === "running";
      const stall = running && progress.stallMs > 45000;
      const activeStageIdx = progress ? STAGES.indexOf(progress.stage) : -1;

      return el("div", { className: "updk-panel" },
        el("div", { className: "updk-head" },
          el("span", { className: "updk-title" }, "DSH 检查更新"),
          el("button", { className: "updk-close", onClick: () => setOpen(false), "aria-label": "关闭" }, "×"),
        ),
        el("div", { className: "updk-body" },

          // ---- status row ----
          status === null ? el("div", { className: "muted" }, "正在读取当前版本…") : null,
          status !== null && !status.ok ? el("div", { className: "dangerbox" }, "读取版本失败：" + (status.error || "未知错误")) : null,
          status !== null && status.ok ? [
            el("div", { key: "row", className: "row" },
              el("span", null, "当前版本：", el("b", null, status.current)),
              el("span", { className: "muted" }, "（" + (status.customPluginCount != null ? status.customPluginCount : status.pluginCount) + " 个自定义插件）"),
              status.webPortListening ? el("span", { className: "muted" }, "网页端口 " + (status.webPort != null ? status.webPort : "") + " 已监听") : null,
              !running ? el("button", { onClick: doCheck, disabled: isBusy }, isBusy ? "检查中…" : "检查更新") : null,
              status.previousVersion ? el("button", {
                onClick: () => {
                  api("/updk/rollback").then((r) => {
                    if (r && r.ok) { setRollbackNote(r.note || "已回滚"); api("/updk/status").then(setStatus); }
                    else setRollbackNote("回滚失败：" + ((r && r.error) || "未知错误"));
                  }, (e) => setRollbackNote("回滚失败：" + String(e)));
                },
                disabled: isBusy,
              }, "回滚到 " + status.previousVersion) : null,
            ),
            status.pendingRestart ? el("div", { key: "pending", className: "infobox", style: { marginTop: 4 } },
              "已切换指针到 ", el("b", null, status.current), "，但当前进程仍在运行 ", el("b", null, status.runningVersion), "。请重启 dsh 使其生效。") : null,
          ] : null,
          rollbackNote ? el("div", { className: rollbackNote.indexOf("失败") >= 0 ? "dangerbox" : "okbox" }, rollbackNote) : null,

          // ---- check result ----
          check !== null && !check.ok ? el("div", { className: "dangerbox" }, "检查失败：" + (check.error || "未知错误")) : null,
          check !== null && check.ok && !check.hasUpdate ? el("div", { className: "okbox" }, "已是最新版本（" + check.current + "）") : null,

          check !== null && check.ok && check.hasUpdate && jobId === null ? [
            el("div", { key: "found", style: { marginTop: 8 } },
              "发现新版本：", el("b", null, check.target), "（当前 " + check.current + "）",
              check.next && check.next === check.target ? el("span", { className: "muted" }, " · next 通道") : null,
            ),
            risk !== null ? el("div", { key: "risk", className: riskHigh ? "dangerbox" : riskMedium ? "warn" : "okbox" },
              el("div", { style: { fontWeight: 600 } },
                riskHigh ? "⚠ 兼容性风险：高" : riskMedium ? "⚠ 兼容性风险：中" : "未发现兼容性风险"),
              el("ul", null, risk.items.map((it, i) =>
                el("li", { key: i }, (it.severity === "high" ? "🔴 " : it.severity === "medium" ? "🟠 " : "🟢 ") + it.text),
              )),
            ) : null,
            crossLine && risk.crossLineNote ? el("div", { key: "cross", className: "warn" }, risk.crossLineNote) : null,
            !isDeclined ? el("div", { key: "decide", className: "row", style: { marginTop: 6 } },
              !askConfirm ? el("button", {
                className: riskHigh || crossLine ? "danger" : "primary",
                onClick: () => { if (riskHigh || riskMedium || crossLine) setConfirming(true); else startUpdate(); },
                disabled: isBusy,
              }, riskHigh || crossLine ? "仍要更新到 " + check.target : "更新到 " + check.target) : null,
              askConfirm ? el("span", null,
                el("b", null, "确认承担上述风险并更新？"), " ",
                el("button", { className: "danger", onClick: startUpdate, disabled: isBusy }, "确认更新"), " ",
                el("button", { onClick: () => setConfirming(false), disabled: isBusy }, "取消"),
              ) : null,
              !askConfirm ? el("button", { onClick: () => setDeclined(true), disabled: isBusy }, "暂不更新") : null,
            ) : null,
            isDeclined ? el("div", { key: "declined", className: "muted", style: { marginTop: 6 } }, "已跳过本次更新。") : null,
          ] : null,

          // ---- progress view ----
          progress !== null && (progress.status === "running" || progress.status === "done" || progress.status === "failed" || progress.status === "killed") ? [
            el("div", { key: "steps", className: "updk-steps" },
              STAGES.filter((s) => s !== "done").map((s) => {
                const idx = STAGES.indexOf(s);
                const cls = progress.stage === s ? "active" : (activeStageIdx > idx || progress.status === "done" ? "done" : "");
                return el("span", { key: s, className: "updk-step" + (cls ? " " + cls : "") }, STAGE_LABEL[s]);
              }),
            ),
            running ? el("div", { key: "meter", className: "updk-meter" }, el("i")) : null,
            el("div", { key: "stats", className: "updk-stats", style: { marginTop: 4 } },
              progress.engine ? el("span", null, "引擎 ", el("b", null, progress.engine)) : null,
              el("span", null, "已运行 ", el("b", null, fmtElapsed(progress.elapsedMs || 0))),
              el("span", null, "最近输出 ", el("b", null, fmtElapsed(progress.stallMs || 0)), " 前"),
              el("span", null, "已捕获 ", el("b", null, fmtBytes(progress.bytes || 0))),
            ),
            running && stall ? el("div", { key: "stall", className: "warn" },
              "⏳ 长时间无新输出，疑似卡住（依赖解析死循环特征）；3 分钟仍无输出将自动中止，也可手动中止。") : null,
            running && !stall && (progress.bytes || 0) > 0 ? el("div", { key: "alive", className: "muted" },
              "📦 安装进行中，输出持续更新（慢不等于卡住）。") : null,
            running ? el("div", { key: "cancel", className: "row", style: { marginTop: 6 } },
              el("button", { className: "danger", onClick: doCancel }, "中止更新（保留旧版）"),
            ) : null,
            progress.status === "done" ? el("div", { key: "done", className: "okbox" },
              "✅ 已准备 ", el("b", null, progress.installed || ""), "。",
              progress.note ? " " + progress.note : "请重启 dsh 生效（旧版可回滚）。") : null,
            progress.status === "failed" ? el("div", { key: "fail", className: "dangerbox" },
              "❌ 更新失败：" + (progress.error || "未知错误"), " 旧版不受影响。") : null,
            progress.status === "killed" ? el("div", { key: "killed", className: "warn" },
              "⏹ 已中止更新，旧版不受影响。") : null,
            progress.logTail ? el("pre", { key: "log" }, progress.logTail) : null,
            (progress.status === "done" || progress.status === "failed" || progress.status === "killed")
              ? el("button", { key: "reset", style: { marginTop: 6 }, onClick: doCheck }, "重新检查") : null,
          ] : null,
        ),
      );
    }

    // ------------------------------------------------------------------
    // Overlay occupant: renders the panel only when open
    // ------------------------------------------------------------------
    function UpdOverlay() {
      const open = usePanelOpen();
      return open ? React.createElement(UpdPanel) : null;
    }

    // ------------------------------------------------------------------
    // Footer toggle button
    // ------------------------------------------------------------------
    const RefreshIcon = React.createElement("svg", { width: 14, height: 14, viewBox: "0 0 16 16", fill: "currentColor", "aria-hidden": true },
      React.createElement("path", { d: "M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z" }),
      React.createElement("path", { d: "M8 4.466V.534a.53.53 0 0 1 .907-.373l2.538 2.466a.53.53 0 0 1 0 .746L8.907 4.84A.53.53 0 0 1 8 4.466z" }),
    );

    function UpdToggle() {
      const open = usePanelOpen();
      return React.createElement("button", {
        className: "mdw-btn",
        title: "检查更新",
        "aria-pressed": open,
        onClick: () => setOpen(!open),
      }, RefreshIcon);
    }

    // ------------------------------------------------------------------
    // Plugin body
    // ------------------------------------------------------------------
    const inject = ["slots"];
    function apply(ctx) {
      ctx.effect(() => {
        const waiters = [
          ctx.slots.inject("shell.overlay", () => ctx.slots.register({ name: "shell.overlay", id: "dsh-updchk.panel" }, UpdOverlay)),
          ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({ name: "sidebar.footer.action", id: "dsh-updchk.toggle" }, UpdToggle)),
        ];
        return () => { for (const w of waiters) w(); };
      }, "dsh-updchk: slot registrations");
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
