import { existsSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Context, Result } from '../types.ts'
import { configFileName } from '../config/configFileName.ts'
import { err } from '../result/err.ts'
import { ok } from '../result/ok.ts'

/** `inosc init`: writes a starter inosc.json listing the git clones directly under `cwd`. */
export const initWorkspace = (ctx: Context): Result<string> => {
  const path = join(ctx.cwd, configFileName)
  if (existsSync(path)) return err(`${path} already exists`)
  const repos = Object.fromEntries(
    readdirSync(ctx.cwd, { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(join(ctx.cwd, d.name, '.git')))
      .map((d) => [d.name, { clone: d.name, include: [], setup: [], commands: {} }]),
  )
  const config = {
    $schema: 'https://raw.githubusercontent.com/stefbbq/inosc/main/schema/inosc.schema.json',
    tasksDir: 'tasks',
    base: 'origin/main',
    branch: '{id}',
    repos: Object.keys(repos).length > 0 ? repos : { example: { clone: 'path/to/clone' } },
    links: [],
  }
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`)
  return ok(path)
}
