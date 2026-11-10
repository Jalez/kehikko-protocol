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

/**
 * 2.70.0. A count said in words: `Inbox (3)`, `12 open`. A count is live state, which the footer says.
 * A number that begins a word (`2nd`) is not one.
 */
const COUNT = /\(\s*\d+\s*\)|^\s*\d+\s+\p{L}/u

/**
 * 2.70.0. The first words of an act, not a place: a Go option that starts with one is a run in
 * disguise. A go item JUMPS — to a section, a page, a file — and holds nothing afterwards.
 */
const ACT = /^\s*(new|create|add|start|run|stop|restart|delete|remove|clear|refresh|reload|copy|export|import|save|send|compact|reset|retry|cancel|close|undo|redo|sync|publish|install|update|build|compile)\b/i

/** The kinds a person presses: the ones that can be in both rows by mistake. */
const PRESSABLE = new Set(['switch', 'toggle', 'go', 'run'])

type Loose = { kind?: unknown; id?: unknown; label?: unknown; actsOn?: unknown; options?: unknown; result?: unknown }

/** 2.70.0. What `rowsAdvice` may be told beside the lists. */
export interface RowsAdviceOptions {
  /**
   * The module has live state worth knowing (a count, a status, a location) whether or not its header
   * shows it. With no footer declared, that is said once: a container folded to two rows shows the
   * footer, and only the footer carries state.
   */
  state?: boolean
  /** `false` when the host draws no footer (`hello.footer` not true): no footer is then not advised. */
  footer?: boolean
}

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
 *
 * 2.70.0, the rest of the rule:
 *  - a count in a header label (`Inbox (3)`, `12 open`): live state, the footer's;
 *  - a `go` item that is not a jump: one place only, or options that read as acts (`New…`, `Clear`);
 *  - the same pressable item in both rows, by id or by kind and label;
 *  - live state (a readout, a count, a meter or a run's `result` in the header, or `options.state`)
 *    and no footer declared at all (`null` or `undefined`; `[]` is a footer withdrawn on purpose).
 */
export function rowsAdvice(header: unknown, footer: unknown, options: RowsAdviceOptions = {}): string[] {
  const advice: string[] = []
  /* Whether the header shows live state: what a footer, when there is none, should be carrying. */
  let stateful = options.state === true
  for (const item of loose(header)) {
    if (item.kind === 'meter') {
      stateful = true
      advice.push(`The header has a meter (${named(item)}). A meter says what is going on now: put it in the footer, which a container folded to two rows still shows.`)
    } else if (typeof item.label === 'string' && READOUT.test(item.label)) {
      stateful = true
      advice.push(`The header item ${named(item)} reads as a readout ("${item.label}"). Say live state in the footer, and keep the header for how the module is set up.`)
    } else if (typeof item.label === 'string' && COUNT.test(item.label)) {
      stateful = true
      advice.push(`The header item ${named(item)} carries a count ("${item.label}"). A count is live state: say it in the footer, and keep the header's label for what the item does.`)
    }
    if (item.kind === 'run' && typeof item.result === 'string' && item.result) stateful = true
    if (item.kind === 'go') {
      const places = Array.isArray(item.options) ? item.options.filter((one): one is { id?: unknown; label?: unknown } => typeof one === 'object' && one !== null) : []
      if (places.length === 1) {
        advice.push(`The Go item ${named(item)} has one place. A Go item jumps to one of several places; a single press that does something is a run.`)
      } else {
        const acts = places.filter((one) => typeof one.label === 'string' && ACT.test(one.label)).map((one) => `"${one.label as string}"`)
        if (acts.length) advice.push(`The Go item ${named(item)} offers ${acts.join(', ')}, which read as acts, not places. A Go item jumps and holds nothing afterwards: declare an act as a run.`)
      }
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
  /* 2.70.0. Never the same item in both rows: by id, or by kind and label. */
  const headerPressable = loose(header).filter((item) => PRESSABLE.has(item.kind as string))
  for (const item of footerItems) {
    if (!PRESSABLE.has(item.kind as string)) continue
    const twin = headerPressable.find(
      (one) => (typeof item.id === 'string' && one.id === item.id) || (typeof item.label === 'string' && one.kind === item.kind && one.label === item.label),
    )
    if (twin) advice.push(`${named(item)} is in both the header and the footer. Put an item in one row: the footer when it acts on a readout beside it, the header otherwise.`)
  }
  /* 2.70.0. State and no footer: only when no footer was declared at all (`[]` withdraws one on purpose). */
  if (stateful && (footer === null || footer === undefined) && options.footer !== false) {
    advice.push('This module shows live state and declares no footer. Declare one (kehikot.footer) with its counts, status or place: a container folded to two rows shows the footer, and nothing else carries state there.')
  }
  return advice
}
