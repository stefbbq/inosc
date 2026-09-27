import { join } from 'node:path'
import type { Context, LinkConfig, Result } from '../types.ts'
import { runShell } from '../proc/runShell.ts'
import { ok } from '../result/ok.ts'

/** Runs link commands in their `from` worktree with `{to}` set to the sibling path. */
export const runLinks = (
  ctx: Context,
  dir: string,
  links: LinkConfig[],
  env: Record<string, string>,
): Result<void> => {
  for (const link of links) {
    const command = link.run.replaceAll('{to}', `../${link.to}`)
    ctx.log.info(`link ${link.from} → ${link.to}: ${command}`)
    const res = runShell(command, join(dir, link.from), env, ctx.stdio)
    if (!res.ok) return res
  }
  return ok(undefined)
}
