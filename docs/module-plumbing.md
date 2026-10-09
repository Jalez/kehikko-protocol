# The shared plumbing of a module: its page, ticket, doors, own API, host hook, not-ready screen and build identity

Added in 0.35.0. Everything here is a convenience, like the rest of `/client` and `/serve`: a module that hand-rolls all of it is exactly as conforming. It exists because eighteen modules had each typed the same things out — sixteen copies of `page(ticket)`, fourteen JSON body readers, seventeen copies of the middleware that serves the manifest and the page, thirteen hand-rolled host hooks (4,472 lines, all different), and about a dozen wordings each for "waiting", "nothing is framing this page" and "my own server did not answer", several of them drawn for the wrong state.

| piece | where | replaces in a module |
|---|---|---|
| `pageDocument`, `themeScript` | `/serve` | `page/document.ts`: `PAGE_SHELL`, `page(ticket)` |
| `mintTicket`, `sameTicket`, `ticketOf`, `refuseTicket`; `TICKET_HEADER` | `/serve`, front door | `TICKET = crypto.randomUUID()`, `ticket !== TICKET`, the header's name |
| `readJsonBody` | `/serve` | `body(request)` in `vite.config.ts` |
| `doors`, `doorsHandler` | `/serve` | the `doors()` plugin in `vite.config.ts` (about 75 lines, plus SSE where a module had it) |
| `establishBuild`, `commitOf`; `buildSchema`, `compareBuilds`, … | `/serve`, front door | nothing: new |
| `ticket`, `ask`, `answered`, `follow`, `pageBuild`, `applyTheme` | `/client` | `src/store/ask.ts` or `src/wire/api.ts`: the ticket reader, the `fetch` wrappers, `EventSource` |
| `useHost` | `/client/react` | `src/wire/use-kehikot.ts` |
| `Cover`, `coverFor`, `COVER_WORDS`, `useServerStanding` | `/client/react` | every module's own waiting / unhosted / no project / no epic / loading / error screens |

A module's `vite.config.ts` after:

```ts
plugins: [
  serves({ id: ID, prefer: PREFERRED_PORT }),
  doors({ manifest: MANIFEST, answer, build: BUILD, page: { title: 'History', ticket: TICKET } }),
  react(),
  tailwindcss(),
],
```

and in its `doors.ts`:

```ts
export const TICKET = mintTicket()
export const BUILD = establishBuild({ version: VERSION, dir: import.meta.dirname })
// …inside answer(method, path, query, body, ticket), before a write:
const refused = refuseTicket(ticket, TICKET)
if (refused) return refused
```

## The page document (`serve/page.ts`)

Generated rather than an `index.html` because the ticket is minted when the server starts and has to reach the page without a door of its own — a `GET /api/ticket` would hand the write credential to anything that asked. The ticket and the build ride in `type="application/json"` islands: inert, read with `JSON.parse` off `textContent`, and written so nothing in them can close the script element (`<` is escaped) or be mangled by `String.replace` reading `$&` out of a random ticket.

### What it paints before any script of the module's has run

Under Vite dev a module's stylesheet arrives from JavaScript, so without help the first frames of every load are the browser's own white, or the system's theme when the host is set to the other one. The head carries two rules — `html.light{background:…;color-scheme:light}` and `html.dark{…}` — and one plain blocking script (not a module: a module script runs after the first paint) that puts `dark` or `light` on `<html>`. That class is also what every module's own stylesheet keys on once it lands, so there is one answer, decided once.

The theme is decided from, in order:

1. `?theme=dark|light` on the page's address (`THEME_PARAM`). Nothing sends this today; it is the seam a host can use to make the first paint exact (see "For the host" below).
2. What the host said last time, remembered by `useHost` in the page's own `localStorage` under `THEME_KEY`. Only a module that declared `storage` has one; elsewhere the read throws and is skipped.
3. Nothing framing the page: the system's preference.
4. Framed with nothing to go on: `FRAMED_DEFAULT_THEME`, dark — the host's own default, which it uses whatever the system prefers.

**Why 4 is a guess and not "paint nothing".** The first design left a framed page with no known theme unpainted, on the reasoning that the host draws its themed card colour behind a transparent frame. Measured in WebKit, with the page framed from an origin its `frame-ancestors` allows, a document that has begun loading its modules is an opaque white rectangle whatever its own background and `color-scheme` say (`html` and `body` both computed transparent, pixel `rgb(255,255,255)`, under both system schemes). So unpainted means white, which is wrong for the default host theme. Dark is right for a default host, and after one greeting 2 is right for everybody with storage.

**Why there is no `<meta name="color-scheme">`.** The scheme is set by the same class as the background (`color-scheme` in the two rules), so the two cannot disagree; a static meta would state a scheme before the script has decided one.

Options: `title`, `ticket` (omit for a page that never writes), `build`, `entry` (default `/src/main.tsx`), `lang`, `background` (the two colours, when the module's palette is not the scaffold's; anything that is not plainly a colour is ignored), `head` (extra markup, trusted).

## The ticket (`serve/ticket.ts`)

One header name for every module, `x-module-ticket` (`TICKET_HEADER`). Eight modules used `x-<name>-ticket`; a module moving onto `doors()` and `ask()` moves to the shared name on both sides at once, which is safe because the page and the server are one process's two halves.

`sameTicket` hashes both sides and compares in constant time. No module did; every copy was `!==`.

`refuseTicket(carried, minted, sentence?)` is the refusal: 403, `{ ok: false, error, refused: 'ticket' }`. The mark is what lets the page's `ask()` tell *this page is older than its server* from any other refusal — a 403 a module sends for its own reasons stays an ordinary refusal.

## The body reader (`serve/body.ts`)

The fourteen copies agreed on the bound (a megabyte; paper 6 MB, notifications 256 kB, terminal 64 KiB) and disagreed on the rest. What this does, and where it differs:

- Reads a body for POST, PUT, PATCH and DELETE. Most copies read POST only; slides read all four. A module that never looks at a DELETE's body is unaffected.
- Not JSON, or JSON that is not an object (an array, a string): `null`, as in every copy. The door words the refusal itself, which matters for `/mcp`, whose refusals are JSON-RPC.
- Too large: **413** `{ ok: false, error }` from `doors()`, and `answer` is never called. Every copy but terminal's returned `null` here, so an oversized write was called "not a request". Nothing past the bound is kept, and the rest of the request is discarded unread rather than the socket being destroyed, so the refusal can actually be delivered.
- The bound is `maxBodyBytes` on `doors()`.

## The doors (`serve/doors.ts`)

`doors({ manifest, answer, stream?, build?, page, pages?, ours?, maxBodyBytes?, beatMs? })` is a Vite plugin (serve only). It goes after `serves()` and does not touch it. `doorsHandler(options, transform?)` is the same thing as a plain `(request, response, next)` handler for a module with its own server, and for tests.

- **The manifest** at `WELL_KNOWN`, and at `LEGACY_WELL_KNOWN` through `legacyManifest`. With `build`, the manifest served carries it.
- **The page** at `/app`, `/app/` and `/` (plus `pages`), through `transformIndexHtml`, with `cache-control: no-store` (the ticket is per process; a cached page has every write refused) and `content-security-policy: frame-ancestors …` from `frameAncestors()`. Eight modules sent no `cache-control`; they gain it.
- **`answer(method, path, query, body, ticket)`** for `/healthz`, `/mcp` and `/api/*` (or whatever `ours` says). Sync or a promise. `null` hands the request on to Vite. A `Reply` is `{ status, body, headers?, raw? }`: `body` is sent as pretty-printed JSON, `null` sends none, and `raw: { bytes, type }` sends bytes or text as they are (a PDF, `text/plain`).
- **`stream(method, path, query, emit, ticket)`**, asked first: `{ reply }` refuses with JSON, `{ close }` opens a server-sent-event stream (`: open`, events emitted while it was deciding, then each event; a `: beat` comment every 25 s; `close()` when the reader goes away), `null` is not a stream door. `emit(data, name?)` — a name makes it a named event.
- With `build`: the health check's answer gains `build`, and every answer carries `x-module-build`.

Everything that is not theirs goes to `next()` with the request unread, which Vite needs.

## Asking your own server (`client/ask.ts`)

`ask(path, { method?, query?, body?, signal? })` never throws and never returns a `Response`. It resolves to `{ ok: true, status, body }` or `{ ok: false, kind, status, error, body }`, where `kind` is exactly one of:

| kind | when | `error` |
|---|---|---|
| `down` | `fetch` threw: nothing answered | `This app’s own server is not answering.` |
| `stale` | a 403 marked `refused: 'ticket'` | `This page is older than its server — reloading…` |
| `refused` | any other non-2xx, or a 2xx whose body says `ok: false` | the server's own `error` sentence (or JSON-RPC's `error.message`), else `This app’s own server answered <status>.` |

So no module is silent and none shows a raw "Failed to fetch". A refusal keeps its `body`, so a conflict's payload is still readable. `answered(asked)` returns the body or throws `AskFailed` (with `kind`, `status`, `body`) for code written around `try`/`catch`.

Every outcome also updates one fact per page, `serverStanding()`: `up`, `down`, or `stale`. `stale` does not heal — the ticket in the document will never be right again. It is also set, without failing the request, when an answer's `x-module-build` is not the stamp of the build printed into the page: the server answering is another process, so a read from it is a true read and every write from this page would be refused. `useServerStanding()` is that fact as React state.

`follow(path, onEvent, { query?, onAttachment? })` is the server-sent-event side: JSON events, `connecting` / `attached` / `detached` said out loud, and a reconnect with a growing pause when `EventSource` has given up for good (which is what a server that is still starting looks like).

### A stale page reloads itself, once

`reloadWhenStale()` watches the standing and, 900 ms after it turns `stale` (long enough to read the sentence), calls `reloadStalePage()`. `useHost` arranges this by default (`reloadWhenStale: false` turns it off) and `Cover` does for `state="stale"`. A reload gets a fresh document, and with it the new ticket and build.

The loop guard: `reloadStalePage` records the time in `sessionStorage`, or in `history.state` where there is no storage (an opaque origin), and does nothing if it reloaded within the last ten seconds. A fresh page is never stale against the process that served it, so the guard is for a fault — a cached document, a proxy rewriting headers — not for the ordinary path.

What a reload costs is whatever the page held unsaved. A write that was refused for the ticket could not have succeeded from that page in any case.

## The host hook (`client/host.ts`)

`useHost<Kept>(id, events?, options?)`. Built on `connect` with the same three orderings as `useKehikot` (connection stored before it listens; handlers read through a ref; the discarded mount's answer ignored) and nothing else in common, so `useKehikot` can be retired without touching it.

It returns `where` (`listening` → `unhosted` after `GREETING_GRACE_MS`, or `hosted`), the whole `context`, and flattened: `project`, `projectPath`, `epic` (each `null` for an empty string too), `passage`, `containers`, `parts`, `selection`, `chosen` (the filter choice), `theme`; then `kept` and `remember(next)`; `point(passage)`; a stable `request`; `resize`, `filters`, `clearable`, `refreshable`, `connection`.

- **Theme.** Every context puts `dark`/`light` on `<html>` (both spelled, so a host asking for light over a machine set to dark gets it) and remembers it for the next load's first paint. `theme` before the greeting is what the document already decided. No module toggles classes by hand.
- **Kept state.** `options.kept` is a codec, `{ read(state): Kept | null, write(kept): string }`; the default is JSON. `read` returning `null` for anything unrecognised is the point: an older version's string gives first-run behaviour. The kept value is set before the context on the greeting, so the first hosted render already has it. `remember` holds the value and sends `state.set`, fire and forget; it does not debounce (the one module that needs that debounces its caller).
- **Events.** `onGoto`, `onEvent`, `onHello`, `onContext`, and `onClear` / `onRefresh`. The last two matter: `useKehikot` documents that those presses arrive in its `events` and does not pass them to `connect`, so through that hook they never arrive. Here they do.
- **Stale pages** reload, as above.

What stays in a module: anything it derives (`pickedParts` headings, a JSON string of containers for an effect dependency), its own reading state machines (`sight` in references, diff, tests, paper), and anything it asks the host (`live.get`, `tracker.get`, `epics.list`) — those go through `request`.

## The not-ready screen (`client/cover.ts`)

`<Cover state name? onRetry? detail?>`: the kehikko mark, one sentence, optionally a second smaller line, and for `down` a Try again button. `coverFor(host, { project?, epic? })` says which state a host's standing calls for, or `null`.

| state | sentence |
|---|---|
| `waiting` | Waiting for Kehikot… |
| `unhosted` | Nothing is framing this page — open *Name* in Kehikot. |
| `no-project` | No project is open — open one in Kehikot. |
| `no-epic` | No epic is open — open one in Kehikot. |
| `loading` | Loading… |
| `down` | *Name*’s own server is not answering. + **Try again** (`Slides’ own server…` for a name ending in s) |
| `stale` | This page is older than its server — reloading… |

They are `COVER_WORDS[state](name)`; a module with a better sentence for a state passes it as the child. `coverFor` checks `listening` first, which is the fix for the five modules that drew "no project" (or the unhosted screen) for the first second of every load.

The look matches the host's `ModuleCover`: the same mark, muted, centred, one sentence; 14px with a 40px mark in an ordinary container, scaling down to 12px and 28px in one 220 wide. The mark is drawn finished and breathes only in the states where something is on its way (`waiting`, `loading`, `stale`); it does not draw itself in, because the host's cover has just done that and a container should not animate twice on the way to its content.

**Styling: one injected stylesheet, not inline styles and not Tailwind classes.** Inline styles cannot say three things this needs: a different fallback colour under `.dark`, the breathing keyframes with `prefers-reduced-motion`, and dropping the mark in a frame too short for it (`max-height: 150px`; a module's frame is its viewport). Tailwind classes would need every module's build told to scan this package. So `Cover` adds one `<style id="kehikot-cover-style">` to the document the first time it is drawn (in an insertion effect, so the first frame is styled): about 1.5 kB of unlayered rules under one class, which need no configuration. Colours are the module's own tokens where it has them — `var(--muted-foreground, …)`, `--foreground`, `--border` — with themed fallbacks.

It fills a parent that has a height or is a flex column, and is as tall as its content otherwise, so a module that reports its content height to the host does not feed the cover's height back into itself.

## Build identity (`build.ts`, `serve/build.ts`, `client/build.ts`)

A module's server establishes, once per process, what it is built from:

```ts
{ version: '1.0.0',                        // the module's own version
  commit: '44c15cb9…' | null,              // the checkout's commit at start; null when not a git checkout
  started: '2026-10-09T15:14:31.032Z',     // when this process started: its identity
  protocol: '0.35.0' }                     // PACKAGE_VERSION of this package, as the module has it installed
```

It answers one question — *is this the same server process, and the same code, as before?* — and it is said in four places:

| where | how | who reads it |
|---|---|---|
| the manifest | optional `build` | a host, when it discovers the module |
| `/healthz` | `build` added to the answer by `doors()` | a host, any time: the server *now* |
| the page | `<script id="build" type="application/json">` beside the ticket | the page itself (`pageBuild()`) |
| `kehikot.ready` | optional `build`, repeated by `connect` from the page | a host: the build *this page* was served by |

plus `x-module-build: <buildStamp>` on every answer from the doors, which is what the page's `ask()` compares.

`compareBuilds(before, now)` is `same` (one process), `restarted` (another process, same version, commit and protocol package), `changed` (another process, other code) or `unknown` (a side did not say). `buildIsStale(page, server)` is true for `restarted` and `changed`. `sameProcess`, `sameCode`, `buildStamp`, `describeBuild` and `readBuild` (never throws) are the parts.

`commit` is read with `git rev-parse HEAD` when the process starts. Under Vite dev the code served can move on without a restart; the identity says what the process started from, which is the thing a host compares with the checkout.

**Compatibility.** Both new fields are optional and `.catch(undefined)`: a malformed `build` reads as absent and never fails a manifest or a handshake. `manifestSchema` and `readySchema` are plain `z.object`s, not strict, so a host on an older copy of this package strips the unknown key and behaves exactly as before. `PROTOCOL` is unchanged.

### For the host (not built here)

- **Is this page older than its server?** `buildIsStale(ready.build, health.build)`, where `ready.build` came with the page's `kehikot.ready` and `health.build` is `GET <origin>/healthz` now. That is the page-side seam, `isStale()` in the host's `src/host/standing.ts`.
- **Is the server older than its checkout?** Compare `health.build.commit` (or `manifest.build.commit`) with the checkout's `HEAD` for the registered directory, and `health.build.version` with the version the checkout declares. That is the server-side seam, `Staleness.staleness(id)` in the host's `server/stale.ts`.
- **Which protocol package is a module built with?** `build.protocol`, to show beside each module.
- **Did a restart happen?** `compareBuilds(lastSeen, health.build) !== 'same'`.
- **Exact first paint.** Append `?theme=dark|light` (`THEME_PARAM`) to a module's entry address when framing it.
- A page that uses `useHost` or `Cover` reloads itself when it notices; a host need not reload the frame for that.

## What the plugin and the hook do not cover

- **A ticket carried in the request body** (paper, terminal) or a ticket element under another id (`kehikot-paper-ticket`, `terminal-ticket`, `orchestrator-ticket`): those modules move to the header and the shared id when they move onto `ask()`.
- **A WebSocket** (terminal) needs `server.httpServer`; it stays a plugin of its own beside `doors()`.
- **An extra frame ancestor** (references adds one origin): set `KEHIKOT_ORIGINS`, or keep its own header.
- **A module that is not this shape at all** (atlas: Vite root `page/`, root element `#atlas`, its own wire client, a Bun production server). `doorsHandler` and `pageDocument` are usable from its `server.ts`; nothing here was tried against it.
