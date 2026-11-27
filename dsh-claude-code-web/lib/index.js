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
  //
  // 注意读法：cordis 里访问未声明 inject 的服务会抛
  // `cannot get property "xxx" without inject`，所以这里不能直接写 ctx.connection；
  // 走 ctx.reflect.get()（主动跳过 inject 约束）读取，拿不到再退回属性访问。
  // 这样既保住准入，又不把插件绑死在“必须有 connection 服务”的宿主版本上。
  function serviceOf(name) {
    try {
      if (ctx.reflect && typeof ctx.reflect.get === 'function') {
        const provided = ctx.reflect.get(name)
        if (provided) return provided
      }
    } catch (e) {}
    try { return ctx[name] } catch (e) { return null }
  }

  // 默认与上游一致：/claude/* 叠加宿主 cookie 鉴权。
  // 只有显式设置 CCW_ALLOW_LOOPBACK_ONLY=1 才放宽为「仅插件自身的 loopback 校验」——
  // 独立窗口由系统浏览器打开，拿不到 dsh-auth-* cookie，需要放宽才能访问。
  // 放宽后仍由 server.cjs 的 isTrustedRequest 把关：loopback 主机名 + Origin +
  // Sec-Fetch-Site，跨源/跨站一律 403；且宿主只监听 127.0.0.1。
  const ALLOW_LOOPBACK_ONLY = process.env.CCW_ALLOW_LOOPBACK_ONLY === '1'

  function admission(req) {
    if (ALLOW_LOOPBACK_ONLY) return undefined
    const service = serviceOf('connection')
    if (!service || typeof service.requestRejection !== 'function') return undefined
    return service.requestRejection(req)
  }

  // 独立窗口：DSH Desktop 对 window.open 一律 deny，因此改由宿主半部调用系统
  // 默认浏览器打开同一份 /claude/ 页面。所有调用结果写日志，便于没有 Console 时排查。
  function detachLog(line) {
    try {
      const fs2 = require('node:fs')
      const path2 = require('node:path')
      // server.cjs 的数据目录同样以 CLAUDE_CODE_WEB_HOME 优先、否则 ~/.claude-code-web
      const dir = process.env.CLAUDE_CODE_WEB_HOME || path2.join(require('node:os').homedir(), '.claude-code-web')
      fs2.mkdirSync(dir, { recursive: true })
      fs2.appendFileSync(path2.join(dir, 'open-detached.log'), new Date().toISOString() + ' ' + line + '\n')
    } catch (e) {}
  }

  function openDetachedInBrowser(req, res) {
    const reply = (code, payload) => {
      try {
        res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
        res.end(JSON.stringify(payload))
      } catch (e) {}
    }
    let body = ''
    req.on('data', (chunk) => { body += chunk; if (body.length > 8192) body = body.slice(0, 8192) })
    req.on('end', () => {
      let theme = 'light'
      try { if (JSON.parse(body || '{}').theme === 'dark') theme = 'dark' } catch (e) {}
      const host = String(req.headers.host || '')
      // 桌面壳里 document 的 origin 是 dsh-app://app，客户端拼不出浏览器能识别的地址，
      // 所以这里按请求的 Host 自行构造真实 http 地址；Host 必须是 loopback。
      if (!host || !/^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(host)) {
        detachLog('rejected host=' + host)
        return reply(400, { ok: false, error: 'unexpected host' })
      }
      const target = 'http://' + host + '/claude/?ccwDetached=1&ccwTheme=' + theme
      detachLog('target=' + target)
      try {
        const { spawn } = require('node:child_process')
        const spec = process.platform === 'win32'
          ? ['cmd', ['/c', 'start', '', target]]
          : process.platform === 'darwin' ? ['open', [target]] : ['xdg-open', [target]]
        const child = spawn(spec[0], spec[1], { detached: true, stdio: 'ignore', windowsHide: true })
        child.on('error', (error) => detachLog('spawn error ' + String(error && error.message || error)))
        child.unref()
        detachLog('spawned ' + spec[0] + ' ' + target)
        return reply(200, { ok: true, opened: target })
      } catch (error) {
        detachLog('throw ' + String(error && error.message || error))
        return reply(500, { ok: false, error: String(error && error.message || error) })
      }
    })
    req.on('error', () => reply(400, { ok: false }))
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
        if (req.method === 'POST' && new URL(req.url, 'http://localhost').pathname.endsWith('/api/open-detached')) {
          return openDetachedInBrowser(req, res)
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
