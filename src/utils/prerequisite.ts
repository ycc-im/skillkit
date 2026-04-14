import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import type { SkillPrerequisites } from '../types/skill.js'

export interface PrerequisiteCheckResult {
  readonly ok: boolean
  readonly error: readonly string[]
}

export const checkPrerequisites = async (
  prerequisites: SkillPrerequisites,
): Promise<PrerequisiteCheckResult> => {
  const errors: string[] = []

  if (prerequisites.env) {
    for (const varName of prerequisites.env) {
      if (!process.env[varName]) {
        errors.push(`Missing environment variable: ${varName}`)
      }
    }
  }

  if (prerequisites.fileExists) {
    for (const filePath of prerequisites.fileExists) {
      if (!existsSync(filePath)) {
        errors.push(`Missing file: ${filePath}`)
      }
    }
  }

  if (prerequisites.tools) {
    for (const tool of prerequisites.tools) {
      try {
        execSync(tool.check, { timeout: 5000, stdio: 'pipe' })
      } catch {
        errors.push(`Tool not available: ${tool.name} — ${tool.hint}`)
      }
    }
  }

  return Object.freeze({
    ok: errors.length === 0,
    error: Object.freeze(errors),
  })
}
