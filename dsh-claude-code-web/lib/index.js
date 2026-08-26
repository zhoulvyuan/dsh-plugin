// dsh-claude-code-web — host half.
//
// 把 Claude Code 工作台的 HTTP 面内嵌挂载到 DSH 自身的 webServer 上：
//   - 复用 ../server.cjs 的共享处理器 handleRequest / initServer（服务器逻辑
//     已内聚到本插件目录，不再依赖独立运行的 claude-code-web 工作空间）。
//   - 设置 CLAUDE_BASE_PATH=/claude，server.cjs 据此剥离前缀并给前端注入 base。
//   - 注册 prefix 路由 /claude，匹配 /claude 及 /claude/*（HTTP API）。
//   - 注册 upgrade 路由 /claude/api/stream（WebSocket 下行推送，取代 SSE）。
//
// 客户端半部（lib/client.js）提供全局入口：侧边栏底部按钮（sidebar.footer.action）
// + 全局悬浮面板（shell.overlay），通过 fetch + WebSocket 访问 /claude/api/*。
// 入口是 root 作用域，不依赖任何工作空间/会话。

import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const name = 'dsh-claude-code-web'
const inject = ['webServer']

function apply(ctx) {
  // 复用本插件目录的共享处理器（require 不会触发监听端口）
  const appEntry = require.resolve('../server.cjs')
  // 挂载前缀须在加载 server.cjs 之前设定（其 BASE_PATH 在模块加载时读取）
  if (!process.env.CLAUDE_BASE_PATH) process.env.CLAUDE_BASE_PATH = '/claude'
  const { handleRequest, handleUpgrade, initServer, disposeServer } = require(appEntry)
  initServer()

  ctx.effect(() => {
    const disposeHttp = ctx.webServer.register({
      kind: 'prefix',
      path: '/claude',
      handler: handleRequest,
    })
    const disposeUpgrade = ctx.webServer.registerUpgrade({
      path: '/claude/api/stream',
      handler: handleUpgrade,
    })
    return () => {
      disposeUpgrade()
      disposeHttp()
      disposeServer()
    }
  }, 'dsh-claude-code-web: /claude HTTP + WebSocket routes')
}

export { apply, inject, name }
