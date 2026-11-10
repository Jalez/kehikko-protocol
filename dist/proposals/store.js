import { existsSync, mkdirSync, readFileSync, realpathSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { DATA_FILE, moduleDir } from '../project.js';
import { bookOf } from './core.js';
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
export const PROPOSALS_FOLDER = 'proposals';
/** Where one book is: `<project>/.kehikot/<module>/proposals/<name>.json`, or null with no project. `name` is a `DATA_FILE`. */
export function bookPath(project, moduleId, name = 'all') {
    if (!DATA_FILE.test(name))
        throw new Error(`"${name}" is not a name a proposals book may have: lowercase letters, digits and dashes.`);
    const dir = moduleDir(project, moduleId);
    return dir === null ? null : `${dir}/${PROPOSALS_FOLDER}/${name}.json`;
}
function writeAtomically(path, text) {
    mkdirSync(dirname(path), { recursive: true });
    const scratch = `${path}.${process.pid}.${Date.now().toString(36)}.tmp`;
    writeFileSync(scratch, text);
    renameSync(scratch, path);
}
/**
 * The keeper over that file. `name` picks a book per kind of text a module has
 * several of (`fileKeeper(ID, { name: epic })` keeps one per epic); the default
 * is one book for the project. An empty book removes the file.
 */
export function fileKeeper(moduleId, options = {}) {
    const nameOf = (project) => (typeof options.name === 'function' ? options.name(project) : options.name ?? 'all');
    const pathOf = (project) => {
        const path = bookPath(project, moduleId, nameOf(project));
        if (path === null)
            throw new Error('A proposals book needs a project.');
        return path;
    };
    return {
        read(project) {
            const path = pathOf(project);
            if (!existsSync(path))
                return { version: 1, proposals: [] };
            try {
                return bookOf(JSON.parse(readFileSync(path, 'utf8')));
            }
            catch {
                return { version: 1, proposals: [] };
            }
        },
        write(project, book) {
            const path = pathOf(project);
            if (!book.proposals.length) {
                try {
                    unlinkSync(path);
                }
                catch {
                    /* Already gone. */
                }
                return;
            }
            writeAtomically(path, `${JSON.stringify(book, null, 2)}\n`);
        },
    };
}
/**
 * `text` and `write` for a `ProposalSite` over text files under a folder:
 * `dir(project)` is the folder (null when the project has none), `name(file)`
 * turns the module's name for a text into a path inside it (null to refuse).
 * A path that resolves outside the folder is refused; a write is atomic.
 */
export function textFiles(options) {
    const encoding = options.encoding ?? 'utf8';
    const pathOf = (project, file) => {
        const dir = options.dir(project);
        if (!dir)
            return null;
        const name = options.name ? options.name(file) : file;
        if (!name || name.includes('\0'))
            return null;
        const root = resolve(dir);
        const path = resolve(root, name);
        if (path !== root && !path.startsWith(root + sep))
            return null;
        /* A symlink inside the folder that points out of it is a path out of it. */
        try {
            const real = realpathSync(path);
            const realRoot = realpathSync(root);
            if (real !== realRoot && !real.startsWith(realRoot + sep))
                return null;
        }
        catch {
            /* Not there yet: a write creates it under the folder. */
        }
        return path;
    };
    return {
        pathOf,
        text(project, file) {
            const path = pathOf(project, file);
            if (!path)
                return null;
            try {
                return readFileSync(path, encoding);
            }
            catch {
                return null;
            }
        },
        write(project, file, text) {
            const path = pathOf(project, file);
            if (!path)
                return { ok: false, why: `${file} is not a text this module keeps.` };
            try {
                writeAtomically(path, text);
                return { ok: true };
            }
            catch (error) {
                return { ok: false, why: `${file} could not be written: ${error.message}` };
            }
        },
    };
}
