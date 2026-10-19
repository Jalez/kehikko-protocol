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
