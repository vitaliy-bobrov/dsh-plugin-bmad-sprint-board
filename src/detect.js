/**
 * v7 checks: what the ticket store and the tickets on disk disagree about.
 *
 * The v6 detectors compared a sprint file against deferred work and review
 * patches. v7 has no sprint file; the equivalents are the two records every
 * ticket keeps -- the entry in `tickets.toml` and the plan file beside it -- and
 * the statuses its containers claim.
 *
 * Two rules carry over from v6 unchanged:
 *
 *   1. **Nothing here writes.** The board is a reader.
 *   2. **Unverifiable is not clean.** A check that could not be evaluated
 *      returns an entry rather than nothing, because a board showing nothing
 *      must never be confusable with a board that cannot see.
 *
 * @module dsh-plugin-bmad-sprint-board/detect
 */

import { SETTLED } from './model.js'
import { coverageOf, coverageState } from './requirements.js'

/** How much a gap matters, highest first. */
export const SEVERITY = ['high', 'medium', 'low']

/**
 * Build one gap in the shape every view renders.
 *
 * @param {object} spec - the gap's fields.
 * @returns {object} the gap.
 */
function gap({ id, title, severity, subject, subjectKind, evidence, action }) {
  return { id, title, severity, subject, subjectKind, evidence, action }
}

/**
 * A prompt that hands the finding back to the agent that owns the store.
 *
 * @param {string} text - the instruction.
 * @returns {{kind: string, label: string, payload: string}} the action.
 */
function ask(text) {
  return { kind: 'prompt', label: 'Ask agent', payload: text }
}

/**
 * Check one initiative against its tickets.
 *
 * @param {object} initiative - from `buildInitiative`.
 * @returns {{gaps: Array<object>, unverifiable: Array<object>}} what disagrees.
 */
export function detectInitiative(initiative) {
  const gaps = []
  const unverifiable = []
  const where = initiative.slug


  // A requirement nothing claims to cover was never planned. It is not "not
  // done": no ticket exists that could have done it, which is a planning gap and
  // reads differently from unfinished work.
  const coverage = coverageOf(initiative)
  const uncovered = (initiative.requirements ?? [])
    .filter((requirement) => coverageState(coverage.get(requirement.id)) === 'uncovered')
  if (uncovered.length > 0) {
    gaps.push(gap({
      id: 'REQ',
      title: 'requirements nothing covers',
      severity: 'medium',
      subject: where,
      subjectKind: 'initiative',
      evidence:
        `${uncovered.length} of ${initiative.requirements.length} declared requirement(s) have `
        + 'no epic and no ticket listing them in `covers`.',
      action: ask(
        `In ${where}, these requirements are declared but nothing covers them: `
        + `${uncovered.map((r) => r.id).join(', ')}. Add them to the \`covers\` of the epic or `
        + 'ticket that delivers each, or drop the requirement.',
      ),
    }))
  }

  // Work deferred off a ticket, on a ticket the store already calls finished. The
  // deferral was a live decision and the completion is a later one; both can be
  // true, but the board should say the finished thing still owes something.
  const settledTickets = initiative.epics
    .flatMap((epic) => epic.tickets)
    .filter((ticket) => SETTLED.has(ticket.status))
  const owing = []
  for (const section of initiative.deferred ?? []) {
    const named = settledTickets.find((ticket) => {
      const file = (ticket.plan?.path ?? ticket.leaf?.path ?? '').split('/').pop()
      return file !== '' && section.source.includes(file)
    })
    if (named !== undefined) owing.push({ section, ticket: named })
  }
  if (owing.length > 0) {
    const count = owing.reduce((n, entry) => n + entry.section.items.length, 0)
    gaps.push(gap({
      id: 'B1',
      title: 'finished tickets that still owe work',
      severity: 'medium',
      subject: where,
      subjectKind: 'initiative',
      evidence:
        `${count} deferred item(s) were set aside by a ticket the store now calls settled `
        + `(${owing.map((entry) => entry.ticket.ref).join(', ')}).`,
      action: ask(
        `In ${where}, ${count} deferred item(s) came from tickets that are now settled. `
        + `Decide for each whether it is still owed: ${owing.flatMap((entry) => entry.section.items).slice(0, 3).join(' | ')}`,
      ),
    }))
  }

  // Review patches a build wrote down and never ticked. A settled ticket with
  // unticked patches says the review found work and the completion ignored it.
  const patched = initiative.epics
    .flatMap((epic) => epic.tickets)
    .filter((ticket) => SETTLED.has(ticket.status) && (ticket.plan?.openPatches ?? 0) > 0)
  if (patched.length > 0) {
    const count = patched.reduce((n, ticket) => n + ticket.plan.openPatches, 0)
    gaps.push(gap({
      id: 'B3',
      title: 'review patches never applied',
      severity: 'high',
      subject: where,
      subjectKind: 'initiative',
      evidence:
        `${count} unticked [Review][Patch] item(s) across ${patched.length} settled ticket(s).`,
      action: ask(
        `In ${where}, these settled tickets still have unticked [Review][Patch] items: `
        + `${patched.map((ticket) => `${ticket.ref} (${ticket.plan.openPatches})`).join(', ')}. `
        + 'Apply them or tick them off.',
      ),
    }))
  }


  // A UX run nothing downstream cites is a document nobody reads: the design was
  // produced and then not built on. The plan is the collection of tickets here,
  // so a run the tickets never name has not been carried forward.
  if (initiative.ux !== null && initiative.ux !== undefined && !initiative.ux.claimed) {
    gaps.push(gap({
      id: 'U1',
      title: 'UX run not carried into the plan',
      severity: 'medium',
      subject: initiative.ux.run,
      subjectKind: 'area',
      evidence: 'the UX design run exists, and no ticket or epic names any part of it.',
      action: ask(
        `The UX design run ${initiative.ux.run} exists, and nothing in ${where}'s ticket store `
        + 'cites it. Tell me whether its decisions are already covered elsewhere, whether it '
        + 'should feed the plan, or whether it is superseded and can be retired.',
      ),
    }))
  }

  // A component the design asks for and no epic delivers. The join is the shared
  // vocabulary: the design names it and the plan that builds it names the same
  // words. A pattern the design itself marked deferred is not a failure.
  const undelivered = (initiative.ux?.components ?? [])
    .filter((component) => !component.deferred && component.deliveredBy.length === 0)
  if (undelivered.length > 0) {
    gaps.push(gap({
      id: 'U2',
      title: 'UX components no epic delivers',
      severity: 'medium',
      subject: where,
      subjectKind: 'initiative',
      evidence:
        `${undelivered.length} component pattern(s) in ${initiative.ux.run} are named by no epic `
        + 'or ticket, so nothing in the plan builds them.',
      action: ask(
        `In ${where}, these UX component patterns are named nowhere in the plan: `
        + `${undelivered.map((component) => component.name).join(', ')}. Either plan them into an `
        + 'epic, or record in EXPERIENCE.md that they are deferred or dropped.',
      ),
    }))
  }

  // An epic nobody has sliced yet is why the lanes below it are empty, so it is
  // the first thing the board says rather than the last.
  for (const epic of initiative.epics) {
    const unsliced = detectUnslicedEpic(epic)
    if (unsliced !== null) gaps.push(unsliced)
  }

  // A ticket file the store cannot classify is invisible to `tickets.py`. The
  // store tells leaves from plans by frontmatter type, so a `*-plan.md` whose
  // type is not `story`/`spike`/`bug` and which names no ticket is neither --
  // its ticket then reports as backlog however finished the work is. Every
  // number the tooling prints is wrong while every file on disk looks correct.
  const ignored = initiative.epics.flatMap((epic) =>
    epic.ignored.map((path) => ({ epic, path })))
  if (ignored.length > 0) {
    const example = ignored[0]
    gaps.push(gap({
      id: 'L1',
      title: 'ticket files the store cannot read',
      severity: 'high',
      subject: where,
      subjectKind: 'initiative',
      evidence:
        `${ignored.length} file(s) in a ticket folder are neither a leaf ticket nor a plan, `
        + `so the store ignores them and reports their tickets as backlog.`,
      action: ask(
        `In ${where}, ${ignored.length} ticket file(s) are invisible to the store: `
        + `${example.path} and others. Each needs \`type: story\` (or spike/bug) to be a leaf, `
        + `or a \`ticket: <id>\` key to be a plan. Then re-run \`tickets.py status\`.`,
      ),
    }))
  }

  // A leaf the index does not list is a ticket the store knows and the plan does
  // not, which is the inverse of an orphan: work exists that nothing schedules.
  const unlisted = initiative.epics.flatMap((epic) =>
    epic.tickets.filter((ticket) => ticket.unlisted === true).map((ticket) => ({ epic, ticket })))
  if (unlisted.length > 0) {
    gaps.push(gap({
      id: 'L2',
      title: 'ticket files no index entry lists',
      severity: 'medium',
      subject: where,
      subjectKind: 'initiative',
      evidence: `${unlisted.length} leaf ticket(s) exist on disk with no entry in any ticket index.`,
      action: ask(
        `These tickets in ${where} have a file but no index entry: `
        + `${unlisted.map(({ ticket }) => ticket.ref).join(', ')}. Add the entry or remove the file.`,
      ),
    }))
  }

  // A plan file nothing claims is either a renamed ticket or leftover work.
  const orphans = initiative.epics.flatMap((epic) =>
    epic.orphans.map((plan) => ({ epic, plan })))
  if (orphans.length > 0) {
    gaps.push(gap({
      id: 'L3',
      title: 'plans no ticket claims',
      severity: 'medium',
      subject: where,
      subjectKind: 'initiative',
      evidence: `${orphans.length} plan file(s) correspond to no entry in any ticket index.`,
      action: ask(
        `These plan files in ${where} belong to no ticket index entry: `
        + `${orphans.map(({ plan }) => plan.path).join(', ')}. Add the ticket or delete the file.`,
      ),
    }))
  }

  // A status word the board does not know is shown, but never counted as
  // settled: guessing that an unfamiliar word means finished is how a board
  // starts lying.
  const odd = initiative.epics.flatMap((epic) =>
    epic.tickets
      .filter((ticket) => ticket.status === 'unknown')
      .map((ticket) => ({ epic, ticket })))
  if (odd.length > 0) {
    unverifiable.push({
      id: 'L4',
      title: 'unrecognised status words',
      subject: where,
      subjectKind: 'initiative',
      evidence: `${odd.length} ticket(s) carry a status this board does not recognise, so they are not counted either way.`,
      tickets: odd.map(({ ticket }) => `${ticket.ref} (${ticket.word})`),
      action: ask(`These statuses are unrecognised: ${odd.map(({ ticket }) => `${ticket.ref}=${ticket.word}`).join(', ')}. Confirm what they mean.`),
    })
  }

  // A container whose status is settled while its tickets are not is the classic
  // migration artefact: the folder was closed, the work inside it was not.
  for (const epic of initiative.epics) {
    if (epic.status === null || !SETTLED.has(epic.status)) continue
    const open = epic.tickets.filter((ticket) => !SETTLED.has(ticket.status))
    if (open.length === 0) continue
    gaps.push(gap({
      id: 'C1',
      title: 'epic settled with open tickets',
      severity: 'high',
      subject: epic.slug,
      subjectKind: 'epic',
      evidence: `the epic says ${epic.status}, but ${open.length} of its tickets are not settled.`,
      action: ask(
        `Epic ${epic.slug} is marked ${epic.status} while ${open.map((t) => t.ref).join(', ')} `
        + `are not settled. Reopen the epic or close those tickets.`,
      ),
    }))
  }

  if (initiative.status !== null && SETTLED.has(initiative.status)) {
    const open = initiative.epics.flatMap((epic) =>
      epic.tickets.filter((ticket) => !SETTLED.has(ticket.status)))
    if (open.length > 0) {
      gaps.push(gap({
        id: 'C2',
        title: 'initiative settled with open tickets',
        severity: 'high',
        subject: where,
        subjectKind: 'initiative',
        evidence: `the initiative says ${initiative.status}, but ${open.length} tickets inside it are not settled.`,
        action: ask(
          `Initiative ${where} is marked ${initiative.status} while ${open.length} tickets are open. `
          + `Reopen it or settle the tickets.`,
        ),
      }))
    }
  }

  return { gaps, unverifiable }
}

/**
 * An epic with no tickets under it.
 *
 * The store slices an initiative into epics and an epic into stories, so an epic
 * with an empty ticket folder has not been planned yet -- and nothing can start
 * until it is. This is the finding that explains an otherwise silent board: every
 * lane is empty because the work has not been written down.
 *
 * The action names the Product Owner because planning an epic is Sofia's job, not
 * the builder's: `slice.md` has her refine the epic and write all its stories
 * before any of them can be worked.
 *
 * @param {object} epic - one epic from the model.
 * @returns {object|null} the gap, or null when the epic holds tickets.
 */
export function detectUnslicedEpic(epic) {
  if (epic.tickets.length > 0) return null
  return gap({
    id: 'E2',
    title: 'epic has no stories',
    severity: 'medium',
    subject: epic.slug,
    subjectKind: 'epic',
    evidence: 'the epic exists and its ticket store lists no stories, so nothing in it can start.',
    action: ask(
      `/bmad-agent-po Plan epic ${epic.slug} ("${epic.title}"). Its ticket store lists no `
      + 'stories yet: refine it, then write its stories so the work can be started.',
    ),
  })
}

/**
 * Check an initiative that declares no epics.
 *
 * @param {object} initiative - from `buildInitiative`.
 * @returns {object|null} the gap, or null when the initiative has work.
 */
export function detectEmptyInitiative(initiative) {
  if (initiative.counts.epics > 0) return null
  return gap({
    id: 'E1',
    title: 'initiative declares no epics',
    severity: 'low',
    subject: initiative.slug,
    subjectKind: 'initiative',
    evidence: 'the initiative folder exists and its ticket store lists no epics.',
    action: ask(
      `Initiative ${initiative.slug} has no epics in its ticket store. Either it has not been sliced `
      + `yet, or it is finished and can be archived.`,
    ),
  })
}
