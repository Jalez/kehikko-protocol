import { z } from 'zod';
/**
 * What a module currently offers to be narrowed by. The whole offer, every time.
 *
 * Replacing rather than merging, and the difference is the one that matters
 * when a module's options CHANGE: a merge could never remove a group, so a
 * module that stopped offering something would leave a control behind it that a
 * person could press and nothing would answer. An empty array is a real message
 * — "nothing here can be narrowed now" — and a host that receives one takes the
 * control away.
 *
 * A module sends this whenever the answer changes, which includes whenever the
 * words change. See `filterOptionSchema` on why the count lives in the label.
 */
export declare const filtersSchema: z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.filters">, z.ZodLiteral<string>]>, "kehikot.filters", string>;
    groups: z.ZodEffects<z.ZodArray<z.ZodEffects<z.ZodEffects<z.ZodObject<{
        id: z.ZodEffects<z.ZodString, string, string>;
        label: z.ZodString;
        kind: z.ZodOptional<z.ZodEnum<["choice", "text", "toggles"]>>;
        options: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodEffects<z.ZodString, string, string>;
            label: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            label: string;
            id: string;
        }, {
            label: string;
            id: string;
        }>, "many">>;
        fallback: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        id: string;
        options: {
            label: string;
            id: string;
        }[];
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }, {
        label: string;
        id: string;
        options?: {
            label: string;
            id: string;
        }[] | undefined;
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }>, {
        label: string;
        id: string;
        options: {
            label: string;
            id: string;
        }[];
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }, {
        label: string;
        id: string;
        options?: {
            label: string;
            id: string;
        }[] | undefined;
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }>, {
        label: string;
        id: string;
        options: {
            label: string;
            id: string;
        }[];
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }, {
        label: string;
        id: string;
        options?: {
            label: string;
            id: string;
        }[] | undefined;
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }>, "many">, {
        label: string;
        id: string;
        options: {
            label: string;
            id: string;
        }[];
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }[], {
        label: string;
        id: string;
        options?: {
            label: string;
            id: string;
        }[] | undefined;
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }[]>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.filters";
    groups: {
        label: string;
        id: string;
        options: {
            label: string;
            id: string;
        }[];
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }[];
}, {
    type: string;
    groups: {
        label: string;
        id: string;
        options?: {
            label: string;
            id: string;
        }[] | undefined;
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }[];
}>;
export type Filters = z.infer<typeof filtersSchema>;
/**
 * What a module offers to clear, in its own words. The whole offer, every time.
 *
 * A `label` and nothing else, and the emptiness of that is the same discipline
 * `filterOptionSchema` keeps: no count field, no icon, no severity, no "kind",
 * and above all no list of what would go. The host draws a control and reports
 * a press. What "shown" means, what is behind it, and how much of it there is
 * are the module's business, and a host that was told any of it would be a host
 * that could be updated every time a module has a new idea about its own data.
 *
 * ## The count rides in the label, as it does for a filter
 *
 * `clear 12 shown` is one string. It has to be one string, because the number
 * is the whole reason a person reads this control before pressing it — it is
 * how they discover that their filter narrowed things to three rather than
 * thirty, which is the difference between the press they meant and the press
 * they did not. A separate count field would be this package deciding how a
 * count is phrased, for a module that knows better and whose interesting
 * number is sometimes not a number (`everything from this run`).
 *
 * ## `null` is a real message, and it is the withdrawal
 *
 * It says there is nothing on screen to clear now. The host takes the control
 * away rather than leaving a button that deletes nothing — a button whose press
 * has no effect teaches a person that the button does not work, which they will
 * remember on the day it would have. It is the exact counterpart of `filters`
 * sending an empty `groups`, and it exists for the same reason: whole
 * replacement is what lets an offer be taken back.
 *
 * A module re-announces whenever the words change, which — because the words
 * carry a count — is whenever what it shows changes. Including immediately
 * after it has been asked to clear, which is the only feedback loop this
 * feature has and the only one it needs.
 */
export declare const clearableSchema: z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.clearable">, z.ZodLiteral<string>]>, "kehikot.clearable", string>;
    /** The words on the control, or `null` to take the control away. */
    label: z.ZodDefault<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    label: string | null;
    type: "kehikot.clearable";
}, {
    type: string;
    label?: string | null | undefined;
}>;
export type Clearable = z.infer<typeof clearableSchema>;
/**
 * The press, relayed. "Clear what you are showing."
 *
 * Deliberately empty apart from its type, and every field somebody will want to
 * add to it is a field that would break the feature.
 *
 * **Not a list of what to delete**, because the host does not know and must not
 * find out. **Not the filter choice**, because the module already has that from
 * `kehikot.context` and a second copy would be a second answer to one question,
 * arriving on its own schedule and disagreeing after any race. **Not a
 * correlation id**, because there is no answer: see `MESSAGE.CLEAR` for why an
 * acknowledgement would only tempt a host into reporting a number it did not
 * count.
 *
 * `protocol` rides along as it does on every other host message, so a module
 * can tell which host it is talking to without keeping the greeting.
 */
export declare const clearSchema: z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.clear">, z.ZodLiteral<string>]>, "kehikot.clear", string>;
    protocol: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.clear";
    protocol: number;
}, {
    type: string;
    protocol: number;
}>;
export type Clear = z.infer<typeof clearSchema>;
/**
 * What a module says about being refreshed. The whole state, every time.
 *
 * Three fields and no fourth, and the discipline is `clearableSchema`'s: no
 * count of what would be read, no description of where from, no error, no
 * interval. The host draws a control, reports a press, and formats one
 * timestamp it was handed.
 *
 * ## `at` is the only fact in this protocol a host would otherwise guess
 *
 * The essay on `MESSAGE.REFRESHABLE` is the long form and it is worth having
 * the short one here, beside the field: the host knows when it ASKED, and when
 * it asked is not when the data is from. A module may answer out of a cache, a
 * refresh may fail over a reading it keeps showing, and a module may refresh
 * itself for a reason the host has no view of. In all three a host that dated
 * the data from its own message would print a time that is wrong beside data
 * that is older than it says.
 *
 * So it is an ISO 8601 instant, with an offset, from the module — and `null` is
 * a real answer meaning "I cannot say", for which a host draws no time at all
 * rather than inventing one. A module that has never successfully read anything
 * sends `null` and keeps sending it.
 *
 * ## `can` is how the control is withdrawn, and it is not `busy`
 *
 * `false` takes the control away: there is nothing to refresh right now — no
 * project, no document, nothing this module could read again — and a button
 * that cannot work teaches a person that the button does not work, which they
 * will remember on the day it would have. It is the counterpart of `clearable`
 * sending `null` and of `filters` sending an empty `groups`.
 *
 * `busy` leaves the control there and says a read is in flight. Two presses
 * racing is two subprocesses and one answer that wins for no reason anybody
 * could predict, and the module is the only side that knows.
 *
 * A module re-announces whenever any of the three changes, which is at least
 * twice per refresh — `busy: true` on the way in, a new `at` on the way out —
 * and that is the whole of the feedback this feature has.
 */
export declare const refreshableSchema: z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.refreshable">, z.ZodLiteral<string>]>, "kehikot.refreshable", string>;
    /** Whether there is anything to read again right now. `false` withdraws the control. */
    can: z.ZodDefault<z.ZodBoolean>;
    /** When this module's material was last read, as the MODULE knows it. */
    at: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    /** Whether a read is in flight this second. */
    busy: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    at: string | null;
    type: "kehikot.refreshable";
    can: boolean;
    busy: boolean;
}, {
    type: string;
    at?: string | null | undefined;
    can?: boolean | undefined;
    busy?: boolean | undefined;
}>;
export type Refreshable = z.infer<typeof refreshableSchema>;
/**
 * The press, relayed. "Read your material again."
 *
 * Empty apart from its envelope, exactly like `clearSchema`, and every field
 * somebody will want to add is one that would break it.
 *
 * **Not why.** A person pressed the button, or an interval elapsed; the module
 * cannot tell and must not need to, because a flag saying "this one was
 * automatic" would be used to behave differently and that is the module setting
 * policy from a fact about somebody else's timer.
 *
 * **Not the interval**, because the host runs the clock — see `MESSAGE.REFRESH`
 * — and a module told the number would be a module tempted to run a second
 * timer beside it.
 *
 * **Not a correlation id**, because there is no answer. What comes back is a
 * new `kehikot.refreshable`: `busy` while it runs, then a new `at`. An
 * acknowledgement would only tempt a host into reporting on work it cannot see.
 */
export declare const refreshSchema: z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.refresh">, z.ZodLiteral<string>]>, "kehikot.refresh", string>;
    protocol: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.refresh";
    protocol: number;
}, {
    type: string;
    protocol: number;
}>;
export type Refresh = z.infer<typeof refreshSchema>;
/**
 * Hello: the whole of what a module is given without asking.
 *
 * Sent on every frame LOAD, not on the first one only: a frame that reloads
 * itself has forgotten the conversation, and greeting it again is cheaper than
 * either side wondering. And sent on load rather than on a timer, because a
 * guess long enough to be safe is a guess a slow machine still loses, and a
 * module greeted before its own script ran is one that never hears the
 * greeting.
 *
 * `protocol` is the host's answer — what the two sides settled on when the
 * manifest was read — and not either half's opinion of it.
 *
 * `session` names this conversation so a module can tell a reload from a second
 * frame. It is not a credential and must never become one: a module holds no
 * token, and every question it asks is checked by the host on the host's own
 * terms rather than against anything it was handed here. A session id that
 * unlocked something would be a secret sitting in a frame that any script in
 * that frame can read.
 *
 * The context rides along because the first thing every module wants is which
 * epic is open, and a second round trip to learn it is a round trip for
 * nothing.
 *
 * There is no list of permissions in the greeting. There was, in an earlier
 * design where a person answered a dialog; there is nothing to list now, and a
 * field here saying what a module "may" do would be this package modelling an
 * approval it has no business modelling.
 */
export declare const helloSchema: z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.hello">, z.ZodLiteral<string>]>, "kehikot.hello", string>;
    protocol: z.ZodNumber;
    session: z.ZodString;
    context: z.ZodObject<{
        epic: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        project: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        projectPath: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        theme: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
        selection: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        passage: z.ZodDefault<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodObject<{
            path: z.ZodString;
            page: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            quoted: z.ZodDefault<z.ZodString>;
            section: z.ZodDefault<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodObject<{
                title: z.ZodString;
                from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            }, "strip", z.ZodTypeAny, {
                from: number | null;
                to: number | null;
                title: string;
            }, {
                title: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
            }>, {
                from: number | null;
                to: number | null;
                title: string;
            }, {
                title: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
            }>, {
                from: number | null;
                to: number | null;
                title: string;
            }, {
                title: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
            }>>>;
        }, "strip", z.ZodTypeAny, {
            path: string;
            from: number | null;
            to: number | null;
            page: number | null;
            quoted: string;
            section: {
                from: number | null;
                to: number | null;
                title: string;
            } | null;
        }, {
            path: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
            page?: number | null | undefined;
            quoted?: string | undefined;
            section?: {
                title: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
            } | null | undefined;
        }>, {
            path: string;
            from: number | null;
            to: number | null;
            page: number | null;
            quoted: string;
            section: {
                from: number | null;
                to: number | null;
                title: string;
            } | null;
        }, {
            path: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
            page?: number | null | undefined;
            quoted?: string | undefined;
            section?: {
                title: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
            } | null | undefined;
        }>, {
            path: string;
            from: number | null;
            to: number | null;
            page: number | null;
            quoted: string;
            section: {
                from: number | null;
                to: number | null;
                title: string;
            } | null;
        }, {
            path: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
            page?: number | null | undefined;
            quoted?: string | undefined;
            section?: {
                title: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
            } | null | undefined;
        }>>>;
        pinned: z.ZodDefault<z.ZodBoolean>;
        prompt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        kehikko: z.ZodDefault<z.ZodNullable<z.ZodObject<{
            id: z.ZodNumber;
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: number;
            name: string;
        }, {
            id: number;
            name: string;
        }>>>;
        filters: z.ZodDefault<z.ZodEffects<z.ZodRecord<z.ZodEffects<z.ZodString, string, string>, z.ZodUnion<[z.ZodString, z.ZodEffects<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">, string[], string[]>]>>, Record<string, string | string[]>, Record<string, string | string[]>>>;
        containers: z.ZodDefault<z.ZodArray<z.ZodObject<{
            module: z.ZodEffects<z.ZodString, string, string>;
            selected: z.ZodDefault<z.ZodBoolean>;
            showing: z.ZodDefault<z.ZodObject<{
                refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                documents: z.ZodDefault<z.ZodArray<z.ZodEffects<z.ZodEffects<z.ZodObject<{
                    path: z.ZodString;
                    page: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                    from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                    to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                    quoted: z.ZodDefault<z.ZodString>;
                    section: z.ZodDefault<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodObject<{
                        title: z.ZodString;
                        from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                        to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                    }, "strip", z.ZodTypeAny, {
                        from: number | null;
                        to: number | null;
                        title: string;
                    }, {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    }>, {
                        from: number | null;
                        to: number | null;
                        title: string;
                    }, {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    }>, {
                        from: number | null;
                        to: number | null;
                        title: string;
                    }, {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    }>>>;
                }, "strip", z.ZodTypeAny, {
                    path: string;
                    from: number | null;
                    to: number | null;
                    page: number | null;
                    quoted: string;
                    section: {
                        from: number | null;
                        to: number | null;
                        title: string;
                    } | null;
                }, {
                    path: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                    page?: number | null | undefined;
                    quoted?: string | undefined;
                    section?: {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    } | null | undefined;
                }>, {
                    path: string;
                    from: number | null;
                    to: number | null;
                    page: number | null;
                    quoted: string;
                    section: {
                        from: number | null;
                        to: number | null;
                        title: string;
                    } | null;
                }, {
                    path: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                    page?: number | null | undefined;
                    quoted?: string | undefined;
                    section?: {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    } | null | undefined;
                }>, {
                    path: string;
                    from: number | null;
                    to: number | null;
                    page: number | null;
                    quoted: string;
                    section: {
                        from: number | null;
                        to: number | null;
                        title: string;
                    } | null;
                }, {
                    path: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                    page?: number | null | undefined;
                    quoted?: string | undefined;
                    section?: {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    } | null | undefined;
                }>, "many">>;
            }, "strip", z.ZodTypeAny, {
                refs: string[];
                documents: {
                    path: string;
                    from: number | null;
                    to: number | null;
                    page: number | null;
                    quoted: string;
                    section: {
                        from: number | null;
                        to: number | null;
                        title: string;
                    } | null;
                }[];
            }, {
                refs?: string[] | undefined;
                documents?: {
                    path: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                    page?: number | null | undefined;
                    quoted?: string | undefined;
                    section?: {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    } | null | undefined;
                }[] | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            module: string;
            selected: boolean;
            showing: {
                refs: string[];
                documents: {
                    path: string;
                    from: number | null;
                    to: number | null;
                    page: number | null;
                    quoted: string;
                    section: {
                        from: number | null;
                        to: number | null;
                        title: string;
                    } | null;
                }[];
            };
        }, {
            module: string;
            selected?: boolean | undefined;
            showing?: {
                refs?: string[] | undefined;
                documents?: {
                    path: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                    page?: number | null | undefined;
                    quoted?: string | undefined;
                    section?: {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    } | null | undefined;
                }[] | undefined;
            } | undefined;
        }>, "many">>;
        dispositions: z.ZodDefault<z.ZodArray<z.ZodObject<{
            ref: z.ZodString;
            value: z.ZodEnum<["done", "wont-do", "duplicate", "superseded"]>;
            target: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            note: z.ZodDefault<z.ZodString>;
            by: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            at: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            at: string | null;
            value: "done" | "wont-do" | "duplicate" | "superseded";
            ref: string;
            target: string | null;
            note: string;
            by: string | null;
        }, {
            value: "done" | "wont-do" | "duplicate" | "superseded";
            ref: string;
            at?: string | null | undefined;
            target?: string | null | undefined;
            note?: string | undefined;
            by?: string | null | undefined;
        }>, "many">>;
        tracker: z.ZodDefault<z.ZodObject<{
            at: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            refreshing: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            at: string | null;
            refreshing: boolean;
        }, {
            at?: string | null | undefined;
            refreshing?: boolean | undefined;
        }>>;
        content: z.ZodDefault<z.ZodArray<z.ZodObject<{
            source: z.ZodEffects<z.ZodString, string, string>;
            epic: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            at: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            at: string;
            source: string;
            epic: string | null;
        }, {
            at: string;
            source: string;
            epic?: string | null | undefined;
        }>, "many">>;
        parts: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            heading: z.ZodDefault<z.ZodString>;
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            picked: z.ZodDefault<z.ZodBoolean>;
            files: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            heading: string;
            refs: string[];
            picked: boolean;
            files?: string[] | undefined;
        }, {
            id: string;
            files?: string[] | undefined;
            heading?: string | undefined;
            refs?: string[] | undefined;
            picked?: boolean | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        containers: {
            module: string;
            selected: boolean;
            showing: {
                refs: string[];
                documents: {
                    path: string;
                    from: number | null;
                    to: number | null;
                    page: number | null;
                    quoted: string;
                    section: {
                        from: number | null;
                        to: number | null;
                        title: string;
                    } | null;
                }[];
            };
        }[];
        epic: string | null;
        tracker: {
            at: string | null;
            refreshing: boolean;
        };
        project: string | null;
        projectPath: string | null;
        theme: "light" | "dark";
        selection: string[];
        passage: {
            path: string;
            from: number | null;
            to: number | null;
            page: number | null;
            quoted: string;
            section: {
                from: number | null;
                to: number | null;
                title: string;
            } | null;
        } | null;
        pinned: boolean;
        prompt: string | null;
        kehikko: {
            id: number;
            name: string;
        } | null;
        filters: Record<string, string | string[]>;
        dispositions: {
            at: string | null;
            value: "done" | "wont-do" | "duplicate" | "superseded";
            ref: string;
            target: string | null;
            note: string;
            by: string | null;
        }[];
        content: {
            at: string;
            source: string;
            epic: string | null;
        }[];
        parts: {
            id: string;
            heading: string;
            refs: string[];
            picked: boolean;
            files?: string[] | undefined;
        }[];
    }, {
        containers?: {
            module: string;
            selected?: boolean | undefined;
            showing?: {
                refs?: string[] | undefined;
                documents?: {
                    path: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                    page?: number | null | undefined;
                    quoted?: string | undefined;
                    section?: {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    } | null | undefined;
                }[] | undefined;
            } | undefined;
        }[] | undefined;
        epic?: string | null | undefined;
        tracker?: {
            at?: string | null | undefined;
            refreshing?: boolean | undefined;
        } | undefined;
        project?: string | null | undefined;
        projectPath?: string | null | undefined;
        theme?: "light" | "dark" | undefined;
        selection?: string[] | undefined;
        passage?: {
            path: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
            page?: number | null | undefined;
            quoted?: string | undefined;
            section?: {
                title: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
            } | null | undefined;
        } | null | undefined;
        pinned?: boolean | undefined;
        prompt?: string | null | undefined;
        kehikko?: {
            id: number;
            name: string;
        } | null | undefined;
        filters?: Record<string, string | string[]> | undefined;
        dispositions?: {
            value: "done" | "wont-do" | "duplicate" | "superseded";
            ref: string;
            at?: string | null | undefined;
            target?: string | null | undefined;
            note?: string | undefined;
            by?: string | null | undefined;
        }[] | undefined;
        content?: {
            at: string;
            source: string;
            epic?: string | null | undefined;
        }[] | undefined;
        parts?: {
            id: string;
            files?: string[] | undefined;
            heading?: string | undefined;
            refs?: string[] | undefined;
            picked?: boolean | undefined;
        }[] | undefined;
    }>;
    /**
     * Whatever this module last asked the host to keep for it, verbatim.
     *
     * Beside the context rather than inside it, and that placement is the whole
     * point: context is broadcast to every framed module, and this belongs to one
     * of them. A module's remembered state travelling in a shared message would
     * be every module reading every other module's preferences.
     *
     * `null` when the host keeps nothing for it — a first run, a host that does
     * not answer `state.set`, a module that has never written any. It is not
     * optional, because a module has to be able to tell "nothing kept" from "the
     * field is missing because this host is older than the idea", and only one of
     * those means it should draw its defaults with confidence.
     *
     * In the GREETING rather than fetched, so a module has it before its first
     * render. Asking for it afterwards would mean drawing the wrong filter first
     * and correcting it, which is the visible-flicker failure in a different
     * costume.
     *
     * Opaque. The host stored a string and hands the same string back; see
     * `state.set` in `methods.ts` for why it must never learn what is in it.
     */
    state: z.ZodDefault<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.hello";
    context: {
        containers: {
            module: string;
            selected: boolean;
            showing: {
                refs: string[];
                documents: {
                    path: string;
                    from: number | null;
                    to: number | null;
                    page: number | null;
                    quoted: string;
                    section: {
                        from: number | null;
                        to: number | null;
                        title: string;
                    } | null;
                }[];
            };
        }[];
        epic: string | null;
        tracker: {
            at: string | null;
            refreshing: boolean;
        };
        project: string | null;
        projectPath: string | null;
        theme: "light" | "dark";
        selection: string[];
        passage: {
            path: string;
            from: number | null;
            to: number | null;
            page: number | null;
            quoted: string;
            section: {
                from: number | null;
                to: number | null;
                title: string;
            } | null;
        } | null;
        pinned: boolean;
        prompt: string | null;
        kehikko: {
            id: number;
            name: string;
        } | null;
        filters: Record<string, string | string[]>;
        dispositions: {
            at: string | null;
            value: "done" | "wont-do" | "duplicate" | "superseded";
            ref: string;
            target: string | null;
            note: string;
            by: string | null;
        }[];
        content: {
            at: string;
            source: string;
            epic: string | null;
        }[];
        parts: {
            id: string;
            heading: string;
            refs: string[];
            picked: boolean;
            files?: string[] | undefined;
        }[];
    };
    state: string | null;
    protocol: number;
    session: string;
}, {
    type: string;
    context: {
        containers?: {
            module: string;
            selected?: boolean | undefined;
            showing?: {
                refs?: string[] | undefined;
                documents?: {
                    path: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                    page?: number | null | undefined;
                    quoted?: string | undefined;
                    section?: {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    } | null | undefined;
                }[] | undefined;
            } | undefined;
        }[] | undefined;
        epic?: string | null | undefined;
        tracker?: {
            at?: string | null | undefined;
            refreshing?: boolean | undefined;
        } | undefined;
        project?: string | null | undefined;
        projectPath?: string | null | undefined;
        theme?: "light" | "dark" | undefined;
        selection?: string[] | undefined;
        passage?: {
            path: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
            page?: number | null | undefined;
            quoted?: string | undefined;
            section?: {
                title: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
            } | null | undefined;
        } | null | undefined;
        pinned?: boolean | undefined;
        prompt?: string | null | undefined;
        kehikko?: {
            id: number;
            name: string;
        } | null | undefined;
        filters?: Record<string, string | string[]> | undefined;
        dispositions?: {
            value: "done" | "wont-do" | "duplicate" | "superseded";
            ref: string;
            at?: string | null | undefined;
            target?: string | null | undefined;
            note?: string | undefined;
            by?: string | null | undefined;
        }[] | undefined;
        content?: {
            at: string;
            source: string;
            epic?: string | null | undefined;
        }[] | undefined;
        parts?: {
            id: string;
            files?: string[] | undefined;
            heading?: string | undefined;
            refs?: string[] | undefined;
            picked?: boolean | undefined;
        }[] | undefined;
    };
    protocol: number;
    session: string;
    state?: string | null | undefined;
}>;
/**
 * Which epic is open now.
 *
 * Sent when the reader switches epics and when the module's own tab is
 * shown. Flat rather than wrapping a `context` object, which is an
 * inconsistency with `hello` and is kept because it is what both halves already
 * speak — the same fields, one level up. `contextSchema` is the shared
 * definition either way, so the two cannot drift apart in what they carry.
 *
 * Only epic-scoped modes are told. A `global` mode asked for one page over the
 * whole canvas and gets one.
 */
export declare const contextMessageSchema: z.ZodObject<{
    epic: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    project: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    projectPath: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    theme: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
    selection: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    passage: z.ZodDefault<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodObject<{
        path: z.ZodString;
        page: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        quoted: z.ZodDefault<z.ZodString>;
        section: z.ZodDefault<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodObject<{
            title: z.ZodString;
            from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        }, "strip", z.ZodTypeAny, {
            from: number | null;
            to: number | null;
            title: string;
        }, {
            title: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
        }>, {
            from: number | null;
            to: number | null;
            title: string;
        }, {
            title: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
        }>, {
            from: number | null;
            to: number | null;
            title: string;
        }, {
            title: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
        }>>>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        from: number | null;
        to: number | null;
        page: number | null;
        quoted: string;
        section: {
            from: number | null;
            to: number | null;
            title: string;
        } | null;
    }, {
        path: string;
        from?: number | null | undefined;
        to?: number | null | undefined;
        page?: number | null | undefined;
        quoted?: string | undefined;
        section?: {
            title: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
        } | null | undefined;
    }>, {
        path: string;
        from: number | null;
        to: number | null;
        page: number | null;
        quoted: string;
        section: {
            from: number | null;
            to: number | null;
            title: string;
        } | null;
    }, {
        path: string;
        from?: number | null | undefined;
        to?: number | null | undefined;
        page?: number | null | undefined;
        quoted?: string | undefined;
        section?: {
            title: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
        } | null | undefined;
    }>, {
        path: string;
        from: number | null;
        to: number | null;
        page: number | null;
        quoted: string;
        section: {
            from: number | null;
            to: number | null;
            title: string;
        } | null;
    }, {
        path: string;
        from?: number | null | undefined;
        to?: number | null | undefined;
        page?: number | null | undefined;
        quoted?: string | undefined;
        section?: {
            title: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
        } | null | undefined;
    }>>>;
    pinned: z.ZodDefault<z.ZodBoolean>;
    prompt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    kehikko: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: number;
        name: string;
    }, {
        id: number;
        name: string;
    }>>>;
    filters: z.ZodDefault<z.ZodEffects<z.ZodRecord<z.ZodEffects<z.ZodString, string, string>, z.ZodUnion<[z.ZodString, z.ZodEffects<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">, string[], string[]>]>>, Record<string, string | string[]>, Record<string, string | string[]>>>;
    containers: z.ZodDefault<z.ZodArray<z.ZodObject<{
        module: z.ZodEffects<z.ZodString, string, string>;
        selected: z.ZodDefault<z.ZodBoolean>;
        showing: z.ZodDefault<z.ZodObject<{
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            documents: z.ZodDefault<z.ZodArray<z.ZodEffects<z.ZodEffects<z.ZodObject<{
                path: z.ZodString;
                page: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                quoted: z.ZodDefault<z.ZodString>;
                section: z.ZodDefault<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodObject<{
                    title: z.ZodString;
                    from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                    to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                }, "strip", z.ZodTypeAny, {
                    from: number | null;
                    to: number | null;
                    title: string;
                }, {
                    title: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                }>, {
                    from: number | null;
                    to: number | null;
                    title: string;
                }, {
                    title: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                }>, {
                    from: number | null;
                    to: number | null;
                    title: string;
                }, {
                    title: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                }>>>;
            }, "strip", z.ZodTypeAny, {
                path: string;
                from: number | null;
                to: number | null;
                page: number | null;
                quoted: string;
                section: {
                    from: number | null;
                    to: number | null;
                    title: string;
                } | null;
            }, {
                path: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
                page?: number | null | undefined;
                quoted?: string | undefined;
                section?: {
                    title: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                } | null | undefined;
            }>, {
                path: string;
                from: number | null;
                to: number | null;
                page: number | null;
                quoted: string;
                section: {
                    from: number | null;
                    to: number | null;
                    title: string;
                } | null;
            }, {
                path: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
                page?: number | null | undefined;
                quoted?: string | undefined;
                section?: {
                    title: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                } | null | undefined;
            }>, {
                path: string;
                from: number | null;
                to: number | null;
                page: number | null;
                quoted: string;
                section: {
                    from: number | null;
                    to: number | null;
                    title: string;
                } | null;
            }, {
                path: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
                page?: number | null | undefined;
                quoted?: string | undefined;
                section?: {
                    title: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                } | null | undefined;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            refs: string[];
            documents: {
                path: string;
                from: number | null;
                to: number | null;
                page: number | null;
                quoted: string;
                section: {
                    from: number | null;
                    to: number | null;
                    title: string;
                } | null;
            }[];
        }, {
            refs?: string[] | undefined;
            documents?: {
                path: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
                page?: number | null | undefined;
                quoted?: string | undefined;
                section?: {
                    title: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                } | null | undefined;
            }[] | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        module: string;
        selected: boolean;
        showing: {
            refs: string[];
            documents: {
                path: string;
                from: number | null;
                to: number | null;
                page: number | null;
                quoted: string;
                section: {
                    from: number | null;
                    to: number | null;
                    title: string;
                } | null;
            }[];
        };
    }, {
        module: string;
        selected?: boolean | undefined;
        showing?: {
            refs?: string[] | undefined;
            documents?: {
                path: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
                page?: number | null | undefined;
                quoted?: string | undefined;
                section?: {
                    title: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                } | null | undefined;
            }[] | undefined;
        } | undefined;
    }>, "many">>;
    dispositions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        ref: z.ZodString;
        value: z.ZodEnum<["done", "wont-do", "duplicate", "superseded"]>;
        target: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        note: z.ZodDefault<z.ZodString>;
        by: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        at: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        at: string | null;
        value: "done" | "wont-do" | "duplicate" | "superseded";
        ref: string;
        target: string | null;
        note: string;
        by: string | null;
    }, {
        value: "done" | "wont-do" | "duplicate" | "superseded";
        ref: string;
        at?: string | null | undefined;
        target?: string | null | undefined;
        note?: string | undefined;
        by?: string | null | undefined;
    }>, "many">>;
    tracker: z.ZodDefault<z.ZodObject<{
        at: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        refreshing: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        at: string | null;
        refreshing: boolean;
    }, {
        at?: string | null | undefined;
        refreshing?: boolean | undefined;
    }>>;
    content: z.ZodDefault<z.ZodArray<z.ZodObject<{
        source: z.ZodEffects<z.ZodString, string, string>;
        epic: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        at: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        at: string;
        source: string;
        epic: string | null;
    }, {
        at: string;
        source: string;
        epic?: string | null | undefined;
    }>, "many">>;
    parts: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        heading: z.ZodDefault<z.ZodString>;
        refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        picked: z.ZodDefault<z.ZodBoolean>;
        files: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        heading: string;
        refs: string[];
        picked: boolean;
        files?: string[] | undefined;
    }, {
        id: string;
        files?: string[] | undefined;
        heading?: string | undefined;
        refs?: string[] | undefined;
        picked?: boolean | undefined;
    }>, "many">>;
} & {
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.context">, z.ZodLiteral<string>]>, "kehikot.context", string>;
    protocol: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    containers: {
        module: string;
        selected: boolean;
        showing: {
            refs: string[];
            documents: {
                path: string;
                from: number | null;
                to: number | null;
                page: number | null;
                quoted: string;
                section: {
                    from: number | null;
                    to: number | null;
                    title: string;
                } | null;
            }[];
        };
    }[];
    type: "kehikot.context";
    epic: string | null;
    tracker: {
        at: string | null;
        refreshing: boolean;
    };
    project: string | null;
    projectPath: string | null;
    theme: "light" | "dark";
    selection: string[];
    passage: {
        path: string;
        from: number | null;
        to: number | null;
        page: number | null;
        quoted: string;
        section: {
            from: number | null;
            to: number | null;
            title: string;
        } | null;
    } | null;
    pinned: boolean;
    prompt: string | null;
    kehikko: {
        id: number;
        name: string;
    } | null;
    filters: Record<string, string | string[]>;
    dispositions: {
        at: string | null;
        value: "done" | "wont-do" | "duplicate" | "superseded";
        ref: string;
        target: string | null;
        note: string;
        by: string | null;
    }[];
    content: {
        at: string;
        source: string;
        epic: string | null;
    }[];
    parts: {
        id: string;
        heading: string;
        refs: string[];
        picked: boolean;
        files?: string[] | undefined;
    }[];
    protocol: number;
}, {
    type: string;
    protocol: number;
    containers?: {
        module: string;
        selected?: boolean | undefined;
        showing?: {
            refs?: string[] | undefined;
            documents?: {
                path: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
                page?: number | null | undefined;
                quoted?: string | undefined;
                section?: {
                    title: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                } | null | undefined;
            }[] | undefined;
        } | undefined;
    }[] | undefined;
    epic?: string | null | undefined;
    tracker?: {
        at?: string | null | undefined;
        refreshing?: boolean | undefined;
    } | undefined;
    project?: string | null | undefined;
    projectPath?: string | null | undefined;
    theme?: "light" | "dark" | undefined;
    selection?: string[] | undefined;
    passage?: {
        path: string;
        from?: number | null | undefined;
        to?: number | null | undefined;
        page?: number | null | undefined;
        quoted?: string | undefined;
        section?: {
            title: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
        } | null | undefined;
    } | null | undefined;
    pinned?: boolean | undefined;
    prompt?: string | null | undefined;
    kehikko?: {
        id: number;
        name: string;
    } | null | undefined;
    filters?: Record<string, string | string[]> | undefined;
    dispositions?: {
        value: "done" | "wont-do" | "duplicate" | "superseded";
        ref: string;
        at?: string | null | undefined;
        target?: string | null | undefined;
        note?: string | undefined;
        by?: string | null | undefined;
    }[] | undefined;
    content?: {
        at: string;
        source: string;
        epic?: string | null | undefined;
    }[] | undefined;
    parts?: {
        id: string;
        files?: string[] | undefined;
        heading?: string | undefined;
        refs?: string[] | undefined;
        picked?: boolean | undefined;
    }[] | undefined;
}>;
/**
 * The answer to exactly one request.
 *
 * Two shapes under one type, and the split is the point: a caller either got
 * data or got a refusal, and a single object with four optional fields makes
 * that a thing to work out rather than a thing to branch on.
 *
 * A refusal carries BOTH halves, always. `reason` is a word from a closed set,
 * for the program: "ask again later" and "never, this method does not exist"
 * are different futures and code has to be able to tell them apart without
 * reading English. `error` is a sentence, for the person: whoever is writing
 * the module reads it in their own console and has to know which of their calls
 * was wrong. Neither substitutes for the other. A reason with no sentence is a
 * developer bisecting their own code to find out what happened; a sentence with
 * no reason is a client parsing prose.
 */
export declare const responseFailureReasons: readonly ["unknown-module", "unknown-method", "failed"];
export type ResponseFailureReason = (typeof responseFailureReasons)[number];
/**
 * Three reasons, and there used to be four.
 *
 * `not-allowed` is gone with the permission system it described. What remains
 * are: this host has no module by that name (which is a module talking to a
 * host that has forgotten it, usually after being removed while its frame was
 * still open); this host has no such method (which is a module built against a
 * protocol this host no longer speaks, and is the one refusal an author should
 * treat as fatal); and it went wrong (which is everything else, and is the only
 * one worth retrying).
 *
 * A host may of course refuse a call for reasons of its own — that is the whole
 * of what a host is for. It says so with `failed` and a sentence. Adding a
 * reason per policy would be this package enumerating hosts' policies, which is
 * a list that cannot be kept and would read as the set of policies allowed.
 */
export declare const responseSchema: z.ZodDiscriminatedUnion<"ok", [z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.response">, z.ZodLiteral<string>]>, "kehikot.response", string>;
    id: z.ZodString;
    ok: z.ZodLiteral<true>;
    /**
     * Whatever the method answers with, and deliberately untyped. See the note
     * at the top of `methods.ts`: a client that asserted a shape here would be
     * asserting something no host promised.
     */
    data: z.ZodUnknown;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.response";
    id: string;
    ok: true;
    data?: unknown;
}, {
    type: string;
    id: string;
    ok: true;
    data?: unknown;
}>, z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.response">, z.ZodLiteral<string>]>, "kehikot.response", string>;
    id: z.ZodString;
    ok: z.ZodLiteral<false>;
    reason: z.ZodEnum<["unknown-module", "unknown-method", "failed"]>;
    /**
     * Bounded, because a refusal is the one place a host quotes a module's own
     * text back at it — the method name it asked for, the extension it named —
     * and a sentence that carried two hundred thousand characters of that back
     * across the frame would be a module's document, round-tripped, at the
     * module's own request. Long enough for every sentence anybody actually
     * writes; short enough that no answer is ever a document.
     */
    error: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.response";
    id: string;
    error: string;
    reason: "failed" | "unknown-module" | "unknown-method";
    ok: false;
}, {
    type: string;
    id: string;
    reason: "failed" | "unknown-module" | "unknown-method";
    ok: false;
    error?: string | undefined;
}>]>;
/**
 * Go to a reference.
 *
 * ## Why this message is the interesting one
 *
 * A host walks a reader to a reference by reaching into the panel: query for
 * the anchor, open whatever is folded above it, scroll it to the middle, flash
 * it. That works while the panel is part of the host's own page and stops
 * working entirely the moment the panel is a module, because the frame is
 * cross-origin, its document is unreachable, and there is no way to reach in.
 *
 * There is a fallback that needs no protocol at all — set the frame's location
 * to `#epic=x&ref=y`, which a page may do cross-origin — and it costs a
 * navigation: the document reloads and the handshake happens again. That is why
 * it is the fallback and this is the message.
 *
 * `ref` is a reference as the host spells them. `step` is 1-based. `epic` is
 * optional and means "switch first", which the host would ordinarily have sent
 * as context anyway. The bounds — `GOTO_REF`, 1..999, the slug pattern — are
 * not invented here: they are what the receiving end already imposes, restated
 * so the sender knows what will survive.
 *
 * `id` is required, and it is the reason this message needed designing rather
 * than just writing down. See `wentSchema`.
 *
 * The mirror of this message is the `view.goto` method, which is a module
 * asking for the same act. The fields are named the same on both sides
 * deliberately. They differ in exactly one way, and it is the direction of the
 * asking: a `goto` naming only an epic is refused here, because a host with
 * nothing to say but "this epic" says it as context; a `view.goto` naming only
 * an epic is the commonest ask a module has.
 */
export declare const gotoSchema: z.ZodEffects<z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.goto">, z.ZodLiteral<string>]>, "kehikot.goto", string>;
    id: z.ZodString;
    ref: z.ZodOptional<z.ZodString>;
    step: z.ZodOptional<z.ZodNumber>;
    epic: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.goto";
    id: string;
    epic?: string | undefined;
    ref?: string | undefined;
    step?: number | undefined;
}, {
    type: string;
    id: string;
    epic?: string | undefined;
    ref?: string | undefined;
    step?: number | undefined;
}>, {
    type: "kehikot.goto";
    id: string;
    epic?: string | undefined;
    ref?: string | undefined;
    step?: number | undefined;
}, {
    type: string;
    id: string;
    epic?: string | undefined;
    ref?: string | undefined;
    step?: number | undefined;
}>;
/**
 * An extension payload one module emitted, delivered to a module that consumes
 * that format.
 *
 * ## Why the host is in the middle at all
 *
 * The sender does not name a recipient and cannot: a module has no way to know
 * what else is on the canvas, and giving it one would end modularity. It names
 * a FORMAT — `kehikot.notifications@1` — and the host works out who has said,
 * in their manifest, that they consume it. So a module emits into the room and
 * the room decides who hears, which is why either can be removed without the
 * other noticing.
 *
 * ## What the host vouches for, and what it does not
 *
 * `extension` and `payload` were checked before this was sent: the host knew
 * the format and validated the payload against that format's own schema, so a
 * receiver is entitled to assume the shape.
 *
 * `from` is the id of the module that emitted it, taken from the host's own
 * registry rather than from anything the sender said, so it cannot be forged by
 * a module claiming to be another. It is the one field a receiver may safely
 * attribute by.
 *
 * The CONTENTS are the sender's claim and nothing more. A notification saying
 * "the tests passed" is one module's word for it; a host relaying it has not
 * checked that any test ran. A receiver drawing it should attribute it, for the
 * same reason `selection` carries refs and not kinds.
 *
 * ## Not answered, ever
 *
 * No correlation id and no reply. A module that ignores every event it is sent
 * is a conforming module, and a host that waited for acknowledgement could be
 * hung by a pane nobody is looking at. Delivery is best-effort by design: an
 * event sent to a module that is still loading is lost, and a receiver that
 * needs history should keep its own rather than expect the wire to hold it.
 */
export declare const eventSchema: z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.event">, z.ZodLiteral<string>]>, "kehikot.event", string>;
    protocol: z.ZodNumber;
    /** The format, e.g. `kehikot.notifications@1`. Known to the host, or unsent. */
    extension: z.ZodEffects<z.ZodString, string, string>;
    /** Whatever that format says. Validated by the host before it left. */
    payload: z.ZodUnknown;
    /** The module that emitted it, named by the host from its own registry. */
    from: z.ZodEffects<z.ZodString, string, string>;
    /**
     * When the host accepted it, ISO 8601. A receiver ordering by arrival would
     * be ordering by its own scheduler instead.
     */
    at: z.ZodString;
    /**
     * The kehikko it happened on, so a receiver can tell near from far.
     *
     * A module is loaded once and shown on whichever canvas asks for it, so "this
     * kehikko" is a question it cannot answer alone. `context.kehikko` says where
     * the receiver is standing and this says where the event came from; comparing
     * the two is the whole of a near/far filter, and it is a comparison rather
     * than a rule so a module can present it however it likes.
     */
    kehikko: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: number;
        name: string;
    }, {
        id: number;
        name: string;
    }>>>;
}, "strip", z.ZodTypeAny, {
    at: string;
    from: string;
    type: "kehikot.event";
    extension: string;
    kehikko: {
        id: number;
        name: string;
    } | null;
    protocol: number;
    payload?: unknown;
}, {
    at: string;
    from: string;
    type: string;
    extension: string;
    protocol: number;
    kehikko?: {
        id: number;
        name: string;
    } | null | undefined;
    payload?: unknown;
}>;
/**
 * "I heard you."
 *
 * The id is the module's own, and it is here so that a host greeting a frame
 * can confirm the program in it is the one whose manifest it read. It is not
 * how the host identifies the module — that is the frame handle, which cannot
 * be forged — so a mismatch is a fault to report rather than an impersonation
 * to defend against. The distinction matters: a check that looks like security
 * and is not teaches people to lean on it.
 *
 * Silence after a greeting is the failure this message exists to make visible.
 * A host should give it a bounded wait and then say, in words, that the module
 * was greeted and did not answer — and should count that wait from the
 * GREETING, not from the mount, because a module cannot be silent in answer to
 * a word nobody has said yet.
 */
export declare const readySchema: z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.ready">, z.ZodLiteral<string>]>, "kehikot.ready", string>;
    id: z.ZodEffects<z.ZodString, string, string>;
    protocol: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.ready";
    id: string;
    protocol: number;
}, {
    type: string;
    id: string;
    protocol?: number | undefined;
}>;
/** One question, with an id the answer will carry back. */
export declare const requestSchema: z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.request">, z.ZodLiteral<string>]>, "kehikot.request", string>;
    id: z.ZodString;
    /**
     * Bounded but not held to the list of known methods, which would be this
     * schema deciding what a host answers. A host with a method this package has
     * never heard of is a host doing its job; a host without one this package
     * knows is entitled to refuse it, with `unknown-method`.
     */
    method: z.ZodString;
    params: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.request";
    id: string;
    method: string;
    params: Record<string, unknown>;
}, {
    type: string;
    id: string;
    method: string;
    params?: Record<string, unknown> | undefined;
}>;
/**
 * How tall the module would like to be.
 *
 * The one message with no id and no answer. It is a request in the ordinary
 * sense and not in the protocol's: the host clamps it (`clampHeight`) and may
 * ignore it entirely, and a module that needed to know the outcome can measure
 * itself.
 */
export declare const resizeSchema: z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.resize">, z.ZodLiteral<string>]>, "kehikot.resize", string>;
    height: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.resize";
    height: number;
}, {
    type: string;
    height: number;
}>;
/**
 * "I went" — or "there is nothing here by that name."
 *
 * ## The acknowledgement the protocol has always lacked
 *
 * Everything else the host says to a module is fire-and-forget, and can be,
 * because nothing downstream of it depends on the answer. `goto` is different,
 * and the difference is concrete: a host's reference index decides whether to
 * walk the reader to a reference in place or to fall back to an ordinary link,
 * and it decides by whether the walk found anything. In the host's own page
 * that answer was a return value. Across a frame there is no return value, so
 * either the host stops asking — and accepts that pressing a reference may land
 * nowhere, silently, which is the failure this whole protocol keeps refusing —
 * or the message gets an answer.
 *
 * So it gets one, and `goto` carries an id to pair it with. This is the first
 * and only place the host waits on a module for anything, and it is worth being
 * plain about what that means: the host is now depending on somebody else's
 * program to reply, so it must time out, and the timeout must mean the same
 * thing as `found: false` — fall back to the link. A module that never answers
 * must not be able to hang a reference.
 *
 * `found` is the field the index reads. `why` is for the person: "nothing in
 * this epic names gh#41" is a sentence worth showing, and a host that only knew
 * `false` would have to invent one that might be wrong about the reason.
 *
 * ## Answer when you know, not when you are asked
 *
 * There is one `went` per `goto` and it is the last word, so a module must not
 * send it until the walk has actually settled. The tempting bug is visible in
 * the receiver this pair was designed against: told to go to a ref in an epic
 * it does not currently have loaded, it starts the load, remembers where it was
 * going, and returns "yes" — before anything has been looked for. Answering
 * `found: true` there is a guess, and the host acts on it by NOT falling back
 * to a link, so a wrong guess is a press that lands nowhere and says nothing,
 * which is the exact failure this pair exists to remove.
 *
 * Holding the answer until the load finishes is safe, because the host's
 * timeout is the backstop and a timeout already means what `found: false`
 * means. A slow honest answer degrades to the fallback. A fast dishonest one
 * degrades to silence.
 */
export declare const wentSchema: z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.went">, z.ZodLiteral<string>]>, "kehikot.went", string>;
    id: z.ZodString;
    found: z.ZodBoolean;
    why: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.went";
    id: string;
    why: string;
    found: boolean;
}, {
    type: string;
    id: string;
    found: boolean;
    why?: string | undefined;
}>;
/**
 * Not a `discriminatedUnion`, because `responseSchema` is itself a union on a
 * different key and cannot be an option of one. A plain union costs a little
 * more to parse and reports its failures less precisely; it is the honest shape
 * of a wire where one message type has two forms.
 */
export declare const hostMessageSchema: z.ZodUnion<[z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.hello">, z.ZodLiteral<string>]>, "kehikot.hello", string>;
    protocol: z.ZodNumber;
    session: z.ZodString;
    context: z.ZodObject<{
        epic: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        project: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        projectPath: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        theme: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
        selection: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        passage: z.ZodDefault<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodObject<{
            path: z.ZodString;
            page: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            quoted: z.ZodDefault<z.ZodString>;
            section: z.ZodDefault<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodObject<{
                title: z.ZodString;
                from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            }, "strip", z.ZodTypeAny, {
                from: number | null;
                to: number | null;
                title: string;
            }, {
                title: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
            }>, {
                from: number | null;
                to: number | null;
                title: string;
            }, {
                title: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
            }>, {
                from: number | null;
                to: number | null;
                title: string;
            }, {
                title: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
            }>>>;
        }, "strip", z.ZodTypeAny, {
            path: string;
            from: number | null;
            to: number | null;
            page: number | null;
            quoted: string;
            section: {
                from: number | null;
                to: number | null;
                title: string;
            } | null;
        }, {
            path: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
            page?: number | null | undefined;
            quoted?: string | undefined;
            section?: {
                title: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
            } | null | undefined;
        }>, {
            path: string;
            from: number | null;
            to: number | null;
            page: number | null;
            quoted: string;
            section: {
                from: number | null;
                to: number | null;
                title: string;
            } | null;
        }, {
            path: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
            page?: number | null | undefined;
            quoted?: string | undefined;
            section?: {
                title: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
            } | null | undefined;
        }>, {
            path: string;
            from: number | null;
            to: number | null;
            page: number | null;
            quoted: string;
            section: {
                from: number | null;
                to: number | null;
                title: string;
            } | null;
        }, {
            path: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
            page?: number | null | undefined;
            quoted?: string | undefined;
            section?: {
                title: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
            } | null | undefined;
        }>>>;
        pinned: z.ZodDefault<z.ZodBoolean>;
        prompt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        kehikko: z.ZodDefault<z.ZodNullable<z.ZodObject<{
            id: z.ZodNumber;
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: number;
            name: string;
        }, {
            id: number;
            name: string;
        }>>>;
        filters: z.ZodDefault<z.ZodEffects<z.ZodRecord<z.ZodEffects<z.ZodString, string, string>, z.ZodUnion<[z.ZodString, z.ZodEffects<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">, string[], string[]>]>>, Record<string, string | string[]>, Record<string, string | string[]>>>;
        containers: z.ZodDefault<z.ZodArray<z.ZodObject<{
            module: z.ZodEffects<z.ZodString, string, string>;
            selected: z.ZodDefault<z.ZodBoolean>;
            showing: z.ZodDefault<z.ZodObject<{
                refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                documents: z.ZodDefault<z.ZodArray<z.ZodEffects<z.ZodEffects<z.ZodObject<{
                    path: z.ZodString;
                    page: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                    from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                    to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                    quoted: z.ZodDefault<z.ZodString>;
                    section: z.ZodDefault<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodObject<{
                        title: z.ZodString;
                        from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                        to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                    }, "strip", z.ZodTypeAny, {
                        from: number | null;
                        to: number | null;
                        title: string;
                    }, {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    }>, {
                        from: number | null;
                        to: number | null;
                        title: string;
                    }, {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    }>, {
                        from: number | null;
                        to: number | null;
                        title: string;
                    }, {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    }>>>;
                }, "strip", z.ZodTypeAny, {
                    path: string;
                    from: number | null;
                    to: number | null;
                    page: number | null;
                    quoted: string;
                    section: {
                        from: number | null;
                        to: number | null;
                        title: string;
                    } | null;
                }, {
                    path: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                    page?: number | null | undefined;
                    quoted?: string | undefined;
                    section?: {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    } | null | undefined;
                }>, {
                    path: string;
                    from: number | null;
                    to: number | null;
                    page: number | null;
                    quoted: string;
                    section: {
                        from: number | null;
                        to: number | null;
                        title: string;
                    } | null;
                }, {
                    path: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                    page?: number | null | undefined;
                    quoted?: string | undefined;
                    section?: {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    } | null | undefined;
                }>, {
                    path: string;
                    from: number | null;
                    to: number | null;
                    page: number | null;
                    quoted: string;
                    section: {
                        from: number | null;
                        to: number | null;
                        title: string;
                    } | null;
                }, {
                    path: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                    page?: number | null | undefined;
                    quoted?: string | undefined;
                    section?: {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    } | null | undefined;
                }>, "many">>;
            }, "strip", z.ZodTypeAny, {
                refs: string[];
                documents: {
                    path: string;
                    from: number | null;
                    to: number | null;
                    page: number | null;
                    quoted: string;
                    section: {
                        from: number | null;
                        to: number | null;
                        title: string;
                    } | null;
                }[];
            }, {
                refs?: string[] | undefined;
                documents?: {
                    path: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                    page?: number | null | undefined;
                    quoted?: string | undefined;
                    section?: {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    } | null | undefined;
                }[] | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            module: string;
            selected: boolean;
            showing: {
                refs: string[];
                documents: {
                    path: string;
                    from: number | null;
                    to: number | null;
                    page: number | null;
                    quoted: string;
                    section: {
                        from: number | null;
                        to: number | null;
                        title: string;
                    } | null;
                }[];
            };
        }, {
            module: string;
            selected?: boolean | undefined;
            showing?: {
                refs?: string[] | undefined;
                documents?: {
                    path: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                    page?: number | null | undefined;
                    quoted?: string | undefined;
                    section?: {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    } | null | undefined;
                }[] | undefined;
            } | undefined;
        }>, "many">>;
        dispositions: z.ZodDefault<z.ZodArray<z.ZodObject<{
            ref: z.ZodString;
            value: z.ZodEnum<["done", "wont-do", "duplicate", "superseded"]>;
            target: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            note: z.ZodDefault<z.ZodString>;
            by: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            at: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            at: string | null;
            value: "done" | "wont-do" | "duplicate" | "superseded";
            ref: string;
            target: string | null;
            note: string;
            by: string | null;
        }, {
            value: "done" | "wont-do" | "duplicate" | "superseded";
            ref: string;
            at?: string | null | undefined;
            target?: string | null | undefined;
            note?: string | undefined;
            by?: string | null | undefined;
        }>, "many">>;
        tracker: z.ZodDefault<z.ZodObject<{
            at: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            refreshing: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            at: string | null;
            refreshing: boolean;
        }, {
            at?: string | null | undefined;
            refreshing?: boolean | undefined;
        }>>;
        content: z.ZodDefault<z.ZodArray<z.ZodObject<{
            source: z.ZodEffects<z.ZodString, string, string>;
            epic: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            at: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            at: string;
            source: string;
            epic: string | null;
        }, {
            at: string;
            source: string;
            epic?: string | null | undefined;
        }>, "many">>;
        parts: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            heading: z.ZodDefault<z.ZodString>;
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            picked: z.ZodDefault<z.ZodBoolean>;
            files: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            heading: string;
            refs: string[];
            picked: boolean;
            files?: string[] | undefined;
        }, {
            id: string;
            files?: string[] | undefined;
            heading?: string | undefined;
            refs?: string[] | undefined;
            picked?: boolean | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        containers: {
            module: string;
            selected: boolean;
            showing: {
                refs: string[];
                documents: {
                    path: string;
                    from: number | null;
                    to: number | null;
                    page: number | null;
                    quoted: string;
                    section: {
                        from: number | null;
                        to: number | null;
                        title: string;
                    } | null;
                }[];
            };
        }[];
        epic: string | null;
        tracker: {
            at: string | null;
            refreshing: boolean;
        };
        project: string | null;
        projectPath: string | null;
        theme: "light" | "dark";
        selection: string[];
        passage: {
            path: string;
            from: number | null;
            to: number | null;
            page: number | null;
            quoted: string;
            section: {
                from: number | null;
                to: number | null;
                title: string;
            } | null;
        } | null;
        pinned: boolean;
        prompt: string | null;
        kehikko: {
            id: number;
            name: string;
        } | null;
        filters: Record<string, string | string[]>;
        dispositions: {
            at: string | null;
            value: "done" | "wont-do" | "duplicate" | "superseded";
            ref: string;
            target: string | null;
            note: string;
            by: string | null;
        }[];
        content: {
            at: string;
            source: string;
            epic: string | null;
        }[];
        parts: {
            id: string;
            heading: string;
            refs: string[];
            picked: boolean;
            files?: string[] | undefined;
        }[];
    }, {
        containers?: {
            module: string;
            selected?: boolean | undefined;
            showing?: {
                refs?: string[] | undefined;
                documents?: {
                    path: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                    page?: number | null | undefined;
                    quoted?: string | undefined;
                    section?: {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    } | null | undefined;
                }[] | undefined;
            } | undefined;
        }[] | undefined;
        epic?: string | null | undefined;
        tracker?: {
            at?: string | null | undefined;
            refreshing?: boolean | undefined;
        } | undefined;
        project?: string | null | undefined;
        projectPath?: string | null | undefined;
        theme?: "light" | "dark" | undefined;
        selection?: string[] | undefined;
        passage?: {
            path: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
            page?: number | null | undefined;
            quoted?: string | undefined;
            section?: {
                title: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
            } | null | undefined;
        } | null | undefined;
        pinned?: boolean | undefined;
        prompt?: string | null | undefined;
        kehikko?: {
            id: number;
            name: string;
        } | null | undefined;
        filters?: Record<string, string | string[]> | undefined;
        dispositions?: {
            value: "done" | "wont-do" | "duplicate" | "superseded";
            ref: string;
            at?: string | null | undefined;
            target?: string | null | undefined;
            note?: string | undefined;
            by?: string | null | undefined;
        }[] | undefined;
        content?: {
            at: string;
            source: string;
            epic?: string | null | undefined;
        }[] | undefined;
        parts?: {
            id: string;
            files?: string[] | undefined;
            heading?: string | undefined;
            refs?: string[] | undefined;
            picked?: boolean | undefined;
        }[] | undefined;
    }>;
    /**
     * Whatever this module last asked the host to keep for it, verbatim.
     *
     * Beside the context rather than inside it, and that placement is the whole
     * point: context is broadcast to every framed module, and this belongs to one
     * of them. A module's remembered state travelling in a shared message would
     * be every module reading every other module's preferences.
     *
     * `null` when the host keeps nothing for it — a first run, a host that does
     * not answer `state.set`, a module that has never written any. It is not
     * optional, because a module has to be able to tell "nothing kept" from "the
     * field is missing because this host is older than the idea", and only one of
     * those means it should draw its defaults with confidence.
     *
     * In the GREETING rather than fetched, so a module has it before its first
     * render. Asking for it afterwards would mean drawing the wrong filter first
     * and correcting it, which is the visible-flicker failure in a different
     * costume.
     *
     * Opaque. The host stored a string and hands the same string back; see
     * `state.set` in `methods.ts` for why it must never learn what is in it.
     */
    state: z.ZodDefault<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.hello";
    context: {
        containers: {
            module: string;
            selected: boolean;
            showing: {
                refs: string[];
                documents: {
                    path: string;
                    from: number | null;
                    to: number | null;
                    page: number | null;
                    quoted: string;
                    section: {
                        from: number | null;
                        to: number | null;
                        title: string;
                    } | null;
                }[];
            };
        }[];
        epic: string | null;
        tracker: {
            at: string | null;
            refreshing: boolean;
        };
        project: string | null;
        projectPath: string | null;
        theme: "light" | "dark";
        selection: string[];
        passage: {
            path: string;
            from: number | null;
            to: number | null;
            page: number | null;
            quoted: string;
            section: {
                from: number | null;
                to: number | null;
                title: string;
            } | null;
        } | null;
        pinned: boolean;
        prompt: string | null;
        kehikko: {
            id: number;
            name: string;
        } | null;
        filters: Record<string, string | string[]>;
        dispositions: {
            at: string | null;
            value: "done" | "wont-do" | "duplicate" | "superseded";
            ref: string;
            target: string | null;
            note: string;
            by: string | null;
        }[];
        content: {
            at: string;
            source: string;
            epic: string | null;
        }[];
        parts: {
            id: string;
            heading: string;
            refs: string[];
            picked: boolean;
            files?: string[] | undefined;
        }[];
    };
    state: string | null;
    protocol: number;
    session: string;
}, {
    type: string;
    context: {
        containers?: {
            module: string;
            selected?: boolean | undefined;
            showing?: {
                refs?: string[] | undefined;
                documents?: {
                    path: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                    page?: number | null | undefined;
                    quoted?: string | undefined;
                    section?: {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    } | null | undefined;
                }[] | undefined;
            } | undefined;
        }[] | undefined;
        epic?: string | null | undefined;
        tracker?: {
            at?: string | null | undefined;
            refreshing?: boolean | undefined;
        } | undefined;
        project?: string | null | undefined;
        projectPath?: string | null | undefined;
        theme?: "light" | "dark" | undefined;
        selection?: string[] | undefined;
        passage?: {
            path: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
            page?: number | null | undefined;
            quoted?: string | undefined;
            section?: {
                title: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
            } | null | undefined;
        } | null | undefined;
        pinned?: boolean | undefined;
        prompt?: string | null | undefined;
        kehikko?: {
            id: number;
            name: string;
        } | null | undefined;
        filters?: Record<string, string | string[]> | undefined;
        dispositions?: {
            value: "done" | "wont-do" | "duplicate" | "superseded";
            ref: string;
            at?: string | null | undefined;
            target?: string | null | undefined;
            note?: string | undefined;
            by?: string | null | undefined;
        }[] | undefined;
        content?: {
            at: string;
            source: string;
            epic?: string | null | undefined;
        }[] | undefined;
        parts?: {
            id: string;
            files?: string[] | undefined;
            heading?: string | undefined;
            refs?: string[] | undefined;
            picked?: boolean | undefined;
        }[] | undefined;
    };
    protocol: number;
    session: string;
    state?: string | null | undefined;
}>, z.ZodObject<{
    epic: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    project: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    projectPath: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    theme: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
    selection: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    passage: z.ZodDefault<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodObject<{
        path: z.ZodString;
        page: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        quoted: z.ZodDefault<z.ZodString>;
        section: z.ZodDefault<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodObject<{
            title: z.ZodString;
            from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        }, "strip", z.ZodTypeAny, {
            from: number | null;
            to: number | null;
            title: string;
        }, {
            title: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
        }>, {
            from: number | null;
            to: number | null;
            title: string;
        }, {
            title: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
        }>, {
            from: number | null;
            to: number | null;
            title: string;
        }, {
            title: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
        }>>>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        from: number | null;
        to: number | null;
        page: number | null;
        quoted: string;
        section: {
            from: number | null;
            to: number | null;
            title: string;
        } | null;
    }, {
        path: string;
        from?: number | null | undefined;
        to?: number | null | undefined;
        page?: number | null | undefined;
        quoted?: string | undefined;
        section?: {
            title: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
        } | null | undefined;
    }>, {
        path: string;
        from: number | null;
        to: number | null;
        page: number | null;
        quoted: string;
        section: {
            from: number | null;
            to: number | null;
            title: string;
        } | null;
    }, {
        path: string;
        from?: number | null | undefined;
        to?: number | null | undefined;
        page?: number | null | undefined;
        quoted?: string | undefined;
        section?: {
            title: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
        } | null | undefined;
    }>, {
        path: string;
        from: number | null;
        to: number | null;
        page: number | null;
        quoted: string;
        section: {
            from: number | null;
            to: number | null;
            title: string;
        } | null;
    }, {
        path: string;
        from?: number | null | undefined;
        to?: number | null | undefined;
        page?: number | null | undefined;
        quoted?: string | undefined;
        section?: {
            title: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
        } | null | undefined;
    }>>>;
    pinned: z.ZodDefault<z.ZodBoolean>;
    prompt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    kehikko: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: number;
        name: string;
    }, {
        id: number;
        name: string;
    }>>>;
    filters: z.ZodDefault<z.ZodEffects<z.ZodRecord<z.ZodEffects<z.ZodString, string, string>, z.ZodUnion<[z.ZodString, z.ZodEffects<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">, string[], string[]>]>>, Record<string, string | string[]>, Record<string, string | string[]>>>;
    containers: z.ZodDefault<z.ZodArray<z.ZodObject<{
        module: z.ZodEffects<z.ZodString, string, string>;
        selected: z.ZodDefault<z.ZodBoolean>;
        showing: z.ZodDefault<z.ZodObject<{
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            documents: z.ZodDefault<z.ZodArray<z.ZodEffects<z.ZodEffects<z.ZodObject<{
                path: z.ZodString;
                page: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                quoted: z.ZodDefault<z.ZodString>;
                section: z.ZodDefault<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodObject<{
                    title: z.ZodString;
                    from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                    to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                }, "strip", z.ZodTypeAny, {
                    from: number | null;
                    to: number | null;
                    title: string;
                }, {
                    title: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                }>, {
                    from: number | null;
                    to: number | null;
                    title: string;
                }, {
                    title: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                }>, {
                    from: number | null;
                    to: number | null;
                    title: string;
                }, {
                    title: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                }>>>;
            }, "strip", z.ZodTypeAny, {
                path: string;
                from: number | null;
                to: number | null;
                page: number | null;
                quoted: string;
                section: {
                    from: number | null;
                    to: number | null;
                    title: string;
                } | null;
            }, {
                path: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
                page?: number | null | undefined;
                quoted?: string | undefined;
                section?: {
                    title: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                } | null | undefined;
            }>, {
                path: string;
                from: number | null;
                to: number | null;
                page: number | null;
                quoted: string;
                section: {
                    from: number | null;
                    to: number | null;
                    title: string;
                } | null;
            }, {
                path: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
                page?: number | null | undefined;
                quoted?: string | undefined;
                section?: {
                    title: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                } | null | undefined;
            }>, {
                path: string;
                from: number | null;
                to: number | null;
                page: number | null;
                quoted: string;
                section: {
                    from: number | null;
                    to: number | null;
                    title: string;
                } | null;
            }, {
                path: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
                page?: number | null | undefined;
                quoted?: string | undefined;
                section?: {
                    title: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                } | null | undefined;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            refs: string[];
            documents: {
                path: string;
                from: number | null;
                to: number | null;
                page: number | null;
                quoted: string;
                section: {
                    from: number | null;
                    to: number | null;
                    title: string;
                } | null;
            }[];
        }, {
            refs?: string[] | undefined;
            documents?: {
                path: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
                page?: number | null | undefined;
                quoted?: string | undefined;
                section?: {
                    title: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                } | null | undefined;
            }[] | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        module: string;
        selected: boolean;
        showing: {
            refs: string[];
            documents: {
                path: string;
                from: number | null;
                to: number | null;
                page: number | null;
                quoted: string;
                section: {
                    from: number | null;
                    to: number | null;
                    title: string;
                } | null;
            }[];
        };
    }, {
        module: string;
        selected?: boolean | undefined;
        showing?: {
            refs?: string[] | undefined;
            documents?: {
                path: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
                page?: number | null | undefined;
                quoted?: string | undefined;
                section?: {
                    title: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                } | null | undefined;
            }[] | undefined;
        } | undefined;
    }>, "many">>;
    dispositions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        ref: z.ZodString;
        value: z.ZodEnum<["done", "wont-do", "duplicate", "superseded"]>;
        target: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        note: z.ZodDefault<z.ZodString>;
        by: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        at: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        at: string | null;
        value: "done" | "wont-do" | "duplicate" | "superseded";
        ref: string;
        target: string | null;
        note: string;
        by: string | null;
    }, {
        value: "done" | "wont-do" | "duplicate" | "superseded";
        ref: string;
        at?: string | null | undefined;
        target?: string | null | undefined;
        note?: string | undefined;
        by?: string | null | undefined;
    }>, "many">>;
    tracker: z.ZodDefault<z.ZodObject<{
        at: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        refreshing: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        at: string | null;
        refreshing: boolean;
    }, {
        at?: string | null | undefined;
        refreshing?: boolean | undefined;
    }>>;
    content: z.ZodDefault<z.ZodArray<z.ZodObject<{
        source: z.ZodEffects<z.ZodString, string, string>;
        epic: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        at: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        at: string;
        source: string;
        epic: string | null;
    }, {
        at: string;
        source: string;
        epic?: string | null | undefined;
    }>, "many">>;
    parts: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        heading: z.ZodDefault<z.ZodString>;
        refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        picked: z.ZodDefault<z.ZodBoolean>;
        files: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        heading: string;
        refs: string[];
        picked: boolean;
        files?: string[] | undefined;
    }, {
        id: string;
        files?: string[] | undefined;
        heading?: string | undefined;
        refs?: string[] | undefined;
        picked?: boolean | undefined;
    }>, "many">>;
} & {
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.context">, z.ZodLiteral<string>]>, "kehikot.context", string>;
    protocol: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    containers: {
        module: string;
        selected: boolean;
        showing: {
            refs: string[];
            documents: {
                path: string;
                from: number | null;
                to: number | null;
                page: number | null;
                quoted: string;
                section: {
                    from: number | null;
                    to: number | null;
                    title: string;
                } | null;
            }[];
        };
    }[];
    type: "kehikot.context";
    epic: string | null;
    tracker: {
        at: string | null;
        refreshing: boolean;
    };
    project: string | null;
    projectPath: string | null;
    theme: "light" | "dark";
    selection: string[];
    passage: {
        path: string;
        from: number | null;
        to: number | null;
        page: number | null;
        quoted: string;
        section: {
            from: number | null;
            to: number | null;
            title: string;
        } | null;
    } | null;
    pinned: boolean;
    prompt: string | null;
    kehikko: {
        id: number;
        name: string;
    } | null;
    filters: Record<string, string | string[]>;
    dispositions: {
        at: string | null;
        value: "done" | "wont-do" | "duplicate" | "superseded";
        ref: string;
        target: string | null;
        note: string;
        by: string | null;
    }[];
    content: {
        at: string;
        source: string;
        epic: string | null;
    }[];
    parts: {
        id: string;
        heading: string;
        refs: string[];
        picked: boolean;
        files?: string[] | undefined;
    }[];
    protocol: number;
}, {
    type: string;
    protocol: number;
    containers?: {
        module: string;
        selected?: boolean | undefined;
        showing?: {
            refs?: string[] | undefined;
            documents?: {
                path: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
                page?: number | null | undefined;
                quoted?: string | undefined;
                section?: {
                    title: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                } | null | undefined;
            }[] | undefined;
        } | undefined;
    }[] | undefined;
    epic?: string | null | undefined;
    tracker?: {
        at?: string | null | undefined;
        refreshing?: boolean | undefined;
    } | undefined;
    project?: string | null | undefined;
    projectPath?: string | null | undefined;
    theme?: "light" | "dark" | undefined;
    selection?: string[] | undefined;
    passage?: {
        path: string;
        from?: number | null | undefined;
        to?: number | null | undefined;
        page?: number | null | undefined;
        quoted?: string | undefined;
        section?: {
            title: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
        } | null | undefined;
    } | null | undefined;
    pinned?: boolean | undefined;
    prompt?: string | null | undefined;
    kehikko?: {
        id: number;
        name: string;
    } | null | undefined;
    filters?: Record<string, string | string[]> | undefined;
    dispositions?: {
        value: "done" | "wont-do" | "duplicate" | "superseded";
        ref: string;
        at?: string | null | undefined;
        target?: string | null | undefined;
        note?: string | undefined;
        by?: string | null | undefined;
    }[] | undefined;
    content?: {
        at: string;
        source: string;
        epic?: string | null | undefined;
    }[] | undefined;
    parts?: {
        id: string;
        files?: string[] | undefined;
        heading?: string | undefined;
        refs?: string[] | undefined;
        picked?: boolean | undefined;
    }[] | undefined;
}>, z.ZodDiscriminatedUnion<"ok", [z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.response">, z.ZodLiteral<string>]>, "kehikot.response", string>;
    id: z.ZodString;
    ok: z.ZodLiteral<true>;
    /**
     * Whatever the method answers with, and deliberately untyped. See the note
     * at the top of `methods.ts`: a client that asserted a shape here would be
     * asserting something no host promised.
     */
    data: z.ZodUnknown;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.response";
    id: string;
    ok: true;
    data?: unknown;
}, {
    type: string;
    id: string;
    ok: true;
    data?: unknown;
}>, z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.response">, z.ZodLiteral<string>]>, "kehikot.response", string>;
    id: z.ZodString;
    ok: z.ZodLiteral<false>;
    reason: z.ZodEnum<["unknown-module", "unknown-method", "failed"]>;
    /**
     * Bounded, because a refusal is the one place a host quotes a module's own
     * text back at it — the method name it asked for, the extension it named —
     * and a sentence that carried two hundred thousand characters of that back
     * across the frame would be a module's document, round-tripped, at the
     * module's own request. Long enough for every sentence anybody actually
     * writes; short enough that no answer is ever a document.
     */
    error: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.response";
    id: string;
    error: string;
    reason: "failed" | "unknown-module" | "unknown-method";
    ok: false;
}, {
    type: string;
    id: string;
    reason: "failed" | "unknown-module" | "unknown-method";
    ok: false;
    error?: string | undefined;
}>]>, z.ZodEffects<z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.goto">, z.ZodLiteral<string>]>, "kehikot.goto", string>;
    id: z.ZodString;
    ref: z.ZodOptional<z.ZodString>;
    step: z.ZodOptional<z.ZodNumber>;
    epic: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.goto";
    id: string;
    epic?: string | undefined;
    ref?: string | undefined;
    step?: number | undefined;
}, {
    type: string;
    id: string;
    epic?: string | undefined;
    ref?: string | undefined;
    step?: number | undefined;
}>, {
    type: "kehikot.goto";
    id: string;
    epic?: string | undefined;
    ref?: string | undefined;
    step?: number | undefined;
}, {
    type: string;
    id: string;
    epic?: string | undefined;
    ref?: string | undefined;
    step?: number | undefined;
}>, z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.event">, z.ZodLiteral<string>]>, "kehikot.event", string>;
    protocol: z.ZodNumber;
    /** The format, e.g. `kehikot.notifications@1`. Known to the host, or unsent. */
    extension: z.ZodEffects<z.ZodString, string, string>;
    /** Whatever that format says. Validated by the host before it left. */
    payload: z.ZodUnknown;
    /** The module that emitted it, named by the host from its own registry. */
    from: z.ZodEffects<z.ZodString, string, string>;
    /**
     * When the host accepted it, ISO 8601. A receiver ordering by arrival would
     * be ordering by its own scheduler instead.
     */
    at: z.ZodString;
    /**
     * The kehikko it happened on, so a receiver can tell near from far.
     *
     * A module is loaded once and shown on whichever canvas asks for it, so "this
     * kehikko" is a question it cannot answer alone. `context.kehikko` says where
     * the receiver is standing and this says where the event came from; comparing
     * the two is the whole of a near/far filter, and it is a comparison rather
     * than a rule so a module can present it however it likes.
     */
    kehikko: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: number;
        name: string;
    }, {
        id: number;
        name: string;
    }>>>;
}, "strip", z.ZodTypeAny, {
    at: string;
    from: string;
    type: "kehikot.event";
    extension: string;
    kehikko: {
        id: number;
        name: string;
    } | null;
    protocol: number;
    payload?: unknown;
}, {
    at: string;
    from: string;
    type: string;
    extension: string;
    protocol: number;
    kehikko?: {
        id: number;
        name: string;
    } | null | undefined;
    payload?: unknown;
}>, z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.clear">, z.ZodLiteral<string>]>, "kehikot.clear", string>;
    protocol: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.clear";
    protocol: number;
}, {
    type: string;
    protocol: number;
}>, z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.refresh">, z.ZodLiteral<string>]>, "kehikot.refresh", string>;
    protocol: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.refresh";
    protocol: number;
}, {
    type: string;
    protocol: number;
}>]>;
export type HostMessage = z.infer<typeof hostMessageSchema>;
export declare const moduleMessageSchema: z.ZodUnion<[z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.ready">, z.ZodLiteral<string>]>, "kehikot.ready", string>;
    id: z.ZodEffects<z.ZodString, string, string>;
    protocol: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.ready";
    id: string;
    protocol: number;
}, {
    type: string;
    id: string;
    protocol?: number | undefined;
}>, z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.request">, z.ZodLiteral<string>]>, "kehikot.request", string>;
    id: z.ZodString;
    /**
     * Bounded but not held to the list of known methods, which would be this
     * schema deciding what a host answers. A host with a method this package has
     * never heard of is a host doing its job; a host without one this package
     * knows is entitled to refuse it, with `unknown-method`.
     */
    method: z.ZodString;
    params: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.request";
    id: string;
    method: string;
    params: Record<string, unknown>;
}, {
    type: string;
    id: string;
    method: string;
    params?: Record<string, unknown> | undefined;
}>, z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.resize">, z.ZodLiteral<string>]>, "kehikot.resize", string>;
    height: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.resize";
    height: number;
}, {
    type: string;
    height: number;
}>, z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.went">, z.ZodLiteral<string>]>, "kehikot.went", string>;
    id: z.ZodString;
    found: z.ZodBoolean;
    why: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.went";
    id: string;
    why: string;
    found: boolean;
}, {
    type: string;
    id: string;
    found: boolean;
    why?: string | undefined;
}>, z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.filters">, z.ZodLiteral<string>]>, "kehikot.filters", string>;
    groups: z.ZodEffects<z.ZodArray<z.ZodEffects<z.ZodEffects<z.ZodObject<{
        id: z.ZodEffects<z.ZodString, string, string>;
        label: z.ZodString;
        kind: z.ZodOptional<z.ZodEnum<["choice", "text", "toggles"]>>;
        options: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodEffects<z.ZodString, string, string>;
            label: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            label: string;
            id: string;
        }, {
            label: string;
            id: string;
        }>, "many">>;
        fallback: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        id: string;
        options: {
            label: string;
            id: string;
        }[];
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }, {
        label: string;
        id: string;
        options?: {
            label: string;
            id: string;
        }[] | undefined;
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }>, {
        label: string;
        id: string;
        options: {
            label: string;
            id: string;
        }[];
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }, {
        label: string;
        id: string;
        options?: {
            label: string;
            id: string;
        }[] | undefined;
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }>, {
        label: string;
        id: string;
        options: {
            label: string;
            id: string;
        }[];
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }, {
        label: string;
        id: string;
        options?: {
            label: string;
            id: string;
        }[] | undefined;
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }>, "many">, {
        label: string;
        id: string;
        options: {
            label: string;
            id: string;
        }[];
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }[], {
        label: string;
        id: string;
        options?: {
            label: string;
            id: string;
        }[] | undefined;
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }[]>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.filters";
    groups: {
        label: string;
        id: string;
        options: {
            label: string;
            id: string;
        }[];
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }[];
}, {
    type: string;
    groups: {
        label: string;
        id: string;
        options?: {
            label: string;
            id: string;
        }[] | undefined;
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }[];
}>, z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.clearable">, z.ZodLiteral<string>]>, "kehikot.clearable", string>;
    /** The words on the control, or `null` to take the control away. */
    label: z.ZodDefault<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    label: string | null;
    type: "kehikot.clearable";
}, {
    type: string;
    label?: string | null | undefined;
}>, z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.refreshable">, z.ZodLiteral<string>]>, "kehikot.refreshable", string>;
    /** Whether there is anything to read again right now. `false` withdraws the control. */
    can: z.ZodDefault<z.ZodBoolean>;
    /** When this module's material was last read, as the MODULE knows it. */
    at: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    /** Whether a read is in flight this second. */
    busy: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    at: string | null;
    type: "kehikot.refreshable";
    can: boolean;
    busy: boolean;
}, {
    type: string;
    at?: string | null | undefined;
    can?: boolean | undefined;
    busy?: boolean | undefined;
}>]>;
export type ModuleMessage = z.infer<typeof moduleMessageSchema>;
export type WireMessage = HostMessage | ModuleMessage;
export type Hello = z.infer<typeof helloSchema>;
export type ContextMessage = z.infer<typeof contextMessageSchema>;
export type Response = z.infer<typeof responseSchema>;
export type Goto = z.infer<typeof gotoSchema>;
export type ModuleEvent = z.infer<typeof eventSchema>;
export type Ready = z.infer<typeof readySchema>;
export type Request = z.infer<typeof requestSchema>;
export type Resize = z.infer<typeof resizeSchema>;
export type Went = z.infer<typeof wentSchema>;
/**
 * Is this worth parsing at all?
 *
 * The cheap first filter, before a schema is run over a `MessageEvent` from a
 * window that receives messages from everything. It says nothing about whether
 * the message is valid or whether the sender is anybody — it says the value is
 * an object with a `type` that starts `kehikot.` — or `roadmap.`, the same
 * protocol before the rename, which is still read (see `dialect.ts`) — and that
 * is what separates a message meant for this protocol from the several that
 * are not.
 */
export declare function looksLikeWireMessage(value: unknown): value is {
    type: string;
};
//# sourceMappingURL=messages.d.ts.map