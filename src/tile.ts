import type { ActivityItem, ActivityQuestion, ActivityState } from './activity.js'
import { STALLED_EVENT } from './turns.js'

/**
 * 2.58.0. An agent module drawn as a TILE: what a module that runs agent sessions shows when its
 * own box is too small for a terminal — the module's icon, large and centred, a ring that says what
 * the session is doing, the conversation's title under it, and a few quick actions. Pressing the
 * tile asks the host to show the container large (`view.expand`). The rule for when, and what each
 * state looks like, is here and pure; the drawing is `AgentTile` in `./client/react`.
 * Design notes: docs/client.md ("An agent module as a tile (2.58.0)").
 *
 * The state is read off what the module already reports (`activity.set`): one `ActivityItem` for
 * the session the page has on screen, or none. Nothing new is reported for it.
 */

/**
 * Under either of these, in CSS pixels of the module's own page, an agent module draws its tile.
 * A terminal narrower than 220 pixels holds about twenty columns, and one under 160 tall a handful
 * of rows: neither is a place to read a conversation in.
 */
export const TILE_BELOW = { width: 220, height: 160 } as const

/**
 * How far past `TILE_BELOW` a page must grow before it leaves its tile, so that a box resized by a
 * pixel or two around the line does not flip between the two views (and refit a terminal) each time.
 */
export const TILE_LEAVE_PX = 16

export interface BoxSize {
  width: number
  height: number
}

/**
 * Whether a page this size draws its tile. `was` is whether it draws one now: leaving takes
 * `TILE_LEAVE_PX` more than entering. A size of nothing (a hidden page, not laid out yet) is no
 * measurement, and keeps what was.
 */
export function isTile(size: BoxSize, was = false): boolean {
  const { width, height } = size
  if (!(width > 0) || !(height > 0)) return was
  const pad = was ? TILE_LEAVE_PX : 0
  return width < TILE_BELOW.width + pad || height < TILE_BELOW.height + pad
}

/**
 * The looks a tile has, each with the word a person reads for it. `question`, `attention` and
 * `stalled` are the three ways of needing the person; `done` is finished and not yet looked at.
 */
export const TILE_LOOKS = {
  idle: 'Idle',
  working: 'Working',
  question: 'Asks you',
  attention: 'Needs you',
  stalled: 'Stopped without finishing',
  done: 'Finished',
} as const
export type TileLook = keyof typeof TILE_LOOKS

/** The glyph on a tile's badge, so a look is never told by colour alone. Empty: no badge. */
export const TILE_BADGES: Record<TileLook, string> = {
  idle: '',
  working: '',
  question: '?',
  attention: '!',
  stalled: '!',
  done: '✓',
}

/** The looks that need the person. A tile in one of these is drawn in the attention colour. */
export const TILE_NEEDS_YOU: ReadonlySet<TileLook> = new Set(['question', 'attention', 'stalled'])

/** What a tile is drawn from: the parts of an `ActivityItem` it reads. */
export type TileItem = Pick<ActivityItem, 'state'> & Partial<Pick<ActivityItem, 'event' | 'label' | 'detail' | 'question'>>

export interface TileState {
  look: TileLook
  /** `TILE_LOOKS[look]`. */
  word: string
  /** The badge's glyph, `TILE_BADGES[look]`. */
  badge: string
  /** The whole state in one sentence, for the tooltip and the tile's accessible name. */
  sentence: string
  /** The question waiting for an answer, on a `question` tile; otherwise null. */
  question: ActivityQuestion | null
}

/** What a tile's sentence says about unread messages, or nothing for none. */
export function unreadWords(unread: number): string {
  if (!(unread > 0)) return ''
  return unread === 1 ? '1 unread message' : `${Math.floor(unread)} unread messages`
}

const end = (text: string) => (/[.?!…][”’"]?$/.test(text) ? text : `${text}.`)

/**
 * The look and words of a tile for the session's item (`null`: nothing reported, idle). `title` is
 * the conversation's, `name` the module's ("Claude"), `unread` how many messages for the session
 * are unread. The ONE mapping every agent module's tile uses:
 *
 *   - `working` is working;
 *   - `attention` with a `question` is a question, asked in the sentence;
 *   - `attention` as `STALLED_EVENT` stopped without finishing;
 *   - any other `attention` needs the person, with its `detail` or `label`;
 *   - `done` is finished.
 */
export function tileStateOf(
  item: TileItem | null | undefined,
  about: { title?: string | null; name?: string | null; unread?: number } = {},
): TileState {
  const look: TileLook = !item
    ? 'idle'
    : item.state === 'working'
      ? 'working'
      : item.state === 'done'
        ? 'done'
        : item.question
          ? 'question'
          : item.event === STALLED_EVENT
            ? 'stalled'
            : 'attention'
  const word = TILE_LOOKS[look]
  const question = look === 'question' ? (item?.question ?? null) : null
  const said = question ? `“${question.text}”` : look === 'attention' ? (item?.detail || item?.label || '').trim() : ''
  const who = [about.name, about.title].map((one) => (one ?? '').trim()).filter(Boolean).join(' — ')
  const parts = [who ? end(who) : '', end(said ? `${word}: ${said}` : word), unreadWords(about.unread ?? 0) ? end(unreadWords(about.unread ?? 0)) : '']
  return { look, word, badge: TILE_BADGES[look], sentence: parts.filter(Boolean).join(' '), question }
}

const RANK: Record<ActivityState, number> = { attention: 3, working: 2, done: 1 }

/**
 * The one item a tile shows out of several for its session: the one that needs the person most
 * (`attention` over `working` over `done`), and of those that need the person, one with a question
 * first. Null for none.
 */
export function tileItemOf<T extends TileItem>(items: readonly T[]): T | null {
  let best: T | null = null
  for (const item of items) {
    if (!best) {
      best = item
      continue
    }
    const rank = RANK[item.state] - RANK[best.state]
    if (rank > 0 || (rank === 0 && item.question && !best.question)) best = item
  }
  return best
}

/** The quick actions a tile offers, and the word each says. */
export const TILE_ACTIONS = {
  expand: 'Expand',
  answer: 'Answer',
  compact: 'Compact',
  clear: 'Clear',
} as const
export type TileAction = keyof typeof TILE_ACTIONS

/**
 * Which of a tile's parts fit a box this size: the title under the icon, the row of quick actions
 * (Expand, and Answer when a question waits), and Compact and Clear beside them. Everything a tile
 * does is still reached without them: the whole tile expands, and the large view has the rest.
 */
export function tileRoom(size: BoxSize): { title: boolean; actions: boolean; commands: boolean; icon: number } {
  const { width, height } = size
  const least = Math.max(0, Math.min(width, height))
  const title = width >= 72 && height >= 96
  const actions = width >= 96 && height >= 120
  const commands = actions && width >= 180 && height >= 150
  /* The icon takes what the other parts leave: about two fifths of the short side, within reason. */
  const icon = Math.round(Math.min(72, Math.max(20, least * (actions ? 0.36 : 0.46))))
  return { title, actions, commands, icon }
}
