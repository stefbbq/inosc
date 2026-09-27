import { spawnSync } from 'node:child_process'
import type { Result } from '../types.ts'
import { err } from '../result/err.ts'
import { ok } from '../result/ok.ts'

/** Runs a shell command in `cwd` with extra env vars. */
export const runShell = (
  command: string,
  cwd: string,
  env: Record<string, string>,
  stdio: 'inherit' | 'pipe',
): Result<void> => {
  const res = spawnSync(command, {
    cwd,
    shell: true,
    stdio: stdio === 'inherit' ? 'inherit' : 'pipe',
    encoding: 'utf8',
    env: { ...process.env, ...env },
  })
  if (res.error) return err(`${command}: ${res.error.message}`)
  if (res.status !== 0) {
    const detail = stdio === 'pipe' ? `\n${(res.stderr || res.stdout || '').trim()}` : ''
    return err(`\`${command}\` exited with ${res.status} in ${cwd}${detail}`)
  }
  return ok(undefined)
}
