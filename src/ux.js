/**
 * UX evidence: whether the design runs and their component patterns are tied to
 * work that can deliver them.
 *
 * v7 keeps a UX run in a `ux-<slug>` folder beside the initiative, holding
 * `DESIGN.md` and `EXPERIENCE.md`. `EXPERIENCE.md` carries a `## Component
 * Patterns` section with one `### <component>` per pattern, and that is the UX
 * requirement list: the components the design says the product has.
 *
 * Both halves can come adrift. A run nothing downstream cites is a document
 * nobody reads, and a component no ticket names is one nothing can close. Neither
 * appears anywhere else, because the requirement coverage map is over `R` ids
 * and UX components have none.
 *
 * Unlike v6 this does not guess from PascalCase identifiers: v7 names components
 * in prose ("Reserve Button (PDP)"), so the match is on the words, in order.
 *
 * @module dsh-plugin-bmad-sprint-board/ux
 */

/** The prefix every UX run folder carries. */
export const UX_PREFIX = 'ux-'

/** The section that lists the patterns. */
const UX_PATTERNS = /^##[ \t]+Component Patterns[ \t]*$/
/** One pattern. */
const UX_PATTERN = /^###[ \t]+(.+?)[ \t]*$/
/** Any other level-two heading ends the section. */
const UX_OTHER_SECTION = /^##[ \t]+/
/** A parenthetical or emphasis note beside a name. */
const UX_NOTE = /[\uFF08(].*?[)\uFF09]|\*\(.*?\)\*|\*.*?\*/g

/**
 * Normalise a component name or a phrase for matching.
 *
 * @param {string} text - the raw name or text.
 * @returns {string} lowercased, punctuation collapsed to single spaces.
 */
function normalise(text) {
  return String(text)
    .replace(UX_NOTE, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * The UX run's folder name, if the initiative has one.
 *
 * @param {Array<{name: string, type: string}>} entries - the initiative folder's listing.
 * @returns {string|null} the folder name, or null when there is no run.
 */
export function parseUxRun(entries) {
  const runs = (entries ?? [])
    .filter((entry) => entry.type === 'directory' && entry.name.startsWith(UX_PREFIX))
    .map((entry) => entry.name)
    .sort()
  return runs.length === 0 ? null : runs[runs.length - 1]
}

/**
 * The component patterns a UX run asks for.
 *
 * A heading that says it is deferred is kept but marked, because a component the
 * design itself postponed is not a component the plan failed to deliver.
 *
 * @param {string|null} experience - the contents of `EXPERIENCE.md`.
 * @returns {Array<{name: string, deferred: boolean}>} the patterns, in file order.
 */
export function parseComponentPatterns(experience) {
  if (typeof experience !== 'string') return []

  const patterns = []
  let inside = false
  for (const line of String(experience).split('\n')) {
    if (UX_PATTERNS.test(line)) {
      inside = true
      continue
    }
    if (!inside) continue
    if (UX_OTHER_SECTION.test(line)) {
      inside = false
      continue
    }
    const heading = UX_PATTERN.exec(line)
    if (heading === null) continue
    const raw = heading[1]
    patterns.push({
      name: raw.replace(UX_NOTE, ' ').replace(/\s+/g, ' ').trim(),
      deferred: /deferred/i.test(raw),
    })
  }
  return patterns
}

/**
 * Which tickets name a component.
 *
 * The join is the shared vocabulary, as in v6: the design names a component and
 * the plan that builds it names the same words. Matching is on the normalised
 * name, so punctuation and case do not matter, but a one-word name is required to
 * appear as a word rather than inside a longer one.
 *
 * @param {string} name - the component's name.
 * @param {Array<{ref: string, text: string}>} tickets - each ticket's reference and the text it carries.
 * @returns {string[]} the refs that name it.
 */
export function deliveredBy(name, tickets) {
  const wanted = normalise(name)
  if (wanted === '') return []
  // The design writes "Reservation Card" and the code writes `ReservationCard`;
  // the design writes "Dashboard Reservations Zone" and the plan may write
  // "dashboard-reservations-zone". Comparing with spaces removed catches all
  // three, and a multi-word name is specific enough that it does not over-match.
  const tight = wanted.replace(/ /g, '')
  return tickets
    .filter((ticket) => {
      const text = normalise(ticket.text)
      return text.includes(wanted) || text.replace(/ /g, '').includes(tight)
    })
    .map((ticket) => ticket.ref)
}
