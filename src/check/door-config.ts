import { PLACE_PARAM } from '../door.js'
import { sourcesOf } from './parts.js'

/**
 * `bun run check:door-config <module dir>…` (2.95.0): does an agent module's door config name only
 * the starting host's stable doors? From the files alone, which is enough for the mistake it
 * catches: a source that writes a door config for an agent (it mentions `mcpServers`,
 * `mcp_servers`, `--mcp-config` or an `opencode.json`-style `mcp` block beside a door URL) and also
 * spells a door at a raw loopback port (`http://127.0.0.1:${port}/mcp`). Such an entry dies with
 * the module's next port change, and a session cannot reconnect to it. The door goes at
 * `doorUrl(startingHost(), id, token)` (`kehikot-module-protocol/serve`). Node-only, writes nothing.
 * Design notes: docs/serving.md ("The starting host").
 */

export interface DoorConfigCheck {
  /** The directory checked. */
  dir: string
  /** Whether any source writes an agent's door config. */
  writesConfig: boolean
  /** Why it fails; empty is a pass. */
  failures: string[]
}

/** A source that writes an agent's door config. */
const WRITES_CONFIG = /mcpServers|mcp_servers|--mcp-config|['"`]mcp['"`]\s*:/

/** A door spelt at a raw loopback port: `http://127.0.0.1:${…}/mcp`, `localhost:${port}/…/mcp`, or a literal port. */
const RAW_DOOR = /https?:\/\/(?:127\.0\.0\.1|localhost|\[::1\]):(?:\$\{[^}]+\}|\d{2,5})\/(?:[A-Za-z0-9._-]+\/)*mcp\b/g

/** The check over a module's sources. Pure. */
export function checkDoorConfigSources(dir: string, sources: readonly { path: string; text: string }[]): DoorConfigCheck {
  const writers = sources.filter((source) => WRITES_CONFIG.test(source.text))
  const failures: string[] = []
  /* A module that writes a door config anywhere is judged in every file that builds a session's door: one that writes the config, or carries a place token. */
  const judged = writers.length ? sources.filter((source) => WRITES_CONFIG.test(source.text) || source.text.includes(PLACE_PARAM)) : []
  for (const source of judged) {
    const lines = source.text.split('\n')
    lines.forEach((line, index) => {
      const trimmed = line.trim()
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return
      for (const found of line.matchAll(RAW_DOOR)) {
        /* The starting host's own address, spelt from its port, is not a module's port: it is still not how a door is spelt — `doorUrl` is. */
        failures.push(
          `${source.path}:${index + 1}: ${found[0]} — a door config names only the starting host's stable door, `
            + '`doorUrl(startingHost(), id, token)` from kehikot-module-protocol/serve (`<host>/m/<id>/mcp`), never a raw port.',
        )
      }
    })
  }
  return { dir, writesConfig: writers.length > 0, failures }
}

/** The check over a module directory on disk. */
export function checkDoorConfig(dir: string): DoorConfigCheck {
  return checkDoorConfigSources(dir, sourcesOf(dir))
}

/** What a person reads. */
export function saidDoorConfig(check: DoorConfigCheck): string {
  if (!check.writesConfig) return `${check.dir}: writes no agent door config — nothing to check.`
  if (!check.failures.length) return `${check.dir}: door config names only the starting host's stable door.`
  return [`${check.dir}: door config names something other than the starting host's stable door:`, ...check.failures.map((one) => `  ${one}`)].join('\n')
}
