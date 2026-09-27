import { join } from 'node:path'
import type { Workspace } from '../types.ts'

/** Absolute path of a task folder. */
export const taskDir = (ws: Workspace, id: string): string => join(ws.root, ws.config.tasksDir, id)
