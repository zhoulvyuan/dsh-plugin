# DSH Plugin

> DeepSeek Harness（DSH）的插件集合，通过 Plugin 机制为 DSH 提供额外能力。

## 项目简介

`dsh-plugin` 用于集中维护面向 DSH 的独立插件。

每个插件拥有独立的目录、代码和文档，负责实现具体功能；根目录 README 仅负责介绍本仓库及插件列表。

## 插件列表

| Plugin | Description |
| --- | --- |
| [dsh-claude-code-web](./dsh-claude-code-web) | 将 Claude Code Web 工作台集成到 DSH |
| [dsh-md-workspace](./dsh-md-workspace) | 本地目录浏览 + Markdown 打开/编辑/实时预览 |
| [dsh-updchk](./dsh-updchk) | DSH 检查更新面板（版本检测 / 兼容性风险 / 更新与回滚） |

## 仓库结构

```text
dsh-plugin/
├── README.md
│
├── dsh-claude-code-web/
│   ├── README.md
│   ├── INSTALL.md
│   ├── DEPLOY.md
│   └── ...
│
├── dsh-md-workspace/
│   ├── README.md
│   ├── INSTALL.md
│   ├── package.json
│   ├── cordis.patch.yml
│   └── lib/
│
├── dsh-updchk/
│   ├── README.md
│   ├── INSTALL.md
│   ├── package.json
│   ├── cordis.patch.yml
│   └── lib/
│
└── ...
```

插件的具体功能、架构、安装、配置和使用方式，请进入对应插件目录查看其 `README.md`。

## 新增插件

新增 DSH Plugin 时，请：

1. 创建独立的插件目录。
2. 在插件目录中提供 `README.md`。
3. 在根目录的 **插件列表** 中增加对应条目。

## License

本仓库当前未单独声明 License。使用或分发前请确认仓库实际许可协议。
