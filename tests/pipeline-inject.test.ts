import { describe, it, expect } from 'vitest'
import { inject } from '../src/pipeline/inject.js'
import type { SkillDefinition } from '../src/types/skill.js'

const makeDefinition = (
  overrides: Partial<SkillDefinition> = {},
): SkillDefinition =>
  Object.freeze({
    metadata: Object.freeze({
      name: overrides.metadata?.name ?? 'test-skill',
      description: overrides.metadata?.description ?? 'A test skill',
      tags: overrides.metadata?.tags ?? [],
      ...(overrides.metadata?.version != null ? { version: overrides.metadata.version } : {}),
    }),
    instructions: Object.freeze({
      always: overrides.instructions?.always ?? 'Do the thing.',
      ...(overrides.instructions?.conditional
        ? { conditional: overrides.instructions.conditional }
        : {}),
    }),
    sourcePath: overrides.sourcePath ?? '/fake/skill.md',
    ...overrides,
  })

describe('inject', () => {
  it('formats single definition with name and instructions', () => {
    const def = makeDefinition({
      metadata: Object.freeze({ name: 'my-skill', description: 'Test', tags: [] }),
      instructions: Object.freeze({ always: 'Do something useful.' }),
    })
    const result = inject([def])

    expect(result).toContain('my-skill')
    expect(result).toContain('Do something useful.')
  })

  it('formats multiple definitions separated by divider', () => {
    const defs = [
      makeDefinition({
        metadata: Object.freeze({ name: 'skill-a', description: 'First', tags: [] }),
        instructions: Object.freeze({ always: 'Instruction A.' }),
      }),
      makeDefinition({
        metadata: Object.freeze({ name: 'skill-b', description: 'Second', tags: [] }),
        instructions: Object.freeze({ always: 'Instruction B.' }),
      }),
    ]
    const result = inject(defs)

    expect(result).toContain('skill-a')
    expect(result).toContain('skill-b')
    expect(result).toContain('\n\n---\n\n')
    expect(result).toContain('Instruction A.')
    expect(result).toContain('Instruction B.')
  })

  it('includes metadata (description, version, tags) in output', () => {
    const def = makeDefinition({
      metadata: Object.freeze({
        name: 'meta-skill',
        description: 'A skill with full metadata',
        version: '2.0.0',
        tags: ['security', 'testing'],
      }),
      instructions: Object.freeze({ always: 'Check everything.' }),
    })
    const result = inject([def])

    expect(result).toContain('meta-skill')
    expect(result).toContain('A skill with full metadata')
    expect(result).toContain('2.0.0')
    expect(result).toContain('security')
    expect(result).toContain('testing')
  })

  it('includes conditional instructions when context matches', () => {
    const def = makeDefinition({
      metadata: Object.freeze({ name: 'ctx-skill', description: 'Ctx test', tags: [] }),
      instructions: Object.freeze({
        always: 'Always run.',
        conditional: [
          Object.freeze({
            condition: "framework === 'next.js'",
            content: 'Use Next.js best practices.',
          }),
        ],
      }),
    })
    const result = inject([def], { contextVars: { framework: 'next.js' } })

    expect(result).toContain('Always run.')
    expect(result).toContain('Use Next.js best practices.')
  })

  it('excludes conditional instructions when no context vars', () => {
    const def = makeDefinition({
      metadata: Object.freeze({ name: 'ctx-skill', description: 'Ctx test', tags: [] }),
      instructions: Object.freeze({
        always: 'Always run.',
        conditional: [
          Object.freeze({
            condition: "framework === 'next.js'",
            content: 'Use Next.js best practices.',
          }),
        ],
      }),
    })
    const result = inject([def])

    expect(result).toContain('Always run.')
    expect(result).not.toContain('Use Next.js best practices.')
  })

  it('returns empty string for empty definitions', () => {
    const result = inject([])

    expect(result).toBe('')
  })

  it('evaluates simple equality conditions', () => {
    const def = makeDefinition({
      metadata: Object.freeze({ name: 'eq-skill', description: 'Eq test', tags: [] }),
      instructions: Object.freeze({
        always: 'Base.',
        conditional: [
          Object.freeze({
            condition: "environment === 'production'",
            content: 'Enable production monitoring.',
          }),
          Object.freeze({
            condition: "environment === 'staging'",
            content: 'Enable staging logging.',
          }),
        ],
      }),
    })
    const result = inject([def], { contextVars: { environment: 'production' } })

    expect(result).toContain('Enable production monitoring.')
    expect(result).not.toContain('Enable staging logging.')
  })

  it('evaluates boolean truthy conditions', () => {
    const def = makeDefinition({
      metadata: Object.freeze({ name: 'bool-skill', description: 'Bool test', tags: [] }),
      instructions: Object.freeze({
        always: 'Base.',
        conditional: [
          Object.freeze({
            condition: 'hasDockerfile === true',
            content: 'Run Docker-specific checks.',
          }),
        ],
      }),
    })
    const result = inject([def], { contextVars: { hasDockerfile: 'true' } })

    expect(result).toContain('Run Docker-specific checks.')
  })
})
