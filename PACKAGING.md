# How this package is consumed, and why it took three tries

`exports` points at `dist/`. `dist/` is **not** in the repository. It is built
by `prepare`, which runs when a consumer installs this package — so what a
consumer gets is compiled from the exact commit it pinned, every time.

Three arrangements were tried. The two that failed are worth writing down,
because each looked correct until something specific broke.

## 1. `exports` pointing at a `dist/` nobody built

The original. `main`, `types` and `exports` all named `./dist/index.js` and
friends, `dist/` was gitignored, and no build ever ran. Inside the monorepo this
was invisible: every consumer had a Vite alias and a `tsconfig` path aimed at
`src/`, so the package's own entry points were never read by anything. Three
paths to a directory that does not exist, and a green test suite.

It surfaced the moment the consumers became separate repositories and the
aliases had to go.

## 2. `exports` pointing at `src/`

The obvious correction: ship TypeScript, let Bun and Vite compile it, delete the
build artifact and with it any chance of the artifact disagreeing with the
source. Every consumer here is Bun or Vite. Both do read TypeScript.

It broke on something neither of those compiles: **`vite.config.ts` is loaded by
Node**, and Node refuses to strip types from anything under `node_modules`.

```
ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING: Stripping types is currently
unsupported for files under node_modules, for
".../node_modules/roadmap-module-protocol/src/index.ts"
```

That is not an edge case for this package. A module's Vite config is exactly
where the protocol is needed — `WELL_KNOWN` for the manifest route, the manifest
itself for the middleware that serves it — so shipping source made the package
unusable in the one file every module author has to write.

## 3. `dist/`, built by `prepare`

Which is what it does now, and it is the only one of the three with no stale
artifact anywhere in it:

- **Not committed.** `dist/` stays gitignored. There is no build output in the
  repository to drift away from the source beside it.
- **Not absent.** `prepare` runs on install, including for a git dependency, so
  a consumer that pinned commit `abc123` gets `dist/` compiled from `abc123`.
- **Real JavaScript with real declarations**, so Node can load it, which means a
  `vite.config.ts` can import it.

Staleness is the failure this codebase keeps paying for — a stale `dist` in the
host, a stale `dist` in a module, a route that resolved to compiled JavaScript
instead of a page. Every one of them answered confidently with the wrong bytes
and none of them errored. Building at install time is what removes the window in
which that can happen: there is never a moment where the built thing and the
source it came from are two different versions.

## For a real npm release

`prepublishOnly` runs the same build, so `npm publish` produces a conventional
package. Nothing here has to change for that; `files` already carries `dist` and
`src`, the latter so source maps resolve for anybody debugging into it.
