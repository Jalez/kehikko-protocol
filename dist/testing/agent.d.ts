/**
 * 2.96.0. The conformance check every agent module runs in its own test suite, with one file:
 *
 *     import { expectAgentConformance } from 'kehikot-module-protocol/testing'
 *     test('meets the agent-module conformance', async () => {
 *       await expectAgentConformance({ manifest: MANIFEST, door: answer, project, adopt, launched })
 *     })
 *
 * It stands up a host of its own on a loopback port (`fakeHost`) and points `KEHIKOT_ORIGINS` at it
 * for the run, then holds the module to what every agent module owes, whatever program it runs:
 *
 * 1. A module that messages (`agents:message` in `declares.uses`) provides `agent.delivery`, and its
 *    descriptor parses; the `deliver` route answers a knock with `agentDeliverResult`.
 * 2. Its door lists `send_message` and `read_messages` to a caller with NO place token, and every tool
 *    its manifest names: never a tool listed only for a launched conversation.
 * 3. A message tool called with no key answers in words why and what to do (`NOT_PLACED_HEAD`).
 * 4. A conversation it did not launch, placed the way a person places one (`adopt`), is given its key
 *    in words (`placeTokenLine`), the key is issued to the host for this module, and messaging works
 *    with it as `placeToken`.
 * 5. A made-up key, and the conversation's own id given as a key, are refused.
 * 6. With `launched`: a conversation it launched messages with the token on its door's URL, as before.
 * 7. (2.99.0) Its `tell_finished` takes `placeToken`, and an adopted conversation can tell with its key.
 * 8. (2.99.0) A module providing `agent.tasks` is given `tasks` (a check:agent failure otherwise):
 *    - `start` refuses a caller the host did not vouch for;
 *    - with a program that takes 20 s to boot, `start` ANSWERS within `AGENT_TASK_ANSWER_MS`, accepting
 *      (`started`, a session, `pending: true`);
 *    - with a program that fails, the failure reaches the host as `tasks.report` `failed`, with why;
 *    - with a program that boots, `tasks.report` `started` names the conversation.
 * 9. (2.99.0) Every question its server asked the host is under a capability its manifest declares
 *    (`declares.uses`): a module calling a method it did not declare is not answered by a real host.
 *
 * The stand-in host is the only host the module can reach for the run: `KEHIKOT_HOST`,
 * `KEHIKOT_ORIGINS` and `KEHIKOT_ORIGIN` all name it, and are put back after. Node-only. It writes
 * nothing but what the module's own `adopt` and `start` write.
 */
/** One call on the module's doors, as the modules' `answer(method, path, query, body, ticket)` takes it. */
export type AgentDoor = (method: string, path: string, query: URLSearchParams, body: Record<string, unknown> | null) => Promise<{
    status: number;
    body: unknown;
    raw?: {
        bytes: string | Uint8Array;
    };
} | null>;
/** What the stand-in host saw and holds. */
export interface FakeHost {
    origin: string;
    /** Every token issued to it (`POST /host/place`), with the module and project it was issued in. */
    issued: Map<string, {
        module: string;
        project: string;
    }>;
    /** Every server question it was asked, in order. */
    asked: {
        module: string;
        method: string;
        params: Record<string, unknown>;
    }[];
    /** 2.99.0. A pass this host vouches for once (`HOST_PASS_PATH`), as a real host mints one for a service call. */
    mintPass(): string;
    close(): Promise<void>;
}
/** 2.99.0. How the stand-in for the module's program behaves on the next `start`. */
export interface StandInProgram {
    /** How long it takes from being run to having started the conversation, in ms. */
    bootMs: number;
    /** It fails after `bootMs` instead (says something and exits non-zero, as a program that cannot start does). */
    fails?: boolean;
}
/** 2.99.0. What the conformance needs of a module that provides `agent.tasks`. */
export interface AgentTasksConformance {
    /**
     * Call the module's `agent.tasks` start route as a request from the host reaches it: `body` as JSON
     * and these headers. The module's own route (its `Before`, its door) answers.
     */
    start(body: unknown, headers: Record<string, string>): Promise<{
        status: number;
        body: unknown;
    }>;
    /**
     * Put a stand-in for the module's program (its CLI) in place for the next start, behaving as said; the
     * returned function puts things back and ends whatever the stand-in left running.
     */
    program(behaviour: StandInProgram): Promise<() => Promise<void> | void>;
}
export interface AgentConformanceOptions {
    /** The module's manifest, as it exports it. */
    manifest: {
        id: string;
        declares?: {
            uses?: readonly string[];
        };
        services?: Record<string, unknown> | null;
        mcp?: unknown;
    };
    /** The module's doors (its `answer`), called in-process. */
    door: AgentDoor;
    /** A project folder the module's adopt flow accepts in this test. */
    project: string;
    /**
     * Place a conversation this module did NOT launch, the way a person does (its adopt command), with
     * the stand-in host running. Gives back what the conversation is told, word for word, and its id.
     */
    adopt(host: FakeHost): Promise<{
        said: string;
        conversation: string;
    }>;
    /** A conversation this module launched: the token on its doors' URLs, issued to `host` already. */
    launched?(host: FakeHost): Promise<{
        token: string;
    }>;
    /** 2.99.0. Required for a module that provides `agent.tasks`: how to start one, and its program's stand-in. */
    tasks?: AgentTasksConformance;
    /** 2.99.0. How long to wait for a `tasks.report` after a quick program, in ms (default 15 000). */
    reportWithinMs?: number;
}
export interface AgentConformance {
    failures: string[];
    passed: string[];
}
/**
 * A host of the test's own on 127.0.0.1: takes token issues (`POST /host/place`) and answers
 * `messages.send` / `messages.read` the way a host does — only for a token THIS module issued, and only
 * while the module's record (`RECORDED_PLACE_PATH`, asked through `door`) still places it.
 */
export declare function fakeHost(door: AgentDoor): Promise<FakeHost>;
/** Run the conformance check; what failed and what passed, in words. */
export declare function agentConformance(options: AgentConformanceOptions): Promise<AgentConformance>;
/** `agentConformance`, throwing one error that lists every failure. For a test. */
export declare function expectAgentConformance(options: AgentConformanceOptions): Promise<AgentConformance>;
