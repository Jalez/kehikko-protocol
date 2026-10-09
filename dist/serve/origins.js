/**
 * Who may frame a module: the `frame-ancestors` a module's page should send. Read in order:
 * `KEHIKOT_ORIGINS` (space-separated list), `KEHIKOT_ORIGIN` (one), `ROADMAP_ORIGIN` (one), then
 * the defaults. A single origin is the whole answer, not an addition to the defaults.
 * `ROADMAP_ORIGIN` is deprecated: the next breaking release does not read it.
 * Design notes: docs/serving.md.
 */
import { deprecated } from '../deprecated.js';
/** Every origin a host on this machine frames a module from, unless told otherwise. */
export const DEFAULT_FRAME_ORIGINS = [
    'http://127.0.0.1:4181',
    'http://localhost:4181',
    'http://127.0.0.1:4170',
    'http://localhost:4170',
    'tauri://localhost',
    'http://tauri.localhost',
    'https://tauri.localhost',
];
/** The origins that may frame this module, from the environment a host started it in. Pure. */
export function frameOrigins(env = process.env) {
    const list = (env.KEHIKOT_ORIGINS ?? '').split(/\s+/).filter(Boolean);
    if (list.length)
        return [...new Set(list)];
    if (!env.KEHIKOT_ORIGIN && env.ROADMAP_ORIGIN) {
        deprecated('The environment variable ROADMAP_ORIGIN', 'Set KEHIKOT_ORIGINS (a space-separated list).');
    }
    const one = (env.KEHIKOT_ORIGIN || env.ROADMAP_ORIGIN || '').split(/\s+/).filter(Boolean);
    if (one.length)
        return [...new Set(one)];
    return [...DEFAULT_FRAME_ORIGINS];
}
/** The whole `content-security-policy` value: the module itself, and the hosts that may frame it. */
export function frameAncestors(env = process.env) {
    return `frame-ancestors 'self' ${frameOrigins(env).join(' ')}`;
}
