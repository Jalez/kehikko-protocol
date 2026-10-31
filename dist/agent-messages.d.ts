import { z } from 'zod';
/** A thread's name: a short word a sender picks (`auth-refactor`), so replies can be read together. */
export declare const MESSAGE_THREAD: RegExp;
/**
 * One agent session, as the module that runs it names it: the module's id and the session's id there
 * (the `agent-session` subject's id, `SHOW_SUBJECTS`: Claude Code's session id for Claude's). The
 * address a message is sent to, and the `from` a host stamps on one.
 */
export declare const agentSessionRefSchema: z.ZodObject<{
    module: z.ZodString;
    session: z.ZodString;
}, "strip", z.ZodTypeAny, {
    module: string;
    session: string;
}, {
    module: string;
    session: string;
}>;
export type AgentSessionRef = z.infer<typeof agentSessionRefSchema>;
/** A place a message is sent to: every agent session whose place is in that epic, on that kehikko, or both. */
export declare const messagePlaceSchema: z.ZodEffects<z.ZodObject<{
    epic: z.ZodOptional<z.ZodString>;
    kehikko: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    epic?: string | undefined;
    kehikko?: string | undefined;
}, {
    epic?: string | undefined;
    kehikko?: string | undefined;
}>, {
    epic?: string | undefined;
    kehikko?: string | undefined;
}, {
    epic?: string | undefined;
    kehikko?: string | undefined;
}>;
export type MessagePlace = z.infer<typeof messagePlaceSchema>;
/**
 * Who a message is for: exactly one of the whole `project` (every agent session in it), a `place`
 * (every session there), a `module` (every session that module runs in the project), or one
 * `session`. Absent on `messages.send` means the project. Generic words only: a module is named by
 * its id, never by what agent it runs.
 */
export declare const messageToSchema: z.ZodEffects<z.ZodObject<{
    project: z.ZodOptional<z.ZodLiteral<true>>;
    place: z.ZodOptional<z.ZodEffects<z.ZodObject<{
        epic: z.ZodOptional<z.ZodString>;
        kehikko: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        epic?: string | undefined;
        kehikko?: string | undefined;
    }, {
        epic?: string | undefined;
        kehikko?: string | undefined;
    }>, {
        epic?: string | undefined;
        kehikko?: string | undefined;
    }, {
        epic?: string | undefined;
        kehikko?: string | undefined;
    }>>;
    module: z.ZodOptional<z.ZodString>;
    session: z.ZodOptional<z.ZodObject<{
        module: z.ZodString;
        session: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        module: string;
        session: string;
    }, {
        module: string;
        session: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    place?: {
        epic?: string | undefined;
        kehikko?: string | undefined;
    } | undefined;
    project?: true | undefined;
    module?: string | undefined;
    session?: {
        module: string;
        session: string;
    } | undefined;
}, {
    place?: {
        epic?: string | undefined;
        kehikko?: string | undefined;
    } | undefined;
    project?: true | undefined;
    module?: string | undefined;
    session?: {
        module: string;
        session: string;
    } | undefined;
}>, {
    place?: {
        epic?: string | undefined;
        kehikko?: string | undefined;
    } | undefined;
    project?: true | undefined;
    module?: string | undefined;
    session?: {
        module: string;
        session: string;
    } | undefined;
}, {
    place?: {
        epic?: string | undefined;
        kehikko?: string | undefined;
    } | undefined;
    project?: true | undefined;
    module?: string | undefined;
    session?: {
        module: string;
        session: string;
    } | undefined;
}>;
export type MessageTo = z.infer<typeof messageToSchema>;
/** Where a sender was when it sent: its place as the host read it from the sender's record. */
export declare const messageFromPlaceSchema: z.ZodObject<{
    epic: z.ZodNullable<z.ZodString>;
    parts: z.ZodCatch<z.ZodArray<z.ZodString, "many">>;
    kehikko: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    epic: string | null;
    parts: string[];
    kehikko: string | null;
}, {
    epic: string | null;
    kehikko: string | null;
    parts?: unknown;
}>;
/**
 * One message, as a host hands it out (`messages.read`, and `messages` in its answer to
 * `POST /host/place`). `from` is the HOST's fact: the module that asked (proved by its pass), its
 * registered `name`, the session its token names, and that session's place. `id` grows: a later
 * message has a larger one. `at` is ISO 8601.
 */
export declare const agentMessageSchema: z.ZodObject<{
    id: z.ZodNumber;
    at: z.ZodString;
    from: z.ZodObject<{
        module: z.ZodString;
        name: z.ZodCatch<z.ZodString>;
        session: z.ZodNullable<z.ZodString>;
        place: z.ZodObject<{
            epic: z.ZodNullable<z.ZodString>;
            parts: z.ZodCatch<z.ZodArray<z.ZodString, "many">>;
            kehikko: z.ZodNullable<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            epic: string | null;
            parts: string[];
            kehikko: string | null;
        }, {
            epic: string | null;
            kehikko: string | null;
            parts?: unknown;
        }>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        place: {
            epic: string | null;
            parts: string[];
            kehikko: string | null;
        };
        module: string;
        session: string | null;
    }, {
        place: {
            epic: string | null;
            kehikko: string | null;
            parts?: unknown;
        };
        module: string;
        session: string | null;
        name?: unknown;
    }>;
    to: z.ZodEffects<z.ZodObject<{
        project: z.ZodOptional<z.ZodLiteral<true>>;
        place: z.ZodOptional<z.ZodEffects<z.ZodObject<{
            epic: z.ZodOptional<z.ZodString>;
            kehikko: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            epic?: string | undefined;
            kehikko?: string | undefined;
        }, {
            epic?: string | undefined;
            kehikko?: string | undefined;
        }>, {
            epic?: string | undefined;
            kehikko?: string | undefined;
        }, {
            epic?: string | undefined;
            kehikko?: string | undefined;
        }>>;
        module: z.ZodOptional<z.ZodString>;
        session: z.ZodOptional<z.ZodObject<{
            module: z.ZodString;
            session: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            module: string;
            session: string;
        }, {
            module: string;
            session: string;
        }>>;
    }, "strip", z.ZodTypeAny, {
        place?: {
            epic?: string | undefined;
            kehikko?: string | undefined;
        } | undefined;
        project?: true | undefined;
        module?: string | undefined;
        session?: {
            module: string;
            session: string;
        } | undefined;
    }, {
        place?: {
            epic?: string | undefined;
            kehikko?: string | undefined;
        } | undefined;
        project?: true | undefined;
        module?: string | undefined;
        session?: {
            module: string;
            session: string;
        } | undefined;
    }>, {
        place?: {
            epic?: string | undefined;
            kehikko?: string | undefined;
        } | undefined;
        project?: true | undefined;
        module?: string | undefined;
        session?: {
            module: string;
            session: string;
        } | undefined;
    }, {
        place?: {
            epic?: string | undefined;
            kehikko?: string | undefined;
        } | undefined;
        project?: true | undefined;
        module?: string | undefined;
        session?: {
            module: string;
            session: string;
        } | undefined;
    }>;
    thread: z.ZodCatch<z.ZodNullable<z.ZodString>>;
    body: z.ZodString;
}, "strip", z.ZodTypeAny, {
    at: string;
    id: number;
    from: {
        name: string;
        place: {
            epic: string | null;
            parts: string[];
            kehikko: string | null;
        };
        module: string;
        session: string | null;
    };
    to: {
        place?: {
            epic?: string | undefined;
            kehikko?: string | undefined;
        } | undefined;
        project?: true | undefined;
        module?: string | undefined;
        session?: {
            module: string;
            session: string;
        } | undefined;
    };
    thread: string | null;
    body: string;
}, {
    at: string;
    id: number;
    from: {
        place: {
            epic: string | null;
            kehikko: string | null;
            parts?: unknown;
        };
        module: string;
        session: string | null;
        name?: unknown;
    };
    to: {
        place?: {
            epic?: string | undefined;
            kehikko?: string | undefined;
        } | undefined;
        project?: true | undefined;
        module?: string | undefined;
        session?: {
            module: string;
            session: string;
        } | undefined;
    };
    body: string;
    thread?: unknown;
}>;
export type AgentMessage = z.infer<typeof agentMessageSchema>;
/**
 * `messages.send`'s params. `token` names the sending session; `body` is text, at most
 * `LIMITS.MESSAGE_BODY` characters, REFUSED rather than clipped; `to` absent is the project.
 */
export declare const messageSendParams: z.ZodObject<{
    token: z.ZodString;
    body: z.ZodString;
    to: z.ZodOptional<z.ZodEffects<z.ZodObject<{
        project: z.ZodOptional<z.ZodLiteral<true>>;
        place: z.ZodOptional<z.ZodEffects<z.ZodObject<{
            epic: z.ZodOptional<z.ZodString>;
            kehikko: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            epic?: string | undefined;
            kehikko?: string | undefined;
        }, {
            epic?: string | undefined;
            kehikko?: string | undefined;
        }>, {
            epic?: string | undefined;
            kehikko?: string | undefined;
        }, {
            epic?: string | undefined;
            kehikko?: string | undefined;
        }>>;
        module: z.ZodOptional<z.ZodString>;
        session: z.ZodOptional<z.ZodObject<{
            module: z.ZodString;
            session: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            module: string;
            session: string;
        }, {
            module: string;
            session: string;
        }>>;
    }, "strip", z.ZodTypeAny, {
        place?: {
            epic?: string | undefined;
            kehikko?: string | undefined;
        } | undefined;
        project?: true | undefined;
        module?: string | undefined;
        session?: {
            module: string;
            session: string;
        } | undefined;
    }, {
        place?: {
            epic?: string | undefined;
            kehikko?: string | undefined;
        } | undefined;
        project?: true | undefined;
        module?: string | undefined;
        session?: {
            module: string;
            session: string;
        } | undefined;
    }>, {
        place?: {
            epic?: string | undefined;
            kehikko?: string | undefined;
        } | undefined;
        project?: true | undefined;
        module?: string | undefined;
        session?: {
            module: string;
            session: string;
        } | undefined;
    }, {
        place?: {
            epic?: string | undefined;
            kehikko?: string | undefined;
        } | undefined;
        project?: true | undefined;
        module?: string | undefined;
        session?: {
            module: string;
            session: string;
        } | undefined;
    }>>;
    thread: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    body: string;
    token: string;
    to?: {
        place?: {
            epic?: string | undefined;
            kehikko?: string | undefined;
        } | undefined;
        project?: true | undefined;
        module?: string | undefined;
        session?: {
            module: string;
            session: string;
        } | undefined;
    } | undefined;
    thread?: string | undefined;
}, {
    body: string;
    token: string;
    to?: {
        place?: {
            epic?: string | undefined;
            kehikko?: string | undefined;
        } | undefined;
        project?: true | undefined;
        module?: string | undefined;
        session?: {
            module: string;
            session: string;
        } | undefined;
    } | undefined;
    thread?: string | undefined;
}>;
/**
 * `messages.read`'s params. Only messages the session may read: those addressed to it, its place, its
 * module or the project, and its own. `unread: true` is the ones after the cursor the host keeps for
 * this session, oldest first, and moves the cursor past what it returns; otherwise the latest `limit`
 * (after `since`, a message id, when given), oldest first, and the cursor stays.
 */
export declare const messageReadParams: z.ZodObject<{
    token: z.ZodString;
    unread: z.ZodDefault<z.ZodBoolean>;
    since: z.ZodOptional<z.ZodNumber>;
    thread: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    token: string;
    unread: boolean;
    limit: number;
    since?: number | undefined;
    thread?: string | undefined;
}, {
    token: string;
    since?: number | undefined;
    thread?: string | undefined;
    unread?: boolean | undefined;
    limit?: number | undefined;
}>;
/**
 * What became of a `messages.send`; both are `ok: true`. `sent`: the host keeps it, under `id`.
 * `declined`: it will not (`why`: too many from this session just now, or no session behind the token).
 */
export declare const MESSAGE_SEND_OUTCOMES: readonly ["sent", "declined"];
export type MessageSendOutcome = (typeof MESSAGE_SEND_OUTCOMES)[number];
export declare const messageSendResult: z.ZodObject<{
    outcome: z.ZodEnum<["sent", "declined"]>;
    id: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    why: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: number | null;
    outcome: "sent" | "declined";
    why: string;
}, {
    outcome: "sent" | "declined";
    id?: number | null | undefined;
    why?: string | undefined;
}>;
export type MessageSendResult = z.infer<typeof messageSendResult>;
/**
 * `messages.read`'s answer: the messages, oldest first; how many are still unread for this session
 * after it (`unread`); and the session as others address it (`you`), to give them.
 */
export declare const messageReadResult: z.ZodObject<{
    messages: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        at: z.ZodString;
        from: z.ZodObject<{
            module: z.ZodString;
            name: z.ZodCatch<z.ZodString>;
            session: z.ZodNullable<z.ZodString>;
            place: z.ZodObject<{
                epic: z.ZodNullable<z.ZodString>;
                parts: z.ZodCatch<z.ZodArray<z.ZodString, "many">>;
                kehikko: z.ZodNullable<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                epic: string | null;
                parts: string[];
                kehikko: string | null;
            }, {
                epic: string | null;
                kehikko: string | null;
                parts?: unknown;
            }>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            place: {
                epic: string | null;
                parts: string[];
                kehikko: string | null;
            };
            module: string;
            session: string | null;
        }, {
            place: {
                epic: string | null;
                kehikko: string | null;
                parts?: unknown;
            };
            module: string;
            session: string | null;
            name?: unknown;
        }>;
        to: z.ZodEffects<z.ZodObject<{
            project: z.ZodOptional<z.ZodLiteral<true>>;
            place: z.ZodOptional<z.ZodEffects<z.ZodObject<{
                epic: z.ZodOptional<z.ZodString>;
                kehikko: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                epic?: string | undefined;
                kehikko?: string | undefined;
            }, {
                epic?: string | undefined;
                kehikko?: string | undefined;
            }>, {
                epic?: string | undefined;
                kehikko?: string | undefined;
            }, {
                epic?: string | undefined;
                kehikko?: string | undefined;
            }>>;
            module: z.ZodOptional<z.ZodString>;
            session: z.ZodOptional<z.ZodObject<{
                module: z.ZodString;
                session: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                module: string;
                session: string;
            }, {
                module: string;
                session: string;
            }>>;
        }, "strip", z.ZodTypeAny, {
            place?: {
                epic?: string | undefined;
                kehikko?: string | undefined;
            } | undefined;
            project?: true | undefined;
            module?: string | undefined;
            session?: {
                module: string;
                session: string;
            } | undefined;
        }, {
            place?: {
                epic?: string | undefined;
                kehikko?: string | undefined;
            } | undefined;
            project?: true | undefined;
            module?: string | undefined;
            session?: {
                module: string;
                session: string;
            } | undefined;
        }>, {
            place?: {
                epic?: string | undefined;
                kehikko?: string | undefined;
            } | undefined;
            project?: true | undefined;
            module?: string | undefined;
            session?: {
                module: string;
                session: string;
            } | undefined;
        }, {
            place?: {
                epic?: string | undefined;
                kehikko?: string | undefined;
            } | undefined;
            project?: true | undefined;
            module?: string | undefined;
            session?: {
                module: string;
                session: string;
            } | undefined;
        }>;
        thread: z.ZodCatch<z.ZodNullable<z.ZodString>>;
        body: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        at: string;
        id: number;
        from: {
            name: string;
            place: {
                epic: string | null;
                parts: string[];
                kehikko: string | null;
            };
            module: string;
            session: string | null;
        };
        to: {
            place?: {
                epic?: string | undefined;
                kehikko?: string | undefined;
            } | undefined;
            project?: true | undefined;
            module?: string | undefined;
            session?: {
                module: string;
                session: string;
            } | undefined;
        };
        thread: string | null;
        body: string;
    }, {
        at: string;
        id: number;
        from: {
            place: {
                epic: string | null;
                kehikko: string | null;
                parts?: unknown;
            };
            module: string;
            session: string | null;
            name?: unknown;
        };
        to: {
            place?: {
                epic?: string | undefined;
                kehikko?: string | undefined;
            } | undefined;
            project?: true | undefined;
            module?: string | undefined;
            session?: {
                module: string;
                session: string;
            } | undefined;
        };
        body: string;
        thread?: unknown;
    }>, "many">;
    unread: z.ZodDefault<z.ZodNumber>;
    you: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        module: z.ZodString;
        session: z.ZodNullable<z.ZodString>;
        place: z.ZodObject<{
            epic: z.ZodNullable<z.ZodString>;
            parts: z.ZodCatch<z.ZodArray<z.ZodString, "many">>;
            kehikko: z.ZodNullable<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            epic: string | null;
            parts: string[];
            kehikko: string | null;
        }, {
            epic: string | null;
            kehikko: string | null;
            parts?: unknown;
        }>;
    }, "strip", z.ZodTypeAny, {
        place: {
            epic: string | null;
            parts: string[];
            kehikko: string | null;
        };
        module: string;
        session: string | null;
    }, {
        place: {
            epic: string | null;
            kehikko: string | null;
            parts?: unknown;
        };
        module: string;
        session: string | null;
    }>>>;
}, "strip", z.ZodTypeAny, {
    unread: number;
    messages: {
        at: string;
        id: number;
        from: {
            name: string;
            place: {
                epic: string | null;
                parts: string[];
                kehikko: string | null;
            };
            module: string;
            session: string | null;
        };
        to: {
            place?: {
                epic?: string | undefined;
                kehikko?: string | undefined;
            } | undefined;
            project?: true | undefined;
            module?: string | undefined;
            session?: {
                module: string;
                session: string;
            } | undefined;
        };
        thread: string | null;
        body: string;
    }[];
    you: {
        place: {
            epic: string | null;
            parts: string[];
            kehikko: string | null;
        };
        module: string;
        session: string | null;
    } | null;
}, {
    messages: {
        at: string;
        id: number;
        from: {
            place: {
                epic: string | null;
                kehikko: string | null;
                parts?: unknown;
            };
            module: string;
            session: string | null;
            name?: unknown;
        };
        to: {
            place?: {
                epic?: string | undefined;
                kehikko?: string | undefined;
            } | undefined;
            project?: true | undefined;
            module?: string | undefined;
            session?: {
                module: string;
                session: string;
            } | undefined;
        };
        body: string;
        thread?: unknown;
    }[];
    unread?: number | undefined;
    you?: {
        place: {
            epic: string | null;
            kehikko: string | null;
            parts?: unknown;
        };
        module: string;
        session: string | null;
    } | null | undefined;
}>;
export type MessageReadResult = z.infer<typeof messageReadResult>;
/** A message's body as it is said: one line, in quotes, so nothing in it can start another line or close the quote. */
export declare const quotedBody: (body: string) => string;
/** Who a message is for, in words, as the reader of the notes is told it. */
export declare function messageToWords(to: MessageTo, you?: AgentSessionRef | null): string;
/** One message as one line: `- #12, 2026-10-31T14:02Z, from Codex (session …, epic methods) to every session at the epic methods, thread "auth": "…"`. */
export declare function messageLine(message: AgentMessage, you?: AgentSessionRef | null): string;
/** The head over messages in a session's notes and in `read_messages`: what they are, and what they are not. */
export declare const MESSAGES_HEAD: string;
/** How many messages a session's notes say at once; the rest wait for the next prompt. */
export declare const NOTES_MESSAGES_MOST = 8;
/**
 * The messages section of a session's notes: the head and one line per message, and how many more
 * wait. `''` when there are none.
 */
export declare function messagesNotes(messages: readonly AgentMessage[] | null | undefined, more?: number): string;
/** The line at a session's start that it can message and be messaged, on the door of the module that runs it, and its own address. */
export declare function messagingLine(self: {
    name: string;
    door: string;
    module: string;
}, session: string | null): string;
/** The tools' names, the same on every agent module's door. */
export declare const MESSAGE_TOOL_NAMES: readonly ["send_message", "read_messages"];
export type MessageToolName = (typeof MESSAGE_TOOL_NAMES)[number];
/** Whether a tool call is one of the message tools. */
export declare const isMessageTool: (name: unknown) => name is MessageToolName;
/** An MCP tool definition, as `tools/list` lists one. */
export interface MessageToolDefinition {
    name: MessageToolName;
    description: string;
    inputSchema: Record<string, unknown>;
    annotations: {
        title: string;
        readOnlyHint: boolean;
        destructiveHint: boolean;
        idempotentHint: boolean;
        openWorldHint: boolean;
    };
}
/** `send_message` and `read_messages`, as every agent module lists them. Their calls go to the host (`answerMessageTool` in `/serve`). */
export declare function messageTools(): MessageToolDefinition[];
/** What `read_messages` says: the head, one line per message, and the session's own address. */
export declare function readMessagesText(read: MessageReadResult): string;
/** What `send_message` says. */
export declare function sentText(result: MessageSendResult): string;
