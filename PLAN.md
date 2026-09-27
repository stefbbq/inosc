# inosc: per-task multi-repo worktree folders, agent-ready

## Context
Tasks that span several repos mean juggling worktree slots by hand, relinking deps, and copying agent/env files per slot. Research found nothing that combines multi-repo task worktrees with agent config: worktree CLIs (wkt, git-worktree-manager, Canopy, timvw/wt) are v0 and lack read-only repos; LLM tools are either orchestrator apps (Vibe Kanban, Conductor) or config syncers (aiworkspace, agents CLI, agentsync). So we build **inosc** (from *inosculation*: trees whose branches/roots fuse), open source at `stefbbq/inosc`. Name is free on npm, Homebrew, crates.io, PyPI and GitHub (2 empty repos named `inosc`).

## Design
- **Language**: TypeScript, Node ≥ 22, zero runtime deps beyond git/node; published as `inosc` on npm (`npx inosc`). Conventions: types over interfaces, arrow functions, `Result` over throw, one function per file.
- **Workspace config** `inosc.json` at a workspace root (found by walking up from cwd), with `$schema`:
  - `tasksDir` (default `tasks`), `base` (default `origin/main`), `branch` template (default `{id}`, lowercased).
  - `repos.<name>`: `clone` (path to main clone), optional `branch` template, `include` (gitignored files copied from the clone), `setup` (commands run in the worktree), `commands` (build/test/lint shown to agents), `agentsDoc` (repo's AGENTS.md path).
  - `links[]`: `{ from, to, run }`: command run in `from` when both repos are in a task (`{to}` = relative path). Built-in strategies (pnpm `link:`, `go.work`, cargo `[patch]`) are roadmap, not v0.
- **Layout**: `<workspace>/<tasksDir>/<ID>/<repo>`, siblings; agent files at `<ID>/`.

## Commands
- `inosc new <ID> <repo>... [--read <repo>...]`: fetch, `git worktree add -b <branch> <dir> <base>` (edit) or `--detach <base>` (read), copy includes, run setup, run links, write agent files.
- `inosc add <ID> <repo> [--read]`: same for one repo; reruns links and regenerates agent files.
- `inosc ls [--json]`: tasks, repos, branch/detached, dirty and ahead markers.
- `inosc done <ID> [--force]`: per repo refuse if `git status --porcelain` is non-empty or `git log <branch> --not --remotes` is non-empty; else `git worktree remove`, `git branch -D`, `git worktree prune`, delete the folder and any agent state it created.
- `inosc agents install`: symlinks the bundled `inosc` skill into Claude Code, Codex and Cursor user skill dirs (paths verified per tool at implementation time).

## Agent integration (generated per task)
- `AGENTS.md`: task ID, repo table (path, branch, edit/read), link graph, per-repo commands, rules (edit only edit-mode repos; each repo's own AGENTS.md wins; use `inosc add` for more repos). Read by Cursor and Codex.
- `CLAUDE.md`: `@AGENTS.md`.
- `.vscode/settings.json`: `git.repositoryScanMaxDepth: 1` so Cursor source control shows every worktree when the folder is opened; optional `settings` passthrough from `inosc.json`.
- Optional hook `onNew`/`onDone` commands in `inosc.json` for user extras (e.g. symlinking a shared Claude Code memory dir).
- Launch hints printed by `new`: `claude`, `cursor .`, `codex -C .` from the task root.

## Example adoption (first real workspace, after v0 works)
- `inosc.json` for a pnpm monorepo app + its SDK repo + a database repo + a config repo: app and SDK run `pnpm install` (SDK also builds); link app → SDK via the app's existing local-link script; the others are read-only by default.
- Watch: link scripts that run `pnpm install --no-frozen-lockfile` can change `pnpm-lock.yaml`; `done` should flag that.

## Verification
1. Unit tests (vitest) with temp git repos + bare remotes: new/add/ls/done, read-only detach, refusal on dirty and on unpushed, no stray branches or worktrees after done.
2. Real workspace: `inosc new T-1 app sdk --read db` → app's `node_modules` resolves the SDK from the task's sibling worktree; tests pass in both.
3. Parallel `inosc new T-2 app` resolves the published SDK, unaffected by T-1.
4. Open task root in Claude Code, Cursor and Codex: each reports the task AGENTS.md content; Cursor SCM lists all repos.
5. Ask an agent "add db read-only to T-1": the skill runs `inosc add`.
