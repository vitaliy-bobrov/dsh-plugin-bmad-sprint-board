/**
 * BMAD v7 configuration -- where output lives, and which initiative is in use.
 *
 * v7 replaced the per-module artefact declarations with two central keys:
 * `core.output_folder` and `core.active_initiative`. BMAD resolves them by
 * merging three TOML layers lowest priority first --
 *
 *   _bmad/config.toml
 *   _bmad/custom/config.toml        team overrides, committed
 *   _bmad/custom/config.user.toml   personal overrides, usually not committed
 *
 * -- which is exactly what `_bmad/scripts/resolve_config.py` does. This mirrors
 * that merge so the board agrees with the tooling rather than guessing at a
 * layout.
 *
 * @module dsh-plugin-bmad-sprint-board/config
 */

import { mergeLayers, parseToml, pick } from './toml.js'

/** The token BMAD writes where the project root belongs. */
const PROJECT_ROOT = /\{project-root\}\/?/g

/** The three layers, in merge order. */
export const CONFIG_LAYERS = [
  '_bmad/config.toml',
  '_bmad/custom/config.toml',
  '_bmad/custom/config.user.toml',
]

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
 * Merge the config layers and read the two keys the board needs.
 *
 * @param {Array<string|null>} texts - the contents of {@link CONFIG_LAYERS}, in order; null when a file is absent.
 * @returns {{outputFolder: string|null, activeInitiative: string|null, layers: number}} the resolved settings.
 */
export function resolveConfig(texts) {
  const layers = []
  let seen = 0
  for (const text of texts) {
    if (typeof text !== 'string') continue
    layers.push(parseToml(text))
    seen += 1
  }
  const merged = mergeLayers(layers)

  const folder = pick(merged, 'core.output_folder')
  const active = pick(merged, 'core.active_initiative')

  return {
    outputFolder: typeof folder === 'string' && folder !== '' ? resolveProjectPath(folder) : null,
    activeInitiative: typeof active === 'string' && active !== '' ? active.replace(/\/+$/, '') : null,
    layers: seen,
  }
}

/**
 * Recognise a BMAD installation and which major version it is.
 *
 * The two versions keep different central state: v7 declares `core.output_folder`
 * and work lives in `initiative-*` folders, while v6 declared per-module artefact
 * paths and tracked work in `sprint-status.yaml`. The board supports v7 only, so
 * telling a v6 project what it is beats rendering a v7 board over v6 files and
 * showing an empty one.
 *
 * @param {{config: {outputFolder: string|null}, hasSprintStatus: boolean, initiatives: number}} probe - what was found on disk.
 * @returns {'v7'|'v6'|'none'} the detected version.
 */
export function detectedVersion(probe) {
  if (probe.config.outputFolder !== null && probe.initiatives > 0) return 'v7'
  if (probe.hasSprintStatus) return 'v6'
  if (probe.config.outputFolder !== null) return 'v7'
  return 'none'
}
