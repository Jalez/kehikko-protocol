import { describe, expect, test } from 'bun:test'

import {
  askedHosts,
  doorConfigProblems,
  doorUrl,
  hostIsProjectUrls,
  hostPlaceUrls,
  isStableDoor,
  keptFolderName,
  legacyKeptFolderName,
  stableDoors,
  startingHost,
  tokenOnDoor,
  HOST_ENV,
} from '../src/serve/index.js'
import { hostAskUrls } from '../src/serve/ask.js'

const HOST = 'http://127.0.0.1:4170'
const TOKEN = 'a'.repeat(43)

describe('the host that started the module (2.95.0)', () => {
  test('KEHIKOT_HOST names it, over every list', () => {
    expect(startingHost({ [HOST_ENV]: HOST, KEHIKOT_ORIGINS: 'http://127.0.0.1:47700 http://127.0.0.1:4181' })).toBe(HOST)
  })

  test('from an older host: the first loopback origin of its list, never a tauri one', () => {
    expect(startingHost({ KEHIKOT_ORIGINS: 'tauri://localhost http://tauri.localhost http://127.0.0.1:4170 http://127.0.0.1:4181' })).toBe(HOST)
    expect(startingHost({ KEHIKOT_ORIGIN: 'tauri://localhost http://127.0.0.1:4171' })).toBe('http://127.0.0.1:4171')
  })

  test('nobody started it: null, and never one of the defaults', () => {
    expect(startingHost({})).toBeNull()
    expect(startingHost({ [HOST_ENV]: 'https://example.com' })).toBeNull()
  })

  test('a module a host started asks that host alone, whatever else its list names', () => {
    const env = { [HOST_ENV]: HOST, KEHIKOT_ORIGINS: 'http://127.0.0.1:47700 http://127.0.0.1:4181' }
    expect(askedHosts(env)).toEqual([HOST])
    expect(hostPlaceUrls(TOKEN, env)).toEqual([`${HOST}/host/place?kehikot-place=${TOKEN}`])
    expect(hostIsProjectUrls('/p', env).map((url) => new URL(url).origin)).toEqual([HOST])
    expect(hostAskUrls(env).map((url) => new URL(url).origin)).toEqual([HOST])
  })

  test('under an older host, its list in order, as before', () => {
    expect(askedHosts({ KEHIKOT_ORIGINS: 'http://127.0.0.1:1 http://127.0.0.1:2' })).toEqual(['http://127.0.0.1:1', 'http://127.0.0.1:2'])
  })
})

describe('the stable door', () => {
  test('the host’s own and a module’s, with the token', () => {
    expect(doorUrl(HOST, 'kehikko', TOKEN)).toBe(`${HOST}/mcp?kehikot-place=${TOKEN}`)
    expect(doorUrl(HOST, 'kehikot.paper', TOKEN)).toBe(`${HOST}/m/kehikot.paper/mcp?kehikot-place=${TOKEN}`)
    expect(() => doorUrl('http://example.com', 'kehikot.paper')).toThrow()
  })

  test('a door list from anywhere is rebuilt on the starting host: another host, a raw port, the stable one', () => {
    const doors = stableDoors(
      [
        { module: 'kehikko', name: 'kehikko', url: `http://127.0.0.1:47700/mcp?kehikot-place=${TOKEN}`, transport: 'http' as const },
        { module: 'kehikot.paper', name: 'paper', url: `http://127.0.0.1:47700/m/kehikot.paper/mcp?kehikot-place=${TOKEN}`, transport: 'http' as const },
        { module: 'kehikot.notes', name: 'notes', url: `http://127.0.0.1:7940/mcp?kehikot-place=${TOKEN}`, transport: 'http' as const },
        { module: '', name: 'slides', url: `http://127.0.0.1:47700/m/kehikot.slides/mcp?kehikot-place=${TOKEN}`, transport: 'http' as const },
        { module: '', name: 'mystery', url: 'http://127.0.0.1:7999/mcp', transport: 'http' as const },
      ],
      HOST,
      TOKEN,
    )
    expect(doors.map((door) => [door.name, door.url])).toEqual([
      ['kehikko', `${HOST}/mcp?kehikot-place=${TOKEN}`],
      ['paper', `${HOST}/m/kehikot.paper/mcp?kehikot-place=${TOKEN}`],
      ['notes', `${HOST}/m/kehikot.notes/mcp?kehikot-place=${TOKEN}`],
      ['slides', `${HOST}/m/kehikot.slides/mcp?kehikot-place=${TOKEN}`],
    ])
    for (const door of doors) expect(isStableDoor(door.url, HOST)).toBe(true)
  })

  test('a raw port is never a stable door, nor another host', () => {
    expect(isStableDoor(`http://127.0.0.1:7870/mcp`, HOST)).toBe(false)
    expect(isStableDoor(`http://127.0.0.1:47700/m/kehikot.paper/mcp`, HOST)).toBe(false)
    expect(isStableDoor(`${HOST}/m/kehikot.paper@v1.2.0/mcp`, HOST)).toBe(true)
  })

  test('the conformance check names each entry that is not one', () => {
    const config = {
      mcpServers: {
        kehikko: { type: 'http', url: `${HOST}/mcp?kehikot-place=${TOKEN}` },
        paper: { type: 'http', url: `http://127.0.0.1:47700/m/kehikot.paper/mcp?kehikot-place=${TOKEN}` },
        notes: { type: 'http', url: `http://127.0.0.1:7940/mcp` },
        local: { command: 'node', args: ['x.js'] },
      },
    }
    const problems = doorConfigProblems(config, HOST)
    expect(problems).toHaveLength(2)
    expect(problems[0]).toContain('paper')
    expect(problems[1]).toContain('raw address')
    expect(doorConfigProblems({ mcpServers: { kehikko: { url: `${HOST}/mcp` } } }, HOST)).toEqual([])
  })
})

describe('kept folders are the starting host’s', () => {
  test('the same token under another host names another folder', () => {
    expect(keptFolderName(TOKEN, HOST)).not.toBe(keptFolderName(TOKEN, 'http://127.0.0.1:47700'))
    expect(keptFolderName(TOKEN, HOST)).toMatch(/^session-[0-9a-f]{24}$/)
    expect(keptFolderName(TOKEN, null)).toBe(legacyKeptFolderName(TOKEN))
  })

  test('the token on a door', () => {
    expect(tokenOnDoor(`${HOST}/mcp?kehikot-place=${TOKEN}`)).toBe(TOKEN)
    expect(tokenOnDoor('not a url')).toBeNull()
  })
})

describe('the conformance check over a module’s sources (check:door-config)', () => {
  const { checkDoorConfigSources } = require('../src/check/door-config.ts') as typeof import('../src/check/door-config.ts')

  test('a raw-port door beside a door config fails', () => {
    const check = checkDoorConfigSources('m', [
      { path: 'doorConfig.ts', text: 'const own = { url: `http://127.0.0.1:${port}/mcp?kehikot-place=${token}` }' },
      { path: 'skills.ts', text: 'const c = { mcpServers: {} }' },
    ])
    expect(check.writesConfig).toBe(true)
    expect(check.failures).toHaveLength(1)
    expect(check.failures[0]).toContain('doorConfig.ts:1')
  })

  test('the stable door passes, and a manifest’s own door url is not judged', () => {
    const check = checkDoorConfigSources('m', [
      { path: 'doorConfig.ts', text: 'const own = doorUrl(startingHost(), ID, token)\nconst c = { mcpServers: {} }' },
      { path: 'manifest.ts', text: 'mcp: { url: `http://127.0.0.1:${PORT}/mcp` }' },
    ])
    expect(check.failures).toEqual([])
  })

  test('a module that writes no door config has nothing to check', () => {
    expect(checkDoorConfigSources('m', [{ path: 'manifest.ts', text: 'mcp: { url: `http://127.0.0.1:${PORT}/mcp?kehikot-place=x` }' }]).writesConfig).toBe(false)
  })
})
