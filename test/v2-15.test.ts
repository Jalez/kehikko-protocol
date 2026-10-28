import { describe, expect, test } from 'bun:test'

import {
  DOOR_METHODS,
  DOOR_CAPABILITIES,
  PACKAGE_VERSION,
  PROTOCOL,
  SETTINGS_PATH,
  doorMethodParams,
  manifestSchema,
  offersDoorCapability,
  settingFieldSchema,
  settingValueIssue,
  settingsDeclarationSchema,
  settingsGetResult,
  settingsSetRefusal,
  settingsSetResult,
  settingsValues,
  type SettingField,
} from '../src/index.js'
import { hostVouchUrls, hostVouches, settingsDoor } from '../src/serve/index.js'

/** 2.15.0: a module declares its settings; a host draws them and asks the module to read and change them. */

const minimal = {
  kind: 'kehikot.module',
  protocol: 2,
  id: 'kehikot.factory',
  name: 'Factory',
  entry: '/app',
  modes: [{ id: 'factory', label: 'Factory' }],
  partless: 'It runs jobs.',
}

const FIELDS: SettingField[] = settingsDeclarationSchema.parse([
  { key: 'judgeMerges', label: 'Let the judge merge', type: 'boolean', default: false, personOnly: true },
  { key: 'defaultRule', label: 'Ready for another review', type: 'string', default: 'when they ask' },
  { key: 'rounds', label: 'Rounds', type: 'number', default: 3 },
  { key: 'door', label: 'Door', type: 'choice', choices: [{ value: 'one-way', label: 'One-way' }, { value: 'two-way', label: 'Two-way' }], default: 'one-way' },
  { key: 'rules', label: 'Door rules', type: 'list', default: [] },
  { key: 'hook', label: 'Report outside sessions', type: 'boolean', default: false, scope: 'machine' },
])

describe('the version', () => {
  test('is 2.18.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.31.0')
    expect(PROTOCOL).toBe(2)
  })
})

describe('declares.settings', () => {
  test('a manifest without it parses as before', () => {
    const parsed = manifestSchema.parse(minimal)
    expect(parsed.declares.settings).toBeUndefined()
    expect(offersDoorCapability(parsed, 'settings')).toBe(false)
  })

  test('a manifest with it keeps every field, with scope and personOnly defaulted', () => {
    const parsed = manifestSchema.parse({ ...minimal, declares: { settings: [{ key: 'a', label: 'A', type: 'boolean', default: true }] } })
    expect(parsed.declares.settings).toEqual([{ key: 'a', label: 'A', description: '', type: 'boolean', default: true, scope: 'project', personOnly: false }])
    expect(offersDoorCapability(parsed, 'settings')).toBe(true)
  })

  test('a list that does not parse is dropped, not fatal', () => {
    const parsed = manifestSchema.parse({ ...minimal, declares: { settings: [{ key: 'A', label: 'x', type: 'boolean', default: 1 }] } })
    expect(parsed.declares.settings).toBeUndefined()
  })

  test('each type parses, and the declaration refuses what it should', () => {
    expect(FIELDS.map((one) => one.type)).toEqual(['boolean', 'string', 'number', 'choice', 'list', 'boolean'])
    const bad = (field: Record<string, unknown>) => settingFieldSchema.safeParse({ key: 'k', label: 'K', ...field }).success
    expect(bad({ type: 'choice', default: 'a' })).toBe(false)
    expect(bad({ type: 'boolean', default: false, choices: [{ value: 'a', label: 'A' }] })).toBe(false)
    expect(bad({ type: 'choice', default: 'a', choices: [{ value: 'a', label: 'A' }, { value: 'a', label: 'B' }] })).toBe(false)
    expect(bad({ type: 'number', default: '3' })).toBe(false)
    expect(bad({ type: 'list', default: [1] })).toBe(false)
    expect(settingFieldSchema.safeParse({ key: 'constructor', label: 'K', type: 'boolean', default: false }).success).toBe(false)
    expect(settingFieldSchema.safeParse({ key: 'Upper', label: 'K', type: 'boolean', default: false }).success).toBe(false)
    expect(settingsDeclarationSchema.safeParse([FIELDS[0], FIELDS[0]]).success).toBe(false)
  })
})

describe('the door methods', () => {
  test('are filed under the settings capability', () => {
    expect(DOOR_METHODS).toEqual({ 'settings.get': 'settings', 'settings.set': 'settings' })
    expect(Object.keys(DOOR_CAPABILITIES)).toEqual(['settings'])
    expect(SETTINGS_PATH).toBe('/api/kehikot/settings')
  })

  test('settings.set is an agent unless it says otherwise, and needs an absolute project', () => {
    expect(doorMethodParams['settings.set'].parse({ key: 'a', value: 1 }).by).toBe('agent')
    expect(doorMethodParams['settings.set'].safeParse({ key: 'a', value: 1, project: 'relative' }).success).toBe(false)
    expect(doorMethodParams['settings.set'].safeParse({ key: 'a', value: 1, pass: 'short' }).success).toBe(false)
  })

  test('the answers parse', () => {
    expect(settingsGetResult.parse({ values: { a: 1 }, file: '.kehikot/factory/settings.json' }).file).toBe('.kehikot/factory/settings.json')
    expect(settingsSetResult.parse({ outcome: 'saved' })).toEqual({ outcome: 'saved', why: '' })
    expect(settingsSetResult.safeParse({ outcome: 'maybe' }).success).toBe(false)
  })
})

describe('the one rule', () => {
  test('a value of each type', () => {
    expect(settingValueIssue(FIELDS[0]!, true)).toBeNull()
    expect(settingValueIssue(FIELDS[0]!, 'true')).not.toBeNull()
    expect(settingValueIssue(FIELDS[2]!, Number.NaN)).not.toBeNull()
    expect(settingValueIssue(FIELDS[3]!, 'two-way')).toBeNull()
    expect(settingValueIssue(FIELDS[3]!, 'three-way')).toContain('"one-way"')
    expect(settingValueIssue(FIELDS[4]!, ['a', 'b'])).toBeNull()
    expect(settingValueIssue(FIELDS[4]!, ['a', 2])).not.toBeNull()
  })

  test('refuses an unknown key, a person-only setting for an agent, a project setting without a project', () => {
    const project = '/tmp/p'
    expect(settingsSetRefusal(FIELDS, { key: 'nope', value: 1, project }, true)).toContain('"judgeMerges"')
    expect(settingsSetRefusal(FIELDS, { key: 'judgeMerges', value: true, project }, false)).toContain('An agent cannot change it')
    expect(settingsSetRefusal(FIELDS, { key: 'judgeMerges', value: true, project }, true)).toBeNull()
    expect(settingsSetRefusal(FIELDS, { key: 'rounds', value: 4 }, false)).toContain('Name the project')
    expect(settingsSetRefusal(FIELDS, { key: 'hook', value: true }, false)).toBeNull()
  })

  test('settingsValues fills defaults and drops what was not declared', () => {
    expect(settingsValues(FIELDS, { judgeMerges: true, rounds: 'x', extra: 1 })).toEqual({
      judgeMerges: true, defaultRule: 'when they ask', rounds: 3, door: 'one-way', rules: [], hook: false,
    })
  })
})

describe('settingsDoor', () => {
  const PASS = 'p'.repeat(32)
  const make = (vouched: boolean) => {
    const store: Record<string, unknown> = { judgeMerges: false }
    const asked: unknown[] = []
    const door = settingsDoor({
      module: 'kehikot.factory',
      fields: FIELDS,
      ticket: 'the-ticket',
      read: () => ({ values: { ...store }, file: '.kehikot/factory/settings.json' }),
      write: (_project, key, value) => {
        if (key === 'defaultRule' && value === 'no') return 'Not that one.'
        store[key] = value
        return null
      },
      vouch: async (pass, about) => {
        asked.push({ pass, about })
        return vouched
      },
    })
    return { door, store, asked }
  }
  const post = (body: Record<string, unknown>, ticket: string | null = null) => ({ method: 'POST', body, ticket })
  const call = async (door: ReturnType<typeof make>['door'], one: { method: string; body?: Record<string, unknown>; ticket?: string | null; query?: string }) =>
    (await door(one.method, '/api/kehikot/settings', new URLSearchParams(one.query ?? ''), one.body ?? null, one.ticket ?? null)) as { status: number; body: Record<string, unknown> }

  test('is not every path', async () => {
    expect(await make(false).door('GET', '/api/other', new URLSearchParams(), null, null)).toBeNull()
  })

  test('get answers every value and the file', async () => {
    const said = await call(make(false).door, { method: 'GET', query: 'project=/tmp/p' })
    expect(said.status).toBe(200)
    expect(said.body.file).toBe('.kehikot/factory/settings.json')
    expect((said.body.values as Record<string, unknown>).rounds).toBe(3)
  })

  test('an agent sets an ordinary setting, and not a person-only one', async () => {
    const { door, store } = make(false)
    const saved = await call(door, post({ project: '/tmp/p', key: 'rounds', value: 5 }))
    expect(saved.body.outcome).toBe('saved')
    expect(store.rounds).toBe(5)
    const refused = await call(door, post({ project: '/tmp/p', key: 'judgeMerges', value: true }))
    expect(refused.body.outcome).toBe('refused')
    expect(store.judgeMerges).toBe(false)
  })

  test('saying "person" is not enough: the pass has to be vouched for', async () => {
    const no = make(false)
    const said = await call(no.door, post({ project: '/tmp/p', key: 'judgeMerges', value: true, by: 'person', pass: PASS }))
    expect(said.body.outcome).toBe('refused')
    expect(no.asked).toEqual([{ pass: PASS, about: { module: 'kehikot.factory', key: 'judgeMerges', project: '/tmp/p' } }])
    const without = await call(no.door, post({ project: '/tmp/p', key: 'judgeMerges', value: true, by: 'person' }))
    expect(without.body.outcome).toBe('refused')
    const yes = make(true)
    expect((await call(yes.door, post({ project: '/tmp/p', key: 'judgeMerges', value: true, by: 'person', pass: PASS }))).body.outcome).toBe('saved')
    expect(yes.store.judgeMerges).toBe(true)
  })

  test("the module page's ticket is the person", async () => {
    const { door, store, asked } = make(false)
    expect((await call(door, post({ project: '/tmp/p', key: 'judgeMerges', value: true }, 'the-ticket'))).body.outcome).toBe('saved')
    expect(store.judgeMerges).toBe(true)
    expect(asked).toEqual([])
  })

  test("the store's own refusal is said, and a malformed call is 400", async () => {
    const { door } = make(true)
    const said = await call(door, post({ project: '/tmp/p', key: 'defaultRule', value: 'no' }))
    expect(said.body).toEqual({ ok: true, outcome: 'refused', why: 'Not that one.' })
    expect((await call(door, post({ value: 1 }))).status).toBe(400)
    expect((await call(door, { method: 'DELETE' })).status).toBe(405)
  })
})

describe('hostVouches', () => {
  const about = { module: 'kehikot.factory', key: 'judgeMerges', project: '/tmp/p' }
  const env = { KEHIKOT_ORIGINS: 'http://127.0.0.1:4500 https://example.com' }
  test('asks loopback origins only, with the pass and what it is for', () => {
    expect(hostVouchUrls('x'.repeat(24), about, env)).toEqual([
      `http://127.0.0.1:4500/host/settings-pass?pass=${'x'.repeat(24)}&module=kehikot.factory&key=judgeMerges&project=%2Ftmp%2Fp`,
    ])
  })
  test('is true only for person: true, and fails closed', async () => {
    const answering = (body: unknown) => (async () => new Response(JSON.stringify(body))) as unknown as typeof fetch
    expect(await hostVouches('x'.repeat(24), about, { env, fetch: answering({ ok: true, person: true }) })).toBe(true)
    expect(await hostVouches('x'.repeat(24), about, { env, fetch: answering({ ok: true, person: false }) })).toBe(false)
    expect(await hostVouches('x'.repeat(24), about, { env, fetch: answering({ person: true }) })).toBe(false)
    expect(await hostVouches('short', about, { env, fetch: answering({ ok: true, person: true }) })).toBe(false)
    const throwing = (async () => { throw new Error('down') }) as unknown as typeof fetch
    expect(await hostVouches('x'.repeat(24), about, { env, fetch: throwing })).toBe(false)
  })
})
