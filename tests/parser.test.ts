import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { parseFrontmatter } from '../src/parser/frontmatter.js'
import { parseInstructions } from '../src/parser/instructions.js'
import { parseManifest, parseSkillFile } from '../src/parser/index.js'
import type { ParseError } from '../src/types/skill.js'

const fixtures = path.resolve(import.meta.dirname, 'fixtures')

describe('parseFrontmatter', () => {
  describe('valid basic skill', () => {
    it('parses basic frontmatter and returns metadata', () => {
      const result = parseFrontmatter(path.resolve(fixtures, 'basic-skill.md'))
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.value.metadata.name).toBe('basic-skill')
      expect(result.value.metadata.description).toBe('A minimal skill for testing')
      expect(result.value.metadata.tags).toEqual(['test'])
    })

    it('defaults tags to empty array when absent', () => {
      const result = parseFrontmatter(path.resolve(fixtures, 'missing-description.md'))
      expect(result.ok).toBe(false)
    })

    it('applies tags default of empty array for basic skill', () => {
      const result = parseFrontmatter(path.resolve(fixtures, 'basic-skill.md'))
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.isArray(result.value.metadata.tags)).toBe(true)
    })
  })

  describe('valid full skill', () => {
    it('parses all fields from full-skill.md', () => {
      const result = parseFrontmatter(path.resolve(fixtures, 'full-skill.md'))
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const { metadata, triggers, prerequisites, references, output, lifecycle } = result.value
      expect(metadata.name).toBe('verify-security')
      expect(metadata.description).toBe('Security check skill. Scans code for vulnerabilities and dangerous patterns.')
      expect(metadata.version).toBe('1.2.0')
      expect(metadata.author).toBe('skillkit')
      expect(metadata.tags).toEqual(['security', 'quality-gate'])
      expect(metadata.priority).toBe(10)
      expect(metadata.exclusive).toBe(true)
      expect(metadata.requires).toEqual(['verify-module'])
      expect(metadata.contextWeight).toBe(100)
      expect(triggers?.keywords).toEqual(['security scan', 'vulnerability detection', 'OWASP', 'SQL injection'])
      expect(triggers?.patterns).toEqual(['detect.*security', 'scan.*vulnerability'])
      expect(triggers?.filePatterns).toEqual(['*.env', 'credentials.*'])
      expect(triggers?.context?.hasGitChanges).toBe(true)
      expect(prerequisites?.tools?.[0]?.name).toBe('rg')
      expect(prerequisites?.env).toEqual(['API_KEY'])
      expect(prerequisites?.fileExists).toEqual(['package.json'])
      expect(references?.templates?.[0]?.path).toBe('templates/security-report.md')
      expect(references?.docs?.[0]?.path).toBe('references/owasp-top10.md')
      expect(output?.format).toBe('markdown')
      expect(output?.file).toBe('.security-report.md')
      expect(output?.appendToFile).toBe(false)
      expect(lifecycle?.onLoad?.[0]?.type).toBe('message')
      expect(lifecycle?.onAfterExecute?.[0]?.type).toBe('validate')
      expect(lifecycle?.onError?.[0]?.type).toBe('fallback')
    })
  })

  describe('validation errors', () => {
    it('returns error when name is missing', () => {
      const result = parseFrontmatter(path.resolve(fixtures, 'missing-name.md'))
      expect(result.ok).toBe(false)
      if (result.ok) return
      const error = result.error as ParseError
      expect(error.filePath).toContain('missing-name.md')
      expect(error.field).toBe('name')
      expect(error.message).toContain('name')
    })

    it('returns error when description is missing', () => {
      const result = parseFrontmatter(path.resolve(fixtures, 'missing-description.md'))
      expect(result.ok).toBe(false)
      if (result.ok) return
      const error = result.error as ParseError
      expect(error.filePath).toContain('missing-description.md')
      expect(error.field).toBe('description')
      expect(error.message).toContain('description')
    })

    it('returns error for file with no frontmatter', () => {
      const result = parseFrontmatter(path.resolve(fixtures, 'no-frontmatter.md'))
      expect(result.ok).toBe(false)
      if (result.ok) return
      const error = result.error as ParseError
      expect(error.filePath).toContain('no-frontmatter.md')
      expect(error.message).toContain('name')
    })
  })

  describe('non-existent file', () => {
    it('returns error for non-existent file', () => {
      const result = parseFrontmatter(path.resolve(fixtures, 'does-not-exist.md'))
      expect(result.ok).toBe(false)
      if (result.ok) return
      const error = result.error as ParseError
      expect(error.filePath).toContain('does-not-exist.md')
      expect(error.cause).toBeDefined()
    })
  })

  describe('defaults', () => {
    it('defaults tags to empty array when not provided', () => {
      const filePath = path.resolve(fixtures, 'missing-name.md')
      const result = parseFrontmatter(filePath)
      if (result.ok) {
        expect(result.value.metadata.tags).toEqual([])
      }
    })
  })

  describe('frozen result', () => {
    it('returns frozen result object', () => {
      const result = parseFrontmatter(path.resolve(fixtures, 'basic-skill.md'))
      expect(Object.isFrozen(result)).toBe(true)
    })
  })
})

describe('parseInstructions', () => {
  it('extracts body text as always instructions', () => {
    const body = 'Do the basic thing.'
    const result = parseInstructions(body)
    expect(result.always).toContain('Do the basic thing.')
  })

  it('extracts conditional blocks from markers', () => {
    const body = `Always do this.

<!-- conditional: framework === 'next.js' -->
Check middleware and Server Actions.
<!-- end conditional -->

<!-- conditional: language === 'python' -->
Check eval/exec and pickle usage.
<!-- end conditional -->`

    const result = parseInstructions(body)
    expect(result.always).toContain('Always do this.')
    expect(result.always).not.toContain('Check middleware')
    expect(result.always).not.toContain('Check eval')
    expect(result.conditional).toHaveLength(2)
    expect(result.conditional?.[0]?.condition).toBe("framework === 'next.js'")
    expect(result.conditional?.[0]?.content).toContain('Check middleware and Server Actions.')
    expect(result.conditional?.[1]?.condition).toBe("language === 'python'")
    expect(result.conditional?.[1]?.content).toContain('Check eval/exec and pickle usage.')
  })

  it('handles empty body', () => {
    const result = parseInstructions('')
    expect(result.always).toBe('')
    expect(result.conditional).toBeUndefined()
  })

  it('handles body with no conditionals', () => {
    const body = 'Just a simple instruction.\nNo conditionals here.'
    const result = parseInstructions(body)
    expect(result.always).toContain('Just a simple instruction.')
    expect(result.conditional).toBeUndefined()
  })

  it('returns frozen result', () => {
    const result = parseInstructions('some text')
    expect(Object.isFrozen(result)).toBe(true)
  })

  it('trims whitespace from conditional content', () => {
    const body = `Always do this.

<!-- conditional: flag === true -->
  Indented content here.
<!-- end conditional -->`

    const result = parseInstructions(body)
    expect(result.conditional?.[0]?.content.trim()).toBe('Indented content here.')
  })

  it('handles body with only conditional blocks', () => {
    const body = `<!-- conditional: mode === 'test' -->
Only conditional content.
<!-- end conditional -->`

    const result = parseInstructions(body)
    expect(result.always.trim()).toBe('')
    expect(result.conditional).toHaveLength(1)
    expect(result.conditional?.[0]?.condition).toBe("mode === 'test'")
  })
})

describe('parseManifest', () => {
  it('parses basic manifest from frontmatter only', async () => {
    const result = await parseManifest(path.resolve(fixtures, 'basic-skill.md'))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.name).toBe('basic-skill')
    expect(result.value.description).toBe('A minimal skill for testing')
    expect(result.value.tags).toEqual(['test'])
    expect(result.value.sourcePath).toContain('basic-skill.md')
  })

  it('uses priority from frontmatter when provided', async () => {
    const result = await parseManifest(path.resolve(fixtures, 'full-skill.md'))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.priority).toBe(10)
  })

  it('defaults priority to 50 when not in frontmatter', async () => {
    const result = await parseManifest(path.resolve(fixtures, 'basic-skill.md'))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.priority).toBe(50)
  })

  it('returns error for invalid file', async () => {
    const result = await parseManifest(path.resolve(fixtures, 'missing-name.md'))
    expect(result.ok).toBe(false)
  })

  it('returns error for non-existent file', async () => {
    const result = await parseManifest(path.resolve(fixtures, 'no-such-file.md'))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.filePath).toContain('no-such-file.md')
  })

  it('returns frozen result', async () => {
    const result = await parseManifest(path.resolve(fixtures, 'basic-skill.md'))
    expect(Object.isFrozen(result)).toBe(true)
  })
})

describe('parseSkillFile', () => {
  it('parses basic skill definition with instructions', async () => {
    const result = await parseSkillFile(path.resolve(fixtures, 'basic-skill.md'))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.metadata.name).toBe('basic-skill')
    expect(result.value.instructions.always).toContain('Do the basic thing.')
    expect(result.value.sourcePath).toContain('basic-skill.md')
  })

  it('parses full skill definition with all fields', async () => {
    const result = await parseSkillFile(path.resolve(fixtures, 'full-skill.md'))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.metadata.name).toBe('verify-security')
    expect(result.value.triggers?.keywords).toBeDefined()
    expect(result.value.prerequisites?.tools).toBeDefined()
    expect(result.value.references?.templates).toBeDefined()
    expect(result.value.output?.format).toBe('markdown')
    expect(result.value.lifecycle?.onLoad).toBeDefined()
    expect(result.value.instructions.always).toContain('Scan all source code files')
  })

  it('parses skill with conditional instructions', async () => {
    const result = await parseSkillFile(path.resolve(fixtures, 'conditional-skill.md'))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.instructions.conditional).toHaveLength(2)
    expect(result.value.instructions.always).toContain('Always do this.')
    expect(result.value.instructions.always).not.toContain('Check middleware')
  })

  it('returns error for invalid file (missing name)', async () => {
    const result = await parseSkillFile(path.resolve(fixtures, 'missing-name.md'))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.field).toBe('name')
  })

  it('returns error for non-existent file', async () => {
    const result = await parseSkillFile(path.resolve(fixtures, 'nonexistent.md'))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.filePath).toContain('nonexistent.md')
  })

  it('returns frozen result', async () => {
    const result = await parseSkillFile(path.resolve(fixtures, 'basic-skill.md'))
    expect(Object.isFrozen(result)).toBe(true)
  })

  it('returns error for file with no frontmatter', async () => {
    const result = await parseSkillFile(path.resolve(fixtures, 'no-frontmatter.md'))
    expect(result.ok).toBe(false)
  })
})
