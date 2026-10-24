/**
 * A small TOML reader, sized for what BMAD actually writes.
 *
 * Not a TOML implementation. It reads the shape BMAD's own files take:
 * `[table]` headers, `[[array-of-table]]` headers, and scalar `key = value`
 * pairs holding strings, numbers or booleans. That is what `_bmad/config.toml`,
 * `_bmad/custom/config.toml`, `config.user.toml` and every `tickets.toml`
 * contain, and pulling in a parser library would be a dependency this bundle
 * does not have.
 *
 * The failure mode is chosen deliberately: anything it cannot understand is
 * skipped, so an unreadable file becomes a missing value and never a wrong one.
 *
 * @module dsh-plugin-bmad-sprint-board/toml
 */

/** A basic string (`"..."`) with the escapes TOML defines for the common cases. */
const BASIC = /^"((?:[^"\\]|\\.)*)"/;
/** A literal string (`'...'`), where backslashes are ordinary characters. */
const LITERAL = /^'([^']*)'/;
/** What left of a value once the key and `=` are consumed. */
const ASSIGNMENT = /^([A-Za-z0-9_"'.-]+)\s*=\s*(.*)$/;

/**
 * Strip a trailing comment without touching a `#` inside a quoted string.
 *
 * A line is scanned once so that `title = "a # b"` keeps its hash and
 * `id = 1 # note` loses its note.
 *
 * @param {string} line - one raw line.
 * @returns {string} the line with any trailing comment removed.
 */
function stripComment(line) {
  let quote = ''
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (quote !== '') {
      if (ch === '\\' && quote === '"') {
        i += 1
      } else if (ch === quote) {
        quote = ''
      }
    } else if (ch === '"' || ch === "'") {
      quote = ch
    } else if (ch === '#') {
      return line.slice(0, i)
    }
  }
  return line
}

/**
 * Decode a scalar value.
 *
 * Only the types that appear in BMAD files are recognised: strings, booleans,
 * integers and floats. An array or inline table returns `undefined`, which the
 * caller records as "present but unreadable" rather than guessing.
 *
 * @param {string} raw - the text after `=`.
 * @returns {string|number|boolean|undefined} the value, or undefined if unrecognised.
 */
function decode(raw) {
  const text = raw.trim()
  if (text === 'true') return true
  if (text === 'false') return false

  const basic = BASIC.exec(text)
  if (basic !== null) {
    return basic[1].replace(/\\(["\\])/g, '$1').replace(/\\n/g, '\n').replace(/\\t/g, '\t')
  }
  const literal = LITERAL.exec(text)
  if (literal !== null) return literal[1]

  if (/^[+-]?\d+$/.test(text)) return Number.parseInt(text, 10)
  if (/^[+-]?\d*\.\d+$/.test(text)) return Number.parseFloat(text)
  return undefined
}

/**
 * Read a dotted table path into an object, creating tables as needed.
 *
 * @param {object} root - the document being built.
 * @param {string} path - a dotted path such as `core` or `modules.tea`.
 * @returns {object} the table at that path.
 */
function tableAt(root, path) {
  let node = root
  for (const part of path.split('.')) {
    const key = part.trim().replace(/^["']|["']$/g, '')
    if (typeof node[key] !== 'object' || node[key] === null || Array.isArray(node[key])) {
      node[key] = {}
    }
    node = node[key]
  }
  return node
}

/**
 * Parse a TOML document.
 *
 * @param {string} text - the file contents.
 * @returns {object} the parsed document; unreadable lines are omitted.
 */
export function parseToml(text) {
  const root = {}
  let current = root

  for (const raw of String(text).split('\n')) {
    const line = stripComment(raw).trim()
    if (line === '') continue

    const arrayHeader = /^\[\[\s*([A-Za-z0-9_."'\s-]+?)\s*\]\]$/.exec(line)
    if (arrayHeader !== null) {
      const path = arrayHeader[1]
      const parts = path.split('.')
      const name = parts.pop().trim().replace(/^["']|["']$/g, '')
      const parent = parts.length === 0 ? root : tableAt(root, parts.join('.'))
      if (!Array.isArray(parent[name])) parent[name] = []
      const entry = {}
      parent[name].push(entry)
      current = entry
      continue
    }

    const header = /^\[\s*([A-Za-z0-9_."'\s-]+?)\s*\]$/.exec(line)
    if (header !== null) {
      current = tableAt(root, header[1])
      continue
    }

    const assignment = ASSIGNMENT.exec(line)
    if (assignment === null) continue
    const key = assignment[1].replace(/^["']|["']$/g, '')
    const value = decode(assignment[2])
    if (value === undefined) continue
    current[key] = value
  }

  return root
}

/**
 * Merge configuration layers the way BMAD does: tables deep-merge, later wins.
 *
 * BMAD's own merge also keys array-of-tables by identity and appends the rest.
 * That branch is deliberately not reproduced here, because the only values the
 * board reads are `core.output_folder` and `core.active_initiative`, both
 * scalars -- a layer that sets them replaces them, which is what this does.
 *
 * @param {object[]} layers - documents from {@link parseToml}, lowest priority first.
 * @returns {object} the merged document.
 */
export function mergeLayers(layers) {
  const merged = {}
  const merge = (base, override) => {
    const out = { ...base }
    for (const [key, value] of Object.entries(override)) {
      const existing = out[key]
      const bothTables =
        typeof existing === 'object' && existing !== null && !Array.isArray(existing)
        && typeof value === 'object' && value !== null && !Array.isArray(value)
      out[key] = bothTables ? merge(existing, value) : value
    }
    return out
  }
  for (const layer of layers) {
    if (typeof layer !== 'object' || layer === null) continue
    Object.assign(merged, merge(merged, layer))
  }
  return merged
}

/**
 * Read a dotted key out of a merged document.
 *
 * @param {object} doc - the merged document.
 * @param {string} key - a dotted path such as `core.output_folder`.
 * @returns {*} the value, or undefined when any segment is missing.
 */
export function pick(doc, key) {
  let node = doc
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null || Array.isArray(node)) return undefined
    node = node[part]
  }
  return node
}
