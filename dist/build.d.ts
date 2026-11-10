import { z } from 'zod';
/** This package's own version. A test holds it to `package.json`. */
export declare const PACKAGE_VERSION = "2.70.0";
/** The response header a module's doors carry the build stamp in, on every answer. */
export declare const BUILD_HEADER = "x-module-build";
/**
 * The response header a module's server says its START TOKEN in (2.60.0), on every answer of its
 * doors and of `run`: the token the host that started this process handed it in
 * `KEHIKOT_START_TOKEN` (`START_TOKEN_ENV`). Absent when nobody handed one.
 */
export declare const START_HEADER = "x-kehikot-start";
/** The variable a host hands a module it starts its start token in (2.60.0). */
export declare const START_TOKEN_ENV = "KEHIKOT_START_TOKEN";
/**
 * A start token as a host mints one (2.60.0): 16 to 128 characters of letters, digits, `-` and `_`
 * (a random UUID, or base64url). It is an IDENTITY, not a secret: it says "the process this host
 * started", so a host can tell its module from whatever else answers on that port. It grants nothing.
 */
export declare const START_TOKEN: RegExp;
/** The id of the JSON island the build is printed into, beside the ticket. */
export declare const BUILD_ELEMENT = "build";
/**
 * What a module's server is built from, established once per process. It answers one question:
 * is this the same server process, and the same code, as before? See docs/module-plumbing.md.
 */
export declare const buildSchema: z.ZodObject<{
    /** The module's own version, as its manifest says it. */
    version: z.ZodString;
    /** The checkout's commit when the server started, or null when it is not a git checkout. */
    commit: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    /** When this process started, ISO 8601 with milliseconds. Its identity: no two starts share one. */
    started: z.ZodString;
    /** The version of this package the module was built with (`PACKAGE_VERSION` there). */
    protocol: z.ZodString;
    /**
     * The start token the host that started this process handed it (2.60.0), or absent: a process
     * nobody handed one, or a module built before 2.60.0. Malformed reads as absent.
     */
    start: z.ZodCatch<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    version: string;
    commit: string | null;
    started: string;
    protocol: string;
    start?: string | undefined;
}, {
    version: string;
    started: string;
    protocol: string;
    commit?: string | null | undefined;
    start?: unknown;
}>;
export type Build = z.infer<typeof buildSchema>;
/** Read a build off anything, or null. Never throws: a malformed build is an unknown one. */
export declare function readBuild(value: unknown): Build | null;
/** Both are the same server process. */
export declare function sameProcess(a: Build, b: Build): boolean;
/** Both run the same code: module version, commit and protocol package. Says nothing of the process. */
export declare function sameCode(a: Build, b: Build): boolean;
/**
 * - `same`: one process, so one build.
 * - `restarted`: another process running the same code. The page's ticket is dead.
 * - `changed`: another process running other code.
 * - `unknown`: one side did not say — a module from before build identities.
 */
export type BuildComparison = 'same' | 'restarted' | 'changed' | 'unknown';
/** Compare the build a page was served by (or a host last saw) with the one the server reports now. */
export declare function compareBuilds(before: Build | null | undefined, now: Build | null | undefined): BuildComparison;
/** Whether a page served by `page` is older than the server reporting `server`. Unknown is not stale. */
export declare function buildIsStale(page: Build | null | undefined, server: Build | null | undefined): boolean;
/** The build as one header-safe token: `1.2.0+abc1234@2026-10-09T10:00:00.000Z`. Equal stamps, same process. */
export declare function buildStamp(build: Build): string;
/** In words, for a host to show: `1.2.0 (abc1234), protocol package 0.35.0, running since …`. */
export declare function describeBuild(build: Build): string;
/**
 * Whether the server answering is the process a host started (2.60.0), from the token the host
 * handed it (`expected`, null when the host did not start it) and the token the server said — in its
 * build (`build.start`) or its `START_HEADER` (`said`, null or absent when it said none):
 *
 * - `same`: both said one, and it is the same: the very process the host started.
 * - `other`: both said one, and they differ: another process — an older start, another host's, or
 *   a program that copied the header. Never route to it as this module.
 * - `unsaid`: one side has none (the host did not start it, or the module is built before 2.60.0):
 *   the token decides nothing, and the host falls back to what it checked before (the manifest's id).
 *
 * Pure; a malformed token on either side counts as none.
 */
export type StartVerdict = 'same' | 'other' | 'unsaid';
export declare function startVerdict(expected: string | null | undefined, said: string | null | undefined): StartVerdict;
/** The start token a module was handed, read from its environment (2.60.0), or null when there is none or it is malformed. */
export declare function startTokenOf(env: Record<string, string | undefined>): string | null;
