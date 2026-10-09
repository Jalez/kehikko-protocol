# Capabilities, methods and their answers

The questions a module can ask the host, the capability each one needs, what a caller must construct, and which answers have a shape.

This is the reasoning, not the reference: the shapes themselves, with their bounds, are in the source and show on hover. The first half is the overview that used to be in the README; the second half is the note that used to stand above each symbol in the source, under that symbol's name.

Back to the [index](README.md).

## Overview

### Asking the host to move

A module could be walked and could not walk. `kehikot.goto` goes one way, and
the module's four words are `ready`, `request`, `resize`, `went` — none of which
moves anybody. So a program showing a person every project and epic on the
machine could draw the whole map and never travel on it.

The missing capability is a **method**, `view.goto`, under a new capability
`view:navigate`:

```ts
ask('view.goto', { epic: 'modes-are-modules', step: 3 })  // any one of the three
ask('view.goto', { ref: 'gh#41' })
```

A method rather than a ninth message type, for three reasons. It needs an
answer, and `request`/`response` already has correlation, a timeout discipline
and a refusal envelope — a second answered pair would be that machinery again,
differently, for one act. It belongs to a capability, so `declares.uses` still
reads as a sentence. And the tone is right: the module's messages are three
statements and one unanswerable ask (`resize`, which the host clamps and may
ignore), so a `kehikot.navigate` posted at a host would read like a thing done
rather than a thing asked. Two programs both believing they decide what is on
screen is the defect this arrangement exists to prevent.

The answer is one of three words, because they send a person to three different
places:

| | |
|---|---|
| `moved` | The reader is looking at it. Say nothing; the screen already said it. |
| `declined` | The host will not, right now. The target may well exist. Leave the row pressable, offer an ordinary link. |
| `no-such-target` | There is no such epic, step, or reference. Say so — a dead reference is worth showing as dead. |

It also carries `epic`, where the reader ended up, for the `global` mode that is
never sent context and would otherwise be drawing a map with no marker on it;
and `why`, the sentence, for whoever is reading.

**A decline comes back `ok: true`.** It is not a failed call: the host
understood the question, considered it, and answered no. `ok: false` stays what
it was — the call did not happen — because collapsing "the answer is no" into
"the question failed" leaves a caller unable to tell a host that refuses from a
host too old to have been asked, and those are the two futures the refusal
design exists to keep apart.

### Asking the person which project, without being told what projects there are

A module is handed one `projectPath` and may read what the host named. That is
the rule the whole arrangement rests on, and the obvious way to break it is a
method called `projects.list` — a module holding that has been given a listing
of somebody's disk, and everything after is a question of how fast it can walk
it.

`projects.pick` is the other shape, and it is the browser's file picker's shape:

```ts
const answer = await ask('projects.pick', {}, { within: PERSON_ANSWERS_WITHIN_MS })
// { outcome: 'picked', project: { path: '/Users/…/thesis', name: 'thesis' }, why: '' }
```

The call takes **nothing**. No path to prefer, no filter, no sentence for the
dialog: a suggested path is a claim that a folder exists, a filter is a probe
run against a listing the module was not given, and a sentence in the host's
dialog is a sentence a person reads as the host's. The host composes what it
says out of the registration the conversation was built on, exactly as it
supplies `from` to `events.emit` and `filters.set`.

What comes back is one answer to one question a person just answered:

| | |
|---|---|
| `picked` | Somebody chose one. `project.path` is absolute and resolved, like `context.projectPath`; `project.name` is for a sentence and never for locating anything. |
| `cancelled` | The picker was opened and closed without a choice. Nothing is wrong. |
| `declined` | The host would not ask — including because it holds no projects. |

**`declined` covers "there are none", and that is deliberate.** A fourth outcome
saying so is an enumeration with a count of zero, and a module that could tell
"you have no projects" from "I would rather not" could learn about the disk by
asking. A module treats the two the same way: stop asking, say nothing
alarming, leave the control where it was.

No new KIND of thing crosses the wire. `context.projectPath` already gives a
module an absolute path; this gives it a second one, chosen, one at a time. The
person is the gate, and there is no version of this where they are not.

**Its answer arrives late, and that is a property of the question.** The
client's `ANSWER_WITHIN_MS` is twelve seconds, tuned for a host reading a file
off a cold disk; somebody reading a list of thirty folders beats it. So
`request` takes a per-call `{ within }` — because how long an answer takes
belongs to the question, not to the wire, and a connection raised to five
minutes would take five minutes to discover the host is gone. See
`PERSON_ANSWERS_WITHIN_MS`.

### Some answers have a shape, and the line is not where you would guess

`methodParams` says what a caller constructs; what comes back is `unknown`,
because no host promised otherwise. That still holds for `epic.get`,
`steps.list` and `live.get`, and the reason is about **material**: two honest
hosts hold different amounts of an epic, and a schema over that would be this
package legislating what a host must keep.

Some answers are not material, and `methodResults` gives those a shape.

An **outcome** reports what happened to an act this protocol itself defines.
Nothing about a host's holdings varies there. An unspecified `view.goto` answer
is not modesty — a caller that cannot tell "you are looking at it" from "I would
rather not" from "there is nothing by that name" without parsing English has a
request it cannot act on.

`projects.pick` is an outcome by the same test: `picked`, `cancelled` and
`declined` send a module three different ways.

**`epics.list`** is the case the rule does not cover, and its argument is
different. Every other
question takes an epic slug, and `epics.list` is the only way to get one. If its
answer may be anything, a module cannot rely on an epic having a name, and a
protocol whose entry point returns an unknown shape has one reachable method.
So `epicSpine` requires `slug`, bounds `title` and `project` if they are there,
and **passes everything else through untouched**. It names the fields without
which the question cannot be answered; it does not name the set of fields, and a
host with ledes, counts, owners or dates hands them over and keeps them.

`resultSchemaFor(method)` returns nothing for the rest, and nothing means
*unspecified* rather than *empty*. Do not write a fallback that treats a missing
schema as "expects nothing". And it asks with `Object.hasOwn`, because a method
name is a stranger's string — see the prototype section below.

### No consent, and what that changes

An earlier design had a module ask for permissions in its manifest and a person
answer a dialog. That mechanism is gone in full: the scope vocabulary, the
generated per-extension scopes, the manifest digest that made a changed module
ask again, the grant store, the `offered` and `changed` states, and the
`not-allowed` refusal. None of it is modelled here and none of it should be
reintroduced under another name.

What survives is the **declaration**. `declares.uses` is where a module says
what it intends to call. It is worth reading — it is a sentence somebody can
weigh before installing the program — and it is not a request, is not answered,
and unlocks nothing. The field is called `declares` rather than `needs` or
`requests` for exactly that reason: a name that reads like half of a handshake
would be this package implying the other half exists.

A host still refuses whatever it likes, at every call, out of material a module
never touches. Note the consequence for `uses`: a host must not check calls
against it, because a declaration is a string the module wrote, and a check
against that is one the module passes by writing something different.

A module is in one of three conditions, and each is a fact rather than a
verdict: `ready`, `incompatible`, `silent`. `silent` earns its place in a list —
a module that silently fails to appear is indistinguishable from one that was
never installed.

## Notes by symbol

### `src/methods.ts`

#### About `src/methods.ts`

The one import this file makes from the other half of the wire.

`wire.ts` imports nothing from here, so there is no cycle, and the direction
is the right way round: a passage is a piece of CONTEXT, defined where the
context is defined, and `passage.set` is a request to put one there. See the
note on that method for why it is imported rather than restated.

`filterChoiceSchema` comes across for the same reason and it matters more:
the shape a module ASKS for and the shape a host SENDS BACK in
`context.filters` are the same shape, and two copies of it is a wire where a
choice validates on the way in and is dropped on the way out.

#### A note in `src/methods.ts`

The questions a module can ask, by name and by shape.

A method name is a spelling two programs have to agree on exactly as much as
a message type is — a module calling `epics.get` at a host that answers
`epic.get` gets a refusal it cannot debug from the inside — so the names are
written down once, here, and both sides import them.

What is NOT here is any of the answering. There is no dispatch table, no
handler and no default implementation. A host answers these out of its own
material by its own rules, and two hosts may answer the same question with
different amounts of the same epic. The request side is a contract because a
caller has to construct it; the CONTENT of a response is `unknown` on
purpose, because a client that assumed a shape for it would be asserting
something no host promised.

##### Epics, and the word that is not here

An **epic** belongs to a project and is what a host holds: the steps, their
order, the references they name, and what the last refresh read from the
trackers about them. A **journey** is a different idea, and it lives in a
module app of its own rather than in the host — so this package does not
name one, does not bound one, and has no method that returns one. A module
that wants journeys talks to whatever program owns them, which from this
protocol's side is not a special arrangement at all: it is just a program.

These files inherited a codebase where the two words meant one thing. Every
method, field, capability and pattern that carried the conflation is renamed
rather than aliased, and `PROTOCOL` went to 2 for it. See the essay there.

##### Some answers ARE described, and the line is not where you would guess

`methodResults` below gives a shape to a few of these answers, which
looks at first like the rule above being broken. It is not, and the
distinction is worth stating because it decides what may be added later.

An answer is **material** when it is a host's own holdings — what an epic
says, what a tracker last reported, how much of it this host chose to hand
over. Two honest hosts differ there, and a shape imposed on it would be this
package legislating what a host must hold.

An answer is an **outcome** when it reports what happened to an act this
protocol itself defines. Nothing about a host's holdings varies there. If
`view.goto` came back as `unknown`, the caller could not tell "you are now
looking at it" from "I would rather not" from "there is nothing by that
name" without parsing English, and those three send a person to three
different places. An unspecified outcome is not modesty; it is a request
that cannot be acted on.

`projects.pick` is an outcome by the same test and gets a shape for the same
reason: `picked`, `cancelled` and `declined` send a module three different
ways, and two of them must be indistinguishable in what they carry rather
than in whether they parse. See `projectPickResult`.

`epics.list` is the case the rule does not cover, and the argument for it is
different again — see `epicsListResult`.

#### `CAPABILITIES`

The areas of a host's material these methods touch.

They are names for a KIND of question, not permissions — nothing grants one,
nothing checks one, and a module that declares none and calls everything is
treated exactly like a module that declared honestly. They exist so that
`declares.uses` can say something a person can read at a glance: "this
program reads the epics and reports where work is" is a sentence; a list of
seven method names is not.

The colons in the spellings are a leftover from when these were permissions,
and they are kept rather than tidied: the punctuation was never the confusing
part, and a module author reading `epics:read` reads a subject and a verb,
which is all it ever really was. (The WORDS did change — `journeys:read` is
`epics:read` now — but that is the epic rename, which had a reason, and not a
tidy-up, which does not.)

#### `CAPABILITIES.view:navigate`

The one capability that does not read or write anything — it asks the host
to MOVE. See `view.goto`. Named for the area rather than for the method,
like the rest of these, so that the sentence a person reads before
installing a program is "reads the epics and asks to navigate" rather than
a list of method names.

#### `CAPABILITIES.selection:set`

Say which references the person has picked out.

A write, and a SHARED one: the selection goes into the context every framed
module receives, so a module declaring this is asking to change what its
neighbours are looking at. That belongs in the sentence somebody reads
before running the program, which is why it is spelled out here rather than
left as "sets the selection".

#### `CAPABILITIES.passage:set`

Say where in a document the person is pointing.

A write, and a SHARED one, exactly like `selection:set` — and one that
carries more. A passage names a file on the host's machine, a place in it,
and a paragraph of what was there. A module declaring this is asking to put
all of that in front of every other pane on the canvas, and somebody
deciding whether to run the program should read that in the sentence rather
than discover it from a field name.

#### `CAPABILITIES.filters:set`

Ask for its own container's filters to be moved.

Narrow, and the sentence says how narrow: it reaches this container's own
narrowing and nothing else — not another container's, not the canvas, not
what anybody else is shown. A module wants it in order to answer "go to
this row" by clearing whatever is hiding that row, which is a thing the
person just asked for.

#### `CAPABILITIES.showing:set`

Say what this container is showing.

A write, and a SHARED one, in the family of `selection:set` and
`passage:set`: what a module says here goes into the `containers` list in
the context every framed module receives, attributed to this container. A
module declaring it is asking to tell its neighbours what it has open, so
that a neighbour holding checklists, notes, or anything else filed against
references and places in documents can narrow to it — and the sentence a
person reads before running the program should say that, rather than leave
it to be inferred from a field name.

Narrower than either sibling in one way worth naming: it moves nobody. A
passage or a selection is the canvas being POINTED, and every consumer
follows. This is a container DESCRIBING ITSELF, and a consumer that reads
it decides for itself what to do — usually nothing, until a person picks
that container out.

#### `CAPABILITIES.projects:pick`

Ask the person to choose one of their projects, and be told which.

##### The sentence says "ask the person", and that is the whole of it

A module is told one `projectPath` and may read what the host named. That
rule is what makes framing a stranger's program survivable, and the obvious
way to break it is a capability spelled "read the projects" — a module
holding that has been handed a listing of somebody's disk, and everything
after is a matter of how fast it can walk it.

This is the other shape, and it is the browser's file picker's shape. The
module cannot enumerate, cannot name a project it has not been given,
cannot filter the menu, and cannot open the picker without the person
seeing it: what it receives is ONE answer to ONE question a person just
answered, in a dialog the host drew out of its own material. A refusal and
a cancellation are indistinguishable from the module's side on purpose, so
that "no projects" and "I would rather not" cannot be told apart by asking
repeatedly.

No new KIND of thing crosses the wire for it. `context.projectPath` already
hands a module an absolute path to the open project; this hands it a second
one, chosen, one at a time. That is why the sentence a person reads before
running the program says "the host asks you which" — the reader is the
gate, and there is no version of this where they are not.

#### `CAPABILITIES.state:keep`

Keep a little state of its own, and get it back next time.

Named for what the module gets rather than for what the host does, because
from the host's side this is not storage of anything in particular — it is
a string it never reads.

#### `CAPABILITIES.disposition:set`

Say why a reference closed: done, won't do, a duplicate, superseded.

A write into the project, beside the stages `stage:report` files, and read
back by every module in `context.dispositions`. It is a verdict a person
reaches, so a module should set it on a press and not on its own judgment;
an agent reaches the same store through the host's MCP door.

#### `CAPABILITIES.trackers:read`

Read what the trackers last said about the project's refs, from the
reading the host keeps for everybody. See `tracker.get` and `tracker.ts`.

A read of the host's material, like `live:read` — which it replaces — and
nothing more: the module gets rows and never a credential, and the host
reads with the person's own logged-in CLIs.

#### `CAPABILITIES.trackers:refresh`

Ask the host to read the trackers again.

Apart from `trackers:read` because it SPENDS something: the person's rate
limit, on a tracker that may be slow, on behalf of every module on the
canvas. A person deciding whether to run a program should be able to see
that it asks for reads, not only that it looks at them.

#### `CAPABILITIES.content:report`

Say that the material this module keeps changed. See `content.changed` and
`content.ts`.

A permission although it writes nothing, for the reason `passage:set` is
one: it moves every other container on the canvas. A module that reported
without cause would have each of them re-reading on its say-so.

#### `METHODS`

Every method, and the capability it belongs to.

A plain object, and therefore a lookup hazard: `METHODS[method]` where
`method` is a string out of a frame answers with something inherited when the
string is `constructor`. Use `own()` from `./ids.js`, or a `Map`. The essay
on `MODULE_ID` is about exactly this and it applies here too — the method
name arrives from the same place the module id does.

#### `epic`

An epic slug, as it arrives from somebody else's program.

Shape and length, not membership. A membership check — is this one of the
epics that exist? — cannot be fooled by a spelling nobody thought of, which
is the real argument for it, and it is still the wrong check at this door: it
answers "no such epic" and "not an epic name" differently, and kept apart
those two answers are a way for a module holding the cheapest question on the
list to enumerate what is here. The shape refuses the same way whether or not
the epic exists, and there is no character in the class that can leave a
directory.

A host still has the last word, one layer down, and should take care that the
word is not a roll-call: a "no such epic" that lists the ones that do exist
has enumerated anyway, in the error message.

#### `REPORTED_STAGES`

The three stages a module may report.

Three of a longer line, because these are the three nothing else can see.
Whether somebody is working, whether they have handed a change over, whether
they are stuck — no tracker has an opinion, and the report is the only source
there will be. Everything else on the line is read from a tracker, and a
module writing it would be a second answer to a question that already has
one.

#### `trackerScope`

Which refs a tracker call is about: exactly one of three.

`refs` — these, by spelling, up to `TRACKER_ASK`. A host reads a ref it has
not seen before on the strength of this call: asking is how a module whose
refs live in its own store (a journey, a checklist target) gets them read.
`epic` — every ref the epic names, in its steps and around them.
`project: true` — everything the host reads for the open project: the refs
every epic names, the refs modules have asked about, and the recent issues
and changes of each listed source. The list References shows.

One and only one, because a call naming two is a call whose author meant
something this protocol would have to guess — the union, the intersection,
or the first — and the three are different answers.

#### `methodParams.live.get`

The old door to tracker state: the epic's refs in four bags. Kept, and
answered by a host as a view over the same shared reading `tracker.get`
serves, so a module that has not moved yet sees the same states as one that
has. New code asks `tracker.get`.

#### `methodParams.view.goto`

Ask the host to show something. See the essay on `navigationResult`.

The same triple `kehikot.goto` carries, and named the same way on purpose:
a module that can receive a walk and a module that can ask for one are
describing the same act from two ends, and two spellings of it would be two
things to get wrong.

One difference, and it is deliberate. `gotoSchema` refuses a message that
names only an epic, because a host with nothing to say but "this epic" says
it as context and has no reason to send a walk. Here, an epic alone is the
commonest ask there is — a module showing everything on the machine wants
"open that one", with no step and no reference in mind — so it is allowed,
and what is refused is a call that names nothing at all. A `view.goto` with
no target is not a request for anything; it is a call with a typo in it,
and the sooner the author sees that the better.

#### `methodParams.view.goto.ref`

Bounded at `GOTO_REF` rather than `REF`, and REFUSED rather than
clipped. The receiver that exists today clips its inbound ref to 200
characters, which is the wrong half of the rule: a clipped sentence is
still the sentence, but a clipped ref is a DIFFERENT ref, and walking
somebody confidently to the wrong place is worse than telling them the
ask was malformed.

#### `methodParams.selection.set`

Say which references the person has picked out.

##### Refs, and deliberately nothing else

A module sending this knows more than it puts in the call — References
knows `gh#131` is an issue and `gh#105` is a pull request, because it read
them out of four differently-named bags and the bag is the only thing that
says which. It is tempting to carry that along so the next module does not
have to look it up.

It must not. The host relays this into the context every module receives,
and context is the host's own knowledge or it is a rumour with a protocol's
name on it — the same argument that took `slug` out of context when it
meant a journey. A host can vouch that these are the refs somebody picked;
it cannot vouch that one of them is an issue, because it was told that and
never checked. A module that needs the kind asks `live.get` and reads it
from the source the sender read it from.

An empty list is how a selection is CLEARED, and it is a real call rather
than an absence — "nothing is selected" is a state a module has to be able
to move into, the same reason `epic` is nullable rather than optional.

#### `methodParams.passage.set`

Say where in a document the person is pointing.

##### The same act `selection.set` performs, on a different kind of thing

A module asks; the host relays into the context every framed module
receives; no module ever learns which of its neighbours was listening, or
whether any was. The whole argument is in `contextSchema.passage` and in
the `selection` essay above it, and it is not repeated here.

##### `null` is a real call, not an omission

The reader closed the document, or moved to a pane that is not a document
at all. That has to be sendable, for the reason an empty `refs` array has
to be: a consumer holding the last passage forever would show the notes on
a chapter nobody has open. So `passage` is required and nullable rather
than optional — a call that simply left it out would be indistinguishable
from a caller with a typo in the field name, and one of those means "clear
it" while the other means nothing at all.

##### The shape is imported rather than restated

`selection.set` spells its own `refs` array out again, and that is fine for
an array of bounded strings. This is five fields with two cross-field rules
on them, and two copies of those rules is a wire where the host accepts
what the context schema will later drop, or the reverse — a passage that
validates on the way in and vanishes on the way out, with nothing anywhere
saying so. One definition, in `wire.ts`, read by both.

#### `methodParams.filters.set`

Ask the host to put this container's filters somewhere.

##### The offer went one way, and that was the gap

`kehikot.filters` lets a module say what it can be narrowed by; the host
draws the control and the choice comes back in `context.filters`. There was
no way back. The host owned the choice completely, which is right — it is
per container, it outlives a reload, and a module that could silently move
its own control would be a control that moves on its own.

What that cost was discovered in References, which declined the header
control altogether and wrote down why. Two behaviours depended on the
module being able to clear its own narrowing:

  - Answering `view.goto`. "Go to !1848" is answered by clearing whatever
    is hiding that row and scrolling to it. A module that cannot clear a
    host-held filter must either answer `found: true` about a row nobody
    can see, or refuse a reference it is looking at.
  - "One press puts everything back". A Clear that clears two thirds of the
    narrowing is a button that does not do what it says.

##### It is a REQUEST, which is the whole reason this is safe

The same shape as `passage.set` and `selection.set`: the module asks, the
host decides, and a refusal is survivable. The host may refuse for any
reason it likes — the container is pinned, the module is asking for a group
it never offered, the person is in the middle of choosing — and a module
has to keep working when it does. Nothing here entitles a module to a
setting; it entitles it to ask.

##### What may be asked for

A whole choice, replacing what is there, in the shape the host already
sends back in `context.filters`. `{}` is the meaningful empty value — every
group back to its fallback, which is what "clear the narrowing" is — and is
why this is not a per-group message: a module clearing three groups one at
a time would produce three contexts and three renders, and the page would
be seen part-way through its own reset.

A host must drop any group the module is not currently offering, exactly as
it does when filling `context.filters` from its own store. The result is
whatever the host settled on, so a module learns what actually happened
rather than assuming it got what it asked for.

#### `methodParams.showing.set`

Say what this container is showing.

##### The same act `passage.set` performs, one step further out

A module asks; the host holds it against this module's container on the
open kehikko and relays it in `context.containers` to every framed module;
no module ever learns which of its neighbours was listening, or whether
any was. The whole argument is on `showingSchema` and `containerSchema` in
`wire.ts`, and it is not repeated here.

##### Both lists are required, and neither has a default here

`showingSchema` defaults both to empty, because on the way OUT — in a
context — a missing list means nothing is shown and that is a true reading.
On the way IN it is the wrong reading: a call of `{ refs: [...] }` that
meant "and the documents are unchanged" and a call that meant "and there
are no documents" would be indistinguishable, and one of them is a module
quietly withdrawing half its claim. So a call spells out both, every time,
and "showing nothing" is `{ refs: [], documents: [] }` — a real call and
the way a module that closed its document says so, for the reason an empty
`refs` clears a selection and a `null` passage clears the passage.

Whole replacement, never a merge, for the reason `kehikot.filters` is: a
merge could never take anything back, and a container that stopped showing
a file would go on being described as showing it.

##### The shape is imported rather than restated

The bounds and the passage rules are `wire.ts`'s, read by both sides, so
that a host cannot accept on the way in what the context schema will later
drop on the way out — a document that validates when sent and vanishes
when broadcast, with nothing anywhere saying so.

#### `methodParams.projects.pick`

Ask the person to choose one of their projects.

##### It takes nothing, and the emptiness is the design

There is no name to suggest, no path to prefer, no filter to apply and no
sentence to put in the dialog. Every one of those was considered and every
one gives a module a way to speak in the host's own voice about the host's
own material: a suggested path is a claim that a folder exists, a filter is
a probe run against a listing the module may not have, and a sentence in
the host's dialog is a sentence a person will read as the host's. What the
host says is composed by the host, out of the registration this
conversation was built on, which is the same rule that supplies `from` to
`events.emit` and `filters.set`.

So the call is `{}`, and it says one thing: this module would like the
person to name a project. See `projectPickResult` for what may come back,
and the `projects:pick` capability for why this is not an enumeration.

##### The answer arrives when a person answers, which is late

This is the first method whose answer waits on somebody. The
request/response pair is still the right shape — it correlates, it carries
a refusal envelope, and an outcome that is not a failure is exactly what
`view.goto` already established — but the CLOCK is not: `ANSWER_WITHIN_MS`
is twelve seconds, tuned for a host reading a file off a cold disk, and a
person reading a list of thirty folders will beat it. A caller passes its
own deadline for this one question; see `PERSON_ANSWERS_WITHIN_MS` and the
`within` option on `request`.

#### `methodParams.state.set`

Keep a small amount of this module's own state.

##### The host does not read it, and that is the whole design

A module framed without `allow-same-origin` runs on an opaque origin, where
`localStorage` does not merely return nothing — it throws. So a module has
nowhere of its own to remember which filter was on, and the alternatives
were both bad: declare storage and weaken the sandbox in order to remember
a toggle, or put the toggle in the URL, which does not survive the host
rebuilding the frame from `entry` on the next load.

So the host keeps a string for it. An OPAQUE string: the host does not
parse it, does not validate its contents beyond a length, and has no
opinion about what is in it. That is what keeps this from becoming a
settings API the protocol would then have to describe — the moment the host
knows that a module has "filters", every module's preferences are the
protocol's business.

##### Per module, not per pane

A module's page is loaded once and shown on whichever canvas asks for it, so
one module is one document with one set of filters. State attached to a
PANE would need the document to be told it had moved between canvases, and
there is no message for that and should not be: a page cannot re-render its
own controls in response to something it is never told.

It comes back in the greeting rather than being fetched, so a module has it
before its first render and does not draw the wrong filter first.

#### `methodParams.stage.report.note`

A line a person reads beside the report. Bounded, and REFUSED rather than
clipped when it is too long — which is the opposite of what happens to
text merely crossing back in a refusal, and the difference matters: a
clipped sentence is still the sentence, while a clipped ref is a
DIFFERENT ref, silently filed against work nobody meant, and a clipped
note is one that ends mid-word with nobody told it was cut. What is
stored has to be what was sent, or refused outright.

#### `methodParams.disposition.set`

Mark one reference, or take a mark back with `value: null`.

`target` is the other ref for `duplicate` and `superseded`, and refused for
`done` and `wont-do`, where it would name a relation nobody claimed. `by`
and `at` are not here: who pressed and when are the host's own facts, and
a module that could write them could write somebody else's name.

#### `methodParams.tracker.get`

What the trackers last said, from the host's shared reading.

Answered at once from what the host holds; see `trackerReadingResult` in
`tracker.ts` for the answer, and for `missing`, which is how a ref the
host has not read yet comes back. `detail: 'detail'` costs a call per ref
at the tracker, so it is only accepted with `refs`.

#### `methodParams.tracker.refresh`

Read the trackers again, for these refs or this epic or the whole project,
and answer when the read lands. Every module on the canvas is told through
`context.tracker`. See `trackerRefreshResult`.

A host joins a refresh to one already running rather than starting a
second; two presses are one read.

#### `methodParams.content.changed`

This module's own material changed, for this epic — or, with no epic, for
no one epic in particular. The host tells every container standing in the
project through `context.content`, the caller's own included.

WHOSE material is not here: it is the caller's, and the host knows who is
asking. A module that could name a source could announce a change to
somebody else's, and to the host's epics. `at` is the host's fact for the
same reason `disposition.set` carries none.

Reported AFTER the write has landed, so a container that re-reads at once
reads the new material.

#### `methodParams.events.emit.payload`

Unknown here, and checked against the named extension's own schema by
whoever routes it — see `./extensions.js`. Typing it as a union of every
known payload would mean this method could not carry an extension this
version of the package has never heard of, which is the one thing a
versioned format registry is supposed to allow.

#### `NAVIGATION_OUTCOMES`

What became of a `view.goto`.

##### The wall this removes

Until now a module could be walked and could not walk. `kehikot.goto` goes
one way, and the module → host words were `ready`, `request`, `resize`,
`went` — none of which moves anybody. So a program that shows a person every
project and epic on the machine could draw the whole map and never travel on
it: press a row, and the best it could do was describe where you would have
gone.

##### Why a method and not a ninth message

A new top-level `kehikot.navigate` was the other candidate, and it loses on
three counts.

The first is that it would need an answer, and an answer needs correlation,
and correlation is a thing `request`/`response` already has, tested, with an
id and a timeout discipline and a refusal envelope carrying both a word and a
sentence. A second answered pair would be that machinery again, differently,
for one act. `went` exists as its own message only because `goto` is the host
speaking, and the host has no request channel; a module does.

The second is legibility. `declares.uses` is a sentence somebody reads before
installing a program. A method belongs to a capability, so "this program
reads the epics and asks to navigate" is a sentence that writes itself. A
top-level message belongs to nothing and appears in no declaration.

The third is the tone of the thing, which matters most. Look at what the
module's messages are: three statements and one unanswerable ask. `resize` is
the closest to a demand and it is deliberately fire-and-forget — the host
clamps it, may ignore it, and never replies. A module posting
`kehikot.navigate` at a host would read like `resize`: a thing done rather
than a thing asked, with no place for a no. Two programs both believing they
decide what is on screen is the defect this whole arrangement exists to
prevent. A REQUEST is a question with an answer, and the answer may be no.

##### The three outcomes, and why refusing is not `ok: false`

`moved` — the reader is now looking at what was asked for.

`declined` — the host will not, right now. The target may well exist. A
reader may be mid-edit, the module may not be the surface with the person's
attention, a host may simply not let framed programs move anybody. No reason
is enumerated, for the same reason `responseFailureReasons` enumerates none:
a list of hosts' policies is a list that cannot be kept and reads as the set
of policies allowed.

`no-such-target` — there is no such epic, no such step, nothing naming that
ref. The host looked and there is nothing there.

The three are apart because they send a person somewhere different. `moved`:
say nothing, the screen already said it. `declined`: leave the row pressable
and perhaps offer an ordinary link, because trying again later is sensible.
`no-such-target`: say so — a dead reference is worth showing as dead, and a
module that retries it forever is a module lying about a map.

Now the part that is easy to get wrong. A declined navigation comes back
`ok: true`. It is not a failed call: the host understood the question,
considered it, and answered no. `ok: false` stays what it was — the call
itself did not happen (no such method, no such module, something broke) —
and collapsing "the answer is no" into "the question failed" would leave a
caller unable to tell a host that refuses from a host too old to have been
asked. Those are the two futures the whole refusal design is built to keep
apart, so: **the question succeeded; the navigation did not.**

`epic` is where the reader ended up, and it is here for the mode that would
otherwise have no way to know. A `global` mode is never sent context — that
is what `global` means — so after moving somebody it would be drawing a map
with no marker on it until the next thing happened to tell it. A
epic-scoped mode gets a `kehikot.context` too and can ignore this. Null
when the host did not move, and null is also honest for a move within the
epic already open.

`why` is the sentence, for the person writing the module and sometimes for
the person reading it: "nothing in this epic names gh#41" is worth showing,
and a module that only knew `no-such-target` would have to invent a sentence
that might be wrong about which part was missing.

#### `epicSpine`

The least an `epics.list` can answer with and still be an answer.

##### Why this one gets a shape when `epic.get` does not

The argument for leaving responses unspecified is a good one and it is about
CONTENT: two hosts hold different amounts of an epic, and a schema over that
would be this package deciding what a host keeps. That argument covers
`epic.get`, `steps.list` and `live.get` completely, and they stay unspecified
here.

It had gone too far by one method. Every other question on the list takes an
epic slug, and `epics.list` is the only way to obtain one. If its answer may
be anything, then a module cannot rely on an epic having a name, and a
protocol whose entry point returns an unknown shape is a protocol with one
reachable method. That is not modesty about a host's material; it is the
front door being unspecified.

So the spine is the smallest thing that makes the rest reachable, and no
more:

- `slug` is required, because it is the argument to every other call.
- `title` and `project` are optional and bounded. Optional because a host
  that has no title for something is not malformed; bounded because if it
  sends one, a module is about to draw it.
- Everything else passes through untouched. A host with ledes, counts,
  owners, dates or anything else hands them over and this schema keeps them.
  The spine says what a field MEANS if it is there; it does not say the set
  of fields.

That is the line: the package names the fields without which the question
cannot be answered usefully, and says nothing about what a host holds.

There is no bound on how many epics come back, and that is not an oversight.
The bounds elsewhere exist because a stranger's text was about to reach the
host's own screen; this is the host's own material going the other way, at
the module's own request, and a host that decides to answer with a page at a
time is deciding that for itself and can say so with a field of its own.

#### `PICK_OUTCOMES`

What became of a `projects.pick`.

##### Three outcomes, and two of them are deliberately not distinguishable

`picked` — a person chose a project, and `project` says which. The path is
absolute and is what the host's own filesystem resolved it to, exactly like
`context.projectPath`; the name is what the host calls it, for putting in a
sentence and never for locating anything.

`cancelled` — the picker was opened and the person closed it without
choosing. Nothing is wrong. A module says so quietly and puts the reader back
where they were.

`declined` — the host would not ask. It holds no projects, another picker is
already open, this module is not the surface with the person's attention, or
the host simply does not let framed programs interrupt anybody. No reason is
enumerated, for the reason `NAVIGATION_OUTCOMES` enumerates none.

Now the part that is a decision rather than a description. `declined` is what
a host answers when it has NO projects to offer, rather than a fourth outcome
saying so — because a fourth outcome is an enumeration with a count of zero,
and a module that could tell "you have no projects" from "I would rather not"
could learn something about the disk by asking. One bit is one bit. The
capability's whole argument is that a module learns what a person told it and
nothing else, and a host reporting on the shape of its own holdings to a
program that was refused is reporting anyway.

A module must therefore treat `cancelled` and `declined` the same way: stop
asking, say nothing alarming, leave the control where it was. `why` is for
the author reading a console, and a host that puts its holdings in it has
given away what the outcome was arranged not to say.

All three are `ok: true`. The question succeeded; the picking did not — the
same line `navigationResult` draws, and for the same reason: a caller has to
be able to tell a host that said no from a host too old to have been asked.

#### `pickedProject`

One project, as a host hands it over.

The same two fields `context` uses for the open project and named the same
way, because they are the same two facts and a second spelling of them is a
module that resolves a picked project differently from the open one. `path`
is absolute and resolved; `name` is what the host calls it and is never a
path.

#### `methodResults`

The answers this package describes, by method.

Partial on purpose, and absence means UNSPECIFIED rather than empty: a method
with no entry here answers with a host's own material, and a module reading
it is reading something no host promised the shape of. Do not write a
fallback that treats a missing schema as "expects nothing".

A plain object, so the same lookup hazard as everywhere else — a method name
arrives from a stranger's program and `methodResults['constructor']` finds
something on the prototype. Use `resultSchemaFor`, which asks properly.

And, like every schema here: running this is a convenience, not the check.
A module validating what a host sent it is doing the same thing the host does
in the other direction, and for the same reason — it is the only side that
can.
