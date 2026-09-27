import type { RepoStatus } from '../types.ts'

/** Reasons a worktree can't be removed without losing work; empty when safe. */
export const removalProblems = (status: RepoStatus, ignoreDirty: string[]): string[] => {
  if (!status.exists) return []
  const dirty = status.dirty.filter((p) => !ignoreDirty.includes(p))
  const problems: string[] = []
  if (dirty.length > 0) {
    const shown = dirty.slice(0, 5).join(', ')
    problems.push(`${status.name}: ${dirty.length} uncommitted path(s): ${shown}${dirty.length > 5 ? ', …' : ''}`)
  }
  if (status.unpushed > 0) problems.push(`${status.name}: ${status.unpushed} commit(s) not on any remote`)
  return problems
}
