import { type ReactElement } from 'react';
import { type ServerStanding } from './ask.js';
import type { Where } from './react.js';
/**
 * The one screen for every moment a module has nothing of its own to show: the kehikko mark and
 * one sentence, the module's half of the host's `ModuleCover`. See docs/module-plumbing.md.
 */
/** Every not-ready state a module has. */
export type CoverState = 
/** Nothing has greeted the page yet, and the grace has not run out. */
'waiting'
/** Nobody is framing the page: it was opened on its own. */
 | 'unhosted'
/** A host is there and no project is open, or it did not say where the project is. */
 | 'no-project'
/** A project is open and no epic is. */
 | 'no-epic'
/** The module is reading its own material. */
 | 'loading'
/** The module's own server did not answer. Comes with Try again. */
 | 'down'
/** The module's server restarted under this page. The page reloads. */
 | 'stale';
/**
 * The sentences. One each, plain, and the same in every module. `name` is what
 * the module is called ("History"); without one it is "This app".
 */
export declare const COVER_WORDS: Record<CoverState, (name?: string) => string>;
/** The label on the one button, drawn for `down`. */
export declare const TRY_AGAIN = "Try again";
/**
 * Which cover a host's standing calls for, or `null` when the module can draw its own screen.
 * `needs` says what the module cannot work without. Not greeted yet is `waiting`, never `no-project`.
 */
export declare function coverFor(host: {
    where: Where;
    projectPath: string | null;
    epic?: string | null;
}, needs?: {
    project?: boolean;
    epic?: boolean;
}): CoverState | null;
/** How this page's own server last answered (`up`, `down`, `stale`), as React state. Fed by every `ask()`. */
export declare function useServerStanding(): ServerStanding;
export declare const COVER_STYLE_ID = "kehikot-cover-style";
export declare const COVER_CSS = "\n.kehikot-cover{box-sizing:border-box;flex:1 1 auto;width:100%;height:100%;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:16px;text-align:center;font:400 clamp(12px,3.2vw,14px)/1.5 ui-sans-serif,system-ui,sans-serif;color:var(--muted-foreground,oklch(0.5 0 0))}\n.dark .kehikot-cover{color:var(--muted-foreground,oklch(0.62 0 0))}\n.kehikot-cover svg{width:clamp(28px,9vw,40px);height:clamp(28px,9vw,40px);flex:none}\n.kehikot-cover svg *{stroke:currentColor;stroke-width:1.25;fill:none;stroke-linecap:square}\n.kehikot-cover p{margin:0;max-width:40ch;text-wrap:balance}\n.kehikot-cover p[data-detail]{font-size:.86em;opacity:.8;overflow-wrap:anywhere}\n.kehikot-cover button{font:inherit;color:var(--foreground,inherit);background:transparent;border:1px solid var(--border,currentColor);border-radius:6px;padding:3px 10px;cursor:pointer}\n.kehikot-cover button:hover{background:var(--accent,transparent)}\n.kehikot-cover button:focus-visible{outline:2px solid var(--ring,currentColor);outline-offset:2px}\n.kehikot-cover[data-working=true] svg g{animation:kehikot-cover-breathe 3.4s ease-in-out infinite}\n@keyframes kehikot-cover-breathe{0%,100%{opacity:1}50%{opacity:.55}}\n@media (prefers-reduced-motion:reduce){.kehikot-cover[data-working=true] svg g{animation:none}}\n@media (max-height:150px){.kehikot-cover{gap:6px;padding:8px}.kehikot-cover svg{display:none}}\n";
export interface CoverProps {
    state: CoverState;
    /** What the module is called, for the sentences that name it. */
    name?: string;
    /** For `down`: ask again. Without it no button is drawn. */
    onRetry?: () => void;
    /** A second, smaller line: the server's own sentence, a path. */
    detail?: string | null;
    /** The sentence, when a module has a better one for this state. */
    children?: string;
}
/**
 * Draw a not-ready state. Fills a parent that has a height (or is a flex column) and centres in
 * it; otherwise it is as tall as its content. `stale` reloads the page once, a moment later.
 */
export declare function Cover({ state, name, onRetry, detail, children }: CoverProps): ReactElement;
