import type { TaskManifest, Workspace } from '../types.ts'

/** Env vars passed to setup commands, links and hooks. */
export const taskEnv = (ws: Workspace, manifest: TaskManifest, dir: string): Record<string, string> => ({
  INOSC_TASK_ID: manifest.id,
  INOSC_TASK_DIR: dir,
  INOSC_WORKSPACE: ws.root,
  INOSC_REPOS: manifest.repos.map((r) => r.name).join(' '),
})
