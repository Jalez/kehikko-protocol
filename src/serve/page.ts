import type { Build } from '../build.js'
import { BUILD_ELEMENT } from '../build.js'
import { PAGE_BACKGROUND, ROOT_ELEMENT, THEME_KEY, THEME_PARAM, TICKET_ELEMENT, type PageTheme } from '../page.js'

/**
 * The document a module serves at `/app`, built per process so the write ticket and the build can
 * be printed into it. `doors()` runs it through Vite's `transformIndexHtml`.
 *
 * It paints a themed background before any script of the module's has run: two colours inline and
 * one blocking script that decides the theme — `?theme=` on the address, else what the host said
 * last time (`THEME_KEY`), else the system's when nothing frames the page and `FRAMED_DEFAULT_THEME`
 * when something does. See docs/module-plumbing.md.
 */
export interface PageOptions {
  /** The document title. */
  title: string
  /** This process's write ticket. Omit for a page that never writes. */
  ticket?: string | null
  /** This process's build, printed beside the ticket so the page can tell when its server has changed. */
  build?: Build | null
  /** The module script. Default `/src/main.tsx`. */
  entry?: string
  /** Default `en`. */
  lang?: string
  /** The page background at each end of the palette, when it is not the scaffold's. */
  background?: Partial<Record<PageTheme, string>>
  /** Extra markup for the end of `<head>` (fonts, a meta). Trusted: it is written as given. */
  head?: string
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** JSON that cannot close the script element it is printed into. */
const island = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c')

/** Only what a colour needs; anything else would be CSS written by whoever set the option. */
const colour = (value: string | undefined, fallback: string) =>
  value && /^[#(),.%\/\sA-Za-z0-9-]+$/.test(value) ? value : fallback

/**
 * What a framed page paints when nothing has told it a theme: the host's own default, which is
 * dark whatever the system prefers. Leaving the frame unpainted is not an option — measured in
 * WebKit, a framed document that has started loading its modules is an opaque white rectangle.
 */
export const FRAMED_DEFAULT_THEME: PageTheme = 'dark'

/** The blocking script. It cannot import, so the names it needs are written into it; nothing in it throws. */
export function themeScript(): string {
  return (
    '(function(){var d=document.documentElement,t=null;'
    + `try{var q=new URLSearchParams(location.search).get(${island(THEME_PARAM)});if(q==="dark"||q==="light")t=q}catch(e){}`
    + `if(!t)try{var s=localStorage.getItem(${island(THEME_KEY)});if(s==="dark"||s==="light")t=s}catch(e){}`
    + `if(!t){var framed=true;try{framed=window.parent!==window}catch(e){}t=${island(FRAMED_DEFAULT_THEME)};`
    + 'if(!framed)try{t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}catch(e){t="light"}}'
    + 'if(t){d.classList.remove(t==="dark"?"light":"dark");d.classList.add(t)}'
    + '})()'
  )
}

export function pageDocument(options: PageOptions): string {
  const light = colour(options.background?.light, PAGE_BACKGROUND.light)
  const dark = colour(options.background?.dark, PAGE_BACKGROUND.dark)
  const ticket =
    typeof options.ticket === 'string'
      ? `<script id="${TICKET_ELEMENT}" type="application/json">${island(options.ticket)}</script>\n`
      : ''
  const build = options.build
    ? `<script id="${BUILD_ELEMENT}" type="application/json">${island(options.build)}</script>\n`
    : ''
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
`
}
