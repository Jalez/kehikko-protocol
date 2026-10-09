/**
 * Said once, in development only, when a path that the next breaking release removes is
 * exercised. Silent in production and under a test runner (`NODE_ENV` of `production` or `test`),
 * and never on a path that runs per message. See CHANGELOG.md, "Deprecated in 0.37".
 */
const said = new Set();
function quiet() {
    try {
        const mode = typeof process === 'undefined' ? undefined : process.env?.NODE_ENV;
        return mode === 'production' || mode === 'test';
    }
    catch {
        return true;
    }
}
/** Warn about `what` once per process (or page). `instead` is the sentence saying what to use. */
export function deprecated(what, instead) {
    if (said.has(what) || quiet())
        return;
    said.add(what);
    try {
        console.warn(`kehikot-module-protocol: ${what} is deprecated and is removed in the next breaking release. ${instead}`);
    }
    catch {
        /* No console. Nothing depends on this having been said. */
    }
}
/** For tests: forget what has been said. */
export function forgetDeprecations() {
    said.clear();
}
