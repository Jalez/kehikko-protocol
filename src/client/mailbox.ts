/**
 * The one message listener a framed page has, installed the moment this file is imported and never
 * removed. Import the client from the page's ENTRY, not from a component or a lazy chunk. Every
 * message is recorded in the backlog and then delivered, so a re-subscriber answers a greeting twice.
 * Design notes: docs/client.md.
 */

/** Just enough of a window to listen to. `connect` takes one of these. */
export interface MessageSource {
  addEventListener(type: 'message', fn: (ev: MessageEvent) => void): void
  removeEventListener(type: 'message', fn: (ev: MessageEvent) => void): void
  /** Throw away the backlog, for a test suite and nothing else. A page must never call it. */
  forget?(): void
  /** Who to answer if a greeting arrives without a `source` on it: the frame's own parent. A last resort. */
  readonly parent?: Window | null
}

/** How many messages the backlog keeps. Oldest go first. */
export const KEEP = 64

/** The half of a window this needs: somewhere to listen, and a parent to guess at. */
interface Listenable {
  addEventListener(type: 'message', fn: (ev: MessageEvent) => void): void
  readonly parent?: Window | null
}

/**
 * Build a mailbox over one window, listening immediately. Exported for tests; nothing in a page
 * should call it — a second mailbox over the same window answers the same greeting twice.
 */
export function makeMailbox(target: Listenable | undefined): MessageSource {
  const backlog: MessageEvent[] = []
  const listeners = new Set<(ev: MessageEvent) => void>()

  target?.addEventListener('message', (ev: MessageEvent) => {
    backlog.push(ev)
    if (backlog.length > KEEP) backlog.shift()
    for (const listener of listeners) listener(ev)
  })

  return {
    get parent() {
      return target?.parent ?? null
    },
    forget() {
      backlog.length = 0
    },
    addEventListener(_type, fn) {
      /* Replayed SYNCHRONOUSLY, inside this call, and the caller has to know it — see `listen()`
         in `connect.ts`. */
      for (const ev of backlog) fn(ev)
      listeners.add(fn)
    },
    removeEventListener(_type, fn) {
      listeners.delete(fn)
    },
  }
}

/**
 * The page's inbox: the two listener methods of `window`, except that subscribing replays
 * everything that has already arrived. Outside a browser nothing ever posts to it; it does not crash.
 */
export const mailbox: MessageSource = makeMailbox(
  typeof window === 'undefined' ? undefined : (window as unknown as Listenable),
)
