import { describe, expect, test } from 'bun:test'
import {
  DOOR_PLACE_SAYS,
  messageTools,
  placeWords,
  spaceWords,
  typedFrame,
  type AgentMessage,
} from '../src/index.js'
import { answerMessageTool } from '../src/serve/index.js'

describe('spaceWords (2.92.0)', () => {
  test('from a space, by names, with the ids on request', () => {
    const space = [{ id: 'auth', name: 'Auth' }, { id: 'login', name: 'Login' }]
    expect(spaceWords({ epic: 'auth', parts: ['login'], space })).toBe('space Auth › Login')
    expect(spaceWords({ epic: 'auth', parts: ['login'], space }, { ids: true })).toBe('space Auth › Login (auth/login)')
  })
  test('from the older epic and parts, the mapping read backwards', () => {
    expect(spaceWords({ epic: 'auth', parts: [] })).toBe('space auth')
    expect(spaceWords({ epic: 'auth', parts: ['login'] })).toBe('space auth › login')
    expect(spaceWords({ epic: 'auth', parts: ['login', 'errors'] })).toBe('space auth (sub-spaces login + errors)')
    expect(spaceWords({ epic: null, parts: [] })).toBe('no space')
  })
  test('ids alone say no ids twice', () => {
    expect(spaceWords({ epic: 'auth', parts: [], space: ['auth', 'login', 'errors'] }, { ids: true })).toBe('space auth › login › errors')
  })
})

describe('what agents read says spaces', () => {
  const place = { project: '/w/app', epic: 'auth', parts: [{ id: 'login', name: 'Login' }], kehikko: { key: 'k1', name: 'Main' } }
  test('the notes', () => {
    expect(placeWords(place)).toBe('project app (/w/app), space auth › Login (auth/login) on the kehikko "Main"')
    const deep = { ...place, space: [{ id: 'auth', name: 'Auth' }, { id: 'login', name: 'Login' }, { id: 'errors', name: 'Errors' }] }
    expect(placeWords(deep)).toContain('space Auth › Login › Errors (auth/login/errors)')
    expect(placeWords(deep)).not.toMatch(/\bepic\b|\bparts?\b/)
  })
  test('a marker', () => {
    const message = {
      id: 7, at: '2026-11-12T10:00:00Z', body: 'hi', thread: null, kind: 'note', choices: [], replyTo: null,
      to: { project: true },
      from: { module: 'kehikot.a', name: 'A', session: 's1', place: { epic: 'auth', parts: [], kehikko: 'k1', space: ['auth', 'login'] } },
    } as unknown as AgentMessage
    expect(typedFrame(message)).toBe('⟦A session · #7 · space auth › login, kehikko k1⟧')
  })
  test('a door', () => {
    expect(DOOR_PLACE_SAYS.unplaced).toContain('space')
    expect(DOOR_PLACE_SAYS.unplaced).not.toMatch(/\bepic\b/)
  })
  test('send_message leads with space and calls epic and parts older names', () => {
    const send = messageTools().find((one) => one.name === 'send_message')!
    expect(send.description).not.toMatch(/\bepic\b/)
    const place = ((send.inputSchema.properties as Record<string, any>).to.properties.place) as { description: string; properties: Record<string, { description: string }> }
    expect(Object.keys(place.properties)[0]).toBe('space')
    expect(place.description).toContain('space')
    expect(place.properties.epic!.description).toStartWith('Older name, still accepted')
    expect(place.properties.parts!.description).toStartWith('Older name, still accepted')
  })
  test('send_message fills epic from space', async () => {
    let sent: unknown = null
    const fetch = (async (_url: string, init: { body: string }) => {
      sent = JSON.parse(init.body)
      return new Response(JSON.stringify({ ok: true, result: { outcome: 'sent', id: 1 } }), { headers: { 'content-type': 'application/json' } })
    }) as unknown as typeof globalThis.fetch
    const original = globalThis.fetch
    globalThis.fetch = fetch
    try {
      await answerMessageTool('send_message', { body: 'hi', to: { place: { space: ['auth', 'login'] } } }, { module: 'kehikot.a', token: 't', origin: 'http://127.0.0.1:1' } as never)
    } finally {
      globalThis.fetch = original
    }
    expect(JSON.stringify(sent)).toContain('"place":{"space":["auth","login"],"epic":"auth"}')
  })
})
