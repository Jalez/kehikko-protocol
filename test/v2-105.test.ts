import { describe, expect, test } from 'bun:test'

import { expectFollowsPlace, followsPlace, settled, trackBackground, waitForWrites } from '../src/testing/index.js'

/* 2.105.0: the place-following check, and the waits for background work and the page's own writes. */

type Place = { id: string; content: string | null }
const FILLED: Place = { id: 'a', content: 'Thesis deck' }
const EMPTY: Place = { id: 'b', content: null }

/** A module's page as text: `forgets` is the bug, keeping what was shown when the place changes. */
function page(forgets: boolean, slowByMs = 0) {
  return {
    render: (place: Place) => ({ shown: place.content ?? 'Nothing here yet' }),
    switchTo: async (page: { shown: string }, place: Place) => {
      const next = place.content ?? (forgets ? page.shown : 'Nothing here yet')
      if (slowByMs) await new Promise((done) => setTimeout(done, slowByMs))
      page.shown = next
    },
    text: (page: { shown: string }) => page.shown,
    filled: { place: FILLED, marker: 'Thesis deck' },
    empty: EMPTY,
  }
}

describe('expectFollowsPlace', () => {
  test('a module that shows the empty state in an empty place passes', async () => {
    const said = await followsPlace(page(false))
    expect(said.failures).toEqual([])
    expect(said.passed).toHaveLength(3)
    await expectFollowsPlace(page(false))
  })

  test('a module that keeps the previous place’s content fails, and says what to do', async () => {
    const said = await followsPlace({ ...page(true), wait: { within: 400 } })
    expect(said.failures).toHaveLength(1)
    expect(said.failures[0]).toContain('switching to an empty place shows nothing of the place before')
    expect(said.failures[0]).toContain('key its state by the place')
    await expect(expectFollowsPlace({ ...page(true), wait: { within: 400 } })).rejects.toThrow('does not follow the place')
  })

  test('a module slow to clear is given the time it takes', async () => {
    await expectFollowsPlace(page(false, 150))
  })

  test('a check whose marker never shows says so instead of passing', async () => {
    const said = await followsPlace({ ...page(false), filled: { place: FILLED, marker: 'never there' }, wait: { within: 200 } })
    expect(said.failures[0]).toContain('never showed')
  })

  test('the drawn module is undrawn, whatever the outcome', async () => {
    const seen: string[] = []
    await followsPlace({ ...page(true), wait: { within: 200 }, dispose: () => void seen.push('disposed') })
    expect(seen).toEqual(['disposed'])
  })
})

describe('settled and trackBackground', () => {
  test('settled waits until nothing is pending, and says what it waited for when it gives up', async () => {
    let left = 3
    const started = Date.now()
    await settled(() => left-- > 0, { every: 5 })
    expect(left).toBeLessThan(0)
    expect(Date.now() - started).toBeLessThan(1000)
    await expect(settled(() => true, { within: 60, every: 10 })).rejects.toThrow('the background work to end')
  })

  test('work handed to trackBackground is waited for, including work started while waiting', async () => {
    const background = trackBackground()
    const done: string[] = []
    void background.run(async () => {
      await new Promise((resolve) => setTimeout(resolve, 40))
      done.push('first')
      void background.run(async () => {
        await new Promise((resolve) => setTimeout(resolve, 40))
        done.push('second')
      })
    })
    expect(background.pending).toBe(1)
    await background.settled()
    expect(done).toEqual(['first', 'second'])
    expect(background.pending).toBe(0)
  })

  test('a failure of tracked work is thrown where it is settled, not lost', async () => {
    const background = trackBackground()
    void background.run(Promise.reject(new Error('the post failed'))).catch(() => {})
    await expect(background.settled()).rejects.toThrow('the post failed')
  })
})

describe('waitForWrites', () => {
  test('waits for a write of the page’s own, then the next assertion sees only the test’s', async () => {
    const wrote: { tabs?: string[]; wrap?: boolean }[] = []
    setTimeout(() => wrote.push({ tabs: ['a'] }), 30)
    const seen = await waitForWrites(wrote, (write) => 'tabs' in write, { clear: true })
    expect(seen).toEqual([{ tabs: ['a'] }])
    expect(wrote).toEqual([])
    wrote.push({ wrap: false })
    expect(wrote).toEqual([{ wrap: false }])
  })

  test('says what it was waiting for when no such write comes', async () => {
    await expect(waitForWrites([] as number[], () => true, { within: 50, every: 10 })).rejects.toThrow('a write the page makes of its own')
  })
})
