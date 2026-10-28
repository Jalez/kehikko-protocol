/**
 * Which version of this package each piece of the protocol arrived in (2.22.0): every method, every
 * capability, every method a module's SERVER may ask, and every manifest declaration a host has to
 * know to do what the module asks of it. What `needsOf` and `fitOf` (`fit.ts`) read to say whether a
 * module and a host fit. Taken from CHANGELOG.md and held to it by `test/v2-22.test.ts`. A piece
 * that was there at the first tag (0.25.0) says `SINCE_FLOOR`. Design notes: docs/fit.md.
 */
/** The oldest version the protocol has a tag for. A piece that says it was there from the start. */
export declare const SINCE_FLOOR = "0.25.0";
/** Each method, and the version that added it. */
export declare const METHOD_SINCE: {
    readonly 'epics.list': "0.25.0";
    readonly 'epic.get': "0.25.0";
    readonly 'steps.list': "0.25.0";
    readonly 'live.get': "0.25.0";
    readonly 'stage.report': "0.25.0";
    readonly 'events.emit': "0.25.0";
    readonly 'view.goto': "0.25.0";
    readonly 'view.fold': "1.1.0";
    readonly 'selection.set': "0.25.0";
    readonly 'passage.set': "0.25.0";
    readonly 'location.set': "2.13.0";
    readonly 'address.open': "2.16.0";
    readonly 'filters.set': "0.25.0";
    readonly 'showing.set': "0.25.0";
    readonly 'projects.pick': "0.25.0";
    readonly 'state.set': "0.25.0";
    readonly 'disposition.set': "0.25.0";
    readonly 'tracker.get': "0.25.0";
    readonly 'tracker.refresh': "0.25.0";
    readonly 'tracker.columns': "2.6.0";
    readonly 'content.changed': "0.27.0";
    readonly 'parts.set': "1.2.0";
    readonly 'activity.set': "1.5.0";
    readonly 'traffic.read': "2.20.0";
    readonly 'traffic.note': "2.20.0";
    readonly 'parts.get': "2.21.0";
    readonly 'dispositions.get': "2.21.0";
};
/** Each capability, and the version that added it: the oldest of its methods. */
export declare const CAPABILITY_SINCE: {
    readonly 'epics:read': "0.25.0";
    readonly 'steps:read': "0.25.0";
    readonly 'live:read': "0.25.0";
    readonly 'stage:report': "0.25.0";
    readonly 'events:emit': "0.25.0";
    readonly 'view:navigate': "0.25.0";
    readonly 'view:fold': "1.1.0";
    readonly 'selection:set': "0.25.0";
    readonly 'passage:set': "0.25.0";
    readonly 'location:set': "2.13.0";
    readonly 'address:open': "2.16.0";
    readonly 'filters:set': "0.25.0";
    readonly 'showing:set': "0.25.0";
    readonly 'projects:pick': "0.25.0";
    readonly 'state:keep': "0.25.0";
    readonly 'disposition:set': "0.25.0";
    readonly 'trackers:read': "0.25.0";
    readonly 'trackers:refresh': "0.25.0";
    readonly 'content:report': "0.27.0";
    readonly 'parts:set': "1.2.0";
    readonly 'activity:report': "1.5.0";
    readonly 'traffic:read': "2.20.0";
    readonly 'traffic:report': "2.20.0";
    readonly 'parts:read': "2.21.0";
    readonly 'dispositions:read': "2.21.0";
};
/** Each method a module's server may ask (`SERVER_METHODS`), and the version a server could first ask it in. */
export declare const SERVER_METHOD_SINCE: {
    readonly 'tracker.get': "2.19.0";
    readonly 'tracker.columns': "2.19.0";
    readonly 'traffic.read': "2.20.0";
    readonly 'traffic.note': "2.20.0";
    readonly 'epics.list': "2.21.0";
    readonly 'epic.get': "2.21.0";
    readonly 'steps.list': "2.21.0";
    readonly 'parts.get': "2.21.0";
    readonly 'dispositions.get': "2.21.0";
};
/**
 * The manifest declarations a host has to know to do what the module asks, and the version that
 * added each. Named by where they are in a manifest; `skills.needs.object` is a skill need written
 * as an object (`{ provides }`, `{ subject }`, `{ reacts }`, `{ uses }`), which a host before 2.21.0
 * refuses the whole manifest for. What a module only says about itself (`reacts`, `tags`, `icon`) is
 * not here: an older host still runs a module that says it.
 */
export declare const DECLARATION_SINCE: {
    readonly 'mcp.subjects': "1.1.0";
    readonly 'mcp.as': "1.3.0";
    readonly 'declares.skills': "2.5.0";
    readonly 'declares.scopes': "2.9.0";
    readonly 'skills.needs': "2.12.0";
    readonly 'declares.settings': "2.15.0";
    readonly 'declares.provides': "2.21.0";
    readonly 'declares.agentSessions': "2.21.0";
    readonly 'skills.needs.object': "2.21.0";
    readonly 'agentSessions.installsSkills': "2.23.0";
    readonly 'declares.navigates': "2.28.0";
    readonly 'modes.scope': "2.29.0";
};
export type Declaration = keyof typeof DECLARATION_SINCE;
export declare const DECLARATION_NAMES: Declaration[];
/**
 * The fields of a tracker row (`trackerRowSchema`) added after the tracker reading first had a shape,
 * and the version that added each (2.26.0). Nothing a manifest names, so `needsOf` and `fitOf` do not
 * read it: a module that reads one of these from an older host finds it absent and must not take the
 * absence for a fact. What a module reads to know which host can fill a field, and what an official
 * list's `protocol` is set from when a module only works with one. A field not here is older than the
 * changelog's account of the row.
 */
export declare const TRACKER_FIELD_SINCE: {
    readonly column: "2.6.0";
    readonly columns: "2.6.0";
    readonly reviewers: "2.7.0";
    readonly authorLogin: "2.7.0";
    readonly assigneeLogins: "2.7.0";
    readonly myRoles: "2.7.0";
    readonly discussions: "2.7.0";
    readonly lastPushAt: "2.7.0";
    readonly baseBranch: "2.8.0";
    readonly headBranch: "2.8.0";
    readonly stack: "2.8.0";
    readonly lastActivity: "2.8.0";
    readonly people: "2.10.0";
    readonly workItem: "2.11.0";
    readonly branches: "2.19.0";
    readonly contributes: "2.26.0";
    readonly contributedBy: "2.26.0";
};
export type TrackerField = keyof typeof TRACKER_FIELD_SINCE;
/** Every table, in one place. Plain objects: read them with `sinceOf`, never by indexing with a stranger's string. */
export declare const SINCE: {
    readonly methods: {
        readonly 'epics.list': "0.25.0";
        readonly 'epic.get': "0.25.0";
        readonly 'steps.list': "0.25.0";
        readonly 'live.get': "0.25.0";
        readonly 'stage.report': "0.25.0";
        readonly 'events.emit': "0.25.0";
        readonly 'view.goto': "0.25.0";
        readonly 'view.fold': "1.1.0";
        readonly 'selection.set': "0.25.0";
        readonly 'passage.set': "0.25.0";
        readonly 'location.set': "2.13.0";
        readonly 'address.open': "2.16.0";
        readonly 'filters.set': "0.25.0";
        readonly 'showing.set': "0.25.0";
        readonly 'projects.pick': "0.25.0";
        readonly 'state.set': "0.25.0";
        readonly 'disposition.set': "0.25.0";
        readonly 'tracker.get': "0.25.0";
        readonly 'tracker.refresh': "0.25.0";
        readonly 'tracker.columns': "2.6.0";
        readonly 'content.changed': "0.27.0";
        readonly 'parts.set': "1.2.0";
        readonly 'activity.set': "1.5.0";
        readonly 'traffic.read': "2.20.0";
        readonly 'traffic.note': "2.20.0";
        readonly 'parts.get': "2.21.0";
        readonly 'dispositions.get': "2.21.0";
    };
    readonly capabilities: {
        readonly 'epics:read': "0.25.0";
        readonly 'steps:read': "0.25.0";
        readonly 'live:read': "0.25.0";
        readonly 'stage:report': "0.25.0";
        readonly 'events:emit': "0.25.0";
        readonly 'view:navigate': "0.25.0";
        readonly 'view:fold': "1.1.0";
        readonly 'selection:set': "0.25.0";
        readonly 'passage:set': "0.25.0";
        readonly 'location:set': "2.13.0";
        readonly 'address:open': "2.16.0";
        readonly 'filters:set': "0.25.0";
        readonly 'showing:set': "0.25.0";
        readonly 'projects:pick': "0.25.0";
        readonly 'state:keep': "0.25.0";
        readonly 'disposition:set': "0.25.0";
        readonly 'trackers:read': "0.25.0";
        readonly 'trackers:refresh': "0.25.0";
        readonly 'content:report': "0.27.0";
        readonly 'parts:set': "1.2.0";
        readonly 'activity:report': "1.5.0";
        readonly 'traffic:read': "2.20.0";
        readonly 'traffic:report': "2.20.0";
        readonly 'parts:read': "2.21.0";
        readonly 'dispositions:read': "2.21.0";
    };
    readonly serverMethods: {
        readonly 'tracker.get': "2.19.0";
        readonly 'tracker.columns': "2.19.0";
        readonly 'traffic.read': "2.20.0";
        readonly 'traffic.note': "2.20.0";
        readonly 'epics.list': "2.21.0";
        readonly 'epic.get': "2.21.0";
        readonly 'steps.list': "2.21.0";
        readonly 'parts.get': "2.21.0";
        readonly 'dispositions.get': "2.21.0";
    };
    readonly declarations: {
        readonly 'mcp.subjects': "1.1.0";
        readonly 'mcp.as': "1.3.0";
        readonly 'declares.skills': "2.5.0";
        readonly 'declares.scopes': "2.9.0";
        readonly 'skills.needs': "2.12.0";
        readonly 'declares.settings': "2.15.0";
        readonly 'declares.provides': "2.21.0";
        readonly 'declares.agentSessions': "2.21.0";
        readonly 'skills.needs.object': "2.21.0";
        readonly 'agentSessions.installsSkills': "2.23.0";
        readonly 'declares.navigates': "2.28.0";
        readonly 'modes.scope': "2.29.0";
    };
    readonly trackerFields: {
        readonly column: "2.6.0";
        readonly columns: "2.6.0";
        readonly reviewers: "2.7.0";
        readonly authorLogin: "2.7.0";
        readonly assigneeLogins: "2.7.0";
        readonly myRoles: "2.7.0";
        readonly discussions: "2.7.0";
        readonly lastPushAt: "2.7.0";
        readonly baseBranch: "2.8.0";
        readonly headBranch: "2.8.0";
        readonly stack: "2.8.0";
        readonly lastActivity: "2.8.0";
        readonly people: "2.10.0";
        readonly workItem: "2.11.0";
        readonly branches: "2.19.0";
        readonly contributes: "2.26.0";
        readonly contributedBy: "2.26.0";
    };
};
/** The kinds of piece the tables know. */
export type PieceKind = 'method' | 'capability' | 'serverMethod' | 'declaration' | 'trackerField';
/**
 * The version a piece arrived in, or null when this package does not know it: a piece from a
 * newer protocol, or a word nobody defined.
 */
export declare function sinceOf(kind: PieceKind, piece: string): string | null;
/**
 * What a piece is called for a person, in a few words that fit "It uses ___". One per capability
 * and declaration; a method is called what its capability is called.
 */
export declare const PIECE_SAID: {
    readonly capabilities: {
        readonly 'epics:read': "the list of epics";
        readonly 'steps:read': "an epic's steps";
        readonly 'live:read': "the live tracker state";
        readonly 'stage:report': "stage reports";
        readonly 'events:emit': "notices to other modules";
        readonly 'view:navigate': "navigation";
        readonly 'view:fold': "container folding";
        readonly 'selection:set': "the shared selection";
        readonly 'passage:set': "the shared passage";
        readonly 'location:set': "places in code";
        readonly 'address:open': "web addresses on the canvas";
        readonly 'filters:set': "its own filters";
        readonly 'showing:set': "the list of what containers show";
        readonly 'projects:pick': "the project picker";
        readonly 'state:keep': "kept state";
        readonly 'disposition:set': "marks for why references closed";
        readonly 'trackers:read': "the tracker reading";
        readonly 'trackers:refresh': "tracker refreshes";
        readonly 'content:report': "content reports";
        readonly 'parts:set': "edits to an epic's parts";
        readonly 'activity:report': "activity marks";
        readonly 'traffic:read': "the call log";
        readonly 'traffic:report': "its own entries in the call log";
        readonly 'parts:read': "an epic's parts from the host";
        readonly 'dispositions:read': "marks for why references closed, from the host";
    };
    readonly declarations: {
        readonly 'mcp.subjects': "door subjects";
        readonly 'mcp.as': "a door name of its own";
        readonly 'declares.skills': "agent skills";
        readonly 'declares.scopes': "the all-epics view";
        readonly 'skills.needs': "skills that need other modules";
        readonly 'declares.settings': "settings";
        readonly 'declares.provides': "material it publishes for other modules";
        readonly 'declares.agentSessions': "agent sessions";
        readonly 'skills.needs.object': "skills that need what other modules provide";
        readonly 'agentSessions.installsSkills': "skills it installs for its own agent";
        readonly 'declares.navigates': "jumps to other projects and to what other modules show";
        readonly 'modes.scope': "scopes";
    };
};
/** A piece in a person's words, or the piece as written when this package has no words for it. */
export declare function pieceSaid(kind: PieceKind, piece: string): string;
/**
 * Pieces a release REMOVED, and the version that removed them: what makes a module too OLD for a
 * host. Empty in every 2.x: nothing has been taken away since 2.0.0 that a manifest can name. The
 * 3.0 release that removes a method, a capability or a declaration lists it here.
 */
export declare const REMOVED: {
    readonly [K in PieceKind]: Readonly<Record<string, string>>;
};
/** The version that removed a piece, or null when nothing has. */
export declare function removedIn(kind: PieceKind, piece: string): string | null;
/** A version as three numbers, or null when it is not spelled `major.minor.patch`. A suffix (`-rc.1`) is ignored. */
export declare function versionParts(version: unknown): [number, number, number] | null;
/** Negative, zero or positive, as `a` is older than, the same as or newer than `b`. Unreadable sorts oldest. */
export declare function compareVersions(a: string, b: string): number;
/** The newer of two versions. */
export declare function newerVersion(a: string, b: string): string;
/** A version as a person reads it in a sentence: `2.21` for `2.21.0`, the patch only when it is not 0. */
export declare function versionSaid(version: string): string;
