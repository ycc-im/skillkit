import { describe, it, expect, afterAll } from 'vitest'
import { checkPrerequisites } from '../src/utils/prerequisite.js'
import type { SkillPrerequisites } from '../src/types/skill.js'

describe('checkPrerequisites', () => {
  it('returns ok for empty prerequisites', async () => {
    const result = await checkPrerequisites({})
    expect(result.ok).toBe(true)
    expect(result.error).toEqual([])
  })

  it('returns ok when env var is present', async () => {
    process.env.__TEST_SKILKIT_VAR__ = 'hello'
    const prereqs: SkillPrerequisites = {
      env: ['__TEST_SKILKIT_VAR__'],
    }
    const result = await checkPrerequisites(prereqs)
    expect(result.ok).toBe(true)
    delete process.env.__TEST_SKILKIT_VAR__
  })

  it('returns error when env var is missing', async () => {
    delete process.env.__TEST_SKILKIT_MISSING__
    const prereqs: SkillPrerequisites = {
      env: ['__TEST_SKILKIT_MISSING__'],
    }
    const result = await checkPrerequisites(prereqs)
    expect(result.ok).toBe(false)
    expect(result.error.length).toBe(1)
    expect(result.error[0]).toContain('__TEST_SKILKIT_MISSING__')
  })

  it('returns ok when file exists', async () => {
    const prereqs: SkillPrerequisites = {
      fileExists: ['package.json'],
    }
    const result = await checkPrerequisites(prereqs)
    expect(result.ok).toBe(true)
  })

  it('returns error when file is missing', async () => {
    const prereqs: SkillPrerequisites = {
      fileExists: ['nonexistent-file-xyz.txt'],
    }
    const result = await checkPrerequisites(prereqs)
    expect(result.ok).toBe(false)
    expect(result.error.length).toBe(1)
    expect(result.error[0]).toContain('nonexistent-file-xyz.txt')
  })

  it('returns ok when tool check succeeds', async () => {
    const prereqs: SkillPrerequisites = {
      tools: [
        { name: 'node', command: 'node', check: 'node --version', hint: 'install node' },
      ],
    }
    const result = await checkPrerequisites(prereqs)
    expect(result.ok).toBe(true)
  })

  it('returns error when tool check fails', async () => {
    const prereqs: SkillPrerequisites = {
      tools: [
        { name: 'fake-tool', command: 'fake-tool-xyz-abc', check: 'fake-tool-xyz-abc --version', hint: 'install fake-tool' },
      ],
    }
    const result = await checkPrerequisites(prereqs)
    expect(result.ok).toBe(false)
    expect(result.error.length).toBe(1)
    expect(result.error[0]).toContain('fake-tool')
  })

  it('collects all errors from combined checks', async () => {
    delete process.env.__TEST_SKILKIT_COMBINED__
    const prereqs: SkillPrerequisites = {
      env: ['__TEST_SKILKIT_COMBINED__'],
      fileExists: ['nonexistent-combined.txt'],
      tools: [
        { name: 'fake-combined', command: 'fake-combined', check: 'fake-combined --version', hint: 'install' },
      ],
    }
    const result = await checkPrerequisites(prereqs)
    expect(result.ok).toBe(false)
    expect(result.error.length).toBe(3)
  })

  it('returns ok for undefined prerequisite sections', async () => {
    const prereqs: SkillPrerequisites = {
      env: undefined,
      fileExists: undefined,
      tools: undefined,
      dependencies: undefined,
    }
    const result = await checkPrerequisites(prereqs)
    expect(result.ok).toBe(true)
  })

  it('handles multiple missing env vars', async () => {
    delete process.env.__TEST_VAR_A__
    delete process.env.__TEST_VAR_B__
    const prereqs: SkillPrerequisites = {
      env: ['__TEST_VAR_A__', '__TEST_VAR_B__'],
    }
    const result = await checkPrerequisites(prereqs)
    expect(result.ok).toBe(false)
    expect(result.error.length).toBe(2)
  })
})
