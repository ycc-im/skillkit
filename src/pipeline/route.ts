import { matchKeywords, matchTags } from '../utils/match.js'
import type { SkillManifest } from '../types/skill.js'

export interface RouteOptions {
  readonly tags?: readonly string[]
  readonly filePatterns?: readonly string[]
  readonly exclusiveTag?: string
}

export const route = (
  query: string,
  manifests: readonly SkillManifest[],
  options?: RouteOptions,
): readonly SkillManifest[] => {
  const textMatch = (text: string): boolean =>
    text.length > 0 && (query.includes(text) || text.includes(query))

  const matched = manifests.filter((m) => {
    const queryMatch =
      textMatch(m.description) ||
      textMatch(m.name) ||
      matchKeywords(query, m.tags)

    const tagMatch = options?.tags
      ? matchTags(m.tags, options.tags)
      : false

    return queryMatch || tagMatch
  })

  const sorted = [...matched].sort((a, b) => a.priority - b.priority)

  if (options?.exclusiveTag) {
    const exclusive = sorted.find((m) => m.tags.includes(options.exclusiveTag!))
    if (exclusive) {
      return Object.freeze([exclusive])
    }
    return Object.freeze([])
  }

  return Object.freeze(sorted)
}
