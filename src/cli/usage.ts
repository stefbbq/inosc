/** `inosc --help` text. */
export const usage = `inosc: per-task multi-repo git worktree folders, ready for Claude Code, Cursor and Codex

Usage:
  inosc init                                          write a starter inosc.json and .inosc/files here
  inosc repos                                         list configured repos
  inosc new <ID> <repo>... [--read <repo>...] [--slug <s>] [--skip-setup]
  inosc add <ID> <repo>... [--read <repo>...] [--skip-setup]
  inosc ls [ID] [--json]
  inosc sync [ID]                                     place new workspace files into existing tasks
  inosc path <ID>                                     print a task's folder
  inosc done <ID> [--force]
  inosc agents install [--force]                      install the inosc skill for Claude Code, Codex, Cursor

Options:
  -C, --cwd <dir>   run as if started in <dir>
  -h, --help        show this help
  -v, --version     show version
`
