/**
 * Proposed changes to the texts a module keeps (2.71.0): the model, the diff,
 * measuring and applying with stale detection, deciding with a reason, the
 * book, the sentences, and the four MCP tools. Pure — no filesystem, no DOM —
 * so a server, a page and a test import the same thing. The file store is
 * `kehikot-module-protocol/proposals/store`, the React parts
 * `kehikot-module-protocol/client/proposals`. Design notes: docs/proposals.md.
 */
export { PROPOSAL_STATUSES, STALE_REASONS, ACCEPT_WAYS, PROPOSAL_MOST, BOOK_KEEPS_SETTLED, fingerprint, hashText, mintProposalId, mintToken, hashToken, tokenFits, shown, locate, file, measure, measureAll, staleSaid, apply, decide, proposalHunks, emptyBook, bookOf, withProposal, openOf, settledOf, proposalById, outcomeSaid, decisionNews, proposalLine, countSaid, } from './core.js';
export { tokenize, diffBlocks, hunksOf, takeHunks, partOf } from './diff.js';
export { openProposals, settledProposals, proposalOf, measured, fileProposal, decideProposal, withdrawProposal, memoryKeeper, } from './site.js';
export { PROPOSAL_TOOL_NAMES, isProposalTool, proposalTools, answerProposalTool } from './door.js';
