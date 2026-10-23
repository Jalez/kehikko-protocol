import { z } from 'zod';
/**
 * A module's settings, as a host shows them and a person changes them (2.15.0).
 *
 * A module declares its settings in its manifest (`declares.settings`): a short list of fields, each
 * with a label, a sentence, a type and a default. A host draws one form from that list, for every
 * module, and reads and changes the values by asking the MODULE at its door — `settings.get` and
 * `settings.set`, at `SETTINGS_PATH`. The module is the only writer of its own files: it checks a
 * change, writes it in the format it always had, and says `saved` or `refused` with a sentence.
 *
 * Shapes and pure functions only. The door that answers is the module's (`settingsDoor` in `/serve`
 * is one); the form is the host's. Design notes: docs/settings.md.
 */
/** The kinds of value a setting holds, each drawn by a host as one control. */
export declare const SETTING_TYPES: readonly ["boolean", "string", "number", "choice", "list"];
export type SettingType = (typeof SETTING_TYPES)[number];
/**
 * Where a setting is kept: `project` — in the project, under `.kehikot/<module>/`, one value per
 * project; `machine` — once for this computer, wherever the module keeps such things.
 */
export declare const SETTING_SCOPES: readonly ["project", "machine"];
export type SettingScope = (typeof SETTING_SCOPES)[number];
/**
 * A setting's key: a lowercase letter, then letters, digits, `.`, `_` and `-`, at most
 * `LIMITS.SETTING_KEY`. A key names a value in `values`, so the three names an object inherits are refused.
 */
export declare const SETTING_KEY: RegExp;
export declare const settingKeySchema: z.ZodEffects<z.ZodString, string, string>;
/** One choice of a `choice` setting: the value kept, and the words a person reads. */
export declare const settingChoiceSchema: z.ZodObject<{
    value: z.ZodString;
    label: z.ZodString;
}, "strip", z.ZodTypeAny, {
    value: string;
    label: string;
}, {
    value: string;
    label: string;
}>;
export type SettingChoice = z.infer<typeof settingChoiceSchema>;
declare const fieldShape: z.ZodObject<{
    key: z.ZodEffects<z.ZodString, string, string>;
    /** What the control is called: "Let the judge merge approved jobs by itself". */
    label: z.ZodString;
    /** One or two sentences under it: what it does, and what it does not. */
    description: z.ZodDefault<z.ZodString>;
    type: z.ZodEnum<["boolean", "string", "number", "choice", "list"]>;
    /** For `choice` only, and required there: what may be chosen, in the order to show it. */
    choices: z.ZodOptional<z.ZodArray<z.ZodObject<{
        value: z.ZodString;
        label: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        value: string;
        label: string;
    }, {
        value: string;
        label: string;
    }>, "many">>;
    /** The value when nothing was ever set: of the setting's type. */
    default: z.ZodUnknown;
    scope: z.ZodDefault<z.ZodEnum<["project", "machine"]>>;
    /**
     * Only a person may change it: a call that does not come from a person — through the host's page
     * with a pass the host vouches for, or from the module's own page with its ticket — is refused.
     * For a switch that acts outside the project, posts somewhere, spends, or runs something.
     */
    personOnly: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    key: string;
    type: "string" | "number" | "boolean" | "choice" | "list";
    label: string;
    scope: "project" | "machine";
    description: string;
    personOnly: boolean;
    default?: unknown;
    choices?: {
        value: string;
        label: string;
    }[] | undefined;
}, {
    key: string;
    type: "string" | "number" | "boolean" | "choice" | "list";
    label: string;
    default?: unknown;
    scope?: "project" | "machine" | undefined;
    description?: string | undefined;
    choices?: {
        value: string;
        label: string;
    }[] | undefined;
    personOnly?: boolean | undefined;
}>;
/** A setting's whole declaration. Checked: `choices` iff `choice`, choices unique, and `default` of the type. */
export declare const settingFieldSchema: z.ZodEffects<z.ZodObject<{
    key: z.ZodEffects<z.ZodString, string, string>;
    /** What the control is called: "Let the judge merge approved jobs by itself". */
    label: z.ZodString;
    /** One or two sentences under it: what it does, and what it does not. */
    description: z.ZodDefault<z.ZodString>;
    type: z.ZodEnum<["boolean", "string", "number", "choice", "list"]>;
    /** For `choice` only, and required there: what may be chosen, in the order to show it. */
    choices: z.ZodOptional<z.ZodArray<z.ZodObject<{
        value: z.ZodString;
        label: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        value: string;
        label: string;
    }, {
        value: string;
        label: string;
    }>, "many">>;
    /** The value when nothing was ever set: of the setting's type. */
    default: z.ZodUnknown;
    scope: z.ZodDefault<z.ZodEnum<["project", "machine"]>>;
    /**
     * Only a person may change it: a call that does not come from a person — through the host's page
     * with a pass the host vouches for, or from the module's own page with its ticket — is refused.
     * For a switch that acts outside the project, posts somewhere, spends, or runs something.
     */
    personOnly: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    key: string;
    type: "string" | "number" | "boolean" | "choice" | "list";
    label: string;
    scope: "project" | "machine";
    description: string;
    personOnly: boolean;
    default?: unknown;
    choices?: {
        value: string;
        label: string;
    }[] | undefined;
}, {
    key: string;
    type: "string" | "number" | "boolean" | "choice" | "list";
    label: string;
    default?: unknown;
    scope?: "project" | "machine" | undefined;
    description?: string | undefined;
    choices?: {
        value: string;
        label: string;
    }[] | undefined;
    personOnly?: boolean | undefined;
}>, {
    key: string;
    type: "string" | "number" | "boolean" | "choice" | "list";
    label: string;
    scope: "project" | "machine";
    description: string;
    personOnly: boolean;
    default?: unknown;
    choices?: {
        value: string;
        label: string;
    }[] | undefined;
}, {
    key: string;
    type: "string" | "number" | "boolean" | "choice" | "list";
    label: string;
    default?: unknown;
    scope?: "project" | "machine" | undefined;
    description?: string | undefined;
    choices?: {
        value: string;
        label: string;
    }[] | undefined;
    personOnly?: boolean | undefined;
}>;
export type SettingField = z.infer<typeof fieldShape>;
export type SettingFieldInput = z.input<typeof fieldShape>;
/** A module's whole list of settings: at most `LIMITS.SETTINGS`, each key once. */
export declare const settingsDeclarationSchema: z.ZodEffects<z.ZodArray<z.ZodEffects<z.ZodObject<{
    key: z.ZodEffects<z.ZodString, string, string>;
    /** What the control is called: "Let the judge merge approved jobs by itself". */
    label: z.ZodString;
    /** One or two sentences under it: what it does, and what it does not. */
    description: z.ZodDefault<z.ZodString>;
    type: z.ZodEnum<["boolean", "string", "number", "choice", "list"]>;
    /** For `choice` only, and required there: what may be chosen, in the order to show it. */
    choices: z.ZodOptional<z.ZodArray<z.ZodObject<{
        value: z.ZodString;
        label: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        value: string;
        label: string;
    }, {
        value: string;
        label: string;
    }>, "many">>;
    /** The value when nothing was ever set: of the setting's type. */
    default: z.ZodUnknown;
    scope: z.ZodDefault<z.ZodEnum<["project", "machine"]>>;
    /**
     * Only a person may change it: a call that does not come from a person — through the host's page
     * with a pass the host vouches for, or from the module's own page with its ticket — is refused.
     * For a switch that acts outside the project, posts somewhere, spends, or runs something.
     */
    personOnly: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    key: string;
    type: "string" | "number" | "boolean" | "choice" | "list";
    label: string;
    scope: "project" | "machine";
    description: string;
    personOnly: boolean;
    default?: unknown;
    choices?: {
        value: string;
        label: string;
    }[] | undefined;
}, {
    key: string;
    type: "string" | "number" | "boolean" | "choice" | "list";
    label: string;
    default?: unknown;
    scope?: "project" | "machine" | undefined;
    description?: string | undefined;
    choices?: {
        value: string;
        label: string;
    }[] | undefined;
    personOnly?: boolean | undefined;
}>, {
    key: string;
    type: "string" | "number" | "boolean" | "choice" | "list";
    label: string;
    scope: "project" | "machine";
    description: string;
    personOnly: boolean;
    default?: unknown;
    choices?: {
        value: string;
        label: string;
    }[] | undefined;
}, {
    key: string;
    type: "string" | "number" | "boolean" | "choice" | "list";
    label: string;
    default?: unknown;
    scope?: "project" | "machine" | undefined;
    description?: string | undefined;
    choices?: {
        value: string;
        label: string;
    }[] | undefined;
    personOnly?: boolean | undefined;
}>, "many">, {
    key: string;
    type: "string" | "number" | "boolean" | "choice" | "list";
    label: string;
    scope: "project" | "machine";
    description: string;
    personOnly: boolean;
    default?: unknown;
    choices?: {
        value: string;
        label: string;
    }[] | undefined;
}[], {
    key: string;
    type: "string" | "number" | "boolean" | "choice" | "list";
    label: string;
    default?: unknown;
    scope?: "project" | "machine" | undefined;
    description?: string | undefined;
    choices?: {
        value: string;
        label: string;
    }[] | undefined;
    personOnly?: boolean | undefined;
}[]>;
export type SettingsDeclaration = z.infer<typeof settingsDeclarationSchema>;
/**
 * Why `value` cannot be this setting's value, as a sentence, or null when it can. Pure; the one
 * rule a module's door and a host's form both use.
 */
export declare function settingValueIssue(field: Pick<SettingField, 'type' | 'choices'>, value: unknown): string | null;
/**
 * What a host may ask at a module's door, by capability, each with the sentence a person reads.
 * The other way round from `CAPABILITIES`: those are what a module asks the host. A module OFFERS a
 * door capability by declaring it — `settings` by listing `declares.settings` — and a host asks
 * these methods only of a module that offers it (`offersDoorCapability`).
 */
export declare const DOOR_CAPABILITIES: {
    readonly settings: "Shows its settings in the host’s Settings, and takes a change made there.";
};
export type DoorCapability = keyof typeof DOOR_CAPABILITIES;
/** Every door method and the capability it is filed under. A plain object: look up with `own()`. */
export declare const DOOR_METHODS: {
    readonly 'settings.get': "settings";
    readonly 'settings.set': "settings";
};
export type DoorMethod = keyof typeof DOOR_METHODS;
export declare const DOOR_METHOD_NAMES: DoorMethod[];
/**
 * Where a module answers its settings: `GET` is `settings.get` (the params in the query), `POST` is
 * `settings.set` (the params as the JSON body). Under `/api/`, so `doors()` routes it to `answer`.
 */
export declare const SETTINGS_PATH = "/api/kehikot/settings";
/** Who is asking for a change: the person (proved with a pass or the page's ticket), or an agent or program. */
export declare const SETTINGS_ASKERS: readonly ["person", "agent"];
export type SettingsAsker = (typeof SETTINGS_ASKERS)[number];
/** A pass the host mints for one change a person made on its page: 22 to 64 URL-safe characters. */
export declare const SETTINGS_PASS: RegExp;
export declare const doorMethodParams: {
    /** The values now, for this project (and this machine). */
    readonly 'settings.get': z.ZodObject<{
        project: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    }, "strip", z.ZodTypeAny, {
        project?: string | undefined;
    }, {
        project?: string | undefined;
    }>;
    /**
     * Change ONE setting. `by` says who: `agent` unless said (an agent's call says nothing and is an
     * agent's). `by: 'person'` counts only with a `pass` the host vouches for at `SETTINGS_PASS_PATH`,
     * or with the module page's own ticket; without either it is read as `agent`.
     */
    readonly 'settings.set': z.ZodObject<{
        project: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        key: z.ZodEffects<z.ZodString, string, string>;
        value: z.ZodUnknown;
        by: z.ZodDefault<z.ZodEnum<["person", "agent"]>>;
        pass: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        key: string;
        by: "agent" | "person";
        value?: unknown;
        project?: string | undefined;
        pass?: string | undefined;
    }, {
        key: string;
        value?: unknown;
        project?: string | undefined;
        by?: "agent" | "person" | undefined;
        pass?: string | undefined;
    }>;
};
export type DoorMethodParams<M extends DoorMethod> = z.input<(typeof doorMethodParams)[M]>;
/**
 * `settings.get`'s answer. `values`: every declared key's value, the default where nothing was set.
 * `file`: where the project's settings are kept, relative to the project (`.kehikot/factory/settings.json`),
 * so a host can offer to open it to read. `problem`: a sentence when the file could not be read — the
 * values are then the defaults, and nothing was changed.
 */
export declare const settingsGetResult: z.ZodObject<{
    values: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    file: z.ZodCatch<z.ZodOptional<z.ZodString>>;
    problem: z.ZodCatch<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    values: Record<string, unknown>;
    file?: string | undefined;
    problem?: string | undefined;
}, {
    values: Record<string, unknown>;
    file?: unknown;
    problem?: unknown;
}>;
export type SettingsGetResult = z.infer<typeof settingsGetResult>;
/** What became of a `settings.set`. `saved`: it is written. `refused`: nothing was, and `why` says so. */
export declare const SETTINGS_SET_OUTCOMES: readonly ["saved", "refused"];
export type SettingsSetOutcome = (typeof SETTINGS_SET_OUTCOMES)[number];
/** `settings.set`'s answer: the outcome, the sentence for a refusal, and the values as they now stand. */
export declare const settingsSetResult: z.ZodObject<{
    outcome: z.ZodEnum<["saved", "refused"]>;
    why: z.ZodDefault<z.ZodString>;
    values: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    outcome: "saved" | "refused";
    why: string;
    values?: Record<string, unknown> | undefined;
}, {
    outcome: "saved" | "refused";
    values?: Record<string, unknown> | undefined;
    why?: string | undefined;
}>;
export type SettingsSetResult = z.infer<typeof settingsSetResult>;
export declare const doorMethodResults: {
    readonly 'settings.get': z.ZodObject<{
        values: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        file: z.ZodCatch<z.ZodOptional<z.ZodString>>;
        problem: z.ZodCatch<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        values: Record<string, unknown>;
        file?: string | undefined;
        problem?: string | undefined;
    }, {
        values: Record<string, unknown>;
        file?: unknown;
        problem?: unknown;
    }>;
    readonly 'settings.set': z.ZodObject<{
        outcome: z.ZodEnum<["saved", "refused"]>;
        why: z.ZodDefault<z.ZodString>;
        values: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        outcome: "saved" | "refused";
        why: string;
        values?: Record<string, unknown> | undefined;
    }, {
        outcome: "saved" | "refused";
        values?: Record<string, unknown> | undefined;
        why?: string | undefined;
    }>;
};
/** Whether a module offers a door capability: for `settings`, a non-empty `declares.settings`. Pure. */
export declare function offersDoorCapability(manifest: {
    declares?: {
        settings?: readonly unknown[];
    };
} | null | undefined, capability: DoorCapability): boolean;
/**
 * The host's route a module's SERVER asks whether a pass is one it minted:
 * `GET /host/settings-pass?pass=<pass>&module=<id>&key=<key>&project=<folder>` → `settingsPassResult`.
 * A host mints a pass only when its own page sends a person's change, for that module, key and
 * project, and answers `person: true` for it once, within `LIMITS.SETTINGS_PASS_MS`. Programs on this machine.
 */
export declare const SETTINGS_PASS_PATH = "/host/settings-pass";
export declare const settingsPassResult: z.ZodObject<{
    ok: z.ZodLiteral<true>;
    person: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    ok: true;
    person: boolean;
}, {
    ok: true;
    person: boolean;
}>;
export type SettingsPassResult = z.infer<typeof settingsPassResult>;
/** What a pass is for: the module, the key and the project (absent for a machine setting). */
export declare const settingsPassAboutSchema: z.ZodObject<{
    module: z.ZodString;
    key: z.ZodEffects<z.ZodString, string, string>;
    project: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
}, "strip", z.ZodTypeAny, {
    key: string;
    module: string;
    project?: string | undefined;
}, {
    key: string;
    module: string;
    project?: string | undefined;
}>;
export type SettingsPassAbout = z.infer<typeof settingsPassAboutSchema>;
/** The sentences a module says about a change, in one wording for every module. */
export declare const SETTINGS_SAYS: {
    readonly unknown: (key: string, keys: readonly string[]) => string;
    readonly wrong: (label: string, issue: string) => string;
    readonly personOnly: (label: string) => string;
    readonly noProject: "Name the project: `project` is its absolute folder.";
};
/**
 * Why a change cannot be made, or null when it may be: no such key, a value not of the type, or a
 * `personOnly` setting asked by somebody who is not the person. `person` is the door's finding (a
 * vouched pass, or the page's ticket), never the call's own `by`. Pure.
 */
export declare function settingsSetRefusal(fields: readonly Pick<SettingField, 'key' | 'label' | 'type' | 'choices' | 'personOnly' | 'scope'>[], change: {
    key: string;
    value: unknown;
    project?: string | undefined;
}, person: boolean): string | null;
/**
 * Every declared key's value: what was read where it is of the setting's type, the default where it
 * is not or was never set. Keys not declared are left out. Pure.
 */
export declare function settingsValues(fields: readonly Pick<SettingField, 'key' | 'type' | 'choices' | 'default'>[], read: Record<string, unknown>): Record<string, unknown>;
export {};
