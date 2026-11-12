import { LIMITS } from './limits.js'
import { settingsDeclarationSchema, type SettingField } from './settings.js'

/**
 * 2.91.0. The settings an `agent.setup` provider declares (`agentSetupSchema` in `services.ts`), and
 * the choice they hold, as a host reads it. Design notes: docs/services.md.
 */

/** The settings keys that hold the choice, the same in every module that provides `agent.setup`. */
export const AGENT_SETUP_KEYS = {
  tools: 'agentSetup.tools',
  toolsExcept: 'agentSetup.toolsExcept',
  skills: 'agentSetup.skills',
  skillsExcept: 'agentSetup.skillsExcept',
} as const

/**
 * The four settings a module that provides `agent.setup` declares, worded for its program: every
 * module's tools on or off and the modules left out, and the same for skills. `machine` (one choice
 * for this computer), `personOnly` (it writes the person's own configuration), off by default: nothing
 * is written until the person turns it on.
 */
export function agentSetupSettings(program: string): SettingField[] {
  return settingsDeclarationSchema.parse([
    {
      key: AGENT_SETUP_KEYS.tools,
      label: `Use every module’s tools in ${program} outside Kehikot too`.slice(0, LIMITS.SETTING_LABEL),
      description:
        `Kehikot connects each module’s MCP tools in ${program}’s user-wide server list, so a conversation started in a terminal or an editor has them too, and keeps them connected as modules come, move and go. Only entries Kehikot added are ever changed or removed.`.slice(0, LIMITS.SETTING_DESCRIPTION),
      type: 'boolean',
      default: false,
      scope: 'machine',
      personOnly: true,
    },
    {
      key: AGENT_SETUP_KEYS.toolsExcept,
      label: 'Modules whose tools are left to you',
      description: 'One module id a line (kehikot.notes). Kehikot leaves these out of the tools it keeps connected.',
      type: 'list',
      default: [],
      scope: 'machine',
      personOnly: true,
    },
    {
      key: AGENT_SETUP_KEYS.skills,
      label: `Use every module’s skills in ${program} outside Kehikot too`.slice(0, LIMITS.SETTING_LABEL),
      description:
        `Kehikot installs each module’s skills in ${program}’s personal skills folder and keeps them up to date. A skill you changed, or a name another skill already has, is left alone.`.slice(0, LIMITS.SETTING_DESCRIPTION),
      type: 'boolean',
      default: false,
      scope: 'machine',
      personOnly: true,
    },
    {
      key: AGENT_SETUP_KEYS.skillsExcept,
      label: 'Modules whose skills are left to you',
      description: 'One module id a line. Kehikot leaves these out of the skills it keeps installed.',
      type: 'list',
      default: [],
      scope: 'machine',
      personOnly: true,
    },
  ])
}

/** One kind of thing kept set up: on for every module, except the ones named. */
export interface AgentSetupKind {
  auto: boolean
  except: string[]
}

/** The person's choice, as a host acts on it. */
export interface AgentSetupChoice {
  tools: AgentSetupKind
  skills: AgentSetupKind
}

const exceptOf = (value: unknown): string[] =>
  Array.isArray(value)
    ? [...new Set(value.filter((one): one is string => typeof one === 'string').map((one) => one.trim()).filter((one) => one.length > 0 && one.length <= 200))].sort()
    : []

/** The choice in a module's settings values (`settings.get`), read leniently: anything else is off. */
export function agentSetupChoice(values: Record<string, unknown> | null | undefined): AgentSetupChoice {
  const v = values ?? {}
  return {
    tools: { auto: v[AGENT_SETUP_KEYS.tools] === true, except: exceptOf(v[AGENT_SETUP_KEYS.toolsExcept]) },
    skills: { auto: v[AGENT_SETUP_KEYS.skills] === true, except: exceptOf(v[AGENT_SETUP_KEYS.skillsExcept]) },
  }
}

/** The settings values that say a choice, by key: what a host sends to carry an earlier choice over. */
export function agentSetupValues(choice: AgentSetupChoice): Record<string, boolean | string[]> {
  return {
    [AGENT_SETUP_KEYS.tools]: choice.tools.auto,
    [AGENT_SETUP_KEYS.toolsExcept]: exceptOf(choice.tools.except),
    [AGENT_SETUP_KEYS.skills]: choice.skills.auto,
    [AGENT_SETUP_KEYS.skillsExcept]: exceptOf(choice.skills.except),
  }
}

/**
 * Where a host answers the choice it held itself before 2.91.0, as settings values
 * (`agentSetupValues`): `GET` → `{ ok: true, values }`, to programs on this machine. A module that
 * provides `agent.setup` asks it once, before it has a choice of its own, and keeps what it is told as
 * its own — so nothing the person set up changes when the choice moves to the module. A host that
 * never held one answers 404; the module then starts from its defaults (off).
 */
export const AGENT_SETUP_CARRIED_PATH = '/host/agent-setup/carried'
