# Uninstall: a module's own clean-up (2.108.0)

`UNINSTALL_SCRIPT` (`uninstall.ts`), `uninstallReportSchema`, `readUninstallReport` from the package;
`runUninstall` and `removeOwned` from `kehikot-module-protocol/serve`.

## Why, from the person's side

A person who presses Uninstall expects the module to be gone: not only off the list, but everything
it put on their computer. A host can delete what the HOST put there (the installed copy, the
registration, the module's logs, its rows in the host's database). It cannot know what the module
itself wrote elsewhere — an entry in an agent's settings, skills copied into an agent's folder, a
file beside the registry, session folders in the temporary directory — and it must not edit an
agent's configuration on a guess. Only the module knows what is its own. So the module says it, in
code that runs when it is uninstalled.

## The contract

A module that writes anything outside its own folder and outside projects ships `uninstall.ts` at
its root. A host runs it on Uninstall:

1. after the module is stopped, and before its folder is deleted;
2. as `bun uninstall.ts`, with the module's folder as the working directory and the environment the
   host starts the module with (`KEHIKOT_MODULES_DIR` and the other `KEHIKOT_*` locations, `HOME`);
3. for at most `LIMITS.UNINSTALL_MS` (60 s).

It:

- removes only what this module wrote. A person's entry beside its own, and a file of its own the
  person changed, are left, and said in `left` with why;
- never touches a project (`<project>/.kehikot/…` is the person's work; a host offers to remove that
  separately, with the person's say);
- may run twice, or after a run that stopped part way: what is already gone is not an error;
- prints ONE line, `UNINSTALL_MARK` and the report as JSON, and exits 0 even when something was left.

```ts
// uninstall.ts
import { removeOwned, runUninstall } from 'kehikot-module-protocol/serve'

await runUninstall([
  () => removeMyHookEntry(),                        // { removed: [...], left: [...] }
  () => removeOwned(sessionsDir(), 'Its session folders'),
])
```

`runUninstall` runs every step, keeps going past one that throws (said as `left`), prints the line
and returns the report.

## What a host does with it

The report's `removed` and `left` go into the summary the person reads after Uninstall. A module
with no `uninstall.ts` (one that writes nothing outside its folder, or one older than 2.108.0) is
cleaned of what the host can prove it owns, and the host says what it could not look after.

## Carried in a bundle

`kehikot-bundle` always carries `uninstall.ts`, bundled to run by path, whether or not the server
imports it, so an installed bundle can clean up after itself.

## Checked

`kehikot-check-agent` fails an agent module (one that declares `agents:message`) with no
`uninstall.ts` that calls `runUninstall`: every agent module writes session folders and settings
outside its own folder.
