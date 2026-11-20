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
 * - (2.108.0) has no `uninstall.ts` at its root that reports through `runUninstall`: an agent module
 *   writes outside its folder (session folders, an agent's settings or skills), and only it can take
 *   that away when a person uninstalls it — the host never edits an agent's configuration.
 */
export interface AgentCheck {
    module: string;
    agent: boolean;
    failures: string[];
}
/**
 * 2.108.2. Does this module run conversations? It messages, and it provides an `agent.*` service or
 * lists the message tools on its door. A module that only sends (`messages.tell`) does neither.
 */
export declare function isAgentModule(manifest: {
    declares?: {
        uses?: readonly string[];
    };
    services?: Record<string, unknown> | null;
}, sources: readonly {
    path: string;
    text: string;
}[]): boolean;
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
