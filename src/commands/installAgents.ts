import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Context, Result } from '../types.ts'
import { err } from '../result/err.ts'
import { ok } from '../result/ok.ts'

/** Skill directories read by each agent: Claude Code, and the shared Agent Skills dir used by Codex and Cursor. */
export const skillTargets = (home: string): { agent: string; dir: string }[] => [
  { agent: 'Claude Code', dir: join(home, '.claude', 'skills', 'inosc') },
  { agent: 'Codex, Cursor', dir: join(home, '.agents', 'skills', 'inosc') },
]

const bundledSkill = (): string => resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'skills', 'inosc')

const isOurs = (dir: string): boolean => {
  const file = join(dir, 'SKILL.md')
  return existsSync(file) && /^name: inosc$/m.test(readFileSync(file, 'utf8'))
}

/** `inosc agents install`: copies the bundled inosc skill into each agent's user skill directory. */
export const installAgents = (ctx: Context, force: boolean, source = bundledSkill()): Result<string[]> => {
  if (!existsSync(join(source, 'SKILL.md'))) return err(`Bundled skill not found at ${source}`)
  const installed: string[] = []
  for (const target of skillTargets(ctx.home)) {
    if (existsSync(target.dir) && !isOurs(target.dir) && !force) {
      return err(`${target.dir} exists and isn't the inosc skill; rerun with --force to replace it`)
    }
    rmSync(target.dir, { recursive: true, force: true })
    mkdirSync(dirname(target.dir), { recursive: true })
    cpSync(source, target.dir, { recursive: true })
    ctx.log.info(`${target.agent}: ${target.dir}`)
    installed.push(target.dir)
  }
  return ok(installed)
}
