import { describe, expect, test } from 'bun:test'

import {
  FILE_DRAG_TYPE,
  HOST_MESSAGES,
  LIMITS,
  MESSAGE,
  MODULE_MESSAGES,
  PACKAGE_VERSION,
  PROTOCOL,
  dragSchema,
  dropSchema,
  fileDrag,
  fileDragFromUrl,
  fileDragSchema,
  fileDragUrl,
  projectPathSchema,
  type DataTransferLike,
} from '../src/index.js'
import { connect, type MessageSource, type PointerTarget } from '../src/client/index.js'

/**
 * 2.94.0: the drag format for "a file in a project" — `fileDrag.set` / `fileDrag.read`, a custom type
 * with `text/uri-list` and `text/plain` beside it, for engines that keep custom types to one origin.
 */

/** A DataTransfer as a browser has it: types in the order set, data by type. */
function transfer(only?: string[]): DataTransferLike & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    setData(format, value) {
      data.set(format, value)
    },
    getData(format) {
      if (only && !only.includes(format)) return ''
      return data.get(format) ?? ''
    },
    get types() {
      return [...data.keys()].filter((one) => !only || only.includes(one))
    },
  }
}

describe('2.94.0 fileDrag', () => {
  test('the version', () => expect(PACKAGE_VERSION).toBe('2.94.0'))

  test('set writes all three spellings and read gives the same file back', () => {
    const dt = transfer()
    expect(fileDrag.set(dt, { project: '/work/thesis', path: 'src/a b.ts' })).toBe(true)
    expect(JSON.parse(dt.data.get(FILE_DRAG_TYPE)!)).toEqual({ project: '/work/thesis', path: 'src/a b.ts', kind: 'file' })
    expect(dt.data.get('text/uri-list')).toBe('file:///work/thesis/src/a%20b.ts#kehikot-project=%2Fwork%2Fthesis')
    expect(dt.data.get('text/plain')).toBe('/work/thesis/src/a b.ts')
    expect(fileDrag.offered(dt)).toBe(true)
    expect(fileDrag.read(dt)).toEqual({ project: '/work/thesis', path: 'src/a b.ts', kind: 'file' })
  })

  test('where the custom type does not cross origins, the uri-list carries it, project and all', () => {
    const dt = transfer(['text/uri-list', 'text/plain'])
    fileDrag.set(dt, { project: '/work/thesis/', path: 'docs', kind: 'folder' })
    expect(fileDrag.offered(dt)).toBe(true)
    expect(fileDrag.read(dt)).toEqual({ project: '/work/thesis', path: 'docs', kind: 'folder' })
  })

  test('with only plain text, an absolute path is read when the receiver says its project and holds it', () => {
    const dt = transfer(['text/plain'])
    fileDrag.set(dt, { project: '/work/thesis', path: 'a.ts' })
    expect(fileDrag.offered(dt)).toBe(false)
    expect(fileDrag.read(dt)).toBeNull()
    expect(fileDrag.read(dt, { project: '/work/thesis' })).toEqual({ project: '/work/thesis', path: 'a.ts', kind: 'file' })
    expect(fileDrag.read(dt, { project: '/work/other' })).toBeNull()
  })

  test('a drag from another project is not read as this one’s', () => {
    const dt = transfer()
    fileDrag.set(dt, { project: '/work/thesis', path: 'a.ts' })
    expect(fileDrag.read(dt, { project: '/work/other' })).toBeNull()
    expect(fileDrag.read(dt, { project: '/work/thesis/' })?.path).toBe('a.ts')
  })

  test('a path that leaves the project, or is absolute, is refused by the shape and never set', () => {
    for (const path of ['../etc/passwd', 'a/../../b', '/etc/passwd', 'C:\\x', 'a//b', './a', '', 'a\0b', 'x'.repeat(LIMITS.PATH + 1)]) {
      expect(projectPathSchema.safeParse(path).success).toBe(false)
      const dt = transfer()
      expect(fileDrag.set(dt, { project: '/work/thesis', path })).toBe(false)
      expect(dt.data.size).toBe(0)
    }
    expect(fileDragSchema.safeParse({ project: 'relative', path: 'a' }).success).toBe(false)
  })

  test('a forged custom payload that escapes is refused, and the standard types are not trusted past it', () => {
    const dt = transfer()
    dt.setData!(FILE_DRAG_TYPE, JSON.stringify({ project: '/work/thesis', path: '../../etc/passwd' }))
    expect(fileDrag.read(dt)).toBeNull()
    dt.setData!(FILE_DRAG_TYPE, 'not json')
    expect(fileDrag.read(dt)).toBeNull()
  })

  test('a URL that walks out with .. or names another folder is refused', () => {
    expect(fileDragFromUrl('file:///work/thesis/../etc/passwd#kehikot-project=%2Fwork%2Fthesis')).toBeNull()
    expect(fileDragFromUrl('file:///etc/passwd#kehikot-project=%2Fwork%2Fthesis')).toBeNull()
    expect(fileDragFromUrl('https://example.com/a#kehikot-project=%2Fwork')).toBeNull()
    expect(fileDragFromUrl('file:///work/thesis/a.ts')).toBeNull()
    expect(fileDragFromUrl('file:///work/thesis/a.ts', '/work/thesis')?.path).toBe('a.ts')
    expect(fileDragFromUrl('file:///work/thesis/a.ts#kehikot-project=%2Fwork%2Fthesis', '/work/other')).toBeNull()
  })

  test('a uri-list skips comment lines, and the URL round-trips odd names', () => {
    const url = fileDragUrl({ project: '/w/p', path: 'ä/#hash?.ts' })
    expect(fileDragFromUrl(url)).toEqual({ project: '/w/p', path: 'ä/#hash?.ts', kind: 'file' })
    const dt = transfer(['text/uri-list'])
    dt.setData!('text/uri-list', `# a comment\r\n${url}\r\n`)
    expect(fileDrag.read(dt)?.path).toBe('ä/#hash?.ts')
  })

  test('a DataTransfer that throws on getData (protected mode) reads as nothing', () => {
    const dt: DataTransferLike = { types: [FILE_DRAG_TYPE], getData: () => { throw new Error('protected') } }
    expect(fileDrag.offered(dt)).toBe(true)
    expect(fileDrag.read(dt)).toBeNull()
  })
})

describe('2.94.0 kehikot.drag and kehikot.drop', () => {
  function wire() {
    const listeners = new Set<(ev: MessageEvent) => void>()
    const source: MessageSource = {
      parent: {} as Window,
      addEventListener: (_t, fn) => void listeners.add(fn),
      removeEventListener: (_t, fn) => void listeners.delete(fn),
    }
    const deliver = (data: unknown, from: unknown) => {
      for (const fn of [...listeners]) fn({ data, origin: 'null', source: from } as unknown as MessageEvent)
    }
    const on = new Map<string, Set<(event: unknown) => void>>()
    const dragTarget: PointerTarget = {
      addEventListener: (type, fn) => void (on.get(type) ?? on.set(type, new Set()).get(type)!).add(fn as never),
      removeEventListener: (type, fn) => void on.get(type)?.delete(fn as never),
    }
    const fire = (type: string, event: unknown) => {
      for (const fn of [...(on.get(type) ?? [])]) fn(event)
    }
    const sent: { type: string }[] = []
    const host = { postMessage: (message: { type: string }) => void sent.push(message) }
    const drops: unknown[] = []
    const connection = connect('kehikot.example', { onDrop: (drop) => void drops.push(drop) }, { source, dragTarget, pointerTarget: false }).listen()
    const hello = { type: MESSAGE.HELLO, protocol: PROTOCOL, session: 's1', context: { epic: 'a', project: null, theme: 'light' } }
    return { deliver, fire, sent, host, drops, connection, hello, count: () => [...on.values()].reduce((n, set) => n + set.size, 0) }
  }

  test('a file put on a drag is told to the host as it starts and ends, with where and whether it was taken', () => {
    const { deliver, fire, sent, host, hello } = wire()
    deliver(hello, host)
    const dt = transfer()
    fileDrag.set(dt, { project: '/work/p', path: 'src/a.ts' })
    fire('dragstart', { dataTransfer: dt })
    fire('dragend', { clientX: 640, clientY: 120.5, dataTransfer: { dropEffect: 'none' } })
    const drags = sent.filter((one) => one.type === MESSAGE.DRAG)
    expect(drags).toEqual([
      { type: MESSAGE.DRAG, phase: 'start', file: { project: '/work/p', path: 'src/a.ts', kind: 'file' } },
      { type: MESSAGE.DRAG, phase: 'end', file: { project: '/work/p', path: 'src/a.ts', kind: 'file' }, at: { x: 640, y: 120.5 }, dropped: false },
    ])
    for (const one of drags) expect(dragSchema.safeParse(one).success).toBe(true)
  })

  test('a drag with no file on it says nothing, and an end without a start says nothing', () => {
    const { deliver, fire, sent, host, hello } = wire()
    deliver(hello, host)
    const dt = transfer()
    dt.setData!('text/plain', 'just text')
    fire('dragstart', { dataTransfer: dt })
    fire('dragend', { clientX: 1, clientY: 1, dataTransfer: { dropEffect: 'copy' } })
    expect(sent.filter((one) => one.type === MESSAGE.DRAG)).toEqual([])
  })

  test('a drop the host hands on reaches onDrop; a malformed one does not', () => {
    const { deliver, drops, host, hello } = wire()
    deliver(hello, host)
    deliver({ type: MESSAGE.DROP, protocol: PROTOCOL, file: { project: '/work/p', path: 'a.ts' }, at: { x: 10, y: 20 } }, host)
    deliver({ type: MESSAGE.DROP, protocol: PROTOCOL, file: { project: '/work/p', path: '../x' }, at: { x: 10, y: 20 } }, host)
    expect(drops).toEqual([{ file: { project: '/work/p', path: 'a.ts', kind: 'file' }, at: { x: 10, y: 20 } }])
  })

  test('listens from listen to stop', () => {
    const { count, connection } = wire()
    expect(count()).toBe(2)
    connection.stop()
    expect(count()).toBe(0)
  })

  test('the two messages are in the lists that say who sends what', () => {
    expect(MODULE_MESSAGES).toContain(MESSAGE.DRAG)
    expect(HOST_MESSAGES).toContain(MESSAGE.DROP)
    expect(dropSchema.safeParse({ type: MESSAGE.DROP, protocol: 2, file: { project: '/p', path: 'a' }, at: { x: 1e9, y: 0 } }).success).toBe(false)
  })
})
