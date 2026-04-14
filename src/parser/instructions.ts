import type { SkillInstructions } from '../types/skill.js'

const CONDITIONAL_START = /<!--\s*conditional:\s*(.+?)\s*-->/g
const CONDITIONAL_END = /<!--\s*end conditional\s*-->/g

export const parseInstructions = (body: string): SkillInstructions => {
  const conditionals: { readonly condition: string; readonly content: string }[] = []

  const pattern = /<!--\s*conditional:\s*(.+?)\s*-->\n?([\s\S]*?)<!--\s*end conditional\s*-->/g

  let match: RegExpExecArray | null
  while ((match = pattern.exec(body)) !== null) {
    conditionals.push(
      Object.freeze({
        condition: match[1]!.trim(),
        content: match[2]!.trim(),
      }),
    )
  }

  let always = body.replace(pattern, '')
  always = always.replace(/\n{3,}/g, '\n\n').trim()

  const result: SkillInstructions = Object.freeze({
    always,
    ...(conditionals.length > 0
      ? { conditional: Object.freeze(conditionals) }
      : {}),
  })

  return result
}
