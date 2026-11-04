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
export declare function rowsAdvice(header: unknown, footer: unknown): string[];
