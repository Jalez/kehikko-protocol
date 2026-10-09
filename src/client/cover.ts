import { createElement, useEffect, useInsertionEffect, useState, useSyncExternalStore, type ReactElement } from 'react'

import { PAGE_OLD, PAGE_STALE, STALE_RELOAD_MS, onServerStanding, reloadStalePage, serverStanding, type ServerStanding } from './ask.js'
import type { Where } from './host-store.js'

/**
 * The one screen for every moment a module has nothing of its own to show: the kehikko mark and
 * one sentence, the module's half of the host's `ModuleCover`. See docs/module-plumbing.md.
 */

/**
 * Every not-ready state a module has. `coverFor` answers the first seven, which are read off the
 * host's and the server's standing; `refused` and `empty` are a module's own findings, and it
 * passes them itself.
 */
export type CoverState =
  /** Nothing has greeted the page yet, and the grace has not run out. */
  | 'waiting'
  /** Nobody is framing the page: it was opened on its own. */
  | 'unhosted'
  /** A host is there and no project is open, or it did not say where the project is. */
  | 'no-project'
  /** A project is open and no epic is. */
  | 'no-epic'
  /** The module is reading its own material. */
  | 'loading'
  /** The module's own server did not answer. Comes with Try again. */
  | 'down'
  /** The module's server restarted under this page. The page reloads. */
  | 'stale'
  /** Something was asked — the host, the module's own server — and said no. Give its sentence as `detail`; comes with Try again when there is an `onRetry`. */
  | 'refused'
  /** Everything was read, and there is nothing to show. An answer, not a wait. */
  | 'empty'

/**
 * The sentences. One each, plain, and the same in every module. `name` is what
 * the module is called ("History"); without one it is "This app".
 */
export const COVER_WORDS: Record<CoverState, (name?: string) => string> = {
  waiting: () => 'Waiting for Kehikot…',
  unhosted: (name) => `Nothing is framing this page — open ${name ?? 'this app'} in Kehikot.`,
  'no-project': () => 'No project is open — open one in Kehikot.',
  'no-epic': () => 'No epic is open — open one in Kehikot.',
  loading: () => 'Loading…',
  down: (name) => `${name ? `${name}${/s$/i.test(name) ? '’' : '’s'}` : 'This app’s'} own server is not answering.`,
  stale: () => PAGE_STALE,
  refused: (name) => `${name ?? 'This app'} was told no.`,
  empty: () => 'Nothing here yet.',
}

/** The label on the one button, drawn for `down` and `refused`. */
export const TRY_AGAIN = 'Try again'

/** The states in which something is on its way, so the mark breathes. The rest are still. */
const WORKING: ReadonlySet<CoverState> = new Set(['waiting', 'loading', 'stale'])

/** The states that come with the button, when there is something for it to do. */
const RETRIED: ReadonlySet<CoverState> = new Set(['down', 'refused'])

/**
 * Which cover a host's standing calls for, or `null` when the module can draw its own screen.
 * Never `refused` or `empty`: those are the module's to find.
 * `needs` says what the module cannot work without: a `host` (anything framing it), a `project`,
 * an `epic`. Not greeted yet is `waiting`, never `no-project`. An epic asks for a project too,
 * unless `project: false` says the module reads no project folder. Given the `server`'s standing
 * as well, the answer covers that: `stale` before everything, `down` after what the host lacks.
 */
export function coverFor(
  host: { where: Where; projectPath: string | null; epic?: string | null; server?: ServerStanding },
  needs: { host?: boolean; project?: boolean; epic?: boolean } = { project: true },
): CoverState | null {
  if (host.server === 'stale') return 'stale'
  if (host.where === 'listening') return 'waiting'
  const down = host.server === 'down' ? 'down' : null
  if (!needs.host && !needs.project && !needs.epic) return down
  if (host.where === 'unhosted') return 'unhosted'
  if ((needs.project ?? needs.epic) && !host.projectPath) return 'no-project'
  if (needs.epic && !host.epic) return 'no-epic'
  return down
}

/** How this page's own server last answered (`up`, `down`, `stale`), as React state. Fed by every `ask()`. */
export function useServerStanding(): ServerStanding {
  return useSyncExternalStore(onServerStanding, serverStanding, serverStanding)
}

/*
 * One small stylesheet, added to the document the first time a cover is drawn: unlayered rules
 * under one class, so no module's Tailwind has to be told about this package. Why not inline
 * styles: docs/module-plumbing.md.
 */
export const COVER_STYLE_ID = 'kehikot-cover-style'

export const COVER_CSS = `
.kehikot-cover{box-sizing:border-box;flex:1 1 auto;width:100%;height:100%;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:16px;text-align:center;font:400 clamp(12px,3.2vw,14px)/1.5 ui-sans-serif,system-ui,sans-serif;color:var(--muted-foreground,oklch(0.5 0 0))}
.dark .kehikot-cover{color:var(--muted-foreground,oklch(0.62 0 0))}
.kehikot-cover svg{width:clamp(28px,9vw,40px);height:clamp(28px,9vw,40px);flex:none}
.kehikot-cover svg *{stroke:currentColor;stroke-width:1.25;fill:none;stroke-linecap:square}
.kehikot-cover p{margin:0;max-width:40ch;text-wrap:balance}
.kehikot-cover p[data-detail]{font-size:.86em;opacity:.8;overflow-wrap:anywhere}
.kehikot-cover button{font:inherit;color:var(--foreground,inherit);background:transparent;border:1px solid var(--border,currentColor);border-radius:6px;padding:3px 10px;cursor:pointer}
.kehikot-cover button:hover{background:var(--accent,transparent)}
.kehikot-cover button:focus-visible{outline:2px solid var(--ring,currentColor);outline-offset:2px}
.kehikot-cover[data-working=true] svg g{animation:kehikot-cover-breathe 3.4s ease-in-out infinite}
@keyframes kehikot-cover-breathe{0%,100%{opacity:1}50%{opacity:.55}}
@media (prefers-reduced-motion:reduce){.kehikot-cover[data-working=true] svg g{animation:none}}
@media (max-height:150px){.kehikot-cover{gap:6px;padding:8px}.kehikot-cover svg{display:none}}
.kehikot-cover[data-strip=true]{flex:none;height:auto;flex-direction:row;justify-content:space-between;gap:8px;padding:4px 8px;text-align:left;font-size:11px;border-top:1px solid var(--border,currentColor)}
.kehikot-cover[data-strip=true] p{max-width:none;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kehikot-cover[data-strip=true] p[data-detail]{display:none}
.kehikot-cover[data-strip=true] button{flex:none;padding:1px 8px}
`

function style(): void {
  if (typeof document === 'undefined' || document.getElementById(COVER_STYLE_ID)) return
  const sheet = document.createElement('style')
  sheet.id = COVER_STYLE_ID
  sheet.textContent = COVER_CSS
  document.head.appendChild(sheet)
}

/** The kehikko mark, finished and still: the frame, drawn. */
function mark(): ReactElement {
  const line = (x1: number, y1: number, x2: number, y2: number) => createElement('line', { key: `${x1}-${y1}-${x2}-${y2}`, x1, y1, x2, y2 })
  return createElement(
    'svg',
    { viewBox: '10 -10 108 108', 'aria-hidden': true },
    createElement(
      'g',
      null,
      createElement('path', { key: 'front', d: 'M26 82 L26 26 L82 26 L82 82 Z' }),
      createElement('path', { key: 'back', d: 'M46 62 L46 6 L102 6 L102 62 L46 62' }),
      line(26, 26, 46, 6),
      line(82, 26, 102, 6),
      line(82, 82, 102, 62),
      line(26, 82, 46, 62),
    ),
  )
}

export interface CoverProps {
  state: CoverState
  /** What the module is called, for the sentences that name it. */
  name?: string
  /** For `down` and `refused`: ask again. Without it no button is drawn. */
  onRetry?: () => void
  /**
   * `true` draws one line instead of the whole container: the sentence, and the button beside it,
   * along the bottom edge of something that stays on screen — a terminal's last output, under a
   * server that stopped. No mark, no second line.
   */
  strip?: boolean
  /** A second, smaller line: the server's own sentence, a path. */
  detail?: string | null
  /** The sentence, when a module has a better one for this state. */
  children?: string
}

/**
 * Draw a not-ready state. Fills a parent that has a height (or is a flex column) and centres in
 * it; otherwise it is as tall as its content; with `strip`, one line. `stale` reloads the page
 * once, a moment later — and says "reloading…" only while that is true: when the reload cannot be
 * started (it was tried a moment ago and the page is still old) the sentence is the fact alone.
 */
export function Cover({ state, name, onRetry, detail, strip, children }: CoverProps): ReactElement {
  /* Before layout and paint, so the first frame of a cover is already styled. */
  useInsertionEffect(style, [])

  /* Set when a reload was due and did not start. */
  const [stuck, setStuck] = useState(false)

  useEffect(() => {
    if (state !== 'stale') return
    const timer = setTimeout(() => {
      if (!reloadStalePage()) setStuck(true)
    }, STALE_RELOAD_MS)
    return () => clearTimeout(timer)
  }, [state])

  const old = state === 'stale' && stuck
  return createElement(
    'div',
    {
      className: 'kehikot-cover',
      role: 'status',
      'data-cover': state,
      'data-working': WORKING.has(state) && !old ? 'true' : 'false',
      ...(strip ? { 'data-strip': 'true' } : {}),
    },
    strip ? null : mark(),
    createElement('p', null, children ?? (old ? PAGE_OLD : COVER_WORDS[state](name))),
    detail && !strip ? createElement('p', { 'data-detail': '' }, detail) : null,
    RETRIED.has(state) && onRetry ? createElement('button', { type: 'button', onClick: onRetry }, TRY_AGAIN) : null,
  )
}
