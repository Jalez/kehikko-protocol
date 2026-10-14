import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import {
  EXTENSIONS,
  LIMITS,
  METHODS,
  helloSchema,
  headerItemsSchema,
  methodParams,
  notificationPayload,
  hostMessageSchema,
} from '../src/index.js'
import { holdingsIn, spokenIn } from '../src/holdings.js'
import {
  IS_PROJECT_PATH,
  holdingsSpoken,
  hostHasProject,
  hostIsProjectUrls,
  readHoldings,
  writeHoldings,
} from '../src/serve/index.js'
import { hostFields, hostStore } from '../src/client/host-store.js'

/**
 * 1.4.0: everything additive. Each addition is checked here, and against the 1.3.0 build, taken from
 * the tag in a temporary checkout, so "a 1.3.0 reader accepts it and strips what it does not know" is
 * parsed and not asserted. Skipped (loudly) where the tag is not in the clone.
 */

const HERE = dirname(new URL(import.meta.url).pathname)
const REPO = resolve(HERE, '..')
const made: string[] = []
const scratch = (): string => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'kehikot-v14-')))
  made.push(dir)
  return dir
}

let old: Record<string, any> | null = null
let oldHoldings: Record<string, any> | null = null
let oldServe: Record<string, any> | null = null
beforeAll(async () => {
  try {
    const dir = scratch()
    execFileSync('sh', ['-c', `git -C "${REPO}" archive v1.3.0 | tar -x -C "${dir}"`], { stdio: 'ignore' })
    symlinkSync(join(REPO, 'node_modules'), join(dir, 'node_modules'))
    old = await import(join(dir, 'src/index.ts'))
    oldHoldings = await import(join(dir, 'src/holdings.ts'))
    oldServe = await import(join(dir, 'src/serve/index.ts'))
  } catch {
    console.warn('v1.3.0 is not available here: the 1.3.0 compatibility checks are skipped')
  }
})
afterAll(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true })
})
const compat = (name: string, run: () => void | Promise<void>) =>
  test(`[against 1.3.0] ${name}`, async () => {
    if (old === null) return
    await run()
  })

const context = { project: 'p', projectPath: null, epic: null }

describe('1. the host says what it will answer (hello.answers)', () => {
  const hello = { type: 'kehikot.hello', protocol: 2, session: 's', context, state: null }
  test('optional: a greeting without it is still one, and the field is absent', () => {
    const read = helloSchema.parse(hello)
    expect(read.answers).toBeUndefined()
  })
  test('a list of method names, bounded', () => {
    expect(helloSchema.parse({ ...hello, answers: ['parts.set', 'view.goto'] }).answers).toEqual(['parts.set', 'view.goto'])
    expect(helloSchema.safeParse({ ...hello, answers: [] }).success).toBe(true)
    expect(helloSchema.safeParse({ ...hello, answers: Array(LIMITS.ANSWERS + 1).fill('a') }).success).toBe(false)
    expect(helloSchema.safeParse({ ...hello, answers: ['x'.repeat(LIMITS.METHOD + 1)] }).success).toBe(false)
    expect(helloSchema.safeParse({ ...hello, answers: [''] }).success).toBe(false)
  })
  test('it reaches the standing: null until a host says, then the list', () => {
    expect(hostStore('kehikot.x').get().answers).toBeNull()
    expect(hostStore('kehikot.x').get().drawsHeader).toBeNull()
  })
  compat('a 1.3.0 reader accepts a greeting that carries answers and header, and strips them', () => {
    const read = old!.helloSchema.parse({ ...hello, answers: ['parts.set'], header: true })
    expect(read.answers).toBeUndefined()
    expect(read.header).toBeUndefined()
    expect(old!.hostMessageSchema.safeParse({ ...hello, answers: ['parts.set'], header: true }).success).toBe(true)
  })
  test('hostFields is unaffected', () => {
    expect(hostFields(null).epic).toBeNull()
  })
})

describe('5. the host says whether it draws headers (hello.header)', () => {
  const hello = { type: 'kehikot.hello', protocol: 2, session: 's', context, state: null }
  test('optional boolean', () => {
    expect(helloSchema.parse(hello).header).toBeUndefined()
    expect(helloSchema.parse({ ...hello, header: true }).header).toBe(true)
    expect(helloSchema.parse({ ...hello, header: false }).header).toBe(false)
    expect(helloSchema.safeParse({ ...hello, header: 'yes' }).success).toBe(false)
  })
  test('is a host message', () => {
    expect(hostMessageSchema.safeParse({ ...hello, header: true }).success).toBe(true)
  })
})

describe('2. holdings remember who has spoken (published)', () => {
  const part = { documents: ['a.tex'], refs: [] }
  test('a call for an epic marks the kinds it gave lists for, kept when the lists are empty', () => {
    const root = scratch()
    writeHoldings(root, 'kehikot.paper', 'thesis', { intro: { documents: [] } })
    const file = JSON.parse(readFileSync(join(root, '.kehikot/paper/parts.json'), 'utf8'))
    expect(file.published).toEqual({ thesis: ['documents'] })
    expect(file.epics).toEqual({})
    expect(readHoldings(root)).toEqual({})
    expect(holdingsSpoken(root, 'thesis')).toEqual({ documents: true, refs: false })
    expect(holdingsSpoken(root, 'other')).toEqual({ documents: false, refs: false })
  })
  test('nothing at all given: both kinds were spoken for; an explicit published wins', () => {
    const root = scratch()
    writeHoldings(root, 'kehikot.paper', 'thesis', {})
    expect(holdingsSpoken(root, 'thesis')).toEqual({ documents: true, refs: true })
    const other = scratch()
    writeHoldings(other, 'kehikot.paper', 'thesis', {}, { published: ['refs'] })
    expect(holdingsSpoken(other, 'thesis')).toEqual({ documents: false, refs: true })
  })
  test('once spoken, spoken: a later call for fewer kinds does not take it back', () => {
    const root = scratch()
    writeHoldings(root, 'kehikot.paper', 'thesis', { a: { documents: ['x.tex'], refs: [] } })
    writeHoldings(root, 'kehikot.paper', 'thesis', { a: { documents: [] } })
    expect(holdingsSpoken(root, 'thesis')).toEqual({ documents: true, refs: true })
  })
  test('anybody: the union over modules', () => {
    const root = scratch()
    writeHoldings(root, 'kehikot.paper', 'thesis', {}, { published: ['documents'] })
    writeHoldings(root, 'kehikot.source', 'thesis', {}, { published: ['refs'] })
    expect(holdingsSpoken(root, 'thesis')).toEqual({ documents: true, refs: true })
  })
  test('a file written before 1.4.0 (no published) speaks for the kinds its parts hold', () => {
    expect(spokenIn({ version: 1, epics: { thesis: { a: part } } })).toEqual({ thesis: ['documents'] })
    expect(spokenIn({ version: 1, epics: {} })).toEqual({})
    expect(spokenIn(null)).toEqual({})
    expect(spokenIn({ published: { thesis: ['documents', 'nonsense', 'refs', 'refs'], 'Bad Slug': ['refs'] } })).toEqual({ thesis: ['documents', 'refs'] })
  })
  test('junk in published costs only itself', () => {
    expect(spokenIn({ published: [1, 2] })).toEqual({})
    expect(spokenIn({ published: { thesis: 'documents' } })).toEqual({})
  })
  test('the epics a file holds are unchanged by published', () => {
    expect(holdingsIn({ version: 1, epics: { thesis: { a: part } }, published: { thesis: ['documents'] } })).toEqual({ thesis: { a: part } })
  })
  compat('a 1.3.0 readHoldings reads a 1.4.0 file, ignoring published', () => {
    const root = scratch()
    writeHoldings(root, 'kehikot.paper', 'thesis', { a: { documents: ['a.tex'] } })
    expect(oldServe!.readHoldings(root)).toEqual(readHoldings(root))
    expect(oldHoldings!.holdingsIn(JSON.parse(readFileSync(join(root, '.kehikot/paper/parts.json'), 'utf8')))).toEqual({
      thesis: { a: { documents: ['a.tex'], refs: [] } },
    })
  })
  compat('a 1.3.0 writeHoldings keeps a 1.4.0 file’s published beside what it writes', () => {
    const root = scratch()
    writeHoldings(root, 'kehikot.paper', 'thesis', { a: { documents: ['a.tex'] } })
    oldServe!.writeHoldings(root, 'kehikot.paper', 'other', { b: { documents: ['b.tex'] } })
    const file = JSON.parse(readFileSync(join(root, '.kehikot/paper/parts.json'), 'utf8'))
    expect(file.published).toEqual({ thesis: ['documents'] })
    expect(Object.keys(file.epics).sort()).toEqual(['other', 'thesis'])
  })
})

describe('3. is this folder a host project (hostHasProject)', () => {
  const env = { KEHIKOT_ORIGINS: 'http://127.0.0.1:4170 tauri://localhost http://example.com:80 http://localhost:4171' }
  const answer = (body: unknown, ok = true) => async () => new Response(JSON.stringify(body), { status: ok ? 200 : 403 })
  test('names the route and asks loopback http origins only, in KEHIKOT_ORIGINS order', () => {
    expect(IS_PROJECT_PATH).toBe('/host/is-project')
    expect(hostIsProjectUrls('/a b', env)).toEqual([
      'http://127.0.0.1:4170/host/is-project?path=%2Fa%20b',
      'http://localhost:4171/host/is-project?path=%2Fa%20b',
    ])
  })
  test('true only when a host says project: true', async () => {
    expect(await hostHasProject('/p', { env, fetch: answer({ ok: true, project: true }) as never })).toBe(true)
    expect(await hostHasProject('/p', { env, fetch: answer({ ok: true, project: false }) as never })).toBe(false)
  })
  test('fails closed: junk, refusal, failure, relative path, no origin', async () => {
    expect(await hostHasProject('/p', { env, fetch: answer({ project: true }) as never })).toBe(false)
    expect(await hostHasProject('/p', { env, fetch: answer({ ok: true, project: true }, false) as never })).toBe(false)
    expect(await hostHasProject('/p', { env, fetch: (async () => { throw new Error('refused') }) as never })).toBe(false)
    expect(await hostHasProject('relative/p', { env, fetch: answer({ ok: true, project: true }) as never })).toBe(false)
    expect(await hostHasProject('/p', { env: { KEHIKOT_ORIGINS: 'tauri://localhost' }, fetch: answer({ ok: true, project: true }) as never })).toBe(false)
  })
  test('a second origin answers when the first is silent; a timeout is false', async () => {
    let calls = 0
    const second = (async (url: string) => {
      calls += 1
      if (url.includes(':4170')) throw new Error('down')
      return new Response(JSON.stringify({ ok: true, project: true }))
    }) as never
    expect(await hostHasProject('/p', { env, fetch: second })).toBe(true)
    expect(calls).toBe(2)
    const hangs = ((_: string, init: RequestInit) => new Promise((_, reject) => init.signal!.addEventListener('abort', () => reject(new Error('aborted'))))) as never
    expect(await hostHasProject('/p', { env: { KEHIKOT_ORIGINS: 'http://127.0.0.1:1' }, timeoutMs: 20, fetch: hangs })).toBe(false)
  })
})

describe('4. a notice names a place', () => {
  const note = { epic: 'thesis', message: 'done' }
  test('place is optional and bounded', () => {
    expect(notificationPayload.parse(note).place).toBeUndefined()
    const place = { epic: 'thesis', parts: ['methods', 'results'], kehikko: 'main' }
    expect(notificationPayload.parse({ ...note, place }).place).toEqual(place)
    expect(notificationPayload.safeParse({ ...note, place: { parts: Array(LIMITS.PLACE_PARTS + 1).fill('a') } }).success).toBe(false)
    expect(notificationPayload.safeParse({ ...note, place: { parts: ['Not A Part'] } }).success).toBe(false)
    expect(notificationPayload.safeParse({ ...note, place: { kehikko: 'Not a key' } }).success).toBe(false)
    expect(EXTENSIONS['kehikot.notifications@1']).toBeDefined()
  })
  test('view.goto takes parts and kehikko, with an epic', () => {
    const goto = methodParams['view.goto']
    expect(goto.safeParse({ epic: 'thesis', parts: ['methods'], kehikko: 'main' }).success).toBe(true)
    expect(goto.safeParse({ epic: 'thesis' }).success).toBe(true)
    expect(goto.safeParse({ parts: ['methods'] }).success).toBe(false)
    expect(goto.safeParse({ kehikko: 'main' }).success).toBe(false)
    expect(goto.safeParse({ step: 2, parts: ['methods'] }).success).toBe(false)
    expect(goto.safeParse({}).success).toBe(false)
  })
  compat('a 1.3.0 reader accepts a notice with a place and a view.goto with parts, and strips them', () => {
    const place = { epic: 'thesis', parts: ['methods'], kehikko: 'main' }
    const read = old!.notificationPayload.parse({ ...note, place })
    expect(read.place).toBeUndefined()
    const goto = old!.methodParams['view.goto'].parse({ epic: 'thesis', parts: ['methods'], kehikko: 'main' })
    expect(goto).toEqual({ epic: 'thesis' })
  })
})

describe('6. a run may ask for full screen (surface)', () => {
  const run = { kind: 'run', id: 'present', label: 'Present' }
  test('optional, one value', () => {
    expect(headerItemsSchema.parse([run])[0]).not.toHaveProperty('surface')
    expect((headerItemsSchema.parse([{ ...run, surface: 'fullscreen' }])[0] as { surface?: string }).surface).toBe('fullscreen')
    expect(headerItemsSchema.safeParse([{ ...run, surface: 'popup' }]).success).toBe(false)
  })
  test('other kinds drop it rather than carry it', () => {
    const parsed = headerItemsSchema.parse([{ kind: 'toggle', id: 't', label: 'T', checked: true, surface: 'fullscreen' }])
    expect(parsed[0]).not.toHaveProperty('surface')
  })
  compat('a 1.3.0 reader accepts a run with a surface and strips it', () => {
    const parsed = old!.headerItemsSchema.parse([{ ...run, surface: 'fullscreen' }])
    expect(parsed[0].surface).toBeUndefined()
    expect(parsed[0].id).toBe('present')
  })
})

describe('7. every method has a capability the host checks', () => {
  test('METHODS is the table the docs list', () => {
    const docs = readFileSync(join(REPO, 'docs/methods.md'), 'utf8')
    for (const [method, capability] of Object.entries(METHODS)) {
      expect(docs).toContain(`| \`${method}\` | \`${capability}\` |`)
    }
  })
  test('no source comment still says nothing checks a capability', () => {
    const src = readFileSync(join(REPO, 'src/methods.ts'), 'utf8')
    expect(src).not.toContain('nothing checks one')
  })
})

describe('what a 1.3.0 build never sent still parses', () => {
  test('1.3.0 payloads parse on 1.4.0', () => {
    if (old === null) return
    const hello = { type: 'kehikot.hello', protocol: 2, session: 's', context, state: null }
    expect(helloSchema.safeParse(hello).success).toBe(true)
    expect(old.helloSchema.safeParse(hello).success).toBe(true)
  })
})
