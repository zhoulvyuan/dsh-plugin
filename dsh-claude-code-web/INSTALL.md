# dsh-claude-code-web — 引入到 DSH 使用说明

本插件把 **Claude Code** 包装成 DSH 原生插件（宿主进程内嵌 HTTP/WebSocket 服务 + 浏览器客户端悬浮面板）。

- 宿主半部：`lib/index.js`（Cordis 插件，挂载 `/claude` 路由）
- 客户端半部：`lib/client.js`（浏览器 React，侧边栏底部按钮 + 悬浮面板）
- 核心服务：`server.cjs`（HTTP/WebSocket 处理，复用同一份）
- 注册层：`cordis.patch.yml`（由 `package.json` 的 `dsh.bundle.patch` 指向，DSH 自动加载）

---

## 一、前置条件

目标机必须已安装：

| 依赖 | 要求 | 安装 |
|---|---|---|
| Node.js | >= 18 | `brew install node` / 官方安装包 |
| DSH | 含 `webServer.registerUpgrade`，并提供 `dsh plugin` / `dsh web` 命令 | 官方 DSH 安装 |
| pnpm | 任意近期版本（方式 A 需要，`dsh plugin` 内部调用） | `npm i -g pnpm` |
| Claude Code CLI | 与 SDK 兼容版本 | `npm i -g @anthropic-ai/claude-code` |
| Anthropic 凭据 | 已登录 | `claude` 首次运行登录 |

验证：

```bash
claude --version
pnpm --version
```

---

## 二、安装方式 A：官方 profile bundle 机制（推荐 / 在线）

DSH 官方把「树外插件」安装到 profile 自身的 `node_modules`，并登记在 profile 的
`package.json`（`dependencies` + `dsh.profile.bundles`）。本插件已内置
`"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }`，因此 `dsh plugin add`
之后会自动登记进 bundle 层，**无需手工编辑 `cordis.patch.yml`**。

```bash
# 1. 获取仓库（或直接拿到 dsh-claude-code-web 目录）
git clone https://github.com/zhoulvyuan/dsh-plugin.git
cd dsh-plugin

# 2. 官方命令安装到 web profile
#    `dsh plugin` 等价于在 profile 目录里执行 pnpm add，再自动校准 bundles
dsh plugin --profile web add file:./dsh-claude-code-web
```

> 说明：
> - `--profile web` 对应 `$DSH_HOME/profiles/web/`；插件 `dsh.client.platform` 为 `web`。
> - 必须带 `./`（或 `file:./`）前缀：`dsh plugin` 只把以 `.`/`..` 开头的相对路径
>   相对「当前目录」定位，不带前缀会被当成 npm 注册表包名。
> - 依赖（`ws`、`@anthropic-ai/claude-agent-sdk`）由 pnpm 依 `dependencies` 安装；
>   SDK 会按目标平台自动选择对应原生包（darwin-arm64/x64、linux-*、win32-*），跨平台无需手动处理。

安装完成后（自动完成，无需手改配置）：

- 插件文件位于 `$DSH_HOME/profiles/web/node_modules/dsh-claude-code-web/`
- profile `package.json` 的 `dependencies` 已写入 `dsh-claude-code-web`
- `dsh.profile.bundles` 已自动加入 `dsh-claude-code-web`（因为本插件声明了 `dsh.bundle`）

验证配置树：

```bash
dsh --profile web --dump-default-config   # 确认 claude-code-web 出现在组合后的配置树
```

---

## 三、安装方式 B：离线 / 自包含包（不依赖 pnpm 拉取依赖）

保留原「自包含包」用法：仓库内 `node_modules/` 仍是插件自带的运行依赖（ws + SDK），
适用于离线、或不便运行 pnpm 的环境，以及 Windows/macOS/Linux 免网络直接部署。

1. 解压打包产物（或直接使用仓库中的 `dsh-claude-code-web/` 目录）：

   ```bash
   mkdir -p ~/dsh-plugins
   cd ~/dsh-plugins
   unzip dsh-claude-code-web-*.zip
   ```

2. 链接到 web profile 的 `node_modules`：

   ```bash
   ln -s ~/dsh-plugins/dsh-claude-code-web "$DSH_HOME/profiles/web/node_modules/dsh-claude-code-web"
   ```

   > Windows 下用管理员命令提示符：
   > `mklink /D "%USERPROFILE%\.dsh\profiles\web\node_modules\dsh-claude-code-web" "%CD%\dsh-claude-code-web"`

3. 在 `$DSH_HOME/profiles/web/package.json` 的 `dsh.profile.bundles` 数组里加一项：

   ```json
   "dsh": {
     "profile": {
       "bundles": [
         "@deepseek-ai/dsh-base",
         "@deepseek-ai/dsh-web-app",
         "dsh-claude-code-web"
       ]
     }
   }
   ```

   > 只需加包名 `dsh-claude-code-web`（与插件 `package.json` 的 `name` 一致）。
   > 插件自带的 `cordis.patch.yml` 会完成 `- id: claude-code-web / name: dsh-claude-code-web` 的注册。

---

## 四、启动与验证

启动 web profile（`web` 是 `--profile web` 的别名）：

```bash
dsh web
```

启动后：

- 宿主半部挂载 `/claude` HTTP + `/claude/api/stream` WebSocket 路由；
- 客户端半部在浏览器侧边栏底部出现 Claude Code 按钮，点击打开悬浮面板；
- 面板内可选择工作区、发起对话、流式返回正常。

---

## 五、用户数据说明（跨机不携带）

插件运行时数据**不写入插件目录**，而是写入用户数据目录（`CLAUDE_CODE_WEB_HOME`，默认 `~/.claude-code-web/`）：

- `workspaces.json` — 工作区注册表
- `command-map.json` — 命令展开映射（历史里隐藏命令提示词）

首次启动自动从插件目录迁移旧状态（如有）。因此插件目录可**只读/纯代码**部署，不会残留个人路径。

> 若要同步命令/技能/历史，请参考 `DEPLOY.md` 的 `~/.claude` 同步章节。

---

## 六、常见问题

- **找不到 claude**：报 `spawn ... ENOENT`。设置 `CLAUDE_BIN=/path/to/claude` 后重启 DSH。
- **Windows**：已自动解析 `%APPDATA%\npm` 下原生 `claude.exe`，无需手动配置。
- **卸载（方式 A）**：`dsh plugin --profile web remove dsh-claude-code-web`（bundles 与 dependencies 自动清理）。
- **卸载（方式 B）**：删除符号链接，并从 `dsh.profile.bundles` 里移除 `dsh-claude-code-web`。
