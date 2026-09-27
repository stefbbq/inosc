import type { RepoMode, Result, TaskManifest, Workspace } from '../types.ts'
import { err } from '../result/err.ts'
import { ok } from '../result/ok.ts'

/** A repo to add and its mode. */
export type RepoRequest = { name: string; mode: RepoMode }

/** Validates requested repos against the config and an existing manifest. */
export const planRepos = (
  ws: Workspace,
  edit: string[],
  read: string[],
  existing: TaskManifest | null,
): Result<RepoRequest[]> => {
  const requests: RepoRequest[] = [
    ...edit.map((name) => ({ name, mode: 'edit' as const })),
    ...read.map((name) => ({ name, mode: 'read' as const })),
  ]
  if (requests.length === 0) return err('Name at least one repo')
  const known = Object.keys(ws.config.repos)
  const seen = new Set<string>()
  for (const { name } of requests) {
    if (!known.includes(name)) return err(`Unknown repo "${name}". Configured repos: ${known.join(', ')}`)
    if (seen.has(name)) return err(`Repo "${name}" listed twice`)
    if (existing?.repos.some((r) => r.name === name)) return err(`Repo "${name}" is already in task ${existing.id}`)
    seen.add(name)
  }
  return ok(requests)
}
