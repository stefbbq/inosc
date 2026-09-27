import type { HooksConfig, InoscConfig, LinkConfig, RepoConfig, Result } from '../types.ts'
import { err } from '../result/err.ts'
import { ok } from '../result/ok.ts'

type Obj = Record<string, unknown>

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const isStrArr = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string')
const isStrRecord = (v: unknown): v is Record<string, string> =>
  isObj(v) && Object.values(v).every((x) => typeof x === 'string')

const optStr = (o: Obj, key: string, where: string, errors: string[]): string | undefined => {
  const v = o[key]
  if (v === undefined) return undefined
  if (typeof v !== 'string' || v === '') errors.push(`${where}.${key} must be a non-empty string`)
  return typeof v === 'string' ? v : undefined
}

const optStrArr = (o: Obj, key: string, where: string, errors: string[]): string[] | undefined => {
  const v = o[key]
  if (v === undefined) return undefined
  if (!isStrArr(v)) errors.push(`${where}.${key} must be an array of strings`)
  return isStrArr(v) ? v : undefined
}

const parseRepo = (name: string, raw: unknown, errors: string[]): RepoConfig | null => {
  const where = `repos.${name}`
  if (!/^[A-Za-z0-9._-]+$/.test(name)) errors.push(`${where}: repo names may only use letters, digits, . _ -`)
  if (!isObj(raw)) {
    errors.push(`${where} must be an object`)
    return null
  }
  const clone = optStr(raw, 'clone', where, errors)
  if (clone === undefined) errors.push(`${where}.clone is required`)
  if (raw.commands !== undefined && !isStrRecord(raw.commands)) errors.push(`${where}.commands must map names to strings`)
  return {
    clone: clone ?? '',
    base: optStr(raw, 'base', where, errors),
    branch: optStr(raw, 'branch', where, errors),
    description: optStr(raw, 'description', where, errors),
    include: optStrArr(raw, 'include', where, errors),
    setup: optStrArr(raw, 'setup', where, errors),
    commands: isStrRecord(raw.commands) ? raw.commands : undefined,
    ignoreDirty: optStrArr(raw, 'ignoreDirty', where, errors),
  }
}

const parseLink = (raw: unknown, i: number, repos: string[], errors: string[]): LinkConfig | null => {
  const where = `links[${i}]`
  if (!isObj(raw)) {
    errors.push(`${where} must be an object`)
    return null
  }
  const from = optStr(raw, 'from', where, errors)
  const to = optStr(raw, 'to', where, errors)
  const run = optStr(raw, 'run', where, errors)
  if (!from || !to || !run) {
    errors.push(`${where} needs from, to and run`)
    return null
  }
  if (!repos.includes(from)) errors.push(`${where}.from: unknown repo "${from}"`)
  if (!repos.includes(to)) errors.push(`${where}.to: unknown repo "${to}"`)
  return { from, to, run, description: optStr(raw, 'description', where, errors) }
}

const parseHooks = (raw: unknown, errors: string[]): HooksConfig => {
  if (raw === undefined) return {}
  if (!isObj(raw)) {
    errors.push('hooks must be an object')
    return {}
  }
  return { onNew: optStrArr(raw, 'onNew', 'hooks', errors), onDone: optStrArr(raw, 'onDone', 'hooks', errors) }
}

/** Validates raw `inosc.json` content and applies defaults. */
export const parseConfig = (raw: unknown): Result<InoscConfig> => {
  if (!isObj(raw)) return err('inosc.json must contain a JSON object')
  const errors: string[] = []
  if (!isObj(raw.repos) || Object.keys(raw.repos).length === 0) errors.push('repos must be an object with at least one repo')
  const repoEntries = isObj(raw.repos) ? Object.entries(raw.repos) : []
  const repos: Record<string, RepoConfig> = {}
  for (const [name, value] of repoEntries) {
    const repo = parseRepo(name, value, errors)
    if (repo) repos[name] = repo
  }
  const names = Object.keys(repos)
  if (raw.links !== undefined && !Array.isArray(raw.links)) errors.push('links must be an array')
  const links = (Array.isArray(raw.links) ? raw.links : [])
    .map((l, i) => parseLink(l, i, names, errors))
    .filter((l): l is LinkConfig => l !== null)
  if (raw.settings !== undefined && !isObj(raw.settings)) errors.push('settings must be an object')
  const config: InoscConfig = {
    tasksDir: optStr(raw, 'tasksDir', 'config', errors) ?? 'tasks',
    base: optStr(raw, 'base', 'config', errors) ?? 'origin/main',
    branch: optStr(raw, 'branch', 'config', errors) ?? '{id}',
    repos,
    links,
    hooks: parseHooks(raw.hooks, errors),
    instructions: optStrArr(raw, 'instructions', 'config', errors) ?? [],
    settings: isObj(raw.settings) ? raw.settings : {},
  }
  return errors.length > 0 ? err(`Invalid inosc.json:\n  - ${errors.join('\n  - ')}`) : ok(config)
}
