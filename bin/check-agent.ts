#!/usr/bin/env bun
/**
 * Check that an agent module is built so every conversation can message (2.95.0).
 *
 *   bun run check:agent [<module dir> …]
 *
 * With no directory, the one it is run in. Exits 1 on a failure. The work is in `src/check/agent.ts`;
 * the behaviour itself is checked by the module's own conformance test (`kehikot-module-protocol/testing`).
 */
import { checkAgentModule, saidAgent } from '../src/check/agent.ts'

const dirs = process.argv.slice(2)
let failed = false
for (const dir of dirs.length ? dirs : ['.']) {
  const check = await checkAgentModule(dir)
  console.log(saidAgent(check))
  if (check.failures.length) failed = true
}
process.exit(failed ? 1 : 0)
