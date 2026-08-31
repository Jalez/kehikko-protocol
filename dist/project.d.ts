/**
 * Where a module's data for one project lives, and how a project says it does
 * not want that data committed.
 *
 * ## Why this is in the protocol package
 *
 * `roadmap.context` carries `projectPath`, and the moment it did, every module
 * that keeps anything had the same question: *given that path, where do I put
 * my file?* Four modules answering it separately is four answers, and the
 * failure is not a crash. A module that spells the folder `.kehikko` and one
 * that spells it `kehikko` both work, both look right, and the person who opens
 * their project finds their notes in one place and their checklists in another,
 * with nothing on any screen to say why. It is exactly the class of
 * disagreement this package exists for — the same class as `roadmap.hello` and
 * `roadmap.Hello` — so the spelling is written down once and both sides import
 * it.
 *
 * ## What the convention is
 *
 * `<projectPath>/.kehikko/<module's own file>.json`. The path IS the partition:
 * a module does not key its store by project, because the store it opened is
 * already that project's. Two projects are two files in two folders, and
 * switching project is opening a different file rather than filtering a bigger
 * one.
 *
 * ## What is here and what is deliberately not
 *
 * Strings and pure functions over strings, like everything else in this
 * package. Nothing here creates a directory, reads a `.gitignore`, or checks
 * that a path exists — a module does that, in its own process, where the
 * filesystem is. In particular `within()` is a comparison and NOT a security
 * check on its own: it answers a question about two strings, and the caller is
 * the one that has to have resolved the symlinks first. See its note.
 *
 * Paths are joined POSIX-style, with `/`. Every host this protocol has run on
 * hands out POSIX paths, and a module that needs real path arithmetic has
 * `node:path` and should use it; what this file offers is the one join both
 * sides have to agree on.
 */
/**
 * The folder, spelled once.
 *
 * Dot-prefixed because it is a program's working material sitting in somebody
 * else's repository, and the dot is the long-standing way of saying "this is
 * not part of what you came here to read". `kehikko` because that is the host
 * this data belongs to; a folder named `data` or `.modules` in a stranger's
 * project says nothing about who put it there or who to ask about removing it.
 */
export declare const KEHIKKO_DIR = ".kehikko";
/**
 * What a module may call its own file inside that folder.
 *
 * Lowercase, digits and dashes, no dot and no slash — so there is no spelling
 * accepted here that can leave the folder it is joined onto. That is not the
 * reason the pattern exists, but it is the reason it has no dot in it.
 *
 * The reason it exists is that `kehikkoFile()` is going to be called, in every
 * module, on a path that arrived over the wire. If the NAME could also arrive
 * over the wire the pair would be a file-writing primitive addressable by a
 * stranger. A module's file is one of its constants; passing anything else is a
 * bug in the module, and this pattern is where that bug stops.
 */
export declare const DATA_FILE: RegExp;
/**
 * The folder a module's data for this project lives in — or `null`, because
 * there may be no project.
 *
 * `null` in and `null` out, and that is the whole of the design. A module with
 * no project has nowhere to read and nowhere to write, and that is an ordinary
 * state: no project is open, or the host is older than `projectPath`. What it
 * must never become is a guess. A module that fell back to its own directory,
 * or to the working directory, would be writing somebody's notes into a folder
 * they will never look in, and every screen would say it had saved them.
 */
export declare function kehikkoDir(projectPath: string | null | undefined): string | null;
/**
 * The one file this module keeps for this project, or `null` when there is no
 * project.
 *
 * Throws — rather than returning null — when `name` is not a legal file name.
 * The two failures are not the same and must not be answered the same way.
 * "There is no project" is a state a person can be in and a screen can explain.
 * "This module asked for a file called `../../../etc/passwd`" is a program being
 * wrong, and a `null` there would let it be wrong quietly.
 */
export declare function kehikkoFile(projectPath: string | null | undefined, name: string): string | null;
/**
 * Is `child` at or beneath `parent`?
 *
 * ## Read this before using it as a fence
 *
 * This is string comparison. It knows nothing about symlinks, about `..` that
 * has not been collapsed, or about whether either path exists — this package
 * does no I/O and cannot. A module confining a write to `<projectPath>/.kehikko`
 * has to `realpath` both sides FIRST and compare the results; handing this
 * function two unresolved paths and believing the answer is how a fence gets
 * built that a symlink walks straight through.
 *
 * What it is for is the comparison itself, which is easy to write subtly wrong:
 * `child.startsWith(parent)` is true for `/a/kehikko-elsewhere` against
 * `/a/kehikko`, and that one character is the whole bug.
 */
export declare function within(parent: string, child: string): boolean;
/**
 * What a project's `.gitignore` is given, once, when its folder is first made.
 *
 * A comment and a rule. The comment is not decoration: somebody reading their
 * own `.gitignore` in six months has to be able to tell what this folder is,
 * which program put the line there, and what to do if they decide they DO want
 * their team to have it. A bare `.kehikko/` teaches none of that, and the thing
 * a person does with a rule they cannot explain is delete it.
 *
 * The rule is `.kehikko/` with a trailing slash, which matches the directory
 * anywhere in the tree and nothing else. (`node_modules` is written without one
 * in this package's own ignore file, for a symlink reason recorded there; this
 * folder is only ever a real directory a module made itself.)
 */
export declare const KEHIKKO_IGNORE = "# Modules on a roadmap host keep this project's data here \u2014 checklists, notes,\n# journeys, questions \u2014 as plain JSON, one file per module, so it sits beside\n# the work instead of inside somebody else's app. It is ignored because it is\n# one person's working material and not the project's. Remove these lines to\n# share it with everyone who clones this repository.\n.kehikko/\n";
/**
 * Does this `.gitignore` already ignore the folder?
 *
 * Deliberately generous about HOW. `.kehikko`, `.kehikko/`, `/.kehikko/`,
 * `**\/.kehikko/` and a commented-out `#.kehikko` are five spellings, four of
 * which do the job, and the one that does not — the comment — is somebody who
 * decided against it. Every one of them is a reason to leave the file alone.
 *
 * Because the answer is only ever used to decide *not* to write, a false
 * positive costs a line that never gets appended and a false negative costs a
 * duplicate. It errs at the first, which is why the commented-out form counts:
 * appending a rule under somebody's deliberate `#` would be arguing with them in
 * their own file.
 *
 * It is not a gitignore engine. A rule that ignores this folder by some route
 * this does not recognise — a parent glob, an `exclude` file, `core.excludesFile`
 * — reads as "not ignored" here, and the appended line is then redundant rather
 * than wrong.
 */
export declare function ignoresKehikko(gitignore: string): boolean;
/**
 * The text a `.gitignore` should have after this convention is added to it —
 * which is the same text back, unchanged, when it already ignores the folder.
 *
 * Append-only, and that is the point. It never reorders, never rewrites, never
 * normalises whitespace, and never touches a byte that was there before: this is
 * a file in somebody else's repository, under their name in `git log`, and a
 * program that tidied it would show up in their next diff as changes they did
 * not make. Everything it does is add a blank line, if the file did not end with
 * one, and then `KEHIKKO_IGNORE`.
 *
 * Idempotent by `ignoresKehikko`, so running it on every write instead of once
 * would be pointless rather than harmful — but it should still be run once, when
 * the folder is first created, because a project that has removed the line has
 * said something, and a program that re-added it on the next save would be
 * overruling them every few seconds.
 */
export declare function withKehikkoIgnored(gitignore: string): string;
//# sourceMappingURL=project.d.ts.map