import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { RepoMode, RepoStatus } from '../types.ts'
import { runGit } from '../proc/runGit.ts'

/** Reads branch, uncommitted paths and unpushed commit count of a task worktree. */
export const inspectRepo = (dir: string, name: string, mode: RepoMode, ignoreDirty: string[] = []): RepoStatus => {
  const path = join(dir, name)
  const missing: RepoStatus = { name, mode, path, exists: false, head: null, dirty: [], ignored: [], unpushed: 0 }
  if (!existsSync(path)) return missing
  const head = runGit(path, ['symbolic-ref', '--quiet', '--short', 'HEAD'])
  const status = runGit(path, ['status', '--porcelain', '--untracked-files=all'])
  const unpushed = runGit(path, ['rev-list', '--count', 'HEAD', '--not', '--remotes'])
  if (!status.ok) return missing
  const changed = status.value
    .split('\n')
    .filter((l) => l.length > 3)
    .map((l) => l.slice(3))
  return {
    name,
    mode,
    path,
    exists: true,
    head: head.ok ? head.value.trim() : null,
    dirty: changed.filter((p) => !ignoreDirty.includes(p)),
    ignored: changed.filter((p) => ignoreDirty.includes(p)),
    unpushed: unpushed.ok ? Number(unpushed.value.trim()) : 0,
  }
}
