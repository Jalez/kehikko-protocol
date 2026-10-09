import { type PageTheme } from '../page.js';
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
