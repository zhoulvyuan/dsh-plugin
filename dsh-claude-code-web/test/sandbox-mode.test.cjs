'use strict'
// 三档权限模式的纯函数测试。
// 只测闸门与参数拼装，不启动 Claude Code、不依赖系统沙箱后端，可在任意平台跑：
//   node --test test/
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const s = require('../server.cjs')

const {
  normalizeSandboxMode,
  sandboxModeDenial,
  sandboxOptions,
  resolveRealPath,
  isWithin,
  isWriteTool,
  writeTargetPath,
} = s

function makeWorkspace() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccw-mode-'))
  fs.mkdirSync(path.join(dir, 'sub'), { recursive: true })
  // 指向工作区外的符号链接：闸门必须能识别成“工作区外”
  try { fs.symlinkSync(os.tmpdir(), path.join(dir, 'outlink')) } catch (e) {}
  return dir
}

test('normalizeSandboxMode：三档原样通过，旧字段与脏值一律落到完全权限', () => {
  for (const m of ['read-only', 'workspace-write', 'danger-full-access']) {
    assert.equal(normalizeSandboxMode(m), m)
  }
  for (const legacy of ['default', 'acceptEdits', 'plan', 'bypassPermissions', 'dontAsk', 'auto']) {
    assert.equal(normalizeSandboxMode(legacy), 'danger-full-access', legacy)
  }
  for (const junk of [undefined, null, '', 0, {}, [], 'readonly']) {
    assert.equal(normalizeSandboxMode(junk), 'danger-full-access', String(junk))
  }
})

test('isWriteTool：内置写类工具为真，读/执行类为假', () => {
  for (const t of ['Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'StrReplace', 'ApplyPatch', 'WriteFile']) {
    assert.equal(isWriteTool(t), true, t)
  }
  for (const t of ['Read', 'Grep', 'Glob', 'Bash', 'WebFetch', 'Task', 'AskUserQuestion', '', null]) {
    assert.equal(isWriteTool(t), false, String(t))
  }
})

test('writeTargetPath：兼容 file_path / notebook_path / path / target_file', () => {
  assert.equal(writeTargetPath({ file_path: '/a/b.txt' }), '/a/b.txt')
  assert.equal(writeTargetPath({ notebook_path: '/a/b.ipynb' }), '/a/b.ipynb')
  assert.equal(writeTargetPath({ path: 'src/x.ts' }), 'src/x.ts')
  assert.equal(writeTargetPath({ target_file: 'x' }), 'x')
  assert.equal(writeTargetPath({}), null)
  assert.equal(writeTargetPath(null), null)
})

test('isWithin：自身/子路径为真，穿越、绝对外路径、相似前缀为假', () => {
  const root = '/tmp/ws'
  assert.equal(isWithin(root, root), true)
  assert.equal(isWithin(root, root + '/a/b.txt'), true)
  assert.equal(isWithin(root, root + '/..foo/x'), true)
  assert.equal(isWithin(root, '/etc/passwd'), false)
  assert.equal(isWithin(root, path.resolve(root, '..')), false)
  assert.equal(isWithin(root, path.resolve(root, '../x')), false)
  assert.equal(isWithin(root, null), false)
})

test('resolveRealPath：不存在的文件按最近已存在祖先解析，软链逃逸会指到工作区外', () => {
  const ws = makeWorkspace()
  const root = fs.realpathSync(ws)
  const inner = resolveRealPath(path.join(ws, 'sub/not-yet.txt'), root)
  assert.equal(isWithin(root, inner), true, inner)

  const viaLink = resolveRealPath(path.join(ws, 'outlink', 'evil.txt'), root)
  assert.equal(isWithin(root, viaLink), false, viaLink)

  const traversal = resolveRealPath(path.resolve(ws, '../escape.txt'), root)
  assert.equal(isWithin(root, traversal), false, traversal)

  assert.equal(resolveRealPath('', root), null)
})

test('闸门：仅可查看拒绝所有写类工具，放行读与 Bash（写入交给沙箱）', () => {
  const ws = makeWorkspace()
  const inside = path.join(ws, 'a.txt')
  assert.match(sandboxModeDenial('read-only', 'Write', { file_path: inside }, ws), /仅可查看/)
  assert.match(sandboxModeDenial('read-only', 'Edit', { file_path: inside }, ws), /仅可查看/)
  assert.match(sandboxModeDenial('read-only', 'NotebookEdit', { notebook_path: inside }, ws), /仅可查看/)
  assert.equal(sandboxModeDenial('read-only', 'Read', { file_path: '/etc/passwd' }, ws), null)
  assert.equal(sandboxModeDenial('read-only', 'Bash', { command: 'ls' }, ws), null)
})

test('闸门：工作区内修改只放行工作区路径，穿越/软链/未知路径一律拒绝', () => {
  const ws = makeWorkspace()
  const root = fs.realpathSync(ws)
  assert.equal(sandboxModeDenial('workspace-write', 'Write', { file_path: path.join(ws, 'sub/a.txt') }, ws), null)
  assert.equal(sandboxModeDenial('workspace-write', 'Write', { file_path: path.join(ws, 'a.txt') }, ws), null)
  assert.equal(sandboxModeDenial('workspace-write', 'Read', { file_path: '/etc/passwd' }, ws), null)

  assert.match(sandboxModeDenial('workspace-write', 'Write', { file_path: '/etc/x' }, ws), /只允许修改工作区/)
  assert.match(sandboxModeDenial('workspace-write', 'Write', { file_path: path.join(ws, '../evil.txt') }, ws), /只允许修改工作区/)
  assert.match(sandboxModeDenial('workspace-write', 'Write', { file_path: path.join(ws, 'outlink/evil.txt') }, ws), /只允许修改工作区/)
  assert.match(sandboxModeDenial('workspace-write', 'Write', {}, ws), /无法确认写入目标路径/)
  assert.ok(root)
})

test('闸门：完全权限不做任何判定', () => {
  assert.equal(sandboxModeDenial('danger-full-access', 'Write', { file_path: '/etc/x' }, '/tmp'), null)
  assert.equal(sandboxModeDenial('danger-full-access', 'Bash', { command: 'rm -rf /' }, '/tmp'), null)
})

test('sandboxOptions：完全权限不挂沙箱，受限两档 fail-closed 且禁止关沙箱', () => {
  const ws = makeWorkspace()
  assert.equal(sandboxOptions('danger-full-access', ws), null)

  const ro = sandboxOptions('read-only', ws)
  assert.equal(ro.enabled, true)
  assert.equal(ro.failIfUnavailable, true)
  assert.equal(ro.autoAllowBashIfSandboxed, true)
  assert.equal(ro.allowUnsandboxedCommands, false)
  assert.deepEqual(ro.filesystem.allowWrite, [])
  assert.deepEqual(ro.filesystem.denyWrite, ['/'])

  const wsm = sandboxOptions('workspace-write', ws)
  assert.equal(wsm.enabled, true)
  assert.equal(wsm.failIfUnavailable, true)
  assert.equal(wsm.allowUnsandboxedCommands, false)
  assert.deepEqual(wsm.filesystem.allowWrite, [fs.realpathSync(ws)])
  assert.equal(wsm.filesystem.denyWrite, undefined)
})
