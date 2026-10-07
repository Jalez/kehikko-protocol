import { type JourneyRecord } from '../journey.js';
/**
 * The few lines that open the file `journey.ts` describes.
 *
 * ## Why this is behind `/serve`
 *
 * The front door of this package is shapes and pure functions, importable by
 * a page with no filesystem. This reads a file. So it stands with the rest of
 * what touches the machine, and `journeyIn` — the part with the judgement in
 * it — stays where a browser and a test can both reach it without a disk.
 *
 * ## And it is the one thing here a host runs
 *
 * Everything else in this directory is a module's own housekeeping, and the
 * note on the index says a host never runs it. This is the exception and it
 * is named as one: a host reads an epic's steps out of a file the Journeys
 * module wrote, and the reading is here so that the host is not the second
 * program to spell that path or parse that format. The module that owns the
 * file may use it as well; nothing here writes.
 *
 * ## Null, for every way of there being nothing to read
 *
 * No project, a relative path, a path that is not a folder, no
 * `.kehikot/journeys`, no file, a file that is not JSON, JSON that is not an
 * object. All of them are "there is no document here to answer from", a
 * reader that is going to fall back does
 * the same thing for each, and none of them is worth an exception thrown
 * through a wire call. A caller that needs to tell them apart — the module
 * that is about to WRITE the file, which must never treat "would not parse" as
 * "empty" — has to ask the disk itself, and should.
 *
 * ## A folder that points somewhere else is not followed
 *
 * `.kehikot`, or `.kehikot/journeys`, or the file may be a symlink out of the
 * project. Followed, that is one project's steps answered under another's
 * name. So both ends are resolved and the file has to really be under the
 * project it was asked about — `within` is the comparison, and the
 * `realpath` on either side is what makes it a check; see its note.
 */
export declare function readJourneys(projectPath: string | null | undefined): Record<string, unknown> | null;
/**
 * The record a project keeps for one epic, or null.
 *
 * `readJourneys` and `journeyIn`, in that order, for the caller asking about
 * one epic. A caller walking every epic in a project reads the document once
 * and asks `journeyIn` per slug, so that one listing is one reading of the
 * file and not a different one per row.
 */
export declare function readJourney(projectPath: string | null | undefined, slug: string): JourneyRecord | null;
//# sourceMappingURL=journeys.d.ts.map