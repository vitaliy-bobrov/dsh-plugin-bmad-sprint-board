/**
 * The board model and the v7 detectors.
 *
 * The fixtures are files, not parsed rows, because that is what the model takes
 * now: the ticket store decides what a file is from its frontmatter `type`, and
 * a test handing over a pre-classified plan cannot catch a classification
 * mistake. Every detector gets a fixture that should fire it and a clean fixture
 * beside it -- a detector nobody has checked can stay quiet is one nobody has
 * checked.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { detectEmptyInitiative, detectInitiative } from './detect.js'
import {
  KNOWN_STATUS,
  SETTLED,
  STATE_OF,
  buildInitiative,
  humanise,
  stateOf,
  statusLanes,
  ticketStatus,
} from './model.js'

const DIR = 'initiatives/i-x/tickets/epic-a/tickets'

/** A story index with `count` entries titled "Ticket 1" ... "Ticket n". */
function storyIndex(count) {
  return Array.from({ length: count }, (_, i) => `[[entry]]
id = "${i + 1}"
type = "story"
title = "Ticket ${i + 1}"`).join('\n\n')
}

/** A leaf file: the ticket itself. */
const leaf = (id, status = '') => ({
  path: `${DIR}/story-ticket-${id}.md`,
  text: `---\nid: '${id}'\ntype: story\ntitle: 'Ticket ${id}'\nstatus: '${status}'\n---\n`,
})

/** A plan over a ticket, which the store joins by its `ticket` key. */
const plan = (ticket, status) => ({
  path: `${DIR}/story-ticket-${ticket}-plan.md`,
  text: `---\ntype: feature\nticket: '${ticket}'\nstatus: '${status}'\n---\n`,
})

/**
 * Build one initiative.
 *
 * @param {object} spec - what to include.
 * @returns {object} the model.
 */
function initiative({
  status = 'in-progress',
  epicStatus = 'in-progress',
  entries = 2,
  files = [leaf(1, 'done'), leaf(2, 'in-progress')],
} = {}) {
  return buildInitiative({
    slug: 'x',
    dir: 'initiatives/i-x',
    ticket: `---\ntype: initiative\ntitle: "X"\nstatus: '${status}'\n---\n`,
    epics: [{
      id: 1,
      slug: 'epic-a',
      title: 'Epic A',
      folder: 'initiatives/i-x/tickets/epic-a',
      ticket: `---\ntype: epic\ntitle: "Epic A"\nparent: i-x\nstatus: '${epicStatus}'\n---\n`,
      storyIndex: storyIndex(entries),
      files,
    }],
  })
}

test('the state table matches the one the ticket store uses', () => {
  // Copied from tickets.py on purpose: the board's lanes have to be the lanes
  // `tickets.py status` reports, or the two disagree about the same repository.
  assert.equal(stateOf(''), 'backlog')
  assert.equal(stateOf('draft'), 'backlog')
  assert.equal(stateOf('ready-for-dev'), 'backlog')
  assert.equal(stateOf('in-progress'), 'in-progress')
  assert.equal(stateOf('blocked'), 'in-progress')
  assert.equal(stateOf('in-review'), 'review')
  assert.equal(stateOf('built'), 'review')
  assert.equal(stateOf('done'), 'done')
  assert.equal(stateOf('dropped'), 'dropped')
  assert.equal(stateOf('shipped'), 'unknown')
  assert.equal(KNOWN_STATUS.has('shipped'), false)
  assert.equal(SETTLED.has('done'), true)
})

test('a ticket with an index entry and no file at all is backlog, not unknown', () => {
  // A planned story looks exactly like this before bmad-build writes its plan:
  // the plan is an artefact of building, not a precondition of existing.
  const model = initiative({ files: [] })
  assert.equal(model.epics[0].tickets[0].status, 'backlog')
  assert.equal(model.counts.unknown, 0)
})

test('a leaf carries the state when no plan overrides it', () => {
  const model = initiative({ files: [leaf(1, 'in-progress')] })
  assert.equal(model.epics[0].tickets[0].status, 'in-progress')
})

test('a plan overrides its leaf', () => {
  const model = initiative({ files: [leaf(1, 'in-progress'), plan(1, 'done')] })
  assert.equal(model.epics[0].tickets[0].status, 'done')
  assert.equal(model.epics[0].tickets[0].plan.ticket, '1')
})

test('a plan file with no ticket key and a non-leaf type is ignored and reported', () => {
  // The migration artefact: `type: feature` and no `ticket`, so the store sees
  // neither a leaf nor a plan, and the ticket reads as backlog.
  const model = initiative({
    files: [{
      path: `${DIR}/story-ticket-1-plan.md`,
      text: "---\ntype: feature\nstatus: 'done'\n---\n",
    }],
  })
  assert.equal(model.epics[0].tickets[0].status, 'backlog')
  assert.equal(model.counts.ignoredFiles, 1)
  const { gaps } = detectInitiative(model)
  const l1 = gaps.find((g) => g.id === 'L1')
  assert.ok(l1, 'L1 fired')
  assert.equal(l1.severity, 'high')
})

test('counts distinguish settled from open, and unknown is its own count', () => {
  const model = initiative({ entries: 3, files: [leaf(1, 'done'), leaf(2, 'shipped')] })
  assert.equal(model.counts.tickets, 3)
  assert.equal(model.counts.settled, 1)
  assert.equal(model.counts.unknown, 1, 'the unrecognised word is counted apart')
  assert.equal(model.counts.byStatus.get('backlog'), 1, 'the third has no file')
})

test('statusLanes orders by the state list, unknown last', () => {
  const model = initiative({
    entries: 4,
    files: [leaf(1, 'done'), leaf(2, 'in-progress'), leaf(3, 'shipped')],
  })
  const lanes = statusLanes(model)
  assert.deepEqual(lanes.map((lane) => lane.status), ['backlog', 'in-progress', 'done', 'unknown'])
  assert.equal(lanes[0].tickets[0].epic, 'epic-a')
})

test('a clean initiative produces no gaps', () => {
  const { gaps, unverifiable } = detectInitiative(initiative())
  assert.deepEqual(gaps, [])
  assert.deepEqual(unverifiable, [])
})

test('L2 fires for a leaf no index entry lists', () => {
  const model = initiative({ entries: 1, files: [leaf(1, 'done'), leaf(9, 'done')] })
  const { gaps } = detectInitiative(model)
  const l2 = gaps.find((g) => g.id === 'L2')
  assert.ok(l2, 'L2 fired')
  assert.match(l2.evidence, /1 leaf ticket/)
})

test('L3 fires for a plan whose ticket names nothing', () => {
  const model = initiative({ entries: 1, files: [leaf(1, 'done'), plan(7, 'done')] })
  const { gaps } = detectInitiative(model)
  assert.ok(gaps.find((g) => g.id === 'L3'), 'L3 fired')
})

test('L4 reports an unrecognised status word without counting it as settled', () => {
  const model = initiative({ files: [leaf(1, 'shipped'), leaf(2, 'done')] })
  const { unverifiable } = detectInitiative(model)
  const l4 = unverifiable.find((u) => u.id === 'L4')
  assert.ok(l4, 'L4 fired')
  assert.match(l4.tickets[0], /shipped/)
  assert.equal(model.counts.settled, 1)
})

test('C1 fires when a settled epic still has open tickets', () => {
  const model = initiative({
    epicStatus: 'done',
    files: [leaf(1, 'in-progress'), leaf(2, 'done')],
  })
  assert.ok(detectInitiative(model).gaps.find((g) => g.id === 'C1'), 'C1 fired')
})

test('C2 fires when a settled initiative still has open tickets', () => {
  const model = initiative({ status: 'done', files: [leaf(1, 'built'), leaf(2, 'done')] })
  assert.ok(detectInitiative(model).gaps.find((g) => g.id === 'C2'), 'C2 fired')
})

test('C1 and C2 stay quiet on a consistent container', () => {
  const model = initiative({
    status: 'done',
    epicStatus: 'done',
    files: [leaf(1, 'done'), leaf(2, 'done')],
  })
  const { gaps } = detectInitiative(model)
  assert.equal(gaps.filter((g) => g.id === 'C1' || g.id === 'C2').length, 0)
})

test('E1 fires only for an initiative with no epics', () => {
  const empty = buildInitiative({
    slug: 'y',
    dir: 'initiatives/i-y',
    ticket: "---\ntype: initiative\ntitle: 'Y'\nstatus: 'done'\n---\n",
    epics: [],
  })
  assert.equal(detectEmptyInitiative(empty).id, 'E1')
  assert.equal(detectEmptyInitiative(initiative()), null)
})

test('humanise turns a slug into words, and leaves a token with digits alone', () => {
  assert.equal(humanise('vip-reservations'), 'Vip Reservations')
  assert.equal(humanise('app-shell'), 'App Shell')
  assert.equal(humanise('epic-tools-landing-navigation'), 'Tools Landing Navigation')
  assert.equal(humanise('i18n'), 'i18n')
})

test('an initiative with no title falls back to its humanised slug', () => {
  const model = buildInitiative({
    slug: 'vip-reservations',
    dir: 'initiatives/i-vip',
    ticket: "---\ntype: initiative\nstatus: 'done'\n---\n",
    epics: [],
  })
  assert.equal(model.title, 'Vip Reservations')
})

test('ticketStatus prefers the plan, then the leaf, then backlog', () => {
  assert.equal(ticketStatus({ status: 'done' }, { status: 'draft' }), 'done')
  assert.equal(ticketStatus(null, { status: 'draft' }), 'backlog')
  assert.equal(ticketStatus(null, null), 'backlog')
  assert.equal(ticketStatus({ status: 'shipped' }, null), 'unknown')
  // the table is the contract, so a stray key must not become a lane silently
  assert.equal(Object.keys(STATE_OF).length, 9)
})
