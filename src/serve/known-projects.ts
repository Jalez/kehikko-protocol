import type { PickedProject } from '../methods.js'
import { askHost, type AskedHost, type AskHostOptions } from './ask.js'

/**
 * 2.76.0. The projects a module's server picks up at start: the ones the host says this module keeps
 * its folder in (`projects.mine`), each handed to the module's own `know`. Node-only, like the rest
 * of `/serve`. Design notes: docs/server-ask.md, "The projects a module keeps something in".
 *
 * A module that runs things for a project — an agent module's conversations, which a message is
 * delivered to by typing (`messageDelivery`) — learns of a project when a page framed in it asks, or
 * when one of its sessions reports in. After a restart of Kehikot or of the module, a project nobody
 * has opened since is not known, so what the module runs there waits for somebody to open it. Asking
 * the host at start closes that gap without anything new kept anywhere: the host holds the person's
 * projects, and the module's own folder says which of them it has something in.
 *
 *     watchKnownProjects({ module: ID, know: (path) => runs.know(path) }).start()
 *
 * On a host that does not answer `projects.mine` (older than 2.76.0, or the manifest does not declare
 * `projects:read`) it stops asking, and the module goes on as before: it learns of a project when a
 * page or a session names it. Never throws.
 */

/** How often the host is asked again once it has answered, in ms: a project added meanwhile is picked up on this clock. */
export const KNOWN_PROJECTS_EVERY_MS = 5 * 60_000
/** How soon the host is asked again when none answered yet (Kehikot is starting, or the module started first), in ms. */
export const KNOWN_PROJECTS_RETRY_MS = 15_000

export interface KnownProjectsOptions extends Omit<AskHostOptions, 'project'> {
  /**
   * Take this project in: the module's own "a page named this project". Called once per project per
   * process, with its absolute folder (as the host holds it) and what the host said of it.
   */
  know(path: string, project: PickedProject): void | Promise<void>
  /** How often to ask again after an answer, in ms. Default `KNOWN_PROJECTS_EVERY_MS`. */
  everyMs?: number
  /** How soon to ask again when no host answered, in ms. Default `KNOWN_PROJECTS_RETRY_MS`. */
  retryMs?: number
  /** Injected by the tests: `projects.mine`. Default `askHost`. */
  ask?: () => Promise<AskedHost<'projects.mine'>>
  log?: (line: string) => void
}

/** What one look came to: the projects newly handed to `know`, and whether the host will ever answer. */
export interface KnownProjectsTick {
  /** The folders handed to `know` by this look, in the host's order. */
  added: string[]
  /** `answered`: the host listed them. `never`: it cannot for this module (too old, or not declared). `not-now`: no host answered yet. */
  said: 'answered' | 'never' | 'not-now'
}

export interface KnownProjects {
  /** Ask once. Never throws. */
  tick(): Promise<KnownProjectsTick>
  /** Ask now, then on the clock: `everyMs` after an answer, `retryMs` while no host answers, never again after `never`. */
  start(): void
  stop(): void
  /** The folders handed to `know` so far. */
  known(): string[]
}

/** 2.76.0. Ask the host which projects this module keeps its folder in, at start and on a slow clock, and `know` each one once. */
export function watchKnownProjects(options: KnownProjectsOptions): KnownProjects {
  const { know, everyMs = KNOWN_PROJECTS_EVERY_MS, retryMs = KNOWN_PROJECTS_RETRY_MS, ask: askFor, log = () => {}, ...rest } = options
  const ask = askFor ?? (() => askHost('projects.mine', {}, rest))
  const told = new Set<string>()
  let timer: ReturnType<typeof setTimeout> | null = null
  let running = false
  let busy: Promise<KnownProjectsTick> | null = null

  async function look(): Promise<KnownProjectsTick> {
    let asked: AskedHost<'projects.mine'>
    try {
      asked = await ask()
    } catch {
      return { added: [], said: 'not-now' }
    }
    if (!asked.ok) {
      const never = asked.declined === 'host-too-old' || asked.refused === 'grant'
      if (never) log(`the host does not say which projects this module keeps something in (${asked.why}); a project is picked up when it is opened`)
      return { added: [], said: never ? 'never' : 'not-now' }
    }
    const added: string[] = []
    for (const project of asked.data.projects) {
      if (told.has(project.path)) continue
      told.add(project.path)
      added.push(project.path)
      try {
        await know(project.path, project)
      } catch (error) {
        log(`taking in ${project.path} failed — ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    if (added.length) log(`picked up ${added.length} project${added.length === 1 ? '' : 's'} this module keeps something in`)
    return { added, said: 'answered' }
  }

  function tick(): Promise<KnownProjectsTick> {
    busy ??= look().finally(() => {
      busy = null
    })
    return busy
  }

  function schedule(delay: number): void {
    if (!running) return
    timer = setTimeout(() => {
      timer = null
      void tick().then((done) => {
        if (done.said === 'never') running = false
        else schedule(done.said === 'answered' ? everyMs : retryMs)
      })
    }, delay)
    ;(timer as { unref?: () => void }).unref?.()
  }

  return {
    tick,
    start() {
      if (running) return
      running = true
      schedule(0)
    },
    stop() {
      running = false
      if (timer) clearTimeout(timer)
      timer = null
    },
    known: () => [...told],
  }
}
