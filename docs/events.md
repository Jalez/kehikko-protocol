# A page never polls its module: `events` and `subscribe` (2.32.0)

A module tells its page that something changed over one held connection. The page subscribes to a
topic; the module publishes to that topic where its state actually changes. Nothing asks on a
clock.

Back to the [index](README.md).

## The rule

**A page never polls its own module.** No `setInterval` around `fetch('./api/…')`, no
`refetchInterval`, no re-read on a timer. Use `events` on the server and `subscribe` on the page.

A page on a timer is the most common source of traffic on a person's machine: every open container
of every kehikko asks its module, every few seconds, whether anything changed, and nearly always
nothing has. A module's server often turns each of those asks into more work — a disk read, a
question to the host, a forge call — so one page left open in a background window costs all day.

What polls on purpose stays as it is: a module's server reading a source outside the machine (a
forge, a remote) on its own budget. Calls a page makes to the HOST (`host.ask`) are the host's.

## The server: `events` and `publish` (`/serve`)

`events(route)` is the doors' own `stream` door with topics on it — not a second mechanism. It goes
in `doors({ stream })` and `run({ stream })`, so a stream is behind the doors' gate and `ours`
routing on Vite and on `run` alike, with their headers (`text/event-stream`, `no-store`,
`x-accel-buffering: no`), the opening comment that sends the headers at once, a comment every
`beatMs` (25 s) so nothing in between closes it, `setNoDelay`, and the close when the reader goes
away.

```ts
import { events, publish } from 'kehikot-module-protocol/serve'

const stream = events((path, query) =>
  path === '/api/events' ? { topic: `board:${query.get('project')}`, initial: () => readBoard(query.get('project')) } : null,
)

// vite.config.ts
plugins: [serves(…), doors({ manifest, answer, stream }), react()]
// serve.ts
await run({ …, answer, stream })

// wherever the board changes: a write, a file watcher, a finished job
publish(`board:${project}`, readBoard(project))
```

- **`route(path, query, ticket)`** names the topic and the state to start from, or `null` for "not an
  event door" (the request goes on to `answer`). Only `GET` is routed.
- **`initial`** is a value, or a function asked as the stream opens (it may be async; what is
  published meanwhile waits behind it, in order). It is sent first, every time a stream opens, so a
  page that reconnects — after a drop, or after being hidden — is never behind.
- **`closed`** on the route is called once when that stream closes, after the topic forgot it, so
  `watching(topic) === 0` there means the last page left: where a module stops its file watcher.
- **`publish(topic, data, name?)`** sends `data` (JSON) to every stream on `topic` and returns how
  many it reached. Publish the new state when it is small; publish a hint (`{ changed: 'cards' }`)
  and let the page read the door it already reads when it is large.
- **`watching(topic?)`** is how many streams follow a topic (or all of them): 0 means no page is
  watching, and work only a page would see can wait.
- **`MAX_EVENT_STREAMS`** (64) per process, over every topic. Past it a stream is a 503 with
  `retry-after`, and `subscribe` tries again later: a page that leaks streams cannot take a module's
  sockets.
- **`streams(…doors)`** puts a module's own stream door (a log it tails) beside its topics: the first
  that answers wins.
- The topics are kept on `globalThis` per process, so server code loaded twice (Vite's config and an
  `ssrLoadModule`) still publishes to the same streams.

Publish **where the state changes**, not on a timer of the server's own: in the write the page or
the MCP door made, in a file watcher over the module's folder in `.kehikot/` (an agent writing a file
by hand is a change too), when a job finishes. A server that polls to find out what to publish has
only moved the poll.

## The page: `subscribe` (`/client`)

```ts
import { subscribe } from 'kehikot-module-protocol/client'

useEffect(() => subscribe(`./api/events?project=${encodeURIComponent(project)}`, (board: Board) => setBoard(board)), [project])
```

- Each event's data, parsed as JSON, is handed over: the module's `initial` first, then each
  `publish`. A named event is heard when it is listed in `events`, as with `follow`.
- **Closed while `document.hidden`**, opened again when the page is shown, which delivers `initial`
  again: a hidden page holds no connection and misses nothing. `whileHidden: true` keeps it open.
- A stream that drops is reopened with a pause, doubling to 15 s (`follow`). `probe: true` asks the
  health check each time it drops, so the page learns its server stopped: a page that subscribes
  needs no `watchServer`.
- Returns the function that stops it for good.

## Testing that nothing polls

A module's tests hold the page to one request for as long as it is open: render it with a fake
`EventSource` and a counting `fetch`, advance a fake clock an hour, and count. `test/v2-32.test.ts`
here does the same for `subscribe`, and runs `events` through `doorsFetch` (what `run` serves) and
`doorsHandler` (what Vite mounts) on real sockets.
