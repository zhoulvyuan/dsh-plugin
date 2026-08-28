# dsh-md-workspace

DSH 插件：**本地目录浏览 + Markdown 打开/编辑/实时预览**，以「宿主 REST 路由 + 浏览器客户端浮层面板」的方式接入 DSH Web。

## 功能

- 侧边栏底部「文件」按钮打开悬浮面板，浏览当前会话工作区目录树；
- 打开文件并在浏览器内编辑（Ctrl/Cmd+S 或自动保存，带冲突检测与强制覆盖）；
- Markdown 文件支持「编辑 / 预览 / 分栏」三模式实时预览；
- 严格工作区隔离：所有路径经 `ctx.fs` realpath 解析并校验在允许根目录内，仅接受 loopback 同源请求。

## 组成

| 文件 | 作用 |
|---|---|
| `package.json` | 插件清单（`name: dsh-md-workspace`，声明 `dsh.bundle.patch` 与 `dsh.client.inject`） |
| `cordis.patch.yml` | bundle 注册层（`- id: md-workspace / name: dsh-md-workspace`） |
| `lib/index.js` | 宿主半部：挂载 `/mdw/root`、`/mdw/list`、`/mdw/read`、`/mdw/write` 路由 |
| `lib/client.js` | 客户端半部：文件树、编辑器、Markdown 渲染、悬浮面板与底部按钮 |

## 跨平台

无运行时依赖（`package.json` 不含 `dependencies`），宿主半部只使用 `node:path` 与 DSH 的 `ctx.fs` / `ctx.webServer` / `ctx.sandboxPolicy` / `ctx.sessions` 抽象，客户端半部为纯浏览器 JS。macOS / Windows / Linux 均可直接使用。

## 引入

见 [INSTALL.md](./INSTALL.md)。官方方式一行命令：

```bash
dsh plugin --profile web add file:./dsh-md-workspace
```

## 数据与隐私

插件**不在自身目录写入任何运行数据**，无用户路径 / 凭据 / 机器信息残留；所有文件操作都被限制在当前会话工作区（及 `EXTRA_ROOTS` 可选项，默认关闭）。
