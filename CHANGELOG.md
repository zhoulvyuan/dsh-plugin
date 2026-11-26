# 更新日志（Changelog）

本文件记录 `dsh-plugin` 各发布版本的变更。版本号对应 Git 标签，格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/)。

## [Unreleased]

### 新增（Features）

- **dsh-claude-code-web：三档权限模式（仅可查看 / 工作区内修改 / 完全权限）**，与 DSH 的 sandbox 语义对齐。此前工作台只有「不限制 + 每次弹授权卡」一档，`permissionMode` 在服务端全链路透传、客户端却硬编码 `"default"`，没有任何入口。
  - 服务端（server.cjs）：新增 `SANDBOX_MODES` / `normalizeSandboxMode()` / `sandboxModeDenial()` / `sandboxOptions()`。只读与工作区两档用 `sandbox`（`filesystem.allowWrite` 限定工作区、只读档 `allowWrite:[] + denyWrite:['/']`）约束 Bash，`failIfUnavailable:true` 保证沙箱起不来就报错而不是静默降级，`allowUnsandboxedCommands:false` 关掉 `dangerouslyDisableSandbox` 逃生通道；文件工具由 `PreToolUse` hook 按 realpath 后的目标路径判定（`../`、符号链接逃逸都会指到工作区外）。`newSession` / `switchSession` / `sendMessage` 改读 `mode`，旧字段 `permissionMode` 归一为「完全权限」；模式变化会重建进程并清空 sessionRules。
  - 为什么闸门必须放在 hook 而不是只放 `canUseTool`：`~/.claude/settings.json` 里的裸 `"Edit"` / `"Write"` allow 规则会在权限判定阶段直接放行，`canUseTool` 根本不会被调用（本机设置即如此）；`PreToolUse` 在权限判定之前执行，是唯一能覆盖所有配置来源的拦截点。`canUseTool` 里的同名判定保留为第二层。
  - 客户端（client.js）：输入框右下角新增权限模式下拉（沿用模型下拉样式，完全权限用警示色），切到完全权限走 `uiConfirm` 二次确认，运行中切换提示「下一次发送时生效」；切换会话时按服务端记录的模式回填。
  - 顺带修复：切换模式/模型重建 query 时，被中断的旧 query 会把 `Operation aborted` 写回记录并覆盖新 query 状态（`r.query !== q` 的身份判断）；独立运行且 `CLAUDE_BASE_PATH` 带前缀时 WebSocket 升级路径不匹配。
  - 验证：`node --test test/*.test.cjs` 9 项通过；真实端到端（5 个用例）——只读档 Write 被 hook 拒绝、只读档 Bash 写入被系统沙箱拒绝、工作区档 Write/Bash 区内成功而工作区外被拒、完全权限档工作区外写入成功，且不再出现 `Operation aborted`；Playwright 打开 `/claude` 确认下拉三档、完全权限警示色与确认弹层。
  - 已知边界：只覆盖内置写类工具与 Bash，第三方/MCP 工具自行写盘不在判定范围；Windows 无沙箱后端，受限两档会报错。

### 修复（Fixes）

- **dsh-claude-code-web：AI Agent 的 `AskUserQuestion` 待确认事项未展示，模型反馈「未收到选择」并自行按推荐值继续**
  - 根因：工作台把 `AskUserQuestion` 当成普通工具授权，卡片只有「允许 / 始终允许 / 拒绝」，且 `answer-control` 的 allow 分支只回传 `{behavior:'allow', updatedInput: 原input}`，从不带 `answers`。Claude Code CLI 的 `AskUserQuestion.checkPermissions` 要求宿主在 `updatedInput.answers` 里回传用户选择；缺少 answers 会生成 `tool_result: "The user did not answer the questions."`，模型随即按推荐值继续（实测两个会话均如此）。
  - 修复（server.cjs）：识别 `AskUserQuestion` 并在 control 消息上带 `kind:'ask'` / `questions`；新增 `buildQuestionUpdatedInput()` 按 CLI 契约清洗并回传 `answers`；无 answers 的 allow 直接拒绝、「始终允许」对提问禁用、提问永不进入 sessionRules（避免后续提问被静默放行）；提交结果回写卡片便于回溯。
  - 修复（client.js）：新增 `QuestionCard`，把每个问题渲染成单选 / 多选 / Other 自定义输入 / 文本输入，校验全部作答后提交；未回答的待确认事项以 sticky 卡片置顶（不受消息分页影响），并从「全部允许」批量操作中排除；明确提供「跳过，不回答」并提示后果。
  - 验证：两文件 `node --check` 通过；`buildQuestionUpdatedInput` 纯函数断言；以 `Module._compile` 注入模块作用域验证 `makeCanUseTool` → `answerControl` 全链路（无 answers 不放行、带 answers 回传契约、普通工具授权行为不变）。补丁同时以三路合并叠加到本机运行中的插件副本，保留其 state-poll / PATH 独有改动。
- **dsh-claude-code-web：待确认选择框高度太窄、选项挤在内部滚动区（会话【代码开发-需求变更】兔喜快递柜销售实测反馈）**
  - 根因：待确认卡片放在消息滚动区 `ccw-msgs` 里并设 `max-height:62%` + `overflow-y:auto` + `position:sticky`，实际可视高度被压到面板消息区的 62%（约 150–340px），再扣掉头部/提示/按钮后，1 个带 3 个长描述选项的问题（自然高度约 312px）只能在很矮的内部区域里滚动，选项密集难以点选。
  - 修复（client.js）：新增 `AskBar` 组件，把待确认事项从 `ccw-msgs` 移到 `ccw-main` 的独立层（`flex:none`，不再 sticky、不再按消息区百分比限高）；高度由内容决定，仅极端长内容才在 `min(72vh, 560px)` 内滚动；支持「收起 / 展开」，收起后只留一行标题，便于查看对话。
  - 交互改进：选项改为独立块状（`padding:8px 10px`、`gap:5px`、边框 + hover / 选中高亮 `.sel`），单选框放大并跟随主题色，描述文字行高与对比度提升，问题区留白加大；提示文案精简。
  - 验证：源码与运行副本两文件 `node --check` 通过、CSS 模板完整、锚点替换各命中 1 次；已确认 `max-height:62%` / sticky / 消息区内旧 askbar 块全部移除，`AskBar` 挂载与定义各 1 处。

## [v0.1.3] - 2026-11-13

本次集中在 **macOS Desktop 下自定义 Client 浮层的窗口拖动区域**：修复 DSH 0.2.2-rc.1 的破坏性变更导致浮层控件点击被窗口拖拽吞掉的问题；同时把线上已运行一段时间的 `dsh-updchk` shell API 迁移回流仓库。

### 修复（Fixes）

- **dsh-claude-code-web：macOS 下「在独立窗口打开」/ 最小化 / 最大化 / 关闭 点了没反应**（面板内容、连接、对话均正常）
  - 根因：DSH 自 0.2.2-rc.1 起，macOS Desktop 只为 `data-window-drag` 行或 `data-window-drag-controls` 范围内的控件自动排除窗口拖动（此前任意位置匹配的控件与 ARIA role 都会被排除），并明确要求覆盖拖动行的自定义 Client 浮层自己声明区域（官方 upgrade-guide `v0.2.2-rc.1/window-drag-regions`）。本插件的面板是 `shell.overlay` 里的浮层，位置长期位于窗口顶端（`ccwGeom` 为 `left:0, top:0`），标题栏正好压在页头的 `data-window-drag` 拖动条上，点击被窗口拖动区域的命中测试吃掉，`onClick` 根本不触发；标题栏按钮与 JS 拖拽同时失效。
  - 修复：在面板可见视口 `.ccw` 与最小化胶囊 `.ccw-mini-pill` 上声明 `data-window-drag-exclude`，使整个面板矩形不参与窗口拖动区域；面板自己的标题栏拖拽（JS `pointerdown`）不受影响。
  - 验证：重启 DSH 后「在独立窗口打开」恢复正常。另用真实 Chrome 加载 `/claude` 独立页确认：页面完整渲染、显示「已连接」、`/claude/api/*` 与 `/claude/api/stream` 均正常，本次故障与插件 HTTP/WebSocket 面无关。
- **dsh-updchk：检查更新面板的关闭按钮与顶部「检查更新 / 回滚」按钮在 macOS 上点不动**
  - 同一根因：面板定位 `top:12px`，正好覆盖页头拖动条。
  - 修复：在 `.updk-panel` 上声明 `data-window-drag-exclude`。
  - 说明：`dsh-whale` 的浮层为底部对齐（`.whale-layer{bottom:0}`）且唯一可点元素是游动的鲸鱼，不与顶部拖动条重叠，本次无需改动。

### 变更（Changed）

- **dsh-updchk 仓库回流**：把线上插件已在运行的 dsh ≥ 0.1.6 `ctx.shell` 迁移回填进仓库（`ctx.shell.run/start` → `ctx.shell.execute(spec)` + `handle.result()`，后台任务补 `onExpiry: "none"` 以保留插件自己的 30 分钟硬超时与停滞看门狗），避免「重装插件即回退成不兼容实现」。
- `dsh-claude-code-web` 版本 0.1.2 → 0.1.3；`dsh-updchk` 版本 0.1.0 → 0.1.1。

## [v0.1.2] - 2026-10-30

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

[v0.1.3]: https://github.com/zhoulvyuan/dsh-plugin/compare/v0.1.2...v0.1.3
[v0.1.2]: https://github.com/zhoulvyuan/dsh-plugin/compare/v0.1.1...v0.1.2
[v0.1.1]: https://github.com/zhoulvyuan/dsh-plugin/compare/v0.1.0...v0.1.1
[v0.1.0]: https://github.com/zhoulvyuan/dsh-plugin/compare/v0.0.2...v0.1.0
[v0.0.2]: https://github.com/zhoulvyuan/dsh-plugin/compare/v0.0.1...v0.0.2
[v0.0.1]: https://github.com/zhoulvyuan/dsh-plugin/releases/tag/v0.0.1
