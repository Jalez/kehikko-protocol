import {
  createElement,
  useEffect,
  useInsertionEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactElement,
} from 'react'

import { TILE_ACTIONS, TILE_NEEDS_YOU, isTile, tileRoom, tileStateOf, type BoxSize, type TileItem } from '../tile.js'
import { TILE_MARKS } from './marks.js'

/**
 * 2.58.0. An agent module's tile: what a module that runs agent sessions draws instead of its
 * terminal when its page is small (`isTile`). The same in every agent module, so a person learns it
 * once. The rule and the words are in `../tile.ts`; this draws them. See docs/client.md ("An agent
 * module as a tile (2.58.0)").
 *
 * The whole tile is one button that expands the container (the module asks the host with
 * `view.expand`). Above it, where there is room (`tileRoom`), the quick actions: Answer when a
 * question waits (its choices and a reply field open over the tile, in place), Expand, and Compact
 * and Clear. Every button is reached by Tab; the tile's tooltip and accessible name are the whole
 * state in one sentence.
 */

/**
 * This page's own size, kept as it changes: the frame the host gives it, which IS the module's box.
 * `tile` is `isTile` with its hysteresis, so a page resized around the line does not flip.
 */
export function useTileSize(start: BoxSize | null = null): BoxSize & { tile: boolean } {
  const read = (): BoxSize =>
    start ?? (typeof window === 'undefined' ? { width: 0, height: 0 } : { width: window.innerWidth, height: window.innerHeight })
  const [size, setSize] = useState<BoxSize & { tile: boolean }>(() => {
    const first = read()
    return { ...first, tile: isTile(first) }
  })
  useEffect(() => {
    if (start || typeof window === 'undefined') return
    const update = () => {
      const next = { width: window.innerWidth, height: window.innerHeight }
      setSize((was) => {
        const tile = isTile(next, was.tile)
        return was.width === next.width && was.height === next.height && was.tile === tile ? was : { ...next, tile }
      })
    }
    update()
    const Observer = (globalThis as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver
    const observer = Observer ? new Observer(update) : null
    observer?.observe(document.documentElement)
    window.addEventListener('resize', update)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', update)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start?.width, start?.height])
  return start ? { ...start, tile: isTile(start, size.tile) } : size
}

export interface AgentTileProps {
  /** The module's name, "Claude": in the sentence, and under the icon when there is no title. */
  name: string
  /** The module's manifest `icon` (`brand:claude`): drawn from `TILE_MARKS`, or as a terminal when it is not one of them. */
  icon?: string | null
  /** The conversation's title, cut to one line under the icon. */
  title?: string | null
  /** The session's activity item, as the module reports it (`tileItemOf` picks one of several); null: idle. */
  item?: TileItem | null
  /** How many messages for the session are unread: a dot, and words in the sentence. */
  unread?: number
  /** The page's size (`useTileSize`), for what fits. */
  size: BoxSize
  /** Expand the container (`view.expand`). Absent: the tile is not a button, and there is no Expand. */
  onExpand?: () => void
  /** The word on the Expand action and the tile's own press, when the module does something else than ask the host. */
  expandWord?: string
  /** Answer the question that waits, as the person's reply to the session. Absent: no Answer. Resolve `false` to keep the panel open. */
  onAnswer?: (text: string) => void | boolean | Promise<void | boolean>
  /** Compact the conversation. Absent: no Compact. */
  onCompact?: () => void
  /** Clear the conversation. Absent: no Clear. */
  onClear?: () => void
}

export const TILE_STYLE_ID = 'kehikot-tile-style'

/*
 * Unlayered rules under one class, like the cover's, so no module's Tailwind has to know of them.
 * Colours from the module's own tokens when it has them, with defaults; the attention colour and the
 * done colour can be set by `--kehikot-tile-attention` and `--kehikot-tile-done`. A look is never
 * told by colour alone: the badge has a glyph and the sentence says it.
 */
export const TILE_CSS = `
.kehikot-tile{position:relative;box-sizing:border-box;width:100%;height:100%;min-height:0;overflow:hidden;font:400 12px/1.3 ui-sans-serif,system-ui,sans-serif;color:var(--foreground,oklch(0.2 0 0));background:var(--background,transparent);--kt-attn:var(--kehikot-tile-attention,oklch(0.72 0.16 65));--kt-done:var(--kehikot-tile-done,oklch(0.62 0.15 150));--kt-work:var(--kehikot-tile-working,var(--primary,oklch(0.55 0.12 250)));--kt-muted:var(--muted-foreground,oklch(0.55 0 0))}
.dark .kehikot-tile{color:var(--foreground,oklch(0.92 0 0))}
.kehikot-tile *{box-sizing:border-box}
.kehikot-tile-face{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:6px;width:100%;height:100%;margin:0;border:0;background:transparent;color:inherit;font:inherit;text-align:center;cursor:default}
.kehikot-tile-face[data-press=true]{cursor:pointer}
.kehikot-tile-face[data-press=true]:hover{background:var(--accent,oklch(0.5 0 0 / .06))}
.kehikot-tile[data-actions=true] .kehikot-tile-face{padding-bottom:34px}
.kehikot-tile button:focus-visible{outline:2px solid var(--ring,currentColor);outline-offset:-2px}
.kehikot-tile-icon{position:relative;flex:none}
.kehikot-tile-icon svg.kt-ring{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.kehikot-tile-icon svg.kt-ring circle{fill:none;stroke-width:2.5}
.kehikot-tile-icon svg.kt-ring circle.kt-track{stroke:var(--border,oklch(0.5 0 0 / .2))}
.kehikot-tile-icon svg.kt-ring circle.kt-arc{stroke:var(--kt-muted);stroke-linecap:round}
.kehikot-tile[data-look=working] svg.kt-ring circle.kt-arc{stroke:var(--kt-work);stroke-dasharray:28 72;transform-origin:50% 50%;animation:kehikot-tile-turn 2.4s linear infinite}
.kehikot-tile[data-needs=true] svg.kt-ring circle.kt-arc{stroke:var(--kt-attn)}
.kehikot-tile[data-look=done] svg.kt-ring circle.kt-arc{stroke:var(--kt-done)}
.kehikot-tile[data-look=idle] svg.kt-ring circle.kt-arc{stroke:transparent}
.kehikot-tile-icon svg.kt-mark{position:absolute;inset:22%;width:56%;height:56%;fill:currentColor}
.kehikot-tile-icon svg.kt-mark[data-generic=true]{fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.kehikot-tile-badge{position:absolute;right:-4%;top:-4%;min-width:38%;height:38%;padding:0 2px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:max(9px,calc(var(--kt-icon,40px) * .24));line-height:1;color:var(--background,#fff);background:var(--kt-attn)}
.kehikot-tile[data-look=done] .kehikot-tile-badge{background:var(--kt-done)}
.kehikot-tile-title{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}
.kehikot-tile-word{font-size:10px;color:var(--kt-muted)}
.kehikot-tile[data-needs=true] .kehikot-tile-word{color:inherit;font-weight:600}
.kehikot-tile-unread{position:absolute;left:6px;top:6px;width:8px;height:8px;border-radius:999px;background:var(--kt-work);pointer-events:none}
.kehikot-tile-actions{position:absolute;left:0;right:0;bottom:4px;display:flex;justify-content:center;gap:4px;padding:0 4px;pointer-events:none}
.kehikot-tile-actions button,.kehikot-tile-answer button{pointer-events:auto;font:inherit;font-size:11px;color:inherit;background:var(--background,transparent);border:1px solid var(--border,currentColor);border-radius:6px;padding:2px 7px;cursor:pointer;white-space:nowrap}
.kehikot-tile-actions button:hover,.kehikot-tile-answer button:hover{background:var(--accent,transparent)}
.kehikot-tile-actions button[data-action=answer]{border-color:var(--kt-attn);font-weight:600}
.kehikot-tile-answer{position:absolute;inset:0;z-index:1;display:flex;flex-direction:column;gap:4px;padding:6px;background:var(--popover,var(--background,#fff));color:var(--popover-foreground,inherit)}
.kehikot-tile-answer p{margin:0;flex:1 1 auto;min-height:0;overflow:auto;font-size:11px;overflow-wrap:anywhere}
.kehikot-tile-choices{display:flex;flex-wrap:wrap;gap:4px;flex:none}
.kehikot-tile-choices button{white-space:normal;text-align:left}
.kehikot-tile-answer form{display:flex;gap:4px;flex:none}
.kehikot-tile-answer input{flex:1 1 auto;min-width:0;font:inherit;font-size:11px;color:inherit;background:transparent;border:1px solid var(--border,currentColor);border-radius:6px;padding:2px 6px}
@keyframes kehikot-tile-turn{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.kehikot-tile[data-look=working] svg.kt-ring circle.kt-arc{animation:none}}
`

function style(): void {
  if (typeof document === 'undefined' || document.getElementById(TILE_STYLE_ID)) return
  const sheet = document.createElement('style')
  sheet.id = TILE_STYLE_ID
  sheet.textContent = TILE_CSS
  document.head.appendChild(sheet)
}

/** The module's mark, or a terminal for an icon that is not one of `TILE_MARKS`. */
function mark(icon: string | null | undefined): ReactElement {
  const slug = icon?.startsWith('brand:') ? icon.slice('brand:'.length) : ''
  const found = Object.hasOwn(TILE_MARKS, slug) ? TILE_MARKS[slug as keyof typeof TILE_MARKS] : undefined
  if (found) return createElement('svg', { className: 'kt-mark', viewBox: '0 0 24 24', 'aria-hidden': true }, createElement('path', { d: found.path }))
  return createElement(
    'svg',
    { className: 'kt-mark', viewBox: '0 0 24 24', 'aria-hidden': true, 'data-generic': 'true' },
    createElement('rect', { key: 'box', x: 2.5, y: 4, width: 19, height: 16, rx: 2.5 }),
    createElement('path', { key: 'prompt', d: 'M7 10l3 2.5L7 15M12.5 15H17' }),
  )
}

/** The ring around the icon: a track, and an arc in the look's colour (turning while working). */
function ring(): ReactElement {
  return createElement(
    'svg',
    { className: 'kt-ring', viewBox: '0 0 36 36', 'aria-hidden': true },
    createElement('circle', { key: 'track', className: 'kt-track', cx: 18, cy: 18, r: 16 }),
    createElement('circle', { key: 'arc', className: 'kt-arc', cx: 18, cy: 18, r: 16, pathLength: 100 }),
  )
}

/** Draw an agent module's tile. Fills its parent; give it one with a height (the page, at tile size). */
export function AgentTile({ name, icon, title, item, unread = 0, size, onExpand, expandWord = TILE_ACTIONS.expand, onAnswer, onCompact, onClear }: AgentTileProps): ReactElement {
  useInsertionEffect(style, [])
  const state = tileStateOf(item, { title, name, unread })
  const room = tileRoom(size)
  const [answering, setAnswering] = useState(false)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const answerButton = useRef<HTMLButtonElement | null>(null)
  const panel = useRef<HTMLDivElement | null>(null)
  const canAnswer = Boolean(state.question && onAnswer)

  /* A question answered elsewhere (in the Inbox, in the large view) takes its panel with it. */
  useEffect(() => {
    if (!canAnswer) setAnswering(false)
  }, [canAnswer])
  /* Opened: the keyboard goes to its first choice, or the reply field. */
  useEffect(() => {
    if (answering) panel.current?.querySelector<HTMLElement>('button[data-choice], input')?.focus()
  }, [answering])

  const close = () => {
    setAnswering(false)
    setReply('')
    setTimeout(() => answerButton.current?.focus(), 0)
  }
  const send = async (text: string) => {
    const said = text.trim()
    if (!said || !onAnswer || sending) return
    setSending(true)
    try {
      const out = await onAnswer(said)
      if (out !== false) close()
    } finally {
      setSending(false)
    }
  }

  const needs = TILE_NEEDS_YOU.has(state.look)
  const actions: ReactElement[] = []
  if (room.actions) {
    if (canAnswer) {
      actions.push(
        createElement(
          'button',
          { key: 'answer', ref: answerButton, type: 'button', 'data-action': 'answer', title: state.question?.text, 'aria-haspopup': 'dialog', 'aria-expanded': answering, onClick: () => setAnswering(true) },
          TILE_ACTIONS.answer,
        ),
      )
    }
    if (onExpand) actions.push(createElement('button', { key: 'expand', type: 'button', 'data-action': 'expand', title: `${expandWord} ${name}`, onClick: onExpand }, expandWord))
    if (room.commands && onCompact) actions.push(createElement('button', { key: 'compact', type: 'button', 'data-action': 'compact', onClick: onCompact }, TILE_ACTIONS.compact))
    if (room.commands && onClear) actions.push(createElement('button', { key: 'clear', type: 'button', 'data-action': 'clear', onClick: onClear }, TILE_ACTIONS.clear))
  }

  const face = createElement(
    onExpand ? 'button' : 'div',
    {
      className: 'kehikot-tile-face',
      ...(onExpand ? { type: 'button', onClick: onExpand, 'data-press': 'true', 'aria-label': `${state.sentence} ${expandWord}.` } : { role: 'status' }),
      title: state.sentence,
    },
    createElement(
      'span',
      { className: 'kehikot-tile-icon', style: { width: room.icon, height: room.icon, ['--kt-icon' as string]: `${room.icon}px` } },
      ring(),
      mark(icon),
      state.badge ? createElement('span', { className: 'kehikot-tile-badge', 'aria-hidden': true }, state.badge) : null,
    ),
    room.title ? createElement('span', { className: 'kehikot-tile-title' }, (title ?? '').trim() || name) : null,
    room.title && state.look !== 'idle' ? createElement('span', { className: 'kehikot-tile-word', 'aria-hidden': true }, state.word) : null,
  )

  const answer =
    answering && state.question
      ? createElement(
          'div',
          {
            ref: panel,
            className: 'kehikot-tile-answer',
            role: 'dialog',
            'aria-label': `${TILE_ACTIONS.answer}: ${state.question.text}`,
            onKeyDown: (event: KeyboardEvent) => {
              if (event.key === 'Escape') {
                event.stopPropagation()
                close()
              }
            },
          },
          createElement('p', { key: 'q' }, state.question.text),
          state.question.choices?.length
            ? createElement(
                'div',
                { key: 'choices', className: 'kehikot-tile-choices' },
                state.question.choices.map((choice) =>
                  createElement('button', { key: choice, type: 'button', 'data-choice': choice, disabled: sending, onClick: () => void send(choice) }, choice),
                ),
              )
            : null,
          createElement(
            'form',
            {
              key: 'reply',
              onSubmit: (event: FormEvent) => {
                event.preventDefault()
                void send(reply)
              },
            },
            createElement('input', { value: reply, placeholder: 'Reply…', 'aria-label': 'Reply', disabled: sending, onChange: (event: { target: { value: string } }) => setReply(event.target.value) }),
            createElement('button', { type: 'submit', disabled: sending || !reply.trim() }, 'Send'),
            createElement('button', { type: 'button', onClick: close, title: 'Close (Esc)' }, 'Close'),
          ),
        )
      : null

  return createElement(
    'div',
    {
      className: 'kehikot-tile',
      'data-look': state.look,
      'data-needs': needs ? 'true' : 'false',
      'data-actions': actions.length ? 'true' : 'false',
    },
    face,
    unread > 0 ? createElement('span', { className: 'kehikot-tile-unread', 'aria-hidden': true }) : null,
    actions.length ? createElement('div', { className: 'kehikot-tile-actions' }, actions) : null,
    answer,
  )
}
