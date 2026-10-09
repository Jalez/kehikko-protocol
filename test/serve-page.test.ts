import { afterEach, describe, expect, test } from 'bun:test'

import { PAGE_BACKGROUND, THEME_KEY } from '../src/index.js'
import { establishBuild, fillPage, mintTicket, pageDocument, refuseTicket, sameTicket, themeScript, ticketOf } from '../src/serve/index.js'

describe('the page document', () => {
  const html = pageDocument({ title: 'History', ticket: 'abc' })

  test('has the root, the entry script and the ticket as inert JSON', () => {
    expect(html).toContain('<div id="root"></div>')
    expect(html).toContain('<script type="module" src="/src/main.tsx"></script>')
    expect(html).toContain('<script id="ticket" type="application/json">"abc"</script>')
    expect(html).toContain('<title>History</title>')
  })

  test('paints both backgrounds inline, in the head, before the module script', () => {
    const style = html.indexOf(`html.dark{background:${PAGE_BACKGROUND.dark};color-scheme:dark}`)
    expect(style).toBeGreaterThan(-1)
    expect(html).toContain(`html.light{background:${PAGE_BACKGROUND.light};color-scheme:light}`)
    expect(style).toBeLessThan(html.indexOf('</head>'))
    /* A plain blocking script, not a module: a module script runs after the first paint. */
    const blocking = html.indexOf(`<script>${themeScript()}</script>`)
    expect(blocking).toBeGreaterThan(-1)
    expect(blocking).toBeLessThan(html.indexOf('<script type="module"'))
  })

  test('has no scheme or background that does not come from the decided class', () => {
    expect(html).not.toContain('name="color-scheme"')
    expect(html).not.toMatch(/html\{[^}]*background/)
    expect(html).not.toContain('@media')
  })

  test('a ticket cannot close its script element, and a title cannot open one', () => {
    const hostile = pageDocument({ title: '</title><script>x</script>', ticket: '</script><script>alert(1)</script>' })
    expect(hostile).not.toContain('<script>alert(1)</script>')
    expect(hostile).not.toContain('<script>x</script>')
    const island = /<script id="ticket" type="application\/json">(.*?)<\/script>/.exec(hostile)?.[1] ?? ''
    expect(JSON.parse(island)).toBe('</script><script>alert(1)</script>')
  })

  test('a ticket with a dollar sign survives', () => {
    const island = /<script id="ticket" type="application\/json">(.*?)<\/script>/.exec(pageDocument({ title: 't', ticket: 'a$&b$1' }))?.[1] ?? ''
    expect(JSON.parse(island)).toBe('a$&b$1')
  })

  test('a page that never writes has no ticket element', () => {
    expect(pageDocument({ title: 't' })).not.toContain('id="ticket"')
  })

  test('takes a module’s own palette, entry and head, and refuses a colour that is not one', () => {
    const own = pageDocument({
      title: 't',
      entry: '/src/boot.ts',
      head: '<link rel="icon" href="data:,">',
      background: { dark: '#0a0a0a', light: 'red;}body{display:none' },
    })
    expect(own).toContain('html.dark{background:#0a0a0a;')
    expect(own).toContain(`html.light{background:${PAGE_BACKGROUND.light};`)
    expect(own).toContain('src="/src/boot.ts"')
    expect(own).toContain('<link rel="icon" href="data:,">\n</head>')
  })
})

describe('a page built ahead of its server', () => {
  const build = establishBuild({ version: '1.0.0', commit: null })
  const read = (html: string, id: string) => JSON.parse(new RegExp(`<script id="${id}" type="application/json">(.*?)</script>`).exec(html)?.[1] ?? 'null') as unknown

  test('filled, it is the page the server would have written itself', () => {
    const built = pageDocument({ title: 'Example', ticket: '', build: { ...build, started: 'then' } })
    expect(fillPage(built, { ticket: 'the-ticket', build })).toBe(pageDocument({ title: 'Example', ticket: 'the-ticket', build }))
  })

  test('a page built without the islands gains them, before the end of the body', () => {
    const filled = fillPage(pageDocument({ title: 'Example' }), { ticket: 'the-ticket', build })
    expect(read(filled, 'ticket')).toBe('the-ticket')
    expect(read(filled, 'build')).toEqual(build)
    expect(filled.indexOf('id="build"')).toBeLessThan(filled.indexOf('</body>'))
    /* And nothing asked for is nothing changed. */
    expect(fillPage(pageDocument({ title: 'Example' }), {})).toBe(pageDocument({ title: 'Example' }))
  })

  test('a ticket cannot close its element or be read as a replacement pattern', () => {
    const nasty = '</script><script>alert(1)</script>$&$1'
    const filled = fillPage(pageDocument({ title: 'Example', ticket: '' }), { ticket: nasty })
    expect(read(filled, 'ticket')).toBe(nasty)
    expect(filled.match(/<script/g)?.length).toBe(3)
  })
})

describe('the theme script', () => {
  const at = (url: string) => (window as unknown as { happyDOM: { setURL(url: string): void } }).happyDOM.setURL(url)
  afterEach(() => {
    document.documentElement.className = ''
    localStorage.removeItem(THEME_KEY)
    at('about:blank')
  })
  const run = () => new Function(themeScript())()

  test('the address wins', () => {
    localStorage.setItem(THEME_KEY, 'light')
    at('http://127.0.0.1:9000/app?theme=dark')
    run()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.classList.contains('light')).toBe(false)
  })

  test('then what the host said last time', () => {
    localStorage.setItem(THEME_KEY, 'dark')
    run()
    expect(document.documentElement.className).toBe('dark')
  })

  test('and with neither, a page nothing is framing takes the system’s', () => {
    run()
    expect(['dark', 'light']).toContain(document.documentElement.className)
  })

  test('a framed page with nothing to go on takes the host’s default, whatever the system prefers', () => {
    const own = Object.getOwnPropertyDescriptor(window, 'parent')
    Object.defineProperty(window, 'parent', { configurable: true, value: {} })
    try {
      run()
      expect(document.documentElement.className).toBe('dark')
    } finally {
      if (own) Object.defineProperty(window, 'parent', own)
      else delete (window as unknown as { parent?: unknown }).parent
    }
  })
})

describe('the ticket', () => {
  test('is minted new each time', () => {
    expect(mintTicket()).not.toBe(mintTicket())
    expect(mintTicket().length).toBeGreaterThan(20)
  })

  test('only the minted one is the same', () => {
    const minted = mintTicket()
    expect(sameTicket(minted, minted)).toBe(true)
    expect(sameTicket(minted.slice(0, -1), minted)).toBe(false)
    expect(sameTicket(`${minted}x`, minted)).toBe(false)
    expect(sameTicket('', minted)).toBe(false)
    expect(sameTicket(null, minted)).toBe(false)
    expect(sameTicket(undefined, minted)).toBe(false)
  })

  test('is read out of the headers however node spelled them', () => {
    expect(ticketOf({ 'x-module-ticket': 'a' })).toBe('a')
    expect(ticketOf({ 'x-module-ticket': ['a', 'b'] })).toBe('a')
    expect(ticketOf({})).toBeNull()
    expect(ticketOf({ 'x-module-ticket': '' })).toBeNull()
  })

  test('a refusal is a marked 403, and the right ticket is not refused', () => {
    const minted = mintTicket()
    expect(refuseTicket(minted, minted)).toBeNull()
    const no = refuseTicket('old', minted)
    expect(no?.status).toBe(403)
    expect(no?.body.refused).toBe('ticket')
    expect(no?.body.ok).toBe(false)
    expect(refuseTicket(null, minted, 'Mine.')?.body.error).toBe('Mine.')
  })
})
