import fs from 'node:fs'
import path from 'node:path'
import { parseManifest } from '../parser/index.js'
import { ok, err } from '../types/result.js'
import type { Result } from '../types/result.js'
import type { SkillManifest } from '../types/skill.js'

export type ScanError = readonly string[]

const collectMdFiles = (dir: string): readonly string[] => {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectMdFiles(fullPath))
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath)
    }
  }
  return files
}

export const scan = async (
  dirs: readonly string[],
): Promise<Result<readonly SkillManifest[], ScanError>> => {
  const existingDirs: string[] = []
  const missingDirs: string[] = []

  for (const dir of dirs) {
    if (fs.existsSync(dir)) {
      existingDirs.push(dir)
    } else {
      missingDirs.push(dir)
    }
  }

  if (existingDirs.length === 0) {
    return err(Object.freeze(missingDirs))
  }

  const mdFiles = existingDirs.flatMap(collectMdFiles)

  const results = await Promise.all(mdFiles.map(parseManifest))

  const manifests = results
    .filter(
      (r): r is { readonly ok: true; readonly value: SkillManifest } => r.ok,
    )
    .map((r) => r.value)

  return ok(Object.freeze(manifests))
}
