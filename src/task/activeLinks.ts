import type { LinkConfig } from '../types.ts'

/** Links whose both ends are in the task; with `touching`, only links involving that repo. */
export const activeLinks = (links: LinkConfig[], repos: string[], touching?: string[]): LinkConfig[] =>
  links.filter(
    (l) =>
      repos.includes(l.from) &&
      repos.includes(l.to) &&
      (!touching || touching.includes(l.from) || touching.includes(l.to)),
  )
