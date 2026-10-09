/**
 * A page following its own server's events. `EventSource` gives up for good when the answer is
 * not a stream; this reconnects then too, and says `detached` in the meantime.
 */
export type Attachment = 'connecting' | 'attached' | 'detached'

export interface FollowOptions {
  /** Appended to the path as a query string. */
  query?: Record<string, string | number | boolean | null | undefined>
  /** Told every change: `connecting`, then `attached`, and `detached` whenever the stream is not open. */
  onAttachment?: (attachment: Attachment) => void
  /** The first pause before reconnecting, doubled up to `maxRetryMs`. Default 1000. */
  retryMs?: number
  /** Default 15000. */
  maxRetryMs?: number
  /** For tests. Default: the page's own `EventSource`. */
  EventSource?: typeof EventSource
}

/**
 * Follow a server-sent-event door. Each event's data is parsed as JSON and
 * handed over; one that is not JSON is dropped. Returns the function that
 * stops following.
 */
export function follow<T = unknown>(path: string, onEvent: (event: T) => void, options: FollowOptions = {}): () => void {
  const Source = options.EventSource ?? (typeof EventSource === 'undefined' ? null : EventSource)
  const say = (attachment: Attachment) => options.onAttachment?.(attachment)
  if (!Source) {
    say('detached')
    return () => {}
  }

  const query = new URLSearchParams()
  for (const [name, value] of Object.entries(options.query ?? {})) {
    if (value !== null && value !== undefined) query.set(name, String(value))
  }
  const text = query.toString()
  const url = text ? `${path}${path.includes('?') ? '&' : '?'}${text}` : path

  const first = options.retryMs ?? 1000
  const most = options.maxRetryMs ?? 15_000
  let pause = first
  let source: EventSource | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  let stopped = false

  const open = () => {
    if (stopped) return
    say('connecting')
    const live = new Source(url)
    source = live
    live.onopen = () => {
      pause = first
      say('attached')
    }
    live.onmessage = (message) => {
      try {
        onEvent(JSON.parse(String(message.data)) as T)
      } catch {
        /* Not JSON, so not ours. */
      }
    }
    live.onerror = () => {
      if (stopped) return
      say('detached')
      /* Still CONNECTING means the browser is retrying by itself. CLOSED means it gave up. */
      if (live.readyState !== 2) return
      live.close()
      timer = setTimeout(open, pause)
      pause = Math.min(pause * 2, most)
    }
  }
  open()

  return () => {
    stopped = true
    if (timer !== null) clearTimeout(timer)
    source?.close()
  }
}
