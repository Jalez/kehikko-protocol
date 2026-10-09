import { readFileSync, realpathSync } from 'node:fs'
import { isAbsolute } from 'node:path'

import { JOURNEYS_FILE, JOURNEYS_MODULE, journeyIn, type JourneyRecord } from '../journey.js'
import { moduleFile, within } from '../project.js'

/**
 * Reads a project's journeys document off disk, or null for every way of there being nothing to read:
 * no project, a relative path, no file, not JSON, not an object. Never throws and never writes.
 * A file that resolves (through a symlink) outside the project is not followed: null.
 */
export function readJourneys(projectPath: string | null | undefined): Record<string, unknown> | null {
  let path: string | null
  try {
    path = moduleFile(projectPath, JOURNEYS_MODULE, JOURNEYS_FILE)
  } catch {
    return null
  }
  if (path === null || typeof projectPath !== 'string') return null
  /* A relative path would be resolved against this process's working directory, which is a guess
     about which project was meant. */
  if (!isAbsolute(projectPath.trim())) return null
  try {
    if (!within(realpathSync(projectPath.trim()), realpathSync(path))) return null
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/**
 * The record a project keeps for one epic, or null: `readJourneys` then `journeyIn`. A caller walking
 * every epic reads the document once and asks `journeyIn` per slug.
 */
export function readJourney(projectPath: string | null | undefined, slug: string): JourneyRecord | null {
  return journeyIn(readJourneys(projectPath), slug)
}
