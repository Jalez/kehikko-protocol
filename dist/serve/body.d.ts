/** A request's JSON body, bounded: the caller is whatever on this machine found the port. */
/** A megabyte: what every module's own copy of this allowed. */
export declare const MAX_BODY_BYTES = 1000000;
/** The methods that carry a body. A GET's is never read. */
export declare const BODY_METHODS: readonly string[];
/** The part of node's `IncomingMessage` this reads. */
export interface BodySource {
    method?: string;
    /** What the request says its body is. A source with no headers at all is not asked: it is not a request off a socket. */
    headers?: Record<string, string | string[] | undefined>;
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
}
/** A body that does not say it is JSON. None of it was kept. */
 | {
    ok: false;
    status: 415;
    error: string;
};
export declare const BODY_TOO_LARGE = "That request is too large.";
/** What a body sent as anything but `application/json` is told. */
export declare const BODY_NOT_JSON = "A body sent to this door has to be JSON, and say so: content-type: application/json.";
/** Whether a `content-type` says JSON. Parameters after it (`; charset=utf-8`) are fine; any other type, and none, is not. */
export declare function saysJson(type: string | null | undefined): boolean;
export interface BodyOptions {
    /** Default `MAX_BODY_BYTES`. */
    maxBytes?: number;
    /** Default `BODY_METHODS`. */
    methods?: readonly string[];
}
/**
 * Read the body as a JSON object. Not-JSON and not-an-object are `null`, because the door being
 * asked words that itself. Two things are refused here: too large, as 413, and a body that arrived
 * without `content-type: application/json`, as 415. A request with no body needs no content type.
 */
export declare function readJsonBody(request: BodySource, options?: BodyOptions): Promise<BodyRead>;
/** The same reading, of a `Request`: bounded as it arrives, so a body past the bound is never held whole. */
export declare function readJsonRequest(request: Request, options?: BodyOptions): Promise<BodyRead>;
