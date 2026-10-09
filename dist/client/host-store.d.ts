import type { CanvasContainer, EpicPart, FilterChoice, FilterGroup, ModuleContext, Passage } from '../index.js';
import type { PageTheme } from '../page.js';
import { type AskOptions, type ConnectOptions, type Connection, type HostEvents } from './connect.js';
/**
 * The host as one value outside React: everything `useHost` arranges — the grace before
 * "unhosted", the theme on `<html>`, the flattened context, the kept state, the stale reload — for
 * a page whose state lives in a store of its own. `useHost` is this, bound to a component.
 * See docs/module-plumbing.md.
 */
/** How long, in ms, a page stays `listening` before it will say nobody is there (`unhosted`). */
export declare const GREETING_GRACE_MS = 700;
/**
 * Whether anything is framing this page: `listening` (not heard yet, under a second), `unhosted`
 * (nobody is there, the standalone case) or `hosted`.
 */
export type Where = 'listening' | 'unhosted' | 'hosted';
/** How the string a host keeps for a module becomes a value, and back. */
export interface KeptCodec<Kept> {
    /** `null` for anything unrecognised: an older version's string should give first-run behaviour, not a guess. */
    read: (state: string | null) => Kept | null;
    write: (kept: Kept) => string;
}
/** The default: JSON, and `null` for anything that does not parse. */
export declare const JSON_KEPT: KeptCodec<unknown>;
export interface HostStoreOptions<Kept = unknown> extends ConnectOptions {
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
    /**
     * When a field of the context counts as the one it was, for a page whose rule is looser than
     * "says the same thing all the way down": a passage whose section ends somewhere else is still
     * the same passage. Per field; a field without a rule here is compared deeply. Read at mount.
     */
    same?: Steadiness;
}
/** The fields of a standing that keep their identity while they say the same thing. */
export type SteadyField = 'passage' | 'containers' | 'parts' | 'selection' | 'chosen' | 'kehikko';
/** A page's own rule for "the same", per field: `(was, now) => true` keeps the object it was. */
export type Steadiness = {
    [Field in SteadyField]?: (was: HostFields[Field], now: HostFields[Field]) => boolean;
};
/** The flattened fields of a context: what a screen reads, each `null` or empty rather than absent. */
export interface HostFields {
    /** What the open project is called. A name, not a path. */
    project: string | null;
    /** The absolute directory of the open project. `null` also for an empty string, or one that is only spaces. */
    projectPath: string | null;
    epic: string | null;
    passage: Passage | null;
    containers: readonly CanvasContainer[];
    /** The parts of the open epic, with which are picked out. Empty is the whole epic. */
    parts: readonly EpicPart[];
    selection: readonly string[];
    /** What the person chose in the filters this page offered with `filters()`. */
    chosen: FilterChoice;
    /** Which kehikko (canvas) this page is on, or `null`. Compare with an event's `kehikko` to tell near from far. */
    kehikko: ModuleContext['kehikko'];
}
/** Where the host stands, as one value. A new object whenever anything in it changed, and only then. */
export interface HostStanding<Kept = unknown> extends HostFields {
    /** `listening` for under a second, then `unhosted`, or `hosted` from the greeting on. */
    where: Where;
    /** The whole context as the host last said it, or `null` before the greeting. */
    context: ModuleContext | null;
    /** What is on `<html>`: the host's theme once it has said one, the page's own first guess before. */
    theme: PageTheme;
    /** What the host kept for this module, read through the codec. `null` when nothing, or nothing recognised. */
    kept: Kept | null;
}
/** What a page says to its host, the same from the hook and from the store. */
export interface HostActions<Kept = unknown> {
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
}
export interface HostStore<Kept = unknown> extends HostActions<Kept> {
    /** The standing now. The same object until something changes, so it is a `useSyncExternalStore` snapshot. */
    get: () => HostStanding<Kept>;
    /** Hear every change, after `get()` already says it. Returns the function that stops hearing. */
    subscribe: (heard: () => void) => () => void;
    /** Start listening. Whatever has already arrived is replayed inside this call. Once. */
    start: () => HostStore<Kept>;
    /** Stop for good: the connection, the grace, the stale watch. A stopped store says nothing more. */
    stop: () => void;
    /** The connection, or `null` before `start` and after `stop`. */
    connection: () => Connection | null;
}
/**
 * The flattened fields of a context. Pure, so a test can build a `Host` from a plain object.
 * Given the fields as they were, each one that still says the same thing IS the one it was: every
 * context is parsed afresh off the wire, and an effect that depends on `passage` should run when
 * the passage changed, not whenever the host spoke. `same` replaces that rule for the fields it names.
 */
export declare function hostFields(context: ModuleContext | null, was?: HostFields, same?: Steadiness): HostFields;
/**
 * Build the store. Nothing is heard until `start()`. `events` are the page's own handlers, called
 * AFTER the standing has changed — so a handler that reads `get()` finds what it was just told,
 * which matters for a greeting replayed before anything has rendered.
 */
export declare function hostStore<Kept = unknown>(id: string, events?: HostEvents, options?: HostStoreOptions<Kept>): HostStore<Kept>;
