# A module served ready-built (2.17.0, 2.18.0, 2.18.1)

`/run` and `/build`: a module's page compiled once, ahead of time, and served by one Bun process
with the same doors the dev server mounts. Bun-only (`/run`) and Node-or-Bun (`/build`); neither
depends on Vite.

## Why

A Vite dev server is the right thing for a person editing a module and the wrong thing for one that
is only being used. Measured on this machine (kehikko PR #147, the Tests module, which shipped the
first production path): spawn to first 200 went from 215–625 ms to about 60 ms, a page load from
270–416 ms and 42–80 requests to about 30 ms and 7, and resident memory from 200–280 MB to about
50 MB. A host keeping a project's modules warm holds a dozen of these.

## What `run` is

```ts
// serve.ts
import { run } from 'kehikot-module-protocol/run'

await run({ id: ID, prefer: PREFERRED_PORT, dir: import.meta.dirname, manifest: MANIFEST, answer, build: BUILD, ticket: TICKET })
```

- **The port**, as `serves()` decides it, by the same functions: `PORT` from the environment, else
  `prefer`, then `claim`'s drift rules (`claimOrLeave`: exit 0 when this module already answers,
  exit 1 when there is nowhere to go). `127.0.0.1` only. The port actually bound is registered
  (`registerBound`, the same call `serves()` makes, which does not take over a registration that
  names another folder).
- **The doors** are `doorsFetch` with the module's own `DoorsOptions` — the manifest at
  `WELL_KNOWN`, `/app`, `/healthz`, `/mcp`, `/api/*`, a module's settings door and skills, which are
  all in its `answer` — so the dev server and the built one cannot disagree about what a module
  says. The page is `dist/index.html` with this process's ticket, build and frame origins put in
  per request (`fillPage`).
- **The files of `dist/`**: under `/assets/` (hashed by Vite) `immutable` for a year; anything else
  `no-cache`. Never a directory (no listing), never a dot file (the stamp), never a path that
  leaves `dist/` once decoded and normalised. `spa: true` answers a browser's `text/html` GET for an
  address that is nothing with the page; off by default.
- **Sockets**, for a module that holds them (`sockets: { paths, data, open, message, close, drain,
  refused }`), on Bun's own WebSocket. A handshake is upgraded only when its `Origin` and `Host`
  name this server's own loopback address (`socketFence`): no `Origin` is not a page, and a name
  that resolves to 127.0.0.1 is not here. A refusal is a bare 403; the reason goes to `refused`.
- **The `Host` fence** (2.18.0): a request whose `Host` is not a loopback name — `127.0.0.1`,
  `[::1]`, `localhost` or a name under it — is a 403 before anything else is asked (`hostFence`).
  The doors' gate reads `Origin` against `Host`, so a page on a name somebody pointed at 127.0.0.1
  (DNS rebinding) would otherwise be "its own page". Vite refuses the same requests
  (`server.allowedHosts`), so nothing a module answered in development is refused here. `hosts`
  adds names.
- `idleTimeout` 0 by default: an event stream or a long MCP call is not idle.
- `onStop`, once, on SIGINT, SIGTERM or exit: end what the module started. It may return a promise
  (2.18.1): on a signal the server stops answering at once, and the process exits when `onStop` has
  finished, or after `stopTimeoutMs` (default 5000) if it has not. A browser told to close writes
  its cookies; one killed by the exit does not. On a plain exit nothing can be awaited, so `onStop`
  is only begun.

## A door of the module's own: `before` (2.18.0)

Some doors cannot be an `answer`: one that reads a header the doors do not pass on (a key), or that
must see a request before the doors' gate refuses it. On Vite such a door is middleware placed ahead
of `doors()`; on `run` it is `before`. Both are the SAME function, written once, from a `Request` to a
`Response`:

```ts
// factory.ts
import type { Before } from 'kehikot-module-protocol/serve'

export const factoryDoor: Before = async (request, { asker, url, ticket }) => {
  if (url.pathname !== '/api/factory/send' || !request.headers.get(KEY_HEADER)) return undefined // not mine
  if (asker !== 'program') return Response.json({ ok: false, error: '…' }, { status: 403 })
  const body = await request.json()
  …
}

// vite.config.ts — after serves(), before doors()
plugins: [serves(…), beforeDoors(factoryDoor, { setup: ensureKey }), doors(…), react()]

// serve.ts
await run({ …, before: factoryDoor })
```

- **Asked first**: after the `Host` fence and a preflight `cors` answers, before the doors, the
  page and the files of `dist/`. Not for a socket handshake on one of `sockets.paths`.
- **`undefined` (or `null`) hands the request on, unread.** On Vite the request's body is a stream
  that reads nothing until it is read, so the doors and Vite get it whole.
- **`info`** is what the doors work out before they route: `asker` (`gate.ts`: `page`, `program`,
  `person`, `navigation`, `elsewhere`), `url`, and the `ticket` it carried. It fences nothing itself:
  what it answers, and to whom, is the module's — and it is handed `asker` so it decides the way the
  doors do.
- **A throw** is a 500 on `run` (the reason goes to the log), and `next(error)` on Vite.
- **The adapters**: `beforeHandler(before)` is node middleware, `(request, response, next)`, for a
  `configureServer` of the module's own; `beforeDoors(before, { name?, setup? })` is the Vite plugin
  around it, with `setup` run once when the dev server is made. A body is streamed as it comes, so
  a door that answers with an event stream works on both.

## A page on an opaque origin: `cors` (2.18.0)

A module whose manifest declares `storage: false` is framed WITHOUT `allow-same-origin`: its page is
on an opaque origin. A module script is always fetched in CORS mode, and from an opaque origin it
carries `Origin: null`; without a header saying it may, not one script of the page runs — the frame
loads, the host greets it, and nothing answers. In development that header is Vite's `server.cors`.
On `run` it is `cors`:

```ts
await run({ …, openHealth: true, cors: true })
```

- `true` answers `Origin: null` and the origins that may frame the page (`frameOrigins`: the
  environment's `KEHIKOT_ORIGINS`, else `KEHIKOT_ORIGIN`, else the defaults, plus `ancestors`);
  `{ origins }` adds more. Any other origin is not answered.
- It opens **the files of `dist/` only**, and a preflight for one: the answer echoes the origin, and
  every file says `Vary: Origin` while `cors` is on, so a copy cached for one origin is not used for
  another.
- **The page and the doors keep their gate.** A door still refuses a page on another origin with
  403, `cors` or not; the one door an opaque page may read is the health check, opened by
  `openHealth`, as before.

## The stamp, and why a stale build is never served

`buildModule` (in `/build`) writes the page (`pageDocument`, with no ticket, build or origins) to
`index.html` at the module's root when it has none of its own, runs the module's own `vite build`,
takes the file away again, and writes `dist/.kehikot-built`: the commit on the first line. The stamp
is taken off before the build starts and written only after it succeeded, from a checkout whose
tracked files match `HEAD` — a build from a tree with changes is built and not stamped.

`run` serves the build only when the stamp names the commit the process started at (`readiness`).
Otherwise the page and every file of `dist/` are a 503 that says which commit each is and which
command to run; the doors still answer, so a host sees the module is up and can read what it
says. The stamp is re-read per page, so a build replaced under a running server is refused too.

This is the answer to the "no dist" essay that every module's `run.sh` carries: a stale page served
with a 200 has every symptom of a working app and none of the changes. A stale build announces
itself; it is never served.

## `run.sh`

A module's `run.sh` chooses before it `exec`s, with no process started to ask:

```sh
built=
[ -f dist/.kehikot-built ] && read -r built < dist/.kehikot-built || true
if [ -n "$built" ] && [ "$built" = "$(git rev-parse HEAD 2>/dev/null)" ]; then
  exec bun run serve.ts
fi
exec bun run vite $VITE_FORCE
```

So a checkout somebody edits keeps Vite (no stamp, or a stamp of an older commit), and an installed
copy built at its tag is served ready-built.

## Building is the host's, at install and update

A start never builds: a start that builds fails when the network is down, and one that rebuilds
silently serves a page nobody asked for. A host builds an installed copy after `bun install`, at
install and at update, keyed to the tag it checked out. A build that is missing, failed or stamped
with another commit falls back to the dev server, by the rule above.
