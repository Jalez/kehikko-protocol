import { GlobalRegistrator } from '@happy-dom/global-registrator'

/**
 * A document, for the one suite that renders into one.
 *
 * Registered globally rather than per-file because half the value of the React
 * tests is that they run the real hook against a real render — the ordering
 * being asserted is React's own, and a fake renderer would run the effects in an
 * order React does not.
 *
 * Everything else in this package is shapes and does not care. It is worth being
 * explicit that it does not care by accident: `src/client/mailbox.ts` asks
 * `typeof window === 'undefined'` at module scope, so under this preload the
 * singleton mailbox installs a listener on happy-dom's window instead of being
 * an inbox nothing posts to. Nothing outside `client-react.test.ts` subscribes
 * to it, and every other client test builds its own inbox with `makeMailbox`
 * precisely so that it never depends on which of those two happened.
 */
GlobalRegistrator.register()

/**
 * React's own switch for "this is a test, effects may be flushed on demand".
 *
 * Without it every `act(...)` prints a paragraph of red into a suite that
 * passes, which is the kind of noise that trains a person to stop reading test
 * output.
 */
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
