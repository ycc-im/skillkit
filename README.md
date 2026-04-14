# @ycc-im/skillkit

A TypeScript toolkit for managing and scheduling Skills in AI Agent frameworks. It parses Skill definitions from Markdown+Frontmatter files and provides a lazy-loading pipeline to inject relevant skills into LLM context on demand.

## Installation

```bash
npm install @ycc-im/skillkit
```

## What is a Skill?

A Skill is a Markdown file with YAML frontmatter that defines instructions for an AI agent:

```markdown
---
name: verify-security
description: "Scans code for security vulnerabilities and dangerous patterns."
version: "1.2.0"
tags: [security, quality-gate]
priority: 10
triggers:
  keywords: [security scan, vulnerability, OWASP]
  patterns: ["detect.*security"]
prerequisites:
  tools:
    - name: rg
      command: rg
      check: "rg --version"
      hint: "Install ripgrep: brew install ripgrep"
  env: [API_KEY]
---

## Workflow
1. Scan all source code files
2. Detect dangerous patterns: SQL injection, XSS, hardcoded secrets
3. Generate a severity-level report
```

The frontmatter contains structured metadata. The body text is the instruction content injected into the LLM.

## Quick Start

### One-step pipeline

```typescript
import { runPipeline } from '@ycc-im/skillkit'

const result = await runPipeline(
  ['./skills', '~/.skills'],  // directories to scan
  'security scan my code',     // user query
)

console.log(result.text)          // formatted text ready for LLM injection
console.log(result.definitions)   // loaded SkillDefinition[]
console.log(result.loaded)        // Map<string, SkillDefinition> cache
```

### Step-by-step pipeline

```typescript
import { scan, route, load, inject } from '@ycc-im/skillkit'

// Stage 1: Discover skills
const scanResult = await scan(['./skills'])
if (!scanResult.ok) throw new Error('Scan failed')

// Stage 2: Match skills to query
const matched = route('security scan', scanResult.value, {
  tags: ['security'],       // optional tag filter
  exclusiveTag: 'security', // keep only highest-priority match for this tag
})

// Stage 3: Load full definitions
const loadResult = await load(matched)

// Stage 4: Format for LLM injection
const text = inject(loadResult.definitions, {
  contextVars: { framework: 'next.js' },  // enables conditional instructions
})
```

### Parse individual files

```typescript
import { parseManifest, parseSkillFile } from '@ycc-im/skillkit'

// L1: Fast scan (frontmatter only)
const manifest = await parseManifest('./skills/verify-security/SKILL.md')
if (manifest.ok) {
  console.log(manifest.value.name)        // "verify-security"
  console.log(manifest.value.priority)    // 10
}

// L2: Full load (frontmatter + instructions)
const definition = await parseSkillFile('./skills/verify-security/SKILL.md')
if (definition.ok) {
  console.log(definition.value.instructions.always)  // full instruction text
}
```

## Architecture

Skillkit uses a **Pipeline** architecture with four pure-function stages:

```
scan() → route() → load() → inject()
```

| Stage | Input | Output | Description |
|-------|-------|--------|-------------|
| `scan` | Directory paths | `SkillManifest[]` | Recursively discovers `.md` files, parses frontmatter (L1) |
| `route` | Query + Manifests | `SkillManifest[]` | Matches query against descriptions/tags, sorts by priority |
| `load` | Manifests | `SkillDefinition[]` | Loads full file content (L2), checks prerequisites, caches results |
| `inject` | Definitions | `string` | Formats definitions as LLM-ready text, evaluates conditionals |

Each stage is independent and composable. You can use `runPipeline` for convenience, or call stages individually.

## Conditional Instructions

Skill files support conditional blocks that are only injected when context variables match:

```markdown
Base instructions here.

<!-- conditional: framework === 'next.js' -->
## Next.js Specific Checks
Check middleware authentication.
<!-- end conditional -->

<!-- conditional: language === 'python' -->
## Python Specific Checks
Check eval/exec usage and pickle deserialization.
<!-- end conditional -->
```

Pass context variables to `inject` or `runPipeline`:

```typescript
const text = inject(definitions, {
  contextVars: { framework: 'next.js', language: 'python' },
})
```

## Stateful Loading

The `load` stage accepts and returns a `loaded` Map for caching skills across calls:

```typescript
const first = await runPipeline(['./skills'], 'security', new Map())
const second = await runPipeline(['./skills'], 'docs', first.loaded)

// second.loaded contains both security and docs skills
```

## API Reference

### Pipeline

| Function | Signature |
|----------|-----------|
| `scan` | `(dirs: readonly string[]) => Promise<Result<readonly SkillManifest[], ScanError>>` |
| `route` | `(query: string, manifests: readonly SkillManifest[], options?: RouteOptions) => readonly SkillManifest[]` |
| `load` | `(manifests: readonly SkillManifest[], loaded?: ReadonlyMap<string, SkillDefinition>) => Promise<LoadResult>` |
| `inject` | `(definitions: readonly SkillDefinition[], options?: InjectOptions) => string` |
| `runPipeline` | `(dirs: readonly string[], query: string, loaded?: ReadonlyMap<string, SkillDefinition>) => Promise<PipelineResult>` |

### Parser

| Function | Signature |
|----------|-----------|
| `parseManifest` | `(filePath: string) => Promise<Result<SkillManifest, ParseError>>` |
| `parseSkillFile` | `(filePath: string) => Promise<Result<SkillDefinition, ParseError>>` |

### Types

| Type | Description |
|------|-------------|
| `Result<T, E>` | Discriminated union: `{ ok: true, value: T } \| { ok: false, error: E }` |
| `SkillManifest` | Lightweight L1 metadata (name, description, tags, priority) |
| `SkillDefinition` | Full L2 definition with all fields |
| `SkillMetadata` | Name, description, version, tags, priority, exclusive, requires |
| `SkillTriggers` | Keywords, regex patterns, file patterns, context conditions |
| `SkillPrerequisites` | Tools, env vars, file existence checks |
| `SkillInstructions` | Always content + optional conditional blocks |
| `ParseError` | File path, field name, message, optional cause |

## Development

```bash
npm install
npm test          # run tests
npm run typecheck # type checking
npm run build     # compile to dist/
```

## License

MIT
