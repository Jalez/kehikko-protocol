import { z } from 'zod';
/**
 * Spaces (2.89.0): one nested concept in place of the two fixed levels "epic → parts".
 *
 * A project holds a tree of spaces. A space can hold spaces, to any depth (`LIMITS.SPACE_DEPTH`). The
 * top-level spaces are what the protocol called epics, and their children what it called parts, with
 * the SAME ids: an epic's slug is its top-level space's id, and a part's id is its child space's id.
 * So everything a module keyed by epic or by part keeps resolving.
 *
 * A host goes on filling `context.epic` and `context.parts` for modules that read them, by the one
 * mapping `epicPartsOf` below. A module that knows spaces reads `context.space` and narrows by the
 * subtree with `spaceWithin`. See docs/spaces.md.
 */
/** A space's id: the class of characters of an epic's slug and a part's id, which are spaces' ids. */
export declare const SPACE_ID: RegExp;
/** One step of a space's path: its id and what a person calls it. */
export declare const spaceStepSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodCatch<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
}, {
    id: string;
    name?: unknown;
}>;
export type SpaceStep = z.infer<typeof spaceStepSchema>;
/** A space's path from its top-level space to it, root first: at least one step, at most `LIMITS.SPACE_DEPTH`. */
export declare const spacePathSchema: z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    name: z.ZodCatch<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
}, {
    id: string;
    name?: unknown;
}>, "many">;
/** A path by ids alone, root first: what a place, a jump or a door argument carries. */
export declare const spaceIdsSchema: z.ZodArray<z.ZodString, "many">;
/**
 * Where the person stands, as `context.space` and a place carry it: the picked space (`id`, the last
 * step of `path`) and its path from the top. `picked` is the ids of the space's CHILDREN the person
 * picked out together — several siblings at once, which "parts" allowed — `[]` (or absent) for the
 * whole space. One picked child is never sent as `picked`: the host stands in that child instead.
 */
export declare const spaceSchema: z.ZodEffects<z.ZodObject<{
    id: z.ZodString;
    path: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodCatch<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
    }, {
        id: string;
        name?: unknown;
    }>, "many">;
    picked: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    path: {
        id: string;
        name: string;
    }[];
    id: string;
    picked: string[];
}, {
    path: {
        id: string;
        name?: unknown;
    }[];
    id: string;
    picked?: string[] | undefined;
}>, {
    path: {
        id: string;
        name: string;
    }[];
    id: string;
    picked: string[];
}, {
    path: {
        id: string;
        name?: unknown;
    }[];
    id: string;
    picked?: string[] | undefined;
}>;
export type Space = z.infer<typeof spaceSchema>;
/** One space of a tree, with the spaces it holds, in their order. */
export interface SpaceNode {
    id: string;
    name: string;
    children: SpaceNode[];
}
/** A space of a tree, recursively. Depth and size are held by `spaceTreeSchema`, not here. */
export declare const spaceNodeSchema: z.ZodType<SpaceNode, z.ZodTypeDef, unknown>;
/**
 * A project's whole tree of spaces, top-level first, in order: at most `LIMITS.SPACES` spaces and
 * `LIMITS.SPACE_DEPTH` levels, and no two siblings sharing an id.
 */
export declare const spaceTreeSchema: z.ZodEffects<z.ZodArray<z.ZodType<SpaceNode, z.ZodTypeDef, unknown>, "many">, SpaceNode[], unknown[]>;
/** Anything a space can be named by: a space, a path of steps, or a path of ids. */
export type SpaceLike = {
    path: readonly {
        id: string;
    }[];
    picked?: readonly string[];
} | readonly {
    id: string;
}[] | readonly string[];
/** The ids of a space's path, root first. Pure. */
export declare function spaceIdsOf(space: SpaceLike | null | undefined): string[];
/**
 * THE RULE for "in this space or below": whether `candidate` is the `selected` space or a space under
 * it. With children picked in `selected`, only those children and what is under them are in. Nothing
 * selected (`null`, an empty path) is the whole project, so everything is in. A candidate with no path
 * is in only then. Pure; compares ids, never names.
 */
export declare function spaceWithin(selected: SpaceLike | null | undefined, candidate: SpaceLike | null | undefined): boolean;
/**
 * The epic and parts an older module is told for a space (the compatibility mapping): `epic` is the
 * top-level space; `parts` are the picked children when the space is top-level with several picked,
 * the space itself at depth 2, and for anything deeper its depth-2 ancestor. No space is no epic. Pure.
 */
export declare function epicPartsOf(space: SpaceLike | null | undefined): {
    epic: string | null;
    parts: string[];
};
/**
 * A space from what an older place says, the mapping read backwards: an epic alone is its top-level
 * space; one part is that child; several parts are the epic with those children picked. Pure; ids only.
 */
export declare function spaceFromEpicParts(epic: string | null | undefined, parts?: readonly string[]): {
    ids: string[];
    picked: string[];
} | null;
/**
 * Whether an older place (epic and parts) and a space name the same thing: the space read through
 * `epicPartsOf` gives the same epic and the same parts. Lets a host keep a space it remembers when an
 * older module hands back the epic and parts it was told. Pure.
 */
export declare function spaceAgrees(space: SpaceLike | null | undefined, epic: string | null | undefined, parts?: readonly string[]): boolean;
/** A space's path in words, root first: `Auth › Sign-in › Errors`. A step without a name is said by its id. */
export declare function spaceSaid(path: readonly {
    id: string;
    name?: string;
}[]): string;
/**
 * The id a new space is given from its name: `slugFrom(name)` (or `space`), told apart from every id
 * already in the tree — at every depth, not only among its siblings — so a space a host makes is named
 * by its id alone anywhere in the project. Ids that came from parts of two epics may still repeat;
 * those are told apart by their path. Made once; a rename or a move keeps it.
 */
export declare function spaceIdFor(name: unknown, tree: readonly SpaceNode[]): string;
/** The argument a door takes a space under, beside `project` and `epic`. */
export declare const DOOR_SPACE_ARGUMENT = "space";
/**
 * A `space` door argument, read: a path of ids (`["auth", "sign-in"]`, or `"auth/sign-in"`) or one id
 * (`"sign-in"`), which `findSpace` resolves against the tree. Null when absent or not one of those.
 */
export declare function doorSpace(args: Record<string, unknown>): {
    ids: string[];
} | {
    id: string;
} | null;
/**
 * Which space of a tree a door argument names: its path, steps with names. A path must exist step by
 * step; one id must name exactly one space anywhere in the tree, else the answer says where it is
 * ambiguous and asks for the path. Pure.
 */
export declare function findSpace(tree: readonly SpaceNode[], asked: {
    ids: readonly string[];
} | {
    id: string;
}): {
    ok: true;
    path: SpaceStep[];
} | {
    ok: false;
    why: string;
};
/** The steps of a tree's space at a path of ids, or null when the tree has no such space. Pure. */
export declare function spaceAt(tree: readonly SpaceNode[], ids: readonly string[]): SpaceStep[] | null;
/** A `Space` built from a tree and a path of ids (and children picked), or null when it is not there. Pure. */
export declare function spaceOf(tree: readonly SpaceNode[], ids: readonly string[], picked?: readonly string[]): Space | null;
/** The node of a tree at a path of ids, or null. Pure. */
export declare function nodeAt(tree: readonly SpaceNode[], ids: readonly string[]): SpaceNode | null;
/**
 * A place's space, as a place, a jump or a message carries it beside `epic` (2.89.0): a path of ids.
 * It goes with the epic it is in — its first id is the `epic` — so a host before 2.89.0, which strips
 * it, still goes to (or reaches) that epic.
 */
export declare const placeSpace: z.ZodArray<z.ZodString, "many">;
/** The refinement every place with a `space` shares: the space's first id is the place's epic. */
export declare const spaceGoesWithEpic: (place: {
    epic?: string | null;
    space?: readonly string[];
}) => boolean;
export declare const SPACE_WITH_EPIC = "a place with a space names its epic: the space\u2019s first id";
/** A place's step as the words about it take it: an id, or an id with a name. */
type StepLike = string | {
    id: string;
    name?: string;
};
/**
 * 2.92.0. A place's space in the words agents read (notes, markers, a door's sentences): `space Auth ›
 * Login`, `space Auth (sub-spaces Login + Errors)` for several children picked together, `no space`.
 * Read from `space` (a path of steps or ids) when the place carries one, else from the older `epic` and
 * `parts` by the compatibility mapping read backwards (`spaceFromEpicParts`), so a place from a host or
 * a record before 2.89.0 is said the same way. With `ids`, the path of ids follows in parentheses
 * (`space Auth › Login (auth/login)`), for an agent to pass as a `space` argument. Pure.
 */
export declare function spaceWords(place: {
    epic?: string | null;
    parts?: readonly StepLike[];
    space?: readonly StepLike[] | null;
}, options?: {
    ids?: boolean;
}): string;
export {};
