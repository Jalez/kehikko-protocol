import { describe, expect, test } from 'bun:test'

import {
  KEHIKOT_IGNORE,
  MESSAGE,
  PACKAGE_VERSION,
  PROJECT_FILE,
  PROJECT_FILE_IGNORE,
  PROJECT_ID,
  PROTOCOL,
  activityItemsSchema,
  contextSchema,
  ignoresKehikot,
  ignoresProjectFile,
  moduleFile,
  moduleFolder,
  pickedProject,
  projectFile,
  projectFileSchema,
  projectKey,
  projectPickResult,
  readProjectFile,
  withKehikotIgnored,
  withProjectFileIgnored,
  withoutKehikotIgnored,
} from '../src/index.js'
import { connect, hostFields, type MessageSource } from '../src/client/index.js'

/** 2.1.0: a project has a permanent id, kept in `.kehikot/project.json`, so renaming its folder loses nothing. */

const ID = '3f2b8c1e-9a4d-4e7b-8c21-5d6e7f8a9b0c'
const OTHER = 'a1b2c3d4-0000-4000-8000-000000000000'

describe('the version', () => {
  test('is 2.3.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.33.0')
    expect(PROTOCOL).toBe(2)
  })
})

describe('PROJECT_ID', () => {
  test('takes a random UUID as a host mints it, and the bounds of the pattern', () => {
    expect(PROJECT_ID.test(crypto.randomUUID())).toBe(true)
    expect(PROJECT_ID.test(ID)).toBe(true)
    expect(PROJECT_ID.test('abcd1234')).toBe(true)
    expect(PROJECT_ID.test('a'.repeat(64))).toBe(true)
  })
  test('refuses what is not a safe file name, or is too short or too long', () => {
    for (const bad of [
      '',
      'abc1234', // 7
      'a'.repeat(65),
      ID.toUpperCase(),
      '-abcdefgh',
      'abcdefgh-',
      'abcd.efgh',
      'abcd/efgh',
      '../../etc',
      'abcd efgh',
      'abcd_efgh',
    ]) expect(PROJECT_ID.test(bad)).toBe(false)
  })
})

describe('project.json', () => {
  test('is at the top of .kehikot/, null without a project', () => {
    expect(PROJECT_FILE).toBe('project.json')
    expect(projectFile('/work/thesis')).toBe('/work/thesis/.kehikot/project.json')
    expect(projectFile('/work/thesis/')).toBe('/work/thesis/.kehikot/project.json')
    for (const none of [null, undefined, '', '   ']) expect(projectFile(none)).toBeNull()
  })

  test('no module can have a folder by that name', () => {
    expect(() => moduleFolder('kehikot.project.json')).toThrow(/host's own file/)
    expect(() => moduleFolder('project.json')).toThrow(/host's own file/)
    expect(() => moduleFile('/p', 'kehikot.project.json', 'x')).toThrow()
    expect(moduleFolder('kehikot.project')).toBe('project')
  })

  test('holds an id and when it was made', () => {
    expect(projectFileSchema.parse({ id: ID })).toEqual({ id: ID, createdAt: null })
    expect(projectFileSchema.parse({ id: ID, createdAt: '2026-10-19T10:00:00.000Z', extra: 1 })).toEqual({
      id: ID,
      createdAt: '2026-10-19T10:00:00.000Z',
    })
  })

  test('refuses a file without a good id, and a reader gets null rather than a throw', () => {
    for (const bad of [{}, { id: '' }, { id: 'SHOUTING-1234' }, { id: ID, createdAt: 'x'.repeat(41) }, { id: ID, createdAt: '' }]) {
      expect(projectFileSchema.safeParse(bad).success).toBe(false)
      expect(readProjectFile(bad)).toBeNull()
    }
    for (const junk of [null, undefined, 'id', 42, [ID]]) expect(readProjectFile(junk)).toBeNull()
    expect(readProjectFile({ id: ID })).toEqual({ id: ID, createdAt: null })
  })
})

describe('projectKey: what machine-level state is keyed by', () => {
  test('the id when the host sent one, else the path, else nothing', () => {
    expect(projectKey({ projectId: ID, projectPath: '/work/thesis' })).toEqual({ by: 'id', key: ID })
    expect(projectKey({ projectId: null, projectPath: '/work/thesis' })).toEqual({ by: 'path', key: '/work/thesis' })
    expect(projectKey({ projectPath: ' /work/thesis ' })).toEqual({ by: 'path', key: '/work/thesis' })
    expect(projectKey({ projectId: 'NOT AN ID', projectPath: '/work/thesis' })).toEqual({ by: 'path', key: '/work/thesis' })
    expect(projectKey({ projectId: ID })).toEqual({ by: 'id', key: ID })
    for (const none of [null, undefined, {}, { projectId: null, projectPath: null }, { projectPath: '  ' }]) expect(projectKey(none)).toBeNull()
  })
})

describe('the context', () => {
  test('carries projectId, null from a host that does not send it', () => {
    expect(contextSchema.parse({}).projectId).toBeNull()
    expect(contextSchema.parse({ project: 'Thesis', projectPath: '/work/thesis', projectId: ID }).projectId).toBe(ID)
  })
  test('refuses an id that is not one', () => {
    for (const bad of ['', 'short', ID.toUpperCase(), '../x/../y', 42]) expect(contextSchema.safeParse({ projectId: bad }).success).toBe(false)
  })
  test('the flattened fields a page reads have it', () => {
    expect(hostFields(contextSchema.parse({ projectId: ID })).projectId).toBe(ID)
    expect(hostFields(contextSchema.parse({})).projectId).toBeNull()
    expect(hostFields(null).projectId).toBeNull()
  })
})

describe('projects.pick', () => {
  test('a picked project may say its id; an older host says none', () => {
    expect(pickedProject.parse({ path: '/work/thesis', name: 'Thesis', id: ID })).toEqual({ path: '/work/thesis', name: 'Thesis', id: ID })
    expect(pickedProject.parse({ path: '/work/thesis' })).toEqual({ path: '/work/thesis', name: '' })
    expect(projectPickResult.parse({ outcome: 'picked', project: { path: '/p', id: ID } }).project?.id).toBe(ID)
  })
  test('refuses an id that is not one', () => {
    expect(pickedProject.safeParse({ path: '/p', id: 'Nope' }).success).toBe(false)
    expect(pickedProject.safeParse({ path: '/p', id: null }).success).toBe(false)
  })
})

const item = (id: string, more: Record<string, unknown> = {}) => ({ id, state: 'attention', label: id, ...more })
const A = '/work/thesis'
const B = '/work/portal'

describe('an activity item’s project id', () => {
  test('optional, beside project, and carried', () => {
    const [a, b] = activityItemsSchema.parse([item('a'), item('b', { project: A, projectId: ID })]) as any[]
    expect(a.projectId).toBeUndefined()
    expect(b).toEqual(item('b', { project: A, projectId: ID }))
  })
  test('refused without project, so an older host still has a folder to file it by', () => {
    expect(activityItemsSchema.safeParse([item('a', { projectId: ID })]).success).toBe(false)
  })
  test('refused when it is not an id', () => {
    for (const bad of ['', 'Upper-Case-Id', 'a.b.c.d.e.f', 7]) expect(activityItemsSchema.safeParse([item('a', { project: A, projectId: bad })]).success).toBe(false)
  })
})

describe('the client helper, with project ids', () => {
  function rig(context: Record<string, unknown>) {
    const listeners = new Set<(ev: MessageEvent) => void>()
    const source: MessageSource = {
      parent: {} as Window,
      addEventListener: (_t, fn) => void listeners.add(fn),
      removeEventListener: (_t, fn) => void listeners.delete(fn),
    }
    const said: any[] = []
    const host = { postMessage: (m: unknown) => void said.push(m) }
    const deliver = (data: unknown) => listeners.forEach((fn) => fn({ data, origin: 'null', source: host } as unknown as MessageEvent))
    const live = connect('kehikot.example', {}, { source })
    live.listen()
    deliver({ type: MESSAGE.HELLO, protocol: PROTOCOL, session: 's', context: { epic: null, project: null, theme: 'light', ...context } })
    const sets = () => said.filter((m) => m.type === MESSAGE.REQUEST && m.method === 'activity.set')
    return { live, sets, deliver }
  }

  test('a host that does not file by project: the id decides "the open project" where both have one', () => {
    /* The folder was renamed: the module still names the old path, the host the new one. */
    const r = rig({ projectPath: '/work/thesis-renamed', projectId: ID })
    r.live.activity([item('a', { project: A, projectId: ID }), item('b', { project: '/work/thesis-renamed', projectId: OTHER }), item('c')] as any)
    expect(r.sets()[0].params).toEqual({ items: [item('a'), item('c')] })
  })

  test('a host that sends no id: the path decides, and both fields are dropped', () => {
    const r = rig({ projectPath: A })
    r.live.activity([item('a', { project: A, projectId: ID }), item('b', { project: B, projectId: OTHER })] as any)
    expect(r.sets()[0].params).toEqual({ items: [item('a')] })
  })

  test('another project opened under the same path but another id is another project', () => {
    const r = rig({ projectPath: A, projectId: ID })
    r.live.activity([item('a', { project: A, projectId: ID })] as any)
    expect(r.sets()[0].params).toEqual({ items: [item('a')] })
    r.deliver({ type: MESSAGE.CONTEXT, protocol: PROTOCOL, epic: null, project: null, projectPath: A, projectId: OTHER, theme: 'light' })
    expect(r.sets().at(-1).params).toEqual({ items: [] })
  })
})

describe('project.json is never committed', () => {
  const RULE = `.kehikot/${PROJECT_FILE}`

  test('a fresh .gitignore gets the folder rule and the file rule, in two blocks', () => {
    expect(KEHIKOT_IGNORE.endsWith(PROJECT_FILE_IGNORE)).toBe(true)
    expect(PROJECT_FILE_IGNORE.trim().split('\n').at(-1)).toBe(RULE)
    expect(withKehikotIgnored('')).toBe(KEHIKOT_IGNORE)
    expect(ignoresProjectFile(KEHIKOT_IGNORE)).toBe(true)
  })

  test('what ignores the whole folder ignores the file, and an older .gitignore is left alone', () => {
    for (const rule of ['.kehikot/', '.kehikot', '/.kehikot/', '**/.kehikot/', '.kehikot/*']) expect(ignoresProjectFile(`${rule}\n`)).toBe(true)
    const older = 'dist\n.kehikot/\n'
    expect(withKehikotIgnored(older)).toBe(older)
    expect(withProjectFileIgnored(older)).toBe(older)
  })

  test('the file’s own rule, however anchored, counts', () => {
    for (const rule of [RULE, `/${RULE}`, `**/${RULE}`]) expect(ignoresProjectFile(`${rule}\n`)).toBe(true)
  })

  test('strict where the folder test is generous: a comment, or a later negation, is not ignoring it', () => {
    expect(ignoresKehikot('# .kehikot/\n')).toBe(true)
    expect(ignoresProjectFile('# .kehikot/\n')).toBe(false)
    expect(ignoresProjectFile(`# ${RULE}\n`)).toBe(false)
    expect(ignoresProjectFile(`.kehikot/*\n!${RULE}\n`)).toBe(false)
    expect(ignoresProjectFile(`!${RULE}\n${RULE}\n`)).toBe(true)
    expect(ignoresProjectFile('.kehikot/notes/\n.kehikot-project.json\n')).toBe(false)
    expect(ignoresProjectFile('')).toBe(false)
  })

  test('withProjectFileIgnored appends once, never touching a byte', () => {
    const shared = '  dist  \n\tbuild'
    const once = withProjectFileIgnored(shared)
    expect(once).toBe(`${shared}\n\n${PROJECT_FILE_IGNORE}`)
    expect(withProjectFileIgnored(once)).toBe(once)
    expect(withProjectFileIgnored('')).toBe(PROJECT_FILE_IGNORE)
  })

  test('sharing the folder keeps the file ignored, and sharing it again changes nothing', () => {
    const shared = withoutKehikotIgnored(withKehikotIgnored('dist\n'))
    expect(ignoresKehikot(shared)).toBe(false)
    expect(ignoresProjectFile(shared)).toBe(true)
    expect(shared).toBe(`dist\n\n${PROJECT_FILE_IGNORE}`)
    expect(withoutKehikotIgnored(shared)).toBe(shared)
  })

  test('a folder rule somebody removed by hand earlier still leaves the file ignored once taken out', () => {
    /* An older project: only `.kehikot/`, no file rule. Taking the folder rule out adds the file's. */
    expect(withoutKehikotIgnored('dist\n.kehikot/\n')).toBe(`dist\n\n${PROJECT_FILE_IGNORE}`)
  })

  test('ignoring the folder again adds only its own block where the file already has its rule', () => {
    const shared = withoutKehikotIgnored(KEHIKOT_IGNORE)
    const again = withKehikotIgnored(shared)
    expect(again.split('\n').filter((line) => line === RULE)).toHaveLength(1)
    expect(ignoresKehikot(again)).toBe(true)
    expect(withoutKehikotIgnored(again)).toBe(shared)
  })
})

describe('the sweep of module folders skips the host’s file', () => {
  test('readHoldings never takes .kehikot/project.json for a module', async () => {
    const { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const { readHoldings, writeHoldings } = await import('../src/serve/index.js')
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'kehikot-project-id-')))
    try {
      writeHoldings(root, 'kehikot.steps', 'thesis', { methods: { refs: ['gh#1'] } })
      /* Even a folder of that name, holding what looks like holdings, is not a module's. */
      mkdirSync(join(root, '.kehikot', PROJECT_FILE), { recursive: true })
      writeFileSync(join(root, '.kehikot', PROJECT_FILE, 'parts.json'), JSON.stringify({ version: 1, epics: { thesis: { methods: { documents: [], refs: ['gh#666'] } } } }))
      expect(readHoldings(root)).toEqual({ thesis: { methods: { documents: [], refs: ['gh#1'] } } })
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
