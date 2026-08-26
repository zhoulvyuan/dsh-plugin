#!/usr/bin/env node
'use strict'
// Claude Code 独立工作空间 —— Node 服务 + 浏览器前端
// 启动:  node server.js  （或 ./start.sh）
// 默认地址: http://127.0.0.1:3780

const http = require('http')
const { spawn, execFile, execFileSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const crypto = require('crypto')
const { query, renameSession, deleteSession } = require('@anthropic-ai/claude-agent-sdk')
const { WebSocketServer, WebSocket: WsSocket } = require('ws')

const CLAUDE_BIN = resolveClaudeBin()
const PORT = Number(process.env.CLAUDE_CODE_PORT || 3780)
const ROOT = __dirname
// 用户数据目录：状态文件（workspaces.json / command-map.json）写入此处而非插件安装目录，
// 以便插件以只读方式安装或打包到其它机器时仍可写。可用 CLAUDE_CODE_WEB_HOME 覆盖。
const DATA_HOME = process.env.CLAUDE_CODE_WEB_HOME || path.join(os.homedir(), '.claude-code-web')
// 挂载前缀：独立模式 ''（服务在 /）；内嵌 DSH 时为 '/claude'（服务在 /claude/*）
const BASE_PATH = (process.env.CLAUDE_BASE_PATH || '').replace(/\/+$/, '')

// 确保数据目录存在
function ensureDataHome() {
  try { fs.mkdirSync(DATA_HOME, { recursive: true }) } catch (e) {}
}
// 首次运行：从插件目录把旧状态文件迁移到数据目录（旧文件保留作备份，幂等）
function migrateStateFile(name) {
  const src = path.join(ROOT, name)
  const dst = path.join(DATA_HOME, name)
  try {
    if (fs.existsSync(dst)) return
    if (!fs.existsSync(src)) return
    ensureDataHome()
    fs.copyFileSync(src, dst)
  } catch (e) {}
}
// 定位 Claude Code CLI：环境变量 → 常见安装路径 → PATH 探测 → 默认回退
function resolveClaudeBin() {
  if (process.env.CLAUDE_BIN) {
    try { if (fs.existsSync(process.env.CLAUDE_BIN)) return process.env.CLAUDE_BIN } catch (e) {}
  }
  const home = os.homedir()
  const candidates = [
    '/opt/homebrew/bin/claude',                       // macOS ARM Homebrew
    '/usr/local/bin/claude',                          // macOS Intel / 通用
    path.join(home, '.local', 'bin', 'claude'),       // Linux 常见
    path.join(home, '.bun', 'bin', 'claude'),         // bun 安装
  ]
  if (process.env.npm_config_prefix) candidates.push(path.join(process.env.npm_config_prefix, 'bin', 'claude'))
  if (process.env.npm_global_prefix) candidates.push(path.join(process.env.npm_global_prefix, 'bin', 'claude'))
  // Windows：npm 全局装在 %APPDATA%\npm，装出来的是 claude.cmd shim，
  // 真正的原生二进制在 node_modules\@anthropic-ai\claude-code\bin\claude.exe
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming')
    const npmDir = path.join(appData, 'npm')
    candidates.push(path.join(npmDir, 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe'))
    candidates.push(path.join(npmDir, 'node_modules', '@anthropic-ai', 'claude-code', 'claude.exe'))
    candidates.push(path.join(npmDir, 'claude.exe'))
    candidates.push(path.join(npmDir, 'claude.cmd'))
  }
  for (const c of candidates) {
    try { if (fs.existsSync(c)) return c } catch (e) {}
  }
  try {
    const which = process.platform === 'win32' ? 'where' : 'which'
    const out = execFileSync(which, ['claude'], { encoding: 'utf8' }).split(/\r?\n/)[0].trim()
    if (out) {
      // Windows：where 通常返回 claude.cmd（shim），需解析到同包的原生 claude.exe
      if (process.platform === 'win32' && /\.cmd$/i.test(out)) {
        const base = path.dirname(out)
        const exeCandidates = [
          path.join(base, 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe'),
          path.join(base, '..', 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe'),
          path.join(base, 'node_modules', '@anthropic-ai', 'claude-code', 'claude.exe'),
        ]
        for (const exe of exeCandidates) {
          try { if (fs.existsSync(exe)) return path.normalize(exe) } catch (e) {}
        }
      }
      return out
    }
  } catch (e) {}
  return process.env.CLAUDE_BIN || '/opt/homebrew/bin/claude'
}

// ── 会话状态（复用动态插件 host 逻辑） ─────────────────────────────
const runtime = new Map()
let history = []
let activeId = null
let seq = 0
let workspaceDir = process.cwd()

// ── 工作空间注册表（持久化到用户数据目录 workspaces.json） ──────────
const REGISTRY_FILE = path.join(DATA_HOME, 'workspaces.json')
let wsRegistry = { workspaces: [], removed: [], current: '' }

function loadWsRegistry() {
  migrateStateFile('workspaces.json')
  ensureDataHome()
  try {
    const j = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'))
    if (j && Array.isArray(j.workspaces)) {
      wsRegistry.workspaces = j.workspaces.filter(function (w) { return w && typeof w.path === 'string' })
    }
    if (j && Array.isArray(j.removed)) wsRegistry.removed = j.removed.filter(function (p) { return typeof p === 'string' })
    if (j && typeof j.current === 'string') wsRegistry.current = j.current
  } catch (e) {}
}
function saveWsRegistry() {
  try { fs.writeFileSync(REGISTRY_FILE, JSON.stringify(wsRegistry, null, 2)) } catch (e) {}
}

// ── 命令展开映射（展开正文 hash → 原始命令文本），用于历史记录里隐藏命令提示词 ──
const COMMAND_MAP_FILE = path.join(DATA_HOME, 'command-map.json')
let commandMap = {}

function cmdHash(text) {
  return crypto.createHash('sha256').update(String(text || '')).digest('hex').slice(0, 24)
}
function loadCommandMap() {
  migrateStateFile('command-map.json')
  ensureDataHome()
  try {
    const j = JSON.parse(fs.readFileSync(COMMAND_MAP_FILE, 'utf8'))
    if (j && typeof j === 'object' && !Array.isArray(j)) commandMap = j
  } catch (e) {}
}
function saveCommandMap() {
  try {
    const keys = Object.keys(commandMap)
    while (keys.length > 5000) { delete commandMap[keys.shift()] }
    fs.writeFileSync(COMMAND_MAP_FILE, JSON.stringify(commandMap, null, 2))
  } catch (e) {}
}
// 记录一次命令展开：发送时原文以 / 开头且与展开正文不同
function recordCommand(text, expanded) {
  if (!text || !expanded || text === expanded) return
  if (!/^\//.test(text)) return
  commandMap[cmdHash(expanded)] = text
  saveCommandMap()
}
// 读取历史时：若用户消息命中命令映射，返回原始命令文本（隐藏展开后的提示词）
function resolveCommandDisplay(raw) {
  const mapped = commandMap[cmdHash(raw)]
  return mapped || raw
}
function wsEntry(p) {
  return wsRegistry.workspaces.find(function (w) { return w.path === p })
}
// 显式加入（用户操作 / 当前工作区 / 运行时会话）：从 removed 中移除并加回列表
function addWs(p) {
  if (!p || typeof p !== 'string') return
  const ri = wsRegistry.removed.indexOf(p)
  if (ri !== -1) wsRegistry.removed.splice(ri, 1)
  if (!wsEntry(p)) wsRegistry.workspaces.push({ path: p, name: '' })
}
// 自动发现（扫描历史会话）：仅当未被用户删除时才加入
function discoverWs(p) {
  if (!p || typeof p !== 'string') return
  if (wsRegistry.removed.indexOf(p) !== -1) return
  if (!wsEntry(p)) wsRegistry.workspaces.push({ path: p, name: '' })
}

function newRecord(permissionMode, cwd) {
  return {
    key: 'r' + (++seq),
    sessionId: null,
    title: '',
    permissionMode: permissionMode || 'default',
    cwd: cwd || workspaceDir,
    status: 'idle',
    model: '',
    error: null,
    stderrTail: '',
    messages: [],
    counter: 0,
    pendingControl: null,
    pendingControls: {},
    buffer: '',
    handle: null,
    abortController: null,
    query: null,
    inputQueue: null,
    lastResult: null,
    sessionRules: [],
    startedAt: null,
    durationMs: null,
  }
}

function pushMsg(r, m) {
  r.messages.push(m)
  if (r.messages.length > 500) r.messages.splice(0, r.messages.length - 500)
  markDirty()
}

function stringifyContent(content) {
  if (content == null) return ''
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content.map(function (c) {
      if (c == null) return ''
      if (typeof c === 'string') return c
      if (typeof c === 'object') {
        if (typeof c.text === 'string') return c.text
        return JSON.stringify(c)
      }
      return String(c)
    }).join('\n')
  }
  if (typeof content === 'object') return JSON.stringify(content)
  return String(content)
}

function plainSession(r) {
  return {
    key: r.key,
    sessionId: r.sessionId,
    title: r.title,
    status: r.status,
    cwd: r.cwd,
    model: r.model,
    permissionMode: r.permissionMode,
    error: r.error,
    startedAt: r.startedAt,
    durationMs: r.durationMs,
    stderrTail: r.stderrTail.slice(-2000),
    pendingControl: r.pendingControl,
    lastResult: r.lastResult,
    messages: r.messages.slice(),
  }
}

function runtimeHasSessionId(id) {
  let found = false
  runtime.forEach(function (r) { if (r.sessionId === id) found = true })
  return found
}

function snapshot() {
  const groups = new Map()
  function groupOf(p) {
    if (!groups.has(p)) groups.set(p, { path: p, sessions: [] })
    return groups.get(p)
  }
  const now = Date.now()

  // 所有已注册工作区先建组（含空工作区），当前工作区始终可见
  wsRegistry.workspaces.forEach(function (w) { groupOf(w.path) })
  if (workspaceDir) { addWs(workspaceDir); groupOf(workspaceDir) }

  runtime.forEach(function (r) {
    const cwd = r.cwd || workspaceDir
    if (cwd) addWs(cwd)
    const g = groupOf(cwd)
    g.sessions.push({
      key: r.key,
      id: r.sessionId || null,
      title: r.title || (r.sessionId ? r.sessionId.slice(0, 8) : '（新会话）'),
      status: r.status,
      active: r.key === activeId,
      source: 'runtime',
      mtimeMs: now,
    })
  })

  const wsPaths = new Set(wsRegistry.workspaces.map(function (w) { return w.path }))
  for (const h of history) {
    if (runtimeHasSessionId(h.id)) continue
    const cwd = h.cwd || ''
    if (cwd && !wsPaths.has(cwd)) continue   // 未注册（已删除）的工作区不显示其历史会话
    const g = groupOf(cwd)
    g.sessions.push({
      key: null,
      id: h.id,
      title: h.title || h.id.slice(0, 8),
      status: 'idle',
      active: false,
      source: 'history',
      mtimeMs: h.mtimeMs || 0,
    })
  }

  function ord(s) {
    if (s.active) return 0
    if (s.source === 'runtime' && (s.status === 'running' || s.status === 'starting')) return 1
    if (s.source === 'runtime') return 2
    return 3
  }

  const workspaces = []
  groups.forEach(function (g) {
    g.sessions.sort(function (a, b) {
      const oa = ord(a), ob = ord(b)
      if (oa !== ob) return oa - ob
      return (b.mtimeMs || 0) - (a.mtimeMs || 0)
    })
    let maxM = 0
    g.sessions.forEach(function (s) { if ((s.mtimeMs || 0) > maxM) maxM = s.mtimeMs })
    const entry = wsEntry(g.path)
    workspaces.push({ path: g.path, name: entry ? (entry.name || '') : '', sessions: g.sessions, maxMtimeMs: maxM })
  })
  workspaces.sort(function (a, b) {
    const aAct = a.sessions.some(function (s) { return s.active })
    const bAct = b.sessions.some(function (s) { return s.active })
    if (aAct !== bAct) return aAct ? -1 : 1
    return b.maxMtimeMs - a.maxMtimeMs
  })

  return {
    active: (activeId && runtime.has(activeId)) ? plainSession(runtime.get(activeId)) : null,
    workspaces: workspaces,
  }
}

function handleMessage(r, msg) {
  if (!msg || typeof msg !== 'object') return
  markDirty()
  const type = msg.type
  if (type === 'system') {
    if (msg.subtype === 'init') {
      r.sessionId = msg.session_id || r.sessionId
      r.cwd = msg.cwd || r.cwd
      r.model = msg.model || r.model
      r.permissionMode = msg.permissionMode || r.permissionMode
      r.status = 'running'
    }
    return
  }
  if (type === 'assistant' && msg.message) {
    const m = msg.message
    const key = m.id || ('m' + (++r.counter))
    let am = null
    for (let i = 0; i < r.messages.length; i++) {
      const x = r.messages[i]
      if (x.role === 'assistant' && x.messageKey === key) { am = x; break }
    }
    const streamed = r._streamedKeys && r._streamedKeys.has(key)
    if (!am) {
      am = { id: r.counter++, role: 'assistant', messageKey: key, model: m.model || '', text: '', thinking: '' }
      pushMsg(r, am)
    } else if (streamed) {
      // 该消息已通过 stream_event 流式累积过，完整版到达后用完整内容替换，避免重复拼接
      am.text = ''
      am.thinking = ''
      if (m.model) am.model = m.model
      r._streamedKeys.delete(key)
    }
    const blocks = m.content || []
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i]
      if (!b || typeof b !== 'object') continue
      if (b.type === 'text') { if (am.text.length < 200000) am.text += b.text || '' }
      else if (b.type === 'thinking') { if (am.thinking.length < 200000) am.thinking += b.thinking || '' }
      else if (b.type === 'tool_use') {
        pushMsg(r, { id: r.counter++, role: 'tool', toolUseId: b.id, name: b.name || 'Tool', input: b.input || {}, result: null, isError: false, status: 'running' })
      }
    }
    return
  }
  if (type === 'stream_event' && msg.event) {
    const ev = msg.event
    if (ev.type === 'message_start') {
      const key = (ev.message && ev.message.id) || ('m' + (++r.counter))
      r._streamKey = key
      if (!r._streamedKeys) r._streamedKeys = new Set()
      r._streamedKeys.add(key)
      let am = null
      for (let i = 0; i < r.messages.length; i++) {
        const x = r.messages[i]
        if (x.role === 'assistant' && x.messageKey === key) { am = x; break }
      }
      if (!am) {
        pushMsg(r, { id: r.counter++, role: 'assistant', messageKey: key, model: '', text: '', thinking: '' })
      }
      return
    }
    if (ev.type === 'content_block_delta' && ev.delta && r._streamKey) {
      let am = null
      for (let i = 0; i < r.messages.length; i++) {
        const x = r.messages[i]
        if (x.role === 'assistant' && x.messageKey === r._streamKey) { am = x; break }
      }
      if (!am) return
      if (ev.delta.type === 'thinking_delta' && ev.delta.thinking) {
        if (am.thinking.length < 200000) am.thinking += ev.delta.thinking
      } else if (ev.delta.type === 'text_delta' && ev.delta.text) {
        if (am.text.length < 200000) am.text += ev.delta.text
      }
    }
    return
  }
  if (type === 'user' && msg.message) {
    const blocks = msg.message.content || []
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i]
      if (!b || typeof b !== 'object') continue
      if (b.type === 'tool_result') {
        const tid = b.tool_use_id
        for (let j = 0; j < r.messages.length; j++) {
          const x = r.messages[j]
          if (x.role === 'tool' && x.toolUseId === tid) {
            x.result = stringifyContent(b.content)
            x.isError = !!b.is_error
            x.status = 'done'
            break
          }
        }
      }
    }
    return
  }
  if (type === 'result') {
    r.status = msg.is_error ? 'error' : 'done'
    r.lastResult = {
      isError: !!msg.is_error,
      durationMs: msg.duration_ms != null ? msg.duration_ms : null,
      costUsd: msg.total_cost_usd != null ? msg.total_cost_usd : null,
    }
    if (msg.session_id) r.sessionId = msg.session_id
    if (msg.is_error) {
      pushMsg(r, { id: r.counter++, role: 'result', text: msg.result != null ? String(msg.result) : '', isError: true })
    }
    return
  }
  if (type === 'control_request' && msg.request) {
    r.pendingControl = {
      requestId: msg.request_id || '',
      subtype: msg.request.subtype || '',
      toolName: msg.request.tool_name || '',
      input: msg.request.input || {},
      suggestions: msg.request.permission_suggestions || [],
    }
    pushMsg(r, { id: r.counter++, role: 'control', requestId: r.pendingControl.requestId, subtype: r.pendingControl.subtype, toolName: r.pendingControl.toolName, input: r.pendingControl.input, suggestions: r.pendingControl.suggestions })
    return
  }
}

function onStdout(r, chunk) {
  r.buffer += chunk.toString('utf8')
  let idx
  while ((idx = r.buffer.indexOf('\n')) !== -1) {
    const line = r.buffer.slice(0, idx)
    r.buffer = r.buffer.slice(idx + 1)
    if (line.trim() === '') continue
    let msg
    try { msg = JSON.parse(line) } catch (e) { continue }
    handleMessage(r, msg)
  }
}

function AsyncQueue() {
  const items = []
  const waiters = []
  let closed = false
  return {
    push: function (item) {
      if (closed || item == null) return
      if (waiters.length > 0) {
        const w = waiters.shift()
        w.resolve({ value: item, done: false })
      } else {
        items.push(item)
      }
    },
    close: function () {
      if (closed) return
      closed = true
      for (let i = 0; i < waiters.length; i++) waiters[i].resolve({ value: undefined, done: true })
      waiters.length = 0
    },
    [Symbol.asyncIterator]: function () {
      return {
        next: function () {
          if (items.length > 0) return Promise.resolve({ value: items.shift(), done: false })
          if (closed) return Promise.resolve({ value: undefined, done: true })
          return new Promise(function (resolve) { waiters.push({ resolve: resolve }) })
        },
      }
    },
  }
}

function killQuery(r) {
  if (r.query) {
    try { if (typeof r.query.interrupt === 'function') r.query.interrupt() } catch (e) {}
  }
  if (r.abortController) { try { r.abortController.abort() } catch (e) {} }
  denyAllPendingControls(r, '已停止')
  if (r.inputQueue) { try { r.inputQueue.close() } catch (e) {} }
  r.query = null
  r.inputQueue = null
  markDirty()
}

function makeCanUseTool(r) {
  return function canUseTool(toolName, input, opts) {
    opts = opts || {}
    // 已「始终允许」过的命令：直接放行，不再弹窗（deny 黑名单永远不会走到这里，安全兜底不受影响）
    if (matchSessionRule(r, toolName, input)) {
      return Promise.resolve({ behavior: 'allow', updatedInput: input })
    }
    return new Promise(function (resolve) {
      const requestId = opts.requestId || opts.toolUseID || ('ctl' + (++r.counter))
      const pc = {
        requestId: requestId,
        toolName: toolName,
        input: input,
        suggestions: opts.suggestions || [],
        title: opts.title || '',
        displayName: opts.displayName || toolName,
        description: opts.description || '',
        resolve: resolve,
      }
      r.pendingControl = pc
      if (!r.pendingControls) r.pendingControls = {}
      r.pendingControls[requestId] = pc
      pushMsg(r, {
        id: r.counter++,
        role: 'control',
        requestId: requestId,
        toolName: toolName,
        input: input,
        suggestions: pc.suggestions,
        title: pc.title,
        displayName: pc.displayName,
        description: pc.description,
      })
      if (opts.signal) {
        opts.signal.addEventListener('abort', function () {
          try { resolve({ behavior: 'deny', message: '已停止' }) } catch (e) {}
        }, { once: true })
      }
    })
  }
}

function ensureQuery(r) {
  if (r.query) return { ok: true }
  try {
    r.inputQueue = AsyncQueue()
    const opts = {
      cwd: r.cwd,
      permissionMode: r.permissionMode || 'default',
      includePartialMessages: true,
      canUseTool: makeCanUseTool(r),
      pathToClaudeCodeExecutable: CLAUDE_BIN,
    }
    if (r.model) opts.model = r.model
    if (r.sessionId) opts.resume = r.sessionId
    r.abortController = new AbortController()
    opts.abortController = r.abortController
    r._procPermMode = r.permissionMode || 'default'
    r._procModel = r.model || ''
    const q = query({ prompt: r.inputQueue, options: opts })
    r.query = q
    r.status = 'running'
    r.startedAt = Date.now()
    r.durationMs = null
    r.error = null
    r.pendingControl = null
    r.pendingControls = {}
    ;(async function () {
      try {
        for await (const msg of q) {
          handleMessage(r, msg)
        }
      } catch (e) {
        if (r.abortController && r.abortController.signal.aborted) {
          if (r.status === 'running' || r.status === 'starting') r.status = 'stopped'
        } else {
          r.status = 'error'
          if (!r.error) r.error = String(e && e.message ? e.message : e)
        }
        markDirty()
      } finally {
        r.query = null
        r.inputQueue = null
        if (r.status === 'running' || r.status === 'starting') r.status = 'done'
        if (r.startedAt != null) r.durationMs = Date.now() - r.startedAt
        markDirty()
      }
    })()
    return { ok: true }
  } catch (e) {
    r.status = 'error'
    r.error = String(e && e.message ? e.message : e)
    markDirty()
    return { ok: false, error: r.error }
  }
}

function newSession(args) {
  const a = args || {}
  const cur = activeId && runtime.has(activeId) ? runtime.get(activeId) : null
  if (cur && !cur.sessionId && cur.messages.length === 0 && cur.status === 'idle') {
    return { ok: true, key: cur.key }
  }
  let cwd = workspaceDir
  if (a.cwd && typeof a.cwd === 'string') {
    const abs = path.resolve(a.cwd)
    try { if (fs.statSync(abs).isDirectory()) cwd = abs } catch (e) {}
  }
  const r = newRecord(a.permissionMode, cwd)
  runtime.set(r.key, r)
  activeId = r.key
  markDirty()
  return { ok: true, key: r.key }
}

function sendMessage(args) {
  const a = args || {}
  const text = String(a.text || '').trim()          // 聊天记录里显示的用户原文
  const expanded = String(a.expanded || a.text || '').trim()  // 实际发给 claude 的内容（命令展开后）
  if (!text) return { ok: false, error: '消息为空' }
  recordCommand(text, expanded)
  const permissionMode = a.permissionMode || 'default'
  let r = activeId && runtime.has(activeId) ? runtime.get(activeId) : null
  if (!r) {
    r = newRecord(permissionMode)
    runtime.set(r.key, r)
    activeId = r.key
  }
  if (r.status === 'running' || r.status === 'starting') return { ok: false, error: '该会话正在生成中，请等待或切到其它会话' }
  // 权限模式或模型发生变更时，重建进程（session 级授权随之失效，属预期）
  const newModel = a.model !== undefined ? (a.model || '') : (r.model || '')
  if (r.query && ((r._procPermMode || 'default') !== permissionMode || (r._procModel || '') !== newModel)) {
    killQuery(r)
  }
  r.permissionMode = permissionMode
  if (a.model !== undefined) r.model = a.model || ''
  if (!r.title) r.title = text.length > 40 ? text.slice(0, 40) : text
  pushMsg(r, { id: r.counter++, role: 'user', text: text })
  const res = ensureQuery(r)
  if (!res.ok) return res
  r.status = 'running'
  markDirty()
  try {
    r.inputQueue.push({ type: 'user', message: { role: 'user', content: [{ type: 'text', text: expanded }] } })
  } catch (e) {
    r.status = 'error'
    r.error = String(e && e.message ? e.message : e)
    markDirty()
    return { ok: false, error: r.error }
  }
  return { ok: true }
}

function stopSession() {
  const r = activeId && runtime.has(activeId) ? runtime.get(activeId) : null
  if (!r) return { ok: false, error: '无活动会话' }
  if (r.query && typeof r.query.interrupt === 'function') { try { r.query.interrupt() } catch (e) {} }
  denyAllPendingControls(r, '已停止')
  if (r.status === 'running' || r.status === 'starting') r.status = 'stopped'
  markDirty()
  return { ok: true }
}

function switchSession(args) {
  const a = args || {}
  if (a.key && runtime.has(a.key)) { activeId = a.key; markDirty(); return { ok: true } }
  const sid = a.sessionId
  if (!sid) return { ok: false, error: '无效会话' }
  let target = null
  runtime.forEach(function (v) { if (v.sessionId === sid) target = v })
  if (!target) {
    const h = history.find(function (x) { return x.id === sid })
    const r = newRecord(a.permissionMode, (h && h.cwd) ? h.cwd : null)
    r.sessionId = sid
    if (h && h.title) r.title = h.title
    r.messages = loadHistoryMessages(sid)
    r.counter = r.messages.length
    runtime.set(r.key, r)
    target = r
  } else if (target.messages.length === 0 && target.sessionId) {
    target.messages = loadHistoryMessages(target.sessionId)
    target.counter = target.messages.length
  }
  activeId = target.key
  markDirty()
  return { ok: true }
}

function answerControl(args) {
  const a = args || {}
  const r = activeId && runtime.has(activeId) ? runtime.get(activeId) : null
  if (!r) return { ok: false, error: '无活动会话' }
  if (!r.pendingControls) r.pendingControls = {}
  // 按 requestId 精确定位（支持同一 assistant 消息里多个并行工具调用同时请求授权）
  const rid = a.requestId
  let pc = null
  if (rid && r.pendingControls[rid]) {
    pc = r.pendingControls[rid]
    delete r.pendingControls[rid]
  } else if (r.pendingControl && r.pendingControl.requestId === rid) {
    pc = r.pendingControl
    delete r.pendingControls[rid]
  }
  if (!pc && rid) return { ok: false, error: '该授权请求已处理或不存在' }
  if (!pc && !rid) {
    // 兼容旧前端：未传 requestId 时处理最近一个
    const keys = Object.keys(r.pendingControls)
    if (keys.length === 0) return { ok: false, error: '无待处理的授权请求' }
    pc = r.pendingControls[keys[keys.length - 1]]
    delete r.pendingControls[pc.requestId]
  }
  if (!pc || !pc.resolve) return { ok: false, error: '无待处理的授权请求' }
  const behavior = a.behavior === 'allow' ? 'allow' : (a.behavior === 'always' ? 'always' : 'deny')
  let result
  if (behavior === 'allow') {
    result = { behavior: 'allow', updatedInput: pc.input }
  } else if (behavior === 'always') {
    // 始终允许：记录到本次会话的服务端内存规则里，后续同命令自动放行；不写任何配置文件
    addSessionRule(r, pc)
    result = { behavior: 'allow', updatedInput: pc.input }
  } else {
    result = { behavior: 'deny', message: a.message || '用户拒绝' }
  }
  // 在界面上标记该授权卡已处理 + 具体决策，让用户明确自己点了哪个按钮
  markControlDecision(r, pc.requestId, behavior)
  // 维护最近一个 pendingControl 引用（供快照/兼容用）
  const rest = Object.keys(r.pendingControls)
  r.pendingControl = rest.length ? r.pendingControls[rest[rest.length - 1]] : null
  try { pc.resolve(result) } catch (e) {}
  markDirty()
  return { ok: true }
}

function markControlDecision(r, requestId, behavior) {
  if (!requestId) return
  for (let i = r.messages.length - 1; i >= 0; i--) {
    const m = r.messages[i]
    if (m.role === 'control' && m.requestId === requestId) {
      m.decision = behavior
      return
    }
  }
}

function denyAllPendingControls(r, message) {
  const map = r.pendingControls || {}
  const keys = Object.keys(map)
  for (let i = 0; i < keys.length; i++) {
    const pc = map[keys[i]]
    if (pc && pc.resolve) {
      try { pc.resolve({ behavior: 'deny', message: message || '已停止' }) } catch (e) {}
      markControlDecision(r, pc.requestId, 'deny')
    }
  }
  r.pendingControls = {}
  r.pendingControl = null
}

function matchSessionRule(r, toolName, input) {
  const rules = r.sessionRules || []
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i]
    if (!rule || rule.toolName !== toolName) continue
    if (!rule.ruleContent) return true  // 无内容限制 = 整个工具放行
    if (toolName === 'Bash') {
      if (input && input.command === rule.ruleContent) return true
    } else {
      const p = input && (input.file_path || input.notebook_path)
      if (p && p === rule.ruleContent) return true
    }
  }
  return false
}

function addSessionRule(r, pc) {
  const rules = r.sessionRules || []
  const rule = { toolName: pc.toolName, ruleContent: commandContent(pc) || '' }
  for (let i = 0; i < rules.length; i++) {
    if (rules[i].toolName === rule.toolName && rules[i].ruleContent === rule.ruleContent) return
  }
  rules.push(rule)
  r.sessionRules = rules
}

function commandContent(pc) {
  const input = pc.input || {}
  if (typeof input.command === 'string' && input.command) return input.command
  if (typeof input.file_path === 'string' && input.file_path) return input.file_path
  if (typeof input.notebook_path === 'string' && input.notebook_path) return input.notebook_path
  return ''
}

function refreshHistory() {
  const root = path.join(os.homedir(), '.claude', 'projects')
  const out = []
  let dirs = []
  try { dirs = fs.readdirSync(root) } catch (e) { dirs = [] }
  for (const d of dirs) {
    const dir = path.join(root, d)
    let st
    try { st = fs.statSync(dir) } catch (e) { continue }
    if (!st.isDirectory()) continue
    let files = []
    try { files = fs.readdirSync(dir) } catch (e) { continue }
    for (const f of files) {
      if (!f.endsWith('.jsonl')) continue
      const p = path.join(dir, f)
      let s
      try { s = fs.statSync(p) } catch (e) { continue }
      let title = ''
      let cwd = ''
      let first = ''
      let customTitle = ''
      let aiTitle = ''
      let summaryTitle = ''
      try {
        const full = fs.readFileSync(p, 'utf8')
        const head = full.slice(0, 131072)
        // custom-title（用户重命名）追加在文件末尾，故额外读尾部；头部也可能含 ai-title
        const tail = full.length > 131072 ? full.slice(-65536) : ''
        const parse = function (text) {
          for (const ln of text.split('\n')) {
            if (!ln) continue
            let o
            try { o = JSON.parse(ln) } catch (e) { continue }
            if (o.cwd && !cwd) cwd = o.cwd
            if (o.type === 'custom-title' && o.customTitle) customTitle = o.customTitle
            if (o.type === 'ai-title' && o.aiTitle) aiTitle = o.aiTitle
            if (o.type === 'summary' && o.summary) summaryTitle = o.summary
            if (o.type === 'user' && !first && o.message && o.message.content) {
              for (const b of o.message.content) { if (b.type === 'text' && b.text) { first = b.text; break } }
            }
          }
        }
        parse(head)
        if (tail) parse(tail)
        // 优先级与 Claude Code SDK 一致：用户重命名 > AI 自动标题 > summary > 首条用户消息
        title = customTitle || aiTitle || summaryTitle || first
      } catch (e) {}
      out.push({ id: f.slice(0, -6), title: String(title || '').slice(0, 80), cwd: cwd, mtimeMs: s.mtimeMs })
    }
  }
  out.sort(function (a, b) { return b.mtimeMs - a.mtimeMs })
  history = out.slice(0, 200)
  // 把扫描到的会话目录自动登记为工作区（已删除的不再出现）
  out.forEach(function (h) { if (h.cwd) discoverWs(h.cwd) })
  saveWsRegistry()
  markDirty()
  return { ok: true, count: history.length }
}

function readSessionFile(sessionId) {
  const root = path.join(os.homedir(), '.claude', 'projects')
  let dirs = []
  try { dirs = fs.readdirSync(root) } catch (e) { return null }
  for (const d of dirs) {
    const p = path.join(root, d, sessionId + '.jsonl')
    try { if (fs.existsSync(p)) return p } catch (e) {}
  }
  return null
}

function loadHistoryMessages(sessionId) {
  const file = readSessionFile(sessionId)
  if (!file) return []
  let text = ''
  try { text = fs.readFileSync(file, 'utf8') } catch (e) { return [] }
  const msgs = []
  let counter = 0
  const lines = text.split('\n')
  for (const ln of lines) {
    if (!ln) continue
    let o
    try { o = JSON.parse(ln) } catch (e) { continue }
    if (o.type === 'user' && o.message && o.message.content) {
      for (const b of o.message.content) {
        if (b.type === 'text' && b.text) {
          // 命令展开的正文在历史里只显示原始命令（如 /dev-flow），隐藏冗长提示词
          msgs.push({ id: counter++, role: 'user', text: resolveCommandDisplay(b.text) })
        } else if (b.type === 'tool_result') {
          const tid = b.tool_use_id
          for (let j = msgs.length - 1; j >= 0; j--) {
            if (msgs[j].role === 'tool' && msgs[j].toolUseId === tid) {
              msgs[j].result = stringifyContent(b.content)
              msgs[j].isError = !!b.is_error
              msgs[j].status = 'done'
              break
            }
          }
        }
      }
    } else if (o.type === 'assistant' && o.message) {
      const m = o.message
      let textBuf = '', thinkingBuf = ''
      const flush = function () {
        if (textBuf || thinkingBuf) {
          msgs.push({ id: counter++, role: 'assistant', messageKey: m.id || ('m' + counter), model: m.model || '', text: textBuf, thinking: thinkingBuf })
          textBuf = ''; thinkingBuf = ''
        }
      }
      for (const b of (m.content || [])) {
        if (b.type === 'text') textBuf += b.text || ''
        else if (b.type === 'thinking') thinkingBuf += b.thinking || ''
        else if (b.type === 'tool_use') {
          flush()
          msgs.push({ id: counter++, role: 'tool', toolUseId: b.id, name: b.name || 'Tool', input: b.input || {}, result: null, isError: false, status: 'done' })
        }
      }
      flush()
    } else if (o.type === 'result' && o.is_error) {
      msgs.push({ id: counter++, role: 'result', text: o.result != null ? String(o.result) : '', isError: true })
    }
  }
  return msgs.slice(-500)
}

// ── 命令 / 子代理 / Skill 目录 ─────────────────────────────────────
function parseFrontmatter(text) {
  const m = /^---\s*\n([\s\S]*?)\n---\s*\n?/.exec(text)
  if (!m) return { fm: {}, body: text }
  const fm = {}
  const lines = m[1].split('\n')
  let i = 0
  while (i < lines.length) {
    const ln = lines[i]
    if (!ln.trim()) { i++; continue }
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(ln)
    if (!kv) { i++; continue }
    const key = kv[1]
    let val = kv[2]
    if (/^[|>][-+]?$/.test(val)) {
      // 块标量：收集后续缩进行
      const parts = []
      i++
      while (i < lines.length && (lines[i].trim() === '' || /^\s/.test(lines[i]))) {
        parts.push(lines[i].trim())
        i++
      }
      val = parts.join('\n').trim()
    } else {
      i++
    }
    fm[key] = val
  }
  return { fm: fm, body: text.slice(m[0].length) }
}

function readCatalog() {
  const home = os.homedir()
  const commandDirs = [path.join(home, '.claude', 'commands'), path.join(workspaceDir, '.claude', 'commands')]
  const agentDirs = [path.join(home, '.claude', 'agents'), path.join(workspaceDir, '.claude', 'agents')]
  const skillDirs = [path.join(home, '.claude', 'skills'), path.join(workspaceDir, '.claude', 'skills')]
  const commands = []
  const agents = []
  const skills = []
  const seenCmd = new Set(), seenAgent = new Set(), seenSkill = new Set()

  // 内置指令（用户同名 .md 优先，故先扫文件再注入未占用的内置项）
  const BUILTIN_COMMANDS = [
    {
      name: 'init',
      description: '分析代码库并生成/更新 CLAUDE.md',
      argumentHint: '[可选的补充说明]',
      body: [
        '请分析当前代码库，并在项目根目录生成（或更新）CLAUDE.md。步骤：',
        '1. 浏览项目结构与关键文件（README、package.json / pyproject.toml / go.mod 等），确定语言、框架、入口。',
        '2. 确定构建、测试、运行命令与常用开发流程。',
        '3. 梳理代码风格与约定、目录职责、关键模块。',
        '4. 用简洁的中文编写 CLAUDE.md，包含：项目概述、常用命令、架构说明、注意事项。',
        '$ARGUMENTS',
      ].join('\n'),
    },
  ]

  for (const d of commandDirs) {
    let files = []
    try { files = fs.readdirSync(d) } catch (e) { continue }
    for (const f of files) {
      if (!f.endsWith('.md')) continue
      const name = f.slice(0, -3)
      if (seenCmd.has(name)) continue
      let text = ''
      try { text = fs.readFileSync(path.join(d, f), 'utf8') } catch (e) { continue }
      const pf = parseFrontmatter(text)
      seenCmd.add(name)
      commands.push({
        name: name,
        description: (pf.fm.description || '').split('\n')[0].trim(),
        argumentHint: pf.fm['argument-hint'] || '',
        body: pf.body.trim(),
      })
    }
  }

  // 注入未被用户自定义覆盖的内置指令（如 /init）
  for (const bc of BUILTIN_COMMANDS) {
    if (seenCmd.has(bc.name)) continue
    commands.push(bc)
  }

  for (const d of agentDirs) {
    let files = []
    try { files = fs.readdirSync(d) } catch (e) { continue }
    for (const f of files) {
      if (!f.endsWith('.md')) continue
      let text = ''
      try { text = fs.readFileSync(path.join(d, f), 'utf8') } catch (e) { continue }
      const pf = parseFrontmatter(text)
      const name = pf.fm.name || f.slice(0, -3)
      if (seenAgent.has(name)) continue
      seenAgent.add(name)
      agents.push({ name: name, description: (pf.fm.description || '').split('\n')[0].trim() })
    }
  }

  for (const d of skillDirs) {
    let subs = []
    try { subs = fs.readdirSync(d) } catch (e) { continue }
    for (const sub of subs) {
      const skillFile = path.join(d, sub, 'SKILL.md')
      let text = ''
      try { text = fs.readFileSync(skillFile, 'utf8') } catch (e) { continue }
      const pf = parseFrontmatter(text)
      const name = pf.fm.name || sub
      if (seenSkill.has(name)) continue
      seenSkill.add(name)
      skills.push({ name: name, description: (pf.fm.description || '').split('\n')[0].trim(), body: pf.body.trim() })
    }
  }

  return { commands: commands, agents: agents, skills: skills }
}

function readModels() {
  let settings = {}
  try { settings = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.claude', 'settings.json'), 'utf8')) } catch (e) {}
  const env = settings.env || {}
  const entries = [
    { alias: '默认', v: env.ANTHROPIC_MODEL },
    { alias: 'opus', v: env.ANTHROPIC_DEFAULT_OPUS_MODEL },
    { alias: 'sonnet', v: env.ANTHROPIC_DEFAULT_SONNET_MODEL },
    { alias: 'haiku', v: env.ANTHROPIC_DEFAULT_HAIKU_MODEL },
    { alias: 'reasoning', v: env.ANTHROPIC_REASONING_MODEL },
  ]
  const defaultModel = env.ANTHROPIC_MODEL || ''
  const seen = new Set()
  const models = []
  for (const e of entries) {
    if (!e.v) continue
    if (seen.has(e.v)) continue
    seen.add(e.v)
    models.push({
      id: e.v,
      label: (e.v === defaultModel ? '默认 · ' : e.alias + ' · ') + e.v,
      isDefault: e.v === defaultModel,
    })
  }
  if (models.length === 0) {
    models.push({ id: 'opus', label: 'opus', isDefault: false })
    models.push({ id: 'sonnet', label: 'sonnet', isDefault: false })
    models.push({ id: 'haiku', label: 'haiku', isDefault: false })
  }
  return { defaultModel: defaultModel, models: models }
}

// ── 工作目录（打开本地工作空间） ──────────────────────────────────
function listDir(p) {
  const target = path.resolve(p || workspaceDir)
  const result = { ok: true, path: target, parent: path.dirname(target), home: os.homedir(), entries: [] }
  try {
    const names = fs.readdirSync(target)
    names.sort(function (a, b) {
      let da = false, db = false
      try { da = fs.statSync(path.join(target, a)).isDirectory() } catch (e) {}
      try { db = fs.statSync(path.join(target, b)).isDirectory() } catch (e) {}
      if (da !== db) return da ? -1 : 1
      return a.localeCompare(b)
    })
    for (const name of names) {
      if (name.startsWith('.')) continue
      const full = path.join(target, name)
      let isDir = false
      try { isDir = fs.statSync(full).isDirectory() } catch (e) {}
      if (isDir) result.entries.push({ name: name, path: full })
    }
  } catch (e) {
    result.ok = false
    result.error = String(e && e.message ? e.message : e)
  }
  return result
}

// 调起系统原生「选择文件夹」对话框，返回 POSIX 路径
function runPicker(cmd, args) {
  return new Promise(function (resolve) {
    execFile(cmd, args, function (err, stdout) {
      if (err) return resolve({ ok: false, error: String((err && err.message) || err) })
      const out = String(stdout || '').trim()
      if (!out) return resolve({ ok: false, cancelled: true })
      resolve({ ok: true, path: out })
    })
  })
}

function pickDirectory() {
  try {
    if (process.platform === 'darwin') {
      return runPicker('/usr/bin/osascript', ['-e', 'POSIX path of (choose folder with prompt "选择工作区目录")'])
    }
    if (process.platform === 'linux') {
      return runPicker('zenity', ['--file-selection', '--directory', '--title=选择工作区目录'])
    }
    if (process.platform === 'win32') {
      const ps = [
        'Add-Type -AssemblyName System.Windows.Forms',
        '$f = New-Object System.Windows.Forms.FolderBrowserDialog',
        '$f.Description = "选择工作区目录"',
        'if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $f.SelectedPath }',
      ].join('; ')
      return runPicker('powershell', ['-NoProfile', '-Command', ps])
    }
    return Promise.resolve({ ok: false, error: '当前平台不支持原生目录选择' })
  } catch (e) {
    return Promise.resolve({ ok: false, error: String(e && e.message ? e.message : e) })
  }
}

function setWorkspace(p) {
  if (!p || typeof p !== 'string') return { ok: false, error: '路径无效' }
  const abs = path.resolve(p)
  try {
    const st = fs.statSync(abs)
    if (!st.isDirectory()) return { ok: false, error: '不是目录: ' + abs }
  } catch (e) {
    return { ok: false, error: '目录不存在或无法访问: ' + abs }
  }
  workspaceDir = abs
  addWs(abs)
  wsRegistry.current = abs
  saveWsRegistry()
  markDirty()
  return { ok: true, path: abs }
}

function openPath(p) {
  const abs = path.resolve(p || workspaceDir)
  try {
    const cmd = process.platform === 'darwin' ? ['open', abs]
      : process.platform === 'win32' ? ['explorer', abs]
      : ['xdg-open', abs]
    const child = spawn(cmd[0], cmd.slice(1), { detached: true, stdio: 'ignore' })
    child.on('error', function () {})
    child.unref()
    return { ok: true, path: abs }
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) }
  }
}

// ── 工作空间 / 会话维护 ─────────────────────────────────────────
function wsAdd(p) {
  if (!p || typeof p !== 'string') return { ok: false, error: '路径无效' }
  const abs = path.resolve(p)
  try {
    const st = fs.statSync(abs)
    if (!st.isDirectory()) return { ok: false, error: '不是目录: ' + abs }
  } catch (e) {
    return { ok: false, error: '目录不存在或无法访问: ' + abs }
  }
  addWs(abs)
  wsRegistry.current = abs
  workspaceDir = abs
  saveWsRegistry()
  markDirty()
  return { ok: true, path: abs }
}

function wsRename(p, name) {
  if (!p || typeof p !== 'string') return { ok: false, error: '路径无效' }
  const entry = wsEntry(p)
  if (!entry) { addWs(p) }
  wsEntry(p).name = String(name || '').slice(0, 60)
  saveWsRegistry()
  markDirty()
  return { ok: true }
}

function wsDelete(p) {
  if (!p || typeof p !== 'string') return { ok: false, error: '路径无效' }
  const abs = path.resolve(p)
  wsRegistry.workspaces = wsRegistry.workspaces.filter(function (w) { return w.path !== abs })
  if (wsRegistry.removed.indexOf(abs) === -1) wsRegistry.removed.push(abs)
  // 若删除的是当前工作区，切换到仍存在的其它工作区（不能回退到被删除目录本身）
  if (path.resolve(workspaceDir) === abs) {
    let next = ''
    const first = wsRegistry.workspaces[0]
    if (first && first.path) next = first.path
    if (!next) { try { if (fs.statSync(process.cwd()).isDirectory()) next = process.cwd() } catch (e) {} }
    if (!next || path.resolve(next) === abs) next = (abs !== os.homedir()) ? os.homedir() : '/'
    workspaceDir = next
    wsRegistry.current = next
  }
  saveWsRegistry()
  markDirty()
  return { ok: true }
}

function sessionCwd(sid) {
  let r = null
  runtime.forEach(function (v) { if (v.sessionId === sid) r = v })
  if (r && r.cwd) return r.cwd
  const h = history.find(function (x) { return x.id === sid })
  return h ? (h.cwd || '') : ''
}

async function sessionRename(sid, title) {
  if (!sid || !title) return { ok: false, error: '参数无效' }
  const cwd = sessionCwd(sid)
  const opts = cwd ? { dir: cwd } : undefined
  try {
    await renameSession(sid, String(title).slice(0, 80), opts)
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) }
  }
  // 同步内存中的运行时记录与历史缓存
  runtime.forEach(function (v) { if (v.sessionId === sid) v.title = String(title).slice(0, 80) })
  const h = history.find(function (x) { return x.id === sid })
  if (h) h.title = String(title).slice(0, 80)
  markDirty()
  return { ok: true }
}

async function sessionDelete(sid) {
  if (!sid) return { ok: false, error: '参数无效' }
  // 先在删除运行时记录前拿到 cwd（否则删除后拿不到）
  const cwd = sessionCwd(sid)
  // 若为运行时会话：先终止进程并从内存移除
  let targetKey = null
  runtime.forEach(function (v, k) { if (v.sessionId === sid) targetKey = k })
  if (targetKey) {
    const r = runtime.get(targetKey)
    killQuery(r)
    runtime.delete(targetKey)
    if (activeId === targetKey) activeId = null
  }
  let dir = cwd
  if (!dir) {
    const h = history.find(function (x) { return x.id === sid })
    dir = h ? (h.cwd || '') : ''
  }
  const opts = dir ? { dir: dir } : undefined
  try {
    await deleteSession(sid, opts)
  } catch (e) {
    console.error('[sessionDelete] 删除会话文件失败:', sid, String(e && e.message ? e.message : e))
    // 文件删除失败不阻断：继续清理本地缓存
  }
  history = history.filter(function (x) { return x.id !== sid })
  markDirty()
  return { ok: true }
}

// ── Claude Code 更新检查 / 升级 ─────────────────────────────────
function runCmd(cmd, args, timeoutMs) {
  return new Promise(function (resolve) {
    // Windows：npm / npx / .cmd shim 需经 shell（cmd.exe /c）执行，原生 .exe 直接 spawn
    const useShell = process.platform === 'win32' && !/\.exe$/i.test(cmd)
    const child = spawn(cmd, args, useShell ? { stdio: ['ignore', 'pipe', 'pipe'], shell: true } : { stdio: ['ignore', 'pipe', 'pipe'] })
    let out = '', errOut = ''
    const timer = setTimeout(function () {
      try { child.kill('SIGKILL') } catch (e) {}
      resolve({ ok: false, error: '命令超时（' + Math.round(timeoutMs / 1000) + 's）', stdout: out, stderr: errOut })
    }, timeoutMs)
    child.stdout.on('data', function (c) { out += c.toString('utf8') })
    child.stderr.on('data', function (c) { errOut += c.toString('utf8') })
    child.on('error', function (e) {
      clearTimeout(timer)
      resolve({ ok: false, error: String(e && e.message ? e.message : e), stdout: out, stderr: errOut })
    })
    child.on('close', function (code) {
      clearTimeout(timer)
      resolve({ ok: code === 0, code: code, stdout: out, stderr: errOut })
    })
  })
}

function parseVersion(s) {
  const m = /(\d+\.\d+\.\d+)/.exec(String(s || ''))
  return m ? m[1] : String(s || '').trim()
}

async function claudeCheckUpdate() {
  const cur = await runCmd(CLAUDE_BIN, ['--version'], 15000)
  const current = cur.ok ? parseVersion(cur.stdout) : ''
  const latestRes = await runCmd('npm', ['view', '@anthropic-ai/claude-code', 'version'], 25000)
  const latest = latestRes.ok ? parseVersion(latestRes.stdout) : ''
  if (!current && !latest) return { ok: false, error: '无法获取版本信息' }
  let hasUpdate = false
  if (current && latest) {
    const a = current.split('.').map(Number)
    const b = latest.split('.').map(Number)
    for (let i = 0; i < 3; i++) {
      if ((b[i] || 0) > (a[i] || 0)) { hasUpdate = true; break }
      if ((b[i] || 0) < (a[i] || 0)) break
    }
  }
  return {
    ok: true,
    current: current || cur.stdout.trim(),
    latest: latest || latestRes.stdout.trim(),
    hasUpdate: hasUpdate,
    latestError: latestRes.ok ? '' : (latestRes.error || latestRes.stderr).trim(),
  }
}

async function claudeUpdate() {
  // npm 12 起会用 allow-scripts 白名单拦截非白名单包的 install 脚本；
  // claude 的原生二进制靠 postinstall（node install.cjs）复制到位，必须显式放行，
  // 否则装完 bin/claude.exe 仍是占位脚本（spawn 报 ENOEXEC、claude 报 native binary not installed）。
  const r = await runCmd('npm', ['install', '-g', '@anthropic-ai/claude-code@latest', '--allow-scripts=@anthropic-ai/claude-code'], 300000)
  if (!r.ok) return { ok: false, error: (r.error || r.stderr || r.stdout || '').trim().slice(0, 1000) }

  // 验证原生二进制是否就位；没就位就手动跑一次 postinstall 兜底。
  const after = await runCmd(CLAUDE_BIN, ['--version'], 15000)
  let version = after.ok ? parseVersion(after.stdout) : ''

  if (!version) {
    const rootRes = await runCmd('npm', ['root', '-g'], 15000)
    const globalRoot = rootRes.ok ? rootRes.stdout.trim() : ''
    const installScript = globalRoot ? path.join(globalRoot, '@anthropic-ai', 'claude-code', 'install.cjs') : ''
    if (installScript && fs.existsSync(installScript)) {
      await runCmd('node', [installScript], 120000)
      const recheck = await runCmd(CLAUDE_BIN, ['--version'], 15000)
      if (recheck.ok) version = parseVersion(recheck.stdout)
    }
  }

  return {
    ok: !!version,
    version: version || '',
    log: (r.stdout || '').trim().slice(-800),
    error: version ? '' : '已安装但原生二进制未能就位；请手动执行：node ' + (installScript || '<全局包目录>/@anthropic-ai/claude-code/install.cjs'),
  }
}

// ── HTTP 服务 ─────────────────────────────────────────────────────
function sendJson(res, obj) {
  const body = JSON.stringify(obj)
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  })
  res.end(body)
}

function readBody(req) {
  return new Promise(function (resolve) {
    let b = ''
    req.on('data', function (c) { b += c })
    req.on('end', function () { resolve(b) })
  })
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
}

// ── WebSocket 下行推送（取代 SSE + 前端轮询） ─────────────────────
// 与 DSH client-connection 同构：noServer 的 ws.WebSocketServer，
// 由 DSH webServer.registerUpgrade 把升级请求交给 handleUpgrade 完成握手。
const wsClients = new Set()
let wss = null
let wsDirty = false
let wsLastSent = 0
const WS_MIN_INTERVAL = 80   // 流式增量时合并广播，每秒最多约 12 次

// 标记状态已变：合并短时间内的多次变更（节流），到点统一广播一次
function markDirty() {
  if (wsDirty) return
  wsDirty = true
  const wait = Math.max(0, WS_MIN_INTERVAL - (Date.now() - wsLastSent))
  setTimeout(function () {
    wsDirty = false
    wsLastSent = Date.now()
    if (wsClients.size === 0) return
    const payload = JSON.stringify(snapshot())
    for (const c of wsClients) {
      try { if (c.readyState === WsSocket.OPEN) c.send(payload) } catch (e) {}
    }
  }, wait)
}

// WebSocket 升级处理器（由宿主半部经 webServer.registerUpgrade 调用）。
// 处理器拥有协议握手：这里用 ws 的 handleUpgrade 完成 RFC6455 握手。
function handleUpgrade(req, socket, head) {
  if (!wss) wss = new WebSocketServer({ noServer: true })
  try {
    wss.handleUpgrade(req, socket, head, function (wsClient) {
      wsClients.add(wsClient)
      wsClient.on('close', function () { wsClients.delete(wsClient) })
      wsClient.on('error', function () { wsClients.delete(wsClient) })
      // 连上即推一帧当前快照
      try { wsClient.send(JSON.stringify(snapshot())) } catch (e) {}
    })
  } catch (e) {
    try { socket.destroy() } catch (e2) {}
  }
}

// 关闭所有下行连接与心跳（宿主半部在路由 dispose 时调用）
function disposeServer() {
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null }
  for (const c of wsClients) { try { c.terminate() } catch (e) {} }
  wsClients.clear()
  if (wss) { try { wss.close() } catch (e) {} wss = null }
}

// 初始化（独立运行与插件内嵌共用）：恢复工作区、刷新历史、启动 WebSocket 心跳
let heartbeatTimer = null
function initServer() {
  if (heartbeatTimer) clearInterval(heartbeatTimer)
  heartbeatTimer = setInterval(function () {
    for (const c of wsClients) {
      try { if (c.readyState === WsSocket.OPEN) c.ping() } catch (e) {}
    }
  }, 25000)
  loadWsRegistry()
  loadCommandMap()
  // 恢复上次使用的工作区（若仍存在且未被用户删除）
  if (wsRegistry.current && wsRegistry.removed.indexOf(wsRegistry.current) === -1) {
    try { if (fs.statSync(wsRegistry.current).isDirectory()) workspaceDir = wsRegistry.current } catch (e) {}
  }
  addWs(workspaceDir)
  wsRegistry.current = workspaceDir
  saveWsRegistry()
  refreshHistory()
}

// 请求处理器（独立运行与插件内嵌共用；模块被 require 时不监听端口）
async function handleRequest(req, res) {
  let u
  try { u = new URL(req.url, 'http://127.0.0.1') } catch (e) { res.writeHead(400); res.end(); return }

  // 挂载前缀剥离：/claude/xxx -> /xxx；/claude -> /
  if (BASE_PATH) {
    if (u.pathname === BASE_PATH) u.pathname = '/'
    else if (u.pathname.startsWith(BASE_PATH + '/')) u.pathname = u.pathname.slice(BASE_PATH.length)
  }

  if (u.pathname.startsWith('/api/')) {
    console.log('[req]', req.method, u.pathname + u.search)
    try {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        })
        res.end()
        return
      }
      if (req.method === 'GET' && u.pathname === '/api/stream') {
        // 该路径的升级请求由 webServer.registerUpgrade 交给 handleUpgrade；普通 GET 拒绝
        res.writeHead(426, { 'Content-Type': 'text/plain; charset=utf-8', 'Upgrade': 'websocket' })
        res.end('Upgrade Required')
        return
      }
      if (req.method === 'GET' && u.pathname === '/api/state') return sendJson(res, snapshot())
      if (req.method === 'GET' && u.pathname === '/api/workspace') {
        return sendJson(res, { ok: true, path: workspaceDir, home: os.homedir() })
      }
      if (req.method === 'GET' && u.pathname === '/api/list-dir') {
        return sendJson(res, listDir(u.searchParams.get('path')))
      }
      if (req.method === 'GET' && u.pathname === '/api/catalog') {
        return sendJson(res, readCatalog())
      }
      if (req.method === 'GET' && u.pathname === '/api/models') {
        return sendJson(res, readModels())
      }
      if (req.method === 'POST') {
        let body = {}
        try { body = JSON.parse(await readBody(req) || '{}') } catch (e) {}
        switch (u.pathname) {
          case '/api/new-session': return sendJson(res, newSession(body))
          case '/api/send': return sendJson(res, sendMessage(body))
          case '/api/stop': return sendJson(res, stopSession())
          case '/api/switch': return sendJson(res, switchSession(body))
          case '/api/answer-control': return sendJson(res, answerControl(body))
          case '/api/refresh-history': return sendJson(res, refreshHistory())
          case '/api/set-workspace': return sendJson(res, setWorkspace(body.path))
          case '/api/open-path': return sendJson(res, openPath(body.path))
          case '/api/pick-directory': return sendJson(res, await pickDirectory())
          case '/api/ws-add': return sendJson(res, wsAdd(body.path))
          case '/api/ws-rename': return sendJson(res, wsRename(body.path, body.name))
          case '/api/ws-delete': return sendJson(res, wsDelete(body.path))
          case '/api/session-rename': return sendJson(res, await sessionRename(body.sessionId, body.title))
          case '/api/session-delete': return sendJson(res, await sessionDelete(body.sessionId))
          case '/api/claude-check-update': return sendJson(res, await claudeCheckUpdate())
          case '/api/claude-update': return sendJson(res, await claudeUpdate())
        }
      }
      sendJson(res, { ok: false, error: '未知接口 ' + u.pathname })
    } catch (e) {
      sendJson(res, { ok: false, error: String(e && e.message ? e.message : e) })
    }
    return
  }

  // 静态文件
  const rel = u.pathname === '/' ? 'index.html' : u.pathname.replace(/^\/+/, '')
  const filePath = path.normalize(path.join(ROOT, 'public', rel))
  if (!filePath.startsWith(path.join(ROOT, 'public'))) { res.writeHead(403); res.end('forbidden'); return }
  fs.readFile(filePath, function (err, data) {
    if (err) { res.writeHead(404); res.end('not found'); return }
    let body = data
    if (rel === 'index.html') {
      // 注入挂载前缀，前端据此拼接 /api/* 请求
      body = data.toString().replace('"__CLAUDE_BASE_PATH__"', JSON.stringify(BASE_PATH))
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    })
    res.end(body)
  })
}

module.exports = {
  handleRequest,
  handleUpgrade,
  initServer,
  disposeServer,
  // RPC 面（原生插件宿主半部经 harness.handle 透传调用）
  snapshot,
  newSession,
  sendMessage,
  stopSession,
  switchSession,
  answerControl,
  refreshHistory,
  sessionRename,
  sessionDelete,
  listDir,
  setWorkspace,
  wsAdd,
  wsRename,
  wsDelete,
  openPath,
  readCatalog,
  readModels,
  claudeCheckUpdate,
  claudeUpdate,
}

// 独立运行入口：node server.js 直接执行时才监听端口
if (require.main === module) {
  initServer()
  const server = http.createServer(handleRequest)
  server.listen(PORT, '127.0.0.1', function () {
  console.log('')
  console.log('  Claude Code 工作空间已启动')
  console.log('  → http://127.0.0.1:' + PORT)
  console.log('  按 Ctrl+C 停止')
  console.log('')
  })
}
