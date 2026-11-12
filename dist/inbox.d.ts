import { z } from 'zod';
/**
 * 2.79.0. The person's Inbox, shown by a module's PAGE: the host keeps ONE record of what modules
 * need, are doing and have said (what `activity.set` reports), and a module that declares
 * `inbox:person` reads it and acts on it for the person — marks a thing seen, dismisses it,
 * forgets it from the log, answers its question, goes to it, or stops showing a module there.
 *
 * Every one of these is the PERSON's, and so a page's alone: a host answers them from a module's
 * frame and nowhere else — never from a module's server (none is in `SERVER_METHODS`, so
 * `serverAskSchema` refuses them), never from an agent's tool. A host holds every act but `seen`
 * to the person's fresh press inside the frame and declines it without one (`actNeedsPress`);
 * reading needs none.
 *
 * The record changes and the host says so with `kehikot.inbox` (`inboxMessageSchema`): `changed`
 * (read again; the `rev` is the record's), or `next` (the person asked for the next thing that
 * needs them, by the host's own shortcut: the page goes to it with `inbox.open`). A host sends it
 * only to a frame whose manifest declares `inbox:person`. Design notes: docs/inbox.md.
 */
/** The methods only a module's page may ask, and only for the person. None is a server method. */
export declare const PERSON_METHODS: readonly ["inbox.read", "inbox.log", "inbox.act", "inbox.answer", "inbox.open", "inbox.use"];
export type PersonMethod = (typeof PERSON_METHODS)[number];
/** The acts a host takes only on the person's fresh press in the frame (everything but reading and `seen`). */
export declare const PRESSED_METHODS: readonly PersonMethod[];
/** Whether an act is taken only on the person's fresh press: every one but `seen`. */
export declare const actNeedsPress: (method: string, params: unknown) => boolean;
/** One item named: the module that reported it and its id there. */
export declare const inboxKeySchema: z.ZodObject<{
    module: z.ZodString;
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    module: string;
}, {
    id: string;
    module: string;
}>;
export type InboxKey = z.infer<typeof inboxKeySchema>;
/**
 * A question an item asks, as the person sees it: the text, the choices to press, and the answer
 * already sent (null while unanswered). Where the answer goes is the host's to know.
 */
export declare const inboxQuestionSchema: z.ZodObject<{
    text: z.ZodString;
    choices: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    answered: z.ZodDefault<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    choices: string[];
    text: string;
    answered: string | null;
}, {
    text: string;
    choices?: string[] | undefined;
    answered?: string | null | undefined;
}>;
export type InboxQuestion = z.infer<typeof inboxQuestionSchema>;
/**
 * 2.87.0. An item whose primary action is to take the person to its place (`inboxItemSchema.go`):
 * `label` is the button's words when the host has its own (text, never markup); absent, a page says
 * "Take me there". Taking it is `inbox.open`, as for any item.
 */
export declare const inboxGoSchema: z.ZodObject<{
    label: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    label?: string | undefined;
}, {
    label?: string | undefined;
}>;
export type InboxGo = z.infer<typeof inboxGoSchema>;
/** What a page says on an item's `go` button when the host gave no `label`. */
export declare const INBOX_GO_LABEL = "Take me there";
/**
 * One open item of the record, in the words the host has for it. Every string is TEXT: a page never
 * renders one as markup or a link and never opens a URL from one.
 *
 * - `by`: who says it, the module's registered name (the host's word); `label` and `detail` are the
 *   module's claim. `says` is the words of its declared event (2.31.0), when it is one.
 * - `where`: its place in words (parts · kehikko · epic), or the project's name for one about the
 *   whole project; `here` whether it belongs to the kehikko the frame is on (or names none and
 *   the host cannot tell), `project` whether it is about the whole project.
 * - `entered`: when it entered its state, ms since the epoch. `seen`: a finished thing the person
 *   has been to. A dismissed item is not listed; a module the person stopped showing is not listed.
 * - `mutable`: whether a page may offer "Stop showing <by> here" (`inbox.use`): a module's items, never
 *   the host's own lists.
 * - `go` (2.87.0): the item's primary action is to take the person to its place — an agent's offer
 *   ("the failing test is in the auth epic, part 3"). A page draws it as a primary button, `label`
 *   when given (text), else its own words ("Take me there"), beside dismiss; pressing it is
 *   `inbox.open`, which goes there with a Go back mark and closes the offer. Absent: an ordinary item.
 */
export declare const inboxItemSchema: z.ZodObject<{
    module: z.ZodString;
    id: z.ZodString;
    by: z.ZodString;
    state: z.ZodEnum<["working", "attention", "done"]>;
    says: z.ZodOptional<z.ZodString>;
    label: z.ZodString;
    detail: z.ZodOptional<z.ZodString>;
    priority: z.ZodDefault<z.ZodEnum<["urgent", "normal", "low"]>>;
    where: z.ZodDefault<z.ZodString>;
    here: z.ZodDefault<z.ZodBoolean>;
    project: z.ZodDefault<z.ZodBoolean>;
    entered: z.ZodNumber;
    seen: z.ZodDefault<z.ZodBoolean>;
    question: z.ZodOptional<z.ZodObject<{
        text: z.ZodString;
        choices: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        answered: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        choices: string[];
        text: string;
        answered: string | null;
    }, {
        text: string;
        choices?: string[] | undefined;
        answered?: string | null | undefined;
    }>>;
    mutable: z.ZodDefault<z.ZodBoolean>;
    go: z.ZodOptional<z.ZodObject<{
        label: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        label?: string | undefined;
    }, {
        label?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    module: string;
    project: boolean;
    state: "working" | "attention" | "done";
    label: string;
    priority: "urgent" | "normal" | "low";
    by: string;
    where: string;
    here: boolean;
    entered: number;
    seen: boolean;
    mutable: boolean;
    question?: {
        choices: string[];
        text: string;
        answered: string | null;
    } | undefined;
    says?: string | undefined;
    detail?: string | undefined;
    go?: {
        label?: string | undefined;
    } | undefined;
}, {
    id: string;
    module: string;
    state: "working" | "attention" | "done";
    label: string;
    by: string;
    entered: number;
    question?: {
        text: string;
        choices?: string[] | undefined;
        answered?: string | null | undefined;
    } | undefined;
    project?: boolean | undefined;
    says?: string | undefined;
    detail?: string | undefined;
    priority?: "urgent" | "normal" | "low" | undefined;
    go?: {
        label?: string | undefined;
    } | undefined;
    where?: string | undefined;
    here?: boolean | undefined;
    seen?: boolean | undefined;
    mutable?: boolean | undefined;
}>;
export type InboxItem = z.infer<typeof inboxItemSchema>;
/** How many items an answer carries at most, per project. */
export declare const INBOX_ITEMS_MAX = 500;
/**
 * `inbox.read`: the record of the project the frame stands in, and the other projects' live items.
 *
 * - `rev`: changes with every write; `kehikot.inbox` carries the newest.
 * - `items`: the open items, as above. `next`: what the host's Next goes to now, or null.
 * - `elsewhere`: the person's other projects that hold live items, each with its own.
 * - `earlier`: how many closed items the log holds (`inbox.log`).
 * - `muted`: the modules the person stopped showing, by id and name, for the way back (`inbox.use`).
 */
export declare const inboxReadResult: z.ZodObject<{
    rev: z.ZodNumber;
    items: z.ZodArray<z.ZodObject<{
        module: z.ZodString;
        id: z.ZodString;
        by: z.ZodString;
        state: z.ZodEnum<["working", "attention", "done"]>;
        says: z.ZodOptional<z.ZodString>;
        label: z.ZodString;
        detail: z.ZodOptional<z.ZodString>;
        priority: z.ZodDefault<z.ZodEnum<["urgent", "normal", "low"]>>;
        where: z.ZodDefault<z.ZodString>;
        here: z.ZodDefault<z.ZodBoolean>;
        project: z.ZodDefault<z.ZodBoolean>;
        entered: z.ZodNumber;
        seen: z.ZodDefault<z.ZodBoolean>;
        question: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            choices: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            answered: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            choices: string[];
            text: string;
            answered: string | null;
        }, {
            text: string;
            choices?: string[] | undefined;
            answered?: string | null | undefined;
        }>>;
        mutable: z.ZodDefault<z.ZodBoolean>;
        go: z.ZodOptional<z.ZodObject<{
            label: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            label?: string | undefined;
        }, {
            label?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        module: string;
        project: boolean;
        state: "working" | "attention" | "done";
        label: string;
        priority: "urgent" | "normal" | "low";
        by: string;
        where: string;
        here: boolean;
        entered: number;
        seen: boolean;
        mutable: boolean;
        question?: {
            choices: string[];
            text: string;
            answered: string | null;
        } | undefined;
        says?: string | undefined;
        detail?: string | undefined;
        go?: {
            label?: string | undefined;
        } | undefined;
    }, {
        id: string;
        module: string;
        state: "working" | "attention" | "done";
        label: string;
        by: string;
        entered: number;
        question?: {
            text: string;
            choices?: string[] | undefined;
            answered?: string | null | undefined;
        } | undefined;
        project?: boolean | undefined;
        says?: string | undefined;
        detail?: string | undefined;
        priority?: "urgent" | "normal" | "low" | undefined;
        go?: {
            label?: string | undefined;
        } | undefined;
        where?: string | undefined;
        here?: boolean | undefined;
        seen?: boolean | undefined;
        mutable?: boolean | undefined;
    }>, "many">;
    next: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        module: z.ZodString;
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        module: string;
    }, {
        id: string;
        module: string;
    }>>>;
    elsewhere: z.ZodDefault<z.ZodArray<z.ZodObject<{
        project: z.ZodObject<{
            id: z.ZodNumber;
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: number;
            name: string;
        }, {
            id: number;
            name: string;
        }>;
        items: z.ZodArray<z.ZodObject<{
            module: z.ZodString;
            id: z.ZodString;
            by: z.ZodString;
            state: z.ZodEnum<["working", "attention", "done"]>;
            says: z.ZodOptional<z.ZodString>;
            label: z.ZodString;
            detail: z.ZodOptional<z.ZodString>;
            priority: z.ZodDefault<z.ZodEnum<["urgent", "normal", "low"]>>;
            where: z.ZodDefault<z.ZodString>;
            here: z.ZodDefault<z.ZodBoolean>;
            project: z.ZodDefault<z.ZodBoolean>;
            entered: z.ZodNumber;
            seen: z.ZodDefault<z.ZodBoolean>;
            question: z.ZodOptional<z.ZodObject<{
                text: z.ZodString;
                choices: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                answered: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            }, "strip", z.ZodTypeAny, {
                choices: string[];
                text: string;
                answered: string | null;
            }, {
                text: string;
                choices?: string[] | undefined;
                answered?: string | null | undefined;
            }>>;
            mutable: z.ZodDefault<z.ZodBoolean>;
            go: z.ZodOptional<z.ZodObject<{
                label: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                label?: string | undefined;
            }, {
                label?: string | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            module: string;
            project: boolean;
            state: "working" | "attention" | "done";
            label: string;
            priority: "urgent" | "normal" | "low";
            by: string;
            where: string;
            here: boolean;
            entered: number;
            seen: boolean;
            mutable: boolean;
            question?: {
                choices: string[];
                text: string;
                answered: string | null;
            } | undefined;
            says?: string | undefined;
            detail?: string | undefined;
            go?: {
                label?: string | undefined;
            } | undefined;
        }, {
            id: string;
            module: string;
            state: "working" | "attention" | "done";
            label: string;
            by: string;
            entered: number;
            question?: {
                text: string;
                choices?: string[] | undefined;
                answered?: string | null | undefined;
            } | undefined;
            project?: boolean | undefined;
            says?: string | undefined;
            detail?: string | undefined;
            priority?: "urgent" | "normal" | "low" | undefined;
            go?: {
                label?: string | undefined;
            } | undefined;
            where?: string | undefined;
            here?: boolean | undefined;
            seen?: boolean | undefined;
            mutable?: boolean | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        project: {
            id: number;
            name: string;
        };
        items: {
            id: string;
            module: string;
            project: boolean;
            state: "working" | "attention" | "done";
            label: string;
            priority: "urgent" | "normal" | "low";
            by: string;
            where: string;
            here: boolean;
            entered: number;
            seen: boolean;
            mutable: boolean;
            question?: {
                choices: string[];
                text: string;
                answered: string | null;
            } | undefined;
            says?: string | undefined;
            detail?: string | undefined;
            go?: {
                label?: string | undefined;
            } | undefined;
        }[];
    }, {
        project: {
            id: number;
            name: string;
        };
        items: {
            id: string;
            module: string;
            state: "working" | "attention" | "done";
            label: string;
            by: string;
            entered: number;
            question?: {
                text: string;
                choices?: string[] | undefined;
                answered?: string | null | undefined;
            } | undefined;
            project?: boolean | undefined;
            says?: string | undefined;
            detail?: string | undefined;
            priority?: "urgent" | "normal" | "low" | undefined;
            go?: {
                label?: string | undefined;
            } | undefined;
            where?: string | undefined;
            here?: boolean | undefined;
            seen?: boolean | undefined;
            mutable?: boolean | undefined;
        }[];
    }>, "many">>;
    earlier: z.ZodDefault<z.ZodNumber>;
    muted: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
    }, {
        id: string;
        name: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    items: {
        id: string;
        module: string;
        project: boolean;
        state: "working" | "attention" | "done";
        label: string;
        priority: "urgent" | "normal" | "low";
        by: string;
        where: string;
        here: boolean;
        entered: number;
        seen: boolean;
        mutable: boolean;
        question?: {
            choices: string[];
            text: string;
            answered: string | null;
        } | undefined;
        says?: string | undefined;
        detail?: string | undefined;
        go?: {
            label?: string | undefined;
        } | undefined;
    }[];
    next: {
        id: string;
        module: string;
    } | null;
    rev: number;
    elsewhere: {
        project: {
            id: number;
            name: string;
        };
        items: {
            id: string;
            module: string;
            project: boolean;
            state: "working" | "attention" | "done";
            label: string;
            priority: "urgent" | "normal" | "low";
            by: string;
            where: string;
            here: boolean;
            entered: number;
            seen: boolean;
            mutable: boolean;
            question?: {
                choices: string[];
                text: string;
                answered: string | null;
            } | undefined;
            says?: string | undefined;
            detail?: string | undefined;
            go?: {
                label?: string | undefined;
            } | undefined;
        }[];
    }[];
    earlier: number;
    muted: {
        id: string;
        name: string;
    }[];
}, {
    items: {
        id: string;
        module: string;
        state: "working" | "attention" | "done";
        label: string;
        by: string;
        entered: number;
        question?: {
            text: string;
            choices?: string[] | undefined;
            answered?: string | null | undefined;
        } | undefined;
        project?: boolean | undefined;
        says?: string | undefined;
        detail?: string | undefined;
        priority?: "urgent" | "normal" | "low" | undefined;
        go?: {
            label?: string | undefined;
        } | undefined;
        where?: string | undefined;
        here?: boolean | undefined;
        seen?: boolean | undefined;
        mutable?: boolean | undefined;
    }[];
    rev: number;
    next?: {
        id: string;
        module: string;
    } | null | undefined;
    elsewhere?: {
        project: {
            id: number;
            name: string;
        };
        items: {
            id: string;
            module: string;
            state: "working" | "attention" | "done";
            label: string;
            by: string;
            entered: number;
            question?: {
                text: string;
                choices?: string[] | undefined;
                answered?: string | null | undefined;
            } | undefined;
            project?: boolean | undefined;
            says?: string | undefined;
            detail?: string | undefined;
            priority?: "urgent" | "normal" | "low" | undefined;
            go?: {
                label?: string | undefined;
            } | undefined;
            where?: string | undefined;
            here?: boolean | undefined;
            seen?: boolean | undefined;
            mutable?: boolean | undefined;
        }[];
    }[] | undefined;
    earlier?: number | undefined;
    muted?: {
        id: string;
        name: string;
    }[] | undefined;
}>;
export type InboxReadResult = z.infer<typeof inboxReadResult>;
/** Which items a log page or an act over many is about: this kehikko, or everywhere in the project. */
export declare const INBOX_SCOPES: readonly ["here", "everywhere"];
export type InboxScope = (typeof INBOX_SCOPES)[number];
export declare const inboxReadParams: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
/** `inbox.log`: Earlier, a page of it, newest first. */
export declare const inboxLogParams: z.ZodObject<{
    scope: z.ZodDefault<z.ZodEnum<["here", "everywhere"]>>;
    offset: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
    scope: "here" | "everywhere";
}, {
    limit?: number | undefined;
    offset?: number | undefined;
    scope?: "here" | "everywhere" | undefined;
}>;
/** One row of Earlier: what became of an item (`what`, in words) and when. */
export declare const inboxLogRowSchema: z.ZodObject<{
    key: z.ZodString;
    module: z.ZodString;
    id: z.ZodString;
    by: z.ZodString;
    label: z.ZodString;
    what: z.ZodString;
    where: z.ZodDefault<z.ZodString>;
    at: z.ZodNumber;
    priority: z.ZodDefault<z.ZodEnum<["urgent", "normal", "low"]>>;
}, "strip", z.ZodTypeAny, {
    at: number;
    id: string;
    key: string;
    module: string;
    label: string;
    priority: "urgent" | "normal" | "low";
    by: string;
    where: string;
    what: string;
}, {
    at: number;
    id: string;
    key: string;
    module: string;
    label: string;
    by: string;
    what: string;
    priority?: "urgent" | "normal" | "low" | undefined;
    where?: string | undefined;
}>;
export type InboxLogRow = z.infer<typeof inboxLogRowSchema>;
export declare const inboxLogResult: z.ZodObject<{
    rows: z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        module: z.ZodString;
        id: z.ZodString;
        by: z.ZodString;
        label: z.ZodString;
        what: z.ZodString;
        where: z.ZodDefault<z.ZodString>;
        at: z.ZodNumber;
        priority: z.ZodDefault<z.ZodEnum<["urgent", "normal", "low"]>>;
    }, "strip", z.ZodTypeAny, {
        at: number;
        id: string;
        key: string;
        module: string;
        label: string;
        priority: "urgent" | "normal" | "low";
        by: string;
        where: string;
        what: string;
    }, {
        at: number;
        id: string;
        key: string;
        module: string;
        label: string;
        by: string;
        what: string;
        priority?: "urgent" | "normal" | "low" | undefined;
        where?: string | undefined;
    }>, "many">;
    more: z.ZodBoolean;
    total: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    more: boolean;
    rows: {
        at: number;
        id: string;
        key: string;
        module: string;
        label: string;
        priority: "urgent" | "normal" | "low";
        by: string;
        where: string;
        what: string;
    }[];
    total: number;
}, {
    more: boolean;
    rows: {
        at: number;
        id: string;
        key: string;
        module: string;
        label: string;
        by: string;
        what: string;
        priority?: "urgent" | "normal" | "low" | undefined;
        where?: string | undefined;
    }[];
    total: number;
}>;
export type InboxLogResult = z.infer<typeof inboxLogResult>;
/**
 * `inbox.act`: the person's act on items. `seen` and `dismiss` name the items (`keys`); `forget`
 * names them, or with none forgets the whole log in `scope`; `seen-all` marks every finished thing
 * in `scope` seen. `project`: another project's items (`elsewhere`). Every act but `seen` only on
 * the person's fresh press.
 */
export declare const INBOX_ACTS: readonly ["seen", "dismiss", "forget", "seen-all"];
export type InboxAct = (typeof INBOX_ACTS)[number];
export declare const inboxActParams: z.ZodEffects<z.ZodObject<{
    do: z.ZodEnum<["seen", "dismiss", "forget", "seen-all"]>;
    keys: z.ZodOptional<z.ZodArray<z.ZodObject<{
        module: z.ZodString;
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        module: string;
    }, {
        id: string;
        module: string;
    }>, "many">>;
    scope: z.ZodDefault<z.ZodEnum<["here", "everywhere"]>>;
    project: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    scope: "here" | "everywhere";
    do: "seen" | "dismiss" | "forget" | "seen-all";
    keys?: {
        id: string;
        module: string;
    }[] | undefined;
    project?: number | undefined;
}, {
    do: "seen" | "dismiss" | "forget" | "seen-all";
    keys?: {
        id: string;
        module: string;
    }[] | undefined;
    project?: number | undefined;
    scope?: "here" | "everywhere" | undefined;
}>, {
    scope: "here" | "everywhere";
    do: "seen" | "dismiss" | "forget" | "seen-all";
    keys?: {
        id: string;
        module: string;
    }[] | undefined;
    project?: number | undefined;
}, {
    do: "seen" | "dismiss" | "forget" | "seen-all";
    keys?: {
        id: string;
        module: string;
    }[] | undefined;
    project?: number | undefined;
    scope?: "here" | "everywhere" | undefined;
}>;
/**
 * What became of an act; all `ok: true`. `done`: taken, `changed` items moved. `declined`: not taken
 * (no fresh press, no such project), with the host's sentence.
 */
export declare const INBOX_OUTCOMES: readonly ["done", "declined"];
export declare const inboxActResult: z.ZodObject<{
    outcome: z.ZodEnum<["done", "declined"]>;
    changed: z.ZodDefault<z.ZodNumber>;
    why: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    outcome: "declined" | "done";
    why: string;
    changed: number;
}, {
    outcome: "declined" | "done";
    why?: string | undefined;
    changed?: number | undefined;
}>;
export type InboxActResult = z.infer<typeof inboxActResult>;
/**
 * `inbox.answer`: the person's answer to an item's question — one of its `choices`, or their own
 * words (`answer`) — sent as the person's message where the question came from. On their press only.
 */
export declare const inboxAnswerParams: z.ZodEffects<z.ZodObject<{
    module: z.ZodString;
    id: z.ZodString;
    choice: z.ZodOptional<z.ZodString>;
    answer: z.ZodOptional<z.ZodString>;
    project: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    module: string;
    project?: number | undefined;
    choice?: string | undefined;
    answer?: string | undefined;
}, {
    id: string;
    module: string;
    project?: number | undefined;
    choice?: string | undefined;
    answer?: string | undefined;
}>, {
    id: string;
    module: string;
    project?: number | undefined;
    choice?: string | undefined;
    answer?: string | undefined;
}, {
    id: string;
    module: string;
    project?: number | undefined;
    choice?: string | undefined;
    answer?: string | undefined;
}>;
/** `sent`: the answer went and the item is marked answered. `declined`: it did not, and why. */
export declare const inboxAnswerResult: z.ZodObject<{
    outcome: z.ZodEnum<["sent", "declined"]>;
    why: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    outcome: "sent" | "declined";
    why: string;
}, {
    outcome: "sent" | "declined";
    why?: string | undefined;
}>;
export type InboxAnswerResult = z.infer<typeof inboxAnswerResult>;
/**
 * `inbox.open`: go to where an item happened — its project, kehikko, epic and parts — as pressing it
 * in the host's own Inbox did; the module that reported it is told (`kehikot.opened`). A finished
 * item is marked seen. On the person's press only.
 *
 * 2.87.0: for an item with `go` (an agent's offer), the host goes there as an agent's `jump` would —
 * its kehikko, epic, parts and step — leaves a Go back mark that restores where the person was, and
 * closes the item: an offer is done once taken. `opened` once the view is on its way.
 */
export declare const inboxOpenParams: z.ZodObject<{
    module: z.ZodString;
    id: z.ZodString;
    project: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    module: string;
    project?: number | undefined;
}, {
    id: string;
    module: string;
    project?: number | undefined;
}>;
/** `opened`: the host went there. `declined`: it would not now. `no-such-item`: nothing open by that key. */
export declare const inboxOpenResult: z.ZodObject<{
    outcome: z.ZodEnum<["opened", "declined", "no-such-item"]>;
    why: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    outcome: "declined" | "opened" | "no-such-item";
    why: string;
}, {
    outcome: "declined" | "opened" | "no-such-item";
    why?: string | undefined;
}>;
export type InboxOpenResult = z.infer<typeof inboxOpenResult>;
/**
 * `inbox.use`: the person's "Use inbox" for one module — `false` stops showing its items (they are
 * still kept), `true` shows them again. Machine-wide. On the person's press only; never for the
 * host's own lists.
 */
export declare const inboxUseParams: z.ZodObject<{
    module: z.ZodString;
    use: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    module: string;
    use: boolean;
}, {
    module: string;
    use: boolean;
}>;
export declare const inboxUseResult: z.ZodObject<{
    outcome: z.ZodEnum<["done", "declined"]>;
    changed: z.ZodDefault<z.ZodNumber>;
    why: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    outcome: "declined" | "done";
    why: string;
    changed: number;
}, {
    outcome: "declined" | "done";
    why?: string | undefined;
    changed?: number | undefined;
}>;
export type InboxUseResult = InboxActResult;
/**
 * Host → module (2.79.0), `kehikot.inbox`. `changed`: the record is not what the page last read —
 * read it again (`rev` is the newest). `next`: the person asked for the next thing that needs them
 * (the host keeps the shortcut); the page goes to `next` (`inbox.open`, taken without a press in the
 * frame for `INBOX_NEXT_MS`) and shows it, or, with `next: null`, says nothing needs them. Sent only
 * to a frame whose manifest declares `inbox:person`. No answer.
 */
export declare const INBOX_SIGNALS: readonly ["changed", "next"];
export type InboxSignal = (typeof INBOX_SIGNALS)[number];
/**
 * How long after a `next` it sent a host takes an `inbox.open` with no press in the frame, in ms: the
 * person's press was the host's shortcut, and the page is going where they asked.
 */
export declare const INBOX_NEXT_MS = 5000;
