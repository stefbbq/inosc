import type { Context, Result, TaskManifest, Workspace } from '../types.ts'
import { writeAgentFiles } from '../agents/writeAgentFiles.ts'
import { placeFiles } from '../files/placeFiles.ts'
import { err } from '../result/err.ts'
import { ok } from '../result/ok.ts'
import { activeLinks } from './activeLinks.ts'
import { createWorktree } from './createWorktree.ts'
import type { RepoRequest } from './planRepos.ts'
import { runLinks } from './runLinks.ts'
import { runSetup } from './runSetup.ts'
import { taskEnv } from './taskEnv.ts'
import { writeManifest } from './writeManifest.ts'

/**
 * Creates worktrees for `requests`, places workspace files, runs setup and the links they
 * complete, and rewrites the agent files. The manifest is saved after every worktree
 * so a failure part-way leaves a task `inosc done` can clean up.
 */
export const addToTask = (
  ctx: Context,
  ws: Workspace,
  dir: string,
  manifest: TaskManifest,
  requests: RepoRequest[],
): Result<TaskManifest> => {
  let current = manifest
  const save = (m: TaskManifest) => {
    current = m
    writeManifest(dir, m)
    writeAgentFiles(ws, dir, m)
  }
  for (const req of requests) {
    ctx.log.info(`${req.name}: adding ${req.mode === 'edit' ? 'worktree' : 'read-only worktree'}`)
    const added = createWorktree(ctx, ws, dir, manifest.id, manifest.slug, req.name, req.mode)
    if (!added.ok) {
      save(current)
      return err(added.error)
    }
    save({ ...current, repos: [...current.repos, added.value] })
    placeFiles(ctx, ws, dir, req.name)
  }
  if (ctx.skipSetup) return ok(current)

  const env = taskEnv(ws, current, dir)
  for (const req of requests) {
    const setup = runSetup(ctx, ws, dir, req.name, env)
    if (!setup.ok) return err(`${setup.error}\nWorktrees are in place; fix and rerun the setup by hand.`)
  }
  const names = current.repos.map((r) => r.name)
  const linked = runLinks(ctx, dir, activeLinks(ws.config.links, names, requests.map((r) => r.name)), env)
  return linked.ok ? ok(current) : err(`${linked.error}\nWorktrees are in place; fix and rerun the link by hand.`)
}
