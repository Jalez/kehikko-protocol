import { EPIC_SLUG } from './ids.js';
import { LIMITS } from './limits.js';
import { PART_ID, partDocument } from './parts.js';
/**
 * What a module holds for the parts of a project's epics, as it publishes it: `parts.json` in its own
 * folder, `{ version, epics: { <epic>: { <part id>: { documents, refs } } } }`. Shapes and pure readers
 * only; the file is opened behind `/serve` (`readHoldings`, `writeHoldings`). No module is named here.
 * Design notes: docs/parts.md.
 */
/** The file, in a module's own folder: `moduleFile(projectPath, moduleId, HOLDINGS_FILE)` is `.kehikot/<module>/parts.json`. */
export const HOLDINGS_FILE = 'parts';
/** The format's number, written as `version`. A reader opens a later one and reads what it knows. */
export const HOLDINGS_VERSION = 1;
/**
 * The kinds of thing a module can publish for a part (1.4.0). `published` names which of them a
 * module has SPOKEN FOR in an epic, so that saying nothing (an empty list) is different from never
 * having said anything.
 */
export const HOLDING_KINDS = ['documents', 'refs'];
/** Kinds out of whatever is there: each known one, once, in `HOLDING_KINDS` order. */
export function holdingKinds(raw) {
    if (!Array.isArray(raw))
        return [];
    return HOLDING_KINDS.filter((kind) => raw.includes(kind));
}
/** Short strings out of whatever is there, each through `one`, once each, at most `most`. */
function listed(raw, one, most, into = []) {
    if (!Array.isArray(raw))
        return into;
    for (const entry of raw) {
        if (into.length >= most)
            break;
        const said = one(entry);
        if (said !== null && !into.includes(said))
            into.push(said);
    }
    return into;
}
const refOf = (entry) => {
    if (typeof entry !== 'string')
        return null;
    const ref = entry.trim();
    return ref && ref.length <= LIMITS.REF ? ref : null;
};
/**
 * What one part holds, read off anything: documents in `partDocument`'s form and refs as short
 * strings, once each, bounded by `LIMITS.PART_DOCUMENTS` and `LIMITS.PART_REFS`. Junk costs the entry
 * it is in. Null when nothing usable is left, so a part a module holds nothing for is not listed.
 */
export function partHoldings(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return null;
    const { documents, refs } = raw;
    const held = {
        documents: listed(documents, partDocument, LIMITS.PART_DOCUMENTS),
        refs: listed(refs, refOf, LIMITS.PART_REFS),
    };
    return held.documents.length + held.refs.length > 0 ? held : null;
}
/** One epic's holdings out of anything: every own key that is a `PART_ID` with something held, at most `LIMITS.PARTS`. */
export function epicHoldings(raw) {
    const out = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return out;
    let count = 0;
    for (const [id, value] of Object.entries(raw)) {
        if (count >= LIMITS.PARTS)
            break;
        if (!PART_ID.test(id))
            continue;
        const held = partHoldings(value);
        if (held === null)
            continue;
        out[id] = held;
        count += 1;
    }
    return out;
}
/**
 * Everything one module's parsed `parts.json` says, or `{}`: never throws. Read per epic and per part,
 * so one bad entry costs that entry. An epic key that is not an `EPIC_SLUG`, and an epic with nothing
 * held, are left out; at most `LIMITS.HOLDINGS_EPICS` epics are read.
 */
export function holdingsIn(document) {
    const out = {};
    if (!document || typeof document !== 'object' || Array.isArray(document))
        return out;
    const epics = document.epics;
    if (!epics || typeof epics !== 'object' || Array.isArray(epics))
        return out;
    let count = 0;
    for (const [slug, value] of Object.entries(epics)) {
        if (count >= LIMITS.HOLDINGS_EPICS)
            break;
        if (!EPIC_SLUG.test(slug))
            continue;
        const held = epicHoldings(value);
        if (Object.keys(held).length === 0)
            continue;
        out[slug] = held;
        count += 1;
    }
    return out;
}
/**
 * Two readings as one: `more` added to `into`, per epic and part, once each and in order, under the
 * same bounds. `into` is changed and returned. What makes a part's documents the union of what every
 * module said, with none of them named.
 */
export function joinHoldings(into, more) {
    for (const [slug, parts] of Object.entries(more)) {
        const epic = Object.hasOwn(into, slug) ? into[slug] : (into[slug] = {});
        for (const [id, held] of Object.entries(parts)) {
            if (!Object.hasOwn(epic, id)) {
                if (Object.keys(epic).length >= LIMITS.PARTS)
                    continue;
                epic[id] = { documents: [], refs: [] };
            }
            const part = epic[id];
            listed(held.documents, partDocument, LIMITS.PART_DOCUMENTS, part.documents);
            listed(held.refs, refOf, LIMITS.PART_REFS, part.refs);
        }
    }
    return into;
}
/**
 * Which kinds each epic has been published for, out of one module's parsed `parts.json`, or `{}`.
 * Never throws. An epic is spoken for in a kind when the file's `published[<epic>]` names it, and
 * also, for a file written before 1.4.0 (no `published`), when a part of that epic holds some of
 * that kind. At most `LIMITS.HOLDINGS_EPICS` epics.
 */
export function spokenIn(document) {
    const out = {};
    if (!document || typeof document !== 'object' || Array.isArray(document))
        return out;
    const said = document.published;
    let count = 0;
    const note = (slug, kinds) => {
        if (!EPIC_SLUG.test(slug) || kinds.length === 0)
            return;
        if (!Object.hasOwn(out, slug)) {
            if (count >= LIMITS.HOLDINGS_EPICS)
                return;
            out[slug] = [];
            count += 1;
        }
        const own = out[slug];
        for (const kind of kinds)
            if (!own.includes(kind))
                own.push(kind);
    };
    if (said && typeof said === 'object' && !Array.isArray(said)) {
        for (const [slug, kinds] of Object.entries(said))
            note(slug, holdingKinds(kinds));
    }
    for (const [slug, parts] of Object.entries(holdingsIn(document))) {
        const kinds = [];
        for (const held of Object.values(parts)) {
            if (held.documents.length > 0 && !kinds.includes('documents'))
                kinds.push('documents');
            if (held.refs.length > 0 && !kinds.includes('refs'))
                kinds.push('refs');
        }
        note(slug, kinds);
    }
    for (const kinds of Object.values(out))
        kinds.sort((a, b) => HOLDING_KINDS.indexOf(a) - HOLDING_KINDS.indexOf(b));
    return out;
}
/** Two readings as one: `more`'s kinds added to `into`'s, per epic. `into` is changed and returned. */
export function joinSpoken(into, more) {
    for (const [slug, kinds] of Object.entries(more)) {
        if (!Object.hasOwn(into, slug)) {
            if (Object.keys(into).length >= LIMITS.HOLDINGS_EPICS)
                continue;
            into[slug] = [];
        }
        const own = into[slug];
        for (const kind of kinds)
            if (!own.includes(kind))
                own.push(kind);
        own.sort((a, b) => HOLDING_KINDS.indexOf(a) - HOLDING_KINDS.indexOf(b));
    }
    return into;
}
