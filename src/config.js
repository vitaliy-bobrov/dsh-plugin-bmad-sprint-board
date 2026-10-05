/**
 * BMAD configuration -- where the modules say their artefacts live.
 *
 * BMAD lets a project move its output folders, so a board that assumes a layout
 * is wrong the moment someone changes one. `_bmad/config.toml` declares the real
 * paths per module, and that declaration is the primary mechanism: the
 * conventional-candidate probe and the bounded scan stay, but only as the
 * fallback for when config is absent or silent.
 *
 * @module @local/dsh-plugin-bmad-sprint-board/config
 */

/** The token BMAD writes where the project root belongs. */
const PROJECT_ROOT = /\{project-root\}\/?/g

/**
 * Reduce a config value to a workspace-relative path.
 *
 * The shell reads through the workspace API, which resolves relative paths
 * against the Session's selected workspace -- so `{project-root}` maps to the
 * empty string and the remainder is relative.
 *
 * @param {string} value - the raw config value.
 * @returns {string} the workspace-relative path.
 */
export function resolveProjectPath(value) {
  return String(value).replace(PROJECT_ROOT, '').replace(/^\.?\//, '').replace(/\/+$/, '')
}

/**
 * Parse the module sections of a `config.toml`.
 *
 * A deliberately small reader, not a TOML implementation: BMAD's config is flat
 * `[modules.<name>]` tables of string values, and a full parser would be a
 * dependency the bundle does not have. Anything it cannot understand it skips --
 * a path it fails to read becomes a missing declaration, never a wrong one.
 *
 * @param {string} text - the contents of `_bmad/config.toml`.
 * @returns {Map<string, Map<string, string>>} module name -> key -> value.
 */
export function parseBmadConfig(text) {
  const modules = new Map()
  let current = null

  for (const raw of String(text).split('\n')) {
    const line = raw.replace(/#.*$/, '').trim()
    if (line === '') continue

    const section = /^\[modules\.([A-Za-z0-9_-]+)\]$/.exec(line)
    if (section !== null) {
      current = new Map()
      modules.set(section[1], current)
      continue
    }
    if (/^\[/.test(line)) {
      current = null
      continue
    }
    if (current === null) continue

    const entry = /^([A-Za-z0-9_-]+)\s*=\s*"([^"]*)"$/.exec(line)
    if (entry !== null) current.set(entry[1], entry[2])
  }

  return modules
}

/**
 * The artefact locations the board reads, in the order it needs them.
 *
 * @param {Map<string, Map<string, string>>} modules - from {@link parseBmadConfig}.
 * @returns {{implementation: string|null, planning: string|null, knowledge: string|null}} workspace-relative paths, or null when undeclared.
 */
export function artifactPaths(modules) {
  const bmm = modules.get('bmm') ?? new Map()
  const pick = (key) => {
    const value = bmm.get(key)
    return value === undefined || value === '' ? null : resolveProjectPath(value)
  }
  return {
    implementation: pick('implementation_artifacts'),
    planning: pick('planning_artifacts'),
    knowledge: pick('project_knowledge'),
  }
}
