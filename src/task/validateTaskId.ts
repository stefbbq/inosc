import type { Result } from '../types.ts'
import { err } from '../result/err.ts'
import { ok } from '../result/ok.ts'

/** Task IDs become folder and branch names, so keep them to safe characters. */
export const validateTaskId = (id: string): Result<string> =>
  /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id) && !id.includes('..')
    ? ok(id)
    : err(`Invalid task ID "${id}": use letters, digits, . _ - (e.g. PROJ-123)`)
