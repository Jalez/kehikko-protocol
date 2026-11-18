/** One value of a query string. `null` and `undefined` are left out. */
export type QueryValue = string | number | boolean | null | undefined;
/** What `ask` and `follow` append to a path. A list repeats its key: `{ doc: ['a', 'b'] }` is `doc=a&doc=b`. */
export type Query = Record<string, QueryValue | readonly QueryValue[]>;
/** The path with the query appended, after whatever query it already has. */
export declare function withQuery(path: string, query: Query | undefined): string;
/**
 * A module-relative address (`./api/events`, `api/events`) as the module's OWN origin root
 * (`/api/events`). A relative address resolves against the path the host frames the page at: at
 * `/app` it reaches the module's door, at `/app/` or `/app/?…` it becomes `/app/api/events`, which
 * is not one, so a page that worked in one framing silently got nothing in the next. A path that
 * already says where it is (`/…`, `//host/…`, `https://…`, `?…`, `#…`, `../…`) is left as it is.
 */
export declare function rooted(path: string): string;
