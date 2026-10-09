/** One value of a query string. `null` and `undefined` are left out. */
export type QueryValue = string | number | boolean | null | undefined;
/** What `ask` and `follow` append to a path. A list repeats its key: `{ doc: ['a', 'b'] }` is `doc=a&doc=b`. */
export type Query = Record<string, QueryValue | readonly QueryValue[]>;
/** The path with the query appended, after whatever query it already has. */
export declare function withQuery(path: string, query: Query | undefined): string;
