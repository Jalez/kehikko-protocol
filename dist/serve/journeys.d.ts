import { type JourneyRecord } from '../journey.js';
/**
 * Reads a project's journeys document off disk, or null for every way of there being nothing to read:
 * no project, a relative path, no file, not JSON, not an object. Never throws and never writes.
 * A file that resolves (through a symlink) outside the project is not followed: null.
 */
export declare function readJourneys(projectPath: string | null | undefined): Record<string, unknown> | null;
/**
 * The record a project keeps for one epic, or null: `readJourneys` then `journeyIn`. A caller walking
 * every epic reads the document once and asks `journeyIn` per slug.
 */
export declare function readJourney(projectPath: string | null | undefined, slug: string): JourneyRecord | null;
