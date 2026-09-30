import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { Context, Result, Workspace } from '../types.ts'
import { placeFiles } from '../files/placeFiles.ts'
import { ok } from '../result/ok.ts'
import { listTaskIds } from '../task/listTaskIds.ts'
import { readManifest } from '../task/readManifest.ts'
import { taskDir } from '../task/taskDir.ts'

/** `inosc sync`: places workspace files missing from one task (or every task); returns `<ID> <repo>: <path>` per file placed. */
export const syncFiles = (ctx: Context, ws: Workspace, id?: string): Result<string[]> => {
  const placed: string[] = []
  for (const taskId of id ? [id] : listTaskIds(ws)) {
    const dir = taskDir(ws, taskId)
    const manifest = readManifest(dir)
    if (!manifest.ok) return manifest
    for (const repo of manifest.value.repos) {
      if (!existsSync(join(dir, repo.name))) continue
      placed.push(...placeFiles(ctx, ws, dir, repo.name).map((rel) => `${taskId} ${repo.name}: ${rel}`))
    }
  }
  return ok(placed)
}
