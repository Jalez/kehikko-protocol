import { z } from 'zod';
import { LIMITS } from './limits.js';
/**
 * A file in a project, dragged from one module's page and dropped on another's (2.94.0).
 *
 * The person drags a file out of one module (a tree of the project's files, a list of search
 * results) and drops it on another (an editor, a viewer). Neither page knows the other: they meet
 * on this one format, carried by the browser's own drag and drop, so no module names another.
 *
 * ## Three spellings on one drag
 *
 * `fileDrag.set` writes the same file three ways, because a module's page is a frame of its own
 * origin and browsers do not hand every type across origins:
 *
 * - `FILE_DRAG_TYPE` (`application/x-kehikot-file+json`): `{ project, path, kind }` as JSON. Read
 *   first. WebKit (the desktop app's web view, and Safari) keeps a custom type to the origin that
 *   set it, so a page on another port does not see it there; Chromium and Firefox hand it over.
 * - `text/uri-list`: a `file://` URL of the file, with the project in the fragment
 *   (`#kehikot-project=<folder>`). A standard type every engine carries across origins, and what a
 *   program outside the app understands when the file is dropped there.
 * - `text/plain`: the file's absolute path, which is what dropping it into a terminal or a text
 *   field should type.
 *
 * `fileDrag.read` reads them in that order. A receiver that knows its own project passes it
 * (`{ project }`), and then a bare absolute path (a URL without the fragment, or plain text) inside
 * that folder is read as a file of it too. Nothing here opens anything: the path is the dragging
 * page's claim, and a receiver that opens it owes the confinement check it owes any path it is
 * handed (`path` stays inside `project` by its shape; the disk may still say otherwise, through a
 * link).
 *
 * During `dragover` a browser hides the data and shows only the types: `fileDrag.offered` answers
 * whether a drag may be a file from this format, so a page can say it takes the drop.
 *
 * Pure: the drag's data is reached through the `DataTransferLike` it is handed.
 */
export const FILE_DRAG_TYPE = 'application/x-kehikot-file+json';
/** The fragment key a `file://` URL of a dragged file names its project under. */
export const FILE_DRAG_PROJECT_KEY = 'kehikot-project';
export const FILE_DRAG_KINDS = ['file', 'folder'];
const absolute = (path) => path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path);
/**
 * A path inside a project, relative to it: forward slashes, no leading slash, no drive, no empty,
 * `.` or `..` segment, no NUL. At most `LIMITS.PATH`.
 */
export const projectPathSchema = z
    .string()
    .min(1)
    .max(LIMITS.PATH)
    .refine((path) => !path.includes('\0') && !path.includes('\\'), { message: 'a project path has no NUL and no backslash' })
    .refine((path) => !absolute(path), { message: 'a project path is relative to the project' })
    .refine((path) => path.split('/').every((part) => part !== '' && part !== '.' && part !== '..'), {
    message: 'a project path has no empty, "." or ".." part, so it stays inside the project',
});
/** One dragged file or folder: the project's absolute folder, and the path inside it. */
export const fileDragSchema = z.object({
    project: z
        .string()
        .min(1)
        .max(LIMITS.PATH)
        .refine((path) => !path.includes('\0'), { message: 'a folder has no NUL' })
        .refine(absolute, { message: 'the project is its absolute folder' }),
    path: projectPathSchema,
    kind: z.enum(FILE_DRAG_KINDS).default('file'),
});
const trimEnd = (folder) => (folder.length > 1 ? folder.replace(/[\\/]+$/, '') : folder);
/** The file's absolute path, as the dragging page names it. */
export function fileDragAbsolute(drag) {
    return `${trimEnd(drag.project)}/${drag.path}`;
}
const encodePath = (path) => path
    .replace(/\\/g, '/')
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
/** The `file://` URL a drag carries as `text/uri-list`, with the project (and a folder's kind) in the fragment. */
export function fileDragUrl(drag) {
    const parsed = fileDragSchema.parse(drag);
    const whole = fileDragAbsolute(parsed);
    const path = encodePath(whole.startsWith('/') ? whole : `/${whole}`);
    const hash = new URLSearchParams({ [FILE_DRAG_PROJECT_KEY]: parsed.project });
    if (parsed.kind === 'folder')
        hash.set('kind', 'folder');
    return `file://${path}#${hash.toString()}`;
}
/** The parts of an absolute path inside `project`, or null when it is not inside it. */
function within(project, whole, kind) {
    const root = trimEnd(project);
    const prefix = root.endsWith('/') ? root : `${root}/`;
    if (!whole.startsWith(prefix))
        return null;
    const read = fileDragSchema.safeParse({ project: root, path: whole.slice(prefix.length).replace(/\/+$/, ''), kind });
    return read.success ? read.data : null;
}
/** A drag read back from a `file://` URL. Without the fragment, only when `project` is given and holds it. */
export function fileDragFromUrl(url, project) {
    let parsed;
    try {
        parsed = new URL(url.trim());
    }
    catch {
        return null;
    }
    if (parsed.protocol !== 'file:')
        return null;
    let whole;
    try {
        whole = decodeURIComponent(parsed.pathname);
    }
    catch {
        return null;
    }
    /* `file:///C:/x` is `/C:/x` as a pathname. */
    if (/^\/[A-Za-z]:\//.test(whole))
        whole = whole.slice(1);
    const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''));
    const kind = hash.get('kind') === 'folder' ? 'folder' : 'file';
    const named = hash.get(FILE_DRAG_PROJECT_KEY) ?? project ?? null;
    if (!named)
        return null;
    /* The fragment's project has to agree with the receiver's when it has one. */
    if (project && trimEnd(named) !== trimEnd(project))
        return null;
    return within(named, whole, kind);
}
const typesOf = (data) => Array.from(data.types);
/** The first URL of a `text/uri-list` (lines starting with `#` are comments). */
function firstUrl(list) {
    for (const line of list.split(/\r?\n/)) {
        const one = line.trim();
        if (one && !one.startsWith('#'))
            return one;
    }
    return null;
}
function read(data, options = {}) {
    const project = options.project ?? null;
    const safely = (type) => {
        try {
            return data.getData(type) ?? '';
        }
        catch {
            return '';
        }
    };
    const json = safely(FILE_DRAG_TYPE);
    if (json && json.length <= LIMITS.PATH * 3) {
        try {
            const got = fileDragSchema.safeParse(JSON.parse(json));
            if (got.success && (!project || trimEnd(got.data.project) === trimEnd(project)))
                return got.data;
            if (got.success)
                return null;
        }
        catch {
            /* Not JSON: try the standard types. */
        }
    }
    const url = firstUrl(safely('text/uri-list').slice(0, LIMITS.PATH * 4));
    if (url) {
        const got = fileDragFromUrl(url, project);
        if (got)
            return got;
    }
    if (project) {
        const text = safely('text/plain').trim();
        if (text && text.length <= LIMITS.PATH && !text.includes('\n') && absolute(text))
            return within(project, text, 'file');
    }
    return null;
}
/**
 * Put a file on a drag (`dragstart`), in all three spellings. Returns false, writing nothing, when
 * `drag` is not one (an absolute or escaping path, no project) or the drag takes no data.
 */
function set(data, drag) {
    const parsed = fileDragSchema.safeParse(drag);
    if (!parsed.success || !data.setData)
        return false;
    data.setData(FILE_DRAG_TYPE, JSON.stringify(parsed.data));
    data.setData('text/uri-list', fileDragUrl(parsed.data));
    data.setData('text/plain', fileDragAbsolute(parsed.data));
    return true;
}
/**
 * Whether a drag may carry a file in this format, from its types alone (all a `dragover` sees). True
 * for the format's own type, and for `text/uri-list` (what crosses origins in WebKit); `read` on
 * `drop` says for sure.
 */
function offered(data) {
    const types = typesOf(data);
    return types.includes(FILE_DRAG_TYPE) || types.includes('text/uri-list');
}
/** The drag format for "a file in a project": `fileDrag.set` on `dragstart`, `fileDrag.read` on `drop`. */
export const fileDrag = { set, read, offered, url: fileDragUrl, fromUrl: fileDragFromUrl, absolute: fileDragAbsolute };
