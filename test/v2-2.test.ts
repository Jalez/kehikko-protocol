import { describe, expect, test } from 'bun:test'

import {
  HOST_FOLDER,
  KEHIKOT_DIR,
  LEGACY_HOST_FOLDER,
  PACKAGE_VERSION,
  PROTOCOL,
  hostDir,
  hostFile,
  legacyHostFile,
  moduleDir,
  moduleFolder,
} from '../src/index.js'

/** 2.2.0: the host's own folder in a project is `.kehikot/host/`; before, it was `.kehikot/kehikko/`. */

describe('the version', () => {
  test('is 2.3.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.30.0')
    expect(PROTOCOL).toBe(2)
  })
})

describe('the names', () => {
  test('HOST_FOLDER is host, LEGACY_HOST_FOLDER is kehikko', () => {
    expect(HOST_FOLDER).toBe('host')
    expect(LEGACY_HOST_FOLDER).toBe('kehikko')
    expect(KEHIKOT_DIR).toBe('.kehikot')
  })
})

describe('hostDir', () => {
  test('is .kehikot/host, or .kehikot/kehikko when asked for the legacy one', () => {
    expect(hostDir('/p')).toBe('/p/.kehikot/host')
    expect(hostDir('/p/')).toBe('/p/.kehikot/host')
    expect(hostDir('/p', { legacy: true })).toBe('/p/.kehikot/kehikko')
  })
  test('is null with no project', () => {
    expect(hostDir(null)).toBeNull()
    expect(hostDir(undefined)).toBeNull()
    expect(hostDir('  ')).toBeNull()
  })
})

describe('hostFile', () => {
  test('joins segments under the host folder', () => {
    expect(hostFile('/p', 'kehikot.json')).toBe('/p/.kehikot/host/kehikot.json')
    expect(hostFile('/p', 'epics', 'x.json')).toBe('/p/.kehikot/host/epics/x.json')
    expect(hostFile('/p')).toBe('/p/.kehikot/host')
    expect(legacyHostFile('/p', 'epics', 'x.json')).toBe('/p/.kehikot/kehikko/epics/x.json')
  })
  test('is null with no project, but still checks its segments', () => {
    expect(hostFile(null, 'epics')).toBeNull()
    expect(() => hostFile(null, '..')).toThrow()
  })
  test('refuses a segment that could leave the folder', () => {
    for (const bad of ['', '.', '..', 'a/b', '../x', 'a\\b', 'a b', 'x'.repeat(129)]) {
      expect(() => hostFile('/p', bad)).toThrow()
      expect(() => legacyHostFile('/p', 'epics', bad)).toThrow()
    }
  })
  test('takes dotted file names', () => {
    expect(hostFile('/p', 'state', '.lock')).toBe('/p/.kehikot/host/state/.lock')
    expect(hostFile('/p', 'a.b-c_d.json')).toBe('/p/.kehikot/host/a.b-c_d.json')
  })
})

describe('moduleFolder', () => {
  test('refuses an id that would derive the host folder', () => {
    expect(() => moduleFolder('kehikot.host')).toThrow(/host's own folder/)
    expect(() => moduleFolder('host')).toThrow(/host's own folder/)
    expect(() => moduleDir('/p', 'kehikot.host')).toThrow()
  })
  test('still refuses project.json', () => {
    expect(() => moduleFolder('kehikot.project.json')).toThrow()
  })
  test('still derives the legacy folder, for a host built before 2.2.0', () => {
    expect(moduleFolder('kehikko')).toBe(LEGACY_HOST_FOLDER)
  })
  test('takes names that only contain host', () => {
    expect(moduleFolder('kehikot.hosting')).toBe('hosting')
    expect(moduleFolder('kehikot.ghost')).toBe('ghost')
  })
})
