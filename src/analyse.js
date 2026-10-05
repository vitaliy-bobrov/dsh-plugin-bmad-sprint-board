/**
 * The composed entry: read -> parse -> model -> detect -> gaps -> actions.
 *
 * Kept in its own module so the build can inline it: the shell needs the
 * function, not the module graph, and `build.mjs` strips the imports below
 * because every symbol is already in scope once the pieces are concatenated.
 *
 * @module @local/dsh-plugin-bmad-sprint-board/analyse
 */
import { buildModel } from './core.js'
import { detect } from './detect.js'
import { parseFrCoverage, parseRequirementInventory, requirementBar, nextAction, bars } from './plan.js'
import { detectUxRuns, detectUxRequirements, linkUxToEpics } from './ux.js'
import { requirementsView, standaloneView } from './requirements.js'
import {
  parseArchitectureDecisions,
  linkDecisionsToEpics,
  parseDeclaredInputs,
  artefactFamilies,
} from './planning.js'

/**
 * Everything the board renders, from content the shell has already read.
 *
 * One entry point on purpose: the pieces have an order -- parse, model, detect,
 * measure -- and a shell that reassembles them itself will eventually get the
 * order wrong.
 *
 * @param {object} input - the workspace content.
 * @param {string} input.sprintText - the tracking file's text.
 * @param {string} [input.deferredText] - the deferred ledger's text.
 * @param {Array<{type: string, name: string}>} [input.entries] - the story directory listing.
 * @param {string} input.sprintPath - the tracking file's path, for relative resolution.
 * @param {string} [input.epicsText] - `planning-artifacts/epics.md`, for the coverage map.
 * @param {(path: string) => string|null|undefined} [input.readStory] - story-file reader.
 * @param {Array<{type: string, name: string}>} [input.uxRuns] - the `ux-designs` listing.
 * @param {string[]} [input.storyTexts] - the text of every story file read, for citation checks.
 * @param {string} [input.spineText] - the architecture spine, for its decisions.
 * @param {Array<{type: string, name: string}>} [input.planningEntries] - the planning folder listing.
 * @param {string} [input.spineText] - the architecture spine, for its decisions.
 * @param {Array<{type: string, name: string}>} [input.planningEntries] - the planning folder listing.
 * @param {Array<{type: string, name: string}>} [input.uxRuns] - the `ux-designs` listing.
 * @param {string[]} [input.storyTexts] - the text of every story file read, for citation checks.
 * @param {string} [input.spineText] - the architecture spine, for its decisions.
 * @param {Array<{type: string, name: string}>} [input.planningEntries] - the planning folder listing.
 * @param {string} [input.spineText] - the architecture spine, for its decisions.
 * @param {Array<{type: string, name: string}>} [input.planningEntries] - the planning folder listing.
 * @param {string} [input.spineText] - the architecture spine, for its decisions.
 * @param {Array<{type: string, name: string}>} [input.planningEntries] - the planning folder listing.
 * @param {Array<{file: string, text: string}>} [input.standalone] - specs no tracking key claims.
 * @returns {{model: object, gaps: object[], unverifiable: object[], bars: object, next: object, requirements: object}}
 */
export function analyse(input) {
  const model = buildModel(
    input.sprintText,
    input.deferredText ?? '',
    input.entries ?? [],
    input.sprintPath,
  )

  const { gaps, unverifiable } = detect(model, { readStory: input.readStory })
  // UX is a core requirement class and carries its own artefacts, so it gets its
  // own detectors: a design run the plan does not carry, and a UX requirement no
  // story names. Neither appears in the functional coverage map.
  const uxRuns = detectUxRuns(input.uxRuns ?? [], input.epicsText ?? '')
  // Keyed by story path, because the link runs component -> story -> epic and
  // the epic only exists on the story record.
  const storyFiles = new Map(
    (input.storyFiles ?? []).map((entry) => [entry.file, entry.text]),
  )
  const decisions = parseArchitectureDecisions(input.spineText ?? '')
  const decisionLinks = linkDecisionsToEpics(decisions, model.stories, storyFiles)
  const uxRequirements = detectUxRequirements(
    parseRequirementInventory(input.epicsText ?? ''),
    model.stories,
    storyFiles,
  )
  const coverage = parseFrCoverage(input.epicsText ?? '')
  const inventory = parseRequirementInventory(input.epicsText ?? '')
  const requirements = requirementBar(coverage, model.epics, inventory)

  // The inventory holds more than the coverage map claims. Those requirements
  // are declared and unowned, so nothing can say whether they were delivered --
  // which is an unverifiable, not a silence.
  const unowned = []
  if (requirements.unmapped > 0) {
    const classes = requirements.unmappedByClass
      .map((group) => `${group.code} (${group.items.length})`)
      .join(', ')
    // One action, offered twice: as the card in the unverifiable lane and as the
    // badge's button under the requirements bar. Two copies would drift.
    requirements.unmappedAction = {
      kind: 'prompt',
      label: 'Ask why they are unmapped',
      payload:
        `/bmad-correct-course -- ${classes} are declared in epics.md but appear in no coverage map and are cited by ` +
        'no story. Tell me whether each was delivered anyway, and whether the coverage map ' +
        'should be extended or the requirements retired.',
    }
    unowned.push({
      id: 'REQ',
      subject: `${requirements.unmapped} requirements have no coverage map`,
      reason:
        `The inventory declares ${requirements.declared} requirements; the coverage map ` +
        `claims ${requirements.total}. ${classes} are inventoried but mapped to no epic, ` +
        'and no story cites them, so their delivery cannot be measured.',
      action: requirements.unmappedAction,
    })
  }

  return {
    model,
    standalone: standaloneView(input.standalone ?? []),
    decisionTitles: new Map(decisions.map((decision) => [decision.id, decision.title])),
    declaredInputs: parseDeclaredInputs(input.epicsText ?? ''),
    artefactFamilies: artefactFamilies(input.planningEntries ?? []),
    requirementView: requirementsView({
      epicsText: input.epicsText ?? '',
      coverage,
      epics: model.epics,
      stories: model.stories,
      // Keyed by sprint path, the way the model records a story's file.
      storyText: storyFiles,
      decisions: decisionLinks,
      decisionTitles: new Map(decisions.map((decision) => [decision.id, decision.title])),
      uxLinks: linkUxToEpics(
        parseRequirementInventory(input.epicsText ?? ''),
        model.stories,
        storyFiles,
      ),
    }),
    gaps: [...gaps, ...uxRuns.gaps, ...uxRequirements.gaps],
    unverifiable: [...unverifiable, ...unowned, ...uxRuns.unverifiable, ...uxRequirements.unverifiable],
    requirements,
    bars: bars(model, requirements),
    next: nextAction(model),
  }
}
