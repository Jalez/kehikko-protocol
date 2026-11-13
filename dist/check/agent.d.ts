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
    module: string;
    agent: boolean;
    failures: string[];
}
/** The check over a manifest and the module's files. Pure but for what it is handed. */
export declare function checkAgentFiles(manifest: {
    id?: string;
    declares?: {
        uses?: readonly string[];
    };
    services?: Record<string, unknown> | null;
}, sources: readonly {
    path: string;
    text: string;
}[], tests: readonly {
    path: string;
    text: string;
}[]): AgentCheck;
/** One module directory, read and checked. */
export declare function checkAgentModule(dir: string): Promise<AgentCheck>;
/** What the command prints for one module. */
export declare function saidAgent(check: AgentCheck): string;
