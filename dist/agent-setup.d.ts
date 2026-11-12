import { type SettingField } from './settings.js';
/**
 * 2.91.0. The settings an `agent.setup` provider declares (`agentSetupSchema` in `services.ts`), and
 * the choice they hold, as a host reads it. Design notes: docs/services.md.
 */
/** The settings keys that hold the choice, the same in every module that provides `agent.setup`. */
export declare const AGENT_SETUP_KEYS: {
    readonly tools: "agentSetup.tools";
    readonly toolsExcept: "agentSetup.toolsExcept";
    readonly skills: "agentSetup.skills";
    readonly skillsExcept: "agentSetup.skillsExcept";
};
/**
 * The four settings a module that provides `agent.setup` declares, worded for its program: every
 * module's tools on or off and the modules left out, and the same for skills. `machine` (one choice
 * for this computer), `personOnly` (it writes the person's own configuration), off by default: nothing
 * is written until the person turns it on.
 */
export declare function agentSetupSettings(program: string): SettingField[];
/** One kind of thing kept set up: on for every module, except the ones named. */
export interface AgentSetupKind {
    auto: boolean;
    except: string[];
}
/** The person's choice, as a host acts on it. */
export interface AgentSetupChoice {
    tools: AgentSetupKind;
    skills: AgentSetupKind;
}
/** The choice in a module's settings values (`settings.get`), read leniently: anything else is off. */
export declare function agentSetupChoice(values: Record<string, unknown> | null | undefined): AgentSetupChoice;
/** The settings values that say a choice, by key: what a host sends to carry an earlier choice over. */
export declare function agentSetupValues(choice: AgentSetupChoice): Record<string, boolean | string[]>;
