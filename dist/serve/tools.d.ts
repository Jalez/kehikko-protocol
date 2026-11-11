import { type PlacedGuard, type ToolCall, type ToolCallDecision, type ToolFacts } from '../guards.js';
/**
 * 2.80.0. THE CALL EVERY AGENT MODULE MAKES before any tool runs: what becomes of `call` under every
 * kind of guard the modules placed on the session's kehikko declare (`toolCallDecision`), with this
 * computer's facts filled in — the home folder for `~/` patterns, and which checkout a file is in
 * (`checkoutOf`). Pass `facts` to tell them otherwise (a test, or `env` with `KEHIKOT_DIRECT`).
 */
export declare function checkToolCall(call: ToolCall, guards: readonly PlacedGuard[], facts?: ToolFacts): ToolCallDecision;
