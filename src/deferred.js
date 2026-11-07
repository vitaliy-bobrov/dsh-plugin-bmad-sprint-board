/**
 * The deferred-work ledger.
 *
 * BMAD records work it decided not to do now in `deferred-work.md`, one section
 * per source:
 *
 *   ## Deferred from: <what deferred it> (<date>)
 *
 *   - one entry
 *   - another entry
 *
 * That is the whole format. A section's heading is the provenance and its
 * bullets are the entries, which is why this reader keeps the two together
 * rather than flattening to a list: "deferred" without "deferred from what" is
 * a note nobody can act on.
 *
 * A file laid out any other way yields nothing rather than a guess, so a ledger
 * this cannot read shows as absent instead of as empty.
 *
 * @module dsh-plugin-bmad-sprint-board/deferred
 */

/** The heading that opens a section, with an optional `(YYYY-MM-DD)` at the end. */
const SECTION = /^##[ \t]+Deferred from:[ \t]*(.*?)[ \t]*$/
/** A bullet, indented or not; the entry is everything after the marker. */
const BULLET = /^[ \t]*[-*][ \t]+(.*)$/
/** A trailing date in parentheses. */
const DATE = /\((\d{4}-\d{2}-\d{2})\)[ \t]*$/

/**
 * Parse a deferred-work ledger.
 *
 * @param {string|null} text - the file's contents, or null when it is absent.
 * @returns {{sections: Array<{source: string, date: string|null, items: string[]}>, count: number}} the sections and how many entries they hold.
 */
export function parseDeferred(text) {
  if (typeof text !== 'string') return { sections: [], count: 0 }

  const sections = []
  let current = null

  for (const line of text.split('\n')) {
    const heading = SECTION.exec(line)
    if (heading !== null) {
      const raw = heading[1]
      const dated = DATE.exec(raw)
      current = {
        source: dated === null ? raw : raw.slice(0, dated.index).trim(),
        date: dated === null ? null : dated[1],
        items: [],
      }
      sections.push(current)
      continue
    }
    if (/^##[ \t]/.test(line)) {
      // a different section ends the deferred block
      current = null
      continue
    }
    const bullet = BULLET.exec(line)
    if (bullet === null || current === null) continue
    const item = bullet[1].trim()
    if (item !== '') current.items.push(item)
  }

  const counted = sections.filter((section) => section.items.length > 0)
  return {
    sections: counted,
    count: counted.reduce((total, section) => total + section.items.length, 0),
  }
}

/**
 * The workspace path of an initiative's ledger.
 *
 * @param {string} initiativeDir - the initiative's folder.
 * @returns {string} the path to try.
 */
export function deferredPath(initiativeDir) {
  return `${initiativeDir}/deferred-work.md`
}
