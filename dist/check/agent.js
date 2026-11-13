import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { AGENT_DELIVERY, AGENT_TASKS, serviceDescriptor } from '../services.js';
import { manifestOf, sourcesOf } from './parts.js';
const CONFORMANCE = /kehikot-module-protocol\/testing['"][\s\S]*\b(?:expectAgentConformance|agentConformance)\s*\(/;
/** 2.99.0. The conformance given `tasks` (`tasks:` or the shorthand `tasks,` / `tasks }`). */
const WITH_TASKS = /\b(?:expectAgentConformance|agentConformance)\s*\(\s*\{[\s\S]*?\btasks\s*[:,}]/;
/** Test files under a module directory (test/, tests/, or `*.test.*` anywhere outside node_modules). */
function testsOf(dir) {
    const out = [];
    const walk = (at, inTests) => {
        if (!existsSync(at))
            return;
        for (const entry of readdirSync(at, { withFileTypes: true })) {
            if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist')
                continue;
            const full = join(at, entry.name);
            if (entry.isDirectory())
                walk(full, inTests || entry.name === 'test' || entry.name === 'tests');
            else if (/\.(?:[cm]?[jt]sx?)$/.test(entry.name) && (inTests || /\.(?:test|spec)\./.test(entry.name)))
                out.push({ path: relative(dir, full), text: readFileSync(full, 'utf8') });
        }
    };
    walk(dir, false);
    return out;
}
/** The check over a manifest and the module's files. Pure but for what it is handed. */
export function checkAgentFiles(manifest, sources, tests) {
    const module = manifest.id ?? 'This module';
    if (!(manifest.declares?.uses ?? []).includes('agents:message'))
        return { module, agent: false, failures: [] };
    const failures = [];
    if (!serviceDescriptor(AGENT_DELIVERY, manifest.services?.[AGENT_DELIVERY])) {
        failures.push(`${module} messages (agents:message) and provides no agent.delivery whose descriptor parses: services['agent.delivery'] = { name, program, deliver, adopt }.`);
    }
    if (!tests.some((one) => CONFORMANCE.test(one.text))) {
        failures.push(`${module} has no test that runs the shared conformance: add one file that calls expectAgentConformance from kehikot-module-protocol/testing with its door.`);
    }
    if (serviceDescriptor(AGENT_TASKS, manifest.services?.[AGENT_TASKS]) && !tests.some((one) => CONFORMANCE.test(one.text) && WITH_TASKS.test(one.text))) {
        failures.push(`${module} provides agent.tasks and its conformance test gives no tasks ({ start, program }): pass them, so that start is held to answering within a second against a program that is slow to boot.`);
    }
    const gated = sources.filter((one) => /\?\s*(?:await\s*)?messageToolsFor\s*\(|messageToolsFor\s*\([^)]*\)\s*\)?\s*:\s*\[\s*\]/.test(one.text)).map((one) => one.path);
    if (gated.length)
        failures.push(`${gated.join(', ')}: the message tools are listed only behind a token. List them to every caller; an unknown conversation is answered in words.`);
    return { module, agent: true, failures };
}
/** One module directory, read and checked. */
export async function checkAgentModule(dir) {
    const at = resolve(dir);
    let manifest;
    try {
        manifest = await manifestOf(at);
    }
    catch (error) {
        return { module: at, agent: false, failures: [`${at}: its manifest could not be loaded (${error instanceof Error ? error.message : String(error)}).`] };
    }
    if (!manifest)
        return { module: at, agent: false, failures: [] };
    return checkAgentFiles(manifest, sourcesOf(at), testsOf(at));
}
/** What the command prints for one module. */
export function saidAgent(check) {
    const head = check.failures.length ? `FAIL  ${check.module}` : check.agent ? `ok    ${check.module} — agent module, conformance wired` : `ok    ${check.module} — not an agent module`;
    return [head, ...check.failures.map((failure) => `      ! ${failure}`)].join('\n');
}
