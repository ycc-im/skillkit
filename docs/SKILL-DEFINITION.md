# Skill 内容模型

## 结构总览

```
SkillDefinition
├── metadata          # 元数据（用于发现和路由）
├── triggers          # 触发条件（路由判断的辅助）
├── prerequisites     # 前置条件（加载前检查）
├── instructions      # 核心指令正文（注入上下文的内容）
├── references        # 参考资源（模板、文档、脚本）
├── output            # 输出规范
└── lifecycle         # 生命周期钩子
```

## 1. metadata — 元数据

| 字段 | 必填 | 类型 | 说明 |
|------|------|------|------|
| `name` | 是 | `string` | 唯一标识符，如 `verify-security` |
| `description` | 是 | `string` | 路由摘要，50-150 字，决定 LLM 是否选择此 Skill |
| `version` | 否 | `string` | 语义版本号 |
| `author` | 否 | `string` | 作者/组织 |
| `tags` | 否 | `string[]` | 分类标签，如 `["security", "quality-gate"]` |

```yaml
metadata:
  name: verify-security
  description: >
    安全校验关卡。自动扫描代码安全漏洞，检测危险模式，
    确保 OWASP Top 10 相关风险被识别。当用户提到安全扫描、
    漏洞检测、安全审计、代码安全、注入检测、敏感信息泄露时使用。
  version: "1.2.0"
  author: "skillkit"
  tags: ["security", "quality-gate", "owasp"]
```

## 2. triggers — 触发条件

显式声明何时激活，补充 description 的模糊性：

```yaml
triggers:
  keywords:
    - "安全扫描"
    - "漏洞检测"
    - "OWASP"
    - "SQL注入"
    - "敏感信息泄露"
  patterns:
    - "检测.*安全"
    - "扫描.*漏洞"
  filePatterns:
    - "*.env"
    - "credentials.*"
  context:
    hasGitChanges: true
    hasEnvFile: true
```

### 触发匹配规则

| 规则类型 | 匹配方式 | 优先级 |
|---------|---------|--------|
| `keywords` | 精确关键词命中 | 高 |
| `patterns` | 正则表达式匹配 | 中 |
| `filePatterns` | 当前操作的文件路径匹配 | 中 |
| `context` | 项目环境条件匹配 | 低（辅助建议） |

## 3. prerequisites — 前置条件

加载前必须满足的条件，不满足则跳过或报错：

```yaml
prerequisites:
  dependencies:
    - name: gen-docs
      version: ">=1.0.0"
  tools:
    - command: "rg"
      check: "rg --version"
      hint: "请安装 ripgrep: brew install ripgrep"
  env:
    - TRELLO_API_KEY
    - TRELLO_TOKEN
  fileExists:
    - "package.json"
    - "tsconfig.json"
```

### 前置条件检查流程

```
prerequisites
├── dependencies  → 递归检查依赖 Skill 是否可用
├── tools         → 执行 check 命令，失败则输出 hint
├── env           → 检查环境变量是否设置
└── fileExists    → 检查文件/目录是否存在
```

任何一项失败的处理策略：

- `soft`（默认）：跳过此 Skill，在路由结果中标注 `skipped`
- `hard`：中断并报错，要求用户解决

## 4. instructions — 核心指令

Skill 的主体，注入到上下文中的实际内容。分两层：

### a) 常驻指令（always）

每次激活都注入：

```yaml
instructions:
  always: |
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

### b) 条件指令（conditional）

根据上下文选择性注入：

```yaml
instructions:
  conditional:
    - condition: "framework === 'next.js'"
      content: |
        额外检查 Next.js 特有的安全模式：
        - middleware 中的认证绕过
        - Server Actions 的输入验证
    - condition: "language === 'python'"
      content: |
        额外检查 Python 特有模式：
        - eval/exec 的使用
        - pickle 反序列化
    - condition: "hasDockerfile === true"
      content: |
        额外检查 Docker 安全配置：
        - 是否以 root 用户运行
        - 是否暴露了不必要的端口
```

### 条件变量来源

| 变量 | 来源 | 示例值 |
|------|------|--------|
| `framework` | 项目配置检测 | `"next.js"`, `"express"` |
| `language` | 文件类型统计 | `"typescript"`, `"python"` |
| `hasDockerfile` | 文件系统 | `true` / `false` |
| `hasCI` | CI 配置检测 | `true` / `false` |
| `packageManager` | lock 文件检测 | `"pnpm"`, `"npm"` |

## 5. references — 参考资源

Skill 执行过程中可能需要引用的辅助材料，**懒加载**——只有 instructions 中提及到时才读取：

```yaml
references:
  templates:
    - path: "templates/security-report.md"
      description: "安全报告输出模板"
  docs:
    - path: "references/owasp-top10.md"
      description: "OWASP Top 10 参考"
  scripts:
    - path: "scripts/scan.sh"
      description: "静态扫描脚本"
      runtime: "bash"
  examples:
    - path: "examples/fix-sql-injection.md"
      description: "SQL 注入修复示例"
```

### 资源类型

| 类型 | 说明 | 加载方式 |
|------|------|---------|
| `templates` | 输出模板文件 | 按 name 引用，注入到 context |
| `docs` | 参考文档 | 按 name 引用，注入到 context |
| `scripts` | 可执行脚本 | 按需执行，输出结果注入 context |
| `examples` | 示例文件 | 按 name 引用，注入到 context |

## 6. output — 输出规范

```yaml
output:
  format: "markdown"
  file: ".security-report.md"
  schema:
    type: "object"
    properties:
      severity:
        type: "string"
        enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
      findings:
        type: "array"
        items:
          type: "object"
          properties:
            file: { type: "string" }
            line: { type: "number" }
            rule: { type: "string" }
            message: { type: "string" }
  appendToFile: false
```

### 输出格式支持

| 格式 | 说明 |
|------|------|
| `markdown` | Markdown 文本 |
| `json` | JSON 结构化数据 |
| `sarif` | SARIF 静态分析结果格式 |
| `stdout` | 直接输出到标准输出 |

## 7. lifecycle — 生命周期钩子

```yaml
lifecycle:
  onLoad:
    - type: "script"
      path: "scripts/init.sh"
    - type: "message"
      content: "已加载安全扫描 Skill，准备开始扫描"
  onBeforeExecute:
    - type: "check"
      condition: "git.status.isClean === false"
      message: "检测到未提交的变更，建议先提交"
  onAfterExecute:
    - type: "script"
      path: "scripts/cleanup.sh"
    - type: "validate"
      schema: "output.schema"
  onError:
    - type: "fallback"
      skill: "manual-review"
    - type: "message"
      content: "自动扫描失败，已切换到人工审查模式"
```

### 钩子类型

| 钩子 | 触发时机 | 类型 |
|------|---------|------|
| `onLoad` | Skill 加载完成后 | `script`, `message` |
| `onBeforeExecute` | LLM 开始执行前 | `check`, `message` |
| `onAfterExecute` | LLM 执行完毕后 | `script`, `validate` |
| `onError` | 执行出错时 | `fallback`, `message` |

### 动作类型

| 类型 | 说明 |
|------|------|
| `script` | 执行外部脚本 |
| `message` | 向用户/LLM 输出信息 |
| `check` | 条件检查，不满足时输出 message |
| `validate` | 用 schema 校验输出结果 |
| `fallback` | 回退到另一个 Skill |

## 完整示例

```yaml
metadata:
  name: verify-security
  description: >
    安全校验关卡。自动扫描代码安全漏洞，检测危险模式，
    确保 OWASP Top 10 相关风险被识别。
  version: "1.2.0"
  author: "skillkit"
  tags: ["security", "quality-gate"]

triggers:
  keywords: ["安全扫描", "漏洞检测", "OWASP", "SQL注入"]
  patterns: ["检测.*安全", "扫描.*漏洞"]
  filePatterns: ["*.env", "credentials.*"]
  context:
    hasGitChanges: true

prerequisites:
  tools:
    - command: "rg"
      check: "rg --version"
      hint: "请安装 ripgrep: brew install ripgrep"

instructions:
  always: |
    ## 工作流程
    1. 扫描所有源代码文件
    2. 检测危险模式：SQL注入、XSS、硬编码密钥、不安全反序列化
    3. 生成严重级别报告

    ## 规则
    - 禁止跳过任何文件
    - 敏感信息泄露标记为 CRITICAL
  conditional:
    - condition: "framework === 'next.js'"
      content: |
        额外检查 Next.js 特有模式：
        - middleware 认证绕过
        - Server Actions 输入验证

references:
  templates:
    - path: "templates/security-report.md"
      description: "安全报告输出模板"
  docs:
    - path: "references/owasp-top10.md"
      description: "OWASP Top 10 参考"

output:
  format: "markdown"
  file: ".security-report.md"

lifecycle:
  onLoad:
    - type: "message"
      content: "已加载安全扫描 Skill"
  onAfterExecute:
    - type: "validate"
      schema: "output.schema"
```
