/**
 * The board model and the v7 detectors.
 *
 * Each detector is given a fixture that should fire it and a clean fixture beside
 * it. A detector that only ever gets exercised on a dirty fixture is a detector
 * nobody has checked can stay quiet -- and a board that cries wolf on every
 * project is one nobody reads.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { detectEmptyInitiative, detectInitiative } from './detect.js'
import { buildInitiative, humanise, statusLanes, ticketStatus } from './model.js'

/** A story index with `count` entries titled "Ticket 1" ... "Ticket n". */
function storyIndex(count) {
  return Array.from({ length: count }, (_, i) => `[[entry]]
id = "${i + 1}"
type = "story"
title = "Ticket ${i + 1}"`).join('\n\n')
}

/** A plan fixture. */
const plan = (name, ticket, status) => ({
  path: `initiatives/i-x/tickets/epic-a/tickets/${name}`,
  text: `---\ntitle: 'x'\ntype: story\nstatus: '${status}'${ticket === null ? '' : `\nticket: '${ticket}'`}\n---\n`,
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
  plans = [plan('story-ticket-1-plan.md', '1', 'done'), plan('story-ticket-2-plan.md', '2', 'done')],
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
      plans,
    }],
  })
}

test('counts distinguish settled from unknown', () => {
  const model = initiative({ entries: 3, plans: [plan('story-ticket-1-plan.md', '1', 'done')] })
  assert.equal(model.counts.tickets, 3)
  assert.equal(model.counts.settled, 1)
  assert.equal(model.counts.unknown, 2, 'two tickets have no plan, so no state')
})

test('a ticket with no plan has no status rather than a default one', () => {
  const model = initiative({ entries: 1, plans: [] })
  assert.equal(model.epics[0].tickets[0].status, null)
  assert.equal(ticketStatus(null), null)
})

test('statusLanes puts unknown last and order follows the published list', () => {
  const model = initiative({
    entries: 3,
    plans: [
      plan('story-ticket-1-plan.md', '1', 'done'),
      plan('story-ticket-2-plan.md', '2', 'in-progress'),
      plan('story-ticket-3-plan.md', '3', 'blocked'),
    ],
  })
  const lanes = statusLanes(model)
  assert.deepEqual(lanes.map((lane) => lane.status), ['blocked', 'in-progress', 'done'])
  assert.equal(lanes[0].tickets[0].epic, 'epic-a')
})

test('a clean initiative produces no gaps', () => {
  const model = initiative()
  const { gaps, unverifiable } = detectInitiative(model)
  assert.deepEqual(gaps, [])
  assert.deepEqual(unverifiable, [])
})

test('L1 fires when plans match by name but the store does not link them', () => {
  const model = initiative({
    plans: [plan('story-ticket-1-plan.md', null, 'done'), plan('story-ticket-2-plan.md', null, 'done')],
  })
  const { gaps } = detectInitiative(model)
  const l1 = gaps.find((g) => g.id === 'L1')
  assert.ok(l1, 'L1 fired')
  assert.equal(l1.severity, 'high')
  assert.match(l1.evidence, /2 plan file/)
})

test('L2 reports tickets with no plan as unverifiable, not as gaps', () => {
  const model = initiative({ entries: 3, plans: [] })
  const { gaps, unverifiable } = detectInitiative(model)
  assert.equal(gaps.some((g) => g.id === 'L2'), false)
  const l2 = unverifiable.find((u) => u.id === 'L2')
  assert.ok(l2, 'L2 fired')
  assert.deepEqual(l2.tickets, ['1.1', '1.2', '1.3'])
})

test('L3 fires for a plan no entry claims', () => {
  const model = initiative({
    plans: [plan('story-ticket-1-plan.md', '1', 'done'), plan('story-ghost-plan.md', null, 'done')],
    entries: 1,
  })
  const { gaps } = detectInitiative(model)
  assert.ok(gaps.find((g) => g.id === 'L3'), 'L3 fired')
})

test('L4 reports an unknown status word without counting it', () => {
  const model = initiative({
    plans: [plan('story-ticket-1-plan.md', '1', 'shipped'), plan('story-ticket-2-plan.md', '2', 'done')],
  })
  const { unverifiable } = detectInitiative(model)
  const l4 = unverifiable.find((u) => u.id === 'L4')
  assert.ok(l4, 'L4 fired')
  assert.match(l4.tickets[0], /shipped/)
  // and the unknown word is not silently treated as finished
  assert.equal(model.counts.settled, 1)
})

test('C1 fires when a settled epic still has open tickets', () => {
  const model = initiative({
    epicStatus: 'done',
    plans: [plan('story-ticket-1-plan.md', '1', 'in-progress'), plan('story-ticket-2-plan.md', '2', 'done')],
  })
  const { gaps } = detectInitiative(model)
  assert.ok(gaps.find((g) => g.id === 'C1'), 'C1 fired')
})

test('C2 fires when a settled initiative still has open tickets', () => {
  const model = initiative({
    status: 'done',
    plans: [plan('story-ticket-1-plan.md', '1', 'built'), plan('story-ticket-2-plan.md', '2', 'done')],
  })
  const { gaps } = detectInitiative(model)
  assert.ok(gaps.find((g) => g.id === 'C2'), 'C2 fired')
})

test('C1 and C2 stay quiet on a consistent container', () => {
  const model = initiative({
    status: 'done',
    epicStatus: 'done',
    plans: [plan('story-ticket-1-plan.md', '1', 'done'), plan('story-ticket-2-plan.md', '2', 'done')],
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
  assert.equal(humanise('account-dashboard'), 'Account Dashboard')
  // the prefix is BMAD's, not part of the name
  assert.equal(humanise('epic-tools-landing-navigation'), 'Tools Landing Navigation')
  // i18n is a word, not two letters and a number
  assert.equal(humanise('i18n'), 'i18n')
})

test('an initiative with no title falls back to its humanised slug, not the raw one', () => {
  const model = buildInitiative({
    slug: 'vip-reservations',
    dir: 'initiatives/i-vip',
    ticket: "---\ntype: initiative\nstatus: 'done'\n---\n",
    epics: [],
  })
  assert.equal(model.title, 'Vip Reservations')
  assert.equal(model.counts.epics, 0)
  // and the empty store is what E1 exists to report
  assert.equal(detectEmptyInitiative(model).id, 'E1')
})
