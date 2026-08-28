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

## 3. `dist/`, built by `prepare` on install

The arrangement that would have had no artifact in the repository AND no
type-stripping problem: gitignore `dist/`, and let `prepare` build it on the
consumer's machine from whatever commit they pinned.

It does not run. A git dependency is installed without devDependencies, so
there is no `typescript` in it, so there is no `tsc` for `prepare` to call. The
install completes cleanly and the package arrives with no `dist/` at all —
which is failure mode 1 again, this time on the consumer's disk.

## 4. `dist/`, committed

Which is what it does now. Consumed straight from git, **the repository has to
be the artifact** — there is nothing on the consumer's side able to build it.

The objection to this is real and is the thing this codebase keeps paying for: a
checked-in build goes stale silently. A stale `dist` in the host, a stale `dist`
in a module, a route resolving to compiled JavaScript instead of a page — every
one answered confidently with the wrong bytes and none of them errored.

So staleness is made loud rather than trusted away. `bun test` is `tsc && bun
test`: it rebuilds `dist/` before running a single test. Edit `src/`, run the
tests as you would anyway, and a `dist/` that no longer matches shows up
immediately as a dirty working tree. Committing a stale build now requires
never having run the suite.

That is weaker than a guarantee and it is the strongest thing available at this
size. The real fix is publishing to npm, where `prepublishOnly` builds and the
consumer receives a compiled package with no git in the path at all — and this
is ready for that day without changes.

## For a real npm release

`prepublishOnly` runs the same build, so `npm publish` produces a conventional
package. Nothing here has to change for that; `files` already carries `dist` and
`src`, the latter so source maps resolve for anybody debugging into it.
