# The client library

The module half of the wire behind `/client` and `/client/react`: `connect`, the mailbox, and the hooks. A convenience, never a requirement.

This is the reasoning, not the reference: the shapes themselves, with their bounds, are in the source and show on hover. The first half is the overview that used to be in the README; the second half is the note that used to stand above each symbol in the source, under that symbol's name.

Back to the [index](README.md).

## Overview

### The client, which is a second entry point and an optional one

```
import { connect } from 'kehikot-module-protocol/client'
import { useKehikot } from 'kehikot-module-protocol/client/react'   // optional again
```

Twelve modules wrote the same `postMessage` handshake by hand — 7,519 lines of
`mailbox.ts`, `host.ts` and `use-roadmap.ts` (now `use-kehikot.ts`) between them — and two bugs turned
up in several of those copies INDEPENDENTLY, months apart:

- **The replayed greeting nobody was there for.** The host greets on the frame's
  `load` event; a React effect runs strictly after that. A listener installed in
  `useEffect` is installed after the greeting has come and gone, and nothing
  retries. The remedy is a listener at module scope with a backlog — and the
  remedy has its own race, because that backlog replays SYNCHRONOUSLY inside
  `subscribe`, so `onHello` fires before the caller has stored the connection.
  Two modules hit that second one and each spent an afternoon on a symptom that
  reads "the module will not speak" while the host sees a module that answered
  `ready`.
- **The context rebuilt field by field.** A module that lists the fields it
  copies out of `kehikot.context` silently drops every field the protocol later
  adds. No error; just that module's settled belief that the host said nothing
  about it. Five modules had it, and it was fixed five times with the same
  one-liner: `const { type, protocol, ...context } = message`.

So the client is here, once, with the reasoning attached. It knows how to be
greeted, how to answer `ready` on **every** hello, how to correlate a request
with its answer and time it out, how to turn a refusal into a `HostRefused`
rather than a bare string, and how to guarantee `goto` is answered exactly once
even when the module finds nothing — because `goto` is the one place a host
WAITS on a module, and silence there makes every reference pointing at that
module sit out the host's whole timeout.

**It is a separate entry point, and that is not packaging trivia.** The front
door of this package is shapes and nothing else, and a host's server or a
module's server imports it from a Bun process where `window` does not exist.
`kehikot-module-protocol/client` is where the browser code lives, so that rule
stays true of `kehikot-module-protocol`.

**The React hook is a third entry point, and optional twice over.** Not every
module is a React app and none is obliged to be, so `client` imports no React;
`client/react` is where the hook lives, `react` is an optional peer dependency,
and everything the hook does can be done by hand with `connect`.

#### It is a convenience, and never a requirement

The sentence about the schemas above is true of this too, and it matters more
here than it does there.

**A module that hand-rolls its own `postMessage` handshake is exactly as
conforming as one that imports `connect`.** Nothing a host does looks at whether
this package was imported, no manifest field records it, and no check will ever
be added that does. What the client saves is not correctness — it is the twelfth
author rediscovering the two races above.

This is the whole design standing on one sentence, so it is worth saying the
failure out loud: the moment the client reads as mandatory, *a module is an
independent program somebody else could have written* has quietly become *a
module is a program that imports our client*. Those are different projects. This
package is the first one.

#### The two steps, which are the point

```ts
// main.tsx — for its side effect, from the ENTRY, before React renders anything.
import 'kehikot-module-protocol/client'

const live = connect('kehikot.example', {
  onHello: (context, state) => { … },
  onContext: (context) => { … },
  onGoto: (message, answer) => answer(false, 'nothing here to walk to'),
})
held.current = live   // store it FIRST
live.listen()         // then let the backlog replay
```

`connect` builds the conversation and hears nothing. `listen` subscribes, which
is when a greeting already in the backlog is delivered — synchronously, inside
that call. Splitting them is the only thing that makes the ordering the caller's
to get right rather than the library's to get wrong silently.

#### `sideEffects`, and why it is no longer `false`

This package declared `"sideEffects": false` for its whole life, correctly: a set
of schemas has none. `src/client/mailbox.ts` has exactly one, and it is the
entire point of the file — importing it installs a `message` listener at module
scope, which is what catches a greeting posted before React has rendered.

A bundler told `"sideEffects": false` is entitled to delete a bare
`import 'kehikot-module-protocol/client'` that binds no names, and it would be
right to. That deletion produces precisely the bug this client exists to prevent,
in production only, silently. So `sideEffects` now names the two client files
rather than saying `false`, and everything else in the package stays as
shakeable as it was.

`connect` also takes `answerWithin`, `gotoBackstop` and `source`, because the
modules already disagree about the first two and every one of those differences
may be load-bearing. Adopting the client should not quietly change what a module
does on the wire.

## Notes by symbol

### `src/client/index.ts`

#### About `src/client/index.ts`

The module half of the wire, for a page that would rather not write it again.

##### Why this is a separate entry point

The package's front door says, at the top of `src/index.ts`: shapes, and
nothing else. That rule is load-bearing rather than tidy, and this file does
not break it — it stands beside it. `kehikot-module-protocol` stays a set of
types, schemas and constants that a Bun process can import without a browser
anywhere in sight; `kehikot-module-protocol/client` is where the browser code
lives, and a host's server or a module's server can go on importing the front
door without dragging a `window` reference into a process that has none.

If you are writing the host side, you want the front door. If you are writing
a page that gets framed, you want this.

##### And it is a convenience, never a requirement

The README's sentence about the schemas is true of this too: a module that
hand-rolls its own `postMessage` handshake is exactly as conforming as one
that imports `connect`. Nothing a host does looks at whether this package was
imported, and nothing ever will. What this saves is not correctness — it is
the twelfth author rediscovering the two races below.

##### How a page uses it

```ts
// main.tsx — imported for its side effect, from the ENTRY, before React runs.
import 'kehikot-module-protocol/client'

// wherever the connection is made:
const live = connect('kehikot.example', {
  onHello: (context, state) => …,
  onContext: (context) => …,
  onGoto: (message, answer) => answer(false, 'nothing here to walk to'),
})
held.current = live   // store it FIRST
live.listen()         // then hear the replayed greeting
```

The two steps are the point. See `listen` in `connect.ts`.

### `src/client/mailbox.ts`

#### About `src/client/mailbox.ts`

The one message listener a framed page has, installed the moment this file is
imported and never removed.

##### The bug it exists to fix

The host greets a frame on the frame's `load` event, and that is correct: a
module greeted before its own script has run never hears the greeting, so the
host waits for the browser to say the document is there.

But `load` fires when the document and its subresources are ready, and a
React application is not ready then. `createRoot().render()` schedules work;
effects run after that work commits, in a task of their own. So a listener
added inside `useEffect` — which is where `connect` was being called from —
is added STRICTLY AFTER `load`. The greeting had already been posted into a
page that was not yet listening, and was gone. Nothing retries: the host says
its one word, the module never answers, and the pane reads "loaded its page
and did not answer the host's greeting". Which is true, and gives no hint
that the greeting arrived a few hundred milliseconds before anybody was there
to hear it.

`StrictMode` makes it worse rather than revealing it: the deliberate
double-mount attaches, detaches and re-attaches, so there is a window with no
listener at all in the middle of startup.

So the listener is installed here, at module scope, synchronously, as part of
importing the client at all. Anything that arrives before the application is
ready is kept and handed over when it asks. A page adopting this client must
therefore import it from its ENTRY — `import 'kehikot-module-protocol/client'`
beside the first React import, not from inside a component — because a module
that is only imported by a lazily-loaded chunk is a module scope that has not
run yet, which is the same bug wearing a bundler's clothes.

##### Recorded always, not only while unheard

Every message goes into the backlog and is then delivered — rather than being
buffered only while nobody is subscribed. The conditional version has a hole
exactly one `StrictMode` wide: a greeting landing after the doomed first
subscription but before its unmount is handed to a listener that is about to
be thrown away, and never written down, so the surviving mount replays a
backlog the greeting was never in. That failure is deeply confusing to read,
because the host sees a module that answered — the discarded listener really
did reply — while the module's own screen says nothing ever greeted it.

The cost is a duplicate: a subscriber that comes and goes and comes back
answers the same greeting twice. That is the right trade. A second
`kehikot.ready` is the same sentence as the first and a host takes a module at
its word either way. Losing it is silence; repeating it is noise.

#### `MessageSource.forget`

Throw away the backlog, for a test suite and nothing else.

The mailbox is a module-scope singleton with a module-scope backlog, which
is exactly right in a page and exactly wrong across a test file: one case
posts a greeting, the next case subscribes and is handed the previous
case's greeting on the way in, and the failure reads as a module answering
a host nobody in that test ever started. Found in a real suite, not
imagined.

A page must never call it. Forgetting the backlog in a browser is throwing
away the greeting the backlog exists to hold.

#### `MessageSource.parent`

Who to answer if a greeting arrives without a `source` on it.

A last resort and nothing more. Every real greeting carries the window it
came from, and that handle is the identity the whole wire is built on —
see the essay at the top of `connect.ts`. This is the fallback for a message
whose source the browser did not give us, and the only sensible guess then
is the frame's own parent.

#### `KEEP`

How much is kept while nothing is listening.

A greeting, a context and a handful of answers is the real backlog; anything
beyond that is a page that has not mounted for long enough that its problem
is not the buffer. Bounded so a host talking to a dead page cannot grow this
without limit — oldest go first, because the newest are the ones still worth
acting on.

#### `makeMailbox`

Build a mailbox over one window, listening immediately.

Exported because the whole of what this file decides — replay on subscribe,
the bound backlog, delivery to everybody — is tested without a browser, and
that has to keep being true. Nothing in a page should call it: a page wants
the one `mailbox` below, because a second mailbox over the same window is a
second backlog that answers the same greeting twice.

#### Inside `makeMailbox.addEventListener`

Replayed SYNCHRONOUSLY, inside this call, and the caller has to know it.

Deferring the replay to a microtask would make the ordering hazard in
`connect` disappear from every test and none of the real pages, because
a task boundary is exactly the thing a `useEffect` already crossed. So
the replay stays synchronous and `connect` is split into two steps
instead — see the essay on `listen()`.

#### `mailbox`

The page's inbox, shaped like the thing it replaces.

`connect` could take the real `window` and add a listener to it. It takes this
instead, which is the same two methods with one difference: subscribing
replays everything that has already arrived. Tests pass their own fake source
and are unaffected — which is the reason for the shape rather than a happy
accident, because the wire's decisions are tested without a browser and that
has to keep being true.

Outside a browser this is an inbox nothing ever posts to, rather than a crash.
The server half of a module imports the same package.

### `src/client/connect.ts`

#### About `src/client/connect.ts`

The bridge, and nothing about any one module.

One conversation with one window, in the shape this package's schemas define.
It knows how to be greeted, how to ask a question and match the answer to it,
how to answer a `goto`, and how to say how tall it would like to be. It knows
nothing about what a module draws, and the code that draws knows nothing about
`postMessage`.

This file was twelve files. Each of them was written by hand, and two of the
bugs below were found INDEPENDENTLY in several of them, months apart, because
a handshake copied by eye is a handshake whose reasoning did not travel with
it. The comments here are the record of what went wrong; a refactor that
shortens them will reintroduce what they prevent.

##### Binding to the window, not to the origin

A host may frame a module on an opaque origin — anything the module sends then
arrives at the host with an origin of `"null"`, and `"null"` is a string every
sandboxed frame in every tab shares, so it can never be an identity. A module
that declares storage does have a real origin of its own, and that changes
nothing here, because what it gained is an origin of OURS and not any
knowledge of the HOST's. The host's origin still arrives only in `ev.origin`,
it is still `"null"` exactly when the host is itself sandboxed, and a guess
that fails silently drops every message.

So the identity is the window handle: the greeting arrives from exactly one
`MessageEvent.source`, nothing in this page or any other can forge that
handle, and after the greeting anything from another window is ignored. Not
because a stray message would be dangerous by itself, but because a second
sender answering our correlation ids is a page that quietly shows another
host's work under this one's name.

We reply with `targetOrigin: '*'` where `ev.origin` gave us nothing to aim at.
There is nothing secret in what crosses this bridge — the name of an epic
somebody is already reading — and a module's own secrets never cross it at
all: they go to that module's own `/api` over an ordinary same-origin fetch.
Where `ev.origin` is a real origin we use it, because then it is a fact rather
than a guess.

##### Parse what the host sends, too

A framed page receives every message posted at its window: the host's, a dev
server's hot-reload socket, an extension's. `looksLikeWireMessage` is the
cheap filter and `hostMessageSchema` is the real one. A module that trusted
`data.type` alone would be one that a bundler's socket can put into an
unexplained state on a Tuesday.

##### And it is still only a convenience

Nothing here is the host's check, and nothing here is required of a module. A
module that hand-rolls all of this is exactly as conforming as one that
imports it — see the README. The moment this reads as mandatory, "a module is
a program somebody else could have written" has quietly become "a module is a
program that imports our client".

#### `Refusal`

Why a question came back without an answer.

The protocol's three, plus one more. `silent` is the timeout, and it is a
separate word rather than folded into `failed` because the two send a person
to different places: `failed` is the host telling us it went wrong, and
`silent` is the host not being there — which, from inside a frame, is
indistinguishable from a host that is still starting up. The protocol names
the same condition `silent` on the other side of the wire, for a module that
was greeted and never answered; the symmetry is intentional.

#### `HostRefused`

A refusal, as a thrown thing.

A class rather than a rejected string, so that `catch` can tell a refusal from
a `TypeError` in the caller's own handler without reading English. Every
rejection from `request` is one of these, always — a caller that writes
`catch (e) { e.refusal.reason }` is not making an assumption.

#### `ANSWER_WITHIN_MS`

How long to wait for one answer.

A number rather than forever, because forever is a page that shows "asking…"
until somebody reloads it, which is the exact shape of dishonesty a spinner
has — it is a claim that an answer is coming. Twelve seconds is long enough
for a host reading a file off a cold disk and short enough that nobody sits
through it twice.

#### `PERSON_ANSWERS_WITHIN_MS`

How long to wait for an answer that waits on a PERSON.

`ANSWER_WITHIN_MS` is a number about a program: twelve seconds is a host
reading a file off a cold disk, and anything past it is a host that has
stopped answering. `projects.pick` is the first method whose answer waits on
somebody reading a list and deciding, and twelve seconds is a person who has
looked away for a moment.

Five minutes, and it is still a number rather than forever, for the reason
the essay above gives: a wait that cannot end is a claim that an answer is
coming, and something has to be able to say that the dialog is gone and
nobody is going to answer. It is long enough that timing out means the
question was abandoned rather than that the person was slow.

The deadline belongs to the QUESTION and not to the connection, which is why
this is a value a caller passes rather than a second default. A module that
raised its whole connection to five minutes would spend five minutes finding
out that the host is not there, on every other question it asks.

#### `GOTO_BACKSTOP_MS`

How long a `goto` listener has before the backstop answers for it.

A timer rather than a line after the call, and the difference matters: a
listener may quite reasonably want to answer after a scroll settles, so
answering `false` the moment it returns would pre-empt the honest answer. Half
a second is longer than any of that and far shorter than the host's own
timeout, which means the reader gets the fallback link instead of a wait.

#### `NOBODY_TO_ASK`

What a question asked before any greeting is refused with.

One sentence in one place, because the React hook can be asked the same thing
between mounts and a caller should not have to tell two spellings of "nobody
is there" apart.

#### `HostEvents.onHello`

The greeting arrived, carrying the context that came with it and whatever
this module last asked the host to keep for it.

The kept string rides beside the context rather than inside it because it
belongs to one module and the context is broadcast to all of them — the
protocol's own note on `state` in `helloSchema` makes that argument. It is
`null` when the host keeps nothing, which is a first run, a host that does
not answer `state.set`, or a module that has never written any; a module has
to be able to tell that from a field that is missing because the host is
older than the idea, and only one of those means it should draw its defaults
with confidence.

And it arrives HERE, in the greeting, rather than being fetched — so a page
has it before its first render instead of drawing the wrong filter and
correcting it a moment later.

#### `HostEvents.onGoto`

"Go to this reference." The answer is not optional and not deferrable: the
host is waiting on it, and the protocol is explicit that a module which
never answers must not be able to hang a reference. So `answer` is handed
in rather than returned, and `connect` guarantees it is called — see below.

#### `HostEvents.onEvent`

Something another module emitted, carried here by the host.

Handed over whole rather than unwrapped, because unlike a context this
envelope is the message: `extension` says which format `payload` is in, and
`from`, `at` and `kehikko` are what a receiver filters on. A module that
declares no interest in any extension never registers this and never hears
one, which is the same as before it existed.

#### `HostEvents.onClear`

The host's clear control was pressed, twice, and this page should delete
what it is showing.

Only ever reaches a module that announced `clearable`, because that is what
makes the host draw a control at all — so a page that never calls
`clearable` never registers this and never hears one.

##### What "showing" means is yours to decide, and nobody else can decide it

There are no parameters and there will not be. The host does not know what
is on this page, what its filter narrowed it to, what a search box in the
corner is doing, or what any of the rows are. It knows a button was pressed
twice. Everything about WHICH records go is decided here, by the code that
drew them.

That is also what makes the control compose with the filter beside it. A
person who narrowed to one file and pressed clear means that file, and the
only reason that works is that this handler applies the same narrowing the
render did. A page that cleared its whole store here would delete a hundred
records while somebody could see three, which is the worst thing this
feature could do and the one it is easiest to do by accident.

##### Say what happened by re-announcing

There is no reply. The host learns nothing and reports nothing of its own.
Call `clearable` again when the work is done — with a smaller count in the
label, or `null` because there is nothing left — and the control updates or
disappears. That is the whole of the feedback, and it is in the module's
own words.

#### `HostEvents.onRefresh`

The host's refresh control was pressed, or the interval somebody set for
this container has elapsed. Read your material again.

Only ever reaches a module that announced `refreshable`, on the same
arrangement `onClear` has: the offer is what makes the host draw a control
at all, so a page that never calls `refreshable` never hears one.

##### You are not told which of the two it was, and that is deliberate

There are no parameters and there will not be. A flag saying "this one was
automatic" would be used to behave differently — to take a cache on one and
not on the other — which is a module deciding policy from a fact about
somebody else's timer. Whatever a deliberate press should do here is what a
tick should do.

##### Say what happened by re-announcing

There is no reply. Call `refreshable` on the way in with `busy: true`, and
again on the way out with a new `at` — or with the SAME `at`, if the read
failed and what is on screen is still the old one, which is the case a host
dating the data from its own message would have got wrong.

#### `AskOptions`

What a single question may say about itself, beyond its params.

One field today, and the reason it is here rather than on `ConnectOptions`
is the whole of it: how long an answer takes is a property of the QUESTION,
not of the wire. `epic.get` is slow when a disk is cold; `projects.pick` is
slow because somebody is reading. A connection-wide number cannot be right
for both — set for the reader it makes every unanswered call take five
minutes to fail, and set for the disk it cuts the reader off mid-decision.

It is a ceiling on waiting and never a promise about answering. Nothing here
reaches the host, which has its own opinion about how long it will take and
was never told this number.

#### `ConnectOptions.source`

What to listen to. The `mailbox` by default, and it is the default for a
reason — see the essay in `mailbox.ts`.

Injectable because everything this function decides is tested without a
browser, and that has to keep being true.

#### `Connection.listen`

Start hearing messages. Call it AFTER the connection has been stored.

##### Why this is not part of `connect`, which is a bug in five modules

The mailbox replays what arrived before anybody listened, and it replays
SYNCHRONOUSLY inside `addEventListener`. The greeting almost always arrived
before the page mounted — that is the entire reason the mailbox exists — so
with a one-step `connect`, `onHello` fires DURING the call, before the
caller's `host.current = connect(...)` has run. Anything the handler does
that reads the connection finds `null` and quietly does nothing.

Worse, it works often enough to look fine. When the host happens to greet
after the effect returns — a slow module, a reload, a busy machine — the
assignment has already happened and everything behaves. A race whose good
outcome is the common one is the kind that ships, and it did: two modules
hit it independently, and each spent an afternoon on a symptom that reads
"the module will not speak" while the host's own log shows a module that
answered `ready`.

Deferring the replay to a microtask would hide it rather than fix it. So the
two steps are in the caller's hands and in the caller's order:

```ts
const live = connect(id, events)
host.current = live
live.listen()
```

Idempotent, so a second call is nothing rather than a second subscription.

#### `Connection.request`

Ask one question. Rejects with `HostRefused` — never with a bare string.

`within` overrides `ANSWER_WITHIN_MS` for this call and no other. See
`AskOptions`.

#### `Connection.filters`

Say what this page can be narrowed by, so the host can draw the control.

Fire and forget, like `resize`, and for the same reason: the host may draw
it, may draw part of it, or may not have heard of the idea. What comes back
is not an answer but a `kehikot.context` with `filters` in it, which is
where a page reads the choice — including the first time, out of the
greeting, before it has drawn anything.

##### Remembered, and re-sent on every greeting

The offer is held here and posted again whenever the host greets. That is
not a convenience; without it the feature has a silent failure with the
shape this package keeps finding.

A page normally announces its offer from an effect after its first render,
and the greeting normally arrived before that — that is the entire reason
`mailbox` exists — so the ordinary case is fine. The case that is not is a
frame that RELOADS: the host greets again, and a page whose offer had not
changed since would have no reason to send anything, so the host would
carry an offer from a conversation that no longer exists, or none at all.
Neither errors. The control simply goes missing, or stops matching what is
on screen, on a page that looks entirely normal.

So the last offer is replayed after `ready`, every time. A page that calls
this once at mount and never again is correct across every reload.

#### `Connection.clearable`

Say that what this page is showing can be cleared, and what to call it.

Fire and forget like `filters`, remembered like `filters`, and replayed on
every greeting for exactly the reason given above — a frame that reloads is
greeted again, and a page whose offer had not changed since would have no
reason to send anything, leaving the host with a control from a
conversation that no longer exists.

`null` withdraws it: there is nothing on screen to clear, so the host takes
the button away rather than leaving one that deletes nothing. Send it
whenever the words change — which, because the words carry a count, is
whenever what is shown changes, including right after `onClear` has run.

##### A page still has to guard nothing

The two-press arm is the host's, and it is on the host's side of the frame
where it can be drawn. A page does not need its own confirmation before
`onClear` and should not add one: `confirm()` in a framed page is silently
`false` under any sandbox without `allow-modals`, so the guard would not
merely be redundant — it would be a guard that always says no, on a control
that then appears to do nothing.

#### `Connection.refreshable`

Say that this page can read its material again, and when it last did.

Fire and forget like `filters` and `clearable`, remembered like both, and
replayed on every greeting for the reason given two entries up: a frame
that reloads is greeted again, and a page whose state had not changed since
would have no reason to send anything, leaving the host with a control from
a conversation that no longer exists — or with a "last read" time from
before the reload, which is worse, because it is wrong rather than missing.

Send it whenever any of the three fields changes, which is at least twice
per refresh: `busy: true` on the way in, and a new `at` on the way out.

##### `at` is yours, and nobody else can supply it

The host knows when it asked. It does not know whether you answered out of
a cache, whether the read failed over a reading you are still showing, or
whether you refreshed yourself for a reason it has no view of. So it prints
what you say here and nothing else, and `null` — "I cannot say" — makes it
print no time at all rather than invent one. See `refreshableSchema`.

`can: false` withdraws the control, the way `clearable(null)` does: there is
nothing this page could read again right now.

#### `connect`

Build one conversation. Nothing is sent, and nothing is heard, until `listen`.

Nothing is sent from here until a greeting arrives either, and nothing needs
to be: the host greets on every frame load, and a module that announced itself
first would be shouting at a window that may not be a host at all.

#### `connect.offered`

The last offer, replayed on every greeting. See `filters` above for the
     reload this exists to survive. `null` means nothing has been offered, which
     is not the same as an empty offer: an empty one is a module saying it has
     nothing to be narrowed by now, and has to be sent.

#### `connect.clearing`

And the last clear offer, replayed for the same reason.

     Wrapped in an object rather than held as a bare `string | null`, because
     for this offer `null` is a REAL value — it is how a module says there is
     nothing to clear — so it cannot also be the sentinel for "never said
     anything". A bare null would make a module that withdrew its offer before
     the greeting indistinguishable from one that never had a clear control, and
     the two produce the same drawing today but would diverge the moment the
     replay meant anything more than "post this again".

#### `connect.refreshing`

And the last refresh state, replayed for the same reason and with one of
     its own: what is replayed carries `at`, so a frame that reloads without
     this would leave the host drawing a "last read" time from a conversation
     that no longer exists. A missing control is a thing somebody notices; a
     stale timestamp is a thing they believe.

#### `connect.dialect`

Which spelling the host greeted us in, and so the one we answer in. A host
     from before the rename greets with `roadmap.hello` and hears nothing else;
     a current one greets with `kehikot.hello`. Everything this file builds is
     canonical, and is respelled only here, on the way out. See `dialect.ts`.

#### `connect.settle.pending`

A late answer to a question nobody is waiting for is dropped, quietly.

It is the ordinary case rather than an anomaly: a question that timed out
and was answered a second later, a question the caller abandoned, a
duplicate. There is nothing to report and nobody to report it to, and a
module that threw here would be a module a slow host can crash.

#### Inside `connect.onMessage`

Answered on EVERY greeting, not only the first.

Re-greeting is normal rather than an error: the host greets on every
frame load, and a frame that reloaded itself has forgotten the whole
conversation — it cannot tell a reload from a host that greeted twice,
and it must not have to. So the newest greeting wins, the window it came
from becomes the one we answer, and `ready` goes back every time. A
module that replied only once is a module that goes silent after any
reload of its own frame, which the host reports as a module that did not
answer its greeting.

#### Inside `connect.onMessage`

After `ready` and before the page is told, so that a host which reads
         the offer while composing what to draw has it, and so that a handler
         which announces a NEW offer from `onHello` overwrites the replay rather
         than being overwritten by it.

#### Inside `connect.onMessage`

Everything after the greeting has to come from the window that gave it.
       See the essay at the top: the origin cannot do this job and this can.

#### `connect.onMessage.{ type: _envelope, protocol: _spoken, ...context }`

Handed on whole, with only the envelope removed.

The version of this comment that stood in the modules argued carefully
for the wrong thing. It said the context was "rebuilt field by field"
because a context message carries a `type` a `ModuleContext` does not,
and then listed the fields — with a paragraph on `selection` explaining
that dropping it is the difference between a page that shows what
somebody picked and one that ignores every click on the canvas. That
diagnosis was right and the remedy was not.

A list that has to be kept complete is a list that will be incomplete
again at the next protocol release, and it was, in FIVE modules: `prompt`
and `pinned` were both missing within a day of being added, and `kehikko`
— which says which canvas a pane is standing on — was missing the moment
the protocol grew it. The failure has no symptom. A field left out does
not error; it quietly becomes that page's belief that the host said
nothing about it.

So the listing is gone, and it is gone from ONE place now rather than
from twelve. `type` and `protocol` are the only two things a
`ModuleContext` does not have, and removing exactly those means every
field the protocol grows arrives at every module whether or not anybody
has heard of it. What a module then chooses to READ is its own business;
the difference is that the rest now arrives rather than being discarded
on the way in.

#### Inside `connect.onMessage`

Nothing is unwrapped and nothing is passed on, because there is nothing
         in it — see `clearSchema`. A page that never registered `onClear` does
         nothing, which is correct rather than a dropped message: the host only
         draws the control for a page that announced `clearable`, so a module
         with a handler and no offer and one with an offer and no handler are
         both modules that asked for this to do nothing.

#### Inside `connect.onMessage`

Nothing to unwrap, for the same reason and with the same consequence
         as `MESSAGE.CLEAR` above: a page with no handler does nothing, which is
         what a page that never announced `refreshable` asked for.

#### `connect.onMessage.answered`

Answered exactly once, whatever the listener does — including nothing,
         including throwing, including answering twice. The host is waiting on
         this and will time out into "not found"; a module that leaves it to the
         timeout has turned a hundred milliseconds into twelve seconds of a
         reader waiting, for every reference that points at it.

#### `connect.request.deadline`

A number this caller asked for, or the connection's. Guarded rather
         than trusted: `within: 0` and `within: NaN` would both mean "time out
         before the message is posted", which is a caller's typo turned into a
         refusal about the host.

#### Inside `connect.resize`

Clamped on our own side with the host's own arithmetic, so that what we
         ask for is what we will get. The host runs its own copy over the raw
         number regardless — this is prediction, not enforcement.

#### Inside `connect.filters`

Kept before it is sent, so that an offer made before the greeting is
         not lost — it goes out with the replay instead. `send` is a no-op
         without a host, and a page that announced early and never again would
         otherwise have a control that never appears.

#### Inside `connect.clearable`

Kept before it is sent, for the same reason as the filter offer: an
         offer made before the greeting goes out with the replay rather than
         being lost.

#### Inside `connect.refreshable`

Merged onto what was last said rather than replacing it, so a page can
         call `refreshable({ busy: true })` on the way into a read without
         restating a timestamp it has not changed. The whole state still goes on
         the wire — the message is an offer, whole, every time — and this is
         only about what a caller has to type.

         `busy` is the one field that does NOT carry forward, and the asymmetry
         is the point: `can` and `at` are facts that stay true until something
         changes them, and busy is true for the length of one read. Carried
         forward, a page that forgot to say `busy: false` on the way out would
         leave a spinner turning forever; defaulted off, a page that forgets is
         a page that merely did not show one.

### `src/client/react.ts`

#### About `src/client/react.ts`

The bridge as one React value — and it is OPTIONAL, twice over.

Optional because it is a second subpath: `kehikot-module-protocol/client` has
no idea this file exists, imports no React, and works in a page built with
anything or nothing. A client that imported React would make this package
opinionated about a thing it has no business having an opinion on. Not every
module is a React app and none is obliged to be.

Optional because a module may hand-roll all of it and be perfectly conforming.
See the note in `index.ts`.

What it adds over calling `connect` yourself is three orderings that are easy
to get wrong and silent when you do — the store-before-listen split, the
handler refs, and the discarded-mount guard. Each is described where it
happens.

#### `GREETING_GRACE_MS`

How long a page waits before it will say nobody is there.

A page cannot know at load whether it is framed. It has to wait to find out,
because the greeting arrives when the host is ready rather than when we are,
and a page that concluded "nobody is there" in the first frame would say so
and then be greeted a moment later — the reader would see the standalone
paragraph flash past and be replaced, which teaches them that paragraph is
noise. So there is a `listening` state with its own words, it lasts under a
second, and only then does the page say the harder thing.

It is not a spinner. A page using it should say what it is waiting for.

#### `Where`

Whether anything is framing this page, in the three states that matter.

Three rather than a boolean, because "we have not heard yet" is not "nobody is
there": one lasts under a second and the other is the standalone case a module
is expected to work in. Drawing the second while in the first is the flicker
the grace above exists to prevent.

#### `Kehikot.context`

The whole context, as the host last said it, or null before the greeting.

Whole and not picked apart, deliberately: a hook that returned a chosen few
fields would be the enumerated-context bug wearing a different hat, and
every field the protocol grows would stop at this line. Read what you need.

#### `Kehikot.request`

Ask the host something. Rejects with `HostRefused`, always. Safe before the
greeting: it refuses.

`options.within` is this one question's deadline — see `AskOptions`. It is
threaded through rather than dropped because the hook is how most modules
ask anything, and a question that waits on a person is unaskable through a
wrapper that only knows the connection's clock.

#### `Kehikot.filters`

Say what this page can be narrowed by. The host draws the control; the
choice comes back in `context.filters`.

Stable across renders, so it can be called from an effect whose only other
dependency is whatever made the offer change — which is the ordinary
pattern, because a label that carries a count changes whenever the count
does.

#### `Kehikot.clearable`

Say that what this page shows can be cleared, and what to call it. `null`
takes the control away.

Stable across renders like `filters`, and for the same reason: the ordinary
call site is an effect whose only real dependency is whatever the label
counts, so this must not be one of the things that changed.

The press arrives at `onClear` in the `events` given to this hook. Nothing
comes back through the context and there is no state to read here — the
host relays a press and learns nothing about what went.

#### `Kehikot.refreshable`

Say that this page can read its material again, and when it last did.

Stable across renders like `filters` and `clearable`, and the ordinary call
site is the same shape: an effect whose dependency is the reading, calling
this with a new `at` whenever one arrives.

The press arrives at `onRefresh` in the `events` given to this hook. `at` is
the module's fact about its own data, and a host never infers one — see
`refreshableSchema` for the four ways such a guess is wrong.

#### `Kehikot.connection`

The live connection, or null between mounts.

Here because a page with its own machinery — a poll that emits, a store that
asks — needs the same connection the hook is holding, and building a second
one would be a second `ready` and a second backlog replay. Read it at the
moment you need it rather than capturing it.

#### `useKehikot`

Connect once, for the life of this component, and re-render when the host speaks.

`events` may be rebuilt on every render — it is read through a ref, never
captured — so there is no need to memoise it at the call site. `id` is the
only dependency, because reconnecting is a second `ready` and a torn-down
listener during whatever millisecond the host chose to greet in.

#### `useKehikot.handlers`

The handlers, held in a ref and read at the moment a message arrives.

A view rebuilds `onGoto` whenever its rows change, and connecting to the
window again on every render would mean a torn-down listener during the one
millisecond a host chose to greet in. So the listener is established once
and always calls the newest handler — which is also the only one that knows
what is currently on screen.

#### Inside `useKehikot.live.onHello`

The discarded mount's answer must not overwrite the live one.

`StrictMode` mounts, unmounts and mounts again. The first
connection is stopped in the first cleanup, but a message already
in flight — or, far more often, one being replayed out of the
mailbox's backlog — can still reach its handlers, and the mailbox
replays to EVERY subscriber including the doomed one. Without this
line the second mount's fresh context is overwritten by the first
mount's stale one, in the order the two happen to be delivered, and
the page draws a greeting it has since been told to forget.

It is one comparison and it is the difference between a
double-mounted page that is right and one that is right most of the
time.

#### `useKehikot.live.onGoto.handler`

Not guarded, and that is deliberate: the host is WAITING on this
             one, and a discarded mount refusing to answer is a reference that
             sits out the host's timeout. Whichever mount hears it answers it.

#### Inside `useKehikot`

Stored BEFORE it is told to listen, and the order is the whole of a bug
that made two modules hang. The mailbox replays synchronously inside
`listen`, so anything reading this ref from a handler must find it
already assigned. See `listen` in `connect.ts`.

#### Inside `useKehikot.request`

Refused in the connection's own words rather than a second spelling of
       them, so a caller sees one sentence for "nobody is there" whichever side
       of the mount it asked from.
