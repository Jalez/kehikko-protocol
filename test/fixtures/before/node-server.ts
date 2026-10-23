/*
 * `beforeHandler` on node's own http server, in front of `doorsHandler`, the way Vite mounts the two
 * — and run by node itself as well as by Bun, because Vite's dev server runs on node. It imports the
 * BUILT package (`dist/`, made by `tsc` before the tests), which is what a module's Vite loads.
 * After both, a stand-in for Vite reads whatever body is left and says what it got.
 */
import { createServer } from 'node:http'

import { beforeHandler, doorsHandler } from '../../../dist/serve/index.js'
import { manifestSchema } from '../../../dist/index.js'
import { ownDoor } from './door.ts'

const manifest = manifestSchema.parse({
  kind: 'kehikot.module',
  protocol: 2,
  id: 'kehikot.beforeexample',
  name: 'Before example',
  entry: '/app',
  modes: [{ id: 'one', label: 'One' }],
  partless: 'It shows a page.',
})
const before = beforeHandler(ownDoor)
const doors = doorsHandler({ manifest, answer: (method: string, path: string) => (path === '/healthz' ? { status: 200, body: { ok: true } } : null), page: { title: 'Before' } })

const server = createServer((request, response) => {
  const failed = (error: unknown) => {
    response.statusCode = 500
    response.end(`failed: ${error instanceof Error ? error.message : String(error)}`)
  }
  before(request as never, response as never, (error?: unknown) => {
    if (error) return failed(error)
    doors(request as never, response as never, (again?: unknown) => {
      if (again) return failed(again)
      let body = ''
      request.on('data', (chunk) => (body += String(chunk)))
      request.on('end', () => {
        response.setHeader('content-type', 'application/json')
        response.end(JSON.stringify({ vite: true, body }))
      })
    })
  })
})
server.listen(0, '127.0.0.1', () => {
  const address = server.address()
  console.log(`READY ${typeof address === 'object' && address ? address.port : 0}`)
})
