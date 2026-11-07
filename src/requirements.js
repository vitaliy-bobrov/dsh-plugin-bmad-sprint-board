/**
 * Requirements, and what covers them.
 *
 * v7 keeps requirements in the initiative's own file, one bullet each:
 *
 *   ## Requirements
 *
 *   - R1 (EXPERIENCE Foundation, architecture AD-4): All-Access tier eligibility...
 *
 * and records coverage on the containers and tickets that deliver them, as a
 * `covers` list of those ids on both epics and entries. So the map v6 built from
 * an FR Coverage Map is still here -- it simply moved into the ticket store.
 *
 * The board's question is the same one: which requirements did the plan claim,
 * and which of them has nothing behind it.
 *
 * @module dsh-plugin-bmad-sprint-board/requirements
 */

/** A requirement bullet, with its optional source note. */
const REQUIREMENT = /^[-*][ \t]+(R\d+)\b[ \t]*(?:\(([^)]*)\))?[ \t]*:?[ \t]*(.*)$/
/** The section that holds them. */
const REQUIREMENTS_SECTION = /^##[ \t]+Requirements[ \t]*$/
/** Any other heading ends it. */
const OTHER_SECTION = /^##[ \t]+/

/**
 * Read the requirements an initiative declares.
 *
 * Only the `## Requirements` section is read: a bare `- R1` elsewhere in the file
 * is a reference to a requirement, not a declaration of one.
 *
 * @param {string|null} text - the initiative ticket's contents.
 * @returns {Array<{id: string, source: string, text: string}>} the requirements, in file order.
 */
export function parseRequirements(text) {
  if (typeof text !== 'string') return []

  const found = []
  let inside = false
  for (const line of String(text).split('\n')) {
    if (REQUIREMENTS_SECTION.test(line)) {
      inside = true
      continue
    }
    if (!inside) continue
    if (OTHER_SECTION.test(line)) {
      inside = false
      continue
    }
    const match = REQUIREMENT.exec(line.trim())
    if (match === null) continue
    const [, id, source, body] = match
    found.push({ id, source: (source ?? '').trim(), text: body.trim() })
  }
  return found
}

/**
 * Which requirement ids the containers and tickets claim to cover.
 *
 * @param {object} initiative - from `buildInitiative`.
 * @returns {Map<string, Array<{ref: string, epic: string, status: string}>>} requirement id -> what covers it.
 */
export function coverageOf(initiative) {
  const coverage = new Map()
  const add = (id, entry) => {
    if (!coverage.has(id)) coverage.set(id, [])
    coverage.get(id).push(entry)
  }

  for (const epic of initiative.epics) {
    // An epic's own `covers` is a claim about the epic, not about one ticket, so
    // it is attributed to the epic rather than invented onto a story.
    for (const id of epic.covers ?? []) {
      add(id, { ref: epic.slug, epic: epic.slug, status: epic.status, container: true })
    }
    for (const ticket of epic.tickets) {
      for (const id of ticket.covers ?? []) {
        add(id, { ref: ticket.ref, epic: epic.slug, status: ticket.status, container: false })
      }
    }
  }
  return coverage
}

/**
 * Reduce a requirement to the state its coverage supports.
 *
 * `uncovered` is its own answer, distinct from "not started": a requirement with
 * nothing behind it was never planned, which is a planning gap rather than
 * unfinished work.
 *
 * @param {Array<{status: string, container: boolean}>|undefined} covering - what claims it.
 * @returns {'covered'|'partial'|'uncovered'} the state.
 */
export function coverageState(covering) {
  if (covering === undefined || covering.length === 0) return 'uncovered'
  const settled = covering.filter((entry) => entry.status === 'done' || entry.status === 'dropped')
  if (settled.length === covering.length) return 'covered'
  return 'partial'
}
