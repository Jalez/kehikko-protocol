# Citations

The one way a citation is written and the one rule for finding its words in a file again.

This is the reasoning, not the reference: the shapes themselves, with their bounds, are in the source and show on hover. The first half is the overview that used to be in the README; the second half is the note that used to stand above each symbol in the source, under that symbol's name.

Back to the [index](README.md).

## Overview

### A citation is written one way, and found one way (0.33.0)

A slide and a quiz question both rest on passages of a paper, and both say so
in the file a person edits by hand:

```md
- Mean **3.51**[^1] after the first module

Sources:
[^1]: chapters/4_results.tex | "The mean rating was highest after the vanilla-JavaScript module (3.51)."
```

Slides wrote that first and Learning copied it, function for function, with a
comment asking that neither copy be changed alone. Two copies of a rule is two
rules the first time one is edited, so it is here.

```ts
import { findQuote, linesOf, markersIn, parseSource, resolveSource, serialiseSource, uncitable } from 'kehikot-module-protocol'

parseSource('[^1]: chapters/4.tex | "The mean rating"')   // { label: '1', path: 'chapters/4.tex', quote: 'The mean rating' }
serialiseSource({ label: '1', path: 'chapters/4.tex', quote: 'The mean rating' })
uncitable({ path: '../4.tex', quote: 'x' })               // a sentence, or null when it can be written
markersIn('Mean 3.51[^1] `code[^2]`', { skipCode: true }) // ['1']

const view = resolveSource(source, text)   // text: the cited file's, or null when it could not be read
view.status                                // 'holds' | 'ambiguous' | 'adrift' | 'unreadable'
view.at                                    // { from, to, line, endLine } | null — UTF-8 BYTE offsets, 1-based lines
view.at && linesOf(view.at)                // 'lines 31–33'
```

- **The line.** `[^label]: <project-relative path> | "<exact words>"`. The
  label is 1–20 of `A-Za-z0-9_-`. The path ends at the first `|` and the quote
  at the last `"`, so a quote may hold both. `parseSource` answers `null` for a
  line that is not one, and a module keeps such a line as the person wrote it.
- **By the words, not by offsets.** Words survive edits above them; offsets do
  not, and a stale offset points confidently at whatever moved into its bytes.
  So the range is never stored: it is looked for on every read.
- **Whitespace is not significant, and nothing else is forgiven.** A run of
  whitespace in the quote matches any run in the file, because a paper's source
  wraps where its editor did (`normaliseQuote` is the comparison's spelling of
  a quote). Case, punctuation and markup are compared as written: forgiving
  them would let a quote match words the paper no longer says.
- **Four answers** (`CITE_STATUSES`). `holds`: once, and `at` is where.
  `ambiguous`: more than once; `at` is the first and `count` says how many — the
  fix is a longer quote. `adrift`: not there; the paper changed under the
  citation. `unreadable`: the file's text was `null`.
- **`at` is in bytes.** `from` and `to` are UTF-8 byte offsets, which is what
  `context.passage` carries, so a found citation and a selection in the paper
  are compared without conversion. `line` and `endLine` are for saying.
- **Markers.** `[^label]` not followed by `:`. `markersIn` lists the labels a
  text names, each once; `replaceMarkers` rewrites them. Both read all of the
  text unless told `{ skipCode: true }`, which leaves fenced and inline code
  alone — right for a body that is rendered as Markdown (a slide), and not
  wanted for a heading that is not (a question).
- **`CitationView`** is a source with its answer — `{ label, path, quote,
  status, at, count }` — the shape a module's server sends its page.

**This package still opens nothing.** Every function takes the file's text, so
reading the cited file — and refusing a path that resolves outside the project —
stays in the module, behind the fence it already keeps. `uncitable` reads the
path as a string and is not that fence. Not here either, each a candidate for
later: the atomic write both modules do (a temporary file, renamed), the undo
trail (`history.json`), and the fence itself.

## Notes by symbol

### `src/citations.ts`

#### About `src/citations.ts`

Citations: which exact words of which file a piece of writing rests on,
written down as one line and found again.

Two modules cite a paper this way — a slide and a quiz question — and they
have to agree to the character, because a person edits both files by hand
and an agent reads the same four answers from each. So the line's syntax and
the rule for "found" are here, once.

##### The line

`[^1]: <project-relative path> | "<exact words>"`, and a `[^1]` in the text
is the place that rests on it. By the words, not by byte offsets: words
survive edits above them, and when they do not, the citation can SAY it is
adrift rather than quietly point at whatever moved into its bytes.

##### Why whitespace is not significant, and nothing else is forgiven

A paper's source wraps its sentences wherever its editor did, and a quote is
one line. So a run of whitespace in the quote matches any run of whitespace
in the file, and that is the only latitude. Forgiving more — case,
punctuation, LaTeX markup — would let a quote match words the paper no
longer says, which is the one failure a citation exists to make visible.

##### The four answers

- `holds`: the words are in the file exactly once. The range is where.
- `ambiguous`: they are in it more than once. The range is the first, and
  the fix is a longer quote; a citation that could mean two places means
  neither.
- `adrift`: they are not in it. The paper changed under the citation.
- `unreadable`: the file is not there, or not inside the project.

##### What is not here

Reading the file. Every function takes the file's TEXT (or `null` for a file
that could not be read), so nothing in this package opens anything: a module
reads the cited file behind its own fence and hands the text in. Which is
also why every rule here is a unit test.

#### `CITE_STATUSES`

What looking for a source's words in its file came to. See the four answers above.

#### `uncitable`

Why a source cannot be written as a source line, or null when it can. The
path must be relative, inside the project and hold no `|`; the quote is one
line. A reading of the strings: the module that opens the file keeps its own
fence.
