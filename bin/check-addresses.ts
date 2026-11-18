#!/usr/bin/env bun
/**
 * Check that a module's page never asks its own server by a raw relative address.
 *
 *   bun run check:addresses [<module dir> …]
 *
 * With no directory, the one it is run in. Fails a module whose own sources call `fetch`,
 * `new EventSource` or `XMLHttpRequest#open` with `./…` or `api/…`, which resolves against the framed
 * page's path. Exits 1 on a failure. The work is in `src/check/addresses.ts`.
 */
import { checkModuleAddresses, saidAddresses } from '../src/check/addresses.ts'

const dirs = process.argv.slice(2)
let failed = false
for (const dir of dirs.length ? dirs : ['.']) {
  const check = checkModuleAddresses(dir)
  console.log(saidAddresses(check))
  if (check.failures.length) failed = true
}
process.exit(failed ? 1 : 0)
