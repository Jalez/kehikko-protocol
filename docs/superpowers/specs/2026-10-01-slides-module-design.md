# Slides module, module template, and section-level passages — design

Date: 2026-10-01
Status: parts 1–2 approved in conversation; parts 3–6 written from the decisions below, open to correction.

## Intent (agreed)

- **What:** a Slides module (think PowerPoint) for **presenting a paper** — a thesis defence, a conference talk. A deck follows the paper's structure; an agent can draft it from the paper; the person edits it.
- **Same frame:** it is an ordinary kehikko module — registered, framed by the host, themed by `roadmap.context`, data under `<project>/.kehikot/slides/`.
- **Follows the paper:** scrolling the paper moves the slides to the slides linked to the section being read; stepping through slides turns the paper to that section. Same mechanism as learning: the protocol's `passage`.
- **Feels the same:** shadcn + Tailwind v4, the same header menu grammar as the host (switcher, pencil/F2 rename, two-press remove, "new …" last).
- **Faster next time:** a module template and a `create` command, built first; Slides is the first module made with it.

### Decisions taken (one question at a time)

| Question | Decision |
|---|---|
| Purpose | Presenting the paper |
| Editing | Markdown with live preview |
| Following granularity | Section-level (paper change) |
| Direction | Both ways; paused while presenting full-screen |
| Present / export | In-app presenting + presenter view + PDF |
| Organisation | Several decks per project, optionally tied to an epic; seamless switching |
| Agent edits | Direct, with an undo trail |
| Rendering approach | React components over Markdown (react-markdown, KaTeX, CodeMirror), Tailwind-styled |

### What exists today (from exploration)

- Paper publishes `passage = {path, page}` on scroll (page granularity), and `{path, page, from, to, quoted}` only when text is highlighted (`kehikko-paper/src/use-published-passage.ts`).
- The host broadcasts `context.passage` to every framed module (`kehikko/src/host/context.ts`); there is no per-pair wiring.
- A passage with `from`/`to` means "turn here and **mark this exact range**" to the paper (`kehikko-paper/src/reader/pointed.ts`); without a range it is "holding" and must not move the page.
- Learning narrows by path, and by range overlap only for highlights. Questions are linked to `{path, start, end, quote}`, created by agents over MCP.
- No module offers the paper's section list to others.

## Part 1 — Order of work

1. **Protocol** (`kehikko-protocol`): module template + `create`; `passage.section`.
2. **Host** (`kehikko`): pass `section` through; allow `fullscreen` on module frames.
3. **Paper** (`kehikko-paper`): publish the current section on scroll; `list_sections` MCP tool; turn to a section named without a range.
4. **Slides** (`kehikko-slides`, new): created with the template.

Learning is not changed in this round (it can adopt `section` later in a few lines).

## Part 2 — Module template and `create`

- `kehikko-protocol/template/`, shipped in the package (`files` includes it). Generalised from notes/learning:
  `run.sh`, `register.ts`, `bunfig.toml`, `tsconfig.json`, `components.json`, `vite.config.ts` (with `serves()`), `manifest.ts` (placeholders, `storage: true`), `doors.ts` (manifest route, `/app`, `/healthz`, `/api`, `/mcp` with one example tool), `store.ts` (JSON store under `.kehikot/<folder>/`, write ticket, realpath containment), `page/document.ts`, `src/` (lean host-connection hook, placeholder screen with a header, shadcn button/badge/input/dropdown-menu/tooltip/dialog, the shared menu pieces), `test/` (setup + manifest/doors/store/render tests that pass as generated).
- Placeholders: `__MODULE_ID__` (`roadmap.<name>`), `__MODULE_NAME__`, `__MODULE_FOLDER__` (`<name>`), `__MODULE_PACKAGE__` (`kehikko-<name>`), `__MODULE_PORT__`.
- Command: `bun run create <name> [--dir <path>] [--register]` from a protocol checkout (`bin/create.ts`, also exposed as a package `bin`). It validates the id against `MODULE_ID`, picks the next free port in the 10-apart scheme above every registered module's port, copies and fills the template, `git init`, `bun install`, runs the new module's `bun test`, and with `--register` writes the registration. No GitHub repo is created.
- The protocol's own test suite generates a module into a temp dir and runs its tests and typecheck, so the template cannot drift from the protocol silently.

## Part 3 — `passage.section` (protocol) and host passthrough

- `passageSchema` gains an optional, nullable field:
  `section: { title: string (≤ LIMITS.QUOTE), from: int ≥ 0 | null, to: int > from | null } | null`.
  Meaning: *the reader is in this section of `path`*. It is independent of `from`/`to`, which keep meaning *this exact text is pointed at*.
- Additive: a passage without it is unchanged; old modules ignore it. Version bump to 0.21.0; `dist/` rebuilt and committed.
- **Host:** its own passage validation keeps `section` (otherwise it would strip it). Module iframes get `allow="clipboard-write; fullscreen"`.

## Part 4 — Paper

- **Publishing:** while scrolling, the published passage also carries `section` = the heading the reader is under (title, and the section's byte span in that file). `from`/`to` stay null unless text is highlighted. Dedupe and debounce as today. No marking happens anywhere because of `section`.
- **Turning to a section:** `pointedAt` handles a passage that names `section` and **no range**: find the heading in that file whose text equals `section.title` (first match; the source span narrows ties when present), turn to it, and mark the heading line only. A passage with neither range nor section stays "holding" (no move), exactly as today. The echo guard covers it like any other passage.
- **`list_sections` MCP tool:** `{epic}` → `[{path (project-relative), title, level, from, to}]` from the existing outline, so agents can link slides while drafting.

## Part 5 — Slides module

### Data

- One Markdown file per deck: `<project>/.kehikot/slides/<deck-slug>.md`. Front matter: `title`, `epic` (optional slug), `aspect` (`16:9` default).
- Slides are separated by a line containing only `---`. A slide may start with an HTML comment of directives:
  `<!-- layout: two-column; section: chapters/2_bridge.tex | Bridging the gap -->`
  - `layout`: `title`, `bullets` (default), `two-column` (split on a `|||` line), `image`, `quote`.
  - `section`: `<project-relative path> | <heading title>` — the paper section this slide belongs to. Title-based so it survives edits to the paper.
- Speaker notes: everything after a line `Notes:` within a slide.
- Undo trail: `<project>/.kehikot/slides/history.json` — for every write made through MCP, the deck's previous text, with time, agent name and a one-line summary. Last 50 per deck.

### Screen

- **Header** (same strip style as other modules): deck switcher using the shared menu grammar (decks of the open epic first, then others; pencil/F2 rename, two-press delete, "new deck…" last), a "following the paper" indicator, **Present**, **Export PDF**, and **History** (agent edits, each with Undo).
- **Body:** a thumbnail rail on the left; CodeMirror 6 Markdown editor in the middle; the rendered current slide on the right, scaled to fit. The current slide follows the editor caret, and clicking a thumbnail moves both. Narrow containers collapse to Edit / Preview tabs.
- **Linking a slide to a section:** a "Link to the section you're reading" button on the current slide uses `context.passage.section` (scroll the paper to the section, press once). A linked slide shows a small section chip; the chip can unlink. Agents link via MCP using `list_sections`.

### Rendering

- `react-markdown` + `remark-gfm` + `remark-math`/`rehype-katex` + a syntax highlighter; layouts are small React components styled with the module's Tailwind tokens, so light/dark follows `context.theme`.
- Slides render at a fixed 1280×720 logical size and are CSS-scaled to the container, so preview, presenting and PDF are pixel-identical.

### Following the paper (both ways)

- **Paper → slides:** when `context.passage.section` changes and the deck's open slide is not already in that section, go to the first slide whose `section` matches (same path, same title). No match: stay put, and the indicator says "no slides for *<title>*".
- **Slides → paper:** when the person moves to a slide (thumbnail, keys, caret) that has a `section`, publish `passage.set({path: <absolute>, page: null, from: null, to: null, quoted: '', section: {title, from: null, to: null}})`. The paper turns to that heading (Part 4).
- **Loops:** do not publish a move that was caused by following; do not follow the echo of our own publish (compare by path + section title).
- **Presenting:** while full-screen, following the paper is paused; publishing continues, so the paper keeps up with the talk.
- Manifest `uses`: `epics:read`, `passage:set`, `showing:set`, `state:keep`.

### Presenting and PDF

- **Present:** full-screen (Fullscreen API) of the slide stage; arrows/space/PageUp/PageDown, Home/End, Esc to leave, `B` to blank.
- **Presenter view:** a second window at `/app?presenter=<deck>` showing current slide, next slide, notes and a timer. Both windows sync through the slides server (a small server-sent-events channel), so they also sync if one is in the desktop app and one in a browser.
- **PDF:** a print view at `/print?deck=<slug>` — one slide per page via `@page { size: 1280px 720px }` — printed by the browser.
- **Risks to verify first** (see below): full-screen, new windows and printing inside the desktop app's web view.

### MCP door (agents)

- `list_decks {epic?}`, `read_deck {deck}`, `write_deck {deck, markdown, summary}` (whole-deck replace, recorded in history), `edit_slide {deck, index, markdown, summary}`, `create_deck {title, epic?}`, `link_slide {deck, index, path, title}`.
- Guidance tells agents to use the paper's `list_sections` and `read_paper` to draft a deck, one or more slides per section, with speaker notes.

## Part 6 — Testing

- Protocol: schema tests for `section`; the generated-template test (tests + typecheck of a fresh module).
- Host: context keeps `section`; frames carry `fullscreen`.
- Paper: section publishing from scroll position; `pointedAt` for section-without-range; `list_sections`.
- Slides: deck parser/serialiser round-trips (directives, notes, layouts); following/publishing logic as pure functions with the loop guards; store and MCP door (history + undo); render test of each layout; one live check in the app with paper + slides side by side.

## Risks, checked first in Slides

1. **Full-screen inside the desktop app.** WKWebView may need element full-screen enabled; if it can't be, present by filling the window and asking the shell to make the window full-screen.
2. **New windows** (presenter view) from a framed page in the desktop app: Tauri has no handler today. Fallback: open the presenter URL in the default browser (it is a loopback URL and syncs through the server).
3. **Printing** in the desktop app's web view: if `window.print()` does nothing, Export PDF opens the print view in the default browser.

## Not in this round

- Learning adopting `section`.
- .pptx export.
- A visual (drag-and-drop) slide editor.
- Moving the full host-connection glue into the protocol package.
- The desktop app in the update list (separate task).
