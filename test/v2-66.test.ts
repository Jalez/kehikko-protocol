import { beforeEach, describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import { NOTES_VERSION, PACKAGE_VERSION, doorCarriesPlace, messagingLine, messagingUnlistedLine, sessionNotes } from '../src/index.js'
import { answerMessageTool, forgetMessageHosts, hostOnMessages, messageToolsFor } from '../src/serve/index.js'

/**
 * 2.66.0: a session's notes and its door agree about messaging. The notes promised send_message and
 * read_messages to a session whose door listed neither — one woken while the host could not answer
 * yet (the door asked once, at connect), or one whose door was the person's own entry with no token.
 */

const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..')
const TOKEN = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG'
const SELF = { module: 'kehikot.claude', name: 'Claude', door: 'kehikko-claude' }
const HOST = 'http://127.0.0.1:4889'

describe('the version', () => {
  test('is 2.66.0', () => {
    expect(PACKAGE_VERSION).toBe('2.86.0')
    expect(readFileSync(join(REPO, 'CHANGELOG.md'), 'utf8')).toContain('## 2.66.0')
    expect(readFileSync(join(REPO, 'docs/agent-messages.md'), 'utf8')).toContain('The notes and the door agree (2.66.0)')
  })
})

describe('the door lists the tools for its token', () => {
  let answer: () => unknown = () => ({ ok: true, data: { messages: [], unread: 0, you: null } })
  let asked: { token?: unknown }[] = []
  let down = false
  const fake = (async (_url: string, init?: RequestInit) => {
    if (down) throw new Error('ECONNREFUSED')
    const body = JSON.parse(String(init?.body)) as { params: { token?: unknown } }
    asked.push(body.params)
    return new Response(JSON.stringify(answer()), { headers: { 'content-type': 'application/json' } })
  }) as unknown as typeof fetch
  const options = { module: 'kehikot.claude', env: { KEHIKOT_ORIGINS: HOST }, fetch: fake }
  const names = async (token: string | null) => (await messageToolsFor(token, options)).map((tool) => tool.name)

  beforeEach(() => {
    forgetMessageHosts()
    down = false
    asked = []
    answer = () => ({ ok: true, data: { messages: [], unread: 0, you: null } })
  })

  test('with no host answering yet, it still lists them: the agent will not ask again', async () => {
    down = true
    expect(await hostOnMessages({ ...options, token: TOKEN })).toBe('not-now')
    expect(await names(TOKEN)).toEqual(['send_message', 'read_messages'])
  })

  test('while the host cannot place the token or vouch for the module yet, it lists them', async () => {
    answer = () => ({ ok: false, reason: 'failed', refused: 'project', error: 'That token is not one this host holds.' })
    expect(await names(TOKEN)).toEqual(['send_message', 'read_messages'])
    forgetMessageHosts()
    answer = () => ({ ok: false, reason: 'failed', refused: 'pass', error: 'no' })
    expect(await names(TOKEN)).toEqual(['send_message', 'read_messages'])
  })

  test('a host that never can (too old, or no grant) lists none', async () => {
    answer = () => ({ ok: false, reason: 'unknown-method', declined: 'host-too-old', error: 'no' })
    expect(await names(TOKEN)).toEqual([])
    forgetMessageHosts()
    answer = () => ({ ok: false, reason: 'failed', refused: 'grant', error: 'not declared' })
    expect(await hostOnMessages({ ...options, token: TOKEN })).toBe('never')
    expect(await names(TOKEN)).toEqual([])
  })

  test('no token, no tools, and a call without one sends nothing', async () => {
    expect(await names(null)).toEqual([])
    expect(await names('')).toEqual([])
    const said = await answerMessageTool('send_message', { body: 'hi' }, { ...options, token: null })
    expect(said?.isError).toBe(true)
    expect(asked).toEqual([])
  })

  test('identity is the host’s to check: a listed door sends only its own token, and a refusal is said', async () => {
    down = true
    expect(await names(TOKEN)).toEqual(['send_message', 'read_messages'])
    const unreachable = await answerMessageTool('read_messages', {}, { ...options, token: TOKEN })
    expect(unreachable?.isError).toBe(true)
    down = false
    answer = () => ({ ok: false, reason: 'failed', refused: 'project', error: 'That token is not one this host holds.' })
    const forged = await answerMessageTool('send_message', { body: 'hi', token: 'someone-elses-token', from: { session: 'x' } }, { ...options, token: TOKEN })
    expect(forged).toEqual({ text: 'Not sent: That token is not one this host holds.', isError: true })
    expect(asked.at(-1)).toEqual({ token: TOKEN, body: 'hi' })
  })
})

describe('whether the session’s door carries its place', () => {
  test('by its name or module, with the token on the URL when the URL is known', () => {
    expect(doorCarriesPlace(['kehikko', 'kehikko-claude'], SELF)).toBe(true)
    expect(doorCarriesPlace(['kehikko', 'checklist'], SELF)).toBe(false)
    expect(doorCarriesPlace([{ name: 'claude', module: 'kehikot.claude', url: `http://127.0.0.1:4170/m/kehikot.claude/mcp?kehikot-place=${TOKEN}` }], SELF)).toBe(true)
    expect(doorCarriesPlace([{ name: 'kehikko-claude', url: 'http://127.0.0.1:8021/mcp' }], SELF)).toBe(false)
    expect(doorCarriesPlace([{ name: 'kehikko-claude', url: 'not a url' }], SELF)).toBe(false)
    expect(doorCarriesPlace([], SELF)).toBe(false)
    expect(doorCarriesPlace(null, SELF)).toBe(false)
  })
})

describe('the notes say what the door has', () => {
  const place = { project: '/p', epic: 'e', parts: [], kehikko: null }
  const notes = (listed?: boolean) =>
    sessionNotes({ place, modules: null, hostDoor: 'kehikko', self: SELF, key: 'k', messaging: { session: 's-1', ...(listed === undefined ? {} : { listed }) } }, 'start', null).text!

  test('a door with its token: the tools and the address, as before', () => {
    for (const text of [notes(), notes(true)]) {
      expect(text).toContain(messagingLine(SELF, 's-1'))
      expect(text).toContain('send_message and read_messages on the Claude module’s MCP server (kehikko-claude)')
      expect(text).toContain('Others reach this conversation at {"module":"kehikot.claude","session":"s-1"}')
    }
  })

  test('a door without one: no promise, no address, and how to get messaging', () => {
    const text = notes(false)
    expect(text).toContain(messagingUnlistedLine(SELF))
    expect(text).toContain('but not from this conversation')
    expect(text).toContain('open it again from the Claude container')
    expect(text).not.toContain('Others reach this conversation')
    expect(messagingLine(SELF, 's-1', true, false)).toBe(messagingUnlistedLine(SELF))
  })

  test('the notes version is unchanged: a session told before is not told everything again', () => {
    expect(NOTES_VERSION).toBeGreaterThanOrEqual(9)
  })
})
