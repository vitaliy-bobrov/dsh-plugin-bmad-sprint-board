/**
 * BMAD v7 ticket frontmatter.
 *
 * Every v7 ticket -- initiative, epic and story plan -- opens with a `---`
 * fenced block of `key: value` lines. The schema is small but not exactly YAML:
 * values are single-quoted or double-quoted strings, bare scalars, booleans, and
 * indented `- item` lists (the `context:` a story plan carries). That subset is
 * what this reads; a full YAML parser would be a dependency the bundle does not
 * have.
 *
 * Unreadable lines are skipped, so a key the reader cannot parse is missing
 * rather than wrong.
 *
 * @module dsh-plugin-bmad-sprint-board/frontmatter
 */

/** A closing fence, which is the same three dashes as the opening one. */
const FENCE = /^---[ \t]*$/
/** `key: value`, with the value possibly empty. */
const SCALAR = /^([A-Za-z0-9_-]+):[ \t]*(.*)$/
/** An indented `- item` belonging to the key above it. */
const LIST_ITEM = /^[ \t]+-[ \t]+(.*)$/

/**
 * Read a bare scalar: a boolean, a number, or the text itself.
 *
 * @param {string} raw - the text after the colon.
 * @returns {string} the unquoted value.
 */
function scalar(raw) {
  const text = raw.trim()
  if (text.length >= 2 && text.startsWith("'") && text.endsWith("'")) {
    return text.slice(1, -1).replace(/''/g, "'")
  }
  if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
    return text.slice(1, -1).replace(/\\"/g, '"')
  }
  return text
}

/**
 * Split a document into its frontmatter and the rest.
 *
 * A file without a leading fence yields empty frontmatter and the whole text as
 * the body -- which is what an `archive-v6` file should produce.
 *
 * @param {string} text - the file contents.
 * @returns {{data: Map<string, string|string[]>, body: string}} the parsed keys and the remaining text.
 */
function bare(text) {
  if (text === 'true') return true
  if (text === 'false') return false
  if (/^[+-]?\d+$/.test(text)) return Number.parseInt(text, 10)
  if (/^[+-]?\d*\.\d+$/.test(text)) return Number.parseFloat(text)
  return text
}

export function readFrontmatter(text) {
  const lines = String(text).split('\n')
  const data = new Map()

  if (lines.length === 0 || !FENCE.test(lines[0].replace(/^\uFEFF/, ''))) {
    return { data, body: String(text) }
  }

  let end = lines.length
  for (let i = 1; i < lines.length; i += 1) {
    if (FENCE.test(lines[i])) {
      end = i
      break
    }
  }

  let openList = null
  for (let i = 1; i < end; i += 1) {
    const line = lines[i]
    if (line.trim() === '' || line.trim().startsWith('#')) continue

    const item = LIST_ITEM.exec(line)
    if (item !== null && openList !== null) {
      openList.push(scalar(item[1]))
      continue
    }

    const entry = SCALAR.exec(line)
    if (entry === null) continue
    const [, key, value] = entry

    if (value.trim() === '') {
      // An empty value may head either a list or a nested table. A list is what
      // BMAD writes here; a nested table is not used by any v7 ticket.
      openList = []
      data.set(key, openList)
      continue
    }
    openList = null
    const text = value.trim()
    const quoted = text.startsWith("'") || text.startsWith('"')
    data.set(key, quoted ? scalar(text) : bare(text))
  }

  // A key that opened a list and never received an item holds no information.
  for (const [key, value] of data) {
    if (Array.isArray(value) && value.length === 0) data.delete(key)
  }

  return { data, body: lines.slice(end + 1).join('\n') }
}

/**
 * Read a string key, falling back to `null`.
 *
 * @param {Map<string, *>} data - from {@link readFrontmatter}.
 * @param {string} key - the key to read.
 * @returns {string|null} the value, or null when absent or not a string.
 */
export function stringOf(data, key) {
  const value = data.get(key)
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

/**
 * Read a list key, falling back to an empty list.
 *
 * @param {Map<string, *>} data - from {@link readFrontmatter}.
 * @param {string} key - the key to read.
 * @returns {string[]} the items, or an empty list.
 */
export function listOf(data, key) {
  const value = data.get(key)
  return Array.isArray(value) ? value : []
}
