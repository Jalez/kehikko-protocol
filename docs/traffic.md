# Traffic

The record of the calls Kehikot and its modules make and receive on this computer: when, what kind,
to where, and for what reason — and never what they carried (2.20.0).

Back to the [index](README.md).

## Overview

A person running a dozen modules cannot see who is talking to GitHub, who polls the host every two
seconds, or whether two modules read the same list a minute apart. Encrypted traffic cannot be read
from outside, so the question "why was this call made" can only be answered by the caller. The record
has two layers:

1. **Labelled calls.** The host records every call it makes (its GitHub gateway, `gh`, `glab` and
   `git` runs, update checks, the official list) and every request it receives on its own routes
   (a page relaying a module's `tracker.get`, a module's server asking `/host/is-project`), each
   with a reason from the call site. A module's server adds its own with `trafficNotes`, which wraps
   `fetch` and notes program runs, and sends them with `traffic.note`.
2. **Connections nobody reported.** While a reader asks with `sample: true`, the host looks at the
   connections open on its own processes and each module's process group, and files a new one as a
   row with `side: 'seen'`, `reported: 'sampled'` and no reason.

A module that shows traffic (the Monitor) reads the record with `traffic.read`, from its page through
the frame or from its server with `askHost`. Both are held to `traffic:read`.

```ts
// A module's server, noting its own calls (manifest: declares.uses includes 'traffic:report'):
import { trafficNotes } from 'kehikot-module-protocol/serve'

const traffic = trafficNotes({ module: ID })
const response = await traffic.fetch('release list', 'https://api.example.com/releases')
traffic.command('pull the paper', ['git', '-C', dir, 'fetch', 'origin'], { ms, code })

// A module that shows traffic (declares.uses includes 'traffic:read'):
const read = await host.ask('traffic.read', { since: last, sample: true })  // its page
const same = await askHost('traffic.read', { since: last }, { module: ID })  // its server
```

### What is recorded, and what never is

A row (`trafficCallSchema`) is: when it began (`at`) and how long it took (`ms`); who (`by`: the host's
`kehikko`, a module id, or `''`), which part of them (`via`: `server`, `page`, `process`), which way
(`side`: `out`, `in`, `seen`) and who says so (`reported`: `host`, `module`, `sampled`); the `reason`;
the `kind` (`GET`, `git fetch`, `gh api`, `tcp`); where it went as `host` and `path`; its `status`
and `ok`; the bytes when they are known; and `cache` when it was free (`hit`, `not-modified`,
`refused` by a budget).

Never a body, a header, a cookie, a token or a query VALUE. The address is cut down at the call site
by one function both sides use, `trafficTarget`: the user and password out of the authority, every
query value replaced with `…` (the keys stay, so `?page=…&per_page=…` still says what was asked), the
fragment dropped, and any path segment that looks like a secret replaced. A host sanitizes a module's
note again on receipt: it does not take a module's word that it did.

Who says a row happened is the RECORDER's to state, never a field the caller sets: a module cannot
file its own call as observed, or a call of its own under the host. This is the rule
`kehikot.calls@1` already states (see [extension payloads](extensions.md)); `traffic.note` is the
route that puts such a report into the host's record, from the module's server.

The record lives in the host's memory, the last `LIMITS.TRAFFIC_KEPT` rows, and never in a project.
Reading and noting traffic are not themselves recorded — a reader polling the record every second
would otherwise fill it with itself.

`processes` answers a read that asked with `sample: true`, and is null otherwise: the snapshot of
connections is the expensive part, and a reader that does not show it (an agent's one look) does not
make the host look.

## Symbols

### `traffic.ts`

#### `TRAFFIC_SIDES`, `TRAFFIC_VIA`, `TRAFFIC_REPORTERS`, `TRAFFIC_CACHE`

The words a row is filed with. `in` is a request the HOST received from `by`: the polling between
modules and the host, which is where most redundant calls are. `seen` is a connection the host saw on
a process of `by` and nobody reported. `cache: 'hit'` is a call that did not go out at all because an
answer was kept; it is in the record so a reader can see what a cache saved.

#### `TRAFFIC_HOST_BY`

`kehikko`, the host's name on the wire and its door. A row the host could not attribute has `by: ''`.

#### `trafficNoteSchema`, `trafficCallSchema`

A note is what a module says about one call; a call is a note the recorder stamped with `seq` (its
place in the record, from 1 at the host's start), `by`, `via`, `side` and `reported`.

#### `trafficBudgetSchema`

An allowance the host spends for the person: GitHub's API without a login, which the host's gateway
keeps within a budget of its own. `left` of `limit` until `resets`.

#### `trafficLimitsSchema`, `trafficAccountSchema`, `trafficAllowanceSchema`, `trafficShareSchema` (2.24.0)

Each forge's budgets, separately, on `traffic.read`'s `limits`:

```ts
limits: {
  github?: {
    account: {                 // the person's signed-in gh; null when it is not signed in
      login: 'Jalez',
      core:    { limit: 5000, used: 188, remaining: 4812, resets, share: { limit: 1000, used: 312 }, floor: 500 },
      graphql: { limit: 5000, used: 40,  remaining: 4960, resets, share: { limit: 1000, used: 25 },  floor: 500 },
      paused: false, why: '', until: null,
      at,                      // when the numbers were last learned
    } | null,
    anonymous: TrafficBudget | null,  // the 30-an-hour budget without an account, as in `budgets`
  },
  gitlab?: { account: TrafficAccount | null },  // core only; graphql null
}
```

An account's limit is shared by everything the person runs as that account: their own `gh` and
`git`, CI, other apps, agent sessions. `used` and `remaining` are the account's, whoever spent them;
`share` is the part the host allows itself and what it has spent of it in the account's window, and
`floor` the `remaining` below which it reads nothing. A host holds what it can while the share is
used or the floor reached and says so in `paused` and `why`, a sentence a reader shows as written
("Kehikot's share of your GitHub limit is used until 11:00"). Every call held is a row with
`cache: 'refused'` and that reason.

Older readers keep working: `budgets` is still filled, and a reader before 2.24.0 strips `limits`.
A reader of 2.24.0 against an older host finds it absent. One that does not parse is dropped, not
fatal: the rest of the answer stands.

#### `trafficConnectionSchema`, `trafficProcessesSchema`

What the host saw open on its processes when it last looked: the process, the other end, the bytes
it carried when the host can see them. `processes.on` is false when nobody asked with `sample: true`
lately, and `bytes` false with a `why` when the host can see connections but not what they carried.
Looking is the host's own business, with tools it can run without privileges; a host that cannot
look says so and answers the labelled record as usual.

#### `trafficReadResult`

The rows after `since`, oldest first. `newest` is the cursor to ask from next. A `since` older than
`oldest` lost rows to the ring's end and `gap` says so; a `since` past `newest`, or a `started` that
changed, means the host restarted and the reader starts over.

#### `trafficNoteResult`

`taken` with a count, or `declined` with a sentence.

#### `looksSecret`, `trafficPath`, `trafficTarget`

The sanitizer. A segment looks like a secret when it carries a known credential prefix (`ghp_`,
`github_pat_`, `glpat-`, `xoxb-`, `sk-`, `AKIA`…), is a JWT, or is a run of 24 or more token characters
mixing letters and digits. That last rule also takes out a commit sha; a sha is cheap to lose and
telling the two apart is not worth a leak. Pure, bounded, and never throws.

#### `trafficCommand`

Which program runs went over the network, and the part of their arguments that is recorded: the
remote of `git fetch`/`clone`/`ls-remote`/`pull`/`push` (sanitized; a remote's name as written), the
API path of `gh api`/`glab api`, the command words of any other `gh`/`glab` command and nothing
else — never a title, a body, a field or a header. `git rev-parse` and the like read a disk and are
null.

### `methods.ts`

`traffic.read` (`traffic:read`) and `traffic.note` (`traffic:report`). See
[capabilities](methods.md#capabilitiestrafficread-and-capabilitiestrafficreport). A host answers
both from its server, to a page through the frame and to a server through `askHost`.

### `server-ask.ts`

`SERVER_METHODS` gains `traffic.read` and `traffic.note`; they are about this computer, so a question
about them names no project (`SERVER_PROJECT_METHODS`, `needsProject`). A host before 2.20.0 refuses
them: the method is not one of its `SERVER_METHODS`.

### `serve/traffic.ts`

#### `trafficNotes(options)`

One per process. `fetch(reason, input, init)` is `fetch` noted with the method, the sanitized address,
the status, the time, and the bytes the headers and a string body say — the body is never read.
`note(call)` notes any other call, `command(reason, argv, ran)` a program run when `trafficCommand`
says it went out. Notes wait `TRAFFIC_FLUSH_MS` and go together, at most `LIMITS.TRAFFIC_NOTE` at a
time. No host answering keeps them (at most `TRAFFIC_PENDING`); any answer settles them, a refusal
included — a module whose manifest does not ask for `traffic:report` is refused every time, and
keeping its notes would only grow.

Opt-in, and partial by nature: a call a module does not note is not in the record as its own. The
host may still see the connection on the module's processes, and shows it as "no reason given".
