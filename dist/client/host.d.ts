import type { CanvasContainer, EpicPart, FilterChoice, FilterGroup, ModuleContext, Passage } from '../index.js';
import type { PageTheme } from '../page.js';
import { type AskOptions, type ConnectOptions, type Connection, type HostEvents } from './connect.js';
import { type Where } from './react.js';
/**
 * The host, as one React value with everything a screen reads already on it: the theme on `<html>`,
 * the flattened context, the kept state. Built on `connect`, sharing nothing with `useKehikot` but
 * its three orderings, so that hook can be retired. See docs/module-plumbing.md.
 */
/** How the string a host keeps for a module becomes a value, and back. */
export interface KeptCodec<Kept> {
    /** `null` for anything unrecognised: an older version's string should give first-run behaviour, not a guess. */
    read: (state: string | null) => Kept | null;
    write: (kept: Kept) => string;
}
/** The default: JSON, and `null` for anything that does not parse. */
export declare const JSON_KEPT: KeptCodec<unknown>;
export interface UseHostOptions<Kept = unknown> extends ConnectOptions {
    /** Override `GREETING_GRACE_MS`, or pass `0` to never conclude "unhosted" from silence. */
    grace?: number;
    /** How the kept state is read and written. Default `JSON_KEPT`. Read at mount. */
    kept?: KeptCodec<Kept>;
    /** `false` leaves `<html>` alone. Default `true`: the host's theme is put on it. */
    applyTheme?: boolean;
    /**
     * `false` leaves a page that is older than its own server as it is. Default `true`: it reloads,
     * once, a moment after `ask()` notices (see `reloadWhenStale`).
     */
    reloadWhenStale?: boolean;
}
export interface Host<Kept = unknown> {
    /** `listening` for under a second, then `unhosted`, or `hosted` from the greeting on. */
    where: Where;
    /** The whole context as the host last said it, or `null` before the greeting. */
    context: ModuleContext | null;
    /** What the open project is called. A name, not a path. */
    project: string | null;
    /** The absolute directory of the open project. `null` also for an empty string. */
    projectPath: string | null;
    epic: string | null;
    passage: Passage | null;
    containers: readonly CanvasContainer[];
    /** The parts of the open epic, with which are picked out. Empty is the whole epic. */
    parts: readonly EpicPart[];
    selection: readonly string[];
    /** What the person chose in the filters this page offered with `filters()`. */
    chosen: FilterChoice;
    /** What is on `<html>`: the host's theme once it has said one, the page's own first guess before. */
    theme: PageTheme;
    /** What the host kept for this module, read through the codec. `null` when nothing, or nothing recognised. */
    kept: Kept | null;
    /**
     * Keep a value with the host (`state.set`) and hold it here. Fire and
     * forget: a host may refuse, and then the choice holds for this session.
     * Silent when nothing is framing the page.
     */
    remember: (next: Kept) => void;
    /**
     * Say which passage this page is pointing at (`passage.set`), or `null` for
     * none. Fire and forget, like `remember`.
     */
    point: (passage: Passage | null) => void;
    /** Ask the host something. Rejects with `HostRefused`, always; safe before the greeting. Stable. */
    request: (method: string, params?: Record<string, unknown>, options?: AskOptions) => Promise<unknown>;
    resize: (height: number) => void;
    filters: (groups: FilterGroup[]) => void;
    clearable: (label: string | null) => void;
    refreshable: (state: {
        can?: boolean;
        at?: string | null;
        busy?: boolean;
    }) => void;
    /** The live connection, or `null` between mounts. Read it when needed rather than capturing it. */
    connection: () => Connection | null;
}
/** The flattened fields of a context. Pure, so a test can build a `Host` from a plain object. */
export declare function hostFields(context: ModuleContext | null): Pick<Host, 'project' | 'projectPath' | 'epic' | 'passage' | 'containers' | 'parts' | 'selection' | 'chosen'>;
/**
 * Connect once for the life of the component. `events` may be rebuilt on every
 * render — it is read through a ref — so `onGoto` needs no memoising.
 */
export declare function useHost<Kept = unknown>(id: string, events?: HostEvents, options?: UseHostOptions<Kept>): Host<Kept>;
