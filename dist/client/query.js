/** The path with the query appended, after whatever query it already has. */
export function withQuery(path, query) {
    const params = new URLSearchParams();
    for (const [name, value] of Object.entries(query ?? {})) {
        for (const one of Array.isArray(value) ? value : [value]) {
            if (one !== null && one !== undefined)
                params.append(name, String(one));
        }
    }
    const text = params.toString();
    return text ? `${path}${path.includes('?') ? '&' : '?'}${text}` : path;
}
/**
 * A module-relative address (`./api/events`, `api/events`) as the module's OWN origin root
 * (`/api/events`). A relative address resolves against the path the host frames the page at: at
 * `/app` it reaches the module's door, at `/app/` or `/app/?…` it becomes `/app/api/events`, which
 * is not one, so a page that worked in one framing silently got nothing in the next. A path that
 * already says where it is (`/…`, `//host/…`, `https://…`, `?…`, `#…`, `../…`) is left as it is.
 */
export function rooted(path) {
    if (/^(?:[a-z][a-z0-9+.-]*:|\/|\?|#|\.\.)/i.test(path))
        return path;
    let rest = path;
    while (rest.startsWith('./'))
        rest = rest.slice(2);
    return `/${rest}`;
}
