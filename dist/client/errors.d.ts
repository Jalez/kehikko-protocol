import { MESSAGE } from '../constants.js';
export { NO_MESSAGE, PAGE_ERRORS_GLOBAL, PAGE_ERRORS_MAX, STACK_LINES } from '../page.js';
/**
 * When the page fails (2.59.0): every uncaught error and unhandled rejection on a module's page,
 * said to the host as `kehikot.page.error` — before the greeting too, and when nothing on the page
 * ever answers it. Installed over `window` the moment the mailbox is (importing the client from the
 * page's entry installs both). Design notes: docs/client.md, "When the page fails".
 *
 * A page that threw before `connect` was greeted by a host and said nothing: the host could fetch
 * every file of it and say only that the page was "choosing not to answer". This is the page saying
 * why. What it sends is the error's message, where it was caught, and the first lines of its stack;
 * at most `PAGE_ERRORS_MAX` different ones per document, each once.
 *
 * The page document a module's doors serve carries a blocking script of its own (`errorsScript` in
 * `serve/page.ts`) that does the same from before any module script runs — the only thing that can
 * catch a page whose scripts never ran (an import that does not link). When this installs it takes
 * that script's errors over and switches it off (`PAGE_ERRORS_GLOBAL`).
 */
/** What the host is sent: the message on the wire, as built here. */
export interface PageError {
    type: typeof MESSAGE.PAGE_ERROR;
    message: string;
    where: string;
    stack: string;
}
/** The first `STACK_LINES` lines of a stack, cut to `LIMITS.PAGE_ERROR_STACK`. Pure. */
export declare function trimStack(stack: string): string;
/**
 * The words and the stack of anything thrown: `TypeError: x is undefined` for an error (its name
 * and message), the text of a string, and something readable for the rest. Never throws. Pure.
 */
export declare function describeError(error: unknown, fallback?: string): {
    message: string;
    stack: string;
};
/** Just enough of a window to listen on and to find the parent of. */
export interface ErrorTarget {
    addEventListener(type: 'error' | 'unhandledrejection', fn: (ev: never) => void): void;
    readonly parent?: Window | null;
}
export interface PageErrors {
    /** Say one failure. `where` is `PAGE_ERROR_WHERE`'s word; `more` is added under the stack (a component stack). */
    report(error: unknown, where?: string, more?: string): void;
    /**
     * A message reached the page. A greeting the page may take (`mayGreet`) names who to tell, and
     * everything already caught is said to it at once. The mailbox calls this for every message.
     */
    heard(ev: Pick<MessageEvent, 'data' | 'origin' | 'source'>): void;
    /** Every failure caught so far, as sent or to be sent. For a test. */
    caught(): readonly PageError[];
}
/**
 * Build a reporter over one window, listening immediately. Exported for tests; nothing in a page
 * should call it — `pageErrors` is the one for the page, and a second would say every failure twice.
 */
export declare function makePageErrors(target: ErrorTarget | undefined, options?: {
    origins?: () => readonly string[] | null;
    self?: () => {
        window?: unknown;
        origin?: string | null;
    };
}): PageErrors;
/** The page's reporter, over `window`. Outside a browser it listens to nothing and does not crash. */
export declare const pageErrors: PageErrors;
/**
 * Say a failure the page caught itself and cannot recover from, so the host shows it (2.59.0):
 * `reportPageError(error)` in a `catch`. Uncaught errors and unhandled rejections are said without
 * this; `where` defaults to `reported`.
 */
export declare function reportPageError(error: unknown, where?: string, more?: string): void;
