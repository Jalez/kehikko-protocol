import { z } from 'zod';
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
export declare const INTRO_VIEW: {
    readonly width: 320;
    readonly height: 150;
};
/** How long and how many. */
export declare const INTRO_LIMITS: {
    /** Slides: an introduction of about twenty seconds. */
    readonly SLIDES: 6;
    /** A slide's title. */
    readonly TITLE: 80;
    /** A slide's words: a sentence or two. */
    readonly BODY: 320;
    /** What a picture shows, said for a screen reader. */
    readonly LABEL: 160;
    /** Shapes in one picture. */
    readonly SHAPES: 48;
    /** Bars in one `rows` shape. */
    readonly ROWS: 12;
    /** A `text` shape: a word or two on the drawing. */
    readonly TEXT: 24;
    /** The latest a motion may start, in seconds after the slide shows. */
    readonly DELAY: 8;
};
/**
 * The colour roles a shape may take. A host maps each to its theme (`card` is a container's face,
 * `strong` the accent, `ok` / `busy` / `warn` / `danger` the status colours), so a picture is right
 * in dark as in light. Never a colour.
 */
export declare const INTRO_TONES: readonly ["card", "muted", "faint", "text", "strong", "ok", "busy", "warn", "danger"];
export type IntroTone = (typeof INTRO_TONES)[number];
/**
 * How a shape moves, from the host's own set. `pop`, `rise`, `draw` and `drop` play once as the slide
 * shows (after `delay`); `pulse`, `blink`, `ping`, `narrow`, `chip`, `fill` and `spin` loop quietly.
 * Under reduced motion every shape stands still in its final place, so draw the picture so that its
 * still frame says the same thing.
 */
export declare const INTRO_MOTIONS: {
    readonly pop: "Grows into place once.";
    readonly rise: "Slides up into place once.";
    readonly draw: "Its outline draws itself once (a box, a pane or a line).";
    readonly drop: "Drops in from above, again and again, like a new item arriving.";
    readonly pulse: "Breathes: a soft, slow grow and shrink.";
    readonly blink: "Fades out and back in.";
    readonly ping: "A ring goes out from it now and then.";
    readonly narrow: "Fades back and forth, as a thing filtered out and in.";
    readonly chip: "Lights up and dims, as a thing picked and unpicked.";
    readonly fill: "Fills from left to right, as progress, and starts over.";
    readonly spin: "Turns around its centre, as work in progress.";
};
export type IntroMotion = keyof typeof INTRO_MOTIONS;
/** A container the way a host draws one: a rounded box with a header strip. */
export declare const introPaneSchema: z.ZodObject<{
    tone: z.ZodOptional<z.ZodEnum<["card", "muted", "faint", "text", "strong", "ok", "busy", "warn", "danger"]>>;
    motion: z.ZodOptional<z.ZodEnum<["pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin", ...("pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin")[]]>>;
    /** Seconds after the slide shows before its motion starts. */
    delay: z.ZodOptional<z.ZodNumber>;
    kind: z.ZodLiteral<"pane">;
    x: z.ZodNumber;
    y: z.ZodNumber;
    w: z.ZodNumber;
    h: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    kind: "pane";
    x: number;
    y: number;
    w: number;
    h: number;
    tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
    motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
    delay?: number | undefined;
}, {
    kind: "pane";
    x: number;
    y: number;
    w: number;
    h: number;
    tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
    motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
    delay?: number | undefined;
}>;
/** A rounded box: a button, a card, a chip. `round` is the corner radius. */
export declare const introBoxSchema: z.ZodObject<{
    tone: z.ZodOptional<z.ZodEnum<["card", "muted", "faint", "text", "strong", "ok", "busy", "warn", "danger"]>>;
    motion: z.ZodOptional<z.ZodEnum<["pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin", ...("pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin")[]]>>;
    /** Seconds after the slide shows before its motion starts. */
    delay: z.ZodOptional<z.ZodNumber>;
    kind: z.ZodLiteral<"box">;
    x: z.ZodNumber;
    y: z.ZodNumber;
    w: z.ZodNumber;
    h: z.ZodNumber;
    round: z.ZodOptional<z.ZodNumber>;
    dashed: z.ZodOptional<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    kind: "box";
    x: number;
    y: number;
    w: number;
    h: number;
    tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
    motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
    delay?: number | undefined;
    round?: number | undefined;
    dashed?: boolean | undefined;
}, {
    kind: "box";
    x: number;
    y: number;
    w: number;
    h: number;
    tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
    motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
    delay?: number | undefined;
    round?: number | undefined;
    dashed?: boolean | undefined;
}>;
/** Lines of text, drawn as bars: one bar per width, `gap` apart, top to bottom. */
export declare const introRowsSchema: z.ZodObject<{
    tone: z.ZodOptional<z.ZodEnum<["card", "muted", "faint", "text", "strong", "ok", "busy", "warn", "danger"]>>;
    motion: z.ZodOptional<z.ZodEnum<["pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin", ...("pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin")[]]>>;
    /** Seconds after the slide shows before its motion starts. */
    delay: z.ZodOptional<z.ZodNumber>;
    kind: z.ZodLiteral<"rows">;
    x: z.ZodNumber;
    y: z.ZodNumber;
    widths: z.ZodArray<z.ZodNumber, "many">;
    gap: z.ZodOptional<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    kind: "rows";
    x: number;
    y: number;
    widths: number[];
    gap?: number | undefined;
    tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
    motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
    delay?: number | undefined;
}, {
    kind: "rows";
    x: number;
    y: number;
    widths: number[];
    gap?: number | undefined;
    tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
    motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
    delay?: number | undefined;
}>;
/** A dot: a status light, a badge. */
export declare const introDotSchema: z.ZodObject<{
    tone: z.ZodOptional<z.ZodEnum<["card", "muted", "faint", "text", "strong", "ok", "busy", "warn", "danger"]>>;
    motion: z.ZodOptional<z.ZodEnum<["pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin", ...("pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin")[]]>>;
    /** Seconds after the slide shows before its motion starts. */
    delay: z.ZodOptional<z.ZodNumber>;
    kind: z.ZodLiteral<"dot">;
    x: z.ZodNumber;
    y: z.ZodNumber;
    r: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    kind: "dot";
    x: number;
    y: number;
    r: number;
    tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
    motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
    delay?: number | undefined;
}, {
    kind: "dot";
    x: number;
    y: number;
    r: number;
    tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
    motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
    delay?: number | undefined;
}>;
/** A straight line: a link between two things, a divider. */
export declare const introLineSchema: z.ZodObject<{
    tone: z.ZodOptional<z.ZodEnum<["card", "muted", "faint", "text", "strong", "ok", "busy", "warn", "danger"]>>;
    motion: z.ZodOptional<z.ZodEnum<["pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin", ...("pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin")[]]>>;
    /** Seconds after the slide shows before its motion starts. */
    delay: z.ZodOptional<z.ZodNumber>;
    kind: z.ZodLiteral<"line">;
    x: z.ZodNumber;
    y: z.ZodNumber;
    x2: z.ZodNumber;
    y2: z.ZodNumber;
    dashed: z.ZodOptional<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    kind: "line";
    x: number;
    y: number;
    x2: number;
    y2: number;
    tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
    motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
    delay?: number | undefined;
    dashed?: boolean | undefined;
}, {
    kind: "line";
    x: number;
    y: number;
    x2: number;
    y2: number;
    tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
    motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
    delay?: number | undefined;
    dashed?: boolean | undefined;
}>;
/** A word or two on the drawing, plain text. `x` is where it starts, or its middle with `middle`. */
export declare const introTextSchema: z.ZodObject<{
    tone: z.ZodOptional<z.ZodEnum<["card", "muted", "faint", "text", "strong", "ok", "busy", "warn", "danger"]>>;
    motion: z.ZodOptional<z.ZodEnum<["pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin", ...("pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin")[]]>>;
    /** Seconds after the slide shows before its motion starts. */
    delay: z.ZodOptional<z.ZodNumber>;
    kind: z.ZodLiteral<"text">;
    x: z.ZodNumber;
    y: z.ZodNumber;
    text: z.ZodString;
    size: z.ZodOptional<z.ZodNumber>;
    middle: z.ZodOptional<z.ZodBoolean>;
    mono: z.ZodOptional<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    kind: "text";
    text: string;
    x: number;
    y: number;
    tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
    motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
    delay?: number | undefined;
    size?: number | undefined;
    middle?: boolean | undefined;
    mono?: boolean | undefined;
}, {
    kind: "text";
    text: string;
    x: number;
    y: number;
    tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
    motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
    delay?: number | undefined;
    size?: number | undefined;
    middle?: boolean | undefined;
    mono?: boolean | undefined;
}>;
/** A mouse pointer, its tip at (`x`, `y`): where a person would press. */
export declare const introPointerSchema: z.ZodObject<{
    tone: z.ZodOptional<z.ZodEnum<["card", "muted", "faint", "text", "strong", "ok", "busy", "warn", "danger"]>>;
    motion: z.ZodOptional<z.ZodEnum<["pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin", ...("pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin")[]]>>;
    /** Seconds after the slide shows before its motion starts. */
    delay: z.ZodOptional<z.ZodNumber>;
    kind: z.ZodLiteral<"pointer">;
    x: z.ZodNumber;
    y: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    kind: "pointer";
    x: number;
    y: number;
    tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
    motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
    delay?: number | undefined;
}, {
    kind: "pointer";
    x: number;
    y: number;
    tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
    motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
    delay?: number | undefined;
}>;
export declare const introShapeSchema: z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
    tone: z.ZodOptional<z.ZodEnum<["card", "muted", "faint", "text", "strong", "ok", "busy", "warn", "danger"]>>;
    motion: z.ZodOptional<z.ZodEnum<["pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin", ...("pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin")[]]>>;
    /** Seconds after the slide shows before its motion starts. */
    delay: z.ZodOptional<z.ZodNumber>;
    kind: z.ZodLiteral<"pane">;
    x: z.ZodNumber;
    y: z.ZodNumber;
    w: z.ZodNumber;
    h: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    kind: "pane";
    x: number;
    y: number;
    w: number;
    h: number;
    tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
    motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
    delay?: number | undefined;
}, {
    kind: "pane";
    x: number;
    y: number;
    w: number;
    h: number;
    tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
    motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
    delay?: number | undefined;
}>, z.ZodObject<{
    tone: z.ZodOptional<z.ZodEnum<["card", "muted", "faint", "text", "strong", "ok", "busy", "warn", "danger"]>>;
    motion: z.ZodOptional<z.ZodEnum<["pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin", ...("pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin")[]]>>;
    /** Seconds after the slide shows before its motion starts. */
    delay: z.ZodOptional<z.ZodNumber>;
    kind: z.ZodLiteral<"box">;
    x: z.ZodNumber;
    y: z.ZodNumber;
    w: z.ZodNumber;
    h: z.ZodNumber;
    round: z.ZodOptional<z.ZodNumber>;
    dashed: z.ZodOptional<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    kind: "box";
    x: number;
    y: number;
    w: number;
    h: number;
    tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
    motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
    delay?: number | undefined;
    round?: number | undefined;
    dashed?: boolean | undefined;
}, {
    kind: "box";
    x: number;
    y: number;
    w: number;
    h: number;
    tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
    motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
    delay?: number | undefined;
    round?: number | undefined;
    dashed?: boolean | undefined;
}>, z.ZodObject<{
    tone: z.ZodOptional<z.ZodEnum<["card", "muted", "faint", "text", "strong", "ok", "busy", "warn", "danger"]>>;
    motion: z.ZodOptional<z.ZodEnum<["pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin", ...("pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin")[]]>>;
    /** Seconds after the slide shows before its motion starts. */
    delay: z.ZodOptional<z.ZodNumber>;
    kind: z.ZodLiteral<"rows">;
    x: z.ZodNumber;
    y: z.ZodNumber;
    widths: z.ZodArray<z.ZodNumber, "many">;
    gap: z.ZodOptional<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    kind: "rows";
    x: number;
    y: number;
    widths: number[];
    gap?: number | undefined;
    tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
    motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
    delay?: number | undefined;
}, {
    kind: "rows";
    x: number;
    y: number;
    widths: number[];
    gap?: number | undefined;
    tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
    motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
    delay?: number | undefined;
}>, z.ZodObject<{
    tone: z.ZodOptional<z.ZodEnum<["card", "muted", "faint", "text", "strong", "ok", "busy", "warn", "danger"]>>;
    motion: z.ZodOptional<z.ZodEnum<["pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin", ...("pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin")[]]>>;
    /** Seconds after the slide shows before its motion starts. */
    delay: z.ZodOptional<z.ZodNumber>;
    kind: z.ZodLiteral<"dot">;
    x: z.ZodNumber;
    y: z.ZodNumber;
    r: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    kind: "dot";
    x: number;
    y: number;
    r: number;
    tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
    motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
    delay?: number | undefined;
}, {
    kind: "dot";
    x: number;
    y: number;
    r: number;
    tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
    motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
    delay?: number | undefined;
}>, z.ZodObject<{
    tone: z.ZodOptional<z.ZodEnum<["card", "muted", "faint", "text", "strong", "ok", "busy", "warn", "danger"]>>;
    motion: z.ZodOptional<z.ZodEnum<["pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin", ...("pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin")[]]>>;
    /** Seconds after the slide shows before its motion starts. */
    delay: z.ZodOptional<z.ZodNumber>;
    kind: z.ZodLiteral<"line">;
    x: z.ZodNumber;
    y: z.ZodNumber;
    x2: z.ZodNumber;
    y2: z.ZodNumber;
    dashed: z.ZodOptional<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    kind: "line";
    x: number;
    y: number;
    x2: number;
    y2: number;
    tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
    motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
    delay?: number | undefined;
    dashed?: boolean | undefined;
}, {
    kind: "line";
    x: number;
    y: number;
    x2: number;
    y2: number;
    tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
    motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
    delay?: number | undefined;
    dashed?: boolean | undefined;
}>, z.ZodObject<{
    tone: z.ZodOptional<z.ZodEnum<["card", "muted", "faint", "text", "strong", "ok", "busy", "warn", "danger"]>>;
    motion: z.ZodOptional<z.ZodEnum<["pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin", ...("pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin")[]]>>;
    /** Seconds after the slide shows before its motion starts. */
    delay: z.ZodOptional<z.ZodNumber>;
    kind: z.ZodLiteral<"text">;
    x: z.ZodNumber;
    y: z.ZodNumber;
    text: z.ZodString;
    size: z.ZodOptional<z.ZodNumber>;
    middle: z.ZodOptional<z.ZodBoolean>;
    mono: z.ZodOptional<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    kind: "text";
    text: string;
    x: number;
    y: number;
    tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
    motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
    delay?: number | undefined;
    size?: number | undefined;
    middle?: boolean | undefined;
    mono?: boolean | undefined;
}, {
    kind: "text";
    text: string;
    x: number;
    y: number;
    tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
    motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
    delay?: number | undefined;
    size?: number | undefined;
    middle?: boolean | undefined;
    mono?: boolean | undefined;
}>, z.ZodObject<{
    tone: z.ZodOptional<z.ZodEnum<["card", "muted", "faint", "text", "strong", "ok", "busy", "warn", "danger"]>>;
    motion: z.ZodOptional<z.ZodEnum<["pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin", ...("pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin")[]]>>;
    /** Seconds after the slide shows before its motion starts. */
    delay: z.ZodOptional<z.ZodNumber>;
    kind: z.ZodLiteral<"pointer">;
    x: z.ZodNumber;
    y: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    kind: "pointer";
    x: number;
    y: number;
    tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
    motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
    delay?: number | undefined;
}, {
    kind: "pointer";
    x: number;
    y: number;
    tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
    motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
    delay?: number | undefined;
}>]>;
export type IntroShape = z.infer<typeof introShapeSchema>;
export type IntroShapeKind = IntroShape['kind'];
/** A slide's picture: what it shows in words, and the shapes, drawn in order (later on top). */
export declare const introArtSchema: z.ZodObject<{
    label: z.ZodString;
    shapes: z.ZodArray<z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
        tone: z.ZodOptional<z.ZodEnum<["card", "muted", "faint", "text", "strong", "ok", "busy", "warn", "danger"]>>;
        motion: z.ZodOptional<z.ZodEnum<["pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin", ...("pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin")[]]>>;
        /** Seconds after the slide shows before its motion starts. */
        delay: z.ZodOptional<z.ZodNumber>;
        kind: z.ZodLiteral<"pane">;
        x: z.ZodNumber;
        y: z.ZodNumber;
        w: z.ZodNumber;
        h: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        kind: "pane";
        x: number;
        y: number;
        w: number;
        h: number;
        tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
        motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
        delay?: number | undefined;
    }, {
        kind: "pane";
        x: number;
        y: number;
        w: number;
        h: number;
        tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
        motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
        delay?: number | undefined;
    }>, z.ZodObject<{
        tone: z.ZodOptional<z.ZodEnum<["card", "muted", "faint", "text", "strong", "ok", "busy", "warn", "danger"]>>;
        motion: z.ZodOptional<z.ZodEnum<["pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin", ...("pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin")[]]>>;
        /** Seconds after the slide shows before its motion starts. */
        delay: z.ZodOptional<z.ZodNumber>;
        kind: z.ZodLiteral<"box">;
        x: z.ZodNumber;
        y: z.ZodNumber;
        w: z.ZodNumber;
        h: z.ZodNumber;
        round: z.ZodOptional<z.ZodNumber>;
        dashed: z.ZodOptional<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        kind: "box";
        x: number;
        y: number;
        w: number;
        h: number;
        tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
        motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
        delay?: number | undefined;
        round?: number | undefined;
        dashed?: boolean | undefined;
    }, {
        kind: "box";
        x: number;
        y: number;
        w: number;
        h: number;
        tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
        motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
        delay?: number | undefined;
        round?: number | undefined;
        dashed?: boolean | undefined;
    }>, z.ZodObject<{
        tone: z.ZodOptional<z.ZodEnum<["card", "muted", "faint", "text", "strong", "ok", "busy", "warn", "danger"]>>;
        motion: z.ZodOptional<z.ZodEnum<["pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin", ...("pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin")[]]>>;
        /** Seconds after the slide shows before its motion starts. */
        delay: z.ZodOptional<z.ZodNumber>;
        kind: z.ZodLiteral<"rows">;
        x: z.ZodNumber;
        y: z.ZodNumber;
        widths: z.ZodArray<z.ZodNumber, "many">;
        gap: z.ZodOptional<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        kind: "rows";
        x: number;
        y: number;
        widths: number[];
        gap?: number | undefined;
        tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
        motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
        delay?: number | undefined;
    }, {
        kind: "rows";
        x: number;
        y: number;
        widths: number[];
        gap?: number | undefined;
        tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
        motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
        delay?: number | undefined;
    }>, z.ZodObject<{
        tone: z.ZodOptional<z.ZodEnum<["card", "muted", "faint", "text", "strong", "ok", "busy", "warn", "danger"]>>;
        motion: z.ZodOptional<z.ZodEnum<["pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin", ...("pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin")[]]>>;
        /** Seconds after the slide shows before its motion starts. */
        delay: z.ZodOptional<z.ZodNumber>;
        kind: z.ZodLiteral<"dot">;
        x: z.ZodNumber;
        y: z.ZodNumber;
        r: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        kind: "dot";
        x: number;
        y: number;
        r: number;
        tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
        motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
        delay?: number | undefined;
    }, {
        kind: "dot";
        x: number;
        y: number;
        r: number;
        tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
        motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
        delay?: number | undefined;
    }>, z.ZodObject<{
        tone: z.ZodOptional<z.ZodEnum<["card", "muted", "faint", "text", "strong", "ok", "busy", "warn", "danger"]>>;
        motion: z.ZodOptional<z.ZodEnum<["pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin", ...("pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin")[]]>>;
        /** Seconds after the slide shows before its motion starts. */
        delay: z.ZodOptional<z.ZodNumber>;
        kind: z.ZodLiteral<"line">;
        x: z.ZodNumber;
        y: z.ZodNumber;
        x2: z.ZodNumber;
        y2: z.ZodNumber;
        dashed: z.ZodOptional<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        kind: "line";
        x: number;
        y: number;
        x2: number;
        y2: number;
        tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
        motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
        delay?: number | undefined;
        dashed?: boolean | undefined;
    }, {
        kind: "line";
        x: number;
        y: number;
        x2: number;
        y2: number;
        tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
        motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
        delay?: number | undefined;
        dashed?: boolean | undefined;
    }>, z.ZodObject<{
        tone: z.ZodOptional<z.ZodEnum<["card", "muted", "faint", "text", "strong", "ok", "busy", "warn", "danger"]>>;
        motion: z.ZodOptional<z.ZodEnum<["pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin", ...("pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin")[]]>>;
        /** Seconds after the slide shows before its motion starts. */
        delay: z.ZodOptional<z.ZodNumber>;
        kind: z.ZodLiteral<"text">;
        x: z.ZodNumber;
        y: z.ZodNumber;
        text: z.ZodString;
        size: z.ZodOptional<z.ZodNumber>;
        middle: z.ZodOptional<z.ZodBoolean>;
        mono: z.ZodOptional<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        kind: "text";
        text: string;
        x: number;
        y: number;
        tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
        motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
        delay?: number | undefined;
        size?: number | undefined;
        middle?: boolean | undefined;
        mono?: boolean | undefined;
    }, {
        kind: "text";
        text: string;
        x: number;
        y: number;
        tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
        motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
        delay?: number | undefined;
        size?: number | undefined;
        middle?: boolean | undefined;
        mono?: boolean | undefined;
    }>, z.ZodObject<{
        tone: z.ZodOptional<z.ZodEnum<["card", "muted", "faint", "text", "strong", "ok", "busy", "warn", "danger"]>>;
        motion: z.ZodOptional<z.ZodEnum<["pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin", ...("pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin")[]]>>;
        /** Seconds after the slide shows before its motion starts. */
        delay: z.ZodOptional<z.ZodNumber>;
        kind: z.ZodLiteral<"pointer">;
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        kind: "pointer";
        x: number;
        y: number;
        tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
        motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
        delay?: number | undefined;
    }, {
        kind: "pointer";
        x: number;
        y: number;
        tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
        motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
        delay?: number | undefined;
    }>]>, "many">;
}, "strip", z.ZodTypeAny, {
    label: string;
    shapes: ({
        kind: "pane";
        x: number;
        y: number;
        w: number;
        h: number;
        tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
        motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
        delay?: number | undefined;
    } | {
        kind: "box";
        x: number;
        y: number;
        w: number;
        h: number;
        tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
        motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
        delay?: number | undefined;
        round?: number | undefined;
        dashed?: boolean | undefined;
    } | {
        kind: "rows";
        x: number;
        y: number;
        widths: number[];
        gap?: number | undefined;
        tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
        motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
        delay?: number | undefined;
    } | {
        kind: "dot";
        x: number;
        y: number;
        r: number;
        tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
        motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
        delay?: number | undefined;
    } | {
        kind: "line";
        x: number;
        y: number;
        x2: number;
        y2: number;
        tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
        motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
        delay?: number | undefined;
        dashed?: boolean | undefined;
    } | {
        kind: "text";
        text: string;
        x: number;
        y: number;
        tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
        motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
        delay?: number | undefined;
        size?: number | undefined;
        middle?: boolean | undefined;
        mono?: boolean | undefined;
    } | {
        kind: "pointer";
        x: number;
        y: number;
        tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
        motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
        delay?: number | undefined;
    })[];
}, {
    label: string;
    shapes: ({
        kind: "pane";
        x: number;
        y: number;
        w: number;
        h: number;
        tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
        motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
        delay?: number | undefined;
    } | {
        kind: "box";
        x: number;
        y: number;
        w: number;
        h: number;
        tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
        motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
        delay?: number | undefined;
        round?: number | undefined;
        dashed?: boolean | undefined;
    } | {
        kind: "rows";
        x: number;
        y: number;
        widths: number[];
        gap?: number | undefined;
        tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
        motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
        delay?: number | undefined;
    } | {
        kind: "dot";
        x: number;
        y: number;
        r: number;
        tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
        motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
        delay?: number | undefined;
    } | {
        kind: "line";
        x: number;
        y: number;
        x2: number;
        y2: number;
        tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
        motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
        delay?: number | undefined;
        dashed?: boolean | undefined;
    } | {
        kind: "text";
        text: string;
        x: number;
        y: number;
        tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
        motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
        delay?: number | undefined;
        size?: number | undefined;
        middle?: boolean | undefined;
        mono?: boolean | undefined;
    } | {
        kind: "pointer";
        x: number;
        y: number;
        tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
        motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
        delay?: number | undefined;
    })[];
}>;
export type IntroArt = z.infer<typeof introArtSchema>;
/** One slide. A picture that does not parse is dropped on its own; the words stay. */
export declare const introSlideSchema: z.ZodObject<{
    title: z.ZodString;
    body: z.ZodString;
    art: z.ZodCatch<z.ZodOptional<z.ZodObject<{
        label: z.ZodString;
        shapes: z.ZodArray<z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
            tone: z.ZodOptional<z.ZodEnum<["card", "muted", "faint", "text", "strong", "ok", "busy", "warn", "danger"]>>;
            motion: z.ZodOptional<z.ZodEnum<["pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin", ...("pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin")[]]>>;
            /** Seconds after the slide shows before its motion starts. */
            delay: z.ZodOptional<z.ZodNumber>;
            kind: z.ZodLiteral<"pane">;
            x: z.ZodNumber;
            y: z.ZodNumber;
            w: z.ZodNumber;
            h: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            kind: "pane";
            x: number;
            y: number;
            w: number;
            h: number;
            tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
            motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
            delay?: number | undefined;
        }, {
            kind: "pane";
            x: number;
            y: number;
            w: number;
            h: number;
            tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
            motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
            delay?: number | undefined;
        }>, z.ZodObject<{
            tone: z.ZodOptional<z.ZodEnum<["card", "muted", "faint", "text", "strong", "ok", "busy", "warn", "danger"]>>;
            motion: z.ZodOptional<z.ZodEnum<["pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin", ...("pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin")[]]>>;
            /** Seconds after the slide shows before its motion starts. */
            delay: z.ZodOptional<z.ZodNumber>;
            kind: z.ZodLiteral<"box">;
            x: z.ZodNumber;
            y: z.ZodNumber;
            w: z.ZodNumber;
            h: z.ZodNumber;
            round: z.ZodOptional<z.ZodNumber>;
            dashed: z.ZodOptional<z.ZodBoolean>;
        }, "strict", z.ZodTypeAny, {
            kind: "box";
            x: number;
            y: number;
            w: number;
            h: number;
            tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
            motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
            delay?: number | undefined;
            round?: number | undefined;
            dashed?: boolean | undefined;
        }, {
            kind: "box";
            x: number;
            y: number;
            w: number;
            h: number;
            tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
            motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
            delay?: number | undefined;
            round?: number | undefined;
            dashed?: boolean | undefined;
        }>, z.ZodObject<{
            tone: z.ZodOptional<z.ZodEnum<["card", "muted", "faint", "text", "strong", "ok", "busy", "warn", "danger"]>>;
            motion: z.ZodOptional<z.ZodEnum<["pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin", ...("pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin")[]]>>;
            /** Seconds after the slide shows before its motion starts. */
            delay: z.ZodOptional<z.ZodNumber>;
            kind: z.ZodLiteral<"rows">;
            x: z.ZodNumber;
            y: z.ZodNumber;
            widths: z.ZodArray<z.ZodNumber, "many">;
            gap: z.ZodOptional<z.ZodNumber>;
        }, "strict", z.ZodTypeAny, {
            kind: "rows";
            x: number;
            y: number;
            widths: number[];
            gap?: number | undefined;
            tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
            motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
            delay?: number | undefined;
        }, {
            kind: "rows";
            x: number;
            y: number;
            widths: number[];
            gap?: number | undefined;
            tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
            motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
            delay?: number | undefined;
        }>, z.ZodObject<{
            tone: z.ZodOptional<z.ZodEnum<["card", "muted", "faint", "text", "strong", "ok", "busy", "warn", "danger"]>>;
            motion: z.ZodOptional<z.ZodEnum<["pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin", ...("pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin")[]]>>;
            /** Seconds after the slide shows before its motion starts. */
            delay: z.ZodOptional<z.ZodNumber>;
            kind: z.ZodLiteral<"dot">;
            x: z.ZodNumber;
            y: z.ZodNumber;
            r: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            kind: "dot";
            x: number;
            y: number;
            r: number;
            tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
            motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
            delay?: number | undefined;
        }, {
            kind: "dot";
            x: number;
            y: number;
            r: number;
            tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
            motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
            delay?: number | undefined;
        }>, z.ZodObject<{
            tone: z.ZodOptional<z.ZodEnum<["card", "muted", "faint", "text", "strong", "ok", "busy", "warn", "danger"]>>;
            motion: z.ZodOptional<z.ZodEnum<["pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin", ...("pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin")[]]>>;
            /** Seconds after the slide shows before its motion starts. */
            delay: z.ZodOptional<z.ZodNumber>;
            kind: z.ZodLiteral<"line">;
            x: z.ZodNumber;
            y: z.ZodNumber;
            x2: z.ZodNumber;
            y2: z.ZodNumber;
            dashed: z.ZodOptional<z.ZodBoolean>;
        }, "strict", z.ZodTypeAny, {
            kind: "line";
            x: number;
            y: number;
            x2: number;
            y2: number;
            tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
            motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
            delay?: number | undefined;
            dashed?: boolean | undefined;
        }, {
            kind: "line";
            x: number;
            y: number;
            x2: number;
            y2: number;
            tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
            motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
            delay?: number | undefined;
            dashed?: boolean | undefined;
        }>, z.ZodObject<{
            tone: z.ZodOptional<z.ZodEnum<["card", "muted", "faint", "text", "strong", "ok", "busy", "warn", "danger"]>>;
            motion: z.ZodOptional<z.ZodEnum<["pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin", ...("pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin")[]]>>;
            /** Seconds after the slide shows before its motion starts. */
            delay: z.ZodOptional<z.ZodNumber>;
            kind: z.ZodLiteral<"text">;
            x: z.ZodNumber;
            y: z.ZodNumber;
            text: z.ZodString;
            size: z.ZodOptional<z.ZodNumber>;
            middle: z.ZodOptional<z.ZodBoolean>;
            mono: z.ZodOptional<z.ZodBoolean>;
        }, "strict", z.ZodTypeAny, {
            kind: "text";
            text: string;
            x: number;
            y: number;
            tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
            motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
            delay?: number | undefined;
            size?: number | undefined;
            middle?: boolean | undefined;
            mono?: boolean | undefined;
        }, {
            kind: "text";
            text: string;
            x: number;
            y: number;
            tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
            motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
            delay?: number | undefined;
            size?: number | undefined;
            middle?: boolean | undefined;
            mono?: boolean | undefined;
        }>, z.ZodObject<{
            tone: z.ZodOptional<z.ZodEnum<["card", "muted", "faint", "text", "strong", "ok", "busy", "warn", "danger"]>>;
            motion: z.ZodOptional<z.ZodEnum<["pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin", ...("pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin")[]]>>;
            /** Seconds after the slide shows before its motion starts. */
            delay: z.ZodOptional<z.ZodNumber>;
            kind: z.ZodLiteral<"pointer">;
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            kind: "pointer";
            x: number;
            y: number;
            tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
            motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
            delay?: number | undefined;
        }, {
            kind: "pointer";
            x: number;
            y: number;
            tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
            motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
            delay?: number | undefined;
        }>]>, "many">;
    }, "strip", z.ZodTypeAny, {
        label: string;
        shapes: ({
            kind: "pane";
            x: number;
            y: number;
            w: number;
            h: number;
            tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
            motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
            delay?: number | undefined;
        } | {
            kind: "box";
            x: number;
            y: number;
            w: number;
            h: number;
            tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
            motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
            delay?: number | undefined;
            round?: number | undefined;
            dashed?: boolean | undefined;
        } | {
            kind: "rows";
            x: number;
            y: number;
            widths: number[];
            gap?: number | undefined;
            tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
            motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
            delay?: number | undefined;
        } | {
            kind: "dot";
            x: number;
            y: number;
            r: number;
            tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
            motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
            delay?: number | undefined;
        } | {
            kind: "line";
            x: number;
            y: number;
            x2: number;
            y2: number;
            tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
            motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
            delay?: number | undefined;
            dashed?: boolean | undefined;
        } | {
            kind: "text";
            text: string;
            x: number;
            y: number;
            tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
            motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
            delay?: number | undefined;
            size?: number | undefined;
            middle?: boolean | undefined;
            mono?: boolean | undefined;
        } | {
            kind: "pointer";
            x: number;
            y: number;
            tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
            motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
            delay?: number | undefined;
        })[];
    }, {
        label: string;
        shapes: ({
            kind: "pane";
            x: number;
            y: number;
            w: number;
            h: number;
            tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
            motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
            delay?: number | undefined;
        } | {
            kind: "box";
            x: number;
            y: number;
            w: number;
            h: number;
            tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
            motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
            delay?: number | undefined;
            round?: number | undefined;
            dashed?: boolean | undefined;
        } | {
            kind: "rows";
            x: number;
            y: number;
            widths: number[];
            gap?: number | undefined;
            tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
            motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
            delay?: number | undefined;
        } | {
            kind: "dot";
            x: number;
            y: number;
            r: number;
            tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
            motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
            delay?: number | undefined;
        } | {
            kind: "line";
            x: number;
            y: number;
            x2: number;
            y2: number;
            tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
            motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
            delay?: number | undefined;
            dashed?: boolean | undefined;
        } | {
            kind: "text";
            text: string;
            x: number;
            y: number;
            tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
            motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
            delay?: number | undefined;
            size?: number | undefined;
            middle?: boolean | undefined;
            mono?: boolean | undefined;
        } | {
            kind: "pointer";
            x: number;
            y: number;
            tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
            motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
            delay?: number | undefined;
        })[];
    }>>>;
}, "strip", z.ZodTypeAny, {
    body: string;
    title: string;
    art?: {
        label: string;
        shapes: ({
            kind: "pane";
            x: number;
            y: number;
            w: number;
            h: number;
            tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
            motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
            delay?: number | undefined;
        } | {
            kind: "box";
            x: number;
            y: number;
            w: number;
            h: number;
            tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
            motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
            delay?: number | undefined;
            round?: number | undefined;
            dashed?: boolean | undefined;
        } | {
            kind: "rows";
            x: number;
            y: number;
            widths: number[];
            gap?: number | undefined;
            tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
            motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
            delay?: number | undefined;
        } | {
            kind: "dot";
            x: number;
            y: number;
            r: number;
            tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
            motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
            delay?: number | undefined;
        } | {
            kind: "line";
            x: number;
            y: number;
            x2: number;
            y2: number;
            tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
            motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
            delay?: number | undefined;
            dashed?: boolean | undefined;
        } | {
            kind: "text";
            text: string;
            x: number;
            y: number;
            tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
            motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
            delay?: number | undefined;
            size?: number | undefined;
            middle?: boolean | undefined;
            mono?: boolean | undefined;
        } | {
            kind: "pointer";
            x: number;
            y: number;
            tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
            motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
            delay?: number | undefined;
        })[];
    } | undefined;
}, {
    body: string;
    title: string;
    art?: unknown;
}>;
export type IntroSlide = z.infer<typeof introSlideSchema>;
/** `intro` in a manifest. A manifest's `intro` that fails is dropped, not fatal. */
export declare const introSchema: z.ZodObject<{
    slides: z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        body: z.ZodString;
        art: z.ZodCatch<z.ZodOptional<z.ZodObject<{
            label: z.ZodString;
            shapes: z.ZodArray<z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
                tone: z.ZodOptional<z.ZodEnum<["card", "muted", "faint", "text", "strong", "ok", "busy", "warn", "danger"]>>;
                motion: z.ZodOptional<z.ZodEnum<["pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin", ...("pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin")[]]>>;
                /** Seconds after the slide shows before its motion starts. */
                delay: z.ZodOptional<z.ZodNumber>;
                kind: z.ZodLiteral<"pane">;
                x: z.ZodNumber;
                y: z.ZodNumber;
                w: z.ZodNumber;
                h: z.ZodNumber;
            }, "strict", z.ZodTypeAny, {
                kind: "pane";
                x: number;
                y: number;
                w: number;
                h: number;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
            }, {
                kind: "pane";
                x: number;
                y: number;
                w: number;
                h: number;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
            }>, z.ZodObject<{
                tone: z.ZodOptional<z.ZodEnum<["card", "muted", "faint", "text", "strong", "ok", "busy", "warn", "danger"]>>;
                motion: z.ZodOptional<z.ZodEnum<["pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin", ...("pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin")[]]>>;
                /** Seconds after the slide shows before its motion starts. */
                delay: z.ZodOptional<z.ZodNumber>;
                kind: z.ZodLiteral<"box">;
                x: z.ZodNumber;
                y: z.ZodNumber;
                w: z.ZodNumber;
                h: z.ZodNumber;
                round: z.ZodOptional<z.ZodNumber>;
                dashed: z.ZodOptional<z.ZodBoolean>;
            }, "strict", z.ZodTypeAny, {
                kind: "box";
                x: number;
                y: number;
                w: number;
                h: number;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
                round?: number | undefined;
                dashed?: boolean | undefined;
            }, {
                kind: "box";
                x: number;
                y: number;
                w: number;
                h: number;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
                round?: number | undefined;
                dashed?: boolean | undefined;
            }>, z.ZodObject<{
                tone: z.ZodOptional<z.ZodEnum<["card", "muted", "faint", "text", "strong", "ok", "busy", "warn", "danger"]>>;
                motion: z.ZodOptional<z.ZodEnum<["pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin", ...("pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin")[]]>>;
                /** Seconds after the slide shows before its motion starts. */
                delay: z.ZodOptional<z.ZodNumber>;
                kind: z.ZodLiteral<"rows">;
                x: z.ZodNumber;
                y: z.ZodNumber;
                widths: z.ZodArray<z.ZodNumber, "many">;
                gap: z.ZodOptional<z.ZodNumber>;
            }, "strict", z.ZodTypeAny, {
                kind: "rows";
                x: number;
                y: number;
                widths: number[];
                gap?: number | undefined;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
            }, {
                kind: "rows";
                x: number;
                y: number;
                widths: number[];
                gap?: number | undefined;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
            }>, z.ZodObject<{
                tone: z.ZodOptional<z.ZodEnum<["card", "muted", "faint", "text", "strong", "ok", "busy", "warn", "danger"]>>;
                motion: z.ZodOptional<z.ZodEnum<["pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin", ...("pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin")[]]>>;
                /** Seconds after the slide shows before its motion starts. */
                delay: z.ZodOptional<z.ZodNumber>;
                kind: z.ZodLiteral<"dot">;
                x: z.ZodNumber;
                y: z.ZodNumber;
                r: z.ZodNumber;
            }, "strict", z.ZodTypeAny, {
                kind: "dot";
                x: number;
                y: number;
                r: number;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
            }, {
                kind: "dot";
                x: number;
                y: number;
                r: number;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
            }>, z.ZodObject<{
                tone: z.ZodOptional<z.ZodEnum<["card", "muted", "faint", "text", "strong", "ok", "busy", "warn", "danger"]>>;
                motion: z.ZodOptional<z.ZodEnum<["pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin", ...("pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin")[]]>>;
                /** Seconds after the slide shows before its motion starts. */
                delay: z.ZodOptional<z.ZodNumber>;
                kind: z.ZodLiteral<"line">;
                x: z.ZodNumber;
                y: z.ZodNumber;
                x2: z.ZodNumber;
                y2: z.ZodNumber;
                dashed: z.ZodOptional<z.ZodBoolean>;
            }, "strict", z.ZodTypeAny, {
                kind: "line";
                x: number;
                y: number;
                x2: number;
                y2: number;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
                dashed?: boolean | undefined;
            }, {
                kind: "line";
                x: number;
                y: number;
                x2: number;
                y2: number;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
                dashed?: boolean | undefined;
            }>, z.ZodObject<{
                tone: z.ZodOptional<z.ZodEnum<["card", "muted", "faint", "text", "strong", "ok", "busy", "warn", "danger"]>>;
                motion: z.ZodOptional<z.ZodEnum<["pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin", ...("pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin")[]]>>;
                /** Seconds after the slide shows before its motion starts. */
                delay: z.ZodOptional<z.ZodNumber>;
                kind: z.ZodLiteral<"text">;
                x: z.ZodNumber;
                y: z.ZodNumber;
                text: z.ZodString;
                size: z.ZodOptional<z.ZodNumber>;
                middle: z.ZodOptional<z.ZodBoolean>;
                mono: z.ZodOptional<z.ZodBoolean>;
            }, "strict", z.ZodTypeAny, {
                kind: "text";
                text: string;
                x: number;
                y: number;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
                size?: number | undefined;
                middle?: boolean | undefined;
                mono?: boolean | undefined;
            }, {
                kind: "text";
                text: string;
                x: number;
                y: number;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
                size?: number | undefined;
                middle?: boolean | undefined;
                mono?: boolean | undefined;
            }>, z.ZodObject<{
                tone: z.ZodOptional<z.ZodEnum<["card", "muted", "faint", "text", "strong", "ok", "busy", "warn", "danger"]>>;
                motion: z.ZodOptional<z.ZodEnum<["pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin", ...("pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin")[]]>>;
                /** Seconds after the slide shows before its motion starts. */
                delay: z.ZodOptional<z.ZodNumber>;
                kind: z.ZodLiteral<"pointer">;
                x: z.ZodNumber;
                y: z.ZodNumber;
            }, "strict", z.ZodTypeAny, {
                kind: "pointer";
                x: number;
                y: number;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
            }, {
                kind: "pointer";
                x: number;
                y: number;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
            }>]>, "many">;
        }, "strip", z.ZodTypeAny, {
            label: string;
            shapes: ({
                kind: "pane";
                x: number;
                y: number;
                w: number;
                h: number;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
            } | {
                kind: "box";
                x: number;
                y: number;
                w: number;
                h: number;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
                round?: number | undefined;
                dashed?: boolean | undefined;
            } | {
                kind: "rows";
                x: number;
                y: number;
                widths: number[];
                gap?: number | undefined;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
            } | {
                kind: "dot";
                x: number;
                y: number;
                r: number;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
            } | {
                kind: "line";
                x: number;
                y: number;
                x2: number;
                y2: number;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
                dashed?: boolean | undefined;
            } | {
                kind: "text";
                text: string;
                x: number;
                y: number;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
                size?: number | undefined;
                middle?: boolean | undefined;
                mono?: boolean | undefined;
            } | {
                kind: "pointer";
                x: number;
                y: number;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
            })[];
        }, {
            label: string;
            shapes: ({
                kind: "pane";
                x: number;
                y: number;
                w: number;
                h: number;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
            } | {
                kind: "box";
                x: number;
                y: number;
                w: number;
                h: number;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
                round?: number | undefined;
                dashed?: boolean | undefined;
            } | {
                kind: "rows";
                x: number;
                y: number;
                widths: number[];
                gap?: number | undefined;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
            } | {
                kind: "dot";
                x: number;
                y: number;
                r: number;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
            } | {
                kind: "line";
                x: number;
                y: number;
                x2: number;
                y2: number;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
                dashed?: boolean | undefined;
            } | {
                kind: "text";
                text: string;
                x: number;
                y: number;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
                size?: number | undefined;
                middle?: boolean | undefined;
                mono?: boolean | undefined;
            } | {
                kind: "pointer";
                x: number;
                y: number;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
            })[];
        }>>>;
    }, "strip", z.ZodTypeAny, {
        body: string;
        title: string;
        art?: {
            label: string;
            shapes: ({
                kind: "pane";
                x: number;
                y: number;
                w: number;
                h: number;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
            } | {
                kind: "box";
                x: number;
                y: number;
                w: number;
                h: number;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
                round?: number | undefined;
                dashed?: boolean | undefined;
            } | {
                kind: "rows";
                x: number;
                y: number;
                widths: number[];
                gap?: number | undefined;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
            } | {
                kind: "dot";
                x: number;
                y: number;
                r: number;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
            } | {
                kind: "line";
                x: number;
                y: number;
                x2: number;
                y2: number;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
                dashed?: boolean | undefined;
            } | {
                kind: "text";
                text: string;
                x: number;
                y: number;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
                size?: number | undefined;
                middle?: boolean | undefined;
                mono?: boolean | undefined;
            } | {
                kind: "pointer";
                x: number;
                y: number;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
            })[];
        } | undefined;
    }, {
        body: string;
        title: string;
        art?: unknown;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    slides: {
        body: string;
        title: string;
        art?: {
            label: string;
            shapes: ({
                kind: "pane";
                x: number;
                y: number;
                w: number;
                h: number;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
            } | {
                kind: "box";
                x: number;
                y: number;
                w: number;
                h: number;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
                round?: number | undefined;
                dashed?: boolean | undefined;
            } | {
                kind: "rows";
                x: number;
                y: number;
                widths: number[];
                gap?: number | undefined;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
            } | {
                kind: "dot";
                x: number;
                y: number;
                r: number;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
            } | {
                kind: "line";
                x: number;
                y: number;
                x2: number;
                y2: number;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
                dashed?: boolean | undefined;
            } | {
                kind: "text";
                text: string;
                x: number;
                y: number;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
                size?: number | undefined;
                middle?: boolean | undefined;
                mono?: boolean | undefined;
            } | {
                kind: "pointer";
                x: number;
                y: number;
                tone?: "busy" | "text" | "warn" | "card" | "muted" | "ok" | "faint" | "strong" | "danger" | undefined;
                motion?: "pop" | "fill" | "drop" | "rise" | "draw" | "pulse" | "blink" | "ping" | "narrow" | "chip" | "spin" | undefined;
                delay?: number | undefined;
            })[];
        } | undefined;
    }[];
}, {
    slides: {
        body: string;
        title: string;
        art?: unknown;
    }[];
}>;
export type Intro = z.infer<typeof introSchema>;
/**
 * A module's introduction, ready to draw, or `null` when it has none (or one that does not parse).
 * Every string is one line of plain text (`oneLine`); a slide whose title or body is left empty by
 * that is dropped, and a picture whose label or a `text` shape's text is left empty loses that
 * picture. Pure; what a host reads before it offers "Introduction" at all.
 */
export declare function introOf(manifest: {
    intro?: unknown;
} | null | undefined): Intro | null;
/**
 * Where a module keeps its introduction as a file, at the root of its repository: `intro.json`,
 * holding exactly what `intro` holds (`{ slides: [...] }`). A host reads the introduction of a module
 * that is NOT running from here — from its installed copy, or, for a module not installed yet, from
 * this file at the release the host would install — so a person can watch it before installing,
 * placing or starting anything. A module that has the file puts the same thing in its manifest
 * (`import intro from './intro.json'`), so one copy says it everywhere.
 */
export declare const INTRO_FILE = "intro.json";
/** As much of an `intro.json` as a host reads: more than this is not an introduction. */
export declare const INTRO_FILE_BYTES: number;
/**
 * An `intro.json` read as text, ready to draw (`introOf`), or `null` when it is missing, too big,
 * not JSON or not an introduction. Pure; never throws.
 */
export declare function introFromFile(text: string | null | undefined): Intro | null;
/** Whether a module has an introduction: what a host asks before it offers one. */
export declare function hasIntro(manifest: {
    intro?: unknown;
} | null | undefined): boolean;
/**
 * About how long an introduction takes to read, in whole seconds: four seconds a slide plus a second
 * for every fifteen words, rounded to the nearest five. What a host says on its offer ("a 20-second
 * introduction"). At least five.
 */
export declare function introSeconds(intro: Intro): number;
