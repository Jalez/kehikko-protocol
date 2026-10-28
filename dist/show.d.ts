import { z } from 'zod';
/**
 * 2.28.0. Going somewhere in ANOTHER project, and asking for one thing to be shown once there.
 *
 * `view.goto` takes `project` (the project to stand in first) and `show` (one thing to be shown on the
 * kehikko the move ends on: a subject and an id, such as the agent session a run was asked for from).
 * The host relays `show` as `context.show` to the containers on that kehikko whose manifests say they
 * can show that subject (`shows`); it names no module, and a module that holds no such thing does
 * nothing. A module that sends either field says so in `declares.navigates`, so a host too old to
 * know them is not asked. Design notes: docs/methods.md (`view.goto`) and docs/wire.md (`context.show`).
 */
/**
 * What a `view.goto` may carry beyond the place in the open project, and what each asks of a host.
 * The words of `declares.navigates`; a host before 2.28.0 strips both fields and would go to the epic
 * of that name in the project it has open, so a module that sends one says it, and `fitOf` holds the
 * module to a host that knows them.
 */
export declare const NAVIGATES: {
    /** `view.goto { project }`: switch to another project first, as the person's own switch does. */
    readonly project: "Asks the host to switch to another project before it goes to the place in it.";
    /** `view.goto { show }`: ask for one thing to be shown on the kehikko the move ends on. */
    readonly show: "Asks the host to have one thing shown on the kehikko it goes to, by a module there that shows it.";
};
export type Navigates = keyof typeof NAVIGATES;
export declare const NAVIGATES_NAMES: Navigates[];
/** `declares.navigates`: words, each once. Free strings like `provides`: a word a later version adds still parses. */
export declare const navigatesSchema: z.ZodEffects<z.ZodArray<z.ZodString, "many">, string[], string[]>;
/**
 * The subjects a module can be asked to show, by word (`shows` in a manifest). Free strings on the
 * wire like `reacts`: a host relays a `show` of a subject it does not know to the modules that say it.
 */
export declare const SHOW_SUBJECTS: {
    /** One conversation with an agent, by the id the module that runs it keeps (Claude Code's session id). */
    readonly 'agent-session': "One conversation with an agent, by the id its module keeps for it.";
};
export type ShowSubject = keyof typeof SHOW_SUBJECTS;
/** A subject's word: a lowercase letter, then lowercase letters, digits and dashes. */
export declare const showSubject: z.ZodString;
/** `shows` in a manifest: subjects, each once. */
export declare const showsSchema: z.ZodEffects<z.ZodArray<z.ZodString, "many">, string[], string[]>;
/**
 * What a `view.goto` asks to have shown: a subject and the id of one of them, as the module that keeps
 * it spells it. The asker's word, never checked against anything by the host: whichever module holds
 * it shows it, and the others do nothing.
 */
export declare const showAskSchema: z.ZodObject<{
    subject: z.ZodString;
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    subject: string;
}, {
    id: string;
    subject: string;
}>;
export type ShowAsk = z.infer<typeof showAskSchema>;
/**
 * `context.show`, as a host relays it: the ask, which module asked (`by`, the host's own fact from the
 * registration) and when (`at`, ISO 8601, new on every ask — the same session asked for twice is two
 * asks). Sent only to the containers on the kehikko the move ended on whose manifests say `shows`
 * that subject; everybody else is told `null`.
 */
export declare const sharedShowSchema: z.ZodObject<{
    subject: z.ZodString;
    id: z.ZodString;
} & {
    by: z.ZodOptional<z.ZodString>;
    at: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    subject: string;
    at?: string | undefined;
    by?: string | undefined;
}, {
    id: string;
    subject: string;
    at?: string | undefined;
    by?: string | undefined;
}>;
export type SharedShow = z.infer<typeof sharedShowSchema>;
/**
 * Whether a module has something to do: a show is here and its `at` is not the one it last acted on
 * (`addressIsNews`'s rule). Without an `at`, it is news when the subject or id moves.
 */
export declare function showIsNews(show: Pick<SharedShow, 'subject' | 'id' | 'at'> | null | undefined, actedOn: {
    subject?: string | null;
    id?: string | null;
    at?: string | null;
} | null | undefined): boolean;
/** The least of a manifest the readers below look at. */
export interface ShowingManifest {
    shows?: readonly string[] | null;
    declares?: {
        navigates?: readonly string[] | null;
    } | null;
}
/** What a module says it can show (`shows`), `[]` when it says nothing. */
export declare function showsOf(manifest: ShowingManifest | null | undefined): readonly string[];
/** Whether a module says it can show this subject. */
export declare function canShow(manifest: ShowingManifest | null | undefined, subject: string): boolean;
/** What a module says its `view.goto` carries (`declares.navigates`), `[]` when it says nothing. */
export declare function navigatesOf(manifest: ShowingManifest | null | undefined): readonly string[];
/**
 * How a `view.goto` names a project: its permanent id (`context.projectId`, a `PROJECT_ID`) when the
 * caller has one, else its absolute folder (`context.projectPath`) — what `projectKey` gives. A host
 * matches the id first; a path names the project at that folder now, or one that was there.
 */
export declare const gotoProject: z.ZodString;
/** Whether a `view.goto`'s `project` is an id (`PROJECT_ID`) rather than a folder. */
export declare function gotoProjectIsId(project: string): boolean;
