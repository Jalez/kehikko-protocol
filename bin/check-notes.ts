#!/usr/bin/env bun
/**
 * Check that a release which changes a module's MCP door says so to agents.
 *
 *   kehikot-check-notes [--door <url> | --tools <file>] [--write] [--tag <tag>] [<module dir>]
 *
 * Compares the door's tools (names, descriptions, input schemas) with the
 * `notes/tools.json` committed at the last tag; when they changed,
 * `notes/<package version>.md` must have a "For agents" line. `--door` asks a
 * running door, `--tools` reads a list; `--write` stores it as
 * `notes/tools.json`. Exits 1 on a failure. The work is in `src/check/notes.ts`.
 */
import { checkModuleNotes, saidNotes } from '../src/check/notes.ts'

const args = process.argv.slice(2)
const value = (flag: string) => {
  const at = args.indexOf(flag)
  return at >= 0 ? args[at + 1] : undefined
}
const taken = new Set<number>()
for (const flag of ['--door', '--tools', '--tag']) {
  const at = args.indexOf(flag)
  if (at >= 0) taken.add(at).add(at + 1)
}
const dirs = args.filter((arg, i) => !taken.has(i) && arg !== '--write')
const check = await checkModuleNotes(dirs[0] ?? '.', { door: value('--door'), tools: value('--tools'), tag: value('--tag'), write: args.includes('--write') })
console.log(saidNotes(check))
process.exit(check.failures.length ? 1 : 0)
