#!/usr/bin/env bun
/**
 * Check what a module's MCP door says about its tools.
 *
 *   bun run check:door [--running] [<module dir> …]
 *
 * With no directory, the one it is run in. From the files alone it can only
 * hint: that no source mentions `readOnlyHint`, that a tool seems to take
 * `projectPath`. `--running` is the opt-in that asks the started module (found
 * through the registry) for its tools, and can fail: a tool the manifest's
 * `mcp.subjects` names is missing, is not read-only, or does not say the
 * shared answer. Exits 1 on a failure. The work is in `src/check/door.ts`.
 */
import { checkModuleDoor, saidDoor } from '../src/check/door.ts'

const args = process.argv.slice(2)
const running = args.includes('--running')
const dirs = args.filter((arg) => arg !== '--running')
let failed = false
for (const dir of dirs.length ? dirs : ['.']) {
  const check = await checkModuleDoor(dir, { running })
  console.log(saidDoor(check))
  if (check.failures.length) failed = true
}
process.exit(failed ? 1 : 0)
