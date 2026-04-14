import type { SkillDefinition } from '../types/skill.js'

export interface InjectOptions {
  readonly contextVars?: Readonly<Record<string, string>>
  readonly maxTokens?: number
}

const evaluateCondition = (
  condition: string,
  contextVars: Readonly<Record<string, string>>,
): boolean => {
  const match = condition.match(/^\s*(\w+)\s*===\s*(.+?)\s*$/)
  if (!match) return false

  const variableName = match[1]!
  const rawValue = match[2]!.trim()

  let expectedValue: string
  if (
    (rawValue.startsWith("'") && rawValue.endsWith("'")) ||
    (rawValue.startsWith('"') && rawValue.endsWith('"'))
  ) {
    expectedValue = rawValue.slice(1, -1)
  } else if (rawValue === 'true') {
    expectedValue = 'true'
  } else if (rawValue === 'false') {
    expectedValue = 'false'
  } else {
    expectedValue = rawValue
  }

  const actual = contextVars[variableName]
  return actual === expectedValue
}

const formatDefinition = (
  def: SkillDefinition,
  contextVars: Readonly<Record<string, string>> | undefined,
): string => {
  const parts: string[] = []

  parts.push(`# ${def.metadata.name}`)

  parts.push(def.metadata.description)

  if (def.metadata.version) {
    parts.push(`Version: ${def.metadata.version}`)
  }

  if (def.metadata.tags.length > 0) {
    parts.push(`Tags: ${def.metadata.tags.join(', ')}`)
  }

  parts.push('')
  parts.push(def.instructions.always)

  if (def.instructions.conditional && contextVars) {
    for (const cond of def.instructions.conditional) {
      if (evaluateCondition(cond.condition, contextVars)) {
        parts.push('')
        parts.push(cond.content)
      }
    }
  }

  return parts.join('\n')
}

export const inject = (
  definitions: readonly SkillDefinition[],
  options?: InjectOptions,
): string => {
  if (definitions.length === 0) return ''

  const contextVars = options?.contextVars
  const formatted = definitions.map((def) => formatDefinition(def, contextVars))

  return formatted.join('\n\n---\n\n')
}
