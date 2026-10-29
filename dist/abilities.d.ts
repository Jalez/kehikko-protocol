import { z } from 'zod';
/**
 * 2.33.0. Two things a module says about itself that a host acts on without naming the module:
 * what it can open when the host points the canvas at it (`opens`), and what it holds that a
 * restart would end (`holds`). Top-level manifest fields, like `shows` and `events`, and not under
 * `declares`: a host before 2.33.0 reads an unknown `declares` key as a declaration from a newer
 * protocol (`fitOf`) and would not run the module, while it ignores an unknown top-level field.
 * Free words on the wire like `shows`: a host acts on the words it knows and ignores the rest.
 * Design notes: docs/manifest.md (`opens`, `holds`).
 */
/**
 * The things a module can open when the host points the canvas at one (`opens` in a manifest).
 *
 * `file`: a file of the project, by its path, when the host points the canvas at it
 * (`context.passage` with a `path`, `by` the host). A host that has a file to show a person — a
 * module's settings file, say — offers to open it with a module that says this, on the kehikko or
 * placed there for it, and otherwise shows the file itself.
 */
export declare const OPENS: {
    readonly file: "A file of the project, by its path, when the host points the canvas at it.";
};
export type Opens = keyof typeof OPENS;
/**
 * What a module holds that a restart of it ends (`holds` in a manifest).
 *
 * `live-sessions`: shells or agent conversations running in the module's own process. A host does
 * not restart such a module on its own account — an automatic update waits for its sessions to end
 * — and a press that restarts it says that it ends them.
 */
export declare const HOLDS: {
    readonly 'live-sessions': "Shells or agent sessions running in its own process, which a restart of the module ends.";
};
export type Holds = keyof typeof HOLDS;
/** `opens` in a manifest: words, each once. */
export declare const opensSchema: z.ZodEffects<z.ZodArray<z.ZodString, "many">, string[], string[]>;
/** `holds` in a manifest: words, each once. */
export declare const holdsSchema: z.ZodEffects<z.ZodArray<z.ZodString, "many">, string[], string[]>;
/** The least of a manifest the readers below look at. */
export interface AbleManifest {
    opens?: readonly string[] | null;
    holds?: readonly string[] | null;
}
/** What a module says it can open (`opens`), `[]` when it says nothing. */
export declare function opensOf(manifest: AbleManifest | null | undefined): readonly string[];
/** Whether a module says it can open this kind of thing (`'file'`). */
export declare function canOpen(manifest: AbleManifest | null | undefined, what: Opens | (string & {})): boolean;
/** What a module says it holds (`holds`), `[]` when it says nothing. */
export declare function holdsOf(manifest: AbleManifest | null | undefined): readonly string[];
/** Whether a module says it holds live shells or agent sessions that a restart would end. */
export declare function holdsLiveSessions(manifest: AbleManifest | null | undefined): boolean;
