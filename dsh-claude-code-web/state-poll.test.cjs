'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { createStatePoll } = require('./state-poll.cjs')

function request(poll, revision, method = 'GET') {
  const req = new EventEmitter()
  req.method = method
  const res = new EventEmitter()
  res.writeHead = (status, headers) => { res.status = status; res.headers = headers }
  let done
  res.done = new Promise(resolve => { done = resolve })
  res.end = body => { res.body = JSON.parse(body); res.writableEnded = true; done(res) }
  const url = new URL('http://local/claude/api/state-poll')
  if (revision !== undefined) url.searchParams.set('revision', revision)
  poll.handle(req, res, url)
  return { req, res }
}

test('initial state, revision change, unchanged heartbeat and fresh epoch', async () => {
  let value = 1
  const poll = createStatePoll(() => ({ value }), { waitMs: 10 })
  const first = request(poll).res
  assert.equal(first.status, 200)
  assert.equal(first.body.state.value, 1)
  assert.equal(first.headers['Cache-Control'], 'no-store')
  const waiting = request(poll, first.body.revision).res
  assert.equal(poll.pending, 1)
  value = 2
  poll.notify()
  assert.equal(waiting.body.state.value, 2)
  assert.notEqual(waiting.body.revision, first.body.revision)
  assert.equal(poll.pending, 0)
  const heartbeat = await request(poll, waiting.body.revision).res.done
  assert.equal(heartbeat.body.unchanged, true)
  assert.equal(heartbeat.body.state, undefined)
  assert.equal(heartbeat.body.revision, waiting.body.revision)
  const fresh = createStatePoll(() => ({ value }))
  const restart = request(fresh, waiting.body.revision).res
  assert.equal(restart.body.state.value, 2)
  assert.notEqual(restart.body.revision, waiting.body.revision)
  poll.stop(); fresh.stop()
})

test('token updates coalesce; terminal state flushes immediately', async () => {
  let value = 0
  const poll = createStatePoll(() => ({ value }), { streamIntervalMs: 15 })
  const rev = request(poll).res.body.revision
  const waiting = request(poll, rev).res
  for (let i = 1; i <= 10; i++) { value = i; poll.notifyStream() }
  assert.equal(waiting.status, undefined)
  await waiting.done
  assert.equal(waiting.body.state.value, 10)
  const terminal = request(poll, waiting.body.revision).res
  value = 11; poll.notifyStream()
  value = 12; poll.notify()
  assert.equal(terminal.body.state.value, 12)
  poll.stop()
})

test('standalone page serves the same HTTP client artifact', () => {
  const html = fs.readFileSync(path.join(__dirname, 'public/index.html'), 'utf8')
  const server = fs.readFileSync(path.join(__dirname, 'server.cjs'), 'utf8')
  assert.ok(html.includes('"/claude-ui.js"'))
  assert.ok(server.includes("path.join(ROOT, 'lib', 'client.js')"))
  assert.ok(server.includes("u.pathname === '/api/state-poll'"))
  const source = fs.readFileSync(path.join(__dirname, 'lib/client.js'), 'utf8')
  assert.equal(source.includes('new WebSocket('), false)
  assert.equal(source.includes('openStandalone();'), false)
})

test('bounded waiters, disconnect cleanup, method fence and disposal', () => {
  const poll = createStatePoll(() => ({ value: 1 }), { maxWaiters: 2 })
  const rev = request(poll).res.body.revision
  const a = request(poll, rev)
  const b = request(poll, rev)
  assert.equal(request(poll, rev).res.status, 429)
  a.req.emit('aborted')
  b.res.emit('close')
  assert.equal(poll.pending, 0)
  assert.equal(a.req.listenerCount('aborted'), 0)
  assert.equal(b.res.listenerCount('close'), 0)
  assert.equal(request(poll, rev, 'POST').res.status, 405)
  const pending = request(poll, rev).res
  poll.stop()
  assert.equal(pending.status, 503)
  assert.equal(poll.pending, 0)
  assert.equal(request(poll).res.status, 503)
})

test('projection failures are finite generic errors without leaking internals', () => {
  const poll = createStatePoll(() => { throw new Error('private detail') })
  const res = request(poll).res
  assert.equal(res.status, 500)
  assert.equal(res.body.error, 'state_unavailable')
  assert.equal(JSON.stringify(res.body).includes('private detail'), false)
  poll.stop()
})

const clientCode = fs.readFileSync(path.join(__dirname, 'lib/client.js'), 'utf8')
const client = { AbortController, console, setTimeout, clearTimeout }
vm.runInNewContext(clientCode, client)
const turn = () => new Promise(resolve => setImmediate(resolve))
function clock() {
  let id = 0
  const timers = new Map()
  return {
    timers,
    setTimeout(fn, delay) { const key = ++id; timers.set(key, { fn, delay }); return key },
    clearTimeout(key) { timers.delete(key) },
    fire(predicate) { const pair = [...timers].find(([, t]) => predicate(t.delay)); assert.ok(pair); timers.delete(pair[0]); pair[1].fn() },
  }
}

test('client same-origin fetch, unchanged state, reconnect and stop cancellation', async () => {
  const timer = clock()
  const seen = []
  const states = []
  const failures = []
  let connected = 0
  const replies = [
    { ok: true, revision: 'one', state: { value: 1 } },
    { ok: true, revision: 'one', unchanged: true },
    '401',
    { ok: true, revision: 'two', state: { value: 2 } },
  ]
  const stop = client.startStatePoll({
    url: '/claude/api/state-poll', ...timer,
    fetch: async (url, options) => {
      seen.push({ url, options })
      const data = replies.shift()
      if (data === '401') return { ok: false, status: 401 }
      if (data) return { ok: true, json: async () => data }
      return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }))
    },
    onState: state => states.push(state.value),
    onConnected: () => connected++,
    onDisconnected: n => failures.push(n),
  })
  await turn()
  assert.deepEqual(states, [1])
  assert.equal(connected, 1)
  timer.fire(d => d === 80); await turn()
  assert.equal(seen[1].url, '/claude/api/state-poll?revision=one')
  assert.deepEqual(states, [1])
  timer.fire(d => d === 80); await turn()
  assert.deepEqual(failures, [1])
  timer.fire(d => d >= 500 && d < 750); await turn()
  assert.deepEqual(states, [1, 2])
  assert.equal(connected, 2)
  timer.fire(d => d === 80); await turn()
  const pendingSignal = seen.at(-1).options.signal
  stop(); await turn()
  assert.equal(pendingSignal.aborted, true)
  assert.equal(timer.timers.size, 0)
  for (const call of seen) {
    assert.ok(call.url.startsWith('/claude/api/state-poll'))
    assert.equal(call.options.credentials, 'same-origin')
    assert.equal(call.options.cache, 'no-store')
  }
  assert.equal(clientCode.includes('new WebSocket('), false)
  assert.equal(clientCode.includes('openStandalone();'), false)
})

test('client deadline aborts in-flight fetch and schedules bounded retry', async () => {
  const timer = clock()
  const failures = []
  let signal
  const stop = client.startStatePoll({
    url: '/claude/api/state-poll', ...timer,
    fetch: (url, options) => { signal = options.signal; return new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('timeout')), { once: true })) },
    onState: () => assert.fail('unexpected state'),
    onConnected: () => assert.fail('unexpected connection'),
    onDisconnected: n => failures.push(n),
  })
  timer.fire(d => d === 15000); await turn()
  assert.equal(signal.aborted, true)
  assert.deepEqual(failures, [1])
  assert.ok([...timer.timers.values()].some(t => t.delay >= 500 && t.delay < 750))
  stop()
  assert.equal(timer.timers.size, 0)
})

test('host enforces Connection admission before all handlers and exposes no WS', () => {
  const source = fs.readFileSync(path.join(__dirname, 'lib/index.js'), 'utf8')
  const code = source.replace("import { createRequire } from 'node:module'", '')
    .replace('const require = createRequire(import.meta.url)', 'const require = stubRequire')
    .replace('export { apply, inject, name }', 'globalThis.host = { apply, inject, name }')
  let handled = 0, disposed = 0, handler, cleanup
  const app = { initServer() {}, handleRequest() { handled++ }, disposeServer() { disposed++ } }
  const stubRequire = () => app
  stubRequire.resolve = () => '/virtual/server.cjs'
  const sandbox = { stubRequire, process: { env: { CLAUDE_BASE_PATH: '/claude', CLAUDE_CODE_WEB_HOME: '/virtual' } } }
  vm.runInNewContext(code, sandbox)
  let rejection = 401
  const ctx = {
    connection: { requestRejection() { return rejection } },
    effect(fn) { cleanup = fn() },
    webServer: {
      register(route) { handler = route.handler; return () => { disposed++ } },
      registerUpgrade() { assert.fail('hosted WS registration prohibited') },
    },
  }
  sandbox.host.apply(ctx)
  const res = { writeHead(s) { this.status = s }, end() {} }
  handler({}, res); assert.equal(res.status, 401); assert.equal(handled, 0)
  rejection = 403
  handler({}, res); assert.equal(res.status, 403); assert.equal(handled, 0)
  rejection = undefined
  handler({}, res); assert.equal(handled, 1)
  cleanup(); assert.equal(disposed, 2)
})
