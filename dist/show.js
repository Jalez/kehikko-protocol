import { z } from 'zod';
import { LIMITS } from './limits.js';
import { MODULE_ID, PROJECT_ID } from './ids.js';
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
export const NAVIGATES = {
    /** `view.goto { project }`: switch to another project first, as the person's own switch does. */
    project: 'Asks the host to switch to another project before it goes to the place in it.',
    /** `view.goto { show }`: ask for one thing to be shown on the kehikko the move ends on. */
    show: 'Asks the host to have one thing shown on the kehikko it goes to, by a module there that shows it.',
};
export const NAVIGATES_NAMES = Object.keys(NAVIGATES);
/** `declares.navigates`: words, each once. Free strings like `provides`: a word a later version adds still parses. */
export const navigatesSchema = z
    .array(z.string().trim().min(1).max(LIMITS.CAPABILITY))
    .max(LIMITS.NAVIGATES)
    .refine((words) => new Set(words).size === words.length, { message: 'a module says each navigation once' });
/**
 * The subjects a module can be asked to show, by word (`shows` in a manifest). Free strings on the
 * wire like `reacts`: a host relays a `show` of a subject it does not know to the modules that say it.
 */
export const SHOW_SUBJECTS = {
    /** One conversation with an agent, by the id the module that runs it keeps (Claude Code's session id). */
    'agent-session': 'One conversation with an agent, by the id its module keeps for it.',
};
/** A subject's word: a lowercase letter, then lowercase letters, digits and dashes. */
export const showSubject = z.string().regex(new RegExp(`^[a-z][a-z0-9-]{0,${LIMITS.TAG - 1}}$`), 'a subject is a lowercase word with dashes');
/** `shows` in a manifest: subjects, each once. */
export const showsSchema = z
    .array(showSubject)
    .max(LIMITS.SHOWS)
    .refine((words) => new Set(words).size === words.length, { message: 'a module says it shows each subject once' });
/**
 * What a `view.goto` asks to have shown: a subject and the id of one of them, as the module that keeps
 * it spells it. The asker's word, never checked against anything by the host: whichever module holds
 * it shows it, and the others do nothing.
 */
export const showAskSchema = z.object({
    subject: showSubject,
    id: z.string().min(1).max(LIMITS.SHOW_ID),
});
/**
 * `context.show`, as a host relays it: the ask, which module asked (`by`, the host's own fact from the
 * registration) and when (`at`, ISO 8601, new on every ask — the same session asked for twice is two
 * asks). Sent only to the containers on the kehikko the move ended on whose manifests say `shows`
 * that subject; everybody else is told `null`.
 */
export const sharedShowSchema = showAskSchema.extend({
    by: z.string().regex(MODULE_ID).optional(),
    at: z.string().min(1).max(40).optional(),
});
/**
 * Whether a module has something to do: a show is here and its `at` is not the one it last acted on
 * (`addressIsNews`'s rule). Without an `at`, it is news when the subject or id moves.
 */
export function showIsNews(show, actedOn) {
    if (!show)
        return false;
    if (!actedOn)
        return true;
    if (show.at !== undefined)
        return show.at !== actedOn.at;
    return show.subject !== actedOn.subject || show.id !== actedOn.id;
}
/** What a module says it can show (`shows`), `[]` when it says nothing. */
export function showsOf(manifest) {
    return Array.isArray(manifest?.shows) ? manifest.shows : [];
}
/** Whether a module says it can show this subject. */
export function canShow(manifest, subject) {
    return showsOf(manifest).includes(subject);
}
/** What a module says its `view.goto` carries (`declares.navigates`), `[]` when it says nothing. */
export function navigatesOf(manifest) {
    const words = manifest?.declares?.navigates;
    return Array.isArray(words) ? words : [];
}
/**
 * How a `view.goto` names a project: its permanent id (`context.projectId`, a `PROJECT_ID`) when the
 * caller has one, else its absolute folder (`context.projectPath`) — what `projectKey` gives. A host
 * matches the id first; a path names the project at that folder now, or one that was there.
 */
export const gotoProject = z.string().trim().min(1).max(LIMITS.PATH);
/** Whether a `view.goto`'s `project` is an id (`PROJECT_ID`) rather than a folder. */
export function gotoProjectIsId(project) {
    return PROJECT_ID.test(project);
}
