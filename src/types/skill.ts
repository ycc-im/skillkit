export interface SkillMetadata {
  readonly name: string
  readonly description: string
  readonly version?: string
  readonly author?: string
  readonly tags: readonly string[]
  readonly priority?: number
  readonly exclusive?: boolean
  readonly requires?: readonly string[]
  readonly contextWeight?: number
}

export interface SkillTriggers {
  readonly keywords?: readonly string[]
  readonly patterns?: readonly string[]
  readonly filePatterns?: readonly string[]
  readonly context?: Readonly<Record<string, boolean | string | undefined>>
}

export interface PrerequisiteTool {
  readonly name: string
  readonly command: string
  readonly check: string
  readonly hint: string
}

export interface SkillPrerequisites {
  readonly dependencies?: readonly { readonly name: string; readonly version?: string }[]
  readonly tools?: readonly PrerequisiteTool[]
  readonly env?: readonly string[]
  readonly fileExists?: readonly string[]
}

export interface SkillInstructions {
  readonly always: string
  readonly conditional?: readonly {
    readonly condition: string
    readonly content: string
  }[]
}

export interface SkillReference {
  readonly path: string
  readonly description: string
  readonly runtime?: 'bash' | 'node'
  readonly maxSize?: string
  readonly chunkStrategy?: 'heading' | 'paragraph' | 'size'
}

export interface SkillReferences {
  readonly templates?: readonly SkillReference[]
  readonly docs?: readonly SkillReference[]
  readonly scripts?: readonly SkillReference[]
  readonly examples?: readonly SkillReference[]
}

export interface SkillOutput {
  readonly format: 'markdown' | 'json' | 'sarif' | 'stdout'
  readonly file?: string
  readonly schema?: Record<string, unknown>
  readonly appendToFile?: boolean
}

export interface LifecycleAction {
  readonly type: 'script' | 'message' | 'check' | 'validate' | 'fallback'
  readonly path?: string
  readonly content?: string
  readonly condition?: string
  readonly message?: string
  readonly schema?: string
  readonly skill?: string
}

export interface SkillLifecycle {
  readonly onLoad?: readonly LifecycleAction[]
  readonly onBeforeExecute?: readonly LifecycleAction[]
  readonly onAfterExecute?: readonly LifecycleAction[]
  readonly onError?: readonly LifecycleAction[]
}

export interface SkillDefinition {
  readonly metadata: SkillMetadata
  readonly triggers?: SkillTriggers
  readonly prerequisites?: SkillPrerequisites
  readonly instructions: SkillInstructions
  readonly references?: SkillReferences
  readonly output?: SkillOutput
  readonly lifecycle?: SkillLifecycle
  readonly sourcePath: string
}

export interface SkillManifest {
  readonly name: string
  readonly description: string
  readonly tags: readonly string[]
  readonly priority: number
  readonly sourcePath: string
}

export interface ParseError {
  readonly filePath: string
  readonly field?: string
  readonly message: string
  readonly cause?: unknown
}
