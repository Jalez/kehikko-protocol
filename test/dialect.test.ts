import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  EXTENSION_NAMES,
  LEGACY_MANIFEST_KIND,
  LEGACY_WELL_KNOWN,
  MANIFEST_KIND,
  MESSAGE,
  PROTOCOL,
  WELL_KNOWN,
  canonicalMessage,
  canonicalModuleId,
  dialectOfKind,
  dialectOfType,
  hostMessageSchema,
  known,
  legacyManifest,
  legacyModuleId,
  looksLikeWireMessage,
  manifestSchema,
  methodParams,
  moduleFolder,
  moduleMessageSchema,
  schemaFor,
  toDialect,
} from '../src/index.js'
import { connect, type MessageSource } from '../src/client/index.js'
import { DEFAULT_FRAME_ORIGINS, frameAncestors, frameOrigins, neighbourPorts, readManifest, registerAt, registryDir } from '../src/serve/index.js'

/*
 * The rename from "roadmap" to Kehikot, end to end: one canonical spelling
 * inside, both read on the way in, and the other side's spelling on the way
 * out. See `src/dialect.ts`.
 */

describe('the names', () => {
  test('are kehikot. now, everywhere', () => {
    for (const type of Object.values(MESSAGE)) expect(type.startsWith('kehikot.')).toBe(true)
    expect(MANIFEST_KIND).toBe('kehikot.module')
    expect(WELL_KNOWN).toBe('/.well-known/kehikot-module.json')
    expect(EXTENSION_NAMES).toEqual(['kehikot.notifications@1', 'kehikot.calls@1'])
  })

  test('and the old ones are spelled once each, for reading', () => {
    expect(LEGACY_MANIFEST_KIND).toBe('roadmap.module')
    expect(LEGACY_WELL_KNOWN).toBe('/.well-known/roadmap-module.json')
  })

  test('a module id is one module under either spelling', () => {
    expect(canonicalModuleId('roadmap.journeys')).toBe('kehikot.journeys')
    expect(canonicalModuleId('kehikot.journeys')).toBe('kehikot.journeys')
    expect(canonicalModuleId('acme.charts')).toBe('acme.charts')
    expect(legacyModuleId('kehikot.journeys')).toBe('roadmap.journeys')
    expect(moduleFolder('roadmap.journeys')).toBe(moduleFolder('kehikot.journeys'))
  })

  test('which dialect a type or a manifest kind is in', () => {
    expect(dialectOfType('roadmap.hello')).toBe('roadmap')
    expect(dialectOfType('kehikot.hello')).toBe('kehikot')
    expect(dialectOfType('vite:hmr')).toBe(null)
    expect(dialectOfKind('roadmap.module')).toBe('roadmap')
    expect(dialectOfKind('kehikot.module')).toBe('kehikot')
  })
})

describe('receiving the old spelling', () => {
  test('both prefixes get past the cheap filter, and nothing else does', () => {
    expect(looksLikeWireMessage({ type: 'roadmap.ready' })).toBe(true)
    expect(looksLikeWireMessage({ type: 'kehikot.ready' })).toBe(true)
    expect(looksLikeWireMessage({ type: 'webpackOk' })).toBe(false)
  })

  test('a module message in the old dialect parses into the new one', () => {
    const ready = moduleMessageSchema.parse({ type: 'roadmap.ready', id: 'roadmap.notes', protocol: 2 })
    expect(ready).toEqual({ type: MESSAGE.READY, id: 'kehikot.notes', protocol: 2 })
    const resize = moduleMessageSchema.parse({ type: 'roadmap.resize', height: 300 })
    expect(resize.type).toBe(MESSAGE.RESIZE)
  })

  test('a host message in the old dialect parses into the new one', () => {
    const event = hostMessageSchema.parse({
      type: 'roadmap.event',
      protocol: PROTOCOL,
      extension: 'roadmap.notifications@1',
      payload: {},
      from: 'roadmap.paper',
      at: '2026-10-05T10:00:00Z',
    })
    expect(event).toMatchObject({ type: MESSAGE.EVENT, extension: 'kehikot.notifications@1', from: 'kehikot.paper' })
    const hello = hostMessageSchema.parse({
      type: 'roadmap.hello',
      protocol: PROTOCOL,
      session: 's',
      context: { containers: [{ module: 'roadmap.notes' }] },
    })
    expect(hello.type).toBe(MESSAGE.HELLO)
    expect((hello as { context: { containers: { module: string }[] } }).context.containers[0]?.module).toBe('kehikot.notes')
  })

  test('an emitted extension in the old spelling is known, and is checked against the same schema', () => {
    expect(known('roadmap.notifications@1')).toBe(true)
    expect(schemaFor('roadmap.calls@1')).toBe(schemaFor('kehikot.calls@1'))
    expect(methodParams['events.emit'].parse({ extension: 'roadmap.notifications@1', payload: {} }).extension).toBe(
      'kehikot.notifications@1',
    )
  })
})

describe('sending in the other side’s dialect', () => {
  test('to an old party: the type, the ids and the extension names are respelled', () => {
    expect(toDialect({ type: MESSAGE.READY, id: 'kehikot.notes', protocol: 2 }, 'roadmap')).toEqual({
      type: 'roadmap.ready',
      id: 'roadmap.notes',
      protocol: 2,
    })
    expect(
      toDialect({ type: MESSAGE.EVENT, extension: 'kehikot.calls@1', from: 'kehikot.paper', payload: { a: 1 } }, 'roadmap'),
    ).toEqual({ type: 'roadmap.event', extension: 'roadmap.calls@1', from: 'roadmap.paper', payload: { a: 1 } })
    expect(
      toDialect({ type: MESSAGE.CONTEXT, containers: [{ module: 'kehikot.notes', selected: true }] }, 'roadmap'),
    ).toEqual({ type: 'roadmap.context', containers: [{ module: 'roadmap.notes', selected: true }] })
    expect(
      toDialect({ type: MESSAGE.HELLO, context: { epic: null, containers: [{ module: 'kehikot.a' }] } }, 'roadmap'),
    ).toEqual({ type: 'roadmap.hello', context: { epic: null, containers: [{ module: 'roadmap.a' }] } })
    expect(
      toDialect({ type: MESSAGE.REQUEST, id: '1', method: 'events.emit', params: { extension: 'kehikot.calls@1' } }, 'roadmap'),
    ).toEqual({ type: 'roadmap.request', id: '1', method: 'events.emit', params: { extension: 'roadmap.calls@1' } })
  })

  test('to a current party nothing changes, and the input is never edited', () => {
    const message = { type: MESSAGE.READY, id: 'kehikot.notes', protocol: 2 }
    expect(toDialect(message, 'kehikot')).toEqual(message)
    toDialect(message, 'roadmap')
    expect(message.type).toBe(MESSAGE.READY)
    expect(canonicalMessage({ type: 'roadmap.ready', id: 'roadmap.x1' })).toEqual({ type: MESSAGE.READY, id: 'kehikot.x1' })
  })

  test('anything that is not a message passes through untouched', () => {
    expect(toDialect(null, 'roadmap')).toBe(null)
    expect(toDialect('roadmap.hello', 'roadmap')).toBe('roadmap.hello')
  })
})

function fakeWindow() {
  const listeners = new Set<(ev: MessageEvent) => void>()
  const source: MessageSource = {
    parent: {} as Window,
    addEventListener: (_type, fn) => listeners.add(fn),
    removeEventListener: (_type, fn) => listeners.delete(fn),
  }
  const deliver = (ev: { data: unknown; origin?: string; source?: unknown }) => {
    for (const fn of [...listeners]) fn(ev as unknown as MessageEvent)
  }
  return { source, deliver }
}

function speaker() {
  const said: unknown[] = []
  return { postMessage: (message: unknown) => said.push(message), said }
}

describe('a module built against this package', () => {
  const greet = (type: string, from: unknown) => ({
    data: { type, protocol: PROTOCOL, session: 's', context: { epic: null } },
    origin: 'null',
    source: from,
  })

  test('answers an old host in the old dialect, under its old id', async () => {
    const { source, deliver } = fakeWindow()
    const host = speaker()
    const live = connect('kehikot.notes', {}, { source }).listen()
    deliver(greet('roadmap.hello', host))
    live.resize(400)
    void live.request('epics.list', {}).catch(() => {})
    expect(host.said[0]).toEqual({ type: 'roadmap.ready', id: 'roadmap.notes', protocol: PROTOCOL })
    expect((host.said[1] as { type: string }).type).toBe('roadmap.resize')
    expect((host.said[2] as { type: string }).type).toBe('roadmap.request')
    live.stop()
  })

  test('answers a current host in the current dialect', () => {
    const { source, deliver } = fakeWindow()
    const host = speaker()
    const live = connect('kehikot.notes', {}, { source }).listen()
    deliver(greet('kehikot.hello', host))
    expect(host.said[0]).toEqual({ type: 'kehikot.ready', id: 'kehikot.notes', protocol: PROTOCOL })
    live.stop()
  })

  test('hears an old host’s context and events, canonically', () => {
    const { source, deliver } = fakeWindow()
    const host = speaker()
    const contexts: unknown[] = []
    const events: unknown[] = []
    const live = connect('kehikot.notes', { onContext: (c) => contexts.push(c), onEvent: (e) => events.push(e) }, { source }).listen()
    deliver(greet('roadmap.hello', host))
    deliver({ data: { type: 'roadmap.context', protocol: PROTOCOL, epic: 'e', containers: [{ module: 'roadmap.paper' }] }, source: host })
    deliver({
      data: {
        type: 'roadmap.event',
        protocol: PROTOCOL,
        extension: 'roadmap.notifications@1',
        payload: {},
        from: 'roadmap.paper',
        at: '2026-10-05T10:00:00Z',
      },
      source: host,
    })
    expect((contexts[0] as { containers: { module: string }[] }).containers[0]?.module).toBe('kehikot.paper')
    expect(events[0]).toMatchObject({ extension: 'kehikot.notifications@1', from: 'kehikot.paper' })
    live.stop()
  })
})

describe('manifests', () => {
  const written = {
    kind: 'roadmap.module',
    protocol: 2,
    id: 'roadmap.notes',
    name: 'Notes',
    entry: '/app',
    modes: [{ id: 'notes', label: 'Notes' }],
    extensions: { emits: ['roadmap.notifications@1'], consumes: [] },
  }

  test('an old manifest is read, keeps its kind, and is otherwise canonical', () => {
    const manifest = manifestSchema.parse(written)
    expect(manifest.kind).toBe('roadmap.module')
    expect(manifest.id).toBe('kehikot.notes')
    expect(manifest.extensions.emits).toEqual(['kehikot.notifications@1'])
  })

  test('legacyManifest is what an old host expects to find at the old path', () => {
    const manifest = manifestSchema.parse({ ...written, kind: MANIFEST_KIND, id: 'kehikot.notes' })
    const old = legacyManifest(manifest)
    expect(old.kind).toBe('roadmap.module')
    expect(old.id).toBe('roadmap.notes')
    expect(old.extensions.emits).toEqual(['roadmap.notifications@1'])
    expect(manifest.kind).toBe('kehikot.module')
    expect(manifestSchema.parse(old).id).toBe('kehikot.notes')
  })

  test('the port-claimer recognises an old module as the same module', () => {
    expect(readManifest(JSON.stringify({ kind: 'roadmap.module', id: 'roadmap.notes' }))).toEqual({
      at: 'module',
      id: 'kehikot.notes',
    })
    expect(readManifest(JSON.stringify({ kind: 'something.else', id: 'x' })).at).toBe('stranger')
  })
})

describe('the registry', () => {
  test('lives in the Kehikot machine directory unless told otherwise', () => {
    expect(registryDir({ KEHIKOT_MODULES_DIR: '/a' })).toBe('/a')
    expect(registryDir({ ROADMAP_MODULES_DIR: '/b' })).toBe('/b')
    expect(registryDir({ KEHIKOT_MODULES_DIR: '/a', ROADMAP_MODULES_DIR: '/b' })).toBe('/a')
    const home = registryDir({ HOME: '/h', XDG_DATA_HOME: '/x' })
    expect(home).toBe(process.platform === 'darwin' ? '/h/Library/Application Support/Kehikot/modules' : '/x/kehikot/modules')
  })

  test('a module registering under its new id keeps what its old file said, and leaves the old file alone', () => {
    const where = mkdtempSync(join(tmpdir(), 'kehikot-modules-'))
    const before = process.env.KEHIKOT_MODULES_DIR
    process.env.KEHIKOT_MODULES_DIR = where
    try {
      const old = JSON.stringify({ url: 'http://127.0.0.1:7900', dir: '/m', keep: true })
      writeFileSync(join(where, 'roadmap.terminal.json'), old)
      const written = registerAt({ id: 'kehikot.terminal', origin: 'http://127.0.0.1:7901', dir: '/m' })
      expect(written.was).toEqual({ url: 'http://127.0.0.1:7900', dir: '/m' })
      expect(JSON.parse(readFileSync(join(where, 'kehikot.terminal.json'), 'utf8'))).toEqual({
        keep: true,
        url: 'http://127.0.0.1:7901',
        dir: '/m',
      })
      expect(readFileSync(join(where, 'roadmap.terminal.json'), 'utf8')).toBe(old)
    } finally {
      if (before === undefined) delete process.env.KEHIKOT_MODULES_DIR
      else process.env.KEHIKOT_MODULES_DIR = before
    }
  })

  test('a module’s own old registration is not a neighbour', () => {
    const where = mkdtempSync(join(tmpdir(), 'kehikot-modules-'))
    mkdirSync(where, { recursive: true })
    writeFileSync(join(where, 'roadmap.notes.json'), JSON.stringify({ url: 'http://127.0.0.1:7940' }))
    writeFileSync(join(where, 'roadmap.paper.json'), JSON.stringify({ url: 'http://127.0.0.1:7950' }))
    expect([...neighbourPorts('kehikot.notes', where)]).toEqual([7950])
  })
})

describe('who may frame a module', () => {
  test('the list a host passes wins', () => {
    expect(frameOrigins({ KEHIKOT_ORIGINS: 'http://127.0.0.1:4181  tauri://localhost', KEHIKOT_ORIGIN: 'http://x' })).toEqual([
      'http://127.0.0.1:4181',
      'tauri://localhost',
    ])
  })

  test('then the single origin, under either name', () => {
    expect(frameOrigins({ KEHIKOT_ORIGIN: 'http://a' })).toEqual(['http://a'])
    expect(frameOrigins({ ROADMAP_ORIGIN: 'http://b' })).toEqual(['http://b'])
  })

  test('and otherwise every origin a host here serves from', () => {
    expect(frameOrigins({})).toEqual([...DEFAULT_FRAME_ORIGINS])
    expect(DEFAULT_FRAME_ORIGINS).toContain('http://127.0.0.1:4181')
    expect(DEFAULT_FRAME_ORIGINS).toContain('http://127.0.0.1:4170')
    expect(DEFAULT_FRAME_ORIGINS).toContain('tauri://localhost')
    expect(frameAncestors({ KEHIKOT_ORIGINS: 'http://a http://b' })).toBe("frame-ancestors 'self' http://a http://b")
  })
})
