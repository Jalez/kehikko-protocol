import { type Connection, type HostEvents } from './connect.js';
import { type HostActions, type HostStanding, type HostStoreOptions } from './host-store.js';
/**
 * The host, as one React value with everything a screen reads already on it: the theme on `<html>`,
 * the flattened context, the kept state. A thin binding over `hostStore` (`host-store.ts`), which
 * is the same thing for a page whose state lives outside React. See docs/module-plumbing.md.
 */
export { JSON_KEPT, hostFields, type KeptCodec } from './host-store.js';
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
