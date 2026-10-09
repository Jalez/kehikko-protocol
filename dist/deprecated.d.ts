/**
 * Said once, in development only, when a path that the next breaking release removes is
 * exercised. Silent in production and under a test runner (`NODE_ENV` of `production` or `test`),
 * and never on a path that runs per message. See CHANGELOG.md, "Deprecated in 0.37".
 */
/** Warn about `what` once per process (or page). `instead` is the sentence saying what to use. */
export declare function deprecated(what: string, instead: string): void;
/** For tests: forget what has been said. */
export declare function forgetDeprecations(): void;
