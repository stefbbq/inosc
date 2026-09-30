import { cpSync, lstatSync, mkdirSync, readFileSync, readlinkSync, symlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { Context, Workspace } from '../types.ts'
import { runGit } from '../proc/runGit.ts'
import { repoGitDir } from '../repo/repoGitDir.ts'
import { excludePath } from './excludePath.ts'
import { filesRoot } from './filesRoot.ts'
import { listFiles } from './listFiles.ts'

const sameContent = (a: string, b: string): boolean => readFileSync(a).equals(readFileSync(b))

/**
 * Places every file under `<filesDir>/<name>/` at the same path in the `<dir>/<name>`
 * worktree, as a symlink or a copy (`filesMode`). Never overwrites: an existing path is
 * left alone, with a warning unless it's already what inosc would have placed. Placed files
 * git doesn't ignore are added to the mirror's `info/exclude` (url repos) or warned about
 * (clone repos, whose git config inosc doesn't touch). Returns the paths newly placed.
 */
export const placeFiles = (ctx: Context, ws: Workspace, dir: string, name: string): string[] => {
  const source = join(filesRoot(ctx, ws), name)
  const worktree = join(dir, name)
  const repo = ws.config.repos[name]
  if (!repo) return []
  const mode = repo.filesMode ?? ws.config.filesMode
  const mirror = repo.url !== undefined ? repoGitDir(ctx, ws, name, repo) : null
  const placed: string[] = []
  for (const rel of listFiles(source)) {
    const from = join(source, rel)
    const to = join(worktree, rel)
    const existing = lstatSync(to, { throwIfNoEntry: false })
    if (existing) {
      const current =
        mode === 'symlink'
          ? existing.isSymbolicLink() && readlinkSync(to) === from
          : existing.isFile() && sameContent(from, to)
      if (!current) {
        ctx.log.warn(`${name}: ${rel} already exists in the worktree and differs from ${from}, left as is`)
        continue
      }
    } else {
      mkdirSync(dirname(to), { recursive: true })
      if (mode === 'symlink') symlinkSync(from, to)
      else cpSync(from, to, { dereference: false })
      placed.push(rel)
    }
    if (runGit(worktree, ['check-ignore', '--quiet', rel]).ok) continue
    if (mirror) excludePath(mirror, rel)
    else if (!existing) ctx.log.warn(`${name}: ${rel} is not gitignored, so it shows as uncommitted and blocks \`inosc done\``)
  }
  return placed
}
