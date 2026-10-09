import { THEME_KEY } from '../page.js';
/** The theme on `<html>`, as the page document's blocking script left it and as the host then says it. */
/** What is on `<html>` now, or `null` when nothing has decided yet. */
export function pageTheme() {
    if (typeof document === 'undefined')
        return null;
    const list = document.documentElement.classList;
    return list.contains('dark') ? 'dark' : list.contains('light') ? 'light' : null;
}
/** What the system prefers; `light` where that cannot be asked. */
export function systemTheme() {
    try {
        return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    catch {
        return 'light';
    }
}
/**
 * Put a theme on `<html>`: `dark` or `light` as a class, both spelled. `remember` keeps it for the
 * next load's first paint, quietly where there is no storage.
 */
export function applyTheme(theme, options = {}) {
    if (typeof document === 'undefined')
        return;
    const list = document.documentElement.classList;
    list.toggle('dark', theme === 'dark');
    list.toggle('light', theme === 'light');
    if (!options.remember)
        return;
    try {
        localStorage.setItem(THEME_KEY, theme);
    }
    catch {
        /* No storage here. The next load asks the host, as this one did. */
    }
}
