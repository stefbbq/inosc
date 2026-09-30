import { join } from 'node:path'

/** `<root>/.inosc`: inosc-owned workspace state (mirrors, files). */
export const stateDir = (root: string): string => join(root, '.inosc')
