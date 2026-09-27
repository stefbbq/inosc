import type { TaskStatus } from '../types.ts'

/** Human-readable `inosc ls` output. */
export const formatTasks = (tasks: TaskStatus[]): string => {
  if (tasks.length === 0) return 'No tasks.'
  return tasks
    .map((t) => {
      const rows = t.repos.map((r) => {
        const where = !r.exists ? 'missing' : r.head ?? 'detached'
        const flags = [
          r.mode === 'read' ? 'read-only' : '',
          r.dirty.length > 0 ? `${r.dirty.length} uncommitted` : '',
          r.unpushed > 0 ? `${r.unpushed} unpushed` : '',
        ].filter(Boolean)
        return `  ${r.name.padEnd(20)} ${where}${flags.length > 0 ? `  (${flags.join(', ')})` : ''}`
      })
      return [`${t.id}  ${t.path}`, ...rows].join('\n')
    })
    .join('\n\n')
}
