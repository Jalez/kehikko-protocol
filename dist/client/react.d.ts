import type { FilterGroup, ModuleContext } from '../wire.js';
import { type Connection, type AskOptions, type ConnectOptions, type HostEvents } from './connect.js';
/**
 * The bridge as one React value: `useKehikot`. Optional — a second subpath the plain client never
 * imports, and a module may hand-roll all of it.
 * Design notes: docs/client.md.
 */
/** How long, in ms, a page stays `listening` before it will say nobody is there (`unhosted`). */
export declare const GREETING_GRACE_MS = 700;
/**
 * Whether anything is framing this page: `listening` (not heard yet, under a second), `unhosted`
 * (nobody is there, the standalone case) or `hosted`.
 */
export type Where = 'listening' | 'unhosted' | 'hosted';
export interface UseKehikotOptions extends ConnectOptions {
    /** Override `GREETING_GRACE_MS`, or pass `0` to say "unhosted" the moment the first paint lands. */
    grace?: number;
}
export interface Kehikot {
    /** `listening` for under a second, then `unhosted`, or `hosted` from the greeting on. */
    where: Where;
    /** The whole context, as the host last said it, or null before the greeting. */
    context: ModuleContext | null;
    /** Whatever the host is keeping for this module, from the greeting. `null` when it keeps nothing. */
    state: string | null;
    /**
     * Ask the host something. Rejects with `HostRefused`, always. Safe before the greeting: it
     * refuses. `options.within` is this one question's deadline — see `AskOptions`.
     */
    request: (method: string, params?: Record<string, unknown>, options?: AskOptions) => Promise<unknown>;
    /** Say how tall this page would like its frame to be. Silent when nothing is framing it. */
    resize: (height: number) => void;
    /**
     * Say what this page can be narrowed by. The host draws the control; the choice comes back in
     * `context.filters`. Stable across renders.
     */
    filters: (groups: FilterGroup[]) => void;
    /**
     * Say that what this page shows can be cleared, and what to call it. `null` takes the control
     * away. Stable across renders. Nothing comes back through the context.
     */
    clearable: (label: string | null) => void;
    /**
     * Say that this page can read its material again, and when it last did. Stable across renders.
     * `at` is the module's fact about its own data; a host never infers one.
     */
    refreshable: (state: {
        can?: boolean;
        at?: string | null;
        busy?: boolean;
    }) => void;
    /**
     * The live connection, or null between mounts. Read it at the moment you need it rather than
     * capturing it; do not build a second one.
     */
    connection: () => Connection | null;
}
/**
 * Connect once, for the life of this component, and re-render when the host speaks. `events` is
 * read through a ref, so it need not be memoised; `id` is the only dependency that reconnects.
 */
export declare function useKehikot(id: string, events?: HostEvents, options?: UseKehikotOptions): Kehikot;
export { useFocus, type Focus } from './focus.js';
/**
 * The names this hook and its types had before the app was renamed, kept so a
 * module that has not been updated still builds against this copy. Same
 * function, same types. Use `useKehikot`.
 *
 * @deprecated Renamed to `useKehikot`.
 */
export declare const useRoadmap: typeof useKehikot;
/** @deprecated Renamed to `Kehikot`. */
export type Roadmap = Kehikot;
/** @deprecated Renamed to `UseKehikotOptions`. */
export type UseRoadmapOptions = UseKehikotOptions;
