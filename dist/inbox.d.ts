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
export declare const PERSON_METHODS: readonly ["inbox.read", "inbox.log", "inbox.act", "inbox.answer", "inbox.open", "inbox.use", "inbox.adoption", "inbox.adopt", "inbox.adoptWith", "inbox.untrack", "inbox.undo"];
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
    /**
     * 2.88.0. A tracker item about a ref no epic of the project names: a page may offer to add it to an
     * epic (`inbox.adopt`, `inbox.adoptWith`) and to stop tracking it (`inbox.untrack`).
     */
    adoptable: z.ZodDefault<z.ZodBoolean>;
    /**
     * 2.88.0. What the person's last act on this item did, in one line ("Added to Auth · its Claude Code
     * conversation came along"), and whether `inbox.undo` takes it back. Text, like every string here.
     */
    after: z.ZodOptional<z.ZodObject<{
        said: z.ZodString;
        undo: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        said: string;
        undo: boolean;
    }, {
        said: string;
        undo?: boolean | undefined;
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
    adoptable: boolean;
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
    after?: {
        said: string;
        undo: boolean;
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
    where?: string | undefined;
    here?: boolean | undefined;
    seen?: boolean | undefined;
    mutable?: boolean | undefined;
    go?: {
        label?: string | undefined;
    } | undefined;
    adoptable?: boolean | undefined;
    after?: {
        said: string;
        undo?: boolean | undefined;
    } | undefined;
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
        /**
         * 2.88.0. A tracker item about a ref no epic of the project names: a page may offer to add it to an
         * epic (`inbox.adopt`, `inbox.adoptWith`) and to stop tracking it (`inbox.untrack`).
         */
        adoptable: z.ZodDefault<z.ZodBoolean>;
        /**
         * 2.88.0. What the person's last act on this item did, in one line ("Added to Auth · its Claude Code
         * conversation came along"), and whether `inbox.undo` takes it back. Text, like every string here.
         */
        after: z.ZodOptional<z.ZodObject<{
            said: z.ZodString;
            undo: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            said: string;
            undo: boolean;
        }, {
            said: string;
            undo?: boolean | undefined;
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
        adoptable: boolean;
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
        after?: {
            said: string;
            undo: boolean;
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
        where?: string | undefined;
        here?: boolean | undefined;
        seen?: boolean | undefined;
        mutable?: boolean | undefined;
        go?: {
            label?: string | undefined;
        } | undefined;
        adoptable?: boolean | undefined;
        after?: {
            said: string;
            undo?: boolean | undefined;
        } | undefined;
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
            /**
             * 2.88.0. A tracker item about a ref no epic of the project names: a page may offer to add it to an
             * epic (`inbox.adopt`, `inbox.adoptWith`) and to stop tracking it (`inbox.untrack`).
             */
            adoptable: z.ZodDefault<z.ZodBoolean>;
            /**
             * 2.88.0. What the person's last act on this item did, in one line ("Added to Auth · its Claude Code
             * conversation came along"), and whether `inbox.undo` takes it back. Text, like every string here.
             */
            after: z.ZodOptional<z.ZodObject<{
                said: z.ZodString;
                undo: z.ZodDefault<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                said: string;
                undo: boolean;
            }, {
                said: string;
                undo?: boolean | undefined;
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
            adoptable: boolean;
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
            after?: {
                said: string;
                undo: boolean;
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
            where?: string | undefined;
            here?: boolean | undefined;
            seen?: boolean | undefined;
            mutable?: boolean | undefined;
            go?: {
                label?: string | undefined;
            } | undefined;
            adoptable?: boolean | undefined;
            after?: {
                said: string;
                undo?: boolean | undefined;
            } | undefined;
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
            adoptable: boolean;
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
            after?: {
                said: string;
                undo: boolean;
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
            where?: string | undefined;
            here?: boolean | undefined;
            seen?: boolean | undefined;
            mutable?: boolean | undefined;
            go?: {
                label?: string | undefined;
            } | undefined;
            adoptable?: boolean | undefined;
            after?: {
                said: string;
                undo?: boolean | undefined;
            } | undefined;
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
    rev: number;
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
        adoptable: boolean;
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
        after?: {
            said: string;
            undo: boolean;
        } | undefined;
    }[];
    next: {
        id: string;
        module: string;
    } | null;
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
            adoptable: boolean;
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
            after?: {
                said: string;
                undo: boolean;
            } | undefined;
        }[];
    }[];
    earlier: number;
    muted: {
        id: string;
        name: string;
    }[];
}, {
    rev: number;
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
        where?: string | undefined;
        here?: boolean | undefined;
        seen?: boolean | undefined;
        mutable?: boolean | undefined;
        go?: {
            label?: string | undefined;
        } | undefined;
        adoptable?: boolean | undefined;
        after?: {
            said: string;
            undo?: boolean | undefined;
        } | undefined;
    }[];
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
            where?: string | undefined;
            here?: boolean | undefined;
            seen?: boolean | undefined;
            mutable?: boolean | undefined;
            go?: {
                label?: string | undefined;
            } | undefined;
            adoptable?: boolean | undefined;
            after?: {
                said: string;
                undo?: boolean | undefined;
            } | undefined;
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
    scope: "here" | "everywhere";
    offset: number;
}, {
    limit?: number | undefined;
    scope?: "here" | "everywhere" | undefined;
    offset?: number | undefined;
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
    why: string;
    outcome: "declined" | "done";
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
    why: string;
    outcome: "sent" | "declined";
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
    why: string;
    outcome: "declined" | "opened" | "no-such-item";
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
    why: string;
    outcome: "declined" | "done";
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
/**
 * 2.88.0. A tracker item that no epic names — the person is its author, assignee or reviewer, and it was
 * made somewhere else, by hand or by an agent outside Kehikot — can be ADOPTED into an epic, or no longer
 * tracked. Every act is the person's: page-only, on a fresh press, never a server's or an agent's.
 *
 * - `inbox.adoption`: what the page needs to offer it (a read, no press): the item, the project's epics
 *   with their parts and refs, the host's suggestion, the conversations that worked on it
 *   (`conversations.finder`, services.ts), the person's agent for Kehikot's own tasks, and an agent's
 *   proposal when one was made.
 * - `inbox.adopt`: write the ref into an epic (and parts) through the host's one writer of epics. The host
 *   then brings along, by itself, every conversation that CONFIDENTLY worked on it (`confidentMatch`) and
 *   belongs to no place yet, through the agent module that runs it; one that belongs to another place is
 *   never moved and is said in the result. The item is then an ordinary item of that epic.
 * - `inbox.adoptWith`: open the host's adoption dialog with the person's agent for Kehikot's own tasks,
 *   which starts a conversation fed the item and proposes an epic; the person confirms there.
 * - `inbox.untrack`: tell nothing more about this ref in this project.
 * - `inbox.undo`: take back the last adopt (the ref, and the conversations brought along) or untrack.
 */
/** One item named, as every adopting act names it. */
export declare const inboxItemKeyParams: z.ZodObject<{
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
/** `inbox.adoption`'s params: the item. */
export declare const inboxAdoptionParams: z.ZodObject<{
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
/** A place a conversation is filed under: an epic (or none), its parts, a kehikko key (or none). */
export declare const conversationPlaceSchema: z.ZodObject<{
    epic: z.ZodNullable<z.ZodString>;
    parts: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    kehikko: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    /** 2.89.0. The space by ids, with the `epic` it is in; absent when the place says only epic and parts. */
    space: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    epic: string | null;
    parts: string[];
    kehikko: string | null;
    space?: string[] | undefined;
}, {
    epic: string | null;
    space?: string[] | undefined;
    parts?: string[] | undefined;
    kehikko?: string | null | undefined;
}>;
export type ConversationPlace = z.infer<typeof conversationPlaceSchema>;
/**
 * How a conversation is known to have worked on an item, strongest first: it `created` the change, it
 * `pushed` its branch, it worked on that `branch`, it `mentioned` the ref, or it only worked in the same
 * `folder` (repository). Only the first three are confident enough to bring a conversation along without
 * asking (`CONFIDENT_MATCHES`).
 */
export declare const CONVERSATION_MATCHES: readonly ["created", "pushed", "branch", "mentioned", "folder"];
export type ConversationMatch = (typeof CONVERSATION_MATCHES)[number];
export declare const CONFIDENT_MATCHES: readonly ConversationMatch[];
/** Whether a match is confident enough for a host to bring the conversation along by itself. */
export declare const confidentMatch: (match: ConversationMatch) => boolean;
/** One conversation that worked on an item, as the page is shown it: its title and why it matched, never its content. */
export declare const adoptionConversationSchema: z.ZodObject<{
    /** The agent module that runs it (the provider `services.find` answered). */
    module: z.ZodString;
    /** The program's name in its own words (`Claude Code`), from the provider's descriptor. */
    program: z.ZodString;
    session: z.ZodString;
    title: z.ZodString;
    folder: z.ZodDefault<z.ZodString>;
    lastActive: z.ZodNumber;
    match: z.ZodEnum<["created", "pushed", "branch", "mentioned", "folder"]>;
    /** Why it matched, in words ("created !4721", "pushed branch feat/x", "worked in this repository"). */
    reason: z.ZodString;
    /** Where it is filed now, in words, when it belongs to a place; null when to none. */
    placed: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    /** Whether adopting brings it along by itself: confident, and filed under no place. */
    comes: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    module: string;
    session: string;
    title: string;
    folder: string;
    program: string;
    lastActive: number;
    match: "created" | "pushed" | "branch" | "mentioned" | "folder";
    reason: string;
    placed: string | null;
    comes: boolean;
}, {
    module: string;
    session: string;
    title: string;
    program: string;
    lastActive: number;
    match: "created" | "pushed" | "branch" | "mentioned" | "folder";
    reason: string;
    folder?: string | undefined;
    placed?: string | null | undefined;
    comes?: boolean | undefined;
}>;
export type AdoptionConversation = z.infer<typeof adoptionConversationSchema>;
/** `inbox.adoption`: everything a page needs to offer the item's adoption. */
export declare const inboxAdoptionResult: z.ZodObject<{
    outcome: z.ZodEnum<["ok", "no-such-item", "declined"]>;
    why: z.ZodDefault<z.ZodString>;
    item: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        ref: z.ZodString;
        title: z.ZodString;
        url: z.ZodString;
        repo: z.ZodString;
        host: z.ZodString;
        author: z.ZodOptional<z.ZodString>;
        branch: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        url: string;
        title: string;
        ref: string;
        repo: string;
        host: string;
        branch?: string | undefined;
        author?: string | undefined;
    }, {
        url: string;
        title: string;
        ref: string;
        repo: string;
        host: string;
        branch?: string | undefined;
        author?: string | undefined;
    }>>>;
    epics: z.ZodDefault<z.ZodArray<z.ZodObject<{
        epic: z.ZodString;
        title: z.ZodString;
        parts: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
        }, {
            id: string;
            name: string;
        }>, "many">>;
        refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        epic: string;
        parts: {
            id: string;
            name: string;
        }[];
        refs: string[];
        title: string;
    }, {
        epic: string;
        title: string;
        parts?: {
            id: string;
            name: string;
        }[] | undefined;
        refs?: string[] | undefined;
    }>, "many">>;
    /**
     * The epic the host would suggest, and why ("the same repository as its other refs"); `sure` when it
     * is the only epic that matches, so a page may offer it as one press. Never adopted by itself.
     */
    suggested: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        epic: z.ZodString;
        parts: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        why: z.ZodString;
        sure: z.ZodBoolean;
        space: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        why: string;
        epic: string;
        parts: string[];
        sure: boolean;
        space?: string[] | undefined;
    }, {
        why: string;
        epic: string;
        sure: boolean;
        space?: string[] | undefined;
        parts?: string[] | undefined;
    }>>>;
    /**
     * 2.89.0. The project's whole tree of spaces (`spaces.ts`), so a page can adopt into a space at any
     * depth. Absent from a host before 2.89.0: then `epics` and their `parts` are the two levels.
     */
    spaces: z.ZodOptional<z.ZodArray<z.ZodType<import("./spaces.js").SpaceNode, z.ZodTypeDef, unknown>, "many">>;
    conversations: z.ZodDefault<z.ZodArray<z.ZodObject<{
        /** The agent module that runs it (the provider `services.find` answered). */
        module: z.ZodString;
        /** The program's name in its own words (`Claude Code`), from the provider's descriptor. */
        program: z.ZodString;
        session: z.ZodString;
        title: z.ZodString;
        folder: z.ZodDefault<z.ZodString>;
        lastActive: z.ZodNumber;
        match: z.ZodEnum<["created", "pushed", "branch", "mentioned", "folder"]>;
        /** Why it matched, in words ("created !4721", "pushed branch feat/x", "worked in this repository"). */
        reason: z.ZodString;
        /** Where it is filed now, in words, when it belongs to a place; null when to none. */
        placed: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        /** Whether adopting brings it along by itself: confident, and filed under no place. */
        comes: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        module: string;
        session: string;
        title: string;
        folder: string;
        program: string;
        lastActive: number;
        match: "created" | "pushed" | "branch" | "mentioned" | "folder";
        reason: string;
        placed: string | null;
        comes: boolean;
    }, {
        module: string;
        session: string;
        title: string;
        program: string;
        lastActive: number;
        match: "created" | "pushed" | "branch" | "mentioned" | "folder";
        reason: string;
        folder?: string | undefined;
        placed?: string | null | undefined;
        comes?: boolean | undefined;
    }>, "many">>;
    /**
     * The agent that would do the task (`inbox.adoptWith`); null when none would. Since 2.91.0 a host
     * fills it from the kehikko the person is on: its primary agent, or its only agent module, when that
     * provides `agent.tasks`.
     */
    agent: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        module: z.ZodString;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        module: string;
    }, {
        name: string;
        module: string;
    }>>>;
    /**
     * 2.91.0. With `agent` null: the agent modules on that kehikko that could do it, none of them primary.
     * Two or more: `inbox.adoptWith` asks the person which (and that one becomes the kehikko's primary
     * agent), so a page offers "Adopt with an agent…". Empty: no agent module there can — a page may say
     * that adding one would let it find the place. Absent from an older host: say nothing of it.
     */
    taskAgents: z.ZodOptional<z.ZodArray<z.ZodObject<{
        module: z.ZodString;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        module: string;
    }, {
        name: string;
        module: string;
    }>, "many">>;
    /** An agent's proposal, when one was made for this item: what the dialog offers to confirm. */
    proposal: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        epic: z.ZodString;
        parts: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        conversations: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        why: z.ZodString;
        space: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        why: string;
        epic: string;
        parts: string[];
        conversations: string[];
        space?: string[] | undefined;
    }, {
        why: string;
        epic: string;
        space?: string[] | undefined;
        parts?: string[] | undefined;
        conversations?: string[] | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    why: string;
    outcome: "declined" | "no-such-item" | "ok";
    agent: {
        name: string;
        module: string;
    } | null;
    item: {
        url: string;
        title: string;
        ref: string;
        repo: string;
        host: string;
        branch?: string | undefined;
        author?: string | undefined;
    } | null;
    epics: {
        epic: string;
        parts: {
            id: string;
            name: string;
        }[];
        refs: string[];
        title: string;
    }[];
    suggested: {
        why: string;
        epic: string;
        parts: string[];
        sure: boolean;
        space?: string[] | undefined;
    } | null;
    conversations: {
        module: string;
        session: string;
        title: string;
        folder: string;
        program: string;
        lastActive: number;
        match: "created" | "pushed" | "branch" | "mentioned" | "folder";
        reason: string;
        placed: string | null;
        comes: boolean;
    }[];
    proposal: {
        why: string;
        epic: string;
        parts: string[];
        conversations: string[];
        space?: string[] | undefined;
    } | null;
    spaces?: import("./spaces.js").SpaceNode[] | undefined;
    taskAgents?: {
        name: string;
        module: string;
    }[] | undefined;
}, {
    outcome: "declined" | "no-such-item" | "ok";
    why?: string | undefined;
    agent?: {
        name: string;
        module: string;
    } | null | undefined;
    item?: {
        url: string;
        title: string;
        ref: string;
        repo: string;
        host: string;
        branch?: string | undefined;
        author?: string | undefined;
    } | null | undefined;
    epics?: {
        epic: string;
        title: string;
        parts?: {
            id: string;
            name: string;
        }[] | undefined;
        refs?: string[] | undefined;
    }[] | undefined;
    suggested?: {
        why: string;
        epic: string;
        sure: boolean;
        space?: string[] | undefined;
        parts?: string[] | undefined;
    } | null | undefined;
    spaces?: unknown[] | undefined;
    conversations?: {
        module: string;
        session: string;
        title: string;
        program: string;
        lastActive: number;
        match: "created" | "pushed" | "branch" | "mentioned" | "folder";
        reason: string;
        folder?: string | undefined;
        placed?: string | null | undefined;
        comes?: boolean | undefined;
    }[] | undefined;
    taskAgents?: {
        name: string;
        module: string;
    }[] | undefined;
    proposal?: {
        why: string;
        epic: string;
        space?: string[] | undefined;
        parts?: string[] | undefined;
        conversations?: string[] | undefined;
    } | null | undefined;
}>;
export type InboxAdoptionResult = z.infer<typeof inboxAdoptionResult>;
/** `inbox.adopt`: the item, the epic and the parts to add its ref to. On the person's press only. */
export declare const inboxAdoptParams: z.ZodEffects<z.ZodObject<{
    module: z.ZodString;
    id: z.ZodString;
    project: z.ZodOptional<z.ZodNumber>;
} & {
    epic: z.ZodString;
    parts: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /**
     * 2.89.0. The space to adopt into, by ids, with the `epic` it is in (its first id). A host before
     * 2.89.0 strips it and adopts into `epic` and `parts`, which a page fills by `epicPartsOf`.
     */
    space: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    epic: string;
    parts: string[];
    module: string;
    space?: string[] | undefined;
    project?: number | undefined;
}, {
    id: string;
    epic: string;
    module: string;
    space?: string[] | undefined;
    parts?: string[] | undefined;
    project?: number | undefined;
}>, {
    id: string;
    epic: string;
    parts: string[];
    module: string;
    space?: string[] | undefined;
    project?: number | undefined;
}, {
    id: string;
    epic: string;
    module: string;
    space?: string[] | undefined;
    parts?: string[] | undefined;
    project?: number | undefined;
}>;
/** What became of one conversation when an item was adopted. */
export declare const ADOPT_BROUGHT: readonly ["brought", "elsewhere", "failed"];
export declare const inboxAdoptResult: z.ZodObject<{
    outcome: z.ZodEnum<["adopted", "declined", "no-such-item"]>;
    /** What it did, in one line: the item's `after`. */
    said: z.ZodDefault<z.ZodString>;
    brought: z.ZodDefault<z.ZodArray<z.ZodObject<{
        session: z.ZodString;
        title: z.ZodString;
        program: z.ZodString;
        outcome: z.ZodEnum<["brought", "elsewhere", "failed"]>;
        why: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        why: string;
        session: string;
        outcome: "elsewhere" | "brought" | "failed";
        title: string;
        program: string;
    }, {
        session: string;
        outcome: "elsewhere" | "brought" | "failed";
        title: string;
        program: string;
        why?: string | undefined;
    }>, "many">>;
    why: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    why: string;
    outcome: "declined" | "no-such-item" | "adopted";
    said: string;
    brought: {
        why: string;
        session: string;
        outcome: "elsewhere" | "brought" | "failed";
        title: string;
        program: string;
    }[];
}, {
    outcome: "declined" | "no-such-item" | "adopted";
    why?: string | undefined;
    said?: string | undefined;
    brought?: {
        session: string;
        outcome: "elsewhere" | "brought" | "failed";
        title: string;
        program: string;
        why?: string | undefined;
    }[] | undefined;
}>;
export type InboxAdoptResult = z.infer<typeof inboxAdoptResult>;
/** `inbox.adoptWith`: open the host's adoption dialog with the person's agent. On the person's press only. */
export declare const inboxAdoptWithParams: z.ZodObject<{
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
export declare const inboxAdoptWithResult: z.ZodObject<{
    outcome: z.ZodEnum<["opened", "no-agent", "declined", "no-such-item"]>;
    why: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    why: string;
    outcome: "declined" | "opened" | "no-such-item" | "no-agent";
}, {
    outcome: "declined" | "opened" | "no-such-item" | "no-agent";
    why?: string | undefined;
}>;
export type InboxAdoptWithResult = z.infer<typeof inboxAdoptWithResult>;
/** `inbox.untrack`: tell nothing more about this item's ref in this project (undone in the host's settings, or `inbox.undo`). */
export declare const inboxUntrackParams: z.ZodObject<{
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
export declare const inboxUntrackResult: z.ZodObject<{
    outcome: z.ZodEnum<["done", "declined"]>;
    changed: z.ZodDefault<z.ZodNumber>;
    why: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    why: string;
    outcome: "declined" | "done";
    changed: number;
}, {
    outcome: "declined" | "done";
    why?: string | undefined;
    changed?: number | undefined;
}>;
/** `inbox.undo`: take back the last adopt or untrack of this item. */
export declare const inboxUndoParams: z.ZodObject<{
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
export declare const inboxUndoResult: z.ZodObject<{
    outcome: z.ZodEnum<["done", "declined"]>;
    changed: z.ZodDefault<z.ZodNumber>;
    why: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    why: string;
    outcome: "declined" | "done";
    changed: number;
}, {
    outcome: "declined" | "done";
    why?: string | undefined;
    changed?: number | undefined;
}>;
