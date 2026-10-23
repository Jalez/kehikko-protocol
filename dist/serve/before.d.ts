import { type Asker } from './gate.js';
import type { DoorHandler, DoorRequest } from './doors.js';
/**
 * A door of a module's own that is asked before the protocol's (2.18.0): one function from a
 * `Request` to a `Response`, written once and mounted on both servers a module can be in front of —
 * Vite's dev server through `beforeHandler` (or the `beforeDoors` plugin), and the built one through
 * `run({ before })`. So the two cannot drift. Design notes: docs/ready-built.md.
 *
 * It sees every request first, headers included — a header the doors read past, a method they
 * refuse — and answers it with a `Response`, or returns `undefined` (or `null`) to leave it to the
 * doors, the files of `dist/`, or Vite, untouched: a request it hands on has not had its body read.
 *
 *     // factory.ts
 *     export const factoryDoor: Before = async (request, { asker, url }) => {
 *       if (url.pathname !== '/api/factory/send' || !request.headers.get(KEY_HEADER)) return undefined
 *       if (asker !== 'program') return Response.json({ ok: false, error: '…' }, { status: 403 })
 *       …
 *     }
 *     // vite.config.ts: plugins: [serves(…), beforeDoors(factoryDoor), doors(…), react()]
 *     // serve.ts:       await run({ …, before: factoryDoor })
 *
 * Nothing here fences anything: what it answers, and to whom, is the module's to decide, and
 * `asker` is handed over so it decides the way the doors do (`gate.ts`).
 */
/** What the doors work out about a request before they route it, handed to `before`. */
export interface BeforeInfo {
    /** Who asked, read the way the doors read it (`asker` in gate.ts). */
    asker: Asker;
    /** The address asked, on this server's origin. */
    url: URL;
    /** The write ticket the request carried (`TICKET_HEADER`), or null. Compare it with `sameTicket`. */
    ticket: string | null;
}
/** `undefined` or `null` is "not mine": the request goes on to the doors, unread. */
export type Before = (request: Request, info: BeforeInfo) => Response | null | undefined | Promise<Response | null | undefined>;
/** What `before` is handed for a `Request` a server received. The doors compute the same. */
export declare function beforeInfo(request: Request): BeforeInfo;
/** The `Request` a node request is, on `http://<Host>` (or 127.0.0.1 when it names none). */
export declare function requestOf(request: DoorRequest & {
    method?: string;
}): Request;
/**
 * `before` as node middleware — `(request, response, next)` — for Vite's `configureServer`, in front
 * of the protocol's `doors()`. `next()` when it answers nothing; `next(error)` when it throws.
 */
export declare function beforeHandler(before: Before): DoorHandler;
/** The part of Vite's dev server `beforeDoors` touches. */
export interface BeforeServerLike {
    middlewares: {
        use(handler: DoorHandler): unknown;
    };
}
export interface BeforePlugin {
    name: string;
    apply: 'serve';
    configureServer(server: BeforeServerLike): void;
}
/**
 * The Vite plugin: `before` mounted ahead of `doors()`. It goes after `serves()` and before
 * `doors()`, so it sees what the doors would refuse or read past:
 *
 *     plugins: [serves({ id: ID, prefer: PREFERRED_PORT }), beforeDoors(myDoor), doors({ … }), react()]
 *
 * `setup` runs once, when the dev server is made — the same moment `run` would be started.
 */
export declare function beforeDoors(before: Before, options?: {
    name?: string;
    setup?: () => void;
}): BeforePlugin;
