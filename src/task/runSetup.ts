import { join } from 'node:path'
import type { Context, Result, Workspace } from '../types.ts'
import { runShell } from '../proc/runShell.ts'
import { ok } from '../result/ok.ts'

/** Runs a repo's setup commands inside its worktree. */
export const runSetup = (
  ctx: Context,
  ws: Workspace,
  dir: string,
  name: string,
  env: Record<string, string>,
): Result<void> => {
  const commands = ws.config.repos[name]?.setup ?? []
  for (const command of commands) {
    ctx.log.info(`${name}: ${command}`)
    const res = runShell(command, join(dir, name), env, ctx.stdio)
    if (!res.ok) return res
  }
  return ok(undefined)
}
