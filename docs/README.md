# Design notes

Why the protocol is the way it is. The source keeps one to three lines beside each field — the invariant, the unit, the constraint — and everything longer lives here, once: the reasoning, the incidents that produced a rule, the alternatives that were turned down.

| | |
|---|---|
| [The wire: context, passages and messages](wire.md) | What a host and a module say to each other across the frame: the context a module is handed, the passage a reader is pointing at, and the messages themselves. |
| [Filters, clearing and refreshing](filters.md) | The three things a module offers and the host draws: filters to narrow by, a control that clears what is shown, and a control that reads the material again. Also the shared reference facets behind `/facets`. |
| [Capabilities, methods and their answers](methods.md) | The questions a module can ask the host, the capability each one needs, what a caller must construct, and which answers have a shape. |
| [The manifest](manifest.md) | What a module says about itself at the well-known path: every field of `manifestSchema`, what a module says it reacts to, its tags, and how a protocol range is read. |
| [Names and ids](ids.md) | The patterns for a module id, a mode id and an epic slug, the one derivation of a slug from prose, and the lookup that does not fall through a prototype. |
| [Limits](limits.md) | Why every string and every list is bounded, and the reasoning behind each number in `LIMITS`. |
| [The protocol number, and what is left of the rename from "roadmap"](protocol-number.md) | Why `PROTOCOL` is 2 and what would raise it, and the three places a name from before the rename is still read from disk. |
| [Where a module keeps a project's data](project-data.md) | The `.kehikot/` folder inside a project, the folder each module gets in it, and the lines a project's `.gitignore` gains. |
| [Parts of an epic, focus, and the record of an epic's steps](parts.md) | The parts an epic is divided into, what it means for some of them to be picked out, the one rule for whether a thing is in focus, the files a part owns, and the on-disk record of an epic's steps that parts are read from. |
| [Trackers](tracker.md) | One reading of GitHub and GitLab shared by every module: the row a host hands back, what is missing and why, refreshing, and how a reference is spelled. |
| [Content changes](content.md) | How a container is told that the material it shows has changed, and how a module reports a change of its own. |
| [Citations](citations.md) | The one way a citation is written and the one rule for finding its words in a file again. |
| [Extension payloads](extensions.md) | The versioned formats modules send each other through a host: notifications and calls. |
| [The client library](client.md) | The module half of the wire behind `/client` and `/client/react`: `connect`, the mailbox, and the hooks. A convenience, never a requirement. |
| [Serving a module: ports, the registry, frame origins, and the template](serving.md) | The node-only half behind `/serve` — which port a module binds, where it writes down that it exists, which origins may frame it — and the generator that makes a new module from `template/`. |
| [The shared plumbing of a module](module-plumbing.md) | What every module used to type out for itself, behind `/serve`, `/client` and `/client/react`: the page document and its first paint, the write ticket, the JSON body reader, the `doors()` plugin, `ask()`, `useHost`, the one not-ready screen `Cover`, and the build identity. |
| [Packaging](../PACKAGING.md) | How this package is consumed straight from git, and why `dist/` is committed. |
| [`kehikko` and `kehikot`](naming.md) | Which spelling goes where, as the code uses the two today. Inferred; to be confirmed. |

Each file has an overview where the README used to carry one, then the notes by symbol, grouped by the source file the symbol is declared in and in the order it is declared.
