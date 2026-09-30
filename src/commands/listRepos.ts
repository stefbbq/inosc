import { existsSync } from 'node:fs'
import type { Context, Workspace } from '../types.ts'
import { repoGitDir } from '../repo/repoGitDir.ts'

/** `inosc repos`: one line per configured repo with its source and, for `url` repos, whether the mirror exists yet. */
export const listRepos = (ctx: Context, ws: Workspace): string =>
  Object.entries(ws.config.repos)
    .map(([name, r]) => {
      const source = r.url !== undefined ? `${r.url}${existsSync(repoGitDir(ctx, ws, name, r)) ? '' : ' (not mirrored yet)'}` : r.clone
      return `${name.padEnd(20)} ${source}${r.description ? `  ${r.description}` : ''}`
    })
    .join('\n')
