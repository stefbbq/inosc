import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { TaskManifest, Workspace } from '../types.ts'
import { renderAgentsMd } from './renderAgentsMd.ts'
import { renderVscodeSettings } from './renderVscodeSettings.ts'

/** Writes AGENTS.md, CLAUDE.md and `.vscode/settings.json` at the task root. */
export const writeAgentFiles = (ws: Workspace, dir: string, manifest: TaskManifest): void => {
  writeFileSync(join(dir, 'AGENTS.md'), renderAgentsMd(ws.config, manifest))
  writeFileSync(join(dir, 'CLAUDE.md'), '@AGENTS.md\n')
  mkdirSync(join(dir, '.vscode'), { recursive: true })
  writeFileSync(join(dir, '.vscode', 'settings.json'), renderVscodeSettings(ws.config.settings))
}
