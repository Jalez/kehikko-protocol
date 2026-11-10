import { z } from 'zod';
/** This package's own version. A test holds it to `package.json`. */
export const PACKAGE_VERSION = '2.74.0';
/** The response header a module's doors carry the build stamp in, on every answer. */
export const BUILD_HEADER = 'x-module-build';
/**
 * The response header a module's server says its START TOKEN in (2.60.0), on every answer of its
 * doors and of `run`: the token the host that started this process handed it in
 * `KEHIKOT_START_TOKEN` (`START_TOKEN_ENV`). Absent when nobody handed one.
 */
export const START_HEADER = 'x-kehikot-start';
/** The variable a host hands a module it starts its start token in (2.60.0). */
export const START_TOKEN_ENV = 'KEHIKOT_START_TOKEN';
/**
 * A start token as a host mints one (2.60.0): 16 to 128 characters of letters, digits, `-` and `_`
 * (a random UUID, or base64url). It is an IDENTITY, not a secret: it says "the process this host
 * started", so a host can tell its module from whatever else answers on that port. It grants nothing.
 */
export const START_TOKEN = /^[A-Za-z0-9_-]{16,128}$/;
/** The id of the JSON island the build is printed into, beside the ticket. */
export const BUILD_ELEMENT = 'build';
/**
 * What a module's server is built from, established once per process. It answers one question:
 * is this the same server process, and the same code, as before? See docs/module-plumbing.md.
 */
export const buildSchema = z.object({
    /** The module's own version, as its manifest says it. */
    version: z.string().min(1).max(64),
    /** The checkout's commit when the server started, or null when it is not a git checkout. */
    commit: z
        .string()
        .regex(/^[0-9a-f]{7,64}$/)
        .nullable()
        .default(null),
    /** When this process started, ISO 8601 with milliseconds. Its identity: no two starts share one. */
    started: z.string().min(1).max(40),
    /** The version of this package the module was built with (`PACKAGE_VERSION` there). */
    protocol: z.string().min(1).max(32),
    /**
     * The start token the host that started this process handed it (2.60.0), or absent: a process
     * nobody handed one, or a module built before 2.60.0. Malformed reads as absent.
     */
    start: z.string().regex(START_TOKEN).optional().catch(undefined),
});
/** Read a build off anything, or null. Never throws: a malformed build is an unknown one. */
export function readBuild(value) {
    const parsed = buildSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
}
/** Both are the same server process. */
export function sameProcess(a, b) {
    return a.started === b.started;
}
/** Both run the same code: module version, commit and protocol package. Says nothing of the process. */
export function sameCode(a, b) {
    return a.version === b.version && a.commit === b.commit && a.protocol === b.protocol;
}
/** Compare the build a page was served by (or a host last saw) with the one the server reports now. */
export function compareBuilds(before, now) {
    if (!before || !now)
        return 'unknown';
    if (sameProcess(before, now))
        return 'same';
    return sameCode(before, now) ? 'restarted' : 'changed';
}
/** Whether a page served by `page` is older than the server reporting `server`. Unknown is not stale. */
export function buildIsStale(page, server) {
    const compared = compareBuilds(page, server);
    return compared === 'restarted' || compared === 'changed';
}
/** The build as one header-safe token: `1.2.0+abc1234@2026-10-09T10:00:00.000Z`. Equal stamps, same process. */
export function buildStamp(build) {
    return `${build.version}+${build.commit ? build.commit.slice(0, 12) : 'nogit'}@${build.started}`.replace(/[^\x21-\x7e]/g, '_');
}
/** In words, for a host to show: `1.2.0 (abc1234), protocol package 0.35.0, running since …`. */
export function describeBuild(build) {
    return `${build.version}${build.commit ? ` (${build.commit.slice(0, 7)})` : ''}, protocol package ${build.protocol}, running since ${build.started}`;
}
export function startVerdict(expected, said) {
    const want = typeof expected === 'string' && START_TOKEN.test(expected) ? expected : null;
    const got = typeof said === 'string' && START_TOKEN.test(said.trim()) ? said.trim() : null;
    if (want === null || got === null)
        return 'unsaid';
    return want === got ? 'same' : 'other';
}
/** The start token a module was handed, read from its environment (2.60.0), or null when there is none or it is malformed. */
export function startTokenOf(env) {
    const value = env[START_TOKEN_ENV]?.trim();
    return value && START_TOKEN.test(value) ? value : null;
}
