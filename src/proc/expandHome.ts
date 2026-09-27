import { isAbsolute, join, resolve } from 'node:path'

/** Resolves `~/…`, absolute and relative paths against `base`. */
export const expandHome = (path: string, base: string, home: string): string => {
  if (path === '~') return home
  if (path.startsWith('~/')) return join(home, path.slice(2))
  return isAbsolute(path) ? path : resolve(base, path)
}
