/**
 * How long anything is allowed to be: text bounds count characters, list bounds count items.
 * Exported so a host's own copy of these schemas and a module's own checks hold to the same numbers.
 * Design notes: docs/limits.md.
 */
export declare const LIMITS: {
    /** A URL of any kind: `entry`, `icon`, `health`, `mcp.url`. */
    readonly URL: 2048;
    /** `needs.protocol`, the range a module says it speaks. */
    readonly RANGE: 40;
    /** A module's display name. */
    readonly NAME: 40;
    /** Its version string, which this protocol never parses. */
    readonly VERSION: 32;
    /** The highest data-format number a manifest may declare in `dataVersion`. A value, not a length. */
    readonly DATA_VERSION: 1000000;
    /** One line about what it is. */
    readonly SUMMARY: 200;
    /** The word on a tab. */
    readonly LABEL: 24;
    /** An extension name, e.g. `kehikot.notifications@1`. */
    readonly EXTENSION: 64;
    /** A capability a module declares it will use. */
    readonly CAPABILITY: 64;
    /**
     * The name of a context kind a module says it reacts to, in characters. See `reacts`.
     * The words this version knows are `passage`, `selection` and `containers`.
     */
    readonly REACTION: 64;
    /** An epic slug, everywhere one appears. */
    readonly EPIC_SLUG: 80;
    /** A project name, as read off the page. */
    readonly PROJECT: 80;
    /**
     * An absolute path to a folder on the machine the host is running on, in characters (Linux's
     * `PATH_MAX`). A bound and not a validation: this package cannot say whether a path exists, is a
     * directory, or is even absolute.
     */
    readonly PATH: 4096;
    /** The name of one conversation with one frame. */
    readonly SESSION: 128;
    /** The id correlating a request with its response, or a goto with its answer. */
    readonly CORRELATION: 64;
    /** A method name on the wire. */
    readonly METHOD: 80;
    /** A reference like `gh#41`, wherever one is carried. */
    readonly REF: 64;
    /**
     * A reference inside a `goto` or a `view.goto`, in characters. Deliberately longer than `REF`:
     * `REF` bounds a reference being stored, this one a reference being matched and then forgotten.
     */
    readonly GOTO_REF: 200;
    /**
     * An epic's title in the spine of `epics.list` (see `methods.ts`), in characters. Text the host
     * wrote: it tells a module how much room to leave in a list it is about to draw.
     */
    readonly TITLE: 200;
    /** A line of prose a person will read: a notification, a note. */
    readonly MESSAGE: 2000;
    /**
     * The words of the passage a reader is pointing at, carried in `kehikot.context`, in characters.
     * A sender with more is refused rather than clipped: shorten the selection before sending it.
     */
    readonly QUOTE: 2000;
    /** A sentence explaining a refusal, going back to whoever asked. */
    readonly REASON: 400;
    /** How many modes one module may offer. */
    readonly MODES: 8;
    /** One category word a module files itself under, e.g. `planning`. */
    readonly TAG: 24;
    /**
     * How many of those it may give. The first is the one a host uses when it shows each module
     * once; the rest are only there to be searched.
     */
    readonly TAGS: 5;
    /** How many extensions it may name in each direction. */
    readonly EXTENSIONS: 16;
    /** How many capabilities it may declare. */
    readonly CAPABILITIES: 32;
    /** How many context kinds it may say it reacts to. A manifest listing more is refused. */
    readonly REACTIONS: 8;
    /**
     * The id of a filter group or of one of its options, in characters. A bound and not a grammar.
     * A host must not index a plain object with one; see `own()` in `ids.ts`.
     */
    readonly FILTER_ID: 64;
    /**
     * The words a person reads on one filter group, or on one of its options, in characters. A label
     * may count things (`show 41 ignored`). A host should truncate anyway, with the full text in a
     * `title`.
     */
    readonly FILTER_LABEL: 48;
    /**
     * The words a person reads on the control that clears what a module shows, in characters. A
     * separate name at the same number as `FILTER_LABEL`: do not bound one with the other. A host
     * must truncate anyway, with the full text in a tooltip and in the accessible name.
     */
    readonly CLEAR_LABEL: 48;
    /** How many filter groups one module may offer at once. */
    readonly FILTER_GROUPS: 4;
    /** How many options one filter group may offer. */
    readonly FILTER_OPTIONS: 12;
    /**
     * What somebody typed into a filter, in characters. Stored per container, echoed in every
     * `kehikot.context`, and writable by a module with `filters.set`; a longer paste is clipped by the
     * module. A host must not use it as a key, index anything with it, or read meaning into it.
     */
    readonly FILTER_TEXT: 200;
    /** How many refs one payload may carry, and how many may be selected at once. */
    readonly REFS: 32;
    /**
     * How many dispositions a context may carry: the marks people put on refs to say why each one
     * closed. See `dispositionSchema` in `wire.ts`. What a tracker says about a close is not in this
     * list; a module derives that with `deriveDisposition` in `facets.ts`.
     */
    readonly DISPOSITIONS: 256;
    /** How many parts of the open epic one context may list. See `parts.ts`. */
    readonly PARTS: 32;
    /**
     * How many references one part may list. A host that has more under one heading sends the first
     * of them and is expected to say so on its own screen.
     */
    readonly PART_REFS: 256;
    /**
     * How many of the paper's files one part may name. See `partFile` in `parts.ts`. A part with more
     * files than this sends the first of them.
     */
    readonly PART_FILES: 32;
    /**
     * How long one of those file names may be, in characters. A name relative to one paper's folder
     * (`parts/posting-seam.tex`), not an absolute path, which `PATH` bounds.
     */
    readonly PART_FILE: 256;
    /**
     * How many places in documents one container may say it is showing. Each entry is a whole
     * `passage`, with `quoted` bounded at `QUOTE`; a module saying what it shows should leave `quoted`
     * empty. See `containerSchema` in `wire.ts`.
     */
    readonly SHOWING_DOCUMENTS: 16;
    /** How many containers one context may describe: the size of `context.containers`, which the host builds. */
    readonly CONTAINERS: 64;
    /**
     * A module's own state, which the host keeps and never reads, in characters. For what a view
     * remembers (which filter is on, which column is sorted), not for a module's data.
     */
    readonly MODULE_STATE: number;
    /**
     * A prompt a person wrote on a canvas for one module to work from, in characters. The host
     * carries it to every frame on every context change.
     */
    readonly PROMPT: number;
    /** A module's standing note about what its presence implies, in characters: a paragraph. */
    readonly GUIDANCE: 1024;
    /** As much of a manifest as anyone should read from a stranger on a port. */
    readonly MANIFEST_BYTES: number;
    /** How many refs one `tracker.get` or `tracker.refresh` may name. A journey's worth, not a repository's. */
    readonly TRACKER_ASK: 200;
    /** How many rows one reading may answer with: a project's recent issues and changes, and every ref its epics name. */
    readonly TRACKER_ROWS: 2000;
    /** How many places one project reads. */
    readonly TRACKER_SOURCES: 16;
    /** A tracker's hostname. */
    readonly TRACKER_HOST: 255;
    /** `owner/repo`, or a GitLab project path with its groups. */
    readonly TRACKER_REPO: 200;
    /** One label. */
    readonly TRACKER_LABEL: 100;
    /** How many labels one row carries. */
    readonly TRACKER_LABELS: 32;
    /** A person's name or handle as a tracker gives it. */
    readonly TRACKER_PERSON: 100;
    /** How many assignees or approvers one row lists. */
    readonly TRACKER_PEOPLE: 16;
    /** How many links one row carries. */
    readonly TRACKER_LINKS: 32;
    /** A short tracker word: a close reason, a commit sha. */
    readonly TRACKER_WORD: 64;
    /** A description, read for `detail`. Long enough for a real one, short enough to send. */
    readonly TRACKER_BODY: 20000;
    /** How many files of a change `detail` lists. */
    readonly TRACKER_FILES: 300;
    /**
     * How many `(source, epic)` changes a context's `content` carries. See
     * `content.ts`. A host keeps the newest; one dropped costs a module a re-read
     * it did not need, never a change it did.
     */
    readonly CONTENT: 64;
};
