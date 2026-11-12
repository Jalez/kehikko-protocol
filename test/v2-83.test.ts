import { describe, expect, test } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { readFileSync } from 'node:fs'

import {
  CHECKLIST_HOLDER,
  DIAGRAM_WRITER,
  DOCUMENT_PROPOSALS,
  PACKAGE_VERSION,
  REVIEW_DRAFTS,
  SERVICES,
  SERVICE_CALLER_HEADER,
  SERVICE_NAMES,
  SERVICE_PASS_HEADER,
  WORK_STATUS,
  documentRoot,
  documentsFolder,
  manifestSchema,
  providerOf,
  serviceDescriptor,
  workJobsIn,
} from '../src/index.js'
import { callerHeaders, callServiceTool, fetchService, vouchCaller } from '../src/serve/index.js'
import { serverPassReply } from '../src/serve/ask.js'

/** 2.83.0: services a consumer calls, and a module's server proving who calls. */

describe('the version', () => {
  test('is 2.83.0 and the entry declares its kind', () => {
    expect(PACKAGE_VERSION).toBe('2.87.0')
    const log = readFileSync(join(resolve(dirname(new URL(import.meta.url).pathname), '..'), 'CHANGELOG.md'), 'utf8')
    expect(log).toMatch(/## 2\.83\.0 — \d{4}-\d{2}-\d{2}\n\nKind: feature\n/)
  })
})

const DOCUMENT = { name: 'Pages', root: '.kehikot/pages/{epic}', main: 'main.tex', tools: { sections: 's', source: 'r', propose: 'p', proposals: 'l' } }
const DRAFTS = { name: 'Drafts', tools: { comment: 'c', propose: 'p', drop: 'd' }, send: '/api/runs/send' }
const LISTS = { name: 'Lists', tools: { list: 'a', create: 'b', add: 'c', hold: 'd', check: 'e' } }
const STATUS = { name: 'Works', jobs: '/api/jobs' }
const DIAGRAMS = { name: 'Drawings', tool: 'write_one', kinds: ['sequence', 'graph'] }

describe('the five services', () => {
  test('each is known with what it means, and its descriptor parses', () => {
    for (const [name, descriptor] of [
      [DOCUMENT_PROPOSALS, DOCUMENT],
      [REVIEW_DRAFTS, DRAFTS],
      [CHECKLIST_HOLDER, LISTS],
      [WORK_STATUS, STATUS],
      [DIAGRAM_WRITER, DIAGRAMS],
    ] as const) {
      expect(SERVICE_NAMES).toContain(name)
      expect(SERVICES[name].says.length).toBeGreaterThan(10)
      expect(serviceDescriptor(name, descriptor)).not.toBeNull()
    }
  })

  test('a document folder is relative to the project and says where the epic goes', () => {
    expect(serviceDescriptor(DOCUMENT_PROPOSALS, { ...DOCUMENT, root: '/abs/{epic}' })).toBeNull()
    expect(serviceDescriptor(DOCUMENT_PROPOSALS, { ...DOCUMENT, root: '../{epic}' })).toBeNull()
    expect(serviceDescriptor(DOCUMENT_PROPOSALS, { ...DOCUMENT, root: '.kehikot/pages' })).toBeNull()
    expect(documentRoot(DOCUMENT, 'auth')).toBe('.kehikot/pages/auth')
    expect(documentsFolder(DOCUMENT)).toBe('.kehikot/pages')
  })

  test('a route stays on the provider: /api/…, no URL, no ..', () => {
    expect(serviceDescriptor(WORK_STATUS, { ...STATUS, jobs: 'http://evil/api/jobs' })).toBeNull()
    expect(serviceDescriptor(WORK_STATUS, { ...STATUS, jobs: '/api/../x' })).toBeNull()
    expect(serviceDescriptor(REVIEW_DRAFTS, { ...DRAFTS, send: '/elsewhere' })).toBeNull()
    expect(serviceDescriptor(REVIEW_DRAFTS, { name: 'Drafts', tools: DRAFTS.tools })).not.toBeNull()
  })

  test('a manifest whose known descriptor does not parse loses the field and still runs', () => {
    const base = { kind: 'kehikot.module', protocol: 2, id: 'kehikot.pages', name: 'Pages', version: '1.0.0', entry: '/app', modes: [{ id: 'p', label: 'P', scope: 'project' }], mcp: { url: '/mcp', transport: 'http' }, extensions: { emits: [], consumes: [] }, health: '/healthz', partless: 'machine work', declares: { protocol: '>=2 <3', uses: [] } }
    expect(manifestSchema.parse({ ...base, services: { [DOCUMENT_PROPOSALS]: DOCUMENT } }).services).toBeTruthy()
    expect(manifestSchema.parse({ ...base, services: { [DOCUMENT_PROPOSALS]: { name: 'x' } } }).services).toBeUndefined()
  })

  test('providerOf takes the first provider whose descriptor parses', () => {
    const found = providerOf(WORK_STATUS, [
      { module: 'kehikot.a', name: 'A', descriptor: { name: 'A' }, placed: true },
      { module: 'kehikot.b', name: 'B', descriptor: STATUS, placed: false },
    ])
    expect(found?.module).toBe('kehikot.b')
    expect(found?.descriptor.jobs).toBe('/api/jobs')
  })

  test('workJobsIn reads the jobs that parse and nothing else', () => {
    expect(workJobsIn({ jobs: [{ id: 'j1', ref: 'o/r#1', stage: 'build', column: { bad: 1 } }, { id: '', stage: 'x' }, 'no'] })).toEqual([{ id: 'j1', ref: 'o/r#1', stage: 'build', column: undefined }])
    expect(workJobsIn(null)).toEqual([])
    expect(workJobsIn([{ id: 'j', stage: 's' }])).toEqual([])
  })
})

describe('who calls', () => {
  function registry(id: string, origin: string): string {
    const dir = mkdtempSync(join(tmpdir(), 'svc-'))
    writeFileSync(join(dir, `${id}.json`), JSON.stringify({ url: origin, dir: '/x' }))
    return dir
  }

  test('a pass this process minted is vouched for once, at the registered origin', async () => {
    const headers = callerHeaders('kehikot.caller')
    expect(headers[SERVICE_CALLER_HEADER]).toBe('kehikot.caller')
    const asked: string[] = []
    const fake = (async (url: string) => {
      asked.push(url)
      const u = new URL(url)
      const reply = serverPassReply('GET', u.pathname, u.searchParams)!
      return new Response(JSON.stringify(reply.body), { status: reply.status })
    }) as unknown as typeof fetch
    const where = registry('kehikot.caller', 'http://127.0.0.1:4999')
    expect(await vouchCaller(headers, { registry: where, fetch: fake })).toEqual({ ok: true, module: 'kehikot.caller' })
    expect(asked[0]).toStartWith('http://127.0.0.1:4999/api/kehikot/server-pass?pass=')
    expect((await vouchCaller(headers, { registry: where, fetch: fake })).ok).toBe(false)
  })

  test('no caller, no pass, or an unregistered caller is not vouched for', async () => {
    const where = registry('kehikot.caller', 'http://127.0.0.1:4999')
    expect((await vouchCaller({}, { registry: where })).ok).toBe(false)
    expect((await vouchCaller({ [SERVICE_CALLER_HEADER]: 'kehikot.caller' }, { registry: where })).ok).toBe(false)
    expect((await vouchCaller(new Headers({ [SERVICE_CALLER_HEADER]: 'kehikot.other', [SERVICE_PASS_HEADER]: 'a'.repeat(32) }), { registry: where })).ok).toBe(false)
  })
})

describe('calling a provider', () => {
  const MANIFEST = { kind: 'kehikot.module', protocol: 2, id: 'kehikot.pages', name: 'Pages', version: '1.0.0', entry: '/app', modes: [{ id: 'p', label: 'P', scope: 'project' }], mcp: { url: '/mcp', transport: 'http' }, extensions: { emits: [], consumes: [] }, health: '/healthz', partless: 'machine work', declares: { protocol: '>=2 <3', uses: [] } }

  function provider() {
    const dir = mkdtempSync(join(tmpdir(), 'svc-'))
    writeFileSync(join(dir, 'kehikot.pages.json'), JSON.stringify({ url: 'http://127.0.0.1:4998', dir: '/x' }))
    const seen: { url: string; init?: RequestInit }[] = []
    const fake = (async (url: string, init?: RequestInit) => {
      seen.push({ url, init })
      if (url.endsWith('/.well-known/kehikot-module.json')) return new Response(JSON.stringify(MANIFEST))
      if (url.endsWith('/mcp')) return new Response(JSON.stringify({ result: { content: [{ text: 'filed' }] } }))
      return new Response('{"ok":true}')
    }) as unknown as typeof fetch
    return { dir, seen, fake }
  }

  test('callServiceTool posts the named tool to the door, with who calls', async () => {
    const { dir, seen, fake } = provider()
    expect(await callServiceTool('kehikot.pages', 'p', { a: 1 }, { from: 'kehikot.caller', registry: dir, fetch: fake })).toEqual({ ok: true, text: 'filed' })
    const call = seen.find((one) => one.url.endsWith('/mcp'))!
    expect(JSON.parse(String(call.init?.body)).params).toEqual({ name: 'p', arguments: { a: 1 } })
    expect((call.init?.headers as Record<string, string>)[SERVICE_CALLER_HEADER]).toBe('kehikot.caller')
  })

  test('fetchService stays on the provider origin', async () => {
    const { dir, fake } = provider()
    const got = await fetchService('kehikot.pages', '/api/jobs?ref=1', { method: 'GET' }, { from: 'kehikot.caller', registry: dir, fetch: fake })
    expect(got.ok).toBe(true)
    expect((await fetchService('kehikot.pages', 'http://x/api', {}, { from: 'kehikot.caller', registry: dir, fetch: fake })).ok).toBe(false)
  })

  test('an unregistered provider is a sentence, not a throw', async () => {
    const { dir, fake } = provider()
    const got = await callServiceTool('kehikot.none', 'p', {}, { from: 'kehikot.caller', registry: dir, fetch: fake })
    expect(got.ok).toBe(false)
  })
})
