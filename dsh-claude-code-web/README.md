# dsh-claude-code-web

将 **Claude Code** 集成到 **DeepSeek Harness（DSH）** 中，以 DSH 原生插件的方式提供 Web 工作台。

## 功能

- 在 DSH 侧边栏提供 Claude Code 入口
- 悬浮式 Claude Code 工作台
- Workspace 管理
- Session / 对话管理
- 消息流式展示
- Tool 调用状态展示
- Thinking 内容展示
- Markdown、代码块等内容渲染
- Mermaid 文本绘图渲染（```mermaid 代码块自动渲染为图表，离线可用）
- 同源 HTTP 长轮询实时同步（不额外暴露 WebSocket 路由，兼容托管 SSO 代理与桌面壳 IPC）
- 工作台拖动、缩放和最大化
- 一键弹出为独立浏览器窗口 / 标签页（移出 DSH 界面，默认浅色，随插件分发的 React 18 运行时离线可用）
- 本机 loopback 信任检查（拒绝跨源 / 跨站请求，保护本地 Claude 会话不被其他网页或进程调用）
- 三档权限模式（仅可查看 / 工作区内修改 / 完全权限），与 DSH 的 sandbox 语义一致

## 权限模式

输入框右下角提供三档切换，判定全部在服务端完成，客户端只负责选择与确认：

| 模式 | 文件工具（Write / Edit / NotebookEdit…） | Bash | 说明 |
| --- | --- | --- | --- |
| 仅可查看 `read-only` | 宿主 hook 直接拒绝 | 进只读沙箱，写入被系统拒绝 | 可以读、可以问，不能改 |
| 工作区内修改 `workspace-write` | 目标路径 realpath 后必须落在工作区内 | 沙箱只允许写工作区 | 默认推荐档位 |
| 完全权限 `danger-full-access` | 不限制 | 不限制 | 与旧版行为一致；危险操作仍弹授权卡 |

实现要点：

- **两层拦截**：`sandbox` 只约束 Bash 子进程，文件工具由 `PreToolUse` hook 按路径判断（`canUseTool` 保留为第二层）。
- **为什么必须用 hook**：`~/.claude/settings.json` 里的裸 `Edit` / `Write` allow 规则会在权限判定阶段直接放行，`canUseTool` 根本不会被调用；`PreToolUse` 在权限判定之前执行，是唯一能覆盖所有配置来源的拦截点。
- **fail-closed**：受限档位下沙箱起不来会直接报错并提示，不会静默降级为无限制；同时关闭 `dangerouslyDisableSandbox` 逃生通道。
- **切换即重建**：sandbox 是进程启动参数，切换档位会重建 Claude 进程，会话级「始终允许」随之失效（界面上会提示“下一次发送时生效”）。

已知边界：

- 只覆盖 Claude Code 内置写类工具与 Bash；第三方 / MCP 工具若自行写盘，不在闸门判定范围内。
- 平台依赖：macOS 用 `sandbox-exec`，Linux 需 `bubblewrap`，Windows 无可用后端；不支持时受限档位会报错，只能使用「完全权限」。

## 工作原理

插件由宿主端和客户端两部分组成，并复用插件内部的 `server.cjs` 提供 HTTP 服务（含长轮询下行）。

```text
                    DeepSeek Harness
                           │
                     Plugin API
                           │
                           ▼
              ┌────────────────────────┐
              │  dsh-claude-code-web  │
              │                        │
              │  lib/index.js         │
              │       │                │
              │       ▼                │
              │  server.cjs            │
              │   HTTP（长轮询）      │
              │       ▲                │
              │       │                │
              │  lib/client.js         │
              │       │                │
              │       ▼                │
              │   Claude Code Web UI  │
              └────────┬───────────────┘
                       │
                       ▼
                  Claude Code
```

### 宿主端

`lib/index.js` 是 DSH Plugin 入口，通过 DSH 的 `webServer` 注册：

- `/claude` HTTP 前缀路由
- `/claude/api/state-poll` 长轮询下行

插件加载时初始化服务，卸载时释放 HTTP 路由、长轮询等待者以及服务端资源。

### 客户端

`lib/client.js` 提供浏览器端工作台，包括侧边栏入口和悬浮面板，并通过 `/claude/api/*` 与服务端通信。

### 服务端

`server.cjs` 负责 Claude Code Web 的核心 HTTP 处理逻辑（含长轮询下行）。插件直接复用该服务，而不是要求额外启动一个独立的 Web 服务。

## 安装

环境要求及完整安装步骤请查看：

- [INSTALL.md](./INSTALL.md)
- [DEPLOY.md](./DEPLOY.md)

基本依赖：

- Node.js >= 18
- 支持 `webServer.registerUpgrade` 的 DSH
- Claude Code CLI
- 可用的 Anthropic 凭据

插件通过 DSH 官方 profile bundle 机制加载：`dsh plugin --profile web add ...` 安装到 profile 的 `node_modules`，并自动登记进 `package.json` 的 `dependencies` / `dsh.profile.bundles`（插件自带的 `dsh.bundle.patch` → `cordis.patch.yml` 完成注册）；同时保留离线自包含包方式。详细步骤请参考 [INSTALL.md](./INSTALL.md)。

## 配置

插件运行数据默认存储在用户目录 `~/.claude-code-web/`，不会写入插件源码目录。

常见配置包括：

- `CLAUDE_BIN`：Claude Code CLI 可执行文件路径
- `CLAUDE_CODE_WEB_HOME`：插件运行数据目录

具体配置及跨平台部署说明请查看 [DEPLOY.md](./DEPLOY.md)。

## 项目结构

```text
dsh-claude-code-web/
├── README.md
├── INSTALL.md
├── DEPLOY.md
├── package.json
├── cordis.patch.yml
├── server.cjs
├── public/
│   └── mermaid.min.js   # 随插件分发的 Mermaid 运行时（按需加载，离线可用）
└── lib/
    ├── index.js
    └── client.js
```

## 设计目标

这个插件遵循一个核心原则：

> **DSH 作为宿主，Plugin 负责具体能力。**

Claude Code Web 的 UI、HTTP 服务与长轮询下行尽可能封装在插件内部，避免修改 DSH 核心实现，同时保持插件可以独立维护和演进。

## 宿主兼容性

插件对宿主只做最小假设，便于在任何 DSH 环境直接安装：

| 依赖 | 是否必需 | 缺失时的行为 |
| --- | --- | --- |
| `ctx.webServer.register({ kind: 'prefix' })` | 必需 | 无法挂载 `/claude` 路由 |
| `ctx.connection.requestRejection()` | 可选 | 跳过宿主准入，退回插件自带的 loopback 信任检查 |
| `process.env.DSH_HOME` | 可选 | 运行数据落在 `~/.claude-code-web` |

下行固定走认证后的同源 HTTP 长轮询，不注册额外 WebSocket 路由——宿主托管模式（SSO 代理、桌面壳 IPC）只转发它自己的协议，额外的 upgrade 路由在那种环境下不可用。长轮询在普通浏览器里同样工作，因此同一份代码在浏览器 DSH 与桌面 DSH 上行为一致。

「在独立窗口打开」使用同源 `window.open` + `?ccwDetached=1`：识别 `ztoSurface` 参数的桌面壳会以原生窗口打开并共享登录会话，其它环境退化为普通同源标签页。surface 参数值可用 `window.__CCW_DETACH_SURFACE__` 覆盖。

## 已知问题

插件依赖 DSH 当前提供的 Plugin API，因此不同 DSH 版本之间可能存在兼容性差异。使用前请确认当前 DSH 版本满足安装文档中的要求。

## License

本插件当前未单独声明 License。使用或分发前请确认仓库实际许可协议。
