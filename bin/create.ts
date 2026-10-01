#!/usr/bin/env bun
/**
 * Make a new module from `template/`.
 *
 *   bun run create <name> [--dir <path>] [--register]
 *
 * The work is in `src/create/`, where it is tested; this only reads the
 * command line and prints.
 */
import { create, nextSteps, parseArgs } from '../src/create/index.ts'

const args = parseArgs(process.argv.slice(2))
if (typeof args === 'string') {
  console.error(args)
  process.exit(1)
}

try {
  const created = create({ ...args, log: (line) => console.log(line) })
  console.log(`\n${nextSteps(created)}`)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
