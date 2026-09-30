import { existsSync, mkdirSync, rmSync } from 'node:fs'
import type { Context, Result, Workspace } from '../types.ts'
import { runGit } from '../proc/runGit.ts'
import { err } from '../result/err.ts'
import { ok } from '../result/ok.ts'
import { baseRemote } from './baseRemote.ts'
import { ensureStateDir } from './ensureStateDir.ts'
import { repoGitDir } from './repoGitDir.ts'

/**
 * Returns the git dir for `name`. For `url` repos, creates the bare mirror on first use
 * (remote-tracking refs only, so local heads hold just task branches) and keeps its URL
 * in sync with `inosc.json`; for `clone` repos, checks the clone exists.
 */
export const ensureMirror = (ctx: Context, ws: Workspace, name: string): Result<string> => {
  const repo = ws.config.repos[name]
  if (!repo) return err(`Unknown repo "${name}"`)
  const gitDir = repoGitDir(ctx, ws, name, repo)
  if (repo.url === undefined) {
    return runGit(gitDir, ['rev-parse', '--git-dir']).ok ? ok(gitDir) : err(`${name}: ${gitDir} is not a git repository`)
  }
  const remote = baseRemote(repo.base ?? ws.config.base) ?? 'origin'

  if (existsSync(gitDir)) {
    const current = runGit(gitDir, ['remote', 'get-url', remote])
    if (!current.ok) return err(`${name}: mirror ${gitDir} has no remote "${remote}"`)
    if (current.value.trim() !== repo.url) {
      const set = runGit(gitDir, ['remote', 'set-url', remote, repo.url])
      if (!set.ok) return err(`${name}: ${set.error}`)
      ctx.log.info(`${name}: mirror remote ${remote} now points at ${repo.url}`)
    }
    return ok(gitDir)
  }

  ensureStateDir(ws.root)
  mkdirSync(gitDir, { recursive: true })
  ctx.log.info(`${name}: mirroring ${repo.url} (first use, may take a while)`)
  const steps = [
    ['init', '--quiet', '--bare'],
    ['remote', 'add', remote, repo.url],
    ['fetch', '--quiet', remote],
  ]
  for (const args of steps) {
    const step = runGit(gitDir, args)
    if (!step.ok) {
      rmSync(gitDir, { recursive: true, force: true })
      return err(`${name}: could not mirror ${repo.url}: ${step.error}`)
    }
  }
  return ok(gitDir)
}
