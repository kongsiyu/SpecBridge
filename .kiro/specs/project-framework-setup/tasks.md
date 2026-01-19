# 实现计划：SpecBridge 项目框架设置

## 概述

本实现计划将 SpecBridge 项目框架设置分解为具体的编码任务。SpecBridge 是一个轻量级 CLI 工具，采用双适配器架构将 AI 生成的规格文档同步到项目管理平台。

核心设计理念：
- **双适配器模式**：源适配器（读取规格）+ 目标适配器（同步到平台）
- **统一数据模型**：所有适配器使用统一的 SpecData 格式
- **配置驱动**：简单的 YAML 配置文件
- **可扩展架构**：基于插件的设计，支持自定义适配器

## 任务列表

### 阶段 1：核心基础设施

#### 1.1 数据模型和类型定义
- [x] 1. 创建核心数据模型 (需求 1)
  - 在 `src/core/models.ts` 中定义 SpecData、SpecMeta、Requirement、Task、Design 接口
  - 定义 TaskStatus 枚举（todo、in_progress、done、blocked）
  - 定义 SyncResult 和 SyncChange 接口
  - 导出所有数据模型接口

#### 1.2 错误处理系统
- [x] 2. 实现自定义错误类 (需求 8)
  - 在 `src/utils/errors.ts` 中创建 SpecBridgeError 基类
  - 实现 ConfigNotFoundError、ConfigParseError 类
  - 实现 AuthenticationError、RateLimitError 类
  - 实现 AdapterError 类
  - 为每个错误类添加错误代码和描述性消息

#### 1.3 文件工具函数
- [x] 3. 实现文件操作工具 (需求 10)
  - 在 `src/utils/file.ts` 中实现 fileExists 函数
  - 实现 readFile 和 writeFile 函数
  - 实现 readYaml 和 writeYaml 函数
  - 实现 ensureDir 函数
  - 添加统一的错误处理

#### 1.4 日志工具
- [x] 4. 实现日志系统 (需求 7)
  - 在 `src/utils/logger.ts` 中创建 Logger 类
  - 实现 info、warn、error、success、debug 方法
  - 使用 chalk 为不同日志级别添加颜色
  - 实现 startSpinner、succeedSpinner、failSpinner 方法
  - 支持详细模式（verbose）

### 阶段 2：配置和适配器接口

#### 2.1 配置管理系统
- [x] 5. 定义配置接口 (需求 4)
  - 在 `src/core/config.ts` 中定义 Config、SourceConfig、TargetConfig 接口
  - 定义 NotificationConfig 接口
  - 实现 loadConfig 函数读取 .specbridge.yaml
  - 实现 validateConfig 函数验证配置
  - 实现 replaceEnvVars 函数支持环境变量替换
  - 添加配置版本检查

#### 2.2 源适配器接口
- [x] 6. 定义源适配器接口 (需求 2)
  - 在 `src/adapters/source/base.ts` 中定义 SourceAdapter 接口
  - 定义 detect、parse 和可选的 watch 方法
  - 创建 BaseSourceAdapter 抽象类
  - 实现 validateSpecData 通用验证方法

#### 2.3 目标适配器接口
- [x] 7. 定义目标适配器接口 (需求 3)
  - 在 `src/adapters/target/base.ts` 中定义 TargetAdapter 接口
  - 定义 init、syncRequirements、syncTasks、syncDesign、getTaskStatus 方法
  - 创建 BaseTargetAdapter 抽象类
  - 实现 createSyncResult 工具方法

### 阶段 3：同步引擎核心

#### 3.1 同步状态管理
- [x] 8. 实现同步状态持久化 (需求 20)
  - 在 `src/core/sync-state.ts` 中创建 SyncStateManager 类
  - 定义 SyncStateMap 接口
  - 实现 load 和 save 方法
  - 实现 getSyncId、setSyncId、removeSyncId 方法
  - 使用 .specbridge/sync-state.json 存储状态

#### 3.2 同步引擎实现
- [x] 9. 实现同步引擎 (需求 5, 16, 17)
  - 在 `src/core/sync-engine.ts` 中创建 SyncEngine 类
  - 定义 SyncStatus 和 SyncOptions 接口
  - 实现 sync 方法协调源和目标适配器
  - 实现 getStatus 和 getHistory 方法
  - 支持同步粒度控制（all、requirements、tasks、single）
  - 实现错误隔离：单个目标失败不影响其他目标
  - 记录同步历史和变更详情

### 阶段 4：Kiro 源适配器

#### 4.1 Kiro 适配器实现
- [x] 10. 实现 Kiro 源适配器 (需求 13)
  - 在 `src/adapters/source/kiro.ts` 中创建 KiroAdapter 类
  - 实现 detect 方法检查 .kiro/specs 目录
  - 实现 parse 方法读取 requirements.md、design.md、tasks.md
  - 实现 parseRequirements 方法解析需求文档
  - 实现 parseDesign 方法解析设计文档
  - 实现 parseTasks 方法解析任务列表
  - 使用 gray-matter 解析 frontmatter
  - 支持任务状态映射（[ ] → todo, [x] → done, [-] → in_progress）
  - 支持任务负责人提取（@username）
  - 转换为统一的 SpecData 格式

### 阶段 5：GitHub 目标适配器

#### 5.1 GitHub 适配器基础
- [x] 11. 实现 GitHub 适配器初始化 (需求 14)
  - 在 `src/adapters/target/github.ts` 中创建 GitHubAdapter 类
  - 定义 GitHubConfig 接口
  - 实现 init 方法支持两种认证方式（token 和 gh-cli）
  - 实现 validateAccess 方法验证仓库访问权限
  - 检查 gh CLI 可用性（当使用 gh-cli 认证时）

#### 5.2 GitHub Issue 同步
- [x] 12. 实现任务同步逻辑 (需求 15, 19)
  - 实现 syncTasks 方法
  - 使用自定义标签 `specbridge:task-id:{id}` 标识 Issue
  - 实现 findIssueByLabel 方法查找已同步的 Issue
  - 实现 createIssue 方法创建新 Issue
  - 实现 updateIssue 方法更新现有 Issue
  - 实现 detectTaskChanges 方法检测字段变更（title、description、status、assignee、labels）
  - 根据任务状态打开/关闭 Issue
  - 支持设置 assignee 和自定义标签

- [x] 13. 实现需求同步逻辑 (需求 15)
  - 实现 syncRequirements 方法
  - 使用自定义标签 `specbridge:req-id:{id}` 标识 Issue
  - 实现 formatRequirementBody 方法格式化需求正文
  - 创建或更新需求对应的 Issue

- [ ]* 14. 实现设计文档同步（可选）(需求 15)
  - 实现 syncDesign 方法（可选功能）
  - 创建特殊的设计文档 Issue

- [x] 15. 实现任务状态查询 (需求 15)
  - 实现 getTaskStatus 方法
  - 根据 Issue 状态返回 TaskStatus

#### 5.3 GitHub Issue 评论
- [x] 16. 实现同步评论功能 (需求 18)
  - 实现 addComment 方法添加 Issue 评论
  - 实现 formatChangeComment 方法格式化变更评论
  - 在更新 Issue 时添加变更说明评论
  - 支持通过配置禁用评论功能（addComments 选项）
  - 评论包含同步时间戳和变更详情

#### 5.4 GitHub 适配器工具方法
- [ ] 17. 实现辅助方法
  - 实现 formatTaskBody 方法格式化任务正文
  - 实现 buildLabels 方法构建标签数组
  - 支持 Octokit API 和 gh CLI 两种方式执行操作

### 阶段 6：CLI 命令实现

#### 6.1 CLI 入口点
- [x] 18. 实现 CLI 主入口 (需求 11)
  - 在 `src/index.ts` 中创建 CLI 入口
  - 添加 shebang（#!/usr/bin/env node）
  - 使用 Commander.js 设置程序名称、描述和版本
  - 添加全局选项（--verbose）
  - 注册所有命令
  - 实现全局错误处理函数
  - 捕获未处理的异常和 Promise 拒绝
  - 无命令时显示帮助信息

#### 6.2 init 命令
- [x] 19. 实现 init 命令 (需求 6, 20)
  - 在 `src/cli/commands/init.ts` 中创建 initCommand
  - 创建默认的 .specbridge.yaml 配置文件
  - 支持 --force 选项覆盖现有配置
  - 在已有配置时提示用户
  - 提示用户添加 .specbridge/ 到 .gitignore
  - 显示配置示例和下一步操作

#### 6.3 sync 命令
- [x] 20. 实现 sync 命令 (需求 6, 16)
  - 在 `src/cli/commands/sync.ts` 中创建 syncCommand
  - 支持 --scope 选项（all、requirements、tasks、single）
  - 支持 --id 选项指定单个项目 ID
  - 支持 --dry-run 选项模拟同步
  - 加载配置文件
  - 初始化源适配器和目标适配器
  - 调用同步引擎执行同步
  - 显示同步结果（创建、更新、失败数量）
  - 在详细模式下显示变更详情
  - 实现 filterByScope 函数过滤数据

#### 6.4 status 命令
- [x] 21. 实现 status 命令 (需求 6)
  - 在 `src/cli/commands/status.ts` 中创建 statusCommand
  - 显示当前同步状态
  - 显示上次同步时间
  - 显示同步历史摘要
  - 读取 sync-state.json 显示已同步项目

### 阶段 7：代码质量和配置

#### 7.1 TypeScript 配置
- [ ] 22. 验证和优化 TypeScript 配置 (需求 9)
  - 确认 tsconfig.json 启用严格模式
  - 确认目标为 ES2020 或更高
  - 确认模块系统为 CommonJS
  - 确认输出目录为 dist/
  - 确认启用源映射和声明文件
  - 添加路径别名（@/* → ./src/*）

#### 7.2 代码质量工具
- [ ] 23. 配置 ESLint 和 Prettier (需求 12)
  - 创建 .eslintrc.json 配置文件
  - 配置 TypeScript ESLint 插件
  - 要求显式函数返回类型
  - 禁止使用 any 类型（警告级别）
  - 创建 .prettierrc 配置文件
  - 配置代码格式化规则
  - 验证 lint 和 format 脚本

#### 7.3 示例配置文件
- [ ] 24. 创建示例配置 (需求 4)
  - 在 examples/ 目录创建 .specbridge.yaml 示例
  - 包含 GitHub 目标配置示例
  - 包含环境变量使用示例
  - 添加详细注释说明各配置项

### 阶段 8：测试和验证

#### 8.1 单元测试（可选）
- [ ] 25. 为核心模块编写单元测试

  - 测试数据模型转换
  - 测试文件工具函数
  - 测试配置加载和验证
  - 测试错误处理

#### 8.2 集成测试（可选）
- [ ] 26. 编写适配器集成测试

  - 测试 Kiro 适配器解析
  - 测试 GitHub 适配器同步（使用 mock）
  - 测试同步引擎协调逻辑

#### 8.3 端到端测试
- [ ] 27. 手动测试完整流程
  - 创建测试规格文档
  - 运行 init 命令创建配置
  - 运行 sync 命令执行同步
  - 验证 GitHub Issues 创建正确
  - 修改规格文档并再次同步
  - 验证 Issues 更新正确
  - 验证评论功能
  - 验证同步状态持久化

### 阶段 9：文档和发布准备

#### 9.1 文档完善
- [ ] 28. 更新项目文档
  - 更新 README.md 添加详细使用说明
  - 完善 docs/ARCHITECTURE.md
  - 完善 docs/CLI_USAGE.md
  - 完善 docs/CONFIGURATION.md
  - 添加 CHANGELOG.md

#### 9.2 构建和打包
- [ ] 29. 验证构建流程
  - 运行 `npm run build` 编译 TypeScript
  - 验证 dist/ 目录输出
  - 测试编译后的 CLI 可执行性
  - 运行 `npm run package` 打包可执行文件（可选）

#### 9.3 发布准备
- [ ] 30. 准备发布
  - 添加 .npmignore 文件
  - 验证 package.json 配置
  - 添加 LICENSE 文件
  - 创建 .gitignore 确保不提交敏感文件

## 任务执行说明

### 优先级
1. **高优先级**：阶段 1-3（核心基础设施和同步引擎）
2. **中优先级**：阶段 4-6（适配器实现和 CLI 命令）
3. **低优先级**：阶段 7-9（代码质量、测试和文档）

### 依赖关系
- 阶段 1 必须首先完成（其他阶段依赖基础设施）
- 阶段 2 依赖阶段 1
- 阶段 3 依赖阶段 1 和 2
- 阶段 4 和 5 依赖阶段 1、2、3
- 阶段 6 依赖阶段 1-5
- 阶段 7-9 可以与其他阶段并行进行

### 增量开发建议
1. 先完成核心数据模型和工具函数
2. 实现配置管理和适配器接口
3. 实现同步引擎核心逻辑
4. 实现 Kiro 源适配器
5. 实现 GitHub 目标适配器
6. 实现 CLI 命令
7. 完善代码质量和文档
8. 进行测试和验证

### 测试策略
- 每完成一个阶段，进行单元测试验证
- 完成适配器后，进行集成测试
- 完成所有功能后，进行端到端测试
- 使用测试仓库和账号，避免影响生产数据
