/* For their side effects, first: the mailbox holds an early greeting, the reporter hears every failure. */
import './mailbox.js';
import './errors.js';
import { StrictMode, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { ReportErrors } from './boundary.js';
import { reportPageError } from './errors.js';
/** The words said when there is nothing to mount in. */
export const NO_ROOT = 'There is no element to mount the page in';
/**
 * Mount `page` in `root` (an element, or the id of one). Returns React's root, or null when there is
 * no such element — which is said to the host as a page failure, not left as a blank page.
 */
export function mountPage(root, page, options = {}) {
    const element = typeof root === 'string' ? (typeof document === 'undefined' ? null : document.getElementById(root)) : (root ?? null);
    if (!element) {
        reportPageError(new Error(`${NO_ROOT}${typeof root === 'string' ? ` (#${root})` : ''}.`), 'reported');
        return null;
    }
    let tree = page;
    if (options.reportErrors !== false)
        tree = createElement(ReportErrors, options.fallback ? { fallback: options.fallback } : {}, tree);
    if (options.strict !== false)
        tree = createElement(StrictMode, null, tree);
    const mounted = createRoot(element);
    mounted.render(tree);
    return mounted;
}
