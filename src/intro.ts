import { z } from 'zod'

import { oneLine } from './notes.js'

/**
 * 2.57.0. A module's own short introduction, as DATA a host shows in its own introduction dialog:
 * a few slides, each a title, a sentence or two, and an optional picture. Nothing plays inside the
 * module's page, and the host sends the module nothing to show it.
 *
 * ```ts
 * intro: {
 *   slides: [
 *     {
 *       title: 'One list for the work you are on',
 *       body: 'Everything that still needs doing for the picked part, in one place.',
 *       art: {
 *         label: 'a list filling in, one line ticked',
 *         shapes: [
 *           { kind: 'pane', x: 40, y: 16, w: 240, h: 118 },
 *           { kind: 'rows', x: 56, y: 40, widths: [160, 120, 140], gap: 16, motion: 'rise', delay: 0.3 },
 *           { kind: 'text', x: 50, y: 44, text: '✓', tone: 'ok', motion: 'pop', delay: 1 },
 *         ],
 *       },
 *     },
 *   ],
 * }
 * ```
 *
 * ## The picture is a drawing the host knows how to make
 *
 * A host's own introduction draws each picture as a small vector drawing in the theme's colours
 * that moves a little (an entrance, a quiet loop) and stands still when the person asks for reduced
 * motion. A module's picture is the same thing, said as a list of shapes on a 320 by 150 canvas
 * (`INTRO_VIEW`): panes, boxes, rows of text-like bars, dots, lines, short labels and a pointer, each
 * with a `tone` (a colour role, never a colour) and an optional `motion` from the host's own set
 * (`INTRO_MOTIONS`) with a `delay`. The host draws it with its own components, so it is in the host's
 * look, right in dark as in light, and still under `prefers-reduced-motion` — and there is nothing to
 * load, nothing from the module's origin, and no markup the host renders.
 *
 * PLAIN TEXT ONLY. Every string — a title, a body, a picture's label, a `text` shape — is drawn as
 * text: never as markup, never as a link, never as an address the host opens. Each is one line
 * (`introOf` flattens line breaks, control, bidi and zero-width characters), bounded by
 * `INTRO_LIMITS`. An `intro` that does not parse is dropped whole, not fatal: the module runs and is
 * offered without one. A picture that does not parse drops only that picture.
 *
 * Top-level like `help`, so a host before 2.57.0 ignores it and runs the module; NOT under
 * `declares`. Design notes: docs/manifest.md ("A module's introduction").
 */

/** The canvas a picture is drawn on, in its own units: shapes are placed in it, the host scales it. */
export const INTRO_VIEW = { width: 320, height: 150 } as const

/** How long and how many. */
export const INTRO_LIMITS = {
  /** Slides: an introduction of about twenty seconds. */
  SLIDES: 6,
  /** A slide's title. */
  TITLE: 80,
  /** A slide's words: a sentence or two. */
  BODY: 320,
  /** What a picture shows, said for a screen reader. */
  LABEL: 160,
  /** Shapes in one picture. */
  SHAPES: 48,
  /** Bars in one `rows` shape. */
  ROWS: 12,
  /** A `text` shape: a word or two on the drawing. */
  TEXT: 24,
  /** The latest a motion may start, in seconds after the slide shows. */
  DELAY: 8,
} as const

/**
 * The colour roles a shape may take. A host maps each to its theme (`card` is a container's face,
 * `strong` the accent, `ok` / `busy` / `warn` / `danger` the status colours), so a picture is right
 * in dark as in light. Never a colour.
 */
export const INTRO_TONES = ['card', 'muted', 'faint', 'text', 'strong', 'ok', 'busy', 'warn', 'danger'] as const
export type IntroTone = (typeof INTRO_TONES)[number]

/**
 * How a shape moves, from the host's own set. `pop`, `rise`, `draw` and `drop` play once as the slide
 * shows (after `delay`); `pulse`, `blink`, `ping`, `narrow`, `chip`, `fill` and `spin` loop quietly.
 * Under reduced motion every shape stands still in its final place, so draw the picture so that its
 * still frame says the same thing.
 */
export const INTRO_MOTIONS = {
  pop: 'Grows into place once.',
  rise: 'Slides up into place once.',
  draw: 'Its outline draws itself once (a box, a pane or a line).',
  drop: 'Drops in from above, again and again, like a new item arriving.',
  pulse: 'Breathes: a soft, slow grow and shrink.',
  blink: 'Fades out and back in.',
  ping: 'A ring goes out from it now and then.',
  narrow: 'Fades back and forth, as a thing filtered out and in.',
  chip: 'Lights up and dims, as a thing picked and unpicked.',
  fill: 'Fills from left to right, as progress, and starts over.',
  spin: 'Turns around its centre, as work in progress.',
} as const
export type IntroMotion = keyof typeof INTRO_MOTIONS
const motions = Object.keys(INTRO_MOTIONS) as [IntroMotion, ...IntroMotion[]]

const coord = (max: number) => z.number().finite().min(0).max(max)
const X = coord(INTRO_VIEW.width)
const Y = coord(INTRO_VIEW.height)
const W = z.number().finite().positive().max(INTRO_VIEW.width)
const H = z.number().finite().positive().max(INTRO_VIEW.height)
const text = (max: number) => z.string().trim().min(1).max(max)

/** What every shape may carry besides its place. */
const common = {
  tone: z.enum(INTRO_TONES).optional(),
  motion: z.enum(motions).optional(),
  /** Seconds after the slide shows before its motion starts. */
  delay: z.number().finite().min(0).max(INTRO_LIMITS.DELAY).optional(),
}

/** A container the way a host draws one: a rounded box with a header strip. */
export const introPaneSchema = z.object({ kind: z.literal('pane'), x: X, y: Y, w: W, h: H, ...common }).strict()
/** A rounded box: a button, a card, a chip. `round` is the corner radius. */
export const introBoxSchema = z
  .object({ kind: z.literal('box'), x: X, y: Y, w: W, h: H, round: z.number().finite().min(0).max(75).optional(), dashed: z.boolean().optional(), ...common })
  .strict()
/** Lines of text, drawn as bars: one bar per width, `gap` apart, top to bottom. */
export const introRowsSchema = z
  .object({ kind: z.literal('rows'), x: X, y: Y, widths: z.array(W).min(1).max(INTRO_LIMITS.ROWS), gap: z.number().finite().min(4).max(40).optional(), ...common })
  .strict()
/** A dot: a status light, a badge. */
export const introDotSchema = z.object({ kind: z.literal('dot'), x: X, y: Y, r: z.number().finite().positive().max(40), ...common }).strict()
/** A straight line: a link between two things, a divider. */
export const introLineSchema = z
  .object({ kind: z.literal('line'), x: X, y: Y, x2: X, y2: Y, dashed: z.boolean().optional(), ...common })
  .strict()
/** A word or two on the drawing, plain text. `x` is where it starts, or its middle with `middle`. */
export const introTextSchema = z
  .object({
    kind: z.literal('text'),
    x: X,
    y: Y,
    text: text(INTRO_LIMITS.TEXT),
    size: z.number().finite().min(6).max(20).optional(),
    middle: z.boolean().optional(),
    mono: z.boolean().optional(),
    ...common,
  })
  .strict()
/** A mouse pointer, its tip at (`x`, `y`): where a person would press. */
export const introPointerSchema = z.object({ kind: z.literal('pointer'), x: X, y: Y, ...common }).strict()

export const introShapeSchema = z.discriminatedUnion('kind', [
  introPaneSchema,
  introBoxSchema,
  introRowsSchema,
  introDotSchema,
  introLineSchema,
  introTextSchema,
  introPointerSchema,
])
export type IntroShape = z.infer<typeof introShapeSchema>
export type IntroShapeKind = IntroShape['kind']

/** A slide's picture: what it shows in words, and the shapes, drawn in order (later on top). */
export const introArtSchema = z.object({
  label: text(INTRO_LIMITS.LABEL),
  shapes: z.array(introShapeSchema).min(1).max(INTRO_LIMITS.SHAPES),
})
export type IntroArt = z.infer<typeof introArtSchema>

/** One slide. A picture that does not parse is dropped on its own; the words stay. */
export const introSlideSchema = z.object({
  title: text(INTRO_LIMITS.TITLE),
  body: text(INTRO_LIMITS.BODY),
  art: introArtSchema.optional().catch(undefined),
})
export type IntroSlide = z.infer<typeof introSlideSchema>

/** `intro` in a manifest. A manifest's `intro` that fails is dropped, not fatal. */
export const introSchema = z.object({
  slides: z.array(introSlideSchema).min(1).max(INTRO_LIMITS.SLIDES),
})
export type Intro = z.infer<typeof introSchema>

/**
 * A module's introduction, ready to draw, or `null` when it has none (or one that does not parse).
 * Every string is one line of plain text (`oneLine`); a slide whose title or body is left empty by
 * that is dropped, and a picture whose label or a `text` shape's text is left empty loses that
 * picture. Pure; what a host reads before it offers "Introduction" at all.
 */
export function introOf(manifest: { intro?: unknown } | null | undefined): Intro | null {
  const parsed = introSchema.safeParse(manifest?.intro)
  if (!parsed.success) return null
  const slides: IntroSlide[] = []
  for (const slide of parsed.data.slides) {
    const title = oneLine(slide.title, INTRO_LIMITS.TITLE)
    const body = oneLine(slide.body, INTRO_LIMITS.BODY)
    if (!title || !body) continue
    slides.push({ title, body, ...(slide.art ? artOf(slide.art) : {}) })
  }
  return slides.length ? { slides } : null
}

function artOf(art: IntroArt): { art?: IntroArt } {
  const label = oneLine(art.label, INTRO_LIMITS.LABEL)
  if (!label) return {}
  const shapes: IntroShape[] = []
  for (const shape of art.shapes) {
    if (shape.kind !== 'text') shapes.push(shape)
    else {
      const said = oneLine(shape.text, INTRO_LIMITS.TEXT)
      if (!said) return {}
      shapes.push({ ...shape, text: said })
    }
  }
  return { art: { label, shapes } }
}

/**
 * Where a module keeps its introduction as a file, at the root of its repository: `intro.json`,
 * holding exactly what `intro` holds (`{ slides: [...] }`). A host reads the introduction of a module
 * that is NOT running from here — from its installed copy, or, for a module not installed yet, from
 * this file at the release the host would install — so a person can watch it before installing,
 * placing or starting anything. A module that has the file puts the same thing in its manifest
 * (`import intro from './intro.json'`), so one copy says it everywhere.
 */
export const INTRO_FILE = 'intro.json'

/** As much of an `intro.json` as a host reads: more than this is not an introduction. */
export const INTRO_FILE_BYTES = 64 * 1024

/**
 * An `intro.json` read as text, ready to draw (`introOf`), or `null` when it is missing, too big,
 * not JSON or not an introduction. Pure; never throws.
 */
export function introFromFile(text: string | null | undefined): Intro | null {
  if (typeof text !== 'string' || text.length === 0 || text.length > INTRO_FILE_BYTES) return null
  try {
    return introOf({ intro: JSON.parse(text) as unknown })
  } catch {
    return null
  }
}

/** Whether a module has an introduction: what a host asks before it offers one. */
export function hasIntro(manifest: { intro?: unknown } | null | undefined): boolean {
  return introOf(manifest) !== null
}

/**
 * About how long an introduction takes to read, in whole seconds: four seconds a slide plus a second
 * for every fifteen words, rounded to the nearest five. What a host says on its offer ("a 20-second
 * introduction"). At least five.
 */
export function introSeconds(intro: Intro): number {
  const words = intro.slides.reduce((sum, slide) => sum + `${slide.title} ${slide.body}`.split(/\s+/).filter(Boolean).length, 0)
  const raw = intro.slides.length * 4 + words / 15
  return Math.max(5, Math.round(raw / 5) * 5)
}
