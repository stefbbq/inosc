import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/** Adds `/<rel>` to `<gitDir>/info/exclude` unless it's already listed. */
export const excludePath = (gitDir: string, rel: string): void => {
  const info = join(gitDir, 'info')
  const file = join(info, 'exclude')
  const pattern = `/${rel}`
  const current = existsSync(file) ? readFileSync(file, 'utf8') : ''
  if (current.split('\n').includes(pattern)) return
  mkdirSync(info, { recursive: true })
  appendFileSync(file, `${current === '' || current.endsWith('\n') ? '' : '\n'}${pattern}\n`)
}
