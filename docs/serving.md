# Serving a module: ports, the registry, frame origins, and the template

The node-only half behind `/serve` — which port a module binds, where it writes down that it exists, which origins may frame it — and the generator that makes a new module from `template/`.

This is the reasoning, not the reference: the shapes themselves, with their bounds, are in the source and show on hover. The first half is the overview that used to be in the README; the second half is the note that used to stand above each symbol in the source, under that symbol's name.

Back to the [index](README.md).

## Overview

### `/serve`, which is a fourth entry point and the only one that touches the disk

```ts
// vite.config.ts
import { serves } from 'kehikot-module-protocol/serve'
import { ID } from './manifest.ts'

export default defineConfig({
  plugins: [serves({ id: ID, prefer: 7960 }), doors(), react()],
})
```

That line is a module's whole port story. `run.sh` passes no `--port` and no
`--strictPort`; `register.ts` hardcodes no number; the preference is stated once,
beside the id, in the file that already knows both.

#### What it does, and the one case where it refuses to be clever

If the preferred port is free it is taken, with no probe, no search and no
message. That case is the common one and it is deliberately untouched: somebody
who types `curl 127.0.0.1:7960` after starting a module by hand must get their
module, and a system that sometimes moved for reasons of its own would have
thrown that away to solve a collision that had not happened.

If something is listening there, it is asked
`GET /.well-known/kehikot-module.json` with a short deadline, and what happens
next depends on **who** answered.

- **The same module id.** This module is already running. It exits 0 with a
  sentence naming the address, and starts nothing. A second copy is not a
  fallback — it is two stores writing the same files, two MCP doors a client can
  be pointed at, and a host framing whichever one the registry happens to name.
  That state's symptom is data disappearing, not an error. It is also the most
  common collision here now, because the host starts modules on its own *and* a
  person runs `./run.sh` in a terminal.
- **A different module, a non-module, or silence.** It moves to the next free
  port, says so on stdout naming both numbers, and registers where it landed.

Before it drifts, it also asks the port its own registration names, when that is
somewhere else. That case was found by running the thing rather than by thinking
about it: with a squatter still on 7960, a second `./run.sh` sees a stranger on
the preferred port, never reaches the already-running check, and walks past its
own copy on 7961 to start a second one on 7962 — the exact state that check
exists to prevent, arriving through the one door it did not cover. The
registration is a hint and never an authority: it is asked the same question, and
only an answer carrying this module's own id stops the start.

The drift steps over ports other modules have *registered* even when nothing is
listening on them. Modules here sit ten apart, and most of them are not running
most of the time; a drifter that took a neighbour's number would hand that
neighbour a collision it did not cause, days later, in a module nobody changed.

#### The bound port, not the requested one

`strictPort` is turned **off**, which reads like a regression and is not.
`--strictPort` was the only honest thing to do when nothing handled a collision:
a server that silently moved was a server nobody could find. Now the move is
decided before Vite starts, said out loud, and written into the registry the host
actually reads — so Vite's own fallback is a second net under a first one,
catching only the race between releasing a probe socket and binding it.

And the number written down is read off `server.httpServer.address()` after
`listening`, not the number that was asked for. That is the whole reason this is
a plugin rather than a wrapper script: a script can claim a port and pass it to
Vite, but the registration it then writes says the port it *hoped* for, and the
gap between hoped and bound is exactly where a stale registration comes from.

#### `claim` returns; it does not exit

Including in the already-running case. A library that calls `process.exit` is a
library whose most important branch cannot be tested, and that branch has a suite
aimed at it. `serves()` is where the exit lives, because it knows it is a program
rather than a test.

#### It is node-only, and that is what the subpath is for

Everything here binds sockets, reads a port, and writes into somebody's home
directory. One line of it behind the front door would make
`import { WELL_KNOWN } from 'kehikot-module-protocol'` an import of `node:fs`, in
a browser bundle, in every module that renders a page. So it stands beside the
front door the way `/client` does and for the mirror reason: `/client` exists so
a server with no `window` can import this package, `/serve` exists so a page with
no filesystem can.

It is absent from `sideEffects` on purpose. Nothing in `src/serve/` does anything
at module scope — the side effects are all inside functions somebody calls — so
there is no bare import for a bundler to be wrong about deleting, which is the
exact thing the two client files are listed for.

#### And it is still not a decision the host imports

The rule at the top of this README is unbroken, which is worth saying because a
file that decides a port looks like a counterexample. Nothing in `/serve` that decides
anything is ever run by the host. (One thing in it IS run by a host and decides
nothing: `readJourneys`, which opens the file an epic's steps are kept in — it
is here because it reads a disk, and its judgement is `journeyIn` behind the
front door.) The host reads the registry and asks each address what it is,
and would reach identical conclusions about a module that had never heard of this
file. What is here is a *module's* own housekeeping — where to bind, what to
write down about itself — and both of those were already the module's to decide.
Fourteen modules were deciding them fourteen times, in two files each, with the
port literal duplicated between them.

## Notes by symbol

### `src/serve/index.ts`

#### About `src/serve/index.ts`

The part of a module that has to touch the machine: which port it binds, and
where it says so.

##### Why this is a separate entry point, and why it is node-only

The front door of this package says shapes and nothing else — types, schemas,
constants, pure functions over them — and that rule is load-bearing rather
than tidy. Everything here breaks it: it binds sockets, it fetches a document
off a port, it writes into somebody's home directory. Putting one line of it
behind the front door would make `import { WELL_KNOWN } from
'kehikot-module-protocol'` an import of `node:fs`, in a browser bundle, in
every module that renders a page.

So it stands beside the front door the way `/client` does, and for the mirror
reason. `/client` exists so the package can be imported by a server with no
`window`; `/serve` exists so it can be imported by a page with no filesystem.
A module imports both, from two different files, and neither one drags the
other into the wrong process.

##### And it is still not a decision the host imports

The rule about decisions is unbroken here, which is worth being explicit
about, because a file that decides a port looks like a counterexample. Nothing
in this directory that DECIDES anything is ever run by the host. (One thing
here is run by a host, and it decides nothing: `readJourneys`, below.) The
host reads the registry and asks each address what it is, and it would reach exactly the same conclusions
about a module that had never heard of this file. What is written here is a
MODULE's own housekeeping — where to bind, what to write down about itself —
and every one of those is a decision that was already the module's to make.
Fourteen modules were making it fourteen times, identically, in two files
each.

##### What is here

- `claim` decides the port and says who took the preferred one, if anybody.
- `registerAt` writes the file the host sweeps.
- `serves` is the Vite plugin that does both at the right moments, and is the
  only one of the three most modules will name.

- `readJourneys` and `readJourney` open the file an epic's steps are kept
  in. Here because they read a disk, and for no other reason: the shape and
  the judgement are `journey.ts` behind the front door. See `journeys.ts`.

The first two are exported on their own because a module that does not use
Vite is an ordinary module, and because the plugin's timing — claim before the
server starts, register after it is listening — is the interesting part rather
than the reusable part.

### `src/serve/ports.ts`

#### About `src/serve/ports.ts`

Which port this module binds, decided rather than assumed.

##### What this replaces

`exec bunx vite --port "${PORT:-7960}" --strictPort`. On a taken port that
prints `Error: Port 7960 is already in use` and exits 1, which is a module
that does not start because of a program it has nothing to do with. `--host`
and `--strictPort` were doing the only thing they could: fail, loudly, and
leave the remedy to a person editing two files in one repository and then
remembering the registry is now stale.

##### Drift, and the argument against failing loudly

The choice made here is to MOVE rather than die, and it is a choice with a
real cost: a drifted module is not where a person expects it, so
`curl 127.0.0.1:7960` answers with somebody else. Two things pay for that.
The move is shouted on stdout naming both numbers, and the registry — which is
the only thing that decides what the host talks to — is rewritten to the port
actually bound. The address a person reads on a module's container is
therefore right even when the number in their head is not.

The common case is deliberately untouched. If the preferred port is free it is
taken, with no probe, no search and no message: somebody typing
`curl 127.0.0.1:7960` after starting a module by hand must get their module,
and a system that sometimes moved for reasons of its own would have thrown
that away to solve a collision that had not happened.

##### The one case that must NOT drift

If the program already on that port answers the manifest with THIS module's
own id, this module is already running, and a second copy is not a fallback —
it is a fault. Two copies means two stores writing the same files, two MCP
doors a client can be pointed at, two committers on one repository, and a host
framing whichever of them the registry happens to name. That state has no
symptom that reads as "you started it twice"; it reads as data disappearing.

It is also the most common collision here now, because the host starts modules
on its own AND a person runs `./run.sh` in a terminal. So it exits, cleanly,
with a sentence naming the address — the answer to "start it" when it is
already started is "it is already there", not "here is another one".

#### `verdict`

The decision, as a function of who is there and nothing else.

Split out from `claim` because everything else in that function is a socket, a
timeout or a filesystem, and a rule about WHAT TO DO tested through three of
those is a rule nobody will change with confidence later. This part is a
table; it is tested as one.

#### `search`

The first port at or after `from` that neither `taken` nor `reserved` claims.

Pure over its two predicates so the walk itself can be tested without binding
a socket. Bounded by `span` and by the top of the port range, and it returns
`null` rather than throwing: a caller who has walked sixty-four consecutive
occupied ports is not in a situation any exception message improves, and the
one sentence worth printing belongs to whoever knows the module's name.

#### `free`

Whether a port can be bound, asked the only way that cannot be wrong.

By binding it. A connect-and-see probe answers "nothing is listening", which
is a different question — a socket held by another process in a state that
refuses connections is still a socket Vite will fail to bind — and the failure
that matters here is the bind, so the bind is what is tried.

There is a race between this closing and Vite opening, and it is not closed
here because it cannot be: the port has to be released before the thing that
wants it can take it. It is survived instead — `serves()` leaves `strictPort`
off and reads the port back off the listening server, so losing this race
costs one number in a log line and nothing else.

#### `identify`

Ask whoever holds a port what they are.

`node:http` rather than `fetch`, and deliberately. This file is imported by a
Vite config, which runs under Node and under Bun and, in this package's own
suite, under a preloaded happy-dom that installs a `fetch` of its own. A
request to loopback should not depend on which of those three provided the
global. `node:http` is the same request in all of them.

Bounded in time and in bytes for the reason the host's `fetchManifest` gives:
whoever is on that port is a stranger, and a reader with no deadline hangs on
a program that accepts a connection and then says nothing.

#### `identify.first`

The current path first, then the one a module from before the rename
     serves — but only after a plain "not here", so a module answering the
     first path is asked once, and a program that answered anything but 404
     there is judged on what it said.

#### Inside `peek`

A refused connection means nothing is listening — but `free()` has already
       decided that question, and this is only ever called after it said no. So
       an error here is a program that was there a moment ago, which is a
       stranger for every purpose that follows.

#### `readManifest`

What a document on that port makes the program serving it. Pure.

The `kind` word is checked before the id, which is the whole reason that word
exists: a JSON document that does not say `kehikot.module` (or `roadmap.module`,
its spelling before the rename) is not a manifest
however many of the other fields it happens to have, and a program with an
`id` field is not thereby a module. Without that check a module could be
talked out of starting by any JSON server that happened to have an `id`.

#### `claim`

Decide which port this module should bind.

It returns rather than exiting, including in the already-running case, and
that is on purpose: a library that calls `process.exit` is a library whose
most important branch cannot be tested, and this one has a whole suite aimed
at exactly that branch. The exit belongs to the caller who knows it is a
program rather than a test — see `serves()` in `plugin.ts`, and `sayClaim()`
for the sentence.

#### Inside `claim`

The common case, and it is deliberately the cheapest one: no manifest
     fetched, no registry read, no message printed. Nothing about starting a
     module on a machine where nothing is wrong should cost a round trip.

#### `claim.because`

`take === 'preferred'` cannot be reached here: `verdict` only says it for a
     free port, and this port was not free. The fallback sentence exists so that
     the rule stays a table `verdict` owns rather than a shape this function
     re-derives — if a fourth occupant is ever added, the compiler asks about it
     there and this keeps drifting rather than crashing.

#### `claim.mine`

Before drifting: is this module already answering where it last said it was?

This was found by running the thing rather than by thinking about it, and it
is the second start after a first one has already drifted. The squatter is
still on 7960, so the preferred port is occupied by a stranger, so the
already-running check above never fires — and the module walks past its own
running copy on 7961 to start a SECOND one on 7962. Two stores, two MCP
doors, two committers, which is precisely the state that check exists to
make impossible, arriving through the one door it did not cover.

So the module's own registration is consulted, and only in the drift path.
It costs one file read and one request in a case that is already going
slowly, and it costs the common case nothing at all.

The registration is a hint and never an authority. It is asked the same
question the preferred port was asked, and only an answer carrying THIS id
stops the start — a stale file naming a port somebody else now holds says
nothing about whether this module is running, and treating it as if it did
would be a module refusing to start because of a line in a file.

#### `sayClaim`

The sentence, written once so every module says it the same way.

Loud on purpose. A drift that scrolled past in the same grey as everything
else would be a module answering somewhere nobody looks, which is the cost of
drifting and the only part of it a person can act on.

### `src/serve/registry.ts`

#### `registryDir`

The one directory a host sweeps, and the one shape it finds there.

##### Why this is written here rather than copied a fourteenth time

Every module in this workspace ships a `register.ts` that spells this
directory out by hand, under a comment saying the line "must say exactly what
a host's own registry sweep says". Fourteen copies of a sentence that has to
be identical is not a convention, it is a countdown — and the failure it
produces is the worst one a module can have, because a registration written to
the wrong directory means the host finds nothing and finds it SILENTLY. No
error, no empty container, no address to go looking at. The module simply does
not exist.

So the path is spelled once, in the package both halves already import.

##### Where it is now, and where it was

`~/Library/Application Support/Kehikot/modules` on macOS — the place the
platform keeps an app's own data — and `$XDG_DATA_HOME/kehikot/modules`
(default `~/.local/share/kehikot/modules`) elsewhere. The same directory the
host reads first; see `machineDirs.ts` in the host.

It used to be `~/.roadmap/modules`, named after the app before it was called
Kehikot. Modules built against an older copy of this package still write
there, and the host still reads it as a fallback, so nothing is lost by a
module moving: it writes the new place, and where an id is in both, the
newer file wins in the host.

##### `KEHIKOT_MODULES_DIR` is honoured, and that is not a convenience

It is how any of this can be tested. A test that wrote into a person's real
registry would be a test that ADOPTS a module onto their canvas, and the
only way to notice is a container appearing in an app the test never
opened. The host reads the same variable, so a whole second registry is a
directory and an environment variable away. `ROADMAP_MODULES_DIR`, its name
before the rename, is read when it is not set.

#### `legacyRegistryDir`

> **Deprecated in 0.37, removed in the next breaking release.** The next breaking release does not read `~/.roadmap/modules`; a host copies that directory into `registryDir()` once. `ROADMAP_MODULES_DIR` and `ROADMAP_ORIGIN` stop being read too: set `KEHIKOT_MODULES_DIR` and `KEHIKOT_ORIGINS`. A `roadmap.<name>.json` registration beside the one `registerAt` writes is still read.

The registry before the rename, `~/.roadmap/modules` — READ, never written,
so that what a module wrote there (`keep`, above all) is carried over the
first time it registers in the new place. `null` when the registry was
pointed somewhere on purpose, so a test never reads a person's real one.

#### `registerAt`

Say where this module answers.

The filename carries the id — `kehikot.history.json`, not a field inside the
document — because that is what makes the id unforgeable. A host takes the id
from the NAME, so two files claiming one module cannot both exist: the
filesystem already refuses that, and a uniqueness rule enforced by the
filesystem is one nobody has to re-implement. See `server/registrations.ts` in
the host, whose essay this restates deliberately rather than links to.

`dir` is here for the reason every module's `register.ts` gives: the url is
where to TALK to this program and the directory is where to START it, and the
moment a host needs the second is exactly the moment there is no manifest to
read the first from. It has to be a directory rather than a command line — a
string a host handed to a shell would make this file a place to write shell —
and what the host runs inside it is `run.sh`, no arguments.

##### The honest part: this is now written on every start

Every module's `register.ts` opens with an argument this has to answer rather
than delete: registration writes into somebody's home directory and says
"frame this", which is a decision a person makes once, and a start script that
did it quietly would be making that decision on their behalf.

That argument is about ADOPTION and it still stands whole. `bun run register`
is still the act that puts a module on somebody's canvas, still a separate
program, and nothing here is meant to be the first thing that ever writes a
module's file — the plugin that calls this is one a person added to their own
`vite.config.ts`, in their own checkout, which is the same deliberate act
wearing different clothes.

What is genuinely different is RE-STATING a url for a module already in the
registry. The person decided to be framed; they did not decide to be framed at
port 7960 in particular, and after a drift the number in that file is simply
wrong. Leaving it wrong out of respect for the earlier decision respects
nothing: the host sweeps the stale address, finds nothing there, and reports
the module as not running while it is running one port over — with a Start
button that will spawn a second copy. The decision a person made was "frame
this program". Keeping that decision TRUE is what this write is for.

##### Two checkouts, and who wins

If one id is registered from two directories, whoever started last wins — both
`url` and `dir`. That is an answer rather than a shrug: the host frames ONE
program per id, and the one worth framing is the one actually running now.
Refusing to overwrite a differing `dir` would leave the registry naming a
checkout nobody has started, and hand the Start button a directory that is not
where the running server is.

It is still a surprise, so it is never silent: `was` carries whatever the file
said before, and the caller prints it whenever it differs.

#### Inside `registerAt`

Refused here rather than joined. A filename derived from an id is a PATH
     BUILT FROM DATA, and an id can arrive from a manifest that came off a port.
     Same argument `moduleFolder` makes in `project.ts`, for the same reason.

#### `registerAt.earlier`

What this module said last time, wherever it said it: under this id; under
     the same id spelled as before the rename (`roadmap.x`), beside it or in
     the old `~/.roadmap/modules`. Only read — the older files are left exactly
     as they are, for a host that has not been updated.

#### `registerAt.kept`

Everything already in the file that this function does not manage.

This owns exactly two fields: where the module answers, and which checkout
to start. Every other key belongs to whoever wrote the file, and a start
script is not entitled to delete somebody's decision on its way past.

`keep: true` is the one that makes this urgent rather than tidy. It is how
a person tells the host it may NOT stop a module — see the lifecycle essay
in the host, which argues at length that stopping is not the mirror of
starting because it destroys what the program was holding. The terminal
carries it, and a terminal is holding a live shell. Rewriting `{url, dir}`
over that file would have quietly returned the host's permission to kill
it, and nothing anywhere would have said so — the module would keep working
until the day it was reaped mid-command.

So the file is merged, not replaced. Unknown keys survive by default, which
is also what makes a field added to this format later safe from every
module still running the version before it.

#### `readAll`

The whole registration object as it stands on disk, unnarrowed.

`readRegistration` answers what this package UNDERSTANDS — a url and a dir —
and that is the right shape for deciding anything. This answers what is
actually in the file, which is the only shape that can be written back
without losing what nobody here knows about. See `registerAt`.

#### Inside `readRegistration`

`dir` is optional in the host's reading of this file — a module somebody
     starts themselves is an ordinary module — so its absence is not a fault and
     must not turn a real registration into a `null` one.

#### `neighbourPorts`

The ports the OTHER registered modules have claimed.

Read before drifting, and the reason is a failure that would otherwise arrive
a week later with nothing connecting it to its cause. The modules on this
machine sit ten apart — 7820 through 7960 — and a module drifting upward from
7940 walks straight into 7950 if 7950 happens to be free at that second. It IS
free: its owner is not running, which is the normal state of most modules most
of the time. The drifter takes it and registers there. The next person to
press Start on the module that owns 7950 gets a port collision they did not
cause, in a module they did not change, and the program holding their port is
one whose registration says it lives somewhere else entirely.

So a neighbour's stated port is treated as occupied even when nothing is
listening on it. A registration is a claim, and this is the one place in the
system where reading somebody's claim is cheaper than discovering it.

#### `neighbourPorts.legacy`

And the pre-rename registry too, when this is the real one: a module that
     has not been updated still states its port there, and that claim is just
     as much a claim.

#### Inside `neighbourPorts`

No registry directory yet. The first module on a clean machine is not an
         error, and a drift that refused to happen because nobody had registered
         anything would be a strange first experience.

### `src/serve/plugin.ts`

#### `ServesOptions`

A module's whole port story, as one line in its `vite.config.ts`.

    import { serves } from 'kehikot-module-protocol/serve'
    import { ID } from './manifest.ts'

    plugins: [serves({ id: ID, prefer: 7960 }), doors(), react()]

What that replaces is a number written in three places and true in none of
them: `--port` in `run.sh`, `Number(process.env.PORT ?? 7960)` in
`register.ts`, and whatever the registry file happened to say from the last
time somebody ran the second. Changing a port meant editing two files and
remembering the third. Now the preference is stated once, beside the id, in
the file that already knows both.

##### Why this is a plugin and not a wrapper script

Because of the last step, which is the one that cannot be got right anywhere
else. `run.sh` could claim a port and pass it to Vite; the registration it
then wrote would say the port it ASKED for. Vite is free to answer somewhere
else — that is the entire reason `strictPort` is turned off here — and the gap
between the requested port and the bound one is exactly where a stale
registration comes from. Inside the process, `server.httpServer.address()`
after `listening` is the one number that cannot be wrong, and it is the number
that gets written down.

##### `strictPort: false`, on purpose

`--strictPort` was the only honest thing to do when nothing handled a
collision: a server that silently moved was a server nobody could find. That
is no longer true. The move is decided deliberately before Vite starts, said
out loud, and recorded in the registry the host actually reads — so Vite's own
fallback is now a second net under a first one, catching only the race between
this releasing a probe socket and Vite binding it.

##### `apply: 'serve'`

A production build has no port to claim and no address to register. A plugin
that wrote into somebody's home directory during `vite build` would be a build
with a side effect on a machine it was only compiling for.

#### `ServesOptions.dir`

The directory a host would start this module in.

Defaults to Vite's resolved `root`, which is the checkout — the same
directory `register.ts` derives from its own file location, and for the same
reason: a `dir` taken from `process.cwd()` would record where somebody
happened to be standing.

#### `HttpServerLike`

The shapes this plugin needs from Vite, stated structurally.

This package does not depend on Vite and must not: it is imported by the host,
by module servers, and by a browser bundle through a different entry, and none
of those should acquire a bundler as a transitive dependency to read a
manifest schema. Vite's own `Plugin` is a superset of what is declared here, so
the object below still satisfies `PluginOption` in a module's config with no
cast — and if it ever stops doing so, the module's `tsc` says so, which is the
right place to find out.

#### `preferred`

`PORT` still wins, because the host passes it.

When the host starts a module it spawns `run.sh` with `PORT` set to the port
in the registration — see `server/launch.ts`. Ignoring that would mean a
module the host started at its recorded address preferring a different one and
drifting away from the very place the host is about to look. So the
environment is the preference when it says anything, and the constant beside
the id is the preference when it does not.

#### Inside `serves.config`

Exit 0, not 1. Nothing failed: the thing being asked for exists. A
           non-zero exit here would make `./run.sh` look broken to a person who
           has simply started their module twice, and would make a host's own
           start attempt report a module that cannot run while that module is
           answering on the port named in the sentence below.

           And it EXITS rather than drifting, which is the one place drift is
           refused. A second copy of one module is two stores writing the same
           files, two MCP doors, two committers on one repository, and a host
           framing whichever the registry names. That is not a fallback.

#### Inside `serves.config`

Loud, on stdout, naming both numbers — the port that was wanted and the
         one taken. A drift a person cannot see is a module answering somewhere
         nobody will think to look.

#### Inside `serves.configureServer`

Said every time, and short. It is the answer to "where is this thing"
           for anybody reading the terminal it started in, and after a drift it
           is the only place both numbers appear together.

#### Inside `serves.configureServer`

Whoever started last wins, and the losing entry is named rather than
             overwritten in silence. Two checkouts of one module is the case this
             is for: the registry can only describe one program, and a person who
             sees their other checkout's path scroll past knows immediately which
             one the host is about to frame.

### `src/serve/origins.ts`

#### About `src/serve/origins.ts`

Who may frame a module: the `frame-ancestors` a module's page should send.

##### Why a list

A module used to read one origin, `ROADMAP_ORIGIN`, and fall back to the
development page at `http://127.0.0.1:4181`. One host, one origin. But the
same module is framed by more than one host on one machine: the development
page on 4181, the desktop app's page on 4170, and the desktop app's own
window, whose origin is `tauri://localhost` (or `http(s)://tauri.localhost`
on some platforms). A module that allows one of them draws blank in the
others, and the only trace is a line in a console nobody has open.

So a host passes every origin it may be framed from, space-separated, in
`KEHIKOT_ORIGINS`, to every module it starts. A module started by hand gets
`DEFAULT_FRAME_ORIGINS`, which is every origin a host on this machine serves
its page from by default.

##### The order things are read in

`KEHIKOT_ORIGINS` (a list), then `KEHIKOT_ORIGIN` (one), then
`ROADMAP_ORIGIN` (one, its name before the rename), then the defaults. A
single origin is honoured as the whole answer rather than added to the
defaults, because somebody who set it meant exactly that host.

### `src/create/index.ts`

#### About `src/create/index.ts`

`bun run create <name>`: a new module, generated from `template/`.

Node-only, like `/serve`, and deliberately not behind any entry point in
`exports`: it is run from a checkout (`bin/create.ts`), never imported by a
module. Every step is its own function so the tests can take them apart.

#### `namesFor`

Everything a module is called, from the one word a person typed.

Narrower than `MODULE_ID` on purpose: the name also becomes a package name,
a directory, a header name and a folder, and a dot in any of those is a
question nobody needs to answer. The id is still checked against the
protocol's own rule, so the two can never disagree.

#### `takenPorts`

The ports already spoken for: every registered module's url, and the
`PREFERRED_PORT` in each registered checkout's `manifest.ts` where one can be
read. A module that is not registered is not visible here, and that is
accepted — the plugin moves a module off a taken port when it starts.

#### `CreateOptions.protocolSource`

What the new module's `kehikot-module-protocol` dependency says, instead of
the GitHub source — e.g. `file:/path/to/this/checkout`. The protocol's own
test uses it so a generated module is tested against the protocol as it is
now, offline.
