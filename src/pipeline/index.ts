import type { SkillDefinition } from '../types/skill.js'
import { scan } from './scan.js'
import { route } from './route.js'
import { load } from './load.js'
import { inject } from './inject.js'

interface PipelineResult {
  readonly text: string
  readonly definitions: readonly SkillDefinition[]
  readonly loaded: ReadonlyMap<string, SkillDefinition>
}

const runPipeline = async (
  dirs: readonly string[],
  query: string,
  loaded?: ReadonlyMap<string, SkillDefinition>,
): Promise<PipelineResult> => {
  const scanResult = await scan(dirs)
  if (!scanResult.ok) {
    throw new Error(`Scan failed: ${scanResult.error.join(', ')}`)
  }

  const matched = route(query, scanResult.value)
  const loadResult = await load(matched, loaded)
  const text = inject(loadResult.definitions)

  return Object.freeze({
    text,
    definitions: loadResult.definitions,
    loaded: loadResult.loaded,
  })
}

export { runPipeline }
export type { PipelineResult }
