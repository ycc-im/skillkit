import fs from 'node:fs'
import matter from 'gray-matter'
import { ok, err } from '../types/result.js'
import type { Result } from '../types/result.js'
import type {
  SkillMetadata,
  SkillTriggers,
  SkillPrerequisites,
  SkillReferences,
  SkillOutput,
  SkillLifecycle,
  ParseError,
} from '../types/skill.js'

export interface FrontmatterData {
  readonly metadata: SkillMetadata
  readonly triggers?: SkillTriggers
  readonly prerequisites?: SkillPrerequisites
  readonly references?: SkillReferences
  readonly output?: SkillOutput
  readonly lifecycle?: SkillLifecycle
}

export const parseFrontmatter = (
  filePath: string,
): Result<FrontmatterData, ParseError> => {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const parsed = matter(raw)
    const data = parsed.data as Record<string, unknown>

    if (typeof data.name !== 'string' || data.name.trim() === '') {
      return Object.freeze(
        err({
          filePath,
          field: 'name',
          message: 'Required field "name" is missing or not a non-empty string',
        }),
      )
    }

    if (
      typeof data.description !== 'string' ||
      data.description.trim() === ''
    ) {
      return Object.freeze(
        err({
          filePath,
          field: 'description',
          message:
            'Required field "description" is missing or not a non-empty string',
        }),
      )
    }

    const metadata: SkillMetadata = Object.freeze({
      name: data.name,
      description: data.description,
      version: typeof data.version === 'string' ? data.version : undefined,
      author: typeof data.author === 'string' ? data.author : undefined,
      tags: Array.isArray(data.tags)
        ? (data.tags as string[])
        : [],
      priority:
        typeof data.priority === 'number' ? data.priority : undefined,
      exclusive:
        typeof data.exclusive === 'boolean' ? data.exclusive : undefined,
      requires: Array.isArray(data.requires)
        ? (data.requires as string[])
        : undefined,
      contextWeight:
        typeof data.contextWeight === 'number'
          ? data.contextWeight
          : undefined,
    })

    const frontmatterData: FrontmatterData = Object.freeze({
      metadata,
      triggers: data.triggers as SkillTriggers | undefined,
      prerequisites: data.prerequisites as SkillPrerequisites | undefined,
      references: data.references as SkillReferences | undefined,
      output: data.output as SkillOutput | undefined,
      lifecycle: data.lifecycle as SkillLifecycle | undefined,
    })

    return Object.freeze(ok(frontmatterData))
  } catch (cause) {
    return Object.freeze(
      err({
        filePath,
        message: `Failed to read or parse file: ${filePath}`,
        cause,
      }),
    )
  }
}
