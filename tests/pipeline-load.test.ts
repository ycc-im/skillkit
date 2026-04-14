import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { load } from '../src/pipeline/load.js'
import type { SkillManifest, SkillDefinition } from '../src/types/skill.js'

const fixtures = path.resolve(import.meta.dirname, 'fixtures')

const makeManifest = (
  name: string,
  fileName: string,
): SkillManifest =>
  Object.freeze({
    name,
    description: `Manifest for ${name}`,
    tags: [],
    priority: 50,
    sourcePath: path.resolve(fixtures, fileName),
  })

describe('load', () => {
  it('loads a single manifest into definition', async () => {
    const manifests = [makeManifest('basic-skill', 'basic-skill.md')]
    const result = await load(manifests)

    expect(result.definitions).toHaveLength(1)
    expect(result.definitions[0]!.metadata.name).toBe('basic-skill')
    expect(result.errors).toHaveLength(0)
  })

  it('loads multiple manifests', async () => {
    const manifests = [
      makeManifest('basic-skill', 'basic-skill.md'),
      makeManifest('conditional-test', 'conditional-skill.md'),
    ]
    const result = await load(manifests)

    expect(result.definitions).toHaveLength(2)
    expect(result.loaded.size).toBe(2)
    expect(result.loaded.has('basic-skill')).toBe(true)
    expect(result.loaded.has('conditional-test')).toBe(true)
  })

  it('skips already loaded skills using pre-populated loaded Map', async () => {
    const existing: SkillDefinition = Object.freeze({
      metadata: Object.freeze({
        name: 'basic-skill',
        description: 'Already loaded',
        tags: [],
      }),
      instructions: Object.freeze({ always: 'existing' }),
      sourcePath: '/fake/path.md',
    })
    const loadedMap = new Map<string, SkillDefinition>([['basic-skill', existing]])

    const manifests = [makeManifest('basic-skill', 'basic-skill.md')]
    const result = await load(manifests, loadedMap)

    expect(result.definitions).toHaveLength(0)
    expect(result.loaded.get('basic-skill')).toBe(existing)
    expect(result.errors).toHaveLength(0)
  })

  it('collects errors for invalid manifests', async () => {
    const manifests = [makeManifest('missing-name', 'missing-name.md')]
    const result = await load(manifests)

    expect(result.definitions).toHaveLength(0)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]!.manifest.name).toBe('missing-name')
    expect(result.errors[0]!.error.message).toBeDefined()
  })

  it('handles mixed valid and invalid manifests with partial success', async () => {
    const manifests = [
      makeManifest('basic-skill', 'basic-skill.md'),
      makeManifest('missing-name', 'missing-name.md'),
      makeManifest('conditional-test', 'conditional-skill.md'),
    ]
    const result = await load(manifests)

    expect(result.definitions).toHaveLength(2)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]!.manifest.name).toBe('missing-name')
    expect(result.loaded.size).toBe(2)
  })

  it('updates loaded map with new definitions', async () => {
    const manifests = [makeManifest('basic-skill', 'basic-skill.md')]
    const result = await load(manifests)

    expect(result.loaded.get('basic-skill')).toBeDefined()
    expect(result.loaded.get('basic-skill')!.metadata.name).toBe('basic-skill')
  })

  it('preserves existing entries in loaded map', async () => {
    const existing: SkillDefinition = Object.freeze({
      metadata: Object.freeze({
        name: 'existing-skill',
        description: 'Already there',
        tags: [],
      }),
      instructions: Object.freeze({ always: 'do stuff' }),
      sourcePath: '/fake/existing.md',
    })
    const loadedMap = new Map<string, SkillDefinition>([['existing-skill', existing]])

    const manifests = [makeManifest('basic-skill', 'basic-skill.md')]
    const result = await load(manifests, loadedMap)

    expect(result.loaded.get('existing-skill')).toBe(existing)
    expect(result.loaded.get('basic-skill')).toBeDefined()
    expect(result.loaded.size).toBe(2)
  })

  it('returns frozen result', async () => {
    const manifests = [makeManifest('basic-skill', 'basic-skill.md')]
    const result = await load(manifests)

    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.definitions)).toBe(true)
    expect(Object.isFrozen(result.errors)).toBe(true)
  })

  it('does not mutate the input loaded map', async () => {
    const loadedMap = new Map<string, SkillDefinition>()
    const manifests = [makeManifest('basic-skill', 'basic-skill.md')]

    await load(manifests, loadedMap)

    expect(loadedMap.size).toBe(0)
  })
})
