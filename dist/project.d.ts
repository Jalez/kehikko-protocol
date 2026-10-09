/**
 * Where a module's data for one project lives, `<projectPath>/.kehikot/<module>/<file>.json`, and
 * how a project's `.gitignore` says not to commit it. Strings and pure functions only: no I/O, and
 * paths are joined POSIX-style with `/`.
 * Design notes: docs/project-data.md.
 */
/**
 * The folder in a project that holds the app's data, spelled once; this is the only place it is
 * spelled. `kehikot` (the app), not `kehikko` (one canvas inside it).
 */
export declare const KEHIKOT_DIR = ".kehikot";
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
 * A module's folder name, from its id: `kehikot.checklist` and the pre-rename `roadmap.checklist`
 * both become `checklist`; an id with neither prefix is used whole. Throws, rather than falling
 * back, when the id is not a `MODULE_ID` or the derived name is not a `MODULE_FOLDER`.
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
 * What a project's `.gitignore` is given, once, when that folder is first made: a comment saying
 * what the folder is, and the rule `.kehikot/`, which ignores the whole folder anywhere in the tree.
 */
export declare const KEHIKOT_IGNORE = "# Modules on a kehikot host keep this project's data here \u2014 checklists, notes,\n# journeys, questions \u2014 as plain JSON, one folder per module, so it sits beside\n# the work instead of inside somebody else's app. It is ignored because it is\n# one person's working material and not the project's. Remove these lines to\n# share it with everyone who clones this repository.\n.kehikot/\n";
/**
 * Does this `.gitignore` already ignore the folder? Generous on purpose: `.kehikot`, `.kehikot/`,
 * `/.kehikot/`, `**\/.kehikot/` and a commented-out `#.kehikot` all count. Not a gitignore engine;
 * the answer is only for deciding not to append.
 */
export declare function ignoresKehikot(gitignore: string): boolean;
/**
 * The text a `.gitignore` should have after this convention is added to it; the same text back,
 * unchanged, when it already ignores the folder. Append-only: a blank line if needed, then
 * `KEHIKOT_IGNORE`. Run it once, when the folder is first created, not on every write.
 */
export declare function withKehikotIgnored(gitignore: string): string;
/**
 * The text a `.gitignore` should have after this convention is taken out of it. Removes every
 * uncommented rule ignoring the folder, the comment lines directly above it and a stranded blank
 * line; leaves a commented-out `#.kehikot/` and a negation (`!.kehikot/…`) alone. Idempotent.
 */
export declare function withoutKehikotIgnored(gitignore: string): string;
//# sourceMappingURL=project.d.ts.map