import type { ModuleContext } from '../wire.js';
import { type Connection, type ConnectOptions, type HostEvents } from './connect.js';
/**
 * The bridge as one React value — and it is OPTIONAL, twice over.
 *
 * Optional because it is a second subpath: `roadmap-module-protocol/client` has
 * no idea this file exists, imports no React, and works in a page built with
 * anything or nothing. A client that imported React would make this package
 * opinionated about a thing it has no business having an opinion on. Not every
 * module is a React app and none is obliged to be.
 *
 * Optional because a module may hand-roll all of it and be perfectly conforming.
 * See the note in `index.ts`.
 *
 * What it adds over calling `connect` yourself is three orderings that are easy
 * to get wrong and silent when you do — the store-before-listen split, the
 * handler refs, and the discarded-mount guard. Each is described where it
 * happens.
 */
/**
 * How long a page waits before it will say nobody is there.
 *
 * A page cannot know at load whether it is framed. It has to wait to find out,
 * because the greeting arrives when the host is ready rather than when we are,
 * and a page that concluded "nobody is there" in the first frame would say so
 * and then be greeted a moment later — the reader would see the standalone
 * paragraph flash past and be replaced, which teaches them that paragraph is
 * noise. So there is a `listening` state with its own words, it lasts under a
 * second, and only then does the page say the harder thing.
 *
 * It is not a spinner. A page using it should say what it is waiting for.
 */
export declare const GREETING_GRACE_MS = 700;
/**
 * Whether anything is framing this page, in the three states that matter.
 *
 * Three rather than a boolean, because "we have not heard yet" is not "nobody is
 * there": one lasts under a second and the other is the standalone case a module
 * is expected to work in. Drawing the second while in the first is the flicker
 * the grace above exists to prevent.
 */
export type Where = 'listening' | 'unhosted' | 'hosted';
export interface UseRoadmapOptions extends ConnectOptions {
    /** Override `GREETING_GRACE_MS`, or pass `0` to say "unhosted" the moment the first paint lands. */
    grace?: number;
}
export interface Roadmap {
    /** `listening` for under a second, then `unhosted`, or `hosted` from the greeting on. */
    where: Where;
    /**
     * The whole context, as the host last said it, or null before the greeting.
     *
     * Whole and not picked apart, deliberately: a hook that returned a chosen few
     * fields would be the enumerated-context bug wearing a different hat, and
     * every field the protocol grows would stop at this line. Read what you need.
     */
    context: ModuleContext | null;
    /** Whatever the host is keeping for this module, from the greeting. `null` when it keeps nothing. */
    state: string | null;
    /** Ask the host something. Rejects with `HostRefused`, always. Safe before the greeting: it refuses. */
    request: (method: string, params?: Record<string, unknown>) => Promise<unknown>;
    /** Say how tall this page would like its frame to be. Silent when nothing is framing it. */
    resize: (height: number) => void;
    /**
     * The live connection, or null between mounts.
     *
     * Here because a page with its own machinery — a poll that emits, a store that
     * asks — needs the same connection the hook is holding, and building a second
     * one would be a second `ready` and a second backlog replay. Read it at the
     * moment you need it rather than capturing it.
     */
    connection: () => Connection | null;
}
/**
 * Connect once, for the life of this component, and re-render when the host speaks.
 *
 * `events` may be rebuilt on every render — it is read through a ref, never
 * captured — so there is no need to memoise it at the call site. `id` is the
 * only dependency, because reconnecting is a second `ready` and a torn-down
 * listener during whatever millisecond the host chose to greet in.
 */
export declare function useRoadmap(id: string, events?: HostEvents, options?: UseRoadmapOptions): Roadmap;
//# sourceMappingURL=react.d.ts.map