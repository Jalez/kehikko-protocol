import type { BRAND_MODULE_ICONS } from '../icon.js';
/**
 * 2.58.0. The marks of the agent tools a tile can show as a module's icon (`AgentTile`), as path
 * data on a 24 by 24 box, drawn in the text's colour.
 *
 * Copied from Simple Icons 16.33.0 (https://simpleicons.org, CC0 1.0) — except OpenAI, from Simple
 * Icons 14.0.0 (CC0 1.0), the last release that carried it — the same paths a host draws for
 * `brand:<slug>`. Only the marks of tools an agent module fronts: `claude`, `openai` (Codex),
 * `googlegemini` (Antigravity: Google publishes no Antigravity mark), `opencode` and
 * `mistralai` (Vibe). Each mark is its owner's trademark, drawn only for a module that names it
 * as its icon, to identify the tool that module fronts; it says nothing about who made the module.
 */
export declare const TILE_MARKS: Partial<Record<(typeof BRAND_MODULE_ICONS)[number], {
    title: string;
    path: string;
}>>;
