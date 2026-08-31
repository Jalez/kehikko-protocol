/**
 * The one message listener a framed page has, installed the moment this file is
 * imported and never removed.
 *
 * ## The bug it exists to fix
 *
 * The host greets a frame on the frame's `load` event, and that is correct: a
 * module greeted before its own script has run never hears the greeting, so the
 * host waits for the browser to say the document is there.
 *
 * But `load` fires when the document and its subresources are ready, and a
 * React application is not ready then. `createRoot().render()` schedules work;
 * effects run after that work commits, in a task of their own. So a listener
 * added inside `useEffect` — which is where `connect` was being called from —
 * is added STRICTLY AFTER `load`. The greeting had already been posted into a
 * page that was not yet listening, and was gone. Nothing retries: the host says
 * its one word, the module never answers, and the pane reads "loaded its page
 * and did not answer the host's greeting". Which is true, and gives no hint
 * that the greeting arrived a few hundred milliseconds before anybody was there
 * to hear it.
 *
 * `StrictMode` makes it worse rather than revealing it: the deliberate
 * double-mount attaches, detaches and re-attaches, so there is a window with no
 * listener at all in the middle of startup.
 *
 * So the listener is installed here, at module scope, synchronously, as part of
 * importing the client at all. Anything that arrives before the application is
 * ready is kept and handed over when it asks. A page adopting this client must
 * therefore import it from its ENTRY — `import 'roadmap-module-protocol/client'`
 * beside the first React import, not from inside a component — because a module
 * that is only imported by a lazily-loaded chunk is a module scope that has not
 * run yet, which is the same bug wearing a bundler's clothes.
 *
 * ## Recorded always, not only while unheard
 *
 * Every message goes into the backlog and is then delivered — rather than being
 * buffered only while nobody is subscribed. The conditional version has a hole
 * exactly one `StrictMode` wide: a greeting landing after the doomed first
 * subscription but before its unmount is handed to a listener that is about to
 * be thrown away, and never written down, so the surviving mount replays a
 * backlog the greeting was never in. That failure is deeply confusing to read,
 * because the host sees a module that answered — the discarded listener really
 * did reply — while the module's own screen says nothing ever greeted it.
 *
 * The cost is a duplicate: a subscriber that comes and goes and comes back
 * answers the same greeting twice. That is the right trade. A second
 * `roadmap.ready` is the same sentence as the first and a host takes a module at
 * its word either way. Losing it is silence; repeating it is noise.
 */
/** Just enough of a window to listen to. `connect` takes one of these. */
export interface MessageSource {
    addEventListener(type: 'message', fn: (ev: MessageEvent) => void): void;
    removeEventListener(type: 'message', fn: (ev: MessageEvent) => void): void;
    /**
     * Throw away the backlog, for a test suite and nothing else.
     *
     * The mailbox is a module-scope singleton with a module-scope backlog, which
     * is exactly right in a page and exactly wrong across a test file: one case
     * posts a greeting, the next case subscribes and is handed the previous
     * case's greeting on the way in, and the failure reads as a module answering
     * a host nobody in that test ever started. Found in a real suite, not
     * imagined.
     *
     * A page must never call it. Forgetting the backlog in a browser is throwing
     * away the greeting the backlog exists to hold.
     */
    forget?(): void;
    /**
     * Who to answer if a greeting arrives without a `source` on it.
     *
     * A last resort and nothing more. Every real greeting carries the window it
     * came from, and that handle is the identity the whole wire is built on —
     * see the essay at the top of `connect.ts`. This is the fallback for a message
     * whose source the browser did not give us, and the only sensible guess then
     * is the frame's own parent.
     */
    readonly parent?: Window | null;
}
/**
 * How much is kept while nothing is listening.
 *
 * A greeting, a context and a handful of answers is the real backlog; anything
 * beyond that is a page that has not mounted for long enough that its problem
 * is not the buffer. Bounded so a host talking to a dead page cannot grow this
 * without limit — oldest go first, because the newest are the ones still worth
 * acting on.
 */
export declare const KEEP = 64;
/** The half of a window this needs: somewhere to listen, and a parent to guess at. */
interface Listenable {
    addEventListener(type: 'message', fn: (ev: MessageEvent) => void): void;
    readonly parent?: Window | null;
}
/**
 * Build a mailbox over one window, listening immediately.
 *
 * Exported because the whole of what this file decides — replay on subscribe,
 * the bound backlog, delivery to everybody — is tested without a browser, and
 * that has to keep being true. Nothing in a page should call it: a page wants
 * the one `mailbox` below, because a second mailbox over the same window is a
 * second backlog that answers the same greeting twice.
 */
export declare function makeMailbox(target: Listenable | undefined): MessageSource;
/**
 * The page's inbox, shaped like the thing it replaces.
 *
 * `connect` could take the real `window` and add a listener to it. It takes this
 * instead, which is the same two methods with one difference: subscribing
 * replays everything that has already arrived. Tests pass their own fake source
 * and are unaffected — which is the reason for the shape rather than a happy
 * accident, because the wire's decisions are tested without a browser and that
 * has to keep being true.
 *
 * Outside a browser this is an inbox nothing ever posts to, rather than a crash.
 * The server half of a module imports the same package.
 */
export declare const mailbox: MessageSource;
export {};
//# sourceMappingURL=mailbox.d.ts.map