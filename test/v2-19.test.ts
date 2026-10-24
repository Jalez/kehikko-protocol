import { describe, expect, test } from 'bun:test'

import {
  LIMITS,
  PACKAGE_VERSION,
  PROTOCOL,
  SERVER_ASK_PATH,
  SERVER_METHODS,
  SERVER_PASS_PATH,
  manifestSchema,
  methodParams,
  serverAskResult,
  serverAskSchema,
  serverPassResult,
  trackerBranchSchema,
  trackerRowSchema,
} from '../src/index.js'
import { askHost, doorsFetch, hostAskUrls, mintServerPass, serverPassReply, spendServerPass } from '../src/serve/index.js'

/**
 * 2.19.0: a module's server asks the host what its page would be told (`askHost`, proved by a pass
 * the host checks at the module's own origin); `tracker.get { epic, parts: true }`; an issue's
 * linked branches on its row.
 */

const ROW = {
  ref: 'gh#12',
  tracker: 'github',
  host: 'github.com',
  repo: 'owner/repo',
  number: 12,
  kind: 'issue',
  state: 'open',
  title: 'A thing',
  url: 'https://github.com/owner/repo/issues/12',
  readAt: '2026-10-24T10:00:00.000Z',
}

describe('the version', () => {
  test('is 2.19.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.20.0')
    expect(PROTOCOL).toBe(2)
  })
})

describe('branches on a row', () => {
  test('a row without them parses as before: absent, not empty', () => {
    expect(trackerRowSchema.parse(ROW).branches).toBeUndefined()
  })

  test('a row with them keeps each name and url', () => {
    const branches = [{ name: '12-a-thing', url: 'https://github.com/owner/repo/tree/12-a-thing' }, { name: 'feat/x' }]
    expect(trackerRowSchema.parse({ ...ROW, branches }).branches).toEqual(branches)
    expect(trackerRowSchema.parse({ ...ROW, branches: [] }).branches).toEqual([])
  })

  test('is bounded', () => {
    const many = Array.from({ length: LIMITS.TRACKER_BRANCHES + 1 }, (_, i) => ({ name: `b${i}` }))
    expect(trackerRowSchema.safeParse({ ...ROW, branches: many }).success).toBe(false)
    expect(trackerBranchSchema.safeParse({ name: '' }).success).toBe(false)
    expect(trackerBranchSchema.safeParse({ name: 'x'.repeat(LIMITS.BRANCH + 1) }).success).toBe(false)
  })
})

describe('tracker.get with parts', () => {
  const get = methodParams['tracker.get']

  test('goes with an epic', () => {
    expect(get.parse({ epic: 'one', parts: true })).toEqual({ epic: 'one', parts: true, detail: 'summary' })
    expect(get.parse({ epic: 'one' }).parts).toBeUndefined()
  })

  test('is refused without one', () => {
    expect(get.safeParse({ refs: ['gh#1'], parts: true }).success).toBe(false)
    expect(get.safeParse({ project: true, parts: true }).success).toBe(false)
    expect(get.safeParse({ refs: ['gh#1'], parts: false }).success).toBe(true)
  })
})

describe('the shapes of a server question', () => {
  const pass = 'a'.repeat(32)

  test('a question names the module, a pass, an absolute project and a server method', () => {
    expect(serverAskSchema.parse({ module: 'kehikot.kanban', pass, project: '/p', method: 'tracker.get', params: { epic: 'e' } })).toEqual({
      module: 'kehikot.kanban',
      pass,
      project: '/p',
      method: 'tracker.get',
      params: { epic: 'e' },
    })
    expect(serverAskSchema.safeParse({ module: 'kehikot.kanban', pass, project: 'relative', method: 'tracker.get' }).success).toBe(false)
    expect(serverAskSchema.safeParse({ module: 'kehikot.kanban', pass: 'short', project: '/p', method: 'tracker.get' }).success).toBe(false)
    expect(serverAskSchema.safeParse({ module: 'kehikot.kanban', pass, project: '/p', method: 'parts.set' }).success).toBe(false)
  })

  test('only reads are a server’s to ask', () => {
    /* 2.20.0 added the traffic methods, which are about this computer (see v2-20). */
    expect([...SERVER_METHODS].slice(0, 2)).toEqual(['tracker.get', 'tracker.columns'])
    expect(SERVER_METHODS).not.toContain('parts.set' as never)
  })

  test('an answer is data or a refusal with a reason', () => {
    expect(serverAskResult.parse({ ok: true, data: { x: 1 } })).toEqual({ ok: true, data: { x: 1 } })
    expect(serverAskResult.parse({ ok: false, reason: 'failed', error: 'no', refused: 'grant' })).toEqual({ ok: false, reason: 'failed', error: 'no', refused: 'grant' })
    /* A refusal word a newer host adds is read as no word, not as no answer. */
    expect(serverAskResult.parse({ ok: false, reason: 'failed', error: 'no', refused: 'later' })).toEqual({ ok: false, reason: 'failed', error: 'no' })
  })
})

describe('a pass', () => {
  test('is good once', () => {
    const pass = mintServerPass()
    expect(spendServerPass(pass)).toBe(true)
    expect(spendServerPass(pass)).toBe(false)
  })

  test('is good for SERVER_PASS_MS', () => {
    const now = Date.now()
    const pass = mintServerPass(now)
    expect(spendServerPass(pass, now + LIMITS.SERVER_PASS_MS + 1)).toBe(false)
  })

  test('nobody else’s is ours, and a malformed one is not asked about', () => {
    expect(spendServerPass('b'.repeat(40))).toBe(false)
    expect(spendServerPass('not one')).toBe(false)
    expect(spendServerPass(null)).toBe(false)
  })

  test('the reply at SERVER_PASS_PATH, and nothing anywhere else', () => {
    const pass = mintServerPass()
    expect(serverPassReply('GET', SERVER_PASS_PATH, new URLSearchParams({ pass }))).toEqual({ status: 200, body: { ok: true, minted: true } })
    expect(serverPassReply('GET', SERVER_PASS_PATH, new URLSearchParams({ pass }))).toEqual({ status: 200, body: { ok: true, minted: false } })
    expect(serverPassReply('POST', SERVER_PASS_PATH, new URLSearchParams())?.status).toBe(405)
    expect(serverPassReply('GET', '/api/other', new URLSearchParams())).toBeNull()
  })
})

const MANIFEST = manifestSchema.parse({
  kind: 'kehikot.module',
  protocol: 2,
  id: 'kehikot.example',
  name: 'Example',
  entry: '/app',
  modes: [{ id: 'main', label: 'Main' }],
  partless: 'Nothing in it belongs to a part.',
})

describe('the doors answer for a pass', () => {
  /* A module whose own doors are only `/healthz`: the pass door is the protocol's, not the module's. */
  const doors = doorsFetch({
    manifest: MANIFEST,
    answer: () => null,
    page: { title: 'Example' },
    ours: (path) => path === '/healthz',
  })

  test('to a program on this machine', async () => {
    const pass = mintServerPass()
    const reply = await doors(new Request(`http://127.0.0.1:9/api/kehikot/server-pass?pass=${pass}`))
    expect(serverPassResult.parse(await reply!.json())).toEqual({ ok: true, minted: true })
  })

  test('never to a page on another origin', async () => {
    const pass = mintServerPass()
    /* happy-dom's `Request` will not let a script write `Origin`; put it on as the network would. */
    const request = new Request(`http://127.0.0.1:9/api/kehikot/server-pass?pass=${pass}`)
    const sent = new Map([['origin', 'https://elsewhere.example'], ['sec-fetch-site', 'cross-site']])
    Object.defineProperty(request, 'headers', { value: { get: (name: string) => sent.get(name.toLowerCase()) ?? null } })
    const reply = await doors(request)
    expect(reply!.status).toBe(403)
    /* And the pass was not spent by being refused. */
    expect(spendServerPass(pass)).toBe(true)
  })
})

describe('askHost', () => {
  const READING = { at: '2026-10-24T10:00:00.000Z', refreshing: false, sources: [], rows: [ROW], missing: [] }
  /* The module's doors, as the host reaches them at its registered origin. */
  const doors = doorsFetch({ manifest: MANIFEST, answer: () => null, page: { title: 'Example' } })
  const asked: unknown[] = []
  const answer = (body: unknown) => ({ json: async () => body }) as Response

  /*
   * Two hosts on this machine, in-process. The first holds no project: passed over. The second does
   * what a host does — asks the module at its origin whether it minted the pass, before anything else.
   */
  const ELSEWHERE = 'http://127.0.0.1:4101'
  const HOST = 'http://127.0.0.1:4102'
  const hosts = (async (url: string | URL | Request, init?: RequestInit) => {
    const at = String(url)
    if (at.startsWith(ELSEWHERE)) return answer({ ok: false, reason: 'failed', error: 'No project here.', refused: 'project' })
    if (!at.startsWith(HOST) || new URL(at).pathname !== SERVER_ASK_PATH) throw new Error('nobody there')
    const ask = serverAskSchema.parse(JSON.parse(String(init?.body)))
    asked.push(ask)
    const vouched = await doors(new Request(`http://127.0.0.1:4200${SERVER_PASS_PATH}?pass=${ask.pass}`))
    if (!serverPassResult.parse(await vouched!.json()).minted) return answer({ ok: false, reason: 'failed', error: 'Not vouched for.', refused: 'pass' })
    if (ask.params.epic === 'undeclared') return answer({ ok: false, reason: 'failed', error: 'Not declared.', refused: 'grant' })
    if (ask.params.epic === 'odd') return answer({ ok: true, data: { rows: 'not rows' } })
    return answer({ ok: true, data: READING })
  }) as typeof fetch
  const options = { module: 'kehikot.example', project: '/p', env: { KEHIKOT_ORIGINS: `${ELSEWHERE} ${HOST}` }, fetch: hosts }

  test('asks each origin, in order, at SERVER_ASK_PATH', () => {
    expect(hostAskUrls(options.env)).toEqual([`${ELSEWHERE}${SERVER_ASK_PATH}`, `${HOST}${SERVER_ASK_PATH}`])
  })

  test('gets the reading a page would get, from the host that holds the project', async () => {
    const read = await askHost('tracker.get', { epic: 'one', parts: true }, options)
    expect(read.ok).toBe(true)
    if (read.ok) expect(read.data.rows.map((row) => row.ref)).toEqual(['gh#12'])
    expect(asked.at(-1)).toMatchObject({ module: 'kehikot.example', project: '/p', method: 'tracker.get', params: { epic: 'one', parts: true } })
  })

  test('says a refusal in the host’s words', async () => {
    expect(await askHost('tracker.get', { epic: 'undeclared' }, options)).toEqual({ ok: false, why: 'Not declared.', reason: 'failed', refused: 'grant' })
  })

  test('an answer of another shape is not handed on', async () => {
    const read = await askHost('tracker.get', { epic: 'odd' }, options)
    expect(read.ok).toBe(false)
  })

  test('a pass it did not mint is not vouched for', async () => {
    const said = await hosts(`${HOST}${SERVER_ASK_PATH}`, {
      method: 'POST',
      body: JSON.stringify({ module: 'kehikot.example', pass: 'c'.repeat(40), project: '/p', method: 'tracker.get', params: {} }),
    })
    expect(await said.json()).toMatchObject({ ok: false, refused: 'pass' })
  })

  test('only a project-holding host is asked past: the last refusal is said when none holds it', async () => {
    const read = await askHost('tracker.columns', {}, { ...options, env: { KEHIKOT_ORIGINS: ELSEWHERE } })
    expect(read).toEqual({ ok: false, why: 'No project here.', reason: 'failed', refused: 'project' })
  })

  test('with no host answering, says so and never throws', async () => {
    const read = await askHost('tracker.columns', {}, { ...options, env: { KEHIKOT_ORIGINS: 'http://127.0.0.1:9' } })
    expect(read.ok).toBe(false)
    if (!read.ok) expect(read.refused).toBeUndefined()
  })
})
