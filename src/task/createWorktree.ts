import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { Context, RepoMode, Result, TaskRepo, Workspace } from '../types.ts'
import { runGit } from '../proc/runGit.ts'
import { baseRemote } from '../repo/baseRemote.ts'
import { ensureMirror } from '../repo/ensureMirror.ts'
import { err } from '../result/err.ts'
import { ok } from '../result/ok.ts'
import { refExists } from './refExists.ts'
import { renderBranch } from './renderBranch.ts'

/**
 * Adds a worktree for `name` at `<dir>/<name>`. Edit repos reuse an existing local or
 * remote task branch, else branch from base; read repos are detached at base.
 */
export const createWorktree = (
  ctx: Context,
  ws: Workspace,
  dir: string,
  id: string,
  slug: string | null,
  name: string,
  mode: RepoMode,
): Result<TaskRepo> => {
  const repo = ws.config.repos[name]
  if (!repo) return err(`Unknown repo "${name}"`)
  const mirror = ensureMirror(ctx, ws, name)
  if (!mirror.ok) return mirror
  const gitDir = mirror.value
  const dest = join(dir, name)
  if (existsSync(dest)) return err(`${name}: ${dest} already exists`)

  const base = repo.base ?? ws.config.base
  const remote = baseRemote(base)
  if (remote && runGit(gitDir, ['remote', 'get-url', remote]).ok) {
    const fetched = runGit(gitDir, ['fetch', '--quiet', remote])
    if (!fetched.ok) ctx.log.warn(`${name}: fetch ${remote} failed, using local refs (${fetched.error})`)
  }
  if (!runGit(gitDir, ['rev-parse', '--verify', '--quiet', `${base}^{commit}`]).ok) {
    return err(`${name}: base ref "${base}" not found in ${gitDir}`)
  }

  if (mode === 'read') {
    const added = runGit(gitDir, ['worktree', 'add', '--quiet', '--detach', dest, base])
    return added.ok ? ok({ name, mode, branch: null, base }) : err(`${name}: ${added.error}`)
  }

  const branch = renderBranch(repo.branch ?? ws.config.branch, id, slug)
  const args = refExists(gitDir, `refs/heads/${branch}`)
    ? ['worktree', 'add', '--quiet', dest, branch]
    : remote && refExists(gitDir, `refs/remotes/${remote}/${branch}`)
      ? ['worktree', 'add', '--quiet', '--track', '-b', branch, dest, `${remote}/${branch}`]
      : ['worktree', 'add', '--quiet', '--no-track', '-b', branch, dest, base]
  const added = runGit(gitDir, args)
  return added.ok ? ok({ name, mode, branch, base }) : err(`${name}: ${added.error}`)
}
