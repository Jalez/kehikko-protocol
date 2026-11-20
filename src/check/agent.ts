import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import { AGENT_DELIVERY, AGENT_SETUP, AGENT_TASKS, serviceDescriptor } from '../services.js'
import { UNINSTALL_SCRIPT } from '../uninstall.js'
import { manifestOf, sourcesOf } from './parts.js'

/**
 * 2.96.0. `kehikot-check-agent <module dir>…`: is an agent module built so that every conversation can
 * message, however it started? Run by the shared module CI on every pull request.
 *
 * An agent module runs conversations: it messages (`agents:message`) and either provides an `agent.*`
 * service (`agent.delivery`, `agent.tasks`, `agent.setup`), lists the message tools on its door
 * (`messageToolsFor`) or runs the shared conformance in a test. Anything else passes as `not an agent module`, including (2.108.2) a module that
 * only tells the sessions at a place something (`messages.tell`, as Worktrees does when a worktree's
 * pull request merges): it asks for `agents:message` and runs no conversation, so it has nothing to
 * deliver to, no door for an agent to message through and nothing of an agent's to uninstall.
 *
 * From the files, it fails a module that:
 * - messages and provides no `agent.delivery` whose descriptor parses;
 * - has no test that runs the shared conformance (`kehikot-module-protocol/testing`,
 *   `expectAgentConformance` or `agentConformance`): the behaviour itself — tools listed to a caller
 *   with no token, an adopted conversation messaging with its key, guesses refused — is checked there,
 *   by `bun test`, against the module's own door;
 * - lists the message tools only behind a token (`token ? … messageToolsFor` / `messageToolsFor(…) : []`);
 * - (2.99.0) provides `agent.tasks` and its conformance test gives no `tasks` (`{ start, program }`): the
 *   check that `start` answers within a second while its program takes 20 s to boot, and that what became
 *   of a task reaches the host, then never runs — and a fake provider is the only proof;
 * - (2.110.0) provides `agent.delivery` and does not wake the conversations a restart cut off
 *   (`keepsCutOffMark`, `cutOffByRestart`, `resumeLine` from `restart.ts`);
 * - (2.108.0) has no `uninstall.ts` at its root that reports through `runUninstall`: an agent module
 *   writes outside its folder (session folders, an agent's settings or skills), and only it can take
 *   that away when a person uninstalls it — the host never edits an agent's configuration.
 */
export interface AgentCheck {
  module: string
  agent: boolean
  failures: string[]
}

const CONFORMANCE = /kehikot-module-protocol\/testing['"][\s\S]*\b(?:expectAgentConformance|agentConformance)\s*\(/
/** 2.99.0. The conformance given `tasks` (`tasks:` or the shorthand `tasks,` / `tasks }`). */
const WITH_TASKS = /\b(?:expectAgentConformance|agentConformance)\s*\(\s*\{[\s\S]*?\btasks\s*[:,}]/

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

const AGENT_SERVICES = [AGENT_DELIVERY, AGENT_TASKS, AGENT_SETUP] as const
const LISTS_MESSAGE_TOOLS = /\bmessageToolsFor\s*\(/

/**
 * 2.108.2. Does this module run conversations? It messages, and it provides an `agent.*` service or
 * lists the message tools on its door. A module that only sends (`messages.tell`) does neither.
 */
export function isAgentModule(
  manifest: { declares?: { uses?: readonly string[] }; services?: Record<string, unknown> | null },
  sources: readonly { path: string; text: string }[],
): boolean {
  if (!(manifest.declares?.uses ?? []).includes('agents:message')) return false
  if (AGENT_SERVICES.some((name) => manifest.services?.[name] != null)) return true
  return sources.some((one) => LISTS_MESSAGE_TOOLS.test(one.text))
}

/** The check over a manifest and the module's files. Pure but for what it is handed. */
export function checkAgentFiles(
  manifest: { id?: string; declares?: { uses?: readonly string[] }; services?: Record<string, unknown> | null },
  sources: readonly { path: string; text: string }[],
  tests: readonly { path: string; text: string }[],
): AgentCheck {
  const module = manifest.id ?? 'This module'
  if (!isAgentModule(manifest, sources) && !tests.some((one) => CONFORMANCE.test(one.text))) return { module, agent: false, failures: [] }
  const failures: string[] = []
  if (!serviceDescriptor(AGENT_DELIVERY, manifest.services?.[AGENT_DELIVERY])) {
    failures.push(`${module} messages (agents:message) and provides no agent.delivery whose descriptor parses: services['agent.delivery'] = { name, program, deliver, adopt }.`)
  }
  if (!tests.some((one) => CONFORMANCE.test(one.text))) {
    failures.push(`${module} has no test that runs the shared conformance: add one file that calls expectAgentConformance from kehikot-module-protocol/testing with its door.`)
  }
  if (serviceDescriptor(AGENT_TASKS, manifest.services?.[AGENT_TASKS]) && !tests.some((one) => CONFORMANCE.test(one.text) && WITH_TASKS.test(one.text))) {
    failures.push(`${module} provides agent.tasks and its conformance test gives no tasks ({ start, program }): pass them, so that start is held to answering within a second against a program that is slow to boot.`)
  }
  const cleanUp = sources.find((one) => one.path === UNINSTALL_SCRIPT)
  if (!cleanUp || !/\brunUninstall\s*\(/.test(cleanUp.text)) {
    failures.push(`${module} has no ${UNINSTALL_SCRIPT} at its root that calls runUninstall (kehikot-module-protocol/serve): add one that removes what it writes outside its folder (session folders, agent settings or skills), so Uninstall takes it all away.`)
  }
  /* 2.110.0: a conversation a restart cut off is woken to carry on (`restart.ts`). */
  const all = sources.map((one) => one.text).join('\n')
  const resumes = /\bresumeLine\s*\(/.test(all) && /\bcutOffByRestart\s*\(/.test(all) && /\bkeepsCutOffMark\s*\(/.test(all)
  if (serviceDescriptor(AGENT_DELIVERY, manifest.services?.[AGENT_DELIVERY]) && !resumes) {
    failures.push(`${module} does not wake the conversations a restart cut off: keep a mark with keepsCutOffMark, find them at start with cutOffByRestart, and wake each once with resumeLine (kehikot-module-protocol).`)
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
