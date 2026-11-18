#!/usr/bin/env bun
/**
 * A module's ready-built bundle (2.102.0). Design notes: docs/bundles.md.
 *
 *   kehikot-bundle build [<module dir>] [--out <dir>]   build <id>-<version>.tar.gz and its .sha256
 *   kehikot-bundle smoke <archive>                      unpack it into a scratch folder, start it once,
 *                                                       ask its manifest and its page
 *
 * `build` needs the module's dependencies installed and its page built (`bun run build`) on a clean
 * checkout. A module whose package.json says `kehikot.bundle.enabled: false` is skipped with exit 0
 * and says why. Exits 1 on a failure.
 */
import { resolve } from 'node:path'

import { buildBundle } from '../src/bundle/build.ts'
import { smokeBundle } from '../src/bundle/smoke.ts'

const [command, ...rest] = process.argv.slice(2)
const flag = (name: string) => {
  const at = rest.indexOf(name)
  if (at === -1) return undefined
  const value = rest[at + 1]
  rest.splice(at, 2)
  return value
}

if (command === 'build') {
  const out = flag('--out')
  const built = await buildBundle({ dir: resolve(rest[0] ?? '.'), ...(out ? { out: resolve(out) } : {}) })
  if (!built.ok) {
    console.error(built.why)
    process.exit(built.skipped ? 0 : 1)
  }
  console.log(`archive=${built.archive}`)
  console.log(`sha256=${built.sha256}`)
} else if (command === 'smoke') {
  if (!rest[0]) {
    console.error('kehikot-bundle smoke <archive>')
    process.exit(1)
  }
  const smoked = await smokeBundle({ archive: resolve(rest[0]) })
  if (!smoked.ok) {
    console.error(smoked.why)
    if (smoked.output) console.error(`--- its output ---\n${smoked.output.slice(-4000)}`)
    process.exit(1)
  }
} else {
  console.error('kehikot-bundle build [<module dir>] [--out <dir>] | kehikot-bundle smoke <archive>')
  process.exit(1)
}
