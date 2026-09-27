import { spawnSync } from 'node:child_process'
import type { Result } from '../types.ts'
import { err } from '../result/err.ts'
import { ok } from '../result/ok.ts'

/** Runs `git <args>` in `cwd` and returns raw stdout, or stderr as the error. */
export const runGit = (cwd: string, args: string[]): Result<string> => {
  const res = spawnSync('git', args, { cwd, encoding: 'utf8' })
  if (res.error) return err(res.error.message)
  if (res.status !== 0) {
    const detail = (res.stderr || res.stdout || '').trim()
    return err(detail || `git ${args.join(' ')} exited with ${res.status}`)
  }
  return ok(res.stdout)
}
