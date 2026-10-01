# 更新日志（Changelog）

本文件记录 `dsh-plugin` 各发布版本的变更。版本号对应 Git 标签，格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/)。

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

[v0.0.2]: https://github.com/zhoulvyuan/dsh-plugin/compare/v0.0.1...v0.0.2
[v0.0.1]: https://github.com/zhoulvyuan/dsh-plugin/releases/tag/v0.0.1
