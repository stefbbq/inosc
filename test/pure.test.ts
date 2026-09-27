import { describe, expect, it } from 'vitest'
import { renderAgentsMd } from '../src/agents/renderAgentsMd.ts'
import { parseConfig } from '../src/config/parseConfig.ts'
import { activeLinks } from '../src/task/activeLinks.ts'
import { removalProblems } from '../src/task/removalProblems.ts'
import { renderBranch } from '../src/task/renderBranch.ts'
import { validateTaskId } from '../src/task/validateTaskId.ts'

describe('renderBranch', () => {
  it('lowercases {id} and keeps {ID}', () => {
    expect(renderBranch('{id}', 'PROJ-12', null)).toBe('proj-12')
    expect(renderBranch('feat/{ID}', 'PROJ-12', null)).toBe('feat/PROJ-12')
  })
  it('fills or drops {slug}', () => {
    expect(renderBranch('{id}-{slug}', 'PROJ-12', 'login')).toBe('proj-12-login')
    expect(renderBranch('{id}-{slug}', 'PROJ-12', null)).toBe('proj-12')
  })
})

describe('validateTaskId', () => {
  it('accepts ticket-like IDs and rejects paths', () => {
    expect(validateTaskId('PROJ-12').ok).toBe(true)
    expect(validateTaskId('../x').ok).toBe(false)
    expect(validateTaskId('a/b').ok).toBe(false)
    expect(validateTaskId('-x').ok).toBe(false)
  })
})

describe('parseConfig', () => {
  it('applies defaults', () => {
    const res = parseConfig({ repos: { a: { clone: 'a' } } })
    expect(res.ok && res.value).toMatchObject({ tasksDir: 'tasks', base: 'origin/main', branch: '{id}', links: [] })
  })
  it('collects every error', () => {
    const res = parseConfig({ repos: { a: {} }, links: [{ from: 'a', to: 'x', run: 'y' }] })
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error).toContain('repos.a.clone is required')
      expect(res.error).toContain('unknown repo "x"')
    }
  })
  it('rejects an empty repo map', () => {
    expect(parseConfig({ repos: {} }).ok).toBe(false)
  })
})

describe('activeLinks', () => {
  const links = [
    { from: 'a', to: 'b', run: 'x' },
    { from: 'c', to: 'b', run: 'y' },
  ]
  it('needs both ends present', () => {
    expect(activeLinks(links, ['a', 'b'])).toEqual([links[0]])
  })
  it('filters to links touching new repos', () => {
    expect(activeLinks(links, ['a', 'b', 'c'], ['c'])).toEqual([links[1]])
  })
})

describe('removalProblems', () => {
  const base = { name: 'a', mode: 'edit' as const, path: '/x', exists: true, head: 'a', dirty: [], unpushed: 0 }
  it('is empty for a clean pushed worktree', () => {
    expect(removalProblems(base, [])).toEqual([])
  })
  it('reports dirty and unpushed, honouring ignoreDirty', () => {
    expect(removalProblems({ ...base, dirty: ['lock.yaml'], unpushed: 2 }, ['lock.yaml'])).toEqual([
      'a: 2 commit(s) not on any remote',
    ])
    expect(removalProblems({ ...base, dirty: ['x'] }, [])).toHaveLength(1)
  })
})

describe('renderAgentsMd', () => {
  it('lists repos, links, commands and remaining repos', () => {
    const config = parseConfig({
      repos: { a: { clone: 'a', commands: { test: 'pnpm test' } }, b: { clone: 'b' }, c: { clone: 'c' } },
      links: [{ from: 'a', to: 'b', run: 'link {to}' }],
      instructions: ['Be nice.'],
    })
    if (!config.ok) throw new Error(config.error)
    const md = renderAgentsMd(config.value, {
      id: 'T-1',
      slug: null,
      createdAt: '',
      repos: [
        { name: 'a', mode: 'edit', branch: 't-1', base: 'origin/main' },
        { name: 'b', mode: 'read', branch: null, base: 'origin/main' },
      ],
    })
    expect(md).toContain('| a | `a/` | edit | `t-1` | `origin/main` |')
    expect(md).toContain('| b | `b/` | read-only | detached |')
    expect(md).toContain('cd a && link ../b')
    expect(md).toContain('- test: `pnpm test`')
    expect(md).toContain('Available: c.')
    expect(md).toContain('Be nice.')
  })
})
