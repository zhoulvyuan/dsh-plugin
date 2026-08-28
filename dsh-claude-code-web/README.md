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
- WebSocket 实时通信
- 工作台拖动、缩放和最大化

## 工作原理

插件由宿主端和客户端两部分组成，并复用插件内部的 `server.cjs` 提供 HTTP / WebSocket 服务。

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
              │   HTTP / WebSocket     │
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
- `/claude/api/stream` WebSocket 路由

插件加载时初始化服务，卸载时释放 HTTP、WebSocket 以及服务端资源。

### 客户端

`lib/client.js` 提供浏览器端工作台，包括侧边栏入口和悬浮面板，并通过 `/claude/api/*` 与服务端通信。

### 服务端

`server.cjs` 负责 Claude Code Web 的核心 HTTP / WebSocket 处理逻辑。插件直接复用该服务，而不是要求额外启动一个独立的 Web 服务。

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
└── lib/
    ├── index.js
    └── client.js
```

## 设计目标

这个插件遵循一个核心原则：

> **DSH 作为宿主，Plugin 负责具体能力。**

Claude Code Web 的 UI、HTTP / WebSocket 服务和相关运行逻辑尽可能封装在插件内部，避免修改 DSH 核心实现，同时保持插件可以独立维护和演进。

## 已知问题

插件依赖 DSH 当前提供的 Plugin API，因此不同 DSH 版本之间可能存在兼容性差异。使用前请确认当前 DSH 版本满足安装文档中的要求。

## License

本插件当前未单独声明 License。使用或分发前请确认仓库实际许可协议。
