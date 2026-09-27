/** Success or failure, returned instead of throwing. */
export type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E }

/** `edit` repos get a task branch; `read` repos are detached at their base. */
export type RepoMode = 'edit' | 'read'

/** One repo a task can include, as declared in `inosc.json`. */
export type RepoConfig = {
  /** Path to the main clone, relative to the workspace root, absolute, or `~/…`. */
  clone: string
  /** Ref new worktrees start from. Defaults to the workspace `base`. */
  base?: string
  /** Branch template for edit worktrees. Defaults to the workspace `branch`. */
  branch?: string
  /** One-line description shown to agents. */
  description?: string
  /** Gitignored files or folders copied from the main clone into each worktree. */
  include?: string[]
  /** Shell commands run inside the worktree after creation. */
  setup?: string[]
  /** Named commands (build, test, lint, …) listed for agents. */
  commands?: Record<string, string>
  /** Paths whose local changes `inosc done` ignores (e.g. a lockfile rewritten by a link step). */
  ignoreDirty?: string[]
}

/** Command run in `from` whenever `from` and `to` are both in a task. */
export type LinkConfig = {
  from: string
  to: string
  /** Shell command; `{to}` is replaced with the relative path to the `to` worktree. */
  run: string
  description?: string
}

/** Shell commands run in the task folder. */
export type HooksConfig = {
  onNew?: string[]
  onDone?: string[]
}

/** Parsed `inosc.json` with defaults applied. */
export type InoscConfig = {
  tasksDir: string
  base: string
  branch: string
  repos: Record<string, RepoConfig>
  links: LinkConfig[]
  hooks: HooksConfig
  /** Extra lines appended to every task's AGENTS.md. */
  instructions: string[]
  /** Extra keys merged into each task's `.vscode/settings.json`. */
  settings: Record<string, unknown>
}

/** A directory containing `inosc.json`. */
export type Workspace = {
  root: string
  config: InoscConfig
}

/** A repo as recorded in a task manifest. */
export type TaskRepo = {
  name: string
  mode: RepoMode
  /** Task branch for edit repos, null for read repos. */
  branch: string | null
  base: string
}

/** Contents of `<task>/.inosc/task.json`. */
export type TaskManifest = {
  id: string
  slug: string | null
  createdAt: string
  repos: TaskRepo[]
}

/** Live state of one worktree in a task. */
export type RepoStatus = {
  name: string
  mode: RepoMode
  path: string
  exists: boolean
  /** Checked-out branch, or null when detached. */
  head: string | null
  /** Paths with uncommitted changes, as reported by `git status --porcelain`, minus `ignored`. */
  dirty: string[]
  /** Uncommitted paths listed in the repo's `ignoreDirty`. */
  ignored: string[]
  /** Commits on HEAD not found on any remote. */
  unpushed: number
}

/** Live state of one task. */
export type TaskStatus = {
  id: string
  path: string
  repos: RepoStatus[]
}

/** Where progress messages go. */
export type Logger = {
  info: (message: string) => void
  warn: (message: string) => void
}

/** Runtime options shared by every command. */
export type Context = {
  cwd: string
  log: Logger
  /** `inherit` streams setup/link/hook output; `pipe` captures it (tests). */
  stdio: 'inherit' | 'pipe'
  /** Skip setup commands and links. */
  skipSetup: boolean
  /** Home directory, used for `~` paths and agent skill installs. */
  home: string
}
