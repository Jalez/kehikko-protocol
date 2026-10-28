/**
 * How long anything is allowed to be: text bounds count characters, list bounds count items.
 * Exported so a host's own copy of these schemas and a module's own checks hold to the same numbers.
 * Design notes: docs/limits.md.
 */
export const LIMITS = {
  /** A URL of any kind: `entry`, `icon`, `health`, `mcp.url`. */
  URL: 2048,
  /** `needs.protocol`, the range a module says it speaks. */
  RANGE: 40,
  /** A module's display name. */
  NAME: 40,
  /** Its version string, which this protocol never parses. */
  VERSION: 32,
  /** The highest data-format number a manifest may declare in `dataVersion`. A value, not a length. */
  DATA_VERSION: 1_000_000,
  /** One line about what it is. */
  SUMMARY: 200,
  /** The word on a tab. */
  LABEL: 24,
  /** An extension name, e.g. `kehikot.notifications@1`. */
  EXTENSION: 64,
  /** A capability a module declares it will use. */
  CAPABILITY: 64,
  /**
   * The name of a context kind a module says it reacts to, in characters. See `reacts`.
   * The words this version knows are `passage`, `selection` and `containers`.
   */
  REACTION: 64,
  /** An epic slug, everywhere one appears. */
  EPIC_SLUG: 80,
  /** A project name, as read off the page. */
  PROJECT: 80,
  /**
   * An absolute path to a folder on the machine the host is running on, in characters (Linux's
   * `PATH_MAX`). A bound and not a validation: this package cannot say whether a path exists, is a
   * directory, or is even absolute.
   */
  PATH: 4096,
  /** The name of one conversation with one frame. */
  SESSION: 128,
  /** The id correlating a request with its response, or a goto with its answer. */
  CORRELATION: 64,
  /** A method name on the wire. */
  METHOD: 80,
  /** A reference like `gh#41`, wherever one is carried. */
  REF: 64,
  /**
   * A reference inside a `goto` or a `view.goto`, in characters. Deliberately longer than `REF`:
   * `REF` bounds a reference being stored, this one a reference being matched and then forgotten.
   */
  GOTO_REF: 200,
  /**
   * An epic's title in the spine of `epics.list` (see `methods.ts`), in characters. Text the host
   * wrote: it tells a module how much room to leave in a list it is about to draw.
   */
  TITLE: 200,
  /** A line of prose a person will read: a notification, a note. */
  MESSAGE: 2000,
  /**
   * The words of the passage a reader is pointing at, carried in `kehikot.context`, in characters.
   * A sender with more is refused rather than clipped: shorten the selection before sending it.
   */
  QUOTE: 2000,
  /** A sentence explaining a refusal, going back to whoever asked. */
  REASON: 400,
  /** How many modes one module may offer. */
  MODES: 8,
  /** One category word a module files itself under, e.g. `planning`. */
  TAG: 24,
  /**
   * How many of those it may give. The first is the one a host uses when it shows each module
   * once; the rest are only there to be searched.
   */
  TAGS: 5,
  /** How many extensions it may name in each direction. */
  EXTENSIONS: 16,
  /** How many capabilities it may declare. */
  CAPABILITIES: 32,
  /** How many context kinds it may say it reacts to. A manifest listing more is refused. */
  REACTIONS: 8,
  /**
   * The id of a filter group or of one of its options, in characters. A bound and not a grammar.
   * A host must not index a plain object with one; see `own()` in `ids.ts`.
   */
  FILTER_ID: 64,
  /**
   * The words a person reads on one filter group, or on one of its options, in characters. A label
   * may count things (`show 41 ignored`). A host should truncate anyway, with the full text in a
   * `title`.
   */
  FILTER_LABEL: 48,
  /**
   * The words a person reads on the control that clears what a module shows, in characters. A
   * separate name at the same number as `FILTER_LABEL`: do not bound one with the other. A host
   * must truncate anyway, with the full text in a tooltip and in the accessible name.
   */
  CLEAR_LABEL: 48,
  /** How many filter groups one module may offer at once. */
  FILTER_GROUPS: 4,
  /** How many options one filter group may offer. */
  FILTER_OPTIONS: 12,
  /**
   * What somebody typed into a filter, in characters. Stored per container, echoed in every
   * `kehikot.context`, and writable by a module with `filters.set`; a longer paste is clipped by the
   * module. A host must not use it as a key, index anything with it, or read meaning into it.
   */
  FILTER_TEXT: 200,
  /** How many refs one payload may carry, and how many may be selected at once. */
  REFS: 32,
  /**
   * How many dispositions a context may carry: the marks people put on refs to say why each one
   * closed. See `dispositionSchema` in `wire.ts`. What a tracker says about a close is not in this
   * list; a module derives that with `deriveDisposition` in `facets.ts`.
   */
  DISPOSITIONS: 256,
  /**
   * How many parts one epic may have, and so how many one context may list. See `parts.ts`. 32 until
   * 1.2.0: a part may be one step of a journey, and journeys of more than thirty-two steps exist.
   */
  PARTS: 128,
  /**
   * How many references one part may list. A host that has more under one heading sends the first
   * of them and is expected to say so on its own screen.
   */
  PART_REFS: 256,
  /**
   * How many of the paper's files one part may name. See `partFile` in `parts.ts`. A part with more
   * files than this sends the first of them.
   */
  PART_FILES: 32,
  /**
   * How long one of those file names may be, in characters. A name relative to one paper's folder
   * (`parts/posting-seam.tex`), not an absolute path, which `PATH` bounds.
   */
  PART_FILE: 256,
  /**
   * How many documents one part may list in a context, and how many one module may publish for one
   * part in its `parts.json`. A host sends the first of them. See `partDocument` in `parts.ts`.
   */
  PART_DOCUMENTS: 64,
  /**
   * How long one document's name may be, in characters: a path relative to the PROJECT
   * (`.kehikot/paper/<epic>/parts/posting-seam.tex`), so longer than `PART_FILE` by the folders in front.
   */
  PART_DOCUMENT: 512,
  /** How many epics one module's `parts.json` is read for. A file with more is read for the first of them. */
  HOLDINGS_EPICS: 512,
  /** As much of one module's `parts.json` as a reader will open, in bytes. A larger file is skipped whole. */
  HOLDINGS_BYTES: 4 * 1024 * 1024,
  /** How many module folders under `.kehikot/` a reader of holdings looks in. */
  HOLDINGS_MODULES: 128,
  /** How many words one `declares.navigates` may list (2.28.0). */
  NAVIGATES: 8,
  /** How many subjects one manifest's `shows` may list (2.28.0). */
  SHOWS: 8,
  /** The id of one thing a `view.goto` asks to have shown (2.28.0): an agent session's id. */
  SHOW_ID: 128,
  /** How many runs one `runs.json` is read for (2.27.0); a publisher keeps its newest. */
  RUNS: 200,
  /** A run's id within its publisher's file, in characters. */
  RUN_ID: 64,
  /** A run's label ("pre-push monorepo"), in characters. */
  RUN_LABEL: 120,
  /** How many refs one run may be for. */
  RUN_REFS: 16,
  /** As much of one module's `runs.json` as a reader will open, in bytes. A larger file is skipped whole. */
  RUNS_BYTES: 1024 * 1024,
  /**
   * How many places in documents one container may say it is showing. Each entry is a whole
   * `passage`, with `quoted` bounded at `QUOTE`; a module saying what it shows should leave `quoted`
   * empty. See `containerSchema` in `wire.ts`.
   */
  SHOWING_DOCUMENTS: 16,
  /** How many containers one context may describe: the size of `context.containers`, which the host builds. */
  CONTAINERS: 64,
  /**
   * A module's own state, which the host keeps and never reads, in characters. For what a view
   * remembers (which filter is on, which column is sorted), not for a module's data.
   */
  MODULE_STATE: 4 * 1024,
  /**
   * A prompt a person wrote on a canvas for one module to work from, in characters. The host
   * carries it to every frame on every context change.
   */
  PROMPT: 8 * 1024,
  /** A module's standing note about what its presence implies, in characters: a paragraph. */
  GUIDANCE: 1024,
  /** As much of a manifest as anyone should read from a stranger on a port. */
  MANIFEST_BYTES: 64 * 1024,
  /*
   * The shared tracker reading (see `tracker.ts`): bounds on an answer a host built from what a
   * tracker said. Text is clipped to them when the host reads it, flagged by `bodyClipped` and
   * `filesClipped`; refs never are.
   */
  /** How many refs one `tracker.get` or `tracker.refresh` may name. A journey's worth, not a repository's. */
  TRACKER_ASK: 200,
  /** How many rows one reading may answer with: a project's recent issues and changes, and every ref its epics name. */
  TRACKER_ROWS: 2000,
  /** How many places one project reads. */
  TRACKER_SOURCES: 16,
  /** A tracker's hostname. */
  TRACKER_HOST: 255,
  /** `owner/repo`, or a GitLab project path with its groups. */
  TRACKER_REPO: 200,
  /** One label. */
  TRACKER_LABEL: 100,
  /** How many labels one row carries. */
  TRACKER_LABELS: 32,
  /** A person's name or handle as a tracker gives it. */
  TRACKER_PERSON: 100,
  /** How many assignees or approvers one row lists. */
  TRACKER_PEOPLE: 16,
  /** How many links one row carries. */
  TRACKER_LINKS: 32,
  /** A short tracker word: a close reason, a commit sha. */
  TRACKER_WORD: 64,
  /** A description, read for `detail`. Long enough for a real one, short enough to send. */
  TRACKER_BODY: 20_000,
  /** How many files of a change `detail` lists. */
  TRACKER_FILES: 300,
  /** How many boards one project's sources have, and one row may sit on. (2.6.0) */
  TRACKER_BOARDS: 16,
  /** How many columns one board has. (2.6.0) */
  TRACKER_COLUMNS: 64,
  /** How many reviewers one change's row names, asked and done. (2.7.0) */
  REVIEWERS: 32,
  /** A git branch name a change targets or comes from. Git allows longer; no tracker shows one. (2.8.0) */
  BRANCH: 255,
  /** How many branches one issue's row lists as linked to it (`branches`, 2.19.0). */
  TRACKER_BRANCHES: 10,
  /**
   * How many people one row's `people` map describes: its reviewers, assignees, author and the
   * latest actor, with room to spare. (2.10.0)
   */
  ROW_PEOPLE: 64,
  /**
   * How many `(source, epic)` changes a context's `content` carries. See
   * `content.ts`. A host keeps the newest; one dropped costs a module a re-read
   * it did not need, never a change it did.
   */
  CONTENT: 64,
  /*
   * The header a module declares (see `header.ts`): the switches, toggles, jumps and runs a host
   * draws in a container's menus.
   */
  /** How many header items one module may declare at once, over all four kinds. */
  HEADER_ITEMS: 24,
  /** The id of a header item, or of one option of a switch or a go item, in characters. */
  HEADER_ID: 64,
  /** The words on a header item or on one of its options. A host truncates anyway, with the full text in a `title`. */
  HEADER_LABEL: 48,
  /** How many options one switch or one go item may offer: a paper's sections, a project's decks. */
  HEADER_OPTIONS: 64,
  /** An icon's name, e.g. `file-text`. A host draws the ones it has and none for a name it does not know. */
  HEADER_ICON: 32,
  /** How many run items a host draws pinned in the container header (1.6.0); the rest stay in the Run menu. */
  PINNED_MAX: 4,
  /** A shortcut hint, e.g. `⌘B`. Shown beside the label; the host binds nothing from it. */
  HEADER_SHORTCUT: 16,
  /** The heading items are gathered under inside their menu. */
  HEADER_GROUP: 24,
  /** What a run last came to, in a word or three: `1.2 s`, `failed`, `p. 3/12`. */
  HEADER_RESULT: 32,
  /*
   * What a module can be asked to show, and to answer for (see `door.ts` and the manifest's
   * `mcp.subjects`).
   */
  /** How many kinds of subject one module may declare. */
  SUBJECTS: 8,
  /** The name a module asks its MCP door to be registered under: `mcp.as`. */
  DOOR_NAME: 40,
  /** How many methods a host's greeting may list as answered (`hello.answers`, 1.4.0). */
  ANSWERS: 64,
  /** How many items one `activity.set` may list (1.5.0). */
  ACTIVITY_ITEMS: 64,
  /** The id of one activity item (1.5.0): a session id, a run id. */
  ACTIVITY_ID: 128,
  /** An activity item's label (1.5.0), in characters: a line a person reads. */
  ACTIVITY_LABEL: 120,
  /** An activity item's detail (1.5.0), in characters: a tooltip. */
  ACTIVITY_DETAIL: 200,
  /** How many refs one activity item may name (1.7.0). */
  ACTIVITY_REFS: 16,
  /** An activity item's group key (1.7.0), in characters. */
  ACTIVITY_GROUP: 64,
  /** An activity item's project folder (1.8.0), in characters: an absolute path. */
  ACTIVITY_PROJECT: 1024,
  /** An Inbox event's id (2.31.0): `research-complete`. On an item (`event`) and in `declares.events`. */
  EVENT_ID: 40,
  /** What an Inbox event is called for a person (2.31.0): `Research complete`. */
  EVENT_SAYS: 40,
  /** How many Inbox events one manifest may declare (2.31.0). */
  EVENTS: 16,
  /** How many parts one place (`place.parts`, a `view.goto`'s `parts`) may name. */
  PLACE_PARTS: 16,
  /** How long the host gets to say whether a folder is a project, in ms (`hostHasProject`). */
  HOST_ASK_MS: 1500,
  /**
   * How long a module's server keeps the host's "yes, a project" for one folder, in ms (2.21.1,
   * `hostProject`): while the same folder is at the path. A move is noticed at once regardless.
   */
  HOST_PROJECT_KEEP_MS: 60_000,
  /** The name of a tool at a module's MCP door. MCP's own bound. */
  TOOL: 64,
  /** The id of one thing a "is this done?" answer is about: a question, a checklist item. */
  SUBJECT_ID: 128,
  /** How many things one "is this done?" answer may list. */
  DONE_ITEMS: 256,
  /** How many agent skills one manifest may offer (`declares.skills`, 2.5.0). */
  SKILLS: 16,
  /** A skill's name (2.5.0), in characters: kebab-case, and the folder it is installed in. */
  SKILL_NAME: 40,
  /** A skill's version (2.5.0), in characters. Compared for equality only, never parsed. */
  SKILL_VERSION: 64,
  /** A skill's text, its SKILL.md (2.5.0), in BYTES of UTF-8. */
  SKILL_TEXT: 65_536,
  /** How many needs one skill may list (`needs`, 2.12.0): modules by id, or what a module provides (2.21.0). */
  SKILL_NEEDS: 8,
  /** How many skills a host's `everywhere` list may hold (2.23.0): every registered module's, and its own. */
  EVERYWHERE_SKILLS: 512,
  /**
   * The highest line number a code location may name (`codeLocationSchema`, 2.13.0). A value, not a
   * length: a file longer than this is not one anybody reviews a line of.
   */
  CODE_LINE: 10_000_000,
  /* A module's settings (`declares.settings`, 2.15.0). See `settings.ts`. */
  /** How many settings one module may declare. */
  SETTINGS: 32,
  /** A setting's key, in characters. */
  SETTING_KEY: 64,
  /** A setting's label, and a choice's, in characters: what a control is called. */
  SETTING_LABEL: 80,
  /** The sentence or two under a setting, in characters. */
  SETTING_DESCRIPTION: 400,
  /** How many choices one `choice` setting may offer. */
  SETTING_CHOICES: 32,
  /** A choice's value, in characters. */
  SETTING_CHOICE: 64,
  /** A `string` setting's value, and each line of a `list`, in characters. */
  SETTING_TEXT: 2000,
  /** How many lines a `list` setting may hold. */
  SETTING_LIST: 64,
  /** How long a pass the host minted for a person's change is good for, in ms (`SETTINGS_PASS_PATH`). */
  SETTINGS_PASS_MS: 30_000,
  /**
   * How long a pass a module's server minted for one question to the host is good for, in ms
   * (`SERVER_PASS_PATH`, 2.19.0). The host asks about it at once; this is room for a slow machine.
   */
  SERVER_PASS_MS: 10_000,
  /** How long a module's server waits for the host to answer one question, in ms (`askHost`, 2.19.0). */
  SERVER_ASK_MS: 5000,
  /* Traffic (2.20.0). See `traffic.ts`. */
  /** How many rows of traffic a host keeps, and the most one `traffic.read` returns. */
  TRAFFIC_KEPT: 5000,
  /** How many calls one `traffic.note` carries. A module notes more in another. */
  TRAFFIC_NOTE: 100,
  /** A call's reason, in characters: a short plain phrase ("release list: Paper"). */
  TRAFFIC_REASON: 120,
  /** A call's kind (`GET`, `git fetch`, `gh api`), and a process's name, in characters. */
  TRAFFIC_KIND: 40,
  /** Where a call went: a host name and port, in characters. DNS allows 253. */
  TRAFFIC_HOST: 255,
  /** A call's sanitized path and query keys, in characters. */
  TRAFFIC_PATH: 300,
  /** Who made a call: `kehikko` or a module id, in characters. */
  TRAFFIC_BY: 64,
  /** Who sent a request the host received, named ("Claude session on Wide · methods"), in characters (2.25.0). */
  TRAFFIC_CALLER: 120,
  /** How many open connections one `traffic.read` describes. */
  TRAFFIC_CONNECTIONS: 500,
  /* An epic's plan: its steps, phases and gates as a module publishes them (2.21.0). See `plan.ts`. */
  /** How many steps one module's plan for one epic may hold. */
  PLAN_STEPS: 256,
  /** How many phases one plan may hold. */
  PLAN_PHASES: 32,
  /** How many gates may hold one step. */
  PLAN_GATES: 32,
  /** How many refs one step may name, delivering or related, each list on its own. */
  PLAN_STEP_REFS: 64,
  /** How many steps one step may wait for (`after`), and refs one gate may wait on (`waitsOn`). */
  PLAN_AFTER: 32,
  /** A step's body, in characters: the prose under its title. */
  PLAN_BODY: 4000,
  /** Who acts on a gate — a person or a role — in characters. */
  PLAN_OWNER: 80,
  /** How many words one manifest may list in `declares.provides` (2.21.0). */
  PROVIDES: 8,
  /** One word of `declares.provides`, and the value of a skill's `{ provides }` need, in characters. */
  PROVIDES_WORD: 32,
} as const
