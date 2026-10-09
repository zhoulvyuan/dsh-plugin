# 更新日志（Changelog）

本文件记录 `dsh-plugin` 各发布版本的变更。版本号对应 Git 标签，格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/)。

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

[v0.1.0]: https://github.com/zhoulvyuan/dsh-plugin/compare/v0.0.2...v0.1.0
[v0.0.2]: https://github.com/zhoulvyuan/dsh-plugin/compare/v0.0.1...v0.0.2
[v0.0.1]: https://github.com/zhoulvyuan/dsh-plugin/releases/tag/v0.0.1
