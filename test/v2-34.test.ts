import { describe, expect, test } from 'bun:test'

import {
  PACKAGE_VERSION,
  PIPELINE_STATES,
  PROTOCOL,
  TRACKER_FIELD_SINCE,
  sinceOf,
  trackerReadingResult,
  trackerRowSchema,
} from '../src/index.js'

/**
 * 2.34.0: a change's pipeline says where a person sees it (`pipelineUrl`) and when its state last
 * moved (`pipelineAt`), beside the `pipeline` word that was already there. Both optional and
 * dropped, not fatal, when they do not parse, so a module built before them reads the rows whole.
 */

const change = {
  ref: '!12',
  tracker: 'gitlab' as const,
  host: 'gitlab.example.org',
  repo: 'group/project',
  number: 12,
  kind: 'change' as const,
  state: 'open' as const,
  title: 't',
  url: 'https://gitlab.example.org/group/project/-/merge_requests/12',
  readAt: '2026-10-30T10:00:00Z',
}

describe('the version', () => {
  test('is 2.34.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.37.0')
    expect(PROTOCOL).toBe(2)
  })
})

describe('pipelineUrl and pipelineAt on a tracker row', () => {
  test('a change carries its pipeline, the page and the time', () => {
    const row = trackerRowSchema.parse({
      ...change,
      pipeline: 'failed',
      pipelineUrl: 'https://gitlab.example.org/group/project/-/pipelines/99',
      pipelineAt: '2026-10-30T09:48:00Z',
    })
    expect(row.pipeline).toBe('failed')
    expect(row.pipelineUrl).toBe('https://gitlab.example.org/group/project/-/pipelines/99')
    expect(row.pipelineAt).toBe('2026-10-30T09:48:00Z')
  })

  test('every pipeline word still parses, with and without the new fields', () => {
    for (const pipeline of PIPELINE_STATES) {
      expect(trackerRowSchema.parse({ ...change, pipeline }).pipeline).toBe(pipeline)
      expect(trackerRowSchema.parse({ ...change, pipeline, pipelineAt: '2026-10-30T09:48:00+02:00' }).pipelineAt).toBe(
        '2026-10-30T09:48:00+02:00',
      )
    }
  })

  test('absent stays absent; a row from an older host reads the same', () => {
    const row = trackerRowSchema.parse({ ...change, pipeline: 'running' })
    expect(row.pipelineUrl).toBeUndefined()
    expect(row.pipelineAt).toBeUndefined()
    expect('pipelineUrl' in row).toBe(false)
  })

  test('a field that does not parse is dropped, and the row and the reading are kept', () => {
    const row = trackerRowSchema.parse({ ...change, pipeline: 'success', pipelineUrl: 'x'.repeat(100_000), pipelineAt: 'yesterday' })
    expect(row.pipeline).toBe('success')
    expect(row.pipelineUrl).toBeUndefined()
    expect(row.pipelineAt).toBeUndefined()
    const reading = trackerReadingResult.parse({ rows: [{ ...change, pipeline: 'success', pipelineAt: 42 }] })
    expect(reading.rows[0]!.pipeline).toBe('success')
    expect(reading.rows[0]!.pipelineAt).toBeUndefined()
  })

  test('both are in TRACKER_FIELD_SINCE at 2.34.0', () => {
    expect(TRACKER_FIELD_SINCE.pipelineUrl).toBe('2.34.0')
    expect(TRACKER_FIELD_SINCE.pipelineAt).toBe('2.34.0')
    expect(sinceOf('trackerField', 'pipelineAt')).toBe('2.34.0')
  })
})
