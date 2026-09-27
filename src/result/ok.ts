import type { Result } from '../types.ts'

/** Wraps a value as a successful Result. */
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value })
