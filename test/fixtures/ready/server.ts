/* `run`, in a process of its own: the test preload's DOM replaces `Response`, which `Bun.serve` refuses. */
import { MANIFEST_KIND, manifestSchema } from '../../../src/index.js'
import { run } from '../../../src/ready/run.js'
import { establishBuild } from '../../../src/serve/index.js'
import { ownDoor } from '../before/door.ts'

const [dir, prefer] = [process.argv[2]!, Number(process.argv[3])]
const ID = 'kehikot.readyexample'
const manifest = manifestSchema.parse({
  kind: MANIFEST_KIND,
  protocol: 2,
  id: ID,
  name: 'Ready example',
  entry: '/app',
  modes: [{ id: 'one', label: 'One' }],
  partless: 'It shows a page.',
})
const running = await run<{ n: number }>({
  id: ID,
  prefer,
  dir,
  manifest,
  build: establishBuild({ version: '1.0.0', dir }),
  ticket: 'T'.repeat(43),
  spa: process.argv[4] === 'spa',
  cors: process.argv[5] === 'cors' ? { origins: ['http://127.0.0.1:9999'] } : undefined,
  before: ownDoor,
  answer: (method, path) => (path === '/healthz' && method === 'GET' ? { status: 200, body: { ok: true } } : null),
  sockets: {
    paths: ['/echo'],
    data: () => ({ n: 0 }),
    message: (socket, message) => {
      socket.data.n += 1
      socket.send(`${socket.data.n}:${typeof message === 'string' ? message : 'bytes'}`)
    },
    refused: (why) => console.log(`REFUSED ${why}`),
  },
  onStop: () => console.log('STOPPED'),
})
console.log(`READY ${JSON.stringify({ origin: running.origin, port: running.port, ready: running.ready })}`)
