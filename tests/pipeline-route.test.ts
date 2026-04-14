import { describe, it, expect } from 'vitest'
import { route } from '../src/pipeline/route.js'
import type { SkillManifest } from '../src/types/skill.js'

const makeManifest = (
  overrides: Partial<SkillManifest> & { name: string },
): SkillManifest => ({
  description: '',
  tags: [],
  priority: 50,
  sourcePath: `/fake/${overrides.name}.md`,
  ...overrides,
})

describe('route', () => {
  it('matches by keyword in query against description/name', () => {
    const manifests = [
      makeManifest({ name: 'deploy', description: 'Deploy to cloud' }),
      makeManifest({ name: 'test', description: 'Run test suite' }),
    ]

    const result = route('deploy to cloud', manifests)
    expect(result).toHaveLength(1)
    expect(result[0]!.name).toBe('deploy')
  })

  it('matches by tag filter option', () => {
    const manifests = [
      makeManifest({ name: 'security', tags: ['security', 'audit'] }),
      makeManifest({ name: 'format', tags: ['style'] }),
    ]

    const result = route('irrelevant query', manifests, { tags: ['security'] })
    expect(result).toHaveLength(1)
    expect(result[0]!.name).toBe('security')
  })

  it('returns empty when nothing matches', () => {
    const manifests = [
      makeManifest({ name: 'deploy', description: 'Deploy stuff' }),
    ]

    const result = route('completely unrelated query', manifests)
    expect(result).toEqual([])
  })

  it('results sorted by priority (lowest first)', () => {
    const manifests = [
      makeManifest({ name: 'slow', description: 'slow skill', priority: 90 }),
      makeManifest({ name: 'fast', description: 'fast skill', priority: 10 }),
      makeManifest({ name: 'mid', description: 'mid skill', priority: 50 }),
    ]

    const result = route('skill', manifests)
    expect(result.map((m) => m.name)).toEqual(['fast', 'mid', 'slow'])
  })

  it('returns empty for empty manifests', () => {
    const result = route('anything', [])
    expect(result).toEqual([])
  })

  it('exclusive tag filtering keeps only highest priority skill with that tag', () => {
    const manifests = [
      makeManifest({
        name: 'sec-high',
        description: 'security',
        tags: ['security'],
        priority: 10,
      }),
      makeManifest({
        name: 'sec-low',
        description: 'security',
        tags: ['security'],
        priority: 80,
      }),
      makeManifest({
        name: 'audit',
        description: 'security audit',
        tags: ['audit'],
        priority: 5,
      }),
    ]

    const result = route('security', manifests, { exclusiveTag: 'security' })
    expect(result).toHaveLength(1)
    expect(result[0]!.name).toBe('sec-high')
  })
})
