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
