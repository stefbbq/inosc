import type { Result, TaskStatus, Workspace } from '../types.ts'
import { ok } from '../result/ok.ts'
import { inspectRepo } from '../task/inspectRepo.ts'
import { listTaskIds } from '../task/listTaskIds.ts'
import { readManifest } from '../task/readManifest.ts'
import { taskDir } from '../task/taskDir.ts'

/** `inosc ls`: live status of every task, or of one task when `id` is given. */
export const listTasks = (ws: Workspace, id?: string): Result<TaskStatus[]> => {
  const ids = id ? [id] : listTaskIds(ws)
  const tasks: TaskStatus[] = []
  for (const taskId of ids) {
    const dir = taskDir(ws, taskId)
    const manifest = readManifest(dir)
    if (!manifest.ok) return manifest
    tasks.push({ id: taskId, path: dir, repos: manifest.value.repos.map((r) => inspectRepo(dir, r.name, r.mode)) })
  }
  return ok(tasks)
}
