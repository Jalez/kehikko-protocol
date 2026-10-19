/**
 * Where a module's data for one project lives, `<projectPath>/.kehikot/<module>/<file>.json`, and
 * how a project's `.gitignore` says not to commit it. Plus the one file at the top of `.kehikot/`
 * (2.1.0): `project.json`, the project's permanent id, written only by the host. Strings, one
 * schema and pure functions only: no I/O, and paths are joined POSIX-style with `/`.
 * Design notes: docs/project-data.md.
 */
import { z } from 'zod';
/**
 * The folder in a project that holds the app's data, spelled once; this is the only place it is
 * spelled. `kehikot` (the app), not `kehikko` (one canvas inside it).
 */
export declare const KEHIKOT_DIR = ".kehikot";
/**
 * The one file at the top of `.kehikot/` (2.1.0), beside the module folders rather than in one: the
 * project's permanent id. Written ONLY by the host, once, and never rewritten; read by anyone.
 * Every other file a project keeps is a module's, under `.kehikot/<module>/`.
 */
export declare const PROJECT_FILE = "project.json";
/**
 * What a module may call a file inside its own folder: lowercase, digits and dashes, no dot and no
 * slash, so no accepted spelling can leave the folder. A file name is a constant in the module that
 * owns it, never a string that arrived over the wire.
 */
export declare const DATA_FILE: RegExp;
/**
 * What a module's folder inside `.kehikot/` may be called, once derived. Checked by `moduleFolder()`
 * as a rule of its own rather than inherited from `MODULE_ID`; first and last characters must be a
 * letter or a digit, so neither `.` nor `..` passes.
 */
export declare const MODULE_FOLDER: RegExp;
/**
 * A module's folder name, from its id: `kehikot.checklist` becomes `checklist`; an id without that
 * prefix is used whole. Throws, rather than falling
 * back, when the id is not a `MODULE_ID`, the derived name is not a `MODULE_FOLDER`, or (2.1.0) it
 * is `PROJECT_FILE`, the host's file.
 */
export declare function moduleFolder(moduleId: string): string;
/**
 * The `.kehikot` folder itself for a project, or `null` when there is no project (`null`,
 * `undefined` or a blank path). A caller must never turn that `null` into a guess such as its own
 * directory or the working directory.
 */
export declare function kehikotDir(projectPath: string | null | undefined): string | null;
/**
 * One module's own folder inside it, or `null` when there is no project. The directory a module
 * creates, confines itself to, and is the only owner of. Throws when `moduleId` is not a legal id.
 */
export declare function moduleDir(projectPath: string | null | undefined, moduleId: string): string | null;
/**
 * One file this module keeps for this project (`<name>.json` in its folder), or `null` when there
 * is no project. Throws, rather than returning null, when `name` is not a `DATA_FILE` or `moduleId`
 * is not a legal id.
 */
export declare function moduleFile(projectPath: string | null | undefined, moduleId: string, name: string): string | null;
/**
 * Is `child` at or beneath `parent`? String comparison only: it knows nothing about symlinks,
 * uncollapsed `..` or whether either path exists. A caller confining a write must `realpath` both
 * sides first and compare the results.
 */
export declare function within(parent: string, child: string): boolean;
/**
 * `<projectPath>/.kehikot/project.json`, or `null` when there is no project (as `kehikotDir`). Its
 * contents are a `projectFileSchema`. A module reads the id from `context.projectId`, not from here.
 */
export declare function projectFile(projectPath: string | null | undefined): string | null;
/**
 * What `project.json` holds. `id` is a `PROJECT_ID`, minted by the host the first time it meets the
 * project (a lowercase random UUID). `createdAt` is when, ISO 8601, or null. Never committed: a
 * clone, copy or git worktree carrying it would be the same project twice (`PROJECT_FILE_IGNORE`).
 */
export declare const projectFileSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string | null;
}, {
    id: string;
    createdAt?: string | null | undefined;
}>;
export type ProjectFile = z.infer<typeof projectFileSchema>;
/** Read a `project.json` off anything, or null. Never throws: a malformed file is no id, and the host mints one. */
export declare function readProjectFile(value: unknown): ProjectFile | null;
/**
 * What a module keys MACHINE-level state for a project by (2.1.0): the host's `projectId` when it sent
 * one, else the absolute `projectPath` (an older host sends no id), else `null` (no project). `by` says
 * which, so a module can move what it kept under the path to the id the first time it is given one.
 * Project-level state needs no key: it lives in the project folder and moves with it.
 */
export type ProjectKey = {
    by: 'id';
    key: string;
} | {
    by: 'path';
    key: string;
};
export declare function projectKey(context: {
    projectId?: string | null;
    projectPath?: string | null;
} | null | undefined): ProjectKey | null;
/**
 * The lines that keep `project.json` out of git, ALWAYS, even when the rest of `.kehikot/` is shared:
 * a comment and `.kehikot/project.json`. Part of `KEHIKOT_IGNORE`; left behind by
 * `withoutKehikotIgnored`; added on its own by `withProjectFileIgnored`.
 */
export declare const PROJECT_FILE_IGNORE = "# The project's own id, which Kehikot keeps in .kehikot/project.json. It is never\n# committed, even when the rest of .kehikot/ is shared: a clone, a copy or a git\n# worktree carrying it would be taken for this same project. Keep this line.\n.kehikot/project.json\n";
/**
 * What a project's `.gitignore` is given, once, when that folder is first made: a comment saying
 * what the folder is and the rule `.kehikot/`, which ignores the whole folder anywhere in the tree;
 * then, after a blank line, `PROJECT_FILE_IGNORE` (2.1.0), which stays when the first block goes.
 */
export declare const KEHIKOT_IGNORE = "# Modules on a kehikot host keep this project's data here \u2014 checklists, notes,\n# journeys, questions \u2014 as plain JSON, one folder per module, so it sits beside\n# the work instead of inside somebody else's app. It is ignored because it is\n# one person's working material and not the project's. Remove these lines to\n# share it with everyone who clones this repository.\n.kehikot/\n\n# The project's own id, which Kehikot keeps in .kehikot/project.json. It is never\n# committed, even when the rest of .kehikot/ is shared: a clone, a copy or a git\n# worktree carrying it would be taken for this same project. Keep this line.\n.kehikot/project.json\n";
/**
 * Does this `.gitignore` already ignore the folder? Generous on purpose: `.kehikot`, `.kehikot/`,
 * `/.kehikot/`, `**\/.kehikot/` and a commented-out `#.kehikot` all count. Not a gitignore engine;
 * the answer is only for deciding not to append.
 */
export declare function ignoresKehikot(gitignore: string): boolean;
/**
 * Does this `.gitignore` keep `project.json` out of git (2.1.0)? Strict, unlike `ignoresKehikot`: a
 * commented-out rule does NOT count, because the file must be ignored whatever anybody decided about
 * the folder. An uncommented rule ignoring the folder (`.kehikot/`, `.kehikot/*`, …) or the file
 * itself counts; the last such line wins, so a later `!` negation reads as not ignored. Not a
 * gitignore engine: a false "no" costs one redundant line.
 */
export declare function ignoresProjectFile(gitignore: string): boolean;
/**
 * The text a `.gitignore` should have so that `project.json` is never committed (2.1.0); the same
 * text back when it already is not (`ignoresProjectFile`). Append-only: `PROJECT_FILE_IGNORE`. A host
 * runs it whenever it writes `project.json` — unlike the folder's rule, this one is nobody's choice.
 */
export declare function withProjectFileIgnored(gitignore: string): string;
/**
 * The text a `.gitignore` should have after this convention is added to it; the same text back,
 * unchanged, when it already ignores the folder and `project.json`. Append-only: `KEHIKOT_IGNORE`,
 * or only the part missing — the folder's block where the file already has its rule, or (2.1.0)
 * `PROJECT_FILE_IGNORE` under a commented-out `#.kehikot/`. Run it once, when the folder is first created.
 */
export declare function withKehikotIgnored(gitignore: string): string;
/**
 * The text a `.gitignore` should have after this convention is taken out of it. Removes every
 * uncommented rule ignoring the folder, the comment lines directly above it and a stranded blank
 * line; leaves a commented-out `#.kehikot/` and a negation (`!.kehikot/…`) alone. Idempotent. When
 * it removed anything, `project.json` stays ignored (2.1.0): its rule is kept, or added.
 */
export declare function withoutKehikotIgnored(gitignore: string): string;
