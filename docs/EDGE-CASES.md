# 特殊情形与边界处理

## 1. Skill 冲突

**场景**：两个或多个 Skill 的 triggers 重叠，LLM 同时选中了多个 Skill。

**策略**：

- `priority` 字段控制优先级（数值越小优先级越高）
- 同优先级时，由 LLM 自行判断选择最合适的
- 提供 `exclusive: true` 标记，声明某 Skill 加载后排斥同类 Skill

```yaml
metadata:
  name: verify-quality
  priority: 10
  exclusive: true
```

## 2. Skill 嵌套

**场景**：Skill A 的执行过程中触发 Skill B。

**策略**：

- Skill A 的 instructions 中声明 `requires`，在加载 A 时预加载 B
- 或在执行过程中由 LLM 动态触发子 Skill 加载
- 嵌套深度限制（默认最大 3 层），防止无限递归

```yaml
metadata:
  name: verify-change
  requires:
    - verify-module
    - verify-quality
```

## 3. Skill 循环依赖

**场景**：A 依赖 B，B 依赖 A。

**策略**：

- 加载前构建依赖图（DAG），检测环
- 发现环时中断并报错，列出依赖链路

```
Error: Circular dependency detected
  verify-change → verify-module → verify-change
```

## 4. Skill 版本冲突

**场景**：同一 Skill 不同版本被不同依赖引用。

**策略**：

- 采用最高版本满足所有约束（类似 npm 的 semver 解析）
- 若无共同版本满足，报错并列出冲突约束

```
Error: Version conflict for verify-quality
  verify-change requires >=1.2.0
  verify-module requires >=2.0.0
  No common version satisfies all constraints
```

## 5. 部分加载（大资源分批）

**场景**：Skill 的 references 中包含大文件，无法一次性注入 context。

**策略**：

- references 支持声明 `maxSize`，超出时自动分块
- 提供 `chunkStrategy`：按段落 / 按章节 / 按大小

```yaml
references:
  docs:
    - path: "references/large-spec.md"
      description: "完整规范文档"
      maxSize: "4KB"
      chunkStrategy: "heading"   # 按 markdown heading 分块
```

LLM 按需请求下一块。

## 6. 会话持久化

**场景**：Skill 加载状态需要跨多轮对话保持。

**策略**：

- 会话级 Skill 状态表：`Map<skillName, { loadedAt, referencesLoaded: Set<string> }>`
- 每轮对话开始时恢复状态，避免重复加载
- 提供显式卸载命令：`@skill unload verify-security`

## 7. Skill 热更新

**场景**：运行时 Skill 文件被修改。

**策略**：

- 文件监听（watch），检测到变更时标记 `stale`
- 不自动重载，而是在下次引用时重新加载
- 支持配置 `hotReload: true` 强制自动重载

```yaml
metadata:
  name: verify-security
  hotReload: false  # 默认不自动重载
```

## 8. 离线降级

**场景**：远程 Skill 不可用（Git 仓库无法访问、npm 包下载失败）。

**策略**：

- 本地缓存最近一次成功加载的版本
- 缓存过期时间可配置（默认 24h）
- 降级时标注 `loaded-from-cache`，提醒用户

```yaml
prerequisites:
  cachePolicy:
    ttl: "24h"
    fallbackToCache: true
```

## 9. 上下文窗口限制

**场景**：所有 Skill 正文 + references 超过 LLM 的 context window。

**策略**：

- 加载前估算 token 占用（每条 Manifest ~100 token，Instructions ~500-2000 token）
- 设定上下文预算（context budget），默认为 window 的 60%
- 超出预算时按优先级裁剪：

```
裁剪顺序（从低到高）：
1. references（最后加载的先移除）
2. conditional instructions（移除非匹配的条件指令）
3. instructions 中的示例和注释
4. 整个低优先级 Skill
```

```yaml
metadata:
  name: verify-security
  contextWeight: 100  # 越高越不容易被裁剪，默认 50
```

## 10. Skill 加载失败

**场景**：Skill 文件格式错误、权限不足、解析失败。

**策略**：

- 区分 `fatal`（格式错误，无法恢复）和 `recoverable`（部分内容缺失）
- fatal：跳过该 Skill 并报错
- recoverable：加载可用部分，标注缺失内容

```yaml
Error loading skill verify-security:
  - [WARN] references/scripts/scan.sh: permission denied (skipped)
  - [ERROR] instructions: invalid YAML (skill disabled)
```
