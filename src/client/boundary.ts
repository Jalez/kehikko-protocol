import { Component, createElement, type ErrorInfo, type ReactNode } from 'react'

import { reportPageError } from './errors.js'
import { TRY_AGAIN } from './cover.js'

/**
 * The React half of "when the page fails" (2.59.0): a boundary around a module's page that says a
 * render that threw to the host (`kehikot.page.error`, `render`) and draws the error, as text, in
 * place of a blank page. Wrap the page's root in it: `<ReportErrors><App /></ReportErrors>`.
 *
 * Uncaught errors are said without it (`errors.ts` listens on the window); a render React caught is
 * not uncaught, so without a boundary that says it, React logs it and the page goes blank in silence.
 * Design notes: docs/client.md, "When the page fails".
 */

/** The sentence over the error, in every module the same. */
export const PAGE_FAILED = 'This page failed:'

export interface ReportErrorsProps {
  children?: ReactNode
  /** What to draw instead of the default: the error, and a press that draws the page again. */
  fallback?: (error: Error, retry: () => void) => ReactNode
}

interface ReportErrorsState {
  error: Error | null
}

export class ReportErrors extends Component<ReportErrorsProps, ReportErrorsState> {
  override state: ReportErrorsState = { error: null }

  static getDerivedStateFromError(error: unknown): ReportErrorsState {
    return { error: error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'A render failed.') }
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    reportPageError(error, 'render', info.componentStack ?? undefined)
  }

  private readonly retry = () => this.setState({ error: null })

  override render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children ?? null
    if (this.props.fallback) return this.props.fallback(error, this.retry)
    /* Text only: the error's words are whatever was thrown. */
    return createElement(
      'div',
      { role: 'alert', 'data-testid': 'page-failed', style: { padding: 16, font: '13px/1.5 system-ui, sans-serif' } },
      createElement('p', { style: { margin: '0 0 4px' } }, PAGE_FAILED),
      createElement('pre', { style: { margin: '0 0 12px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', font: '12px/1.4 ui-monospace, monospace', opacity: 0.8 } }, `${error.name}: ${error.message}`),
      createElement('button', { type: 'button', onClick: this.retry }, TRY_AGAIN),
    )
  }
}
