import { AGENT_CHANGES_MOST, oneLine, type AgentChange } from './notes.js'
import { versionParts } from './since.js'

/**
 * 2.62.0. What a release changed for AGENTS, written where its people's notes are: an optional
 * "For agents" section in `notes/<version>.md` — one or two plain lines on new tools, changed rules,
 * new guards — that a host reads from the copy it runs and hands to agent modules beside the module
 * (`SessionModule.changes`), so a session that started before an update is told once, at its next
 * prompt, what changed for it (`changedSince` in `notes.ts`). Design notes: docs/asking.md, "What
 * changed since a session was told".
 *
 * Either spelling starts the section:
 *
 *     ## For agents                     For agents:
 *     - `queue_wait` waits for a run…   - `queue_wait` waits for a run…
 *
 * A heading runs to the next heading, or to a paragraph after its list (a release body's "Works
 * with…" line); a `For agents:` line (bold or not, with text after the colon or not) runs to the next
 * blank line or heading. Each bullet is one line; a line indented under a
 * bullet continues it. What people read is the notes without it (`withoutForAgents`).
 */

/** The words that name the section. */
export const FOR_AGENTS = 'For agents'

const HEADING = /^\s{0,3}#{1,6}\s+/
const HEADED = /^\s{0,3}#{1,6}\s+(?:\*\*|__)?for agents(?:\*\*|__)?\s*:?\s*(?:\*\*|__)?\s*#*\s*$/i
const LABEL = /^\s{0,3}(?:\*\*|__)?for agents\s*:(?:\*\*|__)?\s*([\s\S]*)$/i
const BULLET = /^\s{0,3}(?:[-*+]|\d{1,3}[.)])\s+([\s\S]*)$/

interface Section {
  /** The first line of the section (its heading or label) and the line after its last. */
  from: number
  to: number
  lines: string[]
}

/** The text as the section is looked for in it: comments out (a release body never has them), one kind of line end. */
const plainOf = (markdown: string): string => markdown.replace(/<!--[\s\S]*?-->/g, '').replace(/\r\n?/g, '\n')

function sectionOf(text: string): Section | null {
  const all = text.split('\n')
  for (let at = 0; at < all.length; at++) {
    const line = all[at] ?? ''
    const headed = HEADED.test(line)
    const label = headed ? null : LABEL.exec(line)
    if (!headed && !label) continue
    const said: string[] = []
    const inline = label?.[1]?.trim()
    if (inline) said.push(inline)
    let end = at + 1
    for (; end < all.length; end++) {
      const next = all[end] ?? ''
      if (HEADING.test(next)) break
      if (!next.trim()) {
        if (label && said.length) break
        /* Under a heading, a paragraph after the list is not the section's: a release body's "Works with…" line. */
        let ahead = end + 1
        while (ahead < all.length && !(all[ahead] ?? '').trim()) ahead++
        const after = all[ahead] ?? ''
        if (said.length && ahead < all.length && !BULLET.test(after) && !/^\s+/.test(after)) break
        continue
      }
      const bullet = BULLET.exec(next)
      if (bullet) said.push(bullet[1] ?? '')
      else if (said.length && /^\s+/.test(next)) said[said.length - 1] = `${said[said.length - 1]} ${next.trim()}`
      else said.push(next.trim())
    }
    const lines = said.map((one) => oneLine(one, AGENT_CHANGES_MOST.chars)).filter(Boolean).slice(0, AGENT_CHANGES_MOST.lines)
    return { from: at, to: end, lines }
  }
  return null
}

/** The lines of a notes file's "For agents" section, each one plain line; empty when it has none. */
export function forAgentsOf(markdown: unknown): string[] {
  if (typeof markdown !== 'string') return []
  return sectionOf(plainOf(markdown))?.lines ?? []
}

/** The notes as people read them: without the "For agents" section, or comments; the rest as it was. */
export function withoutForAgents(markdown: string): string {
  if (typeof markdown !== 'string') return ''
  const text = plainOf(markdown)
  const section = sectionOf(text)
  if (!section) return markdown
  const all = text.split('\n')
  const kept = [...all.slice(0, section.from), ...all.slice(section.to)].join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()
  return text.endsWith('\n') ? `${kept}\n` : kept
}

/** A notes file's version from its name: `notes/1.4.0.md` → `1.4.0`; null for any other name. */
export function notesVersion(file: string): string | null {
  const base = file.slice(file.lastIndexOf('/') + 1).replace(/\.md$/i, '').replace(/^v/, '')
  return versionParts(base) !== null && /^\d+\.\d+\.\d+$/.test(base) ? base : null
}

/**
 * What a host hands beside a module: the releases up to `current` (all, when null) whose notes say
 * something to agents, newest first, at most `AGENT_CHANGES_MOST.releases`. `notes` is each notes
 * file's name (or version) and text, as read from the copy that runs.
 */
export function agentChangesFrom(notes: readonly { file: string; text: string }[], current: string | null = null): AgentChange[] {
  const now = current === null ? null : versionParts(current.replace(/^v/, ''))
  const out: { parts: [number, number, number]; change: AgentChange }[] = []
  const seen = new Set<string>()
  for (const one of notes) {
    const version = notesVersion(one.file)
    const parts = version ? versionParts(version) : null
    if (!version || !parts || seen.has(version)) continue
    if (now && (parts[0] - now[0] || parts[1] - now[1] || parts[2] - now[2]) > 0) continue
    const lines = forAgentsOf(one.text)
    if (!lines.length) continue
    seen.add(version)
    out.push({ parts, change: { version, lines } })
  }
  out.sort((a, b) => b.parts[0] - a.parts[0] || b.parts[1] - a.parts[1] || b.parts[2] - a.parts[2])
  return out.slice(0, AGENT_CHANGES_MOST.releases).map((one) => one.change)
}
