# DSH Plugin

> DeepSeek Harness（DSH）的第三方插件集合，为 DSH 提供可独立演进的扩展能力。

[![GitHub](https://img.shields.io/badge/GitHub-dsh--plugin-181717?logo=github)](https://github.com/zhoulvyuan/dsh-plugin)

## ✨ 项目简介

`dsh-plugin` 是面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的插件项目集合。

项目的核心目标是：**在不修改 DSH 核心代码的前提下，通过 Plugin 机制为 DSH 注入新的工具、工作台和开发能力。**

插件作为独立模块运行在 DSH 宿主环境中，尽可能将自身的 UI、服务端逻辑、运行时依赖以及生命周期管理封装在插件内部。

这种方式可以让 DSH 保持轻量，同时让不同能力以插件的形式独立开发、部署和迭代。

## 🚀 当前插件

| 插件 | 状态 | 说明 |
| --- | --- | --- |
| [`dsh-claude-code-web`](./dsh-claude-code-web) | 🟢 Available | 将 Claude Code 工作台集成到 DSH |

### dsh-claude-code-web

`dsh-claude-code-web` 是本项目目前的核心插件，用于在 DSH 中提供 Claude Code Web 工作台。

主要能力：

- 🧩 DSH 侧边栏提供 Claude Code 入口
- 🪟 全局悬浮 Claude Code 面板
- 📁 Workspace 管理
- 💬 Session 管理
- ⚡ Claude Code 消息流式展示
- 🔧 Tool 调用状态展示
- 🧠 Thinking 内容展示
- 📝 Markdown / 代码块 / 列表 / 表格渲染
- 🔌 WebSocket 实时消息推送
- ↔️ 面板拖动与缩放
- 🖥️ 面板最大化
- ♻️ 插件生命周期自动释放

插件通过 DSH 提供的 `webServer` 注册 `/claude` HTTP 路由以及 `/claude/api/stream` WebSocket 路由；Claude Code Web 的服务端逻辑由插件自身承载，不要求额外启动一个独立的 Web 服务。

> 详细安装和部署方式请查看 [`INSTALL.md`](./dsh-claude-code-web/INSTALL.md) 与 [`DEPLOY.md`](./dsh-claude-code-web/DEPLOY.md)。

## 🏗️ 架构

DSH Plugin 采用 **Host + Plugin** 的设计：DSH 提供宿主能力，插件负责具体业务能力。

```text
┌──────────────────────────────────────────┐
│              DeepSeek Harness            │
│                    Host                  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │              Plugin                │  │
│  │                                    │  │
│  │       dsh-claude-code-web          │  │
│  │                                    │  │
│  │   ┌──────────┐    ┌────────────┐  │  │
│  │   │  Client  │    │   Server   │  │  │
│  │   │ React UI │    │ Claude Web │  │  │
│  │   └──────────┘    └────────────┘  │  │
│  │          │               │         │  │
│  │          └───────┬──────┘         │  │
│  │                  │                │  │
│  └──────────────────┼─────────────────┘  │
│                     │                    │
│                 webServer                │
└─────────────────────┼────────────────────┘
                      │
                      ▼
                Claude Code
```

### 核心原则

**DSH 负责宿主，Plugin 负责能力。**

插件不需要侵入 DSH 核心实现，而是通过 DSH 暴露的插件 API 获取宿主能力，例如：

- `webServer`
- UI 扩展点
- Plugin 生命周期
- 事件 / Context 能力

插件内部可以进一步拥有自己的：

- 前端 UI
- HTTP API
- WebSocket
- Node.js 服务逻辑
- 第三方 SDK
- 配置与运行时状态

以 `dsh-claude-code-web` 为例，插件入口通过 `webServer` 注册 HTTP 和 WebSocket 路由，并在插件卸载时释放这些注册资源，从而避免将 Claude Code Web 的实现耦合进 DSH 核心。fileciteturn3file0

## 📂 项目结构

```text
dsh-plugin/
├── README.md
│
└── dsh-claude-code-web/
    ├── INSTALL.md          # 安装说明
    ├── DEPLOY.md           # 部署说明
    ├── server.cjs          # 服务端逻辑
    └── lib/
        ├── index.js        # DSH Plugin 入口
        └── client.js       # Web UI
```

随着插件数量增加，仓库将继续采用 **一个插件一个目录** 的组织方式：

```text
dsh-plugin/
├── dsh-claude-code-web/
├── dsh-xxx/
├── dsh-yyy/
└── ...
```

这样可以保证不同插件之间尽可能独立。

## 📦 安装

插件的安装方式可能随着 DSH Plugin 机制的发展而变化，因此每个插件维护自己的安装文档。

当前插件：

**dsh-claude-code-web**

- [安装指南](./dsh-claude-code-web/INSTALL.md)
- [部署指南](./dsh-claude-code-web/DEPLOY.md)

## 🛠️ 开发插件

如果希望向本项目贡献新的 DSH Plugin，建议遵循以下原则：

### 1. 插件独立

每个插件使用独立目录，插件自身管理自己的代码、资源和运行依赖。

### 2. 不修改 DSH 核心

优先使用 DSH 已提供的 Plugin API 扩展能力，不通过修改宿主源码实现功能。

### 3. 正确管理生命周期

插件注册的路由、事件监听器、定时任务、WebSocket 等资源，应在插件卸载时主动释放。

### 4. 控制全局副作用

尽量避免修改全局环境变量、全局对象以及其他插件可能依赖的运行状态。

### 5. 完善文档

每个插件至少应提供：

- 插件用途
- 安装方式
- 配置说明
- 运行依赖
- 部署方式
- 已知问题

### 6. 保持宿主与业务解耦

推荐采用以下结构：

```text
DSH Host
   │
   └── Plugin API
          │
          ▼
      Plugin Entry
          │
     ┌────┴────┐
     ▼         ▼
   Client    Server
               │
               ▼
          External Tool
```

插件应该尽量只依赖 DSH 提供的稳定能力，而具体业务实现放在插件内部。

## 🗺️ Roadmap

项目目前处于持续开发阶段，后续计划包括：

- [x] 建立 DSH Plugin 仓库
- [x] Claude Code Web 插件
- [x] DSH `webServer` 路由集成
- [x] WebSocket 流式通信
- [ ] 完善统一的 Plugin 安装方式
- [ ] 增加更多 DSH Plugin
- [ ] 建立插件开发模板
- [ ] 完善 Plugin API 文档
- [ ] 增加插件版本管理与兼容性说明
- [ ] 建立插件发布 / 分发机制

Roadmap 会根据 DSH Plugin 机制的演进持续调整。

## 🤝 贡献

欢迎提交 Issue、Pull Request，或者基于本项目开发新的 DSH Plugin。

如果你开发了一个通用的 DSH 扩展，也可以考虑将其以独立插件的形式加入本项目。

## ⚠️ 免责声明

本项目中的插件属于独立扩展项目，与 DSH 核心项目的具体实现和官方发布计划可能存在差异。

使用插件前，请确认当前 DSH 版本与插件要求的兼容性，并根据对应插件的安装 / 部署文档进行配置。

## 📄 License

本仓库当前未单独声明 License。若要进行二次分发或商业使用，请先确认仓库实际许可协议。
