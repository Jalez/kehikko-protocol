import { type ReactElement } from 'react';
import { type BoxSize, type TileItem } from '../tile.js';
/**
 * 2.58.0. An agent module's tile: what a module that runs agent sessions draws instead of its
 * terminal when its page is small (`isTile`). The same in every agent module, so a person learns it
 * once. The rule and the words are in `../tile.ts`; this draws them. See docs/client.md ("An agent
 * module as a tile (2.58.0)").
 *
 * The whole tile is one button that expands the container (the module asks the host with
 * `view.expand`). Above it, where there is room (`tileRoom`), the quick actions: Answer when a
 * question waits (its choices and a reply field open over the tile, in place), Expand, and Compact
 * and Clear. Every button is reached by Tab; the tile's tooltip and accessible name are the whole
 * state in one sentence.
 */
/**
 * This page's own size, kept as it changes: the frame the host gives it, which IS the module's box.
 * `tile` is `isTile` with its hysteresis, so a page resized around the line does not flip.
 */
export declare function useTileSize(start?: BoxSize | null): BoxSize & {
    tile: boolean;
};
export interface AgentTileProps {
    /** The module's name, "Claude": in the sentence, and under the icon when there is no title. */
    name: string;
    /** The module's manifest `icon` (`brand:claude`): drawn from `TILE_MARKS`, or as a terminal when it is not one of them. */
    icon?: string | null;
    /** The conversation's title, cut to one line under the icon. */
    title?: string | null;
    /** The session's activity item, as the module reports it (`tileItemOf` picks one of several); null: idle. */
    item?: TileItem | null;
    /** How many messages for the session are unread: a dot, and words in the sentence. */
    unread?: number;
    /** The page's size (`useTileSize`), for what fits. */
    size: BoxSize;
    /** Expand the container (`view.expand`). Absent: the tile is not a button, and there is no Expand. */
    onExpand?: () => void;
    /** The word on the Expand action and the tile's own press, when the module does something else than ask the host. */
    expandWord?: string;
    /** Answer the question that waits, as the person's reply to the session. Absent: no Answer. Resolve `false` to keep the panel open. */
    onAnswer?: (text: string) => void | boolean | Promise<void | boolean>;
    /** Compact the conversation. Absent: no Compact. */
    onCompact?: () => void;
    /** Clear the conversation. Absent: no Clear. */
    onClear?: () => void;
}
export declare const TILE_STYLE_ID = "kehikot-tile-style";
export declare const TILE_CSS = "\n.kehikot-tile{position:relative;box-sizing:border-box;width:100%;height:100%;min-height:0;overflow:hidden;font:400 12px/1.3 ui-sans-serif,system-ui,sans-serif;color:var(--foreground,oklch(0.2 0 0));background:var(--background,transparent);--kt-attn:var(--kehikot-tile-attention,oklch(0.72 0.16 65));--kt-done:var(--kehikot-tile-done,oklch(0.62 0.15 150));--kt-work:var(--kehikot-tile-working,var(--primary,oklch(0.55 0.12 250)));--kt-muted:var(--muted-foreground,oklch(0.55 0 0))}\n.dark .kehikot-tile{color:var(--foreground,oklch(0.92 0 0))}\n.kehikot-tile *{box-sizing:border-box}\n.kehikot-tile-face{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:6px;width:100%;height:100%;margin:0;border:0;background:transparent;color:inherit;font:inherit;text-align:center;cursor:default}\n.kehikot-tile-face[data-press=true]{cursor:pointer}\n.kehikot-tile-face[data-press=true]:hover{background:var(--accent,oklch(0.5 0 0 / .06))}\n.kehikot-tile[data-actions=true] .kehikot-tile-face{padding-bottom:34px}\n.kehikot-tile button:focus-visible{outline:2px solid var(--ring,currentColor);outline-offset:-2px}\n.kehikot-tile-icon{position:relative;flex:none}\n.kehikot-tile-icon svg.kt-ring{position:absolute;inset:0;width:100%;height:100%;overflow:visible}\n.kehikot-tile-icon svg.kt-ring circle{fill:none;stroke-width:2.5}\n.kehikot-tile-icon svg.kt-ring circle.kt-track{stroke:var(--border,oklch(0.5 0 0 / .2))}\n.kehikot-tile-icon svg.kt-ring circle.kt-arc{stroke:var(--kt-muted);stroke-linecap:round}\n.kehikot-tile[data-look=working] svg.kt-ring circle.kt-arc{stroke:var(--kt-work);stroke-dasharray:28 72;transform-origin:50% 50%;animation:kehikot-tile-turn 2.4s linear infinite}\n.kehikot-tile[data-needs=true] svg.kt-ring circle.kt-arc{stroke:var(--kt-attn)}\n.kehikot-tile[data-look=done] svg.kt-ring circle.kt-arc{stroke:var(--kt-done)}\n.kehikot-tile[data-look=idle] svg.kt-ring circle.kt-arc{stroke:transparent}\n.kehikot-tile-icon svg.kt-mark{position:absolute;inset:22%;width:56%;height:56%;fill:currentColor}\n.kehikot-tile-icon svg.kt-mark[data-generic=true]{fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}\n.kehikot-tile-badge{position:absolute;right:-4%;top:-4%;min-width:38%;height:38%;padding:0 2px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:max(9px,calc(var(--kt-icon,40px) * .24));line-height:1;color:var(--background,#fff);background:var(--kt-attn)}\n.kehikot-tile[data-look=done] .kehikot-tile-badge{background:var(--kt-done)}\n.kehikot-tile-title{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}\n.kehikot-tile-word{font-size:10px;color:var(--kt-muted)}\n.kehikot-tile[data-needs=true] .kehikot-tile-word{color:inherit;font-weight:600}\n.kehikot-tile-unread{position:absolute;left:6px;top:6px;width:8px;height:8px;border-radius:999px;background:var(--kt-work);pointer-events:none}\n.kehikot-tile-actions{position:absolute;left:0;right:0;bottom:4px;display:flex;justify-content:center;gap:4px;padding:0 4px;pointer-events:none}\n.kehikot-tile-actions button,.kehikot-tile-answer button{pointer-events:auto;font:inherit;font-size:11px;color:inherit;background:var(--background,transparent);border:1px solid var(--border,currentColor);border-radius:6px;padding:2px 7px;cursor:pointer;white-space:nowrap}\n.kehikot-tile-actions button:hover,.kehikot-tile-answer button:hover{background:var(--accent,transparent)}\n.kehikot-tile-actions button[data-action=answer]{border-color:var(--kt-attn);font-weight:600}\n.kehikot-tile-answer{position:absolute;inset:0;z-index:1;display:flex;flex-direction:column;gap:4px;padding:6px;background:var(--popover,var(--background,#fff));color:var(--popover-foreground,inherit)}\n.kehikot-tile-answer p{margin:0;flex:1 1 auto;min-height:0;overflow:auto;font-size:11px;overflow-wrap:anywhere}\n.kehikot-tile-choices{display:flex;flex-wrap:wrap;gap:4px;flex:none}\n.kehikot-tile-choices button{white-space:normal;text-align:left}\n.kehikot-tile-answer form{display:flex;gap:4px;flex:none}\n.kehikot-tile-answer input{flex:1 1 auto;min-width:0;font:inherit;font-size:11px;color:inherit;background:transparent;border:1px solid var(--border,currentColor);border-radius:6px;padding:2px 6px}\n@keyframes kehikot-tile-turn{to{transform:rotate(360deg)}}\n@media (prefers-reduced-motion:reduce){.kehikot-tile[data-look=working] svg.kt-ring circle.kt-arc{animation:none}}\n";
/** Draw an agent module's tile. Fills its parent; give it one with a height (the page, at tile size). */
export declare function AgentTile({ name, icon, title, item, unread, size, onExpand, expandWord, onAnswer, onCompact, onClear }: AgentTileProps): ReactElement;
