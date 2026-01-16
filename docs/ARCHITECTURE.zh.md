# SpecBridge 架构设计

## 概述

SpecBridge 是一个轻量级的客户端 CLI 工具，用于将 AI 生成的规格文档（如 Kiro）同步到项目管理平台（GitHub、Jira、CodeUp 等）。

## 核心原则

1. **轻量化**：无需服务器，完全在客户端运行
2. **双适配器模式**：源适配器（读取规格）+ 目标适配器（同步到平台）
3. **配置驱动**：简单的 YAML 配置
4. **可扩展**：基于插件的架构，支持自定义适配器

## 架构图

```
                      SpecBridge CLI                          
                                                               
                             
     源适配器               目标适配器                      
                             
                                                            
                                                            
                                     
    Kiro                    GitHub                       
  OpenSpec                   Jira                        
   自定义                   CodeUp                       
                                     
                                                               
                                          
                同步引擎                                 
                (核心逻辑)                                
                                          
                                                               
                                          
                配置管理器                              
                                          
```

## 数据流

```
1. 读取规格文件（源适配器）
    ↓ 解析为统一数据模型
        ↓ 根据目标配置转换
            ↓ 同步到平台（目标适配器）
                ↓ 更新状态并通知
```

## 核心组件

### 1. 统一数据模型

所有适配器转换的中心数据结构：

```typescript
interface SpecData {
  meta: SpecMeta;
  requirements: Requirement[];
  design?: Design;
  tasks: Task[];
}
```

### 2. 源适配器接口

从各种来源读取和解析规格文件：

```typescript
interface SourceAdapter {
  name: string;
  detect(path: string): boolean;
  parse(path: string): Promise<SpecData>;
  watch?(path: string, callback: (data: SpecData) => void): void;
}
```

**实现：**
- `KiroAdapter`：从 `.kiro/specs/*.md` 读取
- `OpenSpecAdapter`：（计划中）读取 OpenSpec 格式
- `CustomAdapter`：用户自定义适配器

### 3. 目标适配器接口

将数据同步到项目管理平台：

```typescript
interface TargetAdapter {
  name: string;
  init(config: any): Promise<void>;
  syncRequirements(reqs: Requirement[]): Promise<SyncResult>;
  syncTasks(tasks: Task[]): Promise<SyncResult>;
  syncDesign?(design: Design): Promise<SyncResult>;
  getTaskStatus(taskId: string): Promise<TaskStatus>;
}
```

**实现：**
- `GitHubAdapter`：同步到 GitHub Issues
- `JiraAdapter`：（计划中）同步到 Jira Stories/Epics
- `CodeUpAdapter`：（计划中）同步到 CodeUp

### 4. 同步引擎

核心同步逻辑：

```typescript
class SyncEngine {
  async sync(source: SourceAdapter, targets: TargetAdapter[]): Promise<void>
  async watch(source: SourceAdapter, targets: TargetAdapter[]): Promise<void>
  async getStatus(): Promise<SyncStatus>
}
```

### 5. 配置管理器

处理配置加载和验证：

```typescript
interface Config {
  version: string;
  source: SourceConfig;
  targets: TargetConfig[];
  notifications?: NotificationConfig[];
}
```

## 文件结构

```
specbridge/
 src/
    index.ts                    # CLI 入口
    core/
       models.ts               # 统一数据模型
       sync-engine.ts          # 核心同步逻辑
       config.ts               # 配置管理
    adapters/
       source/
          base.ts            # 源适配器接口
          kiro.ts            # Kiro 实现
          openspec.ts        # OpenSpec 实现
       target/
           base.ts            # 目标适配器接口
           github.ts          # GitHub 实现
           jira.ts            # Jira 实现
           codeup.ts          # CodeUp 实现
    cli/
       commands/
          init.ts            # 初始化配置
          sync.ts            # 一次性同步
          watch.ts           # 持续同步
          status.ts          # 检查同步状态
       utils.ts
    utils/
        logger.ts
        file.ts
 docs/
    ARCHITECTURE.zh.md          # 本文件
    ADAPTER_GUIDE.zh.md         # 如何创建适配器
    CONFIGURATION.zh.md         # 配置参考
    CLI_USAGE.zh.md             # CLI 命令
 examples/
    .specbridge.yaml            # 示例配置
 plugins/                        # 用户自定义适配器
```

## 配置格式

```yaml
version: "1.0"

# 源配置
source:
  type: kiro  # kiro | openspec | custom
  path: .kiro/specs  # 可选，自动检测

# 目标平台（支持多个）
targets:
  - name: github-issues
    type: github
    enabled: true
    config:
      owner: your-org
      repo: your-repo
      token: ${GITHUB_TOKEN}
    mapping:
      requirements: issue
      tasks: issue
      
  - name: jira-project
    type: jira
    enabled: false
    config:
      url: https://company.atlassian.net
      project: PROJ
      token: ${JIRA_TOKEN}
    mapping:
      requirements: epic
      tasks: story

# 通知（可选）
notifications:
  - type: slack
    webhook: ${SLACK_WEBHOOK}
    events: [task_completed, requirement_updated]
```

## Kiro 适配器实现

### 规格文件结构

Kiro 将规格存储在 `.kiro/specs/[feature-name]/`：
- `requirements.md` - 功能需求
- `design.md` - 设计文档
- `tasks.md` - 任务分解

### 解析策略

1. **requirements.md**：
   ```markdown
   ## 需求 1：用户认证
   用户应该能够使用邮箱/密码登录
   
   优先级：高
   标签：认证、安全
   ```

2. **tasks.md**：
   ```markdown
   - [ ] 任务 1：创建登录 API (@john)
   - [x] 任务 2：添加 JWT 验证
   - [ ] 任务 3：实现密码重置
   ```

3. **design.md**：
   ```markdown
   ## 架构
   使用 JWT 认证的 REST API
   
   ## 组件
   - AuthController
   - UserService
   - TokenManager
   ```

### 映射到统一模型

```typescript
{
  meta: {
    name: "user-authentication",
    version: "1.0.0",
    createdAt: "2026-01-16T00:00:00Z",
    updatedAt: "2026-01-16T12:00:00Z"
  },
  requirements: [
    {
      id: "user-authentication",
      title: "用户认证",
      description: "用户应该能够登录...",
      priority: "high",
      labels: ["auth", "security"]
    }
  ],
  tasks: [
    {
      id: "create-login-api",
      title: "创建登录 API",
      description: "",
      status: "todo",
      assignee: "john"
    },
    {
      id: "add-jwt-validation",
      title: "添加 JWT 验证",
      description: "",
      status: "done"
    }
  ]
}
```

## GitHub 适配器实现

### 同步策略

1. **Issue 创建**：
   - 为每个任务创建 GitHub Issue
   - 添加自定义标签：`specbridge:task-id:{id}`
   - 如果指定则设置负责人

2. **Issue 更新**：
   - 通过自定义标签查找现有 issue
   - 更新标题、正文、状态
   - 如果任务状态为 "done" 则关闭 issue

3. **状态跟踪**：
   - 通过标签查询 issues
   - 将 GitHub 状态映射到统一状态
   - 返回状态映射

### Issue 正文示例

```markdown
创建登录 API 端点

---
**状态**：待办
**预估**：4小时
**依赖**：database-setup

_由 SpecBridge 同步_
```

## 扩展点

### 1. 自定义源适配器

用户可以创建自定义适配器：

```typescript
// plugins/my-source-adapter.ts
import { SourceAdapter, SpecData } from 'specbridge';

export class MySourceAdapter implements SourceAdapter {
  name = 'my-source';
  
  detect(path: string): boolean {
    // 检测逻辑
  }
  
  async parse(path: string): Promise<SpecData> {
    // 解析逻辑
  }
}
```

### 2. 自定义目标适配器

```typescript
// plugins/my-target-adapter.ts
import { TargetAdapter, Task, SyncResult } from 'specbridge';

export class MyTargetAdapter implements TargetAdapter {
  name = 'my-target';
  
  async init(config: any): Promise<void> {
    // 初始化 API 客户端
  }
  
  async syncTasks(tasks: Task[]): Promise<SyncResult> {
    // 同步逻辑
  }
}
```

### 3. 插件加载

```yaml
# .specbridge.yaml
source:
  type: custom
  plugin: ./plugins/my-source-adapter.js

targets:
  - name: custom-platform
    type: custom
    plugin: ./plugins/my-target-adapter.js
```

## 技术栈

- **语言**：TypeScript
- **运行时**：Node.js 18+
- **CLI 框架**：Commander.js
- **GitHub API**：@octokit/rest
- **Jira API**：jira-client
- **配置**：YAML 解析器
- **日志**：chalk + ora
- **构建**：TypeScript Compiler
- **打包**：pkg（单一可执行文件）

## 开发工作流

```bash
# 1. 安装依赖
npm install

# 2. 开发模式运行
npm run dev -- sync

# 3. 构建
npm run build

# 4. 打包为可执行文件
npm run package

# 5. 测试
./dist/bin/specbridge-win.exe sync
```

## 部署

### NPM 包

```bash
npm publish
npm install -g specbridge
```

### 二进制分发

```bash
# 为所有平台构建
npm run package

# 分发二进制文件
dist/bin/specbridge-win.exe
dist/bin/specbridge-linux
dist/bin/specbridge-macos
```

## 安全考虑

1. **凭证**：存储在环境变量中，永远不要在配置文件中
2. **令牌权限**：使用最小必需的权限范围
3. **本地存储**：配置存储在 `.specbridge.yaml`（添加到 .gitignore）
4. **API 速率限制**：实现指数退避

## 性能

- **解析**：使用流式读取处理大型规格文件
- **同步**：尽可能批量调用 API
- **缓存**：缓存已解析的规格以避免重复解析
- **并发**：并行同步到多个目标平台

## 错误处理

```typescript
try {
  await syncEngine.sync(source, targets);
} catch (error) {
  if (error instanceof AuthenticationError) {
    logger.error('认证失败，请检查您的令牌配置');
  } else if (error instanceof RateLimitError) {
    logger.warn('超出速率限制，60秒后重试...');
  } else {
    logger.error('同步失败:', error.message);
  }
}
```

## 未来增强

1. **VSCode 扩展**：直接集成到 IDE
2. **Web 仪表板**：可选的 Web UI 用于状态监控
3. **双向同步**：从平台拉取更新回规格文档
4. **AI 集成**：自动生成任务描述
5. **分析**：跟踪同步历史和指标
