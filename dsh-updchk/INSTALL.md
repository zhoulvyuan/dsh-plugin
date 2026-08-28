# dsh-updchk — 引入到 DSH 使用说明

本插件提供 **检查更新面板**（版本展示、npm 最新版检测、自定义插件兼容性风险评估、后台更新与回滚）。

- 宿主半部：`lib/index.js`（Cordis 插件，挂载 `/updk/*` 路由）
- 客户端半部：`lib/client.js`（浏览器 React，侧边栏底部按钮 + 检查更新面板）
- 注册层：`cordis.patch.yml`（由 `package.json` 的 `dsh.bundle.patch` 指向，DSH 自动加载）

---

## 一、前置条件

| 依赖 | 要求 | 安装 |
|---|---|---|
| Node.js | >= 18 | `brew install node` / 官方安装包 |
| DSH | 提供 `dsh plugin` / `dsh web` 命令 | 官方 DSH 安装 |
| pnpm（可选） | 更新时优先使用；无 pnpm 自动回退 npm | `npm i -g pnpm` |

> 本插件**无运行时依赖**（`package.json` 不含 `dependencies`），macOS / Windows / Linux 通用。
> 更新引擎选择：有 `pnpm` 用 pnpm（规避 npm 解析死循环），否则用 npm。

---

## 二、安装方式 A：官方 profile bundle 机制（推荐）

本插件已内置 `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }`，`dsh plugin add`
之后会自动登记进 bundle 层，**无需手工编辑 `cordis.patch.yml`**。

```bash
# 1. 获取仓库（或直接拿到 dsh-updchk 目录）
git clone https://github.com/zhoulvyuan/dsh-plugin.git
cd dsh-plugin

# 2. 官方命令安装到 web profile
dsh plugin --profile web add file:./dsh-updchk
```

> 说明：
> - `--profile web` 对应 `$DSH_HOME/profiles/web/`。
> - 必须带 `./`（或 `file:./`）前缀：`dsh plugin` 只把以 `.`/`..` 开头的相对路径
>   相对「当前目录」定位，不带前缀会被当成 npm 注册表包名。

安装完成后（自动完成，无需手改配置）：

- 插件文件位于 `$DSH_HOME/profiles/web/node_modules/dsh-updchk/`
- profile `package.json` 的 `dependencies` 已写入 `dsh-updchk`
- `dsh.profile.bundles` 已自动加入 `dsh-updchk`

验证配置树：

```bash
dsh --profile web --dump-default-config   # 确认 updchk 出现在组合后的配置树
```

---

## 三、安装方式 B：离线 / 自包含（免 pnpm）

本插件无依赖，整个插件就是 4 个文件，可直接放入任意 DSH profile：

1. 解压打包产物（或直接使用仓库中的 `dsh-updchk/` 目录）：

   ```bash
   mkdir -p ~/dsh-plugins
   cd ~/dsh-plugins
   unzip dsh-updchk-*.zip
   ```

2. 链接到 web profile 的 `node_modules`：

   ```bash
   ln -s ~/dsh-plugins/dsh-updchk "$DSH_HOME/profiles/web/node_modules/dsh-updchk"
   ```

   > Windows 下用管理员命令提示符：
   > `mklink /D "%USERPROFILE%\.dsh\profiles\web\node_modules\dsh-updchk" "%CD%\dsh-updchk"`

3. 在 `$DSH_HOME/profiles/web/package.json` 的 `dsh.profile.bundles` 数组里加一项：

   ```json
   "dsh": {
     "profile": {
       "bundles": [
         "@deepseek-ai/dsh-base",
         "@deepseek-ai/dsh-web-app",
         "dsh-updchk"
       ]
     }
   }
   ```

   > 只需加包名 `dsh-updchk`（与插件 `package.json` 的 `name` 一致）。
   > 插件自带的 `cordis.patch.yml` 会完成 `- id: updchk / name: dsh-updchk` 的注册。

---

## 四、启动与验证

```bash
dsh web
```

启动后：

- 宿主半部挂载 `/updk/status`、`/updk/check`、`/updk/update`、`/updk/progress`、`/updk/cancel`、`/updk/rollback` 路由；
- 客户端半部在浏览器侧边栏底部出现「检查更新」按钮，点击打开面板；
- 面板展示当前版本与自定义插件数量，点击「检查更新」进行风险分析与升级确认。

---

## 五、数据与隐私说明

插件**不在自身目录写入任何运行数据**。更新产物与版本指针统一落在
`$DSH_HOME/runtime/`：

- `runtime/versions/<v>/` — 各版本安装树（上一版本保留）
- `runtime/current.json` / `runtime/previous.json` — 当前 / 上一版本指针

任何失败都会清理暂存目录、保持旧版不受影响，不残留用户路径 / 凭据 / 机器信息。

---

## 六、常见问题

- **提示「无法确定当前 dsh 版本」**：插件会依次尝试 staged runtime 指针、运行中进程的 `argv[1]` 反推、`PATH` 上的 `dsh`；三者都找不到时才报此错。
- **更新慢不等于卡住**：面板区分「持续有输出（慢）」与「长时间无输出（疑似卡住）」；卡住超过 3 分钟自动中止。
- **风险为「高/中」**：表示某自定义插件引用的 `@deepseek-ai/*` 包已消失或不在新版依赖树，升级后该插件可能失效，建议先确认再更新。
- **卸载（方式 A）**：`dsh plugin --profile web remove dsh-updchk`。
- **卸载（方式 B）**：删除符号链接，并从 `dsh.profile.bundles` 里移除 `dsh-updchk`。
