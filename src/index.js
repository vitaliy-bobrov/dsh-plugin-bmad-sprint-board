/**
 * The core's public surface, for Node consumers: the tests today, and any
 * second reader later.
 *
 * The shell does not go through this file -- `build.mjs` inlines the same
 * modules into the client bundle -- so this is purely the Node-facing door.
 *
 * @module dsh-plugin-bmad-sprint-board/core
 */

export { mergeLayers, parseToml, pick } from './toml.js'
export { listOf, readFrontmatter, stringOf } from './frontmatter.js'
export { CONFIG_LAYERS, detectedVersion, resolveConfig, resolveProjectPath } from './config.js'
export { PLAN_SUFFIX, linkPlans, readEpicIndex, readPlan, readStoryIndex, slugify } from './store.js'
export {
  KNOWN_STATUS,
  SETTLED,
  STATUS_ORDER,
  buildInitiative,
  readEpicTicket,
  readInitiativeTicket,
  statusLanes,
  ticketStatus,
} from './model.js'
export { SEVERITY, detectEmptyInitiative, detectInitiative } from './detect.js'
export { INITIATIVE_PREFIX, READ_CONCURRENCY, join, mapLimit, scanProject } from './scan.js'
