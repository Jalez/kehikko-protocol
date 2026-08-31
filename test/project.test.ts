import { describe, expect, test } from 'bun:test'
import {
  DATA_FILE,
  KEHIKKO_DIR,
  KEHIKKO_IGNORE,
  ignoresKehikko,
  kehikkoDir,
  kehikkoFile,
  withKehikkoIgnored,
  within,
} from '../src/index.js'

/**
 * What is tested here is the four things a module would get wrong on its own.
 *
 * Where the folder is; that "no project" comes out as `null` rather than as a
 * guessed path; that the prefix comparison does not accept a sibling directory
 * whose name merely starts the same; and that appending to somebody's
 * `.gitignore` happens exactly once however many times it is asked for.
 */

describe('where a module keeps this project’s data', () => {
  test('is .kehikko beside the project', () => {
    expect(kehikkoDir('/Users/x/Projects/roadmap')).toBe('/Users/x/Projects/roadmap/.kehikko')
    expect(kehikkoFile('/Users/x/Projects/roadmap', 'notes')).toBe('/Users/x/Projects/roadmap/.kehikko/notes.json')
  })

  test('tolerates a trailing slash rather than producing a doubled one', () => {
    expect(kehikkoDir('/Users/x/roadmap/')).toBe('/Users/x/roadmap/.kehikko')
    expect(kehikkoFile('/Users/x/roadmap//', 'notes')).toBe('/Users/x/roadmap/.kehikko/notes.json')
  })

  /* The important one. A module handed no project must be handed no path — not
     its own directory, not the working directory, not anything it invented —
     because a write to a guessed location is somebody's notes going somewhere
     they will never look, under a screen that says they were saved. */
  test('says null when there is no project, and never guesses', () => {
    expect(kehikkoDir(null)).toBeNull()
    expect(kehikkoDir(undefined)).toBeNull()
    expect(kehikkoDir('')).toBeNull()
    expect(kehikkoDir('   ')).toBeNull()
    expect(kehikkoFile(null, 'notes')).toBeNull()
    expect(kehikkoFile('', 'notes')).toBeNull()
  })

  /* A file name is a constant in the module that owns it. Anything else is a
     program being wrong, and it is louder than a null so it cannot be wrong
     quietly. */
  test('throws on a file name a module may not give itself', () => {
    for (const bad of ['../escape', 'notes.json', 'Notes', 'notes/deep', '', '-notes', 'notes-', 'a']) {
      expect(() => kehikkoFile('/p', bad)).toThrow()
    }
    expect(DATA_FILE.test('checklists')).toBe(true)
    expect(DATA_FILE.test('a-b-2')).toBe(true)
  })
})

describe('within, which is a comparison and not a fence', () => {
  test('accepts the folder itself and anything under it', () => {
    expect(within('/p/.kehikko', '/p/.kehikko')).toBe(true)
    expect(within('/p/.kehikko/', '/p/.kehikko/notes.json')).toBe(true)
  })

  /* The bug this function exists to not have. A plain `startsWith` says yes
     here, and the one character is the whole escape. */
  test('refuses a sibling whose name merely begins the same', () => {
    expect(within('/p/.kehikko', '/p/.kehikko-elsewhere/notes.json')).toBe(false)
    expect(within('/p/.kehikko', '/p/.kehikkox')).toBe(false)
  })

  test('refuses a path above it, and refuses an empty parent outright', () => {
    expect(within('/p/.kehikko', '/p')).toBe(false)
    expect(within('', '/anything')).toBe(false)
    expect(within('/', '/anything')).toBe(false)
  })
})

describe('the line a project’s .gitignore gains', () => {
  test('is added once, with a comment saying what the folder is', () => {
    const before = 'node_modules\ndist\n'
    const after = withKehikkoIgnored(before)
    expect(after.startsWith(before)).toBe(true)
    expect(after).toContain(`${KEHIKKO_DIR}/`)
    expect(after).toContain('Remove these lines to')
  })

  /* The whole reason this is a pure function with a test: it runs against a
     file in the user's own repository, and a second run that appended a second
     copy would show up in their next diff as changes they did not make. */
  test('is not added twice, however many times it is asked for', () => {
    const once = withKehikkoIgnored('node_modules\n')
    expect(withKehikkoIgnored(once)).toBe(once)
    expect(withKehikkoIgnored(withKehikkoIgnored(once))).toBe(once)
  })

  test('leaves every byte that was already there exactly where it was', () => {
    const untidy = '  dist  \n\n\n#   node_modules\n\tbuild'
    expect(withKehikkoIgnored(untidy).startsWith(`${untidy}\n`)).toBe(true)
  })

  test('an empty .gitignore becomes just the block, with no leading blank line', () => {
    expect(withKehikkoIgnored('')).toBe(KEHIKKO_IGNORE)
    expect(withKehikkoIgnored('\n\n')).toBe(KEHIKKO_IGNORE)
  })

  test('recognises the spellings that already do the job, and leaves the file alone', () => {
    for (const rule of ['.kehikko', '.kehikko/', '/.kehikko/', '**/.kehikko/', 'anything/.kehikko']) {
      expect(ignoresKehikko(`dist\n${rule}\n`)).toBe(true)
      expect(withKehikkoIgnored(`dist\n${rule}\n`)).toBe(`dist\n${rule}\n`)
    }
  })

  /* Somebody who commented the rule out decided something. Appending it back
     under their `#` would be arguing with them in their own file. */
  test('treats a commented-out rule as a decision, not as an absence', () => {
    expect(ignoresKehikko('# .kehikko/\n')).toBe(true)
    expect(withKehikkoIgnored('# .kehikko/\n')).toBe('# .kehikko/\n')
  })

  test('is not fooled by a rule for something else that starts the same', () => {
    expect(ignoresKehikko('.kehikko-notes/\n')).toBe(false)
    expect(ignoresKehikko('kehikko/\n')).toBe(false)
    expect(ignoresKehikko('')).toBe(false)
  })
})
