/**
 * Config tests. Run: node --test src/
 *
 * The config reader decides where the board looks, so a wrong answer here is a
 * wrong answer everywhere. It reads the real repository's config when present.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { parseBmadConfig, resolveProjectPath, artifactPaths } from './config.js'

const CONFIG = '/root/drunk-beaver-storefront/_bmad/config.toml'
const available = existsSync(CONFIG)

const FIXTURE = `# a comment
[core]
project_name = "demo"

[modules.bmm]
planning_artifacts = "{project-root}/_bmad-output/planning-artifacts"
implementation_artifacts = "{project-root}/_bmad-output/implementation-artifacts"
user_skill_level = "intermediate"

[modules.tea]
test_artifacts = "{project-root}/_bmad-output/test-artifacts"

[modules.cis]
visual_tools = "intermediate"
`

test('parseBmadConfig reads module tables and ignores everything else', () => {
  const m = parseBmadConfig(FIXTURE)
  assert.deepEqual([...m.keys()], ['bmm', 'tea', 'cis'])
  assert.equal(m.get('bmm').get('implementation_artifacts'), '{project-root}/_bmad-output/implementation-artifacts')
  assert.equal(m.get('bmm').get('project_name'), undefined, 'core is not a module table')
  assert.equal(m.get('cis').get('visual_tools'), 'intermediate')
})

test('parseBmadConfig survives a comment, a blank value and junk', () => {
  const m = parseBmadConfig('[modules.bmm]\nx = ""\ny = "v" # trailing\nnonsense\n\n[bad\n')
  assert.equal(m.get('bmm').get('x'), '')
  assert.equal(m.get('bmm').get('y'), 'v')
})

test('resolveProjectPath maps {project-root} to the workspace root', () => {
  assert.equal(resolveProjectPath('{project-root}/_bmad-output/docs'), '_bmad-output/docs')
  assert.equal(resolveProjectPath('{project-root}'), '')
  assert.equal(resolveProjectPath('_bmad-output/implementation-artifacts'), '_bmad-output/implementation-artifacts')
  assert.equal(resolveProjectPath('{project-root}/_bmad-output/docs/'), '_bmad-output/docs')
})

test('artifactPaths returns null for anything undeclared', () => {
  const paths = artifactPaths(parseBmadConfig(FIXTURE))
  assert.equal(paths.implementation, '_bmad-output/implementation-artifacts')
  assert.equal(paths.planning, '_bmad-output/planning-artifacts')
  assert.equal(paths.knowledge, null, 'bmm declares no project_knowledge here')

  assert.deepEqual(artifactPaths(new Map()), { implementation: null, planning: null, knowledge: null })
})

test('real workspace: config declares the three bmm locations', { skip: !available }, () => {
  const paths = artifactPaths(parseBmadConfig(readFileSync(CONFIG, 'utf8')))
  assert.equal(paths.implementation, '_bmad-output/implementation-artifacts')
  assert.equal(paths.planning, '_bmad-output/planning-artifacts')
  assert.equal(paths.knowledge, '_bmad-output/docs')

  // and the declarations are true on disk
  const root = '/root/drunk-beaver-storefront/'
  for (const p of [paths.implementation, paths.planning, paths.knowledge]) {
    assert.ok(existsSync(root + p), `${p} exists`)
  }
})
