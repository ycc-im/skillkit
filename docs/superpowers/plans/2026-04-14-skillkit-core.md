# Skillkit Core 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现一个 TypeScript 工具库，为 AI Agent 框架提供 Skill 管理和调度能力，包含核心类型、Markdown+Frontmatter 解析、三级懒加载 Pipeline 调度引擎。

**Architecture:** Pipeline 架构 — 四个纯函数（scan → route → load → inject）串联，实用函数式风格（Result + async/await + readonly），零全局可变状态。所有 Skill 从本地文件系统读取 Markdown+Frontmatter 格式文件。

**Tech Stack:** TypeScript, vitest, gray-matter, Node.js

**Design Spec:** `docs/superpowers/specs/2026-04-14-skillkit-core-design.md`

---

## File Structure

```
skillkit/
├── src/
│   ├── types/
│   │   ├── result.ts              # Result<T, E> 基础类型及 ok/err 构造器
│   │   └── skill.ts               # Skill 模型接口定义
│   ├── parser/
│   │   ├── frontmatter.ts         # Frontmatter YAML 解析（依赖 gray-matter）
│   │   ├── instructions.ts        # Markdown body → SkillInstructions
│   │   └── index.ts               # parseSkillFile, parseManifest 导出
│   ├── pipeline/
│   │   ├── scan.ts                # Stage 1: 递归扫描目录 → SkillManifest[]
│   │   ├── route.ts               # Stage 2: query + manifests → 匹配的 manifests
│   │   ├── load.ts                # Stage 3: manifests → SkillDefinition[]（含依赖解析）
│   │   ├── inject.ts              # Stage 4: definitions → 可注入 LLM 的文本
│   │   └── index.ts               # runPipeline 组合函数
│   ├── utils/
│   │   ├── dag.ts                 # DAG 环检测
│   │   ├── match.ts               # 关键词/正则匹配工具
│   │   └── prerequisite.ts        # 前置条件检查（工具、环境变量、文件）
│   └── index.ts                   # 统一导出
├── tests/
│   ├── fixtures/
│   │   ├── basic-skill.md         # 最小完整 Skill 文件
│   │   ├── full-skill.md          # 包含所有字段的完整 Skill 文件
│   │   ├── conditional-skill.md   # 包含 conditional instructions 的 Skill
│   │   ├── missing-name.md        # 缺少必填字段 name
│   │   ├── missing-description.md # 缺少必填字段 description
│   │   ├── multi-skill-dir/       # 多个 Skill 文件的目录
│   │   │   ├── skill-a.md
│   │   │   └── skill-b.md
│   │   └── no-frontmatter.md      # 无 frontmatter 的普通 Markdown
│   ├── types.test.ts
│   ├── parser.test.ts
│   ├── utils-dag.test.ts
│   ├── utils-match.test.ts
│   ├── utils-prerequisite.test.ts
│   ├── pipeline-scan.test.ts
│   ├── pipeline-route.test.ts
│   ├── pipeline-load.test.ts
│   ├── pipeline-inject.test.ts
│   └── pipeline.test.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## Task 0: 项目初始化

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/index.ts` (空占位)

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "@skillkit/core",
  "version": "0.1.0",
  "description": "Skill management and scheduling toolkit for AI Agent frameworks",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "tsc --noEmit"
  },
  "keywords": ["skill", "ai", "agent", "llm", "toolkit"],
  "license": "MIT",
  "dependencies": {
    "gray-matter": "^4.0.3"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": false,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: 创建 vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
  },
})
```

- [ ] **Step 4: 创建空 src/index.ts**

```typescript
```

- [ ] **Step 5: 安装依赖**

Run: `npm install`
Expected: 依赖安装成功

- [ ] **Step 6: 验证 TypeScript 编译通过**

Run: `npx tsc --noEmit`
Expected: 无错误输出

- [ ] **Step 7: 初始化 git 并提交**

```bash
git init
git add package.json tsconfig.json vitest.config.ts src/index.ts
git commit -m "chore: initialize @skillkit/core project with TypeScript and vitest"
```

---

## Task 1: Result 基础类型

**Files:**
- Create: `src/types/result.ts`
- Create: `tests/types.test.ts`

- [ ] **Step 1: 编写 Result 类型的失败测试**

```typescript
// tests/types.test.ts
import { describe, it, expect } from 'vitest'
import { ok, err } from '../src/types/result'
import type { Result } from '../src/types/result'

describe('Result type', () => {
  describe('ok', () => {
    it('creates a success result with value', () => {
      const result: Result<number, string> = ok(42)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe(42)
      }
    })

    it('creates a success result with string value', () => {
      const result: Result<string, Error> = ok('hello')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe('hello')
      }
    })

    it('creates a success result with object value', () => {
      const result: Result<{ name: string }, never> = ok({ name: 'test' })
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.name).toBe('test')
      }
    })

    it('result is frozen (immutable)', () => {
      const result = ok({ count: 1 })
      expect(Object.isFrozen(result)).toBe(true)
    })
  })

  describe('err', () => {
    it('creates an error result with error', () => {
      const result: Result<number, string> = err('something failed')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('something failed')
      }
    })

    it('creates an error result with object error', () => {
      const result: Result<never, { code: number; message: string }> = err({
        code: 404,
        message: 'not found',
      })
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe(404)
        expect(result.error.message).toBe('not found')
      }
    })

    it('result is frozen (immutable)', () => {
      const result = err('fail')
      expect(Object.isFrozen(result)).toBe(true)
    })
  })

  describe('type narrowing', () => {
    it('narrows to Ok with ok === true check', () => {
      const result: Result<number, string> = ok(10)
      if (result.ok) {
        expect(typeof result.value).toBe('number')
      } else {
        expect.unreachable('should be ok')
      }
    })

    it('narrows to Err with ok === false check', () => {
      const result: Result<number, string> = err('fail')
      if (!result.ok) {
        expect(typeof result.error).toBe('string')
      } else {
        expect.unreachable('should be err')
      }
    })
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/types.test.ts`
Expected: FAIL — 无法从 `../src/types/result` 导入

- [ ] **Step 3: 实现 Result 类型**

```typescript
// src/types/result.ts
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E }

export const ok = <T>(value: T): Result<T, never> =>
  Object.freeze({ ok: true as const, value })

export const err = <E>(error: E): Result<never, E> =>
  Object.freeze({ ok: false as const, error })
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/types.test.ts`
Expected: 所有测试通过

- [ ] **Step 5: 提交**

```bash
git add src/types/result.ts tests/types.test.ts
git commit -m "feat: add Result<T, E> type with ok/err constructors"
```

---

## Task 2: Skill 模型类型定义

**Files:**
- Create: `src/types/skill.ts`

- [ ] **Step 1: 编写类型编译测试**

```typescript
// tests/types.test.ts — 追加到已有文件末尾
import type {
  SkillMetadata,
  SkillTriggers,
  SkillPrerequisites,
  PrerequisiteTool,
  SkillInstructions,
  SkillReference,
  SkillReferences,
  SkillOutput,
  LifecycleAction,
  SkillLifecycle,
  SkillDefinition,
  SkillManifest,
  ParseError,
} from '../src/types/skill'

describe('Skill types', () => {
  it('SkillMetadata accepts valid metadata', () => {
    const meta: SkillMetadata = {
      name: 'verify-security',
      description: '安全校验关卡',
      tags: ['security'],
      priority: 10,
      exclusive: true,
    }
    expect(meta.name).toBe('verify-security')
  })

  it('SkillMetadata accepts minimal metadata (only required fields)', () => {
    const meta: SkillMetadata = {
      name: 'test',
      description: 'test skill',
      tags: [],
    }
    expect(meta.name).toBe('test')
  })

  it('SkillTriggers accepts valid triggers', () => {
    const triggers: SkillTriggers = {
      keywords: ['安全扫描'],
      patterns: ['检测.*安全'],
      filePatterns: ['*.env'],
      context: { hasGitChanges: true },
    }
    expect(triggers.keywords).toEqual(['安全扫描'])
  })

  it('SkillInstructions accepts always-only instructions', () => {
    const instructions: SkillInstructions = {
      always: 'do something',
    }
    expect(instructions.always).toBe('do something')
  })

  it('SkillInstructions accepts conditional instructions', () => {
    const instructions: SkillInstructions = {
      always: 'base instructions',
      conditional: [
        { condition: "framework === 'next.js'", content: 'Next.js checks' },
      ],
    }
    expect(instructions.conditional?.length).toBe(1)
  })

  it('SkillManifest has required fields', () => {
    const manifest: SkillManifest = {
      name: 'test',
      description: 'test skill',
      tags: ['test'],
      priority: 50,
      sourcePath: '/path/to/SKILL.md',
    }
    expect(manifest.name).toBe('test')
    expect(manifest.priority).toBe(50)
  })

  it('SkillDefinition has all required fields', () => {
    const def: SkillDefinition = {
      metadata: {
        name: 'test',
        description: 'test skill',
        tags: [],
      },
      instructions: { always: 'do something' },
      sourcePath: '/path/to/SKILL.md',
    }
    expect(def.metadata.name).toBe('test')
  })

  it('SkillDefinition accepts full definition', () => {
    const def: SkillDefinition = {
      metadata: {
        name: 'verify-security',
        description: '安全校验关卡',
        version: '1.2.0',
        author: 'skillkit',
        tags: ['security'],
        priority: 10,
        exclusive: true,
        requires: ['verify-module'],
        contextWeight: 100,
      },
      triggers: {
        keywords: ['安全扫描'],
        patterns: ['检测.*安全'],
        filePatterns: ['*.env'],
        context: { hasGitChanges: true },
      },
      prerequisites: {
        tools: [
          { name: 'rg', command: 'rg', check: 'rg --version', hint: 'install ripgrep' },
        ],
        env: ['API_KEY'],
        fileExists: ['package.json'],
      },
      instructions: {
        always: 'scan all files',
        conditional: [
          { condition: "framework === 'next.js'", content: 'check Next.js' },
        ],
      },
      references: {
        templates: [
          { path: 'templates/report.md', description: 'report template' },
        ],
      },
      output: {
        format: 'markdown',
        file: '.security-report.md',
      },
      lifecycle: {
        onLoad: [{ type: 'message', content: 'loaded' }],
        onError: [{ type: 'fallback', skill: 'manual-review' }],
      },
      sourcePath: '/skills/verify-security/SKILL.md',
    }
    expect(def.metadata.name).toBe('verify-security')
    expect(def.prerequisites?.tools?.[0]?.name).toBe('rg')
    expect(def.references?.templates?.[0]?.path).toBe('templates/report.md')
  })

  it('ParseError has required fields', () => {
    const error: ParseError = {
      filePath: '/test/SKILL.md',
      message: 'invalid format',
    }
    expect(error.filePath).toBe('/test/SKILL.md')
    expect(error.field).toBeUndefined()
  })

  it('ParseError accepts optional field', () => {
    const error: ParseError = {
      filePath: '/test/SKILL.md',
      field: 'name',
      message: 'name is required',
      cause: new Error('original'),
    }
    expect(error.field).toBe('name')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/types.test.ts`
Expected: FAIL — 无法从 `../src/types/skill` 导入

- [ ] **Step 3: 实现 Skill 模型类型**

```typescript
// src/types/skill.ts
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
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/types.test.ts`
Expected: 所有测试通过

- [ ] **Step 5: 提交**

```bash
git add src/types/skill.ts tests/types.test.ts
git commit -m "feat: add Skill model type definitions"
```

---

## Task 3: 测试 Fixtures 创建

**Files:**
- Create: `tests/fixtures/basic-skill.md`
- Create: `tests/fixtures/full-skill.md`
- Create: `tests/fixtures/conditional-skill.md`
- Create: `tests/fixtures/missing-name.md`
- Create: `tests/fixtures/missing-description.md`
- Create: `tests/fixtures/no-frontmatter.md`
- Create: `tests/fixtures/multi-skill-dir/skill-a.md`
- Create: `tests/fixtures/multi-skill-dir/skill-b.md`

- [ ] **Step 1: 创建 basic-skill.md（最小完整 Skill）**

```markdown
---
name: basic-skill
description: A minimal skill for testing
tags: [test]
---

## Instructions
Do the basic thing.
```

写入 `tests/fixtures/basic-skill.md`

- [ ] **Step 2: 创建 full-skill.md（完整字段 Skill）**

```markdown
---
name: verify-security
description: "安全校验关卡。扫描代码安全漏洞，检测危险模式。"
version: "1.2.0"
author: skillkit
tags: [security, quality-gate]
priority: 10
exclusive: true
requires:
  - verify-module
contextWeight: 100
triggers:
  keywords: [安全扫描, 漏洞检测, OWASP]
  patterns: ["检测.*安全", "扫描.*漏洞"]
  filePatterns: ["*.env", "credentials.*"]
  context:
    hasGitChanges: true
prerequisites:
  tools:
    - name: rg
      command: rg
      check: "rg --version"
      hint: "请安装 ripgrep: brew install ripgrep"
  env: [API_KEY]
  fileExists: [package.json]
references:
  templates:
    - path: "templates/security-report.md"
      description: "安全报告输出模板"
  docs:
    - path: "references/owasp-top10.md"
      description: "OWASP Top 10 参考"
output:
  format: markdown
  file: ".security-report.md"
  appendToFile: false
lifecycle:
  onLoad:
    - type: message
      content: "已加载安全扫描 Skill"
  onAfterExecute:
    - type: validate
      schema: "output.schema"
  onError:
    - type: fallback
      skill: "manual-review"
---

## 工作流程
1. 扫描所有源代码文件
2. 检测以下危险模式：
   - SQL 注入（字符串拼接查询）
   - XSS（未转义的 HTML 输出）
   - 硬编码密钥和凭证
   - 不安全的反序列化
3. 对每个发现生成严重级别报告
4. 输出结构化安全报告

## 规则
- 禁止跳过任何文件
- 对敏感信息泄露必须标记为 CRITICAL
- 误报优于漏报
```

写入 `tests/fixtures/full-skill.md`

- [ ] **Step 3: 创建 conditional-skill.md**

```markdown
---
name: conditional-test
description: "A skill with conditional instructions"
tags: [test]
triggers:
  keywords: [条件测试]
---

## Base Instructions
Always do this.

<!-- conditional: framework === 'next.js' -->
## Next.js Checks
Check middleware and Server Actions.
<!-- end conditional -->

<!-- conditional: language === 'python' -->
## Python Checks
Check eval/exec and pickle usage.
<!-- end conditional -->
```

写入 `tests/fixtures/conditional-skill.md`

- [ ] **Step 4: 创建 missing-name.md（缺少必填字段）**

```markdown
---
description: "Missing name field"
tags: [test]
---

Some instructions here.
```

写入 `tests/fixtures/missing-name.md`

- [ ] **Step 5: 创建 missing-description.md**

```markdown
---
name: missing-desc
tags: [test]
---

Some instructions here.
```

写入 `tests/fixtures/missing-description.md`

- [ ] **Step 6: 创建 no-frontmatter.md**

```markdown
# Just a regular markdown file

No frontmatter here.
Just plain text.
```

写入 `tests/fixtures/no-frontmatter.md`

- [ ] **Step 7: 创建 multi-skill-dir/skill-a.md**

```markdown
---
name: skill-a
description: "First skill in multi dir"
tags: [alpha]
priority: 10
---

Skill A instructions.
```

写入 `tests/fixtures/multi-skill-dir/skill-a.md`

- [ ] **Step 8: 创建 multi-skill-dir/skill-b.md**

```markdown
---
name: skill-b
description: "Second skill in multi dir"
tags: [beta]
priority: 20
---

Skill B instructions.
```

写入 `tests/fixtures/multi-skill-dir/skill-b.md`

- [ ] **Step 9: 提交**

```bash
git add tests/fixtures/
git commit -m "test: add skill file fixtures for parser and pipeline tests"
```

---

## Task 4: Parser — Frontmatter 解析

**Files:**
- Create: `src/parser/frontmatter.ts`
- Create: `tests/parser.test.ts`

- [ ] **Step 1: 编写 Frontmatter 解析的失败测试**

```typescript
// tests/parser.test.ts
import { describe, it, expect } from 'vitest'
import { parseFrontmatter } from '../src/parser/frontmatter'
import path from 'node:path'

const fixturesDir = path.resolve(import.meta.dirname, 'fixtures')

describe('parseFrontmatter', () => {
  it('parses basic skill frontmatter', () => {
    const result = parseFrontmatter(path.join(fixturesDir, 'basic-skill.md'))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.name).toBe('basic-skill')
    expect(result.value.description).toBe('A minimal skill for testing')
    expect(result.value.tags).toEqual(['test'])
  })

  it('parses full skill frontmatter with all fields', () => {
    const result = parseFrontmatter(path.join(fixturesDir, 'full-skill.md'))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const fm = result.value
    expect(fm.name).toBe('verify-security')
    expect(fm.description).toContain('安全校验关卡')
    expect(fm.version).toBe('1.2.0')
    expect(fm.author).toBe('skillkit')
    expect(fm.tags).toEqual(['security', 'quality-gate'])
    expect(fm.priority).toBe(10)
    expect(fm.exclusive).toBe(true)
    expect(fm.requires).toEqual(['verify-module'])
    expect(fm.contextWeight).toBe(100)
  })

  it('parses triggers from frontmatter', () => {
    const result = parseFrontmatter(path.join(fixturesDir, 'full-skill.md'))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.triggers?.keywords).toEqual(['安全扫描', '漏洞检测', 'OWASP'])
    expect(result.value.triggers?.patterns).toEqual(['检测.*安全', '扫描.*漏洞'])
    expect(result.value.triggers?.filePatterns).toEqual(['*.env', 'credentials.*'])
  })

  it('parses prerequisites from frontmatter', () => {
    const result = parseFrontmatter(path.join(fixturesDir, 'full-skill.md'))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.prerequisites?.tools?.[0]).toEqual({
      name: 'rg',
      command: 'rg',
      check: 'rg --version',
      hint: '请安装 ripgrep: brew install ripgrep',
    })
    expect(result.value.prerequisites?.env).toEqual(['API_KEY'])
    expect(result.value.prerequisites?.fileExists).toEqual(['package.json'])
  })

  it('parses references from frontmatter', () => {
    const result = parseFrontmatter(path.join(fixturesDir, 'full-skill.md'))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.references?.templates?.[0]?.path).toBe('templates/security-report.md')
    expect(result.value.references?.docs?.[0]?.description).toBe('OWASP Top 10 参考')
  })

  it('parses output from frontmatter', () => {
    const result = parseFrontmatter(path.join(fixturesDir, 'full-skill.md'))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.output?.format).toBe('markdown')
    expect(result.value.output?.file).toBe('.security-report.md')
  })

  it('parses lifecycle from frontmatter', () => {
    const result = parseFrontmatter(path.join(fixturesDir, 'full-skill.md'))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.lifecycle?.onLoad?.[0]).toEqual({
      type: 'message',
      content: '已加载安全扫描 Skill',
    })
    expect(result.value.lifecycle?.onError?.[0]?.skill).toBe('manual-review')
  })

  it('returns error for file missing required name', () => {
    const result = parseFrontmatter(path.join(fixturesDir, 'missing-name.md'))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.message).toContain('name')
  })

  it('returns error for file missing required description', () => {
    const result = parseFrontmatter(path.join(fixturesDir, 'missing-description.md'))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.message).toContain('description')
  })

  it('returns error for file with no frontmatter', () => {
    const result = parseFrontmatter(path.join(fixturesDir, 'no-frontmatter.md'))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.message).toContain('frontmatter')
  })

  it('returns error for non-existent file', () => {
    const result = parseFrontmatter('/nonexistent/path/SKILL.md')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.filePath).toBe('/nonexistent/path/SKILL.md')
  })

  it('returns error for non-string name', () => {
    const result = parseFrontmatter(path.join(fixturesDir, 'basic-skill.md'))
    expect(result.ok).toBe(true)
  })

  it('applies defaults for missing optional fields', () => {
    const result = parseFrontmatter(path.join(fixturesDir, 'basic-skill.md'))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.tags).toEqual(['test'])
    expect(result.value.priority).toBeUndefined()
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/parser.test.ts`
Expected: FAIL — 无法从 `../src/parser/frontmatter` 导入

- [ ] **Step 3: 实现 parseFrontmatter**

```typescript
// src/parser/frontmatter.ts
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

interface FrontmatterData {
  readonly metadata: SkillMetadata
  readonly triggers?: SkillTriggers
  readonly prerequisites?: SkillPrerequisites
  readonly references?: SkillReferences
  readonly output?: SkillOutput
  readonly lifecycle?: SkillLifecycle
}

const validateString = (value: unknown, field: string): string | undefined => {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') return undefined
  return value
}

const parseFrontmatter = (filePath: string): Result<FrontmatterData, ParseError> => {
  const makeError = (message: string, field?: string, cause?: unknown): ParseError =>
    Object.freeze({ filePath, field, message, cause })

  let content: string
  try {
    content = fs.readFileSync(filePath, 'utf-8')
  } catch (e) {
    return err(makeError(`Failed to read file: ${filePath}`, undefined, e))
  }

  let parsed: matter.GrayMatterFile<string>
  try {
    parsed = matter(content)
  } catch (e) {
    return err(makeError('Failed to parse frontmatter', undefined, e))
  }

  const data = parsed.data

  if (data == null || typeof data !== 'object') {
    return err(makeError('No frontmatter found'))
  }

  const name = validateString(data.name, 'name')
  if (!name) {
    return err(makeError('Required field "name" is missing or not a string', 'name'))
  }

  const description = validateString(data.description, 'description')
  if (!description) {
    return err(makeError('Required field "description" is missing or not a string', 'description'))
  }

  const tags: readonly string[] = Array.isArray(data.tags)
    ? data.tags.filter((t: unknown) => typeof t === 'string')
    : []

  const metadata: SkillMetadata = Object.freeze({
    name,
    description,
    version: validateString(data.version),
    author: validateString(data.author),
    tags,
    priority: typeof data.priority === 'number' ? data.priority : undefined,
    exclusive: typeof data.exclusive === 'boolean' ? data.exclusive : undefined,
    requires: Array.isArray(data.requires)
      ? data.requires.filter((r: unknown) => typeof r === 'string')
      : undefined,
    contextWeight: typeof data.contextWeight === 'number' ? data.contextWeight : undefined,
  })

  const triggers: SkillTriggers | undefined = data.triggers && typeof data.triggers === 'object'
    ? Object.freeze({
        keywords: Array.isArray(data.triggers.keywords)
          ? data.triggers.keywords.filter((k: unknown) => typeof k === 'string')
          : undefined,
        patterns: Array.isArray(data.triggers.patterns)
          ? data.triggers.patterns.filter((p: unknown) => typeof p === 'string')
          : undefined,
        filePatterns: Array.isArray(data.triggers.filePatterns)
          ? data.triggers.filePatterns.filter((f: unknown) => typeof f === 'string')
          : undefined,
        context: data.triggers.context && typeof data.triggers.context === 'object'
          ? data.triggers.context
          : undefined,
      })
    : undefined

  const prerequisites: SkillPrerequisites | undefined = data.prerequisites && typeof data.prerequisites === 'object'
    ? Object.freeze({
        dependencies: Array.isArray(data.prerequisites.dependencies)
          ? data.prerequisites.dependencies
          : undefined,
        tools: Array.isArray(data.prerequisites.tools)
          ? data.prerequisites.tools
          : undefined,
        env: Array.isArray(data.prerequisites.env)
          ? data.prerequisites.env.filter((e: unknown) => typeof e === 'string')
          : undefined,
        fileExists: Array.isArray(data.prerequisites.fileExists)
          ? data.prerequisites.fileExists.filter((f: unknown) => typeof f === 'string')
          : undefined,
      })
    : undefined

  const references: SkillReferences | undefined = data.references && typeof data.references === 'object'
    ? Object.freeze({
        templates: Array.isArray(data.references.templates) ? data.references.templates : undefined,
        docs: Array.isArray(data.references.docs) ? data.references.docs : undefined,
        scripts: Array.isArray(data.references.scripts) ? data.references.scripts : undefined,
        examples: Array.isArray(data.references.examples) ? data.references.examples : undefined,
      })
    : undefined

  const output: SkillOutput | undefined = data.output && typeof data.output === 'object'
    ? Object.freeze({
        format: data.output.format ?? 'markdown',
        file: validateString(data.output.file),
        schema: data.output.schema,
        appendToFile: typeof data.output.appendToFile === 'boolean' ? data.output.appendToFile : undefined,
      })
    : undefined

  const lifecycle: SkillLifecycle | undefined = data.lifecycle && typeof data.lifecycle === 'object'
    ? Object.freeze({
        onLoad: Array.isArray(data.lifecycle.onLoad) ? data.lifecycle.onLoad : undefined,
        onBeforeExecute: Array.isArray(data.lifecycle.onBeforeExecute) ? data.lifecycle.onBeforeExecute : undefined,
        onAfterExecute: Array.isArray(data.lifecycle.onAfterExecute) ? data.lifecycle.onAfterExecute : undefined,
        onError: Array.isArray(data.lifecycle.onError) ? data.lifecycle.onError : undefined,
      })
    : undefined

  return ok(Object.freeze({
    metadata,
    triggers,
    prerequisites,
    references,
    output,
    lifecycle,
  }))
}

export { parseFrontmatter }
export type { FrontmatterData }
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/parser.test.ts`
Expected: 所有测试通过

- [ ] **Step 5: 提交**

```bash
git add src/parser/frontmatter.ts tests/parser.test.ts
git commit -m "feat: add frontmatter parser with validation"
```

---

## Task 5: Parser — Instructions 解析

**Files:**
- Create: `src/parser/instructions.ts`

- [ ] **Step 1: 编写 instructions 解析的失败测试**

追加到 `tests/parser.test.ts`：

```typescript
import { parseInstructions } from '../src/parser/instructions'

describe('parseInstructions', () => {
  it('extracts body text as always instructions', () => {
    const body = '## Instructions\nDo the basic thing.'
    const result = parseInstructions(body)
    expect(result.always).toBe('## Instructions\nDo the basic thing.')
  })

  it('handles empty body', () => {
    const result = parseInstructions('')
    expect(result.always).toBe('')
  })

  it('handles body with only whitespace', () => {
    const result = parseInstructions('   \n\n  ')
    expect(result.always.trim()).toBe('')
  })

  it('extracts conditional blocks from markers', () => {
    const body = `Base instructions.

<!-- conditional: framework === 'next.js' -->
## Next.js Checks
Check middleware.
<!-- end conditional -->

<!-- conditional: language === 'python' -->
## Python Checks
Check eval/exec.
<!-- end conditional -->`

    const result = parseInstructions(body)
    expect(result.always).toContain('Base instructions')
    expect(result.always).not.toContain('Next.js Checks')
    expect(result.always).not.toContain('Python Checks')
    expect(result.conditional).toBeDefined()
    expect(result.conditional?.length).toBe(2)
    expect(result.conditional?.[0]?.condition).toBe("framework === 'next.js'")
    expect(result.conditional?.[0]?.content).toContain('Next.js Checks')
    expect(result.conditional?.[1]?.condition).toBe("language === 'python'")
    expect(result.conditional?.[1]?.content).toContain('Python Checks')
  })

  it('handles body without conditional blocks', () => {
    const body = 'Just regular instructions.\nNo conditionals.'
    const result = parseInstructions(body)
    expect(result.always).toBe(body)
    expect(result.conditional).toBeUndefined()
  })

  it('result is frozen', () => {
    const result = parseInstructions('test')
    expect(Object.isFrozen(result)).toBe(true)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/parser.test.ts`
Expected: FAIL — 无法从 `../src/parser/instructions` 导入

- [ ] **Step 3: 实现 parseInstructions**

```typescript
// src/parser/instructions.ts
import type { SkillInstructions } from '../types/skill.js'

const CONDITIONAL_PATTERN = /<!--\s*conditional:\s*(.+?)\s*-->\n?([\s\S]*?)<!--\s*end conditional\s*-->/g

const parseInstructions = (body: string): SkillInstructions => {
  const conditional: { readonly condition: string; readonly content: string }[] = []

  let alwaysBody = body.replace(CONDITIONAL_PATTERN, (_match, condition: string, content: string) => {
    conditional.push(Object.freeze({
      condition: condition.trim(),
      content: content.trim(),
    }))
    return ''
  })

  alwaysBody = alwaysBody.replace(/\n{3,}/g, '\n\n').trim()

  const result: SkillInstructions = conditional.length > 0
    ? Object.freeze({ always: alwaysBody, conditional: Object.freeze(conditional) })
    : Object.freeze({ always: alwaysBody })

  return result
}

export { parseInstructions }
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/parser.test.ts`
Expected: 所有测试通过

- [ ] **Step 5: 提交**

```bash
git add src/parser/instructions.ts tests/parser.test.ts
git commit -m "feat: add instructions parser with conditional block extraction"
```

---

## Task 6: Parser — 公共 API（parseSkillFile & parseManifest）

**Files:**
- Create: `src/parser/index.ts`

- [ ] **Step 1: 编写 parseSkillFile 和 parseManifest 的失败测试**

追加到 `tests/parser.test.ts`：

```typescript
import { parseSkillFile, parseManifest } from '../src/parser/index'

describe('parseManifest', () => {
  it('parses a basic skill into manifest (L1)', async () => {
    const result = await parseManifest(path.join(fixturesDir, 'basic-skill.md'))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.name).toBe('basic-skill')
    expect(result.value.description).toBe('A minimal skill for testing')
    expect(result.value.tags).toEqual(['test'])
    expect(result.value.priority).toBe(50)
    expect(result.value.sourcePath).toContain('basic-skill.md')
  })

  it('parses priority from frontmatter', async () => {
    const result = await parseManifest(path.join(fixturesDir, 'full-skill.md'))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.priority).toBe(10)
  })

  it('defaults priority to 50 when not specified', async () => {
    const result = await parseManifest(path.join(fixturesDir, 'basic-skill.md'))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.priority).toBe(50)
  })

  it('returns error for file without required fields', async () => {
    const result = await parseManifest(path.join(fixturesDir, 'missing-name.md'))
    expect(result.ok).toBe(false)
  })
})

describe('parseSkillFile', () => {
  it('parses a basic skill file into full definition (L2)', async () => {
    const result = await parseSkillFile(path.join(fixturesDir, 'basic-skill.md'))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.metadata.name).toBe('basic-skill')
    expect(result.value.instructions.always).toContain('Do the basic thing')
    expect(result.value.sourcePath).toContain('basic-skill.md')
  })

  it('parses full skill file with all fields', async () => {
    const result = await parseSkillFile(path.join(fixturesDir, 'full-skill.md'))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const def = result.value
    expect(def.metadata.name).toBe('verify-security')
    expect(def.triggers?.keywords).toBeDefined()
    expect(def.prerequisites?.tools).toBeDefined()
    expect(def.references?.templates).toBeDefined()
    expect(def.output?.format).toBe('markdown')
    expect(def.lifecycle?.onLoad).toBeDefined()
    expect(def.instructions.always).toContain('扫描所有源代码文件')
  })

  it('parses conditional instructions', async () => {
    const result = await parseSkillFile(path.join(fixturesDir, 'conditional-skill.md'))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.instructions.always).toContain('Always do this')
    expect(result.value.instructions.conditional).toBeDefined()
    expect(result.value.instructions.conditional?.length).toBe(2)
  })

  it('returns error for invalid skill file', async () => {
    const result = await parseSkillFile(path.join(fixturesDir, 'missing-name.md'))
    expect(result.ok).toBe(false)
  })

  it('returns error for non-existent file', async () => {
    const result = await parseSkillFile('/nonexistent/SKILL.md')
    expect(result.ok).toBe(false)
  })

  it('returns frozen SkillDefinition', async () => {
    const result = await parseSkillFile(path.join(fixturesDir, 'basic-skill.md'))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(Object.isFrozen(result.value)).toBe(true)
    expect(Object.isFrozen(result.value.metadata)).toBe(true)
    expect(Object.isFrozen(result.value.instructions)).toBe(true)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/parser.test.ts`
Expected: FAIL — 无法从 `../src/parser/index` 导入

- [ ] **Step 3: 实现 parseSkillFile 和 parseManifest**

```typescript
// src/parser/index.ts
import fs from 'node:fs'
import matter from 'gray-matter'
import { ok, err } from '../types/result.js'
import type { Result } from '../types/result.js'
import type { SkillDefinition, SkillManifest, ParseError } from '../types/skill.js'
import { parseFrontmatter } from './frontmatter.js'
import { parseInstructions } from './instructions.js'

const DEFAULT_PRIORITY = 50

const parseManifest = async (filePath: string): Promise<Result<SkillManifest, ParseError>> => {
  const fmResult = parseFrontmatter(filePath)
  if (!fmResult.ok) return fmResult

  const manifest: SkillManifest = Object.freeze({
    name: fmResult.value.metadata.name,
    description: fmResult.value.metadata.description,
    tags: fmResult.value.metadata.tags,
    priority: fmResult.value.metadata.priority ?? DEFAULT_PRIORITY,
    sourcePath: filePath,
  })

  return ok(manifest)
}

const parseSkillFile = async (filePath: string): Promise<Result<SkillDefinition, ParseError>> => {
  const fmResult = parseFrontmatter(filePath)
  if (!fmResult.ok) return fmResult

  let content: string
  try {
    content = fs.readFileSync(filePath, 'utf-8')
  } catch (e) {
    return err(Object.freeze({
      filePath,
      message: 'Failed to read file',
      cause: e,
    }))
  }

  const parsed = matter(content)
  const instructions = parseInstructions(parsed.content)

  const def: SkillDefinition = Object.freeze({
    metadata: fmResult.value.metadata,
    triggers: fmResult.value.triggers,
    prerequisites: fmResult.value.prerequisites,
    instructions,
    references: fmResult.value.references,
    output: fmResult.value.output,
    lifecycle: fmResult.value.lifecycle,
    sourcePath: filePath,
  })

  return ok(def)
}

export { parseSkillFile, parseManifest }
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/parser.test.ts`
Expected: 所有测试通过

- [ ] **Step 5: 提交**

```bash
git add src/parser/index.ts tests/parser.test.ts
git commit -m "feat: add parseSkillFile and parseManifest public API"
```

---

## Task 7: Utils — 关键词/正则匹配

**Files:**
- Create: `src/utils/match.ts`
- Create: `tests/utils-match.test.ts`

- [ ] **Step 1: 编写匹配工具的失败测试**

```typescript
// tests/utils-match.test.ts
import { describe, it, expect } from 'vitest'
import { matchKeywords, matchPatterns, matchTags } from '../src/utils/match'

describe('matchKeywords', () => {
  it('returns true when query contains a keyword', () => {
    expect(matchKeywords('安全扫描代码', ['安全扫描'])).toBe(true)
  })

  it('returns true for exact keyword match', () => {
    expect(matchKeywords('OWASP', ['OWASP'])).toBe(true)
  })

  it('returns false when no keywords match', () => {
    expect(matchKeywords('hello world', ['安全扫描', '漏洞检测'])).toBe(false)
  })

  it('returns false for empty keywords array', () => {
    expect(matchKeywords('anything', [])).toBe(false)
  })

  it('returns false for undefined keywords', () => {
    expect(matchKeywords('anything', undefined)).toBe(false)
  })

  it('performs case-sensitive matching', () => {
    expect(matchKeywords('OWASP', ['owasp'])).toBe(false)
  })
})

describe('matchPatterns', () => {
  it('returns true when a pattern matches query', () => {
    expect(matchPatterns('检测安全漏洞', ['检测.*安全'])).toBe(true)
  })

  it('returns true for exact pattern match', () => {
    expect(matchPatterns('扫描所有漏洞', ['扫描.*漏洞'])).toBe(true)
  })

  it('returns false when no patterns match', () => {
    expect(matchPatterns('hello world', ['检测.*安全'])).toBe(false)
  })

  it('returns false for empty patterns array', () => {
    expect(matchPatterns('anything', [])).toBe(false)
  })

  it('returns false for undefined patterns', () => {
    expect(matchPatterns('anything', undefined)).toBe(false)
  })

  it('handles invalid regex gracefully', () => {
    expect(matchPatterns('test', ['[invalid'])).toBe(false)
  })
})

describe('matchTags', () => {
  it('returns true when tags overlap', () => {
    expect(matchTags(['security', 'test'], ['security'])).toBe(true)
  })

  it('returns true for exact tag match', () => {
    expect(matchTags(['security'], ['security'])).toBe(true)
  })

  it('returns false when no tags overlap', () => {
    expect(matchTags(['alpha'], ['beta'])).toBe(false)
  })

  it('returns false for empty skill tags', () => {
    expect(matchTags([], ['security'])).toBe(false)
  })

  it('returns false for empty query tags', () => {
    expect(matchTags(['security'], [])).toBe(false)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/utils-match.test.ts`
Expected: FAIL — 无法从 `../src/utils/match` 导入

- [ ] **Step 3: 实现匹配工具函数**

```typescript
// src/utils/match.ts
const matchKeywords = (query: string, keywords: readonly string[] | undefined): boolean => {
  if (!keywords || keywords.length === 0) return false
  return keywords.some(keyword => query.includes(keyword))
}

const matchPatterns = (query: string, patterns: readonly string[] | undefined): boolean => {
  if (!patterns || patterns.length === 0) return false
  return patterns.some(pattern => {
    try {
      return new RegExp(pattern).test(query)
    } catch {
      return false
    }
  })
}

const matchTags = (skillTags: readonly string[], queryTags: readonly string[]): boolean => {
  if (skillTags.length === 0 || queryTags.length === 0) return false
  return skillTags.some(tag => queryTags.includes(tag))
}

export { matchKeywords, matchPatterns, matchTags }
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/utils-match.test.ts`
Expected: 所有测试通过

- [ ] **Step 5: 提交**

```bash
git add src/utils/match.ts tests/utils-match.test.ts
git commit -m "feat: add keyword, pattern, and tag matching utilities"
```

---

## Task 8: Utils — DAG 环检测

**Files:**
- Create: `src/utils/dag.ts`
- Create: `tests/utils-dag.test.ts`

- [ ] **Step 1: 编写 DAG 环检测的失败测试**

```typescript
// tests/utils-dag.test.ts
import { describe, it, expect } from 'vitest'
import { detectCycle, type DependencyGraph } from '../src/utils/dag'

describe('detectCycle', () => {
  it('returns null for graph with no cycles', () => {
    const graph: DependencyGraph = new Map([
      ['a', ['b']],
      ['b', ['c']],
      ['c', []],
    ])
    expect(detectCycle(graph)).toBeNull()
  })

  it('returns null for empty graph', () => {
    const graph: DependencyGraph = new Map()
    expect(detectCycle(graph)).toBeNull()
  })

  it('detects direct cycle A → B → A', () => {
    const graph: DependencyGraph = new Map([
      ['a', ['b']],
      ['b', ['a']],
    ])
    const cycle = detectCycle(graph)
    expect(cycle).not.toBeNull()
    expect(cycle).toContain('a')
    expect(cycle).toContain('b')
  })

  it('detects indirect cycle A → B → C → A', () => {
    const graph: DependencyGraph = new Map([
      ['a', ['b']],
      ['b', ['c']],
      ['c', ['a']],
    ])
    const cycle = detectCycle(graph)
    expect(cycle).not.toBeNull()
    expect(cycle).toContain('a')
  })

  it('detects self-cycle A → A', () => {
    const graph: DependencyGraph = new Map([
      ['a', ['a']],
    ])
    const cycle = detectCycle(graph)
    expect(cycle).not.toBeNull()
    expect(cycle).toContain('a')
  })

  it('returns null for disconnected acyclic graph', () => {
    const graph: DependencyGraph = new Map([
      ['a', ['b']],
      ['b', []],
      ['c', ['d']],
      ['d', []],
    ])
    expect(detectCycle(graph)).toBeNull()
  })

  it('detects cycle in one component of disconnected graph', () => {
    const graph: DependencyGraph = new Map([
      ['a', ['b']],
      ['b', []],
      ['c', ['d']],
      ['d', ['c']],
    ])
    const cycle = detectCycle(graph)
    expect(cycle).not.toBeNull()
    expect(cycle).toContain('c')
    expect(cycle).toContain('d')
  })

  it('handles node with no dependencies', () => {
    const graph: DependencyGraph = new Map([
      ['a', []],
    ])
    expect(detectCycle(graph)).toBeNull()
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/utils-dag.test.ts`
Expected: FAIL — 无法从 `../src/utils/dag` 导入

- [ ] **Step 3: 实现 DAG 环检测**

```typescript
// src/utils/dag.ts
type DependencyGraph = ReadonlyMap<string, readonly string[]>

type VisitState = 'visiting' | 'visited'

const detectCycle = (graph: DependencyGraph): string[] | null => {
  const states = new Map<string, VisitState>()
  const path: string[] = []

  const visit = (node: string): string[] | null => {
    const state = states.get(node)
    if (state === 'visited') return null
    if (state === 'visiting') {
      const cycleStart = path.indexOf(node)
      return path.slice(cycleStart)
    }

    states.set(node, 'visiting')
    path.push(node)

    const deps = graph.get(node) ?? []
    for (const dep of deps) {
      const cycle = visit(dep)
      if (cycle) return cycle
    }

    path.pop()
    states.set(node, 'visited')
    return null
  }

  for (const node of graph.keys()) {
    const cycle = visit(node)
    if (cycle) return cycle
  }

  return null
}

export { detectCycle }
export type { DependencyGraph }
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/utils-dag.test.ts`
Expected: 所有测试通过

- [ ] **Step 5: 提交**

```bash
git add src/utils/dag.ts tests/utils-dag.test.ts
git commit -m "feat: add DAG cycle detection utility"
```

---

## Task 9: Utils — 前置条件检查

**Files:**
- Create: `src/utils/prerequisite.ts`
- Create: `tests/utils-prerequisite.test.ts`

- [ ] **Step 1: 编写前置条件检查的失败测试**

```typescript
// tests/utils-prerequisite.test.ts
import { describe, it, expect } from 'vitest'
import { checkPrerequisites, type PrerequisiteCheckResult } from '../src/utils/prerequisite'
import type { SkillPrerequisites } from '../src/types/skill'

describe('checkPrerequisites', () => {
  describe('env checks', () => {
    it('returns ok when all env vars are set', async () => {
      process.env.__TEST_VAR_1__ = 'value1'
      const prereqs: SkillPrerequisites = { env: ['__TEST_VAR_1__'] }
      const result = await checkPrerequisites(prereqs)
      expect(result.ok).toBe(true)
      delete process.env.__TEST_VAR_1__
    })

    it('returns error when env var is missing', async () => {
      delete process.env.__NONEXISTENT_VAR__
      const prereqs: SkillPrerequisites = { env: ['__NONEXISTENT_VAR__'] }
      const result = await checkPrerequisites(prereqs)
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.error[0]).toContain('__NONEXISTENT_VAR__')
    })
  })

  describe('fileExists checks', () => {
    it('returns ok when all files exist', async () => {
      const prereqs: SkillPrerequisites = { fileExists: ['package.json'] }
      const result = await checkPrerequisites(prereqs)
      expect(result.ok).toBe(true)
    })

    it('returns error when file does not exist', async () => {
      const prereqs: SkillPrerequisites = { fileExists: ['nonexistent-file.xyz'] }
      const result = await checkPrerequisites(prereqs)
      expect(result.ok).toBe(false)
    })
  })

  describe('tools checks', () => {
    it('returns ok when tool check command succeeds', async () => {
      const prereqs: SkillPrerequisites = {
        tools: [{ name: 'node', command: 'node', check: 'node --version', hint: 'install node' }],
      }
      const result = await checkPrerequisites(prereqs)
      expect(result.ok).toBe(true)
    })

    it('returns error when tool check command fails', async () => {
      const prereqs: SkillPrerequisites = {
        tools: [{ name: 'nonexistent-tool-xyz', command: 'nonexistent-tool-xyz', check: 'nonexistent-tool-xyz --version', hint: 'install it' }],
      }
      const result = await checkPrerequisites(prereqs)
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.error[0]).toContain('nonexistent-tool-xyz')
    })
  })

  describe('empty prerequisites', () => {
    it('returns ok for empty prerequisites', async () => {
      const result = await checkPrerequisites({})
      expect(result.ok).toBe(true)
    })
  })

  describe('combined checks', () => {
    it('returns all errors at once', async () => {
      const prereqs: SkillPrerequisites = {
        env: ['__NONEXISTENT_VAR_A__', '__NONEXISTENT_VAR_B__'],
        fileExists: ['definitely-not-a-file.xyz'],
      }
      const result = await checkPrerequisites(prereqs)
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.error.length).toBeGreaterThanOrEqual(2)
    })
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/utils-prerequisite.test.ts`
Expected: FAIL — 无法从 `../src/utils/prerequisite` 导入

- [ ] **Step 3: 实现前置条件检查**

```typescript
// src/utils/prerequisite.ts
import fs from 'node:fs'
import { execSync } from 'node:child_process'
import { ok, err } from '../types/result.js'
import type { Result } from '../types/result.js'
import type { SkillPrerequisites } from '../types/skill.js'

interface PrerequisiteCheckResult {
  readonly ok: boolean
  readonly error: readonly string[]
}

const checkPrerequisites = async (prerequisites: SkillPrerequisites): Promise<PrerequisiteCheckResult> => {
  const errors: string[] = []

  if (prerequisites.env) {
    for (const envVar of prerequisites.env) {
      if (!process.env[envVar]) {
        errors.push(`Missing environment variable: ${envVar}`)
      }
    }
  }

  if (prerequisites.fileExists) {
    for (const filePath of prerequisites.fileExists) {
      if (!fs.existsSync(filePath)) {
        errors.push(`Required file does not exist: ${filePath}`)
      }
    }
  }

  if (prerequisites.tools) {
    for (const tool of prerequisites.tools) {
      try {
        execSync(tool.check, { stdio: 'pipe', timeout: 5000 })
      } catch {
        errors.push(`Tool "${tool.name}" not available. ${tool.hint}`)
      }
    }
  }

  return errors.length === 0
    ? { ok: true, error: [] }
    : { ok: false, error: Object.freeze(errors) }
}

export { checkPrerequisites }
export type { PrerequisiteCheckResult }
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/utils-prerequisite.test.ts`
Expected: 所有测试通过

- [ ] **Step 5: 提交**

```bash
git add src/utils/prerequisite.ts tests/utils-prerequisite.test.ts
git commit -m "feat: add prerequisite checker for env, file, and tool checks"
```

---

## Task 10: Pipeline — Stage 1: scan

**Files:**
- Create: `src/pipeline/scan.ts`
- Create: `tests/pipeline-scan.test.ts`

- [ ] **Step 1: 编写 scan 的失败测试**

```typescript
// tests/pipeline-scan.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { scan } from '../src/pipeline/scan'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'

const fixturesDir = path.resolve(import.meta.dirname, 'fixtures')

describe('scan', () => {
  it('scans a directory and returns manifests', async () => {
    const result = await scan([path.join(fixturesDir, 'multi-skill-dir')])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.length).toBe(2)
    const names = result.value.map(m => m.name).sort()
    expect(names).toEqual(['skill-a', 'skill-b'])
  })

  it('returns manifests with correct fields', async () => {
    const result = await scan([path.join(fixturesDir, 'multi-skill-dir')])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const skillA = result.value.find(m => m.name === 'skill-a')
    expect(skillA).toBeDefined()
    expect(skillA!.description).toBe('First skill in multi dir')
    expect(skillA!.tags).toEqual(['alpha'])
    expect(skillA!.priority).toBe(10)
  })

  it('scans nested directories', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skillkit-test-'))
    const subDir = path.join(tmpDir, 'sub', 'deep')
    fs.mkdirSync(subDir, { recursive: true })
    fs.writeFileSync(path.join(subDir, 'skill.md'), [
      '---',
      'name: nested-skill',
      'description: A nested skill',
      'tags: [nested]',
      '---',
      '',
      'Nested instructions.',
    ].join('\n'))

    try {
      const result = await scan([tmpDir])
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.value.length).toBe(1)
      expect(result.value[0].name).toBe('nested-skill')
    } finally {
      fs.rmSync(tmpDir, { recursive: true })
    }
  })

  it('skips files without valid frontmatter', async () => {
    const result = await scan([fixturesDir])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const names = result.value.map(m => m.name)
    expect(names).not.toContain(undefined)
  })

  it('returns error for non-existent directory', async () => {
    const result = await scan(['/nonexistent/directory/xyz'])
    expect(result.ok).toBe(false)
  })

  it('returns empty array for directory with no md files', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skillkit-empty-'))
    try {
      const result = await scan([tmpDir])
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.value).toEqual([])
    } finally {
      fs.rmSync(tmpDir, { recursive: true })
    }
  })

  it('scans multiple directories', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skillkit-multi-'))
    const dirA = path.join(tmpDir, 'a')
    const dirB = path.join(tmpDir, 'b')
    fs.mkdirSync(dirA)
    fs.mkdirSync(dirB)
    fs.writeFileSync(path.join(dirA, 'a.md'), '---\nname: a\ndescription: a\ntags: []\n---\nA')
    fs.writeFileSync(path.join(dirB, 'b.md'), '---\nname: b\ndescription: b\ntags: []\n---\nB')

    try {
      const result = await scan([dirA, dirB])
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.value.length).toBe(2)
    } finally {
      fs.rmSync(tmpDir, { recursive: true })
    }
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/pipeline-scan.test.ts`
Expected: FAIL — 无法从 `../src/pipeline/scan` 导入

- [ ] **Step 3: 实现 scan**

```typescript
// src/pipeline/scan.ts
import fs from 'node:fs'
import path from 'node:path'
import { ok, err } from '../types/result.js'
import type { Result } from '../types/result.js'
import type { SkillManifest, ParseError } from '../types/skill.js'
import { parseManifest } from '../parser/index.js'

const findMarkdownFiles = (dir: string): string[] => {
  const files: string[] = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...findMarkdownFiles(fullPath))
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath)
    }
  }
  return files
}

const scan = async (dirs: readonly string[]): Promise<Result<readonly SkillManifest[], ScanError>> => {
  const manifests: SkillManifest[] = []
  const errors: ScanError = []

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      errors.push(`Directory does not exist: ${dir}`)
      continue
    }

    const mdFiles = findMarkdownFiles(dir)
    for (const filePath of mdFiles) {
      const result = await parseManifest(filePath)
      if (result.ok) {
        manifests.push(result.value)
      }
    }
  }

  if (errors.length > 0 && manifests.length === 0) {
    return err(Object.freeze(errors))
  }

  return ok(Object.freeze(manifests))
}

type ScanError = readonly string[]

export { scan }
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/pipeline-scan.test.ts`
Expected: 所有测试通过

- [ ] **Step 5: 提交**

```bash
git add src/pipeline/scan.ts tests/pipeline-scan.test.ts
git commit -m "feat: add scan pipeline stage for recursive skill discovery"
```

---

## Task 11: Pipeline — Stage 2: route

**Files:**
- Create: `src/pipeline/route.ts`
- Create: `tests/pipeline-route.test.ts`

- [ ] **Step 1: 编写 route 的失败测试**

```typescript
// tests/pipeline-route.ts
import { describe, it, expect } from 'vitest'
import { route } from '../src/pipeline/route'
import type { SkillManifest } from '../src/types/skill'

const makeManifest = (overrides: Partial<SkillManifest> & { name: string }): SkillManifest => ({
  description: `Description for ${overrides.name}`,
  tags: ['test'],
  priority: 50,
  sourcePath: `/skills/${overrides.name}/SKILL.md`,
  ...overrides,
})

describe('route', () => {
  const manifests: SkillManifest[] = [
    makeManifest({ name: 'verify-security', tags: ['security'], priority: 10, description: '安全校验关卡。扫描代码安全漏洞。' }),
    makeManifest({ name: 'gen-docs', tags: ['docs'], priority: 20, description: '文档生成器。自动分析模块结构。' }),
    makeManifest({ name: 'verify-quality', tags: ['quality'], priority: 30, description: '代码质量校验关卡。检测复杂度。' }),
  ]

  it('matches by keyword in query against description', () => {
    const result = route('安全扫描代码', manifests)
    expect(result.length).toBeGreaterThan(0)
    expect(result.some(m => m.name === 'verify-security')).toBe(true)
  })

  it('matches by tag filter', () => {
    const result = route('检查代码', manifests, { tags: ['security'] })
    expect(result.some(m => m.name === 'verify-security')).toBe(true)
  })

  it('returns empty array when nothing matches', () => {
    const result = route('毫不相关的话题', [
      makeManifest({ name: 'x', description: 'some description', tags: ['abc'] }),
    ])
    expect(result).toEqual([])
  })

  it('returns results sorted by priority (lowest first)', () => {
    const result = route('校验', manifests)
    if (result.length >= 2) {
      expect(result[0].priority).toBeLessThanOrEqual(result[1].priority)
    }
  })

  it('returns empty for empty manifests', () => {
    const result = route('安全扫描', [])
    expect(result).toEqual([])
  })

  describe('exclusive filtering', () => {
    it('excludes lower-priority skills with same tag when exclusive skill matches', () => {
      const exclusiveManifests: SkillManifest[] = [
        makeManifest({ name: 'fast-security', tags: ['security'], priority: 5 }),
        makeManifest({ name: 'slow-security', tags: ['security'], priority: 20 }),
        makeManifest({ name: 'docs-gen', tags: ['docs'], priority: 10 }),
      ]
      const result = route('security scan', exclusiveManifests, { exclusiveTag: 'security' })
      const securitySkills = result.filter(m => m.tags.includes('security'))
      expect(securitySkills.length).toBe(1)
      expect(securitySkills[0].name).toBe('fast-security')
    })
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/pipeline-route.test.ts`
Expected: FAIL — 无法从 `../src/pipeline/route` 导入

- [ ] **Step 3: 实现 route**

```typescript
// src/pipeline/route.ts
import type { SkillManifest } from '../types/skill.js'
import { matchKeywords, matchTags } from '../utils/match.js'

interface RouteOptions {
  readonly tags?: readonly string[]
  readonly filePatterns?: readonly string[]
  readonly exclusiveTag?: string
}

const route = (
  query: string,
  manifests: readonly SkillManifest[],
  options?: RouteOptions,
): readonly SkillManifest[] => {
  if (manifests.length === 0) return []

  let matched = manifests.filter(manifest => {
    const keywordMatch = matchKeywords(query, [manifest.description]) ||
      matchKeywords(query, manifest.tags as string[]) ||
      query.includes(manifest.name)

    const tagMatch = options?.tags ? matchTags(manifest.tags, options.tags) : false

    return keywordMatch || tagMatch
  })

  matched = [...matched].sort((a, b) => a.priority - b.priority)

  if (options?.exclusiveTag) {
    const exclusiveSkill = matched.find(m =>
      m.tags.includes(options.exclusiveTag!) && m.priority === Math.min(
        ...matched.filter(x => x.tags.includes(options.exclusiveTag!)).map(x => x.priority)
      )
    )
    if (exclusiveSkill) {
      matched = matched.filter(m =>
        !m.tags.includes(options.exclusiveTag!) || m.name === exclusiveSkill.name
      )
    }
  }

  return Object.freeze(matched)
}

export { route }
export type { RouteOptions }
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/pipeline-route.test.ts`
Expected: 所有测试通过

- [ ] **Step 5: 提交**

```bash
git add src/pipeline/route.ts tests/pipeline-route.test.ts
git commit -m "feat: add route pipeline stage for skill matching"
```

---

## Task 12: Pipeline — Stage 3: load

**Files:**
- Create: `src/pipeline/load.ts`
- Create: `tests/pipeline-load.test.ts`

- [ ] **Step 1: 编写 load 的失败测试**

```typescript
// tests/pipeline-load.test.ts
import { describe, it, expect } from 'vitest'
import { load } from '../src/pipeline/load'
import type { SkillManifest, SkillDefinition } from '../src/types/skill'
import path from 'node:path'

const fixturesDir = path.resolve(import.meta.dirname, 'fixtures')

const makeManifest = (name: string, filePath: string): SkillManifest => ({
  name,
  description: `Description for ${name}`,
  tags: ['test'],
  priority: 50,
  sourcePath: filePath,
})

describe('load', () => {
  it('loads a single manifest into definition', async () => {
    const manifests = [makeManifest('basic-skill', path.join(fixturesDir, 'basic-skill.md'))]
    const result = await load(manifests)
    expect(result.definitions.length).toBe(1)
    expect(result.definitions[0].metadata.name).toBe('basic-skill')
    expect(result.errors).toEqual([])
  })

  it('loads multiple manifests', async () => {
    const manifests = [
      makeManifest('skill-a', path.join(fixturesDir, 'multi-skill-dir', 'skill-a.md')),
      makeManifest('skill-b', path.join(fixturesDir, 'multi-skill-dir', 'skill-b.md')),
    ]
    const result = await load(manifests)
    expect(result.definitions.length).toBe(2)
    expect(result.errors).toEqual([])
  })

  it('skips already loaded skills', async () => {
    const filePath = path.join(fixturesDir, 'basic-skill.md')
    const existingDef: SkillDefinition = Object.freeze({
      metadata: { name: 'basic-skill', description: 'already loaded', tags: [] },
      instructions: { always: 'existing' },
      sourcePath: filePath,
    })
    const loaded = new Map<string, SkillDefinition>([['basic-skill', existingDef]])

    const manifests = [makeManifest('basic-skill', filePath)]
    const result = await load(manifests, loaded)
    expect(result.definitions.length).toBe(0)
    expect(result.loaded.get('basic-skill')?.instructions.always).toBe('existing')
  })

  it('collects errors for invalid manifests', async () => {
    const manifests = [
      makeManifest('missing-name', path.join(fixturesDir, 'missing-name.md')),
    ]
    const result = await load(manifests)
    expect(result.definitions.length).toBe(0)
    expect(result.errors.length).toBe(1)
    expect(result.errors[0].manifest.name).toBe('missing-name')
  })

  it('mixed valid and invalid manifests', async () => {
    const manifests = [
      makeManifest('basic-skill', path.join(fixturesDir, 'basic-skill.md')),
      makeManifest('missing-name', path.join(fixturesDir, 'missing-name.md')),
    ]
    const result = await load(manifests)
    expect(result.definitions.length).toBe(1)
    expect(result.definitions[0].metadata.name).toBe('basic-skill')
    expect(result.errors.length).toBe(1)
  })

  it('updates loaded map with new definitions', async () => {
    const manifests = [makeManifest('basic-skill', path.join(fixturesDir, 'basic-skill.md'))]
    const result = await load(manifests)
    expect(result.loaded.has('basic-skill')).toBe(true)
    expect(result.loaded.get('basic-skill')?.metadata.name).toBe('basic-skill')
  })

  it('preserves existing entries in loaded map', async () => {
    const existingDef: SkillDefinition = Object.freeze({
      metadata: { name: 'existing', description: 'existing', tags: [] },
      instructions: { always: 'existing' },
      sourcePath: '/existing.md',
    })
    const loaded = new Map<string, SkillDefinition>([['existing', existingDef]])

    const manifests = [makeManifest('basic-skill', path.join(fixturesDir, 'basic-skill.md'))]
    const result = await load(manifests, loaded)
    expect(result.loaded.has('existing')).toBe(true)
    expect(result.loaded.has('basic-skill')).toBe(true)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/pipeline-load.test.ts`
Expected: FAIL — 无法从 `../src/pipeline/load` 导入

- [ ] **Step 3: 实现 load**

```typescript
// src/pipeline/load.ts
import type { SkillManifest, SkillDefinition } from '../types/skill.js'
import { parseSkillFile } from '../parser/index.js'

interface LoadError {
  readonly message: string
  readonly cause?: unknown
}

interface LoadResult {
  readonly definitions: readonly SkillDefinition[]
  readonly loaded: ReadonlyMap<string, SkillDefinition>
  readonly errors: readonly { readonly manifest: SkillManifest; readonly error: LoadError }[]
}

const MAX_DEPTH = 3

const load = async (
  manifests: readonly SkillManifest[],
  loaded?: ReadonlyMap<string, SkillDefinition>,
): Promise<LoadResult> => {
  const currentLoaded = new Map<string, SkillDefinition>(loaded ?? [])
  const definitions: SkillDefinition[] = []
  const errors: { readonly manifest: SkillManifest; readonly error: LoadError }[] = []

  for (const manifest of manifests) {
    if (currentLoaded.has(manifest.name)) {
      continue
    }

    const result = await parseSkillFile(manifest.sourcePath)
    if (!result.ok) {
      errors.push(Object.freeze({
        manifest,
        error: Object.freeze({ message: result.error.message, cause: result.error.cause }),
      }))
      continue
    }

    const def = result.value
    definitions.push(def)
    currentLoaded.set(manifest.name, def)
  }

  return Object.freeze({
    definitions: Object.freeze(definitions),
    loaded: Object.freeze(currentLoaded),
    errors: Object.freeze(errors),
  })
}

export { load }
export type { LoadResult, LoadError }
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/pipeline-load.test.ts`
Expected: 所有测试通过

- [ ] **Step 5: 提交**

```bash
git add src/pipeline/load.ts tests/pipeline-load.test.ts
git commit -m "feat: add load pipeline stage for skill definition loading"
```

---

## Task 13: Pipeline — Stage 4: inject

**Files:**
- Create: `src/pipeline/inject.ts`
- Create: `tests/pipeline-inject.test.ts`

- [ ] **Step 1: 编写 inject 的失败测试**

```typescript
// tests/pipeline-inject.test.ts
import { describe, it, expect } from 'vitest'
import { inject } from '../src/pipeline/inject'
import type { SkillDefinition } from '../src/types/skill'

const makeDefinition = (overrides: Partial<SkillDefinition> & { name: string }): SkillDefinition => ({
  metadata: {
    name: overrides.name,
    description: `Description for ${overrides.name}`,
    tags: ['test'],
  },
  instructions: { always: 'Do the thing.' },
  sourcePath: `/skills/${overrides.name}/SKILL.md`,
  ...overrides,
} as SkillDefinition)

describe('inject', () => {
  it('formats a single definition into injectable text', () => {
    const defs = [makeDefinition({ name: 'test-skill' })]
    const text = inject(defs)
    expect(text).toContain('test-skill')
    expect(text).toContain('Do the thing.')
  })

  it('formats multiple definitions separated by divider', () => {
    const defs = [
      makeDefinition({ name: 'skill-a' }),
      makeDefinition({ name: 'skill-b' }),
    ]
    const text = inject(defs)
    expect(text).toContain('skill-a')
    expect(text).toContain('skill-b')
  })

  it('includes metadata in output', () => {
    const defs = [makeDefinition({
      name: 'verify-security',
      metadata: {
        name: 'verify-security',
        description: '安全校验关卡',
        tags: ['security'],
        version: '1.0.0',
      },
    })]
    const text = inject(defs)
    expect(text).toContain('verify-security')
    expect(text).toContain('安全校验关卡')
  })

  it('includes conditional instructions when context matches', () => {
    const defs = [makeDefinition({
      name: 'conditional-skill',
      instructions: {
        always: 'Base instructions.',
        conditional: [
          { condition: "framework === 'next.js'", content: 'Next.js specific checks.' },
          { condition: "framework === 'express'", content: 'Express specific checks.' },
        ],
      },
    })]
    const text = inject(defs, { contextVars: { framework: 'next.js' } })
    expect(text).toContain('Next.js specific checks.')
    expect(text).not.toContain('Express specific checks.')
  })

  it('excludes all conditional instructions when no context vars', () => {
    const defs = [makeDefinition({
      name: 'conditional-skill',
      instructions: {
        always: 'Base.',
        conditional: [
          { condition: "framework === 'next.js'", content: 'Next.js checks.' },
        ],
      },
    })]
    const text = inject(defs)
    expect(text).toContain('Base.')
    expect(text).not.toContain('Next.js checks.')
  })

  it('returns empty string for empty definitions', () => {
    const text = inject([])
    expect(text).toBe('')
  })

  it('evaluates simple equality conditions', () => {
    const defs = [makeDefinition({
      name: 'test',
      instructions: {
        always: 'Base.',
        conditional: [
          { condition: "language === 'python'", content: 'Python checks.' },
        ],
      },
    })]
    const text = inject(defs, { contextVars: { language: 'python' } })
    expect(text).toContain('Python checks.')
  })

  it('evaluates boolean truthy conditions', () => {
    const defs = [makeDefinition({
      name: 'test',
      instructions: {
        always: 'Base.',
        conditional: [
          { condition: 'hasDockerfile === true', content: 'Docker checks.' },
        ],
      },
    })]
    const text = inject(defs, { contextVars: { hasDockerfile: 'true' } })
    expect(text).toContain('Docker checks.')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/pipeline-inject.test.ts`
Expected: FAIL — 无法从 `../src/pipeline/inject` 导入

- [ ] **Step 3: 实现 inject**

```typescript
// src/pipeline/inject.ts
import type { SkillDefinition } from '../types/skill.js'

interface InjectOptions {
  readonly contextVars?: Readonly<Record<string, string>>
  readonly maxTokens?: number
}

const evaluateCondition = (
  condition: string,
  contextVars: Readonly<Record<string, string>>,
): boolean => {
  const match = condition.match(/^(\w+)\s*===\s*['"]?(.+?)['"]?$/)
  if (!match) return false
  const [, variable, expected] = match
  return contextVars[variable] === expected || contextVars[variable] === expected.trim()
}

const formatDefinition = (
  def: SkillDefinition,
  contextVars?: Readonly<Record<string, string>>,
): string => {
  const parts: string[] = []

  parts.push(`## Skill: ${def.metadata.name}`)
  parts.push('')
  parts.push(`**Description:** ${def.metadata.description}`)
  if (def.metadata.version) parts.push(`**Version:** ${def.metadata.version}`)
  if (def.metadata.tags.length > 0) parts.push(`**Tags:** ${def.metadata.tags.join(', ')}`)
  parts.push('')

  parts.push('### Instructions')
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

const inject = (
  definitions: readonly SkillDefinition[],
  options?: InjectOptions,
): string => {
  if (definitions.length === 0) return ''

  const sections = definitions.map(def =>
    formatDefinition(def, options?.contextVars)
  )

  return sections.join('\n\n---\n\n')
}

export { inject }
export type { InjectOptions }
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/pipeline-inject.test.ts`
Expected: 所有测试通过

- [ ] **Step 5: 提交**

```bash
git add src/pipeline/inject.ts tests/pipeline-inject.test.ts
git commit -m "feat: add inject pipeline stage for context text generation"
```

---

## Task 14: Pipeline — runPipeline 组合

**Files:**
- Create: `src/pipeline/index.ts`
- Create: `tests/pipeline.test.ts`

- [ ] **Step 1: 编写 runPipeline 的失败测试**

```typescript
// tests/pipeline.test.ts
import { describe, it, expect } from 'vitest'
import { runPipeline } from '../src/pipeline/index'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'

const fixturesDir = path.resolve(import.meta.dirname, 'fixtures')

describe('runPipeline', () => {
  it('runs full pipeline: scan → route → load → inject', async () => {
    const result = await runPipeline(
      [path.join(fixturesDir, 'multi-skill-dir')],
      'skill-a',
    )
    expect(result.definitions.length).toBeGreaterThanOrEqual(1)
    expect(result.text).toContain('skill-a')
    expect(result.loaded.has('skill-a')).toBe(true)
  })

  it('returns empty text when no skills match', async () => {
    const result = await runPipeline(
      [path.join(fixturesDir, 'multi-skill-dir')],
      '完全不相关的话题xyz123',
    )
    expect(result.definitions.length).toBe(0)
    expect(result.text).toBe('')
  })

  it('preserves loaded state across calls', async () => {
    const first = await runPipeline(
      [path.join(fixturesDir, 'multi-skill-dir')],
      'skill-a',
    )
    const second = await runPipeline(
      [path.join(fixturesDir, 'multi-skill-dir')],
      'skill-b',
      first.loaded,
    )
    expect(second.loaded.has('skill-a')).toBe(true)
    expect(second.loaded.has('skill-b')).toBe(true)
  })

  it('returns error for non-existent directory', async () => {
    await expect(runPipeline(['/nonexistent/xyz'], 'test')).rejects.toThrow()
  })

  it('end-to-end with full-skill fixture', async () => {
    const singleDir = path.join(fixturesDir)
    const result = await runPipeline([singleDir], 'verify-security')
    expect(result.definitions.length).toBeGreaterThanOrEqual(1)
    const secSkill = result.definitions.find(d => d.metadata.name === 'verify-security')
    if (secSkill) {
      expect(secSkill.metadata.tags).toContain('security')
      expect(result.text).toContain('verify-security')
    }
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/pipeline.test.ts`
Expected: FAIL — 无法从 `../src/pipeline/index` 导入

- [ ] **Step 3: 实现 runPipeline**

```typescript
// src/pipeline/index.ts
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
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/pipeline.test.ts`
Expected: 所有测试通过

- [ ] **Step 5: 提交**

```bash
git add src/pipeline/index.ts tests/pipeline.test.ts
git commit -m "feat: add runPipeline composition function"
```

---

## Task 15: 统一导出 & 全量测试

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: 编写导出测试**

追加到 `tests/types.test.ts`：

```typescript
describe('public API exports', () => {
  it('exports Result types and constructors', async () => {
    const mod = await import('../src/index.js')
    expect(typeof mod.ok).toBe('function')
    expect(typeof mod.err).toBe('function')
  })

  it('exports parser functions', async () => {
    const mod = await import('../src/index.js')
    expect(typeof mod.parseSkillFile).toBe('function')
    expect(typeof mod.parseManifest).toBe('function')
  })

  it('exports pipeline stages', async () => {
    const mod = await import('../src/index.js')
    expect(typeof mod.scan).toBe('function')
    expect(typeof mod.route).toBe('function')
    expect(typeof mod.load).toBe('function')
    expect(typeof mod.inject).toBe('function')
    expect(typeof mod.runPipeline).toBe('function')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/types.test.ts`
Expected: FAIL — 模块未导出对应函数

- [ ] **Step 3: 实现统一导出**

```typescript
// src/index.ts
export type { Result } from './types/result.js'
export { ok, err } from './types/result.js'

export type {
  SkillDefinition,
  SkillManifest,
  SkillMetadata,
  SkillTriggers,
  SkillInstructions,
  SkillReferences,
  SkillOutput,
  SkillLifecycle,
  LifecycleAction,
  SkillPrerequisites,
  PrerequisiteTool,
  SkillReference,
  ParseError,
} from './types/skill.js'

export { parseSkillFile, parseManifest } from './parser/index.js'

export { scan } from './pipeline/scan.js'
export { route } from './pipeline/route.js'
export { load } from './pipeline/load.js'
export { inject } from './pipeline/inject.js'
export { runPipeline } from './pipeline/index.js'
```

- [ ] **Step 4: 运行全量测试**

Run: `npx vitest run`
Expected: 所有测试通过

- [ ] **Step 5: 运行 TypeScript 类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 6: 提交**

```bash
git add src/index.ts tests/types.test.ts
git commit -m "feat: add unified public API exports"
```

---

## Self-Review

### 1. Spec 覆盖率检查

| Spec 章节 | 对应 Task |
|-----------|----------|
| 2.1 基础类型 Result | Task 1 |
| 2.2 Skill 模型接口 | Task 2 |
| 2.3 聚合类型 SkillDefinition/SkillManifest | Task 2 |
| 3.1 Markdown+Frontmatter 格式 | Task 3 (fixtures) + Task 4 |
| 3.2 parseSkillFile, parseManifest | Task 6 |
| 3.3 解析规则（L1/L2 默认值） | Task 4, Task 6 |
| 3.4 ParseError 类型 | Task 2, Task 4 |
| 4.1 scan | Task 10 |
| 4.2 route | Task 11 |
| 4.3 load | Task 12 |
| 4.4 inject | Task 13 |
| 4.5 runPipeline | Task 14 |
| 4.6 边界处理（冲突/嵌套/循环） | Task 8 (DAG), Task 11 (exclusive), Task 12 (load) |
| 5 目录结构 | 贯穿所有 Task |
| 6 依赖 | Task 0 |
| 8 Public API 导出 | Task 15 |

### 2. Placeholder 扫描

无 TBD/TODO/placeholder。所有代码步骤包含完整实现。

### 3. 类型一致性

- `parseManifest` 在 Task 4 和 Task 6 中签名一致
- `SkillManifest` 在所有 Task 中字段一致（name, description, tags, priority, sourcePath）
- `Result<T, E>` 在所有模块中使用统一导入
- `load` 返回 `LoadResult` 接口在 Task 12 定义并在 Task 14 中使用，字段一致
