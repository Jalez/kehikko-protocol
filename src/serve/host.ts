import { isAbsolute } from 'node:path'

import { z } from 'zod'

import { LIMITS } from '../limits.js'
import { frameOrigins } from './origins.js'

/**
 * Asking the host one question a module's SERVER has: is this folder a project a person added here?
 * A page tells its server a path, and the server has no other way to know the path is one the host
 * handed out. Loopback only, one path in and one word out, and failing closed: no answer is "no".
 * Design notes: docs/serving.md.
 */

/** The host's route, `GET /host/is-project?path=<absolute folder>`, answered to programs on this machine. */
export const IS_PROJECT_PATH = '/host/is-project'

/** What the host answers: `{ ok: true, project: boolean }`. Anything else is not an answer. */
export const isProjectResult = z.object({ ok: z.literal(true), project: z.boolean() })
export type IsProjectResult = z.infer<typeof isProjectResult>

/** The origins a host may be asked on: `KEHIKOT_ORIGINS` and its fallbacks, kept to `http(s)` loopback. */
function hostOrigins(env: Record<string, string | undefined>): string[] {
  const out: string[] = []
  for (const origin of frameOrigins(env)) {
    try {
      const url = new URL(origin)
      if ((url.protocol === 'http:' || url.protocol === 'https:') && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) out.push(url.origin)
    } catch {
      /* Not a URL: nobody to ask there. */
    }
  }
  return [...new Set(out)]
}

/** The URLs `hostHasProject` asks, in order, for one folder. Pure; exported for tests and for a module that wants to ask its own way. */
export function hostIsProjectUrls(folder: string, env: Record<string, string | undefined> = process.env): string[] {
  return hostOrigins(env).map((origin) => `${origin}${IS_PROJECT_PATH}?path=${encodeURIComponent(folder)}`)
}

export interface HostHasProjectOptions {
  env?: Record<string, string | undefined>
  /** How long each origin gets, in ms. Default `LIMITS.HOST_ASK_MS`. */
  timeoutMs?: number
  /** Injected by the tests. */
  fetch?: typeof fetch
}

/**
 * Whether the host holds `folder` as a project. Asks each origin in `KEHIKOT_ORIGINS` (the same
 * list `frameOrigins` reads; non-loopback and `tauri:` entries are skipped) until one says
 * `project: true`. True only then: a relative path, no answer, a refusal, a
 * slow host or a reply of another shape is `false`. Never throws.
 */
export async function hostHasProject(folder: string, options: HostHasProjectOptions = {}): Promise<boolean> {
  if (typeof folder !== 'string' || !folder.trim() || !isAbsolute(folder.trim())) return false
  const asked = options.fetch ?? fetch
  for (const url of hostIsProjectUrls(folder.trim(), options.env ?? process.env)) {
    const control = new AbortController()
    const timer = setTimeout(() => control.abort(), options.timeoutMs ?? LIMITS.HOST_ASK_MS)
    try {
      const response = await asked(url, { signal: control.signal })
      if (!response.ok) continue
      const read = isProjectResult.safeParse(await response.json())
      if (read.success && read.data.project) return true
    } catch {
      /* This origin is not the host, or is not listening: the next one. */
    } finally {
      clearTimeout(timer)
    }
  }
  return false
}
