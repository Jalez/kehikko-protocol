import type { Manifest } from '../index.js';
import type { Answer, Reply } from './doors.js';
/**
 * 2.62.0. A module's MCP door tells a connected agent that its tools changed: MCP's
 * `notifications/tools/list_changed`, on the door's listening stream (Streamable HTTP: a `GET` of the
 * door with `accept: text/event-stream`). The doors serve it for every module, from the tools its own
 * `/mcp` answer lists: nothing in a module changes. Design notes: docs/module-plumbing.md, "When a
 * door's tools change".
 *
 * A module's tools change when it is updated, and an update restarts it, so the stream a session held
 * is gone by then. What carries the news across is the event id: each event's id starts with a mark
 * of the tool list it was sent under (`toolsMark`). An agent that reconnects says the last id it had
 * (`last-event-id`), and a process whose tools have another mark tells it at once. A process whose
 * tools change while it runs calls `toolsChanged()`, and every open stream whose mark moved is told.
 *
 * The door's `initialize` answer is given `capabilities.tools.listChanged: true`, which is what an
 * agent reads to listen. Best effort: an agent that gave up reconnecting before the new process was
 * up keeps its old list until its conversation restarts, which the notes say (`CHANGED_TOOLS_LINE`).
 */
/** The notification, as MCP spells it. */
export declare const TOOLS_LIST_CHANGED = "notifications/tools/list_changed";
/** The most listening streams one process holds open; past it a `GET` is answered 405, as before. */
export declare const MAX_TOOL_STREAMS = 64;
/** How soon an agent is asked to reconnect after the stream drops (the SSE `retry` field), in ms. */
export declare const TOOLS_RETRY_MS = 1000;
/** Tell every open listening stream to look at the tools again; one whose list changed is told so. */
export declare function toolsChanged(): void;
/**
 * A short fingerprint of a tool list (FNV-1a over each tool's name, description and input schema,
 * by name), or null for something that is not one.
 */
export declare function toolsMark(tools: unknown): string | null;
/** The mark an event id was sent under: `<mark>.<nonce>.<n>` → `<mark>`; null for any other id. */
export declare function markOfEventId(id: string | null | undefined): string | null;
/** The path of the module's MCP door on its own origin, when it has one over HTTP. */
export declare function mcpPathOf(manifest: Pick<Manifest, 'mcp'>): string | null;
/** Whether a request is an agent opening the door's listening stream. */
export declare function wantsToolStream(method: string, path: string, mcpPath: string | null, accept: string | null | undefined): boolean;
/**
 * One listening stream, before it is opened: its first frames, and how to keep it. `null` when the
 * stream is not to be opened (the door lists no tools, or too many streams are open) — the door then
 * answers 405, which an agent reads as "this server sends nothing on its own".
 */
export declare function toolStream(options: {
    answer: Answer;
    path: string;
    query: URLSearchParams;
    ticket: string | null;
    lastEventId: string | null;
}): Promise<{
    first: string;
    keep(write: (text: string) => void): () => void;
} | null>;
/**
 * The door's answer to `initialize`, saying it tells of tool changes (`capabilities.tools.listChanged`).
 * Any other answer, or one without a tools capability, as it was.
 */
export declare function sayingListChanged(body: Record<string, unknown> | null, reply: Reply): Reply;
