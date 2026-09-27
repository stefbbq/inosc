import { join } from 'node:path'

/** Path of the task manifest inside a task folder. */
export const manifestPath = (dir: string): string => join(dir, '.inosc', 'task.json')
