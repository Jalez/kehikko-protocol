/**
 * What a page holds across a reload of itself, and nothing longer: the words somebody was in the
 * middle of typing, which folders were open. Written AS IT CHANGES, because no reload can be
 * caught in time — see docs/module-plumbing.md, "Keeping unsaved work across a reload".
 *
 * `sessionStorage`: it lives as long as the tab. Every access is in a `try`, so a page without
 * storage (an opaque origin) behaves as if nothing had ever been held.
 */
/**
 * The default reader. A draft counts only if the person changed it: empty words, or words that
 * are still what the typing started from, lose to whatever the store holds now.
 */
export const heldDraft = (stored) => {
    const one = stored;
    if (!one || typeof one !== 'object' || typeof one.text !== 'string' || typeof one.base !== 'string')
        return null;
    if (!one.text.trim() || one.text === one.base)
        return null;
    return { base: one.base, text: one.text, aim: typeof one.aim === 'string' ? one.aim : '' };
};
function storage() {
    try {
        return typeof sessionStorage === 'undefined' ? null : sessionStorage;
    }
    catch {
        return null;
    }
}
export function held(name, read = heldDraft) {
    const key = (scope) => `${name}:${scope}`;
    const load = (scope) => {
        const found = new Map();
        try {
            const raw = storage()?.getItem(key(scope));
            const parsed = raw ? JSON.parse(raw) : null;
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
                return found;
            for (const [target, stored] of Object.entries(parsed)) {
                const value = read(stored);
                if (value !== null)
                    found.set(target, value);
            }
        }
        catch {
            /* No storage, or something else's string under this name. Nothing is held. */
        }
        return found;
    };
    const scopes = new Map();
    return {
        at(given) {
            const scope = given ?? '';
            const known = scopes.get(scope);
            if (known)
                return known;
            const here = {
                read: (target) => load(scope).get(target) ?? null,
                keep(target, value) {
                    const all = load(scope);
                    if (value === null || read(value) === null)
                        all.delete(target);
                    else
                        all.set(target, value);
                    try {
                        if (all.size)
                            storage()?.setItem(key(scope), JSON.stringify(Object.fromEntries(all)));
                        else
                            storage()?.removeItem(key(scope));
                    }
                    catch {
                        /* No storage, or no room. It holds until the next reload, as it always did. */
                    }
                },
                all: () => Object.fromEntries(load(scope)),
                any: () => load(scope).size > 0,
            };
            scopes.set(scope, here);
            return here;
        },
        any() {
            try {
                const store = storage();
                if (!store)
                    return false;
                for (let at = 0; at < store.length; at += 1) {
                    const one = store.key(at);
                    if (one?.startsWith(`${name}:`) && load(one.slice(name.length + 1)).size)
                        return true;
                }
            }
            catch {
                /* As above. */
            }
            return false;
        },
    };
}
