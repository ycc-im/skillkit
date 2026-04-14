import { describe, it, expect } from 'vitest'
import { runPipeline } from '../src/pipeline/index.js'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import type { SkillDefinition } from '../src/types/skill.js'

const fixturesDir = path.resolve(import.meta.dirname, 'fixtures')

describe('runPipeline', () => {
  it('runs full pipeline: scan -> route -> load -> inject', async () => {
    const result = await runPipeline(
      [path.join(fixturesDir, 'multi-skill-dir')],
      'skill-a',
    )
    expect(result.definitions.length).toBeGreaterThanOrEqual(1)
    expect(result.text).toContain('skill-a')
    expect(result.loaded.has('skill-a')).toBe(true)
  })

  it('returns empty text when no skills match', async () => {
    const result = await runPipeline(
      [path.join(fixturesDir, 'multi-skill-dir')],
      'completely unrelated topic xyz123',
    )
    expect(result.definitions.length).toBe(0)
    expect(result.text).toBe('')
  })

  it('preserves loaded state across calls', async () => {
    const first = await runPipeline(
      [path.join(fixturesDir, 'multi-skill-dir')],
      'skill-a',
    )
    const second = await runPipeline(
      [path.join(fixturesDir, 'multi-skill-dir')],
      'skill-b',
      first.loaded,
    )
    expect(second.loaded.has('skill-a')).toBe(true)
    expect(second.loaded.has('skill-b')).toBe(true)
  })

  it('throws error for non-existent directory', async () => {
    await expect(runPipeline(['/nonexistent/xyz'], 'test')).rejects.toThrow()
  })

  it('end-to-end with full-skill fixture', async () => {
    const result = await runPipeline([fixturesDir], 'verify-security')
    expect(result.definitions.length).toBeGreaterThanOrEqual(1)
    const secSkill = result.definitions.find(d => d.metadata.name === 'verify-security')
    if (secSkill) {
      expect(secSkill.metadata.tags).toContain('security')
      expect(result.text).toContain('verify-security')
    }
  })
})
