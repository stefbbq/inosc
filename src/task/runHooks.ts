import type { Context, Result } from '../types.ts'
import { runShell } from '../proc/runShell.ts'
import { ok } from '../result/ok.ts'

/** Runs hook commands in the task folder. */
export const runHooks = (
  ctx: Context,
  dir: string,
  commands: string[] | undefined,
  env: Record<string, string>,
): Result<void> => {
  for (const command of commands ?? []) {
    ctx.log.info(`hook: ${command}`)
    const res = runShell(command, dir, env, ctx.stdio)
    if (!res.ok) return res
  }
  return ok(undefined)
}
