# inosc

```
     ██╗███╗   ██╗ ██████╗ ███████╗ ██████╗
    ██║████╗  ██║██╔═══██╗██╔════╝██╔════╝
   ██║██╔██╗ ██║██║   ██║███████╗██║
  ██║██║╚██╗██║██║   ██║╚════██║██║
 ██║██║ ╚████║╚██████╔╝███████║╚██████╗
╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚══════╝ ╚═════╝
```

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

## Concepts

- **Workspace**: a folder with an `inosc.json` listing the repos you work across. You create it once and keep it.
- **Task**: one unit of work (a ticket, a feature) with its own folder under `tasks/<ID>/`. You create one per piece of work and remove it when it's merged.
- **Edit repos** get a fresh task branch you commit and push to. **Read repos** (`--read`) are checked out detached at the base branch, for reference only.

## Your first task

**1. Make a workspace.** Pick a folder that will hold all your tasks, e.g. `~/work`. If you already have clones of your repos, run `init` in the folder that holds them; otherwise run it in an empty folder.

```sh
mkdir ~/work && cd ~/work
inosc init
```

This writes `inosc.json`, listing each clone found by its `origin` URL (or an `example` entry in an empty folder), plus an empty `.inosc/files/<repo>/` per repo.

**2. Describe your repos.** Edit `inosc.json`. At minimum each repo needs a `url` (or a `clone` path). Add `setup` commands so new worktrees are ready to use:

```json
{
  "repos": {
    "app": { "url": "git@github.com:acme/app.git", "setup": ["pnpm install"] },
    "sdk": { "url": "git@github.com:acme/sdk.git", "setup": ["pnpm install", "pnpm build"] },
    "db":  { "url": "git@github.com:acme/db.git" }
  }
}
```

`inosc repos` checks that the config parses and shows what's configured. See [Configuration](#configuration) for everything else.

**3. Add local-only files (optional).** Anything a checkout needs but git doesn't track, like `.env.local` or `.npmrc`, goes under `.inosc/files/<repo>/` at the same path it has in the repo. Every task gets it automatically. See [Files](#files).

**4. Start a task.**

```sh
inosc new PROJ-1234 app sdk --read db
```

inosc mirrors each repo the first time it's used (this can take a while for large repos), then creates `tasks/PROJ-1234/` with `app` and `sdk` on a new branch `proj-1234`, `db` read-only, your files placed, setup run and agent instructions written.

**5. Open the task folder** in your agent or editor, not a single repo inside it, so it picks up the generated `AGENTS.md` and sees every repo:

```sh
cd tasks/PROJ-1234 && claude            # or: cursor tasks/PROJ-1234, codex -C tasks/PROJ-1234
```

**6. Work as usual.** Each repo is a normal git worktree: commit, push and open PRs from inside it. Need another repo mid-task? `inosc add PROJ-1234 infra` (or `--read infra`). `inosc ls` shows every task with its branches and any uncommitted or unpushed work.

**7. Clean up** once your branches are pushed or merged:

```sh
inosc done PROJ-1234
```

This removes the worktrees, the task branches and the folder. It refuses if anything is uncommitted or unpushed, so you can't lose work by accident.

Optionally run `inosc agents install` once so Claude Code, Codex and Cursor can do all of the above when you ask ("start PROJ-12 with app and sdk, db read-only").

## Commands

| Command | What it does |
|---|---|
| `inosc init` | Write a starter `inosc.json` and `.inosc/files/<repo>/`. Clones directly below the current folder are listed by `origin` URL; an empty folder gets an example. |
| `inosc repos` | List configured repos and whether each mirror exists yet. |
| `inosc new <ID> <repo>... [--read <repo>...] [--slug <s>] [--base <ref>] [--skip-setup]` | Create a task. Mirrors `url` repos on first use. Named repos get a task branch (reusing a local or remote one if it exists), new ones off the base (`--base` overrides the configured one for this task); `--read` repos are detached at their base. Places workspace files, runs setup, runs links, writes agent files, runs `onNew` hooks. |
| `inosc add <ID> <repo>... [--read <repo>...] [--base <ref>] [--skip-setup]` | Add repos to a task; runs only the links the new repos complete and regenerates agent files. |
| `inosc ls [ID] [--json]` | Tasks with each repo's branch, uncommitted paths and commits not on any remote. |
| `inosc sync [ID]` | Place workspace files added since a task was created, into one task or all. |
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
      "url": "https://github.com/acme/app.git",
      "description": "Web app (pnpm monorepo)",
      "setup": ["pnpm install"],
      "commands": { "test": "pnpm test", "build": "pnpm build" },
      "ignoreDirty": ["pnpm-lock.yaml"]
    },
    "sdk": {
      "url": "git@github.com:acme/sdk.git",
      "branch": "{id}-{slug}",
      "setup": ["pnpm install", "pnpm build"]
    },
    "db": { "clone": "~/src/db" }
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
| `repos.<name>.url` | Remote URL. inosc keeps a bare mirror in `.inosc/repos/<name>.git` that every worktree of the repo shares; there's no checkout to edit by mistake. |
| `repos.<name>.clone` | Instead of `url`: a clone you manage (relative, absolute or `~/…`). Worktrees share its object store. |
| `filesDir` | Default `.inosc/files`. Everything under `<filesDir>/<repo>/` is placed at the same path in each worktree of that repo: env files, `.npmrc`, local agent files, anything. See [Files](#files). |
| `filesMode` | `symlink` (default) or `copy`. Per-repo override. |
| `setup` | Shell commands run in the new worktree. |
| `commands` | Listed in AGENTS.md so agents know how to build and test. |
| `ignoreDirty` | Paths `done` ignores, e.g. a lockfile a link step rewrites. |
| `links` | Run in `from` whenever `from` and `to` are both in a task. `{to}` is the sibling path (`../sdk`). Use whatever your stack uses for local-only links: pnpm `link:`/overrides in an ignored file, `go work use`, a Cargo `[patch]` in `.cargo/config.toml`. Keep them out of committed files. |
| `hooks` | Shell commands run in the task folder. Env: `INOSC_TASK_ID`, `INOSC_TASK_DIR`, `INOSC_WORKSPACE`, `INOSC_REPOS` (also set for setup and links). |
| `instructions` | Extra lines for every task's AGENTS.md. |
| `settings` | Extra keys for every task's `.vscode/settings.json`. |

## Files

Local-only files live once per workspace, mirroring each repo's layout:

```
.inosc/
  .gitignore              # "*": mirrors and secrets never reach the workspace's own repo
  repos/app.git           # bare mirrors of url repos
  files/app/.env.local    # → tasks/*/app/.env.local
  files/app/.npmrc
  files/app/apps/web/.dev.vars
  files/sdk/CLAUDE.local.md
```

- **symlink** (default): one source of truth; a rotated key reaches every open task. A tool that writes the file writes the shared copy.
- **copy**: each task gets its own snapshot.
- inosc never overwrites: a path that already exists in the worktree is left alone with a warning.
- Placed files git doesn't ignore are added to the mirror's `info/exclude`, so they never show as uncommitted or block `done`. For `clone` repos inosc leaves your git config alone and warns instead.
- Add a file later, then `inosc sync` to place it in open tasks. `done` removes the links, never the sources.

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
