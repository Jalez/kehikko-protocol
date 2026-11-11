import type { GuardCheckout } from '../guards.js';
/**
 * 2.78.0. The kind of git checkout a file is in, for an `edit` guard's `match.checkouts`
 * (`editDecision`'s `facts.checkout`): the nearest `.git` at or above the file's folder decides —
 * a directory is a repository's `main` checkout, a file is a `linked` worktree (or a submodule, which
 * is not the main checkout either), none is null. The file need not exist yet (a Write makes it): the
 * walk starts at the nearest folder that does. A relative path is resolved against `cwd`.
 */
export declare function checkoutOf(path: string, cwd?: string): GuardCheckout | 'linked' | null;
