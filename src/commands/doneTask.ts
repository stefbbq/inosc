import { rmSync } from 'node:fs'
import type { Context, Result, Workspace } from '../types.ts'
import { err } from '../result/err.ts'
import { ok } from '../result/ok.ts'
import { inspectRepo } from '../task/inspectRepo.ts'
import { readManifest } from '../task/readManifest.ts'
import { removalProblems } from '../task/removalProblems.ts'
import { removeWorktree } from '../task/removeWorktree.ts'
import { runHooks } from '../task/runHooks.ts'
import { taskDir } from '../task/taskDir.ts'
import { taskEnv } from '../task/taskEnv.ts'
import { unexpectedEntries } from '../task/unexpectedEntries.ts'

/** Options for `inosc done`. */
export type DoneTaskOptions = { id: string; force: boolean }

/**
 * `inosc done`: removes every worktree, task branch and the folder. Refuses while any
 * worktree has uncommitted or unpushed work, or the folder holds files inosc didn't write.
 */
export const doneTask = (ctx: Context, ws: Workspace, opts: DoneTaskOptions): Result<string> => {
  const dir = taskDir(ws, opts.id)
  const manifest = readManifest(dir)
  if (!manifest.ok) return manifest
  const repos = manifest.value.repos

  if (!opts.force) {
    const problems = repos.flatMap((r) =>
      removalProblems(inspectRepo(dir, r.name, r.mode), ws.config.repos[r.name]?.ignoreDirty ?? []),
    )
    const extra = unexpectedEntries(dir, repos.map((r) => r.name))
    if (extra.length > 0) problems.push(`task folder has files inosc didn't create: ${extra.join(', ')}`)
    if (problems.length > 0) {
      return err(`Refusing to remove task ${opts.id}:\n  - ${problems.join('\n  - ')}\nCommit and push, or rerun with --force to discard.`)
    }
  }

  const hooks = runHooks(ctx, dir, ws.config.hooks.onDone, taskEnv(ws, manifest.value, dir))
  if (!hooks.ok) return hooks
  for (const repo of repos) {
    const removed = removeWorktree(ctx, ws, dir, repo, opts.force)
    if (!removed.ok) return err(`${removed.error}\nTask ${opts.id} is partly removed; rerun \`inosc done\` after fixing.`)
    ctx.log.info(`${repo.name}: removed${repo.branch ? ` (branch ${repo.branch} deleted)` : ''}`)
  }
  rmSync(dir, { recursive: true, force: true })
  return ok(dir)
}
