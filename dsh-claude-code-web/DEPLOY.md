# dsh-claude-code-web — 部署清单

本插件把 **Claude Code** 包装成 DSH 原生插件（宿主机进程内嵌 HTTP/WebSocket 服务 + 浏览器客户端悬浮面板）。

> 前提：目标机**必须**已安装 **DSH** 与 **Claude Code CLI**（见下文），插件不自带这两者。

## 一、前置依赖（目标机需自行安装）

| 依赖 | 版本要求 | 说明 |
|---|---|---|
| Node.js | **>= 18** | 运行 DSH 与 SDK |
| DSH | 含 `webServer.registerUpgrade`（WebSocket 上行契约） | 插件挂载到 DSH 的 `/claude` 前缀 |
| Claude Code CLI | 与 `@anthropic-ai/claude-agent-sdk@0.3.241` 兼容的版本区间 | 全局安装 `npm i -g @anthropic-ai/claude-code` |
| Anthropic 凭据 | - | 需已登录（`claude` 首次运行登录 / 配置 API Key） |

安装 CLI 示例：

```bash
npm i -g @anthropic-ai/claude-code
claude --version    # 确认可执行
claude              # 首次登录
```

## 二、CLAUDE_BIN 自动探测

插件启动时会按以下顺序定位 CLI（无需配置，命中即用）：

1. 环境变量 `CLAUDE_BIN`
2. 常见安装路径（macOS/Linux：`/opt/homebrew/bin`、`/usr/local/bin`、`~/.local/bin`、`~/.bun/bin`、npm 全局 prefix；Windows：`%APPDATA%\npm` 下的原生 `claude.exe` 及 shim）
3. `which claude` / `where claude`（Windows 下若返回 `claude.cmd` shim，会自动解析到同包的原生 `claude.exe`）
4. 默认回退 `/opt/homebrew/bin/claude`

若找不到（会报 `spawn ... ENOENT`），显式指定：

```bash
export CLAUDE_BIN=/path/to/claude
```

平台说明：
- **macOS / Linux**：直接 `spawn` 原生二进制，无需额外配置。
- **Windows**：已自动处理——优先命中 `%APPDATA%\npm\node_modules\@anthropic-ai\claude-code\bin\claude.exe`（原生二进制，直接 spawn）；对 `npm`/`npx`/`.cmd` shim 会自动经 `cmd.exe /c`（`shell:true`）执行。一般无需手动设置 `CLAUDE_BIN`。

## 三、用户数据目录

状态文件 **不再写入插件安装目录**，而是写入用户数据目录：

- 默认：`~/.claude-code-web/`
- 覆盖：`export CLAUDE_CODE_WEB_HOME=/your/data/dir`

包含：
- `workspaces.json` — 工作区注册表（路径、已删除列表、当前工作区）
- `command-map.json` — 命令展开映射（用于历史记录里隐藏命令提示词）

**首次启动**：若数据目录无状态文件但插件目录下有旧文件（升级自旧版），会自动复制迁移（幂等，旧文件保留作备份）。因此插件可以**只读方式安装**。

> 跨机提示：`workspaces.json` 记录的是源机器绝对路径，目标机不存在的路径会被自动过滤/重建，属预期行为。

## 四、`~/.claude` 用户态（需要手动同步）

插件读取用户目录下的 Claude Code 状态，**换机器不会自动迁移**，请手动同步：

```bash
# 在源机器打包
tar czf claude-dotfile.tgz ~/.claude

# 在目标机器解压
tar xzf claude-dotfile.tgz -C ~
```

包含内容：
- `~/.claude/projects/` — 会话历史（插件侧边栏读取）
- `~/.claude/commands/`、`~/.claude/agents/`、`~/.claude/skills/` — 自定义命令/代理/技能（插件 slash 列表）
- `~/.claude/settings.json` — 权限模式、允许列表（影响插件授权弹窗行为）
- 凭据（如 `.credentials.json`）— **建议在目标机重新 `claude` 登录**，避免迁移敏感文件

> 不同权限模式的行为差异：目标机若为 `bypassPermissions`（自动允许），插件的「请求授权」卡片不会出现，属预期。

## 五、首次启动自检

启动后确认：

- [ ] 侧边栏出现工作区列表（新机器为空的正常，历史/命令在同步 `~/.claude` 后出现）
- [ ] 输入框可发消息，AI 正常流式返回
- [ ] `~/.claude-code-web/` 目录已创建且可写

## 六、安全提示

插件暴露的 `/claude/api/*`（send / answer-control / open-path 等）**默认无鉴权**。
- 仅限本机 `localhost` 使用：无额外风险。
- 若 DSH 暴露在局域网/多用户环境：请确认 DSH 自带鉴权层，或为插件增加访问令牌后再部署。
