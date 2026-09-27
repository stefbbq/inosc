import { cpSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import type { Context, Workspace } from '../types.ts'
import { expandHome } from '../proc/expandHome.ts'

/** Copies a repo's `include` files from its main clone; never overwrites files already in the worktree. */
export const copyIncludes = (ctx: Context, ws: Workspace, dir: string, name: string): void => {
  const repo = ws.config.repos[name]
  if (!repo?.include) return
  const clone = expandHome(repo.clone, ws.root, ctx.home)
  for (const rel of repo.include) {
    const src = join(clone, rel)
    const dest = join(dir, name, rel)
    if (!existsSync(src)) {
      ctx.log.warn(`${name}: include ${rel} not found in main clone, skipped`)
      continue
    }
    if (existsSync(dest)) {
      ctx.log.warn(`${name}: include ${rel} already exists in the worktree (tracked?), skipped`)
      continue
    }
    cpSync(src, dest, { recursive: true, dereference: false })
  }
}
