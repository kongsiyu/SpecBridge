# 实现计划：同步策略简化与增强

## 概述

本实现计划将同步策略简化与增强功能分解为具体的编码任务。主要目标是简化 SpecBridge 的同步策略，从三层结构（Epic-Story-Task）简化为两层（Epic-Task），并增强功能支持。

核心改进：
- **简化层级结构**：移除 Story 层，只保留 Epic 和 Task 两种粒度
- **自动关联机制**：Task 自动关联到所属 Spec（作为 Epic）
- **完整需求同步**：Epic 包含 requirements.md 的完整内容
- **智能状态追踪**：Epic 状态根据 Task 完成情况自动更新
- **灵活同步控制**：支持部分同步（--spec 参数）
- **双通道架构**：GitHub Issue 和 Project 作为独立通道

## 任务列表

### 阶段 1：数据模型简化与增强

#### 1.1 更新核心数据模型
- [x] 1. 扩展 Task 接口支持 Spec 关联 (REQ-003)
  - 在 `src/core/models.ts` 中的 Task 接口添加 `specName?: string` 字段
  - 添加 `specPath?: string` 字段
  - 更新 JSDoc 注释说明字段用途

- [x] 2. 创建 Epic 状态模型 (REQ-004)
  - 在 `src/core/models.ts` 中创建 EpicStatus 接口
  - 定义 status 字段（'todo' | 'in_progress' | 'done'）
  - 定义 progress 字段（0-100 的数字）
  - 定义 total、completed、inProgress、todo 统计字段
  - 添加完整的 JSDoc 注释

- [x] 3. 扩展 SpecData 接口支持 Epic 信息 (REQ-002)
  - 在 `src/core/models.ts` 中的 SpecData 接口添加 `epicTitle: string` 字段
  - 添加 `epicDescription: string` 字段（存储 requirements.md 完整内容）
  - 添加 `epicStatus?: EpicStatus` 字段
  - 更新 JSDoc 注释

- [x] 4. 编写数据模型单元测试
  - 在 `src/core/models.test.ts` 中添加 EpicStatus 接口测试
  - 测试 Task 接口的新字段
  - 测试 SpecData 接口的新字段

#### 1.2 更新配置模型
- [x] 5. 简化 syncLevel 配置选项 (REQ-001)
  - 在 `src/core/config.ts` 中更新 TargetConfig 接口
  - 将 syncLevel 类型限制为 'epic' | 'task'（移除 'story'）
  - 更新相关 JSDoc 注释说明只支持两种粒度

- [x] 6. 创建通道配置接口 (REQ-006)
  - 在 `src/core/config.ts` 中创建 ChannelConfig 接口
  - 创建 IssueChannelConfig 接口（enabled, syncLevel）
  - 创建 ProjectChannelConfig 接口（enabled, syncLevel, groupBy, autoLink）
  - 在 TargetConfig 中添加 `channels?: ChannelConfig` 字段

- [x] 7. 实现 syncLevel 验证和自动降级 (REQ-008)
  - 在 `src/core/config.ts` 中实现 validateSyncLevel 函数
  - 检测 'story' 并自动降级为 'task'
  - 输出警告消息提示用户更新配置
  - 抛出错误对于无效的 syncLevel 值

- [x] 8. 实现通道配置验证 (REQ-006)
  - 在 `src/core/config.ts` 中实现 validateChannelConfig 函数
  - 验证至少启用一个通道
  - 验证 autoLink 需要两个通道都启用
  - 添加友好的错误消息

- [x] 9. 编写配置验证单元测试
  - 在 `src/core/config.test.ts` 中添加 syncLevel 验证测试
  - 测试 story 自动降级功能
  - 测试通道配置验证
  - 测试错误消息格式

### 阶段 2：解析器增强

#### 2.1 增强 Kiro 适配器解析功能
- [ ] 10. 实现 requirements.md 完整内容读取 (REQ-002)
  - 在 `src/adapters/source/kiro.ts` 的 parse 方法中读取 requirements.md 完整内容
  - 将内容存储到 SpecData 的 epicDescription 字段
  - 如果文件不存在，使用空字符串

- [ ] 11. 实现 Task 自动填充 Spec 信息 (REQ-003)
  - 在 `src/adapters/source/kiro.ts` 的 parse 方法中为每个 Task 添加 specName
  - 从 spec 目录路径提取 spec 名称
  - 添加 specPath 字段指向 spec 目录
  - 使用 map 函数批量处理所有 tasks

- [ ] 12. 生成 Epic 标题 (REQ-002)
  - 在 `src/adapters/source/kiro.ts` 中设置 epicTitle 为 spec 名称
  - 确保 epicTitle 格式友好（转换 kebab-case 为可读格式）

- [ ] 13. 编写解析器单元测试
  - 在 `src/adapters/source/kiro.test.ts` 中测试 epicDescription 读取
  - 测试 Task 的 specName 和 specPath 自动填充
  - 测试 epicTitle 生成
  - 测试文件不存在的情况

- [ ] 14. 编写解析器集成测试（可选）

  - 在 `src/adapters/source/kiro.integration.test.ts` 中创建完整的测试 spec
  - 测试端到端解析流程
  - 验证所有字段正确填充

### 阶段 3：同步引擎增强

#### 3.1 实现 Epic 状态计算
- [ ] 15. 实现 calculateEpicStatus 方法 (REQ-004)
  - 在 `src/core/sync-engine.ts` 中创建 calculateEpicStatus 私有方法
  - 统计 tasks 的各种状态数量
  - 计算完成百分比（completed / total * 100）
  - 根据规则确定 Epic 状态（全部完成=done, 有进行中或部分完成=in_progress, 全部待办=todo）
  - 返回 EpicStatus 对象

- [ ] 16. 在同步前计算 Epic 状态
  - 在 `src/core/sync-engine.ts` 的 sync 方法中调用 calculateEpicStatus
  - 将计算结果添加到 SpecData 的 epicStatus 字段
  - 在 Epic 描述末尾添加进度信息

- [ ] 17. 编写 Epic 状态计算单元测试
  - 在 `src/core/sync-engine.test.ts` 中测试所有 Task 完成的情况
  - 测试部分 Task 完成的情况
  - 测试所有 Task 待办的情况
  - 测试空 Task 列表的情况
  - 测试进度百分比计算准确性

#### 3.2 实现部分同步支持
- [ ] 18. 修改同步引擎支持 spec 过滤 (REQ-005)
  - 在 `src/core/sync-engine.ts` 中修改 sync 方法签名，添加 `specNames?: string[]` 参数
  - 创建 syncSpecs 方法处理多个 spec 的同步
  - 实现 spec 名称到路径的映射逻辑

- [ ] 19. 实现 spec 验证逻辑 (REQ-005)
  - 在 `src/core/sync-engine.ts` 中创建 validateSpecExists 方法
  - 检查 `.kiro/specs/{specName}` 目录是否存在
  - 抛出 SpecNotFoundError 如果 spec 不存在
  - 提供友好的错误消息列出可用的 specs

- [ ] 20. 实现 getAllSpecs 辅助方法
  - 在 `src/core/sync-engine.ts` 中创建 getAllSpecs 方法
  - 读取 `.kiro/specs` 目录
  - 返回所有 spec 目录名称列表
  - 用于默认同步所有 specs

- [ ] 21. 编写部分同步单元测试
  - 在 `src/core/sync-engine.test.ts` 中测试单个 spec 同步
  - 测试多个 spec 同步
  - 测试不存在的 spec 错误处理
  - 测试空 specNames 参数（同步所有）

#### 3.3 更新同步引擎核心逻辑
- [ ] 22. 支持 Epic 粒度同步
  - 在 `src/core/sync-engine.ts` 的 syncToTarget 方法中添加 Epic 同步逻辑
  - 检查 syncLevel 配置
  - 调用 target.syncEpic 方法（如果支持）
  - 记录 Epic 同步结果

- [ ] 23. 更新错误隔离机制
  - 确保单个 spec 同步失败不影响其他 specs
  - 在 syncSpecs 方法中使用 try-catch 包裹每个 spec
  - 收集所有错误并在最后报告
  - 继续处理剩余的 specs

### 阶段 4：GitHub Issue 适配器实现

#### 4.1 创建 GitHub Issue 适配器
- [ ] 24. 创建 GitHubIssueAdapter 类 (REQ-006)
  - 在 `src/adapters/target/github-issue.ts` 中创建新文件
  - 创建 GitHubIssueAdapter 类继承 BaseTargetAdapter
  - 定义 GitHubIssueConfig 接口
  - 设置 name 为 'github-issue'

- [ ] 25. 实现适配器初始化 (REQ-006)
  - 实现 init 方法
  - 支持 token 和 gh-cli 两种认证方式
  - 初始化 Octokit 客户端
  - 实现 validateAccess 方法验证仓库访问

#### 4.2 实现 Epic 粒度同步
- [ ] 26. 实现 syncEpic 方法 (REQ-002, REQ-004)
  - 在 `src/adapters/target/github-issue.ts` 中创建 syncEpic 方法
  - 查找已存在的 Epic Issue（使用 `epic:{spec-name}` label）
  - 创建或更新 Epic Issue
  - 设置 Issue 标题为 epicTitle
  - 设置 Issue body 为格式化的 Epic 内容

- [ ] 27. 实现 formatEpicBody 方法 (REQ-002)
  - 创建 formatEpicBody 私有方法
  - 包含 requirements.md 完整内容
  - 添加进度信息部分（已完成/总数/百分比）
  - 添加 Task Checklist（- [x] 或 - [ ]）
  - 添加 "Synced by SpecBridge" 标记

- [ ] 28. 实现 Epic 状态映射 (REQ-004)
  - 创建 mapEpicStatus 方法
  - done 状态映射为 'closed'
  - in_progress 和 todo 状态映射为 'open'
  - 在更新 Issue 时应用状态映射

- [ ] 29. 实现 Epic Issue 创建和更新
  - 实现 createEpicIssue 方法
  - 实现 updateEpicIssue 方法
  - 添加 `epic:{spec-name}` 和 `specbridge:epic` labels
  - 处理 API 调用错误

#### 4.3 实现 Task 粒度同步
- [ ] 30. 实现 syncTasks 方法增强 (REQ-003)
  - 在 `src/adapters/target/github-issue.ts` 中更新 syncTasks 方法
  - 先调用 syncEpic 创建或更新 Epic Issue
  - 为每个 Task 创建独立的 Issue
  - 添加 `epic:{spec-name}` label 关联到 Epic

- [ ] 31. 实现 Task Issue 标签管理
  - 为 Task Issue 添加 `epic:{spec-name}` label
  - 添加 `status:{task.status}` label
  - 保留用户自定义的 labels
  - 添加 `specbridge:task-id:{task.id}` 标识 label

- [ ] 32. 实现 Task Issue 状态同步
  - 根据 Task 状态设置 Issue 状态（done -> closed, 其他 -> open）
  - 在 Issue body 中显示当前状态
  - 更新时检测状态变化

- [ ] 33. 实现 Task Issue 更新逻辑
  - 检测 Task 字段变化（title, description, status, assignee）
  - 只更新有变化的字段
  - 添加变更评论（如果启用）
  - 处理更新失败的情况

#### 4.4 编写测试
- [ ] 34. 编写 Epic 粒度同步单元测试
  - 在 `src/adapters/target/github-issue.test.ts` 中测试 syncEpic 方法
  - 测试 Epic Issue 创建
  - 测试 Epic Issue 更新
  - 测试 formatEpicBody 格式正确
  - 测试状态映射

- [ ] 35. 编写 Task 粒度同步单元测试
  - 测试 syncTasks 方法
  - 测试 Task Issue 创建和 Epic 关联
  - 测试 Task Issue 更新
  - 测试标签管理

- [ ] 36. 编写 Epic 状态自动更新集成测试（可选）

  - 在 `src/adapters/target/github-issue.integration.test.ts` 中创建集成测试
  - 测试所有 Task 完成时 Epic 自动关闭
  - 测试部分 Task 完成时 Epic 保持打开
  - 使用真实的 GitHub API（测试仓库）

### 阶段 5：GitHub Project 适配器实现

#### 5.1 创建 GitHub Project 适配器
- [ ] 37. 创建 GitHubProjectAdapter 类 (REQ-006)
  - 在 `src/adapters/target/github-project.ts` 中创建新文件
  - 创建 GitHubProjectAdapter 类继承 BaseTargetAdapter
  - 定义 GitHubProjectConfig 接口（owner, repo, projectNumber, groupBy, autoLink）
  - 设置 name 为 'github-project'

- [ ] 38. 实现适配器初始化
  - 实现 init 方法
  - 初始化 GraphQL 客户端（使用 @octokit/graphql）
  - 验证 Project 访问权限
  - 缓存 Project ID 和字段信息

- [ ] 39. 配置 GraphQL 客户端
  - 安装 @octokit/graphql 依赖（如果需要）
  - 创建 GraphQL 客户端实例
  - 配置认证 token
  - 实现错误处理

#### 5.2 实现 Project V2 GraphQL 查询
- [ ] 40. 实现 getProject 方法 (REQ-006)
  - 在 `src/adapters/target/github-project.ts` 中创建 getProject 方法
  - 编写 GraphQL 查询获取 Project 信息
  - 查询 Project 字段定义（fields）
  - 返回 ProjectV2 对象

- [ ] 41. 实现 getProjectFields 方法
  - 创建 getProjectFields 方法
  - 解析字段类型（SingleSelect, Text, Number 等）
  - 提取字段 ID 和选项
  - 返回字段映射对象

- [ ] 42. 实现字段 ID 缓存机制
  - 创建 fieldCache 私有属性
  - 在首次查询后缓存字段 ID
  - 实现 getFieldId 方法快速查找
  - 减少重复的 GraphQL 查询

#### 5.3 实现 Epic 粒度同步
- [ ] 43. 实现 syncEpic 方法
  - 在 `src/adapters/target/github-project.ts` 中创建 syncEpic 方法
  - 创建 Project Item
  - 设置 Item 标题和内容
  - 更新自定义字段（Status, Progress）

- [ ] 44. 实现 createProjectItem mutation
  - 创建 createProjectItem 方法
  - 编写 GraphQL mutation
  - 传递 projectId 和 contentId（如果关联 Issue）
  - 返回创建的 Item ID

- [ ] 45. 实现 updateItemFields mutation
  - 创建 updateItemFields 方法
  - 编写 GraphQL mutation 更新字段值
  - 支持 Status 字段更新
  - 支持 Progress 字段更新（如果存在）
  - 处理字段不存在的情况

#### 5.4 实现 Task 粒度同步
- [ ] 46. 实现 syncTasks 方法
  - 在 `src/adapters/target/github-project.ts` 中创建 syncTasks 方法
  - 先调用 syncEpic 创建 Epic Item
  - 为每个 Task 创建 Project Item
  - 设置 Item 字段值

- [ ] 47. 实现按 spec 分组 (REQ-006)
  - 检查 groupBy 配置
  - 如果 groupBy 为 'spec'，设置 Group 字段为 spec 名称
  - 如果 groupBy 为 'none'，不设置分组
  - 处理 Group 字段不存在的情况

- [ ] 48. 实现 Task Item 创建和字段更新
  - 为每个 Task 调用 createProjectItem
  - 更新 Status 字段（映射 Task 状态）
  - 更新 Assignee 字段（如果存在）
  - 更新 Group 字段（如果启用分组）
  - 处理批量创建的错误

#### 5.5 实现自动关联功能
- [ ] 49. 实现 linkToIssue 方法 (REQ-007)
  - 在 `src/adapters/target/github-project.ts` 中创建 linkToIssue 方法
  - 编写 GraphQL mutation 关联 Project Item 到 Issue
  - 使用 Issue 的 syncId 查找 Issue
  - 更新 Project Item 的 linkedIssue 字段

- [ ] 50. 实现 autoLink 配置支持 (REQ-007)
  - 检查 autoLink 配置选项
  - 在 syncTasks 中调用 linkToIssue
  - 确保 Issue 先于 Project 同步
  - 处理关联失败的情况（不中断同步）

- [ ] 51. 实现关联关系持久化
  - 在同步状态中存储 Issue ID 和 Project Item ID 的映射
  - 支持增量同步时重用关联关系
  - 实现 getLinkedIssueId 方法

#### 5.6 编写测试
- [ ] 52. 编写 Project 查询单元测试
  - 在 `src/adapters/target/github-project.test.ts` 中测试 getProject 方法
  - 测试 getProjectFields 方法
  - 测试字段缓存机制
  - Mock GraphQL 响应

- [ ] 53. 编写 Epic 同步单元测试
  - 测试 syncEpic 方法
  - 测试 createProjectItem
  - 测试 updateItemFields
  - 测试错误处理

- [ ] 54. 编写 Task 同步单元测试
  - 测试 syncTasks 方法
  - 测试按 spec 分组
  - 测试批量创建 Items
  - 测试字段更新

- [ ] 55. 编写 autoLink 集成测试（可选）

  - 在 `src/adapters/target/github-project.integration.test.ts` 中创建集成测试
  - 测试 Issue 和 Project Item 自动关联
  - 测试关联关系持久化
  - 使用真实的 GitHub API

### 阶段 6：适配器工厂和注册

#### 6.1 创建适配器工厂
- [ ] 56. 创建 createTargetAdapter 工厂函数 (REQ-006)
  - 在 `src/adapters/target/factory.ts` 中创建新文件
  - 实现 createTargetAdapter 函数
  - 根据 type 创建相应的适配器实例
  - 支持 'github-issue' 和 'github-project' 类型

- [ ] 57. 支持 github 统一配置 (REQ-006)
  - 检测 type 为 'github' 且有 channels 配置
  - 根据 channels 配置创建多个适配器
  - 如果 issue.enabled 为 true，创建 GitHubIssueAdapter
  - 如果 project.enabled 为 true，创建 GitHubProjectAdapter
  - 返回适配器数组

- [ ] 58. 实现双通道自动创建逻辑 (REQ-007)
  - 检查 autoLink 配置
  - 确保 Issue 适配器在 Project 适配器之前
  - 传递必要的配置到各适配器
  - 处理配置错误

- [ ] 59. 添加工厂函数测试
  - 在 `src/adapters/target/factory.test.ts` 中测试工厂函数
  - 测试单通道创建
  - 测试双通道创建
  - 测试配置验证
  - 测试错误处理

#### 6.2 更新现有 GitHub 适配器
- [ ] 60. 重命名现有适配器为 Legacy (REQ-008)
  - 将 `src/adapters/target/github.ts` 中的 GitHubAdapter 重命名为 GitHubLegacyAdapter
  - 更新 name 为 'github-legacy'
  - 添加 deprecated 注释
  - 保持向后兼容

- [ ] 61. 添加向后兼容支持
  - 在工厂函数中支持 type 为 'github' 且无 channels 配置
  - 创建 GitHubLegacyAdapter 实例
  - 输出 deprecation 警告
  - 建议用户迁移到新配置

- [ ] 62. 更新适配器测试
  - 更新 `src/adapters/target/github.test.ts` 中的测试
  - 确保 Legacy 适配器仍然工作
  - 添加 deprecation 警告测试

### 阶段 7：CLI 命令增强

#### 7.1 更新 sync 命令
- [ ] 63. 添加 --spec 参数支持 (REQ-005)
  - 在 `src/cli/commands/sync.ts` 中添加 --spec 选项
  - 支持多次指定（--spec spec1 --spec spec2）
  - 将 spec 名称数组传递给同步引擎
  - 更新命令描述和帮助信息

- [ ] 64. 实现 spec 验证和错误提示 (REQ-005)
  - 在执行同步前验证 spec 是否存在
  - 捕获 SpecNotFoundError
  - 显示友好的错误消息
  - 列出可用的 specs

- [ ] 65. 更新 --dry-run 支持部分同步
  - 在 dry-run 模式下显示将要同步的 specs
  - 显示每个 spec 的统计信息（requirements, tasks 数量）
  - 不执行实际的 API 调用

- [ ] 66. 更新帮助信息和使用示例
  - 更新命令描述
  - 添加 --spec 参数说明
  - 添加使用示例
  - 更新 --verbose 输出

#### 7.2 创建 migrate-config 命令
- [ ] 67. 创建 migrate-config 命令文件 (REQ-008)
  - 在 `src/cli/commands/migrate-config.ts` 中创建新文件
  - 创建 migrateConfigCommand
  - 添加 --backup 选项
  - 添加 --dry-run 选项

- [ ] 68. 实现配置文件备份逻辑
  - 读取现有的 .specbridge.yaml
  - 创建备份文件 .specbridge.yaml.backup
  - 添加时间戳到备份文件名
  - 显示备份文件路径

- [ ] 69. 实现配置迁移逻辑 (REQ-008)
  - 创建 migrateConfig 函数
  - 检测 syncLevel: story 并降级为 task
  - 检测 type: github 且无 channels，转换为 channels 配置
  - 保留其他配置不变
  - 返回迁移后的配置对象

- [ ] 70. 实现配置写入逻辑
  - 将迁移后的配置写入 .specbridge.yaml
  - 保持 YAML 格式和注释（如果可能）
  - 验证写入的配置有效
  - 处理写入错误

- [ ] 71. 添加迁移成功提示
  - 显示迁移摘要（变更数量）
  - 列出具体的变更内容
  - 提示用户验证配置
  - 提供回滚说明

#### 7.3 更新 CLI 入口
- [ ] 72. 注册 migrate-config 命令
  - 在 `src/index.ts` 中导入 migrateConfigCommand
  - 注册命令到 program
  - 更新 CLI 版本号

- [ ] 73. 更新 sync 命令使用适配器工厂
  - 在 `src/cli/commands/sync.ts` 中导入 createTargetAdapter
  - 使用工厂函数创建适配器
  - 移除直接实例化 GitHubAdapter 的代码
  - 处理多适配器返回

#### 7.4 编写 CLI 测试
- [ ]* 74. 编写 --spec 参数端到端测试（可选）
  - 在 `tests/e2e/sync-command.test.ts` 中创建测试
  - 测试单个 spec 同步
  - 测试多个 spec 同步
  - 测试不存在的 spec 错误

- [ ]* 75. 编写 migrate-config 命令端到端测试（可选）
  - 在 `tests/e2e/migrate-config.test.ts` 中创建测试
  - 测试配置迁移
  - 测试备份功能
  - 测试 dry-run 模式

### 阶段 8：性能优化

#### 8.1 实现批量 API 调用
- [ ] 76. 实现并发控制工具（可选）(NFR-001)

  - 在 `src/utils/concurrency.ts` 中创建新文件
  - 实现 pLimit 函数限制并发数
  - 默认限制为 5 个并发请求
  - 支持配置并发数

- [ ] 77. 在 GitHub Issue 适配器中应用并发控制（可选）

  - 在 syncTasks 方法中使用并发控制
  - 批量创建 Issues
  - 显示进度信息

- [ ] 78. 在 GitHub Project 适配器中应用并发控制（可选）

  - 在 syncTasks 方法中使用并发控制
  - 批量创建 Project Items
  - 显示进度信息

#### 8.2 实现增量同步
- [ ] 79. 扩展同步状态文件格式（可选）(NFR-001)

  - 在 `src/core/sync-state.ts` 中添加 lastModified 字段
  - 存储每个 spec 的最后修改时间
  - 存储 Epic 和 Task 的 syncId

- [ ] 80. 实现文件修改时间检测（可选）

  - 在 `src/utils/file.ts` 中实现 getLastModified 函数
  - 获取文件的 mtime
  - 比较当前时间和上次同步时间

- [ ] 81. 在同步引擎中实现增量同步逻辑（可选）

  - 在 syncSpecs 方法中检查文件修改时间
  - 跳过未修改的 specs
  - 显示跳过的 specs 数量
  - 支持 --force 选项强制全量同步

#### 8.3 实现 API 速率限制处理
- [ ]* 82. 实现指数退避重试机制（可选）(NFR-001)
  - 在 `src/utils/retry.ts` 中创建新文件
  - 实现 retryWithBackoff 函数
  - 检测 429 状态码（Rate Limit）
  - 实现指数退避算法
  - 最多重试 3 次

- [ ]* 83. 在 GitHub Issue 适配器中应用重试机制（可选）
  - 包装所有 API 调用
  - 使用 retryWithBackoff
  - 记录重试日志

- [ ]* 84. 在 GitHub Project 适配器中应用重试机制（可选）
  - 包装所有 GraphQL 调用
  - 使用 retryWithBackoff
  - 记录重试日志

### 阶段 9：错误处理增强

#### 9.1 创建自定义错误类
- [ ] 85. 创建 SpecNotFoundError (NFR-002)
  - 在 `src/utils/errors.ts` 中创建 SpecNotFoundError 类
  - 继承 SpecBridgeError
  - 接受 specName 参数
  - 生成友好的错误消息

- [ ] 86. 创建 EpicSyncError (NFR-002)
  - 创建 EpicSyncError 类
  - 接受 specName 和 cause 参数
  - 包含详细的错误信息

- [ ] 87. 创建 TaskSyncError (NFR-002)
  - 创建 TaskSyncError 类
  - 接受 taskId 和 cause 参数
  - 包含详细的错误信息

- [ ] 88. 编写错误类单元测试
  - 在 `src/utils/errors.test.ts` 中测试新错误类
  - 测试错误消息格式
  - 测试错误继承关系

#### 9.2 实现友好错误消息
- [ ] 89. 实现 formatErrorMessage 函数 (NFR-002)
  - 在 `src/utils/errors.ts` 中创建 formatErrorMessage 函数
  - 根据错误类型返回友好消息
  - 包含解决建议
  - 包含相关文档链接

- [ ] 90. 在 CLI 命令中应用友好错误消息
  - 在 `src/cli/commands/sync.ts` 中使用 formatErrorMessage
  - 捕获特定错误类型
  - 显示格式化的错误消息
  - 提供下一步操作建议

- [ ] 91. 在适配器中应用友好错误消息
  - 在各适配器中抛出特定错误类型
  - 包含上下文信息
  - 记录详细的错误日志

#### 9.3 增强错误隔离
- [ ] 92. 确保单个 Task 失败不影响其他 Task
  - 在 GitHubIssueAdapter 的 syncTasks 中使用 try-catch
  - 记录失败的 Task
  - 继续处理剩余 Tasks
  - 在结果中报告失败数量

- [ ] 93. 确保单个 Epic 失败不影响其他 Epic
  - 在 GitHubProjectAdapter 的 syncEpic 中使用 try-catch
  - 记录失败的 Epic
  - 继续处理剩余 Epics
  - 在结果中报告失败数量

- [ ] 94. 记录详细错误日志
  - 在所有适配器中使用 logger.error
  - 包含错误堆栈信息（verbose 模式）
  - 记录失败的 API 请求详情
  - 帮助用户调试问题

### 阶段 10：文档更新

#### 10.1 更新配置文档
- [ ] 95. 更新 CONFIGURATION.md - 同步粒度章节 (REQ-009)
  - 在 `docs/CONFIGURATION.md` 中更新同步粒度说明
  - 移除 story 粒度的文档
  - 说明只支持 epic 和 task 两种粒度
  - 添加粒度选择指南

- [ ] 96. 更新 CONFIGURATION.md - GitHub 双通道配置章节 (REQ-009)
  - 添加 GitHub 双通道架构说明
  - 文档化 channels 配置
  - 提供 Issue 通道配置示例
  - 提供 Project 通道配置示例
  - 说明 autoLink 功能

- [ ] 97. 更新 CONFIGURATION.md - Epic 状态自动更新章节 (REQ-009)
  - 添加 Epic 状态自动更新说明
  - 文档化状态计算规则
  - 说明如何禁用自动更新
  - 提供状态映射表

- [ ] 98. 添加配置示例文件 (REQ-009)
  - 在 `examples/` 目录创建 issue-only.yaml（仅 Issue 通道）
  - 创建 project-only.yaml（仅 Project 通道）
  - 创建 dual-channel.yaml（双通道 + autoLink）
  - 创建 multi-platform.yaml（GitHub + Jira）

#### 10.2 更新 CLI 使用文档
- [ ] 99. 更新 CLI_USAGE.md - 部分同步章节 (REQ-009)
  - 在 `docs/CLI_USAGE.md` 中添加部分同步说明
  - 文档化 --spec 参数
  - 提供使用示例
  - 说明与 --dry-run 的组合使用

- [ ] 100. 更新 CLI_USAGE.md - 配置迁移章节 (REQ-009)
  - 添加 migrate-config 命令说明
  - 文档化迁移流程
  - 提供使用示例
  - 说明备份和回滚

- [ ] 101. 添加使用示例和最佳实践
  - 添加常见使用场景
  - 提供最佳实践建议
  - 添加故障排除指南

#### 10.3 创建迁移指南
- [ ] 102. 创建 MIGRATION.md 文档 (REQ-009)
  - 在 `docs/` 目录创建 MIGRATION.md
  - 添加文档结构和目录

- [ ] 103. 添加主要变更说明
  - 列出所有破坏性变更
  - 说明移除 Story 层的影响
  - 说明新功能和改进

- [ ] 104. 添加迁移步骤
  - 提供详细的迁移步骤
  - 包含命令示例
  - 说明验证方法

- [ ] 105. 添加配置变更对照表
  - 创建旧配置到新配置的映射表
  - 提供转换示例
  - 说明不兼容的配置

- [ ] 106. 添加常见问题解答
  - 回答常见迁移问题
  - 提供解决方案
  - 包含联系支持的方式

#### 10.4 更新 README
- [ ] 107. 更新 README.md - 功能特性章节 (REQ-009)
  - 在 `README.md` 中更新功能列表
  - 突出新功能（Epic 状态自动更新、部分同步、双通道）
  - 更新架构图（如果有）

- [ ] 108. 更新 README.md - 快速开始章节
  - 更新安装说明
  - 更新配置示例
  - 更新使用示例

- [ ] 109. 添加新功能亮点
  - 创建"新功能"章节
  - 说明 v2.0 的主要改进
  - 添加迁移指南链接

#### 10.5 更新同步策略文档
- [ ] 110. 更新 SYNC_STRATEGY.md - 移除 Story 层说明 (REQ-009)
  - 在 `docs/SYNC_STRATEGY.md` 中移除 Story 相关内容
  - 更新架构图
  - 更新示例

- [ ] 111. 更新 SYNC_STRATEGY.md - 添加 Epic 状态自动更新说明
  - 添加 Epic 状态自动更新章节
  - 说明状态计算逻辑
  - 提供示例

- [ ] 112. 更新 SYNC_STRATEGY.md - 添加双通道架构说明
  - 添加 GitHub 双通道架构章节
  - 说明 Issue 和 Project 的区别
  - 说明 autoLink 机制

## 任务执行说明

### 优先级
1. **高优先级（P0）**：阶段 1-7（核心功能）- 必须完成
2. **中优先级（P1）**：阶段 9-10（错误处理和文档）- 应该完成
3. **低优先级（P2）**：阶段 8、11（性能优化和测试）- 可选完成

### 依赖关系
- 阶段 2 依赖阶段 1（数据模型）
- 阶段 3 依赖阶段 1、2（数据模型和解析器）
- 阶段 4 依赖阶段 1、2、3（所有核心组件）
- 阶段 5 依赖阶段 1、2、3（所有核心组件）
- 阶段 6 依赖阶段 4、5（两个适配器）
- 阶段 7 依赖阶段 3、6（同步引擎和适配器工厂）
- 阶段 8-10 可以与其他阶段部分并行

### 增量开发建议
1. 先完成阶段 1（数据模型），为后续开发打好基础
2. 完成阶段 2（解析器），确保能正确读取 Epic 信息
3. 完成阶段 3（同步引擎），实现核心同步逻辑
4. 并行开发阶段 4 和 5（两个适配器）
5. 完成阶段 6（适配器工厂），整合两个适配器
6. 完成阶段 7（CLI 命令），提供用户接口
7. 根据需要完成阶段 8-10（优化、错误处理、文档）

### 测试策略
- 每完成一个阶段，运行相关的单元测试
- 完成适配器后，进行集成测试（可选）
- 完成所有功能后，进行手动端到端测试
- 使用测试仓库和账号，避免影响生产数据
- 标记为"可选"的测试任务可以根据时间和资源决定是否实施

### 预估工时
- **阶段 1**：8-10 小时
- **阶段 2**：6-8 小时
- **阶段 3**：8-10 小时
- **阶段 4**：12-15 小时
- **阶段 5**：15-18 小时
- **阶段 6**：6-8 小时
- **阶段 7**：8-10 小时
- **阶段 8**：6-8 小时（可选）
- **阶段 9**：6-8 小时
- **阶段 10**：8-10 小时
- **总计**：83-105 小时（不含可选任务）
