import { parseFrontmatter } from './frontmatter.js'
import { parseInstructions } from './instructions.js'
import { ok, err } from '../types/result.js'
import type { Result } from '../types/result.js'
import type {
  SkillManifest,
  SkillDefinition,
  ParseError,
} from '../types/skill.js'
import fs from 'node:fs'
import matter from 'gray-matter'

export const parseManifest = async (
  filePath: string,
): Promise<Result<SkillManifest, ParseError>> => {
  const frontmatterResult = parseFrontmatter(filePath)
  if (!frontmatterResult.ok) return frontmatterResult

  const { metadata } = frontmatterResult.value
  const manifest: SkillManifest = Object.freeze({
    name: metadata.name,
    description: metadata.description,
    tags: metadata.tags,
    priority: metadata.priority ?? 50,
    sourcePath: filePath,
  })

  return Object.freeze(ok(manifest))
}

export const parseSkillFile = async (
  filePath: string,
): Promise<Result<SkillDefinition, ParseError>> => {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const parsed = matter(raw)

    const frontmatterResult = parseFrontmatter(filePath)
    if (!frontmatterResult.ok) return frontmatterResult

    const { metadata, triggers, prerequisites, references, output, lifecycle } =
      frontmatterResult.value

    const instructions = parseInstructions(parsed.content)

    const definition: SkillDefinition = Object.freeze({
      metadata,
      ...(triggers ? { triggers } : {}),
      ...(prerequisites ? { prerequisites } : {}),
      instructions,
      ...(references ? { references } : {}),
      ...(output ? { output } : {}),
      ...(lifecycle ? { lifecycle } : {}),
      sourcePath: filePath,
    })

    return Object.freeze(ok(definition))
  } catch (cause) {
    return Object.freeze(
      err({
        filePath,
        message: `Failed to read or parse skill file: ${filePath}`,
        cause,
      }),
    )
  }
}
