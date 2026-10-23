/* `run` with an `onStop` that takes `ms` to finish and then writes `marker`: does a signal wait for it? */
import { writeFileSync } from 'node:fs'

import { MANIFEST_KIND, manifestSchema } from '../../../src/index.js'
import { run } from '../../../src/ready/run.js'

const [dir, prefer, ms, cap, marker] = [process.argv[2]!, Number(process.argv[3]), Number(process.argv[4]), Number(process.argv[5]), process.argv[6]!]
const ID = 'kehikot.stopexample'
const manifest = manifestSchema.parse({
  kind: MANIFEST_KIND,
  protocol: 2,
  id: ID,
  name: 'Stop example',
  entry: '/app',
  modes: [{ id: 'one', label: 'One' }],
  partless: 'It shows a page.',
})
let calls = 0
const running = await run({
  id: ID,
  prefer,
  dir,
  manifest,
  answer: (method, path) => (path === '/healthz' && method === 'GET' ? { status: 200, body: { ok: true } } : null),
  stopTimeoutMs: cap,
  onStop: async () => {
    calls += 1
    await new Promise((resolve) => setTimeout(resolve, ms))
    writeFileSync(marker, `finished after ${ms} ms, called ${calls} time(s)`)
  },
})
console.log(`READY ${JSON.stringify({ origin: running.origin, port: running.port })}`)
