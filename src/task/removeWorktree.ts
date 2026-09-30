import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { Context, Result, TaskRepo, Workspace } from '../types.ts'
import { runGit } from '../proc/runGit.ts'
import { repoGitDir } from '../repo/repoGitDir.ts'
import { ok } from '../result/ok.ts'

/**
 * Removes a task worktree and deletes its task branch from the repo (clone or mirror). Callers check
 * for unsaved work first, so git's own dirty check is bypassed (it would also block on
 * `ignoreDirty` paths); `force` additionally removes locked worktrees.
 */
export const removeWorktree = (
  ctx: Context,
  ws: Workspace,
  dir: string,
  repo: TaskRepo,
  force: boolean,
): Result<void> => {
  const path = join(dir, repo.name)
  const config = ws.config.repos[repo.name]
  const clone = config ? repoGitDir(ctx, ws, repo.name, config) : null
  // Resolve the owning repo from the worktree itself so a changed inosc.json can't strand it.
  const common = existsSync(path) ? runGit(path, ['rev-parse', '--path-format=absolute', '--git-common-dir']) : null
  const gitDir = common?.ok ? ['--git-dir', common.value.trim()] : clone ? ['-C', clone] : null
  if (!gitDir) return ok(undefined)

  if (existsSync(path)) {
    const removed = runGit(ws.root, [...gitDir, 'worktree', 'remove', '--force', ...(force ? ['--force'] : []), path])
    if (!removed.ok) return { ok: false, error: `${repo.name}: ${removed.error}` }
  }
  runGit(ws.root, [...gitDir, 'worktree', 'prune'])
  const hasBranch = repo.branch && runGit(ws.root, [...gitDir, 'show-ref', '--verify', '--quiet', `refs/heads/${repo.branch}`]).ok
  if (repo.branch && hasBranch) {
    const deleted = runGit(ws.root, [...gitDir, 'branch', '-D', repo.branch])
    if (!deleted.ok) ctx.log.warn(`${repo.name}: kept branch ${repo.branch} (${deleted.error.trim()})`)
  }
  return ok(undefined)
}
