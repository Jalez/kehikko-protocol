# The wire: context, passages and messages

What a host and a module say to each other across the frame: the context a module is handed, the passage a reader is pointing at, and the messages themselves.

This is the reasoning, not the reference: the shapes themselves, with their bounds, are in the source and show on hover. The first half is the overview that used to be in the README; the second half is the note that used to stand above each symbol in the source, under that symbol's name.

Back to the [index](README.md).

## Overview

### The wire

Ten messages, across a frame, by `postMessage`.

| Host → module | |
|---|---|
| `kehikot.hello` | The greeting, on every frame load. Carries the protocol both sides settled on, a session name, and the current context. |
| `kehikot.context` | Which epic is open, which project it belongs to and where that project is on disk, which theme. Sent on every switch. |
| `kehikot.response` | The answer to exactly one request. |
| `kehikot.goto` | Go to this reference. |
| `kehikot.event` | An extension payload another module emitted. |
| `kehikot.clear` | "Clear what you are showing." The press, relayed — no ids, no answer. |

| Module → host | |
|---|---|
| `kehikot.ready` | "I heard you." |
| `kehikot.request` | One question, with an id the answer carries back. |
| `kehikot.resize` | How tall it would like to be. |
| `kehikot.went` | Whether the `goto` found anything. |
| `kehikot.filters` | What this module can be narrowed by, so the host can draw the control. |
| `kehikot.clearable` | That what it shows can be cleared, and what to call the control. `null` withdraws it. |

`goto` and `went` are the new pair, and `went` is the piece the protocol has
always lacked. Everything else the host says is fire-and-forget. `goto` cannot
be, because a host's reference index decides whether to walk the reader in place
or fall back to an ordinary link, and it decides by whether the walk found
anything. In a host's own page that answer was a return value; across a frame it
has to be a message. This is the only place a host waits on a module, so:
**a host must time out, and the timeout must mean the same thing as
`found: false`.** A module that never answers must not be able to hang a
reference.

A refusal always carries two things. `reason` is a word from a closed set, for
the program — `unknown-module`, `unknown-method`, `failed` — because "ask again"
and "never" are different futures and code should not have to read English to
tell them apart. `error` is a sentence, for the person writing the module, who
reads it in their own console and has to know which call was wrong. Neither
substitutes for the other.

### Epics are not journeys

An **epic** belongs to a project. It is the thing a host holds — the steps,
their order, the references they name, what the last refresh read from the
trackers — and it is therefore the only thing a host is in a position to tell a
module about. A **journey** is a different idea, and it lives in a module app of
its own.

These files were distilled from a codebase where the two words meant one thing,
and the conflation had reached the methods (`journeys.list`, `journey.get`), the
context field a module reads on every switch, the mode `scope` enum, the
capability names and the slug pattern. All of it now says `epic`, with **no
aliases** — a shim would keep the confusion working, which is the whole of what
was wrong with it.

The consequence worth naming is `kehikot.context`. It used to say which journey
was open, and a host saying that is repeating something it was told: the module
that owns journeys could be showing a different one, or none, or have been
closed. Context has to be the host's own knowledge or it is a rumour with a
protocol's name on it. So context names an epic and a project, and a module that
wants to know what journey somebody is reading asks the program that owns
journeys — which from this protocol's side is not a special arrangement at all.
It is just a program.

`EPIC_SLUG` describes an epic slug and only that. If a journey slug turns out to
be spelled differently, nothing here changes, because a host is not the
authority on that name.

All of that is about the **wire**, and all of it still holds. What 0.30.0 adds
is about the **disk**, and it is narrower than it sounds: the record the
Journeys module keeps for an epic is now something a host reads, so its shape
is written here. See "An epic's steps are kept once", below, for what was
decided.

### A project is named and a project is somewhere

`context.project` says what the project is called. `context.projectPath` says
where it is: an absolute folder on the host's machine, or `null` when the host
has no filesystem to point at.

Two fields rather than one object, and the argument is on `projectPath` in
`wire.ts`. In short: a name is what a module PRINTS and a path is what a module
OPENS, one string cannot do both jobs well, and nesting them would have changed
the shape of a field that already exists — which is the one thing `PROTOCOL` is
supposed to go up for. Adding a field is not. A module that never reads
`projectPath` is exactly as correct as it was before it existed.

What it replaces is an environment variable per module, set at launch by
whoever started the program. Under that arrangement a host could move a person
to another project and every module would go on reading the first one,
correctly, from the root it was handed — nothing erroring, and every module
describing a different project from the one the host had named.

### Why a reference closed

A tracker's `closed` is done, won't do, duplicate and superseded at once.
`disposition.set` (capability `disposition:set`) lets a person — or an agent
through the host's MCP door — say which; the host keeps the marks per project
and sends them to every module as `context.dispositions`, and a module that
moves when one changes says `reacts: ['dispositions']`. Only people's marks
travel. What the tracker says (GitHub `stateReason`, a GitLab issue closed by a
merged change) is derived on each side with `deriveDisposition`, and
`dispositionOf` puts the two together with the mark winning and the source
named, so a module can always say whose verdict it is showing.

## Notes by symbol

### `src/wire.ts`

#### About `src/wire.ts`

Everything the two sides say to each other, gathered under one name.

The shapes live in four files by what they describe — a place in a document
(`passage.ts`), what a module offers to be narrowed by (`filters.ts`), what a
module is told about where the reader is standing (`context.ts`), and the
messages themselves (`messages.ts`). This file re-exports all of them, so
`./wire.js` names exactly what it always did.

### `src/constants.ts`

#### About `src/constants.ts`

The spellings, the numbers, and the one place each of them is written down.

Everything in this file exists because two programs have to agree about it
and neither of them owns it. A host that spells the greeting `kehikot.hello`
and a module that listens for `kehikot.Hello` are not slightly wrong; they
are two programs that will never speak, and the failure has no symptom other
than silence. So there is one definition of each spelling and both sides
import it.

#### `WELL_KNOWN`

The one path a module has to answer on. Nothing else is ever asked for.

Under `/.well-known/` because that is where a program publishes a fact about
itself that some other program came looking for, and because it cannot
collide with whatever the module's own pages are called.

#### `LEGACY_WELL_KNOWN`

> **Deprecated in 0.37, removed in the next breaking release.** Use `WELL_KNOWN`.

Where a module built before the rename serves its manifest.

A host asks `WELL_KNOWN` first and this second, so an unchanged module is
still found. A module built against this package may serve its manifest here
too, in the old dialect (`legacyManifest`), so an unchanged host still finds
it. See `dialect.ts`.

#### `MANIFEST_KIND`

The word that makes a manifest a claim rather than a hopeful GET.

Something else entirely may be listening on the port a host asks, and it must
not be possible for that something to become a tab by accident. A JSON
document that does not say this word is not a manifest, however many of the
other fields it happens to have.

#### `MESSAGE`

Every message type, spelled once.

Prefixed `kehikot.` so that a page framed inside a host can tell a message
meant for it from the analytics beacon, the framework hot-reload socket, and
whatever else in a browser posts messages at windows all day. Both ends
filter on the prefix before they look at anything else.

#### `MESSAGE.EVENT`

Host → module. An extension payload another module emitted.

The ninth message, and it exists because the eight before it left
`events.emit` with nowhere to land. A module could emit a notification, a
host could check the extension was one it knew and validate the payload
against that format's schema and read from every manifest which modules
`consume` the name — and then had no way to say it. One host's own comment
called that its principal piece of feedback on this protocol.

A module receives one of these because its manifest CONSUMES the extension.
It is not a request, carries no correlation id, and is not answered: a
module that ignores every event it is sent is a conforming module, and a
host that waited for acknowledgement would be a host that can be hung by a
pane nobody is looking at.

#### `MIN_HEIGHT`

How tall a frame may be asked to be.

Bounded on both sides, and the two bounds are for opposite failures. A module
cannot make itself two pixels tall and disappear from a page somebody is
looking at, and it cannot push everything below it over the horizon either.

The numbers are here rather than in the host so that a module can do the
arithmetic on its own side and know what it will get. `clampHeight` is the
host's answer restated, not a substitute for it — see the note on that
function.

#### `clampHeight`

What a host will make of a height a module asked for.

Pure, and offered so a module can predict the answer rather than discovering
it by watching its own layout jump. It is not the check: the host runs its
own copy of this, over the raw value it was handed, because a module could
post a height of `NaN`, of `"600"`, or of nothing at all, and a host that
trusted a number because a package existed would be trusting the module.

### `src/messages.ts`

#### About `src/messages.ts`

Everything the two sides say to each other.

A module's page runs in a frame the host created, cross-origin to it, and the
only channel between them is `postMessage`. That is a good channel and a
narrow one: nothing structural stops either side from sending anything, so
every field below is a thing somebody else's program chose, and the shapes
here exist to make it cheap to say no to the ones that are wrong.

##### Addressing, which is not this package's problem but is worth knowing

A module without `declares.storage` runs on an opaque origin. It has no
origin string, so there is no `targetOrigin` that matches it and everything
it sends arrives with an origin of `"null"` — a string every opaque frame in
every tab shares, which is why it can only ever be a shape check and never an
identity one. The identity is the window: the exact frame handle the host
created and greeted, which nothing in the page and nothing in the frame can
forge. A module WITH storage has an origin, and then there is a second thing
to check as well as the window.

None of that is modelled here, because none of it is a shape. It is written
down because a client library reading these schemas has to get it right and
the schemas will not tell it.

##### Parse both directions

A host validating what a module sends is obvious. A module validating what
the host sends is not, and is the same rule: a framed page receives every
message posted at its window, from the host, from a bundler's dev socket,
from anything else that has a handle on it. The type check is what tells a
`kehikot.context` from a coincidence.

#### `messageType`

A message type, read in either spelling and handed back in the current one.

Every message schema below uses this for its `type`, so a host built
against this package reads `roadmap.ready` from a module that has not been
updated, and a module built against it reads `roadmap.hello` from a host
that has not been. Downstream of a parse there is only the `kehikot.`
spelling, and code comparing `message.type === MESSAGE.READY` is right for
both. Sending in the old spelling is `toDialect`'s job; see `dialect.ts`.

#### `helloSchema`

Hello: the whole of what a module is given without asking.

Sent on every frame LOAD, not on the first one only: a frame that reloads
itself has forgotten the conversation, and greeting it again is cheaper than
either side wondering. And sent on load rather than on a timer, because a
guess long enough to be safe is a guess a slow machine still loses, and a
module greeted before its own script ran is one that never hears the
greeting.

`protocol` is the host's answer — what the two sides settled on when the
manifest was read — and not either half's opinion of it.

`session` names this conversation so a module can tell a reload from a second
frame. It is not a credential and must never become one: a module holds no
token, and every question it asks is checked by the host on the host's own
terms rather than against anything it was handed here. A session id that
unlocked something would be a secret sitting in a frame that any script in
that frame can read.

The context rides along because the first thing every module wants is which
epic is open, and a second round trip to learn it is a round trip for
nothing.

There is no list of permissions in the greeting. There was, in an earlier
design where a person answered a dialog; there is nothing to list now, and a
field here saying what a module "may" do would be this package modelling an
approval it has no business modelling.

#### `helloSchema.state`

Whatever this module last asked the host to keep for it, verbatim.

Beside the context rather than inside it, and that placement is the whole
point: context is broadcast to every framed module, and this belongs to one
of them. A module's remembered state travelling in a shared message would
be every module reading every other module's preferences.

`null` when the host keeps nothing for it — a first run, a host that does
not answer `state.set`, a module that has never written any. It is not
optional, because a module has to be able to tell "nothing kept" from "the
field is missing because this host is older than the idea", and only one of
those means it should draw its defaults with confidence.

In the GREETING rather than fetched, so a module has it before its first
render. Asking for it afterwards would mean drawing the wrong filter first
and correcting it, which is the visible-flicker failure in a different
costume.

Opaque. The host stored a string and hands the same string back; see
`state.set` in `methods.ts` for why it must never learn what is in it.

#### `contextMessageSchema`

Which epic is open now.

Sent when the reader switches epics and when the module's own tab is
shown. Flat rather than wrapping a `context` object, which is an
inconsistency with `hello` and is kept because it is what both halves already
speak — the same fields, one level up. `contextSchema` is the shared
definition either way, so the two cannot drift apart in what they carry.

Only epic-scoped modes are told. A `global` mode asked for one page over the
whole canvas and gets one.

#### `responseFailureReasons`

The answer to exactly one request.

Two shapes under one type, and the split is the point: a caller either got
data or got a refusal, and a single object with four optional fields makes
that a thing to work out rather than a thing to branch on.

A refusal carries BOTH halves, always. `reason` is a word from a closed set,
for the program: "ask again later" and "never, this method does not exist"
are different futures and code has to be able to tell them apart without
reading English. `error` is a sentence, for the person: whoever is writing
the module reads it in their own console and has to know which of their calls
was wrong. Neither substitutes for the other. A reason with no sentence is a
developer bisecting their own code to find out what happened; a sentence with
no reason is a client parsing prose.

#### `responseSchema`

Three reasons, and there used to be four.

`not-allowed` is gone with the permission system it described. What remains
are: this host has no module by that name (which is a module talking to a
host that has forgotten it, usually after being removed while its frame was
still open); this host has no such method (which is a module built against a
protocol this host no longer speaks, and is the one refusal an author should
treat as fatal); and it went wrong (which is everything else, and is the only
one worth retrying).

A host may of course refuse a call for reasons of its own — that is the whole
of what a host is for. It says so with `failed` and a sentence. Adding a
reason per policy would be this package enumerating hosts' policies, which is
a list that cannot be kept and would read as the set of policies allowed.

#### `responseSchema.error`

Bounded, because a refusal is the one place a host quotes a module's own
text back at it — the method name it asked for, the extension it named —
and a sentence that carried two hundred thousand characters of that back
across the frame would be a module's document, round-tripped, at the
module's own request. Long enough for every sentence anybody actually
writes; short enough that no answer is ever a document.

#### `gotoSchema`

Go to a reference.

##### Why this message is the interesting one

A host walks a reader to a reference by reaching into the panel: query for
the anchor, open whatever is folded above it, scroll it to the middle, flash
it. That works while the panel is part of the host's own page and stops
working entirely the moment the panel is a module, because the frame is
cross-origin, its document is unreachable, and there is no way to reach in.

There is a fallback that needs no protocol at all — set the frame's location
to `#epic=x&ref=y`, which a page may do cross-origin — and it costs a
navigation: the document reloads and the handshake happens again. That is why
it is the fallback and this is the message.

`ref` is a reference as the host spells them. `step` is 1-based. `epic` is
optional and means "switch first", which the host would ordinarily have sent
as context anyway. The bounds — `GOTO_REF`, 1..999, the slug pattern — are
not invented here: they are what the receiving end already imposes, restated
so the sender knows what will survive.

`id` is required, and it is the reason this message needed designing rather
than just writing down. See `wentSchema`.

The mirror of this message is the `view.goto` method, which is a module
asking for the same act. The fields are named the same on both sides
deliberately. They differ in exactly one way, and it is the direction of the
asking: a `goto` naming only an epic is refused here, because a host with
nothing to say but "this epic" says it as context; a `view.goto` naming only
an epic is the commonest ask a module has.

#### `eventSchema`

An extension payload one module emitted, delivered to a module that consumes
that format.

##### Why the host is in the middle at all

The sender does not name a recipient and cannot: a module has no way to know
what else is on the canvas, and giving it one would end modularity. It names
a FORMAT — `kehikot.notifications@1` — and the host works out who has said,
in their manifest, that they consume it. So a module emits into the room and
the room decides who hears, which is why either can be removed without the
other noticing.

##### What the host vouches for, and what it does not

`extension` and `payload` were checked before this was sent: the host knew
the format and validated the payload against that format's own schema, so a
receiver is entitled to assume the shape.

`from` is the id of the module that emitted it, taken from the host's own
registry rather than from anything the sender said, so it cannot be forged by
a module claiming to be another. It is the one field a receiver may safely
attribute by.

The CONTENTS are the sender's claim and nothing more. A notification saying
"the tests passed" is one module's word for it; a host relaying it has not
checked that any test ran. A receiver drawing it should attribute it, for the
same reason `selection` carries refs and not kinds.

##### Not answered, ever

No correlation id and no reply. A module that ignores every event it is sent
is a conforming module, and a host that waited for acknowledgement could be
hung by a pane nobody is looking at. Delivery is best-effort by design: an
event sent to a module that is still loading is lost, and a receiver that
needs history should keep its own rather than expect the wire to hold it.

#### `eventSchema.kehikko`

The kehikko it happened on, so a receiver can tell near from far.

A module is loaded once and shown on whichever canvas asks for it, so "this
kehikko" is a question it cannot answer alone. `context.kehikko` says where
the receiver is standing and this says where the event came from; comparing
the two is the whole of a near/far filter, and it is a comparison rather
than a rule so a module can present it however it likes.

#### `readySchema`

"I heard you."

The id is the module's own, and it is here so that a host greeting a frame
can confirm the program in it is the one whose manifest it read. It is not
how the host identifies the module — that is the frame handle, which cannot
be forged — so a mismatch is a fault to report rather than an impersonation
to defend against. The distinction matters: a check that looks like security
and is not teaches people to lean on it.

Silence after a greeting is the failure this message exists to make visible.
A host should give it a bounded wait and then say, in words, that the module
was greeted and did not answer — and should count that wait from the
GREETING, not from the mount, because a module cannot be silent in answer to
a word nobody has said yet.

#### `requestSchema.method`

Bounded but not held to the list of known methods, which would be this
schema deciding what a host answers. A host with a method this package has
never heard of is a host doing its job; a host without one this package
knows is entitled to refuse it, with `unknown-method`.

#### `resizeSchema`

How tall the module would like to be.

The one message with no id and no answer. It is a request in the ordinary
sense and not in the protocol's: the host clamps it (`clampHeight`) and may
ignore it entirely, and a module that needed to know the outcome can measure
itself.

#### `wentSchema`

"I went" — or "there is nothing here by that name."

##### The acknowledgement the protocol has always lacked

Everything else the host says to a module is fire-and-forget, and can be,
because nothing downstream of it depends on the answer. `goto` is different,
and the difference is concrete: a host's reference index decides whether to
walk the reader to a reference in place or to fall back to an ordinary link,
and it decides by whether the walk found anything. In the host's own page
that answer was a return value. Across a frame there is no return value, so
either the host stops asking — and accepts that pressing a reference may land
nowhere, silently, which is the failure this whole protocol keeps refusing —
or the message gets an answer.

So it gets one, and `goto` carries an id to pair it with. This is the first
and only place the host waits on a module for anything, and it is worth being
plain about what that means: the host is now depending on somebody else's
program to reply, so it must time out, and the timeout must mean the same
thing as `found: false` — fall back to the link. A module that never answers
must not be able to hang a reference.

`found` is the field the index reads. `why` is for the person: "nothing in
this epic names gh#41" is a sentence worth showing, and a host that only knew
`false` would have to invent one that might be wrong about the reason.

##### Answer when you know, not when you are asked

There is one `went` per `goto` and it is the last word, so a module must not
send it until the walk has actually settled. The tempting bug is visible in
the receiver this pair was designed against: told to go to a ref in an epic
it does not currently have loaded, it starts the load, remembers where it was
going, and returns "yes" — before anything has been looked for. Answering
`found: true` there is a guess, and the host acts on it by NOT falling back
to a link, so a wrong guess is a press that lands nowhere and says nothing,
which is the exact failure this pair exists to remove.

Holding the answer until the load finishes is safe, because the host's
timeout is the backstop and a timeout already means what `found: false`
means. A slow honest answer degrades to the fallback. A fast dishonest one
degrades to silence.

#### `hostMessageSchema`

Not a `discriminatedUnion`, because `responseSchema` is itself a union on a
different key and cannot be an option of one. A plain union costs a little
more to parse and reports its failures less precisely; it is the honest shape
of a wire where one message type has two forms.

#### `looksLikeWireMessage`

Is this worth parsing at all?

The cheap first filter, before a schema is run over a `MessageEvent` from a
window that receives messages from everything. It says nothing about whether
the message is valid or whether the sender is anybody — it says the value is
an object with a `type` that starts `kehikot.` — or `roadmap.`, the same
protocol before the rename, which is still read (see `dialect.ts`) — and that
is what separates a message meant for this protocol from the several that
are not.

### `src/context.ts`

#### `DISPOSITIONS`

What a closed reference came to.

A tracker's `closed` covers finished work, work nobody will do, a duplicate
and something replaced by something else, and a module that reads `closed`
as `done` counts the second, third and fourth as delivered. These four are
the answers people actually give. Open to extension the way every list here
is: a module meeting a value it does not know treats the ref as closed for a
reason it cannot name, which is what it did before this list existed.

#### `dispositionSchema`

One person's verdict on one reference, as the host holds it.

##### Only the marks, never the derivation

A tracker sometimes says why it closed something — GitHub's `stateReason`, a
GitLab issue closed by a merged change — and that is a DEFAULT, not a mark.
It stays out of this list on purpose: every module holding a tracker reading
derives it with `deriveDisposition` in `facets.ts`, and a person's mark wins
over it there. Kept apart, a module can always say which one it is showing,
which is the whole difference between "you said won't do" and "GitHub says
not planned".

`target` is the other ref for `duplicate` (duplicate OF it) and `superseded`
(superseded BY it), and null for the other two. One field rather than two,
because a ref is never both and two nullable fields can disagree.

`by` is who said so, in words the host chose — a person, or an agent through
the MCP door — and `at` is when, as an ISO timestamp. Both are the host's
own knowledge: the method that sets a disposition does not carry either.

#### `showingSchema`

What one container says it is showing.

##### The ask this exists for, in the words it arrived in

> "Lets say we have multiple things in kehikko that can have a checklist for
> instance and they all have different checklists. Obviously we should be
> able to show both items checklists. And if user selects x number of the
> modules then we should only show those modules checklist no? Same with
> notes, and references."

Two facts are being asked for and neither was on the wire. The first is
WHAT EACH CONTAINER IS ABOUT — a paper open at chapter three, a journey
step, a reference somebody clicked — so that a module holding checklists, or
notes, or anything else filed against such things can show what belongs to
everything on the canvas at once. The second is WHICH CONTAINERS ARE PICKED
OUT, so that the same module can narrow to the ones a person is aiming at.
This schema is the first fact, `containerSchema` below carries both, and
`contextSchema.containers` is where they travel.

##### Why `passage` and `selection` did not already say it

They nearly do, and the temptation to read them as this was real. A passage
is where the reader is pointing, a selection is what they picked out, and a
consumer intersecting its material with both already shows "what is in
front of you". What neither can say is which CONTAINER is showing it, and
both are single-valued per canvas: one passage, one list of refs, the last
writer winning. Two containers each showing a document, or two each holding
refs, cannot both be described — the second overwrites the first, correctly,
because pointing is a canvas-wide act and only one thing is pointed at.

So the two fields are kept exactly as they are and mean exactly what they
meant: the reader's finger, and the person's pick. This is a third thing —
what a container has open, said by the container, held per container, and
changing when the container changes what it shows rather than on every drag
across a paragraph. A module sends it with `showing.set` and re-sends it
when the answer changes, including to nothing.

##### Refs and places, because those are the two kinds of thing anybody files against

`refs` is the vocabulary `selection` already uses — `gh#105`, `!44` —
compared for equality and vouched for by nobody; see `selection.set` in
`methods.ts` for why a kind does not ride along. `documents` reuses
`passageSchema` whole, and reuse is the argument: a place in a document at
whatever precision — a file, a page of it, a range in it — is a shape this
package already argued for at length, and every consumer that follows a
passage already has the code to read one. A third spelling of "this file,
these bytes" would be a third thing to get wrong.

A module saying what it shows should leave `quoted` empty. The quote exists
so that a consumer can tell a rotten highlight from a live one by looking at
the words; a file being shown is not a highlight and has no words to
evidence, and a chapter's text through every frame on the canvas on every
change is the thing `LIMITS.QUOTE` was written to prevent.

##### The host cannot check any of it, and says so by relaying it unchanged

A module saying "I am showing chapter three" is a claim about itself, and a
host has no way to look inside a frame on another origin to see whether it
is true. What the host CAN vouch for is that this frame — identified by its
window, which nothing in the page can forge — said so, which is the same
strength of claim `passage` has always had. So it is relayed per container,
attributed to the container that made it, and a consumer treats it as that
container's word. That is weaker than an event the host carried, and
`relations.ts` in the host draws it as weaker; it is the honest amount.

#### `containerSchema`

One container on the kehikko: which module, whether it is picked out, and
what it is showing.

##### `selected` is the second fact, and it is the host's own

The host draws a box in every container's header and a ring around the
container when it is ticked, holds the tick with the arrangement, and lets
an agent set it over MCP. It is "which of the containers arranged here are
the ones being aimed at" — a third axis beside the refs and the passage,
said about the canvas rather than about the work. Until now it never crossed
the wire, and the host's own code recorded the decision: a module could not
act on being selected, because from inside there is no telling an agent
about to work on it from a box somebody ticked last Tuesday.

That argument was about a module reading ITS OWN flag, and it stands. This
is a different reading. A consumer does not ask "am I selected"; it asks
"which containers are, and what are they showing" — and narrows its own
material to that, under a control in its own header that the person can turn
off. The tick is visible on the canvas as a ring, so a container narrowed by
last Tuesday's tick is narrowed by something the person can see and unpick.
What was refused was a module changing its behaviour on a fact it could not
see the end of; what is sent is a fact a person is looking at.

##### Every container is listed, not only the ones that have spoken

A container that has said nothing still appears, with `showing` empty, and
the emptiness is load-bearing. "Journeys is picked out and has said nothing
about what it shows" is a sentence a consumer has to be able to print,
because it is the difference between a pane that is empty for a reason and a
pane that is empty. A list holding only the containers that spoke could not
say it.

##### What the host may fold in, and why that is not a second source

A host that knows which container set the current `passage` — it does; the
call arrived from a window — may put that passage into that container's
`documents`, and the current `selection` into its setter's `refs`. That is
a projection of one fact into a second place, composed by one function from
one source, and it is what lets a module that has only ever called
`passage.set` be "showing" what it points at without learning a new word.
It is not a claim the module made, and a host doing it should say so in its
own code; a module that wants to be showing more than it points at says so
with `showing.set`.

`module` rather than a container id, because a module is on a kehikko once
and its id is the one name for a container that means the same thing on
every machine — see the host's `kehikot.ts`. A consumer finds its own row by
its own id, and may, though nothing here needs it to.

#### `contextSchema`

What a module is told about where the reader is standing.

##### An epic and a project, because that is what a host can vouch for

The field used to be called `slug` and used to mean a journey, and a host is
not in a position to say that. A journey lives in a module app of its own; if
the host named one here it would be repeating something it was told, in a
message a module then treats as authoritative — and the module app that owns
journeys could be showing a different one, or none, or have been closed.
Context has to be the host's own knowledge or it is a rumour with a
protocol's name on it.

What the host actually knows is which epic it opened and which project that
epic belongs to. So that is what it says. A module wanting to know what
journey a person is reading asks the program that owns journeys, and gets an
answer from something that can actually answer.

The project arrives as two fields — what it is called, and where it is on
disk — for reasons argued at each of them below. The short version is that a
module has to be able to both NAME the project and OPEN it, and one string
cannot do both jobs well.

`epic` is null when none is open, and it is nullable rather than absent
because "no epic" is a state a module has to be able to move INTO. A field
that simply disappeared would leave the module showing the last epic it heard
about, forever, which is a page quietly describing the wrong work.

`theme` rides along for the same reason the rest of it does: a module that
had to ask would render once in the wrong colours first.

#### `contextSchema.project`

What the project is CALLED. Unchanged, and deliberately still a name.

This is the string a module puts on screen. A path is a bad label — it is
long, it is the same for its first forty characters as every other project
on the machine, and its last segment is a folder name somebody chose for
their disk rather than a name they chose for their work. A host that sent
only a path would make every module invent a display name by splitting a
string, and eleven modules would split it eleven ways.

#### `contextSchema.projectPath`

Where the project IS: an absolute folder path on the host's machine.

##### Why a name was not enough

A name is something to print. Everything a module actually wants to DO with
a project needs somewhere to open: read the epics under it, run a command
in it, show its history, list its chapters. Until this field existed each of
those modules had to be told its own root separately — an environment
variable per module, set by whoever started it — so a host could move a
person to another project and every module would go on reading the first
one, correctly, from the root it was given at launch. Nothing errored. The
modules simply described a different project from the one the host named.

Absolute, and the host is the only one in a position to vouch for that.
This package does no I/O and cannot check it — see `LIMITS.PATH`. A module
receiving a relative path here has been handed something its host could not
have meant, and should treat it as it treats any other field it was lied
to about.

Null is a real state and not an oversight. A host with no filesystem of its
own — a hosted one, a demo, a test harness — knows the name of the project
a person is looking at and has no folder to point at. A module handed a
name and no path can still say which project it is showing and must not
pretend it can open it.

##### Why this is a second field and not `project: { name, path }`

The tidier shape is the object: two facts about one thing, atomically
consistent, impossible to have a path without a name — and it is the shape
this package already uses for `kehikko`. It was rejected here for one
reason, and the reason is `PROTOCOL`.

`PROTOCOL` goes up when an existing field CHANGES SHAPE, and stays put when
the wire merely learns a new word — see the essay on it in `constants.ts`,
which is emphatic that a number going up for additions is a number nobody
can act on. Turning `project` into an object is exactly a shape change: a
module rendering `context.project` in a span prints a project name today
and `[object Object]` afterwards, with no version signal to tell it why.
That module is not degraded, it is broken, and the protocol's own rule says
it should have been told it was INCOMPATIBLE rather than left to find out
on screen.

So the choice was: bump the protocol and make every module in the world
incompatible in order to nest two strings, or add a field and break
nothing. The second is what the rule is for. `project` still means what it
meant, still parses as what it parsed as, and a module that never reads
`projectPath` is exactly as correct as it was yesterday — which is the test
this package applies to every addition.

The cost is honest and worth naming: two nullable fields can disagree, and
nothing here prevents a host sending a path with no name. A host should
fill them in one place, from one project, so that they cannot; this package
can say that and cannot enforce it.

#### `contextSchema.selection`

What the person has picked out, if anything.

##### Why a selection is context and not a message between modules

The case that produced this: one module lists an epic's references, another
shows a journey, and picking a reference in the first should show it in the
second. The obvious build is a channel from one to the other — and that
ends modularity, because the first module then has to know the second
exists, and a canvas without the second is a canvas where the first is
sending into nothing.

A selection is the same KIND of fact as the open epic: it is what this
canvas is looking at. So it travels the way the epic travels. A module asks
the host to set it, the host tells everyone, and no module ever learns
which other module is listening — or whether any is. Each works alone, and
two of them work together without either having been written for the other.

##### Refs and nothing else

The sender knows more than this carries — which of these is an issue and
which a pull request — and that knowledge deliberately does not travel. See
`selection.set` in `methods.ts`: a host can vouch that these are the refs
somebody picked, and cannot vouch for what they ARE, because it was told
and never checked. Context is the host's own knowledge or it is a rumour
with a protocol's name on it, which is the same reason `slug` is not here.

Empty rather than absent, for the reason `epic` is nullable rather than
optional: "nothing is selected" is a state a module has to be able to move
INTO, and a field that simply vanished would leave a module showing the
last selection forever.

#### `contextSchema.passage`

Where in a document the reader is pointing, or null.

##### A passage is context, and the argument is the one above, unchanged

The essay on `selection` a few lines up makes the case for a picked
reference travelling as context rather than as a message from one module to
another, and every line of it holds here with the nouns swapped. A reader
highlights a sentence in the module that shows the paper; a module that
keeps notes should narrow to it. The obvious build is a channel from the
first to the second, and it ends modularity: the paper would have to know
the notes exist, and a canvas without the notes is a paper sending into
nothing.

There is a second argument here that `selection` did not need, and it is
the stronger one. **An event would be missed.** A selection made at
10:04 and a module opened at 10:05 is the ordinary case — a person reads,
finds something worth a note, and only then puts a notes pane on the
canvas. A message sent at the moment of pointing is gone by then, and the
new pane would open empty beside a reader who is quite plainly pointing at
something. State is what a module can arrive late to, and pointing at a
passage is a state: it is true for as long as the highlight is on screen,
not for the instant the mouse came up.

##### Null rather than absent, for the reason everything here is

"No document is open" is a state a module has to be able to move INTO. A
field that vanished would leave a notes pane showing the notes on a chapter
the reader closed ten minutes ago, with no way to tell that from the
chapter still being open — which is a pane confidently describing the wrong
document, the failure this whole file is arranged against.

A module reading this against a host that has never heard of it finds
`null`, which is the true answer there: that host has nobody pointing at
anything.

#### `contextSchema.pinned`

Whether this module has been pinned, and will stop being re-pointed.

##### The field that makes pinning honest

A person may want two panes on two different epics — last quarter's beside
this one, to compare — or a module holding still while they move the canvas
around it. Nothing stops a host doing that: it simply sends one frame a
different context, or stops sending it new ones.

What stopped it being allowed was the other side. A module pinned by a host
that never said so has no way to tell a person's pin from the canvas not
having moved. It goes on describing itself as showing "the open epic" when
it is showing a remembered one; it cannot explain itself; and a module
written against one host's silent pinning behaves differently there in a
way its author cannot discover. That is a host-only convention, and this
package's whole position is that a module must be able to see what it is
subject to.

So the pin is said out loud. `true` means: what you were last told is what
you keep, and further changes to this canvas will not reach you until this
goes false again. A module that ignores the field is exactly as correct as
it was before — it simply stops receiving updates, which is the behaviour a
host could always have chosen. A module that reads it can say "held" in its
own words, which is the whole point.

The context carrying it is still sent when the pin CHANGES, in both
directions, and that is not a contradiction of "you will receive nothing":
the message announcing the freeze is the last one through, and the message
lifting it is the first. A pin nobody was told about is the thing this
field exists to prevent.

#### `contextSchema.prompt`

What this canvas has been told to tell this module, or null.

##### A prompt is a thing a person wrote, aimed at one pane

Some modules do work that has to be described before it can be done —
"review these for security", "the house style is in CONTRIBUTING.md" — and
the description belongs to the person, not to the program. So it is written
on the canvas and delivered here, the same way the selection is: a module
declaring `prompt` in its manifest is saying it has a use for one, and a
host that has one for it puts it in the context.

##### Why the host composes it, and a module receives one string

Several panes on a canvas may each have something to say to the same
module. The obvious shape is a list of fragments with their authors, and it
is wrong here: it makes every module that reads a prompt responsible for
merging fragments, ordering them, and deciding what happens when two
contradict — which is a policy question about somebody's own canvas, and
three modules would answer it three ways.

The host already knows what is on the canvas, who aimed what at whom, and
in what order they were written. So it composes, and hands over the result
as text. A module's job is to use it, and its author should be able to read
the whole of what they were given in one place — which is also what makes
it reviewable by the person who wrote it, in the host, before it is sent.

Null rather than empty for the reason `epic` is nullable: "there is no
prompt for you" is a state a module must be able to move into, and a module
that kept the last one forever would be working from instructions somebody
deleted.

#### `contextSchema.kehikko`

Which kehikko this context is about.

A module's page is loaded once and shown on whichever canvas asks for it,
so a module genuinely cannot tell where it is standing — and it needs to
the moment anything else on the wire says where IT came from. An event
carries the kehikko it happened on; this says the one being looked at; and
near-or-far becomes a comparison the module makes rather than a rule the
host imposes.

Nullable because a host need not have canvases at all. A module that finds
it null can still show everything it is sent — it simply cannot sort near
from far, which is a smaller loss than being handed a wrong answer.

#### `contextSchema.filters`

Which of the filters this module offered are currently chosen for it.

##### Why the choice is context and not a message of its own

The offer goes one way as `kehikot.filters`, so the obvious symmetry is a
`kehikot.chose` coming back. It is the wrong shape, for three reasons that
all point the same way.

The first is that a module has to have this BEFORE it draws. A page told
which filter it is on a beat after it mounted renders the unnarrowed list
and then narrows it, in front of somebody watching — the visible-flicker
failure `state` in `helloSchema` exists to prevent, and the greeting is the
only thing that arrives before the first render. A message of its own would
either have to be duplicated into the greeting anyway, or arrive too late.

The second is that it is not an event. A filter is TRUE for as long as it
is set, and a module can arrive late to it — reloaded, restarted hours
later by a host that had stopped it, framed for the first time on a canvas
where somebody chose something last week. That is exactly the argument
`passage` makes a few fields up: state is what a module can arrive late to,
and a message sent at the moment of pressing is gone by then.

The third is that it is per-CONTAINER, and this is the message that already
carries per-container facts. `pinned` and `prompt` are both here for the
same reason: a module's page is loaded once and shown on whichever canvas
asks for it, so anything that differs between two places the same module is
shown has to arrive on the channel the host re-sends when the canvas moves.
A separate message would need its own copy of that discipline.

##### What a module should do with an id it does not recognise

Use its own default for that group, and say nothing. A host is expected to
drop a choice naming an option the module is not currently offering — see
`fallback` on `filterGroupSchema` — but a host cannot do that before the
module has said what it offers, and the greeting goes out first. So the
first choice a module ever receives may name an option from a version of
itself that no longer exists, and a module that trusted it would narrow by
a value nobody can see, choose, or clear.

Both halves defend it, deliberately. Two programs that each assume the
other got it right is how a stale value survives.

Empty rather than absent, for the reason every other field here is: "nothing
is narrowed" is a state a module has to be able to move back into, and a
module reading this against a host that has never heard of filters finds
`{}`, which is the true answer there.

#### `contextSchema.containers`

Every container on this kehikko: which module, whether it is picked out,
and what it says it is showing. See `containerSchema`.

##### Context, for the reasons everything else here is context

A module arrives late to it — a checklist pane placed after two containers
were picked out has to open narrowed, not wait for the next tick. It has to
be there before the first render, or the pane draws everything and then
narrows in front of somebody. And it is the same KIND of fact as the
selection and the passage: what this canvas is looking at, one step
further out — not one place, but the set of places its containers hold
open, and which of those the person means.

##### It is per canvas and broadcast whole, deliberately

Every frame on the kehikko is told the same list, including the rows about
itself and about containers that never asked to be described. The
alternative — composing a different list per frame, or sending it only to
modules that declared `reacts: ['containers']` — would be the host deciding
what each module may know about the canvas it is standing on, which the
essay on `reacts` in `manifest.ts` refuses in so many words: a broadcast is
not a permission, and a manifest word must not become one.

##### What a consumer does with it, said once so three consumers do not say it three ways

When no container is picked out, "what is in front of you" is everything:
the passage, the selection, and the union of what every container shows.
When some are, it is the union of what THOSE show, and nothing else. A
consumer offers the person a way to turn that narrowing off, in its own
container header, and when the narrowing leaves it empty it says which
containers are picked out and that nothing it holds belongs to what they
show — because a pane that is empty because another pane spoke is a pane
whose emptiness has no visible cause otherwise.

Empty rather than absent, for the reason every other field here is. A
module reading this against a host that has never heard of it finds `[]`,
which is the true answer there: that host has said nothing about its
containers, nothing is picked out as far as this module can know, and
everything is in front of it.

#### `contextSchema.dispositions`

Why the open project's closed references closed, where a person has said.

Context rather than an answer to a question, for the reasons the selection
is: a module has to have it before it draws a step as settled, it is true
for as long as nobody changes it, and when somebody does every module
showing that ref has to move — Journeys counting a step as done, References
hiding what is won't-do. A module saying `reacts: ['dispositions']` is
telling the registry it is one of those.

Per project, not per canvas: a verdict on `#2274` is about the work, and
holds on every kehikko that shows it. Only people's marks travel; see
`dispositionSchema` on why what a tracker says is derived on each side.
Empty rather than absent: nobody has said anything, which is the true
answer from a host that has never heard of dispositions.

#### `contextSchema.tracker`

When the open project's shared tracker reading last changed, and whether a
read is in flight. The signal, not the reading — see `trackerSignalSchema`
in `tracker.ts` for why the rows stay behind `tracker.get`.

Per project, like `dispositions`: a refresh pressed in one container moves
this for every container standing in that project, and a module saying
`reacts: ['tracker']` re-asks `tracker.get` when `at` changes and draws
itself busy while `refreshing` is true.

#### `contextSchema.content`

What has changed in the material kept for the open project's epics: the
last change per source and epic. The signal, not the material — see
`content.ts`.

Per project, like `tracker`: a write reported from one container moves
this for every container standing in that project, and a module saying
`reacts: ['content']` re-reads what it shows when the entries for it move.

#### `contextSchema.parts`

The parts of the open epic, and which of them the person has picked out.
See `parts.ts`, which is the whole argument.

##### Context, beside the epic and the selection, because it is the same fact

What a canvas is about used to be two things: the epic, and the refs
picked out of it. This is the third, standing between them — narrower than
the epic, wider than a selection — and it travels the way they do for the
reasons they do. A module has to have it before it draws, or it draws the
whole epic and then narrows in front of somebody. It is true for as long
as nobody changes it, so a module can arrive late to it. And no module
sets it: the picking is done in the host's own bar, beside the epic, so
there is no capability here and no setter to pair it with.

It belongs to the PROJECT's subject and not to a kehikko. A kehikko is a
layout; switching it changes neither the epic nor what is picked out of
it. And it belongs to the EPIC: a host that moves to another epic sends
that epic's parts with nothing picked, for the reason it clears the
selection.

##### What a consumer does with it, said once

When no part is picked, the whole epic is in front of the person and a
module shows what it always showed. When some are, it shows what belongs
to THOSE — `refInFocus` for a reference, `partInFocus` for a step that was
assigned to a part, `fileInFocus` for a file of the epic's paper, which a
part may own (`files`, each relative to the paper's folder; absent from a
host older than 0.32.0, and read as none) — and it SAYS that it has narrowed and by how much:
"showing 6 · 14 outside the picked parts", in its own header, with a way
to see them. A focus that hides things and says nothing is the failure
this field was designed against, and the reason every part is listed with
its refs rather than only the picked ones.

Empty rather than absent, for the reason every other field here is. An
epic with no parts, no epic at all, and a host that has never heard of
parts all send `[]`, and all three mean the same true thing to a module:
nothing is narrowed.

### `src/passage.ts`

#### `sectionSchema`

A section of a document: its heading, and where it spans when known.

The title is what identifies it across edits — byte offsets move when
anything above them changes, and a link written down against a heading's
words survives that. The span is a convenience for a consumer comparing
against a selection, and null when the sender does not know it (a module
that stored only the title, pointing back at the section).

#### `passageSchema`

Where in a document the reader is pointing, at whatever precision they have
managed.

##### One field, three states, and that is the whole design

The ask this exists for was: a pane showing a page of a paper, and a pane
showing the notes on it, and the second one narrowing as the first one
narrows. Nothing selected but a page open should show the page's notes; a
passage selected should show that passage's. Those are not two facts. They
are one fact — what is being pointed at — known to two different depths, and
the shape has to say so or every consumer invents its own ladder.

So there are exactly three readings, and no fourth is expressible:

  1. `passage` is `null` — no document is open. Nothing is being pointed at
     and nothing narrower could be.
  2. `passage` is set and `from`/`to` are `null` — a document is open and the
     reader has selected nothing in it. `page`, if the pointing module
     paginates, says which sheet is in front of them.
  3. `passage` is set and `from`/`to` are numbers — a range of that document
     is selected, and `quoted` is what it said when they selected it.

`from` and `to` are refused unless BOTH are present and `to` is greater. A
half-range is not a coarser answer, it is a malformed one: a consumer reading
`from` with no `to` has to invent an end, and the end it invents is a claim
about somebody's document. The refusal is where that gets noticed.

##### Why not two fields, or a discriminated union

`document` beside `selection` was the first shape and it is worse in the way
that matters: two fields can disagree — a selection in a document nobody
says is open — and every consumer would need a rule for the disagreement,
and three consumers would write three rules. A tagged union of `{kind:
'page'} | {kind: 'range'}` cannot disagree, and costs every reader a branch
before it can print a path. Nesting the narrower thing inside the wider one
gets both: the states are ordered by construction, and the fields common to
all of them are read the same way in every state.

##### What the host can vouch for, which is less than this carries

The same limit `selection` has, and it is worth restating because there is
more here to be wrong about. A host relays this; it did not open the file. It
cannot say that `path` exists, that `from` and `to` are inside it, that
`quoted` is what is there now, or that it ever was. What a host CAN say is
that a module on this canvas reported somebody pointing here. Context is the
host's own knowledge or it is a rumour with a protocol's name on it — and
this one is honestly the second kind, so a consumer must treat every field as
a claim by the pointing module and check anything it is going to act on.

That is not a flaw to be designed out. It is the reason `quoted` is here: a
consumer holding the words as well as the offsets can tell a good anchor from
a rotten one by looking, which nothing holding offsets alone can do.

#### `passageSchema.path`

Which document. An identity string, and deliberately not promised to be
anything else.

This package does no I/O and cannot say whether a path exists, is
absolute, or is inside anything — see `LIMITS.PATH`, which is the same
bound and the same argument. A host with a filesystem should send an
absolute path, because that is the only spelling two modules can agree on
without sharing a root; a host without one sends whatever names a document
in its world. Consumers compare it for EQUALITY. A consumer that resolves
it and opens it is opening a path a stranger's program chose, and owes
itself the confinement check it would owe any other.

#### `passageSchema.page`

Which page of it, or null.

Nullable because pagination is not a property of documents; it is a thing
some readers do to them. A module showing a scrolling document has no page
to name and must not be forced to invent one, and a consumer receiving null
knows the difference between "not paginated" and "page 1".

It is a FILTER and never an anchor, and the difference is the reason this
sits beside `from`/`to` rather than instead of them. Page numbers move when
anything above them is edited; byte offsets at least rot visibly against a
quote. Anything written down permanently should be written against the
range and the words, with the page kept as what it is — a fast way to
narrow a list to the sheet somebody is looking at.

#### `passageSchema.from`

The first byte of the selection within `path`, or null when nothing is
selected. Bytes rather than characters, because the consumer that opens
the file reads bytes and a character count would need the encoding to be
agreed on as well.

#### `passageSchema.quoted`

What the selection said when it was made, as the pointing module saw it.

Empty when nothing is selected, which is the only honest value then — there
is no text to quote for a whole page and a module that sent the page's text
would be sending a document through every frame on the canvas.

Bounded at `LIMITS.QUOTE` and REFUSED rather than clipped; the essay on that
limit says why a clipped quote is worse than no quote at all.

#### `passageSchema.section`

Which section of `path` the reader is in, or null.

A different claim from `from`/`to`, and the reason it is a field of its
own. `from`/`to` say "this exact text is pointed at" — a consumer marks it,
a reader turns to it, a list narrows to what overlaps it. Reading a section
is none of those: publishing it as a range would make every scroll look like
a highlight and paint a whole section in colour. So a reader that knows its
outline says where it is HERE, and the range stays for selections.

See `sectionSchema` for what a section names.

### `src/fragments.ts`

#### About `src/fragments.ts`

Schema fragments that more than one file spells, written once.

Nothing here is exported from the package. Each is a piece several schemas
share — a reference, a step number, the kehikko something happened on — and
a second copy of any of them is a bound that can be changed in one place and
forgotten in another.
