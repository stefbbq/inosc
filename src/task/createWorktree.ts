import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { Context, RepoMode, Result, TaskRepo, Workspace } from '../types.ts'
import { expandHome } from '../proc/expandHome.ts'
import { runGit } from '../proc/runGit.ts'
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
  const clone = expandHome(repo.clone, ws.root, ctx.home)
  if (!runGit(clone, ['rev-parse', '--git-dir']).ok) return err(`${name}: ${clone} is not a git repository`)
  const dest = join(dir, name)
  if (existsSync(dest)) return err(`${name}: ${dest} already exists`)

  const base = repo.base ?? ws.config.base
  const remote = base.includes('/') ? base.split('/')[0] : null
  if (remote && runGit(clone, ['remote', 'get-url', remote]).ok) {
    const fetched = runGit(clone, ['fetch', '--quiet', remote])
    if (!fetched.ok) ctx.log.warn(`${name}: fetch ${remote} failed, using local refs (${fetched.error})`)
  }
  if (!runGit(clone, ['rev-parse', '--verify', '--quiet', `${base}^{commit}`]).ok) {
    return err(`${name}: base ref "${base}" not found in ${clone}`)
  }

  if (mode === 'read') {
    const added = runGit(clone, ['worktree', 'add', '--quiet', '--detach', dest, base])
    return added.ok ? ok({ name, mode, branch: null, base }) : err(`${name}: ${added.error}`)
  }

  const branch = renderBranch(repo.branch ?? ws.config.branch, id, slug)
  const args = refExists(clone, `refs/heads/${branch}`)
    ? ['worktree', 'add', '--quiet', dest, branch]
    : remote && refExists(clone, `refs/remotes/${remote}/${branch}`)
      ? ['worktree', 'add', '--quiet', '--track', '-b', branch, dest, `${remote}/${branch}`]
      : ['worktree', 'add', '--quiet', '--no-track', '-b', branch, dest, base]
  const added = runGit(clone, args)
  return added.ok ? ok({ name, mode, branch, base }) : err(`${name}: ${added.error}`)
}
