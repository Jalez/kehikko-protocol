import { z } from 'zod';
/**
 * 2.16.0. A web address handed to the canvas: a page somebody wants shown that is not a tracker ref
 * — a design document, a deployed preview, a dashboard, a pipeline log. A module asks with
 * `address.open`; whichever module on the kehikko shows pages (`REACTS_TO.address`) opens it.
 * Design notes: docs/wire.md (`contextSchema.address`) and docs/methods.md (`address.open`).
 */
/**
 * Why an address was handed over. `show`: open it, now. Open to extension: a module meeting a word
 * it does not know reads `show`.
 */
export declare const ADDRESS_INTENTS: readonly ["show"];
export type AddressIntent = (typeof ADDRESS_INTENTS)[number];
/**
 * The hosts an `http:` address may name: this machine, by name or by loopback number. Everything
 * else is `https:` or nothing. Compared against `URL.hostname`, which spells IPv6 in brackets.
 */
export declare const LOOPBACK_HOSTS: readonly ["localhost", "127.0.0.1", "[::1]"];
/**
 * Why a string is not an address a module may hand the canvas, as a sentence for whoever sent it, or
 * `null` when it is one. The rules, all refusals and none a repair: a repaired address is a
 * different claim.
 *
 * - at most `LIMITS.URL` characters, with no whitespace or control character anywhere;
 * - written as an absolute `https://` address, or `http://` to `localhost`, `127.0.0.1` or `[::1]`
 *   (`LOOPBACK_HOSTS`) — so never `javascript:`, `data:`, `file:`, `blob:` or anything else;
 * - no user name or password in it (`https://user:secret@host/`): an address travels to every
 *   module on the canvas, and a credential in it would too.
 */
export declare function addressRefusal(value: unknown): string | null;
/** Whether a string is an address a module may hand the canvas (`addressRefusal` is `null`). */
export declare function isWebAddress(value: unknown): value is string;
/** A web address under the rules of `addressRefusal`, kept exactly as it was written. */
export declare const webAddress: z.ZodEffects<z.ZodString, string, string>;
/**
 * An address as the context carries it: the page, its title when the sender gave one, why
 * (`intent`), and — the host's own facts — which module asked (`by`), whether an agent asked through
 * the host's own door instead (`agent`), and when (`at`, ISO 8601, new on every hand-over). `at`
 * is what makes it news: the same address handed over twice is two requests to open it.
 */
export declare const sharedAddressSchema: z.ZodObject<{
    url: z.ZodEffects<z.ZodString, string, string>;
    title: z.ZodOptional<z.ZodString>;
    intent: z.ZodCatch<z.ZodEnum<["show"]>>;
    by: z.ZodOptional<z.ZodString>;
    agent: z.ZodOptional<z.ZodLiteral<true>>;
    at: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    url: string;
    intent: "show";
    at?: string | undefined;
    title?: string | undefined;
    by?: string | undefined;
    agent?: true | undefined;
}, {
    url: string;
    at?: string | undefined;
    title?: string | undefined;
    intent?: unknown;
    by?: string | undefined;
    agent?: true | undefined;
}>;
export type SharedAddress = z.infer<typeof sharedAddressSchema>;
/**
 * Whether a consumer has something to do: an address is here and its `at` is not the one it last
 * acted on. A consumer keeps the `at` it acted on, and acts on nothing it sent itself unless it
 * asked to. An address without an `at` (a host that does not stamp) is acted on when its url moves.
 */
export declare function addressIsNews(address: Pick<SharedAddress, 'url' | 'at'> | null | undefined, actedOn: {
    url?: string | null;
    at?: string | null;
} | null | undefined): boolean;
/** The title when there is one, else the address's host and path, for a person to read. */
export declare function addressLabel(address: Pick<SharedAddress, 'url' | 'title'>): string;
