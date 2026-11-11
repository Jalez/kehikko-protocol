import { type PageBackground, type PageTheme } from '../page.js';
/** The theme on `<html>`, as the page document's blocking script left it and as the host then says it. */
/** What is on `<html>` now, or `null` when nothing has decided yet. */
export declare function pageTheme(): PageTheme | null;
/** What the system prefers; `light` where that cannot be asked. */
export declare function systemTheme(): PageTheme;
/**
 * Put a theme on `<html>`: `dark` or `light` as a class, both spelled. `remember` keeps it for the
 * next load's first paint, quietly where there is no storage.
 */
export declare function applyTheme(theme: PageTheme, options?: {
    remember?: boolean;
}): void;
/** What background is on `<html>` now (`BACKGROUND_ATTR`), or `null` when nothing has said one. */
export declare function pageBackground(): PageBackground | null;
/**
 * 2.82.0. Put the container's background on `<html>` as `BACKGROUND_ATTR`, with the style that makes
 * `html`, `body`, `#root` and the element marked `PAGE_MARK` transparent when it is `none`
 * (`BACKGROUND_CSS`, added once). `theme`, when given, is said as `color-scheme` on `<html>`.
 * `remember` keeps it for the next load's first paint, quietly where there is no storage.
 * `connect` calls this on every greeting and context unless told `appearance: false`.
 */
export declare function applyBackground(background: PageBackground, options?: {
    theme?: PageTheme;
    remember?: boolean;
}): void;
