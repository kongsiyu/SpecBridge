# SpecBridge 同步策略设计文档

## 概述

本文档定义了 SpecBridge 简化后的同步策略架构，解决了以下核心问题：
1. 简化层级结构，只保留 Epic-Task 两层
2. Task 自动关联到所属 Spec（作为 Epic）
3. Epic 状态自动追踪和更新
4. GitHub Issue 和 Project 的灵活组合使用
5. 支持部分同步（指定 spec）

## 1. 简化的层级结构

### 设计理念

**移除 Story 层，简化为 Epic-Task 两层结构**：
- **Epic**：对应一个完整的 Spec（.kiro/specs/feature-name/）
- **Task**：对应 tasks.md 中的每个任务

### 为什么移除 Story 层？

1. **降低复杂度**：三层结构增加了理解和配置成本
2. **实际使用场景**：大多数项目不需要三层结构
3. **避免关联混乱**：Task 和 Requirement 的关联关系难以维护
4. **提高可预测性**：简单的两层结构让同步结果更清晰

### 层级映射

```
Kiro Spec 结构              同步到平台
├── .kiro/specs/
│   └── feature-name/       → Epic (整个 spec)
│       ├── requirements.md → Epic 的描述内容
│       ├── design.md       → (可选) 附加到 Epic
│       └── tasks.md        → 
│           ├── Task 1      → Task/Issue (关联到 Epic)
│           ├── Task 2      → Task/Issue (关联到 Epic)
│           └── Task 3      → Task/Issue (关联到 Epic)
```

---

## 2. Task 自动关联到 Spec Epic

### 关联规则

每个 task 自动关联到其所属的 spec（作为 Epic），无需手动配置：

1. **自动识别**：解析器根据文件路径识别 task 所属的 spec
2. **自动关联**：同步时自动建立 task 和 spec epic 的关联关系
3. **一致性保证**：同一个 spec 下的所有 task 都归属于该 spec 的 epic

### Spec 文件格式

```markdown
# tasks.md

## 任务列表

- [ ] 1.1 创建用户模型
- [x] 1.2 实现登录接口 (@alice)
- [-] 1.3 添加密码加密
```

**说明**：
- 不需要显式标记 task 和 requirement 的关联
- Task ID 前缀（如 `1.1` 中的 `1`）可以用于内部组织，但不影响同步
- 所有 task 都自动关联到 spec epic

### 同步行为

**Jira**:
- Epic：创建一个 Epic，名称为 spec 名称
- Task：创建在该 Epic 下，使用 `Epic Link` 字段关联

**GitHub Issue**:
- Epic：创建一个 Issue，标题为 spec 名称，Body 包含 requirements.md 内容
- Task：创建 Issue，使用 Label 标记所属 spec（如 `epic:sync-strategy-enhancement`）

**GitHub Project**:
- Epic：创建一个 Project Item（如果使用 epic 粒度）
- Task：创建 Project Item，按 spec 分组

---

## 3. Epic 包含完整需求文档

### 设计理念

Epic 同步时必须包含 `requirements.md` 的完整内容，确保在目标平台能够清楚了解需求背景和详情。

### 内容格式

**GitHub Issue**:
```markdown
# Epic: 同步策略简化与增强

## 项目概述

### 背景
SpecBridge 当前的同步策略存在以下问题...

### 目标
简化并增强 SpecBridge 的同步策略...

## 功能需求

### REQ-001: 简化粒度控制策略
...

### REQ-002: Epic 包含完整需求文档
...
```

**Jira Epic**:
- Summary: Spec 名称
- Description: requirements.md 的完整内容（Markdown 格式）

**GitHub Project**:
- Title: Spec 名称
- Description: requirements.md 的完整内容

### 内容更新

- 当 requirements.md 更新时，重新同步会更新 Epic 的内容
- 保持 Markdown 格式，确保可读性
- 如果 requirements.md 不存在，使用 spec 名称作为标题，Body 为空或默认描述

---

## 4. Epic 状态自动更新

### 状态追踪规则

Epic 的状态根据其下所有 task 的完成情况自动更新：

| Task 完成情况 | Epic 状态 |
|--------------|----------|
| 所有 task 都是 `done` | `Done` / `Closed` |
| 有任何 task 不是 `done` | `In Progress` / `Open` |
| 所有 task 都是 `todo` | `Todo` / `Open` |

### 状态映射

**GitHub Issue**:
- Open: Epic 有未完成的 task
- Closed: Epic 下所有 task 都完成

**GitHub Project**:
- Todo: 所有 task 都未开始
- In Progress: 有 task 正在进行
- Done: 所有 task 都完成

**Jira Epic**:
- To Do: 所有 task 都未开始
- In Progress: 有 task 正在进行
- Done: 所有 task 都完成

### 进度显示

在 Epic 的描述中可以显示进度信息：

```markdown
## 进度

- 已完成: 5/10 (50%)
- 进行中: 2
- 待开始: 3
```

---

## 5. 粒度控制策略

### 配置选项

```yaml
sync:
  targets:
    - type: jira
      syncLevel: task  # epic | task (不支持 story)
    
    - type: github-issue
      syncLevel: task  # epic | task (不支持 story)
    
    - type: github-project
      syncLevel: task  # epic | task (不支持 story)
```

### 两种粒度行为

| 粒度 | Jira | GitHub Issue | GitHub Project |
|------|------|--------------|----------------|
| **epic** | 只创建 Epic，Task 作为描述或 Checklist | 创建单个 Issue，Task 作为 Checklist | 创建单个 Project Item |
| **task** | 创建 Epic + Task | 创建 Epic Issue + 每个 Task 的 Issue | 创建 Epic Item + 每个 Task 的 Item |

### Epic 粒度详解

**适用场景**：
- 小型项目（< 20 个 task）
- 快速原型验证
- 不需要细粒度追踪

**行为**：
- 创建一个 Epic/Issue，包含 requirements.md 的完整内容
- 所有 task 作为 Checklist 列在 Epic 中
- 不创建单独的 Task Issue

**示例**（GitHub Issue）：
```markdown
# Epic: 用户认证功能

## 需求文档
[requirements.md 的完整内容]

## 任务清单
- [ ] 1.1 创建用户模型
- [x] 1.2 实现登录接口
- [ ] 1.3 添加密码加密
```

### Task 粒度详解

**适用场景**：
- 中大型项目（> 20 个 task）
- 需要细粒度追踪和讨论
- 多人协作开发

**行为**：
- 创建一个 Epic/Issue，包含 requirements.md 的完整内容
- 为每个 task 创建单独的 Issue/Task
- Task 自动关联到 Epic

**示例**（GitHub Issue）：
```markdown
Epic Issue #100: 用户认证功能
[requirements.md 的完整内容]

Task Issue #101: 创建用户模型
- Label: epic:user-authentication
- 描述: 创建用户数据模型...

Task Issue #102: 实现登录接口
- Label: epic:user-authentication
- 描述: 实现 JWT 登录接口...
```

### 推荐配置

**小型项目（< 20 个 Task）**:
```yaml
jira: epic
github-issue: epic
github-project: epic
```

**中大型项目（> 20 个 Task）**:
```yaml
jira: task
github-issue: task
github-project: task
```

---

## 6. 部分同步支持

### CLI 参数

```bash
# 同步所有 spec（默认）
specbridge sync

# 同步指定的单个 spec
specbridge sync --spec sync-strategy-enhancement

# 同步多个 spec
specbridge sync --spec spec1 --spec spec2

# 预览将要同步的 spec
specbridge sync --spec spec1 --dry-run
```

### 使用场景

1. **增量开发**：只同步正在开发的 spec
2. **提高效率**：避免不必要的 API 调用
3. **测试验证**：在正式同步前测试单个 spec
4. **部分更新**：只更新修改过的 spec

### 实现逻辑

```typescript
// 解析 --spec 参数
const specsToSync = options.spec 
  ? (Array.isArray(options.spec) ? options.spec : [options.spec])
  : getAllSpecs();

// 验证 spec 是否存在
for (const specName of specsToSync) {
  const specPath = path.join('.kiro/specs', specName);
  if (!fs.existsSync(specPath)) {
    throw new Error(`Spec not found: ${specName}`);
  }
}

// 只同步指定的 spec
for (const specName of specsToSync) {
  await syncEngine.syncSpec(specName);
}
```

---

## 7. GitHub 双通道架构

### 设计理念

将 GitHub Issue 和 GitHub Project 作为两个独立的同步通道：
- **Issue 通道**：专注于任务的创建、讨论和追踪
- **Project 通道**：专注于可视化管理和进度跟踪
- **独立可选**：用户可以选择只用其中一个，或两者结合
- **自动关联**：当两者同时启用时，可以自动建立关联

### 配置格式

```yaml
# .specbridge.yaml
sync:
  targets:
    # 方式 1：独立配置
    - type: github-issue
      syncLevel: task
      config:
        owner: myorg
        repo: myrepo
        labels:
          - spec-synced
    
    - type: github-project
      syncLevel: task
      config:
        owner: myorg
        repo: myrepo
        projectNumber: 1
        groupBy: spec  # 按 spec 分组
        autoLink: true  # 自动关联到 Issue
    
    # 方式 2：统一配置（语法糖）
    - type: github
      channels:
        issue:
          enabled: true
          syncLevel: task
        project:
          enabled: true
          syncLevel: task
          groupBy: spec
          autoLink: true
      config:
        owner: myorg
        repo: myrepo
        projectNumber: 1
```

### 通道行为定义

#### Issue 通道

| syncLevel | 行为 |
|-----------|------|
| `epic` | 创建单个 Issue，包含 requirements.md 内容，Task 作为 Checklist |
| `task` | 创建 Epic Issue + 每个 Task 的 Issue |

**Issue 元数据**:
- Title: 来自 Spec 名称或 Task 名称
- Body: requirements.md 内容或 Task 描述
- Labels: `epic:{spec-name}`, `priority:{value}`, `status:{value}`
- Assignee: 从 Task 的 assignee 字段映射

#### Project 通道

| syncLevel | 行为 |
|-----------|------|
| `epic` | 创建单个 Project Item，包含所有内容 |
| `task` | 创建 Epic Item + 每个 Task 的 Item，按 spec 分组 |

**Project 元数据**:
- Title: 来自 Spec 名称或 Task 名称
- Group: 按 `groupBy` 配置分组（spec/none）
- Custom Fields: Status, Priority, Assignee 等
- Links: 如果启用 autoLink，关联到对应的 Issue

#### 双通道关联（autoLink）

当 Issue 和 Project 通道同时启用且 `autoLink: true` 时：

1. **同步顺序**：先同步 Issue，再同步 Project
2. **关联建立**：Project Item 自动关联到对应的 Issue
3. **双向追踪**：从 Issue 可以跳转到 Project，反之亦然

---

## 8. 技术实现架构

### 8.1 数据模型

```typescript
// src/core/models.ts

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assignee?: string;
  priority?: string;
  estimatedHours?: number;
  labels?: string[];
  syncId?: string;
  
  // 自动关联字段（由解析器填充）
  specName?: string;  // 所属 spec 名称
  specPath?: string;  // 所属 spec 路径
}

export interface SpecData {
  meta: SpecMeta;
  requirements: Requirement[];  // 来自 requirements.md
  design?: Design;              // 来自 design.md
  tasks: Task[];                // 来自 tasks.md
  
  // Epic 信息
  epicTitle: string;            // Spec 名称
  epicDescription: string;      // requirements.md 的完整内容
}

export interface SyncConfig {
  targets: TargetConfig[];
}

export interface TargetConfig {
  type: 'jira' | 'github-issue' | 'github-project' | 'github';
  syncLevel: 'epic' | 'task';  // 移除 'story'
  channels?: ChannelConfig;
  config: any;
}

export interface ChannelConfig {
  issue?: IssueChannelConfig;
  project?: ProjectChannelConfig;
}

export interface IssueChannelConfig {
  enabled: boolean;
  syncLevel?: 'epic' | 'task';
}

export interface ProjectChannelConfig {
  enabled: boolean;
  syncLevel?: 'epic' | 'task';
  groupBy?: 'spec' | 'none';  // 移除 'requirement' 和 'story'
  autoLink?: boolean;
}
```

### 8.2 解析器增强

```typescript
// src/adapters/source/kiro.ts

export class KiroAdapter extends BaseSourceAdapter {
  async parse(specPath: string): Promise<SpecData> {
    const specName = path.basename(specPath);
    
    // 解析三个文件
    const requirementsPath = path.join(specPath, 'requirements.md');
    const designPath = path.join(specPath, 'design.md');
    const tasksPath = path.join(specPath, 'tasks.md');
    
    const requirements = await this.parseRequirements(requirementsPath);
    const design = await this.parseDesign(designPath);
    const tasks = await this.parseTasks(tasksPath);
    
    // 读取 requirements.md 的完整内容作为 Epic 描述
    const epicDescription = await fileExists(requirementsPath)
      ? await readFile(requirementsPath)
      : '';
    
    // 为所有 task 自动填充 spec 信息
    const tasksWithSpec = tasks.map(task => ({
      ...task,
      specName,
      specPath,
    }));
    
    return {
      meta: {
        name: specName,
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      requirements,
      design,
      tasks: tasksWithSpec,
      epicTitle: specName,
      epicDescription,
    };
  }
}
```

### 8.3 Epic 状态计算

```typescript
// src/core/sync-engine.ts

export class SyncEngine {
  /**
   * 计算 Epic 状态
   */
  private calculateEpicStatus(tasks: Task[]): EpicStatus {
    if (tasks.length === 0) {
      return { status: 'open', progress: 0 };
    }
    
    const completedCount = tasks.filter(t => t.status === TaskStatus.DONE).length;
    const inProgressCount = tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
    const progress = Math.round((completedCount / tasks.length) * 100);
    
    let status: string;
    if (completedCount === tasks.length) {
      status = 'done';
    } else if (inProgressCount > 0 || completedCount > 0) {
      status = 'in_progress';
    } else {
      status = 'todo';
    }
    
    return {
      status,
      progress,
      total: tasks.length,
      completed: completedCount,
      inProgress: inProgressCount,
      todo: tasks.length - completedCount - inProgressCount,
    };
  }
  
  /**
   * 同步 Epic 并更新状态
   */
  private async syncEpic(
    adapter: TargetAdapter,
    specData: SpecData
  ): Promise<SyncedItem> {
    const epicStatus = this.calculateEpicStatus(specData.tasks);
    
    // 在 Epic 描述中添加进度信息
    const epicDescription = `${specData.epicDescription}\n\n---\n\n## 进度\n\n- 已完成: ${epicStatus.completed}/${epicStatus.total} (${epicStatus.progress}%)\n- 进行中: ${epicStatus.inProgress}\n- 待开始: ${epicStatus.todo}`;
    
    // 同步 Epic
    const epic = await adapter.syncEpic({
      title: specData.epicTitle,
      description: epicDescription,
      status: epicStatus.status,
    });
    
    return epic;
  }
}
```

### 8.4 GitHub 双通道实现

```typescript
// src/adapters/target/github.ts

export class GitHubAdapter implements TargetAdapter {
  name = 'github';
  channels = ['issue', 'project'];
  
  private issueManager: GitHubIssueManager;
  private projectManager: GitHubProjectManager;
  
  async sync(data: SpecData): Promise<SyncResult> {
    const config = this.config as GitHubConfig;
    const results: SyncResult[] = [];
    
    // 通道 1：Issue 同步
    if (this.isChannelEnabled('issue')) {
      const issueResult = await this.issueManager.sync(data);
      results.push(issueResult);
    }
    
    // 通道 2：Project 同步
    if (this.isChannelEnabled('project')) {
      const projectResult = await this.projectManager.sync(data);
      results.push(projectResult);
    }
    
    // 自动关联
    if (results.length === 2 && config.channels?.project?.autoLink) {
      await this.linkIssuesAndProject(results[0], results[1]);
    }
    
    return this.mergeResults(results);
  }
}
```

---

## 9. 配置示例

### 示例 1：仅使用 GitHub Issue（Task 粒度）

```yaml
sync:
  targets:
    - type: github-issue
      syncLevel: task
      config:
        owner: myorg
        repo: myrepo
        labels:
          - spec-synced
```

### 示例 2：仅使用 GitHub Project（Task 粒度）

```yaml
sync:
  targets:
    - type: github-project
      syncLevel: task
      config:
        owner: myorg
        repo: myrepo
        projectNumber: 1
        groupBy: spec
```

### 示例 3：GitHub 双通道（Task 粒度 + autoLink）

```yaml
sync:
  targets:
    - type: github
      channels:
        issue:
          enabled: true
          syncLevel: task
        project:
          enabled: true
          syncLevel: task
          groupBy: spec
          autoLink: true
      config:
        owner: myorg
        repo: myrepo
        projectNumber: 1
```

### 示例 4：多平台混合

```yaml
sync:
  targets:
    - type: jira
      syncLevel: task
      config:
        host: https://mycompany.atlassian.net
        projectKey: PROJ
    
    - type: github
      channels:
        issue:
          enabled: true
          syncLevel: task
        project:
          enabled: true
          syncLevel: task
          groupBy: spec
          autoLink: true
      config:
        owner: myorg
        repo: myrepo
        projectNumber: 1
```

### 示例 5：Epic 粒度（小型项目）

```yaml
sync:
  targets:
    - type: github-issue
      syncLevel: epic
      config:
        owner: myorg
        repo: myrepo
```

---

## 10. 向后兼容性

### 配置迁移

**旧配置格式**：
```yaml
sync:
  targets:
    - type: github
      syncLevel: story  # 不再支持
```

**新配置格式（自动转换）**：
```yaml
sync:
  targets:
    - type: github-issue
      syncLevel: task  # 自动降级为 task
```

### 迁移策略

1. **自动降级**：如果配置中使用 `syncLevel: story`，自动降级为 `task` 并给出警告
2. **提示升级**：首次运行时提示用户升级配置
3. **迁移命令**：提供 `specbridge migrate-config` 命令自动迁移
4. **迁移指南**：在文档中提供详细的迁移指南

---

## 11. 实现路线图

### Phase 1: 数据模型简化（1-2 天）
- [ ] 移除 Story 相关模型
- [ ] 简化 Task 模型
- [ ] 更新 Spec 解析器
- [ ] 添加 Epic 状态计算逻辑
- [ ] 编写单元测试

### Phase 2: Epic 内容同步（1 天）
- [ ] 实现 requirements.md 完整内容读取
- [ ] 实现 Epic 描述格式化
- [ ] 添加进度信息到 Epic 描述
- [ ] 编写单元测试

### Phase 3: GitHub Issue 通道（2 天）
- [ ] 实现 GitHubIssueManager
- [ ] 支持 epic 和 task 两种粒度
- [ ] 实现 Epic 状态自动更新
- [ ] 编写集成测试

### Phase 4: GitHub Project 通道（2-3 天）
- [ ] 实现 GitHubProjectManager
- [ ] 支持 epic 和 task 两种粒度
- [ ] 实现按 spec 分组
- [ ] 编写集成测试

### Phase 5: 双通道关联（1 天）
- [ ] 实现 autoLink 功能
- [ ] Issue 和 Project Item 映射
- [ ] 编写端到端测试

### Phase 6: 部分同步（1 天）
- [ ] 实现 --spec 参数解析
- [ ] 实现 spec 验证逻辑
- [ ] 支持多个 spec 指定
- [ ] 编写单元测试

### Phase 7: 配置迁移（1 天）
- [ ] 实现配置自动降级
- [ ] 实现 migrate-config 命令
- [ ] 添加友好的警告提示
- [ ] 编写单元测试

### Phase 8: 文档和示例（1 天）
- [ ] 更新配置文档
- [ ] 添加使用示例
- [ ] 更新 CLI 帮助信息
- [ ] 编写迁移指南

**总计**: 10-12 天

---

## 12. 测试策略

### 单元测试
- Epic 状态计算逻辑
- 配置解析和验证
- 配置自动降级
- Spec 名称识别

### 集成测试
- GitHub Issue API 调用
- GitHub Project API 调用
- Issue 和 Project 关联
- Epic 状态更新

### 端到端测试
- Epic 粒度完整同步
- Task 粒度完整同步
- 部分同步（--spec）
- 双通道协同工作
- Epic 状态自动更新

---

## 13. 总结

本简化设计方案通过以下核心特性提升了工具的易用性：

1. **简化层级**：移除 Story 层，只保留 Epic-Task 两层结构
2. **自动关联**：Task 自动关联到所属 Spec，无需手动配置
3. **完整内容**：Epic 包含 requirements.md 的完整内容
4. **状态追踪**：Epic 状态根据 Task 完成情况自动更新
5. **部分同步**：支持 --spec 参数，提高同步效率
6. **双通道架构**：GitHub Issue 和 Project 作为独立通道，灵活组合

该方案在保持灵活性的同时，大幅降低了使用复杂度，让用户能够快速上手并获得可预测的同步结果。

