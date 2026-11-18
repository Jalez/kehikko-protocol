# A module installed ready-built: the bundle (2.102.0)

`kehikot-module-protocol/bundle` and `kehikot-bundle`: one archive per release that a host
downloads, checks, unpacks and runs, with no `node_modules`, no `bun install` and no build on the
person's computer.

## Why, from the person's side

- **Space and scanning.** Installed from git, every module is a checkout plus its own
  `node_modules`: measured on one person's Mac, 5.9 GB in 27 folders of tens of thousands of files
  each. Endpoint security on a work Mac scans every one of those files and every process start.
  A bundle is tens of files and about a megabyte.
- **Installs and updates that are a download.** Every install and update ran `bun install` and a
  page build on the person's machine, which is slow, needs the network for the registry, and
  broke (a page build that failed on install). CI has already built and tested exactly this
  commit; the bundle is what it built.
- **No update gap.** The new version is downloaded and checked while the old one keeps running.
  What the person waits for is a restart.

## What a bundle is

`<id>-<version>.tar.gz` on the module's GitHub release, with `<id>-<version>.tar.gz.sha256` beside
it (`<sha256>  <name>`, as `shasum -a 256` writes it). Unpacked, it is the module's folder as a
host runs it:

| Path | What |
|---|---|
| `serve.ts` | The server (`run` from `/run`), bundled with `Bun.build --target=bun`: every JS dependency inlined, written back under its own name. |
| `run.sh` | Written by `kehikot-bundle`: `cd` to its folder and `exec bun serve.ts`. No install, no build, no git. A host starts it as it starts every module's `run.sh`. |
| `dist/` | The page as `bun run build` built and stamped it in CI. |
| `bundle.json` | What the bundle says about itself (below). |
| everything else | The module's tracked files that a running module reads: `notes/`, `plugin/`, skills, shell hooks, `intro.json`, `package.json`, … |
| `node_modules/<pkg>/` | Only for a package that cannot be inlined (native code, or one the module declared): its runtime files and the prebuilt binaries of the platforms it has them for. |

What is left out: `test/`, `tests/`, `dev/`, the page's `src/`, `.github/`, configs (`vite.config.*`,
`tsconfig*.json`, `bunfig.toml`), the lockfile, `build.ts`, `register.ts`, the module's own
`run.sh`, `index.html`, `CLAUDE.md`, `*.test.*`. A module adjusts this in package.json:

```json
"kehikot": { "bundle": { "include": ["src/data.json"], "exclude": ["docs/"], "entries": ["tools/x.ts"], "external": ["playwright-core"] } }
```

`"enabled": false` with a `"why"` keeps a module on the git path: no bundle is built, and CI says
why.

### Scripts run by path

A module often runs a file of its own by path — a CLI in `bin/`, a hook a session runs, a status
line script. Each must still run from the bundle, so `kehikot-bundle` bundles in place, under its
own name:

- every tracked script that the server does not import and that imports something beyond the
  runtime's own (`node:`, `bun:`); one that imports nothing is copied as it is;
- every script the server does import whose file name another kept file spells in a string
  (`join(import.meta.dirname, 'bin', 'cli.ts')`, `"$here/cli.ts"`) — imports and comments do not
  count;
- whatever `kehikot.bundle.entries` names.

`import.meta.dirname` (and `dir`, `url`, `path`, `filename`) in a file below the folder of the
script it is bundled into is rewritten to the folder that file sat in, so
`join(import.meta.dirname, '..', 'notes')` still finds `notes/`.

### Native code

A dependency with a `.node` addon (or a `binding.gyp`) cannot be inlined. It is left external, and
it and its dependencies are copied under `node_modules/` without sources, docs, tests or other
platforms' binaries. `platforms` in `bundle.json` then names the platforms every carried package
has a prebuilt binary for (`prebuilds/<platform>/`, or `build/Release/` for the machine CI built
on); a host on another platform falls back to the git path. A package with no shared platform
fails the build.

Measured for the agent modules and Terminal (`node-pty` 1.1.0): `prebuilds/darwin-arm64` and
`darwin-x64` ship in the package, so their bundles carry about 400 KB of it and name
`darwin-arm64` and `darwin-x64`. (Under Bun those modules use Bun's own pty; `node-pty` is for the
Vite dev server under Node, so it is carried to keep the import resolvable, not because a bundle
calls it.)

### `bundle.json`

```json
{
  "format": "kehikot.bundle", "formatVersion": 1,
  "id": "kehikot.notes", "version": "1.7.0", "protocol": "2.102.0",
  "commit": "<the commit, 40 hex>", "entry": "serve.ts",
  "builtAt": "2026-11-18T09:00:00.000Z", "bun": "1.4.0",
  "platforms": null,
  "native": [{ "name": "node-pty", "version": "1.1.0", "why": "native" }],
  "files": { "serve.ts": { "sha256": "…", "size": 123456 }, "run.sh": { "sha256": "…", "size": 300, "executable": true } }
}
```

`files` lists every other file of the archive with its sha256 and size. `bundleInfoOf` checks the
shape.

### The commit, without git

`run` serves `dist/` only when its stamp names the commit the server is (docs/ready-built.md). A
bundle is not a checkout, so `commitOf(dir)` reads `bundle.json`'s `commit` first, and the stamp CI
wrote matches it. So **a module needs protocol 2.102.0 or later to be bundled** (`BUNDLES_SINCE`):
`kehikot-bundle build` skips a module on an older protocol and says so, and the module stays on the
git path until it pins a newer one. The smoke run catches the same thing from the other side: a
bundle whose page is refused fails.

## Checking and unpacking: `unpackBundle`

Every check is made before one byte is written:

1. **HTTPS and a known repository** are the host's: it downloads only from the official list's
   repository's releases.
2. **The size**: the archive is at most `BUNDLE_LIMITS.archiveBytes` (200 MB), and it may unpack to
   at most `unpackedBytes` (500 MB) and `files` (20 000) — counted while it inflates, so a small
   archive that would fill a disk is refused part way.
3. **The sha256** must be the one published beside it. No sha256, no unpack.
4. **Every entry** is a regular file (or a directory) at a relative path of plain segments. A
   symlink, a hard link, a device, an absolute path, `..`, `.` or an empty segment, a backslash or a
   NUL refuses the WHOLE archive (`readTarGz`); nothing is skipped quietly.
5. **`bundle.json`**: the right shape, the module and version that were asked for, runs on this
   platform, and lists exactly the files the archive holds, each with its sha256, size and
   executable bit.
6. **The target** must not exist; it is made, and every file is written with `wx` under the real
   path of the target. On any failure the target is removed.

The tar reader and writer are this package's own (ustar, gzip by `node:zlib`): no `tar` program is
run, and the writer is deterministic (sorted, no times, no owners), so the same files make the same
sha256.

## Building in CI: `kehikot-bundle`

```sh
kehikot-bundle build [<module dir>] [--out <dir>]   # needs bun install and bun run build first
kehikot-bundle smoke <archive>                      # start it once, as a host would
```

`build` refuses a tree with changes and a `dist/` that is not a stamped build of `HEAD`: a bundle
names a commit and has to be it. `smoke` unpacks into a scratch folder, starts `run.sh` with `HOME`
and every `KEHIKOT_*` location pointed at scratch folders (it registers itself in a scratch
registry and reaches no host or person), and requires that the manifest answer with the bundle's id
and version and that the page and its first script are served. The shared release workflow runs
both after the module's own tests and build and attaches the archive and its checksum to the
release; **a release whose bundle does not start fails before it is published.**

## Follow-ups

- **Signing.** The sha256 is published by the same release that publishes the archive, so it proves
  integrity in transit, not who built it. GitHub's artifact attestations (`actions/attest-build-provenance`,
  checked with `gh attestation verify` or the API) or a minisign key like the app updater's would tie
  a bundle to the module's own CI. Not done yet.
