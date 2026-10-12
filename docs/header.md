# The header: switches, toggles, jumps and runs the host draws

What a module declares so that its view switches, toggles, jumps and runs appear in the container's named menus instead of in a toolbar of its own; the press the host relays; and the answer. This is step 1 of [kehikko#62](https://github.com/Jalez/kehikko/issues/62): the protocol's half. The host's drawing and its press channel are specified at the end, not built here.

The shapes are in `src/header.ts` and `src/messages.ts`; the client is `Connection.header`, `HostEvents.onPress`, and the same two on `hostStore` and `useHost`.

Back to the [index](README.md).

## The three messages

| message | direction | carries | answered |
|---|---|---|---|
| `kehikot.header` | module → host | `items`: every item, whole | no |
| `kehikot.press` | host → module | `id`, `item`, and `value` for a switch, a go or a toggle | by `pressed` |
| `kehikot.pressed` | module → host | `id`, `ok`, `why` | — |

**The module owns all the state.** The host draws what was last declared and remembers nothing: not which option a switch is on, not whether a run is busy. After every change, the press included, the module declares the header again.

**Whole list, every time.** A declaration replaces the last one and never merges with it. `items: []` takes the module's menus away. The client remembers the last list and sends it again after `ready` on every greeting, exactly as it does for filters, so one call at mount is correct across a reload of the frame.

**A module that declares nothing gets nothing.** No message, no menus, and the header looks as it does today.

## The four kinds

```ts
host.header([
  { kind: 'switch', id: 'pane', label: 'Pane', options: [{ id: 'source', label: 'Source' }, { id: 'pdf', label: 'PDF' }], value: 'source' },
  { kind: 'toggle', id: 'wrap', label: 'Wrap long lines', checked: false },
  { kind: 'go', id: 'section', label: 'Sections', options: sections.map((s) => ({ id: s.id, label: s.title })) },
  { kind: 'run', id: 'compile', label: 'Compile', shortcut: '⌘B', state: 'idle', result: '1.2 s · p. 3/12' },
])
```

| kind | is | its own fields | a press carries | menu |
|---|---|---|---|---|
| `switch` | one of several views | `options`, `value` (one of them) | the option's id | View |
| `toggle` | on or off | `checked` | the state wanted, `true` or `false` | View |
| `go` | a jump to one of several places; nothing is held afterwards | `options` | the option's id | Go |
| `run` | an act | `state` (`idle`, `busy`, `failed`), `result`, `disabled`, `confirm` | nothing | Run |

Every item has `id`, `label`, and optionally `icon` (a name such as `file-text`; a host draws the ones it has), `shortcut` (a hint to show; the host binds no key), `group` (a heading inside its menu), `agents` and `tool` (below).

**The kind fixes the menu** (`HEADER_MENUS`). A module cannot put a run under View or invent a fifth menu, so the header reads the same on every container: View, Go, Run, then the host's own Frame.

**A toggle's press says the state wanted**, not "flip". A press that is delivered twice, or that an agent sends when the toggle is already on, then changes nothing.

**A run** says how it is going through its own fields, declared again as they change: `state: 'busy'` while it is in flight (the host shows it on the menu's trigger and does not send a second press), `state: 'failed'` after a failure (also on the trigger), `result` for what the last one came to in a word or three, and `disabled` with the sentence saying why it cannot be run now. `confirm: true` asks for the two-press arm; the arm is the host's, as it is for `clear`, and the module adds no confirmation of its own.

### Limits

| | |
|---|---|
| `HEADER_ITEMS` | 24 items, over all four kinds |
| `HEADER_OPTIONS` | 64 options in one switch or go item (a paper's sections) |
| `HEADER_ID` | 64 characters; `__proto__`, `constructor` and `prototype` are refused |
| `HEADER_LABEL` | 48 characters, for an item and for an option |
| `HEADER_GROUP` | 24 |
| `HEADER_ICON` | 32 |
| `HEADER_SHORTCUT` | 16 |
| `HEADER_RESULT` | 32 |

Item ids are unique in a header; option ids are unique in an item; a switch's `value` is one of its options. A list that breaks any of these does not parse, and the host reports it as it reports any message it cannot read.

## The press, and its answer

```ts
const host = useHost(ID, {
  onPress: ({ item, value }) => {
    if (item === 'pane' && typeof value === 'string') return showPane(value)     // then declare the header again
    if (item === 'compile') {
      if (!paper.main) return 'This paper has no main file to compile.'          // a sentence is "not taken, and why"
      void compile()                                                             // answers at once; reports through its header
    }
  },
})
```

`onPress` returns nothing (or `true`) for "taken", a sentence for "not taken, and this is why", or `false`; it may return a promise of any of them. `connect` sends exactly one `kehikot.pressed` for every press, whatever the listener does: it answers `ok: false` itself when there is no listener, when the listener throws, and after `PRESS_BACKSTOP_MS` (two seconds) when the listener has not said.

**"Taken" is not "finished".** A compile that takes a minute answers at once and declares `state: 'busy'`, then `idle` with a `result`. `pressed` is the acknowledgement; the header is the report.

**A press the header cannot take never reaches the listener.** Between the menu being drawn and the press arriving, the module may have declared a new header. So the client judges each press against what is declared *now* (`pressRefusal`): an item that is gone, an option that is not offered, a toggle without a state, a run that is `disabled` or already `busy` are answered `ok: false` with a sentence naming what exists. A host asks the same function before it sends, and uses the same sentence to refuse an agent.

A host sends `press` only for an item in the module's last header, and must time out: no `pressed` is "not taken".

## Agents, and the tool that does the same thing

Three cases, said per item:

| the item says | an agent | |
|---|---|---|
| nothing | cannot press it | the default. Person-only |
| `agents: true` | may press it, through the host | the module opts each item in |
| `tool: 'run_tests'` | is refused, and told to call that tool | the module's own MCP door already does this |

`agents: true` and `tool` together do not parse: there is one way for a program to do each thing. `agents: true` on a run with `confirm: true` does not parse either: an act that needs a person's second press is not one an agent takes. A toggle the module never wants an agent near (Paper's Auto) simply says nothing.

This is where the header meets [asking a module to show something](asking.md). They are the two ways into one act:

- **A program asks at the door.** An agent or another module calls the module's own MCP tool. For "show this now" that is the `show` tool the manifest's `mcp.subjects` names.
- **A person asks in the header.** The same jump is a `go` item, and the item says `tool: 'show_section'`.

So an agent never presses a header item to make a module show something; the host's `press_item` refuses and names the tool. Pressing through the host is for what a module has *only* as a control on its page: a view switch, a toggle, a run with no tool behind it. Both ways arrive at the same code in the module, and both are honest about the page: a press needs an open page to reach, and a show tool answers `unseen` when there is none.

## Worked: Paper

Today Paper draws Source / PDF tabs (only when narrow), a "Show in PDF" button that also switches to the PDF, a Sections select, Compile, Commit, a status line and an Auto toggle. As a header:

```ts
const items: HeaderItemInput[] = [
  { kind: 'switch', id: 'pane', label: 'Pane', value: pane,
    options: [{ id: 'source', label: 'Source' }, { id: 'pdf', label: 'PDF' }] },
  { kind: 'toggle', id: 'auto', label: 'Apply proposals automatically', checked: auto },          // person-only: says nothing about agents
  { kind: 'go', id: 'section', label: 'Sections', tool: 'show_section',
    options: sections.map((s) => ({ id: s.id, label: s.title })) },
  { kind: 'run', id: 'compile', label: 'Compile', shortcut: '⌘B', agents: true,
    state: compiling ? 'busy' : failed ? 'failed' : 'idle',
    result: last ? `${last.seconds} s · p. ${page}/${pages}` : null },
  { kind: 'run', id: 'commit', label: 'Commit', confirm: true,
    disabled: dirty ? null : 'Nothing has changed since the last commit.' },
]
useEffect(() => host.header(items), [host.header, pane, auto, sections, compiling, failed, last, page, pages, dirty])
```

- **One switch, Source / PDF.** Choosing PDF reveals the caret's line; that is what "Show in PDF" did, so the button goes. The module does the reveal in `onPress` when `value === 'pdf'`.
- **Sections is a Go item**, and names the tool that does the same for a program.
- **Compile is a Run item agents may press**, with the status line as its `result`. Busy and failed show on the Run trigger without opening the menu.
- **Commit is confirmed** (two presses, the host's arm), and so is not for agents.
- **Auto is a toggle no agent can press**, because it does not say `agents`.

`show_section` is a tool Paper does not have yet; until it does, the Go item leaves `tool` out and is person-only.

Slides follows the same lines: Edit / Preview is a switch; the decks are a Go item; Present, Presenter view, Export PDF and History are Run items. Presenter is a run, not a view: it opens another window. A Go item over the slides themselves would say `tool: 'show_slide'`.

## Unhosted: the template's copy

A page opened on its own port has no host to draw anything. `template/src/components/header-menus.tsx` is the one copy of the menus for that case: it takes the same `items` and calls the same handler the host's presses reach.

```tsx
{host.where === 'unhosted' ? <HeaderMenus items={items} onPress={press} /> : null}
```

It is a copy and not an export because the protocol package has no Radix and no Tailwind; a module made with `kehikot-create` gets the file, and an older module copies it.

## What is not in 1.1.0

- **`clearable` and `refreshable` stay**, and are not deprecated. Folding the host's clear and refresh into Run items is the last step of the proposal and a breaking one (2.0.0), after the modules that use them have moved.
- **No pinned Run button.** Every run is in the menu.
- **No keyboard binding by the host.** `shortcut` is a hint to draw; the module's own page handles the key.

## A message type the other side does not know

The proposal lists this as not established, and it decides the order things are released in. It is established here, from what the code does:

**The rule.** A receiver that meets a `kehikot.` message whose **type** it does not know drops it and says nothing. It was added by a later version of this package and is not a mistake. A message whose type it knows and whose **shape** it cannot read is a fault worth reporting. The two are told apart by `HOST_MESSAGES` and `MODULE_MESSAGES`: a type in neither list is unknown.

**The module half already does this.** `connect` parses with `hostMessageSchema` and returns on anything that does not parse. A `kehikot.press` sent to a module built on 1.0.0 is dropped in silence, and the host's timeout says "not taken". Nothing breaks in either order.

**The host does not, yet.** The host on `origin/main` (built on 1.0.0) parses with `moduleMessageSchema` and reports *every* failure as a fault on the container: "Paper sent a kehikot.header the host could not read." So a module that declares a header inside a 1.0.0 host is not broken, and is not silent either: the person sees a fault line on its frame, again on every declaration.

**So the order is: host first.** The host moves to 1.1.0 (it then reads `kehikot.header`, whether or not it draws it yet) before any module declares one. From then on the rule above holds on both sides, and the next new message type needs no order at all, provided the host also adopts the rule: check the type against `MODULE_MESSAGES` before reporting.

`view.fold` needs no order: it is a method, and a host without it answers `unknown-method`, the refusal a caller is already told to expect. Neither do `mcp.subjects` and `containers[].folded`: a schema that does not name a field strips it.

## What the host does (not built here)

0. **List `view.fold`** in `src/host/division.ts` in the change that moves to 1.1.0. The host's own guard refuses to start against a protocol that names a method it does not answer; a case that answers `declined` is enough until step 5.
1. **Read `kehikot.header`** into the conversation's watcher, beside filters, and drop it when the frame is replaced. Drop unknown message types in silence (above).
2. **Draw** View, Go and Run from `HEADER_MENUS`, grouping by `group`, with its own Frame menu after them; truncate labels with the full text in a `title`; show `busy` and `failed` on the Run trigger; arm a `confirm` run on the first press. Folded, the module menus hide.
3. **Send `kehikot.press`** with a correlation id, only for an item in the last header and only when `pressRefusal` is `null`; time out (longer than `PRESS_BACKSTOP_MS`); show a refusal's `why`.
4. **`press_item { module, item, value }`** at its own MCP door, through the open page: refuse an item that is not `agents: true`; refuse an item with `tool` by naming that tool and the module's door; refuse with `pressRefusal`'s sentence; refuse when no page is open. And list each container's items in `read_canvas`, which means the page posts each declaration to the host's server.
5. **Answer `view.fold`**, fill `containers[].folded`, and say on the container who asked.
