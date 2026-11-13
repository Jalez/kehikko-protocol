#!/usr/bin/env bun
/**
 * Check that an agent module's door config names only the starting host's stable door (2.95.0).
 *
 *   bun run check:door-config [<module dir> …]
 *
 * With no directory, the one it is run in. Exits 1 on a failure. The work is in
 * `src/check/door-config.ts`.
 */
import { checkDoorConfig, saidDoorConfig } from '../src/check/door-config.ts'

const dirs = process.argv.slice(2)
let failed = false
for (const dir of dirs.length ? dirs : ['.']) {
  const check = checkDoorConfig(dir)
  console.log(saidDoorConfig(check))
  if (check.failures.length) failed = true
}
process.exit(failed ? 1 : 0)
