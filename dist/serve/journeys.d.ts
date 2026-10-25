import { type JourneyRecord } from '../journey.js';
/**
 * Reads a project's journeys document off disk, or null for every way of there being nothing to read:
 * no project, a relative path, no file, not JSON, not an object. Never throws and never writes.
 * A file that resolves (through a symlink) outside the project is not followed: null.
 * @deprecated 1.2.0, as where an epic's PARTS are read from: a host keeps the list in the epic's own
 * file and reads what modules hold with `readHoldings`. 2.21.0, as where its STEPS are read from: every
 * module that keeps steps publishes them in its own `steps.json`, read with `readPlans`; a host reads
 * this file only as the fallback for a Journeys that has not published yet. Kept, and unchanged, until 3.0.
 */
export declare function readJourneys(projectPath: string | null | undefined): Record<string, unknown> | null;
/**
 * The record a project keeps for one epic, or null: `readJourneys` then `journeyIn`. A caller walking
 * every epic reads the document once and asks `journeyIn` per slug.
 * @deprecated 2.21.0, with `readJourneys`. A module reads an epic's steps with `steps.list` (its page,
 * or its server through `askHost`), never this file.
 */
export declare function readJourney(projectPath: string | null | undefined, slug: string): JourneyRecord | null;
