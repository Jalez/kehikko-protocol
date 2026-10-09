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
  base: string
  /** What is in the box. Several fields are one JSON string here; the caller knows its own shape. */
  text: string
  /** What it was aimed at, in words a person can read — for when the target is no longer there to show it under. */
  aim: string
}

/**
 * What was stored, as a value — or `null` for anything not worth giving back. Asked on the way
 * in as well as on the way out, so a value it calls `null` is never stored at all.
 */
export type HeldReader<T> = (stored: unknown) => T | null

/**
 * The default reader. A draft counts only if the person changed it: empty words, or words that
 * are still what the typing started from, lose to whatever the store holds now.
 */
export const heldDraft: HeldReader<Draft> = (stored) => {
  const one = stored as Partial<Draft> | null
  if (!one || typeof one !== 'object' || typeof one.text !== 'string' || typeof one.base !== 'string') return null
  if (!one.text.trim() || one.text === one.base) return null
  return { base: one.base, text: one.text, aim: typeof one.aim === 'string' ? one.aim : '' }
}

/** Everything held under one scope, by target. */
export interface HeldAt<T> {
  /** What is held for exactly this target, or `null`. Never what was held for another. */
  read(target: string): T | null
  /** Hold it, replacing what was there. `null` forgets it: saved, emptied, or thrown away on purpose. */
  keep(target: string, value: T | null): void
  all(): Record<string, T>
  any(): boolean
}

export interface Held<T> {
  /**
   * The scope: what a host can change under a page without reloading it — the open project's
   * path. `null` is the scope of "none". The same scope gives the same object back, so it can be
   * an effect dependency.
   */
  at(scope: string | null | undefined): HeldAt<T>
  /** Whether anything is held under any scope: "is something typed here that has not been sent?" */
  any(): boolean
}

function storage(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage
  } catch {
    return null
  }
}

/**
 * One kind of thing this page holds, under a name that is the module's own: `held('kehikot.notes.drafts')`.
 * Call it once, at module scope. Without a reader it holds `Draft`s.
 */
export function held(name: string): Held<Draft>
export function held<T>(name: string, read: HeldReader<T>): Held<T>
export function held<T>(name: string, read: HeldReader<T> = heldDraft as unknown as HeldReader<T>): Held<T> {
  const key = (scope: string) => `${name}:${scope}`

  const load = (scope: string): Map<string, T> => {
    const found = new Map<string, T>()
    try {
      const raw = storage()?.getItem(key(scope))
      const parsed: unknown = raw ? JSON.parse(raw) : null
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return found
      for (const [target, stored] of Object.entries(parsed)) {
        const value = read(stored)
        if (value !== null) found.set(target, value)
      }
    } catch {
      /* No storage, or something else's string under this name. Nothing is held. */
    }
    return found
  }

  const scopes = new Map<string, HeldAt<T>>()

  return {
    at(given) {
      const scope = given ?? ''
      const known = scopes.get(scope)
      if (known) return known
      const here: HeldAt<T> = {
        read: (target) => load(scope).get(target) ?? null,
        keep(target, value) {
          const all = load(scope)
          if (value === null || read(value) === null) all.delete(target)
          else all.set(target, value)
          try {
            if (all.size) storage()?.setItem(key(scope), JSON.stringify(Object.fromEntries(all)))
            else storage()?.removeItem(key(scope))
          } catch {
            /* No storage, or no room. It holds until the next reload, as it always did. */
          }
        },
        all: () => Object.fromEntries(load(scope)),
        any: () => load(scope).size > 0,
      }
      scopes.set(scope, here)
      return here
    },
    any() {
      try {
        const store = storage()
        if (!store) return false
        for (let at = 0; at < store.length; at += 1) {
          const one = store.key(at)
          if (one?.startsWith(`${name}:`) && load(one.slice(name.length + 1)).size) return true
        }
      } catch {
        /* As above. */
      }
      return false
    },
  }
}
