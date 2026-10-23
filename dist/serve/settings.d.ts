import { type SettingField, type SettingsPassAbout } from '../settings.js';
import type { Answer } from './doors.js';
export interface HostVouchesOptions {
    env?: Record<string, string | undefined>;
    /** How long each origin gets, in ms. Default `LIMITS.HOST_ASK_MS`. */
    timeoutMs?: number;
    /** Injected by the tests. */
    fetch?: typeof fetch;
}
/** The URLs `hostVouches` asks, in order. Pure; exported for tests. */
export declare function hostVouchUrls(pass: string, about: SettingsPassAbout, env?: Record<string, string | undefined>): string[];
/**
 * Whether the host minted `pass` for a person's change of `about.key` of `about.module` (in
 * `about.project`). Asks each origin of `KEHIKOT_ORIGINS` until one says `person: true`. Fails closed:
 * a malformed pass, no answer, a refusal, a slow host or a reply of another shape is `false`. Never throws.
 */
export declare function hostVouches(pass: string | null | undefined, about: SettingsPassAbout, options?: HostVouchesOptions): Promise<boolean>;
/** What a module's store says about its settings: the values as kept (any shape), and where. */
export interface SettingsRead {
    /** The values the store holds, by key; a missing or ill-typed one reads as the field's default. */
    values: Record<string, unknown>;
    /** The project's settings file, relative to the project: `.kehikot/<module>/settings.json`. */
    file?: string;
    /** A sentence when the store could not be read; the values are then the defaults. */
    problem?: string;
}
export interface SettingsDoorOptions {
    /** The module's id: what a pass is asked about. */
    module: string;
    /** The module's declared settings: the same list its manifest serves as `declares.settings`. */
    fields: readonly SettingField[];
    /** Read the store for this project (null: no project named, for a module whose settings are all `machine`). */
    read(project: string | null): SettingsRead | Promise<SettingsRead>;
    /**
     * Write ONE checked change, in the store's own format. Return a sentence to refuse (the project is
     * not one, the file cannot be read and would be lost), or null when it is written.
     */
    write(project: string | null, key: string, value: unknown): string | null | Promise<string | null>;
    /** The module page's ticket: a change carrying it is the person's. */
    ticket?: string;
    /** Asked for a `by: 'person'` change with a pass. Default `hostVouches`. */
    vouch?: (pass: string, about: SettingsPassAbout) => Promise<boolean>;
}
/**
 * The `answer` for `SETTINGS_PATH`, or `null` for any other path, to call first from a module's own
 * `answer`:
 *
 *     const settings = settingsDoor({ module: ID, fields: SETTINGS, read, write, ticket: TICKET })
 *     // inside answer(method, path, query, body, ticket):
 *     const said = await settings(method, path, query, body, ticket)
 *     if (said) return said
 *
 * `GET` answers `settingsGetResult`. `POST` checks the change with `settingsSetRefusal` — the person is
 * a call carrying the page's ticket, or `by: 'person'` with a pass the host vouches for — then calls
 * `write`, and answers `settingsSetResult` with the values as they then stand. A refusal is 200 with
 * `outcome: 'refused'`; a call that is not one (no key, a malformed pass) is 400.
 */
export declare function settingsDoor(options: SettingsDoorOptions): Answer;
