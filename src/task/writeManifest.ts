import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { TaskManifest } from '../types.ts'
import { manifestPath } from './manifestPath.ts'

/** Writes a task manifest. */
export const writeManifest = (dir: string, manifest: TaskManifest): void => {
  const path = manifestPath(dir)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`)
}
