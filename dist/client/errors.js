import { MESSAGE } from '../constants.js';
import { LIMITS } from '../limits.js';
import { NO_MESSAGE, PAGE_ERRORS_GLOBAL, PAGE_ERRORS_MAX, STACK_LINES } from '../page.js';
import { mayGreet, pageOrigins } from './greet.js';
export { NO_MESSAGE, PAGE_ERRORS_GLOBAL, PAGE_ERRORS_MAX, STACK_LINES } from '../page.js';
/** The first `STACK_LINES` lines of a stack, cut to `LIMITS.PAGE_ERROR_STACK`. Pure. */
export function trimStack(stack) {
    return stack.split('\n').slice(0, STACK_LINES).join('\n').slice(0, LIMITS.PAGE_ERROR_STACK);
}
/**
 * The words and the stack of anything thrown: `TypeError: x is undefined` for an error (its name
 * and message), the text of a string, and something readable for the rest. Never throws. Pure.
 */
export function describeError(error, fallback = NO_MESSAGE) {
    try {
        if (error instanceof Error || (typeof error === 'object' && error !== null && 'message' in error)) {
            const named = error;
            const name = typeof named.name === 'string' && named.name ? named.name : '';
            const said = typeof named.message === 'string' ? named.message : '';
            const message = name && said ? `${name}: ${said}` : said || name || fallback;
            const stack = typeof named.stack === 'string' ? named.stack : '';
            return { message: message.slice(0, LIMITS.PAGE_ERROR_MESSAGE), stack: trimStack(stack) };
        }
        if (error === undefined || error === null || error === '')
            return { message: fallback.slice(0, LIMITS.PAGE_ERROR_MESSAGE), stack: '' };
        const text = typeof error === 'string' ? error : JSON.stringify(error) ?? String(error);
        return { message: text.slice(0, LIMITS.PAGE_ERROR_MESSAGE) || fallback, stack: '' };
    }
    catch {
        return { message: fallback, stack: '' };
    }
}
/**
 * Build a reporter over one window, listening immediately. Exported for tests; nothing in a page
 * should call it — `pageErrors` is the one for the page, and a second would say every failure twice.
 */
export function makePageErrors(target, options = {}) {
    const caught = [];
    let host = null;
    const origins = options.origins ?? pageOrigins;
    const self = options.self
        ?? (() => (typeof window === 'undefined' ? {} : { window, origin: typeof location === 'undefined' ? null : location.origin }));
    const post = (message) => {
        if (!host)
            return;
        try {
            host.window.postMessage(message, host.origin);
        }
        catch {
            /* A host window that went away. Nothing on this page may fail for saying it failed. */
        }
    };
    const add = (message, where, stack) => {
        if (caught.some((one) => one.message === message && one.where === where))
            return;
        if (caught.length >= PAGE_ERRORS_MAX)
            return;
        const said = {
            type: MESSAGE.PAGE_ERROR,
            message: message.slice(0, LIMITS.PAGE_ERROR_MESSAGE) || NO_MESSAGE,
            where: where.slice(0, LIMITS.PAGE_ERROR_WHERE),
            stack: stack.slice(0, LIMITS.PAGE_ERROR_STACK),
        };
        caught.push(said);
        post(said);
    };
    const reporter = {
        report(error, where = 'reported', more) {
            try {
                const { message, stack } = describeError(error);
                add(message, where, more ? trimStack(`${stack}\n${more.trim()}`.trim()) : stack);
            }
            catch {
                /* Never a second failure out of the first. */
            }
        },
        heard(ev) {
            const data = ev.data;
            if (typeof data !== 'object' || data === null || data.type !== MESSAGE.HELLO)
                return;
            if (!mayGreet(ev, origins(), self()))
                return;
            const from = ev.source ?? target?.parent ?? null;
            if (!from)
                return;
            host = { window: from, origin: ev.origin && ev.origin !== 'null' ? ev.origin : '*' };
            /* Every greeting may be a new conversation, which has heard none of it. */
            for (const one of caught)
                post(one);
        },
        caught: () => caught,
    };
    if (target) {
        /* What the page document's own script caught before any module ran, and then it stops. */
        const early = target[PAGE_ERRORS_GLOBAL];
        if (early && typeof early === 'object') {
            early.off = true;
            if (Array.isArray(early.list)) {
                for (const one of early.list) {
                    if (typeof one?.message === 'string')
                        add(one.message, typeof one.where === 'string' ? one.where : 'error', typeof one.stack === 'string' ? one.stack : '');
                }
            }
        }
        target.addEventListener('error', ((ev) => {
            const at = ev.filename ? ` (${ev.filename}${ev.lineno ? `:${ev.lineno}${ev.colno ? `:${ev.colno}` : ''}` : ''})` : '';
            const { message, stack } = describeError(ev.error, `${ev.message || NO_MESSAGE}${at}`);
            add(message, 'error', stack || at.trim());
        }));
        target.addEventListener('unhandledrejection', ((ev) => {
            const { message, stack } = describeError(ev.reason, 'A promise was rejected with nothing.');
            add(message, 'rejection', stack);
        }));
    }
    return reporter;
}
/** The page's reporter, over `window`. Outside a browser it listens to nothing and does not crash. */
export const pageErrors = makePageErrors(typeof window === 'undefined' ? undefined : window);
/**
 * Say a failure the page caught itself and cannot recover from, so the host shows it (2.59.0):
 * `reportPageError(error)` in a `catch`. Uncaught errors and unhandled rejections are said without
 * this; `where` defaults to `reported`.
 */
export function reportPageError(error, where = 'reported', more) {
    pageErrors.report(error, where, more);
}
