import type { Context, Workspace } from '../types.ts'
import { expandHome } from '../proc/expandHome.ts'

/** Absolute path of the workspace files dir (`filesDir`). */
export const filesRoot = (ctx: Context, ws: Workspace): string => expandHome(ws.config.filesDir, ws.root, ctx.home)
