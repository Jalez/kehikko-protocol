import { LIMITS } from '../limits.js'

/**
 * 2.70.0. The kept view: what every container keeps without its module writing a line — where its
 * page was scrolled to, and which option each of its header's switches and toggles was on — in the
 * same string the host keeps for the container (`state.set`, `context.kept`, `LIMITS.MODULE_STATE`).
 * Design notes: docs/client.md, "What every container gets by default (2.70.0)".
 *
 * The module's own kept state is not touched: the string is an envelope, `KEPT_VIEW_MARK` and then
 * `{"view":…,"state":…}`, with the module's own string as it wrote it under `state`. A string without
 * the mark is the module's own, whole, as before 2.70.0, and is what is written while the view is
 * empty. A client before 2.70.0 reading an envelope finds something its codec does not recognise and
 * starts as a first run: nothing is misread.
 */

/** What starts an envelope. No JSON value, and no string a codec wrote before 2.70.0, starts with it. */
export const KEPT_VIEW_MARK = 'kehikot.view/1:'

/** The attribute that names a page's main scroller, when it is not the document itself. */
export const KEEP_SCROLL_ATTRIBUTE = 'data-kehikot-scroll'

/** How long, in ms, after the last scroll the position is kept: a scroll is many events and one write. */
export const KEEP_SCROLL_AFTER_MS = 600

/** How long, in ms, a restored position is tried for while the page is still drawing what it reaches. */
export const RESTORE_SCROLL_WITHIN_MS = 3000

/** What the client keeps for a container by itself. */
export interface KeptView {
  /** The main scroller's `scrollTop`, in whole CSS pixels. */
  scroll?: number
  /** Each header switch's `value` and toggle's `checked`, by item id. */
  header?: Record<string, string | boolean>
}

/** The view and the module's own string, read out of what the host kept. Pure; never throws. */
export function unwrapKept(raw: string | null | undefined): { view: KeptView | null; state: string | null } {
  if (typeof raw !== 'string') return { view: null, state: null }
  if (!raw.startsWith(KEPT_VIEW_MARK)) return { view: null, state: raw }
  try {
    const parsed = JSON.parse(raw.slice(KEPT_VIEW_MARK.length)) as { view?: unknown; state?: unknown }
    return { view: viewOf(parsed?.view), state: typeof parsed?.state === 'string' ? parsed.state : null }
  } catch {
    return { view: null, state: null }
  }
}

/**
 * The string to keep: the module's own when the view is empty, the envelope otherwise. When the
 * envelope would be longer than the host keeps, the view gives way (header values first, then the
 * scroll): the module's own state always wins. Pure.
 */
export function wrapKept(view: KeptView | null, state: string | null, most: number = LIMITS.MODULE_STATE): string | null {
  let kept = viewOf(view)
  const wrap = (one: KeptView) => `${KEPT_VIEW_MARK}${JSON.stringify({ view: one, state })}`
  while (kept) {
    const text = wrap(kept)
    if (text.length <= most) return text
    if (kept.header && Object.keys(kept.header).length) {
      const keys = Object.keys(kept.header)
      const header = { ...kept.header }
      delete header[keys[keys.length - 1]!]
      kept = viewOf({ ...kept, header })
    } else if (kept.scroll !== undefined) {
      kept = viewOf({ header: kept.header })
    } else kept = null
  }
  return state
}

/** A view off the wire, or null when there is nothing in it. Pure. */
export function viewOf(value: unknown): KeptView | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const said = value as { scroll?: unknown; header?: unknown }
  const view: KeptView = {}
  if (typeof said.scroll === 'number' && Number.isFinite(said.scroll) && said.scroll > 0) view.scroll = Math.round(said.scroll)
  if (typeof said.header === 'object' && said.header !== null && !Array.isArray(said.header)) {
    const header: Record<string, string | boolean> = {}
    for (const [id, one] of Object.entries(said.header as Record<string, unknown>)) {
      if (typeof one === 'string' || typeof one === 'boolean') header[id] = one
    }
    if (Object.keys(header).length) view.header = header
  }
  return view.scroll !== undefined || view.header ? view : null
}

/** Each switch's `value` and toggle's `checked` in a header as a module wrote it, by id. Pure. */
export function headerValues(items: unknown, keep: (id: string) => boolean = () => true): Record<string, string | boolean> {
  const values: Record<string, string | boolean> = {}
  if (!Array.isArray(items)) return values
  for (const item of items as { kind?: unknown; id?: unknown; value?: unknown; checked?: unknown }[]) {
    if (typeof item !== 'object' || item === null || typeof item.id !== 'string' || !keep(item.id)) continue
    if (item.kind === 'switch' && typeof item.value === 'string') values[item.id] = item.value
    else if (item.kind === 'toggle' && typeof item.checked === 'boolean') values[item.id] = item.checked
  }
  return values
}
