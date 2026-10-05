/**
 * UX evidence: whether the design artefacts and the UX requirements are tied to
 * anything that can verify them.
 *
 * UX is a core requirement class (11 `UX-DR` entries on the reference project),
 * and it produces its own artefacts under `planning-artifacts/ux-designs/`. Both
 * halves can come adrift: a design run nothing downstream claims is a document
 * nobody reads, and a UX requirement no artefact names is one nothing can close.
 * Neither shows up as a gap anywhere else, because the coverage map is
 * functional-only.
 *
 * @module dsh-plugin-bmad-sprint-board/ux
 */

/** The directory UX runs live in, relative to the declared planning folder. */
export const UX_DIR = 'ux-designs'

/**
 * The UX design runs present, from a listing of the `ux-designs` directory.
 *
 * A run is a directory; the loose files beside them belong to no run.
 *
 * @param {Array<{type: string, name: string}>} entries - the directory listing.
 * @returns {Array<{name: string, file: string}>} the runs, in name order.
 */
export function parseUxRuns(entries) {
  return (entries ?? [])
    .filter((entry) => entry.type === 'directory')
    .map((entry) => ({ name: entry.name, file: `${UX_DIR}/${entry.name}` }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Which runs the epics document names as an input.
 *
 * The check is deliberately narrow: `epics.md` is the document that turns design
 * into work, so a run it does not cite is a run the plan does not carry forward.
 * That is a weaker claim than "nothing cites it" and a checkable one, which
 * matters more.
 *
 * @param {Array<{name: string, file: string}>} runs - from {@link parseUxRuns}.
 * @param {string} epicsText - the contents of the epics document.
 * @returns {Array<{name: string, file: string, claimed: boolean}>} the runs, marked.
 */
export function linkUxRuns(runs, epicsText) {
  const text = epicsText ?? ''
  return runs.map((run) => ({ ...run, claimed: text.includes(run.name) }))
}

/**
 * **U1: a UX design run the plan does not carry.**
 *
 * Fires when the epics document names no such run. It is an orphan in the
 * ordinary sense: produced, and then not built on.
 *
 * @param {Array<{name: string, file: string}>} runs - from {@link parseUxRuns}.
 * @param {string} epicsText - the contents of the epics document.
 * @returns {{gaps: object[], unverifiable: object[]}}
 */
export function detectUxRuns(runs, epicsText) {
  const gaps = []
  const unverifiable = []

  if (runs.length === 0) {
    // No runs at all is only worth saying when the inventory asks for UX work.
    return { gaps, unverifiable }
  }
  if ((epicsText ?? '').trim() === '') {
    unverifiable.push({
      id: 'U1',
      subject: `${runs.length} UX design run${runs.length === 1 ? '' : 's'}`,
      reason: 'the epics document could not be read, so no run can be checked against the plan',
      action: {
        kind: 'prompt',
        label: 'Find the epics document',
        payload:
          '/bmad-correct-course -- the UX design runs exist but the epics document could not be read, so I cannot tell ' +
          'which of them the plan carries forward. Find out whether epics.md moved, and where.',
      },
    })
    return { gaps, unverifiable }
  }

  for (const run of linkUxRuns(runs, epicsText)) {
    if (run.claimed) continue
    gaps.push({
      id: 'U1',
      title: 'UX run not carried into the plan',
      severity: 'medium',
      subject: run.name,
      subjectKind: 'area',
      evidence: 'the epics document names no input from this UX design run',
      action: {
        kind: 'prompt',
        label: 'Ask whether it still applies',
        payload:
          `/bmad-correct-course -- the UX design run ${run.name} exists, and the epics document declares inputs from ` +
          'no part of it. Tell me whether its decisions are already covered elsewhere, whether ' +
          'it should feed the plan, or whether it is superseded and can be retired.',
      },
    })
  }

  return { gaps, unverifiable }
}

/**
 * Component identifiers a piece of prose names.
 *
 * A UX requirement describes components by name -- `ValueField`,
 * `SeriesRowControls` -- and story files name the same components because they
 * build them. That shared vocabulary is the only join between a design
 * requirement and the epic that delivers it: the ids are never cross-referenced.
 *
 * The shape matters. A capitalised word is usually just a sentence starting, so
 * the filter takes PascalCase with an internal capital: `ValueField` qualifies,
 * `Component` and `HTML` do not. Without it, "Error" links to nineteen stories
 * and every requirement appears covered.
 *
 * @param {string} text - prose to scan.
 * @returns {string[]} the identifiers, sorted.
 */
export function componentNames(text) {
  const words = String(text ?? '').match(/\b[A-Z][a-z0-9]+(?:[A-Z][A-Za-z0-9]*)+\b/g) ?? []
  return [...new Set(words)].sort()
}

/**
 * Which stories and epics carry each UX requirement.
 *
 * The link is derived, never declared: a requirement names components, a story
 * names the same components, and the story knows its epic. It is a claim about
 * evidence, so the caller can see the components it rests on.
 *
 * @param {Map<string, {id: string, name: string}[]>} inventory - from `parseRequirementInventory`.
 * @param {Array<{key: string, epic: number, index: number, title: string, file: string|null}>} stories - the model's stories.
 * @param {Map<string, string>} storyText - story path to contents.
 * @returns {Map<string, {components: string[], stories: string[], epics: number[]}>} keyed by requirement id.
 */
export function linkUxToEpics(inventory, stories, storyText) {
  const links = new Map()
  const byFile = new Map(stories.map((story) => [story.file, story]))

  for (const item of inventory?.get('UX-DR') ?? []) {
    const components = componentNames(item.text ?? item.name)
    const hits = new Map()

    for (const [file, text] of storyText ?? []) {
      const story = byFile.get(file)
      if (story === undefined) continue
      for (const component of components) {
        if (!new RegExp(`\\b${component}\\b`).test(text)) continue
        if (!hits.has(story.key)) hits.set(story.key, { story, components: new Set() })
        hits.get(story.key).components.add(component)
      }
    }

    const matched = [...hits.values()]
    links.set(item.id, {
      components,
      stories: matched.map((hit) => hit.story.key),
      epics: [...new Set(matched.map((hit) => hit.story.epic))].sort((a, b) => a - b),
    })
  }

  return links
}

/**
 * **U2: a UX requirement nothing names.**
 *
 * Fires when no story file cites the requirement id. The reference project names
 * all 11 of its `UX-DR` entries exclusively in two retrospective documents, so
 * the work they describe is delivered without any story claiming it.
 *
 * @param {Map<string, {id: string, name: string}[]>} inventory - from `parseRequirementInventory`.
 * @param {string[]} storyTexts - the text of every story file the shell has read.
 * @returns {{gaps: object[], unverifiable: object[]}}
 */
export function detectUxRequirements(inventory, stories, storyText) {
  const items = inventory?.get('UX-DR') ?? []
  if (items.length === 0) return { gaps: [], unverifiable: [] }

  if ((storyText?.size ?? 0) === 0) {
    return {
      gaps: [],
      unverifiable: [
        {
          id: 'U2',
          subject: `${items.length} UX design requirements`,
          reason: 'no story file was readable, so none can be checked for the work it describes',
          action: {
            kind: 'prompt',
            label: 'Ask which stories carry the UX work',
            payload:
              `/bmad-correct-course -- the inventory declares ${items.length} UX design requirements and I could read ` +
              'no story file, so I cannot tell which of them any story carries. Find out which ' +
              'stories carry this work.',
          },
        },
      ],
    }
  }

  const links = linkUxToEpics(inventory, stories, storyText)
  const unlinked = items.filter((item) => (links.get(item.id)?.epics.length ?? 0) === 0)
  if (unlinked.length === 0) return { gaps: [], unverifiable: [] }

  return {
    gaps: [
      {
        id: 'U2',
        title: 'UX requirement no epic delivers',
        severity: 'high',
        subject: `${unlinked.length} of ${items.length} UX design requirements`,
        subjectKind: 'requirement',
        evidence:
          'no story names the components ' +
          `${unlinked.map((item) => item.id).join(', ')} describe`,
        action: {
          kind: 'prompt',
          label: 'Ask where this UX work went',
          payload:
            `/bmad-correct-course -- ${unlinked.length} of ${items.length} UX design requirements name components that no ` +
            `story mentions: ${unlinked
              .map((item) => `${item.id} (${componentNames(item.text ?? item.name).join(', ') || item.name})`)
              .join('; ')}. Tell me for each whether the work shipped under another name, was ` +
            'dropped, or still needs an epic.',
        },
      },
    ],
    unverifiable: [],
  }
}
