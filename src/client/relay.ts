import type { PointerEventLike, PointerTarget } from './connect.js'

/**
 * 2.70.0. Long press from nested frames: a press inside an iframe the page owns — a PDF viewer, a
 * preview, an editor in a frame of its own — is not heard on the page's window, so the host never
 * learned of it (`kehikot.pointer`) and a long press there revealed nothing. `relayPointer` hears it.
 * Design notes: docs/client.md, "What every container gets by default (2.70.0)".
 *
 * Two ways, by what the page can reach:
 *  - a frame on the page's own origin: its window is listened on directly, again after each load;
 *  - a frame on another origin (a viewer served elsewhere): it cannot be reached, so the viewer runs
 *    `pointerShim` (bundled in) or `pointerShimScript()` (one `<script>`), which posts each press to
 *    the page as `RELAY_POINTER`, and `relayPointer(…, { origin })` takes only those from that frame
 *    and that origin.
 * Either way the presses go through the connection's own pointer reporting: told only to a host that
 * asked (`hello.pointer`), with the same slop and the same rules for a cancel.
 */

/** What the shim posts. Not a `kehikot.` type: it is between a page and its own frame, never on the wire. */
export const RELAY_POINTER = 'kehikot-relay.pointer'

/** The events relayed: what `connect` listens to for a press. */
export const RELAYED_EVENTS = ['pointerdown', 'pointerup', 'pointercancel', 'pointermove', 'mousemove', 'mouseup', 'dragend'] as const

/** What takes the presses: a `Connection`, a `hostStore`, or `useHost`'s value. */
export interface PointerSink {
  pointerFrom: (target: PointerTarget) => () => void
}

/** Just enough of an iframe. */
export interface FrameLike {
  readonly contentWindow: unknown
  addEventListener(type: 'load', listener: () => void): void
  removeEventListener(type: 'load', listener: () => void): void
}

/** Where the shim's messages arrive: the page's window, or anything shaped like it. */
export interface RelayMessages {
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void
  removeEventListener(type: 'message', listener: (event: MessageEvent) => void): void
}

export interface RelayOptions {
  /**
   * The origin of a frame the page cannot reach, whose viewer runs the shim: its messages are taken
   * from that frame's window and this origin only. Absent: the frame is listened on directly, which
   * works only on the page's own origin.
   */
  origin?: string
  /** Where the shim's messages are heard: the page's `window` by default. For tests. */
  messages?: RelayMessages
}

/** One press as the shim says it. */
interface Relayed {
  type: typeof RELAY_POINTER
  event: string
  button?: number
  isPrimary?: boolean
  clientX?: number
  clientY?: number
  pointerType?: string
}

/** A target that says to its listeners whatever it is handed: the shim's messages, as events. */
function relayTarget(): PointerTarget & { emit: (type: string, event: PointerEventLike) => void } {
  const listeners = new Map<string, Set<(event: PointerEventLike) => void>>()
  return {
    addEventListener(type, listener) {
      let set = listeners.get(type)
      if (!set) listeners.set(type, (set = new Set()))
      set.add(listener)
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener)
    },
    emit(type, event) {
      for (const listener of [...(listeners.get(type) ?? [])]) listener(event)
    },
  }
}

const num = (value: unknown): number | undefined => (typeof value === 'number' && Number.isFinite(value) ? value : undefined)

/**
 * Hear presses inside `frame` and tell the host of them as if they were on the page. Returns the
 * function that stops. Call it once the frame is in the document (an effect); a frame that loads
 * another document is listened on again.
 */
export function relayPointer(sink: PointerSink, frame: FrameLike, options: RelayOptions = {}): () => void {
  if (options.origin !== undefined) {
    const target = relayTarget()
    const stop = sink.pointerFrom(target)
    const messages = options.messages ?? (typeof window === 'undefined' ? null : (window as unknown as RelayMessages))
    const heard = (event: MessageEvent) => {
      if (event.source !== frame.contentWindow) return
      if (options.origin !== '*' && event.origin !== options.origin) return
      const data = event.data as Relayed | null
      if (typeof data !== 'object' || data === null || data.type !== RELAY_POINTER) return
      if (!(RELAYED_EVENTS as readonly string[]).includes(data.event)) return
      target.emit(data.event, {
        button: num(data.button),
        isPrimary: typeof data.isPrimary === 'boolean' ? data.isPrimary : undefined,
        clientX: num(data.clientX),
        clientY: num(data.clientY),
        pointerType: typeof data.pointerType === 'string' ? data.pointerType : undefined,
      })
    }
    messages?.addEventListener('message', heard)
    return () => {
      messages?.removeEventListener('message', heard)
      stop()
    }
  }

  let current: (() => void) | null = null
  const attach = () => {
    current?.()
    current = null
    const inner = frame.contentWindow as (PointerTarget & { document?: unknown }) | null
    if (!inner) return
    try {
      /* Reading `document` of a window on another origin throws: that frame needs the shim. */
      void inner.document
    } catch {
      return
    }
    current = sink.pointerFrom(inner)
  }
  attach()
  frame.addEventListener('load', attach)
  return () => {
    frame.removeEventListener('load', attach)
    current?.()
    current = null
  }
}

/**
 * The viewer's half, for a frame on another origin: post every press to the page that framed it, as
 * `RELAY_POINTER`. Bundle it into the viewer and call it once; `origin` is the page's origin (only
 * it is told). Returns the function that stops. Self-contained, so `pointerShimScript` can inline it.
 */
export function pointerShim(options: { origin?: string; target?: unknown; parent?: unknown } = {}): () => void {
  const target = (options.target ?? (typeof window === 'undefined' ? null : window)) as {
    addEventListener(type: string, fn: (event: Record<string, unknown>) => void, options?: unknown): void
    removeEventListener(type: string, fn: (event: Record<string, unknown>) => void, options?: unknown): void
  } | null
  const parent = (options.parent ?? (typeof window === 'undefined' ? null : window.parent)) as { postMessage(message: unknown, origin: string): void } | null
  if (!target || !parent || parent === (target as unknown)) return () => {}
  const origin = options.origin ?? '*'
  const types = ['pointerdown', 'pointerup', 'pointercancel', 'pointermove', 'mousemove', 'mouseup', 'dragend']
  const fn = (event: Record<string, unknown>) => {
    try {
      parent.postMessage(
        { type: 'kehikot-relay.pointer', event: event.type, button: event.button, isPrimary: event.isPrimary, clientX: event.clientX, clientY: event.clientY, pointerType: event.pointerType },
        origin,
      )
    } catch {
      /* A page that went away. */
    }
  }
  for (const type of types) target.addEventListener(type, fn, { capture: true, passive: true })
  return () => {
    for (const type of types) target.removeEventListener(type, fn, { capture: true })
  }
}

/** `pointerShim` as one script to put in a viewer's page (`<script>…</script>`), telling `origin` only. */
export function pointerShimScript(origin: string): string {
  return `;(${pointerShim.toString()})({ origin: ${JSON.stringify(origin)} });`
}
