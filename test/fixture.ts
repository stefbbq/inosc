import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Context, Logger, Workspace } from '../src/types.ts'
import { loadWorkspace } from '../src/config/loadWorkspace.ts'

/** Runs git and returns trimmed stdout. */
export const git = (cwd: string, ...args: string[]): string =>
  execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()

/** Creates a bare remote with one commit on main, pushed from a clone at `clone`; returns the remote path. */
export const makeRepo = (root: string, name: string, clone: string, files: Record<string, string> = {}): string => {
  const remote = join(root, 'remotes', `${name}.git`)
  mkdirSync(remote, { recursive: true })
  git(remote, 'init', '--quiet', '--bare', '-b', 'main')
  git(root, 'clone', '--quiet', remote, clone)
  git(clone, 'switch', '--quiet', '-C', 'main')
  const all = { 'README.md': `# ${name}\n`, '.gitignore': '*.local\nnode_modules/\n', ...files }
  for (const [path, content] of Object.entries(all)) writeFileSync(join(clone, path), content)
  git(clone, 'add', '-A')
  git(clone, 'commit', '--quiet', '-m', 'init')
  git(clone, 'push', '--quiet', '-u', 'origin', 'main')
  return remote
}

/** Messages captured from a test Context. */
export type Captured = { info: string[]; warn: string[] }

/** Remote URLs of the fixture repos. */
export type Remotes = Record<'app' | 'lib' | 'db', string>

/**
 * A workspace with `url` repos `app` and `lib` (mirrored by inosc; their seed clones live in
 * `<root>/seed`), a `clone` repo `db` at `ws/db`, workspace files for `app`, and a Context
 * that captures output. `config` overrides top-level keys of inosc.json.
 */
export const makeWorkspace = (config: (remotes: Remotes) => Record<string, unknown> = () => ({})) => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'inosc-')))
  const wsRoot = join(root, 'ws')
  const remotes: Remotes = {
    app: makeRepo(root, 'app', join(root, 'seed', 'app')),
    lib: makeRepo(root, 'lib', join(root, 'seed', 'lib')),
    db: makeRepo(root, 'db', join(wsRoot, 'db')),
  }
  const files = join(wsRoot, '.inosc', 'files', 'app')
  mkdirSync(join(files, 'sub'), { recursive: true })
  writeFileSync(join(files, 'secret.local'), 'token=abc\n')
  writeFileSync(join(files, 'sub', '.env.local'), 'A=1\n')
  writeFileSync(
    join(wsRoot, 'inosc.json'),
    JSON.stringify({
      repos: {
        app: { url: remotes.app, setup: ['echo setup > setup.local'], commands: { test: 'npm test' } },
        lib: { url: remotes.lib, description: 'shared library' },
        db: { clone: 'db' },
      },
      links: [{ from: 'app', to: 'lib', run: 'echo {to} > link.local' }],
      ...config(remotes),
    }),
  )
  const loaded = loadWorkspace(wsRoot)
  if (!loaded.ok) throw new Error(loaded.error)
  const captured: Captured = { info: [], warn: [] }
  const log: Logger = { info: (m) => captured.info.push(m), warn: (m) => captured.warn.push(m) }
  const ctx: Context = { cwd: wsRoot, log, stdio: 'pipe', skipSetup: false, home: join(root, 'home') }
  const ws: Workspace = loaded.value
  /** Git dir worktrees of `name` hang off. */
  const gitDirOf = (name: keyof Remotes): string =>
    name === 'db' ? join(wsRoot, 'db') : join(wsRoot, '.inosc', 'repos', `${name}.git`)
  return { root, wsRoot, ws, ctx, captured, remotes, gitDirOf }
}
