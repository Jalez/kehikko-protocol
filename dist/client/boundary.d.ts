import { Component, type ErrorInfo, type ReactNode } from 'react';
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
export declare const PAGE_FAILED = "This page failed:";
export interface ReportErrorsProps {
    children?: ReactNode;
    /** What to draw instead of the default: the error, and a press that draws the page again. */
    fallback?: (error: Error, retry: () => void) => ReactNode;
}
interface ReportErrorsState {
    error: Error | null;
}
export declare class ReportErrors extends Component<ReportErrorsProps, ReportErrorsState> {
    state: ReportErrorsState;
    static getDerivedStateFromError(error: unknown): ReportErrorsState;
    componentDidCatch(error: unknown, info: ErrorInfo): void;
    private readonly retry;
    render(): ReactNode;
}
export {};
