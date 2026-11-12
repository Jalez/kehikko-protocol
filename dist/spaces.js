import { z } from 'zod';
import { LIMITS } from './limits.js';
import { EPIC_SLUG, slugFrom } from './ids.js';
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
export const SPACE_ID = new RegExp(EPIC_SLUG.source);
const spaceId = z.string().regex(SPACE_ID, 'a space id is lowercase letters, digits and dashes');
/** One step of a space's path: its id and what a person calls it. */
export const spaceStepSchema = z.object({
    id: spaceId,
    name: z.string().max(LIMITS.TITLE).catch(''),
});
/** A space's path from its top-level space to it, root first: at least one step, at most `LIMITS.SPACE_DEPTH`. */
export const spacePathSchema = z.array(spaceStepSchema).min(1).max(LIMITS.SPACE_DEPTH);
/** A path by ids alone, root first: what a place, a jump or a door argument carries. */
export const spaceIdsSchema = z.array(spaceId).min(1).max(LIMITS.SPACE_DEPTH);
/**
 * Where the person stands, as `context.space` and a place carry it: the picked space (`id`, the last
 * step of `path`) and its path from the top. `picked` is the ids of the space's CHILDREN the person
 * picked out together — several siblings at once, which "parts" allowed — `[]` (or absent) for the
 * whole space. One picked child is never sent as `picked`: the host stands in that child instead.
 */
export const spaceSchema = z
    .object({
    id: spaceId,
    path: spacePathSchema,
    picked: z.array(spaceId).max(LIMITS.PARTS).default([]),
})
    .refine((space) => space.path[space.path.length - 1]?.id === space.id, {
    message: "a space's id is the last step of its path",
    path: ['id'],
});
/** A space of a tree, recursively. Depth and size are held by `spaceTreeSchema`, not here. */
export const spaceNodeSchema = z.lazy(() => z.object({
    id: spaceId,
    name: z.string().max(LIMITS.TITLE).catch(''),
    children: z.array(spaceNodeSchema).default([]),
}));
/**
 * A project's whole tree of spaces, top-level first, in order: at most `LIMITS.SPACES` spaces and
 * `LIMITS.SPACE_DEPTH` levels, and no two siblings sharing an id.
 */
export const spaceTreeSchema = z
    .array(spaceNodeSchema)
    .superRefine((tree, ctx) => {
    let count = 0;
    const walk = (nodes, depth) => {
        if (depth > LIMITS.SPACE_DEPTH)
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: `spaces nest at most ${LIMITS.SPACE_DEPTH} deep` });
        const seen = new Set();
        for (const node of nodes) {
            count += 1;
            if (seen.has(node.id))
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: `two sibling spaces share the id ${node.id}` });
            seen.add(node.id);
            walk(node.children, depth + 1);
        }
    };
    walk(tree, 1);
    if (count > LIMITS.SPACES)
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `a tree holds at most ${LIMITS.SPACES} spaces` });
});
/** The ids of a space's path, root first. Pure. */
export function spaceIdsOf(space) {
    if (!space)
        return [];
    const steps = Array.isArray(space) ? space : space.path;
    return steps.map((step) => (typeof step === 'string' ? step : step.id));
}
const pickedOf = (space) => space && !Array.isArray(space) ? (space.picked ?? []) : [];
/**
 * THE RULE for "in this space or below": whether `candidate` is the `selected` space or a space under
 * it. With children picked in `selected`, only those children and what is under them are in. Nothing
 * selected (`null`, an empty path) is the whole project, so everything is in. A candidate with no path
 * is in only then. Pure; compares ids, never names.
 */
export function spaceWithin(selected, candidate) {
    const above = spaceIdsOf(selected);
    if (above.length === 0)
        return true;
    const below = spaceIdsOf(candidate);
    if (below.length < above.length)
        return false;
    for (let at = 0; at < above.length; at += 1)
        if (above[at] !== below[at])
            return false;
    const picked = pickedOf(selected);
    if (picked.length === 0)
        return true;
    const child = below[above.length];
    return child !== undefined && picked.includes(child);
}
/**
 * The epic and parts an older module is told for a space (the compatibility mapping): `epic` is the
 * top-level space; `parts` are the picked children when the space is top-level with several picked,
 * the space itself at depth 2, and for anything deeper its depth-2 ancestor. No space is no epic. Pure.
 */
export function epicPartsOf(space) {
    const ids = spaceIdsOf(space);
    const epic = ids[0] ?? null;
    if (epic === null)
        return { epic: null, parts: [] };
    if (ids.length === 1)
        return { epic, parts: [...pickedOf(space)] };
    return { epic, parts: [ids[1]] };
}
/**
 * A space from what an older place says, the mapping read backwards: an epic alone is its top-level
 * space; one part is that child; several parts are the epic with those children picked. Pure; ids only.
 */
export function spaceFromEpicParts(epic, parts = []) {
    if (typeof epic !== 'string' || !SPACE_ID.test(epic))
        return null;
    const ids = parts.filter((part) => SPACE_ID.test(part));
    if (ids.length === 1)
        return { ids: [epic, ids[0]], picked: [] };
    return { ids: [epic], picked: ids };
}
/**
 * Whether an older place (epic and parts) and a space name the same thing: the space read through
 * `epicPartsOf` gives the same epic and the same parts. Lets a host keep a space it remembers when an
 * older module hands back the epic and parts it was told. Pure.
 */
export function spaceAgrees(space, epic, parts = []) {
    const said = epicPartsOf(space);
    return said.epic === (epic ?? null) && [...said.parts].sort().join('+') === [...parts].sort().join('+');
}
/** A space's path in words, root first: `Auth › Sign-in › Errors`. A step without a name is said by its id. */
export function spaceSaid(path) {
    return path.map((step) => (step.name && step.name.trim() ? step.name : step.id)).join(' › ');
}
/**
 * The id a new space is given from its name: `slugFrom(name)` (or `space`), told apart from every id
 * already in the tree — at every depth, not only among its siblings — so a space a host makes is named
 * by its id alone anywhere in the project. Ids that came from parts of two epics may still repeat;
 * those are told apart by their path. Made once; a rename or a move keeps it.
 */
export function spaceIdFor(name, tree) {
    const taken = [];
    const walk = (nodes) => {
        for (const node of nodes) {
            taken.push(node.id);
            walk(node.children);
        }
    };
    walk(tree);
    const used = new Set(taken);
    const wanted = (typeof name === 'string' ? slugFrom(name.trim().slice(0, LIMITS.TITLE)) : '') || 'space';
    let id = wanted;
    for (let n = 2; used.has(id); n += 1)
        id = `${wanted.slice(0, LIMITS.EPIC_SLUG - 1 - String(n).length)}-${n}`;
    return id;
}
/** The argument a door takes a space under, beside `project` and `epic`. */
export const DOOR_SPACE_ARGUMENT = 'space';
/**
 * A `space` door argument, read: a path of ids (`["auth", "sign-in"]`, or `"auth/sign-in"`) or one id
 * (`"sign-in"`), which `findSpace` resolves against the tree. Null when absent or not one of those.
 */
export function doorSpace(args) {
    const raw = Object.hasOwn(args, DOOR_SPACE_ARGUMENT) ? args[DOOR_SPACE_ARGUMENT] : undefined;
    if (Array.isArray(raw)) {
        const parsed = spaceIdsSchema.safeParse(raw);
        return parsed.success ? { ids: parsed.data } : null;
    }
    if (typeof raw !== 'string' || !raw.trim())
        return null;
    const parts = raw.trim().split('/').map((one) => one.trim()).filter(Boolean);
    if (parts.length > 1) {
        const parsed = spaceIdsSchema.safeParse(parts);
        return parsed.success ? { ids: parsed.data } : null;
    }
    return SPACE_ID.test(parts[0] ?? '') ? { id: parts[0] } : null;
}
/**
 * Which space of a tree a door argument names: its path, steps with names. A path must exist step by
 * step; one id must name exactly one space anywhere in the tree, else the answer says where it is
 * ambiguous and asks for the path. Pure.
 */
export function findSpace(tree, asked) {
    if ('ids' in asked) {
        const path = [];
        let level = tree;
        for (const id of asked.ids) {
            const node = level.find((one) => one.id === id);
            if (!node) {
                return { ok: false, why: `There is no space ${id} ${path.length ? `in ${spaceSaid(path)}` : 'at the top of this project'}.` };
            }
            path.push({ id: node.id, name: node.name });
            level = node.children;
        }
        return { ok: true, path };
    }
    const found = [];
    const walk = (nodes, above) => {
        for (const node of nodes) {
            const here = [...above, { id: node.id, name: node.name }];
            if (node.id === asked.id)
                found.push(here);
            walk(node.children, here);
        }
    };
    walk(tree, []);
    if (found.length === 1)
        return { ok: true, path: found[0] };
    if (found.length === 0)
        return { ok: false, why: `There is no space ${asked.id} in this project.` };
    return {
        ok: false,
        why: `${asked.id} names ${found.length} spaces (${found.map((path) => spaceIdsOf(path).join('/')).join(', ')}). Name it by its path.`,
    };
}
/** The steps of a tree's space at a path of ids, or null when the tree has no such space. Pure. */
export function spaceAt(tree, ids) {
    if (ids.length === 0)
        return null;
    const found = findSpace(tree, { ids });
    return found.ok ? found.path : null;
}
/** A `Space` built from a tree and a path of ids (and children picked), or null when it is not there. Pure. */
export function spaceOf(tree, ids, picked = []) {
    const path = spaceAt(tree, ids);
    if (!path)
        return null;
    const node = nodeAt(tree, ids);
    const children = new Set((node?.children ?? []).map((child) => child.id));
    const kept = picked.filter((id) => children.has(id));
    if (kept.length === 1) {
        const child = node.children.find((one) => one.id === kept[0]);
        return { id: child.id, path: [...path, { id: child.id, name: child.name }], picked: [] };
    }
    return { id: path[path.length - 1].id, path, picked: kept };
}
/** The node of a tree at a path of ids, or null. Pure. */
export function nodeAt(tree, ids) {
    let level = tree;
    let node = null;
    for (const id of ids) {
        node = level.find((one) => one.id === id) ?? null;
        if (!node)
            return null;
        level = node.children;
    }
    return node;
}
/**
 * A place's space, as a place, a jump or a message carries it beside `epic` (2.89.0): a path of ids.
 * It goes with the epic it is in — its first id is the `epic` — so a host before 2.89.0, which strips
 * it, still goes to (or reaches) that epic.
 */
export const placeSpace = spaceIdsSchema;
/** The refinement every place with a `space` shares: the space's first id is the place's epic. */
export const spaceGoesWithEpic = (place) => place.space === undefined || place.space[0] === place.epic;
export const SPACE_WITH_EPIC = 'a place with a space names its epic: the space’s first id';
const stepSaid = (step) => (typeof step === 'string' ? step : step.name && step.name.trim() ? step.name.trim() : step.id);
const stepId = (step) => (typeof step === 'string' ? step : step.id);
/**
 * 2.92.0. A place's space in the words agents read (notes, markers, a door's sentences): `space Auth ›
 * Login`, `space Auth (sub-spaces Login + Errors)` for several children picked together, `no space`.
 * Read from `space` (a path of steps or ids) when the place carries one, else from the older `epic` and
 * `parts` by the compatibility mapping read backwards (`spaceFromEpicParts`), so a place from a host or
 * a record before 2.89.0 is said the same way. With `ids`, the path of ids follows in parentheses
 * (`space Auth › Login (auth/login)`), for an agent to pass as a `space` argument. Pure.
 */
export function spaceWords(place, options = {}) {
    const parts = place.parts ?? [];
    let path;
    let picked = [];
    if (place.space && place.space.length) {
        path = place.space;
        if (place.space.length === 1 && parts.length > 1)
            picked = parts;
    }
    else if (place.epic) {
        path = parts.length === 1 ? [place.epic, parts[0]] : [place.epic];
        if (parts.length > 1)
            picked = parts;
    }
    else {
        return 'no space';
    }
    const said = path.map(stepSaid).join(' › ');
    const ids = options.ids && path.some((step) => stepSaid(step) !== stepId(step)) ? ` (${path.map(stepId).join('/')})` : '';
    const children = picked.length ? ` (sub-spaces ${picked.map(stepSaid).join(' + ')})` : '';
    return `space ${said}${ids}${children}`;
}
