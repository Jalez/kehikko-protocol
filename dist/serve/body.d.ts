/** A request's JSON body, bounded: the caller is whatever on this machine found the port. */
/** A megabyte: what every module's own copy of this allowed. */
export declare const MAX_BODY_BYTES = 1000000;
/** The methods that carry a body. A GET's is never read. */
export declare const BODY_METHODS: readonly string[];
/** The part of node's `IncomingMessage` this reads. */
export interface BodySource {
    method?: string;
    on(event: 'data', listener: (chunk: Uint8Array) => void): unknown;
    on(event: 'end' | 'close', listener: () => void): unknown;
    on(event: 'error', listener: (error: Error) => void): unknown;
    resume?(): unknown;
}
export type BodyRead = 
/** `body` is `null` for no body, a method that carries none, text that is not JSON, or JSON that is not an object. */
{
    ok: true;
    body: Record<string, unknown> | null;
}
/** More than the bound. Nothing past it was kept; the rest of the request is discarded unread. */
 | {
    ok: false;
    status: 413;
    error: string;
};
export declare const BODY_TOO_LARGE = "That request is too large.";
export interface BodyOptions {
    /** Default `MAX_BODY_BYTES`. */
    maxBytes?: number;
    /** Default `BODY_METHODS`. */
    methods?: readonly string[];
}
/**
 * Read the body as a JSON object. Not-JSON and not-an-object are `null`, because the door being
 * asked words that itself; too large is the one thing refused here, as 413.
 */
export declare function readJsonBody(request: BodySource, options?: BodyOptions): Promise<BodyRead>;
/** The same reading, of a `Request`: bounded as it arrives, so a body past the bound is never held whole. */
export declare function readJsonRequest(request: Request, options?: BodyOptions): Promise<BodyRead>;
