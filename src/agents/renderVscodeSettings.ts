/** Renders `.vscode/settings.json` so VS Code / Cursor source control finds every worktree. */
export const renderVscodeSettings = (extra: Record<string, unknown>): string =>
  `${JSON.stringify({ 'git.repositoryScanMaxDepth': 1, 'git.detectSubmodules': false, ...extra }, null, 2)}\n`
