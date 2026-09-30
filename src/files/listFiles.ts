import { existsSync, lstatSync, readdirSync } from 'node:fs'
import { basename, join } from 'node:path'

/** Relative paths of every file and symlink below `dir` (not directories), sorted; skips `.DS_Store`. */
export const listFiles = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir, { recursive: true, encoding: 'utf8' })
        .filter((rel) => basename(rel) !== '.DS_Store' && !lstatSync(join(dir, rel)).isDirectory())
        .sort()
    : []
