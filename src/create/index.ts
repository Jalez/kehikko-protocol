import { spawnSync } from 'node:child_process'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { MODULE_ID } from '../ids.js'
import { moduleFolder } from '../project.js'
import { originFor } from '../serve/ports.js'
import { portOf, readRegistration, registerAt, registryDir } from '../serve/registry.js'

/**
 * `bun run create <name>`: a new module, generated from `template/`.
 *
 * Node-only, like `/serve`, and deliberately not behind any entry point in
 * `exports`: it is run from a checkout (`bin/create.ts`), never imported by a
 * module. Every step is its own function so the tests can take them apart.
 */

/** The lowest port a new module is given. Everything below it was handed out by hand. */
export const PORT_FLOOR = 7960
/** Modules sit ten apart, so one drifting up a few ports never lands on a neighbour. */
export const PORT_STEP = 10

export const PLACEHOLDERS = ['__MODULE_ID__', '__MODULE_NAME__', '__MODULE_FOLDER__', '__MODULE_PACKAGE__', '__MODULE_PORT__'] as const
export type Placeholder = (typeof PLACEHOLDERS)[number]

/** A short name, lowercase, dashes between words: `slides`, `reading-list`. */
const NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/

export interface Names {
  /** `roadmap.slides` */
  id: string
  /** `Slides`, for people. */
  name: string
  /** `slides`, the folder under `.kehikot/`. */
  folder: string
  /** `kehikko-slides`, the package and the default directory. */
  pkg: string
}

/**
 * Everything a module is called, from the one word a person typed.
 *
 * Narrower than `MODULE_ID` on purpose: the name also becomes a package name,
 * a directory, a header name and a folder, and a dot in any of those is a
 * question nobody needs to answer. The id is still checked against the
 * protocol's own rule, so the two can never disagree.
 */
export function namesFor(raw: string): Names {
  const short = raw.trim()
  if (!NAME.test(short)) {
    throw new Error(
      `"${raw}" is not a module name. Use lowercase letters and digits, with dashes between words — `
        + '"slides", "reading-list" — starting with a letter.',
    )
  }
  const id = `roadmap.${short}`
  if (!MODULE_ID.test(id)) throw new Error(`"${id}" is not a module id the protocol accepts (too long?).`)
  const words = short.split('-').join(' ')
  return { id, name: words.charAt(0).toUpperCase() + words.slice(1), folder: moduleFolder(id), pkg: `kehikko-${short}` }
}

export function placeholderValues(names: Names, port: number): Record<Placeholder, string> {
  return {
    __MODULE_ID__: names.id,
    __MODULE_NAME__: names.name,
    __MODULE_FOLDER__: names.folder,
    __MODULE_PACKAGE__: names.pkg,
    __MODULE_PORT__: String(port),
  }
}

/** Every placeholder replaced, everywhere it appears. Anything else in the text is left alone. */
export function fill(text: string, values: Record<Placeholder, string>): string {
  let out = text
  for (const key of PLACEHOLDERS) out = out.split(key).join(values[key])
  return out
}

/**
 * The ports already spoken for: every registered module's url, and the
 * `PREFERRED_PORT` in each registered checkout's `manifest.ts` where one can be
 * read. A module that is not registered is not visible here, and that is
 * accepted — the plugin moves a module off a taken port when it starts.
 */
export function takenPorts(where = registryDir()): Set<number> {
  const taken = new Set<number>()
  let names: string[]
  try {
    names = readdirSync(where)
  } catch {
    return taken
  }
  for (const name of names) {
    if (!name.endsWith('.json')) continue
    const registration = readRegistration(join(where, name))
    if (!registration) continue
    const port = portOf(registration.url)
    if (port !== null) taken.add(port)
    const preferred = preferredPortIn(registration.dir)
    if (preferred !== null) taken.add(preferred)
  }
  return taken
}

function preferredPortIn(dir: string): number | null {
  if (!dir) return null
  try {
    const text = readFileSync(join(dir, 'manifest.ts'), 'utf8')
    const found = /export const PREFERRED_PORT\s*=\s*(\d+)/.exec(text)
    return found ? Number(found[1]) : null
  } catch {
    return null
  }
}

/**
 * The port for a new module: the highest taken port (or the floor, whichever is
 * higher), rounded up to the ten-apart grid, then up by ten until nothing has it.
 */
export function choosePort(taken: Iterable<number>, floor = PORT_FLOOR): number {
  const ports = new Set(taken)
  let port = Math.ceil(Math.max(floor, ...ports) / PORT_STEP) * PORT_STEP
  while (ports.has(port)) port += PORT_STEP
  return port
}

/** `template/` beside `src/` and `dist/`, which is the same place from either. */
export function templateDir(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'template')
}

/**
 * Copy the template into `to`, filling placeholders in contents and in names.
 * `gitignore` becomes `.gitignore`: a package drops a file called .gitignore.
 * Returns the paths written, relative to `to`.
 */
export function copyTemplate(from: string, to: string, values: Record<Placeholder, string>): string[] {
  const written: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir).sort()) {
      if (entry === 'node_modules') continue
      const source = join(dir, entry)
      if (statSync(source).isDirectory()) {
        walk(source)
        continue
      }
      let target = fill(relative(from, source), values)
      if (target === 'gitignore') target = '.gitignore'
      const path = join(to, target)
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, fill(readFileSync(source, 'utf8'), values))
      written.push(target)
    }
  }
  walk(from)
  return written
}

export interface CreateOptions {
  name: string
  /** Defaults to `~/Projects/kehikko-<name>`. */
  dir?: string
  /** Write the registration, putting the module on this machine's host. */
  register?: boolean
  /**
   * What the new module's `roadmap-module-protocol` dependency says, instead of
   * the GitHub source — e.g. `file:/path/to/this/checkout`. The protocol's own
   * test uses it so a generated module is tested against the protocol as it is
   * now, offline.
   */
  protocolSource?: string
  /** Each step can be skipped, for tests. All default to true. */
  git?: boolean
  install?: boolean
  test?: boolean
  /** Where progress goes. Silent by default. */
  log?: (line: string) => void
}

export interface Created {
  names: Names
  dir: string
  port: number
  files: string[]
  /** The registration file, when `register` was asked for. */
  registered: string | null
}

export function defaultDir(names: Names): string {
  return join(homedir(), 'Projects', names.pkg)
}

/** The whole command. Throws a sentence when it refuses or a step fails. */
export function create(options: CreateOptions): Created {
  const log = options.log ?? (() => {})
  const names = namesFor(options.name)
  const dir = resolve(options.dir ?? defaultDir(names))

  if (existsSync(dir) && readdirSync(dir).length > 0) {
    throw new Error(`${dir} already exists and is not empty. Nothing was written; pick another --dir.`)
  }
  const already = readRegistration(join(registryDir(), `${names.id}.json`))
  if (already) {
    throw new Error(`${names.id} is already registered, from ${already.dir || already.url}. Pick another name.`)
  }

  const port = choosePort(takenPorts())
  log(`${names.id} → ${dir}, port ${port}`)

  mkdirSync(dir, { recursive: true })
  const files = copyTemplate(templateDir(), dir, placeholderValues(names, port))
  chmodSync(join(dir, 'run.sh'), 0o755)
  if (options.protocolSource) pointProtocolAt(dir, options.protocolSource)

  if (options.git ?? true) run('git', ['init', '-q'], dir, log)
  if (options.install ?? true) run('bun', ['install'], dir, log)
  if (options.test ?? true) run('bun', ['test'], dir, log)

  let registered: string | null = null
  if (options.register) {
    registered = registerAt({ id: names.id, origin: originFor(port), dir }).file
    log(`registered: ${registered}`)
  }
  return { names, dir, port, files, registered }
}

function pointProtocolAt(dir: string, source: string): void {
  const file = join(dir, 'package.json')
  const pkg = JSON.parse(readFileSync(file, 'utf8')) as { dependencies: Record<string, string> }
  pkg.dependencies['roadmap-module-protocol'] = source
  writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`)
}

/** One step, its output kept and shown only when it fails. */
export function run(command: string, args: string[], cwd: string, log: (line: string) => void = () => {}): string {
  log(`$ ${command} ${args.join(' ')}`)
  const done = spawnSync(command, args, { cwd, encoding: 'utf8', env: process.env })
  const output = `${done.stdout ?? ''}${done.stderr ?? ''}`
  if (done.error) throw new Error(`could not run ${command}: ${done.error.message}`)
  if (done.status !== 0) {
    throw new Error(`\`${command} ${args.join(' ')}\` failed in ${cwd} (exit ${done.status}):\n${output.slice(-4000)}`)
  }
  return output
}

export interface Args {
  name: string
  dir?: string
  register: boolean
}

export const USAGE = 'usage: bun run create <name> [--dir <path>] [--register]'

/** The command line, or a sentence saying what is wrong with it. */
export function parseArgs(argv: string[]): Args | string {
  let name: string | undefined
  let dir: string | undefined
  let register = false
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!
    if (arg === '--register') register = true
    else if (arg === '--dir') {
      dir = argv[i + 1]
      if (!dir) return `--dir needs a path.\n${USAGE}`
      i += 1
    } else if (arg.startsWith('--dir=')) dir = arg.slice('--dir='.length)
    else if (arg === '-h' || arg === '--help') return USAGE
    else if (arg.startsWith('-')) return `unknown option ${arg}\n${USAGE}`
    else if (name === undefined) name = arg
    else return `one name at a time.\n${USAGE}`
  }
  if (!name) return USAGE
  return { name, register, ...(dir ? { dir } : {}) }
}

/** What to do next, printed after a successful create. */
export function nextSteps(created: Created): string {
  const lines = [
    `Created ${created.names.id} (${created.names.name}) in ${created.dir}, preferring port ${created.port}.`,
    '',
    'Next:',
    `  cd ${created.dir}`,
    '  ./run.sh                      # starts it; open http://127.0.0.1:' + created.port + '/app',
  ]
  if (!created.registered) lines.push('  bun run register              # puts it on this machine’s host')
  lines.push(`  gh repo create ${created.names.pkg} --private --source . --push   # after a first commit`)
  return lines.join('\n')
}
