# 更新日志（Changelog）

本文件记录 `dsh-plugin` 各发布版本的变更。版本号对应 Git 标签，格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/)。

## [未发布]

本次变更集中在 **dsh-claude-code-web**：工作台可移出 DSH 界面独立使用，并补上本机鉴权。

### 新增（Features）

- **工作台支持弹出为独立浏览器窗口 / 标签页**：标题栏新增「在独立窗口打开」按钮，点击后在 DSH 界面之外打开独立页；DSH 内面板随即收起，两者通过同一份 HTTP / WebSocket 服务通信，可并存使用。
  - 独立页为**全窗口常开**形态，隐藏窗口控制按钮与缩放手柄，避免与独立浏览器窗口的边框重复。
  - 默认**浅色**主题（`data-theme="light"`，压过系统深色模式），与面板浅色令牌保持一致。
  - 新增 `public/index.html` 作为独立页入口，按序加载 React → ReactDOM → UI 源码；React 18.3.1 UMD 运行时随插件分发（`public/react.production.min.js`、`public/react-dom.production.min.js`），**离线可用、不依赖 CDN**。
- **`lib/client.js` 重构为单文件双模式**：抽出 `build(React, opts)` 工厂，DSH 侧经 `window.__ModuleLoader__` 以 `build(require("react"))` 注册，独立页侧经 `window.__CCW_UI__.build(React, { standalone: true })` 调用。同一份源码供两种形态使用，无代码分叉、无重复维护。
  - `opts.standalone` 同时驱动三处行为差异：面板初始常开、最大化状态初始为真、标题栏隐藏窗口控制按钮。
- **新增 `/claude/claude-ui.js` 固定路由**：由插件 HTTP 面直接伺服 `lib/client.js`，独立页与 DSH 内面板共用同一份 UI 源码，零拷贝、零漂移。

### 安全（Security）

- **内置本机 loopback 信任检查**：`/claude/api/*` 与 WebSocket 下行 `/claude/api/stream` 原先**默认无鉴权**，任何能访问本机端口的进程或网页均可调用。现于 `server.cjs` 增加信任检查，HTTP 与 WebSocket 升级两条路径均覆盖：
  - 带浏览器 `Origin` 头且主机名非 `127.0.0.1` / `localhost` / `::1` 的跨源请求一律 `403`；
  - `Sec-Fetch-Site: cross-site` 的跨站请求一律 `403`；
  - 移除原先的 `Access-Control-Allow-Origin: *`，浏览器跨源读取与预检均不再放行。
  - 刻意不校验 `Host` 头：桌面端经 IPC 桥接的请求其 `Host` 可能是合成的，校验会误伤日常使用；仅依赖浏览器必带的 `Origin` / `Sec-Fetch-Site`，既堵住跨源与 DNS 重绑定攻击，又不影响本机使用。
  - 本机 curl / 面板 / 弹出窗口均照常工作；此处的鉴权仅针对插件自身的 HTTP 接口，**与 Claude / Anthropic 凭据无关，无需重新登录**。

### 修复（Fixes）

- **回填 Mermaid 渲染修复**：线上插件曾直接修补过 Mermaid 相关缺陷，但未回流仓库，存在「重装插件即丢失」的风险。本次一并回填——
  - `quoteMermaidLabels`：Mermaid 11 的词法会把紧跟文字的 `@` 当成 `LINK_ID` / `@{}` 形状标记，未加引号的标签里出现 `()` 也会报 Parse error（例如 `OCR(双模型融合)`）。仅在首次渲染失败后作为兜底，把流程图节点 / 子图标题里的这类裸标签用双引号包起来（mermaid 合法的 quoted label 语法），标签文字原样保留。
  - `suppressErrorRendering` + `cleanupMermaidTempNodes`：解析失败不再生成挂在 `<body>` 末尾的临时错误图，并清理历史残留节点。
  - `mermaidSvgCache` 改为缓存 `{ svg, src }` 对象，命中缓存时按新签名回填。

### 变更（Changed）

- **删除 `dsh-md-workspace` 插件**：其能力已被 `dsh-claude-code-web` 取代（自包含 mermaid 运行时、更安全的 URL scheme 过滤与图片净化），移除以避免重复维护。
- 仓库收敛为**单一 `master` 分支**维护，删除历史版本分支（`v0.0.1` / `v0.0.2` / `v0.1.0` / `v0.1.1`），版本快照由 Git 标签保留。

## [v0.1.1] - 2026-10-21

本次变更集中在 **dsh-claude-code-web**，以表现层重构为主，另外修正了会话工作区归属的一个数据兜底问题。

### 变更（Changed）

- **Claude Code 风格界面重构**：颜色、边框、字号收敛到 `--ccw-*` 令牌；标题栏补「本地」标识；侧栏改为「新会话 → 搜索 → 工作区分组 → 底部添加工作区」结构；消息流由气泡改为文档流，工具调用统一为单卡片；输入区与底部工具栏合并为同一块表面；补齐暗色、窄面板抽屉、空态、骨架屏、Toast 与对话目录。
- **侧栏搜索快捷键改为 `⌘K` / `Ctrl K`**：`⌘F` / `Ctrl F` 已被会话内搜索占用，避免一次按键打开两个搜索框。
- **工作区子目录会话回并父工作区**：历史扫描自动发现的子目录不再显示为独立幽灵分组，其会话会并入最外层工作区；显式工作区名不会再被子目录名覆盖。

### 修复（Fixes）

- **会话缺少 `cwd` 时错误挂到当前工作区**：Claude 转录文件只有 `last-prompt` / `cost-state` 等元数据时没有 `cwd` 字段，切换会话会回退到当前 `workspaceDir`。服务端现在从 `~/.claude/projects/<encoded-cwd>` 目录名反查已注册工作区并补全 `cwd`，客户端顶栏工作区也会跟随该会话。
- **输入框聚焦时与工具栏出现分割线**：去掉 textarea 内层的 border / outline / box-shadow，焦点只保留在外层 composer；工具栏透明且无上下边框。
- **消息流没有占满主内容宽度**：移除 `616px` / `72ch` 上限，消息、轮次标签、工具卡随主内容区全宽；轮次标签吸顶时不再透出下方文字。

### 可访问性（Accessibility）

- 侧栏工作区头、工作区名、会话行支持 `Enter` / `Space` 激活，补 `aria-expanded` / `aria-current`。
- 侧栏重命名、删除、取消排队、移除图片等图标按钮补 `aria-label`。
- 模型下拉的键盘焦点补柔和 focus ring，不再只靠边框颜色区分。

## [v0.1.0] - 2026-10-08

本次发布的变更集中在 **dsh-claude-code-web** 插件，仅涉及该插件的 `lib/client.js` 与 `server.cjs`。

### 新增（Features）

- **子代理输出折叠为紧凑卡片**：`Agent` / `Task` 调用的 hand-back 报告不再作为普通工具输出原样塞入，而是渲染为带类型徽标、描述与用量（tokens / 工具调用次数 / 耗时）的卡片，报告正文**默认折叠**、展开后按 Markdown 呈现。
  - 剥离 harness 样板（`The report follows:` 前缀、`agentId: … <usage>…</usage>` 尾部）并按公共缩进 de-indent。
  - 元数据优先取会话转录 `toolUseResult` 中的 `agentType` / `totalTokens` / `totalToolUseCount` / `totalDurationMs`。
  - 用量显示改为自适应（如 `68.4K tokens`），精确值放入 tooltip。

### 修复（Fixes）

- **兼容 DSH 桌面端 WebSocket 连接**：`connect()` 优先使用 DSH 注入的 `__DSH_TRANSPORT__.streamBaseUrl` 作为流基址。桌面端主窗口从自定义协议 `dsh-app://app/` 加载，`window.location.host` 会变成 `"app"`，原逻辑拼出的 `ws://app/…` 无法连通；取不到注入基址时回退原逻辑。
- **修复流式回复文本被拼接两遍**：SDK 会把同一条 assistant 消息按 content block 分组多次下发（thinking 增量 → `assistant[thinking]` → text 增量 → `assistant[text]`）。原「整条消息到达即替换」逻辑在首组到达时就消费掉完成标记，导致后到的完整 text 块退化为追加，正文被拼接两遍。改为按块类型分层累积（已确认内容 + 待定增量），完整块到达时仅作废对应类型的增量缓冲。
- **过滤子代理消息，避免子代理正文被当成主会话输出**：`parent_tool_use_id` 非空的消息产生于子代理内部，此前被渲染成主会话气泡，与主 agent 的转述内容重复（实测某轮 122 条 assistant 中 44 条为子代理消息，含一份完整审查报告）。现于 `handleMessage` 入口整条丢弃，并在历史加载时防御性跳过 `isSidechain` 记录。

## [v0.0.2] - 2026-09-22

本次发布的变更集中在 **dsh-claude-code-web** 插件。相对 v0.0.1 的净内容差异仅涉及该插件的
`lib/client.js`、`server.cjs`、`README.md`、`package.json` 及新增的 `public/mermaid.min.js`。

### 新增（Features）

- **Mermaid 文本绘图渲染**：助手消息中的 ` ```mermaid ` 代码块自动渲染为图表。
  - 内置 mermaid 11.17.2 运行时（`public/mermaid.min.js`），**离线可用、不依赖 CDN**，由插件自身 HTTP 面按需提供。
  - 懒加载（仅当出现 mermaid 代码块时才加载运行时）、SVG 按「主题 + 源码」缓存、「查看源码」开关。
  - 渲染失败时展示错误信息 + 原始源码 + 「重试」按钮；自动适配明暗主题。
  - 流式输出中未闭合的代码围栏标记 `data-pending`，闭合后再渲染，避免中途反复报错闪烁。
- **会话累计 Token 与费用显示**：顶栏新增「当前会话累计 token（M 单位）＋ 费用（USD）」。
  - 跨 query 生命周期累计：切换模型 / 权限重建 query 时不清零。
  - token 统计覆盖主循环 + Task 子代理 + sidechain + 上下文压缩等全部调用（基于 `modelUsage` 跨轮次累计）。
- **工具输出默认折叠**：工具调用结果默认折叠，并显示折叠提示（输出大小 + 内容预览），减少长输出对阅读的干扰。

### 修复（Fixes）

- **修复 Mermaid 回看时 “Syntax error in text / mermaid version 11.17.2” 报错**：
  在渲染前对 mermaid 源码统一清洗——
  - 剥离行号前缀（`70\t` / `34-` / `35:`）；
  - HTML 实体反转义（`--&gt;` → `-->`、`-&gt;&gt;` → `->>`、`&lt;br/&gt;` → `<br/>`、`&amp;&amp;` → `&&` 等）。
  - **根因**：Claude Code 写入会话转录（`.jsonl`）时会对内容做 HTML 转义，插件回看会话时原样把转义后的文本交给 `mermaid.render()`，导致解析失败。
  - **验证**：对 491 个真实转录中的 mermaid 块实测——修复前 138 个硬解析失败，修复后 0，且干净语法（`-->`、`->>`、`<br/>` 等）无回归。

## [v0.0.1] - 2026-09-16

首个正式发布版本，包含三个插件：

- **dsh-claude-code-web**：在 DSH 中接入 Claude Code 的 Web 聊天面板（会话管理、流式输出、图片附件、会话内搜索与目录、工作区管理、扩展思考消息合并、滚动位置保持等）。
- **dsh-md-workspace**：Markdown 工作区插件，内置自包含的 mermaid 渲染、更安全的 URL scheme 过滤与图片净化。
- **dsh-updchk**：插件更新检查。

[v0.1.1]: https://github.com/zhoulvyuan/dsh-plugin/compare/v0.1.0...v0.1.1
[v0.1.0]: https://github.com/zhoulvyuan/dsh-plugin/compare/v0.0.2...v0.1.0
[v0.0.2]: https://github.com/zhoulvyuan/dsh-plugin/compare/v0.0.1...v0.0.2
[v0.0.1]: https://github.com/zhoulvyuan/dsh-plugin/releases/tag/v0.0.1
