import type { Context, Result, TaskManifest, Workspace } from '../types.ts'
import { addToTask } from '../task/addToTask.ts'
import { planRepos } from '../task/planRepos.ts'
import { readManifest } from '../task/readManifest.ts'
import { taskDir } from '../task/taskDir.ts'

/** Options for `inosc add`. */
export type AddReposOptions = { id: string; edit: string[]; read: string[] }

/** `inosc add`: adds repos to an existing task. */
export const addRepos = (ctx: Context, ws: Workspace, opts: AddReposOptions): Result<{ dir: string; manifest: TaskManifest }> => {
  const dir = taskDir(ws, opts.id)
  const manifest = readManifest(dir)
  if (!manifest.ok) return manifest
  const requests = planRepos(ws, opts.edit, opts.read, manifest.value)
  if (!requests.ok) return requests
  const added = addToTask(ctx, ws, dir, manifest.value, requests.value)
  return added.ok ? { ok: true, value: { dir, manifest: added.value } } : added
}
