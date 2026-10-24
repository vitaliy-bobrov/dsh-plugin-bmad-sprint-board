/**
 * The board model: one BMAD v7 project, read into initiatives, epics and tickets.
 *
 * The model is built from text alone -- it never touches the file system, so it
 * is exercised directly by the tests and the shell only supplies the strings.
 *
 * A v7 project can have several initiatives and only one is "active". The board
 * builds every initiative so the reader can switch between them without a
 * reload, and marks the active one rather than hiding the rest.
 *
 * @module dsh-plugin-bmad-sprint-board/model
 */

import { readFrontmatter, stringOf } from './frontmatter.js'
import { linkPlans, readEpicIndex, readPlan, readStoryIndex } from './store.js'

/**
 * The published order of ticket states, oldest first.
 *
 * These are the words BMAD v7 writes into a plan's `status`: the builds write
 * `draft` through `built`, an unattended run writes `blocked` when it halts, and
 * Sofia writes `done` or `dropped`. `in-progress` and `review` come from the PO
 * skill's own vocabulary and appear on real tickets, so they are carried too.
 */
export const STATUS_ORDER = [
  'blocked',
  'in-progress',
  'review',
  'built',
  'draft',
  'done',
  'dropped',
]

/** States that mean the work is finished, whichever word was used. */
export const SETTLED = new Set(['done', 'dropped'])

/** The words the board recognises; anything else is reported as unrecognised. */
export const KNOWN_STATUS = new Set(STATUS_ORDER)

/**
 * Turn a BMAD slug into something a reader can scan.
 *
 * Folder and file names are kebab-case (`vip-reservations`), and showing that
 * raw reads like an identifier because it is one. A ticket that declares its own
 * title is shown by that title; this is the fallback for the ones that do not,
 * and the secondary label under it.
 *
 * @param {string} slug - a folder or file slug, with or without its prefix.
 * @returns {string} the words, each capitalised.
 */
export function humanise(slug) {
  return String(slug)
    .replace(/^(initiative|epic)-/, '')
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => (/\d/.test(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ')
}

/**
 * Read an initiative ticket's own file.
 *
 * @param {string|null} text - the contents of `initiative-<slug>.md`, or null when absent.
 * @returns {{title: string|null, status: string|null, type: string|null}} what the file declares.
 */
export function readInitiativeTicket(text) {
  if (typeof text !== 'string') return { title: null, status: null, type: null }
  const { data } = readFrontmatter(text)
  return {
    title: stringOf(data, 'title'),
    status: stringOf(data, 'status'),
    type: stringOf(data, 'type'),
  }
}

/**
 * Read an epic ticket's own file.
 *
 * @param {string|null} text - the contents of `epic-<slug>.md`, or null when absent.
 * @returns {{title: string|null, status: string|null, parent: string|null}} what the file declares.
 */
export function readEpicTicket(text) {
  if (typeof text !== 'string') return { title: null, status: null, parent: null }
  const { data } = readFrontmatter(text)
  return {
    title: stringOf(data, 'title'),
    status: stringOf(data, 'status'),
    parent: stringOf(data, 'parent'),
  }
}

/**
 * Decide a ticket's displayed state.
 *
 * A v7 story carries no status in `tickets.toml`; the state lives in its plan.
 * So a ticket whose plan is missing has an *unknown* state, not a default one,
 * and the board shows that rather than counting it as not started.
 *
 * @param {object|null} plan - from {@link readPlan}, or null.
 * @returns {string|null} the status, or null when nothing declares one.
 */
export function ticketStatus(plan) {
  if (plan === null || plan === undefined) return null
  return plan.status
}

/**
 * Assemble one initiative from the files read for it.
 *
 * @param {object} input - the initiative's name and file contents.
 * @param {string} input.slug - the folder name, `initiative-<slug>`.
 * @param {string} input.dir - its workspace-relative folder path.
 * @param {string|null} input.ticket - contents of `initiative-<slug>.md`.
 * @param {{epics: Array<object>}} input.index - the parsed epic index plus per-epic content.
 * @param {number} input.unreadable - how many files could not be read.
 * @returns {object} the initiative model.
 */
export function buildInitiative({ slug, dir, ticket, epics, unreadable = 0 }) {
  const own = readInitiativeTicket(ticket)
  const built = epics.map((epic) => {
    const header = readEpicTicket(epic.ticket)
    const entries = readStoryIndex(epic.storyIndex)
    const plans = (epic.plans ?? []).map((plan) => readPlan(plan.text, plan.path))
    const { links, unlinked, orphans, missing } = linkPlans(entries, plans)

    const tickets = entries.map((entry) => {
      const plan = links.get(entry.id) ?? null
      return {
        id: entry.id,
        ref: `${epic.id ?? '?'}.${entry.id}`,
        type: entry.type,
        title: entry.title,
        v6Key: entry.v6Key,
        status: ticketStatus(plan),
        plan,
        linkedBy: plan === null ? 'none' : plan.ticket === null ? 'name' : 'ticket',
      }
    })

    return {
      id: epic.id,
      slug: epic.slug,
      folder: epic.folder,
      title: header.title ?? epic.title ?? epic.slug,
      status: header.status,
      tickets,
      orphans,
      unlinked: unlinked.length,
      missing: missing.map((entry) => entry.id),
    }
  })

  const byStatus = new Map()
  let total = 0
  let unknown = 0
  for (const epic of built) {
    for (const ticket of epic.tickets) {
      total += 1
      if (ticket.status === null) {
        unknown += 1
        continue
      }
      byStatus.set(ticket.status, (byStatus.get(ticket.status) ?? 0) + 1)
    }
  }

  return {
    slug,
    dir,
    title: own.title ?? humanise(slug),
    status: own.status,
    epics: built,
    counts: {
      epics: built.length,
      tickets: total,
      unknown,
      byStatus,
      settled: [...byStatus].filter(([status]) => SETTLED.has(status)).reduce((n, [, c]) => n + c, 0),
      unlinkedPlans: built.reduce((n, epic) => n + epic.unlinked, 0),
      orphanPlans: built.reduce((n, epic) => n + epic.orphans.length, 0),
    },
    unreadable,
  }
}

/**
 * Group an initiative's tickets into status lanes, in the published order.
 *
 * Tickets whose state nothing declares form their own lane rather than being
 * folded into an existing one: "not started" and "cannot tell" are different
 * claims, and a board that merges them cannot be trusted about either.
 *
 * @param {object} initiative - from {@link buildInitiative}.
 * @returns {Array<{status: string|null, tickets: Array<object>}>} the lanes, settled last.
 */
export function statusLanes(initiative) {
  const groups = new Map()
  for (const epic of initiative.epics) {
    for (const ticket of epic.tickets) {
      const key = ticket.status
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push({ ...ticket, epic: epic.slug, epicTitle: epic.title })
    }
  }

  const rank = (status) => {
    if (status === null) return STATUS_ORDER.length - 1
    const index = STATUS_ORDER.indexOf(status)
    return index === -1 ? STATUS_ORDER.length - 2 : index
  }

  return [...groups]
    .map(([status, tickets]) => ({ status, tickets }))
    .sort((a, b) => rank(a.status) - rank(b.status))
}
