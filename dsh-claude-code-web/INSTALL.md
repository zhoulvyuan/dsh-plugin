# dsh-claude-code-web — 引入到 DSH 使用说明

本插件把 **Claude Code** 包装成 DSH 原生插件（宿主进程内嵌 HTTP/WebSocket 服务 + 浏览器客户端悬浮面板）。

- 宿主半部：`lib/index.js`（Cordis 插件，挂载 `/claude` 路由）
- 客户端半部：`lib/client.js`（浏览器 React，侧边栏底部按钮 + 悬浮面板）
- 核心服务：`server.cjs`（HTTP/WebSocket 处理，复用同一份）

---

## 一、前置条件

目标机必须已安装：

| 依赖 | 要求 | 安装 |
|---|---|---|
| Node.js | >= 18 | `brew install node` / 官方安装包 |
| DSH | 含 `webServer.registerUpgrade` | 官方 DSH 安装 |
| Claude Code CLI | 与 SDK 兼容版本 | `npm i -g @anthropic-ai/claude-code` |
| Anthropic 凭据 | 已登录 | `claude` 首次运行登录 |

验证 CLI：

```bash
claude --version
```

---

## 二、安装插件目录

解压 zip 后，把 `dsh-claude-code-web` 目录放到任意可写位置（示例：`~/dsh-plugins/`）：

```bash
mkdir -p ~/dsh-plugins
cd ~/dsh-plugins
unzip dsh-claude-code-web-*.zip
```

目录内容（纯功能代码 + 依赖，**不含任何用户数据**）：

```
dsh-claude-code-web/
├── package.json        # 插件清单（name: dsh-claude-code-web）
├── lib/index.js        # 宿主半部（Cordis 插件入口）
├── lib/client.js       # 客户端半部（浏览器 UI）
├── server.cjs          # HTTP/WebSocket 核心服务
├── node_modules/       # 运行依赖（ws + claude-agent-sdk）
├── INSTALL.md          # 本说明
└── DEPLOY.md           # 部署清单（CLAUDE_BIN/数据目录/跨平台）
```

---

## 三、引入到 DSH（符号链接 + patch 配置）

DSH 通过 **profile 的 `node_modules` 符号链接** + **`cordis.patch.yml` 的 insert 列表** 加载插件。

### 3.1 建立符号链接

把插件链接到 DSH web profile 的 `node_modules`：

```bash
ln -s ~/dsh-plugins/dsh-claude-code-web ~/.dsh/profiles/node_modules/dsh-claude-code-web
```

> 若 DSH profile 路径不同，替换为你的实际 profile（通常是 `~/.dsh/profiles/<profile-name>`）。

### 3.2 在 patch 配置里注册插件

编辑 `~/.dsh/profiles/web/cordis.patch.yml`，在 `insert` 列表末尾加一行：

```yaml
- insert:
    - id: md-workspace
      name: dsh-md-workspace
    - id: updchk
      name: dsh-updchk
    - id: claude-code-web
      name: dsh-claude-code-web
```

> `id` 可自定义（如 `claude-code-web`），`name` 必须与插件 `package.json` 的 `name` 一致（`dsh-claude-code-web`）。

### 3.3 重启 DSH

重启后：
- 宿主半部挂载 `/claude` HTTP + `/claude/api/stream` WebSocket 路由；
- 客户端半部在浏览器侧边栏底部出现按钮，点击打开悬浮面板。

### 3.4 验证

- 打开 DSH web，侧边栏底部出现 Claude Code 图标/按钮；
- 面板内可选择工作区、发起对话、流式返回正常。

---

## 四、用户数据说明（跨机不携带）

插件运行时数据**不写入插件目录**，而是写入用户数据目录（`CLAUDE_CODE_WEB_HOME`，默认 `~/.claude-code-web/`）：

- `workspaces.json` — 工作区注册表
- `command-map.json` — 命令展开映射（历史里隐藏命令提示词）

首次启动自动从插件目录迁移旧状态（如有）。因此插件目录可**只读/纯代码**部署，不会残留个人路径。

> 若要同步命令/技能/历史，请参考 `DEPLOY.md` 的 `~/.claude` 同步章节。

---

## 五、常见问题

- **找不到 claude**：报 `spawn ... ENOENT`。设置 `CLAUDE_BIN=/path/to/claude` 后重启 DSH。
- **Windows**：已自动解析 `%APPDATA%\npm` 下原生 `claude.exe`，无需手动配置。
- **卸载**：移除符号链接 + 删掉 `cordis.patch.yml` 里对应行即可。
