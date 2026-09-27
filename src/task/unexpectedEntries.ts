import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { generatedFiles } from '../agents/generatedFiles.ts'

/** Task-root entries that are neither repo worktrees nor inosc-generated files. */
export const unexpectedEntries = (dir: string, repos: string[]): string[] => {
  if (!existsSync(dir)) return []
  const known = new Set<string>([...repos, ...generatedFiles.filter((f) => !f.includes('/'))])
  const extra = readdirSync(dir).filter((e) => !known.has(e) && e !== '.vscode' && e !== '.DS_Store')
  const vscode = join(dir, '.vscode')
  const vscodeExtra = existsSync(vscode)
    ? readdirSync(vscode)
        .filter((e) => e !== 'settings.json' && e !== '.DS_Store')
        .map((e) => `.vscode/${e}`)
    : []
  return [...extra, ...vscodeExtra]
}
