import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import { AGENT_DELIVERY, serviceDescriptor } from '../services.js'
import { manifestOf, sourcesOf } from './parts.js'

/**
 * 2.96.0. `kehikot-check-agent <module dir>…`: is an agent module built so that every conversation can
 * message, however it started? Run by the shared module CI on every pull request. A module that does
 * not message (`agents:message` absent from `declares.uses`) passes as `not an agent module`.
 *
 * From the files, it fails a module that:
 * - messages and provides no `agent.delivery` whose descriptor parses;
 * - has no test that runs the shared conformance (`kehikot-module-protocol/testing`,
 *   `expectAgentConformance` or `agentConformance`): the behaviour itself — tools listed to a caller
 *   with no token, an adopted conversation messaging with its key, guesses refused — is checked there,
 *   by `bun test`, against the module's own door;
 * - lists the message tools only behind a token (`token ? … messageToolsFor` / `messageToolsFor(…) : []`).
 */
export interface AgentCheck {
  module: string
  agent: boolean
  failures: string[]
}

const CONFORMANCE = /kehikot-module-protocol\/testing['"][\s\S]*\b(?:expectAgentConformance|agentConformance)\s*\(/

/** Test files under a module directory (test/, tests/, or `*.test.*` anywhere outside node_modules). */
function testsOf(dir: string): { path: string; text: string }[] {
  const out: { path: string; text: string }[] = []
  const walk = (at: string, inTests: boolean) => {
    if (!existsSync(at)) return
    for (const entry of readdirSync(at, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') continue
      const full = join(at, entry.name)
      if (entry.isDirectory()) walk(full, inTests || entry.name === 'test' || entry.name === 'tests')
      else if (/\.(?:[cm]?[jt]sx?)$/.test(entry.name) && (inTests || /\.(?:test|spec)\./.test(entry.name))) out.push({ path: relative(dir, full), text: readFileSync(full, 'utf8') })
    }
  }
  walk(dir, false)
  return out
}

/** The check over a manifest and the module's files. Pure but for what it is handed. */
export function checkAgentFiles(
  manifest: { id?: string; declares?: { uses?: readonly string[] }; services?: Record<string, unknown> | null },
  sources: readonly { path: string; text: string }[],
  tests: readonly { path: string; text: string }[],
): AgentCheck {
  const module = manifest.id ?? 'This module'
  if (!(manifest.declares?.uses ?? []).includes('agents:message')) return { module, agent: false, failures: [] }
  const failures: string[] = []
  if (!serviceDescriptor(AGENT_DELIVERY, manifest.services?.[AGENT_DELIVERY])) {
    failures.push(`${module} messages (agents:message) and provides no agent.delivery whose descriptor parses: services['agent.delivery'] = { name, program, deliver, adopt }.`)
  }
  if (!tests.some((one) => CONFORMANCE.test(one.text))) {
    failures.push(`${module} has no test that runs the shared conformance: add one file that calls expectAgentConformance from kehikot-module-protocol/testing with its door.`)
  }
  const gated = sources.filter((one) => /\?\s*(?:await\s*)?messageToolsFor\s*\(|messageToolsFor\s*\([^)]*\)\s*\)?\s*:\s*\[\s*\]/.test(one.text)).map((one) => one.path)
  if (gated.length) failures.push(`${gated.join(', ')}: the message tools are listed only behind a token. List them to every caller; an unknown conversation is answered in words.`)
  return { module, agent: true, failures }
}

/** One module directory, read and checked. */
export async function checkAgentModule(dir: string): Promise<AgentCheck> {
  const at = resolve(dir)
  let manifest: Awaited<ReturnType<typeof manifestOf>>
  try {
    manifest = await manifestOf(at)
  } catch (error) {
    return { module: at, agent: false, failures: [`${at}: its manifest could not be loaded (${error instanceof Error ? error.message : String(error)}).`] }
  }
  if (!manifest) return { module: at, agent: false, failures: [] }
  return checkAgentFiles(manifest as Parameters<typeof checkAgentFiles>[0], sourcesOf(at), testsOf(at))
}

/** What the command prints for one module. */
export function saidAgent(check: AgentCheck): string {
  const head = check.failures.length ? `FAIL  ${check.module}` : check.agent ? `ok    ${check.module} — agent module, conformance wired` : `ok    ${check.module} — not an agent module`
  return [head, ...check.failures.map((failure) => `      ! ${failure}`)].join('\n')
}
