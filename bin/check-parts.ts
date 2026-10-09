#!/usr/bin/env bun
/**
 * Check what a module says and does about the parts of an epic.
 *
 *   bun run check:parts [<module dir> …]
 *
 * With no directory, the one it is run in. Exits 1 when any module declares
 * neither `reacts: ['parts']` nor `partless`, or declares `parts` and imports
 * no focus helper. The work is in `src/check/parts.ts`, where it is tested.
 */
import { checkModule, said } from '../src/check/parts.ts'

const dirs = process.argv.slice(2)
let failed = false
for (const dir of dirs.length ? dirs : ['.']) {
  const check = await checkModule(dir)
  console.log(said(check))
  if (check.failures.length) failed = true
}
process.exit(failed ? 1 : 0)
