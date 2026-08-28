# Why this package ships TypeScript source

`main`, `types` and `exports` all point at `src/index.ts`. There is no build
step between this repository and the programs that depend on it.

## What it replaced

They used to point at `dist/`, which was correct for a package published to npm
and wrong for this one, because `dist/` is in `.gitignore` and nothing ever
built it. Inside one repository that was invisible: every consumer had a Vite
alias and a `tsconfig` path mapping aimed at `src/`, so the fields nothing read
could say anything at all. The moment the consumers became separate
repositories, those aliases had to go, and the package's real entry points were
three paths to a directory that does not exist.

## Why source rather than a committed build

The obvious fix is to build `dist/` and commit it, which is the usual shape for
a package consumed straight from git. It was rejected, and for a reason this
project has now paid for three times: a checked-in build artifact goes stale
silently. It is served with a 200, it typechecks, it looks exactly like a
working dependency, and it is last week's contract. Every hour lost on this
codebase so far has been lost to something that answered confidently with the
wrong bytes — a stale `dist/` in the host, a stale `dist/` in a module, a path
that resolved to compiled JavaScript instead of a page.

Shipping source removes the artifact, and with it the possibility of the
artifact disagreeing with the source next to it. There is exactly one copy of
the contract and everything reads that copy.

## What it costs

A consumer has to be able to read TypeScript. Every consumer here is Bun or
Vite, and both do natively. A plain Node program could not `require` this
without a loader — which is a real limitation and an acceptable one, because no
such consumer exists and the day one does is the day this gets published to npm
properly.

`bun run build` still exists and still emits `dist/`. It is for that day:
`prepublishOnly` runs it, so an `npm publish` produces a conventional package
with declarations, and the `exports` above would be switched back as part of
that release rather than kept permanently pointing at a directory nobody builds.
