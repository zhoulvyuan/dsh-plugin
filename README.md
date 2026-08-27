# DSH Plugin

DeepSeek Harness（DSH）的插件集合，通过 Plugin 机制为 DSH 提供额外能力。

## Plugins

| Plugin | Description |
| --- | --- |
| [dsh-claude-code-web](./dsh-claude-code-web) | 将 Claude Code Web 工作台集成到 DSH |

## Repository Structure

```text
dsh-plugin/
├── README.md
├── dsh-claude-code-web/
│   ├── README.md
│   ├── INSTALL.md
│   ├── DEPLOY.md
│   └── ...
└── ...
```

每个插件使用独立目录，并由插件目录下的 `README.md` 负责维护该插件的详细说明。

## Contributing

欢迎提交新的 DSH Plugin。

新增插件时，请为插件创建独立目录，并提供对应的 `README.md`，用于说明插件的功能、安装、配置和使用方式。

## License

本仓库当前未单独声明 License。使用或分发前请确认仓库实际许可协议。
