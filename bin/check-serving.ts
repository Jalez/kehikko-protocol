#!/usr/bin/env bun
/**
 * Check that a module takes its port the shared way.
 *
 *   bun run check:serving [<module dir> …]
 *
 * With no directory, the one it is run in. Fails a module whose own sources
 * bind a server or probe a port without taking the port from
 * `kehikot-module-protocol/serve` (or `/run`), and a Vite config without
 * `serves()`. Exits 1 on a failure. The work is in `src/check/serving.ts`.
 */
import { checkModuleServing, saidServing } from '../src/check/serving.ts'

const dirs = process.argv.slice(2)
let failed = false
for (const dir of dirs.length ? dirs : ['.']) {
  const check = checkModuleServing(dir)
  console.log(saidServing(check))
  if (check.failures.length) failed = true
}
process.exit(failed ? 1 : 0)
