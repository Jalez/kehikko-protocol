import type { PointerTarget } from './connect.js';
/**
 * 2.70.0. Long press from nested frames: a press inside an iframe the page owns — a PDF viewer, a
 * preview, an editor in a frame of its own — is not heard on the page's window, so the host never
 * learned of it (`kehikot.pointer`) and a long press there revealed nothing. `relayPointer` hears it.
 * Design notes: docs/client.md, "What every container gets by default (2.70.0)".
 *
 * Two ways, by what the page can reach:
 *  - a frame on the page's own origin: its window is listened on directly, again after each load;
 *  - a frame on another origin (a viewer served elsewhere): it cannot be reached, so the viewer runs
 *    `pointerShim` (bundled in) or `pointerShimScript()` (one `<script>`), which posts each press to
 *    the page as `RELAY_POINTER`, and `relayPointer(…, { origin })` takes only those from that frame
 *    and that origin.
 * Either way the presses go through the connection's own pointer reporting: told only to a host that
 * asked (`hello.pointer`), with the same slop and the same rules for a cancel.
 */
/** What the shim posts. Not a `kehikot.` type: it is between a page and its own frame, never on the wire. */
export declare const RELAY_POINTER = "kehikot-relay.pointer";
/** The events relayed: what `connect` listens to for a press. */
export declare const RELAYED_EVENTS: readonly ["pointerdown", "pointerup", "pointercancel", "pointermove", "mousemove", "mouseup", "dragend"];
/** What takes the presses: a `Connection`, a `hostStore`, or `useHost`'s value. */
export interface PointerSink {
    pointerFrom: (target: PointerTarget) => () => void;
}
/** Just enough of an iframe. */
export interface FrameLike {
    readonly contentWindow: unknown;
    addEventListener(type: 'load', listener: () => void): void;
    removeEventListener(type: 'load', listener: () => void): void;
}
/** Where the shim's messages arrive: the page's window, or anything shaped like it. */
export interface RelayMessages {
    addEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
    removeEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
}
export interface RelayOptions {
    /**
     * The origin of a frame the page cannot reach, whose viewer runs the shim: its messages are taken
     * from that frame's window and this origin only. Absent: the frame is listened on directly, which
     * works only on the page's own origin.
     */
    origin?: string;
    /** Where the shim's messages are heard: the page's `window` by default. For tests. */
    messages?: RelayMessages;
}
/**
 * Hear presses inside `frame` and tell the host of them as if they were on the page. Returns the
 * function that stops. Call it once the frame is in the document (an effect); a frame that loads
 * another document is listened on again.
 */
export declare function relayPointer(sink: PointerSink, frame: FrameLike, options?: RelayOptions): () => void;
/**
 * The viewer's half, for a frame on another origin: post every press to the page that framed it, as
 * `RELAY_POINTER`. Bundle it into the viewer and call it once; `origin` is the page's origin (only
 * it is told). Returns the function that stops. Self-contained, so `pointerShimScript` can inline it.
 */
export declare function pointerShim(options?: {
    origin?: string;
    target?: unknown;
    parent?: unknown;
}): () => void;
/** `pointerShim` as one script to put in a viewer's page (`<script>…</script>`), telling `origin` only. */
export declare function pointerShimScript(origin: string): string;
