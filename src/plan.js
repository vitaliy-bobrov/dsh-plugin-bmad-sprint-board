/**
 * Planning evidence: requirement coverage and the next-action ladder.
 *
 * Both read material BMAD already writes. The coverage map lives in
 * `planning-artifacts/epics.md`; the ladder is the framework's own six-rule
 * recommendation, rendered rather than reinvented -- `{skill, story_key, reason}`
 * is the canonical status view's fourth element, and inventing a rival opinion
 * about priority is exactly what the research said not to do.
 *
 * @module @local/dsh-plugin-bmad-sprint-board/plan
 */

/** Statuses in the order the framework ranks them, worst-first for action. */
const LADDER = [
  {
    status: 'in-progress',
    skill: 'bmad-build',
    reason: 'it is in progress -- resume it',
    ask: 'Resume {}, which is in progress, and take it to review.',
  },
  {
    status: 'review',
    skill: 'bmad-code-review',
    reason: 'the implementation is complete and awaiting review',
    ask: 'Review {}, whose implementation is complete and waiting.',
  },
  {
    status: 'ready-for-dev',
    skill: 'bmad-build',
    reason: 'it is ready to start',
    ask: 'Start {}, which is ready for development.',
  },
  {
    status: 'backlog',
    skill: 'bmad-build',
    reason: 'it is the next unstarted story',
    ask: 'Start {}, the next unstarted story.',
  },
]

/**
 * Parse the FR Coverage Map from an `epics.md`.
 *
 * The map is a bullet list, `- FRn (name): Epic 1, Epic 2 (Divider), ...`, and it
 * is genuinely many-to-many: three requirements in the reference repo cross all
 * four epics. The epic annotations inside parentheses are deliberately ignored --
 * only the epic *numbers* matter for coverage.
 *
 * @param {string} text - the contents of `epics.md`, or any text holding the map.
 * @returns {Map<string, {name: string, epics: number[]}>} keyed by `FRn`.
 */
export function parseFrCoverage(text) {
  const coverage = new Map()
  const heading = /^#{2,4}[ \t]*FR Coverage Map[ \t]*$/m.exec(text)
  if (heading === null) return coverage

  // the section runs to the next heading of the same or a higher level
  const rest = text.slice(heading.index + heading[0].length)
  const next = /^#{1,4}[ \t]+\S/m.exec(rest)
  const section = next === null ? rest : rest.slice(0, next.index)

  const LINE = /^[ \t]*[-*][ \t]+(FR\d+)[ \t]*\((.+)\)[ \t]*:[ \t]*(.+)$/gm
  for (const [, id, name, targets] of section.matchAll(LINE)) {
    const epics = [...targets.matchAll(/Epic[ \t]+(\d+)/gi)].map((m) => Number(m[1]))
    coverage.set(id, { name: name.trim(), epics: [...new Set(epics)].sort((a, b) => a - b) })
  }
  return coverage
}

/** The requirement classes BMAD inventories, and the prefix each uses. */
export const REQUIREMENT_CLASSES = [
  { code: 'FR', heading: 'Functional Requirements', label: 'functional' },
  { code: 'NFR', heading: 'NonFunctional Requirements', label: 'non-functional' },
  { code: 'AR', heading: 'Additional Requirements', label: 'additional' },
  { code: 'UX-DR', heading: 'UX Design Requirements', label: 'UX design' },
]

/**
 * Every requirement the inventory declares, by class.
 *
 * `epics.md` inventories four classes and only functional requirements get a
 * coverage map. Reading just the map understates the project: on the reference
 * repository it reports 17 where the inventory holds 35, so the bar measures a
 * little over half the requirements and says nothing about the rest.
 *
 * The inventory form is `PREFIX<n>: Name -- description`, one per line, under a
 * `### <heading>` section.
 *
 * @param {string} text - the contents of `epics.md`.
 * @returns {Map<string, {id: string, name: string}[]>} keyed by class code.
 */
export function parseRequirementInventory(text) {
  const inventory = new Map()
  for (const { code, heading } of REQUIREMENT_CLASSES) {
    const start = new RegExp(`^#{2,4}[ \\t]*${heading}[ \\t]*$`, 'm').exec(text)
    if (start === null) {
      inventory.set(code, [])
      continue
    }
    const rest = text.slice(start.index + start[0].length)
    const next = /^#{1,4}[ \t]+\S/m.exec(rest)
    const section = next === null ? rest : rest.slice(0, next.index)

    const item = new RegExp(`^[ \\t]*(${code}\\d+)[ \\t]*:[ \\t]*(.+?)[ \\t]*$`, 'gm')
    inventory.set(
      code,
      [...section.matchAll(item)].map((m) => ({
        id: m[1],
        // Three classes separate a short name from the description with an
        // em dash; the functional list carries no separator at all, so the
        // first clause stands in and the UI truncates what is left.
        name: m[2].split(/\s+(?:--|\u2014)\s+/)[0].trim().slice(0, 120),
        // The whole statement, kept because the components a requirement is
        // about are as often named after the dash as before it -- reading only
        // the short name left four UX requirements looking undelivered.
        text: m[2].trim(),
      })),
    )
  }
  return inventory
}

/**
 * The requirement bar: how many requirements the epics have actually delivered.

 *
 * A requirement is **delivered** only when *every* epic that carries it is done.
 * That is the whole point of the second bar: the story count can read 80% while
 * most requirements sit half-built across unfinished epics.
 *
 * @param {Map<string, {name: string, epics: number[]}>} coverage - from {@link parseFrCoverage}.
 * @param {Array<{key: string, status: string}>} epics - the model's epics.
 * @returns {{total: number, delivered: number, partial: object[], unstarted: object[], unverifiable: string|null}}
 */
export function requirementBar(coverage, epics, inventory) {
  if (coverage.size === 0) {
    return {
      total: 0,
      delivered: 0,
      partial: [],
      unstarted: [],
      unverifiable: 'no FR Coverage Map found, so requirement delivery cannot be measured',
    }
  }

  const unowned = inventory === undefined ? { count: 0, byClass: [] } : unmappedRequirements(inventory, coverage)
  const declared = [...(inventory?.values() ?? [])].reduce((n, list) => n + list.length, 0)

  const state = new Map(epics.map((e) => [Number(e.key.replace('epic-', '')), e.status]))
  const partial = []
  const unstarted = []
  let delivered = 0

  for (const [id, { name, epics: carriers }] of coverage) {
    const known = carriers.filter((n) => state.has(n))
    if (known.length !== carriers.length || known.length === 0) {
      partial.push({ id, name, epics: carriers, done: [], unknown: true })
      continue
    }
    const done = known.filter((n) => state.get(n) === 'done')
    if (done.length === known.length) delivered += 1
    else if (done.length > 0) partial.push({ id, name, epics: known, done })
    else unstarted.push({ id, name, epics: known })
  }

  return {
    total: coverage.size,
    delivered,
    partial,
    unstarted,
    unverifiable: null,
    unmapped: unowned.count,
    unmappedByClass: unowned.byClass,
    declared: declared === 0 ? coverage.size : declared,
  }
}

/**
 * Requirements the inventory declares but no coverage map claims.
 *
 * These are the honest remainder: inventoried, unowned by any epic, and cited by
 * no story, so nothing can verify whether they were delivered. Reporting only
 * the mapped ones would put a number on the board that reads as complete.
 *
 * @param {Map<string, {id: string, name: string}[]>} inventory - from {@link parseRequirementInventory}.
 * @param {Map<string, {name: string, epics: number[]}>} coverage - from {@link parseFrCoverage}.
 * @returns {{count: number, byClass: {code: string, label: string, items: object[]}[]}}
 */
export function unmappedRequirements(inventory, coverage) {
  const byClass = []
  let count = 0
  for (const { code, label } of REQUIREMENT_CLASSES) {
    const items = (inventory.get(code) ?? []).filter((item) => !coverage.has(item.id))
    if (items.length === 0) continue
    byClass.push({ code, label, items })
    count += items.length
  }
  return { count, byClass }
}

const byPosition = (a, b) => a.epic - b.epic || a.index - b.index || a.key.localeCompare(b.key)

/**
 * The next action, from the framework's own ladder.
 *
 * Returns exactly one answer with its reason. A board that offers three has not
 * answered, which is why this is a single recommendation and not a ranked list.
 *
 * @param {object} model - the model from `buildModel`.
 * @returns {{skill: string, key: string|null, label: string, reason: string}}
 */
export function nextAction(model) {
  const stories = [...model.stories].sort(byPosition)

  for (const rung of LADDER) {
    const match = stories.find((s) => s.status === rung.status)
    if (match !== undefined) {
      return {
        skill: rung.skill,
        key: match.key,
        label: match.title ?? match.key,
        reason: rung.reason,
        // The board cannot emit a runnable command: a skill is invoked through
        // `_bmad/scripts/render_skill.py`, which needs the absolute project root
        // and skill root, and the workspace face exposes neither. So this is a
        // request, and it says so rather than wearing a command's clothes.
        action: {
          kind: 'prompt',
          label: 'Ask an agent to run it',
          payload:
            `/${rung.skill} -- ${rung.ask.replace('{}', match.key)}\n\n` +
            `Story: ${match.key}\nStatus: ${match.status}\n` +
            `The sprint board reads this as the next action: ${rung.reason}.`,
        },
      }
    }
  }

  const openRetro = model.epics.find((e) => e.retro === 'optional')
  if (openRetro !== undefined) {
    return {
      skill: 'bmad-retrospective',
      key: openRetro.key,
      label: openRetro.key,
      reason: 'all stories are done and this retrospective is still open',
      action: {
        kind: 'prompt',
        label: 'Ask an agent to run it',
        payload:
          `/bmad-retrospective -- every story is done and ${openRetro.key} is still open.\n\n` +
          'Run the retrospective and record its verdict.',
      },
    }
  }

  return { skill: null, key: null, label: '', reason: 'every story is done', action: null }
}

/**
 * The two bars. Requirements never shrink their denominator when something
 * cannot be verified -- an unknown counts against the number, so a board cannot
 * improve its score by going blind.
 *
 * @param {object} model - the model from `buildModel`.
 * @param {object} requirements - the result of {@link requirementBar}.
 * @returns {{stories: object, requirements: object}}
 */
export function bars(model, requirements) {
  const total = model.stories.length
  const done = model.stories.filter((s) => s.status === 'done').length
  return {
    stories: { done, total, unverifiable: 0, percent: total === 0 ? 0 : Math.round((done / total) * 100) },
    requirements: {
      done: requirements.delivered,
      total: requirements.total,
      unverifiable: requirements.unverifiable === null ? 0 : requirements.total,
      // A missing measurement is not a zero. Without a coverage map the bar has
      // no denominator at all, and `0 / 0` would read as "nothing to do" rather
      // than "cannot measure" -- the one confusion this board must not permit.
      noData: requirements.unverifiable !== null,
      // declared but unowned: present so the bar cannot read as complete
      unmapped: requirements.unmapped ?? 0,
      declared: requirements.declared ?? 0,
      percent:
        requirements.total === 0
          ? 0
          : Math.round((requirements.delivered / requirements.total) * 100),
    },
  }
}
