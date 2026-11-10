import { type ProposalSite } from './site.js';
/**
 * The four tools a module mounts on its MCP door so agents can propose changes
 * to its texts and learn what became of them (2.71.0): `propose_change`,
 * `list_proposals`, `read_proposal`, `withdraw_proposal`. The definitions are
 * `proposalTools(options)`, the calls `answerProposalTool(site, options, name,
 * args)`; a module lists the first and routes `tools/call` to the second, and
 * keeps whatever other tools it has. Nothing here accepts a proposal: that is
 * the person's, at the module's page.
 */
export declare const PROPOSAL_TOOL_NAMES: readonly ["propose_change", "list_proposals", "read_proposal", "withdraw_proposal"];
export type ProposalToolName = (typeof PROPOSAL_TOOL_NAMES)[number];
export declare const isProposalTool: (name: unknown) => name is ProposalToolName;
/** An MCP tool definition, as `tools/list` lists one. */
export interface ProposalToolDefinition {
    name: ProposalToolName;
    description: string;
    inputSchema: Record<string, unknown>;
    annotations: {
        title: string;
        readOnlyHint: boolean;
        destructiveHint: boolean;
        idempotentHint: boolean;
        openWorldHint: boolean;
    };
}
export interface ProposalDoorOptions {
    /** What the module's texts are, in the descriptions: `a deck`, `a screenplay`, `the quiz of an epic`. */
    what: string;
    /** The argument that names a text: its name (`deck`, `part`, `file`; default `file`) and what it holds. */
    file?: {
        name?: string;
        description: string;
    };
    /** The module's name, said where a decision is pushed back. */
    module?: string;
    /** What an agent is called when it gives no name. Default `an agent`. */
    anonymous?: string;
    /**
     * The project a call names, as the module resolves it (`resolveDoorProject` in `/serve`, or its own
     * way): the folder to work on, or the sentence for why not. Default: the argument as given, trimmed.
     */
    project?(args: Record<string, unknown>): Promise<{
        ok: true;
        path: string;
    } | {
        ok: false;
        why: string;
    }> | {
        ok: true;
        path: string;
    } | {
        ok: false;
        why: string;
    };
}
/** The tools, as `tools/list` lists them. */
export declare function proposalTools(options: ProposalDoorOptions): ProposalToolDefinition[];
/**
 * Answer one of the four tools, as text for the agent; `null` for a name that is not one of them,
 * so a module asks here first and falls through to its own tools. Synchronous unless the module's
 * `project` resolution is a promise, so a door that answers synchronously can stay that way.
 */
export declare function answerProposalTool(site: ProposalSite, options: ProposalDoorOptions, name: string, args: Record<string, unknown>): string | null | Promise<string | null>;
