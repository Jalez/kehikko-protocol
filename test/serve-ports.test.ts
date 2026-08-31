import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { MANIFEST_KIND, WELL_KNOWN } from '../src/index.js'
import {
  claim,
  free,
  identify,
  neighbourPorts,
  originFor,
  portOf,
  preferred,
  readManifest,
  readRegistration,
  registerAt,
  registryDir,
  sayClaim,
  search,
  verdict,
  type Occupant,
} from '../src/serve/index.js'

/**
 * What is tested here is the decision, and then the decision against a real
 * socket.
 *
 * The two halves are separate on purpose. Everything about WHO is on a port and
 * WHAT that means is a table over three occupants, and a table exercised only
 * through `listen` and `fetch` is a table nobody can change later without
 * standing up a server to find out what they broke. So `verdict`, `search` and
 * `readManifest` are tested as functions, `claim` is tested against injected
 * probes, and then the last suite starts an actual listener on an actual port —
 * because the one thing the injected probes cannot show is that the real ones
 * agree with them.
 */

const ID = 'roadmap.example'

describe('who is on the port, and what follows', () => {
  test('a free port is simply taken', () => {
    expect(verdict(ID, { at: 'free' })).toEqual({ take: 'preferred' })
  })

  /* The branch the whole feature turns on. Drifting here would start a second
     copy of one module: two stores, two MCP doors, and a host framing whichever
     the registry happened to name last. */
  test('this module answering there means it is already running, and nothing is taken', () => {
    expect(verdict(ID, { at: 'module', id: ID })).toEqual({ take: 'nothing', because: 'already-running' })
  })

  test('a different module answering there is a collision, and it is named', () => {
    const said = verdict(ID, { at: 'module', id: 'roadmap.notes' })
    expect(said.take).toBe('another')
    expect(said).toHaveProperty('because', 'roadmap.notes is answering there')
  })

  test('a stranger is a collision too, and keeps its own sentence', () => {
    const said = verdict(ID, { at: 'stranger', why: 'something answered 404' })
    expect(said).toEqual({ take: 'another', because: 'something answered 404' })
  })
})

describe('reading a document off a stranger’s port', () => {
  test('a manifest that says the word gives up its id', () => {
    expect(readManifest(JSON.stringify({ kind: MANIFEST_KIND, id: ID }))).toEqual({ at: 'module', id: ID })
  })

  /* The reason `kind` exists. A JSON server that happens to have an `id` field
     could otherwise talk a module out of starting — or, far worse, be mistaken
     for the module itself and produce a clean "already running" exit for a
     program that is not running at all. */
  test('an id without the word is not a module', () => {
    const said = readManifest(JSON.stringify({ id: ID }))
    expect(said.at).toBe('stranger')
  })

  test('a word without an id is not a module either', () => {
    expect(readManifest(JSON.stringify({ kind: MANIFEST_KIND })).at).toBe('stranger')
  })

  test('html, an array, and a truncated body are all strangers rather than throws', () => {
    expect(readManifest('<!doctype html>').at).toBe('stranger')
    expect(readManifest('[{"kind":"roadmap.module","id":"roadmap.x"}]').at).toBe('stranger')
    expect(readManifest('{"kind":"roadmap.mod').at).toBe('stranger')
  })
})

describe('walking to the next port', () => {
  const none = () => false

  test('stops at the first port nothing holds', () => {
    expect(search(7960, (p) => p < 7963, none)).toBe(7963)
  })

  /* A neighbour's registration is a claim on a port even while that neighbour is
     not running, which is the normal state of most modules most of the time. A
     drift that took 7970 because nobody was on it would hand the module that
     owns 7970 a collision it did not cause. */
  test('steps over a port another module has registered, free or not', () => {
    expect(search(7961, none, (p) => p === 7961)).toBe(7962)
  })

  test('gives up rather than walking forever, and says so with null', () => {
    expect(search(7960, () => true, none, 4)).toBe(null)
  })

  test('does not walk past the end of the port range', () => {
    expect(search(65534, none, (p) => p <= 65535)).toBe(null)
  })
})

describe('claiming, against probes that answer on demand', () => {
  const probes = (taken: Set<number>, who: Occupant) => ({
    free: (port: number) => Promise.resolve(!taken.has(port)),
    identify: () => Promise.resolve(who),
  })

  /* The case that must stay boring. Somebody types `curl 127.0.0.1:7960` and
     gets their module; nothing is probed, nothing is printed, nothing moves. */
  test('a free preference is taken with no drift and nothing to say', async () => {
    const got = await claim({ id: ID, prefer: 7960, probes: probes(new Set(), { at: 'free' }) })
    expect(got).toEqual({
      status: 'claimed',
      id: ID,
      prefer: 7960,
      port: 7960,
      origin: 'http://127.0.0.1:7960',
      moved: false,
      why: null,
    })
    expect(sayClaim(got)).toBe('roadmap.example at http://127.0.0.1:7960')
  })

  test('its own id on the port is already-running, and the sentence names the address', async () => {
    const got = await claim({
      id: ID,
      prefer: 7960,
      probes: probes(new Set([7960]), { at: 'module', id: ID }),
    })
    expect(got.status).toBe('already-running')
    expect(got.moved).toBe(false)
    expect(sayClaim(got)).toContain('already running at http://127.0.0.1:7960')
  })

  test('a stranger on the port moves it up one, and both numbers are said out loud', async () => {
    const got = await claim({
      id: ID,
      prefer: 7960,
      registry: join(tmpdir(), 'roadmap-registry-that-is-not-there'),
      probes: probes(new Set([7960]), { at: 'stranger', why: 'something answered 404' }),
    })
    expect(got.status).toBe('claimed')
    expect(got.moved).toBe(true)
    expect(got.status === 'claimed' && got.port).toBe(7961)
    const line = sayClaim(got)
    expect(line).toContain('7960')
    expect(line).toContain('http://127.0.0.1:7961')
  })

  test('a different module on the port moves too, and is named in the reason', async () => {
    const got = await claim({
      id: ID,
      prefer: 7960,
      registry: join(tmpdir(), 'roadmap-registry-that-is-not-there'),
      probes: probes(new Set([7960]), { at: 'module', id: 'roadmap.notes' }),
    })
    expect(got.status === 'claimed' && got.why).toBe('roadmap.notes is answering there')
  })

  test('nowhere to go is a state with a sentence, not an exception', async () => {
    const got = await claim({
      id: ID,
      prefer: 7960,
      span: 3,
      registry: join(tmpdir(), 'roadmap-registry-that-is-not-there'),
      probes: {
        free: () => Promise.resolve(false),
        identify: () => Promise.resolve({ at: 'stranger', why: 'something is there' }),
      },
    })
    expect(got.status).toBe('nowhere')
    expect(sayClaim(got)).toContain('could not find a free port')
  })

  /* The registry is consulted for the DRIFT and never for the preference: a
     module is entitled to the port it registered even though its own file names
     it, and `neighbourPorts` excludes it by id for exactly that reason. */
  /**
   * The second start after a first one has already drifted, which is the case
   * that got past the check above in real use.
   *
   * The squatter still holds 7960, so the preferred port is a stranger and
   * "already running" never fires there — and without this the module walks past
   * its own copy on 7961 to start a second one on 7962.
   */
  test('its own copy on the port it drifted to last time is found before drifting again', async () => {
    const where = mkdtempSync(join(tmpdir(), 'roadmap-modules-'))
    writeFileSync(join(where, `${ID}.json`), JSON.stringify({ url: 'http://127.0.0.1:7961', dir: '/x' }))

    const got = await claim({
      id: ID,
      prefer: 7960,
      registry: where,
      probes: {
        free: (port) => Promise.resolve(port !== 7960 && port !== 7961),
        identify: (port) =>
          Promise.resolve(
            port === 7961 ? { at: 'module', id: ID } : { at: 'stranger', why: 'a squatter is still there' },
          ),
      },
    })

    expect(got.status).toBe('already-running')
    expect(got.origin).toBe('http://127.0.0.1:7961')
    expect(sayClaim(got)).toContain('7961')
  })

  /* A registration is a hint and never an authority. A stale file naming a port
     somebody else now holds says nothing about whether this module is running,
     and a module that refused to start because of a line in a file would be one
     nobody could start again after a crash. */
  test('a stale registration pointing at somebody else does not stop the start', async () => {
    const where = mkdtempSync(join(tmpdir(), 'roadmap-modules-'))
    writeFileSync(join(where, `${ID}.json`), JSON.stringify({ url: 'http://127.0.0.1:7961', dir: '/x' }))

    const got = await claim({
      id: ID,
      prefer: 7960,
      registry: where,
      probes: {
        free: (port) => Promise.resolve(port !== 7960 && port !== 7961),
        identify: (port) =>
          Promise.resolve(
            port === 7961 ? { at: 'module', id: 'roadmap.notes' } : { at: 'stranger', why: 'a squatter' },
          ),
      },
    })

    expect(got.status).toBe('claimed')
    expect(got.status === 'claimed' && got.port).toBe(7962)
  })

  test('a neighbour’s registered port is stepped over while drifting', async () => {
    const where = mkdtempSync(join(tmpdir(), 'roadmap-modules-'))
    writeFileSync(join(where, 'roadmap.notes.json'), JSON.stringify({ url: 'http://127.0.0.1:7961', dir: '/x' }))
    writeFileSync(join(where, `${ID}.json`), JSON.stringify({ url: 'http://127.0.0.1:7960', dir: '/x' }))

    const got = await claim({
      id: ID,
      prefer: 7960,
      registry: where,
      probes: probes(new Set([7960]), { at: 'stranger', why: 'something is there' }),
    })
    expect(got.status === 'claimed' && got.port).toBe(7962)
  })
})

/**
 * The same decisions, with nothing injected.
 *
 * A listener is started, claimed against, and stopped. This is the only suite
 * that can show that `free` and `identify` agree with the table above — and in
 * particular that a real module answering a real manifest produces the clean
 * already-running exit rather than a second server.
 */
describe('against a listener that is really there', () => {
  const listen = (answer: (path: string) => { status: number; body: string } | null): Promise<[Server, number]> =>
    new Promise((resolve) => {
      const server = createServer((request, response) => {
        const reply = answer(request.url ?? '/')
        if (!reply) {
          response.statusCode = 404
          response.end('no')
          return
        }
        response.statusCode = reply.status
        response.setHeader('content-type', 'application/json')
        response.end(reply.body)
      })
      server.listen(0, '127.0.0.1', () => {
        const address = server.address()
        resolve([server, typeof address === 'object' && address ? address.port : 0])
      })
    })

  const stop = (server: Server) => new Promise<void>((resolve) => server.close(() => resolve()))

  test('a port nothing holds is free, and a port something holds is not', async () => {
    const [server, port] = await listen(() => null)
    try {
      expect(await free(port)).toBe(false)
    } finally {
      await stop(server)
    }
    expect(await free(port)).toBe(true)
  })

  test('a real manifest on a real port identifies the module by name', async () => {
    const [server, port] = await listen((path) =>
      path === WELL_KNOWN ? { status: 200, body: JSON.stringify({ kind: MANIFEST_KIND, id: ID }) } : null,
    )
    try {
      expect(await identify(port)).toEqual({ at: 'module', id: ID })

      const got = await claim({ id: ID, prefer: port })
      expect(got.status).toBe('already-running')
      expect(got.origin).toBe(originFor(port))
    } finally {
      await stop(server)
    }
  })

  test('a squatter that is not a module is drifted past, onto a port that really is free', async () => {
    const [server, port] = await listen(() => ({ status: 200, body: '{"hello":"i am not a module"}' }))
    try {
      const got = await claim({
        id: ID,
        prefer: port,
        registry: join(tmpdir(), 'roadmap-registry-that-is-not-there'),
      })
      expect(got.status).toBe('claimed')
      expect(got.moved).toBe(true)
      expect(got.status === 'claimed' && (await free(got.port))).toBe(true)
    } finally {
      await stop(server)
    }
  })

  /* A program that takes the socket and then says nothing is the failure a
     deadline exists for. Without one, a module would hang on start with no
     output at all, which reads as a broken module rather than a busy port. */
  test('a squatter that never answers is a stranger after the deadline, not a hang', async () => {
    const server = createServer(() => {
      /* Deliberately no response. */
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
    const address = server.address()
    const port = typeof address === 'object' && address ? address.port : 0
    try {
      const who = await identify(port, 120)
      expect(who.at).toBe('stranger')
      expect(who).toHaveProperty('why', expect.stringContaining('did not answer within'))
    } finally {
      server.closeAllConnections()
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })
})

describe('writing down where it answers', () => {
  const withRegistry = <T>(run: (where: string) => T): T => {
    const where = mkdtempSync(join(tmpdir(), 'roadmap-modules-'))
    const before = process.env.ROADMAP_MODULES_DIR
    process.env.ROADMAP_MODULES_DIR = where
    try {
      return run(where)
    } finally {
      if (before === undefined) delete process.env.ROADMAP_MODULES_DIR
      else process.env.ROADMAP_MODULES_DIR = before
    }
  }

  /* The NAME carries the id, and that is what makes the id unforgeable: a host
     reads it off the filename, so two files claiming one module cannot both
     exist. See `registerAt`, and the host's `server/registrations.ts`. */
  test('the file is named for the module', () => {
    withRegistry((where) => {
      const written = registerAt({ id: ID, origin: 'http://127.0.0.1:7961', dir: '/Users/x/Projects/example' })
      expect(written.file).toBe(join(where, 'roadmap.example.json'))
    })
  })

  test('the document says exactly what the host sweeps for', async () => {
    await withRegistry(async () => {
      const written = registerAt({ id: ID, origin: 'http://127.0.0.1:7961', dir: '/Users/x/Projects/example' })
      expect(JSON.parse(await Bun.file(written.file).text())).toEqual({
        url: 'http://127.0.0.1:7961',
        dir: '/Users/x/Projects/example',
      })
    })
  })

  /* The directory is created rather than assumed. A first module on a machine
     with no `~/.roadmap` would otherwise fail to register and start anyway,
     which is the silent nonexistence this whole file exists to prevent. */
  test('a registry directory that is not there yet is made', async () => {
    const parent = mkdtempSync(join(tmpdir(), 'roadmap-home-'))
    const where = join(parent, '.roadmap', 'modules')
    const before = process.env.ROADMAP_MODULES_DIR
    process.env.ROADMAP_MODULES_DIR = where
    try {
      expect(registryDir()).toBe(where)
      const written = registerAt({ id: ID, origin: 'http://127.0.0.1:7960', dir: parent })
      expect(await Bun.file(written.file).exists()).toBe(true)
    } finally {
      if (before === undefined) delete process.env.ROADMAP_MODULES_DIR
      else process.env.ROADMAP_MODULES_DIR = before
    }
  })

  /* Whoever starts last wins, and the entry that lost is named. Two checkouts of
     one module is the case: the registry can only describe one program, and the
     one worth framing is the one that is running. */
  test('a second checkout overwrites the first and says what it overwrote', () => {
    withRegistry(() => {
      registerAt({ id: ID, origin: 'http://127.0.0.1:7960', dir: '/Users/x/one' })
      const second = registerAt({ id: ID, origin: 'http://127.0.0.1:7961', dir: '/Users/x/two' })
      expect(second.was).toEqual({ url: 'http://127.0.0.1:7960', dir: '/Users/x/one' })
    })
  })

  test('rewriting the same address is not reported as a change', () => {
    withRegistry(() => {
      registerAt({ id: ID, origin: 'http://127.0.0.1:7960', dir: '/Users/x/one' })
      expect(registerAt({ id: ID, origin: 'http://127.0.0.1:7960', dir: '/Users/x/one' }).was).toBe(null)
    })
  })

  /* A filename derived from an id is a path built from data. Refused before it
     is joined, for the reason `moduleFolder` gives at length. */
  test('an id that is not a module id is refused rather than joined onto a path', () => {
    withRegistry(() => {
      expect(() => registerAt({ id: '../escape', origin: 'http://127.0.0.1:1', dir: '/x' })).toThrow()
    })
  })

})

describe('reading the neighbours', () => {
  test('collects every other module’s port and never this module’s own', () => {
    const where = mkdtempSync(join(tmpdir(), 'roadmap-modules-'))
    writeFileSync(join(where, 'roadmap.notes.json'), JSON.stringify({ url: 'http://127.0.0.1:7940', dir: '/a' }))
    writeFileSync(join(where, 'roadmap.paper.json'), JSON.stringify({ url: 'http://127.0.0.1:7950', dir: '/b' }))
    writeFileSync(join(where, `${ID}.json`), JSON.stringify({ url: 'http://127.0.0.1:7960', dir: '/c' }))

    expect(neighbourPorts(ID, where)).toEqual(new Set([7940, 7950]))
  })

  /* A registry is a directory people put files in. Anything unreadable there is
     one module the drift will not step over, which is a smaller failure than a
     module refusing to start because somebody left a note in the folder. */
  test('a directory that is not there, and files that are not registrations, are simply nothing', () => {
    const where = mkdtempSync(join(tmpdir(), 'roadmap-modules-'))
    mkdirSync(join(where, 'a-folder'), { recursive: true })
    writeFileSync(join(where, 'README.txt'), 'not a registration')
    writeFileSync(join(where, 'roadmap.broken.json'), 'this is not json')
    writeFileSync(join(where, 'roadmap.urlless.json'), '{"dir":"/a"}')

    expect(neighbourPorts(ID, where)).toEqual(new Set())
    expect(neighbourPorts(ID, join(where, 'nowhere-at-all'))).toEqual(new Set())
  })

  test('reads a registration that names no directory rather than discarding it', () => {
    const where = mkdtempSync(join(tmpdir(), 'roadmap-modules-'))
    const file = join(where, 'roadmap.terminal.json')
    writeFileSync(file, JSON.stringify({ url: 'http://127.0.0.1:7930' }))
    expect(readRegistration(file)).toEqual({ url: 'http://127.0.0.1:7930', dir: '' })
    expect(neighbourPorts(ID, where)).toEqual(new Set([7930]))
  })

  test('an origin with no port in it is not a claim on port 0', () => {
    expect(portOf('http://example.test/')).toBe(null)
    expect(portOf('not a url')).toBe(null)
    expect(portOf('http://127.0.0.1:7960')).toBe(7960)
  })
})

/**
 * The host spawns `run.sh` with `PORT` set to the port in the registration.
 * A module that ignored it would prefer a different port from the one the host
 * is about to look at, and drift away from its own recorded address.
 */
describe('which port is preferred', () => {
  test('the environment wins when it says something usable', () => {
    expect(preferred(7960, { PORT: '7961' })).toBe(7961)
  })

  test('and the constant beside the id wins whenever it does not', () => {
    expect(preferred(7960, {})).toBe(7960)
    expect(preferred(7960, { PORT: '' })).toBe(7960)
    expect(preferred(7960, { PORT: 'yes please' })).toBe(7960)
    expect(preferred(7960, { PORT: '0' })).toBe(7960)
    expect(preferred(7960, { PORT: '99999' })).toBe(7960)
  })
})
