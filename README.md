# inosc

Per-task, multi-repo git worktree folders, ready for Claude Code, Cursor and Codex.

> *Inosculation*: when branches or roots of separate trees grow together and fuse.

Work that spans several repos means juggling worktrees by hand, relinking local dependencies, and copying env and agent files into every checkout. inosc gives each task one folder of sibling worktrees, linked to each other, with agent instructions generated at the root. Tasks are isolated from each other and `inosc done` removes everything, refusing while any work is uncommitted or unpushed.

```
<workspace>/tasks/PROJ-1234/
  AGENTS.md              # repos, branches, links, commands, rules (Cursor, Codex)
  CLAUDE.md              # @AGENTS.md (Claude Code)
  .vscode/settings.json  # every worktree visible in source control
  app/                   # worktree on branch proj-1234
  sdk/                   # worktree on branch proj-1234, linked into app
  db/                    # read-only worktree, detached at origin/main
```

## Install

Requires Node ≥ 22.18 and git ≥ 2.31.

```sh
npm install -g inosc
inosc agents install   # optional: teach Claude Code, Codex and Cursor to use inosc
```

## Quick start

In a folder that holds your clones:

```sh
inosc init                              # writes inosc.json listing the clones it finds
inosc new PROJ-1234 app sdk --read db   # app and sdk get branch proj-1234, db is read-only
cd tasks/PROJ-1234 && claude            # or: cursor tasks/PROJ-1234, codex -C tasks/PROJ-1234
inosc add PROJ-1234 --read infra        # pull in another repo later
inosc ls                                # every task, its branches, uncommitted and unpushed work
inosc done PROJ-1234                    # remove worktrees, task branches and the folder
```

Open the **task folder** in your agent or editor, not a single repo inside it, so it picks up the generated AGENTS.md and sees every repo.

## Commands

| Command | What it does |
|---|---|
| `inosc init` | Write a starter `inosc.json` listing the git clones directly below the current folder. |
| `inosc repos` | List configured repos. |
| `inosc new <ID> <repo>... [--read <repo>...] [--slug <s>] [--skip-setup]` | Create a task. Named repos get a task branch (reusing a local or remote one if it exists); `--read` repos are detached at their base. Copies includes, runs setup, runs links, writes agent files, runs `onNew` hooks. |
| `inosc add <ID> <repo>... [--read <repo>...] [--skip-setup]` | Add repos to a task; runs only the links the new repos complete and regenerates agent files. |
| `inosc ls [ID] [--json]` | Tasks with each repo's branch, uncommitted paths and commits not on any remote. |
| `inosc path <ID>` | Print a task's folder (`cd "$(inosc path PROJ-1)"`). |
| `inosc done <ID> [--force]` | Remove the task. Refuses if any worktree has uncommitted changes or unpushed commits, or the folder holds files inosc didn't write. `--force` discards them. |
| `inosc agents install [--force]` | Copy the bundled `inosc` skill to `~/.claude/skills` (Claude Code) and `~/.agents/skills` (Codex, Cursor). |

All commands accept `-C <dir>` and find the workspace by walking up to the nearest `inosc.json`.

## Configuration

`inosc.json` at the workspace root ([schema](schema/inosc.schema.json)):

```json
{
  "$schema": "https://raw.githubusercontent.com/stefbbq/inosc/main/schema/inosc.schema.json",
  "tasksDir": "tasks",
  "base": "origin/main",
  "branch": "{id}",
  "repos": {
    "app": {
      "clone": "app",
      "description": "Web app (pnpm monorepo)",
      "include": [".env.local", ".npmrc"],
      "setup": ["pnpm install"],
      "commands": { "test": "pnpm test", "build": "pnpm build" },
      "ignoreDirty": ["pnpm-lock.yaml"]
    },
    "sdk": {
      "clone": "~/src/sdk",
      "branch": "{id}-{slug}",
      "setup": ["pnpm install", "pnpm build"]
    },
    "db": { "clone": "db" }
  },
  "links": [
    { "from": "app", "to": "sdk", "run": "pnpm link {to}/packages/core", "description": "app uses the task's sdk" }
  ],
  "hooks": { "onNew": [], "onDone": [] },
  "instructions": ["Open PRs as drafts."],
  "settings": { "files.exclude": { "**/node_modules": true } }
}
```

| Key | Meaning |
|---|---|
| `tasksDir` | Where task folders go, relative to the workspace root. |
| `base` | Ref new worktrees start from; the remote part is fetched first. Per-repo override: `repos.<name>.base`. |
| `branch` | Branch template: `{id}` lowercased task ID, `{ID}` as typed, `{slug}` from `--slug` (dropped with its separator when absent). Per-repo override. |
| `repos.<name>.clone` | The main clone. Worktrees share its object store; don't edit it directly. |
| `include` | Gitignored files copied from the main clone (env files, registry tokens, local agent files). Never overwrites. |
| `setup` | Shell commands run in the new worktree. |
| `commands` | Listed in AGENTS.md so agents know how to build and test. |
| `ignoreDirty` | Paths `done` ignores, e.g. a lockfile a link step rewrites. |
| `links` | Run in `from` whenever `from` and `to` are both in a task. `{to}` is the sibling path (`../sdk`). Use whatever your stack uses for local-only links: pnpm `link:`/overrides in an ignored file, `go work use`, a Cargo `[patch]` in `.cargo/config.toml`. Keep them out of committed files. |
| `hooks` | Shell commands run in the task folder. Env: `INOSC_TASK_ID`, `INOSC_TASK_DIR`, `INOSC_WORKSPACE`, `INOSC_REPOS` (also set for setup and links). |
| `instructions` | Extra lines for every task's AGENTS.md. |
| `settings` | Extra keys for every task's `.vscode/settings.json`. |

## How agents see a task

- **Claude Code**: start `claude` in the task folder. `CLAUDE.md` imports `AGENTS.md`; each repo's own CLAUDE.md still loads when Claude works inside it.
- **Cursor**: open the task folder. Cursor reads the root `AGENTS.md`, and the generated settings make source control list every worktree.
- **Codex**: `codex -C <task folder>`. Codex reads `AGENTS.md` from the folder it starts in.
- **The skill** (`inosc agents install`) lets any of them create, extend and inspect tasks when you ask ("start PROJ-12 with app and sdk, db read-only").

## Safety

- `done` checks every worktree with `git status --porcelain --untracked-files=all` and `git rev-list HEAD --not --remotes` before touching anything, and refuses while the task folder holds files it didn't create.
- New task branches don't track the base branch, so a stray `git push` can't land on `main`.
- A failed setup leaves a valid task: fix it and rerun, or `inosc done` to clean up.

## License

MIT
