# @ycc-im/skillkit

一个 TypeScript 工具库，为 AI Agent 框架提供 Skill 管理和调度能力。它从 Markdown+Frontmatter 文件中解析 Skill 定义，并通过懒加载 Pipeline 按需将相关 Skill 注入 LLM 上下文。

> 本文档是英文 README 的中文翻译，以英文版为准。

## 安装

```bash
npm install @ycc-im/skillkit
```

## 什么是 Skill？

Skill 是一个带有 YAML frontmatter 的 Markdown 文件，定义了 AI Agent 的指令：

```markdown
---
name: verify-security
description: "扫描代码安全漏洞，检测危险模式。"
version: "1.2.0"
tags: [security, quality-gate]
priority: 10
triggers:
  keywords: [安全扫描, 漏洞检测, OWASP]
  patterns: ["检测.*安全"]
prerequisites:
  tools:
    - name: rg
      command: rg
      check: "rg --version"
      hint: "安装 ripgrep: brew install ripgrep"
  env: [API_KEY]
---

## 工作流程
1. 扫描所有源代码文件
2. 检测危险模式：SQL注入、XSS、硬编码密钥
3. 生成严重级别报告
```

Frontmatter 包含结构化元数据，正文即注入 LLM 的指令内容。

## 快速开始

### 一步式 Pipeline

```typescript
import { runPipeline } from '@ycc-im/skillkit'

const result = await runPipeline(
  ['./skills', '~/.skills'],  // 扫描目录
  '安全扫描代码',              // 用户查询
)

console.log(result.text)          // 格式化后的文本，可直接注入 LLM
console.log(result.definitions)   // 加载的 SkillDefinition[]
console.log(result.loaded)        // Map<string, SkillDefinition> 缓存
```

### 分阶段 Pipeline

```typescript
import { scan, route, load, inject } from '@ycc-im/skillkit'

// 阶段 1：发现 Skill
const scanResult = await scan(['./skills'])
if (!scanResult.ok) throw new Error('扫描失败')

// 阶段 2：匹配查询
const matched = route('安全扫描', scanResult.value, {
  tags: ['security'],       // 按标签过滤
  exclusiveTag: 'security', // 只保留该标签下最高优先级的 Skill
})

// 阶段 3：加载完整定义
const loadResult = await load(matched)

// 阶段 4：格式化为 LLM 注入文本
const text = inject(loadResult.definitions, {
  contextVars: { framework: 'next.js' },  // 启用条件指令
})
```

### 解析单个文件

```typescript
import { parseManifest, parseSkillFile } from '@ycc-im/skillkit'

// L1：快速扫描（仅 frontmatter）
const manifest = await parseManifest('./skills/verify-security/SKILL.md')
if (manifest.ok) {
  console.log(manifest.value.name)        // "verify-security"
  console.log(manifest.value.priority)    // 10
}

// L2：完整加载（frontmatter + 指令正文）
const definition = await parseSkillFile('./skills/verify-security/SKILL.md')
if (definition.ok) {
  console.log(definition.value.instructions.always)  // 完整指令文本
}
```

## 架构

Skillkit 使用 **Pipeline** 架构，包含四个纯函数阶段：

```
scan() → route() → load() → inject()
```

| 阶段 | 输入 | 输出 | 说明 |
|------|------|------|------|
| `scan` | 目录路径 | `SkillManifest[]` | 递归发现 `.md` 文件，解析 frontmatter（L1） |
| `route` | 查询 + Manifests | `SkillManifest[]` | 根据描述/标签匹配查询，按优先级排序 |
| `load` | Manifests | `SkillDefinition[]` | 加载完整文件内容（L2），检查前置条件，缓存结果 |
| `inject` | Definitions | `string` | 格式化为 LLM 可消费文本，评估条件指令 |

每个阶段独立且可组合。可以用 `runPipeline` 一步到位，也可以单独调用各阶段。

## 条件指令

Skill 文件支持条件块，只在上下文变量匹配时注入：

```markdown
基础指令内容。

<!-- conditional: framework === 'next.js' -->
## Next.js 专项检查
检查 middleware 认证。
<!-- end conditional -->

<!-- conditional: language === 'python' -->
## Python 专项检查
检查 eval/exec 使用和 pickle 反序列化。
<!-- end conditional -->
```

向 `inject` 或 `runPipeline` 传递上下文变量：

```typescript
const text = inject(definitions, {
  contextVars: { framework: 'next.js', language: 'python' },
})
```

## 有状态加载

`load` 阶段接受并返回 `loaded` Map，用于跨调用缓存：

```typescript
const first = await runPipeline(['./skills'], 'security', new Map())
const second = await runPipeline(['./skills'], 'docs', first.loaded)

// second.loaded 同时包含 security 和 docs 两个 Skill
```

## API 参考

### Pipeline

| 函数 | 签名 |
|------|------|
| `scan` | `(dirs: readonly string[]) => Promise<Result<readonly SkillManifest[], ScanError>>` |
| `route` | `(query: string, manifests: readonly SkillManifest[], options?: RouteOptions) => readonly SkillManifest[]` |
| `load` | `(manifests: readonly SkillManifest[], loaded?: ReadonlyMap<string, SkillDefinition>) => Promise<LoadResult>` |
| `inject` | `(definitions: readonly SkillDefinition[], options?: InjectOptions) => string` |
| `runPipeline` | `(dirs: readonly string[], query: string, loaded?: ReadonlyMap<string, SkillDefinition>) => Promise<PipelineResult>` |

### 解析器

| 函数 | 签名 |
|------|------|
| `parseManifest` | `(filePath: string) => Promise<Result<SkillManifest, ParseError>>` |
| `parseSkillFile` | `(filePath: string) => Promise<Result<SkillDefinition, ParseError>>` |

### 类型

| 类型 | 说明 |
|------|------|
| `Result<T, E>` | 可辨识联合：`{ ok: true, value: T } \| { ok: false, error: E }` |
| `SkillManifest` | 轻量 L1 元数据（name, description, tags, priority） |
| `SkillDefinition` | 完整 L2 定义，包含所有字段 |
| `SkillMetadata` | name, description, version, tags, priority, exclusive, requires |
| `SkillTriggers` | keywords, patterns, filePatterns, context |
| `SkillPrerequisites` | tools, env, fileExists |
| `SkillInstructions` | always 内容 + 可选 conditional 块 |
| `ParseError` | filePath, field, message, cause |

## 开发

```bash
npm install
npm test          # 运行测试
npm run typecheck # 类型检查
npm run build     # 编译到 dist/
```

## 许可证

MIT
