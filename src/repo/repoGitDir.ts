import { join } from 'node:path'
import type { Context, RepoConfig, Workspace } from '../types.ts'
import { expandHome } from '../proc/expandHome.ts'
import { stateDir } from './stateDir.ts'

/** Git directory worktrees of `name` hang off: the user's clone, or inosc's bare mirror for `url` repos. */
export const repoGitDir = (ctx: Context, ws: Workspace, name: string, repo: RepoConfig): string =>
  repo.clone !== undefined ? expandHome(repo.clone, ws.root, ctx.home) : join(stateDir(ws.root), 'repos', `${name}.git`)
