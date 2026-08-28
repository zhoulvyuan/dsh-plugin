# dsh-updchk

DSH 插件：**检查更新面板**（当前版本展示、npm 最新版检测、自定义插件兼容性风险评估、确认后后台执行更新与回滚）。

## 功能

- 展示当前 dsh 版本、运行中版本、待重启提示和自定义插件数量；
- 对接 npm registry：探测 `latest` / `next` 与可升级目标版本；
- 风险前置：把「自定义插件对 `@deepseek-ai/*` 包的引用」与新版依赖树做闭合校验，标记已从 registry 消失 / 可能更名 / 跨次版本线等风险；
- 后台分段更新（preparing → preflight → installing → validating → switching），实时进度、超时/卡住自动中止、失败保留旧版；
- 支持回滚到上一个版本。

## 组成

| 文件 | 作用 |
|---|---|
| `package.json` | 插件清单（`name: dsh-updchk`，声明 `dsh.bundle.patch` 与 `dsh.client.inject`） |
| `cordis.patch.yml` | bundle 注册层（`- id: updchk / name: dsh-updchk`） |
| `lib/index.js` | 宿主半部：挂载 `/updk/*` 路由，含版本发现、插件扫描、风险分析、后台更新任务 |
| `lib/client.js` | 客户端半部：检查更新面板与底部按钮 |

## 跨平台

本地发现、自定义插件扫描、registry 检测全部**进程内实现**（`node:fs` / `node:path` / `node:os`），不依赖 `grep` / `command -v` / `mkdir -p` / `env` 等 shell 语法；更新仅执行单条 `pnpm add` / `npm install` 命令，路径经 `workdir`、版本经 `env` 传递，macOS / Windows / Linux 通用（Windows 下 shell 为 PowerShell，同样可执行）。

## 引入

见 [INSTALL.md](./INSTALL.md)。官方方式一行命令：

```bash
dsh plugin --profile web add file:./dsh-updchk
```

## 数据与隐私

插件**不在自身目录写入任何运行数据**；更新安装与版本指针统一写入 `$DSH_HOME/runtime/`（`versions/`、`current.json`、`previous.json`），不残留用户路径 / 凭据 / 机器信息。
