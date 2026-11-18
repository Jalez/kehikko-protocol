import { createHash } from 'node:crypto';
import { MODULE_ID } from '../ids.js';
/**
 * What a ready-built bundle says about itself (2.102.0): `bundle.json` at the root of the unpacked
 * archive. Design notes: docs/bundles.md.
 */
/** The file at a bundle's root that describes it. Never listed in its own `files`. */
export const BUNDLE_FILE = 'bundle.json';
/** `format` in `bundle.json`. */
export const BUNDLE_FORMAT = 'kehikot.bundle';
/** The version of the shape below. A host refuses one it does not know. */
export const BUNDLE_FORMAT_VERSION = 1;
/** The script a host runs, as it runs every module's (`run.sh`), written by `kehikot-bundle`. */
export const BUNDLE_RUN = 'run.sh';
/** The platforms a bundle can name. A bundle with no native code names none: it runs anywhere Bun does. */
export const BUNDLE_PLATFORMS = ['darwin-arm64', 'darwin-x64', 'linux-x64', 'linux-arm64'];
const SHA256 = /^[0-9a-f]{64}$/;
const VERSION = /^\d+\.\d+\.\d+$/;
const COMMIT = /^[0-9a-f]{7,64}$/;
/** The sha256 of `data`, lowercase hex. */
export function sha256(data) {
    return createHash('sha256').update(data).digest('hex');
}
/**
 * `bundle.json` read back, or the sentence that says what is wrong with it. Pure: checks the shape
 * and nothing on disk.
 */
export function bundleInfoOf(value) {
    const no = (why) => ({ ok: false, why: `${BUNDLE_FILE}: ${why}` });
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return no('not an object.');
    const v = value;
    if (v.format !== BUNDLE_FORMAT)
        return no(`format is not "${BUNDLE_FORMAT}".`);
    if (v.formatVersion !== BUNDLE_FORMAT_VERSION)
        return no(`formatVersion ${String(v.formatVersion)} is not one this protocol reads (${BUNDLE_FORMAT_VERSION}).`);
    if (typeof v.id !== 'string' || !MODULE_ID.test(v.id))
        return no('id is not a module id.');
    if (typeof v.version !== 'string' || !VERSION.test(v.version))
        return no('version is not X.Y.Z.');
    if (v.protocol !== null && (typeof v.protocol !== 'string' || !VERSION.test(v.protocol)))
        return no('protocol is not X.Y.Z or null.');
    if (typeof v.commit !== 'string' || !COMMIT.test(v.commit))
        return no('commit is not a commit.');
    if (typeof v.entry !== 'string' || !/^[\w.-]+(\/[\w.-]+)*\.(ts|js|mjs)$/.test(v.entry) || v.entry.split('/').includes('..'))
        return no('entry is not a script in the bundle.');
    if (typeof v.builtAt !== 'string' || Number.isNaN(Date.parse(v.builtAt)))
        return no('builtAt is not a time.');
    if (v.bun !== null && typeof v.bun !== 'string')
        return no('bun is not a version or null.');
    if (v.platforms !== null && (!Array.isArray(v.platforms) || v.platforms.length === 0 || !v.platforms.every((one) => BUNDLE_PLATFORMS.includes(one)))) {
        return no(`platforms is not null or a list of ${BUNDLE_PLATFORMS.join(', ')}.`);
    }
    if (!Array.isArray(v.native) || !v.native.every((one) => one && typeof one === 'object' && typeof one.name === 'string' && typeof one.version === 'string' && (one.why === 'native' || one.why === 'declared'))) {
        return no('native is not a list of { name, version, why }.');
    }
    if (!v.files || typeof v.files !== 'object' || Array.isArray(v.files))
        return no('files is not an object.');
    for (const [path, file] of Object.entries(v.files)) {
        const f = file;
        if (!f || typeof f.sha256 !== 'string' || !SHA256.test(f.sha256) || typeof f.size !== 'number' || !Number.isInteger(f.size) || f.size < 0) {
            return no(`files["${path}"] is not { sha256, size }.`);
        }
        if (path === BUNDLE_FILE)
            return no(`files lists ${BUNDLE_FILE} itself.`);
    }
    const files = v.files;
    if (!files[v.entry])
        return no(`entry ${v.entry} is not one of its files.`);
    if (!files[BUNDLE_RUN]?.executable)
        return no(`${BUNDLE_RUN} is not one of its files, or not executable.`);
    return { ok: true, info: value };
}
/** This process's platform as a bundle names one. */
export function platformHere(platform = process.platform, arch = process.arch) {
    return `${platform}-${arch}`;
}
/** Whether a bundle runs here: no platforms named, or this one among them. */
export function runsHere(info, here = platformHere()) {
    return info.platforms === null || info.platforms.includes(here);
}
/** The checksum file published beside an archive: `<sha256>  <archive name>`, as `shasum -a 256` writes it. */
export function checksumLine(archive, name) {
    return `${sha256(archive)}  ${name}\n`;
}
/** The sha256 a checksum file says, or null when it says none. Takes `shasum`'s format and a bare hash. */
export function checksumOf(text) {
    const first = text.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
    return SHA256.test(first) ? first : null;
}
/** The archive's name on a release: `<id>-<version>.tar.gz`. */
export function bundleArchiveName(id, version) {
    return `${id}-${version}.tar.gz`;
}
