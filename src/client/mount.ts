/* For their side effects, first: the mailbox holds an early greeting, the reporter hears every failure. */
import './mailbox.js'
import './errors.js'

import { StrictMode, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import { ReportErrors, type ReportErrorsProps } from './boundary.js'
import { reportPageError } from './errors.js'

/**
 * 2.70.0. Mount a module's page the one way every module does: in `StrictMode`, inside `ReportErrors`,
 * so a render that throws is said to the host and drawn as text instead of a blank page.
 * `mountPage('root', <App />)` is the whole of a page's entry. A separate subpath
 * (`kehikot-module-protocol/client/mount`) because it needs `react-dom`.
 * Design notes: docs/client.md, "What every container gets by default (2.70.0)".
 */

export interface MountOptions {
  /** `false` mounts without `StrictMode`. Default `true`. */
  strict?: boolean
  /** `false` mounts without `ReportErrors`, for a page with a boundary of its own. Default `true`. */
  reportErrors?: boolean
  /** What `ReportErrors` draws instead of its own. */
  fallback?: ReportErrorsProps['fallback']
}

/** The words said when there is nothing to mount in. */
export const NO_ROOT = 'There is no element to mount the page in'

/**
 * Mount `page` in `root` (an element, or the id of one). Returns React's root, or null when there is
 * no such element — which is said to the host as a page failure, not left as a blank page.
 */
export function mountPage(root: Element | string | null | undefined, page: ReactNode, options: MountOptions = {}): Root | null {
  const element = typeof root === 'string' ? (typeof document === 'undefined' ? null : document.getElementById(root)) : (root ?? null)
  if (!element) {
    reportPageError(new Error(`${NO_ROOT}${typeof root === 'string' ? ` (#${root})` : ''}.`), 'reported')
    return null
  }
  let tree: ReactNode = page
  if (options.reportErrors !== false) tree = createElement(ReportErrors, options.fallback ? { fallback: options.fallback } : {}, tree)
  if (options.strict !== false) tree = createElement(StrictMode, null, tree)
  const mounted = createRoot(element)
  mounted.render(tree)
  return mounted
}
