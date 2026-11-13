import { afterEach, describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import { PACKAGE_VERSION, PROTOCOL, findMatches } from '../src/index.js'
import { pageFind } from '../src/client/find.js'

/**
 * 2.69.1: a whole word begins and ends where two pieces of text meet side by side. The client's
 * search reads a page's text as one string; `<span>#12</span><span>Migrate</span>` is `#12Migrate`
 * there, and `Migrate` was not a whole word. Now the meeting is a break, as a space is.
 */

const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..')

describe('the version', () => {
  test('is current, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.100.0')
    expect(PROTOCOL).toBe(2)
    expect(readFileSync(join(REPO, 'CHANGELOG.md'), 'utf8')).toContain('## 2.69.1')
  })
})

describe('findMatches with breaks', () => {
  test('a whole word may begin and end at a break', () => {
    expect(findMatches('#12Migrate', 'migrate', { wholeWord: true })).toEqual([])
    expect(findMatches('#12Migrate', 'migrate', { wholeWord: true }, new Set([3]))).toEqual([[3, 10]])
    expect(findMatches('Migrate2026', 'migrate', { wholeWord: true }, new Set([7]))).toEqual([[0, 7]])
  })

  test('a match is not otherwise stopped by a break', () => {
    expect(findMatches('Finder', 'finder', {}, new Set([4]))).toEqual([[0, 6]])
  })
})

afterEach(() => {
  document.body.innerHTML = ''
})

function page(html: string): HTMLElement {
  const root = document.createElement('div')
  root.innerHTML = html
  document.body.appendChild(root)
  return root
}

describe('the client\'s search', () => {
  const words = { caseSensitive: false, wholeWord: true }

  test('text in elements side by side meets at a break', () => {
    const root = page('<ul><li><span>#12</span><span>Migrate the store</span></li><li><span>#13</span><span>Migrated</span></li></ul>')
    const search = pageFind(() => {}, { root, visible: () => true, highlights: false })
    expect(search.run('migrate', words, 'first')).toEqual({ total: 1, current: 1 })
    search.close()
  })

  test('an element inside a run of text is still one run with it', () => {
    const root = page('<p>Re<b>find</b>ing and <i>find</i>.</p>')
    const search = pageFind(() => {}, { root, visible: () => true, highlights: false })
    expect(search.run('find', words, 'first')).toEqual({ total: 1, current: 1 })
    expect(search.run('refinding', words, 'first')).toEqual({ total: 1, current: 1 })
    search.close()
  })
})
