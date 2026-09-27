import { runGit } from '../proc/runGit.ts'

/** True when `ref` (e.g. `refs/heads/foo`) exists in the repo at `cwd`. */
export const refExists = (cwd: string, ref: string): boolean =>
  runGit(cwd, ['show-ref', '--verify', '--quiet', ref]).ok
