# A module's settings (2.15.0)

What a module declares so that a person can see and change its settings from the host — the merge switch of Factory, Claude's "Resume conversations cut off by a restart", Flows' promotion branches — and the two door methods the host asks to read and change them. The shapes are in `src/settings.ts`; the door is `settingsDoor` in `src/serve/settings.ts`.

Back to the [index](README.md).

## The short version

- The module **declares** its settings in its manifest, `declares.settings`: a short list of fields.
- The host **draws** one form from that list, the same for every module.
- The host **asks the module** for the values (`settings.get`) and for each change (`settings.set`), at the module's door, `SETTINGS_PATH` (`/api/kehikot/settings`).
- The module **is the only writer** of its files. It checks the change, writes it in the format it always had, and answers `saved` or `refused` with a sentence. A host never writes into `.kehikot/<module>/`.

## Declaring

```ts
declares: {
  uses: [...],
  settings: [
    { key: 'judgeMerges', label: 'Let the judge merge approved jobs by itself', type: 'boolean', default: false, personOnly: true,
      description: 'An approved job is merged without waiting for you.' },
    { key: 'defaultRule', label: 'Ready for another review', type: 'string', default: 'when they re-request review' },
    { key: 'doorRules', label: 'Door rules', type: 'list', default: [], personOnly: true,
      description: 'One rule a line: path <glob> → one-way, or label <name> → two-way.' },
  ],
}
```

| field | is |
|---|---|
| `key` | the name of the value: a lowercase letter, then letters, digits, `.`, `_`, `-` (`SETTING_KEY`), at most 64. Never `constructor`, `prototype` or `__proto__`. Unique in the list. |
| `label` | what the control is called, at most 80 |
| `description` | one or two sentences under it, at most 400. Default `''`. |
| `type` | `boolean` (a switch), `string` (a text field), `number`, `choice` (a select, from `choices`), `list` (lines of text) |
| `choices` | for `choice` only, and required there: `{ value, label }`, values unique |
| `default` | the value when nothing was set, of the type |
| `scope` | `project` (default): kept in the project, under `.kehikot/<module>/`. `machine`: once for this computer. |
| `personOnly` | only a person may change it. Default `false`. |

At most `LIMITS.SETTINGS` (32) fields. A list that does not parse is **dropped, not fatal** (`.catch(undefined)`): the module then shows no settings in a host, and the rest of its manifest is read as before. A module checks its own list strictly in its tests with `settingsDeclarationSchema.parse(...)`.

**What does not fit is left out.** A setting that is a structure — Factory's board mapping, which pairs each stage with a column of a board the host read — is not a field. It stays on the module's page, and the file can still be opened to read.

**Values.** `settingValueIssue(field, value)` is the one rule for what a value of each type is: a boolean; a finite number; text up to `SETTING_TEXT` (2000); one of the choices' values; an array of at most `SETTING_LIST` (64) strings. `settingsValues(fields, read)` gives every declared key its value, the default where what was read is missing or of another type.

## The door methods

The other way round from [methods](methods.md): those are what a module asks the host. These are what a host asks a module, and each is filed under a door capability (`DOOR_CAPABILITIES`, `DOOR_METHODS`):

| method | capability | how | params | answer |
|---|---|---|---|---|
| `settings.get` | `settings` | `GET /api/kehikot/settings?project=<folder>` | `project?` | `settingsGetResult`: `{ values, file?, problem? }` |
| `settings.set` | `settings` | `POST /api/kehikot/settings`, JSON | `project?`, `key`, `value`, `by`, `pass?` | `settingsSetResult`: `{ outcome: 'saved' \| 'refused', why, values? }` |

A module **offers** the `settings` capability by declaring `declares.settings` (`offersDoorCapability`); a host asks neither method of a module that does not.

- `project` is the project's absolute folder, and required for a `project` setting. A module whose settings are all `machine` takes none.
- `file` is where the project's settings are kept, relative to the project (`.kehikot/factory/settings.json`), so a host can offer to open it **to read**. Editing happens in the form.
- `problem` is a sentence when the file could not be read; the values are then the defaults, and nothing was changed. A module whose file does not read refuses a change rather than overwrite what it could not read.
- A refusal is `200` with `outcome: 'refused'` and `why`, a sentence for a person. A call that is not one (no key, a relative project, a malformed pass) is `400`.
- `values` beside `saved` is every value as it now stands, so the form shows what the module actually kept.

## Who may change what: the person's pass

`personOnly` is for a switch that acts outside the project, posts to a forge, spends, or runs something: Factory's judge-merge switch and its review switches, Claude's resume. Only a person may change one; an agent asked to is told so, in `SETTINGS_SAYS.personOnly`'s words.

The question is how a module's server knows a change came from a person, when a host's server, an agent's `curl` and an agent's MCP client all reach it as "a program on this computer". Saying `by: 'person'` proves nothing. Two things do:

1. **The module page's ticket** (`x-module-ticket`). A change sent by the module's own page is the person's, as it always was.
2. **A pass the host vouches for.** The host's page posts a person's change to its own server, on a route only that page is answered on. The host's server mints a pass for that one change — the module, the key, the project — and sends `settings.set` with `by: 'person'` and the pass. The module's server asks the host whether it minted it: `GET /host/settings-pass?pass=&module=&key=&project=` (`SETTINGS_PASS_PATH`), answered `{ ok: true, person: true }` once, within `LIMITS.SETTINGS_PASS_MS` (30 s), and `person: false` for anything else. `hostVouches` in `/serve` asks, failing closed.

An agent cannot mint a pass: the host mints one only for its own page. So an agent may change only the settings that are not `personOnly`, at the module's door, and never through the host — a host's MCP door reads settings and changes none.

`settingsSetRefusal(fields, change, person)` is the rule, in order: no such key; `personOnly` and not the person; a `project` setting without a project; a value not of the type.

## The door, with `settingsDoor`

```ts
import { settingsDoor } from 'kehikot-module-protocol/serve'

const settings = settingsDoor({
  module: ID,
  fields: MANIFEST.declares.settings,
  ticket: TICKET,
  read: (project) => ({ values: readSettings(project), file: '.kehikot/factory/settings.json' }),
  write: (project, key, value) => writeOne(project, key, value), // a sentence to refuse, null when written
})

// first thing in answer(method, path, query, body, ticket):
const said = await settings(method, path, query, body, ticket)
if (said) return said
```

`read` and `write` are the module's store, unchanged: the door hands `write` one checked change, and `write` keeps the file's format, every key it does not know included. `vouch` can be passed in a test.

## What the host does (not built here)

- Draws a form per module from `declares.settings`: a switch, a text field, a number field, a select, a list editor, each with its label and description; saves each change through `settings.set` and says "Saved" or the refusal's sentence.
- Mints a pass only for its own page's request, keeps it for `SETTINGS_PASS_MS`, and answers it once.
- Offers the file read-only, never writes it.
- Reads settings for an agent through a tool that only reads.
