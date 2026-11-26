'use strict'

// Finite HTTP responses work through the authenticated desktop fetch bridge.
// This module has no server, filesystem, model, or authentication side effects.
const { randomUUID } = require('node:crypto')

function createStatePoll(readSnapshot, options = {}) {
  const epoch = randomUUID()
  const waitMs = options.waitMs ?? 10000
  const maxWaiters = options.maxWaiters ?? 64
  let revision = 0
  let stopped = false
  const streamIntervalMs = options.streamIntervalMs ?? 500
  let streamTimer = null
  const waiters = new Set()
  const cursor = () => epoch + ':' + revision

  function reply(res, status, body) {
    if (res.destroyed || res.writableEnded) return
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    })
    res.end(JSON.stringify(body))
  }

  function current(res) {
    // Read before emitting headers: an unexpected projection failure must not
    // strand a request or crash an asynchronous notification timer.
    try {
      const state = readSnapshot()
      reply(res, 200, { ok: true, revision: cursor(), state })
    } catch (_) {
      reply(res, 500, { ok: false, error: 'state_unavailable' })
    }
  }

  function handle(req, res, url) {
    if (stopped) return reply(res, 503, { ok: false, error: 'transport_stopped' })
    if (req.method !== 'GET') return reply(res, 405, { ok: false, error: 'method_not_allowed' })
    if (url.searchParams.get('revision') !== cursor()) return current(res)
    if (waiters.size >= maxWaiters) return reply(res, 429, { ok: false, error: 'too_many_waiters' })
    const waiter = { finish: null }
    let timer
    let settled = false
    const cleanup = () => {
      clearTimeout(timer)
      waiters.delete(waiter)
      req.off('aborted', cancelled)
      res.off('close', cancelled)
    }
    const cancelled = () => {
      if (settled) return
      settled = true
      cleanup()
    }
    waiter.finish = (reason) => {
      if (settled) return
      settled = true
      cleanup()
      if (reason === 'changed') current(res)
      else if (reason === 'stopped') reply(res, 503, { ok: false, error: 'transport_stopped' })
      else reply(res, 200, { ok: true, revision: cursor(), unchanged: true })
    }
    waiters.add(waiter)
    req.once('aborted', cancelled)
    res.once('close', cancelled)
    timer = setTimeout(() => waiter.finish('timeout'), waitMs)
    // A disconnected caller cannot retain a timer or a slot.
    if (req.aborted || res.destroyed || res.writableEnded) cancelled()
  }

  function notify() {
    if (stopped) return
    // Structural/terminal updates are never delayed behind token coalescing.
    if (streamTimer !== null) { clearTimeout(streamTimer); streamTimer = null }
    revision += 1
    for (const waiter of [...waiters]) waiter.finish('changed')
  }

  function notifyStream() {
    if (stopped || streamTimer !== null) return
    // Full snapshots are heavier than WS deltas: coalesce token-only updates
    // to at most 2Hz, while keeping initial and terminal states immediate.
    streamTimer = setTimeout(() => { streamTimer = null; notify() }, streamIntervalMs)
  }

  function stop() {
    if (stopped) return
    stopped = true
    if (streamTimer !== null) { clearTimeout(streamTimer); streamTimer = null }
    for (const waiter of [...waiters]) waiter.finish('stopped')
  }

  return { handle, notify, notifyStream, stop, get pending() { return waiters.size } }
}

module.exports = { createStatePoll }
