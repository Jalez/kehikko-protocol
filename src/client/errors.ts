import { MESSAGE } from '../constants.js'
import { LIMITS } from '../limits.js'
import { NO_MESSAGE, PAGE_ERRORS_GLOBAL, PAGE_ERRORS_MAX, STACK_LINES } from '../page.js'
import { mayGreet, pageOrigins } from './greet.js'

export { NO_MESSAGE, PAGE_ERRORS_GLOBAL, PAGE_ERRORS_MAX, STACK_LINES } from '../page.js'

/**
 * When the page fails (2.59.0): every uncaught error and unhandled rejection on a module's page,
 * said to the host as `kehikot.page.error` — before the greeting too, and when nothing on the page
 * ever answers it. Installed over `window` the moment the mailbox is (importing the client from the
 * page's entry installs both). Design notes: docs/client.md, "When the page fails".
 *
 * A page that threw before `connect` was greeted by a host and said nothing: the host could fetch
 * every file of it and say only that the page was "choosing not to answer". This is the page saying
 * why. What it sends is the error's message, where it was caught, and the first lines of its stack;
 * at most `PAGE_ERRORS_MAX` different ones per document, each once.
 *
 * The page document a module's doors serve carries a blocking script of its own (`errorsScript` in
 * `serve/page.ts`) that does the same from before any module script runs — the only thing that can
 * catch a page whose scripts never ran (an import that does not link). When this installs it takes
 * that script's errors over and switches it off (`PAGE_ERRORS_GLOBAL`).
 */


/** What the host is sent: the message on the wire, as built here. */
export interface PageError {
  type: typeof MESSAGE.PAGE_ERROR
  message: string
  where: string
  stack: string
}


/** The first `STACK_LINES` lines of a stack, cut to `LIMITS.PAGE_ERROR_STACK`. Pure. */
export function trimStack(stack: string): string {
  return stack.split('\n').slice(0, STACK_LINES).join('\n').slice(0, LIMITS.PAGE_ERROR_STACK)
}

/**
 * The words and the stack of anything thrown: `TypeError: x is undefined` for an error (its name
 * and message), the text of a string, and something readable for the rest. Never throws. Pure.
 */
export function describeError(error: unknown, fallback = NO_MESSAGE): { message: string; stack: string } {
  try {
    if (error instanceof Error || (typeof error === 'object' && error !== null && 'message' in error)) {
      const named = error as { name?: unknown; message?: unknown; stack?: unknown }
      const name = typeof named.name === 'string' && named.name ? named.name : ''
      const said = typeof named.message === 'string' ? named.message : ''
      const message = name && said ? `${name}: ${said}` : said || name || fallback
      const stack = typeof named.stack === 'string' ? named.stack : ''
      return { message: message.slice(0, LIMITS.PAGE_ERROR_MESSAGE), stack: trimStack(stack) }
    }
    if (error === undefined || error === null || error === '') return { message: fallback.slice(0, LIMITS.PAGE_ERROR_MESSAGE), stack: '' }
    const text = typeof error === 'string' ? error : JSON.stringify(error) ?? String(error)
    return { message: text.slice(0, LIMITS.PAGE_ERROR_MESSAGE) || fallback, stack: '' }
  } catch {
    return { message: fallback, stack: '' }
  }
}

/** What a window error event carries that this reads. */
interface ErrorEventLike {
  error?: unknown
  message?: string
  filename?: string
  lineno?: number
  colno?: number
}

/** And a rejection event. */
interface RejectionEventLike {
  reason?: unknown
}

/** Just enough of a window to listen on and to find the parent of. */
export interface ErrorTarget {
  addEventListener(type: 'error' | 'unhandledrejection', fn: (ev: never) => void): void
  readonly parent?: Window | null
}

export interface PageErrors {
  /** Say one failure. `where` is `PAGE_ERROR_WHERE`'s word; `more` is added under the stack (a component stack). */
  report(error: unknown, where?: string, more?: string): void
  /**
   * A message reached the page. A greeting the page may take (`mayGreet`) names who to tell, and
   * everything already caught is said to it at once. The mailbox calls this for every message.
   */
  heard(ev: Pick<MessageEvent, 'data' | 'origin' | 'source'>): void
  /** Every failure caught so far, as sent or to be sent. For a test. */
  caught(): readonly PageError[]
}

interface EarlyGlobal {
  list?: unknown
  off?: boolean
}

/**
 * Build a reporter over one window, listening immediately. Exported for tests; nothing in a page
 * should call it — `pageErrors` is the one for the page, and a second would say every failure twice.
 */
export function makePageErrors(
  target: ErrorTarget | undefined,
  options: { origins?: () => readonly string[] | null; self?: () => { window?: unknown; origin?: string | null } } = {},
): PageErrors {
  const caught: PageError[] = []
  let host: { window: Window; origin: string } | null = null
  const origins = options.origins ?? pageOrigins
  const self =
    options.self
    ?? (() => (typeof window === 'undefined' ? {} : { window, origin: typeof location === 'undefined' ? null : location.origin }))

  const post = (message: PageError) => {
    if (!host) return
    try {
      host.window.postMessage(message, host.origin)
    } catch {
      /* A host window that went away. Nothing on this page may fail for saying it failed. */
    }
  }

  const add = (message: string, where: string, stack: string) => {
    if (caught.some((one) => one.message === message && one.where === where)) return
    if (caught.length >= PAGE_ERRORS_MAX) return
    const said: PageError = {
      type: MESSAGE.PAGE_ERROR,
      message: message.slice(0, LIMITS.PAGE_ERROR_MESSAGE) || NO_MESSAGE,
      where: where.slice(0, LIMITS.PAGE_ERROR_WHERE),
      stack: stack.slice(0, LIMITS.PAGE_ERROR_STACK),
    }
    caught.push(said)
    post(said)
  }

  const reporter: PageErrors = {
    report(error, where = 'reported', more) {
      try {
        const { message, stack } = describeError(error)
        add(message, where, more ? trimStack(`${stack}\n${more.trim()}`.trim()) : stack)
      } catch {
        /* Never a second failure out of the first. */
      }
    },
    heard(ev) {
      const data = ev.data as { type?: unknown } | null
      if (typeof data !== 'object' || data === null || data.type !== MESSAGE.HELLO) return
      if (!mayGreet(ev, origins(), self())) return
      const from = (ev.source as Window | null) ?? target?.parent ?? null
      if (!from) return
      host = { window: from, origin: ev.origin && ev.origin !== 'null' ? ev.origin : '*' }
      /* Every greeting may be a new conversation, which has heard none of it. */
      for (const one of caught) post(one)
    },
    caught: () => caught,
  }

  if (target) {
    /* What the page document's own script caught before any module ran, and then it stops. */
    const early = (target as unknown as Record<string, EarlyGlobal | undefined>)[PAGE_ERRORS_GLOBAL]
    if (early && typeof early === 'object') {
      early.off = true
      if (Array.isArray(early.list)) {
        for (const one of early.list as { message?: unknown; where?: unknown; stack?: unknown }[]) {
          if (typeof one?.message === 'string') add(one.message, typeof one.where === 'string' ? one.where : 'error', typeof one.stack === 'string' ? one.stack : '')
        }
      }
    }
    target.addEventListener('error', ((ev: ErrorEventLike) => {
      const at = ev.filename ? ` (${ev.filename}${ev.lineno ? `:${ev.lineno}${ev.colno ? `:${ev.colno}` : ''}` : ''})` : ''
      const { message, stack } = describeError(ev.error, `${ev.message || NO_MESSAGE}${at}`)
      add(message, 'error', stack || at.trim())
    }) as (ev: never) => void)
    target.addEventListener('unhandledrejection', ((ev: RejectionEventLike) => {
      const { message, stack } = describeError(ev.reason, 'A promise was rejected with nothing.')
      add(message, 'rejection', stack)
    }) as (ev: never) => void)
  }

  return reporter
}

/** The page's reporter, over `window`. Outside a browser it listens to nothing and does not crash. */
export const pageErrors: PageErrors = makePageErrors(
  typeof window === 'undefined' ? undefined : (window as unknown as ErrorTarget),
)

/**
 * Say a failure the page caught itself and cannot recover from, so the host shows it (2.59.0):
 * `reportPageError(error)` in a `catch`. Uncaught errors and unhandled rejections are said without
 * this; `where` defaults to `reported`.
 */
export function reportPageError(error: unknown, where: string = 'reported', more?: string): void {
  pageErrors.report(error, where, more)
}
