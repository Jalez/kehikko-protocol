import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  CAPABILITIES,
  CONTENT_STEPS,
  LIMITS,
  METHODS,
  PACKAGE_VERSION,
  PLAN_FILE,
  PROTOCOL,
  SERVER_METHODS,
  SERVER_PROJECT_METHODS,
  contentStamp,
  dispositionsGetResult,
  isKehikkoBound,
  loadsSkills,
  manifestSchema,
  meetsNeed,
  methodParams,
  missingNeeds,
  moduleSkillSchema,
  neededIds,
  needSaid,
  partsGetResult,
  phaseOf,
  planIn,
  planOfJourney,
  planSchema,
  plansIn,
  plansUnion,
  providesOf,
  resultSchemaFor,
  serverAskSchema,
  skillNeedsSchema,
  stepsListResult,
  type ProvidingManifest,
} from '../src/index.js'
import { askHost, readPlans, readPlansFor, writePlan } from '../src/serve/index.js'

/**
 * 2.21.0: an epic's steps as a holding any module publishes (`steps.json`, `planSchema`) and the
 * union a host answers `steps.list` with; skill needs by what a module provides; a module's server
 * asking for epics, steps, parts and dispositions.
 */

const PASS = 'p'.repeat(40)
const ENV = { KEHIKOT_ORIGINS: 'http://127.0.0.1:8021' }

const PLAN = {
  goal: 'A person can post from the seam',
  phases: [{ id: 'shape', title: 'Shaping' }, { id: 'build', title: 'Building' }],
  steps: [
    { id: 'objective', title: 'The seam exists', phase: 'build' },
    { id: 'draft', title: 'Draft it', refs: ['gh#12'], under: 'objective', phase: 'shape' },
    {
      id: 'wire',
      title: 'Wire it',
      refs: ['gh#13'],
      under: 'objective',
      after: ['draft'],
      gates: [{ id: 'legal', title: 'Legal signs off', kind: 'decision' as const, owner: 'Legal' }],
    },
  ],
}

function project(): string {
  return mkdtempSync(join(tmpdir(), 'kehikot-plans-'))
}

describe('the version', () => {
  test('is 2.21.1, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.30.0')
    expect(PROTOCOL).toBe(2)
  })
})

describe('planSchema', () => {
  test('fills the defaults a writer may leave out', () => {
    const plan = planSchema.parse(PLAN)
    expect(plan.steps[0]).toEqual({ id: 'objective', title: 'The seam exists', body: '', refs: [], related: [], after: [], phase: 'build', gates: [] })
    expect(plan.steps[2]!.gates[0]).toEqual({ id: 'legal', title: 'Legal signs off', kind: 'decision', owner: 'Legal', waitsOn: [], done: false })
  })

  test('refuses two steps or two phases with one id, an unknown gate kind and ids that are not ids', () => {
    expect(planSchema.safeParse({ steps: [{ id: 'a', title: 'A' }, { id: 'a', title: 'B' }] }).success).toBe(false)
    expect(planSchema.safeParse({ phases: [{ id: 'p', title: 'P' }, { id: 'p', title: 'Q' }] }).success).toBe(false)
    expect(planSchema.safeParse({ steps: [{ id: 'a', title: 'A', gates: [{ id: 'g', title: 'G', kind: 'vibes' }] }] }).success).toBe(false)
    expect(planSchema.safeParse({ steps: [{ id: 'Not An Id', title: 'A' }] }).success).toBe(false)
  })

  test('is bounded', () => {
    const many = Array.from({ length: LIMITS.PLAN_STEPS + 1 }, (_, i) => ({ id: `s${i}`, title: 'x' }))
    expect(planSchema.safeParse({ steps: many }).success).toBe(false)
    expect(planSchema.safeParse({ steps: [{ id: 'a', title: 'A', body: 'x'.repeat(LIMITS.PLAN_BODY + 1) }] }).success).toBe(false)
  })
})

describe('planIn reads leniently', () => {
  test('a bad entry costs that entry, never the plan', () => {
    const read = planIn({
      phases: [{ id: 'p', title: 'P' }, { id: 'p', title: 'again' }, { title: 'no id' }],
      steps: [
        { id: 'a', title: 'A', refs: ['gh#1', 7, ''], gates: [{ id: 'g', title: 'G', kind: 'work' }, { id: 'bad' }] },
        { id: 'a', title: 'a second a' },
        { title: 'no id' },
        { id: 'b', title: 'B', under: 'nowhere', after: ['a', 'b', 'gone'], phase: 'unknown' },
      ],
    })!
    expect(read.phases).toEqual([{ id: 'p', title: 'P' }])
    expect(read.steps.map((step) => step.id)).toEqual(['a', 'b'])
    expect(read.steps[0]!.refs).toEqual(['gh#1'])
    expect(read.steps[0]!.gates.map((gate) => gate.id)).toEqual(['g'])
    expect(read.steps[1]!.under).toBeUndefined()
    expect(read.steps[1]!.after).toEqual(['a'])
    expect(read.steps[1]!.phase).toBeUndefined()
  })

  test('null for what is not a plan at all', () => {
    expect(planIn(null)).toBeNull()
    expect(planIn([])).toBeNull()
    expect(planIn('plan')).toBeNull()
  })

  test('plansIn keeps an epic said to have no steps, and drops a key that is not a slug', () => {
    expect(plansIn({ epics: { one: { steps: [] }, 'Not A Slug': PLAN } })).toEqual({ one: { phases: [], steps: [] } })
    expect(plansIn(null)).toEqual({})
  })

  test('phaseOf: a step names its phase, or is in the phase of the nearest step above it that does', () => {
    const plan = planSchema.parse(PLAN)
    expect(phaseOf(plan, 'draft')).toBe('shape')
    expect(phaseOf(plan, 'wire')).toBe('build')
    expect(phaseOf(plan, 'nowhere')).toBeUndefined()
    /* A loop of `under` in a bad file does not hang the reader. */
    expect(phaseOf({ steps: [{ ...plan.steps[0]!, id: 'x', under: 'y', phase: undefined }, { ...plan.steps[0]!, id: 'y', under: 'x', phase: undefined }] }, 'x')).toBeUndefined()
  })
})

describe('steps.json, written and read', () => {
  test('writePlan publishes one epic, keeps the others, and says when nothing changed', () => {
    const root = project()
    try {
      const first = writePlan(root, 'kehikot.planner', 'seam', PLAN)!
      expect(first.file).toBe(join(root, '.kehikot', 'planner', `${PLAN_FILE}.json`))
      expect(first.changed).toBe(true)
      writePlan(root, 'kehikot.planner', 'other', { steps: [{ id: 'one', title: 'One' }] })
      expect(writePlan(root, 'kehikot.planner', 'seam', PLAN)!.changed).toBe(false)
      const written = JSON.parse(readFileSync(first.file, 'utf8'))
      expect(written.version).toBe(1)
      expect(written.module).toBe('kehikot.planner')
      expect(Object.keys(written.epics).sort()).toEqual(['other', 'seam'])
      writePlan(root, 'kehikot.planner', 'other', null)
      expect(Object.keys(JSON.parse(readFileSync(first.file, 'utf8')).epics)).toEqual(['seam'])
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test('a plan that does not fit is refused whole; a reference to nothing is dropped and said', () => {
    const root = project()
    try {
      expect(() => writePlan(root, 'kehikot.planner', 'seam', { steps: [{ id: 'a', title: '' }] })).toThrow(/does not fit/)
      expect(() => writePlan(root, 'kehikot.planner', 'Not A Slug', PLAN)).toThrow(/not an epic/)
      const said = writePlan(root, 'kehikot.planner', 'seam', { steps: [{ id: 'a', title: 'A', after: ['ghost'], under: 'ghost' }] })!
      expect(said.dropped.length).toBe(2)
      expect(readPlansFor(root, 'seam')[0]!.plan.steps[0]!.after).toEqual([])
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test('readPlans: every module folder, by name, each saying who wrote it when its folder agrees', () => {
    const root = project()
    try {
      writePlan(root, 'kehikot.zeta', 'seam', { steps: [{ id: 'z', title: 'Z' }] })
      writePlan(root, 'kehikot.alpha', 'seam', PLAN)
      /* A file that names another module's id is read, and not believed about who wrote it. */
      mkdirSync(join(root, '.kehikot', 'impostor'), { recursive: true })
      writeFileSync(join(root, '.kehikot', 'impostor', 'steps.json'), JSON.stringify({ module: 'kehikot.alpha', epics: { seam: { steps: [{ id: 'i', title: 'I' }] } } }))
      /* Junk, and a link out of the project, are nobody's plan. */
      mkdirSync(join(root, '.kehikot', 'junk'), { recursive: true })
      writeFileSync(join(root, '.kehikot', 'junk', 'steps.json'), 'not json')
      const elsewhere = project()
      writeFileSync(join(elsewhere, 'steps.json'), JSON.stringify({ epics: { seam: { steps: [{ id: 'x', title: 'X' }] } } }))
      mkdirSync(join(root, '.kehikot', 'linked'), { recursive: true })
      symlinkSync(join(elsewhere, 'steps.json'), join(root, '.kehikot', 'linked', 'steps.json'))
      const read = readPlans(root)
      expect(read.map((one) => [one.folder, one.module])).toEqual([
        ['alpha', 'kehikot.alpha'],
        ['impostor', null],
        ['zeta', 'kehikot.zeta'],
      ])
      expect(readPlansFor(root, 'seam').map((one) => one.plan.steps.length)).toEqual([3, 1, 1])
      expect(readPlans(null)).toEqual([])
      expect(readPlans('relative/path')).toEqual([])
      rmSync(elsewhere, { recursive: true, force: true })
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe('the union steps.list answers with', () => {
  test('every provider, in order, each step and phase naming its module', () => {
    const union = plansUnion([
      { module: 'kehikot.journeys', plan: planSchema.parse(PLAN), fallback: true },
      { module: 'kehikot.planner', plan: planSchema.parse({ steps: [{ id: 'draft', title: 'Their own draft' }] }) },
      { module: 'kehikot.planner', plan: planSchema.parse({ steps: [{ id: 'twice', title: 'Ignored' }] }) },
    ])
    expect(union.steps.map((step) => `${step.module} ${step.id}`)).toEqual([
      'kehikot.journeys objective',
      'kehikot.journeys draft',
      'kehikot.journeys wire',
      'kehikot.planner draft',
    ])
    expect(union.phases.map((phase) => phase.module)).toEqual(['kehikot.journeys', 'kehikot.journeys'])
    expect(union.providers).toEqual([
      { module: 'kehikot.journeys', goal: 'A person can post from the seam', fallback: true },
      { module: 'kehikot.planner' },
    ])
    expect(stepsListResult.parse(union)).toEqual(union)
  })

  test('the answer has a schema now, and an epic whose steps are elsewhere still has no steps key', () => {
    expect(resultSchemaFor('steps.list')).toBe(stepsListResult)
    const elsewhere = stepsListResult.parse({ stepsFrom: { projector: 'paper', where: 'the paper', why: '' } })
    expect('steps' in elsewhere).toBe(false)
    expect(elsewhere.stepsFrom).toBeDefined()
  })
})

describe('a Journeys record as a plan', () => {
  const RECORD = {
    slug: 'seam',
    title: 'The seam',
    goal: 'Posting works',
    phases: [{ id: 'shape', title: 'Shaping' }],
    gates: [
      { id: 'legal', kind: 'decision', title: 'Legal signs off', owner: 'Legal', state: 'open' },
      { id: 'other-epic', kind: 'ref-elsewhere', title: 'Their API', ref: 'gh#99', epic: 'theirs', state: 'done' },
      { id: 'untitled', kind: 'work' },
    ],
    blockedBy: { 'gh#13': ['other-epic'] },
    steps: [
      { title: 'Objective', part: 'core', phase: 'shape', refs: [] },
      { title: 'Draft', part: 'draft', under: 'core', refs: ['gh#12', 'gh#5'], roles: { 'gh#5': 'prior-art' }, blockedBy: ['legal', 'untitled'] },
      { title: 'Wire', under: 'core', after: ['draft', 'ghost'], refs: ['gh#13'], issue: 'gh#13' },
      { title: 'Second wire', refs: [] },
    ],
  }

  test('ids from parts, refs by role, gates from the step and from the refs it delivers', () => {
    const plan = planOfJourney(RECORD)!
    expect(plan.goal).toBe('Posting works')
    expect(plan.phases).toEqual([{ id: 'shape', title: 'Shaping' }])
    expect(plan.steps.map((step) => step.id)).toEqual(['core', 'draft', 'step-3', 'step-4'])
    const [core, draft, wire] = plan.steps
    expect(core!.phase).toBe('shape')
    expect(draft!.under).toBe('core')
    expect(draft!.refs).toEqual(['gh#12'])
    expect(draft!.related).toEqual(['gh#5'])
    expect(draft!.gates).toEqual([{ id: 'legal', title: 'Legal signs off', kind: 'decision', owner: 'Legal', waitsOn: [], done: false }])
    expect(wire!.after).toEqual(['draft'])
    expect(wire!.issue).toBe('gh#13')
    expect(wire!.gates).toEqual([{ id: 'other-epic', title: 'Their API', kind: 'ref', ref: 'gh#99', epic: 'theirs', waitsOn: [], done: true }])
    expect(phaseOf(plan, 'draft')).toBe('shape')
  })

  test('null for a record whose steps are kept elsewhere, and for what is not a record', () => {
    expect(planOfJourney({ slug: 'p', title: 'P', steps: [], stepsFrom: { projector: 'paper', where: 'there' } })).toBeNull()
    expect(planOfJourney(null)).toBeNull()
    expect(planOfJourney({ slug: 'p', title: 'P', steps: [] })).toEqual({ phases: [], steps: [] })
  })
})

describe('content: any steps provider', () => {
  test('CONTENT_STEPS is a source a reader follows like any other', () => {
    const content = [
      { source: CONTENT_STEPS, epic: 'seam', at: '2026-10-26T10:00:00.000Z' },
      { source: 'kehikot.planner', epic: 'seam', at: '2026-10-26T10:00:00.000Z' },
    ]
    expect(contentStamp(content, { sources: [CONTENT_STEPS], epic: 'seam' })).toBe('steps seam 2026-10-26T10:00:00.000Z')
    expect(contentStamp(content, { sources: [CONTENT_STEPS], epic: 'other' })).toBe('')
  })
})

describe('declares.provides and declares.agentSessions', () => {
  const BASE = { kind: 'kehikot.module', protocol: 2, id: 'kehikot.x', name: 'X', entry: '/', modes: [{ id: 'x', label: 'X' }], partless: 'Nothing.' }

  test('read as written, absent when not said, dropped rather than fatal when they do not parse', () => {
    const said = manifestSchema.parse({ ...BASE, declares: { provides: ['steps', 'documents'], agentSessions: { loadsSkills: true } } })
    expect(providesOf(said)).toEqual(['steps', 'documents'])
    expect(loadsSkills(said)).toBe(true)
    const silent = manifestSchema.parse(BASE)
    expect(providesOf(silent)).toEqual([])
    expect(loadsSkills(silent)).toBe(false)
    const bad = manifestSchema.parse({ ...BASE, declares: { provides: ['steps', 'steps'], agentSessions: 'yes' } })
    expect(bad.declares.provides).toBeUndefined()
    expect(bad.declares.agentSessions).toBeUndefined()
  })
})

describe('skill needs by what a module provides', () => {
  const journeys: ProvidingManifest = { id: 'kehikot.journeys', declares: { provides: ['steps'] } }
  const review: ProvidingManifest = { id: 'kehikot.review', mcp: { subjects: [{ kind: 'review-draft' }] } }
  const browser: ProvidingManifest = { id: 'kehikot.browser', reacts: ['address'], declares: { uses: ['trackers:read'] } }

  test('a need is an id or one of four objects, each once', () => {
    expect(skillNeedsSchema.parse(['kehikot.review', { provides: 'steps' }, { subject: 'review-draft' }, { reacts: 'address' }, { uses: 'trackers:read' }])).toHaveLength(5)
    expect(skillNeedsSchema.safeParse([{ provides: 'steps' }, { provides: 'steps' }]).success).toBe(false)
    expect(skillNeedsSchema.safeParse([{ provides: 'steps', reacts: 'parts' }]).success).toBe(false)
    expect(skillNeedsSchema.safeParse([{}]).success).toBe(false)
    expect(skillNeedsSchema.safeParse(['Not An Id']).success).toBe(false)
    /* A key a later version adds is carried, and met by nobody. */
    expect(skillNeedsSchema.parse([{ extension: 'kehikot.calls@1' }])).toEqual([{ extension: 'kehikot.calls@1' }])
  })

  test('missingNeeds matches against the manifests on the kehikko', () => {
    const skill = moduleSkillSchema.parse({ name: 'flow-roadmap', summary: '', version: '1', needs: [{ provides: 'steps' }] })
    expect(isKehikkoBound(skill)).toBe(true)
    expect(missingNeeds(skill, [journeys])).toEqual([])
    expect(missingNeeds(skill, [{ id: 'kehikot.planner', declares: { provides: ['steps'] } }])).toEqual([])
    expect(missingNeeds(skill, [review, browser])).toEqual([{ provides: 'steps' }])
    expect(missingNeeds(skill, [])).toEqual([{ provides: 'steps' }])
  })

  test('each kind is met by its own field', () => {
    expect(meetsNeed({ subject: 'review-draft' }, review)).toBe(true)
    expect(meetsNeed({ reacts: 'address' }, browser)).toBe(true)
    expect(meetsNeed({ uses: 'trackers:read' }, browser)).toBe(true)
    expect(meetsNeed({ uses: 'trackers:read' }, review)).toBe(false)
    expect(meetsNeed({ extension: 'x' } as never, browser)).toBe(false)
  })

  test('ids work as before, from ids or from manifests', () => {
    const skill = moduleSkillSchema.parse({ name: 'review-factory', summary: '', version: '1', needs: ['kehikot.review'] })
    expect(missingNeeds(skill, ['kehikot.review'])).toEqual([])
    expect(missingNeeds(skill, [review])).toEqual([])
    expect(missingNeeds(skill, ['kehikot.flows'])).toEqual(['kehikot.review'])
    expect(neededIds(skill)).toEqual(['kehikot.review'])
    /* An id alone says nothing about what its module provides. */
    expect(missingNeeds({ needs: [{ provides: 'steps' }] }, ['kehikot.journeys'])).toEqual([{ provides: 'steps' }])
  })

  test('needSaid says each in a person’s words', () => {
    expect(needSaid('kehikot.review')).toBe('Review')
    expect(needSaid('kehikot.review', () => 'The Review')).toBe('The Review')
    expect(needSaid({ provides: 'steps' })).toBe('a module that keeps an epic’s steps')
    expect(needSaid({ subject: 'review-draft' })).toBe('a module that can show a review-draft')
    expect(needSaid({ reacts: 'address' })).toBe('a module that shows pages')
  })
})

describe('a module’s server asks for the epic', () => {
  test('the new methods are server methods about a project, held to the page’s capabilities', () => {
    for (const method of ['epics.list', 'epic.get', 'steps.list', 'parts.get', 'dispositions.get'] as const) {
      expect(SERVER_METHODS).toContain(method)
      expect(SERVER_PROJECT_METHODS).toContain(method)
    }
    expect(METHODS['epics.list']).toBe('epics:read')
    expect(METHODS['epic.get']).toBe('epics:read')
    expect(METHODS['steps.list']).toBe('steps:read')
    expect(METHODS['parts.get']).toBe('parts:read')
    expect(METHODS['dispositions.get']).toBe('dispositions:read')
    expect(CAPABILITIES['parts:read']).toContain('parts')
    expect(CAPABILITIES['dispositions:read']).toContain('closed')
    expect(serverAskSchema.safeParse({ module: 'kehikot.factory', pass: PASS, method: 'steps.list', params: { epic: 'e' } }).success).toBe(false)
    expect(serverAskSchema.safeParse({ module: 'kehikot.factory', pass: PASS, project: '/p', method: 'steps.list', params: { epic: 'e' } }).success).toBe(true)
  })

  test('their params and answers', () => {
    expect(methodParams['parts.get'].safeParse({}).success).toBe(false)
    expect(methodParams['parts.get'].parse({ epic: 'e' })).toEqual({ epic: 'e' })
    expect(methodParams['dispositions.get'].parse({})).toEqual({})
    expect(partsGetResult.parse({ parts: [{ id: 'a', heading: 'A' }] }).parts[0]).toEqual({ id: 'a', heading: 'A', refs: [], picked: false })
    expect(dispositionsGetResult.parse({ dispositions: [{ ref: 'gh#1', value: 'done' }] }).dispositions[0]!.target).toBeNull()
  })

  test('askHost reads steps.list with its result schema', async () => {
    let body: Record<string, unknown> = {}
    const union = plansUnion([{ module: 'kehikot.planner', plan: planSchema.parse(PLAN) }])
    const fake = (async (_url: string, init?: RequestInit) => {
      body = JSON.parse(String(init?.body))
      return Response.json({ ok: true, data: union })
    }) as unknown as typeof fetch
    const said = await askHost('steps.list', { epic: 'seam' }, { module: 'kehikot.factory', project: '/p', env: ENV, fetch: fake })
    expect(body.method).toBe('steps.list')
    expect(body.project).toBe('/p')
    expect(said.ok).toBe(true)
    if (said.ok) expect(said.data.steps?.map((step) => step.id)).toEqual(['objective', 'draft', 'wire'])
  })
})
