import { askHost } from './ask.js';
/**
 * 2.76.0. The projects a module's server picks up at start: the ones the host says this module keeps
 * its folder in (`projects.mine`), each handed to the module's own `know`. Node-only, like the rest
 * of `/serve`. Design notes: docs/server-ask.md, "The projects a module keeps something in".
 *
 * A module that runs things for a project — an agent module's conversations, which a message is
 * delivered to by typing (`messageDelivery`) — learns of a project when a page framed in it asks, or
 * when one of its sessions reports in. After a restart of Kehikot or of the module, a project nobody
 * has opened since is not known, so what the module runs there waits for somebody to open it. Asking
 * the host at start closes that gap without anything new kept anywhere: the host holds the person's
 * projects, and the module's own folder says which of them it has something in.
 *
 *     watchKnownProjects({ module: ID, know: (path) => runs.know(path) }).start()
 *
 * On a host that does not answer `projects.mine` (older than 2.76.0, or the manifest does not declare
 * `projects:read`) it stops asking, and the module goes on as before: it learns of a project when a
 * page or a session names it. Never throws.
 */
/** How often the host is asked again once it has answered, in ms: a project added meanwhile is picked up on this clock. */
export const KNOWN_PROJECTS_EVERY_MS = 5 * 60_000;
/** How soon the host is asked again when none answered yet (Kehikot is starting, or the module started first), in ms. */
export const KNOWN_PROJECTS_RETRY_MS = 15_000;
/** 2.76.0. Ask the host which projects this module keeps its folder in, at start and on a slow clock, and `know` each one once. */
export function watchKnownProjects(options) {
    const { know, everyMs = KNOWN_PROJECTS_EVERY_MS, retryMs = KNOWN_PROJECTS_RETRY_MS, ask: askFor, log = () => { }, ...rest } = options;
    const ask = askFor ?? (() => askHost('projects.mine', {}, rest));
    const told = new Set();
    let timer = null;
    let running = false;
    let busy = null;
    async function look() {
        let asked;
        try {
            asked = await ask();
        }
        catch {
            return { added: [], said: 'not-now' };
        }
        if (!asked.ok) {
            const never = asked.declined === 'host-too-old' || asked.refused === 'grant';
            if (never)
                log(`the host does not say which projects this module keeps something in (${asked.why}); a project is picked up when it is opened`);
            return { added: [], said: never ? 'never' : 'not-now' };
        }
        const added = [];
        for (const project of asked.data.projects) {
            if (told.has(project.path))
                continue;
            told.add(project.path);
            added.push(project.path);
            try {
                await know(project.path, project);
            }
            catch (error) {
                log(`taking in ${project.path} failed — ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        if (added.length)
            log(`picked up ${added.length} project${added.length === 1 ? '' : 's'} this module keeps something in`);
        return { added, said: 'answered' };
    }
    function tick() {
        busy ??= look().finally(() => {
            busy = null;
        });
        return busy;
    }
    function schedule(delay) {
        if (!running)
            return;
        timer = setTimeout(() => {
            timer = null;
            void tick().then((done) => {
                if (done.said === 'never')
                    running = false;
                else
                    schedule(done.said === 'answered' ? everyMs : retryMs);
            });
        }, delay);
        timer.unref?.();
    }
    return {
        tick,
        start() {
            if (running)
                return;
            running = true;
            schedule(0);
        },
        stop() {
            running = false;
            if (timer)
                clearTimeout(timer);
            timer = null;
        },
        known: () => [...told],
    };
}
