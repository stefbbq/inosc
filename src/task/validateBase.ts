import type { Result } from '../types.ts'
import { err } from '../result/err.ts'
import { ok } from '../result/ok.ts'

/** A `--base` ref: plain ref characters, no leading dash (never an option to git), no `..`. */
export const validateBase = (base: string | null | undefined): Result<string | null> =>
  base === null || base === undefined
    ? ok(null)
    : /^[A-Za-z0-9._/-]+$/.test(base) && !base.startsWith('-') && !base.includes('..')
      ? ok(base)
      : err(`Invalid base "${base}": use a ref like origin/main`)
