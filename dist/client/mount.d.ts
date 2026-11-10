import './mailbox.js';
import './errors.js';
import { type ReactNode } from 'react';
import { type Root } from 'react-dom/client';
import { type ReportErrorsProps } from './boundary.js';
/**
 * 2.70.0. Mount a module's page the one way every module does: in `StrictMode`, inside `ReportErrors`,
 * so a render that throws is said to the host and drawn as text instead of a blank page.
 * `mountPage('root', <App />)` is the whole of a page's entry. A separate subpath
 * (`kehikot-module-protocol/client/mount`) because it needs `react-dom`.
 * Design notes: docs/client.md, "What every container gets by default (2.70.0)".
 */
export interface MountOptions {
    /** `false` mounts without `StrictMode`. Default `true`. */
    strict?: boolean;
    /** `false` mounts without `ReportErrors`, for a page with a boundary of its own. Default `true`. */
    reportErrors?: boolean;
    /** What `ReportErrors` draws instead of its own. */
    fallback?: ReportErrorsProps['fallback'];
}
/** The words said when there is nothing to mount in. */
export declare const NO_ROOT = "There is no element to mount the page in";
/**
 * Mount `page` in `root` (an element, or the id of one). Returns React's root, or null when there is
 * no such element — which is said to the host as a page failure, not left as a blank page.
 */
export declare function mountPage(root: Element | string | null | undefined, page: ReactNode, options?: MountOptions): Root | null;
