import { type PieceKind } from './since.js';
/**
 * Whether a module and a host fit each other (2.22.0), worked out from the manifest every module
 * already serves, so a module written from the template and one written by hand are judged alike
 * and neither writes a line for it. `needsOf` says what a manifest's declarations need; `fitOf`
 * holds that to a host's protocol package; `fitSaid` is the words a host shows; `hostTooOld` reads
 * the refusal a host gives a call it does not know. Pure. Design notes: docs/fit.md.
 */
/** One piece a manifest asks for, with the version that added it (null: this package does not know it). */
export interface NeededPiece {
    kind: PieceKind;
    /** As the manifest spells it: a capability (`traffic:read`), or a declaration's place (`declares.settings`). */
    piece: string;
    since: string | null;
    /** In a person's words, for "It uses ___". */
    said: string;
}
/** What a manifest's declarations need of a host. */
export interface Needs {
    /** The newest version any known piece needs; `SINCE_FLOOR` when nothing needs more. */
    version: string;
    /** The pieces newer than the version asked about (`above`), newest first, then the ones this package does not know. */
    pieces: NeededPiece[];
    /** Whether a piece is one this package does not know: from a newer protocol, or a word nobody defined. */
    unknown: boolean;
    /** The protocol package the module was built with (`build.protocol`), when the manifest says: a hint, never the rule. */
    built: string | null;
}
/**
 * What a manifest's declarations need of a host: the newest version among them, and every piece
 * newer than `above` (a host's protocol package version; `SINCE_FLOOR` lists everything above the
 * start). Takes a parsed manifest or the raw JSON a module served, so a manifest this package cannot
 * parse is still read. `build.protocol` is carried as `built` and decides nothing here.
 */
export declare function needsOf(manifest: unknown, above?: string): Needs;
/** What a host knows about itself: its protocol package version and its protocol number. */
export interface HostSide {
    /** Default: this package's own `PACKAGE_VERSION`, which is what a host built with it is. */
    version?: string;
    /** Default: `PROTOCOL`. */
    protocol?: number;
}
/** A piece a release removed that a manifest still names. */
export interface RemovedPiece {
    kind: PieceKind;
    piece: string;
    removedIn: string;
    said: string;
}
/**
 * Whether a module and a host fit. `fits`: frame it. `host-too-old`: the module needs a newer host —
 * `since` is the version that has what it needs (null when only a piece this package does not know
 * says so), `missing` what this host lacks. `module-too-old`: the host has moved past the module —
 * a protocol number below the host's, a range that stops below it, or a piece a release removed.
 * `protocol` is set when the protocol NUMBER decided, with the module's number and range.
 */
export type Fit = {
    fit: 'fits';
    needs: Needs;
} | {
    fit: 'host-too-old';
    needs: Needs;
    since: string | null;
    missing: NeededPiece[];
    protocol?: {
        module: number;
        range: string;
        host: number;
    };
} | {
    fit: 'module-too-old';
    needs: Needs;
    removed: RemovedPiece[];
    protocol?: {
        module: number;
        range: string;
        host: number;
    };
};
/**
 * Hold a manifest to a host. The protocol number first (`manifest.protocol`, `declares.protocol`),
 * then what the declarations need against the host's package version. A piece this package does not
 * know counts only when the module was built with a newer package than the host, or does not say
 * what it was built with: a module built with an older one that names an unknown word made a typo,
 * and a host that framed it before frames it still.
 */
export declare function fitOf(manifest: unknown, host?: HostSide): Fit;
/**
 * The sentences a host shows about a fit, as text: a module's name goes in as a string and is never
 * read as markup. `tooOld` is the one line a module may show beside a call the host declined
 * (`hostTooOld`); the host's own notice says the rest.
 */
export declare const FIT_SAYS: {
    readonly hostTooOld: (name: string) => string;
    readonly moduleTooOld: (name: string) => string;
    readonly updateKehikot: "Update Kehikot";
    readonly updateModule: (name: string) => string;
    readonly tooOld: (since: string | null) => string;
};
/**
 * What a host says about a module that does not fit: a title, one line naming what is missing, and
 * the button's words. Null for a module that fits.
 */
export declare function fitSaid(fit: Fit, name: string): {
    title: string;
    line: string;
    action: string;
} | null;
/**
 * A call declined because the host is older than what was asked: the typed result `hostTooOld`
 * reads off a refusal, for a module to show (`FIT_SAYS.tooOld(since)`). `since` is the version that
 * has the method — from the module's own copy of `SINCE`, which knows it even when the host does
 * not — or null when neither side can say.
 */
export interface HostTooOld {
    outcome: 'declined';
    reason: 'host-too-old';
    since: string | null;
}
/**
 * The rule the client and `askHost` share: a refusal of `method` is `host-too-old` when the host said
 * so (`declined`), or when it answered `unknown-method` for a method this package knows. A host
 * answers every method it knows, so a method this package has and the host does not is newer than
 * the host. `kind` is `serverMethod` for a server's question.
 */
export declare function tooOldOf(method: string, refusal: {
    reason?: unknown;
    declined?: unknown;
    since?: unknown;
}, kind?: 'method' | 'serverMethod'): HostTooOld | null;
/**
 * Read `host-too-old` off anything a module holds after a call: a `HostRefused` from the client, its
 * `refusal`, an `AskedHost` from `askHost`, or a body a module's own server passed on in the shape of
 * `HostTooOld`. Null for anything else, so `if (hostTooOld(error))` is the whole check.
 */
export declare function hostTooOld(value: unknown): HostTooOld | null;
