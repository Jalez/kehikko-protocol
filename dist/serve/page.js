import { BUILD_ELEMENT } from '../build.js';
import { PAGE_BACKGROUND, ROOT_ELEMENT, THEME_KEY, THEME_PARAM, TICKET_ELEMENT } from '../page.js';
const escapeHtml = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** JSON that cannot close the script element it is printed into. */
const island = (value) => JSON.stringify(value).replace(/</g, '\\u003c');
/** Only what a colour needs; anything else would be CSS written by whoever set the option. */
const colour = (value, fallback) => value && /^[#(),.%\/\sA-Za-z0-9-]+$/.test(value) ? value : fallback;
/**
 * What a framed page paints when nothing has told it a theme: the host's own default, which is
 * dark whatever the system prefers. Leaving the frame unpainted is not an option — measured in
 * WebKit, a framed document that has started loading its modules is an opaque white rectangle.
 */
export const FRAMED_DEFAULT_THEME = 'dark';
/** The blocking script. It cannot import, so the names it needs are written into it; nothing in it throws. */
export function themeScript() {
    return ('(function(){var d=document.documentElement,t=null;'
        + `try{var q=new URLSearchParams(location.search).get(${island(THEME_PARAM)});if(q==="dark"||q==="light")t=q}catch(e){}`
        + `if(!t)try{var s=localStorage.getItem(${island(THEME_KEY)});if(s==="dark"||s==="light")t=s}catch(e){}`
        + `if(!t){var framed=true;try{framed=window.parent!==window}catch(e){}t=${island(FRAMED_DEFAULT_THEME)};`
        + 'if(!framed)try{t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}catch(e){t="light"}}'
        + 'if(t){d.classList.remove(t==="dark"?"light":"dark");d.classList.add(t)}'
        + '})()');
}
const islandOf = (id, value) => `<script id="${id}" type="application/json">${island(value)}</script>`;
/**
 * Put this process's ticket and build into a page that was built ahead of it (`vite build` over a
 * `pageDocument` written without either): each island is replaced where the built page has one and
 * added before `</body>` where it has none. No placeholder to agree on, and the escaping is here.
 */
export function fillPage(html, filled) {
    let page = html;
    for (const [id, value] of [
        [TICKET_ELEMENT, typeof filled.ticket === 'string' ? filled.ticket : null],
        [BUILD_ELEMENT, filled.build ?? null],
    ]) {
        if (value === null)
            continue;
        const was = new RegExp(`<script id="${id}" type="application/json">[^<]*</script>`);
        /* A function, so `$&` in a ticket is a dollar and an ampersand. */
        if (was.test(page))
            page = page.replace(was, () => islandOf(id, value));
        else if (page.includes('</body>'))
            page = page.replace('</body>', () => `${islandOf(id, value)}\n</body>`);
        else
            page += `${islandOf(id, value)}\n`;
    }
    return page;
}
export function pageDocument(options) {
    const light = colour(options.background?.light, PAGE_BACKGROUND.light);
    const dark = colour(options.background?.dark, PAGE_BACKGROUND.dark);
    const ticket = typeof options.ticket === 'string'
        ? `${islandOf(TICKET_ELEMENT, options.ticket)}\n`
        : '';
    const build = options.build
        ? `${islandOf(BUILD_ELEMENT, options.build)}\n`
        : '';
    return `<!doctype html>
<html lang="${escapeHtml(options.lang ?? 'en')}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(options.title)}</title>
<style>html.light{background:${light};color-scheme:light}html.dark{background:${dark};color-scheme:dark}</style>
<script>${themeScript()}</script>
${options.head ? `${options.head}\n` : ''}</head>
<body>
<div id="${ROOT_ELEMENT}"></div>
${ticket}${build}<script type="module" src="${escapeHtml(options.entry ?? '/src/main.tsx')}"></script>
</body>
</html>
`;
}
