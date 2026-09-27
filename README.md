# inosc

Per-task, multi-repo git worktree folders, ready for Claude Code, Cursor and Codex.

> *Inosculation*: when branches or roots of separate trees grow together and fuse.

**Status:** planning. See [PLAN.md](PLAN.md).

## Why

Work that spans several repos means juggling worktrees by hand, relinking local dependencies, and copying env and agent files into every checkout. inosc gives each task one folder of sibling worktrees, linked to each other, with agent instructions generated at the root.

```
<workspace>/tasks/T-1234/
  AGENTS.md          # repo map, branches, links, commands (Cursor, Codex)
  CLAUDE.md          # @AGENTS.md (Claude Code)
  .vscode/           # every worktree visible in source control
  app/               # worktree on branch t-1234
  sdk/               # worktree on branch t-1234, linked into app
  db/                # read-only worktree, detached at origin/main
```

## Planned CLI

```sh
inosc new <ID> <repo>... [--read <repo>...]   # create task folder + worktrees
inosc add <ID> <repo> [--read]                # add a repo to a task
inosc ls [--json]                             # tasks, repos, branches, dirty/ahead
inosc done <ID>                               # remove; refuses on uncommitted or unpushed work
inosc agents install                          # install the inosc skill for Claude Code, Codex, Cursor
```

Configured per workspace with an `inosc.json` (repos, files to copy, setup commands, link commands).

## License

MIT
