/**
 * Everything the two sides say to each other, gathered under one name.
 *
 * The shapes live in four files by what they describe — a place in a document
 * (`passage.ts`), what a module offers to be narrowed by (`filters.ts`), what a
 * module is told about where the reader is standing (`context.ts`), and the
 * messages themselves (`messages.ts`). This file re-exports all of them, so
 * `./wire.js` names exactly what it always did.
 */
export * from './passage.js'
export * from './filters.js'
export * from './context.js'
export * from './messages.js'
