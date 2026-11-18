import { sourcesOf } from './parts.js'

/**
 * `bun run check:addresses <module dir>…` (2.106.0): does a module's page ask its own server in a way
 * that survives the framing? A relative address (`./api/health`) resolves against the path the host
 * frames the page at: at `/app` it reaches the module, at `/app/` or `/app/?…` it becomes
 * `/app/api/health`, which is nothing, and the page shows no data and says nothing. `ask`, `follow`
 * and `subscribe` (`kehikot-module-protocol/client`) resolve a module-relative address against the
 * module's origin root (`rooted`), so they are safe. The raw browser calls are not: `fetch`,
 * `new EventSource` and `XMLHttpRequest#open` with a relative literal. From the files alone, a
 * module's own sources (not its tests) fail on one. Node-only, writes nothing. Docs: docs/events.md.
 */

export interface AddressesCheck {
  /** The module directory. */
  module: string
  /** Why the module fails. Empty is a pass. */
  failures: string[]
}

/** A raw call whose first argument is a string literal that does not start at `/`, a scheme, `?`, `#` or `${`. */
const RAW_RELATIVE = /(?:\bfetch\s*\(|\bnew\s+EventSource\s*\(|\.open\s*\(\s*['"`][A-Z]+['"`]\s*,)\s*(['"`])(?!\/|[a-z][a-z0-9+.-]*:|\?|#|\$\{)([^'"`\n]*)\1/g

/** The checks on what was read. Pure. */
export function checkAddressesSources(module: string, sources: readonly { path: string; text: string }[]): AddressesCheck {
  const failures: string[] = []
  for (const { path, text } of sources) {
    const lines = withoutComments(text).split('\n')
    lines.forEach((line, index) => {
      for (const found of line.matchAll(RAW_RELATIVE)) {
        failures.push(
          `${path}:${index + 1}: ${found[0].trim()} — a relative address resolves against the path the page is framed at, `
            + `so it misses at \`/app/\` and \`/app/?…\`. Use \`ask\`, \`follow\` or \`subscribe\` from kehikot-module-protocol/client, or spell it \`/${(found[2] ?? '').replace(/^\.\//, '')}\`.`,
        )
      }
    })
  }
  return { module, failures }
}

/** One module directory, read and checked. */
export function checkModuleAddresses(dir: string): AddressesCheck {
  return checkAddressesSources(dir, sourcesOf(dir))
}

/** What a person is told. */
export function saidAddresses(check: AddressesCheck): string {
  if (!check.failures.length) return `${check.module}: no raw relative address.`
  return [`${check.module}: FAILS check:addresses`, ...check.failures.map((failure) => `  - ${failure}`)].join('\n')
}

/** Comments out, so a sentence about `fetch('./api')` is not a call. Keeps line numbers. */
function withoutComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
}
