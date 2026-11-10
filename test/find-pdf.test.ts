import { afterEach, describe, expect, test } from 'bun:test'

import { pdfTextLayerFind } from '../src/client/find-adapters.ts'

/* Sheets as a lazy PDF viewer draws them: each a `.pdf-page`, some with their `.textLayer`. */
function sheets(laid: boolean[]): HTMLElement {
  const root = document.createElement('div')
  for (const has of laid) {
    const sheet = document.createElement('div')
    sheet.className = 'pdf-page'
    if (has) {
      const layer = document.createElement('div')
      layer.className = 'textLayer'
      layer.textContent = 'words'
      sheet.append(layer)
    }
    root.append(sheet)
  }
  document.body.append(root)
  return root
}

const ask = (direction: 'first' | 'next' | 'prev' | 'close') => ({ caseSensitive: false, wholeWord: false, direction })

afterEach(() => {
  document.body.innerHTML = ''
})

describe('pdfTextLayerFind', () => {
  test('opens on the first search, tells its hearers, and leaves the search to the client', async () => {
    const root = sheets([true, true])
    const find = pdfTextLayerFind({ root: () => root })
    let heard = 0
    find.subscribe(() => heard++)
    expect(find.open()).toBe(false)
    expect(await find.onFind('w', ask('first'))).toBe('default')
    expect(find.open()).toBe(true)
    expect(await find.onFind('w', ask('next'))).toBe('default')
    expect(heard).toBe(1)
  })

  test('waits until every sheet has its text layer', async () => {
    const root = sheets([true, false])
    const find = pdfTextLayerFind({ root: () => root, every: 5, within: 2000 })
    let answered = false
    const answer = find.onFind('w', ask('first')).then((said) => {
      answered = true
      return said
    })
    await new Promise((r) => setTimeout(r, 30))
    expect(answered).toBe(false)
    const layer = document.createElement('div')
    layer.className = 'textLayer'
    root.children[1]!.append(layer)
    expect(await answer).toBe('default')
  })

  test('reads what is there once the wait is over', async () => {
    const root = sheets([false])
    const find = pdfTextLayerFind({ root: () => root, every: 5, within: 20 })
    const started = Date.now()
    expect(await find.onFind('w', ask('first'))).toBe('default')
    expect(Date.now() - started).toBeGreaterThanOrEqual(15)
  })

  test('at once when no PDF is drawn', async () => {
    const find = pdfTextLayerFind({ root: () => document.createElement('div'), within: 10_000 })
    expect(await find.onFind('w', ask('first'))).toBe('default')
  })

  test('close says nothing, closes, and stops telling an unsubscribed hearer', async () => {
    const root = sheets([true])
    const find = pdfTextLayerFind({ root: () => root })
    let heard = 0
    const stop = find.subscribe(() => heard++)
    await find.onFind('w', ask('first'))
    expect(await find.onFind('w', ask('close'))).toBeUndefined()
    expect(find.open()).toBe(false)
    stop()
    await find.onFind('w', ask('first'))
    find.close()
    expect(heard).toBe(2)
  })

  test('a custom sheet and layer selector', async () => {
    const root = document.createElement('div')
    root.innerHTML = '<section class="sheet"><div class="words"></div></section>'
    const find = pdfTextLayerFind({ root: () => root, sheet: '.sheet', layer: '.words', within: 10_000 })
    expect(await find.onFind('w', ask('first'))).toBe('default')
  })
})
