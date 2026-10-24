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
