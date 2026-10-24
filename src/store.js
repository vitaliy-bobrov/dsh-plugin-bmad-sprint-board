/**
 * The BMAD v7 ticket store, read from files.
 *
 * A v7 initiative keeps its work under `tickets/`:
 *
 *   tickets/tickets.toml                      [[epic]] id, slug, title
 *   tickets/epic-<slug>/epic-<slug>.md        type: epic, title, parent, status
 *   tickets/epic-<slug>/tickets/tickets.toml  [[entry]] id, type, title, v6_key
 *   tickets/epic-<slug>/tickets/<type>-<slug>-plan.md
 *
 * The index and the file are separate records of the same ticket, and they can
 * disagree. `tickets.py` links a plan to its entry through the plan's own
 * `ticket` key; a plan without one is an orphan it reports under `problems`.
 * This module reproduces the index, and keeps the linking question visible
 * rather than resolving it with a guess.
 *
 * @module dsh-plugin-bmad-sprint-board/store
 */

import { parseToml } from './toml.js'
import { listOf, readFrontmatter, stringOf } from './frontmatter.js'

/** The prefix every plan file shares. */
export const PLAN_SUFFIX = '-plan.md'

/**
 * The types the ticket store treats as a ticket in its own right.
 *
 * `tickets.py` decides what a file is by its frontmatter `type`, not by its
 * name: one of these types is a leaf that carries the ticket, anything else
 * that declares a `ticket` key is a plan over one, and anything else is ignored.
 * A file named `story-x-plan.md` whose type is `feature` is therefore neither,
 * which is exactly how a migrated project quietly loses its plans.
 */
export const LEAF_TYPES = new Set(['story', 'spike', 'bug'])

/**
 * Reduce a title to the slug BMAD derives file names from.
 *
 * @param {string} title - a ticket title.
 * @returns {string} the kebab-case slug.
 */
export function slugify(title) {
  return String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Read the epic index of an initiative.
 *
 * @param {string|null} text - the contents of `tickets/tickets.toml`.
 * @returns {Array<{id: number|string|null, slug: string, title: string}>} the epics, in file order.
 */
export function readEpicIndex(text) {
  if (typeof text !== 'string') return []
  const doc = parseToml(text)
  const rows = Array.isArray(doc.epic) ? doc.epic : []
  return rows
    .filter((row) => typeof row.slug === 'string' && row.slug !== '')
    .map((row) => ({ id: row.id ?? null, slug: row.slug, title: row.title ?? '' }))
}

/**
 * Read the story index inside one epic folder.
 *
 * @param {string|null} text - the contents of `tickets/epic-<slug>/tickets/tickets.toml`.
 * @returns {Array<{id: string, type: string, title: string, v6Key: string|null}>} the entries, in file order.
 */
export function readStoryIndex(text) {
  if (typeof text !== 'string') return []
  const doc = parseToml(text)
  const rows = Array.isArray(doc.entry) ? doc.entry : []
  return rows.map((row) => ({
    id: String(row.id ?? ''),
    type: typeof row.type === 'string' ? row.type : 'story',
    title: typeof row.title === 'string' ? row.title : '',
    v6Key: typeof row.v6_key === 'string' ? row.v6_key : null,
  }))
}

/**
 * Read a ticket file -- the leaf that carries the ticket itself.
 *
 * @param {string} text - the file's contents.
 * @param {string} path - its workspace-relative path.
 * @returns {{path: string, id: string|null, type: string|null, title: string|null, status: string}} the leaf.
 */
export function readLeaf(text, path) {
  const { data } = readFrontmatter(text)
  return {
    path,
    id: stringOf(data, 'id'),
    type: stringOf(data, 'type'),
    title: stringOf(data, 'title'),
    // an absent status is the empty string, which the store maps to backlog
    status: stringOf(data, 'status') ?? '',
  }
}

/**
 * Decide what a file in a ticket folder is.
 *
 * @param {string} text - the file's contents.
 * @returns {'leaf'|'plan'|'other'} the role the ticket store would give it.
 */
export function classify(text) {
  const { data } = readFrontmatter(text)
  const type = stringOf(data, 'type')
  if (type !== null && LEAF_TYPES.has(type)) return 'leaf'
  if (stringOf(data, 'ticket') !== null) return 'plan'
  return 'other'
}

/**
 * Read a plan file's frontmatter into the fields the board uses.
 *
 * @param {string} text - the plan file's contents.
 * @param {string} path - its workspace-relative path.
 * @returns {{path: string, title: string|null, type: string|null, status: string|null, ticket: string|null, baseline: string|null, context: string[]}} the plan.
 */
export function readPlan(text, path) {
  const { data } = readFrontmatter(text)
  return {
    path,
    title: stringOf(data, 'title'),
    type: stringOf(data, 'type'),
    ticket: stringOf(data, 'ticket'),
    status: stringOf(data, 'status') ?? '',
    blockedReason: stringOf(data, 'blocked_reason'),
    baseline: stringOf(data, 'baseline_commit'),
    context: listOf(data, 'context'),
  }
}

/**
 * Decide which plan file belongs to which index entry.
 *
 * Three outcomes, and keeping them apart is the point:
 *
 * - a plan whose `ticket` names an entry is **linked**, by BMAD's own rule;
 * - a plan with no `ticket` whose file name is the one BMAD would derive from an
 *   entry's title is **unlinked** -- the file is almost certainly that entry's,
 *   but the store does not say so, and the board reports that instead of
 *   asserting it;
 * - everything else is an **orphan**: a plan the index does not claim, or an
 *   entry with no plan at all.
 *
 * A name match is only accepted when exactly one entry could claim it, so an
 * ambiguous match is never resolved by picking the first.
 *
 * @param {Array<object>} entries - from {@link readStoryIndex}.
 * @param {Array<object>} plans - from {@link readPlan}, all plans in the epic.
 * @returns {{links: Map<string, object>, unlinked: Array<object>, orphans: Array<object>, missing: Array<object>}} the linking result.
 */
export function linkPlans(entries, plans) {
  const links = new Map()
  const unlinked = []
  const claimed = new Set()

  for (const plan of plans) {
    if (plan.ticket === null) continue
    const match = entries.find((entry) => entry.id === plan.ticket)
    if (match !== undefined && !links.has(match.id)) {
      links.set(match.id, plan)
      claimed.add(plan.path)
    }
  }

  for (const entry of entries) {
    if (links.has(entry.id)) continue
    const wanted = `${entry.type}-${slugify(entry.title)}`
    const stemOf = (plan) => {
      const name = plan.path.slice(plan.path.lastIndexOf('/') + 1)
      return name.endsWith(PLAN_SUFFIX) ? name.slice(0, -PLAN_SUFFIX.length) : null
    }
    const matches = (plan) => {
      if (plan.ticket !== null || claimed.has(plan.path)) return false
      const stem = stemOf(plan)
      if (stem === null) return false
      // BMAD derives the file name from the title, and a title that was still
      // moving when the file was created leaves a stem that is a truncated form
      // of the current one. Truncation happens before the suffix, so both sides
      // are compared without it. Either direction counts; neither is accepted
      // unless it is also unambiguous.
      return wanted.startsWith(stem) || stem.startsWith(wanted)
    }
    const candidates = plans.filter(matches)
    const rivals = entries.filter((other) => {
      if (links.has(other.id) || other.id === entry.id) return false
      const theirs = `${other.type}-${slugify(other.title)}`
      return plans.some((plan) => {
        if (!matches(plan)) return false
        const stem = stemOf(plan)
        return theirs.startsWith(stem) || stem.startsWith(theirs)
      })
    })
    if (candidates.length === 1 && rivals.length === 0) {
      links.set(entry.id, candidates[0])
      claimed.add(candidates[0].path)
      unlinked.push({ entry, plan: candidates[0] })
    }
  }

  const orphans = plans.filter((plan) => !claimed.has(plan.path))
  const missing = entries.filter((entry) => !links.has(entry.id))
  return { links, unlinked, orphans, missing }
}
