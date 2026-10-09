import { GlobalRegistrator } from '@happy-dom/global-registrator'

/**
 * A document, for the one suite that renders into one.
 *
 * Registered globally rather than per-file because half the value of the React
 * tests is that they run the real hook against a real render — the ordering
 * being asserted is React's own, and a fake renderer would run the effects in an
 * order React does not.
 *
 * Everything else in this package is shapes and does not care. It is worth being
 * explicit that it does not care by accident: `src/client/mailbox.ts` asks
 * `typeof window === 'undefined'` at module scope, so under this preload the
 * singleton mailbox installs a listener on happy-dom's window instead of being
 * an inbox nothing posts to. Nothing outside `client-react.test.ts` subscribes
 * to it, and every other client test builds its own inbox with `makeMailbox`
 * precisely so that it never depends on which of those two happened.
 */
GlobalRegistrator.register()

/**
 * React's own switch for "this is a test, effects may be flushed on demand".
 *
 * Without it every `act(...)` prints a paragraph of red into a suite that
 * passes, which is the kind of noise that trains a person to stop reading test
 * output.
 */
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

/**
 * No test may reach a person's machine.
 *
 * `registerAt` writes a file into the module registry, and the registry's DEFAULT location is the
 * real one — `~/Library/Application Support/Kehikot/modules` — which a running host sweeps: a
 * file written there is a module appearing in somebody's app. Individual tests pointed the
 * registry at a scratch directory themselves, each with its own `process.env` line, and that held
 * exactly as long as every one of them named a variable the code still read. When a variable
 * stopped being read, the tests that set only it fell through to the default without failing.
 *
 * So it is not left to each test. Before any test file is loaded, the whole suite's registry is a
 * scratch directory — under every name the code reads — and a test that saves and restores the
 * variable restores THIS. Then, before and after every test, the registry the code would resolve
 * is checked: if it is not under the scratch directory the test fails, loudly, naming where it
 * would have written.
 */
import { afterEach, beforeEach } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { registryDir } from '../src/serve/registry.ts'

const SCRATCH = mkdtempSync(join(tmpdir(), 'kehikot-protocol-tests-'))
/* Every environment variable that decides a machine-level location this package writes to. */
const REGISTRY_VARIABLES = ['KEHIKOT_MODULES_DIR', 'ROADMAP_MODULES_DIR'] as const
for (const name of REGISTRY_VARIABLES) process.env[name] = join(SCRATCH, 'modules')

function registryIsScratch(when: string): void {
  const where = registryDir()
  if (where.startsWith(tmpdir()) || where.startsWith(SCRATCH)) return
  /* Put it back first, so one test's mistake is one failure and not every later test's. */
  for (const name of REGISTRY_VARIABLES) process.env[name] = join(SCRATCH, 'modules')
  throw new Error(
    `${when}, the module registry resolved to ${where}, which is not a scratch directory. A test must never be able to `
      + `write a registration where a real host reads them. Set ${REGISTRY_VARIABLES[0]} to a temp directory and restore `
      + 'what it was — never delete it.',
  )
}

registryIsScratch('Before any test ran')
beforeEach(() => registryIsScratch('Before this test'))
afterEach(() => registryIsScratch('After this test'))
