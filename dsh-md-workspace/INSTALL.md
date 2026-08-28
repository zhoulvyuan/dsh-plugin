# dsh-md-workspace — 引入到 DSH 使用说明

本插件提供 **本地目录浏览 + Markdown 打开/编辑/实时预览**（宿主 REST 路由 + 浏览器客户端浮层面板）。

- 宿主半部：`lib/index.js`（Cordis 插件，挂载 `/mdw/*` 路由）
- 客户端半部：`lib/client.js`（浏览器 React，侧边栏底部按钮 + 悬浮面板）
- 注册层：`cordis.patch.yml`（由 `package.json` 的 `dsh.bundle.patch` 指向，DSH 自动加载）

---

## 一、前置条件

| 依赖 | 要求 | 安装 |
|---|---|---|
| Node.js | >= 18 | `brew install node` / 官方安装包 |
| DSH | 提供 `dsh plugin` / `dsh web` 命令 | 官方 DSH 安装 |
| pnpm | 任意近期版本（方式 A 需要，`dsh plugin` 内部调用） | `npm i -g pnpm` |

验证：

```bash
node --version
pnpm --version
```

> 本插件**无运行时依赖**（`package.json` 不含 `dependencies`），macOS / Windows / Linux 通用。

---

## 二、安装方式 A：官方 profile bundle 机制（推荐）

DSH 官方把「树外插件」安装到 profile 自身的 `node_modules`，并登记在 profile 的
`package.json`（`dependencies` + `dsh.profile.bundles`）。本插件已内置
`"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }`，因此 `dsh plugin add`
之后会自动登记进 bundle 层，**无需手工编辑 `cordis.patch.yml`**。

```bash
# 1. 获取仓库（或直接拿到 dsh-md-workspace 目录）
git clone https://github.com/zhoulvyuan/dsh-plugin.git
cd dsh-plugin

# 2. 官方命令安装到 web profile
dsh plugin --profile web add file:./dsh-md-workspace
```

> 说明：
> - `--profile web` 对应 `$DSH_HOME/profiles/web/`。
> - 必须带 `./`（或 `file:./`）前缀：`dsh plugin` 只把以 `.`/`..` 开头的相对路径
>   相对「当前目录」定位，不带前缀会被当成 npm 注册表包名。

安装完成后（自动完成，无需手改配置）：

- 插件文件位于 `$DSH_HOME/profiles/web/node_modules/dsh-md-workspace/`
- profile `package.json` 的 `dependencies` 已写入 `dsh-md-workspace`
- `dsh.profile.bundles` 已自动加入 `dsh-md-workspace`

验证配置树：

```bash
dsh --profile web --dump-default-config   # 确认 md-workspace 出现在组合后的配置树
```

---

## 三、安装方式 B：离线 / 自包含（免 pnpm）

本插件无依赖，整个插件就是 4 个文件，可直接放入任意 DSH profile：

1. 解压打包产物（或直接使用仓库中的 `dsh-md-workspace/` 目录）：

   ```bash
   mkdir -p ~/dsh-plugins
   cd ~/dsh-plugins
   unzip dsh-md-workspace-*.zip
   ```

2. 链接到 web profile 的 `node_modules`：

   ```bash
   ln -s ~/dsh-plugins/dsh-md-workspace "$DSH_HOME/profiles/web/node_modules/dsh-md-workspace"
   ```

   > Windows 下用管理员命令提示符：
   > `mklink /D "%USERPROFILE%\.dsh\profiles\web\node_modules\dsh-md-workspace" "%CD%\dsh-md-workspace"`

3. 在 `$DSH_HOME/profiles/web/package.json` 的 `dsh.profile.bundles` 数组里加一项：

   ```json
   "dsh": {
     "profile": {
       "bundles": [
         "@deepseek-ai/dsh-base",
         "@deepseek-ai/dsh-web-app",
         "dsh-md-workspace"
       ]
     }
   }
   ```

   > 只需加包名 `dsh-md-workspace`（与插件 `package.json` 的 `name` 一致）。
   > 插件自带的 `cordis.patch.yml` 会完成 `- id: md-workspace / name: dsh-md-workspace` 的注册。

---

## 四、启动与验证

```bash
dsh web
```

启动后：

- 宿主半部挂载 `/mdw/root`、`/mdw/list`、`/mdw/read`、`/mdw/write` 路由；
- 客户端半部在浏览器侧边栏底部出现「文件」按钮，点击打开悬浮面板；
- 面板内可浏览当前会话工作区、打开/编辑文件、实时预览 Markdown。

---

## 五、数据与隐私说明

插件**不在自身目录写入任何运行数据**：没有工作区注册表、没有凭据、没有用户路径残留。
所有文件读写都被约束在当前会话工作区（及 `lib/index.js` 顶部 `EXTRA_ROOTS` 可选项，默认空）。

---

## 六、常见问题

- **面板打不开文件**：确认目标路径在当前会话工作区内；超出工作区的路径会被拒绝（`FS_OUTSIDE_WORKSPACE`）。
- **卸载（方式 A）**：`dsh plugin --profile web remove dsh-md-workspace`。
- **卸载（方式 B）**：删除符号链接，并从 `dsh.profile.bundles` 里移除 `dsh-md-workspace`。
