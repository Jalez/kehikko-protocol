import { z } from 'zod';
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
export declare const FILE_DRAG_TYPE = "application/x-kehikot-file+json";
/** The fragment key a `file://` URL of a dragged file names its project under. */
export declare const FILE_DRAG_PROJECT_KEY = "kehikot-project";
export declare const FILE_DRAG_KINDS: readonly ["file", "folder"];
export type FileDragKind = (typeof FILE_DRAG_KINDS)[number];
/**
 * A path inside a project, relative to it: forward slashes, no leading slash, no drive, no empty,
 * `.` or `..` segment, no NUL. At most `LIMITS.PATH`.
 */
export declare const projectPathSchema: z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>, string, string>;
/** One dragged file or folder: the project's absolute folder, and the path inside it. */
export declare const fileDragSchema: z.ZodObject<{
    project: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
    path: z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>, string, string>;
    kind: z.ZodDefault<z.ZodEnum<["file", "folder"]>>;
}, "strip", z.ZodTypeAny, {
    path: string;
    project: string;
    kind: "file" | "folder";
}, {
    path: string;
    project: string;
    kind?: "file" | "folder" | undefined;
}>;
export type FileDrag = z.infer<typeof fileDragSchema>;
export type FileDragInput = z.input<typeof fileDragSchema>;
/** What these functions need of a drag's `DataTransfer`. */
export interface DataTransferLike {
    setData?(format: string, data: string): void;
    getData(format: string): string;
    readonly types: ArrayLike<string> | Iterable<string>;
}
/** The file's absolute path, as the dragging page names it. */
export declare function fileDragAbsolute(drag: FileDragInput): string;
/** The `file://` URL a drag carries as `text/uri-list`, with the project (and a folder's kind) in the fragment. */
export declare function fileDragUrl(drag: FileDragInput): string;
/** A drag read back from a `file://` URL. Without the fragment, only when `project` is given and holds it. */
export declare function fileDragFromUrl(url: string, project?: string | null): FileDrag | null;
declare function read(data: DataTransferLike, options?: {
    project?: string | null;
}): FileDrag | null;
/**
 * Put a file on a drag (`dragstart`), in all three spellings. Returns false, writing nothing, when
 * `drag` is not one (an absolute or escaping path, no project) or the drag takes no data.
 */
declare function set(data: DataTransferLike, drag: FileDragInput): boolean;
/**
 * Whether a drag may carry a file in this format, from its types alone (all a `dragover` sees). True
 * for the format's own type, and for `text/uri-list` (what crosses origins in WebKit); `read` on
 * `drop` says for sure.
 */
declare function offered(data: DataTransferLike): boolean;
/** The drag format for "a file in a project": `fileDrag.set` on `dragstart`, `fileDrag.read` on `drop`. */
export declare const fileDrag: {
    readonly set: typeof set;
    readonly read: typeof read;
    readonly offered: typeof offered;
    readonly url: typeof fileDragUrl;
    readonly fromUrl: typeof fileDragFromUrl;
    readonly absolute: typeof fileDragAbsolute;
};
export {};
