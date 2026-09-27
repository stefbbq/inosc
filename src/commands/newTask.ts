import { existsSync, mkdirSync } from 'node:fs'
import type { Context, Result, TaskManifest, Workspace } from '../types.ts'
import { err } from '../result/err.ts'
import { ok } from '../result/ok.ts'
import { addToTask } from '../task/addToTask.ts'
import { planRepos } from '../task/planRepos.ts'
import { runHooks } from '../task/runHooks.ts'
import { taskDir } from '../task/taskDir.ts'
import { taskEnv } from '../task/taskEnv.ts'
import { validateTaskId } from '../task/validateTaskId.ts'

/** Options for `inosc new`. */
export type NewTaskOptions = { id: string; edit: string[]; read: string[]; slug: string | null }

/** `inosc new`: creates a task folder with a worktree per requested repo. */
export const newTask = (ctx: Context, ws: Workspace, opts: NewTaskOptions): Result<{ dir: string; manifest: TaskManifest }> => {
  const id = validateTaskId(opts.id)
  if (!id.ok) return id
  if (opts.slug !== null && !/^[A-Za-z0-9._-]+$/.test(opts.slug)) return err(`Invalid slug "${opts.slug}"`)
  const dir = taskDir(ws, opts.id)
  if (existsSync(dir)) return err(`Task ${opts.id} already exists at ${dir}. Use \`inosc add\` to add repos.`)
  const requests = planRepos(ws, opts.edit, opts.read, null)
  if (!requests.ok) return requests

  mkdirSync(dir, { recursive: true })
  const manifest: TaskManifest = { id: opts.id, slug: opts.slug, createdAt: new Date().toISOString(), repos: [] }
  const added = addToTask(ctx, ws, dir, manifest, requests.value)
  if (!added.ok) return added
  const hooks = runHooks(ctx, dir, ws.config.hooks.onNew, taskEnv(ws, added.value, dir))
  return hooks.ok ? ok({ dir, manifest: added.value }) : hooks
}
