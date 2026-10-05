/**
 * Detectors -- the gaps board's whole reason to exist.
 *
 * Every detector is a pure function over the model plus whatever file content
 * the shell has already read. Two rules hold throughout:
 *
 *   1. **Risks are derived.** Nothing here is written back, so nothing here can
 *      be silently overwritten by the framework's own writer.
 *   2. **Unverifiable is not clean.** A check that could not be evaluated
 *      returns an `unverifiable` entry rather than nothing, because a board
 *      showing nothing must never be confusable with a board that cannot see.
 *
 * @module @local/dsh-plugin-bmad-sprint-board/detect
 */

/** Severity vocabulary, borrowed from bmad-loop's deferred ledger. */
export const SEVERITY = ['critical', 'high', 'medium', 'low']

/**
 * A gap: something the evidence contradicts.
 * @typedef {object} Gap
 * @property {string} id - detector id, e.g. `B1`
 * @property {string} title - what kind of problem this is
 * @property {string} severity - one of {@link SEVERITY}
 * @property {string} subject - the key the reader recognises, e.g. a story key
 * @property {string} subjectKind - `story` | `epic` | `requirement` | `area`
 * @property {string} evidence - what was observed, in one sentence
 * @property {object} action - what to do about it
 * @property {string} action.kind - `command` | `prompt` | `open`
 * @property {string} action.label - the button's words
 * @property {string} action.payload - the string to copy, or the path to open
 */

/**
 * A check that could not be evaluated. Never rendered as clean.
 * @typedef {object} Unverifiable
 * @property {string} id - detector id
 * @property {string} subject - what could not be checked
 * @property {string} reason - why, naming the artefact that was missing or unreadable
 * @property {object} action - the prompt that would find out
 */

const storyLabel = (story) => story.key

/**
 * **B1 -- done but owing.** A story is `done` while deferred entries still name
 * its spec. Deferred work is, by definition, work that was *not* done, so the
 * tracking file asserts a completeness the evidence contradicts.
 *
 * Fires on real data: story 3-2 in the reference repo.
 *
 * @param {object} model - the model from `buildModel`.
 * A deferral that attributes to no story is *not* claimed here -- an unattributed
 * entry is the orphan-deferred detector's business, and guessing which story owns
 * it would be exactly the silent wrongness this board exists to catch.
 *
 * @returns {{gaps: Gap[], unverifiable: Unverifiable[]}}
 */
export function detectDoneButOwing(model) {
  const gaps = []
  const unverifiable = []

  for (const story of model.stories) {
    if (story.status !== 'done') continue
    // `linkDeferredToStories` attaches the story OBJECT, not its key
    const owed = (model.deferred ?? []).filter((item) => item.story?.key === story.key)
    if (owed.length === 0) continue

    gaps.push({
      id: 'B1',
      title: 'done but owing',
      severity: 'high',
      subject: story.key,
      subjectKind: 'story',
      evidence:
        `marked done, yet ${owed.length} deferred entr${owed.length === 1 ? 'y' : 'ies'} ` +
        `still name${owed.length === 1 ? 's' : ''} this story's spec`,
      action: {
        kind: 'command',
        label: 'Decide the deferrals',
        payload: `/bmad-correct-course -- story ${story.key} is done with ${owed.length} open deferral(s)`,
      },
    })
  }

  return { gaps, unverifiable }
}

/**
 * **B3 -- review patches never applied.** A story is `done` while unticked
 * `[Review][Patch]` checkboxes remain in its file. Those are findings a review
 * triaged into work and nobody did.
 *
 * This began as a loose proxy for "a stage was skipped" and inspection made it a
 * rule: story 1-5 in the reference repo carries exactly two, while story 3-2 has
 * 53 checkboxes and none unticked. So the tag is the signal -- not unticked boxes
 * in general, which would flag every optional task anyone ever skipped.
 *
 * @param {object} model - the model from `buildModel`.
 * @param {(path: string) => string|null|undefined} readStory - story-file text,
 *   `null` when the file is known unreadable, `undefined` when not fetched.
 * @returns {{gaps: Gap[], unverifiable: Unverifiable[]}}
 */
export function detectReviewPatches(model, readStory) {
  const gaps = []
  const unverifiable = []
  const PATTERN = /^\s*- \[ \]\s*\[Review\]\[Patch\]\s*(.*)$/

  for (const story of model.stories) {
    if (story.status !== 'done') continue
    if (story.file === null) {
      unverifiable.push({
        id: 'B3',
        subject: story.key,
        reason: 'no story file resolves for this key, so its review state cannot be read',
        action: {
          kind: 'prompt',
          label: 'Find the missing story file',
          payload:
            `/bmad-sprint-planning -- story ${story.key} is marked done but no story file resolves for it under the ` +
            'declared story_location. Find out whether the file was never created, was renamed, ' +
            'or lives elsewhere, and tell me which.',
        },
      })
      continue
    }

    const text = readStory(story.file)
    if (text === null || text === undefined) {
      unverifiable.push({
        id: 'B3',
        subject: story.key,
        reason: `${story.file} could not be read`,
        action: {
          kind: 'prompt',
          label: 'Investigate the unreadable story file',
          payload:
            `/bmad-sprint-planning -- I cannot read ${story.file} (story ${story.key}, marked done), so I cannot tell ` +
            'whether its review findings were applied. Find out why it is unreadable and what ' +
            'its review state actually is.',
        },
      })
      continue
    }

    const pending = text
      .split('\n')
      .map((line) => PATTERN.exec(line))
      .filter((m) => m !== null)
      .map((m) => m[1].replace(/\s*\[[^\]]*\]\s*$/, '').trim())

    if (pending.length === 0) continue

    gaps.push({
      id: 'B3',
      title: 'review patches never applied',
      severity: 'high',
      subject: story.key,
      subjectKind: 'story',
      // Phrased like B1's: what was observed, in one sentence, without naming a
      // single item out of several. A slice of the first one read as a truncation
      // mid-word and told the reader less than the count does.
      evidence:
        `marked done, yet ${pending.length} unticked entr` +
        `${pending.length === 1 ? 'y' : 'ies'} in the spec`,
      action: {
        kind: 'command',
        label: 'Apply or reject the patches',
        payload:
          `/bmad-code-review -- ${pending.length} [Review][Patch] item(s) triaged on ` +
          `${story.key} were never applied`,
      },
    })
  }

  return { gaps, unverifiable }
}

/**
 * Run every detector and merge the results, worst first.
 *
 * @param {object} model - the model from `buildModel`.
 * @param {object} [files] - content the shell has already read.
 * @param {(path: string) => string|null|undefined} [files.readStory] - story-file reader.
 * @returns {{gaps: Gap[], unverifiable: Unverifiable[]}}
 */
export function detect(model, files = {}) {
  const readStory = files.readStory ?? (() => undefined)

  const results = [detectDoneButOwing(model), detectReviewPatches(model, readStory)]

  const gaps = results.flatMap((r) => r.gaps)
  const unverifiable = results.flatMap((r) => r.unverifiable)
  const rank = (s) => SEVERITY.indexOf(s)

  gaps.sort((a, b) => rank(a.severity) - rank(b.severity) || a.subject.localeCompare(b.subject))
  return { gaps, unverifiable }
}
