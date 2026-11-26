// dsh-claude-code-web — host half.
//
// 把 Claude Code 工作台的 HTTP 面内嵌挂载到 DSH 自身的 webServer 上：
//   - 复用 ../server.cjs 的共享处理器 handleRequest / initServer（服务器逻辑
//     已内聚到本插件目录，不再依赖独立运行的 claude-code-web 工作空间）。
//   - 设置 CLAUDE_BASE_PATH=/claude，server.cjs 据此剥离前缀并给前端注入 base。
//   - 注册 prefix 路由 /claude，匹配 /claude 及 /claude/*（HTTP API）。
//   - 下行使用认证后的有界 HTTP 长轮询（/claude/api/state-poll），不再注册
//     upgrade 路由：宿主托管模式只转发它自己的 WebSocket 协议。
//
// 客户端半部（lib/client.js）提供全局入口：侧边栏底部按钮（sidebar.footer.action）
// + 全局悬浮面板（shell.overlay），通过同源 fetch 访问 /claude/api/*。
// 入口是 root 作用域，不依赖任何工作空间/会话。

import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

// 运行时插件名须与 npm 包名完全一致（含 scope），DSH 依此在 profile 的
// node_modules 里定位该插件。
const name = '@zhoulvyuan/dsh-claude-code-web'
// 只声明 webServer：connection 是宿主的请求准入服务，部分 DSH 版本没有它，
// 因此不进 inject（缺服务会阻断插件加载），运行时探测到才启用。
const inject = ['webServer']

function apply(ctx) {
  // 复用本插件目录的共享处理器（require 不会触发监听端口）
  const appEntry = require.resolve('../server.cjs')
  // 挂载前缀须在加载 server.cjs 之前设定（其 BASE_PATH 在模块加载时读取）
  if (!process.env.CLAUDE_BASE_PATH) process.env.CLAUDE_BASE_PATH = '/claude'
  // 运行数据默认落在宿主 home 下（与独立运行的 DSH 区分）；宿主没提供 DSH_HOME
  // 时保留 server.cjs 自己的默认目录。
  if (!process.env.CLAUDE_CODE_WEB_HOME && process.env.DSH_HOME) {
    process.env.CLAUDE_CODE_WEB_HOME = require('node:path').join(process.env.DSH_HOME, 'claude-code-web')
  }
  const { handleRequest, initServer, disposeServer } = require(appEntry)
  initServer()

  // 宿主的请求准入：存在就复用（与核心 API 相同的 Host/Origin 与会话校验），
  // 不存在则退回 server.cjs 自带的 loopback 信任检查。
  function admission(req) {
    let service = null
    try { service = ctx.connection } catch (e) { service = null }
    if (!service || typeof service.requestRejection !== 'function') return undefined
    return service.requestRejection(req)
  }

  ctx.effect(() => {
    const disposeHttp = ctx.webServer.register({
      kind: 'prefix',
      path: '/claude',
      handler: (req, res) => {
        const rejection = admission(req)
        if (rejection !== undefined) {
          res.writeHead(rejection, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' })
          res.end(rejection === 401 ? 'Unauthorized' : 'Forbidden')
          return
        }
        return handleRequest(req, res)
      },
    })
    return () => {
      disposeHttp()
      disposeServer()
    }
  }, 'dsh-claude-code-web: authenticated /claude HTTP routes')
}

export { apply, inject, name }
