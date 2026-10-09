/**
 * What a page holds across a reload of itself, and nothing longer: the words somebody was in the
 * middle of typing, which folders were open. Written AS IT CHANGES, because no reload can be
 * caught in time — see docs/module-plumbing.md, "Keeping unsaved work across a reload".
 *
 * `sessionStorage`: it lives as long as the tab. Every access is in a `try`, so a page without
 * storage (an opaque origin) behaves as if nothing had ever been held.
 */
/** Words somebody typed and has not saved. */
export interface Draft {
    /** What was there when the typing started (`''` for something new). */
    base: string;
    /** What is in the box. Several fields are one JSON string here; the caller knows its own shape. */
    text: string;
    /** What it was aimed at, in words a person can read — for when the target is no longer there to show it under. */
    aim: string;
}
/**
 * What was stored, as a value — or `null` for anything not worth giving back. Asked on the way
 * in as well as on the way out, so a value it calls `null` is never stored at all.
 */
export type HeldReader<T> = (stored: unknown) => T | null;
/**
 * The default reader. A draft counts only if the person changed it: empty words, or words that
 * are still what the typing started from, lose to whatever the store holds now.
 */
export declare const heldDraft: HeldReader<Draft>;
/** Everything held under one scope, by target. */
export interface HeldAt<T> {
    /** What is held for exactly this target, or `null`. Never what was held for another. */
    read(target: string): T | null;
    /** Hold it, replacing what was there. `null` forgets it: saved, emptied, or thrown away on purpose. */
    keep(target: string, value: T | null): void;
    all(): Record<string, T>;
    any(): boolean;
}
export interface Held<T> {
    /**
     * The scope: what a host can change under a page without reloading it — the open project's
     * path. `null` is the scope of "none". The same scope gives the same object back, so it can be
     * an effect dependency.
     */
    at(scope: string | null | undefined): HeldAt<T>;
    /** Whether anything is held under any scope: "is something typed here that has not been sent?" */
    any(): boolean;
}
/**
 * One kind of thing this page holds, under a name that is the module's own: `held('kehikot.notes.drafts')`.
 * Call it once, at module scope. Without a reader it holds `Draft`s.
 */
export declare function held(name: string): Held<Draft>;
export declare function held<T>(name: string, read: HeldReader<T>): Held<T>;
