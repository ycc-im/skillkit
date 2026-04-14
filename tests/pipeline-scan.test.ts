import { describe, it, expect, afterEach } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { scan } from '../src/pipeline/scan.js'

const fixtures = path.resolve(import.meta.dirname, 'fixtures')
const multiSkillDir = path.resolve(fixtures, 'multi-skill-dir')

const tempDirs: string[] = []

const createTempDir = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skillkit-scan-test-'))
  tempDirs.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
  tempDirs.length = 0
})

describe('scan', () => {
  it('scans multi-skill-dir and finds 2 manifests', async () => {
    const result = await scan([multiSkillDir])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const names = result.value.map((m) => m.name).sort()
    expect(names).toEqual(['skill-a', 'skill-b'])
  })

  it('returns manifests with correct fields', async () => {
    const result = await scan([multiSkillDir])
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const skillA = result.value.find((m) => m.name === 'skill-a')
    expect(skillA).toBeDefined()
    expect(skillA!.description).toBe('First skill in multi dir')
    expect(skillA!.tags).toEqual(['alpha'])
    expect(skillA!.priority).toBe(10)
    expect(skillA!.sourcePath).toContain('skill-a.md')
  })

  it('scans nested directories', async () => {
    const tmp = createTempDir()
    const nested = path.join(tmp, 'sub', 'deep')
    fs.mkdirSync(nested, { recursive: true })
    fs.writeFileSync(
      path.join(nested, 'nested-skill.md'),
      '---\nname: nested-skill\ndescription: A deeply nested skill\ntags: [nested]\npriority: 5\n---\n\nNested.',
    )

    const result = await scan([tmp])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toHaveLength(1)
    expect(result.value[0]!.name).toBe('nested-skill')
  })

  it('skips files without valid frontmatter', async () => {
    const tmp = createTempDir()
    fs.writeFileSync(
      path.join(tmp, 'valid.md'),
      '---\nname: valid-one\ndescription: Valid skill\ntags: []\n---\n\nOK.',
    )
    fs.writeFileSync(path.join(tmp, 'invalid.md'), '# No frontmatter here\nJust text.')

    const result = await scan([tmp])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toHaveLength(1)
    expect(result.value[0]!.name).toBe('valid-one')
  })

  it('returns error for non-existent directory', async () => {
    const result = await scan(['/no/such/directory/ever'])
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toEqual(['/no/such/directory/ever'])
  })

  it('returns empty array for directory with no .md files', async () => {
    const tmp = createTempDir()
    fs.writeFileSync(path.join(tmp, 'notes.txt'), 'not a skill')

    const result = await scan([tmp])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toEqual([])
  })

  it('scans multiple directories at once', async () => {
    const result = await scan([multiSkillDir, path.resolve(fixtures)])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.length).toBeGreaterThanOrEqual(2)
  })
})
