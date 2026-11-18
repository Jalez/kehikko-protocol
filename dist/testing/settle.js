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
const pause = (ms) => new Promise((done) => setTimeout(done, ms));
/** Wait until `done()` is true; throws, saying what it was waiting for, when `within` passes first. */
export async function until(done, options = {}) {
    const end = Date.now() + (options.within ?? 10_000);
    const every = options.every ?? 20;
    for (;;) {
        if (await done())
            return;
        if (Date.now() >= end)
            throw new Error(`Gave up after ${(options.within ?? 10_000) / 1000} s waiting for ${options.what ?? 'a condition'}.`);
        await pause(every);
    }
}
/**
 * Wait until a module's background work has ended: `pending()` says whether any is left (a counter, a
 * folder a detached job empties, a list of promises not yet settled). Call it in `afterEach` so no work
 * outlives its own test.
 */
export async function settled(pending, options = {}) {
    await until(async () => !(await pending()), { what: 'the background work to end', ...options });
}
/** A place to hand background work to, so `settled()` can wait for exactly it. One per test file; `settled()` in `afterEach`. */
export function trackBackground() {
    const running = new Set();
    const failures = [];
    return {
        run(work) {
            const promise = typeof work === 'function' ? work() : work;
            const kept = promise.then(() => undefined, (error) => void failures.push(error));
            running.add(kept);
            void kept.finally(() => running.delete(kept));
            return promise;
        },
        get pending() {
            return running.size;
        },
        async settled(options = {}) {
            await settled(() => running.size > 0, options);
            const failed = failures.splice(0);
            if (failed.length)
                throw failed[0];
        },
    };
}
/**
 * Wait until the writes the page has made so far (`writes`, a list the test's stand-in host pushes to) hold
 * one that `matches`, then give back a copy of what was written. With `clear`, the list is emptied after, so
 * what is asserted next is only what the test itself causes:
 *
 *     await waitForWrites(wrote, (write) => 'tabs' in write[0], { clear: true })
 *     press()
 *     expect(wrote).toEqual([...])
 */
export async function waitForWrites(writes, matches, options = {}) {
    await until(() => writes.some(matches), { what: 'a write the page makes of its own', ...options });
    const seen = [...writes];
    if (options.clear)
        writes.length = 0;
    return seen;
}
