import { z } from 'zod';
/**
 * What a module's MCP door agrees with every other module's: how its tools spell the two context
 * arguments, how a tool says whether it only reads, and the shape of the two answers a caller acts
 * on without reading prose — "was it shown?" and "is it done?". Shapes and pure functions; the
 * door itself, and whoever calls it, are elsewhere. Which tool is which is the manifest's
 * `mcp.subjects`. Design notes: docs/asking.md.
 */
/**
 * The two context arguments, in their one spelling. `project` is the ABSOLUTE DIRECTORY of the
 * project (what `context.projectPath` carries, not the name in `context.project`); `epic` is the
 * epic's slug (`context.epic`). A caller fills them from the context it stands in.
 */
export declare const DOOR_ARGUMENTS: {
    readonly project: "project";
    readonly epic: "epic";
};
export type DoorArgument = keyof typeof DOOR_ARGUMENTS;
/**
 * The spelling some doors used for the project before there was one. Read by `doorContext`, never
 * advertised in an `inputSchema`. Goes when the next breaking release does.
 */
export declare const DOOR_ARGUMENTS_BEFORE: Readonly<Record<DoorArgument, readonly string[]>>;
/**
 * The context a tool call names: `project` and `epic` in the one spelling, or under a name the
 * door took before (`before`, by default `DOOR_ARGUMENTS_BEFORE`). The current spelling wins.
 * `deprecated` lists the old names this call used, so a door can say so in its answer. Pure.
 */
export declare function doorContext(args: Record<string, unknown>, before?: Partial<Record<DoorArgument, readonly string[]>>): {
    project: string | null;
    epic: string | null;
    deprecated: string[];
};
/**
 * The sentences a door says about the `project` it was handed, in one wording for every module
 * (2.3.0). `resolveDoorProject` in `/serve` says them; they are here, pure, so a door that asks its
 * own way says the same. A door works on the path it was GIVEN BACK, never on the argument.
 *
 * - `moved(to)`: the folder was a project and the project is now elsewhere, and the door would not
 *   follow it (the new path did not answer as the same project).
 * - `notProject(path)`: the host does not hold the folder (or no host answered).
 * - `unnamed`: the call named no project.
 * - `followed(from, to)`: the line a door ADDS to an answer after it followed a move, so the agent
 *   uses the new path from then on.
 */
export declare const DOOR_PROJECT_SAYS: {
    readonly moved: (to: string) => string;
    readonly notProject: (path: string) => string;
    readonly unnamed: "Name the project: `project` is its absolute folder.";
    readonly followed: (from: string, to: string) => string;
};
/**
 * The query parameter a session's place token travels in, on the URL of every Kehikot MCP door
 * the session is configured with: `http://127.0.0.1:4590/mcp?kehikot-place=<token>` (2.4.0).
 *
 * A token is a POINTER, not a credential: it names one conversation's record (project, epic, parts, kehikko)
 * the issuing module keeps, and grants nothing a call without it could not already do by naming the
 * same place in its arguments. It is unguessable so that two sessions never share one by accident.
 * A query parameter rather than a header because a door's `answer` is handed the query
 * (`DoorsOptions.answer`) and every MCP client's config takes a URL.
 */
export declare const PLACE_PARAM = "kehikot-place";
/** A place token's spelling: 22 to 64 URL-safe characters (the issuing module mints 32 random bytes, base64url). */
export declare const PLACE_TOKEN: RegExp;
/** Where a person is looking now, as the host sends it beside a place: the same three fields, or null when no page is open. */
export declare const lookingSchema: z.ZodObject<{
    projectId: z.ZodCatch<z.ZodNullable<z.ZodString>>;
    project: z.ZodCatch<z.ZodNullable<z.ZodString>>;
    epic: z.ZodNullable<z.ZodString>;
    parts: z.ZodCatch<z.ZodArray<z.ZodString, "many">>;
    kehikko: z.ZodCatch<z.ZodNullable<z.ZodObject<{
        key: z.ZodString;
        name: z.ZodCatch<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        key: string;
        name?: string | undefined;
    }, {
        key: string;
        name?: unknown;
    }>>>;
}, "strip", z.ZodTypeAny, {
    epic: string | null;
    parts: string[];
    kehikko: {
        key: string;
        name?: string | undefined;
    } | null;
    project: string | null;
    projectId: string | null;
}, {
    epic: string | null;
    parts?: unknown;
    kehikko?: unknown;
    project?: unknown;
    projectId?: unknown;
}>;
export type Looking = z.infer<typeof lookingSchema>;
/**
 * One session's place, as the host answers `GET /host/place?kehikot-place=<token>` (2.4.0).
 * `project` is the folder the project is at NOW (a renamed folder is followed: the token keeps the
 * project's id). `epic` is null for a place with no epic; `parts` empty is the whole epic.
 * `looking` is what the person has on screen now, when a page of the host is open.
 */
export declare const doorPlaceSchema: z.ZodObject<{
    token: z.ZodString;
    /** The conversation the record is about (Claude Code's session id), when the record names one. */
    conversation: z.ZodCatch<z.ZodOptional<z.ZodString>>;
    projectId: z.ZodString;
    project: z.ZodString;
    projectName: z.ZodCatch<z.ZodOptional<z.ZodString>>;
    epic: z.ZodNullable<z.ZodString>;
    parts: z.ZodArray<z.ZodString, "many">;
    kehikko: z.ZodNullable<z.ZodObject<{
        key: z.ZodString;
        name: z.ZodCatch<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        key: string;
        name?: string | undefined;
    }, {
        key: string;
        name?: unknown;
    }>>;
    looking: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        projectId: z.ZodCatch<z.ZodNullable<z.ZodString>>;
        project: z.ZodCatch<z.ZodNullable<z.ZodString>>;
        epic: z.ZodNullable<z.ZodString>;
        parts: z.ZodCatch<z.ZodArray<z.ZodString, "many">>;
        kehikko: z.ZodCatch<z.ZodNullable<z.ZodObject<{
            key: z.ZodString;
            name: z.ZodCatch<z.ZodOptional<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            key: string;
            name?: string | undefined;
        }, {
            key: string;
            name?: unknown;
        }>>>;
    }, "strip", z.ZodTypeAny, {
        epic: string | null;
        parts: string[];
        kehikko: {
            key: string;
            name?: string | undefined;
        } | null;
        project: string | null;
        projectId: string | null;
    }, {
        epic: string | null;
        parts?: unknown;
        kehikko?: unknown;
        project?: unknown;
        projectId?: unknown;
    }>>>>;
}, "strip", z.ZodTypeAny, {
    epic: string | null;
    parts: string[];
    kehikko: {
        key: string;
        name?: string | undefined;
    } | null;
    project: string;
    projectId: string;
    token: string;
    conversation?: string | undefined;
    projectName?: string | undefined;
    looking?: {
        epic: string | null;
        parts: string[];
        kehikko: {
            key: string;
            name?: string | undefined;
        } | null;
        project: string | null;
        projectId: string | null;
    } | null | undefined;
}, {
    epic: string | null;
    parts: string[];
    kehikko: {
        key: string;
        name?: unknown;
    } | null;
    project: string;
    projectId: string;
    token: string;
    conversation?: unknown;
    projectName?: unknown;
    looking?: unknown;
}>;
export type DoorPlace = z.infer<typeof doorPlaceSchema>;
/** The host's answer at `/host/place`: the place, or `null` for a token it does not hold. */
export declare const placeResult: z.ZodObject<{
    ok: z.ZodLiteral<true>;
    place: z.ZodNullable<z.ZodObject<{
        token: z.ZodString;
        /** The conversation the record is about (Claude Code's session id), when the record names one. */
        conversation: z.ZodCatch<z.ZodOptional<z.ZodString>>;
        projectId: z.ZodString;
        project: z.ZodString;
        projectName: z.ZodCatch<z.ZodOptional<z.ZodString>>;
        epic: z.ZodNullable<z.ZodString>;
        parts: z.ZodArray<z.ZodString, "many">;
        kehikko: z.ZodNullable<z.ZodObject<{
            key: z.ZodString;
            name: z.ZodCatch<z.ZodOptional<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            key: string;
            name?: string | undefined;
        }, {
            key: string;
            name?: unknown;
        }>>;
        looking: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            projectId: z.ZodCatch<z.ZodNullable<z.ZodString>>;
            project: z.ZodCatch<z.ZodNullable<z.ZodString>>;
            epic: z.ZodNullable<z.ZodString>;
            parts: z.ZodCatch<z.ZodArray<z.ZodString, "many">>;
            kehikko: z.ZodCatch<z.ZodNullable<z.ZodObject<{
                key: z.ZodString;
                name: z.ZodCatch<z.ZodOptional<z.ZodString>>;
            }, "strip", z.ZodTypeAny, {
                key: string;
                name?: string | undefined;
            }, {
                key: string;
                name?: unknown;
            }>>>;
        }, "strip", z.ZodTypeAny, {
            epic: string | null;
            parts: string[];
            kehikko: {
                key: string;
                name?: string | undefined;
            } | null;
            project: string | null;
            projectId: string | null;
        }, {
            epic: string | null;
            parts?: unknown;
            kehikko?: unknown;
            project?: unknown;
            projectId?: unknown;
        }>>>>;
    }, "strip", z.ZodTypeAny, {
        epic: string | null;
        parts: string[];
        kehikko: {
            key: string;
            name?: string | undefined;
        } | null;
        project: string;
        projectId: string;
        token: string;
        conversation?: string | undefined;
        projectName?: string | undefined;
        looking?: {
            epic: string | null;
            parts: string[];
            kehikko: {
                key: string;
                name?: string | undefined;
            } | null;
            project: string | null;
            projectId: string | null;
        } | null | undefined;
    }, {
        epic: string | null;
        parts: string[];
        kehikko: {
            key: string;
            name?: unknown;
        } | null;
        project: string;
        projectId: string;
        token: string;
        conversation?: unknown;
        projectName?: unknown;
        looking?: unknown;
    }>>;
    /** With no place for a token the host knows: why (its module has no record, or did not answer). */
    why: z.ZodCatch<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    place: {
        epic: string | null;
        parts: string[];
        kehikko: {
            key: string;
            name?: string | undefined;
        } | null;
        project: string;
        projectId: string;
        token: string;
        conversation?: string | undefined;
        projectName?: string | undefined;
        looking?: {
            epic: string | null;
            parts: string[];
            kehikko: {
                key: string;
                name?: string | undefined;
            } | null;
            project: string | null;
            projectId: string | null;
        } | null | undefined;
    } | null;
    ok: true;
    why?: string | undefined;
}, {
    place: {
        epic: string | null;
        parts: string[];
        kehikko: {
            key: string;
            name?: unknown;
        } | null;
        project: string;
        projectId: string;
        token: string;
        conversation?: unknown;
        projectName?: unknown;
        looking?: unknown;
    } | null;
    ok: true;
    why?: unknown;
}>;
export type PlaceResult = z.infer<typeof placeResult>;
/**
 * A conversation's place is what a RECORD says (2.4.0), kept by the one that owns it: the module that
 * started the conversation keeps its own records (Claude's: which conversation belongs to which
 * place) and issues the token; the host keeps only which module issued a token, in which project.
 *
 * `POST /host/place` with this body: a module says it issued `token` for a conversation in `project`
 * (`projectId` preferred), started on `kehikko` (its key, or null). Programs on this machine only.
 */
export declare const placeIssueSchema: z.ZodObject<{
    module: z.ZodString;
    token: z.ZodString;
    project: z.ZodString;
    projectId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    kehikko: z.ZodNullable<z.ZodString>;
    /**
     * 2.41.0. `true`: this module says its session's unread messages in the notes (`sessionNotes`), so
     * hand them in the answer (`messages`) and count them delivered — the host moves the session's cursor
     * past what it hands. Absent: none are handed and the cursor stays, so a module that cannot say them
     * never makes them read.
     */
    messages: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    kehikko: string | null;
    project: string;
    module: string;
    token: string;
    projectId?: string | null | undefined;
    messages?: boolean | undefined;
}, {
    kehikko: string | null;
    project: string;
    module: string;
    token: string;
    projectId?: string | null | undefined;
    messages?: boolean | undefined;
}>;
export type PlaceIssue = z.infer<typeof placeIssueSchema>;
/**
 * The host's answer to an issue: every Kehikot MCP door the session should be given, each with the
 * token already on its URL — the host's own and those of the modules on that kehikko. `name` is the
 * server name the person's agent config already uses for that door when it has one (a per-session
 * config then replaces theirs by name), else the name the host would register it under.
 */
/**
 * One skill a host keeps installed for every conversation (2.23.0): which module offers it (the host's
 * own id for the host's own skills), its name and version as that module declares it, and the origin
 * its text is served at (`skillPath(name)` there). Never a kehikko-bound skill (one with `needs`),
 * and never the skills of another module that runs agent sessions: those are written for that
 * module's own agent.
 */
export declare const everywhereSkillSchema: z.ZodObject<{
    module: z.ZodString;
    name: z.ZodString;
    version: z.ZodString;
    origin: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    module: string;
    version: string;
    origin: string;
}, {
    name: string;
    module: string;
    version: string;
    origin: string;
}>;
export type EverywhereSkill = z.infer<typeof everywhereSkillSchema>;
export declare const placeDoorsSchema: z.ZodObject<{
    ok: z.ZodLiteral<true>;
    token: z.ZodString;
    doors: z.ZodArray<z.ZodObject<{
        module: z.ZodString;
        name: z.ZodString;
        url: z.ZodString;
        transport: z.ZodCatch<z.ZodEnum<["http", "sse"]>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        url: string;
        module: string;
        transport: "http" | "sse";
    }, {
        name: string;
        url: string;
        module: string;
        transport?: unknown;
    }>, "many">;
    /**
     * The skills this host keeps installed in the person's agent for every conversation, as its
     * settings say (2.23.0), for a module that installs skills itself (`installsSkills`) to keep the
     * same ones where its own agent reads them. Absent from a host before 2.23.0, and for a module
     * that does not install skills: then nothing is said about them, and a module changes nothing it
     * keeps for every conversation. Present and empty: the host keeps none. One that does not parse
     * is dropped, not fatal.
     */
    everywhere: z.ZodCatch<z.ZodOptional<z.ZodArray<z.ZodObject<{
        module: z.ZodString;
        name: z.ZodString;
        version: z.ZodString;
        origin: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        module: string;
        version: string;
        origin: string;
    }, {
        name: string;
        module: string;
        version: string;
        origin: string;
    }>, "many">>>;
    /**
     * The containers on the session's kehikko (2.36.0 gave it a shape; hosts sent it before), in the
     * order the canvas is read, each with its door's name in the session's config, its one line, what
     * it says to agents (`says`, its `agentSays`) and the skills it offers there. What the session is
     * told (`sessionNotes`). Absent: the host did not say; empty: nothing else is on the kehikko.
     */
    modules: z.ZodCatch<z.ZodOptional<z.ZodArray<z.ZodObject<{
        module: z.ZodString;
        name: z.ZodString;
        summary: z.ZodCatch<z.ZodString>;
        says: z.ZodCatch<z.ZodOptional<z.ZodString>>;
        door: z.ZodCatch<z.ZodNullable<z.ZodString>>;
        skills: z.ZodCatch<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        module: string;
        summary: string;
        door: string | null;
        skills: string[];
        says?: string | undefined;
    }, {
        name: string;
        module: string;
        says?: unknown;
        summary?: unknown;
        door?: unknown;
        skills?: unknown;
    }>, "many">>>;
    /**
     * The modules installed on this computer that are NOT on the session's kehikko and say something
     * to sessions there (`absentSays`, 2.36.0), each with that line. Only modules on the host's
     * official list. Absent: the host did not say (before 2.36.0, or the place has no kehikko).
     */
    absent: z.ZodCatch<z.ZodOptional<z.ZodArray<z.ZodObject<{
        module: z.ZodString;
        name: z.ZodString;
        says: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        says: string;
        module: string;
    }, {
        name: string;
        says: string;
        module: string;
    }>, "many">>>;
    /**
     * 2.41.0. The session's unread messages, oldest first, at most `NOTES_MESSAGES_MOST`, when the module
     * asked with `messages: true`: now counted delivered, for the notes (`NotesInput.messages`). Present
     * (maybe empty) from a host that keeps messages; absent from an older one — then the module offers
     * no message tools.
     */
    messages: z.ZodCatch<z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        at: z.ZodString;
        from: z.ZodObject<{
            module: z.ZodString;
            name: z.ZodCatch<z.ZodString>;
            session: z.ZodNullable<z.ZodString>;
            place: z.ZodObject<{
                epic: z.ZodNullable<z.ZodString>;
                parts: z.ZodCatch<z.ZodArray<z.ZodString, "many">>;
                kehikko: z.ZodNullable<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                epic: string | null;
                parts: string[];
                kehikko: string | null;
            }, {
                epic: string | null;
                kehikko: string | null;
                parts?: unknown;
            }>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            place: {
                epic: string | null;
                parts: string[];
                kehikko: string | null;
            };
            module: string;
            session: string | null;
        }, {
            place: {
                epic: string | null;
                kehikko: string | null;
                parts?: unknown;
            };
            module: string;
            session: string | null;
            name?: unknown;
        }>;
        to: z.ZodEffects<z.ZodObject<{
            project: z.ZodOptional<z.ZodLiteral<true>>;
            place: z.ZodOptional<z.ZodEffects<z.ZodObject<{
                epic: z.ZodOptional<z.ZodString>;
                kehikko: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                epic?: string | undefined;
                kehikko?: string | undefined;
            }, {
                epic?: string | undefined;
                kehikko?: string | undefined;
            }>, {
                epic?: string | undefined;
                kehikko?: string | undefined;
            }, {
                epic?: string | undefined;
                kehikko?: string | undefined;
            }>>;
            module: z.ZodOptional<z.ZodString>;
            session: z.ZodOptional<z.ZodObject<{
                module: z.ZodString;
                session: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                module: string;
                session: string;
            }, {
                module: string;
                session: string;
            }>>;
        }, "strip", z.ZodTypeAny, {
            place?: {
                epic?: string | undefined;
                kehikko?: string | undefined;
            } | undefined;
            project?: true | undefined;
            module?: string | undefined;
            session?: {
                module: string;
                session: string;
            } | undefined;
        }, {
            place?: {
                epic?: string | undefined;
                kehikko?: string | undefined;
            } | undefined;
            project?: true | undefined;
            module?: string | undefined;
            session?: {
                module: string;
                session: string;
            } | undefined;
        }>, {
            place?: {
                epic?: string | undefined;
                kehikko?: string | undefined;
            } | undefined;
            project?: true | undefined;
            module?: string | undefined;
            session?: {
                module: string;
                session: string;
            } | undefined;
        }, {
            place?: {
                epic?: string | undefined;
                kehikko?: string | undefined;
            } | undefined;
            project?: true | undefined;
            module?: string | undefined;
            session?: {
                module: string;
                session: string;
            } | undefined;
        }>;
        thread: z.ZodCatch<z.ZodNullable<z.ZodString>>;
        body: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        at: string;
        id: number;
        from: {
            name: string;
            place: {
                epic: string | null;
                parts: string[];
                kehikko: string | null;
            };
            module: string;
            session: string | null;
        };
        to: {
            place?: {
                epic?: string | undefined;
                kehikko?: string | undefined;
            } | undefined;
            project?: true | undefined;
            module?: string | undefined;
            session?: {
                module: string;
                session: string;
            } | undefined;
        };
        thread: string | null;
        body: string;
    }, {
        at: string;
        id: number;
        from: {
            place: {
                epic: string | null;
                kehikko: string | null;
                parts?: unknown;
            };
            module: string;
            session: string | null;
            name?: unknown;
        };
        to: {
            place?: {
                epic?: string | undefined;
                kehikko?: string | undefined;
            } | undefined;
            project?: true | undefined;
            module?: string | undefined;
            session?: {
                module: string;
                session: string;
            } | undefined;
        };
        body: string;
        thread?: unknown;
    }>, "many">>>;
    /** 2.41.0. How many more unread wait beyond `messages`: handed at the next ask. */
    messagesMore: z.ZodCatch<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    token: string;
    ok: true;
    doors: {
        name: string;
        url: string;
        module: string;
        transport: "http" | "sse";
    }[];
    messages?: {
        at: string;
        id: number;
        from: {
            name: string;
            place: {
                epic: string | null;
                parts: string[];
                kehikko: string | null;
            };
            module: string;
            session: string | null;
        };
        to: {
            place?: {
                epic?: string | undefined;
                kehikko?: string | undefined;
            } | undefined;
            project?: true | undefined;
            module?: string | undefined;
            session?: {
                module: string;
                session: string;
            } | undefined;
        };
        thread: string | null;
        body: string;
    }[] | undefined;
    modules?: {
        name: string;
        module: string;
        summary: string;
        door: string | null;
        skills: string[];
        says?: string | undefined;
    }[] | undefined;
    everywhere?: {
        name: string;
        module: string;
        version: string;
        origin: string;
    }[] | undefined;
    absent?: {
        name: string;
        says: string;
        module: string;
    }[] | undefined;
    messagesMore?: number | undefined;
}, {
    token: string;
    ok: true;
    doors: {
        name: string;
        url: string;
        module: string;
        transport?: unknown;
    }[];
    messages?: unknown;
    modules?: unknown;
    everywhere?: unknown;
    absent?: unknown;
    messagesMore?: unknown;
}>;
export type PlaceDoors = z.infer<typeof placeDoorsSchema>;
/**
 * Where a module that issues tokens answers for one, asked by the host:
 * `GET <module origin>/api/kehikot/place?kehikot-place=<token>&project=<folder>` → `recordedPlaceResult`.
 * The place as the module's record says it NOW — a conversation moved to another place, or carried on
 * under a new id, is answered right — or `null` for a token it did not issue.
 */
export declare const RECORDED_PLACE_PATH = "/api/kehikot/place";
export declare const recordedPlaceResult: z.ZodObject<{
    ok: z.ZodLiteral<true>;
    place: z.ZodNullable<z.ZodObject<{
        conversation: z.ZodString;
        epic: z.ZodNullable<z.ZodString>;
        parts: z.ZodArray<z.ZodString, "many">;
        kehikko: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        epic: string | null;
        parts: string[];
        kehikko: string | null;
        conversation: string;
    }, {
        epic: string | null;
        parts: string[];
        kehikko: string | null;
        conversation: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    place: {
        epic: string | null;
        parts: string[];
        kehikko: string | null;
        conversation: string;
    } | null;
    ok: true;
}, {
    place: {
        epic: string | null;
        parts: string[];
        kehikko: string | null;
        conversation: string;
    } | null;
    ok: true;
}>;
export type RecordedPlaceResult = z.infer<typeof recordedPlaceResult>;
/** Where a door took the project, epic and parts of a call from. */
export type PlaceSource = 'arguments' | 'session' | 'none';
/**
 * THE RULE (2.4.0): what a call is about. An argument the agent passed wins; otherwise the
 * session's place (when the call carried a token the host knows); otherwise nothing — and a door
 * that refused a call without `project` before still refuses it. Pure. `from` is what the door
 * SAYS in its answer (`DOOR_PLACE_SAYS.used`), every time it took anything from the session.
 * An `epic` argument naming another epic than the session's is honoured (the agent asked for it);
 * the parts then are the agent's, or none.
 */
export declare function placeDefaults(args: Record<string, unknown>, place: DoorPlace | null): {
    project: string | null;
    epic: string | null;
    parts: string[];
    from: PlaceSource;
};
/**
 * The sentences a door says about a session's place, in one wording for every module (2.4.0).
 *
 * - `belongs(place)`: "This conversation belongs to <project>, epic E (parts …) on kehikko K."
 * - `looking(place)`: whether the person is looking at the same thing, and what they are on if not;
 *   `''` when the host sent no `looking`.
 * - `used(from, place)`: the line a door adds when it took the project or epic from the session.
 * - `unplaced`: what a door says when it was asked for the session's place and has none.
 * - `fellBack`: what a door adds when it answered from the person's current view because there is no record.
 */
export declare const DOOR_PLACE_SAYS: {
    readonly belongs: (place: DoorPlace) => string;
    readonly looking: (place: DoorPlace) => string;
    readonly used: (from: PlaceSource, place: DoorPlace | null) => string;
    readonly unplaced: "This conversation isn’t recorded under any place. Name the project (and epic) in the call, or ask the person which epic it is for.";
    /** The line a door adds whenever it answered from the person's current view for want of a record: never silently. */
    readonly fellBack: "This conversation is not recorded under any place, so this answer is about what the person has open NOW — not this conversation’s place.";
};
/**
 * What became of being asked to show something. `shown`: at least one open page is showing it.
 * `unseen`: no page is open to see it, or none is known to be showing it (a hidden window, a page
 * that did not say). `declined`: the open pages would not move — a talk is being given, a page holds
 * unsaved text without it. A subject that does not exist
 * is not an outcome: the tool refuses (`isError`) and names what does.
 */
export declare const SHOW_OUTCOMES: readonly ["shown", "unseen", "declined"];
export type ShowOutcome = (typeof SHOW_OUTCOMES)[number];
/**
 * A `show` tool's `structuredContent`. `pages` is how many open pages are showing it as far as the
 * module can tell — the pages that said so, for a module whose pages report back; the pages it was
 * sent to, for one whose pages do not. Never how many people saw it. Other fields pass through. Showing saves nothing: the person can turn
 * the page away, and the answer is the same whether or not they do.
 */
export declare const showAnswerSchema: z.ZodObject<{
    outcome: z.ZodEnum<["shown", "unseen", "declined"]>;
    pages: z.ZodDefault<z.ZodNumber>;
    why: z.ZodDefault<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    outcome: z.ZodEnum<["shown", "unseen", "declined"]>;
    pages: z.ZodDefault<z.ZodNumber>;
    why: z.ZodDefault<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    outcome: z.ZodEnum<["shown", "unseen", "declined"]>;
    pages: z.ZodDefault<z.ZodNumber>;
    why: z.ZodDefault<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export type ShowAnswer = z.infer<typeof showAnswerSchema>;
/** `showAnswerSchema` as the JSON Schema a tool lists under `outputSchema`. */
export declare const SHOW_OUTPUT_SCHEMA: {
    readonly type: "object";
    readonly properties: {
        readonly outcome: {
            readonly type: "string";
            readonly enum: readonly ["shown", "unseen", "declined"];
            readonly description: "shown: at least one open page is showing it. unseen: no page is open, or none is known to be showing it. declined: the open pages would not move.";
        };
        readonly pages: {
            readonly type: "integer";
            readonly minimum: 0;
            readonly description: "How many open pages are showing it, as far as the module can tell. Not how many people saw it.";
        };
        readonly why: {
            readonly type: "string";
            readonly maxLength: 400;
        };
    };
    readonly required: readonly ["outcome", "pages"];
};
/**
 * Where one thing stands. `done`: a person did it. `waiting`: it can be done and has not been.
 * `unavailable`: it exists and cannot be done as things are, so waiting will not help. `unknown`:
 * nothing has that id — which is not `waiting`.
 */
export declare const DONE_STATES: readonly ["done", "waiting", "unavailable", "unknown"];
export type DoneState = (typeof DONE_STATES)[number];
export declare const doneItemSchema: z.ZodObject<{
    id: z.ZodString;
    state: z.ZodEnum<["done", "waiting", "unavailable", "unknown"]>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    id: z.ZodString;
    state: z.ZodEnum<["done", "waiting", "unavailable", "unknown"]>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    id: z.ZodString;
    state: z.ZodEnum<["done", "waiting", "unavailable", "unknown"]>;
}, z.ZodTypeAny, "passthrough">>;
export type DoneItem = z.infer<typeof doneItemSchema>;
/**
 * A `done` tool's `structuredContent`: one record per thing asked about, and `done`, which is true
 * only when there is at least one and every one is `done`. A caller waits on `done` and gives up
 * on `unavailable` or `unknown`. A module's own facts (a verdict, a time) pass through on each item.
 */
export declare const doneAnswerSchema: z.ZodObject<{
    done: z.ZodBoolean;
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        state: z.ZodEnum<["done", "waiting", "unavailable", "unknown"]>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        id: z.ZodString;
        state: z.ZodEnum<["done", "waiting", "unavailable", "unknown"]>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        id: z.ZodString;
        state: z.ZodEnum<["done", "waiting", "unavailable", "unknown"]>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    done: z.ZodBoolean;
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        state: z.ZodEnum<["done", "waiting", "unavailable", "unknown"]>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        id: z.ZodString;
        state: z.ZodEnum<["done", "waiting", "unavailable", "unknown"]>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        id: z.ZodString;
        state: z.ZodEnum<["done", "waiting", "unavailable", "unknown"]>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    done: z.ZodBoolean;
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        state: z.ZodEnum<["done", "waiting", "unavailable", "unknown"]>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        id: z.ZodString;
        state: z.ZodEnum<["done", "waiting", "unavailable", "unknown"]>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        id: z.ZodString;
        state: z.ZodEnum<["done", "waiting", "unavailable", "unknown"]>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
}, z.ZodTypeAny, "passthrough">>;
export type DoneAnswer = z.infer<typeof doneAnswerSchema>;
/** The answer for these items, with `done` worked out by the one rule. Pure. */
export declare function doneAnswer<Item extends {
    id: string;
    state: DoneState;
}>(items: readonly Item[]): {
    done: boolean;
    items: Item[];
};
/** `doneAnswerSchema` as the JSON Schema a tool lists under `outputSchema`. */
export declare const DONE_OUTPUT_SCHEMA: {
    readonly type: "object";
    readonly properties: {
        readonly done: {
            readonly type: "boolean";
            readonly description: "True only when at least one thing was asked about and every one is done.";
        };
        readonly items: {
            readonly type: "array";
            readonly maxItems: 256;
            readonly items: {
                readonly type: "object";
                readonly properties: {
                    readonly id: {
                        readonly type: "string";
                        readonly maxLength: 128;
                    };
                    readonly state: {
                        readonly type: "string";
                        readonly enum: readonly ["done", "waiting", "unavailable", "unknown"];
                        readonly description: "unavailable: it cannot be done as things are. unknown: nothing has that id.";
                    };
                };
                readonly required: readonly ["id", "state"];
            };
        };
    };
    readonly required: readonly ["done", "items"];
};
/**
 * One tool as a door lists it (`tools/list`): the fields this protocol reads, with everything else
 * passed through. `annotations` is MCP's own: `readOnlyHint` and `destructiveHint`.
 */
export declare const doorToolSchema: z.ZodObject<{
    name: z.ZodString;
    inputSchema: z.ZodOptional<z.ZodObject<{
        properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">>>;
    outputSchema: z.ZodOptional<z.ZodObject<{
        properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">>>;
    annotations: z.ZodOptional<z.ZodObject<{
        readOnlyHint: z.ZodOptional<z.ZodBoolean>;
        destructiveHint: z.ZodOptional<z.ZodBoolean>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        readOnlyHint: z.ZodOptional<z.ZodBoolean>;
        destructiveHint: z.ZodOptional<z.ZodBoolean>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        readOnlyHint: z.ZodOptional<z.ZodBoolean>;
        destructiveHint: z.ZodOptional<z.ZodBoolean>;
    }, z.ZodTypeAny, "passthrough">>>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    name: z.ZodString;
    inputSchema: z.ZodOptional<z.ZodObject<{
        properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">>>;
    outputSchema: z.ZodOptional<z.ZodObject<{
        properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">>>;
    annotations: z.ZodOptional<z.ZodObject<{
        readOnlyHint: z.ZodOptional<z.ZodBoolean>;
        destructiveHint: z.ZodOptional<z.ZodBoolean>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        readOnlyHint: z.ZodOptional<z.ZodBoolean>;
        destructiveHint: z.ZodOptional<z.ZodBoolean>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        readOnlyHint: z.ZodOptional<z.ZodBoolean>;
        destructiveHint: z.ZodOptional<z.ZodBoolean>;
    }, z.ZodTypeAny, "passthrough">>>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    name: z.ZodString;
    inputSchema: z.ZodOptional<z.ZodObject<{
        properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">>>;
    outputSchema: z.ZodOptional<z.ZodObject<{
        properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">>>;
    annotations: z.ZodOptional<z.ZodObject<{
        readOnlyHint: z.ZodOptional<z.ZodBoolean>;
        destructiveHint: z.ZodOptional<z.ZodBoolean>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        readOnlyHint: z.ZodOptional<z.ZodBoolean>;
        destructiveHint: z.ZodOptional<z.ZodBoolean>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        readOnlyHint: z.ZodOptional<z.ZodBoolean>;
        destructiveHint: z.ZodOptional<z.ZodBoolean>;
    }, z.ZodTypeAny, "passthrough">>>;
}, z.ZodTypeAny, "passthrough">>;
export type DoorTool = z.infer<typeof doorToolSchema>;
/**
 * What a tool says it does, read off its annotations. `reads`: `readOnlyHint: true` — it shows or
 * reads and changes nothing a person kept. `writes`: it changes something and says it destroys
 * nothing (`destructiveHint: false`). `destroys`: it may delete or overwrite, which is also MCP's
 * reading of a tool that says it writes and no more. `unstated`: it says nothing, and a careful
 * caller treats that as `destroys`. The tool's own claim; nothing checks it.
 */
export declare const TOOL_EFFECTS: readonly ["reads", "writes", "destroys", "unstated"];
export type ToolEffect = (typeof TOOL_EFFECTS)[number];
export declare function toolEffect(tool: {
    annotations?: {
        readOnlyHint?: boolean;
        destructiveHint?: boolean;
    } | undefined;
}): ToolEffect;
