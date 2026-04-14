# Skill 调度模型

## 概述

Skillkit 实现三级懒加载调度：**Manifest → Instructions → References**，每一级只在必要时才加载，最小化 context 占用。

## 调度阶段

### 阶段一：发现与注册（Discovery）

```
SkillSource[] → Scanner → SkillManifest[]
```

从多个来源扫描 Skill：

- 本地文件系统（`~/.skills/`、项目内 `.skills/`、`.claude/skills/`）
- Git 仓库（`owner/repo` 的 `skills/` 目录）
- npm 包（包内 `skills/` 目录）
- 远程 URL（直接指向 SKILL.md）

扫描产物是 **SkillManifest**——仅包含路由所需的轻量元数据，不包含任何正文。

### 阶段二：摘要注入与路由（Summary & Routing）

```
SkillManifest[] → ContextInjector → LLM 判断
```

将所有 Manifest 汇总成紧凑的索引文本，注入 system prompt：

```
Available Skills:
- verify-security: 安全校验关卡。扫描代码安全漏洞...
- gen-docs: 文档生成器。自动分析模块结构...
- trello: Trello API 集成工具。提供 Boards、Lists...
```

LLM 根据用户输入做判断，产出三种结果之一：

- **不需要任何 Skill** → 直接回答
- **需要 Skill X** → 触发加载
- **需要 Skill X + Skill Y** → 批量加载（或串行）

### 阶段三：按需加载（Lazy Load）

```
Router Decision → SkillLoader → SkillDefinition → ContextInjector
```

将 Skill 的完整内容加载并注入上下文。这是**一次性操作**——一旦加载，该 Skill 在当前会话中持久可用，无需重复加载。

### 阶段四：执行与反馈（Execution）

LLM 按 Skill 中的指令执行任务。Skill 可能定义：

- 工作流步骤（多步执行）
- 需要调用的外部工具/脚本
- 输出格式要求
- 失败时的回退策略

执行过程中可能触发**子 Skill 加载**（Skill 嵌套）。

### 阶段五：结果校验（Validation）

部分 Skill 定义了校验规则，执行完毕后验证输出是否符合预期。

## 完整流程图

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  SkillSource │────▶│   Scanner    │────▶│  SkillManifest[] │
│  (多来源)     │     │  (扫描元数据)  │     │  (name+desc)     │
└─────────────┘     └──────────────┘     └────────┬────────┘
                                                 │
                                                 ▼
                                        ┌─────────────────┐
                                        │ ContextInjector  │
                                        │ (注入摘要索引)    │
                                        └────────┬────────┘
                                                 │
                                                 ▼
                                        ┌─────────────────┐
                                        │  LLM 路由判断    │
                                        └────────┬────────┘
                                    ┌────────────┼────────────┐
                                    │            │            │
                                    ▼            ▼            ▼
                               [不需要]     [需要 X]    [需要 X+Y]
                               直接回答    加载 Skill   批量/串行加载
                                            │            │
                                            ▼            ▼
                                        ┌─────────────────┐
                                        │  SkillLoader    │
                                        │ (加载完整内容)    │
                                        └────────┬────────┘
                                                 │
                                                 ▼
                                        ┌─────────────────┐
                                        │ ContextInjector  │
                                        │ (注入指令正文)    │
                                        └────────┬────────┘
                                                 │
                                                 ▼
                                        ┌─────────────────┐
                                        │   LLM 执行      │
                                        └────────┬────────┘
                                                 │
                                    ┌────────────┼────────────┐
                                    │                         │
                                    ▼                         ▼
                              [需要子 Skill]            [执行完毕]
                              嵌套加载(递归)           进入校验
                                                            │
                                                            ▼
                                                   ┌─────────────────┐
                                                   │   Validation    │
                                                   └─────────────────┘
```

## 三级懒加载策略

| 级别 | 加载时机 | 内容 | Context 占用 |
|------|---------|------|-------------|
| L1: Manifest | 会话初始化 | name + description | 极小（每条 ~100 token） |
| L2: Instructions | LLM 路由决策后 | 核心指令正文 | 中等（~500-2000 token） |
| L3: References | Instructions 中引用时 | 模板/文档/脚本 | 按需（可分批） |
