import { z } from 'zod'

import { LIMITS } from './limits.js'

/**
 * Traffic (2.20.0): the record of the calls Kehikot and its modules make and receive on this
 * computer — when, what kind, to where, and for what reason — and never what they carried. Shapes
 * and the one sanitizer, so a host and a module strip a call the same way. The recording is a host's;
 * the module half is `trafficNotes` in `/serve`. Design notes: docs/traffic.md.
 */

/**
 * Which way a call went, from `by`'s side. `out`: `by` made it. `in`: the host received it from `by`
 * (its own routes, asked by a page or a module's server). `seen`: a connection the host saw open on
 * one of `by`'s processes, which nobody reported — so it has no reason.
 */
export const TRAFFIC_SIDES = ['out', 'in', 'seen'] as const
export type TrafficSide = (typeof TRAFFIC_SIDES)[number]

/** Which part of `by` it was: its server, its page (in the canvas), or a process it runs. */
export const TRAFFIC_VIA = ['server', 'page', 'process'] as const
export type TrafficVia = (typeof TRAFFIC_VIA)[number]

/**
 * Who says a row happened. `host`: the host recorded it as it made or received it. `module`: the
 * module noted it (`traffic.note`). `sampled`: the host saw the connection on a process. Stated by the
 * recorder, never by the caller, so a module cannot file its own calls as anything else.
 */
export const TRAFFIC_REPORTERS = ['host', 'module', 'sampled'] as const
export type TrafficReporter = (typeof TRAFFIC_REPORTERS)[number]

/**
 * A call that did not go over the network, or went and was free. `hit`: answered from a cache, so
 * nothing was sent. `not-modified`: sent with a validator and answered 304, which costs no budget.
 * `refused`: held back by a budget, so nothing was sent. Absent: an ordinary call.
 */
export const TRAFFIC_CACHE = ['hit', 'not-modified', 'refused'] as const
export type TrafficCache = (typeof TRAFFIC_CACHE)[number]

/** The id the host's own calls are filed under: the host's name on the wire. */
export const TRAFFIC_HOST_BY = 'kehikko'

const reason = z.string().trim().min(1).max(LIMITS.TRAFFIC_REASON)
const kind = z.string().trim().min(1).max(LIMITS.TRAFFIC_KIND)
const host = z.string().max(LIMITS.TRAFFIC_HOST)
const path = z.string().max(LIMITS.TRAFFIC_PATH)
const bytes = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER)
/** Milliseconds since the epoch. */
const instant = z.number().int().min(0)
/** How long a call took, in ms; bounded at an hour, longer than anything worth charting. */
const took = z.number().int().min(0).max(3_600_000)

/**
 * What a module says about one call it made (`traffic.note`). `host` and `path` are what
 * `trafficTarget` makes of the address — sanitize before sending; a host sanitizes again on receipt.
 * `status` is the HTTP status, or a command's exit code; `reason` a short plain phrase from the call
 * site ("release list", "compile"), or null when the module has none to give.
 */
export const trafficNoteSchema = z.object({
  at: instant,
  ms: took.nullable().default(null),
  reason: reason.nullable().default(null),
  kind,
  host,
  path,
  status: z.number().int().min(-1).max(999).nullable().default(null),
  ok: z.boolean().nullable().default(null),
  bytesIn: bytes.optional(),
  bytesOut: bytes.optional(),
  cache: z.enum(TRAFFIC_CACHE).optional(),
})
export type TrafficNote = z.infer<typeof trafficNoteSchema>
export type TrafficNoteInput = z.input<typeof trafficNoteSchema>

/**
 * One row of the record. A note, stamped by the recorder with its place in the record (`seq`), who
 * (`by`: `TRAFFIC_HOST_BY`, a module id, or `''` when the host could not tell), which part of them
 * (`via`), which way (`side`) and who says so (`reported`).
 */
export const trafficCallSchema = trafficNoteSchema.extend({
  seq: z.number().int().min(1),
  by: z.string().max(LIMITS.TRAFFIC_BY),
  via: z.enum(TRAFFIC_VIA),
  side: z.enum(TRAFFIC_SIDES),
  reported: z.enum(TRAFFIC_REPORTERS),
})
export type TrafficCall = z.infer<typeof trafficCallSchema>

/**
 * An allowance a host spends on somebody's behalf: GitHub's API for a person not signed in, say.
 * `left` of `limit` until `resets` (ms since the epoch, null when unknown).
 */
export const trafficBudgetSchema = z.object({
  name: z.string().min(1).max(LIMITS.TITLE),
  used: z.number().int().min(0),
  limit: z.number().int().min(0),
  left: z.number().int().min(0),
  resets: instant.nullable(),
  /** A sentence: whose allowance it is, or why it is not counted. */
  note: z.string().max(LIMITS.REASON).default(''),
})
export type TrafficBudget = z.infer<typeof trafficBudgetSchema>

const count = z.number().int().min(0)

/**
 * Kehikot's own share of one of an account's limits (2.24.0): at most `limit` of it in the account's
 * window, of which it has spent `used`. A share the host keeps for itself, so the person's own use,
 * their CI and their other apps keep the rest.
 */
export const trafficShareSchema = z.object({
  limit: count,
  used: count,
})
export type TrafficShare = z.infer<typeof trafficShareSchema>

/**
 * One of an account's limits as the forge last said it (2.24.0): GitHub's `core` (REST calls) or
 * `graphql` (points), GitLab's API. `used` and `remaining` of `limit`, whoever spent them, until
 * `resets` (ms since the epoch, null when unknown). `share`: Kehikot's own part of it, null when the
 * host keeps none. `floor`: how much of `remaining` the host leaves alone — below it, it reads
 * nothing, null when it keeps no floor.
 */
export const trafficAllowanceSchema = z.object({
  limit: count,
  used: count,
  remaining: count,
  resets: instant.nullable(),
  share: trafficShareSchema.nullable().default(null),
  floor: count.nullable().default(null),
})
export type TrafficAllowance = z.infer<typeof trafficAllowanceSchema>

/**
 * What a host knows of the account it calls a forge as (2.24.0): the person's own login, signed in
 * through their `gh` or `glab`. `login`: the name, null when the host cannot say it without a call.
 * `core`: the REST limit (GitLab's only one). `graphql`: GitHub's GraphQL points; null on GitLab or
 * when not yet known. `paused`: the host is holding the calls it may hold, and `why` says so in a
 * sentence, until `until` (null when it cannot say). `at`: when the numbers were last learned, null
 * when never — a host reads them for free (`gh api rate_limit`) or from the answers it already gets.
 */
export const trafficAccountSchema = z.object({
  login: z.string().max(LIMITS.TRAFFIC_BY).nullable().default(null),
  core: trafficAllowanceSchema.nullable().default(null),
  graphql: trafficAllowanceSchema.nullable().default(null),
  paused: z.boolean().default(false),
  why: z.string().max(LIMITS.REASON).default(''),
  until: instant.nullable().default(null),
  at: instant.nullable().default(null),
})
export type TrafficAccount = z.infer<typeof trafficAccountSchema>

/**
 * Each forge's budgets, separately (2.24.0). `github.account`: the person's signed-in account, null
 * when `gh` is not signed in. `github.anonymous`: the host's own hourly budget for reading GitHub
 * without an account — the same row as in `budgets`. `gitlab.account`: the person's `glab` account,
 * when it is signed in and cheap to read. A forge the host says nothing about is absent.
 */
export const trafficLimitsSchema = z.object({
  github: z
    .object({
      account: trafficAccountSchema.nullable().default(null),
      anonymous: trafficBudgetSchema.nullable().default(null),
    })
    .optional(),
  gitlab: z.object({ account: trafficAccountSchema.nullable().default(null) }).optional(),
})
export type TrafficLimits = z.infer<typeof trafficLimitsSchema>

/**
 * One connection open on a process of `by` when the host last looked (`processes`). `remote` is the
 * other end's address (a name when the host looked it up cheaply), `bytesIn`/`bytesOut` what the
 * connection carried since it opened, absent when the host cannot see bytes.
 */
export const trafficConnectionSchema = z.object({
  by: z.string().max(LIMITS.TRAFFIC_BY),
  pid: z.number().int().min(0),
  process: z.string().max(LIMITS.TRAFFIC_KIND),
  proto: z.enum(['tcp', 'udp']),
  remote: host,
  port: z.number().int().min(0).max(65_535),
  /** Whether the other end is this computer. */
  local: z.boolean(),
  bytesIn: bytes.optional(),
  bytesOut: bytes.optional(),
  /** When the host first saw it open. */
  since: instant,
})
export type TrafficConnection = z.infer<typeof trafficConnectionSchema>

/**
 * What the host can see of its processes' connections. `on`: it is looking (only while somebody
 * reads with `sample: true`). `bytes`: whether it can see what they carried. `why`: a sentence when
 * it cannot look, or cannot see bytes.
 */
export const trafficProcessesSchema = z.object({
  on: z.boolean(),
  bytes: z.boolean(),
  at: instant.nullable(),
  why: z.string().max(LIMITS.REASON).default(''),
  connections: z.array(trafficConnectionSchema).max(LIMITS.TRAFFIC_CONNECTIONS).default([]),
})
export type TrafficProcesses = z.infer<typeof trafficProcessesSchema>

/**
 * `traffic.read`'s answer. `calls`: the rows after `since`, oldest first, at most `limit`. `newest`:
 * the last `seq` written (ask again with it as `since`). `oldest`: the first still kept; a `since`
 * older than it lost rows, and `gap` says so. `kept`: how many rows the host keeps at most.
 * `started`: when this host started recording; a host that restarted starts `seq` again, so a reader
 * whose `since` is past `newest` starts over.
 */
export const trafficReadResult = z.object({
  calls: z.array(trafficCallSchema).max(LIMITS.TRAFFIC_KEPT),
  newest: z.number().int().min(0),
  oldest: z.number().int().min(0),
  gap: z.boolean().default(false),
  kept: z.number().int().min(0),
  started: instant,
  budgets: z.array(trafficBudgetSchema).max(16).default([]),
  processes: trafficProcessesSchema.nullable().default(null),
  /**
   * Each forge's budgets, separately (2.24.0; `trafficLimitsSchema`). Absent from a host before
   * 2.24.0, which says only `budgets`; a host that has it still fills `budgets`, so an older reader
   * keeps working. One that does not parse is dropped, not fatal.
   */
  limits: trafficLimitsSchema.optional().catch(undefined),
})
export type TrafficReadResult = z.infer<typeof trafficReadResult>

/** `traffic.note`'s answer: `taken` with how many rows were written, or `declined` with a sentence. */
export const TRAFFIC_NOTE_OUTCOMES = ['taken', 'declined'] as const
export const trafficNoteResult = z.object({
  outcome: z.enum(TRAFFIC_NOTE_OUTCOMES),
  taken: z.number().int().min(0).default(0),
  why: z.string().max(LIMITS.REASON).default(''),
})
export type TrafficNoteResult = z.infer<typeof trafficNoteResult>

/* ------------------------------------------------------------------------ *
 * Sanitizing: what of an address may be recorded.
 * ------------------------------------------------------------------------ */

/** What stands in for anything taken out of an address: a query value, a token in the path. */
export const TRAFFIC_REDACTED = '…'

/** Prefixes of credentials that are recognised whatever their length. */
const TOKEN_PREFIX = /^(gh[pousr]_|github_pat_|glpat-|gldt-|glrt-|xox[abprs]-|sk-|sk_|pk_|AKIA|ASIA|ya29\.|Bearer)/i

/**
 * Whether one path segment (or a value) looks like a secret: a known credential prefix, a JWT, or a
 * long run of token characters that mixes letters and digits. A commit sha (40 hex) is a secret by
 * this rule too: it is cheap to lose, and telling the two apart is not worth a leak.
 */
export function looksSecret(segment: string): boolean {
  if (!segment) return false
  if (TOKEN_PREFIX.test(segment)) return true
  if (/^[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}$/.test(segment)) return true
  if (segment.length >= 24 && /^[A-Za-z0-9_\-+/=.~%]+$/.test(segment) && /[0-9]/.test(segment) && /[A-Za-z]/.test(segment)) return true
  return false
}

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}${TRAFFIC_REDACTED}` : text)

/** A query string with every value taken out and keys that look like secrets dropped: `?page=…&per_page=…`. */
function query(search: string): string {
  if (!search || search === '?') return ''
  const keys: string[] = []
  for (const part of search.replace(/^\?/, '').split('&')) {
    if (!part) continue
    const key = part.split('=')[0] ?? ''
    let named = key
    try {
      named = decodeURIComponent(key)
    } catch {
      /* Kept as written. */
    }
    if (!named || looksSecret(named)) continue
    keys.push(`${encodeURIComponent(named).slice(0, 40)}=${TRAFFIC_REDACTED}`)
  }
  return keys.length ? `?${keys.join('&')}` : ''
}

/** A path with each segment that looks like a secret replaced: `/repos/x/y/git/…`. */
function segments(pathname: string): string {
  return pathname
    .split('/')
    .map((segment) => {
      let plain = segment
      try {
        plain = decodeURIComponent(segment)
      } catch {
        /* Kept as written. */
      }
      return looksSecret(plain) ? TRAFFIC_REDACTED : segment
    })
    .join('/')
}

/**
 * The path and query of a request as it may be recorded: segments that look like secrets replaced,
 * every query value taken out (keys kept, `?page=…`), the fragment dropped, and bounded at
 * `LIMITS.TRAFFIC_PATH`. For a path a host received; `trafficTarget` for a whole address.
 */
export function trafficPath(pathAndQuery: string): string {
  const raw = String(pathAndQuery ?? '').split('#')[0] ?? ''
  const at = raw.indexOf('?')
  const pathname = at < 0 ? raw : raw.slice(0, at)
  const search = at < 0 ? '' : raw.slice(at)
  return clip(`${segments(pathname || '/')}${query(search)}`, LIMITS.TRAFFIC_PATH)
}

/**
 * Where a call went, as it may be recorded: `host` (the name, and the port when it is not the
 * scheme's) and `path` (`trafficPath`). Never the user, the password, a query value or the fragment.
 * Takes a URL, a git remote in scp form (`git@github.com:owner/repo.git`) or a bare host name;
 * anything else is `{ host: '', path: '' }`. Pure; never throws.
 */
export function trafficTarget(address: string | URL): { host: string; path: string } {
  const text = typeof address === 'string' ? address.trim() : String(address)
  if (!text) return { host: '', path: '' }
  let url: URL | null = null
  try {
    url = new URL(text)
  } catch {
    url = null
  }
  if (url && url.host) {
    return { host: clip(url.host.toLowerCase(), LIMITS.TRAFFIC_HOST), path: trafficPath(`${url.pathname}${url.search}`) }
  }
  /* git's scp form: [user@]host:path, where host has no slash before the colon. */
  const scp = /^(?:[^@/\s]+@)?([A-Za-z0-9.-]+):(?!\/\/)(.*)$/.exec(text)
  if (scp && scp[1]) return { host: clip(scp[1].toLowerCase(), LIMITS.TRAFFIC_HOST), path: trafficPath(`/${(scp[2] ?? '').replace(/^\/+/, '')}`) }
  if (/^[A-Za-z0-9.-]+(?::\d{1,5})?$/.test(text)) return { host: clip(text.toLowerCase(), LIMITS.TRAFFIC_HOST), path: '' }
  return { host: '', path: '' }
}

/** What `trafficCommand` makes of a program run: its kind (`git fetch`, `gh api`) and where it went. */
export interface TrafficCommand {
  kind: string
  host: string
  path: string
}

const GIT_NETWORK = new Set(['fetch', 'clone', 'ls-remote', 'pull', 'push', 'remote-update'])

/** The first argument after `skip` options, past any `-C <dir>` / `-c <k=v>` pairs git takes before its subcommand. */
function gitSubcommand(argv: readonly string[]): { at: number; name: string } | null {
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i] ?? ''
    if (arg === '-C' || arg === '-c' || arg === '--git-dir' || arg === '--work-tree') {
      i++
      continue
    }
    if (arg.startsWith('-')) continue
    return { at: i, name: arg }
  }
  return null
}

/**
 * Whether a program run went over the network, and how it is recorded: `git fetch`/`clone`/
 * `ls-remote`/`pull`/`push` (`host` and `path` from the remote when it is an address; a remote NAME
 * is recorded as written, with no host), `gh <command>` (`gh api <path>`, `api.github.com` or
 * `--hostname`), `glab <command>`. Null for anything else — `git rev-parse` reads a disk, not a
 * network. Arguments that are not the remote or the API path are never recorded. Pure.
 */
export function trafficCommand(argv: readonly string[]): TrafficCommand | null {
  const program = (argv[0] ?? '').split('/').pop() ?? ''
  if (program === 'git') {
    const sub = gitSubcommand(argv)
    if (!sub || !GIT_NETWORK.has(sub.name)) return null
    const rest = argv.slice(sub.at + 1).filter((arg) => !arg.startsWith('-'))
    const remote = rest[0] ?? ''
    /* An address (`https://…`, `git@host:path`) is a host and a path; anything else is a remote's NAME. */
    const addressed = remote.includes('://') || /^(?:[^@/\s]+@)?[A-Za-z0-9.-]+:(?!\/\/)/.test(remote)
    const target = addressed ? trafficTarget(remote) : { host: '', path: '' }
    return { kind: `git ${sub.name}`, host: target.host, path: target.host ? target.path : clip(looksSecret(remote) ? TRAFFIC_REDACTED : remote, LIMITS.TRAFFIC_PATH) }
  }
  if (program === 'gh' || program === 'glab') {
    const args = argv.slice(1)
    let hostname = program === 'gh' ? 'api.github.com' : 'gitlab.com'
    const words: string[] = []
    for (let i = 0; i < args.length; i++) {
      const arg = args[i] ?? ''
      if (arg === '--hostname') {
        const named = args[i + 1] ?? ''
        if (/^[A-Za-z0-9.-]+(?::\d{1,5})?$/.test(named)) hostname = named.toLowerCase()
        i++
        continue
      }
      if (arg === '-H' || arg === '--header' || arg === '-f' || arg === '-F' || arg === '--field' || arg === '--raw-field' || arg === '--jq' || arg === '-q' || arg === '--template' || arg === '-t' || arg === '--body' || arg === '-b' || arg === '--title' || arg === '--repo' || arg === '-R' || arg === '--json' || arg === '--input' || arg === '--method' || arg === '-X' || arg === '--search' || arg === '--state' || arg === '--limit' || arg === '-L' || arg === '--label' || arg === '--body-file') {
        i++
        continue
      }
      if (arg.startsWith('-')) continue
      words.push(arg)
    }
    if (!words.length) return null
    if (words[0] === 'api') {
      const target = words[1] ?? ''
      return { kind: `${program} api`, host: hostname, path: trafficPath(target.startsWith('/') ? target : `/${target}`) }
    }
    if (words[0] === 'auth' || words[0] === 'config' || words[0] === 'version' || words[0] === 'help' || words[0] === 'completion' || words[0] === 'alias') return null
    /* `gh issue list`, `gh repo view`: the command, never its other arguments. */
    const command = words.slice(0, 2).filter((word) => /^[a-z][a-z-]{0,20}$/.test(word))
    return { kind: clip(`${program} ${command.join(' ')}`, LIMITS.TRAFFIC_KIND), host: hostname, path: '' }
  }
  return null
}
