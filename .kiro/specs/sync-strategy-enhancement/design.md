# 同步策略简化与增强 - 设计文档

## 1. 设计概述

### 1.1 设计目标

本设计旨在简化 SpecBridge 的同步策略，通过以下核心改进提升工具的易用性和可预测性：

1. **简化层级结构**：从三层（Epic-Story-Task）简化为两层（Epic-Task）
2. **自动关联机制**：Task 自动关联到所属 Spec（作为 Epic）
3. **完整需求同步**：Epic 包含 requirements.md 的完整内容
4. **智能状态追踪**：Epic 状态根据 Task 完成情况自动更新
5. **灵活同步控制**：支持部分同步（--spec 参数）
6. **双通道架构**：GitHub Issue 和 Project 作为独立通道

### 1.2 设计原则

- **简单优于复杂**：移除不必要的层级和配置
- **约定优于配置**：自动关联减少手动配置
- **渐进式增强**：保持向后兼容，提供平滑迁移路径
- **关注点分离**：Issue 和 Project 作为独立通道
- **可扩展性**：为未来功能预留扩展点

### 1.3 架构变更概览

```
旧架构（三层）:
Spec → Epic → Story → Task

新架构（两层）:
Spec → Epic (包含 requirements.md)
     └─ Task (自动关联到 Epic)
```

---

## 2. 核心设计决策

### 2.1 移除 Story 层

**决策**: 完全移除 Story 粒度，只保留 Epic 和 Task 两种粒度

**理由**:
- 三层结构增加了理解和配置成本
- 实际使用中，大多数项目不需要 Story 这个中间层
- Task 和 Requirement 的关联关系难以维护，容易出错
- 简化后的两层结构更符合实际工作流程

**影响**:
- 配置文件中 `syncLevel: story` 将不再支持
- 旧配置自动降级为 `task` 并给出警告
- 需要清理所有 Story 相关的代码和测试

**替代方案考虑**:
- 保留 Story 但标记为 deprecated：增加维护成本，不推荐
- 提供 Story 到 Task 的自动转换：增加复杂度，不推荐

### 2.2 Task 自动关联到 Spec Epic

**决策**: Task 自动继承所属 Spec 的信息，无需手动配置关联关系

**理由**:
- 文件系统结构已经明确了 Task 的归属（`.kiro/specs/{spec-name}/tasks.md`）
- 自动关联消除了配置错误的可能性
- 简化用户心智模型，降低使用门槛

**实现方式**:
```typescript
// 解析器自动填充 spec 信息
const task: Task = {
  id: '1.1',
  title: '创建用户模型',
  status: TaskStatus.TODO,
  // 自动填充
  specName: 'user-authentication',  // 从路径提取
  specPath: '.kiro/specs/user-authentication',
};
```

**平台映射**:
- **GitHub Issue**: 使用 Label `epic:{spec-name}` 标记归属
- **GitHub Project**: 按 spec 分组显示
- **Jira**: 使用 `Epic Link` 字段关联到 Epic

### 2.3 Epic 包含完整需求文档

**决策**: Epic 同步时必须包含 requirements.md 的完整内容

**理由**:
- 在目标平台直接查看完整需求，无需切换到源文件
- 团队成员可以在 Issue/Epic 中了解完整上下文
- 便于讨论和评审，所有信息集中在一处

**内容格式**:
```markdown
# Epic: 同步策略简化与增强

[requirements.md 的完整内容]

---

## 进度

- 已完成: 5/10 (50%)
- 进行中: 2
- 待开始: 3
```

**处理逻辑**:
- 如果 requirements.md 存在，读取完整内容作为 Epic 描述
- 如果不存在，使用 spec 名称作为标题，Body 为空或默认描述
- 保持 Markdown 格式，确保在各平台的可读性
- 自动添加进度信息到描述末尾

### 2.4 Epic 状态自动更新

**决策**: Epic 状态根据其下所有 Task 的完成情况自动计算和更新

**理由**:
- 自动追踪项目进度，减少手动维护工作
- 提供准确的项目完成度信息
- 保持 Epic 状态与实际进度的一致性

**状态计算规则**:

| Task 完成情况 | Epic 状态 |
|--------------|----------|
| 所有 Task 都是 `done` | `Done` / `Closed` |
| 有 Task 是 `in_progress` 或部分 `done` | `In Progress` / `Open` |
| 所有 Task 都是 `todo` | `Todo` / `Open` |

**实现算法**:
```typescript
function calculateEpicStatus(tasks: Task[]): EpicStatus {
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === TaskStatus.DONE).length;
  const inProgress = tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
  
  const progress = Math.round((completed / total) * 100);
  
  let status: string;
  if (completed === total) {
    status = 'done';
  } else if (inProgress > 0 || completed > 0) {
    status = 'in_progress';
  } else {
    status = 'todo';
  }
  
  return { status, progress, total, completed, inProgress };
}
```

**配置选项**:
- 提供 `autoUpdateEpicStatus` 配置项，允许用户禁用自动更新
- 默认启用自动更新

### 2.5 GitHub 双通道架构

**决策**: 将 GitHub Issue 和 GitHub Project 作为两个独立的同步通道

**理由**:
- Issue 专注于讨论和追踪，Project 专注于可视化管理
- 用户可以根据团队习惯选择合适的工具
- 两者结合时提供最佳的项目管理体验
- 解耦后更容易维护和扩展

**通道定义**:

1. **Issue 通道** (`github-issue`):
   - 创建和管理 GitHub Issue
   - 支持 epic 和 task 两种粒度
   - 使用 Label 标记 Epic 归属

2. **Project 通道** (`github-project`):
   - 创建和管理 GitHub Project V2 Item
   - 支持 epic 和 task 两种粒度
   - 支持按 spec 分组
   - 可选自动关联到 Issue

**配置方式**:
```yaml
# 方式 1：独立配置
targets:
  - type: github-issue
    syncLevel: task
  - type: github-project
    syncLevel: task
    config:
      groupBy: spec
      autoLink: true

# 方式 2：统一配置（语法糖）
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
```

**自动关联机制** (`autoLink`):
- 先同步 Issue，再同步 Project
- Project Item 自动关联到对应的 Issue
- 关联关系持久化，支持增量同步

---

## 3. 数据模型设计

### 3.1 核心模型变更

**新增字段**:

```typescript
// Task 模型增强
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assignee?: string;
  priority?: string;
  labels?: string[];
  syncId?: string;
  
  // 新增：自动关联字段
  specName?: string;   // 所属 spec 名称
  specPath?: string;   // 所属 spec 路径
}

// SpecData 模型增强
export interface SpecData {
  meta: SpecMeta;
  requirements: Requirement[];
  design?: Design;
  tasks: Task[];
  
  // 新增：Epic 信息
  epicTitle: string;         // Spec 名称
  epicDescription: string;   // requirements.md 完整内容
  epicStatus?: EpicStatus;   // Epic 状态（自动计算）
}

// 新增：Epic 状态模型
export interface EpicStatus {
  status: 'todo' | 'in_progress' | 'done';
  progress: number;          // 0-100
  total: number;
  completed: number;
  inProgress: number;
  todo: number;
}
```

**移除字段**:
- 移除所有 Story 相关的模型和字段
- 移除 Task 的 `requirementIds` 字段（改为自动关联）

### 3.2 配置模型变更

```typescript
// 目标配置增强
export interface TargetConfig {
  name: string;
  type: 'jira' | 'github-issue' | 'github-project' | 'github';
  enabled: boolean;
  syncLevel: 'epic' | 'task';  // 移除 'story'
  channels?: ChannelConfig;    // 新增：通道配置
  config: any;
}

// 新增：通道配置
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
  groupBy?: 'spec' | 'none';   // 移除 'requirement' 和 'story'
  autoLink?: boolean;          // 新增：自动关联到 Issue
}
```

---

## 4. 技术实现方案

### 4.1 解析器增强

**文件**: `src/adapters/source/kiro.ts`

**主要变更**:

1. **读取 requirements.md 完整内容**:
```typescript
async parse(specPath: string): Promise<SpecData> {
  const specName = path.basename(specPath);
  
  // 读取 requirements.md 完整内容
  const requirementsPath = path.join(specPath, 'requirements.md');
  const epicDescription = await fileExists(requirementsPath)
    ? await fs.readFile(requirementsPath, 'utf-8')
    : '';
  
  // 解析结构化数据
  const requirements = await this.parseRequirements(requirementsPath);
  const tasks = await this.parseTasks(path.join(specPath, 'tasks.md'));
  
  // 为所有 task 自动填充 spec 信息
  const tasksWithSpec = tasks.map(task => ({
    ...task,
    specName,
    specPath,
  }));
  
  return {
    meta: { name: specName, version: '1.0.0', ... },
    requirements,
    tasks: tasksWithSpec,
    epicTitle: specName,
    epicDescription,
  };
}
```

2. **Task 解析增强**:
```typescript
private parseTasks(tasksPath: string): Task[] {
  // 解析 tasks.md
  // 自动识别 task 状态（[ ], [x], [-]）
  // 提取 assignee（@username）
  // 提取 priority 和 labels
}
```

### 4.2 同步引擎增强

**文件**: `src/core/sync-engine.ts`

**主要变更**:

1. **Epic 状态计算**:
```typescript
private calculateEpicStatus(tasks: Task[]): EpicStatus {
  if (tasks.length === 0) {
    return { status: 'todo', progress: 0, total: 0, completed: 0, inProgress: 0, todo: 0 };
  }
  
  const completed = tasks.filter(t => t.status === TaskStatus.DONE).length;
  const inProgress = tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
  const todo = tasks.length - completed - inProgress;
  const progress = Math.round((completed / tasks.length) * 100);
  
  let status: 'todo' | 'in_progress' | 'done';
  if (completed === tasks.length) {
    status = 'done';
  } else if (inProgress > 0 || completed > 0) {
    status = 'in_progress';
  } else {
    status = 'todo';
  }
  
  return { status, progress, total: tasks.length, completed, inProgress, todo };
}
```

2. **Epic 同步逻辑**:
```typescript
private async syncEpic(
  adapter: TargetAdapter,
  specData: SpecData
): Promise<SyncedItem> {
  // 计算 Epic 状态
  const epicStatus = this.calculateEpicStatus(specData.tasks);
  
  // 在描述中添加进度信息
  const epicDescription = `${specData.epicDescription}\n\n---\n\n## 进度\n\n- 已完成: ${epicStatus.completed}/${epicStatus.total} (${epicStatus.progress}%)\n- 进行中: ${epicStatus.inProgress}\n- 待开始: ${epicStatus.todo}`;
  
  // 同步 Epic
  return await adapter.syncEpic({
    title: specData.epicTitle,
    description: epicDescription,
    status: epicStatus.status,
  });
}
```

3. **部分同步支持**:
```typescript
async syncSpecs(
  source: SourceAdapter,
  targets: TargetAdapter[],
  specNames?: string[]
): Promise<SyncResult[]> {
  // 获取要同步的 spec 列表
  const specsToSync = specNames || await this.getAllSpecs();
  
  // 验证 spec 是否存在
  for (const specName of specsToSync) {
    const specPath = path.join('.kiro/specs', specName);
    if (!await fileExists(specPath)) {
      throw new Error(`Spec not found: ${specName}`);
    }
  }
  
  // 同步每个 spec
  const results: SyncResult[] = [];
  for (const specName of specsToSync) {
    const specPath = path.join('.kiro/specs', specName);
    const specData = await source.parse(specPath);
    
    for (const target of targets) {
      const result = await this.syncToTarget(target, specData);
      results.push(result);
    }
  }
  
  return results;
}
```

### 4.3 GitHub Issue 适配器

**文件**: `src/adapters/target/github-issue.ts`

**主要功能**:

1. **Epic 粒度同步**:
```typescript
async syncEpic(specData: SpecData): Promise<SyncResult> {
  // 创建或更新 Epic Issue
  const issue = await this.octokit.issues.createOrUpdate({
    owner: this.config.owner,
    repo: this.config.repo,
    title: specData.epicTitle,
    body: this.formatEpicBody(specData),
    labels: ['epic', `spec:${specData.meta.name}`],
    state: this.mapEpicStatus(specData.epicStatus),
  });
  
  return { success: true, created: 1, updated: 0, failed: 0, changes: [] };
}

private formatEpicBody(specData: SpecData): string {
  // requirements.md 内容 + 进度信息 + Task Checklist
  const progress = specData.epicStatus;
  const checklist = specData.tasks.map(t => 
    `- [${t.status === TaskStatus.DONE ? 'x' : ' '}] ${t.title}`
  ).join('\n');
  
  return `${specData.epicDescription}\n\n---\n\n## 进度\n\n- 已完成: ${progress.completed}/${progress.total} (${progress.progress}%)\n\n## 任务清单\n\n${checklist}`;
}
```

2. **Task 粒度同步**:
```typescript
async syncTasks(specData: SpecData): Promise<SyncResult> {
  // 先创建或更新 Epic Issue
  const epicIssue = await this.syncEpic(specData);
  
  // 为每个 task 创建 Issue
  const results = [];
  for (const task of specData.tasks) {
    const issue = await this.octokit.issues.createOrUpdate({
      owner: this.config.owner,
      repo: this.config.repo,
      title: task.title,
      body: task.description || '',
      labels: [
        `epic:${specData.meta.name}`,
        `status:${task.status}`,
        ...(task.labels || []),
      ],
      assignees: task.assignee ? [task.assignee] : [],
    });
    
    results.push(issue);
  }
  
  return { success: true, created: results.length, updated: 0, failed: 0, changes: [] };
}
```

3. **Epic 状态映射**:
```typescript
private mapEpicStatus(epicStatus: EpicStatus): 'open' | 'closed' {
  return epicStatus.status === 'done' ? 'closed' : 'open';
}
```

### 4.4 GitHub Project 适配器

**文件**: `src/adapters/target/github-project.ts`

**主要功能**:

1. **Project V2 GraphQL 查询**:
```typescript
private async getProject(): Promise<ProjectV2> {
  const query = `
    query($owner: String!, $number: Int!) {
      organization(login: $owner) {
        projectV2(number: $number) {
          id
          title
          fields(first: 20) {
            nodes {
              ... on ProjectV2Field {
                id
                name
              }
              ... on ProjectV2SingleSelectField {
                id
                name
                options {
                  id
                  name
                }
              }
            }
          }
        }
      }
    }
  `;
  
  const result = await this.graphql(query, {
    owner: this.config.owner,
    number: this.config.projectNumber,
  });
  
  return result.organization.projectV2;
}
```

2. **Epic 粒度同步**:
```typescript
async syncEpic(specData: SpecData): Promise<SyncResult> {
  const project = await this.getProject();
  
  // 创建 Project Item
  const item = await this.createProjectItem({
    projectId: project.id,
    title: specData.epicTitle,
    body: specData.epicDescription,
  });
  
  // 更新自定义字段
  await this.updateItemFields(item.id, {
    Status: this.mapEpicStatus(specData.epicStatus),
    Progress: specData.epicStatus.progress,
  });
  
  return { success: true, created: 1, updated: 0, failed: 0, changes: [] };
}
```

3. **Task 粒度同步（按 spec 分组）**:
```typescript
async syncTasks(specData: SpecData): Promise<SyncResult> {
  const project = await this.getProject();
  
  // 创建 Epic Item
  const epicItem = await this.syncEpic(specData);
  
  // 为每个 task 创建 Item
  for (const task of specData.tasks) {
    const item = await this.createProjectItem({
      projectId: project.id,
      title: task.title,
      body: task.description || '',
    });
    
    // 更新字段
    await this.updateItemFields(item.id, {
      Status: this.mapTaskStatus(task.status),
      Group: specData.meta.name,  // 按 spec 分组
      Assignee: task.assignee,
    });
    
    // 如果启用 autoLink，关联到 Issue
    if (this.config.autoLink && task.syncId) {
      await this.linkToIssue(item.id, task.syncId);
    }
  }
  
  return { success: true, created: specData.tasks.length, updated: 0, failed: 0, changes: [] };
}
```

4. **自动关联到 Issue**:
```typescript
private async linkToIssue(itemId: string, issueId: string): Promise<void> {
  const mutation = `
    mutation($itemId: ID!, $issueId: ID!) {
      updateProjectV2ItemFieldValue(
        input: {
          projectId: $projectId
          itemId: $itemId
          fieldId: $linkedIssueFieldId
          value: { issueId: $issueId }
        }
      ) {
        projectV2Item {
          id
        }
      }
    }
  `;
  
  await this.graphql(mutation, { itemId, issueId });
}
```

### 4.5 配置验证增强

**文件**: `src/core/config.ts`

**主要变更**:

1. **syncLevel 验证**:
```typescript
function validateSyncLevel(syncLevel: string, targetName: string): void {
  const validLevels = ['epic', 'task'];
  
  if (!validLevels.includes(syncLevel)) {
    if (syncLevel === 'story') {
      logger.warn(
        `Target ${targetName}: 'story' syncLevel is no longer supported. ` +
        `Automatically downgrading to 'task'. ` +
        `Please update your configuration.`
      );
      return 'task';  // 自动降级
    }
    
    throw new ConfigParseError(
      `Target ${targetName}: invalid syncLevel '${syncLevel}'. ` +
      `Valid options: ${validLevels.join(', ')}`
    );
  }
  
  return syncLevel;
}
```

2. **通道配置验证**:
```typescript
function validateChannelConfig(config: TargetConfig): void {
  if (config.type === 'github' && config.channels) {
    // 验证至少启用一个通道
    const hasEnabledChannel = 
      config.channels.issue?.enabled || 
      config.channels.project?.enabled;
    
    if (!hasEnabledChannel) {
      throw new ConfigParseError(
        'GitHub target: at least one channel (issue or project) must be enabled'
      );
    }
    
    // 验证 autoLink 只能在两个通道都启用时使用
    if (config.channels.project?.autoLink) {
      if (!config.channels.issue?.enabled) {
        throw new ConfigParseError(
          'GitHub target: autoLink requires both issue and project channels to be enabled'
        );
      }
    }
  }
}
```

### 4.6 CLI 命令增强

**文件**: `src/cli/commands/sync.ts`

**主要变更**:

1. **添加 --spec 参数**:
```typescript
program
  .command('sync')
  .description('同步规格文档到目标平台')
  .option('--spec <name...>', '指定要同步的 spec（可多次指定）')
  .option('--dry-run', '预览同步结果，不实际执行')
  .option('--verbose', '显示详细日志')
  .action(async (options) => {
    try {
      // 加载配置
      const config = await loadConfig();
      
      // 初始化适配器
      const source = createSourceAdapter(config.source);
      const targets = config.targets
        .filter(t => t.enabled)
        .map(t => createTargetAdapter(t));
      
      // 执行同步
      const results = await syncEngine.syncSpecs(
        source,
        targets,
        options.spec  // 传递 spec 列表
      );
      
      // 显示结果
      displaySyncResults(results);
    } catch (error) {
      logger.error('同步失败:', error.message);
      process.exit(1);
    }
  });
```

2. **添加 migrate-config 命令**:
```typescript
program
  .command('migrate-config')
  .description('迁移配置文件到新格式')
  .option('--backup', '备份旧配置文件')
  .action(async (options) => {
    try {
      const configPath = path.join(process.cwd(), '.specbridge.yaml');
      
      // 备份
      if (options.backup) {
        await fs.copyFile(configPath, `${configPath}.backup`);
        logger.info('配置文件已备份');
      }
      
      // 读取旧配置
      const oldConfig = await loadConfig();
      
      // 转换配置
      const newConfig = migrateConfig(oldConfig);
      
      // 写入新配置
      await writeYaml(configPath, newConfig);
      
      logger.success('配置文件已迁移到新格式');
    } catch (error) {
      logger.error('迁移失败:', error.message);
      process.exit(1);
    }
  });
```

---

## 5. 配置迁移方案

### 5.1 自动降级策略

**旧配置**:
```yaml
targets:
  - type: github
    syncLevel: story  # 不再支持
```

**自动转换为**:
```yaml
targets:
  - type: github-issue
    syncLevel: task  # 自动降级
```

**警告消息**:
```
⚠️  Warning: 'story' syncLevel is no longer supported and has been automatically 
downgraded to 'task'. Please update your configuration file.

Run 'specbridge migrate-config' to update your configuration to the new format.
```

### 5.2 配置迁移函数

```typescript
function migrateConfig(oldConfig: Config): Config {
  const newConfig = { ...oldConfig };
  
  newConfig.targets = oldConfig.targets.map(target => {
    // 降级 story 为 task
    if (target.syncLevel === 'story') {
      target.syncLevel = 'task';
    }
    
    // 转换 github 类型为双通道配置
    if (target.type === 'github' && !target.channels) {
      return {
        ...target,
        channels: {
          issue: {
            enabled: true,
            syncLevel: target.syncLevel,
          },
          project: {
            enabled: false,
          },
        },
      };
    }
    
    return target;
  });
  
  return newConfig;
}
```

---

## 6. 测试策略

### 6.1 单元测试

**测试文件**: `src/core/sync-engine.test.ts`

**测试用例**:

1. **Epic 状态计算**:
```typescript
describe('calculateEpicStatus', () => {
  it('should return done when all tasks are completed', () => {
    const tasks = [
      { status: TaskStatus.DONE },
      { status: TaskStatus.DONE },
    ];
    const status = calculateEpicStatus(tasks);
    expect(status.status).toBe('done');
    expect(status.progress).toBe(100);
  });
  
  it('should return in_progress when some tasks are completed', () => {
    const tasks = [
      { status: TaskStatus.DONE },
      { status: TaskStatus.TODO },
    ];
    const status = calculateEpicStatus(tasks);
    expect(status.status).toBe('in_progress');
    expect(status.progress).toBe(50);
  });
  
  it('should return todo when no tasks are completed', () => {
    const tasks = [
      { status: TaskStatus.TODO },
      { status: TaskStatus.TODO },
    ];
    const status = calculateEpicStatus(tasks);
    expect(status.status).toBe('todo');
    expect(status.progress).toBe(0);
  });
});
```

2. **部分同步**:
```typescript
describe('syncSpecs', () => {
  it('should sync only specified specs', async () => {
    const results = await syncEngine.syncSpecs(
      source,
      targets,
      ['spec1', 'spec2']
    );
    
    expect(results).toHaveLength(2);
  });
  
  it('should throw error for non-existent spec', async () => {
    await expect(
      syncEngine.syncSpecs(source, targets, ['non-existent'])
    ).rejects.toThrow('Spec not found: non-existent');
  });
});
```

3. **配置验证**:
```typescript
describe('validateConfig', () => {
  it('should reject story syncLevel', () => {
    const config = {
      version: '1.0',
      source: { type: 'kiro' },
      targets: [{ type: 'github', syncLevel: 'story' }],
    };
    
    expect(() => validateConfig(config)).toThrow();
  });
  
  it('should accept epic and task syncLevel', () => {
    const config = {
      version: '1.0',
      source: { type: 'kiro' },
      targets: [
        { type: 'github', syncLevel: 'epic' },
        { type: 'github', syncLevel: 'task' },
      ],
    };
    
    expect(() => validateConfig(config)).not.toThrow();
  });
});
```

### 6.2 集成测试

**测试文件**: `src/adapters/target/github-issue.integration.test.ts`

**测试用例**:

1. **Epic 粒度同步**:
```typescript
describe('GitHub Issue Adapter - Epic Level', () => {
  it('should create epic issue with requirements content', async () => {
    const specData = {
      epicTitle: 'Test Feature',
      epicDescription: '# Requirements\n\nTest content',
      tasks: [
        { id: '1', title: 'Task 1', status: TaskStatus.TODO },
      ],
    };
    
    const result = await adapter.syncEpic(specData);
    
    expect(result.success).toBe(true);
    expect(result.created).toBe(1);
    
    // 验证 Issue 内容
    const issue = await octokit.issues.get({ issue_number: result.issueNumber });
    expect(issue.data.body).toContain('# Requirements');
    expect(issue.data.body).toContain('## 任务清单');
  });
});
```

2. **Task 粒度同步**:
```typescript
describe('GitHub Issue Adapter - Task Level', () => {
  it('should create epic and task issues', async () => {
    const specData = {
      meta: { name: 'test-feature' },
      epicTitle: 'Test Feature',
      epicDescription: 'Test content',
      tasks: [
        { id: '1', title: 'Task 1', status: TaskStatus.TODO },
        { id: '2', title: 'Task 2', status: TaskStatus.DONE },
      ],
    };
    
    const result = await adapter.syncTasks(specData);
    
    expect(result.success).toBe(true);
    expect(result.created).toBe(3);  // 1 epic + 2 tasks
    
    // 验证 Task Issue 有正确的 Label
    const taskIssue = await octokit.issues.get({ issue_number: result.taskIssues[0] });
    expect(taskIssue.data.labels).toContainEqual(
      expect.objectContaining({ name: 'epic:test-feature' })
    );
  });
});
```

3. **Epic 状态自动更新**:
```typescript
describe('Epic Status Auto Update', () => {
  it('should close epic when all tasks are done', async () => {
    const specData = {
      epicTitle: 'Test Feature',
      tasks: [
        { id: '1', status: TaskStatus.DONE },
        { id: '2', status: TaskStatus.DONE },
      ],
      epicStatus: { status: 'done', progress: 100 },
    };
    
    const result = await adapter.syncEpic(specData);
    
    const issue = await octokit.issues.get({ issue_number: result.issueNumber });
    expect(issue.data.state).toBe('closed');
  });
  
  it('should keep epic open when tasks are incomplete', async () => {
    const specData = {
      epicTitle: 'Test Feature',
      tasks: [
        { id: '1', status: TaskStatus.DONE },
        { id: '2', status: TaskStatus.TODO },
      ],
      epicStatus: { status: 'in_progress', progress: 50 },
    };
    
    const result = await adapter.syncEpic(specData);
    
    const issue = await octokit.issues.get({ issue_number: result.issueNumber });
    expect(issue.data.state).toBe('open');
  });
});
```

### 6.3 端到端测试

**测试文件**: `tests/e2e/sync-workflow.test.ts`

**测试场景**:

1. **完整同步流程**:
```typescript
describe('E2E: Full Sync Workflow', () => {
  it('should sync spec to GitHub Issue and Project', async () => {
    // 准备测试 spec
    await createTestSpec('test-feature', {
      requirements: '# Test Requirements',
      tasks: [
        '- [ ] Task 1',
        '- [x] Task 2',
      ],
    });
    
    // 执行同步
    await execSync('specbridge sync --spec test-feature');
    
    // 验证 Issue 创建
    const issues = await octokit.issues.listForRepo({
      owner: 'test-org',
      repo: 'test-repo',
      labels: 'spec:test-feature',
    });
    
    expect(issues.data).toHaveLength(3);  // 1 epic + 2 tasks
    
    // 验证 Project Item 创建
    const projectItems = await getProjectItems();
    expect(projectItems).toHaveLength(3);
  });
});
```

2. **部分同步**:
```typescript
describe('E2E: Partial Sync', () => {
  it('should sync only specified specs', async () => {
    await createTestSpec('spec1');
    await createTestSpec('spec2');
    await createTestSpec('spec3');
    
    // 只同步 spec1 和 spec2
    await execSync('specbridge sync --spec spec1 --spec spec2');
    
    // 验证只有 spec1 和 spec2 被同步
    const issues = await octokit.issues.listForRepo({
      owner: 'test-org',
      repo: 'test-repo',
    });
    
    const spec1Issues = issues.data.filter(i => 
      i.labels.some(l => l.name === 'spec:spec1')
    );
    const spec2Issues = issues.data.filter(i => 
      i.labels.some(l => l.name === 'spec:spec2')
    );
    const spec3Issues = issues.data.filter(i => 
      i.labels.some(l => l.name === 'spec:spec3')
    );
    
    expect(spec1Issues.length).toBeGreaterThan(0);
    expect(spec2Issues.length).toBeGreaterThan(0);
    expect(spec3Issues.length).toBe(0);
  });
});
```

---

## 7. 性能优化

### 7.1 批量 API 调用

**问题**: 大量 Task 同步时，逐个调用 API 效率低下

**解决方案**: 使用批量 API（如果平台支持）或并发控制

```typescript
async syncTasks(tasks: Task[]): Promise<SyncResult> {
  // 使用 Promise.all 并发创建，但限制并发数
  const CONCURRENCY_LIMIT = 5;
  const results = [];
  
  for (let i = 0; i < tasks.length; i += CONCURRENCY_LIMIT) {
    const batch = tasks.slice(i, i + CONCURRENCY_LIMIT);
    const batchResults = await Promise.all(
      batch.map(task => this.createTaskIssue(task))
    );
    results.push(...batchResults);
  }
  
  return { success: true, created: results.length, ... };
}
```

### 7.2 增量同步

**问题**: 每次同步都处理所有数据，即使没有变化

**解决方案**: 使用同步状态文件追踪变更

```typescript
// .specbridge/sync-state.json
{
  "lastSync": "2024-01-20T10:00:00Z",
  "specs": {
    "test-feature": {
      "lastModified": "2024-01-20T09:00:00Z",
      "epicIssueId": "123",
      "taskIssueIds": ["124", "125"]
    }
  }
}

// 增量同步逻辑
async syncSpecs(specNames: string[]): Promise<SyncResult[]> {
  const syncState = await loadSyncState();
  const results = [];
  
  for (const specName of specNames) {
    const specPath = path.join('.kiro/specs', specName);
    const lastModified = await getLastModified(specPath);
    
    // 检查是否需要同步
    if (syncState.specs[specName]?.lastModified === lastModified) {
      logger.debug(`Spec ${specName} has not changed, skipping`);
      continue;
    }
    
    // 执行同步
    const result = await this.syncSpec(specName);
    results.push(result);
    
    // 更新同步状态
    syncState.specs[specName] = {
      lastModified,
      ...result.metadata,
    };
  }
  
  await saveSyncState(syncState);
  return results;
}
```

### 7.3 API 速率限制处理

**问题**: GitHub API 有速率限制（5000 请求/小时）

**解决方案**: 实现指数退避重试机制

```typescript
async callApiWithRetry<T>(
  apiCall: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error: any) {
      if (error.status === 429) {  // Rate limit exceeded
        const retryAfter = error.response.headers['retry-after'] || 60;
        const delay = Math.pow(2, attempt) * 1000;  // 指数退避
        
        logger.warn(`Rate limit exceeded, retrying after ${delay}ms`);
        await sleep(delay);
      } else {
        throw error;
      }
    }
  }
  
  throw new Error('Max retries exceeded');
}
```

---

## 8. 错误处理

### 8.1 错误类型定义

```typescript
// src/utils/errors.ts

export class SpecNotFoundError extends Error {
  constructor(specName: string) {
    super(`Spec not found: ${specName}`);
    this.name = 'SpecNotFoundError';
  }
}

export class EpicSyncError extends Error {
  constructor(specName: string, cause: string) {
    super(`Failed to sync epic for spec ${specName}: ${cause}`);
    this.name = 'EpicSyncError';
  }
}

export class TaskSyncError extends Error {
  constructor(taskId: string, cause: string) {
    super(`Failed to sync task ${taskId}: ${cause}`);
    this.name = 'TaskSyncError';
  }
}
```

### 8.2 错误隔离

**原则**: 单个 Task 同步失败不应影响其他 Task

```typescript
async syncTasks(tasks: Task[]): Promise<SyncResult> {
  const results = {
    success: true,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  };
  
  for (const task of tasks) {
    try {
      await this.syncTask(task);
      results.created++;
    } catch (error: any) {
      logger.error(`Failed to sync task ${task.id}: ${error.message}`);
      results.failed++;
      results.errors.push({
        taskId: task.id,
        error: error.message,
      });
      // 继续处理下一个 task
    }
  }
  
  results.success = results.failed === 0;
  return results;
}
```

### 8.3 友好的错误消息

```typescript
function formatErrorMessage(error: Error): string {
  if (error instanceof SpecNotFoundError) {
    return `
❌ 找不到指定的 spec

请检查 spec 名称是否正确，或运行以下命令查看所有可用的 spec：

  specbridge status

可用的 spec 列表：
  - sync-strategy-enhancement
  - user-authentication
    `;
  }
  
  if (error instanceof ConfigParseError) {
    return `
❌ 配置文件解析失败

${error.message}

请检查 .specbridge.yaml 文件的格式是否正确。
参考文档: https://github.com/specbridge/docs/configuration
    `;
  }
  
  return error.message;
}
```

---

## 9. 文档更新计划

### 9.1 配置文档 (CONFIGURATION.md)

**新增章节**:

1. **同步粒度**:
   - 只支持 epic 和 task 两种粒度
   - 移除 story 粒度的说明
   - 添加粒度选择指南

2. **GitHub 双通道配置**:
   - Issue 通道配置
   - Project 通道配置
   - autoLink 配置
   - 配置示例

3. **Epic 状态自动更新**:
   - 状态计算规则
   - 如何禁用自动更新
   - 状态映射表

### 9.2 CLI 使用文档 (CLI_USAGE.md)

**新增章节**:

1. **部分同步**:
   ```bash
   # 同步单个 spec
   specbridge sync --spec sync-strategy-enhancement
   
   # 同步多个 spec
   specbridge sync --spec spec1 --spec spec2
   
   # 预览同步结果
   specbridge sync --spec spec1 --dry-run
   ```

2. **配置迁移**:
   ```bash
   # 迁移配置文件
   specbridge migrate-config --backup
   ```

### 9.3 迁移指南 (MIGRATION.md)

**新文档**:

```markdown
# 迁移指南：从旧版本升级到 2.0

## 主要变更

1. **移除 Story 粒度**
2. **Task 自动关联到 Spec**
3. **Epic 包含完整需求文档**
4. **Epic 状态自动更新**
5. **GitHub 双通道架构**

## 迁移步骤

### 1. 备份配置文件

```bash
cp .specbridge.yaml .specbridge.yaml.backup
```

### 2. 运行迁移命令

```bash
specbridge migrate-config
```

### 3. 验证配置

```bash
specbridge sync --dry-run
```

## 配置变更对照表

| 旧配置 | 新配置 | 说明 |
|--------|--------|------|
| `syncLevel: story` | `syncLevel: task` | Story 粒度已移除，自动降级为 task |
| `type: github` | `type: github-issue` 或 `type: github` + `channels` | GitHub 拆分为两个独立通道 |

## 常见问题

### Q: 我的旧配置还能用吗？

A: 可以。旧配置会自动降级，但建议运行 `migrate-config` 更新到新格式。

### Q: Story 粒度的数据会丢失吗？

A: 不会。已同步的数据不受影响，只是新的同步会使用 task 粒度。
```

---

## 10. 实现路线图

### Phase 1: 数据模型简化 (2 天)

**任务**:
- [ ] 1.1 移除 Story 相关模型定义
- [ ] 1.2 更新 Task 模型，添加 specName 和 specPath 字段
- [ ] 1.3 更新 SpecData 模型，添加 Epic 相关字段
- [ ] 1.4 创建 EpicStatus 模型
- [ ] 1.5 编写单元测试

**验收标准**:
- 所有 Story 相关代码已移除
- 新模型定义完整且有 TypeScript 类型
- 单元测试覆盖率 > 80%

### Phase 2: 解析器增强 (2 天)

**任务**:
- [ ] 2.1 实现 requirements.md 完整内容读取
- [ ] 2.2 实现 Task 自动填充 spec 信息
- [ ] 2.3 实现 Epic 描述格式化
- [ ] 2.4 编写单元测试

**验收标准**:
- 解析器能正确读取 requirements.md 完整内容
- Task 自动包含 specName 和 specPath
- 单元测试通过

### Phase 3: 同步引擎增强 (2 天)

**任务**:
- [ ] 3.1 实现 Epic 状态计算逻辑
- [ ] 3.2 实现 Epic 同步逻辑
- [ ] 3.3 实现部分同步支持（--spec 参数）
- [ ] 3.4 实现 spec 验证逻辑
- [ ] 3.5 编写单元测试

**验收标准**:
- Epic 状态计算正确
- 部分同步功能正常工作
- 单元测试通过

### Phase 4: GitHub Issue 适配器 (2 天)

**任务**:
- [ ] 4.1 创建 GitHubIssueAdapter 类
- [ ] 4.2 实现 Epic 粒度同步
- [ ] 4.3 实现 Task 粒度同步
- [ ] 4.4 实现 Epic 状态映射和更新
- [ ] 4.5 编写集成测试

**验收标准**:
- Epic 和 Task 粒度同步正常工作
- Epic 状态自动更新
- 集成测试通过

### Phase 5: GitHub Project 适配器 (3 天)

**任务**:
- [ ] 5.1 创建 GitHubProjectAdapter 类
- [ ] 5.2 实现 Project V2 GraphQL 查询
- [ ] 5.3 实现 Epic 粒度同步
- [ ] 5.4 实现 Task 粒度同步（按 spec 分组）
- [ ] 5.5 实现 autoLink 功能
- [ ] 5.6 编写集成测试

**验收标准**:
- Project 同步正常工作
- 按 spec 分组显示
- autoLink 功能正常
- 集成测试通过

### Phase 6: 配置验证和迁移 (1 天)

**任务**:
- [ ] 6.1 实现 syncLevel 验证和自动降级
- [ ] 6.2 实现通道配置验证
- [ ] 6.3 实现 migrate-config 命令
- [ ] 6.4 添加友好的警告提示
- [ ] 6.5 编写单元测试

**验收标准**:
- 配置验证正确
- 自动降级功能正常
- migrate-config 命令可用
- 单元测试通过

### Phase 7: CLI 命令增强 (1 天)

**任务**:
- [ ] 7.1 添加 --spec 参数支持
- [ ] 7.2 实现 spec 验证和错误提示
- [ ] 7.3 更新 --dry-run 支持部分同步
- [ ] 7.4 更新帮助信息
- [ ] 7.5 编写端到端测试

**验收标准**:
- --spec 参数正常工作
- 错误提示友好
- 端到端测试通过

### Phase 8: 文档和示例 (1 天)

**任务**:
- [ ] 8.1 更新 CONFIGURATION.md
- [ ] 8.2 更新 CLI_USAGE.md
- [ ] 8.3 创建 MIGRATION.md
- [ ] 8.4 更新 README.md
- [ ] 8.5 添加配置示例文件

**验收标准**:
- 所有文档更新完成
- 至少 4 个配置示例
- 迁移指南清晰易懂

**总计**: 14 天

---

## 11. 风险和缓解措施

### 11.1 技术风险

**风险 1**: GitHub Project V2 API 复杂度高

- **影响**: 开发进度延迟
- **概率**: 中
- **缓解**: 
  - 提前研究 API 文档和示例
  - 使用 GraphQL Playground 测试查询
  - 参考官方 SDK 实现

**风险 2**: Epic 状态自动更新可能与手动更新冲突

- **影响**: 用户手动修改的状态被覆盖
- **概率**: 低
- **缓解**:
  - 提供 `autoUpdateEpicStatus` 配置项
  - 文档中明确说明行为
  - 记录状态变更日志

**风险 3**: 大量 Task 同步触发 API 速率限制

- **影响**: 同步失败或速度缓慢
- **概率**: 高
- **缓解**:
  - 实现并发控制（限制为 5 个并发请求）
  - 实现指数退避重试机制
  - 提供进度提示

### 11.2 业务风险

**风险 1**: 用户不理解新的简化结构

- **影响**: 配置错误导致同步失败
- **概率**: 低
- **缓解**:
  - 提供详细文档和配置示例
  - 友好的错误提示
  - 提供 migrate-config 命令

**风险 2**: 迁移过程中数据丢失

- **影响**: 用户数据损坏
- **概率**: 低
- **缓解**:
  - migrate-config 自动备份配置文件
  - 提供回滚机制
  - 文档中说明迁移步骤

---

## 12. 可扩展性设计

### 12.1 适配器接口扩展

为未来功能预留扩展点：

```typescript
interface TargetAdapter {
  // 现有方法
  syncRequirements(reqs: Requirement[]): Promise<SyncResult>;
  syncTasks(tasks: Task[]): Promise<SyncResult>;
  syncDesign?(design: Design): Promise<SyncResult>;
  
  // 新增：Epic 同步
  syncEpic?(epic: Epic): Promise<SyncResult>;
  
  // 预留：状态双向同步
  fetchTaskStatus?(taskId: string): Promise<TaskStatus>;
  fetchEpicStatus?(epicId: string): Promise<EpicStatus>;
  
  // 预留：评论同步
  syncComments?(comments: Comment[]): Promise<SyncResult>;
}
```

### 12.2 配置扩展

为未来功能预留配置选项：

```yaml
targets:
  - type: github
    syncLevel: task
    
    # 现有配置
    channels:
      issue:
        enabled: true
      project:
        enabled: true
        autoLink: true
    
    # 预留：状态双向同步
    bidirectionalSync:
      enabled: false
      interval: 300  # 秒
    
    # 预留：评论同步
    syncComments:
      enabled: false
      direction: both  # to-platform | from-platform | both
    
    # 预留：自定义字段映射
    fieldMapping:
      priority:
        high: P0
        medium: P1
        low: P2
```

---

## 13. 总结

本设计文档详细描述了 SpecBridge 同步策略简化与增强的技术方案，核心改进包括：

1. **简化层级结构**：从三层简化为两层，降低使用复杂度
2. **自动关联机制**：Task 自动关联到 Spec，消除配置错误
3. **完整需求同步**：Epic 包含 requirements.md 完整内容，提供完整上下文
4. **智能状态追踪**：Epic 状态自动更新，准确反映项目进度
5. **灵活同步控制**：支持部分同步，提高效率
6. **双通道架构**：GitHub Issue 和 Project 独立可选，灵活组合

该方案在保持灵活性的同时，大幅降低了使用复杂度，提供了可预测的同步结果，并为未来功能扩展预留了空间。

**预估开发时间**: 14 天
**预估测试时间**: 3 天
**总计**: 17 天
