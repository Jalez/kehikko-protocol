/**
 * 2.105.0. Two things a test of a module waits for that it does not control, so the test says what it waits
 * for instead of sleeping or hoping:
 *
 *  - **Background work the test started** and nothing awaits: a post from a detached script, a save the page
 *    makes after it renders, a loop's first look. A test that leaves one running lets it land in the NEXT
 *    test (a shared list, a reset counter) and fail that one on a slow machine. `settled` waits until the
 *    work has ended; `trackBackground` is a place to hand the work to.
 *  - **Writes the page makes of its own** (its tabs, its size) around the one a test presses. A test that
 *    asserts the exact list of writes without waiting for those fails whenever they land first.
 *    `waitForWrites` waits for a write that matches, and gives back what was written.
 *
 * Node-only; no test runner is imported, so any one works.
 */
export interface WaitOptions {
    /** The most to wait, in ms. Default 10 000. */
    within?: number;
    /** How often to look, in ms. Default 20. */
    every?: number;
    /** What was being waited for, for the failure. */
    what?: string;
}
/** Wait until `done()` is true; throws, saying what it was waiting for, when `within` passes first. */
export declare function until(done: () => boolean | Promise<boolean>, options?: WaitOptions): Promise<void>;
/**
 * Wait until a module's background work has ended: `pending()` says whether any is left (a counter, a
 * folder a detached job empties, a list of promises not yet settled). Call it in `afterEach` so no work
 * outlives its own test.
 */
export declare function settled(pending: () => boolean | Promise<boolean>, options?: WaitOptions): Promise<void>;
export interface Background {
    /** Hand background work over (a promise, or a function that starts it); it is run and kept track of. */
    run<T>(work: Promise<T> | (() => Promise<T>)): Promise<T>;
    /** How much is still running. */
    readonly pending: number;
    /** Wait until nothing is running, including what is handed over while waiting. A failure of the work is not this test's to hear: it is thrown here. */
    settled(options?: WaitOptions): Promise<void>;
}
/** A place to hand background work to, so `settled()` can wait for exactly it. One per test file; `settled()` in `afterEach`. */
export declare function trackBackground(): Background;
/**
 * Wait until the writes the page has made so far (`writes`, a list the test's stand-in host pushes to) hold
 * one that `matches`, then give back a copy of what was written. With `clear`, the list is emptied after, so
 * what is asserted next is only what the test itself causes:
 *
 *     await waitForWrites(wrote, (write) => 'tabs' in write[0], { clear: true })
 *     press()
 *     expect(wrote).toEqual([...])
 */
export declare function waitForWrites<W>(writes: W[], matches: (write: W) => boolean, options?: WaitOptions & {
    clear?: boolean;
}): Promise<W[]>;
