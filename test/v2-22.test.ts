import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  CAPABILITIES,
  CAPABILITY_SINCE,
  DECLARATION_NAMES,
  DECLARATION_SINCE,
  FIT_SAYS,
  MESSAGE,
  METHODS,
  METHOD_SINCE,
  PACKAGE_VERSION,
  PIECE_SAID,
  PROTOCOL,
  REMOVED,
  SERVER_METHODS,
  SERVER_METHOD_SINCE,
  SINCE_FLOOR,
  compareVersions,
  fitOf,
  fitSaid,
  hostTooOld,
  manifestSchema,
  needsOf,
  pieceSaid,
  responseSchema,
  serverAskResult,
  sinceOf,
  tooOldOf,
  versionSaid,
  type Capability,
  type Method,
} from '../src/index.js'
import { HostRefused, connect, type MessageSource } from '../src/client/index.js'
import { askHost } from '../src/serve/index.js'

/**
 * 2.22.0: every piece of the protocol knows the version it arrived in (`SINCE`), a manifest says
 * what it needs (`needsOf`), a module and a host are held to each other (`fitOf`, `fitSaid`), and a
 * call the host is too old for comes back as one typed result (`hostTooOld`).
 */

const ROOT = join(import.meta.dir, '..')
const fixture = (name: string): Record<string, unknown> =>
  JSON.parse(readFileSync(join(ROOT, 'test', 'fixtures', 'manifests', `${name}.json`), 'utf8')) as Record<string, unknown>

describe('the version', () => {
  test('is 2.22.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.34.0')
    expect(PROTOCOL).toBe(2)
  })
})

/* ------------------------------------------------------------------------ */

/** Each `## x.y.z` section of the changelog, by version. */
function changelogSections(): Map<string, string> {
  const text = readFileSync(join(ROOT, 'CHANGELOG.md'), 'utf8')
  const out = new Map<string, string>()
  const parts = text.split(/^## /m).slice(1)
  for (const part of parts) {
    const version = /^(\d+\.\d+\.\d+)/.exec(part)?.[1]
    if (version) out.set(version, part)
  }
  return out
}

/** What the changelog section that added a declaration says it as. */
const DECLARATION_MENTION: Record<string, string> = {
  'mcp.subjects': '`mcp.subjects`',
  'mcp.as': '`mcp.as`',
  'declares.skills': '`declares.skills',
  'declares.scopes': 'declares.scopes',
  'skills.needs': 'needs?: string[]',
  'declares.settings': '`declares.settings`',
  'declares.provides': '`declares.provides`',
  'declares.agentSessions': '`declares.agentSessions',
  'skills.needs.object': '`needs` holds an object',
  'agentSessions.installsSkills': '`agentSessions.installsSkills`',
  'declares.navigates': '`declares.navigates`',
  'modes.scope': '`modes[].scope`',
}

describe('SINCE', () => {
  test('names every method, capability and server method there is, and no other', () => {
    expect(Object.keys(METHOD_SINCE).sort()).toEqual(Object.keys(METHODS).sort())
    expect(Object.keys(CAPABILITY_SINCE).sort()).toEqual(Object.keys(CAPABILITIES).sort())
    expect(Object.keys(SERVER_METHOD_SINCE).sort()).toEqual([...SERVER_METHODS].sort())
    expect(Object.keys(PIECE_SAID.capabilities).sort()).toEqual(Object.keys(CAPABILITIES).sort())
    expect(Object.keys(PIECE_SAID.declarations).sort()).toEqual([...DECLARATION_NAMES].sort())
  })

  test('agrees with METHODS: a capability arrived with its oldest method', () => {
    for (const capability of Object.keys(CAPABILITIES) as Capability[]) {
      const methods = (Object.keys(METHODS) as Method[]).filter((method) => METHODS[method] === capability)
      const oldest = methods.map((method) => METHOD_SINCE[method]).sort(compareVersions)[0]
      expect([capability, oldest]).toEqual([capability, CAPABILITY_SINCE[capability]])
    }
  })

  test('a server could ask a method no earlier than its page could', () => {
    for (const method of SERVER_METHODS) expect(compareVersions(SERVER_METHOD_SINCE[method], METHOD_SINCE[method])).toBeGreaterThanOrEqual(0)
  })

  test('every version is one the changelog has, and its section names the piece', () => {
    const sections = changelogSections()
    const said = (version: string, needle: string) => {
      if (version === SINCE_FLOOR) return true
      const section = sections.get(version)
      expect([version, section === undefined]).toEqual([version, false])
      return (section ?? '').includes(needle)
    }
    for (const [method, version] of Object.entries(METHOD_SINCE)) expect([method, said(version, `\`${method}`)]).toEqual([method, true])
    for (const [capability, version] of Object.entries(CAPABILITY_SINCE)) {
      expect([capability, said(version, capability)]).toEqual([capability, true])
    }
    for (const [method, version] of Object.entries(SERVER_METHOD_SINCE)) {
      expect([method, said(version, 'SERVER_METHODS') && said(version, method)]).toEqual([method, true])
    }
    for (const [declaration, version] of Object.entries(DECLARATION_SINCE)) {
      expect([declaration, said(version, DECLARATION_MENTION[declaration] ?? '\u0000')]).toEqual([declaration, true])
    }
  })

  test('the pieces the design names say what the changelog says', () => {
    expect(DECLARATION_SINCE['declares.provides']).toBe('2.21.0')
    expect(DECLARATION_SINCE['declares.agentSessions']).toBe('2.21.0')
    expect(DECLARATION_SINCE['skills.needs.object']).toBe('2.21.0')
    expect(DECLARATION_SINCE['declares.settings']).toBe('2.15.0')
    expect(CAPABILITY_SINCE['address:open']).toBe('2.16.0')
    expect(CAPABILITY_SINCE['traffic:read']).toBe('2.20.0')
    expect(CAPABILITY_SINCE['parts:read']).toBe('2.21.0')
    expect(SERVER_METHOD_SINCE['steps.list']).toBe('2.21.0')
  })

  test('is read by name, and a stranger’s string is nothing', () => {
    expect(sinceOf('method', 'traffic.read')).toBe('2.20.0')
    expect(sinceOf('method', 'constructor')).toBeNull()
    expect(sinceOf('capability', 'made:up')).toBeNull()
    expect(pieceSaid('method', 'traffic.read')).toBe('the call log')
    expect(pieceSaid('capability', 'made:up')).toBe('made:up')
  })

  test('nothing has been removed in 2.x', () => {
    for (const table of Object.values(REMOVED)) expect(Object.keys(table)).toEqual([])
  })

  test('versions compare as numbers, and are said without a zero patch', () => {
    expect(compareVersions('2.9.0', '2.10.0')).toBeLessThan(0)
    expect(compareVersions('2.21.1', '2.21.0')).toBeGreaterThan(0)
    expect(versionSaid('2.21.0')).toBe('2.21')
    expect(versionSaid('2.21.1')).toBe('2.21.1')
  })
})

/* ------------------------------------------------------------------------ */

describe('needsOf, on the manifests real modules serve', () => {
  const REAL = ['claude', 'monitor', 'factory', 'journeys', 'terminal', 'review', 'checklist', 'paper']

  test('each still parses', () => {
    for (const name of REAL) expect([name, manifestSchema.safeParse(fixture(name)).success]).toEqual([name, true])
  })

  test('says the newest version each one needs', () => {
    const needs = Object.fromEntries(REAL.map((name) => [name, needsOf(fixture(name)).version]))
    expect(needs).toEqual({
      claude: '2.21.0',
      monitor: '2.20.0',
      factory: '2.21.0',
      journeys: '2.21.0',
      terminal: SINCE_FLOOR,
      review: '2.16.0',
      checklist: '2.16.0',
      paper: '2.21.0',
    })
  })

  test('lists what is above a host, newest first', () => {
    const claude = needsOf(fixture('claude'), '2.14.0')
    expect(claude.pieces.map((piece) => [piece.piece, piece.since])).toEqual([
      ['declares.agentSessions', '2.21.0'],
      ['declares.settings', '2.15.0'],
    ])
    expect(claude.built).toBe('2.21.0')
    expect(claude.unknown).toBe(false)
    expect(needsOf(fixture('monitor'), '2.19.0').pieces).toEqual([
      { kind: 'capability', piece: 'traffic:read', since: '2.20.0', said: 'the call log' },
    ])
    expect(needsOf(fixture('terminal'), '2.0.0').pieces).toEqual([])
  })

  test('every one fits this package', () => {
    for (const name of REAL) expect([name, fitOf(fixture(name)).fit]).toEqual([name, 'fits'])
  })

  test('on an older host, the one that needs more says so', () => {
    const monitor = fitOf(fixture('monitor'), { version: '2.19.0' })
    expect(monitor.fit).toBe('host-too-old')
    if (monitor.fit === 'host-too-old') expect(monitor.since).toBe('2.20.0')
    expect(fitSaid(monitor, 'Monitor')).toEqual({
      title: 'Monitor needs a newer Kehikot',
      line: 'It uses the call log, added in protocol 2.20.',
      action: 'Update Kehikot',
    })
    expect(fitOf(fixture('terminal'), { version: '2.19.0' }).fit).toBe('fits')
    expect(fitSaid(fitOf(fixture('claude'), { version: '2.14.0' }), 'Claude')?.line).toBe(
      'It uses agent sessions, added in protocol 2.21, and settings, added in protocol 2.15.',
    )
    expect(fitSaid(fitOf(fixture('factory'), { version: '2.8.0' }), 'Factory')?.line).toBe(
      "It uses an epic's parts from the host, added in protocol 2.21, and 2 more things this Kehikot does not have.",
    )
  })
})

/* ------------------------------------------------------------------------ */

describe('fitOf', () => {
  const base = () => ({ ...fixture('terminal') }) as Record<string, unknown> & { declares: Record<string, unknown> }

  test('a module built against a newer protocol number needs a newer host', () => {
    const fit = fitOf({ ...base(), protocol: 3, declares: { ...base().declares, protocol: '>=3' } })
    expect(fit.fit).toBe('host-too-old')
    expect(fitSaid(fit, 'Terminal')?.line).toBe('It was built against protocol 3; this Kehikot speaks protocol 2.')
  })

  test('a module below the host’s protocol number, or a range that stops below it, needs an update', () => {
    const older = fitOf({ ...base(), protocol: 1, declares: { ...base().declares, protocol: '>=1' } })
    expect(older.fit).toBe('module-too-old')
    expect(fitSaid(older, 'Terminal')).toEqual({
      title: 'Terminal needs an update',
      line: 'It was built against protocol 1; this Kehikot speaks protocol 2.',
      action: 'Update Terminal',
    })
    const range = fitOf({ ...base(), declares: { ...base().declares, protocol: '>=1 <2' } })
    expect(range.fit).toBe('module-too-old')
    expect(fitSaid(range, 'Terminal')?.line).toBe('It speaks protocol >=1 <2; this Kehikot speaks protocol 2.')
  })

  test('a range that starts above the host needs a newer host', () => {
    expect(fitOf({ ...base(), declares: { ...base().declares, protocol: '>=3' } }).fit).toBe('host-too-old')
  })

  test('a piece this package does not know counts when the module was built with a newer one', () => {
    const newer = { ...base(), declares: { ...base().declares, uses: ['parts:write'] }, build: { version: '1', started: 'now', protocol: '2.99.0', commit: null } }
    const fit = fitOf(newer)
    expect(fit.fit).toBe('host-too-old')
    if (fit.fit === 'host-too-old') expect(fit.since).toBe('2.99.0')
    expect(fitSaid(fit, 'Terminal')?.line).toBe('It uses parts:write, which this Kehikot does not know.')
  })

  test('…and is a typo when it was built with an older one', () => {
    const typo = { ...base(), declares: { ...base().declares, uses: ['trackers:raed'] }, build: { version: '1', started: 'now', protocol: '2.20.0', commit: null } }
    expect(fitOf(typo).fit).toBe('fits')
  })

  test('…and counts, with no version to name, when the module does not say what it was built with', () => {
    const fit = fitOf({ ...base(), declares: { ...base().declares, later: { on: true } } })
    expect(fit.fit).toBe('host-too-old')
    if (fit.fit === 'host-too-old') {
      expect(fit.since).toBeNull()
      expect(fit.missing.map((piece) => piece.piece)).toEqual(['declares.later'])
    }
  })

  test('reads the raw JSON a manifest is served as, even one this package cannot parse', () => {
    const raw = { kind: 'kehikot.module', protocol: 2, declares: { uses: ['traffic:read'] } }
    expect(manifestSchema.safeParse(raw).success).toBe(false)
    expect(needsOf(raw).version).toBe('2.20.0')
    expect(needsOf(null).version).toBe(SINCE_FLOOR)
  })

  test('object-form skill needs need 2.21.0', () => {
    const skilled = {
      ...base(),
      declares: { ...base().declares, skills: [{ name: 'plan', summary: '', version: '1', needs: [{ provides: 'steps' }] }] },
    }
    expect(needsOf(skilled, '2.12.0').pieces.map((piece) => piece.piece)).toEqual(['skills.needs.object'])
    expect(needsOf(skilled).version).toBe('2.21.0')
  })
})

/* ------------------------------------------------------------------------ */

describe('a call the host is too old for', () => {
  test('the words a module may show', () => {
    expect(FIT_SAYS.tooOld('2.21.0')).toBe('This needs Kehikot with protocol 2.21 or later.')
    expect(FIT_SAYS.tooOld(null)).toBe('This needs a newer Kehikot.')
  })

  test('the wire carries declined and since on a refusal, and an older shape still parses', () => {
    const said = responseSchema.parse({ type: MESSAGE.RESPONSE, id: 'a', ok: false, reason: 'unknown-method', error: 'x', declined: 'host-too-old', since: '2.21.0' })
    expect(said).toMatchObject({ declined: 'host-too-old', since: '2.21.0' })
    const older = responseSchema.parse({ type: MESSAGE.RESPONSE, id: 'a', ok: false, reason: 'unknown-method', error: 'x' })
    expect('declined' in older && older.declined).toBeFalsy()
    const odd = responseSchema.parse({ type: MESSAGE.RESPONSE, id: 'a', ok: false, reason: 'failed', error: 'x', declined: 'tired', since: 'soon' })
    expect(odd).toMatchObject({ declined: undefined, since: undefined })
    expect(serverAskResult.parse({ ok: false, reason: 'unknown-method', error: 'x', declined: 'host-too-old' })).toMatchObject({ declined: 'host-too-old' })
  })

  test('tooOldOf: a method this package knows and the host does not is newer than the host', () => {
    expect(tooOldOf('parts.get', { reason: 'unknown-method' })).toEqual({ outcome: 'declined', reason: 'host-too-old', since: '2.21.0' })
    expect(tooOldOf('made.up', { reason: 'unknown-method' })).toBeNull()
    expect(tooOldOf('made.up', { reason: 'unknown-method', declined: 'host-too-old' })).toEqual({ outcome: 'declined', reason: 'host-too-old', since: null })
    expect(tooOldOf('parts.get', { reason: 'failed' })).toBeNull()
    expect(tooOldOf('steps.list', { reason: 'unknown-method' }, 'serverMethod')?.since).toBe('2.21.0')
  })

  test('hostTooOld reads it off whatever a module holds', () => {
    const shape = { outcome: 'declined', reason: 'host-too-old', since: '2.21.0' }
    expect(hostTooOld(shape)).toEqual(shape as never)
    expect(hostTooOld(new HostRefused({ reason: 'unknown-method', error: '', declined: 'host-too-old', since: '2.20.0' }))?.since).toBe('2.20.0')
    expect(hostTooOld({ ok: false, why: '', declined: 'host-too-old', since: null })?.since).toBeNull()
    expect(hostTooOld(new HostRefused({ reason: 'failed', error: 'no' }))).toBeNull()
    expect(hostTooOld('host-too-old')).toBeNull()
  })

  test('the client turns an unknown-method refusal of a known method into host-too-old', async () => {
    const listeners = new Set<(ev: MessageEvent) => void>()
    const source: MessageSource = {
      parent: {} as Window,
      addEventListener: (_type, fn) => void listeners.add(fn),
      removeEventListener: (_type, fn) => void listeners.delete(fn),
    }
    const deliver = (data: unknown, from: unknown) => {
      for (const fn of [...listeners]) fn({ data, origin: 'null', source: from } as unknown as MessageEvent)
    }
    const said: { id: string }[] = []
    const host = { postMessage: (message: unknown) => void said.push(message as { id: string }) }
    const live = connect('kehikot.example', {}, { source })
    live.listen()
    deliver({ type: MESSAGE.HELLO, protocol: PROTOCOL, session: 's', context: { epic: 'e', project: null, theme: 'light' } }, host)

    const newer = live.request('parts.get', { epic: 'e' })
    deliver({ type: MESSAGE.RESPONSE, id: said.at(-1)!.id, ok: false, reason: 'unknown-method', error: 'No such method.' }, host)
    const refused = await newer.catch((error: unknown) => error)
    expect(refused).toBeInstanceOf(HostRefused)
    expect(hostTooOld(refused)).toEqual({ outcome: 'declined', reason: 'host-too-old', since: '2.21.0' })
    expect((refused as HostRefused).refusal.reason).toBe('unknown-method')

    const typo = live.request('parts.gte', { epic: 'e' })
    deliver({ type: MESSAGE.RESPONSE, id: said.at(-1)!.id, ok: false, reason: 'unknown-method', error: 'No such method.' }, host)
    expect(hostTooOld(await typo.catch((error: unknown) => error))).toBeNull()
    live.stop()
  })

  const answer = (body: unknown) => ({ json: async () => body }) as Response
  const options = (body: unknown) => ({
    module: 'kehikot.example',
    project: '/p',
    env: { KEHIKOT_ORIGINS: 'http://127.0.0.1:4102' },
    fetch: (async () => answer(body)) as unknown as typeof fetch,
  })

  test('askHost: a host before 2.22.0 that takes the method for a malformed question is too old', async () => {
    const older = { ok: false, error: "Not a question this host takes: method — Invalid enum value. Expected 'tracker.get' | 'tracker.columns', received 'steps.list'." }
    const read = await askHost('steps.list', { epic: 'e' }, options(older))
    expect(read).toEqual({ ok: false, why: 'This needs Kehikot with protocol 2.21 or later.', reason: 'unknown-method', declined: 'host-too-old', since: '2.21.0' })
    expect(hostTooOld(read)?.since).toBe('2.21.0')
  })

  test('askHost: a 2.22.0 host saying host-too-old, and an ordinary refusal left as it was', async () => {
    const declined = await askHost('parts.get', { epic: 'e' }, options({ ok: false, reason: 'unknown-method', error: 'Not here.', declined: 'host-too-old' }))
    expect(hostTooOld(declined)?.since).toBe('2.21.0')
    const grant = await askHost('parts.get', { epic: 'e' }, options({ ok: false, reason: 'failed', error: 'Not declared.', refused: 'grant' }))
    expect(grant).toEqual({ ok: false, why: 'Not declared.', reason: 'failed', refused: 'grant' })
    expect(hostTooOld(grant)).toBeNull()
  })
})
