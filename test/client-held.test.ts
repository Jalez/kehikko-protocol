import { afterEach, describe, expect, test } from 'bun:test'

import { held, heldDraft, type Draft } from '../src/client/index.js'

afterEach(() => sessionStorage.clear())

const draft = (text: string, base = '', aim = 'a note'): Draft => ({ base, text, aim })

describe('held', () => {
  test('what was kept comes back for exactly the scope and target it was kept under', () => {
    const drafts = held('kehikot.example.drafts')
    drafts.at('/work/thesis').keep('reply:7', draft('half a sent'))
    expect(drafts.at('/work/thesis').read('reply:7')).toEqual(draft('half a sent'))
    expect(drafts.at('/work/thesis').read('reply:8')).toBeNull()
    expect(drafts.at('/work/other').read('reply:7')).toBeNull()
    expect(drafts.at(null).read('reply:7')).toBeNull()
    expect(held('kehikot.other.drafts').at('/work/thesis').read('reply:7')).toBeNull()
  })

  test('it is in sessionStorage the moment it is kept, so a reload finds it', () => {
    held('kehikot.example.drafts').at('/p').keep('new', draft('typed'))
    expect(JSON.parse(sessionStorage.getItem('kehikot.example.drafts:/p') ?? 'null')).toEqual({ new: draft('typed') })
    /* A page that has just loaded builds its own; nothing is shared but the storage. */
    expect(held('kehikot.example.drafts').at('/p').read('new')?.text).toBe('typed')
  })

  test('null forgets it, and the last one takes the key with it', () => {
    const here = held('kehikot.example.drafts').at('/p')
    here.keep('a', draft('one'))
    here.keep('b', draft('two'))
    here.keep('a', null)
    expect(here.all()).toEqual({ b: draft('two') })
    here.keep('b', null)
    expect(sessionStorage.getItem('kehikot.example.drafts:/p')).toBeNull()
  })

  test('a draft nobody changed is not a draft: empty, or still what the typing started from', () => {
    const here = held('kehikot.example.drafts').at('/p')
    here.keep('edit:1', draft('as it was', 'as it was'))
    here.keep('edit:2', draft('   '))
    expect(here.any()).toBe(false)
    here.keep('edit:1', draft('as it is now', 'as it was'))
    expect(here.read('edit:1')?.base).toBe('as it was')
    /* Putting the words back as they were forgets them. */
    here.keep('edit:1', draft('as it was', 'as it was'))
    expect(here.read('edit:1')).toBeNull()
    expect(heldDraft({ base: '', text: 'x' })).toEqual({ base: '', text: 'x', aim: '' })
    expect(heldDraft({ text: 'x' })).toBeNull()
    expect(heldDraft('x')).toBeNull()
  })

  test('`any` answers "is something typed and not sent?", for one scope and for the page', () => {
    const drafts = held('kehikot.example.drafts')
    expect(drafts.any()).toBe(false)
    drafts.at('/p').keep('new', draft('typed'))
    expect(drafts.any()).toBe(true)
    expect(drafts.at('/p').any()).toBe(true)
    expect(drafts.at('/q').any()).toBe(false)
    expect(held('kehikot.example').any()).toBe(false)
    drafts.at('/p').keep('new', null)
    expect(drafts.any()).toBe(false)
  })

  test('a reader of the module’s own holds any shape, and decides what is worth giving back', () => {
    const open = held<string[]>('kehikot.example.open', (stored) =>
      Array.isArray(stored) && stored.length && stored.every((one) => typeof one === 'string') ? (stored as string[]) : null,
    )
    open.at('/p').keep('tree', ['src', 'src/client'])
    expect(open.at('/p').read('tree')).toEqual(['src', 'src/client'])
    open.at('/p').keep('tree', [])
    expect(open.at('/p').read('tree')).toBeNull()
    sessionStorage.setItem('kehikot.example.open:/p', '{"tree":"not a list"}')
    expect(open.at('/p').read('tree')).toBeNull()
  })

  test('the same scope is the same object, so it can be an effect dependency', () => {
    const drafts = held('kehikot.example.drafts')
    expect(drafts.at('/p')).toBe(drafts.at('/p'))
    expect(drafts.at(null)).toBe(drafts.at(undefined))
    expect(drafts.at('/p')).not.toBe(drafts.at('/q'))
  })

  test('a target cannot reach past the map it is kept in', () => {
    const here = held('kehikot.example.drafts').at('/p')
    here.keep('__proto__', draft('typed'))
    expect(here.read('__proto__')?.text).toBe('typed')
    expect(here.read('constructor')).toBeNull()
    expect(({} as { text?: string }).text).toBeUndefined()
  })

  test('without storage nothing is held and nothing throws', () => {
    const own = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage')
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      get() {
        throw new DOMException('The operation is insecure.', 'SecurityError')
      },
    })
    try {
      const drafts = held('kehikot.example.drafts')
      drafts.at('/p').keep('new', draft('typed'))
      expect(drafts.at('/p').read('new')).toBeNull()
      expect(drafts.at('/p').all()).toEqual({})
      expect(drafts.any()).toBe(false)
    } finally {
      if (own) Object.defineProperty(globalThis, 'sessionStorage', own)
    }
  })

  test('something else’s string under the name is nothing held', () => {
    sessionStorage.setItem('kehikot.example.drafts:/p', 'not json')
    expect(held('kehikot.example.drafts').at('/p').all()).toEqual({})
    sessionStorage.setItem('kehikot.example.drafts:/p', '[1,2]')
    expect(held('kehikot.example.drafts').any()).toBe(false)
  })
})
