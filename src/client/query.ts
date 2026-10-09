/** One value of a query string. `null` and `undefined` are left out. */
export type QueryValue = string | number | boolean | null | undefined

/** What `ask` and `follow` append to a path. A list repeats its key: `{ doc: ['a', 'b'] }` is `doc=a&doc=b`. */
export type Query = Record<string, QueryValue | readonly QueryValue[]>

/** The path with the query appended, after whatever query it already has. */
export function withQuery(path: string, query: Query | undefined): string {
  const params = new URLSearchParams()
  for (const [name, value] of Object.entries(query ?? {})) {
    for (const one of Array.isArray(value) ? (value as readonly QueryValue[]) : [value as QueryValue]) {
      if (one !== null && one !== undefined) params.append(name, String(one))
    }
  }
  const text = params.toString()
  return text ? `${path}${path.includes('?') ? '&' : '?'}${text}` : path
}
