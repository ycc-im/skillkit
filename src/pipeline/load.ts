import { parseSkillFile } from '../parser/index.js'
import type { SkillManifest, SkillDefinition } from '../types/skill.js'

export interface LoadError {
  readonly message: string
  readonly cause?: unknown
}

export interface LoadResult {
  readonly definitions: readonly SkillDefinition[]
  readonly loaded: ReadonlyMap<string, SkillDefinition>
  readonly errors: readonly {
    readonly manifest: SkillManifest
    readonly error: LoadError
  }[]
}

export const load = async (
  manifests: readonly SkillManifest[],
  loaded?: ReadonlyMap<string, SkillDefinition>,
): Promise<LoadResult> => {
  const loadedMap = new Map<string, SkillDefinition>(loaded)
  const definitions: SkillDefinition[] = []
  const errors: { readonly manifest: SkillManifest; readonly error: LoadError }[] = []

  const pending = manifests.filter((m) => !loadedMap.has(m.name))

  for (const manifest of pending) {
    const result = await parseSkillFile(manifest.sourcePath)
    if (result.ok) {
      loadedMap.set(result.value.metadata.name, result.value)
      definitions.push(result.value)
    } else {
      errors.push(
        Object.freeze({
          manifest,
          error: Object.freeze({
            message: result.error.message,
            ...(result.error.cause != null ? { cause: result.error.cause } : {}),
          }),
        }),
      )
    }
  }

  return Object.freeze({
    definitions: Object.freeze(definitions),
    loaded: Object.freeze(loadedMap),
    errors: Object.freeze(errors),
  })
}
