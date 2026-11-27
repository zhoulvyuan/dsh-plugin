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
const { createStatePoll } = require('./state-poll.cjs')
let statePoll = createStatePoll(snapshot)

const CLAUDE_BIN = resolveClaudeBin()
const PORT = Number(process.env.CLAUDE_CODE_PORT || 3780)
const ROOT = __dirname
// 用户数据目录：状态文件（workspaces.json / command-map.json）写入此处而非插件安装目录，
// 以便插件以只读方式安装或打包到其它机器时仍可写。可用 CLAUDE_CODE_WEB_HOME 覆盖。
const DATA_HOME = process.env.CLAUDE_CODE_WEB_HOME || path.join(os.homedir(), '.claude-code-web')
// 挂载前缀：独立模式 ''（服务在 /）；内嵌 DSH 时为 '/claude'（服务在 /claude/*）
const BASE_PATH = (process.env.CLAUDE_BASE_PATH || '').replace(/\/+$/, '')

// ── 子进程 PATH ───────────────────────────────────────────────────
// 部分宿主（桌面壳）会把后端 PATH 收紧成「自带 node + /usr/bin:/bin:/usr/sbin:/sbin」，
// 不含 Homebrew 的 /opt/homebrew/bin，于是：
//   - 裸命令 `npm` spawn ENOENT（更新检查显示「最新版本：未知」）；
//   - Claude Code CLI 的 Bash/Grep 工具也找不到 rg / pnpm 等开发命令。
// 这里只为「子进程」补回常见安装目录，不改动后端进程自身的 PATH；
// 目录追加在原 PATH 之后，保持宿主自带 node 优先，避免影响宿主运行时。
function childEnv() {
  const parts = (process.env.PATH || '').split(path.delimiter).filter(Boolean)
  if (process.platform !== 'win32') {
    const extras = [
      '/opt/homebrew/bin',
      '/usr/local/bin',
      path.join(os.homedir(), '.local', 'bin'),
      path.join(os.homedir(), '.bun', 'bin'),
    ]
    for (const d of extras) {
      try { if (fs.existsSync(d) && parts.indexOf(d) === -1) parts.push(d) } catch (e) {}
    }
  }
  return Object.assign({}, process.env, { PATH: parts.join(path.delimiter) })
}

// ── 权限模式（对齐 DSH 三档语义）────────────────────────────────────
// 与 DSH 的 sandbox mode 同名同义，便于用户心智一致：
//   read-only          仅可查看：文件不可写（Bash 走只读沙箱，写类工具由宿主拒绝）
//   workspace-write    工作区内修改：只允许写会话工作区（Bash 由沙箱限制，写类工具校验目标路径）
//   danger-full-access 完全权限：不限制（保持旧版行为，危险操作仍会弹授权卡）
// 三档都是「宿主闸门 + SDK sandbox」两层：
//   - sandbox 只约束 Bash 子进程，SDK 不把文件工具纳入 sandbox
//   - 文件工具（Write/Edit/NotebookEdit…）由 canUseTool 闸门按路径判断
const SANDBOX_MODES = ['read-only', 'workspace-write', 'danger-full-access']
const DEFAULT_SANDBOX_MODE = 'danger-full-access'
const SANDBOX_MODE_LABELS = { 'read-only': '仅可查看', 'workspace-write': '工作区内修改', 'danger-full-access': '完全权限' }
// 旧客户端直接传 SDK 原生 permissionMode，一律按「完全权限」处理（不改变既有行为）
const SDK_PERMISSION_MODES = ['default', 'acceptEdits', 'plan', 'bypassPermissions', 'dontAsk', 'auto']

// ── Claude 工作模式（对齐 VS Code Claude 插件 Modes 面板）────────────────────
// 与上面沙箱三档是**两个独立维度**：沙箱档决定「能写到哪」，工作模式决定「何时问你」。
// 直接映射 SDK 原生 PermissionMode：
//   default      Manual              每次危险操作都要你确认
//   acceptEdits  Edit automatically  自动接受文件编辑，其它危险操作仍会问
//   plan         Plan                只读探查并给出方案，不执行改动
//   auto         Auto                由模型分类器判定，通过安全检查就放行，风险高的才暂停
// bypassPermissions / dontAsk 不放进 UI：前者需要 allowDangerouslySkipPermissions，
// 后者非预批准即拒绝，都会让「沙箱三档」的限制语义变得不可预期。
const CLAUDE_MODES = ['default', 'acceptEdits', 'plan', 'auto']
const DEFAULT_CLAUDE_MODE = 'default'
const CLAUDE_MODE_LABELS = {
  default: 'Manual',
  acceptEdits: 'Edit automatically',
  plan: 'Plan',
  auto: 'Auto',
}
function normalizeClaudeMode(v) {
  if (typeof v === 'string' && CLAUDE_MODES.indexOf(v) !== -1) return v
  return DEFAULT_CLAUDE_MODE
}

// ── 推理程度（Effort，对齐 VS Code Claude 插件的 Effort）──────────────────────
// 空字符串表示「不指定」，交由模型用自己的默认档（多数模型默认 high）。
// 直接映射 SDK options.effort；'xhigh' / 'max' 仅部分模型支持，其余会自动回退。
const CLAUDE_EFFORTS = ['', 'low', 'medium', 'high', 'xhigh', 'max']
const CLAUDE_EFFORT_LABELS = { '': '默认', low: '低', medium: '中', high: '高', xhigh: '极高', max: '最大' }
function normalizeClaudeEffort(v) {
  if (typeof v === 'string' && CLAUDE_EFFORTS.indexOf(v) !== -1) return v
  return ''
}

function normalizeSandboxMode(v) {
  if (typeof v === 'string' && SANDBOX_MODES.indexOf(v) !== -1) return v
  return DEFAULT_SANDBOX_MODE
}

// 写类工具：名字随 Claude Code 版本略有差异，按枚举 + 小写前缀双重判断
const WRITE_TOOL_NAMES = ['Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'NotebookWrite', 'StrReplace', 'ApplyPatch', 'WriteFile']
function isWriteTool(name) {
  if (!name || typeof name !== 'string') return false
  if (WRITE_TOOL_NAMES.indexOf(name) !== -1) return true
  return /^(write|edit|multiedit|notebookedit|strreplace|applypatch)(file|tool)?$/i.test(name)
}

// 从工具入参里取写入目标路径（不同工具字段名不同）
function writeTargetPath(input) {
  if (!input || typeof input !== 'object') return null
  const keys = ['file_path', 'notebook_path', 'path', 'target_file']
  for (let i = 0; i < keys.length; i++) {
    const v = input[keys[i]]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

// 解析成「尽量真实」的绝对路径：目标文件可能尚不存在，因此逐级 realpath 最近的
// 已存在祖先再拼回剩余段，可抵御 ../ 与符号链接逃逸（如工作区里指向 /etc 的软链）
function resolveRealPath(p, base) {
  let abs = String(p || '')
  if (!abs) return null
  if (abs === '~') abs = os.homedir()
  else if (abs.indexOf('~/') === 0) abs = path.join(os.homedir(), abs.slice(2))
  abs = path.isAbsolute(abs) ? path.resolve(abs) : path.resolve(base || process.cwd(), abs)
  const rest = []
  let cur = abs
  for (;;) {
    try { return path.join(fs.realpathSync(cur), ...rest) } catch (e) {}
    const parent = path.dirname(cur)
    if (parent === cur) return abs
    rest.unshift(path.basename(cur))
    cur = parent
  }
}

function isWithin(root, target) {
  if (!root || !target) return false
  const rel = path.relative(root, target)
  if (rel === '') return true
  if (path.isAbsolute(rel)) return false
  return rel !== '..' && rel.indexOf('..' + path.sep) !== 0
}

function workspaceRootOf(cwd) {
  const base = cwd || process.cwd()
  try { return fs.realpathSync(base) } catch (e) { return path.resolve(base) }
}

/**
 * 宿主侧模式闸门：返回拒绝原因（string）或 null（放行给既有授权流程）。
 * 必须在会话级「始终允许」规则之前调用，否则历史规则会静默绕过只读/工作区限制。
 */
function sandboxModeDenial(mode, toolName, input, cwd) {
  if (mode !== 'read-only' && mode !== 'workspace-write') return null
  if (!isWriteTool(toolName)) return null
  if (mode === 'read-only') {
    return '当前为「仅可查看」模式，已拒绝修改文件（' + toolName + '）。如需写入，请把权限模式切到「工作区内修改」或「完全权限」。'
  }
  const raw = writeTargetPath(input)
  const root = workspaceRootOf(cwd)
  if (!raw) return '当前为「工作区内修改」模式：无法确认写入目标路径，已拒绝。如需继续，请切到「完全权限」。'
  const target = resolveRealPath(raw, root)
  if (!target || !isWithin(root, target)) {
    return '当前为「工作区内修改」模式：只允许修改工作区 ' + root + ' 内的文件，已拒绝写入 ' + String(target || raw) + '。如需跨目录写入，请切到「完全权限」。'
  }
  return null
}

/**
 * 三档对应的 SDK sandbox 选项（spawn 期参数，不能热切换）。
 * sandbox 只约束 Bash 子进程；只读档用 denyWrite 全盘兜底，避免沙箱默认把 cwd/tmp
 * 视为可写而漏掉写入。failIfUnavailable 固定 true：沙箱起不来就报错，绝不静默降级。
 */
function sandboxOptions(mode, cwd) {
  if (mode !== 'read-only' && mode !== 'workspace-write') return null
  return {
    enabled: true,
    failIfUnavailable: true,
    autoAllowBashIfSandboxed: true,
    filesystem: mode === 'read-only'
      ? { allowWrite: [], denyWrite: ['/'] }
      : { allowWrite: [workspaceRootOf(cwd)] },
    // 禁止模型用 dangerouslyDisableSandbox 逃出沙箱（SDK 默认允许）
    allowUnsandboxedCommands: false,
  }
}

/**
 * PreToolUse hook：权限模式的权威闸门。
 * 为什么不用 canUseTool 当唯一闸门：用户/项目的 ~/.claude/settings.json 里若有裸的
 * "Edit" / "Write" allow 规则（本机就有），权限判定阶段会直接放行，canUseTool 根本
 * 不会被调用；PreToolUse 在权限判定之前执行，是唯一能覆盖所有配置来源的拦截点。
 * canUseTool 里的同名判定保留为第二层（并在没有 allow 规则时给出更好的卡片体验）。
 */
function makeModeGuard(r) {
  return function guard(input) {
    const toolName = input && input.tool_name
    const toolInput = input && input.tool_input
    const mode = r.sandboxMode || DEFAULT_SANDBOX_MODE
    const denial = sandboxModeDenial(mode, toolName, toolInput, r.cwd)
    if (!denial) return Promise.resolve({})
    pushMsg(r, { id: r.counter++, role: 'result', isError: true, text: '[' + (SANDBOX_MODE_LABELS[mode] || mode) + '] ' + denial })
    return Promise.resolve({
      decision: 'block',
      reason: denial,
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: denial,
      },
    })
  }
}

// 沙箱起不来时给出可操作的中文说明，而不是把 CLI 原始英文错误直接抛给用户
function describeQueryError(r, e) {
  const raw = String(e && e.message ? e.message : e)
  const needsSandbox = (r.sandboxMode || DEFAULT_SANDBOX_MODE) !== 'danger-full-access'
  if (needsSandbox && /sandbox|bubblewrap|landlock|seatbelt|operation not permitted/i.test(raw)) {
    return '当前权限模式需要系统沙箱，但沙箱没能启动：' + raw
      + '。请确认平台支持（macOS 需 sandbox-exec，Linux 需 bubblewrap），或暂时切到「完全权限」。'
  }
  return raw
}

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

function newRecord(sandboxMode, cwd) {
  return {
    key: 'r' + (++seq),
    sessionId: null,
    title: '',
    // 交给 SDK 的原生模式固定为 default（危险操作仍弹卡）；三档限制由
    // sandboxMode + 宿主闸门实现，保留 permissionMode 仅为兼容既有消费方。
    permissionMode: 'default',
    sandboxMode: normalizeSandboxMode(sandboxMode),
    // 工作模式：独立于沙箱三档，决定 SDK 何时询问/自动放行
    claudeMode: DEFAULT_CLAUDE_MODE,
    // 推理程度：'' = 不指定（用模型默认）
    claudeEffort: '',
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
    // 会话累计用量：sessionXxx 为已完成 query 生命周期的累计，queryXxx 为当前 query 生命周期的最新累计值
    sessionCostUsd: 0,
    sessionTokens: 0,
    queryCostUsd: 0,
    queryTokens: 0,
    sessionRules: [],
    startedAt: null,
    durationMs: null,
    mtimeMs: 0,
  }
}

// ── AskUserQuestion（待确认事项）────────────────────────────────────
// Claude Code 把 AskUserQuestion 当作一次「需要宿主渲染并作答」的权限请求：
// CLI 侧 checkPermissions 返回 behavior:"ask"，宿主必须在 canUseTool 的应答里
// 回传 updatedInput.answers = { [问题文本]: 选中label | label[] }。
// 若只回 { behavior:'allow', updatedInput: 原input }（不带 answers），CLI 会生成
// tool_result「The user did not answer the questions.」，模型随即反馈「未收到选择」
// 并自行按推荐值继续 —— 这正是本插件 v0.1.3 之前的行为。
const ASK_TOOL = 'AskUserQuestion'

function isAskUserQuestion(toolName, input) {
  return toolName === ASK_TOOL && !!input && Array.isArray(input.questions) && input.questions.length > 0
}

// 清洗并校验用户提交的选择，构造 CLI 期望的 updatedInput。
// 契约：键必须是本次 questions 里的问题文本；值只接受字符串（单选 / Other 自由文本）
// 或字符串数组（multiSelect）；空值、越界键一律丢弃。纯函数，便于测试。
function buildQuestionUpdatedInput(input, answers) {
  const questions = (input && Array.isArray(input.questions)) ? input.questions : []
  const allowed = {}
  questions.forEach(function (q) {
    if (q && typeof q.question === 'string') allowed[q.question] = true
  })
  const clean = {}
  if (answers && typeof answers === 'object' && !Array.isArray(answers)) {
    Object.keys(answers).forEach(function (k) {
      if (!allowed[k]) return
      const v = answers[k]
      if (typeof v === 'string') {
        const s = v.trim().slice(0, 2000)
        if (s) clean[k] = s
      } else if (Array.isArray(v)) {
        const arr = v.filter(function (x) { return typeof x === 'string' && x.trim() })
          .map(function (x) { return x.trim().slice(0, 2000) }).slice(0, 32)
        if (arr.length) clean[k] = arr
      }
    })
  }
  return {
    ok: Object.keys(clean).length > 0,
    answers: clean,
    updatedInput: Object.assign({}, input || {}, { answers: clean }),
  }
}

function pushMsg(r, m) {
  if (m.ts == null) m.ts = Date.now()
  r.messages.push(m)
  if (r.messages.length > 500) {
    const removed = r.messages.splice(0, r.messages.length - 500)
    if (r._byKey) for (const x of removed) { if (x && x.messageKey != null) delete r._byKey[x.messageKey] }
  }
  // messageKey -> 消息对象索引：流式增量按 key 定位，避免每次线性扫 500 条
  if (m.messageKey != null) {
    if (!r._byKey) r._byKey = {}
    r._byKey[m.messageKey] = m
  }
  r.mtimeMs = Date.now()
  markDirty()
}

// 流式内容分层：SDK 会把同一条 assistant 消息按 content block 分组**多次**下发
// （实测顺序：thinking 增量 → assistant[thinking] → text 增量 → assistant[text] → message_stop）。
// 因此「整条消息到达即替换」是错的：第一组 assistant 到达时 text 增量还没来，替换后用掉的
// 完成标记会让第二组 assistant 退化成追加，最终文本被拼接两遍。
// 这里按「块类型」分层记录：auth = 已由完整块确认的内容，buf = 尚未确认的增量，
// 渲染值始终为 auth + buf；某类型的完整块到达时只丢弃该类型的 buf。
// 两个字段都是不可枚举属性，不会进入发给前端的快照。
function streamState(am) {
  if (!am._auth) {
    Object.defineProperty(am, '_auth', {
      value: { text: am.text || '', thinking: am.thinking || '' },
      enumerable: false, writable: true, configurable: true,
    })
  }
  if (!am._buf) {
    Object.defineProperty(am, '_buf', {
      value: { text: '', thinking: '' },
      enumerable: false, writable: true, configurable: true,
    })
  }
  return { auth: am._auth, buf: am._buf }
}

function applyStreamState(am) {
  const st = streamState(am)
  const t = st.auth.text + st.buf.text
  const th = st.auth.thinking + st.buf.thinking
  am.text = t.length > 200000 ? t.slice(0, 200000) : t
  am.thinking = th.length > 200000 ? th.slice(0, 200000) : th
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

// ── 子代理（Agent / Task）结果规整 ────────────────────────────────────
// 子代理 hand-back 的 tool_result 是一段包裹了 harness 样板的文本：
//   前缀：「[Subagent hand-back] ... The report follows:」
//   尾部：「agentId: ... <usage>subagent_tokens: N / tool_uses: N / duration_ms: N</usage>」
//   正文：每行被 harness 整体缩进
// 这里剥掉样板与公共缩进只留报告正文，并顺带解析出可直接展示的元数据。
const SUBAGENT_TOOL_NAMES = { Agent: true, Task: true }
const SUBAGENT_FRAME = 'The report follows:'
// agentId 行 + 可选的 <usage> 块（两者都在文本末尾）
const SUBAGENT_FOOTER_RE = /\n?agentId:\s*\S+[^\n]*(?:\n<usage>[\s\S]*?<\/usage>)?[ \t]*$/

function isSubagentCall(name, input) {
  if (name && SUBAGENT_TOOL_NAMES[name]) return true
  return !!(input && typeof input === 'object' && input.subagent_type)
}

function subagentInfo(input) {
  const i = input && typeof input === 'object' ? input : {}
  return {
    type: typeof i.subagent_type === 'string' ? i.subagent_type : '',
    description: typeof i.description === 'string' ? i.description : '',
    background: !!i.run_in_background,
  }
}

function parseSubagentFooter(text) {
  const s = String(text || '')
  const num = function (key) {
    const m = new RegExp(key + ':\\s*(\\d+)').exec(s)
    return m ? parseInt(m[1], 10) : null
  }
  const idm = /agentId:\s*(\S+)/.exec(s)
  const meta = {
    agentId: idm ? idm[1] : null,
    tokens: num('subagent_tokens'),
    toolUses: num('tool_uses'),
    durationMs: num('duration_ms'),
  }
  if (meta.agentId == null && meta.tokens == null && meta.toolUses == null && meta.durationMs == null) return null
  return meta
}

// 逐行去掉公共前导缩进（harness 会给报告每一行整体缩进）
function dedentText(text) {
  const lines = String(text == null ? '' : text).split('\n')
  let min = Infinity
  for (const l of lines) {
    if (!l.trim()) continue
    const n = l.length - l.replace(/^[ \t]+/, '').length
    if (n < min) min = n
  }
  if (!isFinite(min) || min === 0) return lines.join('\n')
  return lines.map(function (l) {
    if (!l.trim()) return ''
    return l.length >= min ? l.slice(min) : l.replace(/^[ \t]+/, '')
  }).join('\n')
}

// 入参：原始 tool_result 文本 + 可选的结构化字段（历史 jsonl 的 toolUseResult / SDK 的 tool_use_result）
function normalizeSubagentResult(text, structured) {
  const raw = String(text == null ? '' : text)
  const out = { body: raw, meta: null }
  const st = structured && typeof structured === 'object' ? structured : null
  if (st) {
    const m = {
      agentId: st.agentId || null,
      agentType: st.agentType || null,
      tokens: st.totalTokens != null ? st.totalTokens : null,
      toolUses: st.totalToolUseCount != null ? st.totalToolUseCount : null,
      durationMs: st.totalDurationMs != null ? st.totalDurationMs : null,
    }
    if (m.agentId || m.agentType || m.tokens != null || m.toolUses != null || m.durationMs != null) out.meta = m
  }
  // 只在确实是 hand-back 形态时才剥样板，避免误伤普通工具输出
  const framed = raw.indexOf(SUBAGENT_FRAME) !== -1 || SUBAGENT_FOOTER_RE.test(raw)
  if (framed) {
    let s = raw
    const fi = s.indexOf(SUBAGENT_FRAME)
    if (fi !== -1) s = s.slice(fi + SUBAGENT_FRAME.length)
    const footerMeta = parseSubagentFooter(s)
    s = s.replace(SUBAGENT_FOOTER_RE, '')
    const body = dedentText(s).trim()
    if (body !== '') out.body = body        // 兜底：若剥成空串则保留原文
    if (!out.meta && footerMeta) out.meta = footerMeta
  }
  return out
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
    mode: r.sandboxMode || DEFAULT_SANDBOX_MODE,
    claudeMode: r.claudeMode || DEFAULT_CLAUDE_MODE,
    claudeEffort: r.claudeEffort || '',
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
      mtimeMs: r.mtimeMs || now,
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
    current: workspaceDir,
  }
}

function handleMessage(r, msg) {
  if (!msg || typeof msg !== 'object') return
  // 子代理（sidechain）消息不下发到主会话：SDK 对「产生于子代理内部」的消息会把
  // parent_tool_use_id 置为该 Agent 调用的 tool_use id，主会话消息则为 null。
  // 不过滤的话，子代理自己的 thinking/正文会被当成主会话气泡渲染，与主 agent 的
  // 转述内容重复（实测某轮 122 条 assistant 里 44 条是子代理消息）。
  if (msg.parent_tool_use_id) return
  r.mtimeMs = Date.now()
  const type = msg.type
  // 流式文本增量走 markStreamDirty（轻量帧）；其余消息照旧触发全量快照
  const isStreamDelta = type === 'stream_event' && msg.event && msg.event.type === 'content_block_delta'
  if (!isStreamDelta) markDirty()
  if (type === 'system') {
    if (msg.subtype === 'init') {
      r.sessionId = msg.session_id || r.sessionId
      r.cwd = msg.cwd || r.cwd
      r.model = msg.model || r.model
      r.permissionMode = msg.permissionMode || r.permissionMode
      r.status = 'running'
    } else if (msg.subtype === 'compact_boundary') {
      // /compact 压缩完成：CLI 只发 system 事件，若不落一条可见消息，界面上毫无反馈
      const meta = msg.compact_metadata || {}
      const parts = []
      if (meta.trigger) parts.push('触发：' + meta.trigger)
      if (meta.pre_tokens != null) parts.push('压缩前 ' + meta.pre_tokens + ' tokens')
      if (meta.post_tokens != null) parts.push('压缩后 ' + meta.post_tokens + ' tokens')
      const txt = '🧹 上下文已压缩' + (parts.length ? '（' + parts.join('，') + '）' : '')
      pushMsg(r, { id: r.counter++, role: 'result', text: txt, isError: false })
    }
    return
  }
  if (type === 'assistant' && msg.message) {
    const m = msg.message
    const key = m.id || ('m' + (++r.counter))
    let am = (r._byKey && r._byKey[key]) || null
    if (!am) {
      for (let i = 0; i < r.messages.length; i++) {
        const x = r.messages[i]
        if (x.role === 'assistant' && x.messageKey === key) { am = x; break }
      }
    }
    if (!am) {
      am = { id: r.counter++, role: 'assistant', messageKey: key, model: m.model || '', text: '', thinking: '' }
      pushMsg(r, am)
    } else if (m.model) {
      am.model = m.model
    }
    const st = streamState(am)
    const blocks = m.content || []
    let gotText = false
    let gotThinking = false
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i]
      if (!b || typeof b !== 'object') continue
      if (b.type === 'text') {
        // 完整 text 块并入 auth，同时作废待定的 text 增量（同一份内容不能再拼一次）
        if (st.auth.text.length < 200000) st.auth.text += b.text || ''
        gotText = true
      } else if (b.type === 'thinking') {
        if (st.auth.thinking.length < 200000) st.auth.thinking += b.thinking || ''
        gotThinking = true
      } else if (b.type === 'tool_use') {
        const tm = { id: r.counter++, role: 'tool', toolUseId: b.id, name: b.name || 'Tool', input: b.input || {}, result: null, isError: false, status: 'running' }
        if (isSubagentCall(tm.name, tm.input)) tm.sub = subagentInfo(tm.input)
        pushMsg(r, tm)
      }
    }
    if (gotText || gotThinking) {
      if (gotText) st.buf.text = ''
      if (gotThinking) st.buf.thinking = ''
      applyStreamState(am)
    }
    return
  }
  if (type === 'stream_event' && msg.event) {
    const ev = msg.event
    if (ev.type === 'message_start') {
      const key = (ev.message && ev.message.id) || ('m' + (++r.counter))
      r._streamKey = key
      let am = (r._byKey && r._byKey[key]) || null
      if (!am) {
        for (let i = 0; i < r.messages.length; i++) {
          const x = r.messages[i]
          if (x.role === 'assistant' && x.messageKey === key) { am = x; break }
        }
      }
      if (!am) {
        pushMsg(r, { id: r.counter++, role: 'assistant', messageKey: key, model: '', text: '', thinking: '' })
      }
      return
    }
    if (ev.type === 'content_block_delta' && ev.delta && r._streamKey) {
      let am = (r._byKey && r._byKey[r._streamKey]) || null
      if (!am) {
        for (let i = 0; i < r.messages.length; i++) {
          const x = r.messages[i]
          if (x.role === 'assistant' && x.messageKey === r._streamKey) { am = x; break }
        }
      }
      if (!am) return
      const st = streamState(am)
      if (ev.delta.type === 'thinking_delta' && ev.delta.thinking) {
        if (st.buf.thinking.length < 200000) st.buf.thinking += ev.delta.thinking
      } else if (ev.delta.type === 'text_delta' && ev.delta.text) {
        if (st.buf.text.length < 200000) st.buf.text += ev.delta.text
      } else return
      applyStreamState(am)
      // 只推轻量增量帧，避免每 80ms 全量快照
      markStreamDirty(r, am)
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
            x.isError = !!b.is_error
            x.status = 'done'
            const raw = stringifyContent(b.content)
            if (x.sub) {
              // 子代理报告：剥掉 harness 样板与缩进，并补充元数据
              const norm = normalizeSubagentResult(raw, msg.tool_use_result || msg.toolUseResult)
              x.result = norm.body
              if (norm.meta) x.meta = Object.assign({}, x.meta, norm.meta)
            } else {
              x.result = raw
            }
            break
          }
        }
      }
    }
    return
  }
  if (type === 'result') {
    r.status = msg.is_error ? 'error' : 'done'
    // 本 query 生命周期内的累计 token（modelUsage 跨轮次累计，覆盖主循环 + Task 子代理 + sidechain + 压缩等全部调用）
    let queryTokens = null
    if (msg.modelUsage && typeof msg.modelUsage === 'object') {
      let t = 0
      for (const k in msg.modelUsage) {
        const mu = msg.modelUsage[k] || {}
        t += (mu.inputTokens || 0) + (mu.outputTokens || 0) + (mu.cacheReadInputTokens || 0) + (mu.cacheCreationInputTokens || 0)
      }
      queryTokens = t
    }
    const queryCost = msg.total_cost_usd != null ? msg.total_cost_usd : null
    if (queryCost != null) r.queryCostUsd = queryCost
    if (queryTokens != null) r.queryTokens = queryTokens
    r.lastResult = {
      isError: !!msg.is_error,
      durationMs: msg.duration_ms != null ? msg.duration_ms : null,
      // 本 query 生命周期累计（向后兼容）
      costUsd: queryCost,
      tokens: queryTokens,
      // 当前会话累计（跨 query 生命周期：切换模型/权限重建 query 时不清零）
      sessionCostUsd: (r.sessionCostUsd || 0) + (r.queryCostUsd || 0),
      sessionTokens: (r.sessionTokens || 0) + (r.queryTokens || 0),
    }
    if (msg.session_id) r.sessionId = msg.session_id
    if (msg.is_error) {
      pushMsg(r, { id: r.counter++, role: 'result', text: msg.result != null ? String(msg.result) : '', isError: true })
    }
    return
  }
  if (type === 'control_request' && msg.request) {
    const req = msg.request
    const ctlInput = req.input || {}
    const ctlIsAsk = isAskUserQuestion(req.tool_name, ctlInput)
    r.pendingControl = {
      requestId: msg.request_id || '',
      subtype: req.subtype || '',
      toolName: req.tool_name || '',
      input: ctlInput,
      kind: ctlIsAsk ? 'ask' : 'permission',
      questions: ctlIsAsk ? ctlInput.questions : undefined,
      suggestions: req.permission_suggestions || [],
    }
    pushMsg(r, { id: r.counter++, role: 'control', requestId: r.pendingControl.requestId, subtype: r.pendingControl.subtype, toolName: r.pendingControl.toolName, input: ctlInput, suggestions: r.pendingControl.suggestions, kind: r.pendingControl.kind, questions: r.pendingControl.questions })
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
    const isAsk = isAskUserQuestion(toolName, input)
    // 模式闸门必须排在会话级「始终允许」规则之前：否则在完全权限下点过的
    // 「始终允许」会在切到只读/工作区后静默放行写操作。
    const mode = r.sandboxMode || DEFAULT_SANDBOX_MODE
    const denial = sandboxModeDenial(mode, toolName, input, r.cwd)
    if (denial) {
      // 留一条可见记录，避免用户只看到一次失败的 tool_result 却不知原因
      pushMsg(r, { id: r.counter++, role: 'result', isError: true, text: '[' + (SANDBOX_MODE_LABELS[mode] || mode) + '] ' + denial })
      return Promise.resolve({ behavior: 'deny', message: denial })
    }
    // 待确认事项每次都必须展示给用户：既不能被「始终允许」的历史规则静默放行，
    // 也不能进入会话规则（否则后续提问连卡片都不再出现，且永远不带 answers）。
    if (!isAsk && matchSessionRule(r, toolName, input)) {
      return Promise.resolve({ behavior: 'allow', updatedInput: input })
    }
    return new Promise(function (resolve) {
      const requestId = opts.requestId || opts.toolUseID || ('ctl' + (++r.counter))
      const pc = {
        requestId: requestId,
        toolName: toolName,
        input: input,
        kind: isAsk ? 'ask' : 'permission',
        questions: isAsk ? input.questions : undefined,
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
        kind: pc.kind,
        questions: pc.questions,
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
  // 新建 query 前，把上一个 query 生命周期的最新累计值并入会话累计
  // （SDK 的 total_cost_usd / modelUsage 仅在同一 query 生命周期内累计，切换模型/权限会重建 query）
  r.sessionCostUsd = (r.sessionCostUsd || 0) + (r.queryCostUsd || 0)
  r.sessionTokens = (r.sessionTokens || 0) + (r.queryTokens || 0)
  r.queryCostUsd = 0
  r.queryTokens = 0
  try {
    r.inputQueue = AsyncQueue()
    const opts = {
      cwd: r.cwd,
      // 工作模式直接映射 SDK permissionMode（Manual/acceptEdits/plan/auto）；
      // 沙箱三档的限制另由 sandbox + PreToolUse 闸门 + canUseTool 施加。
      permissionMode: r.claudeMode || DEFAULT_CLAUDE_MODE,
      includePartialMessages: true,
      canUseTool: makeCanUseTool(r),
      pathToClaudeCodeExecutable: CLAUDE_BIN,
      env: childEnv(),
    }
    // sandbox 是 spawn 期参数：只读 / 工作区两档在这里挂上，完全权限不挂
    const sbOpts = sandboxOptions(r.sandboxMode, r.cwd)
    if (sbOpts) opts.sandbox = sbOpts
    // 受限档位才注册 hook：完全权限不需要每次工具调用多一次 control 往返
    if (sbOpts) opts.hooks = { PreToolUse: [{ hooks: [makeModeGuard(r)] }] }
    if (r.model) opts.model = r.model
    // 只在显式选择时才传，避免覆盖模型自己的默认档
    if (r.claudeEffort) opts.effort = r.claudeEffort
    if (r.sessionId) opts.resume = r.sessionId
    r.abortController = new AbortController()
    opts.abortController = r.abortController
    r._procPermMode = r.permissionMode || 'default'
    r._procMode = r.sandboxMode || DEFAULT_SANDBOX_MODE
    r._procClaudeMode = r.claudeMode || DEFAULT_CLAUDE_MODE
    r._procClaudeEffort = r.claudeEffort || ''
    r._procModel = r.model || ''
    const q = query({ prompt: r.inputQueue, options: opts })
    const myAbort = r.abortController
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
        // 已被 killQuery 换掉（切模式/模型）时，本次生命周期作废，不能把
        // abort 的 "Operation aborted" 写回记录，也不能覆盖新 query 的状态
        if (r.query !== q) return
        if (myAbort && myAbort.signal.aborted) {
          if (r.status === 'running' || r.status === 'starting') r.status = 'stopped'
        } else {
          r.status = 'error'
          if (!r.error) r.error = describeQueryError(r, e)
        }
        markDirty()
      } finally {
        if (r.query === q) {
          r.query = null
          r.inputQueue = null
          if (r.status === 'running' || r.status === 'starting') r.status = 'done'
          if (r.startedAt != null) r.durationMs = Date.now() - r.startedAt
          markDirty()
        }
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
  const r = newRecord(a.mode !== undefined ? a.mode : a.permissionMode, cwd)
  r.claudeMode = normalizeClaudeMode(a.claudeMode)
  r.claudeEffort = normalizeClaudeEffort(a.claudeEffort)
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
  // 优先读新字段 mode；旧客户端传的 permissionMode（SDK 原生值）归一为「完全权限」
  const mode = normalizeSandboxMode(a.mode !== undefined ? a.mode : a.permissionMode)
  let r = activeId && runtime.has(activeId) ? runtime.get(activeId) : null
  if (!r) {
    let cwd = null
    if (a.cwd && typeof a.cwd === 'string') {
      const abs = path.resolve(a.cwd)
      try { if (fs.statSync(abs).isDirectory()) cwd = abs } catch (e) {}
    }
    r = newRecord(mode, cwd)
    runtime.set(r.key, r)
    activeId = r.key
  }
  if (r.status === 'running' || r.status === 'starting') return { ok: false, error: '该会话正在生成中，请等待或切到其它会话' }
  // 权限模式或模型变更时重建进程：sandbox 是 spawn 期参数，无法热切换；
  // 重建后 session 级授权随之失效（属预期，前端会提示“下次发送生效”）。
  const newModel = a.model !== undefined ? (a.model || '') : (r.model || '')
  const modeChanged = (r._procMode || DEFAULT_SANDBOX_MODE) !== mode
  const modelChanged = (r._procModel || '') !== newModel
  // 工作模式同样是 spawn 期参数（SDK permissionMode），变更要重建 query 才生效
  const claudeMode = normalizeClaudeMode(a.claudeMode !== undefined ? a.claudeMode : (r.claudeMode || DEFAULT_CLAUDE_MODE))
  const claudeModeChanged = (r._procClaudeMode || DEFAULT_CLAUDE_MODE) !== claudeMode
  // 推理程度也是 query 创建期参数（SDK options.effort），变了同样要重建
  const claudeEffort = normalizeClaudeEffort(a.claudeEffort !== undefined ? a.claudeEffort : (r.claudeEffort || ''))
  const claudeEffortChanged = (r._procClaudeEffort || '') !== claudeEffort
  if (r.query && (modeChanged || modelChanged || claudeModeChanged || claudeEffortChanged)) {
    killQuery(r)
  }
  r.sandboxMode = mode
  r.claudeMode = claudeMode
  r.claudeEffort = claudeEffort
  if (modeChanged) r.sessionRules = []   // 换了限制档位，旧的“始终允许”不再成立
  if (a.model !== undefined) r.model = a.model || ''
  if (!r.title) r.title = text.length > 40 ? text.slice(0, 40) : text
  // 图片附件（base64）：与文本一起作为 content 块发给 Claude；记录里只留元信息（mediaType）避免快照膨胀
  const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
  const images = []
  if (Array.isArray(a.images)) {
    for (const im of a.images) {
      if (!im || typeof im !== 'object') continue
      if (IMAGE_TYPES.indexOf(im.mediaType) === -1) continue
      if (typeof im.data !== 'string' || !im.data || im.data.length > 8 * 1024 * 1024) continue
      images.push({ mediaType: im.mediaType, data: im.data })
      if (images.length >= 4) break
    }
  }
  pushMsg(r, {
    id: r.counter++, role: 'user', text: text,
    images: images.length ? images.map(function (im) { return { mediaType: im.mediaType } }) : undefined,
  })
  const res = ensureQuery(r)
  if (!res.ok) return res
  r.status = 'running'
  markDirty()
  try {
    const content = [{ type: 'text', text: expanded }]
    for (const im of images) {
      content.push({ type: 'image', source: { type: 'base64', media_type: im.mediaType, data: im.data } })
    }
    r.inputQueue.push({ type: 'user', message: { role: 'user', content: content } })
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

// 清空当前会话（对应 CLI 的 /clear 语义，SDK 不支持直接发 /clear，故在插件侧重置）：
// 终止进行中的查询，重置上下文与界面记录；磁盘对话文件保留，可随时从历史切回
function clearSession() {
  const r = activeId && runtime.has(activeId) ? runtime.get(activeId) : null
  if (!r) return { ok: false, error: '无活动会话' }
  killQuery(r)
  r.sessionId = null
  r.messages = []
  r.counter = 0
  r._byKey = {}
  r._streamKey = null
  r.status = 'idle'
  r.lastResult = null
  r.sessionCostUsd = 0
  r.sessionTokens = 0
  r.queryCostUsd = 0
  r.queryTokens = 0
  r.startedAt = null
  r.durationMs = null
  r.error = null
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
    const r = newRecord(a.mode !== undefined ? a.mode : a.permissionMode, sessionCwd(sid) || null)
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
  const isAsk = pc.kind === 'ask' || isAskUserQuestion(pc.toolName, pc.input)
  let result
  if (isAsk && behavior === 'always') {
    // 「始终允许」对提问无意义且危险：后续提问会被静默放行、永远不带 answers
    return { ok: false, error: '待确认事项不支持「始终允许」，请选择答案后提交' }
  }
  if (isAsk && behavior === 'allow') {
    // 关键：必须把用户选择放进 updatedInput.answers；缺少 answers 时服务端直接拒绝，
    // 绝不向 CLI 回一个「已允许但没作答」的结果（那正是「未收到选择」的根因）。
    const built = buildQuestionUpdatedInput(pc.input, a.answers)
    if (!built.ok) return { ok: false, error: '请先为待确认事项选择答案' }
    result = { behavior: 'allow', updatedInput: built.updatedInput }
    pc.answers = built.answers
  } else if (behavior === 'allow') {
    result = { behavior: 'allow', updatedInput: pc.input }
  } else if (behavior === 'always') {
    // 始终允许：记录到本次会话的服务端内存规则里，后续同命令自动放行；不写任何配置文件
    addSessionRule(r, pc)
    result = { behavior: 'allow', updatedInput: pc.input }
  } else {
    result = { behavior: 'deny', message: a.message || '用户拒绝' }
  }
  // 在界面上标记该授权卡已处理 + 具体决策，让用户明确自己点了哪个按钮
  markControlDecision(r, pc.requestId, behavior, isAsk ? pc.answers : null)
  // 维护最近一个 pendingControl 引用（供快照/兼容用）
  const rest = Object.keys(r.pendingControls)
  r.pendingControl = rest.length ? r.pendingControls[rest[rest.length - 1]] : null
  try { pc.resolve(result) } catch (e) {}
  markDirty()
  return { ok: true }
}

function markControlDecision(r, requestId, behavior, answers) {
  if (!requestId) return
  for (let i = r.messages.length - 1; i >= 0; i--) {
    const m = r.messages[i]
    if (m.role === 'control' && m.requestId === requestId) {
      m.decision = behavior
      if (answers) m.answers = answers
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
  // AskUserQuestion 是「待确认事项」而非普通工具：任何历史规则都不能让它静默放行
  if (toolName === ASK_TOOL) return false
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
  // 「始终允许」只适用于命令/文件类工具；提问若入规则，后续提问会连卡片都不再出现
  if (pc.kind === 'ask' || pc.toolName === ASK_TOOL) return
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
      if (!cwd) cwd = workspaceForProjectDir(d)
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

// Claude Code 的 projects 目录名是 cwd 把 "/" 替换成 "-" 得到的；
// 某些会话文件只有 last-prompt/cost-state，没有 cwd 字段，需要从目录名反查已注册工作区。
function projectDirKey(p) {
  return String(p || '').replace(/[\\/]/g, '-')
}
function workspaceForProjectDir(dirName) {
  const d = String(dirName || '')
  if (!d) return ''
  for (const w of wsRegistry.workspaces) {
    if (w && w.path && projectDirKey(w.path) === d) return w.path
  }
  return ''
}
function sessionFileCwd(sessionId) {
  const p = readSessionFile(sessionId)
  if (!p) return ''
  return workspaceForProjectDir(path.basename(path.dirname(p)))
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
    // 子代理内部记录不属于主会话（正常情况下子代理记录落在 subagents/*.jsonl，
    // 这里只是防御：一旦同文件出现 sidechain 记录也不要渲染成主会话气泡）。
    if (o.isSidechain === true) continue
    if (o.type === 'user' && o.message && o.message.content) {
      for (const b of o.message.content) {
        if (b.type === 'text' && b.text) {
          // 命令展开的正文在历史里只显示原始命令（如 /dev-flow），隐藏冗长提示词
          msgs.push({ id: counter++, role: 'user', text: resolveCommandDisplay(b.text) })
        } else if (b.type === 'tool_result') {
          const tid = b.tool_use_id
          for (let j = msgs.length - 1; j >= 0; j--) {
            if (msgs[j].role === 'tool' && msgs[j].toolUseId === tid) {
              msgs[j].isError = !!b.is_error
              msgs[j].status = 'done'
              const raw = stringifyContent(b.content)
              if (msgs[j].sub) {
                // 子代理报告：元数据优先取 jsonl 的 toolUseResult（含 agentType/用量），正文剥样板
                const norm = normalizeSubagentResult(raw, o.toolUseResult)
                msgs[j].result = norm.body
                if (norm.meta) msgs[j].meta = Object.assign({}, msgs[j].meta, norm.meta)
              } else {
                msgs[j].result = raw
              }
              break
            }
          }
        }
      }
    } else if (o.type === 'assistant' && o.message) {
      const m = o.message
      const key = m.id || ('m' + counter)
      // Claude Code（扩展思考）会把同一条 assistant 消息按 apiBlockIndex 拆成多行：
      //   0=thinking、1=text、2=tool_use …… message.id 相同。
      // 这里按 id 合并到同一条消息，避免把一份报告拆成「思考气泡 + 正文气泡」两个气泡。
      let am = null
      const last = msgs.length > 0 ? msgs[msgs.length - 1] : null
      if (last && last.role === 'assistant' && last.messageKey === key) am = last
      let textBuf = '', thinkingBuf = ''
      const flush = function () {
        if (textBuf || thinkingBuf) {
          if (am) { am.text += textBuf; am.thinking += thinkingBuf; }
          else {
            am = { id: counter++, role: 'assistant', messageKey: key, model: m.model || '', text: textBuf, thinking: thinkingBuf }
            msgs.push(am)
          }
          textBuf = ''; thinkingBuf = ''
        }
      }
      for (const b of (m.content || [])) {
        if (b.type === 'text') textBuf += b.text || ''
        else if (b.type === 'thinking') thinkingBuf += b.thinking || ''
        else if (b.type === 'tool_use') {
          flush()
          am = null
          const tm = { id: counter++, role: 'tool', toolUseId: b.id, name: b.name || 'Tool', input: b.input || {}, result: null, isError: false, status: 'done' }
          if (isSubagentCall(tm.name, tm.input)) tm.sub = subagentInfo(tm.input)
          msgs.push(tm)
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

// 目录缓存：以「文件清单 + mtime」为指纹，未变化时直接复用上次解析结果（避免每次重读全部 md）
let catalogCache = { stamp: null, data: null }

function readCatalog() {
  const home = os.homedir()
  const commandDirs = [path.join(home, '.claude', 'commands'), path.join(workspaceDir, '.claude', 'commands')]
  const agentDirs = [path.join(home, '.claude', 'agents'), path.join(workspaceDir, '.claude', 'agents')]
  const skillDirs = [path.join(home, '.claude', 'skills'), path.join(workspaceDir, '.claude', 'skills')]

  // 指纹：所有相关文件的路径 + mtime（廉价 stat，文件内容变化时才会重新解析）
  const stampParts = []
  function stampDir(d) {
    let names = []
    try { names = fs.readdirSync(d) } catch (e) { stampParts.push(d + '|-'); return }
    names.sort()
    for (const f of names) {
      let mt = 0
      try { mt = fs.statSync(path.join(d, f)).mtimeMs } catch (e) {}
      stampParts.push(d + '|' + f + '|' + mt)
    }
  }
  for (const d of commandDirs) stampDir(d)
  for (const d of agentDirs) stampDir(d)
  for (const d of skillDirs) {
    let subs = []
    try { subs = fs.readdirSync(d) } catch (e) { stampParts.push(d + '|-'); continue }
    subs.sort()
    for (const sub of subs) {
      let mt = 0
      try { mt = fs.statSync(path.join(d, sub, 'SKILL.md')).mtimeMs } catch (e) {}
      stampParts.push(d + '|' + sub + '|' + mt)
    }
  }
  const stamp = stampParts.join('\n')
  if (catalogCache.data && catalogCache.stamp === stamp) return catalogCache.data

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
    {
      name: 'compact',
      description: '上下文压缩',
      argumentHint: '',
      body: '',
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

  const result = { commands: commands, agents: agents, skills: skills }
  catalogCache = { stamp: stamp, data: result }
  return result
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
    execFile(cmd, args, { env: childEnv() }, function (err, stdout) {
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
    const child = spawn(cmd[0], cmd.slice(1), { detached: true, stdio: 'ignore', env: childEnv() })
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
  return { ok: true, current: workspaceDir }
}

function sessionCwd(sid) {
  let r = null
  runtime.forEach(function (v) { if (v.sessionId === sid) r = v })
  if (r && r.cwd) return r.cwd
  const h = history.find(function (x) { return x.id === sid })
  return h ? (h.cwd || sessionFileCwd(sid)) : sessionFileCwd(sid)
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
  runtime.forEach(function (v) { if (v.sessionId === sid) { v.title = String(title).slice(0, 80); v.mtimeMs = Date.now() } })
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
    const opts = { stdio: ['ignore', 'pipe', 'pipe'], env: childEnv() }
    if (useShell) opts.shell = true
    const child = spawn(cmd, args, opts)
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

// ── 本机信任检查（对齐 DSH 自身 api-request-trust 的边界） ──
// 只放行 loopback 来源；浏览器跨源/跨站请求一律拒绝。
// 刻意不校验 Host：桌面端经 IPC 桥接的请求其 Host 可能是合成的，校验会误伤日常使用。
// 仅依赖浏览器必带的 Origin / Sec-Fetch-Site，既堵住跨源攻击又不影响本机与桌面端。
function isLoopbackHostname(h) {
  h = String(h || '').toLowerCase().replace(/^\[|\]$/g, '')
  return h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '::ffff:127.0.0.1' || /^127\./.test(h)
}
function isTrustedRequest(req) {
  const headers = (req && req.headers) || {}
  const origin = headers.origin
  if (origin && origin !== 'null') {
    let oh = ''
    try { oh = new URL(origin).hostname } catch (e) { return false }
    if (!isLoopbackHostname(oh)) return false
  }
  if (String(headers['sec-fetch-site'] || '').toLowerCase() === 'cross-site') return false
  return true
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
    statePoll.notify()
    if (wsClients.size === 0) return
    const payload = JSON.stringify(snapshot())
    for (const c of wsClients) {
      try { if (c.readyState === WsSocket.OPEN) c.send(payload) } catch (e) {}
    }
  }, wait)
}

// 流式增量帧：只广播正在输出的那一条消息（全量快照每 80ms 一帧太重，长会话下是几百 KB 级）
let streamDirty = false
let streamLastSent = 0
let streamPending = null
function markStreamDirty(r, am) {
  streamPending = { key: r.key, messageKey: am.messageKey, text: am.text, thinking: am.thinking }
  if (streamDirty) return
  streamDirty = true
  const wait = Math.max(0, WS_MIN_INTERVAL - (Date.now() - streamLastSent))
  setTimeout(function () {
    streamDirty = false
    streamLastSent = Date.now()
    statePoll.notifyStream()
    if (wsClients.size === 0 || !streamPending) return
    const payload = JSON.stringify({ type: 'stream-delta', delta: streamPending })
    streamPending = null
    for (const c of wsClients) {
      try { if (c.readyState === WsSocket.OPEN) c.send(payload) } catch (e) {}
    }
  }, wait)
}

// WebSocket 升级处理器（由宿主半部经 webServer.registerUpgrade 调用）。
// 处理器拥有协议握手：这里用 ws 的 handleUpgrade 完成 RFC6455 握手。
function handleUpgrade(req, socket, head) {
  if (!isTrustedRequest(req)) {
    try { socket.destroy() } catch (e) {}
    return
  }
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
  statePoll.stop()
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null }
  for (const c of wsClients) { try { c.terminate() } catch (e) {} }
  wsClients.clear()
  if (wss) { try { wss.close() } catch (e) {} wss = null }
}

// 初始化（独立运行与插件内嵌共用）：恢复工作区、刷新历史、启动 WebSocket 心跳
let heartbeatTimer = null
function initServer() {
  statePoll.stop()
  statePoll = createStatePoll(snapshot)
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

  if (!isTrustedRequest(req)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('forbidden')
    return
  }

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
      // Bounded same-origin long-poll survives Hosted SSO's HTTP proxy and desktop IPC.
      if (req.method === 'GET' && u.pathname === '/api/state-poll') {
        return statePoll.handle(req, res, u)
      }
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
          case '/api/clear-session': return sendJson(res, clearSession())
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

  // claude-ui.js：直接伺服 lib/client.js（独立页加载同一份 UI 源码，零拷贝、零漂移）
  if (rel === 'claude-ui.js') {
    const uiPath = path.join(ROOT, 'lib', 'client.js')
    return fs.readFile(uiPath, function (err, data) {
      if (err) { res.writeHead(404); res.end('not found'); return }
      res.writeHead(200, {
        'Content-Type': 'text/javascript; charset=utf-8',
        'Cache-Control': 'no-store',
      })
      res.end(data)
    })
  }

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
  clearSession,
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
  // 子代理结果规整 / 历史加载（纯函数，供测试与调试）
  normalizeSubagentResult,
  loadHistoryMessages,
  // AskUserQuestion 答案构造（纯函数，供测试与调试）
  isAskUserQuestion,
  buildQuestionUpdatedInput,
  // 权限模式（三档）相关纯函数，供测试与调试
  normalizeSandboxMode,
  sandboxModeDenial,
  sandboxOptions,
  resolveRealPath,
  isWithin,
  isWriteTool,
  writeTargetPath,
  SANDBOX_MODES,
}

// 独立运行入口：node server.js 直接执行时才监听端口
if (require.main === module) {
  initServer()
  const server = http.createServer(handleRequest)
  // 独立运行也要接 WebSocket 升级（内嵌模式由宿主半部的 webServer.registerUpgrade 接线）
  // 带前缀启动（CLAUDE_BASE_PATH=/claude，前端 API 硬编码 /claude/api）时路径要跟着带前缀
  const wsPath = (BASE_PATH || '') + '/api/stream'
  server.on('upgrade', function (req, socket, head) {
    let pathname = ''
    try { pathname = new URL(req.url, 'http://localhost').pathname } catch (e) {}
    if (pathname === wsPath) handleUpgrade(req, socket, head)
    else { try { socket.destroy() } catch (e) {} }
  })
  server.listen(PORT, '127.0.0.1', function () {
  console.log('')
  console.log('  Claude Code 工作空间已启动')
  console.log('  → http://127.0.0.1:' + PORT)
  console.log('  按 Ctrl+C 停止')
  console.log('')
  })
}
