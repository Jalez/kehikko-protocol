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
export const TOOLS_LIST_CHANGED = 'notifications/tools/list_changed';
/** The most listening streams one process holds open; past it a `GET` is answered 405, as before. */
export const MAX_TOOL_STREAMS = 64;
/** How soon an agent is asked to reconnect after the stream drops (the SSE `retry` field), in ms. */
export const TOOLS_RETRY_MS = 1000;
const HUB = Symbol.for('kehikot-module-protocol.tools-changed');
function hub() {
    const holder = globalThis;
    let one = holder[HUB];
    if (!one) {
        one = { streams: new Set(), nonce: Math.random().toString(36).slice(2, 10), next: 0 };
        holder[HUB] = one;
    }
    return one;
}
/** Tell every open listening stream to look at the tools again; one whose list changed is told so. */
export function toolsChanged() {
    for (const look of [...hub().streams])
        look();
}
/**
 * A short fingerprint of a tool list (FNV-1a over each tool's name, description and input schema,
 * by name), or null for something that is not one.
 */
export function toolsMark(tools) {
    if (!Array.isArray(tools))
        return null;
    const text = JSON.stringify(tools
        .filter((one) => !!one && typeof one === 'object' && typeof one.name === 'string')
        .map((one) => [one.name, one.description ?? null, one.inputSchema ?? null])
        .sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}
/** The mark an event id was sent under: `<mark>.<nonce>.<n>` → `<mark>`; null for any other id. */
export function markOfEventId(id) {
    if (typeof id !== 'string')
        return null;
    const mark = id.split('.', 1)[0] ?? '';
    return /^[0-9a-f]{8}$/.test(mark) ? mark : null;
}
/** The path of the module's MCP door on its own origin, when it has one over HTTP. */
export function mcpPathOf(manifest) {
    const mcp = manifest.mcp;
    if (!mcp || typeof mcp.url !== 'string' || mcp.transport === 'sse')
        return null;
    try {
        return new URL(mcp.url, 'http://127.0.0.1').pathname;
    }
    catch {
        return null;
    }
}
/** Whether a request is an agent opening the door's listening stream. */
export function wantsToolStream(method, path, mcpPath, accept) {
    return mcpPath !== null && method === 'GET' && path === mcpPath && typeof accept === 'string' && accept.includes('text/event-stream');
}
/** The tools the module's own door lists for this query, as a mark; null when it would not say. */
async function markNow(answer, path, query, ticket) {
    try {
        const reply = await answer('POST', path, query, { jsonrpc: '2.0', id: 'kehikot-tools-mark', method: 'tools/list', params: {} }, ticket);
        const result = reply?.body?.result;
        return reply && reply.status < 300 ? toolsMark(result?.tools) : null;
    }
    catch {
        return null;
    }
}
/**
 * One listening stream, before it is opened: its first frames, and how to keep it. `null` when the
 * stream is not to be opened (the door lists no tools, or too many streams are open) — the door then
 * answers 405, which an agent reads as "this server sends nothing on its own".
 */
export async function toolStream(options) {
    const state = hub();
    if (state.streams.size >= MAX_TOOL_STREAMS)
        return null;
    let mark = await markNow(options.answer, options.path, options.query, options.ticket);
    if (mark === null)
        return null;
    const id = (at) => `${at}.${state.nonce}.${state.next++}`;
    const told = markOfEventId(options.lastEventId);
    /* The priming event (an id and no data), so an agent that loses the stream reconnects saying it. */
    let first = `retry: ${TOOLS_RETRY_MS}\nid: ${id(mark)}\ndata:\n\n`;
    if (told !== null && told !== mark)
        first += changedFrame(id(mark));
    return {
        first,
        keep(write) {
            const look = () => {
                void markNow(options.answer, options.path, options.query, options.ticket).then((now) => {
                    if (now === null || now === mark)
                        return;
                    mark = now;
                    write(changedFrame(id(now)));
                });
            };
            state.streams.add(look);
            return () => state.streams.delete(look);
        },
    };
}
const changedFrame = (id) => `id: ${id}\ndata: ${JSON.stringify({ jsonrpc: '2.0', method: TOOLS_LIST_CHANGED })}\n\n`;
/**
 * The door's answer to `initialize`, saying it tells of tool changes (`capabilities.tools.listChanged`).
 * Any other answer, or one without a tools capability, as it was.
 */
export function sayingListChanged(body, reply) {
    if (body?.method !== 'initialize')
        return reply;
    const answer = reply.body;
    const capabilities = answer?.result?.capabilities;
    if (!capabilities || typeof capabilities !== 'object' || !capabilities.tools || typeof capabilities.tools !== 'object')
        return reply;
    return {
        ...reply,
        body: { ...answer, result: { ...answer.result, capabilities: { ...capabilities, tools: { ...capabilities.tools, listChanged: true } } } },
    };
}
