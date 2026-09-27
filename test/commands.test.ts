import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { addRepos } from '../src/commands/addRepos.ts'
import { doneTask } from '../src/commands/doneTask.ts'
import { installAgents } from '../src/commands/installAgents.ts'
import { listTasks } from '../src/commands/listTasks.ts'
import { newTask } from '../src/commands/newTask.ts'
import { git, makeWorkspace } from './fixture.ts'

const branches = (clone: string) => git(clone, 'branch', '--format=%(refname:short)').split('\n').filter(Boolean)
const worktrees = (clone: string) => git(clone, 'worktree', 'list', '--porcelain').split('\n').filter((l) => l.startsWith('worktree '))

describe('inosc new', () => {
  it('creates edit and read worktrees, copies includes, runs setup and links, writes agent files', () => {
    const { ws, ctx, wsRoot } = makeWorkspace()
    const res = newTask(ctx, ws, { id: 'T-1', edit: ['app', 'lib'], read: ['db'], slug: null })
    expect(res.ok).toBe(true)
    const dir = join(wsRoot, 'tasks', 'T-1')

    expect(git(join(dir, 'app'), 'symbolic-ref', '--short', 'HEAD')).toBe('t-1')
    expect(git(join(dir, 'lib'), 'symbolic-ref', '--short', 'HEAD')).toBe('t-1')
    expect(() => git(join(dir, 'db'), 'symbolic-ref', '-q', 'HEAD')).toThrow()
    expect(git(join(dir, 'db'), 'rev-parse', 'HEAD')).toBe(git(join(wsRoot, 'db'), 'rev-parse', 'origin/main'))

    expect(readFileSync(join(dir, 'app', 'secret.local'), 'utf8')).toBe('token=abc\n')
    expect(readFileSync(join(dir, 'app', 'setup.local'), 'utf8').trim()).toBe('setup')
    expect(readFileSync(join(dir, 'app', 'link.local'), 'utf8').trim()).toBe('../lib')

    expect(readFileSync(join(dir, 'CLAUDE.md'), 'utf8')).toBe('@AGENTS.md\n')
    expect(readFileSync(join(dir, 'AGENTS.md'), 'utf8')).toContain('# Task T-1')
    expect(JSON.parse(readFileSync(join(dir, '.vscode', 'settings.json'), 'utf8'))['git.repositoryScanMaxDepth']).toBe(1)
    // task branches must not track main, or a bare `git push` would target it
    expect(() => git(join(dir, 'app'), 'rev-parse', '--abbrev-ref', '@{upstream}')).toThrow()
  })

  it('refuses unknown repos, duplicate tasks and bad IDs', () => {
    const { ws, ctx } = makeWorkspace()
    expect(newTask(ctx, ws, { id: 'T-1', edit: ['nope'], read: [], slug: null }).ok).toBe(false)
    expect(newTask(ctx, ws, { id: '../x', edit: ['app'], read: [], slug: null }).ok).toBe(false)
    expect(newTask(ctx, ws, { id: 'T-1', edit: ['app'], read: [], slug: null }).ok).toBe(true)
    expect(newTask(ctx, ws, { id: 'T-1', edit: ['lib'], read: [], slug: null }).ok).toBe(false)
  })

  it('checks out an existing remote task branch with tracking', () => {
    const { ws, ctx, wsRoot } = makeWorkspace()
    const lib = join(wsRoot, 'lib')
    git(lib, 'switch', '--quiet', '-c', 't-9')
    writeFileSync(join(lib, 'wip.txt'), 'wip\n')
    git(lib, 'add', '-A')
    git(lib, 'commit', '--quiet', '-m', 'wip')
    git(lib, 'push', '--quiet', '-u', 'origin', 't-9')
    git(lib, 'switch', '--quiet', 'main')
    git(lib, 'branch', '--quiet', '-D', 't-9')

    expect(newTask(ctx, ws, { id: 'T-9', edit: ['lib'], read: [], slug: null }).ok).toBe(true)
    const wt = join(wsRoot, 'tasks', 'T-9', 'lib')
    expect(existsSync(join(wt, 'wip.txt'))).toBe(true)
    expect(git(wt, 'rev-parse', '--abbrev-ref', '@{upstream}')).toBe('origin/t-9')
  })

  it('skips setup and links with skipSetup', () => {
    const { ws, ctx, wsRoot } = makeWorkspace()
    newTask({ ...ctx, skipSetup: true }, ws, { id: 'T-1', edit: ['app', 'lib'], read: [], slug: null })
    expect(existsSync(join(wsRoot, 'tasks', 'T-1', 'app', 'setup.local'))).toBe(false)
    expect(existsSync(join(wsRoot, 'tasks', 'T-1', 'app', 'link.local'))).toBe(false)
  })
})

describe('inosc add', () => {
  it('adds a repo, runs the link it completes and regenerates AGENTS.md', () => {
    const { ws, ctx, wsRoot } = makeWorkspace()
    newTask(ctx, ws, { id: 'T-1', edit: ['app'], read: [], slug: null })
    const dir = join(wsRoot, 'tasks', 'T-1')
    expect(existsSync(join(dir, 'app', 'link.local'))).toBe(false)

    const res = addRepos(ctx, ws, { id: 'T-1', edit: [], read: ['lib'] })
    expect(res.ok).toBe(true)
    expect(readFileSync(join(dir, 'app', 'link.local'), 'utf8').trim()).toBe('../lib')
    expect(readFileSync(join(dir, 'AGENTS.md'), 'utf8')).toContain('| lib | `lib/` | read-only')
    expect(addRepos(ctx, ws, { id: 'T-1', edit: ['lib'], read: [] }).ok).toBe(false)
  })
})

describe('inosc ls', () => {
  it('reports branch, dirty and unpushed state', () => {
    const { ws, ctx, wsRoot } = makeWorkspace()
    newTask(ctx, ws, { id: 'T-1', edit: ['lib'], read: ['db'], slug: null })
    const lib = join(wsRoot, 'tasks', 'T-1', 'lib')
    writeFileSync(join(lib, 'a.txt'), 'a\n')
    git(lib, 'add', '-A')
    git(lib, 'commit', '--quiet', '-m', 'a')
    writeFileSync(join(lib, 'b.txt'), 'b\n')

    const res = listTasks(ws)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const [task] = res.value
    expect(task?.id).toBe('T-1')
    expect(task?.repos.find((r) => r.name === 'lib')).toMatchObject({ head: 't-1', dirty: ['b.txt'], unpushed: 1 })
    expect(task?.repos.find((r) => r.name === 'db')).toMatchObject({ head: null, dirty: [], unpushed: 0, mode: 'read' })
  })
})

describe('inosc done', () => {
  it('refuses on uncommitted work, unpushed commits and foreign files; removes everything once clean', () => {
    const { ws, ctx, wsRoot } = makeWorkspace()
    newTask(ctx, ws, { id: 'T-1', edit: ['app', 'lib'], read: ['db'], slug: null })
    const dir = join(wsRoot, 'tasks', 'T-1')
    const lib = join(dir, 'lib')

    writeFileSync(join(lib, 'a.txt'), 'a\n')
    const dirty = doneTask(ctx, ws, { id: 'T-1', force: false })
    expect(dirty.ok).toBe(false)
    if (!dirty.ok) expect(dirty.error).toContain('lib: 1 uncommitted path(s): a.txt')

    git(lib, 'add', '-A')
    git(lib, 'commit', '--quiet', '-m', 'a')
    const unpushed = doneTask(ctx, ws, { id: 'T-1', force: false })
    expect(unpushed.ok).toBe(false)
    if (!unpushed.ok) expect(unpushed.error).toContain('lib: 1 commit(s) not on any remote')

    git(lib, 'push', '--quiet', '-u', 'origin', 't-1')
    writeFileSync(join(dir, 'notes.md'), 'mine\n')
    const foreign = doneTask(ctx, ws, { id: 'T-1', force: false })
    expect(foreign.ok).toBe(false)
    if (!foreign.ok) expect(foreign.error).toContain('notes.md')

    rmSync(join(dir, 'notes.md'))
    expect(doneTask(ctx, ws, { id: 'T-1', force: false }).ok).toBe(true)

    expect(existsSync(dir)).toBe(false)
    for (const name of ['app', 'lib', 'db']) {
      const clone = join(wsRoot, name)
      expect(branches(clone)).toEqual(['main'])
      expect(worktrees(clone)).toHaveLength(1)
    }
  })

  it('reports ignoreDirty paths separately and removes despite them', () => {
    const { ws, ctx, wsRoot } = makeWorkspace({
      repos: { app: { clone: 'app', ignoreDirty: ['lock.txt'] }, lib: { clone: 'lib' }, db: { clone: 'db' } },
      links: [],
    })
    newTask(ctx, ws, { id: 'T-1', edit: ['app'], read: [], slug: null })
    writeFileSync(join(wsRoot, 'tasks', 'T-1', 'app', 'lock.txt'), 'x\n')
    const listed = listTasks(ws)
    expect(listed.ok && listed.value[0]?.repos[0]).toMatchObject({ dirty: [], ignored: ['lock.txt'] })
    const res = doneTask(ctx, ws, { id: 'T-1', force: false })
    expect(res.ok ? '' : res.error).toBe('')
  })

  it('--force discards work', () => {
    const { ws, ctx, wsRoot } = makeWorkspace()
    newTask(ctx, ws, { id: 'T-1', edit: ['lib'], read: [], slug: null })
    writeFileSync(join(wsRoot, 'tasks', 'T-1', 'lib', 'a.txt'), 'a\n')
    expect(doneTask(ctx, ws, { id: 'T-1', force: true }).ok).toBe(true)
    expect(branches(join(wsRoot, 'lib'))).toEqual(['main'])
  })

  it('cleans up a task left half-created by a failed setup', () => {
    const { ws, ctx, wsRoot } = makeWorkspace({
      repos: { app: { clone: 'app', setup: ['exit 3'] }, lib: { clone: 'lib' }, db: { clone: 'db' } },
      links: [],
    })
    const res = newTask(ctx, ws, { id: 'T-1', edit: ['lib', 'app'], read: [], slug: null })
    expect(res.ok).toBe(false)
    const listed = listTasks(ws)
    expect(listed.ok && listed.value[0]?.repos.map((r) => r.name)).toEqual(['lib', 'app'])
    expect(doneTask(ctx, ws, { id: 'T-1', force: false }).ok).toBe(true)
    expect(existsSync(join(wsRoot, 'tasks', 'T-1'))).toBe(false)
    expect(branches(join(wsRoot, 'app'))).toEqual(['main'])
  })
})

describe('parallel tasks', () => {
  it('keep separate worktrees and branches of the same repo', () => {
    const { ws, ctx, wsRoot } = makeWorkspace()
    newTask(ctx, ws, { id: 'T-1', edit: ['app', 'lib'], read: [], slug: null })
    newTask(ctx, ws, { id: 'T-2', edit: ['app'], read: [], slug: null })
    writeFileSync(join(wsRoot, 'tasks', 'T-1', 'app', 'only-t1.txt'), 'x\n')
    expect(existsSync(join(wsRoot, 'tasks', 'T-2', 'app', 'only-t1.txt'))).toBe(false)
    expect(existsSync(join(wsRoot, 'tasks', 'T-2', 'app', 'link.local'))).toBe(false)
    expect(doneTask(ctx, ws, { id: 'T-2', force: false }).ok).toBe(true)
    expect(branches(join(wsRoot, 'app')).sort()).toEqual(['main', 't-1'])
  })
})

describe('inosc agents install', () => {
  it('copies the skill for Claude Code and the shared agents dir, and refuses to clobber others', () => {
    const { ctx } = makeWorkspace()
    const res = installAgents(ctx, false)
    expect(res.ok).toBe(true)
    expect(readFileSync(join(ctx.home, '.claude', 'skills', 'inosc', 'SKILL.md'), 'utf8')).toContain('name: inosc')
    expect(existsSync(join(ctx.home, '.agents', 'skills', 'inosc', 'SKILL.md'))).toBe(true)
    expect(installAgents(ctx, false).ok).toBe(true)

    const foreign = join(ctx.home, '.agents', 'skills', 'inosc')
    writeFileSync(join(foreign, 'SKILL.md'), '---\nname: other\n---\n')
    expect(installAgents(ctx, false).ok).toBe(false)
    mkdirSync(foreign, { recursive: true })
    expect(installAgents(ctx, true).ok).toBe(true)
  })
})
