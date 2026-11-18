import { sourcesOf } from './parts.js';
/** A raw call whose first argument is a string literal that does not start at `/`, a scheme, `?`, `#` or `${`. */
const RAW_RELATIVE = /(?:\bfetch\s*\(|\bnew\s+EventSource\s*\(|\.open\s*\(\s*['"`][A-Z]+['"`]\s*,)\s*(['"`])(?!\/|[a-z][a-z0-9+.-]*:|\?|#|\$\{)([^'"`\n]*)\1/g;
/** The checks on what was read. Pure. */
export function checkAddressesSources(module, sources) {
    const failures = [];
    for (const { path, text } of sources) {
        const lines = withoutComments(text).split('\n');
        lines.forEach((line, index) => {
            for (const found of line.matchAll(RAW_RELATIVE)) {
                failures.push(`${path}:${index + 1}: ${found[0].trim()} — a relative address resolves against the path the page is framed at, `
                    + `so it misses at \`/app/\` and \`/app/?…\`. Use \`ask\`, \`follow\` or \`subscribe\` from kehikot-module-protocol/client, or spell it \`/${(found[2] ?? '').replace(/^\.\//, '')}\`.`);
            }
        });
    }
    return { module, failures };
}
/** One module directory, read and checked. */
export function checkModuleAddresses(dir) {
    return checkAddressesSources(dir, sourcesOf(dir));
}
/** What a person is told. */
export function saidAddresses(check) {
    if (!check.failures.length)
        return `${check.module}: no raw relative address.`;
    return [`${check.module}: FAILS check:addresses`, ...check.failures.map((failure) => `  - ${failure}`)].join('\n');
}
/** Comments out, so a sentence about `fetch('./api')` is not a call. Keeps line numbers. */
function withoutComments(text) {
    return text.replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}
