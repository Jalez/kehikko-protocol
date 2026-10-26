# Whether a module and a host fit

2.22.0. `since.ts` and `fit.ts`.

A module built against a newer protocol than the host it runs in used to start, and its calls
failed without saying why. A module too old for its host was refused with a sentence about protocol
numbers. Now both cases are worked out the same way, by this package, from the manifest every
module already serves. A module written from the template and one written by hand are judged the
same way, and neither has to write any code for it.

The host draws what the person sees. A module draws nothing for it, though it may show one line
beside a call the host declined.

## Each piece knows its version

`SINCE` says which package version each piece arrived in:

- `METHOD_SINCE`: every method in `METHODS`.
- `CAPABILITY_SINCE`: every capability in `CAPABILITIES`. A capability's version is the version of
  its oldest method.
- `SERVER_METHOD_SINCE`: the version in which a module's server could first ask each method in
  `SERVER_METHODS`. This is never earlier than the page could ask it.
- `DECLARATION_SINCE`: the manifest declarations a host has to know before it can do what the
  module asks. A declaration is named by where it sits in the manifest.
- `TRACKER_FIELD_SINCE` (2.26.0): the fields of a tracker row added after the reading first had a
  shape (`column` 2.6.0 … `contributes` and `contributedBy` 2.26.0). No manifest names a row field,
  so `needsOf` and `fitOf` do not read this table; it says which host fills a field, so a module that
  finds one absent knows whether the absence can mean anything.

| declaration | since |
|---|---|
| `mcp.subjects` | 1.1.0 |
| `mcp.as` | 1.3.0 |
| `declares.skills` | 2.5.0 |
| `declares.scopes` | 2.9.0 |
| `skills.needs` (module ids) | 2.12.0 |
| `declares.settings` | 2.15.0 |
| `declares.provides` | 2.21.0 |
| `declares.agentSessions` | 2.21.0 |
| `skills.needs.object` (`{ provides }` and the other object forms) | 2.21.0 |
| `agentSessions.installsSkills` | 2.23.0 |

A piece that was there at the first tag says `SINCE_FLOOR` (`0.25.0`). `test/v2-22.test.ts` holds
the tables to `CHANGELOG.md`: the section for each version names the piece. It also holds them to
`METHODS`.

The `reacts` words, `tags` and `icon` are not in the tables. They are what a module says about
itself, and an older host still runs a module that says them.

`PIECE_SAID` gives each capability and declaration a few words that fit "It uses ___". A method is
described with the words for its capability. `pieceSaid(kind, piece)` reads them, and gives back
the piece as written when it has no words for it.

`REMOVED` lists the pieces a release took away, and the version that removed each. It is empty in
every 2.x release. The 3.0 release that removes something lists it here, and a module that still
names the piece is then too old for the host.

Read the tables with `sinceOf(kind, piece)` and `removedIn(kind, piece)`. Do not index them with a
string from another program.

## What a manifest needs: `needsOf`

`needsOf(manifest, above?)` reads a parsed manifest. It also reads the raw JSON a module served,
including JSON this package cannot parse. It returns:

- `version`: the newest version that any known piece needs.
- `pieces`: every piece newer than `above` (a host's package version), newest first, followed by
  any piece this package does not know.
- `unknown`: whether there is a piece this package does not know. That is a capability not in
  `CAPABILITIES`, or a `declares` key it has never heard of.
- `built`: the `build.protocol` the module's doors stamp on the manifest. This is only a hint.

## Holding a manifest to a host: `fitOf`

`fitOf(manifest, { version?, protocol? })` compares a manifest with a host. The host's version
defaults to this package's own `PACKAGE_VERSION`, and its protocol to `PROTOCOL`. The checks run
in this order:

1. **The protocol number.** If `manifest.protocol` is above the host's, the host is too old. If it
   is below, the module is too old. If `declares.protocol` excludes the host, the range decides
   which side is behind: a range that starts above the host means the host is too old, and any
   other range means the module is too old.
2. **Removed pieces.** A piece listed in `REMOVED` at or before the host's version means the module
   is too old.
3. **What the declarations need.** A known piece newer than the host means the host is too old.

   An unknown piece counts only if the module was built with a newer package than the host, or does
   not say what it was built with. A module built with an older package that names an unknown word
   has made a typo, and a host that framed it before still frames it.

The answer is one of three:

- `{ fit: 'fits' }`.
- `{ fit: 'host-too-old', since, missing }`. `since` is the version that has what the module needs.
  It is `build.protocol` when only unknown pieces count, and null when nothing can say.
- `{ fit: 'module-too-old', removed }`.

When the protocol number decided, the answer also carries `protocol: { module, range, host }`.

## The words: `fitSaid` and `FIT_SAYS`

`fitSaid(fit, name)` returns `{ title, line, action }` for a module that does not fit, and null for
one that fits. Every part is text. The module's name goes in as a string and must never be rendered
as markup.

| case | title | line | action |
|---|---|---|---|
| host too old, one piece | `Monitor needs a newer Kehikot` | `It uses the call log, added in protocol 2.20.` | `Update Kehikot` |
| host too old, two pieces | | `It uses agent sessions, added in protocol 2.21, and settings, added in protocol 2.15.` | |
| host too old, more | | `It uses …, added in protocol 2.21, and 2 more things this Kehikot does not have.` | |
| host too old, unknown piece | | `It uses parts:write, which this Kehikot does not know.` | |
| host too old, protocol number | | `It was built against protocol 3; this Kehikot speaks protocol 2.` | |
| module too old | `Terminal needs an update` | `It was built against protocol 1; this Kehikot speaks protocol 2.` | `Update Terminal` |

The host shows the notice in the module's container, in place of the module's page. The button
opens the host's Updates menu: at Kehikot itself for **Update Kehikot**, and at the module's row
for **Update <Module>**. The host's modules list marks such a module, and an agent reading the
canvas is told the same thing.

## A call the host is too old for

Even when a module fits, it can ask the host for a method the host does not have yet, for example
a call made behind a check of its own. A host answers every method it knows. So if this package
knows a method and the host answered `unknown-method`, the method is newer than the host. The
module's copy of `SINCE` knows the method's version even though the host does not.

**On the wire (additive).** A refusal (`responseSchema`, and `serverAskResult` for a module's
server) may carry `declined: 'host-too-old'` and `since` (`declinedFields`). A host from 2.22.0 on
sends `declined` with `reason: 'unknown-method'` for a method it does not know. A reader from
before 2.22.0 strips both fields and sees `unknown-method`, as it always did.

**In the client.** `connection.request` still rejects with `HostRefused`. For a method this package
knows that the host refused as `unknown-method`, the refusal carries `declined: 'host-too-old'` and
`since` from `METHOD_SINCE`. This works against every host, including ones from before 2.22.0.

**From a module's server.** `askHost` returns
`{ ok: false, declined: 'host-too-old', since, why: FIT_SAYS.tooOld(since) }`. It does this when a
host says `declined`, when a host answers `unknown-method` for a known server method, and when a
host from before 2.22.0 refuses the question as malformed because its `SERVER_METHODS` does not
have the method.

**One check for all of them.** `hostTooOld(value)` reads a `HostRefused`, its `refusal`, an
`AskedHost`, or a body a module's own server passed on in this shape. It returns
`{ outcome: 'declined', reason: 'host-too-old', since }`, or null:

```ts
import { FIT_SAYS, hostTooOld } from 'kehikot-module-protocol/client'

try {
  await host.request('parts.get', { epic })
} catch (error) {
  const tooOld = hostTooOld(error)
  if (tooOld) return show(FIT_SAYS.tooOld(tooOld.since)) // "This needs Kehikot with protocol 2.21 or later."
  throw error
}
```

The line is optional. The host's own notice is what the person relies on, and a module that shows
nothing here still gets that notice.

`tooOldOf(method, refusal, kind?)` is the rule that the client and `askHost` share, for code that
handles the wire itself.

## Versions

`versionParts`, `compareVersions` (compares numbers, not strings), `newerVersion`, and
`versionSaid` (`2.21` for `2.21.0`; the patch is kept only when it is not 0). `PROTOCOL_VERSION` is
the pattern: `major.minor.patch`, digits only.
