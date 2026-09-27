import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { Workspace } from '../types.ts'
import { manifestPath } from './manifestPath.ts'

/** IDs of every task folder in the workspace, sorted. */
export const listTaskIds = (ws: Workspace): string[] => {
  const dir = join(ws.root, ws.config.tasksDir)
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(manifestPath(join(dir, d.name))))
    .map((d) => d.name)
    .sort()
}
