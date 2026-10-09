import { z } from 'zod';
/** This package's own version. A test holds it to `package.json`. */
export declare const PACKAGE_VERSION = "0.35.0";
/** The response header a module's doors carry the build stamp in, on every answer. */
export declare const BUILD_HEADER = "x-module-build";
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
}, "strip", z.ZodTypeAny, {
    version: string;
    commit: string | null;
    started: string;
    protocol: string;
}, {
    version: string;
    started: string;
    protocol: string;
    commit?: string | null | undefined;
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
