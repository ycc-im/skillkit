# Skillkit Core — 设计文档

> 日期: 2026-04-14
> 状态: Draft
> 范围: v1 — 核心模型 + 调度引擎

## 1. 概述

Skillkit 是一个 TypeScript 工具库，为 AI Agent 框架提供 Skill 管理和调度能力。它将散落在 Markdown 文件中的 Skill 指令结构化，并通过三级懒加载调度引擎（Manifest → Instructions → References）按需注入 LLM 上下文。

### 1.1 目标消费者

AI Agent 框架（如 LangChain、Mastra 等），需要「插件/技能管理 + 懒加载调度」能力的产品。

### 1.2 核心约束

| 约束 | 选择 |
|------|------|
| 语言 | TypeScript |
| 风格 | 实用函数式（Result + async/await + readonly，无 class、无全局可变状态） |
| 运行环境 | Node.js only |
| Skill 来源 | 本地文件系统 only |
| Skill 文件格式 | Markdown + Frontmatter |
| 包结构 | 单包 `@skillkit/core` |
| 架构 | Pipeline（纯函数组合） |
| 运行时依赖 | gray-matter only |
| 开发方法 | TDD（测试先行） |

## 2. 核心类型层

### 2.1 基础类型

```typescript
// src/types/result.ts
type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E }

const ok = <T>(value: T): Result<T, never> => ({ ok: true, value })
const err = <E>(error: E): Result<never, E> => ({ ok: false, error })
```

### 2.2 Skill 模型

对应文档 SKILL-DEFINITION.md 中的 7 个部分，所有字段使用 `readonly`：

```typescript
// src/types/skill.ts

interface SkillMetadata {
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

interface SkillTriggers {
  readonly keywords?: readonly string[]
  readonly patterns?: readonly string[]
  readonly filePatterns?: readonly string[]
  readonly context?: Readonly<Record<string, boolean | string | undefined>>
}

interface PrerequisiteTool {
  readonly name: string
  readonly command: string
  readonly check: string
  readonly hint: string
}

interface SkillPrerequisites {
  readonly dependencies?: readonly { readonly name: string; readonly version?: string }[]
  readonly tools?: readonly PrerequisiteTool[]
  readonly env?: readonly string[]
  readonly fileExists?: readonly string[]
}

interface SkillInstructions {
  readonly always: string
  readonly conditional?: readonly {
    readonly condition: string
    readonly content: string
  }[]
}

interface SkillReference {
  readonly path: string
  readonly description: string
  readonly runtime?: 'bash' | 'node'
  readonly maxSize?: string
  readonly chunkStrategy?: 'heading' | 'paragraph' | 'size'
}

interface SkillReferences {
  readonly templates?: readonly SkillReference[]
  readonly docs?: readonly SkillReference[]
  readonly scripts?: readonly SkillReference[]
  readonly examples?: readonly SkillReference[]
}

interface SkillOutput {
  readonly format: 'markdown' | 'json' | 'sarif' | 'stdout'
  readonly file?: string
  readonly schema?: Record<string, unknown>
  readonly appendToFile?: boolean
}

interface LifecycleAction {
  readonly type: 'script' | 'message' | 'check' | 'validate' | 'fallback'
  readonly path?: string
  readonly content?: string
  readonly condition?: string
  readonly message?: string
  readonly schema?: string
  readonly skill?: string
}

interface SkillLifecycle {
  readonly onLoad?: readonly LifecycleAction[]
  readonly onBeforeExecute?: readonly LifecycleAction[]
  readonly onAfterExecute?: readonly LifecycleAction[]
  readonly onError?: readonly LifecycleAction[]
}
```

### 2.3 聚合类型

```typescript
// 完整 Skill 定义（L2 级别）
interface SkillDefinition {
  readonly metadata: SkillMetadata
  readonly triggers?: SkillTriggers
  readonly prerequisites?: SkillPrerequisites
  readonly instructions: SkillInstructions
  readonly references?: SkillReferences
  readonly output?: SkillOutput
  readonly lifecycle?: SkillLifecycle
  readonly sourcePath: string
}

// 轻量 Manifest（L1 级别，仅用于路由）
interface SkillManifest {
  readonly name: string
  readonly description: string
  readonly tags: readonly string[]
  readonly priority: number
  readonly sourcePath: string
}
```

## 3. 解析层（Parser）

### 3.1 文件格式

Skill 以 Markdown + Frontmatter 格式存储：

```markdown
---
name: verify-security
description: 安全校验关卡。扫描代码安全漏洞。
version: "1.2.0"
tags: [security, quality-gate]
priority: 10
triggers:
  keywords: [安全扫描, 漏洞检测]
  patterns: ["检测.*安全"]
prerequisites:
  tools:
    - name: rg
      command: rg
      check: rg --version
      hint: 请安装 ripgrep
---

## 工作流程
1. 扫描所有源代码文件
2. 检测危险模式
3. 生成报告
```

Frontmatter 包含 metadata、triggers、prerequisites、references、output、lifecycle 的结构化定义。Markdown body 即 `instructions.always`。

### 3.2 函数签名

```typescript
// 完整解析（L2）
parseSkillFile(filePath: string): Promise<Result<SkillDefinition, ParseError>>

// 仅解析 Manifest（L1，快速扫描）
parseManifest(filePath: string): Promise<Result<SkillManifest, ParseError>>
```

### 3.3 解析规则

- L1 扫描只读 frontmatter，不解析 body，保证速度
- L2 加载才读完整文件，解析 body 为 instructions.always
- frontmatter 中未声明的字段使用默认值（tags 默认 `[]`，priority 默认 `50`）
- 解析失败返回 `err(ParseError)`，包含文件路径、字段名、错误原因

### 3.4 错误类型

```typescript
type ParseError = {
  readonly filePath: string
  readonly field?: string
  readonly message: string
  readonly cause?: unknown
}
```

## 4. 调度引擎层（Pipeline）

四个纯函数串联：

```
scan() → route() → load() → inject()
```

### 4.1 Stage 1: scan — 扫描发现

```typescript
scan(dirs: readonly string[]): Promise<Result<readonly SkillManifest[], ScanError>>
```

- 递归扫描给定目录，查找含 frontmatter 的 `.md` 文件
- 对每个文件调用 `parseManifest()`（L1 快速扫描）
- 过滤掉解析失败的（记录警告），返回成功的 Manifest 列表
- 不抛异常，所有错误通过 Result 类型表达

### 4.2 Stage 2: route — 路由匹配

```typescript
route(
  query: string,
  manifests: readonly SkillManifest[],
  options?: RouteOptions
): readonly SkillManifest[]

interface RouteOptions {
  readonly tags?: readonly string[]
  readonly filePatterns?: readonly string[]
}
```

**纯同步函数**，不做 IO。匹配策略：

1. keyword 精确命中 → 必选
2. pattern 正则匹配 → 加权
3. tag 匹配 → 加权
4. 按 priority 排序（数值越小优先级越高）
5. exclusive=true 的 Skill 排除同 tag 的其他 Skill

### 4.3 Stage 3: load — 按需加载

```typescript
load(
  manifests: readonly SkillManifest[],
  loaded?: ReadonlyMap<string, SkillDefinition>
): Promise<LoadResult>

interface LoadResult {
  readonly definitions: readonly SkillDefinition[]
  readonly loaded: ReadonlyMap<string, SkillDefinition>
  readonly errors: readonly { readonly manifest: SkillManifest; readonly error: LoadError }[]
}
```

- 过滤已加载的（通过 loaded Map 去重）
- 检查 prerequisites（工具可用性、环境变量、文件存在）
- 解析完整 SKILL.md → SkillDefinition
- 递归加载 requires 依赖（深度限制 3 层）
- DAG 环检测，发现循环依赖时报错
- 返回不可变更新的 loaded Map

### 4.4 Stage 4: inject — 上下文注入

```typescript
inject(
  definitions: readonly SkillDefinition[],
  options?: InjectOptions
): string

interface InjectOptions {
  readonly contextVars?: Readonly<Record<string, string>>
  readonly maxTokens?: number
}
```

- 将 SkillDefinition 格式化为可注入 LLM prompt 的文本
- 根据 contextVars 匹配 conditional instructions
- maxTokens 超出时按 contextWeight 裁剪（低权重先移除）

### 4.5 Pipeline 组合

```typescript
runPipeline(
  dirs: readonly string[],
  query: string,
  loaded?: ReadonlyMap<string, SkillDefinition>
): Promise<PipelineResult>

interface PipelineResult {
  readonly text: string
  readonly definitions: readonly SkillDefinition[]
  readonly loaded: ReadonlyMap<string, SkillDefinition>
}
```

### 4.6 边界处理（v1 范围内）

| 边界场景 | 处理方式 |
|---------|---------|
| Skill 冲突 | priority 排序 + exclusive 互斥 |
| Skill 嵌套 | requires 声明 + 递归加载（深度限制 3） |
| 循环依赖 | DAG 环检测，发现则报错 |
| 部分加载失败 | 收集到 errors 数组，不阻塞其他 Skill |
| 加载失败（格式错误） | 跳过该 Skill，返回 ParseError |

以下边界处理留给 v2：热更新、离线降级、上下文窗口限制（token 预算裁剪）、大资源分批加载。

## 5. 目录结构

```
skillkit/
├── src/
│   ├── types/
│   │   ├── result.ts
│   │   └── skill.ts
│   ├── parser/
│   │   ├── frontmatter.ts
│   │   ├── instructions.ts
│   │   └── index.ts
│   ├── pipeline/
│   │   ├── scan.ts
│   │   ├── route.ts
│   │   ├── load.ts
│   │   ├── inject.ts
│   │   └── index.ts
│   ├── utils/
│   │   ├── dag.ts
│   │   ├── match.ts
│   │   └── prerequisite.ts
│   └── index.ts
├── tests/
│   ├── fixtures/
│   ├── parser.test.ts
│   ├── pipeline.test.ts
│   └── utils.test.ts
├── docs/
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## 6. 依赖

| 依赖 | 用途 | 类型 |
|------|------|------|
| gray-matter | Frontmatter 解析 | runtime |
| vitest | 测试框架 | dev |
| typescript | 编译 | dev |

## 7. 开发方法

**严格 TDD（测试先行）**：每个模块的实现顺序为：

1. 编写测试用例（描述期望行为）
2. 运行测试，确认失败（Red）
3. 编写最小实现代码使测试通过（Green）
4. 重构（Refactor）

模块开发顺序：

1. `types/result.ts` — Result 基础类型（无复杂逻辑，简单测试）
2. `types/skill.ts` — 模型类型定义（类型编译测试）
3. `parser/` — 解析层（核心基础）
4. `utils/` — 工具函数（DAG、匹配、前置条件检查）
5. `pipeline/scan.ts` — 扫描
6. `pipeline/route.ts` — 路由
7. `pipeline/load.ts` — 加载
8. `pipeline/inject.ts` — 注入
9. `pipeline/index.ts` — Pipeline 组合

## 8. Public API 导出

```typescript
// Result 类型
export type { Result } from './types/result'
export { ok, err } from './types/result'

// Skill 模型类型
export type { SkillDefinition, SkillManifest, SkillMetadata, SkillTriggers, SkillInstructions, SkillReferences, SkillOutput, SkillLifecycle, LifecycleAction, SkillPrerequisites, PrerequisiteTool, SkillReference } from './types/skill'

// Parser
export { parseSkillFile, parseManifest } from './parser'

// Pipeline Stages
export { scan } from './pipeline/scan'
export { route } from './pipeline/route'
export { load } from './pipeline/load'
export { inject } from './pipeline/inject'
export { runPipeline } from './pipeline'
```
