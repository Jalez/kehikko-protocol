import { z } from 'zod';
import { LIMITS } from './limits.js';
import { canonicalName } from './dialect.js';
import { EPIC_SLUG, MODULE_ID } from './ids.js';
/**
 * Content: the signal that the material a container shows for an epic changed. The context says
 * that something changed, whose it was and for which epic; the module re-reads the material itself.
 * Design notes: docs/content.md.
 */
/**
 * The `source` when the changed material is the host's own: the epics it keeps, which `epics.list`,
 * `epic.get` and `steps.list` answer from. Every other source is a module id.
 */
export const CONTENT_HOST = 'host';
const instant = z.string().datetime({ offset: true });
/**
 * One source's last change for one epic. `source` is `CONTENT_HOST` or the id of the module that
 * keeps the material. `epic` is null when the host cannot tell which epic; a reader takes null as
 * "any epic of this source".
 */
export const contentChangeSchema = z.object({
    source: z.string().regex(MODULE_ID).transform(canonicalName),
    epic: z.string().regex(EPIC_SLUG).nullable().default(null),
    at: instant,
});
/**
 * What travels in the context: the last change per `(source, epic)` for the open project, newest
 * kept when there are more than `LIMITS.CONTENT`. `[]` means nothing has changed since the host
 * began keeping count. A dropped entry costs a module one unneeded re-read, never a change.
 */
export const contentSignalSchema = z.array(contentChangeSchema).max(LIMITS.CONTENT);
/**
 * A string that moves when, and only when, material this container shows has changed: compare it
 * with the last one and re-read on a difference. `sources` are whose material it shows; `epic` is
 * the one open, or null for every epic's. An entry with `epic: null` counts for any epic.
 */
export function contentStamp(content, about) {
    const epic = about.epic ?? null;
    return (content ?? [])
        .filter((one) => about.sources.includes(one.source))
        .filter((one) => epic === null || one.epic === null || one.epic === epic)
        .map((one) => `${one.source} ${one.epic ?? '*'} ${one.at}`)
        .sort()
        .join('\n');
}
//# sourceMappingURL=content.js.map