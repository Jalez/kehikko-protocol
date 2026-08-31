import { describe, expect, test } from 'bun:test'
import {
  DATA_FILE,
  KEHIKOT_DIR,
  KEHIKOT_IGNORE,
  MODULE_FOLDER,
  ignoresKehikot,
  kehikotDir,
  moduleDir,
  moduleFile,
  moduleFolder,
  withKehikotIgnored,
  within,
} from '../src/index.js'

/**
 * What is tested here is the five things a module would get wrong on its own.
 *
 * Where the folder is; what a module's own directory inside it is called, given
 * that the name is derived from an id and then JOINED ONTO SOMEBODY'S PROJECT
 * ROOT; that "no project" comes out as `null` rather than as a guessed path;
 * that the prefix comparison does not accept a sibling directory whose name
 * merely starts the same; and that appending to somebody's `.gitignore` happens
 * exactly once however many times it is asked for.
 */

describe('where a module keeps this project’s data', () => {
  test('is its own folder under .kehikot, beside the project', () => {
    expect(kehikotDir('/Users/x/Projects/roadmap')).toBe('/Users/x/Projects/roadmap/.kehikot')
    expect(moduleDir('/Users/x/Projects/roadmap', 'roadmap.notes')).toBe('/Users/x/Projects/roadmap/.kehikot/notes')
    expect(moduleFile('/Users/x/Projects/roadmap', 'roadmap.notes', 'notes')).toBe(
      '/Users/x/Projects/roadmap/.kehikot/notes/notes.json',
    )
  })

  /* The reason a folder per module was asked for: a second file needs no prefix
     to say whose it is, because the directory already said. */
  test('lets one module keep two files without either name having to disambiguate', () => {
    expect(moduleFile('/p', 'roadmap.checklist', 'checklists')).toBe('/p/.kehikot/checklist/checklists.json')
    expect(moduleFile('/p', 'roadmap.checklist', 'papers')).toBe('/p/.kehikot/checklist/papers.json')
  })

  test('tolerates a trailing slash rather than producing a doubled one', () => {
    expect(kehikotDir('/Users/x/roadmap/')).toBe('/Users/x/roadmap/.kehikot')
    expect(moduleFile('/Users/x/roadmap//', 'roadmap.notes', 'notes')).toBe('/Users/x/roadmap/.kehikot/notes/notes.json')
  })

  /* The important one. A module handed no project must be handed no path — not
     its own directory, not the working directory, not anything it invented —
     because a write to a guessed location is somebody's notes going somewhere
     they will never look, under a screen that says they were saved. */
  test('says null when there is no project, and never guesses', () => {
    expect(kehikotDir(null)).toBeNull()
    expect(kehikotDir(undefined)).toBeNull()
    expect(kehikotDir('')).toBeNull()
    expect(kehikotDir('   ')).toBeNull()
    expect(moduleDir(null, 'roadmap.notes')).toBeNull()
    expect(moduleFile(null, 'roadmap.notes', 'notes')).toBeNull()
    expect(moduleFile('', 'roadmap.notes', 'notes')).toBeNull()
  })

  /* A file name is a constant in the module that owns it. Anything else is a
     program being wrong, and it is louder than a null so it cannot be wrong
     quietly. */
  test('throws on a file name a module may not give one of its files', () => {
    for (const bad of ['../escape', 'notes.json', 'Notes', 'notes/deep', '', '-notes', 'notes-', 'a']) {
      expect(() => moduleFile('/p', 'roadmap.notes', bad)).toThrow()
    }
    expect(DATA_FILE.test('checklists')).toBe(true)
    expect(DATA_FILE.test('a-b-2')).toBe(true)
  })
})

describe('a module’s folder name, which is a path built from data', () => {
  test('is the id with the roadmap. prefix taken off', () => {
    expect(moduleFolder('roadmap.checklist')).toBe('checklist')
    expect(moduleFolder('roadmap.notes')).toBe('notes')
    expect(moduleFolder('roadmap.learning')).toBe('learning')
    expect(moduleFolder('roadmap.journeys')).toBe('journeys')
  })

  /* This package does not get to decide that somebody else's namespace is
     noise. Only its own prefix comes off. */
  test('leaves an id with no such prefix whole', () => {
    expect(moduleFolder('acme.charts')).toBe('acme.charts')
    expect(moduleFolder('charts')).toBe('charts')
  })

  /* The whole reason this is a function with a rule of its own rather than a
     `slice`. The name is about to be joined onto somebody's project root, and
     `roadmap.` alone would slice to the empty string — which joined onto a root
     IS the root, every module writing into the project itself. */
  test('cannot produce a name that would escape the folder, or an empty one', () => {
    for (const bad of ['', '.', '..', 'roadmap.', '/etc/passwd', 'roadmap./..', 'a/b', 'roadmap.a/b', 'ROADMAP.x']) {
      expect(() => moduleFolder(bad)).toThrow()
    }
    for (const name of ['.', '..', '', 'a/b', '.hidden']) {
      expect(MODULE_FOLDER.test(name)).toBe(false)
    }
  })

  test('refuses anything that is not a string', () => {
    for (const bad of [null, undefined, 42, {}, []] as unknown[]) {
      expect(() => moduleFolder(bad as string)).toThrow()
    }
  })
})

describe('within, which is a comparison and not a fence', () => {
  test('accepts the folder itself and anything under it', () => {
    expect(within('/p/.kehikot/notes', '/p/.kehikot/notes')).toBe(true)
    expect(within('/p/.kehikot/notes/', '/p/.kehikot/notes/notes.json')).toBe(true)
  })

  /* The bug this function exists to not have. A plain `startsWith` says yes
     here, and the one character is the whole escape. */
  test('refuses a sibling whose name merely begins the same', () => {
    expect(within('/p/.kehikot/notes', '/p/.kehikot/notes-elsewhere/notes.json')).toBe(false)
    expect(within('/p/.kehikot', '/p/.kehikotx')).toBe(false)
  })

  test('refuses a path above it, and refuses an empty parent outright', () => {
    expect(within('/p/.kehikot/notes', '/p/.kehikot')).toBe(false)
    expect(within('', '/anything')).toBe(false)
    expect(within('/', '/anything')).toBe(false)
  })
})

describe('the line a project’s .gitignore gains', () => {
  test('is added once, with a comment saying what the folder is', () => {
    const before = 'node_modules\ndist\n'
    const after = withKehikotIgnored(before)
    expect(after.startsWith(before)).toBe(true)
    expect(after).toContain(`${KEHIKOT_DIR}/`)
    expect(after).toContain('Remove these lines to')
  })

  /* The whole reason this is a pure function with a test: it runs against a file
     in the user's own repository, and a second run that appended a second copy
     would show up in their next diff as changes they did not make. */
  test('is not added twice, however many times it is asked for', () => {
    const once = withKehikotIgnored('node_modules\n')
    expect(withKehikotIgnored(once)).toBe(once)
    expect(withKehikotIgnored(withKehikotIgnored(once))).toBe(once)
  })

  test('leaves every byte that was already there exactly where it was', () => {
    const untidy = '  dist  \n\n\n#   node_modules\n\tbuild'
    expect(withKehikotIgnored(untidy).startsWith(`${untidy}\n`)).toBe(true)
  })

  test('an empty .gitignore becomes just the block, with no leading blank line', () => {
    expect(withKehikotIgnored('')).toBe(KEHIKOT_IGNORE)
    expect(withKehikotIgnored('\n\n')).toBe(KEHIKOT_IGNORE)
  })

  test('recognises the spellings that already do the job, and leaves the file alone', () => {
    for (const rule of ['.kehikot', '.kehikot/', '/.kehikot/', '**/.kehikot/', 'anything/.kehikot']) {
      expect(ignoresKehikot(`dist\n${rule}\n`)).toBe(true)
      expect(withKehikotIgnored(`dist\n${rule}\n`)).toBe(`dist\n${rule}\n`)
    }
  })

  /* Somebody who commented the rule out decided something. Appending it back
     under their `#` would be arguing with them in their own file. */
  test('treats a commented-out rule as a decision, not as an absence', () => {
    expect(ignoresKehikot('# .kehikot/\n')).toBe(true)
    expect(withKehikotIgnored('# .kehikot/\n')).toBe('# .kehikot/\n')
  })

  test('is not fooled by a rule for something else that starts the same', () => {
    expect(ignoresKehikot('.kehikot-notes/\n')).toBe(false)
    expect(ignoresKehikot('kehikot/\n')).toBe(false)
    expect(ignoresKehikot('.kehikko/\n')).toBe(false)
    expect(ignoresKehikot('')).toBe(false)
  })
})
