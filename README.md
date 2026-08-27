# DSH Plugin

DeepSeek Harness（DSH）插件集合，用于扩展 DSH 的能力。

## 当前插件

### dsh-claude-code-web

将 Claude Code 工作台以内嵌 Web 面板的形式集成到 DSH 中。

主要能力：

- 在 DSH 侧边栏提供 Claude Code 入口
- 通过全局悬浮面板使用 Claude Code
- 支持 Workspace / Session 管理
- 支持 Claude Code 消息流式展示
- 支持 Tool 调用状态展示
- 支持 Thinking 内容展示
- 支持 Markdown、代码块、列表、表格等内容渲染
- 支持 WebSocket 实时消息推送
- 支持面板拖动、缩放以及最大化
- Claude Code Web 服务逻辑由插件自身承载，不要求额外启动独立的 Claude Code Web 服务

插件通过 DSH 提供的 `webServer` 能力注册 `/claude` HTTP 路由以及 `/claude/api/stream` WebSocket 路由，并由插件内部的服务端代码处理 Claude Code 请求。

## 目录结构

```text
dsh-plugin/
├── README.md
└── dsh-claude-code-web/
    ├── DEPLOY.md
    ├── INSTALL.md
    ├── lib/
    │   ├── client.js
    │   └── index.js
    └── server.cjs
```

## 设计思路

DSH Plugin 的目标不是修改 DSH 核心，而是通过插件机制向 DSH 注入独立能力。

以 `dsh-claude-code-web` 为例：

```text
┌───────────────────────────────┐
│       DeepSeek Harness        │
│                               │
│  ┌─────────────────────────┐  │
│  │      DSH Plugin         │  │
│  │                         │  │
│  │ dsh-claude-code-web     │  │
│  │                         │  │
│  │  ┌───────┐ ┌─────────┐ │  │
│  │  │Client │ │ Server  │ │  │
│  │  └───────┘ └─────────┘ │  │
│  └─────────────────────────┘  │
│             │                 │
│        webServer              │
└─────────────┼─────────────────┘
              │
              ▼
        Claude Code
```

插件负责实现具体业务能力，DSH 负责提供宿主环境和插件运行机制。这样可以尽量保持 DSH 核心与插件业务解耦。

## 安装

具体安装方式请参考对应插件目录中的文档：

- `dsh-claude-code-web/INSTALL.md`
- `dsh-claude-code-web/DEPLOY.md`

## 开发

每个插件原则上保持独立目录，并至少包含自己的入口文件、运行逻辑以及安装/部署说明。

建议遵循以下原则：

1. 不修改 DSH 核心代码，通过插件 API 扩展能力。
2. 插件自身负责其业务逻辑和资源。
3. 插件生命周期结束时主动释放注册的路由、事件和其他资源。
4. 尽量避免对宿主环境产生全局副作用。
5. 安装、部署和运行依赖应在插件目录中明确说明。

## License

本仓库当前未单独声明 License。使用或分发前请确认仓库实际许可协议。
