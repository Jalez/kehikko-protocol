/**
 * 2.104.0. A test preload: `import 'kehikot-module-protocol/testing/setup'` from the module's
 * `test/setup.ts`. Drops everything a running app leaks into the environment (`clearAppEnvironment`),
 * so no module test can reach the person's app at :4170. Node-only.
 */
import { clearAppEnvironment } from './env.js'

clearAppEnvironment()
