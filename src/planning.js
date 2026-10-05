/**
 * Planning-artefact evidence: whether the architecture, brief and PRD are tied
 * to the work, and to what.
 *
 * The three carry different proofs, so they are read differently:
 *
 * - **Architecture decisions** are cited by id. Story files name `AD-3` when
 *   they implement it, which is an exact link and needs no guessing.
 * - **Brief and PRD** are upstream documents with no vocabulary of their own.
 *   The only link is the one the plan writes down, in the epics document's
 *   `inputDocuments`.
 *
 * The trap is that this repository runs more than one planning track. `prd.md`
 * is named by no part of the tools plan because it belongs to the i18n plan,
 * which is correct and would still look like an orphan to a naive check. So a
 * document is only reported when nothing in the plan carries it, and the finding
 * says which plan was asked.
 *
 * @module @local/dsh-plugin-bmad-sprint-board/planning
 */

/** A directory in the planning folder that holds dated artefacts. */
export const ARTEFACT_FAMILIES = ['architecture', 'briefs', 'ux-designs', 'research', 'epics-reviews']

/**
 * The architecture decisions a spine declares.
 *
 * `### AD-3 - Shopify Metaobject CMS Backing`, with either a hyphen or an em
 * dash after the id.
 *
 * @param {string} text - the contents of an architecture spine.
 * @returns {Array<{id: string, title: string}>} the decisions, in document order.
 */
export function parseArchitectureDecisions(text) {
  const found = String(text ?? '').matchAll(/^#{2,4}[ \t]+(AD-\d+)[ \t]*[-:\u2014]+[ \t]*(.+?)[ \t]*$/gm)
  return [...found].map((match) => ({ id: match[1], title: match[2].trim() }))
}

/**
 * Which stories and epics cite each decision.
 *
 * A story names `AD-3` because it is implementing that decision, so this is a
 * declared link rather than an inferred one. A decision no story cites is
 * reported, but not as undelivered: `AD-10` names the tri-state parser contract
 * and story 1.3 is the tri-state parser, so the work can be plainly done while
 * the id goes unquoted. The board cannot tell those apart, and says so.
 *
 * @param {Array<{id: string, title: string}>} decisions - from {@link parseArchitectureDecisions}.
 * @param {Array<{key: string, epic: number, index: number}>} stories - the model's stories.
 * @param {Map<string, string>} storyText - story path to contents.
 * @returns {Map<string, {stories: string[], epics: number[]}>} keyed by decision id.
 */
export function linkDecisionsToEpics(decisions, stories, storyText) {
  const byFile = new Map(stories.map((story) => [story.file, story]))
  const links = new Map()

  for (const decision of decisions) {
    const hit = []
    for (const [file, text] of storyText ?? []) {
      const story = byFile.get(file)
      if (story === undefined) continue
      if (new RegExp(`\\b${decision.id}\\b`).test(text)) hit.push(story)
    }
    links.set(decision.id, {
      stories: hit.map((story) => story.key),
      epics: [...new Set(hit.map((story) => story.epic))].sort((a, b) => a - b),
    })
  }

  return links
}

/**
 * The documents the plan declares as its inputs.
 *
 * Read from the epics document's `inputDocuments` list, which is the only place
 * a brief or a PRD is tied to the work.
 *
 * @param {string} epicsText - the contents of the epics document.
 * @returns {string[]} the declared paths, as written, since a caller opens them.
 */
export function parseDeclaredInputs(epicsText) {
  const block = /^inputDocuments:[ \t]*\n((?:[ \t]*-[ \t]+.*\n)+)/m.exec(String(epicsText ?? ''))
  if (block === null) return []
  return [...block[1].matchAll(/^[ \t]*-[ \t]*['"]?(.+?)['"]?[ \t]*$/gm)]
    // The block runs to the closing `---`, which the list pattern also matches.
    .map((match) => match[1].trim())
    .filter((path) => path !== '' && !/^-+$/.test(path))
    .map((path) => path.replace(/^['"]|['"]$/g, ''))
}

/**
 * Artefact directories present in the planning folder.
 *
 * @param {Array<{type: string, name: string}>} entries - the planning listing.
 * @returns {string[]} the families present, in {@link ARTEFACT_FAMILIES} order.
 */
export function artefactFamilies(entries) {
  const dirs = new Set(
    (entries ?? []).filter((entry) => entry.type === 'directory').map((entry) => entry.name),
  )
  return ARTEFACT_FAMILIES.filter((family) => dirs.has(family))
}

/**
 * Document-shaped markers a reader can recognise as one artefact or another.
 *
 * @param {string} path - a declared input path.
 * @returns {string|null} the family it belongs to, or null.
 */
export function familyOf(path) {
  const text = String(path ?? '').toLowerCase()
  if (text.includes('architecture')) return 'architecture'
  if (text.includes('brief')) return 'briefs'
  if (text.includes('prd')) return 'prd'
  if (text.includes('ux-design')) return 'ux-designs'
  if (text.includes('research')) return 'research'
  return null
}
