import { z } from 'zod'

import { LIMITS } from './limits.js'
import { oneLine } from './notes.js'
import { isSkillName, skillNameSchema, skillTextBytes, skillTextIssue } from './skills.js'

/**
 * 2.53.0. A kehikko's own skills: instructions the PERSON wrote for every agent session on one
 * kehikko, whichever module runs it and whichever epic it works on. A host keeps them (with the
 * kehikko, in its project) and hands them to a module that starts a session there, in its answer to
 * `POST /host/place` (`kehikkoSkills` in `placeDoorsSchema`); the module puts each where its agent
 * reads skills for that session, exactly as it loads a module's kehikko-bound skill (`skillsThatLoad`).
 *
 * A skill is a name (`SKILL_NAME`), a one-line description (what an agent decides to use it by) and a
 * body of markdown. Its SKILL.md is `kehikkoSkillText(name, description, body)`, which a host builds
 * and a module writes as it comes (after `skillTextIssue`). Text, never markup a host renders: a host
 * shows the body as the person typed it.
 *
 * Only the person writes one. A host takes a new, changed or removed skill from its own page and
 * nowhere else; an agent may read them, never write them (an agent putting instructions into its own
 * future sessions is what skills are kept from).
 * Design notes: docs/asking.md, "A kehikko's own skills (2.53.0)".
 */

/** The bounds on a kehikko's own skills. */
export const KEHIKKO_SKILL_LIMITS = {
  /** How many one kehikko may keep. */
  MOST: 20,
  /** The description, in characters: one line. */
  DESCRIPTION: 300,
  /** The body, in characters. The whole SKILL.md still fits in `LIMITS.SKILL_TEXT` bytes (`kehikkoSkillIssue`). */
  BODY: 32_000,
} as const

/** The description as it goes into the front matter and the notes: one line of plain text, bounded. */
export function kehikkoSkillDescription(text: unknown): string {
  return oneLine(text, KEHIKKO_SKILL_LIMITS.DESCRIPTION)
}

/**
 * A kehikko skill's SKILL.md: front matter with its `name` and `description` (the description as a
 * JSON string, which YAML reads as the same double-quoted scalar, so no character in it can end the
 * block or start another key), then the body. Line endings become `\n`; the body ends with one.
 */
export function kehikkoSkillText(name: string, description: string, body: string): string {
  const said = kehikkoSkillDescription(description)
  const text = String(body ?? '').replace(/\r\n?/g, '\n').replace(/\s+$/, '')
  return `---\nname: ${name}\ndescription: ${JSON.stringify(said)}\n---\n\n${text}\n`
}

/**
 * What is wrong with a kehikko skill as a person wrote it, in one sentence they can read; `null` when
 * nothing is. The name is a skill name, the description one non-empty line, the body within its bound,
 * and the SKILL.md it makes passes `skillTextIssue` and fits in `LIMITS.SKILL_TEXT` bytes.
 */
export function kehikkoSkillIssue(skill: { name?: unknown; description?: unknown; body?: unknown }): string | null {
  const { name, description, body } = skill
  if (typeof name !== 'string' || !name) return 'A skill needs a name.'
  if (name.length > LIMITS.SKILL_NAME) return `A skill’s name is at most ${LIMITS.SKILL_NAME} characters.`
  if (!isSkillName(name)) return 'A skill’s name is lowercase letters and digits in words joined by single dashes, starting with a letter (like review-checklist).'
  if (typeof description !== 'string' || !kehikkoSkillDescription(description)) return 'A skill needs a description: one line saying when to use it.'
  if (description.trim().length > KEHIKKO_SKILL_LIMITS.DESCRIPTION) return `A skill’s description is at most ${KEHIKKO_SKILL_LIMITS.DESCRIPTION} characters.`
  if (typeof body !== 'string') return 'A skill’s text is text.'
  if (!body.trim()) return 'A skill needs some text: what the agent should do.'
  if (body.length > KEHIKKO_SKILL_LIMITS.BODY) return `A skill’s text is at most ${KEHIKKO_SKILL_LIMITS.BODY.toLocaleString('en')} characters.`
  const text = kehikkoSkillText(name, description, body)
  if (skillTextBytes(text) > LIMITS.SKILL_TEXT) return `A skill’s text is larger than ${LIMITS.SKILL_TEXT / 1024} KB.`
  return skillTextIssue(text, name)
}

/**
 * One kehikko skill as a host hands it to a module (`kehikkoSkills` in `placeDoorsSchema`): its name,
 * its description (for the notes) and its whole SKILL.md (`text`), which the module writes as it is.
 * One whose text does not pass `skillTextIssue` for its name does not parse.
 */
export const kehikkoSkillSchema = z
  .object({
    name: skillNameSchema,
    description: z.string().max(KEHIKKO_SKILL_LIMITS.DESCRIPTION),
    text: z.string().min(1),
  })
  .refine((one) => skillTextIssue(one.text, one.name) === null, { message: 'the text is not a SKILL.md for that name' })
export type KehikkoSkill = z.infer<typeof kehikkoSkillSchema>

/**
 * A kehikko's skills in an answer: at most `KEHIKKO_SKILL_LIMITS.MOST`, each name once. One that does
 * not parse is left out and the rest kept, so one bad skill never costs a session the others.
 */
export const kehikkoSkillsSchema = z
  .array(z.unknown())
  .max(KEHIKKO_SKILL_LIMITS.MOST)
  .transform((all) => {
    const seen = new Set<string>()
    const out: KehikkoSkill[] = []
    for (const one of all) {
      const parsed = kehikkoSkillSchema.safeParse(one)
      if (!parsed.success || seen.has(parsed.data.name)) continue
      seen.add(parsed.data.name)
      out.push(parsed.data)
    }
    return out
  })
