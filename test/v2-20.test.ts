import { describe, expect, test } from 'bun:test'

import {
  CAPABILITIES,
  LIMITS,
  METHODS,
  MODULE_ICONS,
  PACKAGE_VERSION,
  PROTOCOL,
  SERVER_METHODS,
  SERVER_PROJECT_METHODS,
  TRAFFIC_REDACTED,
  looksSecret,
  methodParams,
  resultSchemaFor,
  serverAskSchema,
  trafficCallSchema,
  trafficCommand,
  trafficNoteSchema,
  trafficPath,
  trafficReadResult,
  trafficTarget,
} from '../src/index.js'
import { askHost, trafficNotes } from '../src/serve/index.js'

/**
 * 2.20.0: traffic. The host's record of the calls Kehikot and its modules make and receive
 * (`traffic.read`, `traffic:read`), a module's own calls noted with their reasons (`traffic.note`,
 * `traffic:report`, and `trafficNotes` in `/serve`), and the one sanitizer both sides use.
 */

const PASS = 'p'.repeat(40)
const ENV = { KEHIKOT_ORIGINS: 'http://127.0.0.1:8021' }

describe('the version', () => {
  test('is 2.20.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.42.0')
    expect(PROTOCOL).toBe(2)
  })
})

describe('the capabilities and methods', () => {
  test('each method is filed under its own capability', () => {
    expect(METHODS['traffic.read']).toBe('traffic:read')
    expect(METHODS['traffic.note']).toBe('traffic:report')
    expect(CAPABILITIES['traffic:read']).toContain('never what they carried')
    expect(CAPABILITIES['traffic:report']).toContain('reason')
  })

  test('traffic.read: from a seq, bounded, sampling only when asked', () => {
    expect(methodParams['traffic.read'].parse({})).toEqual({ since: 0, limit: 1000, sample: false })
    expect(methodParams['traffic.read'].parse({ since: 12, limit: 5, sample: true })).toEqual({ since: 12, limit: 5, sample: true })
    expect(methodParams['traffic.read'].safeParse({ limit: LIMITS.TRAFFIC_KEPT + 1 }).success).toBe(false)
    expect(methodParams['traffic.read'].safeParse({ since: -1 }).success).toBe(false)
  })

  test('traffic.note: one to TRAFFIC_NOTE calls', () => {
    const call = { at: 1, kind: 'GET', host: 'api.example.com', path: '/x' }
    expect(methodParams['traffic.note'].safeParse({ calls: [] }).success).toBe(false)
    expect(methodParams['traffic.note'].safeParse({ calls: Array(LIMITS.TRAFFIC_NOTE + 1).fill(call) }).success).toBe(false)
    const parsed = methodParams['traffic.note'].parse({ calls: [call] })
    expect(parsed.calls[0]).toEqual({ ...call, ms: null, reason: null, status: null, ok: null })
  })

  test('both answers have a shape', () => {
    expect(resultSchemaFor('traffic.read')).toBe(trafficReadResult)
    expect(resultSchemaFor('traffic.note')?.parse({ outcome: 'taken', taken: 2 })).toEqual({ outcome: 'taken', taken: 2, why: '' })
  })

  test('a read answer fills its defaults; an old host’s extra field is kept out', () => {
    const read = trafficReadResult.parse({ calls: [], newest: 0, oldest: 0, kept: 5000, started: 1 })
    expect(read).toEqual({ calls: [], newest: 0, oldest: 0, gap: false, kept: 5000, started: 1, budgets: [], processes: null })
  })

  test('a row says who, which part, which way and who says so', () => {
    const row = { seq: 1, at: 2, kind: 'GET', host: 'h', path: '/', by: 'kehikko', via: 'server', side: 'out', reported: 'host' }
    expect(trafficCallSchema.parse(row).reason).toBeNull()
    expect(trafficCallSchema.safeParse({ ...row, side: 'sideways' }).success).toBe(false)
    expect(trafficCallSchema.safeParse({ ...row, reported: 'anyone' }).success).toBe(false)
    expect(trafficCallSchema.safeParse({ ...row, cache: 'not-modified' }).success).toBe(true)
    expect(trafficNoteSchema.safeParse({ ...row, reason: 'x'.repeat(LIMITS.TRAFFIC_REASON + 1) }).success).toBe(false)
  })

  test('the Monitor’s icon', () => expect(MODULE_ICONS).toContain('lucide:activity'))
})

describe('sanitizing an address', () => {
  test('query values go, keys stay, the fragment goes', () => {
    expect(trafficTarget('https://api.github.com/repos/a/b/releases?per_page=5&page=2#top')).toEqual({
      host: 'api.github.com',
      path: `/repos/a/b/releases?per_page=${TRAFFIC_REDACTED}&page=${TRAFFIC_REDACTED}`,
    })
  })

  test('a token in the query is never kept', () => {
    const said = trafficTarget('https://example.com/hook?access_token=ghp_abcdefghijklmnopqrstuvwxyz0123456789')
    expect(JSON.stringify(said)).not.toContain('ghp_')
    expect(said.path).toBe(`/hook?access_token=${TRAFFIC_REDACTED}`)
  })

  test('the user and password go', () => {
    const said = trafficTarget('https://x-access-token:ghs_SECRETSECRETSECRET1234@github.com/owner/repo.git')
    expect(said).toEqual({ host: 'github.com', path: '/owner/repo.git' })
    expect(JSON.stringify(said)).not.toContain('SECRET')
  })

  test('a token in the path goes', () => {
    expect(trafficTarget('https://hooks.example.com/services/glpat-abcdefghijklmnop1234/run').path).toBe(`/services/${TRAFFIC_REDACTED}/run`)
    expect(trafficTarget('https://raw.githubusercontent.com/o/r/0123456789abcdef0123456789abcdef01234567/package.json').path).toBe(
      `/o/r/${TRAFFIC_REDACTED}/package.json`,
    )
    expect(trafficPath('/a/eyJhbGciOiJIUzI1.eyJzdWIiOiIxMjM0.SflKxwRJSMeKKF2QT4/b')).toBe(`/a/${TRAFFIC_REDACTED}/b`)
  })

  test('a query key that is itself a secret goes whole', () => {
    expect(trafficPath('/x?ghp_abcdefghijklmnopqrstuvwxyz0123=1&a=2')).toBe(`/x?a=${TRAFFIC_REDACTED}`)
  })

  test('ordinary words are kept', () => {
    expect(trafficPath('/host/tracker?project=…&epic=x')).toBe(`/host/tracker?project=${TRAFFIC_REDACTED}&epic=${TRAFFIC_REDACTED}`)
    expect(trafficPath('/repos/Jalez/kehikko-module-template/releases')).toBe('/repos/Jalez/kehikko-module-template/releases')
    expect(looksSecret('kehikot-module-protocol.git')).toBe(false)
    expect(looksSecret('v2.20.0')).toBe(false)
  })

  test('git’s scp form, a bare host, a port, and nonsense', () => {
    expect(trafficTarget('git@github.com:owner/repo.git')).toEqual({ host: 'github.com', path: '/owner/repo.git' })
    expect(trafficTarget('gitlab.example.com')).toEqual({ host: 'gitlab.example.com', path: '' })
    expect(trafficTarget('http://127.0.0.1:8021/host/call')).toEqual({ host: '127.0.0.1:8021', path: '/host/call' })
    expect(trafficTarget('not an address at all')).toEqual({ host: '', path: '' })
    expect(trafficTarget('')).toEqual({ host: '', path: '' })
  })

  test('bounded', () => {
    expect(trafficPath(`/${'a/'.repeat(400)}`).length).toBeLessThanOrEqual(LIMITS.TRAFFIC_PATH)
  })
})

describe('a program run', () => {
  test('git over the network: the remote, sanitized; a named remote as written', () => {
    expect(trafficCommand(['git', '-C', '/p', 'fetch', '--quiet', 'origin'])).toEqual({ kind: 'git fetch', host: '', path: 'origin' })
    expect(trafficCommand(['git', 'ls-remote', '--tags', 'https://u:ghp_abcdefghijklmnopqrstuvwxyz0123@github.com/a/b.git', 'refs/tags/app-v*'])).toEqual({
      kind: 'git ls-remote',
      host: 'github.com',
      path: '/a/b.git',
    })
    expect(trafficCommand(['git', 'clone', '--quiet', 'git@github.com:a/b.git', '/tmp/b'])).toEqual({ kind: 'git clone', host: 'github.com', path: '/a/b.git' })
  })

  test('git on the disk is not traffic', () => {
    expect(trafficCommand(['git', '-C', '/p', 'rev-parse', 'HEAD'])).toBeNull()
    expect(trafficCommand(['git', '-C', '/p', 'remote', 'get-url', 'origin'])).toBeNull()
  })

  test('gh and glab: the API path, or the command and never its arguments', () => {
    expect(trafficCommand(['gh', 'api', '-H', 'Accept: x', 'repos/a/b/contents/manifest.ts?ref=main'])).toEqual({
      kind: 'gh api',
      host: 'api.github.com',
      path: `/repos/a/b/contents/manifest.ts?ref=${TRAFFIC_REDACTED}`,
    })
    const created = trafficCommand(['gh', 'issue', 'create', '--repo', 'a/b', '--title=Private words', '--body-file', '-'])
    expect(created).toEqual({ kind: 'gh issue create', host: 'api.github.com', path: '' })
    expect(JSON.stringify(created)).not.toContain('Private')
    expect(trafficCommand(['glab', 'api', '--hostname', 'gitlab.example.com', 'projects/1/issues'])).toEqual({
      kind: 'glab api',
      host: 'gitlab.example.com',
      path: '/projects/1/issues',
    })
    expect(trafficCommand(['gh', 'auth', 'status'])).toBeNull()
    expect(trafficCommand(['ls', '-la'])).toBeNull()
  })
})

describe('a server question about this computer', () => {
  test('traffic names no project; a tracker question still has to', () => {
    expect(SERVER_METHODS).toContain('traffic.read')
    expect(SERVER_METHODS).toContain('traffic.note')
    /* 2.21.0 added the epic's own material, every one of it a project's (see v2-21). */
    expect(SERVER_PROJECT_METHODS.slice(0, 2)).toEqual(['tracker.get', 'tracker.columns'])
    expect(SERVER_PROJECT_METHODS).not.toContain('traffic.read' as never)
    expect(serverAskSchema.safeParse({ module: 'kehikot.monitor', pass: PASS, method: 'traffic.read' }).success).toBe(true)
    expect(serverAskSchema.safeParse({ module: 'kehikot.kanban', pass: PASS, method: 'tracker.get', params: { epic: 'e' } }).success).toBe(false)
  })

  test('askHost sends no project when it was given none', async () => {
    let body: Record<string, unknown> = {}
    const fake = (async (_url: string, init?: RequestInit) => {
      body = JSON.parse(String(init?.body))
      return Response.json({ ok: true, data: { outcome: 'taken', taken: 1 } })
    }) as unknown as typeof fetch
    const said = await askHost('traffic.note', { calls: [] }, { module: 'kehikot.paper', env: ENV, fetch: fake })
    expect(said).toEqual({ ok: true, data: { outcome: 'taken', taken: 1, why: '' } })
    expect(body).not.toHaveProperty('project')
    expect(body.method).toBe('traffic.note')
  })
})

describe('trafficNotes, a module’s server noting its calls', () => {
  const answering = (status = 200, headers: Record<string, string> = {}) =>
    (async () => new Response('{"secret":"body"}', { status, headers })) as unknown as typeof fetch

  test('a traced fetch is noted with its reason, sanitized, and sent in one batch', async () => {
    const sent: unknown[][] = []
    let clock = 1000
    const traffic = trafficNotes({
      module: 'kehikot.paper',
      fetch: answering(200, { 'content-length': '17' }),
      now: () => (clock += 5),
      flushMs: 60_000,
      send: async (calls) => {
        sent.push(calls)
        return { ok: true, data: { outcome: 'taken', taken: calls.length, why: '' } }
      },
    })
    const response = await traffic.fetch('compile', 'https://latex.example.com/compile?token=s3cr3tT0k3n&x=1', { method: 'POST', body: 'abcd' })
    expect(response.status).toBe(200)
    expect(traffic.pending).toBe(1)
    await traffic.flush()
    expect(traffic.pending).toBe(0)
    expect(sent).toHaveLength(1)
    const [call] = sent[0] as Record<string, unknown>[]
    expect(call).toEqual({
      at: 1005,
      ms: 5,
      reason: 'compile',
      kind: 'POST',
      host: 'latex.example.com',
      path: `/compile?token=${TRAFFIC_REDACTED}&x=${TRAFFIC_REDACTED}`,
      status: 200,
      ok: true,
      bytesIn: 17,
      bytesOut: 4,
    })
    expect(JSON.stringify(sent)).not.toContain('s3cr3t')
    expect(JSON.stringify(sent)).not.toContain('secret')
    traffic.stop()
  })

  test('a 304 is a cache answer; a failure is noted and still thrown', async () => {
    const traffic = trafficNotes({ module: 'kehikot.paper', fetch: answering(304), flushMs: 60_000, send: async () => ({ ok: true, data: { outcome: 'taken', taken: 1, why: '' } }) })
    await traffic.fetch(null, 'https://api.example.com/x')
    const failing = trafficNotes({
      module: 'kehikot.paper',
      fetch: (async () => {
        throw new Error('offline')
      }) as unknown as typeof fetch,
      flushMs: 60_000,
      send: async () => ({ ok: true, data: { outcome: 'taken', taken: 1, why: '' } }),
    })
    await expect(failing.fetch('ping', 'https://api.example.com/x')).rejects.toThrow('offline')
    expect(traffic.pending).toBe(1)
    expect(failing.pending).toBe(1)
    traffic.stop()
    failing.stop()
  })

  test('no host answering keeps the notes; a refusal drops them', async () => {
    let answer: Awaited<ReturnType<typeof askHost<'traffic.note'>>> = { ok: false, why: 'No Kehikot host answered.' }
    const traffic = trafficNotes({ module: 'kehikot.paper', flushMs: 60_000, send: async () => answer })
    traffic.note({ reason: 'x', kind: 'GET', to: 'https://a.example.com/' })
    await traffic.flush()
    expect(traffic.pending).toBe(1)
    answer = { ok: false, why: 'not declared', reason: 'failed', refused: 'grant' }
    await traffic.flush()
    expect(traffic.pending).toBe(0)
    traffic.stop()
  })

  test('a program run is noted when it went over the network, and only then', async () => {
    const sent: Record<string, unknown>[] = []
    const traffic = trafficNotes({
      module: 'kehikot.history',
      flushMs: 60_000,
      now: () => 10_000,
      send: async (calls) => {
        sent.push(...(calls as unknown as Record<string, unknown>[]))
        return { ok: true, data: { outcome: 'taken', taken: calls.length, why: '' } }
      },
    })
    traffic.command('fetch the project', ['git', '-C', '/p', 'fetch', 'origin'], { ms: 400, code: 0 })
    traffic.command('status', ['git', '-C', '/p', 'status'], { ms: 4, code: 0 })
    await traffic.flush()
    expect(sent).toEqual([{ at: 9600, ms: 400, reason: 'fetch the project', kind: 'git fetch', host: '', path: 'origin', status: 0, ok: true }])
    traffic.stop()
  })

  test('at most TRAFFIC_NOTE a batch; the rest wait for the next', async () => {
    const sizes: number[] = []
    const traffic = trafficNotes({
      module: 'kehikot.paper',
      flushMs: 60_000,
      send: async (calls) => {
        sizes.push(calls.length)
        return { ok: true, data: { outcome: 'taken', taken: calls.length, why: '' } }
      },
    })
    for (let i = 0; i < LIMITS.TRAFFIC_NOTE + 3; i++) traffic.note({ reason: null, kind: 'GET', to: 'https://a.example.com/' })
    await traffic.flush()
    await traffic.flush()
    expect(sizes).toEqual([LIMITS.TRAFFIC_NOTE, 3])
    traffic.stop()
  })
})
