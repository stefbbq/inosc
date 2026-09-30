import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { stateDir } from './stateDir.ts'

/** Creates `<root>/.inosc` with a `.gitignore` of `*`, so mirrors and secrets never reach the workspace's own repo. */
export const ensureStateDir = (root: string): string => {
  const dir = stateDir(root)
  mkdirSync(dir, { recursive: true })
  const ignore = join(dir, '.gitignore')
  if (!existsSync(ignore)) writeFileSync(ignore, '*\n')
  return dir
}
