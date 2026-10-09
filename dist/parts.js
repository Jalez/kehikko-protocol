import { z } from 'zod';
import { LIMITS } from './constants.js';
import { EPIC_SLUG } from './ids.js';
import { KEHIKOT_DIR, moduleFolder } from './project.js';
/**
 * The parts of the open epic, and which of them a person has picked out.
 *
 * ## What this is for
 *
 * An epic grows. Forty steps and thirty references under one title is a thing
 * somebody still wants to call one piece of work, and cannot look at all at
 * once. So an epic may be divided into PARTS — "the posting seam", "what the
 * tests check" — and a person may point the whole workspace at one of them, or
 * at several, and still be able to see that the rest is there.
 *
 * The first design for this was an epic inside an epic, and it was refused.
 * Nesting makes every question the wire already answers ask "at which level":
 * which epic is open, which epic a ref was picked out of, which epic a module's
 * own material is filed under. A part is not a smaller epic. It is a heading
 * and the things under it, ONE level deep, and the open epic is still the open
 * epic.
 *
 * ## Every part is listed, and the picked ones are flagged
 *
 * The shape is `containers`' shape, on purpose, because the argument is the
 * same one. A host could send only the parts that are picked out — "narrow to
 * these" — and a module handed that could narrow and could never say what it
 * had hidden. "3 items outside the picked parts" is a sentence a module has to
 * be able to print, because a pane that is shorter than it was for a reason
 * nobody can see is the failure this whole field is arranged against; and it
 * cannot count what it was not told exists. So the list is the epic's whole
 * list of parts, in the epic's order, each with its `refs`, and `picked` says
 * which ones the person means.
 *
 * **None picked means the whole epic.** Not "nothing is in front of you" — the
 * opposite. That is the resting state, it is what a host that has never heard
 * of parts says by sending `[]`, and it is why a module that never reads this
 * field is exactly as correct as it was: it shows the whole epic, which is
 * what a module shown no narrowing should show.
 *
 * ## What `refs` holds, and whose word it is
 *
 * The references a host can say belong to the part: the ones the epic lists
 * under that heading, and the ones carried by steps that were ASSIGNED to it.
 * It is the host's reading of the epic it holds, which is the only reading a
 * host can vouch for — a module with a store of its own may hold steps the
 * host has never seen, and it decides about those itself; see `partInFocus`.
 *
 * Refs and nothing else, for the reason `selection` carries refs and nothing
 * else: they are the one name for a thing that two modules which have never
 * heard of each other both already use.
 *
 * ## A step says which part it is in. It is not worked out from its refs.
 *
 * A step may carry `part: <id>`, and that is the whole of how a step comes to
 * be in a part. A step that names `gh#12` is NOT thereby in the part that
 * lists `gh#12`: a step often names a reference it merely depends on, and a
 * rule that filed it under that reference's heading would move steps between
 * parts whenever somebody edited a sentence. A step with no `part` belongs to
 * the epic as a whole.
 *
 * So there are two questions and two functions, and a module asks the one that
 * matches what it is holding: `refInFocus` for a thing that IS a reference (a
 * row in a list of issues, a checklist held against a pull request), and
 * `partInFocus` for a thing that was assigned to a part (a step).
 *
 * ## The id, and why it is not the heading
 *
 * A heading is prose somebody will reword. If it were the name, rewording it
 * would silently unassign every step filed under it and drop a stored focus,
 * and nothing would say so. So a part has an `id` in the same class of
 * characters as an epic's slug, which is what a step's `part` holds and what a
 * host stores for the focus, and the heading is free to change.
 *
 * Where the id comes from used to be called the host's business, and this
 * package said only what an id looks like once it is on the wire. That stopped
 * being enough the day a second program had to name a part: the module that
 * edits steps writes a part's id into a step, the host compares it, and two
 * derivations of an id from a heading are a step that is in a part on one
 * screen and in none on the other. So the derivation is in this package too —
 * `partIdsOf` and `partsOf` in `journey.ts`, over the record the parts are
 * read from: an id written beside the heading is used, and one that is not is
 * derived from the heading.
 *
 * ## The files a part owns, and what their names are relative to
 *
 * References are not the only thing an epic has. An epic written as a paper
 * is a folder with a `main.tex` that pulls other files in, and a module that
 * shows a document — the paper itself, the notes on it, the questions about
 * it — could not narrow to a part while a part knew only references. So a
 * part may name the files of the paper that are its own: `files`.
 *
 * Each is a path RELATIVE TO THE PAPER'S FOLDER, which is
 * `<project>/.kehikot/paper/<epic>/` — the folder `main.tex` is in. So
 * `parts/posting-seam.tex` is `<project>/.kehikot/paper/<epic>/parts/posting-seam.tex`.
 * That one, out of three that were possible:
 *
 * - **Absolute** is what a `passage.path` is, and would compare with one by
 *   `===`. But this string is written into a record that is committed and
 *   cloned, and an absolute path in a repository is one person's home
 *   directory in everybody's checkout.
 * - **Relative to the project** survives a clone, and repeats
 *   `.kehikot/paper/<epic>/` in every entry: a fact the record already holds
 *   (its slug) written again by hand, free to disagree with it, and free to
 *   name a file of ANOTHER epic's paper or no paper's at all.
 * - **Relative to the paper's folder** is the name the Paper module already
 *   has for a file — the keys of its file list, of its hashes and of its
 *   page map are exactly these — and the name a person reads in
 *   `\input{parts/posting-seam}`, plus the extension. It cannot name
 *   anything outside the paper, because there is nothing in it to say so.
 *
 * It is the file's name AS IT IS ON DISK, extension included. TeX lets
 * `\input{parts/a}` mean `parts/a.tex`; this does not, because guessing an
 * extension is a second derivation and the Paper module's file list has
 * already made the first.
 *
 * ## One function compares, and it is `paperFileOf`
 *
 * A module does not hold that relative name. It holds what `passage.path`
 * carries: an absolute path, on this machine. Turning one into the other is
 * the step two modules would do two ways — one stripping `projectPath` (which
 * a host spells as it was typed and Paper spells resolved, so the prefix
 * differs under a symlink), one matching a suffix (which finds
 * `chapters/intro.tex` in the wrong epic's paper). So it is done here, once:
 * `paperFileOf(path, epic)` answers the paper-relative name a path has, or
 * null, and every other function here calls it. Nobody else should.
 *
 * ## Text that is in no part's file
 *
 * Whatever is written directly in `main.tex`, and every file no part names,
 * belongs to the epic as a whole — and so, like a step with no `part` and a
 * reference no part lists, it is in no PICKED part: outside the focus, and
 * counted. Naming `main.tex` in a part is allowed and means what it says.
 */
export const PART_ID = /^[a-z0-9-]{1,80}$/;
/**
 * The module whose folder a paper is kept in.
 *
 * Spelled here for the reason `JOURNEYS_MODULE` is spelled in `journey.ts`:
 * `paperFileOf` has to recognise that folder in a path, and a second spelling
 * of `'kehikot.paper'` would be the day the two disagreed.
 * `moduleDir(projectPath, PAPER_MODULE)` is where a project's papers are, one
 * folder per epic, named by its slug.
 */
export const PAPER_MODULE = 'kehikot.paper';
/** `.kehikot/paper` — between the project and the epic's slug, in every path of a paper's file. */
const PAPERS_AT = `${KEHIKOT_DIR}/${moduleFolder(PAPER_MODULE)}`;
/**
 * One of a part's files, in the form it is stored and sent in — or null.
 *
 * The form: relative to the paper's folder; `/` between segments and never
 * `\`; no segment empty, `.` or `..`; not absolute in either platform's
 * spelling (`/x`, `C:x`); no control character; at most `LIMITS.PART_FILE`
 * characters; Unicode in NFC, because one filesystem hands names back
 * decomposed and two spellings of `ä` are two strings.
 *
 * What is tidied rather than refused is only what cannot change which file is
 * meant: space around the name, a leading `./`, and the normal form. Anything
 * else is null. `..` is not resolved — `a/../b` is refused, not read as `b` —
 * because this package opens nothing and cannot know that `a` is not a link.
 *
 * Why so strict for a name nobody opens HERE: a module on the other end will
 * join this onto a folder and read it. That module has its own fence and must
 * keep it; this is the second one, and it means a string that reached a
 * module through `context.parts` was never a way out of the paper.
 */
export function partFile(raw) {
    if (typeof raw !== 'string' || raw.length > LIMITS.PATH)
        return null;
    let file = raw.trim().normalize('NFC');
    while (file.startsWith('./'))
        file = file.slice(2);
    if (!file || file.length > LIMITS.PART_FILE)
        return null;
    if (file.startsWith('/') || /^[A-Za-z]:/.test(file))
        return null;
    if (/[\\\u0000-\u001f\u007f]/.test(file))
        return null;
    for (const segment of file.split('/')) {
        if (!segment || segment === '.' || segment === '..')
            return null;
    }
    return file;
}
/** Whether a string is ALREADY in `partFile`'s form, exactly. What the wire demands of each entry. */
export function isPartFile(value) {
    return typeof value === 'string' && partFile(value) === value;
}
/**
 * The paper-relative name of a file a caller is holding — or null when it is
 * not a file of the paper. THE comparison; see the essay at the top.
 *
 * `path` is either of the two things a module has:
 *
 * - **An absolute path**, as `passage.path` carries. It is a file of the
 *   paper exactly when it has `/.kehikot/paper/<epic>/` in it, and its name is
 *   what follows the first such segment. The segment is looked for IN the
 *   path, and the path is not measured against `context.projectPath`, on
 *   purpose: the Paper module publishes a path it has resolved, a host sends
 *   the project as somebody typed it, and under one symlink those two do not
 *   share a prefix. Backslashes are read as slashes, so a path from the other
 *   platform is read too.
 * - **A relative path**, which is taken to be relative to the paper's folder
 *   already — what the Paper module holds for its own files. It is the
 *   caller's word that it is; a module that has an absolute path should pass
 *   that and not trim it itself.
 *
 * `epic` is the open epic, `context.epic`. Pass it. Without it an absolute
 * path under ANY epic's paper folder is read, and `parts/intro.tex` of another
 * epic's paper is then indistinguishable from this one's — which is right
 * only for a caller that already knows every path it holds is the open
 * epic's. Something that is not a slug is no epic, and the answer is null.
 *
 * Names are compared as written, case and all. A filesystem that folds case
 * is the machine's own business and this package opens nothing; write the
 * name the way the folder spells it.
 *
 * What this cannot see: a paper folder that is itself a symlink to somewhere
 * else. The Paper module resolves it, publishes the far path, and that path
 * has no `.kehikot/paper/<epic>/` in it — so it is no part's file here, and
 * is counted outside a focus rather than guessed into one.
 */
export function paperFileOf(path, epic) {
    if (typeof path !== 'string' || path.length > LIMITS.PATH)
        return null;
    const spelled = path.trim().replace(/\\/g, '/');
    if (!spelled.startsWith('/') && !/^[A-Za-z]:\//.test(spelled))
        return partFile(spelled);
    if (typeof epic === 'string') {
        if (!EPIC_SLUG.test(epic))
            return null;
        const marker = `/${PAPERS_AT}/${epic}/`;
        const at = spelled.indexOf(marker);
        return at < 0 ? null : partFile(spelled.slice(at + marker.length));
    }
    const marker = `/${PAPERS_AT}/`;
    for (let at = spelled.indexOf(marker); at >= 0; at = spelled.indexOf(marker, at + 1)) {
        const rest = spelled.slice(at + marker.length);
        const slash = rest.indexOf('/');
        if (slash > 0 && EPIC_SLUG.test(rest.slice(0, slash)))
            return partFile(rest.slice(slash + 1));
    }
    return null;
}
export const partSchema = z.object({
    id: z.string().regex(PART_ID),
    /** What a person calls it. Drawn as given; never compared. */
    heading: z.string().max(LIMITS.TITLE).default(''),
    /** The references the host says belong to this part. Never absent, for the reason `showing` never is. */
    refs: z.array(z.string().min(1).max(LIMITS.REF)).max(LIMITS.PART_REFS).default([]),
    /** Whether a person has picked this part out. None picked means the whole epic. */
    picked: z.boolean().default(false),
    /**
     * The files of the epic's paper this part owns, each relative to the paper's
     * folder and in `partFile`'s form exactly.
     *
     * OPTIONAL, and absent means none — the one field here that is not defaulted
     * to empty. A part parsed before 0.32.0 is `{ id, heading, refs, picked }`
     * exactly, and hosts and modules hold that shape in their own tests and
     * comparisons; a key that appeared on every part from a host that never
     * sent it would be a change to all of them for a fact about none. So a part
     * from an older host, and a part that owns no file, have no `files`, and
     * the functions below read both as owning none. Read it yourself as
     * `part.files ?? []`, or not at all: `fileInFocus`, `pickedFiles` and
     * `partsOfFile` are the three questions there are.
     *
     * An entry that is not in the form is REFUSED, like an `id` that is not a
     * `PART_ID`, and for a reason of its own: a module will join this onto a
     * folder. A host composes the list with `partsOf`, which only produces the
     * form.
     */
    files: z
        .array(z
        .string()
        .min(1)
        .max(LIMITS.PART_FILE)
        .refine(isPartFile, 'a part\'s file is a path relative to the paper\'s folder: forward slashes, no "..", not absolute'))
        .max(LIMITS.PART_FILES)
        .optional(),
});
/**
 * `context.parts`, as a schema of its own so a host can check the list before
 * it composes a context around it. Two parts sharing an id is not refused
 * here: this rides in a context, and one doubtful field must not cost every
 * module on the canvas its greeting. The functions below read the first.
 */
export const partsSchema = z.array(partSchema).max(LIMITS.PARTS);
/** The parts a person has picked out. Empty when the whole epic is in front of them. */
export function pickedParts(parts) {
    return parts.filter((part) => part.picked);
}
/** Whether anything is narrowed at all. False is the resting state, and the only one an older host produces. */
export function isFocused(parts) {
    return parts.some((part) => part.picked);
}
/**
 * Whether a REFERENCE is in front of the person.
 *
 * True when nothing is picked out — the whole epic is in front of them — and
 * otherwise true exactly when a picked part lists it. A reference no part
 * lists is outside every focus, and is one of the "N outside the picked
 * parts" a module should count rather than drop.
 */
export function refInFocus(parts, ref) {
    const picked = pickedParts(parts);
    if (picked.length === 0)
        return true;
    return picked.some((part) => part.refs.includes(ref));
}
/**
 * Whether a thing ASSIGNED to a part — a step carrying `part` — is in front of
 * the person.
 *
 * True when nothing is picked out. Otherwise true exactly when the part it
 * names is picked. Something with no part belongs to the epic as a whole and
 * is therefore not in any PICKED part: it is outside the focus, and counted.
 * So is something naming a part the epic no longer has — an assignment to
 * nothing is not an assignment, and guessing which part was meant would be
 * the inference this field exists to avoid.
 */
export function partInFocus(parts, part) {
    const picked = pickedParts(parts);
    if (picked.length === 0)
        return true;
    return typeof part === 'string' && picked.some((one) => one.id === part);
}
/** The parts that own a file, in the epic's order. Usually one; `[]` for a file no part names. */
export function partsOfFile(parts, file, epic) {
    const named = paperFileOf(file, epic);
    if (named === null)
        return [];
    return parts.filter((part) => (part.files ?? []).includes(named));
}
/**
 * The files the picked parts own, once each, in the parts' order — the list a
 * module showing the paper draws under a focus.
 *
 * `[]` when nothing is picked, which is NOT "show no files": ask `isFocused`
 * first, as with `pickedParts`. `[]` while focused is real, and means the
 * picked parts own no file — everything the paper has is outside them.
 */
export function pickedFiles(parts) {
    const out = [];
    for (const part of pickedParts(parts)) {
        for (const file of part.files ?? [])
            if (!out.includes(file))
                out.push(file);
    }
    return out;
}
/**
 * Whether a FILE of the epic's paper is in front of the person.
 *
 * The same rule as its two siblings. True when nothing is picked out.
 * Otherwise true exactly when a picked part owns the file. A file no part
 * names — `main.tex`, usually, and whatever is written directly in it — is
 * outside every focus and is counted, not dropped; so is a path that is not a
 * file of this epic's paper at all.
 *
 * `file` is whatever the caller holds, an absolute `passage.path` or a name
 * relative to the paper's folder, and `epic` is `context.epic`: both are
 * `paperFileOf`'s, which does the comparing. For "N files outside the picked
 * parts", hand this to `focusCount`:
 * `focusCount(parts, files, (file) => fileInFocus(parts, file, epic))`.
 */
export function fileInFocus(parts, file, epic) {
    const picked = pickedParts(parts);
    if (picked.length === 0)
        return true;
    const named = paperFileOf(file, epic);
    return named !== null && picked.some((part) => (part.files ?? []).includes(named));
}
/**
 * The sentence's two numbers: how many of these are in front of the person,
 * and how many are outside the picked parts.
 *
 * Offered so that three modules do not count three ways. `inFocus` is the
 * module's own answer per item — `refInFocus`, `partInFocus` or `fileInFocus` — and
 * `outside` is zero whenever nothing is picked, which is the cue to say
 * nothing at all.
 */
export function focusCount(parts, items, inFocus) {
    if (!isFocused(parts))
        return { shown: items.length, outside: 0 };
    let shown = 0;
    for (const item of items)
        if (inFocus(item))
            shown += 1;
    return { shown, outside: items.length - shown };
}
/**
 * Whether an anchored thing is in front of the person. THE rule.
 *
 * True when nothing is picked out. Otherwise true exactly when one of its
 * anchors is in a picked part, each asked of the function above that owns the
 * question. Something with no anchor is in no PICKED part: outside the focus,
 * and counted — the same answer as a step with no `part`, a ref no part lists
 * and a file no part names.
 *
 * `epic` is `context.epic`, for `fileInFocus`. Pass it.
 */
export function anchorInFocus(parts, anchor, epic) {
    if (!isFocused(parts))
        return true;
    if (!anchor)
        return false;
    const anchors = Array.isArray(anchor) ? anchor : [anchor];
    return anchors.some((one) => 'file' in one
        ? fileInFocus(parts, one.file, epic)
        : 'ref' in one
            ? refInFocus(parts, one.ref)
            : partInFocus(parts, one.part));
}
/**
 * A list, narrowed to the picked parts: the items in front, and how many are
 * not.
 *
 * `anchorOf` is the whole of what a module writes. Everything optional is in
 * `options`, under the names `useFocus().narrow` uses: `epic` is
 * `context.epic`, for a `{ file }` anchor — pass it. `keep` is for the one thing
 * a tick in another control must never do, which is take away what somebody's
 * hands are in — the note being written, the question on screen. An item it
 * answers true for is drawn though it is outside, and is still COUNTED
 * outside, because it is; `kept` says how many, so the page can say why they
 * are there.
 */
export function narrowToFocus(parts, items, anchorOf, options = {}) {
    const { epic, keep } = options;
    if (!isFocused(parts))
        return { shown: [...items], outside: 0, kept: 0 };
    const inFocus = (item) => anchorInFocus(parts, anchorOf(item), epic);
    const { outside } = focusCount(parts, items, inFocus);
    let kept = 0;
    const shown = items.filter((item) => {
        if (inFocus(item))
            return true;
        if (!keep?.(item))
            return false;
        kept += 1;
        return true;
    });
    return { shown, outside, kept };
}
/**
 * The sentence every module says while parts are picked: how many of its
 * items are outside them, and which parts.
 *
 *     3 questions outside the picked part (The posting seam).
 *     1 note outside the 2 picked parts (The posting seam, What the tests check).
 *
 * `''` when nothing is picked, which is the cue to draw nothing. `0 … outside`
 * IS said: a focus that hides nothing today is still a focus, and it is how a
 * person sees that this pane is following their ticks.
 *
 * The wording is the Checklist module's, which is the References module's
 * (`14 outside the picked part · The posting seam`) with the noun in it and a
 * full stop — a sentence that can stand alone in a pane. `noun` is what the
 * module calls one item; give `[one, many]` where adding an `s` is wrong.
 */
export function focusSentence(parts, outside, noun = 'item') {
    const picked = pickedParts(parts);
    if (picked.length === 0)
        return '';
    const [one, many] = typeof noun === 'string' ? [noun, `${noun}s`] : noun;
    const where = picked.length === 1 ? 'the picked part' : `the ${picked.length} picked parts`;
    const names = picked.map((part) => part.heading || part.id).join(', ');
    return `${outside} ${outside === 1 ? one : many} outside ${where} (${names}).`;
}
/**
 * Where the control is, for the sentence's tooltip or the line under an empty
 * pane: it is never on the module's own page.
 */
export const FOCUS_WHERE = 'Parts are picked in the host’s bar, beside the epic. Unpick them there to see the rest.';
/**
 * Two lists of parts, by value: what `context.parts` is compared with before
 * a page is redrawn for it. A host re-sends the context after every change
 * anywhere on the canvas, and the list is the same list on nearly all of them.
 */
export function sameParts(a, b) {
    return a === b || JSON.stringify(a) === JSON.stringify(b);
}
//# sourceMappingURL=parts.js.map