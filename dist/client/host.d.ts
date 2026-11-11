import { type Connection, type HostEvents } from './connect.js';
import { type HostActions, type HostStanding, type HostStoreOptions } from './host-store.js';
/**
 * The host, as one React value with everything a screen reads already on it: the theme on `<html>`,
 * the flattened context, the kept state. A thin binding over `hostStore` (`host-store.ts`), which
 * is the same thing for a page whose state lives outside React. See docs/module-plumbing.md.
 */
export { JSON_KEPT, KEEP_AFTER_MS, hostFields, type KeptCodec } from './host-store.js';
export type UseHostOptions<Kept = unknown> = HostStoreOptions<Kept>;
export interface Host<Kept = unknown> extends HostStanding<Kept>, HostActions<Kept> {
    /**
     * The standing right now, ahead of the render: for a handler (`onEvent`, `onClear`), which can
     * be called for a message replayed before React has drawn the greeting it followed. Stable.
     */
    read: () => HostStanding<Kept>;
    /** The live connection, or `null` between mounts. Read it when needed rather than capturing it. */
    connection: () => Connection | null;
}
/**
 * Connect once for the life of the component. `events` may be rebuilt on every
 * render — it is read through a ref — so `onGoto` needs no memoising.
 */
export declare function useHost<Kept = unknown>(id: string, events?: HostEvents, options?: UseHostOptions<Kept>): Host<Kept>;
/**
 * 2.84.0. Tell the host whether the page shows what it is for: `drawn` true says `ready()`, false says
 * `loading(label)`. Pass the page's own "is what I show read and drawn?" — false while it reads what
 * a new epic, project or set of parts asks for. The host covers the container, with the module's icon
 * and `label` ("Loading the journey…"), only when a context came and the page did not draw it within
 * `LOADING_COVER_AFTER_MS`; a page that stays drawn through a context is never covered. On the first
 * greeting `label` is what the held cover says.
 */
export declare function useDrawn(host: {
    ready: () => void;
    loading: (label?: string | null) => void;
}, drawn: boolean, label?: string | null): void;
/** What `useKept` needs of a host: `useHost`'s value, or anything with the same three members. */
export interface KeepsFor {
    kept: unknown;
    read: () => {
        kept: unknown;
    };
    remember: (next: never, after?: number) => void;
}
/**
 * 2.51.0. One field of this container's kept view, as `useState`: `const [view, setView] =
 * useKept(host, 'view', 'list')`. Read from the host's kept value (a JSON object, one key per field)
 * and written back into it, the other fields kept, after `KEEP_AFTER_MS`. The host keeps it per
 * container — this module on this kehikko — so the same module on two kehikot keeps two views, and
 * each is back after the app restarts. Nothing goes to browser storage.
 *
 * `initial` is what is shown when nothing is kept, or what is kept is not the same kind of value
 * (`valid`, when given, decides instead: a switch's options, say). The kept value arrives with the
 * greeting, before the first hosted render, so a page that waits for `where === 'hosted'` never
 * draws the default first. Several `useKept` on one host share its kept object; a page that also
 * calls `remember` itself must keep that object's other keys.
 */
export declare function useKept<T>(host: KeepsFor, key: string, initial: T, valid?: (value: unknown) => boolean): [T, (next: T | ((was: T) => T)) => void];
