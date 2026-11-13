import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { NOT_PLACED_HEAD, MESSAGE_TOOL_NAMES, PLACE_TOKEN_ARG, placeTokenIn } from '../agent-messages.js';
import { RECORDED_PLACE_PATH, placeIssueSchema } from '../door.js';
import { METHODS } from '../methods.js';
import { SERVER_ASK_PATH } from '../server-ask.js';
import { AGENT_DELIVERY, AGENT_TASKS, AGENT_TASK_ANSWER_MS, HOST_CALLER, HOST_PASS_PATH, SERVICE_CALLER_HEADER, SERVICE_PASS_HEADER, agentDeliverResult, agentTaskStartResult, serviceDescriptor, tasksReportParams, } from '../services.js';
import { TELL_FINISHED_TOOL } from '../turns.js';
import { freshPlaceToken } from '../serve/adopt.js';
import { HOST_ENV } from '../serve/host-door.js';
import { forgetMessageHosts } from '../serve/messages.js';
async function bodyOf(request) {
    const chunks = [];
    for await (const chunk of request)
        chunks.push(chunk);
    try {
        const read = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        return read && typeof read === 'object' && !Array.isArray(read) ? read : null;
    }
    catch {
        return null;
    }
}
/**
 * A host of the test's own on 127.0.0.1: takes token issues (`POST /host/place`) and answers
 * `messages.send` / `messages.read` the way a host does — only for a token THIS module issued, and only
 * while the module's record (`RECORDED_PLACE_PATH`, asked through `door`) still places it.
 */
export async function fakeHost(door) {
    const issued = new Map();
    const asked = [];
    const passes = new Set();
    let sent = 0;
    const send = (response, status, body) => {
        response.writeHead(status, { 'content-type': 'application/json', ...OPEN });
        response.end(JSON.stringify(body));
    };
    const refuse = (error) => ({ ok: false, reason: 'failed', error });
    const server = createServer(async (request, response) => {
        /* A test run with a DOM preloaded fetches like a browser: preflights are let through. */
        if (request.method === 'OPTIONS') {
            response.writeHead(204, OPEN);
            return response.end();
        }
        const url = new URL(request.url ?? '/', 'http://127.0.0.1');
        const body = await bodyOf(request);
        if (url.pathname === '/host/place' && request.method === 'POST') {
            const read = placeIssueSchema.safeParse(body);
            if (!read.success)
                return send(response, 400, { ok: false, error: 'not an issue' });
            issued.set(read.data.token, { module: read.data.module, project: read.data.project });
            return send(response, 200, { ok: true, token: read.data.token, doors: [] });
        }
        if (url.pathname === HOST_PASS_PATH && request.method === 'GET') {
            const pass = url.searchParams.get('pass') ?? '';
            const minted = passes.delete(pass);
            return send(response, 200, { ok: true, minted });
        }
        if (url.pathname === SERVER_ASK_PATH && request.method === 'POST' && body) {
            const module = String(body.module ?? '');
            const method = String(body.method ?? '');
            const params = (body.params && typeof body.params === 'object' ? body.params : {});
            asked.push({ module, method, params });
            if (method === 'tasks.report') {
                const read = tasksReportParams.safeParse(params);
                return send(response, 200, read.success ? { ok: true, data: { outcome: 'told', why: '' } } : refuse('That is not a task report: { session, outcome, conversation?, why? }.'));
            }
            if (method !== 'messages.send' && method !== 'messages.read')
                return send(response, 200, refuse(`${method} is not answered by this test host.`));
            const token = typeof params.token === 'string' ? params.token : '';
            const issue = issued.get(token);
            if (!issue)
                return send(response, 200, refuse('This host holds no session behind that token, so it keeps no messages for it.'));
            if (issue.module !== module)
                return send(response, 200, refuse('That token was issued by another module.'));
            const said = await door('GET', RECORDED_PLACE_PATH, new URLSearchParams({ 'kehikot-place': token, project: issue.project }), null).catch(() => null);
            const place = said?.body?.place;
            if (!place)
                return send(response, 200, refuse('The module that issued that token has no record of its session just now. Nothing was done.'));
            if (method === 'messages.send')
                return send(response, 200, { ok: true, data: { outcome: 'sent', id: ++sent, why: '' } });
            return send(response, 200, {
                ok: true,
                data: { messages: [], unread: 0, you: { module, session: place.conversation ?? null, place: { epic: place.epic ?? null, parts: place.parts ?? [], kehikko: place.kehikko ?? null } } },
            });
        }
        send(response, 404, { ok: false, error: 'not here' });
    });
    await new Promise((done) => server.listen(0, '127.0.0.1', done));
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    return {
        origin: `http://127.0.0.1:${port}`,
        issued,
        asked,
        mintPass: () => {
            const pass = randomBytes(24).toString('base64url');
            passes.add(pass);
            return pass;
        },
        close: () => new Promise((done) => server.close(() => done())),
    };
}
const OPEN = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS' };
async function rpc(door, token, method, params = {}) {
    const query = new URLSearchParams(token ? { 'kehikot-place': token } : {});
    const said = await door('POST', '/mcp', query, { jsonrpc: '2.0', id: 1, method, params });
    return said?.body?.result;
}
async function listed(door, token) {
    const result = (await rpc(door, token, 'tools/list'));
    return Array.isArray(result?.tools) ? result.tools : [];
}
async function called(door, token, name, args) {
    const result = (await rpc(door, token, 'tools/call', { name, arguments: args }));
    return { text: result?.content?.map((one) => one.text ?? '').join('\n') ?? '', isError: result?.isError === true };
}
/** The tool names a manifest's `mcp.subjects` names. */
function declaredTools(mcp) {
    const subjects = mcp?.subjects;
    if (!Array.isArray(subjects))
        return [];
    return subjects.flatMap((one) => ['show', 'release', 'done'].map((role) => one[role]).filter((name) => typeof name === 'string'));
}
/** Run the conformance check; what failed and what passed, in words. */
export async function agentConformance(options) {
    const failures = [];
    const passed = [];
    const check = (ok, what, why) => (ok ? passed : failures).push(ok ? what : `${what}: ${why}`);
    const { manifest, door } = options;
    const messages = (manifest.declares?.uses ?? []).includes('agents:message');
    const host = await fakeHost(door);
    const had = { origins: process.env.KEHIKOT_ORIGINS, origin: process.env.KEHIKOT_ORIGIN, host: process.env[HOST_ENV] };
    process.env.KEHIKOT_ORIGINS = host.origin;
    process.env.KEHIKOT_ORIGIN = host.origin;
    /* 2.99.0: the starting host too, so a module asks this one and no other (`askedHosts`). */
    process.env[HOST_ENV] = host.origin;
    forgetMessageHosts();
    try {
        /* 1. The delivery service. */
        const delivery = messages ? serviceDescriptor(AGENT_DELIVERY, manifest.services?.[AGENT_DELIVERY]) : null;
        if (messages) {
            check(Boolean(delivery), 'provides agent.delivery', `${manifest.id} messages (agents:message) and its manifest has no agent.delivery service whose descriptor parses (services['agent.delivery']: { name, program, deliver, adopt }).`);
            if (delivery) {
                const knocked = await door('POST', delivery.deliver, new URLSearchParams(), { project: options.project }).catch(() => null);
                check(knocked?.status === 200 && agentDeliverResult.safeParse(knocked.body).success, 'answers a delivery knock', `POST ${delivery.deliver} { project } answered ${knocked ? `HTTP ${knocked.status}` : 'nothing'}, not agentDeliverResult (deliveryReply in kehikot-module-protocol/serve answers it).`);
            }
        }
        /* 2. Nothing listed only for a launched conversation. */
        const bare = await listed(door, null);
        const names = new Set(bare.map((tool) => tool.name));
        const owed = [...(messages ? MESSAGE_TOOL_NAMES : []), ...declaredTools(manifest.mcp)];
        const missing = owed.filter((name) => !names.has(name));
        check(missing.length === 0, 'lists every tool to a caller with no place token', `tools/list without a token lacks ${missing.join(', ')}. List every tool; one a caller cannot use yet answers why.`);
        if (!messages) {
            await tasksChecks(options, host, check);
            declaredChecks(manifest, host, check);
            return { failures, passed };
        }
        const takesKey = bare.filter((tool) => MESSAGE_TOOL_NAMES.includes(tool.name)).every((tool) => tool.inputSchema?.properties?.[PLACE_TOKEN_ARG]);
        check(takesKey, 'message tools take placeToken', `send_message and read_messages must take ${PLACE_TOKEN_ARG} (messageTools / messageToolsFor in the protocol list it).`);
        /* 3. No identity: said in words. */
        const anonymous = await called(door, null, 'send_message', { body: 'conformance: no key' });
        check(anonymous.isError && anonymous.text.includes(NOT_PLACED_HEAD), 'refuses an unknown conversation in words', `send_message with no key answered ${JSON.stringify(anonymous.text.slice(0, 160))}; it should say “${NOT_PLACED_HEAD}…” and what to do (answerMessageTool does).`);
        /* 4. A conversation placed afterwards. */
        const adopted = await options.adopt(host);
        const key = placeTokenIn(adopted.said);
        check(Boolean(key), 'gives an adopted conversation its key in words', `the adopt answer has no “Kehikot key for this conversation: …” line (placeTokenLine): ${JSON.stringify(adopted.said.slice(0, 200))}`);
        if (key) {
            const issue = host.issued.get(key);
            check(issue?.module === manifest.id, 'issues the adopted key to the host', `the key was not issued to the host for ${manifest.id} (issuePlaceToken).`);
            const sentAdopted = await called(door, null, 'send_message', { body: 'conformance: adopted', [PLACE_TOKEN_ARG]: key });
            check(!sentAdopted.isError, 'an adopted conversation can send', `send_message with its key answered ${JSON.stringify(sentAdopted.text.slice(0, 200))}`);
            const readAdopted = await called(door, null, 'read_messages', { [PLACE_TOKEN_ARG]: key });
            check(!readAdopted.isError, 'an adopted conversation can read', `read_messages with its key answered ${JSON.stringify(readAdopted.text.slice(0, 200))}`);
            /* 7. 2.99.0: and say how its turn ends. */
            const tells = bare.find((tool) => tool.name === TELL_FINISHED_TOOL);
            if (tells) {
                check(Boolean(tells.inputSchema?.properties?.[PLACE_TOKEN_ARG]), 'tell_finished takes placeToken', `tell_finished must take ${PLACE_TOKEN_ARG} (tellFinishedTool in the protocol lists it), so an adopted conversation can say how its turn ends.`);
                const toldAdopted = await called(door, null, TELL_FINISHED_TOOL, { event: 'done', label: 'conformance', [PLACE_TOKEN_ARG]: key });
                check(!toldAdopted.isError, 'an adopted conversation can tell_finished', `tell_finished with its key answered ${JSON.stringify(toldAdopted.text.slice(0, 200))}; resolve the conversation with callToken(urlToken, args), as the message tools do.`);
            }
        }
        /* 5. Guessing. */
        const guessed = await called(door, null, 'send_message', { body: 'conformance: guessed', [PLACE_TOKEN_ARG]: freshPlaceToken() });
        check(guessed.isError, 'refuses a made-up key', `send_message with a key nobody issued answered ${JSON.stringify(guessed.text.slice(0, 160))}`);
        const byId = await called(door, null, 'send_message', { body: 'conformance: an id', [PLACE_TOKEN_ARG]: adopted.conversation });
        check(byId.isError, 'refuses a conversation id given as a key', `send_message with the conversation's id as its key answered ${JSON.stringify(byId.text.slice(0, 160))}`);
        /* 6. The launched path, unchanged. */
        if (options.launched) {
            const { token } = await options.launched(host);
            const withToken = new Set((await listed(door, token)).map((tool) => tool.name));
            check(MESSAGE_TOOL_NAMES.every((name) => withToken.has(name)), 'lists the message tools to a launched conversation', 'tools/list with a URL token lacks a message tool.');
            const sentLaunched = await called(door, token, 'send_message', { body: 'conformance: launched' });
            check(!sentLaunched.isError, 'a launched conversation can send', `send_message with the URL token answered ${JSON.stringify(sentLaunched.text.slice(0, 200))}`);
        }
        await tasksChecks(options, host, check);
        declaredChecks(manifest, host, check);
        return { failures, passed };
    }
    finally {
        if (had.origins === undefined)
            delete process.env.KEHIKOT_ORIGINS;
        else
            process.env.KEHIKOT_ORIGINS = had.origins;
        if (had.origin === undefined)
            delete process.env.KEHIKOT_ORIGIN;
        else
            process.env.KEHIKOT_ORIGIN = had.origin;
        if (had.host === undefined)
            delete process.env[HOST_ENV];
        else
            process.env[HOST_ENV] = had.host;
        forgetMessageHosts();
        await host.close();
    }
}
const pause = (ms) => new Promise((done) => setTimeout(done, ms));
/** 8. `agent.tasks`: start answers at once, and what became of the task reaches the host. */
async function tasksChecks(options, host, check) {
    const { manifest } = options;
    const descriptor = serviceDescriptor(AGENT_TASKS, manifest.services?.[AGENT_TASKS]);
    if (!descriptor)
        return;
    const tasks = options.tasks;
    check(Boolean(tasks), 'is given a way to start a task', `${manifest.id} provides agent.tasks and the conformance was given no \`tasks\` ({ start, program }): it cannot check that start answers at once.`);
    if (!tasks)
        return;
    const body = { project: options.project, brief: 'conformance: a task for Kehikot', place: null, title: 'Conformance task' };
    const vouched = () => ({ 'content-type': 'application/json', [SERVICE_CALLER_HEADER]: HOST_CALLER, [SERVICE_PASS_HEADER]: host.mintPass() });
    const stranger = await tasks.start(body, { 'content-type': 'application/json', [SERVICE_CALLER_HEADER]: HOST_CALLER, [SERVICE_PASS_HEADER]: randomBytes(24).toString('base64url') }).catch(() => null);
    check(stranger?.status === 403, 'start refuses a caller the host did not vouch for', `start with a pass the host never minted answered ${stranger ? `HTTP ${stranger.status}` : 'nothing'}, not 403 (vouchHost).`);
    /* A program that takes 20 s to boot: the answer comes first. */
    const slow = await tasks.program({ bootMs: 20_000 });
    try {
        const began = Date.now();
        const got = await tasks.start(body, vouched()).catch((error) => ({ status: 0, body: String(error) }));
        const took = Date.now() - began;
        check(took <= AGENT_TASK_ANSWER_MS, 'start answers within a second while its program boots', `start took ${took} ms to answer with a program that boots in 20 s; it must answer within ${AGENT_TASK_ANSWER_MS} ms — accept the task (pending: true) and start the program after.`);
        const read = agentTaskStartResult.safeParse(got.body);
        check(got.status === 200 && read.success && read.data.outcome === 'started' && Boolean(read.data.session) && read.data.pending, 'start accepts the task (started, a session, pending)', `start answered HTTP ${got.status} ${JSON.stringify(got.body).slice(0, 200)}; an accepted task is { outcome: 'started', session, pending: true }.`);
    }
    finally {
        await slow();
    }
    /* What became of it reaches the host: a failure with why, and a start with the conversation. */
    for (const fails of [true, false]) {
        const undo = await tasks.program({ bootMs: 100, fails });
        try {
            const got = await tasks.start(body, vouched()).catch(() => null);
            const read = agentTaskStartResult.safeParse(got?.body);
            const session = read.success ? read.data.session : null;
            const want = fails ? 'failed' : 'started';
            let report;
            const until = Date.now() + (options.reportWithinMs ?? 15_000);
            while (session && !report && Date.now() < until) {
                report = host.asked.find((one) => one.module === manifest.id && one.method === 'tasks.report' && one.params.session === session)?.params;
                if (!report)
                    await pause(100);
            }
            const parsed = tasksReportParams.safeParse(report);
            const ok = parsed.success && parsed.data.outcome === want && (fails ? parsed.data.why.trim().length > 0 : Boolean(parsed.data.conversation));
            check(ok, fails ? 'a task whose program fails is reported failed, with why' : 'a task whose program starts is reported started, with its conversation', report
                ? `tasks.report said ${JSON.stringify(report).slice(0, 200)}; expected outcome ${want}${fails ? ' and a why for the person' : ' and the conversation’s id'}.`
                : `no tasks.report for session ${session ?? '(none: start did not accept)'} reached the host; report ${want} with askHost('tasks.report', …) once the program has ${fails ? 'failed' : 'started'}.`);
        }
        finally {
            await undo();
        }
    }
}
/** 9. Every question asked of the host under a declared capability. */
function declaredChecks(manifest, host, check) {
    const uses = new Set(manifest.declares?.uses ?? []);
    const undeclared = [
        ...new Set(host.asked
            .filter((one) => one.module === manifest.id)
            .map((one) => one.method)
            .filter((method) => {
            const capability = METHODS[method];
            return capability !== undefined && !uses.has(capability);
        })
            .map((method) => `${method} (${METHODS[method]})`)),
    ];
    check(undeclared.length === 0, 'asks the host only what its manifest declares', `its server asked ${undeclared.join(', ')} without declaring the capability in declares.uses; a host does not answer that.`);
}
/** `agentConformance`, throwing one error that lists every failure. For a test. */
export async function expectAgentConformance(options) {
    const said = await agentConformance(options);
    if (said.failures.length)
        throw new Error(`${options.manifest.id} fails the agent-module conformance:\n- ${said.failures.join('\n- ')}`);
    return said;
}
