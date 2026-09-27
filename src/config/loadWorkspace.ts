import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Result, Workspace } from '../types.ts'
import { err } from '../result/err.ts'
import { ok } from '../result/ok.ts'
import { configFileName } from './configFileName.ts'
import { findWorkspaceRoot } from './findWorkspaceRoot.ts'
import { parseConfig } from './parseConfig.ts'

/** Finds and parses the workspace enclosing `cwd`. */
export const loadWorkspace = (cwd: string): Result<Workspace> => {
  const root = findWorkspaceRoot(cwd)
  if (!root.ok) return root
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(join(root.value, configFileName), 'utf8'))
  } catch (e) {
    return err(`Could not read ${join(root.value, configFileName)}: ${(e as Error).message}`)
  }
  const config = parseConfig(raw)
  return config.ok ? ok({ root: root.value, config: config.value }) : config
}
