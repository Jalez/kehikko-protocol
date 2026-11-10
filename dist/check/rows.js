import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { rowsAdvice } from '../rows.js';
/**
 * 2.70.0. `kehikot-check-rows [--file <rows>] [--warn] [<module dir> …]`: `rowsAdvice` over the rows a
 * module declares, in CI, where the console of a running page is not read. A page builds its header
 * and footer at run time, so the module states them for the check: `kehikot.rows.json` beside its
 * manifest, or a module whose `rows` (or default) export is the same thing or a function returning it.
 * Each is one state (`{ header, footer }`) or a list of them (`[{ name, header, footer, state }]`): a
 * view each, a busy moment, an empty one. Any advice fails the check, unless `--warn`. Node-only.
 * Design notes: docs/footer.md, "What goes in the header, and what in the footer".
 */
/** The file the check reads when it is not told another. */
export const ROWS_FILE = 'kehikot.rows.json';
/** The states in what a rows file holds: one state, a list of them, or nothing. Pure. */
export function rowsStatesOf(value) {
    const one = (state, at) => {
        if (typeof state !== 'object' || state === null || Array.isArray(state))
            return null;
        const said = state;
        return {
            name: typeof said.name === 'string' && said.name ? said.name : `state ${at + 1}`,
            header: said.header,
            footer: said.footer,
            state: said.state === true,
        };
    };
    const list = Array.isArray(value) ? value : [value];
    return list.map(one).filter((state) => state !== null);
}
/** The advice over each state, as failures. Pure. */
export function checkRowsStates(states, read) {
    if (read === null) {
        return { read, failures: [], notes: [`No ${ROWS_FILE}, so there are no rows to check. State the header and footer the page declares in it, one state per view.`] };
    }
    const failures = [];
    for (const state of states) {
        for (const line of rowsAdvice(state.header, state.footer, { state: state.state }))
            failures.push(`${state.name}: ${line}`);
    }
    const notes = states.length ? [] : [`${read} holds no header or footer.`];
    return { read, failures, notes };
}
/** Read a module's rows and check them. */
export async function checkModuleRows(dir, options = {}) {
    const path = resolve(dir, options.file ?? ROWS_FILE);
    if (!existsSync(path)) {
        if (options.file)
            return { read: options.file, failures: [`${options.file} does not exist.`], notes: [] };
        return checkRowsStates([], null);
    }
    let value;
    try {
        if (/\.json$/i.test(path))
            value = JSON.parse(readFileSync(path, 'utf8'));
        else {
            const loaded = (await import(pathToFileURL(path).href));
            value = loaded.rows ?? loaded.default;
            if (typeof value === 'function')
                value = await value();
        }
    }
    catch (error) {
        return { read: path, failures: [`${path} could not be read: ${error instanceof Error ? error.message : String(error)}`], notes: [] };
    }
    return checkRowsStates(rowsStatesOf(value), path);
}
/** What the check prints. */
export function saidRows(check, warnOnly = false) {
    const lines = [check.read === null ? 'rows: nothing to check' : `rows: ${check.read}`];
    for (const failure of check.failures)
        lines.push(`  ${warnOnly ? 'advice' : 'FAIL'}: ${failure}`);
    for (const note of check.notes)
        lines.push(`  note: ${note}`);
    if (check.read !== null && !check.failures.length)
        lines.push('  ok: the header sets the module up, the footer says how it is doing');
    return lines.join('\n');
}
