#!/usr/bin/env bun
/**
 * Check a module's header and footer against the rule of what goes in each.
 *
 *   kehikot-check-rows [--file <rows file>] [--warn] [<module dir> …]
 *
 * With no directory, the one it is run in. Reads `kehikot.rows.json` (or
 * `--file`: JSON, or a module exporting `rows`), one state or a list, and
 * runs `rowsAdvice` over each. Exits 1 on any advice, unless `--warn`. A
 * module that states no rows passes with a note. The work is in
 * `src/check/rows.ts`.
 */
import { checkModuleRows, saidRows } from '../src/check/rows.ts'

const args = process.argv.slice(2)
const warn = args.includes('--warn')
const at = args.indexOf('--file')
const file = at >= 0 ? args[at + 1] : undefined
const dirs = args.filter((arg, i) => arg !== '--warn' && arg !== '--file' && !(at >= 0 && i === at + 1))
let failed = false
for (const dir of dirs.length ? dirs : ['.']) {
  const check = await checkModuleRows(dir, { file })
  console.log(saidRows(check, warn))
  if (check.failures.length && !warn) failed = true
}
process.exit(failed ? 1 : 0)
