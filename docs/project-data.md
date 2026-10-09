# Where a module keeps a project's data

The `.kehikot/` folder inside a project, the folder each module gets in it, and the lines a project's `.gitignore` gains.

This is the reasoning, not the reference: the shapes themselves, with their bounds, are in the source and show on hover. The first half is the overview that used to be in the README; the second half is the note that used to stand above each symbol in the source, under that symbol's name.

Back to the [index](README.md).

## Overview

### And a module's data lives in the project, at `.kehikot/`

`moduleFile(context.projectPath, 'kehikot.notes', 'notes')` is
`<projectPath>/.kehikot/notes/notes.json`, and that is the whole convention:
one folder for the app, one folder per module inside it, and the module's own
files in there.

    <projectPath>/.kehikot/
        checklist/checklists.json
        checklist/papers.json
        notes/notes.json
        learning/questions.json
        journeys/journeys.json

It is here rather than in each module because it is the same class of thing as
`kehikot.hello`: a spelling two programs have to share, whose disagreement has
no symptom. A module writing `.kehikot/` and one writing `kehikot/` both work,
both look right, and the person who opens their project finds half their work
in one folder and half in another with nothing on any screen to say why.

`kehikot` and not `kehikko`, deliberately. **Kehikot is the app; a kehikko is
one canvas inside it.** The folder holds the app's data for a project, which
belongs to every canvas that person has rather than to one of them. It is
spelled in exactly one constant, `KEHIKOT_DIR`, so renaming it is one edit.

A **folder per module** rather than a flat directory of files, for two reasons
that are the whole of what the extra level buys:

- **A module may keep more than one file** without inventing a prefix.
  Checklist keeps two, and under a flat directory the second would have needed
  a name saying whose it was — which is a folder spelled badly.
- **One module's data can be deleted, copied or read on its own.** That is most
  of what "transparent, and usable by others in the project" actually buys
  somebody. `rm -r .kehikot/notes` is a sentence.

The folder's name is `moduleFolder(id)`: the module's id with `kehikot.` (or
the pre-rename `roadmap.`) taken off — so `roadmap.notes` and `kehikot.notes`
both keep their data in `.kehikot/notes` and the rename moves nothing — because a directory called `kehikot.checklist` in somebody's own
repository carries a prefix that means nothing to the person reading it. That
derivation is a PATH BUILT FROM DATA — the id came off a manifest on a port —
so it is checked against a rule of its own and throws rather than falling back.
An id with neither prefix is used whole; this package does not get to
decide somebody else's namespace is noise.

Three more things follow, and they are why this is worth a section:

- **The path is the partition.** A module does not key its store by project.
  The file it opened is already that project's, so switching project is opening
  a different file rather than filtering a bigger one — and a store that has
  never heard of a project cannot leak one project's rows into another's view.
- **`null` in, `null` out.** No project open, or a host too old to send a path,
  and `kehikotDir` answers `null`. A module then has nowhere to read and nowhere
  to write, and says so. What it must not do is fall back to its own directory:
  that is somebody's notes written into a folder they will never open, under a
  screen that says they were saved.
- **The path arrived over the wire, so the module still owns the fence.**
  `within()` is a string comparison, offered because `startsWith` gets it wrong
  for `/p/.kehikot/notes-elsewhere`. It is not the check. A module writing under
  a path a host handed it has to `realpath` both sides and compare the results,
  in its own process, where the filesystem is — this package does no I/O and
  cannot do it for you.

`withKehikotIgnored()` is the last piece: the text a project's `.gitignore`
should have once that folder exists. Append-only, idempotent, and it carries a
comment explaining what the folder is and that deleting the rule is how you
share it — because a rule somebody cannot explain is a rule they delete. It
ignores the whole `.kehikot/`, not one module's folder, so adding a module
never means editing somebody's ignore file again.

## Notes by symbol

### `src/project.ts`

#### About `src/project.ts`

Where a module's data for one project lives, and how a project says it does
not want that data committed.

##### Why this is in the protocol package

`kehikot.context` carries `projectPath`, and the moment it did, every module
that keeps anything had the same question: *given that path, where do I put
my file?* Four modules answering it separately is four answers, and the
failure is not a crash. A module that spells the folder `.kehikot` and one
that spells it `kehikot` both work, both look right, and the person who opens
their project finds their notes in one place and their checklists in another,
with nothing on any screen to say why. It is exactly the class of
disagreement this package exists for — the same class as `kehikot.hello` and
`kehikot.Hello` — so the spelling is written down once and both sides import
it.

##### What the convention is

`<projectPath>/.kehikot/<module>/<file>.json`, where `<module>` is the
module's own id with the `kehikot.` prefix (or the old `roadmap.` one) taken off.

    <projectPath>/.kehikot/
        checklist/checklists.json
        checklist/papers.json
        notes/notes.json
        learning/questions.json
        journeys/journeys.json

The path IS the partition: a module does not key its store by project,
because the store it opened is already that project's. Two projects are two
files in two folders, and switching project is opening a different file
rather than filtering a bigger one.

##### Why a folder per module rather than a flat directory of files

The user asked for it in those words, and the two things it buys are worth
saying because they are why it earns the extra level:

- **A module may keep more than one file** without inventing a prefix.
  Checklist keeps two — `checklists.json` and the `papers.json` it migrates
  from — and under a flat directory the second would have needed a name that
  said whose it was, which is a folder spelled badly.
- **One module's data can be deleted, copied or read on its own.** That is
  most of what "transparent, and usable by others in the project" actually
  buys somebody. `rm -r .kehikot/notes` is a sentence; picking three files out
  of a flat directory by knowing which module wrote which is not.

##### What is here and what is deliberately not

Strings and pure functions over strings, like everything else in this
package. Nothing here creates a directory, reads a `.gitignore`, or checks
that a path exists — a module does that, in its own process, where the
filesystem is. In particular `within()` is a comparison and NOT a security
check on its own: it answers a question about two strings, and the caller is
the one that has to have resolved the symlinks first. See its note.

Paths are joined POSIX-style, with `/`. Every host this protocol has run on
hands out POSIX paths, and a module that needs real path arithmetic has
`node:path` and should use it; what this file offers is the one join both
sides have to agree on.

#### `KEHIKOT_DIR`

The folder, spelled once — and this is the ONLY place it is spelled, so that
the day somebody wants it called something else is one edit rather than five.

`kehikot` and not `kehikko`, and the difference is not a typo. **Kehikot is
the app; a kehikko is one canvas inside it.** A folder holding the app's data
in somebody's project takes the app's name, because what is in it belongs to
every canvas that person has rather than to one of them.

Dot-prefixed because it is a program's working material sitting in somebody
else's repository, and the dot is the long-standing way of saying "this is
not part of what you came here to read". Named after the app rather than
`data` or `.modules` because a folder called either of those in a stranger's
project says nothing about who put it there or who to ask about removing it.

#### `DATA_FILE`

What a module may call a file inside its own folder.

Lowercase, digits and dashes, no dot and no slash — so there is no spelling
accepted here that can leave the folder it is joined onto. That is not the
reason the pattern exists, but it is the reason it has no dot in it.

The reason it exists is that `moduleFile()` is going to be called, in every
module, on a path that arrived over the wire. If the NAME could also arrive
over the wire the pair would be a file-writing primitive addressable by a
stranger. A module's file names are its own constants; passing anything else
is a bug in the module, and this pattern is where that bug stops.

#### `MODULE_FOLDER`

What a module's folder inside `.kehikot/` may be called, once derived.

Checked rather than assumed, even though `moduleFolder()` derives it from an
id this package already has a pattern for. A folder name derived from an id is
A PATH BUILT FROM DATA: the id came out of a manifest, which came off a port,
and `MODULE_ID` was written to bound a string that gets PRINTED ON A PANEL
rather than one that gets joined onto somebody's project root. Two rules that
happen to agree today are still two rules, and the one doing the dangerous job
should say what it demands itself rather than inheriting it.

#### `moduleFolder`

A module's folder name, from its id.

`kehikot.checklist` becomes `checklist`. The prefix is stripped because the
whole point of putting this in somebody's project is that they can read it,
and `kehikot.` in front of every directory is four modules restating which
program they belong to inside a folder already named after that program. An id
with no such prefix is used whole — `something.else` stays `something.else` —
because this package does not get to decide that somebody else's namespace is
noise.

##### Both spellings give the same folder, and that is the migration

`roadmap.checklist` — the id from before the app was renamed — ALSO becomes
`checklist`. The folder is named after the bare name, never after the
prefix, so a module renamed from `roadmap.x` to `kehikot.x` reads the very
folder it wrote yesterday. No data moves and none is orphaned.

##### Why it throws rather than falling back

There is no safe default here. A module id that does not parse is a manifest
that should not have been trusted, and both ways of being lenient are worse
than a throw: a fallback folder name would put one module's data in a
directory named after nothing, and a permissive derivation would let a name
with a `/` or a `..` in it be joined onto the project root — which is the
whole reason `MODULE_FOLDER` exists as a rule of its own.

Neither `.` nor `..` can come out of this even if `MODULE_ID` were loosened
tomorrow, because `MODULE_FOLDER` demands the first and last characters be a
letter or a digit. That is asserted in a test rather than left as a property
of two regexes nobody re-reads together.

#### `kehikotDir`

The `.kehikot` folder itself for a project — or `null`, because there may be
no project.

`null` in and `null` out, and that is the whole of the design. A module with
no project has nowhere to read and nowhere to write, and that is an ordinary
state: no project is open, or the host is older than `projectPath`. What it
must never become is a guess. A module that fell back to its own directory, or
to the working directory, would be writing somebody's notes into a folder they
will never look in, and every screen would say it had saved them.

#### `moduleDir`

One module's own folder inside it, or `null` when there is no project.

This is the directory a module creates, confines itself to, and is the only
owner of. Everything it keeps for this project goes in here, and nothing of
anybody else's does.

#### `moduleFile`

One file this module keeps for this project, or `null` when there is no
project.

Throws — rather than returning null — when `name` is not a legal file name, or
when `moduleId` is not a legal id. The failures are not the same and must not
be answered the same way. "There is no project" is a state a person can be in
and a screen can explain. "This module asked for a file called
`../../../etc/passwd`" is a program being wrong, and a `null` there would let
it be wrong quietly.

#### `within`

Is `child` at or beneath `parent`?

##### Read this before using it as a fence

This is string comparison. It knows nothing about symlinks, about `..` that
has not been collapsed, or about whether either path exists — this package
does no I/O and cannot. A module confining a write to
`<projectPath>/.kehikot/<module>` has to `realpath` both sides FIRST and
compare the results; handing this function two unresolved paths and believing
the answer is how a fence gets built that a symlink walks straight through.

What it is for is the comparison itself, which is easy to write subtly wrong:
`child.startsWith(parent)` is true for `/a/notes-elsewhere` against `/a/notes`,
and that one character is the whole bug.

#### `KEHIKOT_IGNORE`

What a project's `.gitignore` is given, once, when that folder is first made.

A comment and a rule. The comment is not decoration: somebody reading their
own `.gitignore` in six months has to be able to tell what this folder is,
which program put the line there, and what to do if they decide they DO want
their team to have it. A bare `.kehikot/` teaches none of that, and the thing
a person does with a rule they cannot explain is delete it.

The rule is `.kehikot/` with a trailing slash, which matches the directory
anywhere in the tree and nothing else. It ignores the WHOLE folder rather than
one module's: the modules are all the same program's working material, and a
per-module rule would need a new line every time a module was added, which is
a rule that goes quietly stale in somebody else's repository.

#### `ignoresKehikot`

Does this `.gitignore` already ignore the folder?

Deliberately generous about HOW. `.kehikot`, `.kehikot/`, `/.kehikot/`,
`**\/.kehikot/` and a commented-out `#.kehikot` are five spellings, four of
which do the job, and the one that does not — the comment — is somebody who
decided against it. Every one of them is a reason to leave the file alone.

Because the answer is only ever used to decide *not* to write, a false
positive costs a line that never gets appended and a false negative costs a
duplicate. It errs at the first, which is why the commented-out form counts:
appending a rule under somebody's deliberate `#` would be arguing with them in
their own file.

It is not a gitignore engine. A rule that ignores this folder by some route
this does not recognise — a parent glob, an `exclude` file, `core.excludesFile`
— reads as "not ignored" here, and the appended line is then redundant rather
than wrong.

#### `withKehikotIgnored`

The text a `.gitignore` should have after this convention is added to it —
which is the same text back, unchanged, when it already ignores the folder.

Append-only, and that is the point. It never reorders, never rewrites, never
normalises whitespace, and never touches a byte that was there before: this is
a file in somebody else's repository, under their name in `git log`, and a
program that tidied it would show up in their next diff as changes they did
not make. Everything it does is add a blank line, if the file did not end with
one, and then `KEHIKOT_IGNORE`.

Idempotent by `ignoresKehikot`, so running it on every write instead of once
would be pointless rather than harmful — but it should still be run once, when
the folder is first created, because a project that has removed the line has
said something, and a program that re-added it on the next save would be
overruling them every few seconds.

#### `withoutKehikotIgnored`

The text a `.gitignore` should have after this convention is TAKEN OUT of it.

The inverse of `withKehikotIgnored`, and the half that was missing. This
package could put the rule in and had no way to take it back, so the only
documented way to share a project's `.kehikot/` was the sentence in the
comment telling a person to delete the lines by hand. That is a fine sentence
and a bad interface: whether this folder is shared is a decision about ONE
project, it changes when a project changes, and a decision a program can only
make in one direction is not a setting.

##### What it removes, and why the comment goes with the rule

Every uncommented line that ignores this folder, and the run of comment lines
directly above it. The comment is removed WITH the rule because it exists to
explain that rule — this package wrote both together — and a `.gitignore` left
holding five lines explaining an ignore that is no longer there is worse than
one holding neither. A blank line left stranded by the removal goes too.

The cost is stated rather than hidden: a comment somebody wrote themselves
directly above their own `.kehikot/` line is removed as well. That is the
right trade — it is a comment about the rule being removed — but it is a byte
of theirs that this function touches, which is more than `withKehikotIgnored`
has ever done, so it is said out loud here rather than discovered in a diff.

##### What it leaves alone

A commented-out `#.kehikot/` is already not ignoring anything, and is somebody
who decided against it once. `ignoresKehikot` counts it as ignored — it errs
that way on purpose, so that nothing is ever appended under somebody's
deliberate `#` — and this function does not, because the two are asking
different questions. Removing it would be tidying a file that is already
saying what the caller wants it to say.

A negation (`!.kehikot/…`) is left as well: it is not a rule that ignores this
folder, it is a rule that rescues something from one, and a caller turning the
ignore off has no quarrel with it.

Idempotent: a `.gitignore` with no such rule comes back unchanged, byte for
byte, so a caller may run it without first asking whether it will do anything.

#### Inside `withoutKehikotIgnored`

The rule itself, uncommented and un-negated. `ignoresKehikot` is not
       reused here for the reason above: it deliberately answers yes to a
       commented-out rule, and this function must answer no to one.

#### `withoutKehikotIgnored.rule`

`.kehikot/`, `.kehikot` and `.kehikot/*` are one rule spelled three ways.
       The last is the form somebody reaches for when they want to rescue one
       folder from inside — `.kehikot/*` with a `!.kehikot/paper/` under it — and
       a function that removed the other two and left that one would turn the
       setting off everywhere except the file the person cared most about.

#### Inside `withoutKehikotIgnored`

And the blank line above THAT, but only one of them. It is the separator
       `withKehikotIgnored` puts in front of the block, so leaving it behind
       would mean adding the rule and removing it again left a file that was not
       the file you started with — which is the one property a setting has to
       have to be worth calling one.

#### `withoutKehikotIgnored.kept`

The blank line that separated the block from what came before it. Removed
     only when the removal has left two blanks against each other or a blank at
     the very top, so a file that was already spaced the way somebody wanted it
     keeps its spacing.
