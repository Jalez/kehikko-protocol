/**
 * Where a module's data for one project lives, and how a project says it does
 * not want that data committed.
 *
 * ## Why this is in the protocol package
 *
 * `roadmap.context` carries `projectPath`, and the moment it did, every module
 * that keeps anything had the same question: *given that path, where do I put
 * my file?* Four modules answering it separately is four answers, and the
 * failure is not a crash. A module that spells the folder `.kehikot` and one
 * that spells it `kehikot` both work, both look right, and the person who opens
 * their project finds their notes in one place and their checklists in another,
 * with nothing on any screen to say why. It is exactly the class of
 * disagreement this package exists for — the same class as `roadmap.hello` and
 * `roadmap.Hello` — so the spelling is written down once and both sides import
 * it.
 *
 * ## What the convention is
 *
 * `<projectPath>/.kehikot/<module>/<file>.json`, where `<module>` is the
 * module's own id with the `roadmap.` prefix taken off.
 *
 *     <projectPath>/.kehikot/
 *         checklist/checklists.json
 *         checklist/papers.json
 *         notes/notes.json
 *         learning/questions.json
 *         journeys/journeys.json
 *
 * The path IS the partition: a module does not key its store by project,
 * because the store it opened is already that project's. Two projects are two
 * files in two folders, and switching project is opening a different file
 * rather than filtering a bigger one.
 *
 * ## Why a folder per module rather than a flat directory of files
 *
 * The user asked for it in those words, and the two things it buys are worth
 * saying because they are why it earns the extra level:
 *
 * - **A module may keep more than one file** without inventing a prefix.
 *   Checklist keeps two — `checklists.json` and the `papers.json` it migrates
 *   from — and under a flat directory the second would have needed a name that
 *   said whose it was, which is a folder spelled badly.
 * - **One module's data can be deleted, copied or read on its own.** That is
 *   most of what "transparent, and usable by others in the project" actually
 *   buys somebody. `rm -r .kehikot/notes` is a sentence; picking three files out
 *   of a flat directory by knowing which module wrote which is not.
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

import { MODULE_ID } from './ids.js'

/**
 * The folder, spelled once — and this is the ONLY place it is spelled, so that
 * the day somebody wants it called something else is one edit rather than five.
 *
 * `kehikot` and not `kehikko`, and the difference is not a typo. **Kehikot is
 * the app; a kehikko is one canvas inside it.** A folder holding the app's data
 * in somebody's project takes the app's name, because what is in it belongs to
 * every canvas that person has rather than to one of them.
 *
 * Dot-prefixed because it is a program's working material sitting in somebody
 * else's repository, and the dot is the long-standing way of saying "this is
 * not part of what you came here to read". Named after the app rather than
 * `data` or `.modules` because a folder called either of those in a stranger's
 * project says nothing about who put it there or who to ask about removing it.
 */
export const KEHIKOT_DIR = '.kehikot'

/**
 * What a module may call a file inside its own folder.
 *
 * Lowercase, digits and dashes, no dot and no slash — so there is no spelling
 * accepted here that can leave the folder it is joined onto. That is not the
 * reason the pattern exists, but it is the reason it has no dot in it.
 *
 * The reason it exists is that `moduleFile()` is going to be called, in every
 * module, on a path that arrived over the wire. If the NAME could also arrive
 * over the wire the pair would be a file-writing primitive addressable by a
 * stranger. A module's file names are its own constants; passing anything else
 * is a bug in the module, and this pattern is where that bug stops.
 */
export const DATA_FILE = /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/

/**
 * What a module's folder inside `.kehikot/` may be called, once derived.
 *
 * Checked rather than assumed, even though `moduleFolder()` derives it from an
 * id this package already has a pattern for. A folder name derived from an id is
 * A PATH BUILT FROM DATA: the id came out of a manifest, which came off a port,
 * and `MODULE_ID` was written to bound a string that gets PRINTED ON A PANEL
 * rather than one that gets joined onto somebody's project root. Two rules that
 * happen to agree today are still two rules, and the one doing the dangerous job
 * should say what it demands itself rather than inheriting it.
 */
export const MODULE_FOLDER = /^[a-z0-9][a-z0-9.-]{0,62}[a-z0-9]$/

/** Join POSIX-style, tolerating a trailing slash on the left. */
function joined(left: string, right: string): string {
  return `${left.replace(/\/+$/, '')}/${right}`
}

/**
 * A module's folder name, from its id.
 *
 * `roadmap.checklist` becomes `checklist`. The prefix is stripped because the
 * whole point of putting this in somebody's project is that they can read it,
 * and `roadmap.` in front of every directory is four modules restating which
 * program they belong to inside a folder already named after that program. An id
 * with no such prefix is used whole — `something.else` stays `something.else` —
 * because this package does not get to decide that somebody else's namespace is
 * noise.
 *
 * ## Why it throws rather than falling back
 *
 * There is no safe default here. A module id that does not parse is a manifest
 * that should not have been trusted, and both ways of being lenient are worse
 * than a throw: a fallback folder name would put one module's data in a
 * directory named after nothing, and a permissive derivation would let a name
 * with a `/` or a `..` in it be joined onto the project root — which is the
 * whole reason `MODULE_FOLDER` exists as a rule of its own.
 *
 * Neither `.` nor `..` can come out of this even if `MODULE_ID` were loosened
 * tomorrow, because `MODULE_FOLDER` demands the first and last characters be a
 * letter or a digit. That is asserted in a test rather than left as a property
 * of two regexes nobody re-reads together.
 */
export function moduleFolder(moduleId: string): string {
  if (typeof moduleId !== 'string' || !MODULE_ID.test(moduleId)) {
    throw new Error(
      `"${moduleId}" is not a module id, so there is no folder name to derive from it. A folder under `
        + `${KEHIKOT_DIR}/ is named after the module that owns it, and a name derived from an id is a path built `
        + 'from data — it is checked rather than trusted.',
    )
  }
  const name = moduleId.startsWith('roadmap.') ? moduleId.slice('roadmap.'.length) : moduleId
  if (!MODULE_FOLDER.test(name)) {
    throw new Error(
      `"${moduleId}" gives the folder name "${name}", which is not one this package will join onto somebody's `
        + 'project root.',
    )
  }
  return name
}

/**
 * The `.kehikot` folder itself for a project — or `null`, because there may be
 * no project.
 *
 * `null` in and `null` out, and that is the whole of the design. A module with
 * no project has nowhere to read and nowhere to write, and that is an ordinary
 * state: no project is open, or the host is older than `projectPath`. What it
 * must never become is a guess. A module that fell back to its own directory, or
 * to the working directory, would be writing somebody's notes into a folder they
 * will never look in, and every screen would say it had saved them.
 */
export function kehikotDir(projectPath: string | null | undefined): string | null {
  if (typeof projectPath !== 'string') return null
  const path = projectPath.trim()
  if (!path) return null
  return joined(path, KEHIKOT_DIR)
}

/**
 * One module's own folder inside it, or `null` when there is no project.
 *
 * This is the directory a module creates, confines itself to, and is the only
 * owner of. Everything it keeps for this project goes in here, and nothing of
 * anybody else's does.
 */
export function moduleDir(projectPath: string | null | undefined, moduleId: string): string | null {
  const folder = moduleFolder(moduleId)
  const dir = kehikotDir(projectPath)
  return dir === null ? null : joined(dir, folder)
}

/**
 * One file this module keeps for this project, or `null` when there is no
 * project.
 *
 * Throws — rather than returning null — when `name` is not a legal file name, or
 * when `moduleId` is not a legal id. The failures are not the same and must not
 * be answered the same way. "There is no project" is a state a person can be in
 * and a screen can explain. "This module asked for a file called
 * `../../../etc/passwd`" is a program being wrong, and a `null` there would let
 * it be wrong quietly.
 */
export function moduleFile(projectPath: string | null | undefined, moduleId: string, name: string): string | null {
  if (!DATA_FILE.test(name)) {
    throw new Error(
      `"${name}" is not a name a module may give one of its files. A file under ${KEHIKOT_DIR}/<module>/ is spelled `
        + 'with lowercase letters, digits and dashes, and is a constant in the module that owns it — never a string '
        + 'that arrived from anywhere.',
    )
  }
  const dir = moduleDir(projectPath, moduleId)
  return dir === null ? null : joined(dir, `${name}.json`)
}

/**
 * Is `child` at or beneath `parent`?
 *
 * ## Read this before using it as a fence
 *
 * This is string comparison. It knows nothing about symlinks, about `..` that
 * has not been collapsed, or about whether either path exists — this package
 * does no I/O and cannot. A module confining a write to
 * `<projectPath>/.kehikot/<module>` has to `realpath` both sides FIRST and
 * compare the results; handing this function two unresolved paths and believing
 * the answer is how a fence gets built that a symlink walks straight through.
 *
 * What it is for is the comparison itself, which is easy to write subtly wrong:
 * `child.startsWith(parent)` is true for `/a/notes-elsewhere` against `/a/notes`,
 * and that one character is the whole bug.
 */
export function within(parent: string, child: string): boolean {
  const root = parent.replace(/\/+$/, '')
  if (!root) return false
  return child === root || child.startsWith(`${root}/`)
}

/**
 * What a project's `.gitignore` is given, once, when that folder is first made.
 *
 * A comment and a rule. The comment is not decoration: somebody reading their
 * own `.gitignore` in six months has to be able to tell what this folder is,
 * which program put the line there, and what to do if they decide they DO want
 * their team to have it. A bare `.kehikot/` teaches none of that, and the thing
 * a person does with a rule they cannot explain is delete it.
 *
 * The rule is `.kehikot/` with a trailing slash, which matches the directory
 * anywhere in the tree and nothing else. It ignores the WHOLE folder rather than
 * one module's: the modules are all the same program's working material, and a
 * per-module rule would need a new line every time a module was added, which is
 * a rule that goes quietly stale in somebody else's repository.
 */
export const KEHIKOT_IGNORE = `# Modules on a kehikot host keep this project's data here — checklists, notes,
# journeys, questions — as plain JSON, one folder per module, so it sits beside
# the work instead of inside somebody else's app. It is ignored because it is
# one person's working material and not the project's. Remove these lines to
# share it with everyone who clones this repository.
${KEHIKOT_DIR}/
`

/**
 * Does this `.gitignore` already ignore the folder?
 *
 * Deliberately generous about HOW. `.kehikot`, `.kehikot/`, `/.kehikot/`,
 * `**\/.kehikot/` and a commented-out `#.kehikot` are five spellings, four of
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
export function ignoresKehikot(gitignore: string): boolean {
  return gitignore.split(/\r?\n/).some((line) => {
    const rule = line
      .trim()
      .replace(/^#+\s*/, '')
      .replace(/^!/, '')
      .replace(/\/+$/, '')
    if (!rule) return false
    return rule === KEHIKOT_DIR || rule.endsWith(`/${KEHIKOT_DIR}`)
  })
}

/**
 * The text a `.gitignore` should have after this convention is added to it —
 * which is the same text back, unchanged, when it already ignores the folder.
 *
 * Append-only, and that is the point. It never reorders, never rewrites, never
 * normalises whitespace, and never touches a byte that was there before: this is
 * a file in somebody else's repository, under their name in `git log`, and a
 * program that tidied it would show up in their next diff as changes they did
 * not make. Everything it does is add a blank line, if the file did not end with
 * one, and then `KEHIKOT_IGNORE`.
 *
 * Idempotent by `ignoresKehikot`, so running it on every write instead of once
 * would be pointless rather than harmful — but it should still be run once, when
 * the folder is first created, because a project that has removed the line has
 * said something, and a program that re-added it on the next save would be
 * overruling them every few seconds.
 */
export function withKehikotIgnored(gitignore: string): string {
  if (ignoresKehikot(gitignore)) return gitignore
  if (!gitignore.trim()) return KEHIKOT_IGNORE
  const ends = gitignore.endsWith('\n') ? gitignore : `${gitignore}\n`
  return `${ends}\n${KEHIKOT_IGNORE}`
}
