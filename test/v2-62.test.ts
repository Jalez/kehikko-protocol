import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import {
  AGENT_CHANGES_MOST,
  CHANGED_SINCE_HEAD,
  CHANGED_TOOLS_LINE,
  NOTES_VERSION,
  PACKAGE_VERSION,
  SESSION_FIELD_SINCE,
  agentChangesFrom,
  agentChangesSchema,
  changedSince,
  changesBetween,
  forAgentsOf,
  manifestSchema,
  notesVersion,
  placeDoorsSchema,
  sessionModuleSchema,
  sessionNotes,
  subagentNotes,
  withoutForAgents,
  type Manifest,
  type NotesInput,
  type NotesTold,
  type SessionModule,
} from '../src/index.js'
import { TOOLS_LIST_CHANGED, doorsFetch, doorsHandler, markOfEventId, toolsChanged, toolsMark, type Answer } from '../src/serve/index.js'

/**
 * 2.62.0: a session that started before an update is told, once, what changed for agents — from the
 * "For agents" section of the release notes in between — and a module's door tells a connected agent
 * that its tools changed (`notifications/tools/list_changed`).
 */

const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..')

describe('the version', () => {
  test('is 2.62.0, and the notes are told again once (NOTES_VERSION 9)', () => {
    expect(PACKAGE_VERSION).toBe('2.81.0')
    const pkg = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8')) as { version: string }
    expect(pkg.version).toBe('2.81.0')
    expect(readFileSync(join(REPO, 'CHANGELOG.md'), 'utf8')).toContain('## 2.62.0')
    expect(readFileSync(join(REPO, 'docs/asking.md'), 'utf8')).toContain('What changed since a session was told (2.62.0)')
    expect(readFileSync(join(REPO, 'docs/module-plumbing.md'), 'utf8')).toContain('When a door’s tools change (2.62.0)')
    expect(NOTES_VERSION).toBeGreaterThanOrEqual(9)
    expect(SESSION_FIELD_SINCE.host).toBe('2.62.0')
  })
})

describe('the "For agents" section of release notes', () => {
  const notes = [
    '- **Waits for you.** A run you queued now tells you when it is done.',
    '',
    '## For agents',
    '',
    '- `queue_wait` waits for a run and answers when it ends.',
    '- `queue_run` checks the command first',
    '  and says what would fail.',
    '',
    '## Something else',
    '- kept',
  ].join('\n')

  test('a heading runs to the next heading, a bullet a line, an indented line continuing it', () => {
    expect(forAgentsOf(notes)).toEqual(['`queue_wait` waits for a run and answers when it ends.', '`queue_run` checks the command first and says what would fail.'])
  })

  test('a "For agents:" label, bold or not, runs to the next blank line, with text after the colon as its first line', () => {
    expect(forAgentsOf('- A person line.\n\nFor agents: `jump` takes a step.\n- and a part.\n\nLater text.')).toEqual(['`jump` takes a step.', 'and a part.'])
    expect(forAgentsOf('**For agents:**\n- tell_finished takes choices.\n\n- not this')).toEqual(['tell_finished takes choices.'])
    expect(forAgentsOf('### For agents:\nPlain line.')).toEqual(['Plain line.'])
  })

  test('none is empty; comments are not read; lines are one line each, clipped, at most five', () => {
    expect(forAgentsOf('- Only for people.')).toEqual([])
    expect(forAgentsOf(42)).toEqual([])
    expect(forAgentsOf('<!-- ## For agents\n- hidden -->\n- people')).toEqual([])
    const many = ['## For agents', ...Array.from({ length: 9 }, (_, i) => `- line ${i} with a break`)].join('\n')
    const read = forAgentsOf(many)
    expect(read).toHaveLength(AGENT_CHANGES_MOST.lines)
    expect(read[0]).toBe('line 0 with a break')
    expect(forAgentsOf(`## For agents\n- ${'x'.repeat(500)}`)[0]?.length).toBe(AGENT_CHANGES_MOST.chars)
  })

  test('what people read is the notes without it', () => {
    expect(withoutForAgents(notes)).toBe('- **Waits for you.** A run you queued now tells you when it is done.\n\n## Something else\n- kept')
    expect(withoutForAgents('- Only for people.')).toBe('- Only for people.')
    /* A release body: the line after the list is the release's, not the section's. */
    const body = '### What\'s new\n- **A.** B.\n\n## For agents\n\n- c\n- d\n\nWorks with Kehikot 0.1.90 and later.\n\n<sub>Built from abc1234</sub>\n'
    expect(forAgentsOf(body)).toEqual(['c', 'd'])
    expect(withoutForAgents(body)).toBe('### What\'s new\n- **A.** B.\n\nWorks with Kehikot 0.1.90 and later.\n\n<sub>Built from abc1234</sub>\n')
  })

  test('a host hands the releases up to the one it runs that say something to agents, newest first', () => {
    const files = [
      { file: 'notes/1.2.0.md', text: '## For agents\n- two' },
      { file: 'notes/1.10.0.md', text: '## For agents\n- ten' },
      { file: 'notes/1.3.0.md', text: '- people only' },
      { file: 'notes/1.11.0.md', text: '## For agents\n- not released here yet' },
      { file: 'notes/README.md', text: '## For agents\n- not a release' },
    ]
    expect(agentChangesFrom(files, '1.10.0')).toEqual([
      { version: '1.10.0', lines: ['ten'] },
      { version: '1.2.0', lines: ['two'] },
    ])
    expect(agentChangesFrom(files).map((one) => one.version)).toEqual(['1.11.0', '1.10.0', '1.2.0'])
    expect(notesVersion('notes/v2.0.1.md')).toBe('2.0.1')
    expect(notesVersion('notes/README.md')).toBeNull()
  })

  test('the shapes keep what parses and drop the rest', () => {
    expect(agentChangesSchema.parse([{ version: 'v1.0.0', lines: ['a'] }, { version: 'one', lines: ['b'] }, { version: '1.1.0', lines: [] }])).toEqual([{ version: '1.0.0', lines: ['a'] }])
    const one = sessionModuleSchema.parse({ module: 'kehikot.queue', name: 'Test runs', summary: '', door: 'queue', skills: [], version: 'nope', changes: 'nope' })
    expect(one.version).toBeUndefined()
    expect(one.changes).toBeUndefined()
    const doors = placeDoorsSchema.parse({ ok: true, token: 'a'.repeat(32), doors: [], host: { version: '3.0.0', changes: [{ version: '3.0.0', lines: ['x'] }] } })
    expect(doors.host).toEqual({ version: '3.0.0', changes: [{ version: '3.0.0', lines: ['x'] }] })
    expect(placeDoorsSchema.parse({ ok: true, token: 'a'.repeat(32), doors: [], host: 'old' }).host).toBeUndefined()
  })
})

describe('what changed since a session was told', () => {
  const place = { project: '/p/thesis', epic: 'methods', parts: [], kehikko: { key: 'writing', name: 'Writing' } }
  const self = { module: 'kehikot.claude', name: 'Claude', door: 'kehikko-claude' }
  const queue = (version: string, changes = QUEUE_CHANGES): SessionModule => ({ module: 'kehikot.queue', name: 'Test runs', summary: 'Runs tests.', door: 'queue', skills: [], version, changes })
  const QUEUE_CHANGES = [
    { version: '1.3.0', lines: ['queue_run checks the command first.'] },
    { version: '1.2.0', lines: ['queue_wait waits for a run.'] },
    { version: '1.0.0', lines: ['old news.'] },
  ]
  const input = (modules: SessionModule[], host: NotesInput['host'] = null): NotesInput => ({ place, modules, absent: [], self, host })

  test('the releases after the one told, up to the one running, oldest first', () => {
    expect(changesBetween(QUEUE_CHANGES, '1.1.0', '1.3.0').map((one) => one.version)).toEqual(['1.2.0', '1.3.0'])
    expect(changesBetween(QUEUE_CHANGES, '1.3.0', '1.3.0')).toEqual([])
    expect(changesBetween(QUEUE_CHANGES, '1.3.0', '1.2.0')).toEqual([])
    expect(changesBetween(QUEUE_CHANGES, 'x', '1.3.0')).toEqual([])
  })

  test('told once at the next prompt after an update, never at a start, never again', () => {
    const start = sessionNotes(input([queue('1.1.0')]), 'start', null)
    expect(start.text).not.toContain(CHANGED_SINCE_HEAD)
    expect(start.told.versions).toEqual({ 'kehikot.queue': '1.1.0' })

    /* Nothing updated: nothing said. */
    expect(sessionNotes(input([queue('1.1.0')]), 'prompt', start.told).text).toBeNull()

    const after = sessionNotes(input([queue('1.3.0')]), 'prompt', start.told)
    expect(after.kind).toBe('change')
    expect(after.text).toBe(
      [CHANGED_SINCE_HEAD, '- Test runs 1.2.0: "queue_wait waits for a run."', '- Test runs 1.3.0: "queue_run checks the command first."', CHANGED_TOOLS_LINE].join('\n'),
    )
    expect(after.told.versions).toEqual({ 'kehikot.queue': '1.3.0' })
    expect(sessionNotes(input([queue('1.3.0')]), 'prompt', after.told).text).toBeNull()
  })

  test('only modules on the session’s kehikko, and only those it was told a version of', () => {
    const told: NotesTold = { ...sessionNotes(input([queue('1.1.0')]), 'start', null).told }
    /* Test runs left the kehikko and was updated: not this session's tools, not said; its version is kept. */
    const gone = sessionNotes(input([]), 'prompt', told)
    expect(gone.text ?? '').not.toContain(CHANGED_SINCE_HEAD)
    expect(gone.told.versions?.['kehikot.queue']).toBe('1.1.0')
    /* A module it never heard a version of (a record from before 2.62.0): recorded, not said. */
    const old = sessionNotes(input([queue('1.3.0')]), 'prompt', { ...told, versions: undefined })
    expect(old.text ?? '').not.toContain(CHANGED_SINCE_HEAD)
    expect(old.told.versions).toEqual({ 'kehikot.queue': '1.3.0' })
    /* Releases that say nothing to agents: nothing said, and the version moves up. */
    const quiet = sessionNotes(input([queue('1.3.0', [])]), 'prompt', told)
    expect(quiet.text).toBeNull()
  })

  test('Kehikot’s own changes go to every session, before its messages', () => {
    const host = { version: '2.0.0', changes: [{ version: '2.0.0', lines: ['press_item presses a run.'] }] }
    const start = sessionNotes(input([], { version: '1.0.0', changes: [] }), 'start', null)
    expect(start.told.host).toBe('1.0.0')
    const after = sessionNotes(
      { ...input([], host), messages: [], messagesMore: 0 },
      'prompt',
      start.told,
    )
    expect(after.text).toContain('- Kehikot: "press_item presses a run."')
    expect(after.told.host).toBe('2.0.0')
    expect(changedSince(input([], host), after.told)).toBeNull()
  })

  test('a subagent started before its session’s next prompt is told them too; the session still is', () => {
    const start = sessionNotes(input([queue('1.1.0')]), 'start', null)
    const sub = subagentNotes(input([queue('1.3.0')]), null, start.told) ?? ''
    expect(sub).toContain('- Test runs 1.3.0: "queue_run checks the command first."')
    expect(subagentNotes(input([queue('1.3.0')]), null) ?? '').not.toContain(CHANGED_SINCE_HEAD)
    expect(sessionNotes(input([queue('1.3.0')]), 'prompt', start.told).text).toContain(CHANGED_SINCE_HEAD)
  })

  test('more than twenty lines are counted', () => {
    const changes = Array.from({ length: 12 }, (_, i) => ({ version: `1.${i + 1}.0`, lines: ['a', 'b'] })).reverse()
    const said = changedSince(input([queue('1.12.0', changes)]), { key: null, modules: [], versions: { 'kehikot.queue': '1.0.0' } }) ?? ''
    expect(said.split('\n').filter((line) => line.startsWith('- Test runs'))).toHaveLength(20)
    expect(said).toContain('- and 4 more;')
  })
})

describe('a door tells a connected agent that its tools changed', () => {
  const MANIFEST: Manifest = manifestSchema.parse({
    kind: 'kehikot.module',
    protocol: 2,
    id: 'kehikot.example',
    name: 'Example',
    version: '1.0.0',
    entry: '/app',
    modes: [{ id: 'main', label: 'Main' }],
    partless: 'An example with nothing in it that belongs to a part.',
    mcp: { url: '/mcp', transport: 'http' },
  })
  let tools = [{ name: 'one', description: 'The first.', inputSchema: { type: 'object' } }]
  const answer: Answer = (method, path, _query, body) => {
    if (path !== '/mcp') return null
    if (method !== 'POST') return { status: 405, body: { ok: false } }
    if (body?.method === 'initialize') return { status: 200, body: { jsonrpc: '2.0', id: body.id, result: { protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'x', version: '1' } } } }
    if (body?.method === 'tools/list') return { status: 200, body: { jsonrpc: '2.0', id: body.id, result: { tools } } }
    return { status: 404, body: null }
  }
  const through = doorsFetch({ manifest: MANIFEST, answer, page: { title: 'Example' } })
  const at = (path: string, init?: RequestInit) => through(new Request(`http://127.0.0.1:9000${path}`, init))
  const listen = (headers: Record<string, string> = {}) => at('/mcp', { headers: { accept: 'text/event-stream', ...headers } })

  async function readUntil(response: Response, wanted: (text: string) => boolean): Promise<string> {
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let text = ''
    const deadline = Date.now() + 2000
    while (!wanted(text) && Date.now() < deadline) {
      const next = await Promise.race([reader.read(), new Promise<null>((done) => setTimeout(() => done(null), 200))])
      if (next && !next.done) text += decoder.decode(next.value)
    }
    await reader.cancel()
    return text
  }

  test('a tool list has one mark, whatever its order', () => {
    const a = { name: 'a', description: 'A' }
    const b = { name: 'b', description: 'B' }
    expect(toolsMark([a, b])).toBe(toolsMark([b, a]))
    expect(toolsMark([a])).not.toBe(toolsMark([{ ...a, description: 'changed' }]))
    expect(toolsMark('no')).toBeNull()
    expect(markOfEventId(`${toolsMark([a])}.n.1`)).toBe(toolsMark([a]))
    expect(markOfEventId('3')).toBeNull()
  })

  test('initialize says it tells of tool changes', async () => {
    const reply = await at('/mcp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' }) })
    expect(((await reply!.json()) as { result: { capabilities: { tools: { listChanged: boolean } } } }).result.capabilities.tools.listChanged).toBe(true)
  })

  test('the listening stream opens with an id to reconnect by, and says nothing more', async () => {
    const response = (await listen())!
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/event-stream')
    const text = await readUntil(response, (said) => said.includes('data:'))
    expect(text).toContain('retry: 1000')
    expect(text).toMatch(new RegExp(`id: ${toolsMark(tools)}\\.`))
    expect(text).not.toContain(TOOLS_LIST_CHANGED)
  })

  test('an agent reconnecting from a process with other tools is told they changed, at once', async () => {
    const same = await readUntil((await listen({ 'last-event-id': `${toolsMark(tools)}.old.4` }))!, (said) => said.includes('data:'))
    expect(same).not.toContain(TOOLS_LIST_CHANGED)
    const other = await readUntil((await listen({ 'last-event-id': '0badc0de.old.4' }))!, (said) => said.includes(TOOLS_LIST_CHANGED))
    expect(other).toContain(`data: {"jsonrpc":"2.0","method":"${TOOLS_LIST_CHANGED}"}`)
  })

  test('tools that change while it runs are told to every open stream, once', async () => {
    const response = (await listen())!
    const reading = readUntil(response, (said) => said.includes(TOOLS_LIST_CHANGED))
    await new Promise((done) => setTimeout(done, 20))
    toolsChanged()
    tools = [...tools, { name: 'two', description: 'The second.', inputSchema: { type: 'object' } }]
    toolsChanged()
    const text = await reading
    expect(text.split(TOOLS_LIST_CHANGED)).toHaveLength(2)
  })

  test('a GET that does not ask for a stream, and a door with no MCP, are answered as before', async () => {
    expect((await at('/mcp'))!.status).toBe(405)
    const none = doorsFetch({ manifest: { ...MANIFEST, mcp: undefined }, answer, page: { title: 'Example' } })
    expect((await none(new Request('http://127.0.0.1:9000/mcp', { headers: { accept: 'text/event-stream' } })))!.status).toBe(405)
  })

  test('the node form serves the same stream', async () => {
    const handler = doorsHandler({ manifest: MANIFEST, answer, page: { title: 'Example' } })
    const written: string[] = []
    const headers: Record<string, string> = {}
    const closers: (() => void)[] = []
    await new Promise<void>((done) => {
      handler(
        {
          url: '/mcp',
          method: 'GET',
          headers: { accept: 'text/event-stream', 'last-event-id': '0badc0de.old.1' },
          on: (event: string, listener: () => void) => {
            if (event === 'close') closers.push(listener)
          },
        } as never,
        {
          statusCode: 0,
          setHeader: (name: string, value: string) => void (headers[name] = value),
          write: (chunk: string) => {
            written.push(chunk)
            done()
          },
          end: () => done(),
        } as never,
        () => done(),
      )
    })
    expect(headers['content-type']).toContain('text/event-stream')
    expect(written.join('')).toContain(TOOLS_LIST_CHANGED)
    for (const close of closers) close()
  })
})
