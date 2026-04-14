import { describe, it, expect } from 'vitest'
import type {
  SkillMetadata,
  SkillTriggers,
  SkillPrerequisites,
  PrerequisiteTool,
  SkillInstructions,
  SkillReference,
  SkillReferences,
  SkillOutput,
  LifecycleAction,
  SkillLifecycle,
  SkillDefinition,
  SkillManifest,
  ParseError,
} from '../src/types/skill.js'

describe('Skill types', () => {
  it('SkillMetadata accepts valid metadata', () => {
    const meta: SkillMetadata = {
      name: 'verify-security',
      description: 'Security check skill',
      tags: ['security'],
      priority: 10,
      exclusive: true,
    }
    expect(meta.name).toBe('verify-security')
  })

  it('SkillMetadata accepts minimal metadata', () => {
    const meta: SkillMetadata = {
      name: 'test',
      description: 'test skill',
      tags: [],
    }
    expect(meta.name).toBe('test')
  })

  it('SkillTriggers accepts valid triggers', () => {
    const triggers: SkillTriggers = {
      keywords: ['security scan'],
      patterns: ['detect.*security'],
      filePatterns: ['*.env'],
      context: { hasGitChanges: true },
    }
    expect(triggers.keywords).toEqual(['security scan'])
  })

  it('SkillInstructions accepts always-only instructions', () => {
    const instructions: SkillInstructions = {
      always: 'do something',
    }
    expect(instructions.always).toBe('do something')
  })

  it('SkillInstructions accepts conditional instructions', () => {
    const instructions: SkillInstructions = {
      always: 'base instructions',
      conditional: [
        { condition: "framework === 'next.js'", content: 'Next.js checks' },
      ],
    }
    expect(instructions.conditional?.length).toBe(1)
  })

  it('SkillManifest has required fields', () => {
    const manifest: SkillManifest = {
      name: 'test',
      description: 'test skill',
      tags: ['test'],
      priority: 50,
      sourcePath: '/path/to/SKILL.md',
    }
    expect(manifest.name).toBe('test')
    expect(manifest.priority).toBe(50)
  })

  it('SkillDefinition has all required fields', () => {
    const def: SkillDefinition = {
      metadata: {
        name: 'test',
        description: 'test skill',
        tags: [],
      },
      instructions: { always: 'do something' },
      sourcePath: '/path/to/SKILL.md',
    }
    expect(def.metadata.name).toBe('test')
  })

  it('SkillDefinition accepts full definition', () => {
    const def: SkillDefinition = {
      metadata: {
        name: 'verify-security',
        description: 'Security check skill for scanning vulnerabilities',
        version: '1.2.0',
        author: 'skillkit',
        tags: ['security'],
        priority: 10,
        exclusive: true,
        requires: ['verify-module'],
        contextWeight: 100,
      },
      triggers: {
        keywords: ['security scan'],
        patterns: ['detect.*security'],
        filePatterns: ['*.env'],
        context: { hasGitChanges: true },
      },
      prerequisites: {
        tools: [
          { name: 'rg', command: 'rg', check: 'rg --version', hint: 'install ripgrep' },
        ],
        env: ['API_KEY'],
        fileExists: ['package.json'],
      },
      instructions: {
        always: 'scan all files',
        conditional: [
          { condition: "framework === 'next.js'", content: 'check Next.js' },
        ],
      },
      references: {
        templates: [
          { path: 'templates/report.md', description: 'report template' },
        ],
      },
      output: {
        format: 'markdown',
        file: '.security-report.md',
      },
      lifecycle: {
        onLoad: [{ type: 'message', content: 'loaded' }],
        onError: [{ type: 'fallback', skill: 'manual-review' }],
      },
      sourcePath: '/skills/verify-security/SKILL.md',
    }
    expect(def.metadata.name).toBe('verify-security')
    expect(def.prerequisites?.tools?.[0]?.name).toBe('rg')
    expect(def.references?.templates?.[0]?.path).toBe('templates/report.md')
  })

  it('ParseError has required fields', () => {
    const error: ParseError = {
      filePath: '/test/SKILL.md',
      message: 'invalid format',
    }
    expect(error.filePath).toBe('/test/SKILL.md')
    expect(error.field).toBeUndefined()
  })

  it('ParseError accepts optional field', () => {
    const error: ParseError = {
      filePath: '/test/SKILL.md',
      field: 'name',
      message: 'name is required',
      cause: new Error('original'),
    }
    expect(error.field).toBe('name')
  })
})
