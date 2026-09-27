import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Context, Logger, Workspace } from '../src/types.ts'
import { loadWorkspace } from '../src/config/loadWorkspace.ts'

/** Runs git and returns trimmed stdout. */
export const git = (cwd: string, ...args: string[]): string =>
  execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()

/** Creates a bare remote plus a main clone with one commit on main. */
export const makeRepo = (root: string, name: string, files: Record<string, string> = {}): string => {
  const remote = join(root, 'remotes', `${name}.git`)
  mkdirSync(remote, { recursive: true })
  git(remote, 'init', '--quiet', '--bare', '-b', 'main')
  const clone = join(root, 'ws', name)
  git(root, 'clone', '--quiet', remote, clone)
  git(clone, 'switch', '--quiet', '-C', 'main')
  const all = { 'README.md': `# ${name}\n`, '.gitignore': '*.local\nnode_modules/\n', ...files }
  for (const [path, content] of Object.entries(all)) writeFileSync(join(clone, path), content)
  git(clone, 'add', '-A')
  git(clone, 'commit', '--quiet', '-m', 'init')
  git(clone, 'push', '--quiet', '-u', 'origin', 'main')
  return clone
}

/** Messages captured from a test Context. */
export type Captured = { info: string[]; warn: string[] }

/** A workspace with repos `app`, `lib` and `db`, and a Context that captures output. */
export const makeWorkspace = (config: Record<string, unknown> = {}) => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'inosc-')))
  for (const name of ['app', 'lib', 'db']) makeRepo(root, name)
  writeFileSync(join(root, 'ws', 'app', 'secret.local'), 'token=abc\n')
  const wsRoot = join(root, 'ws')
  writeFileSync(
    join(wsRoot, 'inosc.json'),
    JSON.stringify({
      repos: {
        app: { clone: 'app', include: ['secret.local'], setup: ['echo setup > setup.local'], commands: { test: 'npm test' } },
        lib: { clone: 'lib', description: 'shared library' },
        db: { clone: 'db' },
      },
      links: [{ from: 'app', to: 'lib', run: 'echo {to} > link.local' }],
      ...config,
    }),
  )
  const loaded = loadWorkspace(wsRoot)
  if (!loaded.ok) throw new Error(loaded.error)
  const captured: Captured = { info: [], warn: [] }
  const log: Logger = { info: (m) => captured.info.push(m), warn: (m) => captured.warn.push(m) }
  const ctx: Context = { cwd: wsRoot, log, stdio: 'pipe', skipSetup: false, home: join(root, 'home') }
  const ws: Workspace = loaded.value
  return { root, wsRoot, ws, ctx, captured }
}
