/**
 * What goes in the header and what in the footer (2.47.0): the rule, and a check that points out the
 * obvious misplacements. Design notes: docs/footer.md and docs/header.md, "What goes in the header,
 * and what in the footer".
 *
 * The header says HOW THE MODULE IS SET UP: what it shows and how — view switches, modes, sorting,
 * filters, toggles that change behaviour, starting or creating things, picking which thing is shown.
 * The footer says WHAT IS GOING ON NOW: status, meters, counts, progress, where you are in the
 * content, and the few actions that act directly on one of those readouts and sit beside it.
 *
 * It matters because a host folds a container to one row (the header alone) or to two (header and
 * footer): one row has to be enough to set the module up, two rows enough to know how it is doing.
 *
 * `rowsAdvice` is advice and nothing else. It never refuses a list, and a host or a module that
 * ignores it loses nothing but the hint.
 */

/** A readout said in words: a percentage, `x / y`, `x of y`. What a meter or a text says, not what a control says. */
const READOUT = /\d\s*%|\d\s*\/\s*\d|\b\d+\s+of\s+\d+\b/i

/** The kinds a footer item can be that only say something, and so can be acted on by an item beside them. */
const READOUT_KINDS = new Set(['text', 'meter', 'input'])

type Loose = { kind?: unknown; id?: unknown; label?: unknown; actsOn?: unknown }

function loose(items: unknown): Loose[] {
  return Array.isArray(items) ? items.filter((item): item is Loose => typeof item === 'object' && item !== null) : []
}

const named = (item: Loose) => (typeof item.id === 'string' ? `"${item.id}"` : 'an item')

/**
 * The obvious misplacements in a module's header and footer, one sentence each; empty when there are
 * none. Takes the lists as a module writes them (before parsing), so it can name a `meter` in the
 * header, which the header's schema refuses without saying where it belongs. Pure; never throws.
 *
 *  - a `meter` in the header: a readout, which belongs in the footer;
 *  - a header item whose label reads as a readout (`41%`, `3 / 12`, `2 of 5`): the readout belongs
 *    in the footer, and the control, if there is one, stays in the header;
 *  - a `switch` or `toggle` in the footer with no `actsOn`: it changes how the module is set up,
 *    which is the header's, unless it acts on a readout beside it, which `actsOn` says;
 *  - `actsOn` naming no `text`, `meter` or `input` in the same footer.
 */
export function rowsAdvice(header: unknown, footer: unknown): string[] {
  const advice: string[] = []
  for (const item of loose(header)) {
    if (item.kind === 'meter') {
      advice.push(`The header has a meter (${named(item)}). A meter says what is going on now: put it in the footer, which a container folded to two rows still shows.`)
    } else if (typeof item.label === 'string' && READOUT.test(item.label)) {
      advice.push(`The header item ${named(item)} reads as a readout ("${item.label}"). Say live state in the footer, and keep the header for how the module is set up.`)
    }
  }
  const footerItems = loose(footer)
  const readouts = new Set(footerItems.filter((item) => READOUT_KINDS.has(item.kind as string) && typeof item.id === 'string').map((item) => item.id as string))
  for (const item of footerItems) {
    const acts = typeof item.actsOn === 'string' ? item.actsOn : null
    if (acts !== null && !readouts.has(acts)) {
      advice.push(`The footer item ${named(item)} says it acts on "${acts}", and the footer has no text, meter or field by that id.`)
      continue
    }
    if ((item.kind === 'switch' || item.kind === 'toggle') && acts === null) {
      advice.push(`The footer has a ${item.kind} (${named(item)}). A ${item.kind} that changes how the module is set up belongs in the header, which a container folded to one row still shows. If it acts on a readout beside it, say so with actsOn.`)
    }
  }
  return advice
}
