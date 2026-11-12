import { describe, expect, test } from 'bun:test'

import {
  CONFIDENT_MATCHES,
  PERSON_METHODS,
  SERVER_METHODS,
  actNeedsPress,
  agentTaskView,
  agentTasksSchema,
  candidatesIn,
  confidentMatch,
  conversationsBringParams,
  conversationsFinderSchema,
  inboxAdoptParams,
  inboxAdoptionResult,
  inboxItemSchema,
  methodParams,
  methodResults,
  sameConversationPlace,
  serverAskSchema,
  serviceDescriptor,
  servicesSchema,
} from '../src/index.js'
import { vouchHost } from '../src/serve/index.js'

const ADOPTING = ['inbox.adoption', 'inbox.adopt', 'inbox.adoptWith', 'inbox.untrack', 'inbox.undo'] as const

describe('adopting an Inbox item (2.88.0)', () => {
  test('page-only acts: none is a server method, every act but the read on a fresh press', () => {
    for (const method of ADOPTING) {
      expect(PERSON_METHODS as readonly string[]).toContain(method)
      expect(SERVER_METHODS as readonly string[]).not.toContain(method)
      expect(serverAskSchema.safeParse({ module: 'kehikot.inbox', pass: 'x'.repeat(32), method, params: {} }).success).toBe(false)
      expect(methodParams[method]).toBeDefined()
      expect(methodResults[method]).toBeDefined()
    }
    for (const method of ['inbox.adopt', 'inbox.adoptWith', 'inbox.untrack', 'inbox.undo']) expect(actNeedsPress(method, {})).toBe(true)
    expect(actNeedsPress('inbox.adoption', {})).toBe(false)
  })
  test('an item may be adoptable and say what the last act did; an older item reads as before', () => {
    const base = { module: 'kehikko.trackers', id: 'x', by: 'Tracker', state: 'attention', label: 'l', entered: 1 }
    expect(inboxItemSchema.parse(base).adoptable).toBe(false)
    const after = inboxItemSchema.parse({ ...base, adoptable: false, after: { said: 'Added to Auth', undo: true } })
    expect(after.after).toEqual({ said: 'Added to Auth', undo: true })
  })
  test('adopt names an epic and parts; the adoption read carries epics, a suggestion, candidates and a proposal', () => {
    expect(inboxAdoptParams.safeParse({ module: 'kehikko.trackers', id: 'x', epic: 'auth', parts: ['login'] }).success).toBe(true)
    expect(inboxAdoptParams.safeParse({ module: 'kehikko.trackers', id: 'x', epic: 'Not A Slug' }).success).toBe(false)
    const read = inboxAdoptionResult.parse({
      outcome: 'ok',
      item: { ref: '!4721', title: 'Fix login', url: 'https://g/x', repo: 'g/x', host: 'g' },
      epics: [{ epic: 'auth', title: 'Auth', parts: [{ id: 'login', name: 'Login' }], refs: ['!1'] }],
      suggested: { epic: 'auth', why: 'the same repository as its other refs', sure: true },
      conversations: [{ module: 'kehikot.claude', program: 'Claude Code', session: 's1', title: 'Fix login', lastActive: 5, match: 'created', reason: 'created !4721', comes: true }],
    })
    expect(read.agent).toBeNull()
    expect(read.proposal).toBeNull()
    expect(read.suggested?.parts).toEqual([])
  })
  test('only created, pushed and branch are confident', () => {
    expect([...CONFIDENT_MATCHES]).toEqual(['created', 'pushed', 'branch'])
    expect(confidentMatch('folder')).toBe(false)
    expect(confidentMatch('mentioned')).toBe(false)
  })
})

describe('conversations.finder and agent.tasks (2.88.0)', () => {
  test('descriptors parse in a manifest', () => {
    const finder = { name: 'Claude', program: 'Claude Code', find: '/api/conversations/find', bring: '/api/conversations/bring' }
    const tasks = { name: 'Claude', program: 'Claude Code', start: '/api/tasks/start', view: '/app?session={session}' }
    expect(serviceDescriptor('conversations.finder', finder)).toEqual(finder)
    expect(serviceDescriptor('agent.tasks', tasks)).toEqual(tasks)
    expect(servicesSchema.safeParse({ 'conversations.finder': finder, 'agent.tasks': tasks }).success).toBe(true)
    expect(conversationsFinderSchema.safeParse({ ...finder, find: 'https://elsewhere/x' }).success).toBe(false)
    expect(agentTasksSchema.safeParse({ ...tasks, view: '/app' }).success).toBe(false)
    expect(agentTaskView(tasks, 'a b')).toBe('/app?session=a%20b')
  })
  test('candidates: the ones that parse, strongest match first, then newest', () => {
    const got = candidatesIn({
      conversations: [
        { session: 'a', title: 'A', match: 'folder', lastActive: 9, reason: 'worked in this repository' },
        { session: 'b', title: 'B', match: 'created', lastActive: 1, reason: 'created !4721' },
        { session: 'c', match: 'nonsense' },
        { session: 'd', title: 'D', match: 'created', lastActive: 3, reason: 'created !4721', place: { epic: 'auth', parts: [], kehikko: null } },
      ],
    })
    expect(got.map((one) => one.session)).toEqual(['d', 'b', 'a'])
    expect(got[0]!.place?.epic).toBe('auth')
    expect(candidatesIn('nope')).toEqual([])
  })
  test('bring is a compare-and-set; places compare with parts in any order', () => {
    expect(conversationsBringParams.safeParse({ project: '/p', session: 's', to: { epic: 'auth', parts: ['a'] }, from: null }).success).toBe(true)
    expect(sameConversationPlace({ epic: 'a', parts: ['x', 'y'], kehikko: null }, { epic: 'a', parts: ['y', 'x'], kehikko: null })).toBe(true)
    expect(sameConversationPlace(null, null)).toBe(true)
    expect(sameConversationPlace(null, { epic: null, parts: [], kehikko: null })).toBe(false)
  })
  test('vouchHost: only the host caller, with a pass the host confirms at its origin', async () => {
    const env = { KEHIKOT_ORIGINS: 'http://127.0.0.1:4170' }
    const asked: string[] = []
    const fetch = (async (url: string) => {
      asked.push(url)
      return new Response(JSON.stringify({ ok: true, minted: url.includes('good') }), { status: 200 })
    }) as unknown as typeof globalThis.fetch
    const pass = (p: string) => p.padEnd(32, 'x')
    expect((await vouchHost({ 'x-kehikot-caller': 'kehikot.other', 'x-kehikot-pass': pass('good') }, { env, fetch })).ok).toBe(false)
    expect((await vouchHost({ 'x-kehikot-caller': 'kehikko', 'x-kehikot-pass': pass('good') }, { env, fetch })).ok).toBe(true)
    expect(asked[0]).toStartWith('http://127.0.0.1:4170/host/server-pass?pass=good')
    expect((await vouchHost({ 'x-kehikot-caller': 'kehikko', 'x-kehikot-pass': pass('bad') }, { env, fetch })).ok).toBe(false)
  })
})
