/**
 * Who may frame a module: the `frame-ancestors` a module's page should send. Read in order:
 * `KEHIKOT_ORIGINS` (space-separated list), `KEHIKOT_ORIGIN` (one), then the defaults. A single
 * origin is the whole answer, not an addition to the defaults; `also` is always an addition.
 * Design notes: docs/serving.md.
 */

/** Every origin a host on this machine frames a module from, unless told otherwise. */
export const DEFAULT_FRAME_ORIGINS = [
  'http://127.0.0.1:4181',
  'http://localhost:4181',
  'http://127.0.0.1:4170',
  'http://localhost:4170',
  'tauri://localhost',
  'http://tauri.localhost',
  'https://tauri.localhost',
] as const

/**
 * The origins that may frame this module, from the environment a host started it in, and `also`:
 * origins the module itself names (a development harness on a port of its own). Pure.
 */
export function frameOrigins(env: Record<string, string | undefined> = process.env, also: readonly string[] = []): string[] {
  const list = (env.KEHIKOT_ORIGINS ?? '').split(/\s+/).filter(Boolean)
  const one = (env.KEHIKOT_ORIGIN ?? '').split(/\s+/).filter(Boolean)
  const said = list.length ? list : one.length ? one : DEFAULT_FRAME_ORIGINS
  return [...new Set([...said, ...also])]
}

/** The whole `content-security-policy` value: the module itself, and the hosts that may frame it. */
export function frameAncestors(env: Record<string, string | undefined> = process.env, also: readonly string[] = []): string {
  return `frame-ancestors 'self' ${frameOrigins(env, also).join(' ')}`
}
