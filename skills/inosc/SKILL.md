---
name: inosc
description: Create, extend, inspect and clean up multi-repo task workspaces (one folder of sibling git worktrees per task) with the inosc CLI. Use when work needs changes in more than one repository, when the user asks to start, set up, open or add a repo to a task/ticket workspace, asks which tasks are active, wants to clean a task up, or mentions inosc.
---

# inosc

inosc gives each task one folder of git worktrees, one per repo, side by side:

```
<workspace>/<tasksDir>/<TASK-ID>/
  AGENTS.md  CLAUDE.md  .vscode/settings.json   # generated for agents and editors
  <repo-a>/  <repo-b>/  …                          # worktrees
```

The workspace is the nearest parent directory with an `inosc.json`, which lists the repos, files to copy in, setup commands and cross-repo link commands.

## Commands

Run from anywhere inside the workspace.

- `inosc ls --json`: every task with each repo's mode, branch, uncommitted paths and unpushed commits. Start here.
- `inosc repos`: repos configured in `inosc.json`.
- `inosc new <ID> <repo>... [--read <repo>...] [--slug <slug>]`: create a task. Named repos get a task branch; `--read` repos are detached at their base for reference. Runs setup and links, which can take 5-10 minutes (package installs, builds): run it in the background or with a long timeout, never under a default 2-minute command timeout.
- `inosc add <ID> <repo>... [--read <repo>...]`: add repos to an existing task; reruns the links they complete and regenerates AGENTS.md. Same long-running caveat as `new`.
- `inosc done <ID>`: remove the task's worktrees, task branches and folder. Refuses while anything is uncommitted or unpushed.

## Rules

- Before creating a task, run `inosc ls --json` and `inosc repos`; reuse an existing task for the same ticket.
- Only put repos you will change in edit mode; everything you only need to read goes under `--read`.
- If `new` or `add` fails part-way, the task is still valid: read the error, fix it, rerun the failed setup command by hand in that repo folder (or ask the user before `inosc done`).
- After `inosc new`, read the generated `<task>/AGENTS.md` and work from the task folder. Tell the user the path, and that they can open it with `claude`, `cursor .` or `codex -C .` from there.
- Never run `inosc done --force`. Run `inosc done` only when the user asks; if it refuses, report what it listed and let the user decide.
- Don't edit the generated AGENTS.md, CLAUDE.md or `.vscode/settings.json` in a task; change `inosc.json` and rerun `inosc add`, or tell the user.
