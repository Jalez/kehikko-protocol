# After a restart: conversations carry on (2.110.0)

`keepsCutOffMark`, `cutOffByRestart`, `resumeLine`, `restartOf`, `isResumeLine`, `RESUME_WINDOW_MS`,
`RESTART_REASON_ENV`, `RESTART_VERSION_ENV` and `RESTART_REASONS` from the package (`src/restart.ts`).

## Why, from the person's side

An app update or a restart should not mean going to each space and typing "continue". The
conversations that were doing something when Kehikot stopped pick their work up again on their own;
everything else is left alone.

## Which conversations

Only the ones a restart actually cut off: a conversation whose process the agent module holds (one
opened in its terminal; one the program runs in its own background lives on) that was

- **working**: a turn was under way; or
- **waiting on its own background work**: its turn ended with background tasks or a scheduled wake
  still running. Those ran inside its process, so the restart stopped what was going to wake it.

A finished conversation, one waiting for the person, and an idle one lost nothing and are never
woken. Subagents and background shells need nothing of their own: they live in the conversation's
process, and the woken conversation reads in its own task notifications what did not finish.

## What a module does

1. Keep a mark in its record while `keepsCutOffMark({ held, working, waking })` is true: one write
   when it starts and one when it ends.
2. At its start, for each conversation of the record: `cutOffByRestart({ running, background, marked,
   legacy })`. `legacy` is only for a record from before the mark: how long ago its transcript grew
   and whether its last turn was still under way (`RESUME_WINDOW_MS`, 30 minutes).
3. For each one cut off: clear the mark first (once per interruption), then wake it in the
   background with `resumeLine(restartOf())`, and add one Inbox line saying so. The person's switch
   "Resume conversations cut off by a restart" turns this off per project.

When it later asks whether the person said something in a conversation, it leaves out
`isResumeLine` prompts: the sentence is the module's, not the person's.

## Why it restarted

The host passes `KEHIKOT_RESTART_REASON` (`app-update`, `app-restart`, `module-update`,
`module-restart`) and, for an update, `KEHIKOT_RESTART_VERSION` to the modules it starts after a
restart it made. `restartOf()` reads them; a value it does not know is no reason. No reason (an
older host, a crash, the computer restarting) is said as a restart with what may have been cut off.

## Checked

`kehikot-check-agent` fails a module that provides `agent.delivery` and does not call
`keepsCutOffMark`, `cutOffByRestart` and `resumeLine`.

## Holding an app restart behind queued work

A work queue that says `hold` in its `work.queue` descriptor takes an app restart as a run of its
own: the host POSTs `workHoldParams` (`token`, `reason`, `label`) there and is answered
`workHoldResult` — `held` with how many runs are `ahead`, or not held (nothing running or waiting;
the host restarts now). When the hold's turn comes, the queue's server asks `restart.release`
`{ token, go: true }` (capability `app:restart`); `go: false` says the person cancelled it in the
queue. The host answers `unknown` for a token it no longer holds. No `hold`, or no provider, and the
host restarts at once, as before. Conversations do not hold a restart: they are woken after it.
