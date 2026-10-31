/**
 * 2.14.0. The icon a module is known by: a KEY a host draws from its own icon set, never a path, a
 * URL or markup. A module names one in its manifest's `icon`; a host draws it beside the module's
 * name wherever the module is listed. Design notes: docs/manifest.md ("A module's icon").
 *
 * Two sets, one spelling: `lucide:<name>` is a Lucide icon (the names are Lucide's own, as
 * `HEADER_ICONS` uses them), and `brand:<name>` is the mark of a third-party tool the module fronts
 * (the names are Simple Icons slugs). A brand mark identifies the integrated tool and nothing
 * else: it is not an endorsement, and a module that does not front that tool does not use it.
 *
 * A CLOSED vocabulary as a contract, not a refusal, like `HEADER_ICONS`: the manifest's `icon` stays
 * any short string, and a host draws a key it does not know (or any other string) as its own
 * neutral icon. Kept apart from `HEADER_ICONS` on purpose: those are acts (a check, a play), these
 * are identities, and only these carry brand marks.
 */
export declare const MODULE_ICON_SETS: readonly ["lucide", "brand"];
export type ModuleIconSet = (typeof MODULE_ICON_SETS)[number];
/** The Lucide icons a module may count on a host drawing, by Lucide's name. */
export declare const LUCIDE_MODULE_ICONS: readonly ["activity", "bell", "blocks", "book-open", "bot", "box", "bug", "calendar", "chart-column", "cloud", "code", "cpu", "database", "factory", "file", "file-code", "file-pen", "file-text", "flask-conical", "folder", "folder-tree", "git-branch", "git-compare", "git-pull-request", "globe", "graduation-cap", "history", "image", "inbox", "kanban", "layers", "layout-dashboard", "lightbulb", "link", "list-checks", "list-todo", "lock", "mail", "map", "message-circle", "message-square-code", "network", "notebook-pen", "package", "pen-tool", "presentation", "puzzle", "quote", "rocket", "route", "search", "server", "settings", "shield", "square-terminal", "star", "table", "tag", "timer", "users", "video", "workflow", "wrench", "zap"];
/**
 * The brand marks a module may count on a host drawing, by Simple Icons slug: the mark of the
 * third-party tool a module fronts (LaTeX for a paper written in it, Claude for a Claude Code
 * session, Google Chrome for a browser). Drawn in one colour, the text's, like every other icon.
 */
export declare const BRAND_MODULE_ICONS: readonly ["claude", "git", "github", "gitlab", "googlechrome", "googlegemini", "latex", "markdown", "mistralai", "openai", "opencode"];
/** Every key a manifest's `icon` may name: `lucide:<name>` for each Lucide icon, then `brand:<slug>` for each mark. */
export type ModuleIcon = `lucide:${(typeof LUCIDE_MODULE_ICONS)[number]}` | `brand:${(typeof BRAND_MODULE_ICONS)[number]}`;
export declare const MODULE_ICONS: readonly ModuleIcon[];
/** Whether a string is a key of `MODULE_ICONS`. A path, a URL or an unknown name is not. */
export declare function isModuleIcon(value: unknown): value is ModuleIcon;
/** A key's set and name: `brand:latex` is `{ set: 'brand', name: 'latex' }`. */
export declare function moduleIconParts(icon: ModuleIcon): {
    set: ModuleIconSet;
    name: string;
};
