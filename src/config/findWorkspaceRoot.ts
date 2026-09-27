import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import type { Result } from '../types.ts'
import { err } from '../result/err.ts'
import { ok } from '../result/ok.ts'
import { configFileName } from './configFileName.ts'

/** Walks up from `start` to the nearest directory containing `inosc.json`. */
export const findWorkspaceRoot = (start: string): Result<string> => {
  let dir = resolve(start)
  for (;;) {
    if (existsSync(join(dir, configFileName))) return ok(dir)
    const parent = dirname(dir)
    if (parent === dir) return err(`No ${configFileName} found in ${start} or any parent directory`)
    dir = parent
  }
}
