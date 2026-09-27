import type { Result } from '../types.ts'

/** Wraps an error as a failed Result. */
export const err = <E = string>(error: E): Result<never, E> => ({ ok: false, error })
