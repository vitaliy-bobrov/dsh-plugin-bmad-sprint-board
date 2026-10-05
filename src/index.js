/**
 * The core's public surface, for Node consumers: tests today, a second shell
 * or an agent tool later.
 *
 * @module @local/dsh-plugin-bmad-sprint-board/core
 */
export * from './core.js'
export * from './config.js'
export { detect, detectDoneButOwing, detectReviewPatches, SEVERITY } from './detect.js'
export { parseFrCoverage, requirementBar, nextAction, bars } from './plan.js'
export { analyse } from './analyse.js'
export * from './ux.js'
export * from './ux.js'
