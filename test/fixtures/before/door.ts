/**
 * ONE door of a module's own, written once and mounted on both servers: on node's http in front of
 * the doors (`beforeHandler`, as Vite mounts it) and on `run({ before })`. No imports, so node can
 * load it from the built package and Bun from the source.
 */
export const KEY_HEADER = 'x-own-key'

export async function ownDoor(request: Request, info: { asker: string; url: URL; ticket: string | null }): Promise<Response | undefined> {
  const path = info.url.pathname
  if (path === '/api/throw') throw new Error('thrown on purpose')
  if (path === '/api/own-stream') {
    const bytes = new TextEncoder()
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(bytes.encode('one,'))
        await new Promise((resolve) => setTimeout(resolve, 20))
        controller.enqueue(bytes.encode('two'))
        controller.close()
      },
    })
    return new Response(body, { headers: { 'content-type': 'text/plain' } })
  }
  if (path !== '/api/own' || !request.headers.get(KEY_HEADER)) return undefined
  if (info.asker !== 'program') return Response.json({ ok: false, error: 'programs only' }, { status: 403 })
  const body = request.method === 'POST' ? await request.text() : ''
  return Response.json(
    { ok: true, method: request.method, key: request.headers.get(KEY_HEADER), asker: info.asker, ticket: info.ticket, body, host: info.url.host },
    { headers: { 'x-door': 'own' } },
  )
}
