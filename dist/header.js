import { z } from 'zod';
import { LIMITS } from './limits.js';
/**
 * The header a module declares: its view switches, toggles, jumps and runs, drawn by the host in
 * the container's named menus instead of by the module in a toolbar of its own. The module owns
 * every bit of state here; the host draws it and reports a press.
 * Design notes: docs/header.md.
 */
/* A press and a choice travel by id, and a host may key a record by one. See `RESERVED_IDS` in `filters.ts`. */
const RESERVED_IDS = new Set(['__proto__', 'constructor', 'prototype']);
/** The id of a header item, or of one option of a switch or a go item. */
export const headerIdSchema = z
    .string()
    .min(1)
    .max(LIMITS.HEADER_ID)
    .refine((id) => !RESERVED_IDS.has(id), { message: '__proto__, constructor and prototype are not usable as header ids' });
const headerId = headerIdSchema;
/** The words on an item or an option. Shared with the footer (2.38.0). */
export const headerLabelSchema = z.string().min(1).max(LIMITS.HEADER_LABEL);
const headerLabel = headerLabelSchema;
/** One thing a switch can be on, or a go item can jump to: an id and the words for it. */
export const headerOptionSchema = z.object({ id: headerId, label: headerLabel });
const options = z.array(headerOptionSchema).min(1).max(LIMITS.HEADER_OPTIONS);
/** What every kind of item has. */
const common = {
    id: headerId,
    label: headerLabel,
    /** An icon by name (`file-text`). A host draws the ones it has; an unknown name draws none. */
    icon: z.string().min(1).max(LIMITS.HEADER_ICON).optional(),
    /** A hint shown beside the label (`⌘B`). The host binds no key from it: the module's page does. */
    shortcut: z.string().min(1).max(LIMITS.HEADER_SHORTCUT).optional(),
    /** A heading inside the item's menu. Items naming the same group are drawn together under it. */
    group: z.string().min(1).max(LIMITS.HEADER_GROUP).optional(),
    /**
     * Whether an agent may press this through the host. False unless said: a module opts each item
     * in. Refused together with `tool`, and on a run that has `confirm`.
     */
    agents: z.boolean().default(false),
    /**
     * The tool at this module's own MCP door that does what this item does. An agent is sent there
     * instead of pressing: the host refuses the press and names the tool, so there is one way for a
     * program to do each thing. Refused together with `agents`.
     */
    tool: z.string().min(1).max(LIMITS.TOOL).optional(),
};
/** The four kinds of item. The kind decides which menu an item is drawn in; see `HEADER_MENUS`. */
export const HEADER_KINDS = ['switch', 'toggle', 'go', 'run'];
/**
 * Where a host puts a module when a run is pressed (1.4.0). `fullscreen`: the host makes this
 * module's frame fill the screen from its own click handler, then sends the press. See docs/header.md.
 */
export const RUN_SURFACES = ['fullscreen'];
/**
 * The icon names a module may count on a host drawing (1.6.0). A CLOSED vocabulary as a contract (a
 * host maps each to its icon set), not a refusal: `icon` stays any short string, a host may know
 * more, and a name it does not know draws the label's first letters. See docs/header.md.
 */
export const HEADER_ICONS = [
    'check',
    'x',
    'chevron-left',
    'chevron-right',
    'pencil',
    'play',
    'stop',
    'refresh',
    'undo',
    'external',
];
/**
 * 2.40.0. What a host can carry out ITSELF, inside the person's click on a run, because a press
 * relayed to the module's page carries no user activation: `copy` (write the clipboard) and `open`
 * (open a web page in the person's browser). The press is still sent to the module afterwards, with
 * `carried` naming what the host did. See docs/header.md, "Acts the host carries out".
 */
export const RUN_CARRIES = ['copy', 'open'];
/** 2.40.0. A clipboard write: `plain` always, `html` beside it when the module has a richer form. Both are text to the host: written, never drawn. */
export const runCopySchema = z.object({
    plain: z.string().min(1).max(LIMITS.RUN_COPY_PLAIN),
    html: z.string().min(1).max(LIMITS.RUN_COPY_HTML).optional(),
});
/** 2.40.0. Why an address is not one a host opens for a run, or null: `https:` only, a host name, no user name or password. */
export function runOpenRefusal(value) {
    if (typeof value !== 'string' || value.length === 0)
        return 'An address to open is a string.';
    if (value.length > LIMITS.URL)
        return `An address to open is at most ${LIMITS.URL} characters.`;
    let url;
    try {
        url = new URL(value);
    }
    catch {
        return 'That is not an address a browser could open.';
    }
    if (url.protocol !== 'https:')
        return 'A run opens only https: addresses.';
    if (url.username !== '' || url.password !== '')
        return 'An address to open carries no user name or password.';
    if (url.hostname === '')
        return 'An address to open names a host.';
    return null;
}
/** 2.40.0. A web page a host opens in the person's browser for a run. */
export const runOpenSchema = z.string().superRefine((value, ctx) => {
    const why = runOpenRefusal(value);
    if (why !== null)
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: why });
});
/** A run is resting, in flight, or its last attempt failed. A host shows the last two on the menu's trigger. */
export const RUN_STATES = ['idle', 'busy', 'failed'];
/* The four kinds as plain objects, so the footer (2.38.0, `footer.ts`) can take the same fields. */
const switchItem = z.object({
    kind: z.literal('switch'),
    ...common,
    options,
    /** Which option the module is on now. One of `options`. */
    value: headerId,
});
const toggleItem = z.object({
    kind: z.literal('toggle'),
    ...common,
    checked: z.boolean(),
});
const goItem = z.object({
    kind: z.literal('go'),
    ...common,
    options,
});
const runItem = z.object({
    kind: z.literal('run'),
    ...common,
    state: z.enum(RUN_STATES).default('idle'),
    /** What the last run came to, in a word or three, or null. Shown beside the label. */
    result: z.string().min(1).max(LIMITS.HEADER_RESULT).nullable().default(null),
    /** Why it cannot be run right now, as a sentence, or null when it can. A host draws it flat and says why. */
    disabled: z.string().min(1).max(LIMITS.REASON).nullable().default(null),
    /** Whether a press arms it and a second press runs it. The arm is the host's; the module adds none. */
    confirm: z.boolean().default(false),
    /**
     * 1.4.0. Where the press lands. A relayed press carries no user activation, so a module cannot
     * ask for full screen from `onPress`; the host can, from the person's click. Absent: the press
     * is only relayed. A host that does not know the field strips it and relays the press.
     */
    surface: z.enum(RUN_SURFACES).optional(),
    /**
     * 1.6.0. Draw this run as an icon button in the container header, left of the menus, as well
     * as in the Run menu. Only drawing changes: an agent presses by id as before. At most
     * `LIMITS.PINNED_MAX` are drawn (declaration order, see `pinnedRuns`). A host that does not
     * know the field strips it and keeps the item in the menu.
     */
    pinned: z.boolean().optional(),
    /**
     * 2.40.0. Text the HOST writes to the clipboard from the person's click, before it sends the
     * press. A host before 2.40.0 strips it and only relays the press: look at `hello.carries`.
     */
    copy: runCopySchema.optional(),
    /** 2.40.0. A page the HOST opens in the person's browser from their click, before it sends the press. https only. */
    open: runOpenSchema.optional(),
});
/** The four kinds' shapes, before the rules that span fields. Shared with the footer (2.38.0). */
export const HEADER_ITEM_SHAPES = { switch: switchItem, toggle: toggleItem, go: goItem, run: runItem };
/**
 * The rules that span an item's fields, for a header item and for a footer item of the same kinds
 * (2.38.0): option ids unique, a switch's value one of its options, `agents` not beside `tool`, and
 * not on a run that is confirmed.
 */
export function checkPressable(item, ctx) {
    if ((item.kind === 'switch' || item.kind === 'go') && item.options) {
        if (new Set(item.options.map((option) => option.id)).size !== item.options.length) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'two options of one item cannot share an id' });
        }
    }
    if (item.kind === 'switch' && item.options && !item.options.some((option) => option.id === item.value)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "a switch's value has to be one of its own options" });
    }
    if (item.agents && item.tool !== undefined) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'an item is pressed by agents or names the tool that does the same thing, not both',
        });
    }
    if (item.kind === 'run' && item.agents && item.confirm) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'a run that has to be confirmed is not pressed by agents' });
    }
    if (item.kind === 'run' && item.copy !== undefined && item.open !== undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'a run asks the host to copy or to open, not both' });
    }
    if (item.kind === 'run' && (item.copy !== undefined || item.open !== undefined) && item.agents) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'a run the host copies or opens for is done in a person’s click, so agents do not press it' });
    }
    if (item.kind === 'run' && (item.copy !== undefined || item.open !== undefined) && item.surface !== undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'a run that copies or opens does not also ask for full screen' });
    }
}
/**
 * One item of a module's header. `switch`: one of several views, with the one it is on. `toggle`:
 * on or off. `go`: a jump to one of several places, with nothing held afterwards. `run`: an act,
 * with whether it is in flight and what it last came to.
 */
export const headerItemSchema = z
    .discriminatedUnion('kind', [switchItem, toggleItem, goItem, runItem])
    .superRefine(checkPressable);
/** A module's whole header: every item, in the order the module wants them within each menu. Ids are unique. */
export const headerItemsSchema = z
    .array(headerItemSchema)
    .max(LIMITS.HEADER_ITEMS)
    .refine((items) => new Set(items.map((item) => item.id)).size === items.length, {
    message: 'two header items cannot share an id',
});
/**
 * The runs a host draws as header buttons (1.6.0): those with `pinned: true`, in declaration order,
 * the first `LIMITS.PINNED_MAX` of them. The others stay in the Run menu only.
 */
export function pinnedRuns(items) {
    return items.filter((item) => item.kind === 'run' && item.pinned === true).slice(0, LIMITS.PINNED_MAX);
}
/**
 * Which menu each kind is drawn in. Fixed, so a module cannot scatter its items: switches and
 * toggles are View, jumps are Go, runs are Run. `frame` is the host's own menu and holds no item.
 */
export const HEADER_MENUS = { switch: 'view', toggle: 'view', go: 'go', run: 'run' };
/** The module menus, in the order a host draws them. */
export const HEADER_MENU_NAMES = ['view', 'go', 'run'];
/** What a press carries beside the item: the option chosen (switch, go), the state wanted (toggle), or nothing (run). */
export const pressValueSchema = z.union([headerId, z.boolean()]);
/**
 * Why a press cannot be taken, as a sentence that names what exists, or `null` when it can. Pure,
 * and the same rule on both sides: a host asks it before sending (for an agent's press above all),
 * and `connect` asks it again on arrival, because the header may have been declared anew in between.
 */
export function pressRefusal(items, press) {
    const item = items.find((one) => one.id === press.item);
    if (!item) {
        const names = items.map((one) => one.id);
        return `There is no "${press.item}" here now. ${names.length ? `What can be pressed: ${names.join(', ')}.` : 'Nothing here can be pressed.'}`;
    }
    if (item.kind === 'toggle') {
        return typeof press.value === 'boolean' ? null : `"${item.id}" is a toggle: say true to turn it on or false to turn it off.`;
    }
    if (item.kind === 'run') {
        if (item.disabled)
            return item.disabled;
        return item.state === 'busy' ? `"${item.id}" is already running.` : null;
    }
    if (typeof press.value === 'string' && item.options.some((option) => option.id === press.value))
        return null;
    return `"${item.id}" takes one of: ${item.options.map((option) => option.id).join(', ')}.`;
}
