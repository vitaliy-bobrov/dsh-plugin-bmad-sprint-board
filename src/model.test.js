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
  containerState,
  humanise,
  nextStep,
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
  const { gaps } = detectInitiative(model)
  const l4 = gaps.find((g) => g.id === 'L4')
  assert.ok(l4, 'L4 fired')
  // a word the store cannot read is a contradiction, not unfinished work
  assert.equal(l4.bucket, 'contradiction')
  assert.match(l4.action.payload, /shipped/)
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

test('a container that does declare a status keeps the state that status means', () => {
  const model = initiative({ status: 'done', epicStatus: 'dropped' })
  assert.equal(model.status, 'done')
  assert.equal(model.epics[0].status, 'dropped')
})


test('a silent container reads its children', () => {
  // BMAD leaves the status absent until the first ticket starts, so silence is
  // the absence of a fact rather than a fact. The children carry it.
  assert.equal(containerState(null, []), 'backlog')
  assert.equal(containerState(null, ['done', 'dropped']), 'done')
  assert.equal(containerState(null, ['done', 'backlog']), 'in-progress')
  assert.equal(containerState(null, ['in-progress']), 'in-progress')
  assert.equal(containerState('', []), 'backlog')
})

test('a declared status is believed, whatever the children say', () => {
  // An initiative finished and later stripped of its tickets is indistinguishable
  // from one that never started. Only the person who did it can tell them apart,
  // so the file wins and the board does not overrule it.
  assert.equal(containerState('done', []), 'done')
  assert.equal(containerState('done', ['backlog']), 'done')
  assert.equal(containerState('in-progress', ['done']), 'in-progress')
  assert.equal(containerState('dropped', []), 'dropped')
})

test('a live initiative reads in progress from its epics', () => {
  const model = buildInitiative({
    slug: 'vip-reservations',
    dir: 'initiatives/i-vip',
    ticket: "---\ntype: initiative\ntitle: 'VIP'\n---\n",
    epics: [
      {
        id: 1, slug: 'epic-one', title: 'One', folder: 'x',
        ticket: "---\ntype: epic\ntitle: 'One'\nstatus: 'done'\n---\n",
        storyIndex: storyIndex(1), files: [leaf(1, 'done')],
      },
      {
        id: 2, slug: 'epic-two', title: 'Two', folder: 'y',
        ticket: "---\ntype: epic\ntitle: 'Two'\n---\n",
        storyIndex: storyIndex(0), files: [],
      },
    ],
  })
  assert.equal(model.epics[0].status, 'done', 'a finished epic reads finished')
  assert.equal(model.epics[1].status, 'backlog', 'an empty epic has not started')
  assert.equal(model.status, 'in-progress', 'and the initiative holding both is live')
})

test('a silent epic whose tickets are all settled reads done', () => {
  const model = buildInitiative({
    slug: 'x', dir: 'd',
    ticket: "---\ntype: initiative\ntitle: 'X'\n---\n",
    epics: [{
      id: 1, slug: 'epic-a', title: 'A', folder: 'f',
      ticket: "---\ntype: epic\ntitle: 'A'\n---\n",
      storyIndex: storyIndex(2), files: [leaf(1, 'done'), leaf(2, 'dropped')],
    }],
  })
  assert.equal(model.epics[0].status, 'done')
  assert.equal(model.status, 'done', 'and so does the initiative above it')
})

test('nextStep finishes what is open before starting anything new', () => {
  const model = initiative({ files: [leaf(1, 'in-progress'), leaf(2, 'done')] })
  const next = nextStep(model)
  assert.equal(next.kind, 'continue')
  assert.equal(next.ticket.ref, '1.1')
})

test('nextStep starts a ticket once what it waits for is done', () => {
  const model = buildInitiative({
    slug: 'x', dir: 'd',
    ticket: "---\ntype: initiative\ntitle: 'X'\n---\n",
    epics: [{
      id: 1, slug: 'epic-a', title: 'A', folder: 'f',
      storyIndex: `[[entry]]
id = "1"
type = "story"
title = "Ticket 1"
[[entry]]
id = "2"
type = "story"
title = "Ticket 2"
after = ["1.1"]`,
      files: [leaf(1, 'done'), leaf(2, '')],
    }],
  })
  const next = nextStep(model)
  assert.equal(next.kind, 'start')
  assert.equal(next.ticket.ref, '1.2', 'the dependency is met')
})

test('a ticket whose dependency is not done is not offered as next', () => {
  const model = buildInitiative({
    slug: 'x', dir: 'd',
    ticket: "---\ntype: initiative\ntitle: 'X'\n---\n",
    epics: [{
      id: 1, slug: 'epic-a', title: 'A', folder: 'f',
      storyIndex: `[[entry]]
id = "1"
type = "story"
title = "Ticket 1"
[[entry]]
id = "2"
type = "story"
title = "Ticket 2"
after = ["1.1"]`,
      files: [leaf(1, ''), leaf(2, '')],
    }],
  })
  const next = nextStep(model)
  // 1.1 is ready and 1.2 waits on it, so the answer is 1.1
  assert.equal(next.kind, 'start')
  assert.equal(next.ticket.ref, '1.1')
})

test('nextStep names the unsliced epic when nothing is ready', () => {
  // The live shape: every ticket settled, two epics with no stories written.
  const model = buildInitiative({
    slug: 'vip', dir: 'd',
    ticket: "---\ntype: initiative\ntitle: 'VIP'\n---\n",
    epics: [
      {
        id: 1, slug: 'epic-done', title: 'Done', folder: 'a',
        ticket: "---\ntype: epic\ntitle: 'Done'\nstatus: 'done'\n---\n",
        storyIndex: storyIndex(1), files: [leaf(1, 'done')],
      },
      {
        id: 2, slug: 'epic-empty', title: 'Empty', folder: 'b',
        ticket: "---\ntype: epic\ntitle: 'Empty'\n---\n",
        storyIndex: storyIndex(0), files: [],
      },
    ],
  })
  const next = nextStep(model)
  assert.equal(next.kind, 'slice')
  assert.equal(next.epic.slug, 'epic-empty')
  // and the epic is reported, with the Product Owner named in the action
  const { gaps } = detectInitiative(model)
  const e2 = gaps.find((g) => g.id === 'E2')
  assert.ok(e2, 'E2 fired')
  assert.match(e2.action.payload, /bmad-agent-po/)
})

test('nextStep says so when nothing is waiting', () => {
  const model = initiative({ files: [leaf(1, 'done'), leaf(2, 'done')] })
  const next = nextStep(model)
  assert.equal(next.kind, 'none')
})

test('a ticket with an unrecognised status is never offered as next', () => {
  const model = initiative({ entries: 2, files: [leaf(1, 'shipped')] })
  const next = nextStep(model)
  // 1.1 is unknown, so the only thing that can be offered is the other ticket
  assert.notEqual(next.kind === 'start' && next.ticket.ref, '1.1')
})

test('REQ fires when nothing covers a declared requirement', () => {
  const model = buildInitiative({
    slug: 'x', dir: 'd',
    ticket: "## Requirements\n\n- R1 (a): one\n- R2 (b): two\n",
    epics: [{
      id: 1, slug: 'epic-a', title: 'A', folder: 'f', covers: ['R1'],
      ticket: "---\ntype: epic\ntitle: 'A'\nstatus: 'done'\n---\n",
      storyIndex: storyIndex(1), files: [leaf(1, 'done')],
    }],
  })
  assert.equal(model.requirements.length, 2)
  const { gaps } = detectInitiative(model)
  const req = gaps.find((g) => g.id === 'REQ')
  assert.ok(req, 'REQ fired')
  assert.match(req.evidence, /1 of 2/)
})

test('REQ stays quiet when every requirement is claimed', () => {
  const model = buildInitiative({
    slug: 'x', dir: 'd',
    ticket: "## Requirements\n\n- R1 (a): one\n",
    epics: [{
      id: 1, slug: 'epic-a', title: 'A', folder: 'f', covers: ['R1'],
      ticket: "---\ntype: epic\ntitle: 'A'\nstatus: 'done'\n---\n",
      storyIndex: storyIndex(1), files: [leaf(1, 'done')],
    }],
  })
  const { gaps } = detectInitiative(model)
  assert.equal(gaps.filter((g) => g.id === 'REQ').length, 0)
})

test('B3 fires for unticked review patches on a settled ticket', () => {
  const model = buildInitiative({
    slug: 'x', dir: 'd',
    ticket: "---\ntype: initiative\ntitle: 'X'\nstatus: 'in-progress'\n---\n",
    epics: [{
      id: 1, slug: 'epic-a', title: 'A', folder: 'f',
      ticket: "---\ntype: epic\ntitle: 'A'\nstatus: 'in-progress'\n---\n",
      storyIndex: storyIndex(1),
      files: [
        leaf(1, 'done'),
        {
          path: `${DIR}/story-ticket-1-plan.md`,
          text: "---\ntype: feature\nticket: '1'\nstatus: 'done'\n---\n"
            + '\n- [x] [Review][Patch] applied\n- [ ] [Review][Patch] never applied\n',
        },
      ],
    }],
  })
  const { gaps } = detectInitiative(model)
  const b3 = gaps.find((g) => g.id === 'B3')
  assert.ok(b3, 'B3 fired')
  assert.match(b3.evidence, /1 unticked/)
})

test('B1 fires when a deferred item came from a settled ticket', () => {
  const model = buildInitiative({
    slug: 'x', dir: 'd',
    ticket: "---\ntype: initiative\ntitle: 'X'\nstatus: 'in-progress'\n---\n",
    deferred: '## Deferred from: code review of story-ticket-1-plan.md (2026-10-27)\n\n- an item\n',
    epics: [{
      id: 1, slug: 'epic-a', title: 'A', folder: 'f',
      ticket: "---\ntype: epic\ntitle: 'A'\nstatus: 'in-progress'\n---\n",
      storyIndex: storyIndex(1),
      files: [
        leaf(1, 'done'),
        {
          path: `${DIR}/story-ticket-1-plan.md`,
          text: "---\ntype: feature\nticket: '1'\nstatus: 'done'\n---\n",
        },
      ],
    }],
  })
  const { gaps } = detectInitiative(model)
  const b1 = gaps.find((g) => g.id === 'B1')
  assert.ok(b1, 'B1 fired')
  assert.match(b1.evidence, /1 deferred item/)
})

test('U1 fires when nothing in the plan names the UX run', () => {
  const model = buildInitiative({
    slug: 'x', dir: 'd',
    ticket: "---\ntype: initiative\ntitle: 'X'\nstatus: 'in-progress'\n---\n",
    ux: { run: 'ux-the-run', experience: '## Component Patterns\n\n### Reserve Button\n' },
    epics: [{
      id: 1, slug: 'epic-a', title: 'A', folder: 'f',
      ticket: "---\ntype: epic\ntitle: 'A'\nstatus: 'in-progress'\n---\n",
      storyIndex: storyIndex(1), files: [leaf(1, 'done')],
    }],
  })
  assert.equal(model.ux.claimed, false, 'nothing cites the run')
  const u1 = detectInitiative(model).gaps.find((g) => g.id === 'U1')
  assert.ok(u1, 'U1 fired')
  assert.equal(u1.subject, 'ux-the-run')
})

test('U1 stays quiet once the plan names the run', () => {
  const model = buildInitiative({
    slug: 'x', dir: 'd',
    ticket: "---\ntype: initiative\ntitle: 'X'\nstatus: 'in-progress'\n---\n\n"
      + '- design - `ux-the-run/DESIGN.md`\n',
    ux: { run: 'ux-the-run', experience: '## Component Patterns\n\n### Reserve Button\n' },
    epics: [{
      id: 1, slug: 'epic-a', title: 'A', folder: 'f',
      ticket: "---\ntype: epic\ntitle: 'A'\nstatus: 'in-progress'\n---\n",
      storyIndex: storyIndex(1), files: [leaf(1, 'done')],
    }],
  })
  assert.equal(model.ux.claimed, true)
  assert.equal(detectInitiative(model).gaps.filter((g) => g.id === 'U1').length, 0)
})

test('U2 fires for a component no epic delivers, and not for a deferred one', () => {
  const model = buildInitiative({
    slug: 'x', dir: 'd',
    ticket: "---\ntype: initiative\ntitle: 'X'\nstatus: 'in-progress'\n---\n\nSee `ux-run`.\n",
    ux: {
      run: 'ux-run',
      experience: '## Component Patterns\n\n### Reserve Button\n\n### Loyalty Tracker *(Deferred to Phase 3)*\n',
    },
    epics: [{
      id: 1, slug: 'epic-a', title: 'A', folder: 'f',
      ticket: "---\ntype: epic\ntitle: 'A'\nstatus: 'in-progress'\n---\n",
      storyIndex: storyIndex(1),
      files: [
        leaf(1, 'done'),
        {
          path: `${DIR}/story-ticket-1-plan.md`,
          text: "---\ntype: feature\nticket: '1'\nstatus: 'done'\n---\nBuilds the ReserveButton.\n",
        },
      ],
    }],
  })
  const components = model.ux.components
  assert.equal(components.find((c) => c.name === 'Reserve Button').deliveredBy.length, 1)
  assert.equal(components.find((c) => c.name === 'Loyalty Tracker').deliveredBy.length, 0)
  // only the non-deferred one is a finding
  assert.equal(detectInitiative(model).gaps.filter((g) => g.id === 'U2').length, 0)
})

test('U2 reports the components nothing names', () => {
  const model = buildInitiative({
    slug: 'x', dir: 'd',
    ticket: "---\ntype: initiative\ntitle: 'X'\nstatus: 'in-progress'\n---\n\nSee `ux-run`.\n",
    ux: { run: 'ux-run', experience: '## Component Patterns\n\n### Mystery Placeholder\n' },
    epics: [{
      id: 1, slug: 'epic-a', title: 'A', folder: 'f',
      ticket: "---\ntype: epic\ntitle: 'A'\nstatus: 'in-progress'\n---\n",
      storyIndex: storyIndex(1), files: [leaf(1, 'done')],
    }],
  })
  const u2 = detectInitiative(model).gaps.find((g) => g.id === 'U2')
  assert.ok(u2, 'U2 fired')
  assert.match(u2.evidence, /1 component pattern/)
})
