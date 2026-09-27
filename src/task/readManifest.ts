import { existsSync, readFileSync } from 'node:fs'
import type { Result, TaskManifest } from '../types.ts'
import { err } from '../result/err.ts'
import { ok } from '../result/ok.ts'
import { manifestPath } from './manifestPath.ts'

/** Reads a task manifest. */
export const readManifest = (dir: string): Result<TaskManifest> => {
  const path = manifestPath(dir)
  if (!existsSync(path)) return err(`Not an inosc task: ${dir} (missing .inosc/task.json)`)
  try {
    return ok(JSON.parse(readFileSync(path, 'utf8')) as TaskManifest)
  } catch (e) {
    return err(`Could not read ${path}: ${(e as Error).message}`)
  }
}
