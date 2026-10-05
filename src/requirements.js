/**
 * The requirements view: every requirement the project declares, grouped by
 * class, each carrying the strongest state its evidence supports.
 *
 * Four classes are inventoried and only functional requirements get a coverage
 * map. That asymmetry is the point of this view: it does not pretend the other
 * three are unstarted, and it does not hide them. A requirement with no evidence
 * path reads as unverifiable, which is a different thing from not done.
 *
 * @module dsh-plugin-bmad-sprint-board/requirements
 */

import { REQUIREMENT_CLASSES, parseRequirementInventory } from './plan.js'

/** The states a requirement row can carry. */
export const REQ_STATE = {
  done: 'done',
  partial: 'partial',
  todo: 'todo',
  unknown: 'unknown',
}

/**
 * How many acceptance criteria a story file states.
 *
 * They are the bullets under `**Acceptance Criteria:**` inside
 * `## Tasks & Acceptance`. They carry no checkbox of their own -- verification
 * is by test, not by ticking -- so a story's own status is the only completion
 * signal that exists for them, and the view says so rather than inventing one.
 *
 * @param {string} text - a story file's contents.
 * @returns {number} the criteria stated, or 0 when the section is absent.
 */
export function countAcceptance(text) {
  if (typeof text !== 'string' || text === '') return 0

  // Walked line by line rather than matched. A regex terminator of
  // `(?=^## |$)` looks right and is not: under the `m` flag `$` matches at the
  // end of the heading's own line, so the section came out empty and every
  // story reported zero criteria.
  let inSection = false
  let inCriteria = false
  let count = 0

  for (const line of text.split('\n')) {
    if (/^##[ \t]/.test(line)) {
      inSection = /^##[ \t]+Tasks & Acceptance[ \t]*$/.test(line)
      inCriteria = false
      continue
    }
    if (!inSection) continue
    if (/^\*\*[^*]+\*\*[ \t]*$/.test(line)) {
      inCriteria = /^\*\*Acceptance Criteria:\*\*[ \t]*$/.test(line)
      continue
    }
    if (inCriteria && /^[ \t]*[-*][ \t]+\S/.test(line)) count += 1
  }

  return count
}

/**
 * Functional requirements, resolved through the coverage map and epic statuses.
 *
 * A requirement is done when every epic claiming it is done, not started when
 * none has begun, and partial in between -- the same reading the summary bar
 * uses, so the two can never disagree.
 *
 * @param {Map<string, {name: string, epics: number[]}>} coverage - from `parseFrCoverage`.
 * @param {Array<{key: string, status: string}>} epics - the model's epics.
 * @returns {Array<object>} rows.
 */
export function functionalRows(coverage, epics) {
  const status = new Map(epics.map((e) => [Number(String(e.key).replace('epic-', '')), e.status]))
  const rows = []
  for (const [id, entry] of coverage) {
    const states = entry.epics.map((n) => status.get(n) ?? 'backlog')
    const all = states.length > 0 && states.every((s) => s === 'done')
    const any = states.some((s) => s !== 'backlog')
    rows.push({
      id,
      name: entry.name,
      state: all ? REQ_STATE.done : any ? REQ_STATE.partial : REQ_STATE.todo,
      note: states.length === 0 ? 'no epic claims it' : `epic ${entry.epics.join(', ')}`,
    })
  }
  return rows
}

/**
 * Acceptance criteria, one row per story that states any.
 *
 * The row's state is the story's, because an individual criterion has no
 * completion marker. This is a proxy and the note names it as one.
 *
 * @param {Array<{key: string, title: string, status: string, file: string|null}>} stories - the model's stories.
 * @param {Map<string, string>} storyText - story path to contents.
 * @returns {Array<object>} rows, in board order.
 */
export function acceptanceRows(stories, storyText) {
  const rows = []
  for (const story of stories) {
    const text = story.file === null ? undefined : storyText.get(story.file)
    const count = countAcceptance(text ?? '')
    if (count === 0) continue
    rows.push({
      id: `${story.epic}.${story.index}`,
      name: story.title,
      state:
        story.status === 'done'
          ? REQ_STATE.done
          : story.status === 'backlog'
            ? REQ_STATE.todo
            : REQ_STATE.partial,
      note: `${count} criteria, state follows the story`,
    })
  }
  return rows
}

/**
 * Requirements from a class with no coverage map.
 *
 * No epic claims them, no story cites them, and no gate reports on them, so
 * there is nothing to read a state from. They are listed as unverifiable rather
 * than as outstanding work, because the board cannot tell the two apart and
 * saying "not done" would be a guess.
 *
 * @param {Array<{id: string, name: string}>} items - the inventory's entries.
 * @param {string} why - what is missing, short enough for a row.
 * @returns {Array<object>} rows.
 */
export function unverifiableRows(items, why) {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    state: REQ_STATE.unknown,
    note: why,
  }))
}

/**
 * Every requirement, grouped into the lanes the view renders.
 *
 * @param {object} input - the parsed artefacts.
 * @param {string} input.epicsText - the epics document, for the inventory.
 * @param {Map<string, {name: string, epics: number[]}>} input.coverage - the FR coverage map.
 * @param {Array<object>} input.epics - the model's epics.
 * @param {Array<object>} input.stories - the model's stories.
 * @param {Map<string, string>} [input.storyText] - story path to contents.
 * @returns {{lanes: object[], totals: object}} the lanes and their totals.
 */
export function requirementsView(input) {
  // Declared before the lanes: three of them read an epic's status, and one
  // that sits above this line fails at render with a dead-zone error.
  const epicStatus = new Map(
    (input.epics ?? []).map((e) => [Number(String(e.key).replace('epic-', '')), e.status]),
  )

  const inventory = parseRequirementInventory(input.epicsText ?? '')
  const storyText = input.storyText ?? new Map()

  const functional = functionalRows(input.coverage ?? new Map(), input.epics ?? [])
  const acceptance = acceptanceRows(input.stories ?? [], storyText)

  const lanes = [
    { code: 'FR', label: 'functional', rows: functional, verifiable: true },
    { code: 'AC', label: 'acceptance', rows: acceptance, verifiable: true },
  ]

  // Architecture decisions are cited by id, so this lane reads like the
  // functional one: a decision is delivered when the epics citing it are.
  const decisions = input.decisions ?? new Map()
  if (decisions.size > 0) {
    lanes.push({
      code: 'AD',
      label: 'architecture',
      verifiable: true,
      rows: [...decisions.entries()].map(([id, link]) => {
        const states = link.epics.map((n) => epicStatus.get(n) ?? 'backlog')
        return {
          id,
          name: input.decisionTitles?.get(id) ?? '',
          state:
            link.epics.length === 0
              ? REQ_STATE.unknown
              : states.every((state) => state === 'done')
                ? REQ_STATE.done
                : states.some((state) => state !== 'backlog')
                  ? REQ_STATE.partial
                  : REQ_STATE.todo,
          note:
            link.epics.length === 0
              ? 'no story cites it'
              : `epic ${link.epics.join(', ')} across ${link.stories.length} stor${link.stories.length === 1 ? 'y' : 'ies'}`,
        }
      }),
    })
  }

  for (const { code, label } of REQUIREMENT_CLASSES) {
    if (code === 'FR') continue
    const items = inventory.get(code) ?? []
    if (items.length === 0) continue

    // UX is the one class with a join to the plan: a requirement names the
    // components it is about, and a story names them because it builds them. So
    // its rows read like functional ones instead of as a wall of unknowns.
    if (code === 'UX-DR') {
      const links = input.uxLinks ?? new Map()
      lanes.push({
        code,
        label,
        verifiable: true,
        rows: items.map((item) => {
          const link = links.get(item.id)
          const epics = link?.epics ?? []
          const states = epics.map((n) => epicStatus.get(n) ?? 'backlog')
          const done = states.length > 0 && states.every((state) => state === 'done')
          return {
            id: item.id,
            name: item.name,
            state:
              epics.length === 0
                ? REQ_STATE.unknown
                : done
                  ? REQ_STATE.done
                  : states.some((state) => state !== 'backlog')
                    ? REQ_STATE.partial
                    : REQ_STATE.todo,
            note:
              epics.length === 0
                ? 'no story names the components it describes'
                : `epic ${epics.join(', ')} via ${link.components.slice(0, 2).join(', ')}`,
          }
        }),
      })
      continue
    }

    lanes.push({
      code,
      label,
      rows: unverifiableRows(items, 'no coverage map, no story cites it'),
      verifiable: false,
    })
  }

  const count = (state) =>
    lanes.reduce((n, lane) => n + lane.rows.filter((row) => row.state === state).length, 0)
  const declared = lanes.reduce((n, lane) => n + lane.rows.length, 0)

  return {
    lanes,
    totals: {
      declared,
      done: count(REQ_STATE.done),
      partial: count(REQ_STATE.partial),
      todo: count(REQ_STATE.todo),
      unknown: count(REQ_STATE.unknown),
    },
  }
}

/**
 * What a spec file says about itself: its title, its tasks, and how many are
 * ticked.
 *
 * A standalone spec is one no tracking key claims, so the sprint file knows
 * nothing about it and the file is the only source. Its checkboxes are the only
 * progress signal that exists.
 *
 * @param {string} text - a spec file's contents.
 * @returns {{title: string, tasks: number, ticked: number, criteria: number}} the reading.
 */
export function parseSpecProgress(text) {
  const body = typeof text === 'string' ? text : ''
  const boxes = [...body.matchAll(/^[ \t]*- \[([ xX])\]/gm)]
  const title = /^#[ \t]+(.+?)[ \t]*$/m.exec(body)
  return {
    title: title === null ? '' : title[1].trim(),
    tasks: boxes.length,
    ticked: boxes.filter((match) => match[1].toLowerCase() === 'x').length,
    criteria: countAcceptance(body),
  }
}

/**
 * The standalone specs, split by whether anything is left to do.
 *
 * These are the specs no story in the sprint file claims: refactors, style
 * extractions, migrations. Most are finished, which is the point of showing
 * them together -- the interesting ones are the few still open, and a spec
 * written and never started is invisible everywhere else on the board because
 * no tracking key exists to hang it on.
 *
 * @param {Array<{file: string, text: string}>} specs - the unclaimed spec files.
 * @returns {{lanes: object[], totals: object}} the lanes and their counts.
 */
export function standaloneView(specs) {
  const rows = (specs ?? []).map((spec) => {
    const progress = parseSpecProgress(spec.text)
    const slug = spec.file.split('/').pop().replace(/^spec-/, '').replace(/\.md$/, '')
    const state =
      progress.tasks === 0
        ? REQ_STATE.unknown
        : progress.ticked === progress.tasks
          ? REQ_STATE.done
          : progress.ticked === 0
            ? REQ_STATE.todo
            : REQ_STATE.partial
    return {
      id: slug,
      name: progress.title === '' ? slug : progress.title,
      state,
      note: `${progress.ticked} of ${progress.tasks} tasks, ${progress.criteria} criteria`,
      file: spec.file,
    }
  })

  rows.sort((a, b) => a.state.localeCompare(b.state) || a.id.localeCompare(b.id))
  const open = rows.filter((row) => row.state !== REQ_STATE.done)
  const finished = rows.filter((row) => row.state === REQ_STATE.done)

  const lanes = [
    { code: 'OPEN', label: 'still open', rows: open, verifiable: true },
    { code: 'DONE', label: 'finished', rows: finished, verifiable: true },
  ].filter((lane) => lane.rows.length > 0)

  return {
    lanes,
    totals: { declared: rows.length, open: open.length, done: finished.length },
  }
}
