import { z } from 'zod';
/**
 * Traffic (2.20.0): the record of the calls Kehikot and its modules make and receive on this
 * computer — when, what kind, to where, and for what reason — and never what they carried. Shapes
 * and the one sanitizer, so a host and a module strip a call the same way. The recording is a host's;
 * the module half is `trafficNotes` in `/serve`. Design notes: docs/traffic.md.
 */
/**
 * Which way a call went, from `by`'s side. `out`: `by` made it. `in`: the host received it from `by`
 * (its own routes, asked by a page or a module's server). `seen`: a connection the host saw open on
 * one of `by`'s processes, which nobody reported — so it has no reason.
 */
export declare const TRAFFIC_SIDES: readonly ["out", "in", "seen"];
export type TrafficSide = (typeof TRAFFIC_SIDES)[number];
/** Which part of `by` it was: its server, its page (in the canvas), or a process it runs. */
export declare const TRAFFIC_VIA: readonly ["server", "page", "process"];
export type TrafficVia = (typeof TRAFFIC_VIA)[number];
/**
 * Who says a row happened. `host`: the host recorded it as it made or received it. `module`: the
 * module noted it (`traffic.note`). `sampled`: the host saw the connection on a process. Stated by the
 * recorder, never by the caller, so a module cannot file its own calls as anything else.
 */
export declare const TRAFFIC_REPORTERS: readonly ["host", "module", "sampled"];
export type TrafficReporter = (typeof TRAFFIC_REPORTERS)[number];
/**
 * A call that did not go over the network, or went and was free. `hit`: answered from a cache, so
 * nothing was sent. `not-modified`: sent with a validator and answered 304, which costs no budget.
 * `refused`: held back by a budget, so nothing was sent. Absent: an ordinary call.
 */
export declare const TRAFFIC_CACHE: readonly ["hit", "not-modified", "refused"];
export type TrafficCache = (typeof TRAFFIC_CACHE)[number];
/** The id the host's own calls are filed under: the host's name on the wire. */
export declare const TRAFFIC_HOST_BY = "kehikko";
/**
 * What a module says about one call it made (`traffic.note`). `host` and `path` are what
 * `trafficTarget` makes of the address — sanitize before sending; a host sanitizes again on receipt.
 * `status` is the HTTP status, or a command's exit code; `reason` a short plain phrase from the call
 * site ("release list", "compile"), or null when the module has none to give.
 */
export declare const trafficNoteSchema: z.ZodObject<{
    at: z.ZodNumber;
    ms: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    reason: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    kind: z.ZodString;
    host: z.ZodString;
    path: z.ZodString;
    status: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    ok: z.ZodDefault<z.ZodNullable<z.ZodBoolean>>;
    bytesIn: z.ZodOptional<z.ZodNumber>;
    bytesOut: z.ZodOptional<z.ZodNumber>;
    cache: z.ZodOptional<z.ZodEnum<["hit", "not-modified", "refused"]>>;
}, "strip", z.ZodTypeAny, {
    at: number;
    path: string;
    status: number | null;
    host: string;
    kind: string;
    reason: string | null;
    ok: boolean | null;
    ms: number | null;
    bytesIn?: number | undefined;
    bytesOut?: number | undefined;
    cache?: "refused" | "hit" | "not-modified" | undefined;
}, {
    at: number;
    path: string;
    host: string;
    kind: string;
    status?: number | null | undefined;
    reason?: string | null | undefined;
    ok?: boolean | null | undefined;
    ms?: number | null | undefined;
    bytesIn?: number | undefined;
    bytesOut?: number | undefined;
    cache?: "refused" | "hit" | "not-modified" | undefined;
}>;
export type TrafficNote = z.infer<typeof trafficNoteSchema>;
export type TrafficNoteInput = z.input<typeof trafficNoteSchema>;
/**
 * What kind of caller sent a request the host received (2.25.0). `host`: Kehikot itself — its page or
 * its desktop app. `module`: a module's server, page or a process it runs. `session`: an agent session
 * an agent module started (a Claude Code or Codex conversation), filed under that module's `by`.
 * `program`: any other program on this computer, named by its executable and its parent's. `remote`:
 * another computer. `gone`: a program that closed before the host could look at it.
 */
export declare const TRAFFIC_CALLER_KINDS: readonly ["host", "module", "session", "program", "remote", "gone"];
export type TrafficCallerKind = (typeof TRAFFIC_CALLER_KINDS)[number];
/**
 * How the host told who it was (2.25.0). `route`: the route that answered knows (a module's server
 * asking with its pass). `origin`: the request carried a page's origin, the host's own or a module's.
 * `token`: an MCP call carried a conversation's place token, whose issuer the host knows. `process`:
 * the process holding the other end of the connection, and its parents. `address`: the other end was
 * not this computer. `closed`: the connection's process was gone before the host could look.
 */
export declare const TRAFFIC_CALLER_HOW: readonly ["route", "origin", "token", "process", "address", "closed"];
export type TrafficCallerHow = (typeof TRAFFIC_CALLER_HOW)[number];
/**
 * Who sent a request the host received, named (2.25.0), on rows with `side: 'in'`. `name` is what a
 * person reads: "Paper", "Claude session on Wide · methods", "curl, from your terminal (zsh)",
 * "Another computer (192.168.1.20)". `process` and `parent` are executable NAMES only — never a path,
 * never an argument (a command line can hold a token). `place` is the kehikko and epic of a session,
 * as its record says ("Wide · methods"). `pid` tells two callers of one name apart (two sessions);
 * it means nothing after the process has gone.
 */
export declare const trafficCallerSchema: z.ZodObject<{
    kind: z.ZodEnum<["host", "module", "session", "program", "remote", "gone"]>;
    name: z.ZodString;
    how: z.ZodEnum<["route", "origin", "token", "process", "address", "closed"]>;
    process: z.ZodOptional<z.ZodString>;
    parent: z.ZodOptional<z.ZodString>;
    place: z.ZodOptional<z.ZodString>;
    pid: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    kind: "module" | "session" | "host" | "program" | "remote" | "gone";
    how: "token" | "closed" | "address" | "origin" | "process" | "route";
    place?: string | undefined;
    process?: string | undefined;
    parent?: string | undefined;
    pid?: number | undefined;
}, {
    name: string;
    kind: "module" | "session" | "host" | "program" | "remote" | "gone";
    how: "token" | "closed" | "address" | "origin" | "process" | "route";
    place?: string | undefined;
    process?: string | undefined;
    parent?: string | undefined;
    pid?: number | undefined;
}>;
export type TrafficCaller = z.infer<typeof trafficCallerSchema>;
/**
 * One row of the record. A note, stamped by the recorder with its place in the record (`seq`), who
 * (`by`: `TRAFFIC_HOST_BY`, a module id, or `''` when the caller is neither), which part of them
 * (`via`), which way (`side`) and who says so (`reported`). On a row the host received, `caller`
 * names who asked even when `by` is `''` (2.25.0); a module cannot set it, the recorder does.
 */
export declare const trafficCallSchema: z.ZodObject<{
    at: z.ZodNumber;
    ms: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    reason: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    kind: z.ZodString;
    host: z.ZodString;
    path: z.ZodString;
    status: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    ok: z.ZodDefault<z.ZodNullable<z.ZodBoolean>>;
    bytesIn: z.ZodOptional<z.ZodNumber>;
    bytesOut: z.ZodOptional<z.ZodNumber>;
    cache: z.ZodOptional<z.ZodEnum<["hit", "not-modified", "refused"]>>;
} & {
    seq: z.ZodNumber;
    by: z.ZodString;
    via: z.ZodEnum<["server", "page", "process"]>;
    side: z.ZodEnum<["out", "in", "seen"]>;
    reported: z.ZodEnum<["host", "module", "sampled"]>;
    /** Absent from a host before 2.25.0 and from rows it did not receive; dropped, not fatal, when it does not parse. */
    caller: z.ZodCatch<z.ZodOptional<z.ZodObject<{
        kind: z.ZodEnum<["host", "module", "session", "program", "remote", "gone"]>;
        name: z.ZodString;
        how: z.ZodEnum<["route", "origin", "token", "process", "address", "closed"]>;
        process: z.ZodOptional<z.ZodString>;
        parent: z.ZodOptional<z.ZodString>;
        place: z.ZodOptional<z.ZodString>;
        pid: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        kind: "module" | "session" | "host" | "program" | "remote" | "gone";
        how: "token" | "closed" | "address" | "origin" | "process" | "route";
        place?: string | undefined;
        process?: string | undefined;
        parent?: string | undefined;
        pid?: number | undefined;
    }, {
        name: string;
        kind: "module" | "session" | "host" | "program" | "remote" | "gone";
        how: "token" | "closed" | "address" | "origin" | "process" | "route";
        place?: string | undefined;
        process?: string | undefined;
        parent?: string | undefined;
        pid?: number | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    at: number;
    path: string;
    status: number | null;
    by: string;
    host: string;
    kind: string;
    reason: string | null;
    side: "out" | "in" | "seen";
    ok: boolean | null;
    ms: number | null;
    seq: number;
    via: "page" | "server" | "process";
    reported: "module" | "host" | "sampled";
    bytesIn?: number | undefined;
    bytesOut?: number | undefined;
    cache?: "refused" | "hit" | "not-modified" | undefined;
    caller?: {
        name: string;
        kind: "module" | "session" | "host" | "program" | "remote" | "gone";
        how: "token" | "closed" | "address" | "origin" | "process" | "route";
        place?: string | undefined;
        process?: string | undefined;
        parent?: string | undefined;
        pid?: number | undefined;
    } | undefined;
}, {
    at: number;
    path: string;
    by: string;
    host: string;
    kind: string;
    side: "out" | "in" | "seen";
    seq: number;
    via: "page" | "server" | "process";
    reported: "module" | "host" | "sampled";
    status?: number | null | undefined;
    reason?: string | null | undefined;
    ok?: boolean | null | undefined;
    ms?: number | null | undefined;
    bytesIn?: number | undefined;
    bytesOut?: number | undefined;
    cache?: "refused" | "hit" | "not-modified" | undefined;
    caller?: unknown;
}>;
export type TrafficCall = z.infer<typeof trafficCallSchema>;
/**
 * An allowance a host spends on somebody's behalf: GitHub's API for a person not signed in, say.
 * `left` of `limit` until `resets` (ms since the epoch, null when unknown).
 */
export declare const trafficBudgetSchema: z.ZodObject<{
    name: z.ZodString;
    used: z.ZodNumber;
    limit: z.ZodNumber;
    left: z.ZodNumber;
    resets: z.ZodNullable<z.ZodNumber>;
    /** A sentence: whose allowance it is, or why it is not counted. */
    note: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    limit: number;
    note: string;
    used: number;
    left: number;
    resets: number | null;
}, {
    name: string;
    limit: number;
    used: number;
    left: number;
    resets: number | null;
    note?: string | undefined;
}>;
export type TrafficBudget = z.infer<typeof trafficBudgetSchema>;
/**
 * Kehikot's own share of one of an account's limits (2.24.0): at most `limit` of it in the account's
 * window, of which it has spent `used`. A share the host keeps for itself, so the person's own use,
 * their CI and their other apps keep the rest.
 */
export declare const trafficShareSchema: z.ZodObject<{
    limit: z.ZodNumber;
    used: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    limit: number;
    used: number;
}, {
    limit: number;
    used: number;
}>;
export type TrafficShare = z.infer<typeof trafficShareSchema>;
/**
 * One of an account's limits as the forge last said it (2.24.0): GitHub's `core` (REST calls) or
 * `graphql` (points), GitLab's API. `used` and `remaining` of `limit`, whoever spent them, until
 * `resets` (ms since the epoch, null when unknown). `share`: Kehikot's own part of it, null when the
 * host keeps none. `floor`: how much of `remaining` the host leaves alone — below it, it reads
 * nothing, null when it keeps no floor.
 */
export declare const trafficAllowanceSchema: z.ZodObject<{
    limit: z.ZodNumber;
    used: z.ZodNumber;
    remaining: z.ZodNumber;
    resets: z.ZodNullable<z.ZodNumber>;
    share: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        limit: z.ZodNumber;
        used: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        used: number;
    }, {
        limit: number;
        used: number;
    }>>>;
    floor: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    used: number;
    resets: number | null;
    remaining: number;
    share: {
        limit: number;
        used: number;
    } | null;
    floor: number | null;
}, {
    limit: number;
    used: number;
    resets: number | null;
    remaining: number;
    share?: {
        limit: number;
        used: number;
    } | null | undefined;
    floor?: number | null | undefined;
}>;
export type TrafficAllowance = z.infer<typeof trafficAllowanceSchema>;
/**
 * What a host knows of the account it calls a forge as (2.24.0): the person's own login, signed in
 * through their `gh` or `glab`. `login`: the name, null when the host cannot say it without a call.
 * `core`: the REST limit (GitLab's only one). `graphql`: GitHub's GraphQL points; null on GitLab or
 * when not yet known. `paused`: the host is holding the calls it may hold, and `why` says so in a
 * sentence, until `until` (null when it cannot say). `at`: when the numbers were last learned, null
 * when never — a host reads them for free (`gh api rate_limit`) or from the answers it already gets.
 */
export declare const trafficAccountSchema: z.ZodObject<{
    login: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    core: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        limit: z.ZodNumber;
        used: z.ZodNumber;
        remaining: z.ZodNumber;
        resets: z.ZodNullable<z.ZodNumber>;
        share: z.ZodDefault<z.ZodNullable<z.ZodObject<{
            limit: z.ZodNumber;
            used: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            limit: number;
            used: number;
        }, {
            limit: number;
            used: number;
        }>>>;
        floor: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        used: number;
        resets: number | null;
        remaining: number;
        share: {
            limit: number;
            used: number;
        } | null;
        floor: number | null;
    }, {
        limit: number;
        used: number;
        resets: number | null;
        remaining: number;
        share?: {
            limit: number;
            used: number;
        } | null | undefined;
        floor?: number | null | undefined;
    }>>>;
    graphql: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        limit: z.ZodNumber;
        used: z.ZodNumber;
        remaining: z.ZodNumber;
        resets: z.ZodNullable<z.ZodNumber>;
        share: z.ZodDefault<z.ZodNullable<z.ZodObject<{
            limit: z.ZodNumber;
            used: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            limit: number;
            used: number;
        }, {
            limit: number;
            used: number;
        }>>>;
        floor: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        used: number;
        resets: number | null;
        remaining: number;
        share: {
            limit: number;
            used: number;
        } | null;
        floor: number | null;
    }, {
        limit: number;
        used: number;
        resets: number | null;
        remaining: number;
        share?: {
            limit: number;
            used: number;
        } | null | undefined;
        floor?: number | null | undefined;
    }>>>;
    paused: z.ZodDefault<z.ZodBoolean>;
    why: z.ZodDefault<z.ZodString>;
    until: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    at: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    at: number | null;
    why: string;
    login: string | null;
    core: {
        limit: number;
        used: number;
        resets: number | null;
        remaining: number;
        share: {
            limit: number;
            used: number;
        } | null;
        floor: number | null;
    } | null;
    graphql: {
        limit: number;
        used: number;
        resets: number | null;
        remaining: number;
        share: {
            limit: number;
            used: number;
        } | null;
        floor: number | null;
    } | null;
    paused: boolean;
    until: number | null;
}, {
    at?: number | null | undefined;
    why?: string | undefined;
    login?: string | null | undefined;
    core?: {
        limit: number;
        used: number;
        resets: number | null;
        remaining: number;
        share?: {
            limit: number;
            used: number;
        } | null | undefined;
        floor?: number | null | undefined;
    } | null | undefined;
    graphql?: {
        limit: number;
        used: number;
        resets: number | null;
        remaining: number;
        share?: {
            limit: number;
            used: number;
        } | null | undefined;
        floor?: number | null | undefined;
    } | null | undefined;
    paused?: boolean | undefined;
    until?: number | null | undefined;
}>;
export type TrafficAccount = z.infer<typeof trafficAccountSchema>;
/**
 * Each forge's budgets, separately (2.24.0). `github.account`: the person's signed-in account, null
 * when `gh` is not signed in. `github.anonymous`: the host's own hourly budget for reading GitHub
 * without an account — the same row as in `budgets`. `gitlab.account`: the person's `glab` account,
 * when it is signed in and cheap to read. A forge the host says nothing about is absent.
 */
export declare const trafficLimitsSchema: z.ZodObject<{
    github: z.ZodOptional<z.ZodObject<{
        account: z.ZodDefault<z.ZodNullable<z.ZodObject<{
            login: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            core: z.ZodDefault<z.ZodNullable<z.ZodObject<{
                limit: z.ZodNumber;
                used: z.ZodNumber;
                remaining: z.ZodNumber;
                resets: z.ZodNullable<z.ZodNumber>;
                share: z.ZodDefault<z.ZodNullable<z.ZodObject<{
                    limit: z.ZodNumber;
                    used: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    limit: number;
                    used: number;
                }, {
                    limit: number;
                    used: number;
                }>>>;
                floor: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            }, "strip", z.ZodTypeAny, {
                limit: number;
                used: number;
                resets: number | null;
                remaining: number;
                share: {
                    limit: number;
                    used: number;
                } | null;
                floor: number | null;
            }, {
                limit: number;
                used: number;
                resets: number | null;
                remaining: number;
                share?: {
                    limit: number;
                    used: number;
                } | null | undefined;
                floor?: number | null | undefined;
            }>>>;
            graphql: z.ZodDefault<z.ZodNullable<z.ZodObject<{
                limit: z.ZodNumber;
                used: z.ZodNumber;
                remaining: z.ZodNumber;
                resets: z.ZodNullable<z.ZodNumber>;
                share: z.ZodDefault<z.ZodNullable<z.ZodObject<{
                    limit: z.ZodNumber;
                    used: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    limit: number;
                    used: number;
                }, {
                    limit: number;
                    used: number;
                }>>>;
                floor: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            }, "strip", z.ZodTypeAny, {
                limit: number;
                used: number;
                resets: number | null;
                remaining: number;
                share: {
                    limit: number;
                    used: number;
                } | null;
                floor: number | null;
            }, {
                limit: number;
                used: number;
                resets: number | null;
                remaining: number;
                share?: {
                    limit: number;
                    used: number;
                } | null | undefined;
                floor?: number | null | undefined;
            }>>>;
            paused: z.ZodDefault<z.ZodBoolean>;
            why: z.ZodDefault<z.ZodString>;
            until: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            at: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        }, "strip", z.ZodTypeAny, {
            at: number | null;
            why: string;
            login: string | null;
            core: {
                limit: number;
                used: number;
                resets: number | null;
                remaining: number;
                share: {
                    limit: number;
                    used: number;
                } | null;
                floor: number | null;
            } | null;
            graphql: {
                limit: number;
                used: number;
                resets: number | null;
                remaining: number;
                share: {
                    limit: number;
                    used: number;
                } | null;
                floor: number | null;
            } | null;
            paused: boolean;
            until: number | null;
        }, {
            at?: number | null | undefined;
            why?: string | undefined;
            login?: string | null | undefined;
            core?: {
                limit: number;
                used: number;
                resets: number | null;
                remaining: number;
                share?: {
                    limit: number;
                    used: number;
                } | null | undefined;
                floor?: number | null | undefined;
            } | null | undefined;
            graphql?: {
                limit: number;
                used: number;
                resets: number | null;
                remaining: number;
                share?: {
                    limit: number;
                    used: number;
                } | null | undefined;
                floor?: number | null | undefined;
            } | null | undefined;
            paused?: boolean | undefined;
            until?: number | null | undefined;
        }>>>;
        anonymous: z.ZodDefault<z.ZodNullable<z.ZodObject<{
            name: z.ZodString;
            used: z.ZodNumber;
            limit: z.ZodNumber;
            left: z.ZodNumber;
            resets: z.ZodNullable<z.ZodNumber>;
            /** A sentence: whose allowance it is, or why it is not counted. */
            note: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            limit: number;
            note: string;
            used: number;
            left: number;
            resets: number | null;
        }, {
            name: string;
            limit: number;
            used: number;
            left: number;
            resets: number | null;
            note?: string | undefined;
        }>>>;
    }, "strip", z.ZodTypeAny, {
        account: {
            at: number | null;
            why: string;
            login: string | null;
            core: {
                limit: number;
                used: number;
                resets: number | null;
                remaining: number;
                share: {
                    limit: number;
                    used: number;
                } | null;
                floor: number | null;
            } | null;
            graphql: {
                limit: number;
                used: number;
                resets: number | null;
                remaining: number;
                share: {
                    limit: number;
                    used: number;
                } | null;
                floor: number | null;
            } | null;
            paused: boolean;
            until: number | null;
        } | null;
        anonymous: {
            name: string;
            limit: number;
            note: string;
            used: number;
            left: number;
            resets: number | null;
        } | null;
    }, {
        account?: {
            at?: number | null | undefined;
            why?: string | undefined;
            login?: string | null | undefined;
            core?: {
                limit: number;
                used: number;
                resets: number | null;
                remaining: number;
                share?: {
                    limit: number;
                    used: number;
                } | null | undefined;
                floor?: number | null | undefined;
            } | null | undefined;
            graphql?: {
                limit: number;
                used: number;
                resets: number | null;
                remaining: number;
                share?: {
                    limit: number;
                    used: number;
                } | null | undefined;
                floor?: number | null | undefined;
            } | null | undefined;
            paused?: boolean | undefined;
            until?: number | null | undefined;
        } | null | undefined;
        anonymous?: {
            name: string;
            limit: number;
            used: number;
            left: number;
            resets: number | null;
            note?: string | undefined;
        } | null | undefined;
    }>>;
    gitlab: z.ZodOptional<z.ZodObject<{
        account: z.ZodDefault<z.ZodNullable<z.ZodObject<{
            login: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            core: z.ZodDefault<z.ZodNullable<z.ZodObject<{
                limit: z.ZodNumber;
                used: z.ZodNumber;
                remaining: z.ZodNumber;
                resets: z.ZodNullable<z.ZodNumber>;
                share: z.ZodDefault<z.ZodNullable<z.ZodObject<{
                    limit: z.ZodNumber;
                    used: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    limit: number;
                    used: number;
                }, {
                    limit: number;
                    used: number;
                }>>>;
                floor: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            }, "strip", z.ZodTypeAny, {
                limit: number;
                used: number;
                resets: number | null;
                remaining: number;
                share: {
                    limit: number;
                    used: number;
                } | null;
                floor: number | null;
            }, {
                limit: number;
                used: number;
                resets: number | null;
                remaining: number;
                share?: {
                    limit: number;
                    used: number;
                } | null | undefined;
                floor?: number | null | undefined;
            }>>>;
            graphql: z.ZodDefault<z.ZodNullable<z.ZodObject<{
                limit: z.ZodNumber;
                used: z.ZodNumber;
                remaining: z.ZodNumber;
                resets: z.ZodNullable<z.ZodNumber>;
                share: z.ZodDefault<z.ZodNullable<z.ZodObject<{
                    limit: z.ZodNumber;
                    used: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    limit: number;
                    used: number;
                }, {
                    limit: number;
                    used: number;
                }>>>;
                floor: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            }, "strip", z.ZodTypeAny, {
                limit: number;
                used: number;
                resets: number | null;
                remaining: number;
                share: {
                    limit: number;
                    used: number;
                } | null;
                floor: number | null;
            }, {
                limit: number;
                used: number;
                resets: number | null;
                remaining: number;
                share?: {
                    limit: number;
                    used: number;
                } | null | undefined;
                floor?: number | null | undefined;
            }>>>;
            paused: z.ZodDefault<z.ZodBoolean>;
            why: z.ZodDefault<z.ZodString>;
            until: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            at: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        }, "strip", z.ZodTypeAny, {
            at: number | null;
            why: string;
            login: string | null;
            core: {
                limit: number;
                used: number;
                resets: number | null;
                remaining: number;
                share: {
                    limit: number;
                    used: number;
                } | null;
                floor: number | null;
            } | null;
            graphql: {
                limit: number;
                used: number;
                resets: number | null;
                remaining: number;
                share: {
                    limit: number;
                    used: number;
                } | null;
                floor: number | null;
            } | null;
            paused: boolean;
            until: number | null;
        }, {
            at?: number | null | undefined;
            why?: string | undefined;
            login?: string | null | undefined;
            core?: {
                limit: number;
                used: number;
                resets: number | null;
                remaining: number;
                share?: {
                    limit: number;
                    used: number;
                } | null | undefined;
                floor?: number | null | undefined;
            } | null | undefined;
            graphql?: {
                limit: number;
                used: number;
                resets: number | null;
                remaining: number;
                share?: {
                    limit: number;
                    used: number;
                } | null | undefined;
                floor?: number | null | undefined;
            } | null | undefined;
            paused?: boolean | undefined;
            until?: number | null | undefined;
        }>>>;
    }, "strip", z.ZodTypeAny, {
        account: {
            at: number | null;
            why: string;
            login: string | null;
            core: {
                limit: number;
                used: number;
                resets: number | null;
                remaining: number;
                share: {
                    limit: number;
                    used: number;
                } | null;
                floor: number | null;
            } | null;
            graphql: {
                limit: number;
                used: number;
                resets: number | null;
                remaining: number;
                share: {
                    limit: number;
                    used: number;
                } | null;
                floor: number | null;
            } | null;
            paused: boolean;
            until: number | null;
        } | null;
    }, {
        account?: {
            at?: number | null | undefined;
            why?: string | undefined;
            login?: string | null | undefined;
            core?: {
                limit: number;
                used: number;
                resets: number | null;
                remaining: number;
                share?: {
                    limit: number;
                    used: number;
                } | null | undefined;
                floor?: number | null | undefined;
            } | null | undefined;
            graphql?: {
                limit: number;
                used: number;
                resets: number | null;
                remaining: number;
                share?: {
                    limit: number;
                    used: number;
                } | null | undefined;
                floor?: number | null | undefined;
            } | null | undefined;
            paused?: boolean | undefined;
            until?: number | null | undefined;
        } | null | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    github?: {
        account: {
            at: number | null;
            why: string;
            login: string | null;
            core: {
                limit: number;
                used: number;
                resets: number | null;
                remaining: number;
                share: {
                    limit: number;
                    used: number;
                } | null;
                floor: number | null;
            } | null;
            graphql: {
                limit: number;
                used: number;
                resets: number | null;
                remaining: number;
                share: {
                    limit: number;
                    used: number;
                } | null;
                floor: number | null;
            } | null;
            paused: boolean;
            until: number | null;
        } | null;
        anonymous: {
            name: string;
            limit: number;
            note: string;
            used: number;
            left: number;
            resets: number | null;
        } | null;
    } | undefined;
    gitlab?: {
        account: {
            at: number | null;
            why: string;
            login: string | null;
            core: {
                limit: number;
                used: number;
                resets: number | null;
                remaining: number;
                share: {
                    limit: number;
                    used: number;
                } | null;
                floor: number | null;
            } | null;
            graphql: {
                limit: number;
                used: number;
                resets: number | null;
                remaining: number;
                share: {
                    limit: number;
                    used: number;
                } | null;
                floor: number | null;
            } | null;
            paused: boolean;
            until: number | null;
        } | null;
    } | undefined;
}, {
    github?: {
        account?: {
            at?: number | null | undefined;
            why?: string | undefined;
            login?: string | null | undefined;
            core?: {
                limit: number;
                used: number;
                resets: number | null;
                remaining: number;
                share?: {
                    limit: number;
                    used: number;
                } | null | undefined;
                floor?: number | null | undefined;
            } | null | undefined;
            graphql?: {
                limit: number;
                used: number;
                resets: number | null;
                remaining: number;
                share?: {
                    limit: number;
                    used: number;
                } | null | undefined;
                floor?: number | null | undefined;
            } | null | undefined;
            paused?: boolean | undefined;
            until?: number | null | undefined;
        } | null | undefined;
        anonymous?: {
            name: string;
            limit: number;
            used: number;
            left: number;
            resets: number | null;
            note?: string | undefined;
        } | null | undefined;
    } | undefined;
    gitlab?: {
        account?: {
            at?: number | null | undefined;
            why?: string | undefined;
            login?: string | null | undefined;
            core?: {
                limit: number;
                used: number;
                resets: number | null;
                remaining: number;
                share?: {
                    limit: number;
                    used: number;
                } | null | undefined;
                floor?: number | null | undefined;
            } | null | undefined;
            graphql?: {
                limit: number;
                used: number;
                resets: number | null;
                remaining: number;
                share?: {
                    limit: number;
                    used: number;
                } | null | undefined;
                floor?: number | null | undefined;
            } | null | undefined;
            paused?: boolean | undefined;
            until?: number | null | undefined;
        } | null | undefined;
    } | undefined;
}>;
export type TrafficLimits = z.infer<typeof trafficLimitsSchema>;
/**
 * One connection open on a process of `by` when the host last looked (`processes`). `remote` is the
 * other end's address (a name when the host looked it up cheaply), `bytesIn`/`bytesOut` what the
 * connection carried since it opened, absent when the host cannot see bytes.
 */
export declare const trafficConnectionSchema: z.ZodObject<{
    by: z.ZodString;
    pid: z.ZodNumber;
    process: z.ZodString;
    proto: z.ZodEnum<["tcp", "udp"]>;
    remote: z.ZodString;
    port: z.ZodNumber;
    /** Whether the other end is this computer. */
    local: z.ZodBoolean;
    bytesIn: z.ZodOptional<z.ZodNumber>;
    bytesOut: z.ZodOptional<z.ZodNumber>;
    /** When the host first saw it open. */
    since: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    since: number;
    by: string;
    process: string;
    remote: string;
    pid: number;
    proto: "tcp" | "udp";
    port: number;
    local: boolean;
    bytesIn?: number | undefined;
    bytesOut?: number | undefined;
}, {
    since: number;
    by: string;
    process: string;
    remote: string;
    pid: number;
    proto: "tcp" | "udp";
    port: number;
    local: boolean;
    bytesIn?: number | undefined;
    bytesOut?: number | undefined;
}>;
export type TrafficConnection = z.infer<typeof trafficConnectionSchema>;
/**
 * What the host can see of its processes' connections. `on`: it is looking (only while somebody
 * reads with `sample: true`). `bytes`: whether it can see what they carried. `why`: a sentence when
 * it cannot look, or cannot see bytes.
 */
export declare const trafficProcessesSchema: z.ZodObject<{
    on: z.ZodBoolean;
    bytes: z.ZodBoolean;
    at: z.ZodNullable<z.ZodNumber>;
    why: z.ZodDefault<z.ZodString>;
    connections: z.ZodDefault<z.ZodArray<z.ZodObject<{
        by: z.ZodString;
        pid: z.ZodNumber;
        process: z.ZodString;
        proto: z.ZodEnum<["tcp", "udp"]>;
        remote: z.ZodString;
        port: z.ZodNumber;
        /** Whether the other end is this computer. */
        local: z.ZodBoolean;
        bytesIn: z.ZodOptional<z.ZodNumber>;
        bytesOut: z.ZodOptional<z.ZodNumber>;
        /** When the host first saw it open. */
        since: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        since: number;
        by: string;
        process: string;
        remote: string;
        pid: number;
        proto: "tcp" | "udp";
        port: number;
        local: boolean;
        bytesIn?: number | undefined;
        bytesOut?: number | undefined;
    }, {
        since: number;
        by: string;
        process: string;
        remote: string;
        pid: number;
        proto: "tcp" | "udp";
        port: number;
        local: boolean;
        bytesIn?: number | undefined;
        bytesOut?: number | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    at: number | null;
    why: string;
    on: boolean;
    bytes: boolean;
    connections: {
        since: number;
        by: string;
        process: string;
        remote: string;
        pid: number;
        proto: "tcp" | "udp";
        port: number;
        local: boolean;
        bytesIn?: number | undefined;
        bytesOut?: number | undefined;
    }[];
}, {
    at: number | null;
    on: boolean;
    bytes: boolean;
    why?: string | undefined;
    connections?: {
        since: number;
        by: string;
        process: string;
        remote: string;
        pid: number;
        proto: "tcp" | "udp";
        port: number;
        local: boolean;
        bytesIn?: number | undefined;
        bytesOut?: number | undefined;
    }[] | undefined;
}>;
export type TrafficProcesses = z.infer<typeof trafficProcessesSchema>;
/**
 * `traffic.read`'s answer. `calls`: the rows after `since`, oldest first, at most `limit`. `newest`:
 * the last `seq` written (ask again with it as `since`). `oldest`: the first still kept; a `since`
 * older than it lost rows, and `gap` says so. `kept`: how many rows the host keeps at most.
 * `started`: when this host started recording; a host that restarted starts `seq` again, so a reader
 * whose `since` is past `newest` starts over.
 */
export declare const trafficReadResult: z.ZodObject<{
    calls: z.ZodArray<z.ZodObject<{
        at: z.ZodNumber;
        ms: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        reason: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        kind: z.ZodString;
        host: z.ZodString;
        path: z.ZodString;
        status: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        ok: z.ZodDefault<z.ZodNullable<z.ZodBoolean>>;
        bytesIn: z.ZodOptional<z.ZodNumber>;
        bytesOut: z.ZodOptional<z.ZodNumber>;
        cache: z.ZodOptional<z.ZodEnum<["hit", "not-modified", "refused"]>>;
    } & {
        seq: z.ZodNumber;
        by: z.ZodString;
        via: z.ZodEnum<["server", "page", "process"]>;
        side: z.ZodEnum<["out", "in", "seen"]>;
        reported: z.ZodEnum<["host", "module", "sampled"]>;
        /** Absent from a host before 2.25.0 and from rows it did not receive; dropped, not fatal, when it does not parse. */
        caller: z.ZodCatch<z.ZodOptional<z.ZodObject<{
            kind: z.ZodEnum<["host", "module", "session", "program", "remote", "gone"]>;
            name: z.ZodString;
            how: z.ZodEnum<["route", "origin", "token", "process", "address", "closed"]>;
            process: z.ZodOptional<z.ZodString>;
            parent: z.ZodOptional<z.ZodString>;
            place: z.ZodOptional<z.ZodString>;
            pid: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            kind: "module" | "session" | "host" | "program" | "remote" | "gone";
            how: "token" | "closed" | "address" | "origin" | "process" | "route";
            place?: string | undefined;
            process?: string | undefined;
            parent?: string | undefined;
            pid?: number | undefined;
        }, {
            name: string;
            kind: "module" | "session" | "host" | "program" | "remote" | "gone";
            how: "token" | "closed" | "address" | "origin" | "process" | "route";
            place?: string | undefined;
            process?: string | undefined;
            parent?: string | undefined;
            pid?: number | undefined;
        }>>>;
    }, "strip", z.ZodTypeAny, {
        at: number;
        path: string;
        status: number | null;
        by: string;
        host: string;
        kind: string;
        reason: string | null;
        side: "out" | "in" | "seen";
        ok: boolean | null;
        ms: number | null;
        seq: number;
        via: "page" | "server" | "process";
        reported: "module" | "host" | "sampled";
        bytesIn?: number | undefined;
        bytesOut?: number | undefined;
        cache?: "refused" | "hit" | "not-modified" | undefined;
        caller?: {
            name: string;
            kind: "module" | "session" | "host" | "program" | "remote" | "gone";
            how: "token" | "closed" | "address" | "origin" | "process" | "route";
            place?: string | undefined;
            process?: string | undefined;
            parent?: string | undefined;
            pid?: number | undefined;
        } | undefined;
    }, {
        at: number;
        path: string;
        by: string;
        host: string;
        kind: string;
        side: "out" | "in" | "seen";
        seq: number;
        via: "page" | "server" | "process";
        reported: "module" | "host" | "sampled";
        status?: number | null | undefined;
        reason?: string | null | undefined;
        ok?: boolean | null | undefined;
        ms?: number | null | undefined;
        bytesIn?: number | undefined;
        bytesOut?: number | undefined;
        cache?: "refused" | "hit" | "not-modified" | undefined;
        caller?: unknown;
    }>, "many">;
    newest: z.ZodNumber;
    oldest: z.ZodNumber;
    gap: z.ZodDefault<z.ZodBoolean>;
    kept: z.ZodNumber;
    started: z.ZodNumber;
    budgets: z.ZodDefault<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        used: z.ZodNumber;
        limit: z.ZodNumber;
        left: z.ZodNumber;
        resets: z.ZodNullable<z.ZodNumber>;
        /** A sentence: whose allowance it is, or why it is not counted. */
        note: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        limit: number;
        note: string;
        used: number;
        left: number;
        resets: number | null;
    }, {
        name: string;
        limit: number;
        used: number;
        left: number;
        resets: number | null;
        note?: string | undefined;
    }>, "many">>;
    processes: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        on: z.ZodBoolean;
        bytes: z.ZodBoolean;
        at: z.ZodNullable<z.ZodNumber>;
        why: z.ZodDefault<z.ZodString>;
        connections: z.ZodDefault<z.ZodArray<z.ZodObject<{
            by: z.ZodString;
            pid: z.ZodNumber;
            process: z.ZodString;
            proto: z.ZodEnum<["tcp", "udp"]>;
            remote: z.ZodString;
            port: z.ZodNumber;
            /** Whether the other end is this computer. */
            local: z.ZodBoolean;
            bytesIn: z.ZodOptional<z.ZodNumber>;
            bytesOut: z.ZodOptional<z.ZodNumber>;
            /** When the host first saw it open. */
            since: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            since: number;
            by: string;
            process: string;
            remote: string;
            pid: number;
            proto: "tcp" | "udp";
            port: number;
            local: boolean;
            bytesIn?: number | undefined;
            bytesOut?: number | undefined;
        }, {
            since: number;
            by: string;
            process: string;
            remote: string;
            pid: number;
            proto: "tcp" | "udp";
            port: number;
            local: boolean;
            bytesIn?: number | undefined;
            bytesOut?: number | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        at: number | null;
        why: string;
        on: boolean;
        bytes: boolean;
        connections: {
            since: number;
            by: string;
            process: string;
            remote: string;
            pid: number;
            proto: "tcp" | "udp";
            port: number;
            local: boolean;
            bytesIn?: number | undefined;
            bytesOut?: number | undefined;
        }[];
    }, {
        at: number | null;
        on: boolean;
        bytes: boolean;
        why?: string | undefined;
        connections?: {
            since: number;
            by: string;
            process: string;
            remote: string;
            pid: number;
            proto: "tcp" | "udp";
            port: number;
            local: boolean;
            bytesIn?: number | undefined;
            bytesOut?: number | undefined;
        }[] | undefined;
    }>>>;
    /**
     * Each forge's budgets, separately (2.24.0; `trafficLimitsSchema`). Absent from a host before
     * 2.24.0, which says only `budgets`; a host that has it still fills `budgets`, so an older reader
     * keeps working. One that does not parse is dropped, not fatal.
     */
    limits: z.ZodCatch<z.ZodOptional<z.ZodObject<{
        github: z.ZodOptional<z.ZodObject<{
            account: z.ZodDefault<z.ZodNullable<z.ZodObject<{
                login: z.ZodDefault<z.ZodNullable<z.ZodString>>;
                core: z.ZodDefault<z.ZodNullable<z.ZodObject<{
                    limit: z.ZodNumber;
                    used: z.ZodNumber;
                    remaining: z.ZodNumber;
                    resets: z.ZodNullable<z.ZodNumber>;
                    share: z.ZodDefault<z.ZodNullable<z.ZodObject<{
                        limit: z.ZodNumber;
                        used: z.ZodNumber;
                    }, "strip", z.ZodTypeAny, {
                        limit: number;
                        used: number;
                    }, {
                        limit: number;
                        used: number;
                    }>>>;
                    floor: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                }, "strip", z.ZodTypeAny, {
                    limit: number;
                    used: number;
                    resets: number | null;
                    remaining: number;
                    share: {
                        limit: number;
                        used: number;
                    } | null;
                    floor: number | null;
                }, {
                    limit: number;
                    used: number;
                    resets: number | null;
                    remaining: number;
                    share?: {
                        limit: number;
                        used: number;
                    } | null | undefined;
                    floor?: number | null | undefined;
                }>>>;
                graphql: z.ZodDefault<z.ZodNullable<z.ZodObject<{
                    limit: z.ZodNumber;
                    used: z.ZodNumber;
                    remaining: z.ZodNumber;
                    resets: z.ZodNullable<z.ZodNumber>;
                    share: z.ZodDefault<z.ZodNullable<z.ZodObject<{
                        limit: z.ZodNumber;
                        used: z.ZodNumber;
                    }, "strip", z.ZodTypeAny, {
                        limit: number;
                        used: number;
                    }, {
                        limit: number;
                        used: number;
                    }>>>;
                    floor: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                }, "strip", z.ZodTypeAny, {
                    limit: number;
                    used: number;
                    resets: number | null;
                    remaining: number;
                    share: {
                        limit: number;
                        used: number;
                    } | null;
                    floor: number | null;
                }, {
                    limit: number;
                    used: number;
                    resets: number | null;
                    remaining: number;
                    share?: {
                        limit: number;
                        used: number;
                    } | null | undefined;
                    floor?: number | null | undefined;
                }>>>;
                paused: z.ZodDefault<z.ZodBoolean>;
                why: z.ZodDefault<z.ZodString>;
                until: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                at: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            }, "strip", z.ZodTypeAny, {
                at: number | null;
                why: string;
                login: string | null;
                core: {
                    limit: number;
                    used: number;
                    resets: number | null;
                    remaining: number;
                    share: {
                        limit: number;
                        used: number;
                    } | null;
                    floor: number | null;
                } | null;
                graphql: {
                    limit: number;
                    used: number;
                    resets: number | null;
                    remaining: number;
                    share: {
                        limit: number;
                        used: number;
                    } | null;
                    floor: number | null;
                } | null;
                paused: boolean;
                until: number | null;
            }, {
                at?: number | null | undefined;
                why?: string | undefined;
                login?: string | null | undefined;
                core?: {
                    limit: number;
                    used: number;
                    resets: number | null;
                    remaining: number;
                    share?: {
                        limit: number;
                        used: number;
                    } | null | undefined;
                    floor?: number | null | undefined;
                } | null | undefined;
                graphql?: {
                    limit: number;
                    used: number;
                    resets: number | null;
                    remaining: number;
                    share?: {
                        limit: number;
                        used: number;
                    } | null | undefined;
                    floor?: number | null | undefined;
                } | null | undefined;
                paused?: boolean | undefined;
                until?: number | null | undefined;
            }>>>;
            anonymous: z.ZodDefault<z.ZodNullable<z.ZodObject<{
                name: z.ZodString;
                used: z.ZodNumber;
                limit: z.ZodNumber;
                left: z.ZodNumber;
                resets: z.ZodNullable<z.ZodNumber>;
                /** A sentence: whose allowance it is, or why it is not counted. */
                note: z.ZodDefault<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                name: string;
                limit: number;
                note: string;
                used: number;
                left: number;
                resets: number | null;
            }, {
                name: string;
                limit: number;
                used: number;
                left: number;
                resets: number | null;
                note?: string | undefined;
            }>>>;
        }, "strip", z.ZodTypeAny, {
            account: {
                at: number | null;
                why: string;
                login: string | null;
                core: {
                    limit: number;
                    used: number;
                    resets: number | null;
                    remaining: number;
                    share: {
                        limit: number;
                        used: number;
                    } | null;
                    floor: number | null;
                } | null;
                graphql: {
                    limit: number;
                    used: number;
                    resets: number | null;
                    remaining: number;
                    share: {
                        limit: number;
                        used: number;
                    } | null;
                    floor: number | null;
                } | null;
                paused: boolean;
                until: number | null;
            } | null;
            anonymous: {
                name: string;
                limit: number;
                note: string;
                used: number;
                left: number;
                resets: number | null;
            } | null;
        }, {
            account?: {
                at?: number | null | undefined;
                why?: string | undefined;
                login?: string | null | undefined;
                core?: {
                    limit: number;
                    used: number;
                    resets: number | null;
                    remaining: number;
                    share?: {
                        limit: number;
                        used: number;
                    } | null | undefined;
                    floor?: number | null | undefined;
                } | null | undefined;
                graphql?: {
                    limit: number;
                    used: number;
                    resets: number | null;
                    remaining: number;
                    share?: {
                        limit: number;
                        used: number;
                    } | null | undefined;
                    floor?: number | null | undefined;
                } | null | undefined;
                paused?: boolean | undefined;
                until?: number | null | undefined;
            } | null | undefined;
            anonymous?: {
                name: string;
                limit: number;
                used: number;
                left: number;
                resets: number | null;
                note?: string | undefined;
            } | null | undefined;
        }>>;
        gitlab: z.ZodOptional<z.ZodObject<{
            account: z.ZodDefault<z.ZodNullable<z.ZodObject<{
                login: z.ZodDefault<z.ZodNullable<z.ZodString>>;
                core: z.ZodDefault<z.ZodNullable<z.ZodObject<{
                    limit: z.ZodNumber;
                    used: z.ZodNumber;
                    remaining: z.ZodNumber;
                    resets: z.ZodNullable<z.ZodNumber>;
                    share: z.ZodDefault<z.ZodNullable<z.ZodObject<{
                        limit: z.ZodNumber;
                        used: z.ZodNumber;
                    }, "strip", z.ZodTypeAny, {
                        limit: number;
                        used: number;
                    }, {
                        limit: number;
                        used: number;
                    }>>>;
                    floor: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                }, "strip", z.ZodTypeAny, {
                    limit: number;
                    used: number;
                    resets: number | null;
                    remaining: number;
                    share: {
                        limit: number;
                        used: number;
                    } | null;
                    floor: number | null;
                }, {
                    limit: number;
                    used: number;
                    resets: number | null;
                    remaining: number;
                    share?: {
                        limit: number;
                        used: number;
                    } | null | undefined;
                    floor?: number | null | undefined;
                }>>>;
                graphql: z.ZodDefault<z.ZodNullable<z.ZodObject<{
                    limit: z.ZodNumber;
                    used: z.ZodNumber;
                    remaining: z.ZodNumber;
                    resets: z.ZodNullable<z.ZodNumber>;
                    share: z.ZodDefault<z.ZodNullable<z.ZodObject<{
                        limit: z.ZodNumber;
                        used: z.ZodNumber;
                    }, "strip", z.ZodTypeAny, {
                        limit: number;
                        used: number;
                    }, {
                        limit: number;
                        used: number;
                    }>>>;
                    floor: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                }, "strip", z.ZodTypeAny, {
                    limit: number;
                    used: number;
                    resets: number | null;
                    remaining: number;
                    share: {
                        limit: number;
                        used: number;
                    } | null;
                    floor: number | null;
                }, {
                    limit: number;
                    used: number;
                    resets: number | null;
                    remaining: number;
                    share?: {
                        limit: number;
                        used: number;
                    } | null | undefined;
                    floor?: number | null | undefined;
                }>>>;
                paused: z.ZodDefault<z.ZodBoolean>;
                why: z.ZodDefault<z.ZodString>;
                until: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                at: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            }, "strip", z.ZodTypeAny, {
                at: number | null;
                why: string;
                login: string | null;
                core: {
                    limit: number;
                    used: number;
                    resets: number | null;
                    remaining: number;
                    share: {
                        limit: number;
                        used: number;
                    } | null;
                    floor: number | null;
                } | null;
                graphql: {
                    limit: number;
                    used: number;
                    resets: number | null;
                    remaining: number;
                    share: {
                        limit: number;
                        used: number;
                    } | null;
                    floor: number | null;
                } | null;
                paused: boolean;
                until: number | null;
            }, {
                at?: number | null | undefined;
                why?: string | undefined;
                login?: string | null | undefined;
                core?: {
                    limit: number;
                    used: number;
                    resets: number | null;
                    remaining: number;
                    share?: {
                        limit: number;
                        used: number;
                    } | null | undefined;
                    floor?: number | null | undefined;
                } | null | undefined;
                graphql?: {
                    limit: number;
                    used: number;
                    resets: number | null;
                    remaining: number;
                    share?: {
                        limit: number;
                        used: number;
                    } | null | undefined;
                    floor?: number | null | undefined;
                } | null | undefined;
                paused?: boolean | undefined;
                until?: number | null | undefined;
            }>>>;
        }, "strip", z.ZodTypeAny, {
            account: {
                at: number | null;
                why: string;
                login: string | null;
                core: {
                    limit: number;
                    used: number;
                    resets: number | null;
                    remaining: number;
                    share: {
                        limit: number;
                        used: number;
                    } | null;
                    floor: number | null;
                } | null;
                graphql: {
                    limit: number;
                    used: number;
                    resets: number | null;
                    remaining: number;
                    share: {
                        limit: number;
                        used: number;
                    } | null;
                    floor: number | null;
                } | null;
                paused: boolean;
                until: number | null;
            } | null;
        }, {
            account?: {
                at?: number | null | undefined;
                why?: string | undefined;
                login?: string | null | undefined;
                core?: {
                    limit: number;
                    used: number;
                    resets: number | null;
                    remaining: number;
                    share?: {
                        limit: number;
                        used: number;
                    } | null | undefined;
                    floor?: number | null | undefined;
                } | null | undefined;
                graphql?: {
                    limit: number;
                    used: number;
                    resets: number | null;
                    remaining: number;
                    share?: {
                        limit: number;
                        used: number;
                    } | null | undefined;
                    floor?: number | null | undefined;
                } | null | undefined;
                paused?: boolean | undefined;
                until?: number | null | undefined;
            } | null | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        github?: {
            account: {
                at: number | null;
                why: string;
                login: string | null;
                core: {
                    limit: number;
                    used: number;
                    resets: number | null;
                    remaining: number;
                    share: {
                        limit: number;
                        used: number;
                    } | null;
                    floor: number | null;
                } | null;
                graphql: {
                    limit: number;
                    used: number;
                    resets: number | null;
                    remaining: number;
                    share: {
                        limit: number;
                        used: number;
                    } | null;
                    floor: number | null;
                } | null;
                paused: boolean;
                until: number | null;
            } | null;
            anonymous: {
                name: string;
                limit: number;
                note: string;
                used: number;
                left: number;
                resets: number | null;
            } | null;
        } | undefined;
        gitlab?: {
            account: {
                at: number | null;
                why: string;
                login: string | null;
                core: {
                    limit: number;
                    used: number;
                    resets: number | null;
                    remaining: number;
                    share: {
                        limit: number;
                        used: number;
                    } | null;
                    floor: number | null;
                } | null;
                graphql: {
                    limit: number;
                    used: number;
                    resets: number | null;
                    remaining: number;
                    share: {
                        limit: number;
                        used: number;
                    } | null;
                    floor: number | null;
                } | null;
                paused: boolean;
                until: number | null;
            } | null;
        } | undefined;
    }, {
        github?: {
            account?: {
                at?: number | null | undefined;
                why?: string | undefined;
                login?: string | null | undefined;
                core?: {
                    limit: number;
                    used: number;
                    resets: number | null;
                    remaining: number;
                    share?: {
                        limit: number;
                        used: number;
                    } | null | undefined;
                    floor?: number | null | undefined;
                } | null | undefined;
                graphql?: {
                    limit: number;
                    used: number;
                    resets: number | null;
                    remaining: number;
                    share?: {
                        limit: number;
                        used: number;
                    } | null | undefined;
                    floor?: number | null | undefined;
                } | null | undefined;
                paused?: boolean | undefined;
                until?: number | null | undefined;
            } | null | undefined;
            anonymous?: {
                name: string;
                limit: number;
                used: number;
                left: number;
                resets: number | null;
                note?: string | undefined;
            } | null | undefined;
        } | undefined;
        gitlab?: {
            account?: {
                at?: number | null | undefined;
                why?: string | undefined;
                login?: string | null | undefined;
                core?: {
                    limit: number;
                    used: number;
                    resets: number | null;
                    remaining: number;
                    share?: {
                        limit: number;
                        used: number;
                    } | null | undefined;
                    floor?: number | null | undefined;
                } | null | undefined;
                graphql?: {
                    limit: number;
                    used: number;
                    resets: number | null;
                    remaining: number;
                    share?: {
                        limit: number;
                        used: number;
                    } | null | undefined;
                    floor?: number | null | undefined;
                } | null | undefined;
                paused?: boolean | undefined;
                until?: number | null | undefined;
            } | null | undefined;
        } | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    started: number;
    calls: {
        at: number;
        path: string;
        status: number | null;
        by: string;
        host: string;
        kind: string;
        reason: string | null;
        side: "out" | "in" | "seen";
        ok: boolean | null;
        ms: number | null;
        seq: number;
        via: "page" | "server" | "process";
        reported: "module" | "host" | "sampled";
        bytesIn?: number | undefined;
        bytesOut?: number | undefined;
        cache?: "refused" | "hit" | "not-modified" | undefined;
        caller?: {
            name: string;
            kind: "module" | "session" | "host" | "program" | "remote" | "gone";
            how: "token" | "closed" | "address" | "origin" | "process" | "route";
            place?: string | undefined;
            process?: string | undefined;
            parent?: string | undefined;
            pid?: number | undefined;
        } | undefined;
    }[];
    newest: number;
    oldest: number;
    gap: boolean;
    kept: number;
    budgets: {
        name: string;
        limit: number;
        note: string;
        used: number;
        left: number;
        resets: number | null;
    }[];
    processes: {
        at: number | null;
        why: string;
        on: boolean;
        bytes: boolean;
        connections: {
            since: number;
            by: string;
            process: string;
            remote: string;
            pid: number;
            proto: "tcp" | "udp";
            port: number;
            local: boolean;
            bytesIn?: number | undefined;
            bytesOut?: number | undefined;
        }[];
    } | null;
    limits?: {
        github?: {
            account: {
                at: number | null;
                why: string;
                login: string | null;
                core: {
                    limit: number;
                    used: number;
                    resets: number | null;
                    remaining: number;
                    share: {
                        limit: number;
                        used: number;
                    } | null;
                    floor: number | null;
                } | null;
                graphql: {
                    limit: number;
                    used: number;
                    resets: number | null;
                    remaining: number;
                    share: {
                        limit: number;
                        used: number;
                    } | null;
                    floor: number | null;
                } | null;
                paused: boolean;
                until: number | null;
            } | null;
            anonymous: {
                name: string;
                limit: number;
                note: string;
                used: number;
                left: number;
                resets: number | null;
            } | null;
        } | undefined;
        gitlab?: {
            account: {
                at: number | null;
                why: string;
                login: string | null;
                core: {
                    limit: number;
                    used: number;
                    resets: number | null;
                    remaining: number;
                    share: {
                        limit: number;
                        used: number;
                    } | null;
                    floor: number | null;
                } | null;
                graphql: {
                    limit: number;
                    used: number;
                    resets: number | null;
                    remaining: number;
                    share: {
                        limit: number;
                        used: number;
                    } | null;
                    floor: number | null;
                } | null;
                paused: boolean;
                until: number | null;
            } | null;
        } | undefined;
    } | undefined;
}, {
    started: number;
    calls: {
        at: number;
        path: string;
        by: string;
        host: string;
        kind: string;
        side: "out" | "in" | "seen";
        seq: number;
        via: "page" | "server" | "process";
        reported: "module" | "host" | "sampled";
        status?: number | null | undefined;
        reason?: string | null | undefined;
        ok?: boolean | null | undefined;
        ms?: number | null | undefined;
        bytesIn?: number | undefined;
        bytesOut?: number | undefined;
        cache?: "refused" | "hit" | "not-modified" | undefined;
        caller?: unknown;
    }[];
    newest: number;
    oldest: number;
    kept: number;
    gap?: boolean | undefined;
    budgets?: {
        name: string;
        limit: number;
        used: number;
        left: number;
        resets: number | null;
        note?: string | undefined;
    }[] | undefined;
    processes?: {
        at: number | null;
        on: boolean;
        bytes: boolean;
        why?: string | undefined;
        connections?: {
            since: number;
            by: string;
            process: string;
            remote: string;
            pid: number;
            proto: "tcp" | "udp";
            port: number;
            local: boolean;
            bytesIn?: number | undefined;
            bytesOut?: number | undefined;
        }[] | undefined;
    } | null | undefined;
    limits?: unknown;
}>;
export type TrafficReadResult = z.infer<typeof trafficReadResult>;
/** `traffic.note`'s answer: `taken` with how many rows were written, or `declined` with a sentence. */
export declare const TRAFFIC_NOTE_OUTCOMES: readonly ["taken", "declined"];
export declare const trafficNoteResult: z.ZodObject<{
    outcome: z.ZodEnum<["taken", "declined"]>;
    taken: z.ZodDefault<z.ZodNumber>;
    why: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    outcome: "declined" | "taken";
    why: string;
    taken: number;
}, {
    outcome: "declined" | "taken";
    why?: string | undefined;
    taken?: number | undefined;
}>;
export type TrafficNoteResult = z.infer<typeof trafficNoteResult>;
/** What stands in for anything taken out of an address: a query value, a token in the path. */
export declare const TRAFFIC_REDACTED = "\u2026";
/**
 * Whether one path segment (or a value) looks like a secret: a known credential prefix, a JWT, or a
 * long run of token characters that mixes letters and digits. A commit sha (40 hex) is a secret by
 * this rule too: it is cheap to lose, and telling the two apart is not worth a leak.
 */
export declare function looksSecret(segment: string): boolean;
/**
 * The path and query of a request as it may be recorded: segments that look like secrets replaced,
 * every query value taken out (keys kept, `?page=…`), the fragment dropped, and bounded at
 * `LIMITS.TRAFFIC_PATH`. For a path a host received; `trafficTarget` for a whole address.
 */
export declare function trafficPath(pathAndQuery: string): string;
/**
 * Where a call went, as it may be recorded: `host` (the name, and the port when it is not the
 * scheme's) and `path` (`trafficPath`). Never the user, the password, a query value or the fragment.
 * Takes a URL, a git remote in scp form (`git@github.com:owner/repo.git`) or a bare host name;
 * anything else is `{ host: '', path: '' }`. Pure; never throws.
 */
export declare function trafficTarget(address: string | URL): {
    host: string;
    path: string;
};
/** What `trafficCommand` makes of a program run: its kind (`git fetch`, `gh api`) and where it went. */
export interface TrafficCommand {
    kind: string;
    host: string;
    path: string;
}
/**
 * Whether a program run went over the network, and how it is recorded: `git fetch`/`clone`/
 * `ls-remote`/`pull`/`push` (`host` and `path` from the remote when it is an address; a remote NAME
 * is recorded as written, with no host), `gh <command>` (`gh api <path>`, `api.github.com` or
 * `--hostname`), `glab <command>`. Null for anything else — `git rev-parse` reads a disk, not a
 * network. Arguments that are not the remote or the API path are never recorded. Pure.
 */
export declare function trafficCommand(argv: readonly string[]): TrafficCommand | null;
