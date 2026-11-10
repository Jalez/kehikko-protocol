import type { ProposalKeeper } from './site.js';
/**
 * The node half of proposals (2.71.0): the book kept as a file in the module's
 * own folder of the project, and texts read and written under a folder with
 * the path confined to it. Everything else is `kehikot-module-protocol/proposals`.
 *
 * The book lives at `<project>/.kehikot/<module>/proposals/<name>.json`, inside
 * the project rather than on the machine, so a project carried to another
 * machine carries what was proposed and what became of it; the host's
 * per-project setting decides whether `.kehikot/` is committed, as for every
 * other file a module keeps there.
 */
/** The folder, under the module's, that holds its books. */
export declare const PROPOSALS_FOLDER = "proposals";
/** Where one book is: `<project>/.kehikot/<module>/proposals/<name>.json`, or null with no project. `name` is a `DATA_FILE`. */
export declare function bookPath(project: string | null | undefined, moduleId: string, name?: string): string | null;
/**
 * The keeper over that file. `name` picks a book per kind of text a module has
 * several of (`fileKeeper(ID, { name: epic })` keeps one per epic); the default
 * is one book for the project. An empty book removes the file.
 */
export declare function fileKeeper(moduleId: string, options?: {
    name?: string | ((project: string) => string);
}): ProposalKeeper;
/**
 * `text` and `write` for a `ProposalSite` over text files under a folder:
 * `dir(project)` is the folder (null when the project has none), `name(file)`
 * turns the module's name for a text into a path inside it (null to refuse).
 * A path that resolves outside the folder is refused; a write is atomic.
 */
export declare function textFiles(options: {
    dir(project: string): string | null;
    name?(file: string): string | null;
    encoding?: BufferEncoding;
}): {
    text(project: string, file: string): string | null;
    write(project: string, file: string, text: string): {
        ok: true;
    } | {
        ok: false;
        why: string;
    };
    pathOf(project: string, file: string): string | null;
};
