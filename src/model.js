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
import { parseDeferred } from './deferred.js'
import { parseRequirements } from './requirements.js'
import { deliveredBy, parseComponentPatterns } from './ux.js'
import { classify, readLeaf, readPlan, readStoryIndex, slugify } from './store.js'

/**
 * The store's own status-to-state table.
 *
 * Copied from `tickets.py` rather than invented, because the board's lanes have
 * to be the lanes `tickets.py status` reports or the two disagree about the same
 * repository. An empty status is **backlog**: a ticket exists in the index and
 * nothing has happened to it, which is exactly how a planned story looks before
 * `bmad-build` writes its plan. Reading that as "unknown" was this board getting
 * it wrong -- a plan is an artefact of building, not a precondition of existing.
 */
export const STATE_OF = {
  '': 'backlog',
  draft: 'backlog',
  'ready-for-dev': 'backlog',
  'in-progress': 'in-progress',
  blocked: 'in-progress',
  'in-review': 'review',
  built: 'review',
  done: 'done',
  dropped: 'dropped',
}

/** The lane order, earliest first. */
export const STATE_ORDER = ['backlog', 'in-progress', 'review', 'done', 'dropped']

/** States that mean the work is finished. */
export const SETTLED = new Set(['done', 'dropped'])

/** Every status word the store understands. */
export const KNOWN_STATUS = new Set(Object.keys(STATE_OF))

/** The lanes, plus the one for a word the store does not understand. */
export const STATUS_ORDER = [...STATE_ORDER, 'unknown']

/**
 * The state a container is really in.
 *
 * Two cases, and they are not the same question.
 *
 * **The file declares a status.** That is the record BMAD keeps, and the board
 * reports it. It is not the board's place to decide a container marked done is
 * wrong just because it holds nothing: an initiative finished and later stripped
 * of its tickets looks exactly like one that never started, and only the person
 * who did it can tell them apart.
 *
 * **The file is silent.** BMAD leaves a container's status absent until its first
 * ticket starts, so silence is not a fact about the work -- it is the absence of
 * one. The children are the fact: no children means nothing has started, every
 * child settled means the container is finished, and anything between means it is
 * in progress.
 *
 * @param {string|null} declared - the word the container's file carries.
 * @param {string[]} children - the states of its epics (or tickets).
 * @returns {string} the lane.
 */
export function containerState(declared, children) {
  if (declared !== null && declared !== '') return stateOf(declared)
  if (children.length === 0) return 'backlog'
  if (children.every((state) => SETTLED.has(state))) return 'done'
  return 'in-progress'
}

/**
 * Map a status word to the lane it belongs in.
 *
 * A word the store does not know becomes its own lane and a finding, rather than
 * being guessed at: `tickets.py` treats an unrecognised status as blocked, and
 * silently inheriting that would hide a broken ticket behind a normal one.
 *
 * @param {string} status - the word from the ticket.
 * @returns {string} the lane.
 */
export function stateOf(status) {
  const word = String(status ?? '')
  return Object.hasOwn(STATE_OF, word) ? STATE_OF[word] : 'unknown'
}

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
 * A plan overrides its leaf, and a leaf overrides the index row. With neither,
 * the ticket is backlog -- not unknown. The only way to be unknown is to carry a
 * status word the store does not define.
 *
 * @param {object|null} plan - the joined plan, or null.
 * @param {object|null} leaf - the leaf file, or null.
 * @returns {string} the lane.
 */
export function ticketStatus(plan, leaf) {
  const word = plan?.status ?? leaf?.status ?? ''
  return stateOf(word)
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
export function buildInitiative({ slug, dir, ticket, deferred, ux, epics, unreadable = 0 }) {
  const own = readInitiativeTicket(ticket)
  const ledger = parseDeferred(deferred)
  const requirements = parseRequirements(ticket)
  const built = epics.map((epic) => {
    const header = readEpicTicket(epic.ticket)
    const entries = readStoryIndex(epic.storyIndex)

    // The store decides what a file is by its frontmatter type, not its name:
    // a leaf carries a ticket, a file with a `ticket` key is a plan over one,
    // and anything else is ignored. Splitting on the file name instead is what
    // made a folder of `*-plan.md` files invisible.
    const textByPath = new Map((epic.files ?? []).map((file) => [file.path, file.text]))
    const leaves = []
    const plans = []
    const ignored = []
    for (const file of epic.files ?? []) {
      const role = classify(file.text)
      if (role === 'leaf') leaves.push(readLeaf(file.text, file.path))
      else if (role === 'plan') plans.push(readPlan(file.text, file.path))
      else ignored.push(file.path)
    }

    const usedLeaves = new Set()
    const usedPlans = new Set()

    const build = (entry) => {
      const leaf = leaves.find((l) => l.id !== null && l.id === entry.id
        || l.path === `${entry.type}-${slugify(entry.title)}.md`) ?? null
      if (leaf !== null) usedLeaves.add(leaf.path)
      const plan = plans.find((pl) => pl.ticket === entry.id) ?? null
      if (plan !== null) usedPlans.add(plan.path)
      const word = plan?.status ?? leaf?.status ?? ''
      return {
        id: entry.id,
        ref: `${epic.id ?? '?'}.${entry.id}`,
        type: entry.type,
        title: leaf?.title ?? entry.title,
        v6Key: entry.v6Key,
        after: entry.after,
        covers: entry.covers,
        hitl: entry.hitl,
        word,
        status: ticketStatus(plan, leaf),
        plan,
        leaf,
        linkedBy: plan === null ? 'none' : 'ticket',
      }
    }

    const tickets = entries.map(build)

    // What each ticket actually says, for matching the design's words against.
    for (const ticket of tickets) {
      ticket.text = [ticket.leaf?.path, ticket.plan?.path]
        .filter((path) => path !== undefined && path !== null)
        .map((path) => textByPath.get(path) ?? '')
        .join('\n')
    }

    // A leaf the index does not list is still a ticket the store knows about.
    for (const leaf of leaves) {
      if (usedLeaves.has(leaf.path) || leaf.id === null) continue
      if (entries.some((entry) => entry.id === leaf.id)) continue
      const plan = plans.find((pl) => pl.ticket === leaf.id) ?? null
      if (plan !== null) usedPlans.add(plan.path)
      tickets.push({
        id: leaf.id,
        ref: `${epic.id ?? '?'}.${leaf.id}`,
        type: leaf.type ?? 'story',
        title: leaf.title ?? leaf.path,
        v6Key: null,
        word: plan?.status ?? leaf.status,
        status: ticketStatus(plan, leaf),
        plan,
        leaf,
        linkedBy: plan === null ? 'none' : 'ticket',
        unlisted: true,
      })
    }

    const orphans = plans.filter((pl) => !usedPlans.has(pl.path))

    return {
      id: epic.id,
      slug: epic.slug,
      // Everything the epic folder says, which is what the design's vocabulary is
      // matched against. Matching per ticket would miss a plan the store does not
      // link, and the question U2 asks is which epic delivers a component anyway.
      corpus: [epic.ticket ?? '', ...(epic.files ?? []).map((file) => file.text)].join('\n'),
      folder: epic.folder,
      covers: epic.covers ?? [],
      title: header.title ?? epic.title ?? epic.slug,
      // A container's status is absent until its first ticket starts, which is a
      // statement about the work rather than a gap in the file: it has not
      // started. Rendering that as "unknown" says the opposite.
      status: containerState(header.status, tickets.map((ticket) => ticket.status)),
      rawStatus: header.status,
      tickets,
      orphans,
      ignored,
      leaves: leaves.length,
    }
  })

  const byStatus = new Map()
  let total = 0
  let unknown = 0
  for (const epic of built) {
    for (const ticket of epic.tickets) {
      total += 1
      if (ticket.status === 'unknown') unknown += 1
      byStatus.set(ticket.status, (byStatus.get(ticket.status) ?? 0) + 1)
    }
  }

  const components = parseComponentPatterns(ux?.experience ?? null).map((pattern) => ({
    ...pattern,
    deliveredBy: pattern.deferred
      ? []
      : built.filter((epic) => deliveredBy(pattern.name, [{ ref: epic.slug, text: epic.corpus }]).length > 0)
        .map((epic) => epic.slug),
  }))
  const corpus = [ticket ?? '', ...built.flatMap((epic) => [epic.rawTicket, ...epic.tickets.map((t) => t.text)])].join('\n')

  return {
    slug,
    dir,
    ux: ux?.run === null || ux?.run === undefined
      ? null
      : {
          run: ux.run,
          // The run is carried when the plan names the folder: the epics document
          // that turns design into work is the initiative's own tickets here.
          claimed: corpus.includes(ux.run),
          components,
        },
    title: own.title ?? humanise(slug),
    status: containerState(own.status, built.map((epic) => epic.status)),
    rawStatus: own.status,
    epics: built,
    requirements,
    deferred: ledger.sections,
    counts: {
      deferred: ledger.count,
      epics: built.length,
      tickets: total,
      unknown,
      byStatus,
      settled: [...byStatus].filter(([status]) => SETTLED.has(status)).reduce((n, [, c]) => n + c, 0),
      orphanPlans: built.reduce((n, epic) => n + epic.orphans.length, 0),
      ignoredFiles: built.reduce((n, epic) => n + epic.ignored.length, 0),
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
    const index = STATUS_ORDER.indexOf(status)
    return index === -1 ? STATUS_ORDER.length - 1 : index
  }

  return [...groups]
    .map(([status, tickets]) => ({ status, tickets }))
    .sort((a, b) => rank(a.status) - rank(b.status))
}

/**
 * What can happen next, following the order `tickets.py next` classifies by.
 *
 * One answer, because a board that offers three has not answered. The order is
 * the store's own: finish what is open, then start what is ready -- a ticket
 * whose `after` are all done -- then, when nothing is ready, the reason is
 * usually that the work has not been written yet, which is a container with no
 * tickets under it.
 *
 * A ticket carrying a status word the store does not define is never offered: it
 * has to be settled before it can be worked.
 *
 * @param {object} initiative - from {@link buildInitiative}.
 * @returns {object} `{kind, ticket?, epic?}` where kind is continue, start, slice or none.
 */
export function nextStep(initiative) {
  const tickets = initiative.epics.flatMap((epic) =>
    epic.tickets.map((ticket) => ({ ...ticket, epic })))
  const settledRefs = new Set(tickets.filter((t) => SETTLED.has(t.status)).map((t) => t.ref))
  const open = tickets.filter((t) => !SETTLED.has(t.status))

  const running = open.find((t) => t.status === 'in-progress' || t.status === 'review')
  if (running !== undefined) return { kind: 'continue', ticket: running }

  const ready = open.find((t) => t.status !== 'unknown'
    && t.after.every((dep) => settledRefs.has(dep)))
  if (ready !== undefined) return { kind: 'start', ticket: ready }

  const unsliced = initiative.epics.find((epic) => epic.tickets.length === 0)
  if (unsliced !== undefined) return { kind: 'slice', epic: unsliced }

  return { kind: 'none' }
}
