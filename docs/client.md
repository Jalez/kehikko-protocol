# The client library

The module half of the wire behind `/client` and `/client/react`: `connect`, the mailbox, and the hooks. A convenience, never a requirement.

This is the reasoning, not the reference: the shapes themselves, with their bounds, are in the source and show on hover. The first half is the overview that used to be in the README; the second half is the note that used to stand above each symbol in the source, under that symbol's name.

Back to the [index](README.md).

## Overview

### The client, which is a second entry point and an optional one

```
import { connect } from 'kehikot-module-protocol/client'
import { useHost } from 'kehikot-module-protocol/client/react'   // optional again
```

Twelve modules wrote the same `postMessage` handshake by hand — 7,519 lines of
`mailbox.ts`, `host.ts` and `use-kehikot.ts` between them — and two bugs turned
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

##### And the greeting itself, from where the page may be framed (*1.1.1*)

The window handle says who the conversation is with once it has started. It
does not say who may start one, and the first greeting used to be taken from
any window that could reach the page. The page's server already knows who may
frame it — the list it sends as `frame-ancestors` (`frameOrigins()`) — so
`doors()` prints that list into the document (`<script id="origins">`,
`ORIGINS_ELEMENT`), and a greeting is answered only when `mayGreet` says so:

- its `ev.origin` is on that list (written as `frame-ancestors` takes them:
  `originAmong` reads `:*` for any port and `*.` for any name under one), or
- it is the page's own origin, or the page's own window — a harness that
  greets the page it is in, and a module's other page on the same origin — or
- it carries no origin at all, which only an event made by the page's own
  script does: a message from another window always has one, `"null"` at the
  least.

A greeting from anywhere else is dropped like a message that does not parse:
nothing is answered, and nothing it would have started is. This is the one
place the origin is asked, and it is asked of the host's origin, not the
module's — a module framed on an opaque origin still reads a real
`ev.origin` from its host.

A document with no island was not served by these doors and was never told;
it answers as it always has. Such a page — a module with a server of its own —
passes the list itself: `fillPage(html, { origins: frameOrigins() })` on the
server, or `connect(id, events, { origins })` in the page.

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

The kept string rides beside the context in the greeting. From 2.51.0 a host
that keeps one per CONTAINER also says it as `context.kept`, each frame its
own, on the greeting and every context after; `hostStore` reads that when it
is present, takes a new value only when the context names another kehikko,
and stamps each `state.set` with the kehikko it is for (`methods.md`,
`state.set`). It is
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
handler refs, and the discarded-mount guard.

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

#### `useHost`

The hook is `useHost`, and it is described with the rest of the shared plumbing in
[module-plumbing.md](module-plumbing.md): the flattened context, the theme, the kept state, and
the handlers. It is a thin binding over `hostStore` (`host-store.ts`), which keeps the three
orderings above — the connection stored before it listens, the handlers read when a message
arrives, a stopped store's answer never overwriting the live one — outside React.

The first hook, `useKehikot`, was deprecated in 0.37 and is gone: it
returned the raw context and a `state` string, and never delivered `onClear` or `onRefresh`.
[MIGRATING.md](../MIGRATING.md) has the before and after.

## An agent module as a tile (2.58.0)

A person keeps an agent module in a small square on the canvas, and a terminal in a square two
hundred pixels wide is unreadable. So below `TILE_BELOW` (220 by 160 CSS pixels of its own page) an
agent module draws a TILE instead of its terminal, the same in every agent module:

```tsx
import { AgentTile, useTileSize } from 'kehikot-module-protocol/client/react'
import { tileItemOf } from 'kehikot-module-protocol'

const size = useTileSize()
if (size.tile) return (
  <AgentTile
    name="Claude" icon="brand:claude" title={title} size={size}
    item={tileItemOf(itemsForThisSession)}
    onExpand={() => host.request('view.expand', { expand: true })}
    onAnswer={(text) => typeIntoSession(text)}
    onCompact={compact} onClear={clear}
  />
)
```

- **What it shows** is read off what the module already reports (`activity.set`): the session's
  item, mapped by `tileStateOf` — working (the ring turns; it stands still under reduced motion), a
  question waiting ("?", in the attention colour), stopped without finishing or needing the person
  ("!"), finished ("✓"), idle. The title under the icon, an unread dot, and the whole state in one
  sentence as the tooltip and the tile's accessible name.
- **The whole tile expands** (`view.expand`, on the person's press). Where there is room
  (`tileRoom`): Answer, when a question waits — the question, its choices as buttons and a reply
  field, over the tile, closed with Escape — then Expand, Compact and Clear. Every one is a button
  reached by Tab.
- **Keep the terminal mounted** under the tile, hidden with `display: none` so it measures nothing
  and fits nothing: going to the tile then resizes no pty, and coming back from it fits once, to
  the size it comes back to. `useTileSize` leaves the tile only `TILE_LEAVE_PX` past the line, so a
  box resized around it does not flip.
- **A host before 2.58.0** does not answer `view.expand` (`hello.answers` does not list it): offer no
  Expand, or show the large view in place on a press.

### When the host declines (2.63.0)

A host shows a container large only on the person's own press in its page, and answers `view.expand`
`{ outcome: 'declined', why }` when it saw none (or when the container is not on the kehikko that is
open, or a container is being moved). Return the request from `onExpand` — `() =>
host.request('view.expand', { expand: true })`, not `void` it — and the tile says the `why` over its
top for `TILE_NOTE_MS`, as a `role="status"` line, until the next press. `expandDeclined(answer)` is
the rule: the sentence for a declined outcome, null for anything else. A press that is refused is
then never silent. A rejected request says nothing on the tile; handle it where the module handles
its other refusals.

## When the page will not answer a window (2.93.0)

A greeting from a window whose origin the page was not told it may be framed by (`mayGreet`: the
origins its server printed, the same list as its `frame-ancestors`) is not answered, and until
2.93.0 it was not answered at all — from the host that is a page which loaded every script and
said nothing. Now `connect` tells that window why, once per greeting: `kehikot.refused`
`{ origin, allowed }` (`refusedSchema`), to that window only. Nothing else is ever sent to it.
The usual cause is a module started for one window and framed by another (the app started again on
another address); a host says so and offers the restart that hands the module this window's origin.

A greeting the page cannot READ — a host and a module that do not agree on the protocol — is no
longer dropped either: it is said as a failure (`kehikot.page.error`, `greeting`) to whoever greeted.

## When the page fails (2.59.0)

A page that throws before `connect` is greeted and says nothing, and the host can only say the page
is "choosing not to answer". From 2.59.0 the page says why, as `kehikot.page.error` `{ message,
where, stack }` (docs/wire.md, `pageErrorSchema`), with nothing for a module to do but import the
client from its entry, as it already must.

- **`errors.ts`** installs with the mailbox: listeners for the window's `error` (a script that threw,
  or did not link) and `unhandledrejection`. Each failure is kept as the error's name and message, how
  it was caught, and the first `STACK_LINES` lines of its stack; at most `PAGE_ERRORS_MAX` different
  ones per document, each once. Nothing is sent before a greeting: the mailbox hands every message to
  `pageErrors.heard` first, and a greeting the page may take (`mayGreet`) names the window to tell —
  everything kept goes to it at once, ahead of `ready`, and what fails later goes as it fails.
- **A greeting handler that throws** (`onHello`, through `connect`, `hostStore` or `useHost`) is said
  as `greeting` and logged, instead of breaking the mailbox's other listeners. `ready` has already gone.
- **`reportPageError(error, where?)`** says a failure the page caught itself and cannot recover from.
- **`ReportErrors`** (`./client/react`) is a boundary for the page's root: a render that throws is
  said as `render`, with the component stack under the error's, and drawn as text with Try again.
  React catches a render error, so without a boundary that says it nothing does. Wrap the root:
  `<ReportErrors><App /></ReportErrors>`. `fallback(error, retry)` draws your own.
- **The page document** (`pageDocument`, so every page served by `doors()` or `run`, and every build
  made by `buildModule`) carries `errorsScript()`, a blocking script ahead of everything else that does
  the same from the first moment: it is the only thing that can speak for a page whose scripts never
  ran — an import naming an export the installed package does not have fails before any module runs.
  It answers the frame's parent only. When the client loads it takes over what the script kept
  (`PAGE_ERRORS_GLOBAL`) and switches it off.

A host shows the message, as text, in place of "not answering" when the page did not answer the
greeting, with the stack under "Show details". A host before 2.59.0 drops the message unread.

## Find (2.69.0)

When the greeting says `find: true`, `connect` hears ⌘F and ⌘G on the page's window and asks the host
for its find bar (`kehikot.find.open`), and answers the bar's `kehikot.find` by searching the page's
visible text itself (`pageFind`): marked with `CSS.highlights`, the current match scrolled into view,
searched again while the bar is open and the page changes. A page whose text is not in the DOM gives
`onFind` and says later counts with `findResult`; an editor with its own find keeps ⌘F with
`findKeys: false` or its own `preventDefault`. See [find.md](find.md).

## What every container gets by default (2.70.0)

A person expects every container to behave the same, whichever module is in it. From 2.70.0 what
they expect everywhere comes from the client by default, so a module gets it by moving its pin; each
default has a per-module opt-out. The README's "Module consistency checklist" is the short list of
what is free and what a module still does itself.

### The kept view (`kept-view.ts`, `hostStore`'s `keepView`)

Per container — this module on this kehikko — `hostStore` (and so `useHost`) keeps the page's main
scroll position and the value of each of its header's switches (`value`) and toggles (`checked`),
and gives them back on the next greeting:

- **The scroll** is read from the element marked `data-kehikot-scroll` (`KEEP_SCROLL_ATTRIBUTE`), else
  the document's scroller, `KEEP_SCROLL_AFTER_MS` after the person stops. On a greeting it is set
  again, and retried while the page is still drawing what it reaches, for up to
  `RESTORE_SCROLL_WITHIN_MS`; the person's own wheel, key, touch or press ends the retry.
- **The header** values are read from every declaration. On a greeting (or the first declaration
  after it), a switch or toggle that is not on its kept value is pressed back through `onPress` —
  exactly the press a person would make in the host's menu, judged by `pressRefusal` first — and the
  module re-declares as it always does. The module still owns the state; nothing is drawn from the
  kept value.

Both go in the one string the host keeps for the container (`state.set`, `context.kept`, at most
`LIMITS.MODULE_STATE`), as an envelope: `KEPT_VIEW_MARK` and then `{"view":…,"state":…}`, the
module's own string as it wrote it under `state`. The module never sees the envelope: `kept`,
`hello.state` handed to `onHello` and `context.kept` are its own string. While the view is empty the
module's string is written bare, exactly as before. When both do not fit, the view gives way. A
client before 2.70.0 that reads an envelope gets a string its codec does not recognise, and starts as
a first run.

The view is written only to a host that answers `state.set` for the module, so the manifest needs
`declares.uses: ['state:keep']`. `keepView: false` keeps nothing; `{ scroll: false }`, `{ header:
false }`, `{ except: ['follow'] }` (an item whose value follows something else, or a toggle that
starts something) and `{ scroll: () => element }` narrow it.

### The cover, held until the page is drawn (`holdCover`, `ready()`)

A host covers a container until the page answers the greeting with `kehikot.ready` — which the client
does at once, before the page has read what it shows, so modules drew a "Reading…" of their own.
From 2.70.0 `connect` answers with `ready` and **`hold: true`**, and follows with **`kehikot.drawn`**
when the page calls **`ready()`** (on the connection, the store or `useHost`'s value), or by itself
after **`HOLD_COVER_MS`**. Each greeting holds again until the page has said `ready()` once; after
that a greeting is answered without a hold. `holdCover: false` answers as before; a number is another
wait.

A host before 2.70.0 strips `hold`, lifts its cover on `ready` and drops `kehikot.drawn` unread, so a
page may call `ready()` whatever host it is in. **For a host**: on `ready` with `hold: true`, keep the
cover (as loading) until `kehikot.drawn` arrives from that frame or `HOLD_COVER_MS` passes, then show
the page; a `ready` without it is ready, as before.

### A cover after a context change (`loading(label)`, `useDrawn`, 2.84.0)

The same cover, after a greeting: when the person switches epic, project, parts or kehikko, a page
that redraws at once needs nothing — it is never covered. A page whose redraw waits on something (its
own server, a file) calls **`loading(label?)`** when it starts and **`ready()`** when it is drawn
(the connection, the store or `useHost`'s value). The client sends **`kehikot.loading`** with the
words, and `kehikot.drawn` on `ready()` or by itself after `HOLD_COVER_MS`. `loading()` is taken only
within `HOLD_COVER_MS` of a `kehikot.context` the page has not said `ready()` for; at any other time it
is the page's own business and nothing is sent. Before the greeting, or while its hold is up, it only
gives that cover its words (sent as `ready.label`, or as a `kehikot.loading` during the hold).

For a React page, **`useDrawn(host, drawn, label?)`** is the whole of it: pass the page's own "is what
I show read and drawn?", false while it reads what a new context asks for.

```tsx
const host = useHost('kehikot.journeys', events)
useDrawn(host, journey !== null || nothingToRead, 'Loading the journey…')
```

The words are one line of plain text ("Loading the journey…", "Loading content…"), at most
`LIMITS.LOADING_LABEL`; without them the host says "Loading <module>…". **For a host**: on
`kehikot.loading` from a page that is not held, wait `LOADING_COVER_AFTER_MS`; if `kehikot.drawn` has
not come, cover the container (the module's own icon and the words) until it does or `HOLD_COVER_MS`
passes. A quick redraw is never covered. A host before 2.84.0 drops the message and the field unread.

### Mounting the page (`client/mount`, `mountPage`)

`mountPage('root', <App />)` is a page's whole entry: `StrictMode`, and `ReportErrors` around the
page, so a render that throws is said to the host and drawn as text. A root that does not exist is
said as a page failure (`NO_ROOT`), not left blank. `{ reportErrors: false }` for a page with a
boundary of its own, `{ strict: false }`, `fallback`. A separate subpath, because it imports
`react-dom/client`; import the client itself first, as before, so the mailbox is installed.

### The container's background (2.82.0, `applyBackground`)

With Settings › Appearance › "Container background" off, the host draws no card behind a module's
page and says so in every context: `appearance: { background: 'none' }` (`card` otherwise; absent
from an older host, which means `card`). `connect` puts it on the page's `<html>` on the greeting and
on every context after it — `data-kehikot-background="card" | "none"`, `color-scheme` from the theme —
and adds one style element (`BACKGROUND_CSS`, id `kehikot-background`) that, under `none`, makes
`html`, `body`, `#root` and any element marked `data-kehikot-page` transparent, `!important` and
unlayered so a page-level utility class does not paint over it. The page document's blocking script
does the same before the first paint from what the host said last time (`BACKGROUND_KEY`), in a frame
only, or from `?background=`.

A module marks its outermost page element with `data-kehikot-page` and keeps no page-level background
of its own. Cards, popovers, dialogs and menus inside keep their surfaces. A module that needs an
opaque surface for legibility gives it under `html[data-kehikot-background="card"]` only, or on an
element inside the marked one. `connect(…, { appearance: false })` leaves the page alone;
`hostStore`'s `applyTheme: false` does too, unless `appearance: true` is passed with it.

### Presses from nested frames (`relay.ts`)

The client hears presses on the page's window (2.49.0), so a press inside an iframe the page owns —
a PDF viewer, a preview — never reached the host, and a long press there revealed nothing.
`relayPointer(host, frame)` hears it, through the connection's own pointer reporting
(`Connection.pointerFrom`): told only to a host that asked, with the same slop and cancel rules.

```ts
useEffect(() => (frame.current ? relayPointer(host, frame.current) : undefined), [host.pointerFrom])
```

A frame on the page's own origin is listened on directly, and again after each load. A frame on
another origin cannot be reached: its viewer runs `pointerShim({ origin: pageOrigin })` (bundled in)
or `pointerShimScript(pageOrigin)` (one `<script>`), which posts each press as `RELAY_POINTER`, and
`relayPointer(host, frame, { origin: viewerOrigin })` takes those messages from that frame's window
and that origin only. `RELAY_POINTER` is not a `kehikot.` type: it is between a page and its own
frame and never on the wire.

### Rows advice, and two checks for CI

`rowsAdvice(header, footer, options?)` gained the rest of the rule (docs/footer.md): a count in a
header label, a Go item that is not a jump, an item in both rows, and live state with no footer.
`connect` says each sentence once on the console; "no footer" waits `ROWS_ADVICE_AFTER_MS` after the
last declaration and is said only to a host that draws a footer. `rowsAdvice: false` is quiet.

- **`kehikot-check-rows`** runs it in CI over the rows a module states in `kehikot.rows.json` — one
  `{ header, footer, state? }` or a list of them, one per view — or `--file` (JSON, or a module
  exporting `rows`). Advice fails it, unless `--warn`.
- **`kehikot-check-notes`** fails when the MCP door's tool names, descriptions or input schemas changed
  since the last tag and `notes/<version>.md` has no "For agents" line (docs/asking.md). A tag's tools
  are its committed `notes/tools.json`: `kehikot-check-notes --door <url> --write` (a running door) or
  `--tools <file>` (a list the module's own script writes) stores the door's tools there.
