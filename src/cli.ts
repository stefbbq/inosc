#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import type { Context, Result, Workspace } from './types.ts'
import { formatTasks } from './cli/formatTasks.ts'
import { usage } from './cli/usage.ts'
import { addRepos } from './commands/addRepos.ts'
import { doneTask } from './commands/doneTask.ts'
import { initWorkspace } from './commands/initWorkspace.ts'
import { installAgents } from './commands/installAgents.ts'
import { listTasks } from './commands/listTasks.ts'
import { newTask } from './commands/newTask.ts'
import { loadWorkspace } from './config/loadWorkspace.ts'
import { err } from './result/err.ts'
import { ok } from './result/ok.ts'
import { taskDir } from './task/taskDir.ts'

const version = (): string =>
  (JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }).version

const launchHints = (dir: string): string =>
  [`\nTask ready: ${dir}`, 'Open it with one of:', `  cd ${dir} && claude`, `  cursor ${dir}`, `  codex -C ${dir}`].join('\n')

const run = (argv: string[]): Result<string> => {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      read: { type: 'string', multiple: true, default: [] },
      slug: { type: 'string' },
      'skip-setup': { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
      force: { type: 'boolean', default: false },
      cwd: { type: 'string', short: 'C' },
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', short: 'v', default: false },
    },
  })
  if (values.version) return ok(version())
  const [command, ...rest] = positionals
  if (values.help || !command) return ok(usage.trimEnd())

  const ctx: Context = {
    cwd: resolve(values.cwd ?? process.cwd()),
    log: { info: (m) => console.error(m), warn: (m) => console.error(`warning: ${m}`) },
    stdio: 'inherit',
    skipSetup: values['skip-setup'],
    home: homedir(),
  }
  if (command === 'init') return initWorkspace(ctx)
  if (command === 'agents') {
    if (rest[0] !== 'install') return err('Usage: inosc agents install [--force]')
    const installed = installAgents(ctx, values.force)
    return installed.ok ? ok('Installed the inosc skill.') : installed
  }

  const loaded = loadWorkspace(ctx.cwd)
  if (!loaded.ok) return loaded
  const ws: Workspace = loaded.value
  const [id, ...repos] = rest
  const needId = (): Result<string> => (id ? ok(id) : err(`Usage: inosc ${command} <ID> …`))

  switch (command) {
    case 'repos':
      return ok(
        Object.entries(ws.config.repos)
          .map(([name, r]) => `${name.padEnd(20)} ${r.clone}${r.description ? `  ${r.description}` : ''}`)
          .join('\n'),
      )
    case 'new': {
      const taskId = needId()
      if (!taskId.ok) return taskId
      const res = newTask(ctx, ws, { id: taskId.value, edit: repos, read: values.read, slug: values.slug ?? null })
      return res.ok ? ok(launchHints(res.value.dir)) : res
    }
    case 'add': {
      const taskId = needId()
      if (!taskId.ok) return taskId
      const res = addRepos(ctx, ws, { id: taskId.value, edit: repos, read: values.read })
      return res.ok ? ok(`Updated ${res.value.dir}`) : res
    }
    case 'ls': {
      const res = listTasks(ws, id)
      if (!res.ok) return res
      return ok(values.json ? JSON.stringify(res.value, null, 2) : formatTasks(res.value))
    }
    case 'path': {
      const taskId = needId()
      return taskId.ok ? ok(taskDir(ws, taskId.value)) : taskId
    }
    case 'done': {
      const taskId = needId()
      if (!taskId.ok) return taskId
      const res = doneTask(ctx, ws, { id: taskId.value, force: values.force })
      return res.ok ? ok(`Removed ${res.value}`) : res
    }
    default:
      return err(`Unknown command "${command}"\n\n${usage}`)
  }
}

try {
  const result = run(process.argv.slice(2))
  if (result.ok) {
    if (result.value) console.log(result.value)
  } else {
    console.error(`inosc: ${result.error}`)
    process.exitCode = 1
  }
} catch (e) {
  // parseArgs throws on unknown flags; everything else returns a Result.
  console.error(`inosc: ${(e as Error).message}`)
  process.exitCode = 1
}
