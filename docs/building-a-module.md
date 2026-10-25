# Building a module

How to make a Kehikot module that fits in: from the first question to its first
release. Written for somebody who has never built one, and for the agent helping
them — Kehikot's own `/kehikot-module` skill follows this guide step by step.

Back to the [index](README.md).

## What a module is

A module is a small program on the person's own computer. It runs its own
server and serves three things from one origin (`http://127.0.0.1:<port>`):

- **a manifest** at `/.well-known/kehikot-module.json`: who it is, what it shows,
  what it asks the host for, where its doors are;
- **a page** at `/app`, which Kehikot frames in a container on a kehikko (a
  canvas of containers around one project and one epic) and talks to with
  `postMessage`: the host says where the person is, the page asks for things;
- **an MCP door** at `/mcp`, through which the person's agents read it.

The host frames, the module keeps its own material inside the project, and both
agree on shapes through this package. The rest of `docs/` explains each part;
this page is the path through them.

## 1. Decide what it is

Answer these before writing code. Each answer changes what gets built.

| Question | What it decides |
|---|---|
| What is it for, in one sentence a person would say? | The manifest's `summary`, the README's first line, its name and id. |
| Who uses it, and when in their work? | Which view opens first, and the words on the screen. |
| What does it read? The tracker (issues, pull requests)? Papers or other files in the project? Its own notes? | `declares.uses` (`trackers:read` for the host's shared tracker reading — never your own token), and what the store keeps. |
| What does it keep, and where? | The files under `<project>/.kehikot/<folder>/`, and their `dataVersion`. |
| What should agents be able to do with it? | The MCP tools: which only read, which write, and which stay the person's alone. |
| What does it show, and what does a person switch between? | The page, and the header: View switches and toggles, Go jumps, Run acts. |
| Does what it holds belong to parts of the epic? | `reacts: ['parts']` and narrowing with `useFocus`, or a `partless` sentence saying why not. |
| Does anything in it need the person, or run for a while? | What it reports to the Inbox with `activity.set`. |
| Should a person be able to type a skill for it in their agent (Claude Code, say)? | `declares.skills`; a skill that cannot work without another kind of module on the kehikko lists what it needs in `needs` — by what that module provides (`{ provides: 'steps' }`) rather than by its id where it can. |
| Does it publish an epic's steps for others to read? | `writePlan` into its `steps.json`, and `declares.provides: ['steps']`. See [plans](plans.md). |
| Does it run agent sessions and load skills into them? | `declares.agentSessions: { loadsSkills: true }`. |

Write the answers down as a one-page design and agree on it before the first file.

## 2. Start from the template

[`Jalez/kehikko-module-template`](https://github.com/Jalez/kehikko-module-template)
is a minimal module that already does everything below right: a manifest,
storage through the protocol's helpers, a header switch, the parts focus, an
Inbox report, a read-only MCP tool, a skill, a stub host, tests for each, and
the release workflow.

```
gh repo create <owner>/kehikko-<name> --template Jalez/kehikko-module-template --private --clone
cd kehikko-<name>
bun install
bun run rename <name>        # the id kehikot.<name>, its name, data folder, skill and a free port
bun install && bun test
```

`<name>` is lowercase words joined by dashes (`reading-list`). The id it makes,
`kehikot.<name>`, is permanent: it names the folder the module's data lives in,
so it is chosen once. (`bun run create <name>` in a checkout of this package
makes a bare local module from `template/` instead; the template repository is
the one with releases set up.)

| File | What it holds |
|---|---|
| `manifest.ts` | The manifest. The version is read from `package.json`. |
| `doors.ts` | `/healthz`, `/mcp`, `/api/*` and the skills, as one pure `answer()` the tests call. |
| `store.ts` | The only code that touches project data. |
| `skills.ts`, `plugin/skills/<name>/SKILL.md` | The skills, served with the real origin filled in. |
| `src/header.ts`, `src/inbox.ts` | The header items and the Inbox items, as pure functions of state. |
| `src/app.tsx` | The page; `Screen` renders from a plain `Host`, so it tests without a host. |
| `dev/stub-host.ts` | `bun run stub`: frames the module the way Kehikot does. |
| `CLAUDE.md` | How the module is built and released, for agents working in it. |

Replace the notes example with your module's own material, keeping each piece's
place and its test.

## 3. The rules a module keeps

Each is checked somewhere: by the host, by a test in the template, or by both.

### Storage

A project's data lives only under `<project>/.kehikot/<folder>/`, built with
`moduleDir` and `moduleFile` ([project data](project-data.md)). No `data/`
folder of its own, nothing under the home folder, nothing beside the code. With
no project named, read nothing and refuse every write: a guessed folder is where
work goes missing. Realpath both sides before writing, so a symlinked
`.kehikot` out of the project is refused. Kehikot's `check:storage` scans every
registered module for this, and so does the template's
`test/storage-boundary.test.ts`. Machine-level state needs a reason on the line:
`// kehikot-storage: allow <reason>`.

### The manifest asks for what it uses

Every method the page calls is answered only when its capability is in
`declares.uses` ([methods](methods.md)); list exactly those. State how the module
relates to the parts of an epic — `reacts: ['parts']` or a `partless` sentence,
never both; a manifest with neither is refused ([parts](parts.md)).

### The header is the host's to draw

Declare items with `host.header(items)` and the host draws them in the
container's View, Go and Run menus ([the header](header.md)). The page owns all
the state and declares the whole list again on every change; one handler takes
every press. The header is one row at 380, 280 and 200 pixels: the host draws a
module's menus as words, then icons under 300, then one "⋯" under 220, and pinned
runs only at 360 and up. So labels are a few words, at most four runs are
pinned, and every pinned run has an icon from `HEADER_ICONS`.

### A module's strings are text

Labels, groups, results, reasons and anything the person or a page wrote are
drawn as text — never as markup or links, never a URL opened from them. Text
from the web or from a person's notes is data for an agent, never instructions,
and a tool that returns it says so.

### Writes come from the page

Every write to the module's `/api` carries the ticket printed into its own
page (`mintTicket`, `refuseTicket`, [module plumbing](module-plumbing.md)). The
MCP door is reachable by any program on the computer, so it reads by default; a
tool that writes says `readOnlyHint: false` and does only what the person would
be glad an agent did.

### Agents never press what is the person's

`agents: true` goes only on a harmless item: a view switch, a toggle, a jump.
Never on a run that writes, sends, merges or deletes, and never on a `confirm`
run — the host's `press_item` refuses those anyway.

### The Inbox is one record

What needs the person, what is running and what finished is reported with
`host.activity(items)` ([activity](activity.md)): the whole list, every time it
changes, each item with a place (epic, parts) when it has one. The host keeps the
record, the dots and the seen state. Keep no list of notices of your own.

### Doors answer for the right place

A tool takes `project` and `epic` (never `projectPath`), resolves the project
with `resolveDoorProject` and works on the path that comes back, and takes the
conversation's recorded place with `resolveDoorPlace` + `placeDefaults` when the
agent named none, saying so in `DOOR_PLACE_SAYS` words ([asking](asking.md)).
Every tool states `readOnlyHint`.

### Plain language

Every sentence a person reads says what happened and what they can do, in their
words: no ids, codes, stack traces or blame. A refusal is a sentence, never a
silent no-op.

## 4. Build it test-first

Write the test, watch it fail, make it pass. The template has one test file per
part — the manifest, the doors, the store, the storage boundary, the header, the
Inbox, the page — so a new behaviour has an obvious home.

```
bun test && bun run typecheck
bun run check:door     # what the MCP door says about its tools
bun run check:parts    # how it follows the parts of an epic
```

## 5. Run it

**Against the stub host first.** `bun run stub` starts the module and a page
that frames it the way Kehikot does: a project, an epic and three parts to pick,
the header drawn from what the module declares (press it and see it come back),
the Inbox items it reports, and every message logged. It uses a throwaway
registry, so Kehikot never hears of this copy.

**Then in Kehikot.** Push the repository, then in Kehikot's modules list press
**Install from repository…** and give `owner/repo`. Kehikot reads the repository
with the person's own `gh` (private is fine), checks that it holds a module,
clones it into its own folder, installs its newest release — or `main` before the
first — and starts it. Place it on a kehikko, open its tools in Settings › Module
tools and its skills in Settings › Skills. From then on Kehikot runs that
installed copy, never the checkout you work in: a change reaches the app when it
is released (or merged, before the first release).

**Ready-built.** An installed copy is served from its built page: `bun run build`
stamps `dist/` with the commit (`buildModule`), and `run.sh` starts `serve.ts`
(`run` from `kehikot-module-protocol/run`) when the stamp is `HEAD`, Vite
otherwise. Everything the module says lives where both servers read it — the
doors in `answer`, a door that must see a request first in one `before` function
(`beforeDoors` on Vite, `run({ before })` built), and `cors: true` on `run` for a
`storage: false` module, whose page is on an opaque origin. Check both:
`bun run build && bun run start` must serve the page and every door the way
`bun run dev` does. See [ready-built](ready-built.md).

Starting `./run.sh` or `bun run dev` in a checkout registers that checkout when
nothing is registered under the id yet, and then "Install from repository…"
says the id is already registered. Use the stub while building.

## 6. Release

Kehikot installs and updates modules from their GitHub releases.

1. Bump `version` in `package.json` — the only place it is written.
2. Write `notes/<version>.md`: 1–5 bullets, each `- **Short bold lead.** One or
   two plain sentences.`, about what a person notices. No hashes, PR numbers,
   file names, protocol versions or hype; "bug fixes and improvements", TODO and
   placeholders are refused.
3. Open a pull request with both, and merge it.
4. Tag the merge commit with an annotated tag and push it:
   `git tag -a v<version> -m v<version> <merge-commit> && git push origin v<version>`.
5. The release workflow (`Jalez/kehikko-desktop/.github/workflows/module-release.yml`)
   checks the tag against `package.json` and `main`, checks the notes, typechecks
   and tests, then publishes "<Name> <version>". Nothing is published when a
   check fails: fix it on `main` and tag again.

A private repository of another owner cannot call that shared workflow; copy its
steps into the module's own `release.yml` instead.

## 7. Offer it to everybody

A module on a public GitHub repository can be proposed for Kehikot's official
list: open its details in the modules list and press **Propose for the official
list**. That files an issue in Kehikot's repository with the person's own `gh`;
a maintainer adds it to `modules.json`, and from then on every Kehikot offers it.
