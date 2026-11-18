/**
 * 2.104.0. A module's tests never reach the person's running app.
 *
 * A test run from inside a Kehikot session inherits that session's environment, and the environment
 * names the running app: `KEHIKOT_HOST` is its door (127.0.0.1:4170), `KEHIKOT_ORIGINS` and
 * `KEHIKOT_ORIGIN` are the pages it frames, and a module's `hostAsk` and `fromHost` read them. A
 * test that did not set them itself talked to the person's real app: it vouched, listed their
 * sessions, and sent them messages. So the suite starts without any of them.
 *
 * Every `KEHIKOT_*` (and `KEHIKKO_*`, the desktop shell's plumbing) variable is dropped, not just
 * the ones known today: a variable added next year leaks the same way, and a test that wants one
 * sets it for itself. Node-only.
 */
/** The prefixes of the variables a running app leaves in the environment of everything it starts. */
export declare const APP_ENV_PREFIXES: readonly ["KEHIKOT_", "KEHIKKO_"];
/** Remove every variable a running app leaks from `env`; returns the names removed, sorted. */
export declare function clearAppEnvironment(env?: Record<string, string | undefined>): string[];
