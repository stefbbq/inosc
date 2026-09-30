import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Context, Result } from '../types.ts'
import { configFileName } from '../config/configFileName.ts'
import { runGit } from '../proc/runGit.ts'
import { ensureStateDir } from '../repo/ensureStateDir.ts'
import { err } from '../result/err.ts'
import { ok } from '../result/ok.ts'

const repoEntry = (dir: string, name: string): Record<string, unknown> => {
  const url = runGit(join(dir, name), ['remote', 'get-url', 'origin'])
  return { ...(url.ok ? { url: url.value.trim() } : { clone: name }), setup: [], commands: {} }
}

/**
 * `inosc init`: writes a starter inosc.json and `.inosc/files/<repo>/`. Git clones directly
 * under `cwd` are listed by their `origin` URL (inosc mirrors them, so the clones can go),
 * or by path when they have no origin; an empty folder gets an example repo.
 */
export const initWorkspace = (ctx: Context): Result<string> => {
  const path = join(ctx.cwd, configFileName)
  if (existsSync(path)) return err(`${path} already exists`)
  const clones = readdirSync(ctx.cwd, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(ctx.cwd, d.name, '.git')))
    .map((d) => d.name)
  const repos =
    clones.length > 0
      ? Object.fromEntries(clones.map((name) => [name, repoEntry(ctx.cwd, name)]))
      : { example: { url: 'https://github.com/you/example.git' } }
  const config = {
    $schema: 'https://raw.githubusercontent.com/stefbbq/inosc/main/schema/inosc.schema.json',
    tasksDir: 'tasks',
    base: 'origin/main',
    branch: '{id}',
    repos,
    links: [],
  }
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`)
  const state = ensureStateDir(ctx.cwd)
  for (const name of Object.keys(repos)) mkdirSync(join(state, 'files', name), { recursive: true })
  return ok(path)
}
