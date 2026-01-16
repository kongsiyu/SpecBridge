# 需求文档

## 简介

本文档规定了为 SpecBridge 设置完整 TypeScript 项目框架的需求。SpecBridge 是一个轻量级 CLI 工具，使用双适配器架构将 AI 生成的规格文档（如 Kiro）同步到项目管理平台（GitHub、Jira、CodeUp 等）。本功能建立应用程序运行所需的基础代码结构、核心接口、数据模型、配置系统、CLI 命令框架，以及 Kiro 源适配器和 GitHub 目标适配器的完整实现。

## 术语表

- **SpecBridge**：正在开发的用于将规格文档同步到项目管理平台的 CLI 工具
- **Source_Adapter**（源适配器）：从各种来源读取和解析规格文档的接口实现
- **Target_Adapter**（目标适配器）：将解析后的数据同步到项目管理平台的接口实现
- **Unified_Data_Model**（统一数据模型）：所有适配器转换的中心数据结构（SpecData）
- **Sync_Engine**（同步引擎）：协调源适配器和目标适配器之间同步过程的核心组件
- **Config_Manager**（配置管理器）：负责加载、验证和管理 YAML 配置文件的组件
- **CLI_Framework**（CLI 框架）：使用 Commander.js 构建的命令行界面结构
- **Logger**（日志器）：使用 chalk 和 ora 进行格式化控制台输出的工具组件
- **Kiro_Adapter**（Kiro 适配器）：读取和解析 Kiro 规格文档的源适配器实现
- **GitHub_Adapter**（GitHub 适配器）：将数据同步到 GitHub Issues 的目标适配器实现
- **GitHub_CLI**（GitHub CLI）：GitHub 官方命令行工具 gh
- **Sync_Granularity**（同步粒度）：指定同步操作的范围（整个规格、单个需求、单个任务等）

## 数据模型关系

本系统使用以下核心数据模型，它们的关系如下：

```
SpecData (规格数据 - 顶层容器)
├── meta: SpecMeta (元数据：规格名称、版本、时间戳等)
├── requirements: Requirement[] (需求列表 - 多个需求)
├── design: Design (设计文档 - 单个设计文档)
└── tasks: Task[] (任务列表 - 多个任务)
```

**在 Kiro 中的映射关系：**
```
.kiro/specs/feature-name/
├── requirements.md  → 解析为 Requirement[]
├── design.md        → 解析为 Design
└── tasks.md         → 解析为 Task[]
```

**同步到 GitHub 时的映射关系：**
- 每个 **Task** → 一个 GitHub Issue
- 每个 **Requirement** → 一个 GitHub Issue（可选，通过配置控制）
- **Design** → 可以作为一个特殊的 Issue 或者不同步（可选，通过配置控制）

**数据流向：**
```
Kiro 规格文件 → KiroAdapter.parse() → SpecData → GitHubAdapter.syncTasks() → GitHub Issues
```

## 需求

### 需求 1：核心数据模型

**用户故事：** 作为开发者，我希望定义统一的数据模型，以便所有适配器可以使用一致的数据结构。

#### 验收标准

1. 当定义数据模型时，系统应当创建一个 SpecData 接口，包含 meta、requirements、design 和 tasks 属性
2. 当定义数据模型时，系统应当创建一个 Requirement 接口，包含 id、title、description、priority、labels 和 syncId 属性
3. 当定义数据模型时，系统应当创建一个 Task 接口，包含 id、title、description、status、assignee、parentId 和 syncId 属性
4. 当定义数据模型时，系统应当创建一个 Design 接口，用于存储设计文档内容
5. 当定义数据模型时，系统应当创建一个 SpecMeta 接口，包含 name、version、createdAt 和 updatedAt 属性
6. 当定义数据模型时，系统应当创建一个 SyncResult 接口，包含 success、created、updated、failed 和 changes 属性
7. 当定义数据模型时，系统应当创建一个 TaskStatus 枚举，包含值：todo、in_progress、done、blocked
8. 当定义数据模型时，系统应当创建一个 SyncChange 接口，用于记录每次同步的变更内容
9. 系统应当从单个 models.ts 文件导出所有数据模型接口

### 需求 2：源适配器接口

**用户故事：** 作为开发者，我希望定义源适配器接口，以便我可以为不同的规格文档格式实现适配器。

#### 验收标准

1. 系统应当定义一个 SourceAdapter 接口，包含 name、detect 和 parse 方法
2. 当调用 detect 方法并传入路径时，系统应当返回一个布尔值，指示适配器是否可以处理该路径
3. 当调用 parse 方法并传入路径时，系统应当返回一个解析为 SpecData 的 Promise
4. 系统应当定义一个抽象的 BaseSourceAdapter 类，实现通用功能
5. 系统应当从 adapters/source/base.ts 导出 SourceAdapter 接口

### 需求 3：目标适配器接口

**用户故事：** 作为开发者，我希望定义目标适配器接口，以便我可以为不同的项目管理平台实现适配器。

#### 验收标准

1. 系统应当定义一个 TargetAdapter 接口，包含 name、init、syncRequirements、syncTasks、syncDesign 和 getTaskStatus 方法
2. 当调用 init 方法并传入配置时，系统应当初始化适配器并返回一个 Promise
3. 当调用 syncRequirements 并传入需求数组时，系统应当返回一个解析为 SyncResult 的 Promise
4. 当调用 syncTasks 并传入任务数组时，系统应当返回一个解析为 SyncResult 的 Promise
5. 若实现了 syncDesign，系统应当接受一个 Design 对象并返回一个解析为 SyncResult 的 Promise
6. 系统应当定义一个 getTaskStatus 方法，接受 taskId 并返回解析为 TaskStatus 的 Promise
7. 系统应当定义一个抽象的 BaseTargetAdapter 类，实现通用功能
8. 系统应当从 adapters/target/base.ts 导出 TargetAdapter 接口

### 需求 4：配置管理

**用户故事：** 作为用户，我希望有一个配置系统，以便我可以在 YAML 文件中指定源和目标设置。

#### 验收标准

1. 系统应当定义一个 Config 接口，包含 version、source、targets 和可选的 notifications 属性
2. 系统应当定义一个 SourceConfig 接口，包含 type、path 和可选的 plugin 属性
3. 系统应当定义一个 TargetConfig 接口，包含 name、type、enabled、config 和 mapping 属性
4. 当调用 loadConfig 时，系统应当从当前目录读取并解析 .specbridge.yaml
5. 当配置文件不存在时，系统应当抛出 ConfigNotFoundError
6. 当配置文件包含无效的 YAML 时，系统应当抛出 ConfigParseError
7. 系统应当验证配置版本是否受支持
8. 系统应当验证配置中是否存在必需字段
9. 系统应当支持使用 ${VAR_NAME} 语法进行环境变量替换
10. 系统应当从 core/config.ts 导出配置接口和函数

### 需求 5：同步引擎核心

**用户故事：** 作为开发者，我希望有一个同步引擎实现，以便我可以协调源适配器和目标适配器之间的同步过程。

#### 验收标准

1. 系统应当定义一个 SyncEngine 类，包含 sync 和 getStatus 方法
2. 当调用 sync 并传入源适配器和目标适配器数组时，系统应当解析源并同步到所有启用的目标
3. 当调用 getStatus 时，系统应当返回当前的同步状态
4. 如果目标适配器在同步期间失败，则系统应当记录错误并继续处理剩余目标
5. 系统应当跟踪同步历史，包括时间戳和结果
6. 系统应当从 core/sync-engine.ts 导出 SyncEngine 类

### 需求 6：CLI 命令结构

**用户故事：** 作为用户，我希望定义 CLI 命令，以便我可以从命令行与 SpecBridge 交互。

#### 验收标准

1. 系统应当定义一个 init 命令，创建默认的 .specbridge.yaml 配置文件
2. 系统应当定义一个 sync 命令，执行一次性同步
3. 系统应当定义一个 status 命令，显示当前的同步状态
4. 当在已有配置的目录中执行 init 命令时，系统应当在覆盖前提示用户
5. 当执行任何命令时，系统应当显示版本标志选项（--version 或 -v）
6. 当执行任何命令时，系统应当支持详细标志选项（--verbose）以进行详细日志记录
7. 系统应当使用 Commander.js 进行命令解析和执行
8. 系统应当从 cli/commands/ 目录导出命令实现

### 需求 7：日志工具

**用户故事：** 作为开发者，我希望有日志工具，以便我可以向用户提供格式化的控制台输出。

#### 验收标准

1. 系统应当定义一个 Logger 类，包含 info、warn、error 和 success 方法
2. 当调用 info 时，系统应当使用 chalk 输出蓝色文本
3. 当调用 warn 时，系统应当使用 chalk 输出黄色文本
4. 当调用 error 时，系统应当使用 chalk 输出红色文本
5. 当调用 success 时，系统应当使用 chalk 输出绿色文本
6. 系统应当使用 ora 定义一个 spinner 工具，用于长时间运行的操作
7. 当启用详细模式时，系统应当输出额外的调试信息
8. 系统应当从 utils/logger.ts 导出日志工具

### 需求 8：错误处理类

**用户故事：** 作为开发者，我希望有自定义错误类，以便我可以适当地处理不同的错误场景。

#### 验收标准

1. 系统应当定义一个 SpecBridgeError 基类，扩展 Error
2. 系统应当定义一个 ConfigNotFoundError 类，用于缺失的配置文件
3. 系统应当定义一个 ConfigParseError 类，用于无效的配置语法
4. 系统应当定义一个 AuthenticationError 类，用于 API 认证失败
5. 系统应当定义一个 RateLimitError 类，用于 API 速率限制超出的场景
6. 系统应当定义一个 AdapterError 类，用于适配器特定的失败
7. 当抛出任何自定义错误时，系统应当包含描述性消息和错误代码
8. 系统应当从 utils/errors.ts 导出所有错误类

### 需求 9：TypeScript 配置

**用户故事：** 作为开发者，我希望正确配置 TypeScript，以便代码可以使用严格类型检查进行编译。

#### 验收标准

1. 系统应当配置 TypeScript 启用严格模式
2. 系统应当将目标设置为 ES2020 或更高版本
3. 系统应当将模块系统设置为 CommonJS 以兼容 Node.js
4. 系统应当将输出目录配置为 dist/
5. 系统应当在编译中包含 src/ 目录
6. 系统应当启用源映射以进行调试
7. 系统应当配置声明文件生成以提供类型定义
8. 系统应当从编译中排除 node_modules 和 dist 目录
9. 系统应当根据需要配置路径别名以实现更清晰的导入

### 需求 10：文件工具函数

**用户故事：** 作为开发者，我希望有文件工具函数，以便我可以安全地执行常见的文件操作。

#### 验收标准

1. 系统应当定义一个 fileExists 函数，检查给定路径的文件是否存在
2. 系统应当定义一个 readFile 函数，将文件内容读取为字符串
3. 系统应当定义一个 writeFile 函数，将内容写入文件
4. 系统应当定义一个 readYaml 函数，解析 YAML 文件
5. 系统应当定义一个 writeYaml 函数，序列化并写入 YAML 文件
6. 当任何文件操作失败时，系统应当抛出带有上下文的适当错误
7. 系统应当对所有文件操作使用 async/await
8. 系统应当从 utils/file.ts 导出文件工具

### 需求 11：CLI 入口点

**用户故事：** 作为用户，我希望有一个 CLI 入口点，以便我可以执行 SpecBridge 命令。

#### 验收标准

1. 系统应当定义一个 index.ts 文件作为主入口点
2. 当执行 CLI 时，系统应当使用 Commander.js 解析命令行参数
3. 当未提供命令时，系统应当显示帮助信息
4. 当提供无效命令时，系统应当显示错误并建议有效命令
5. 系统应当包含 shebang（#!/usr/bin/env node）以实现可执行兼容性
6. 系统应当优雅地处理未捕获的错误并显示用户友好的消息
7. 系统应当根据命令成功或失败适当设置进程退出代码

### 需求 12：代码质量标准

**用户故事：** 作为开发者，我希望强制执行代码质量标准，以便代码库保持可维护性。

#### 验收标准

1. 系统应当使用带有 TypeScript 插件的 ESLint 进行代码检查
2. 系统应当使用 Prettier 进行代码格式化
3. 系统应当遵循 kebab-case 命名文件名
4. 系统应当遵循 PascalCase 命名类名
5. 系统应当遵循 camelCase 命名函数和变量名
6. 系统应当要求所有函数具有明确的返回类型
7. 系统应当禁止使用 any 类型，除非绝对必要
8. 系统应当要求所有公共 API 具有 JSDoc 注释

### 需求 13：Kiro 源适配器实现

**用户故事：** 作为开发者，我希望实现 Kiro 源适配器，以便系统可以读取和解析 Kiro 规格文档。

#### 验收标准

1. 系统应当定义一个 KiroAdapter 类，实现 SourceAdapter 接口
2. 当调用 detect 方法时，系统应当检查路径中是否存在 .kiro/specs 目录
3. 当调用 parse 方法时，系统应当读取指定规格目录下的 requirements.md、design.md 和 tasks.md 文件
4. 当解析 requirements.md 时，系统应当提取需求标题、描述、优先级和标签
5. 当解析 tasks.md 时，系统应当提取任务 ID、标题、状态、负责人和父任务关系
6. 当解析 design.md 时，系统应当提取设计文档的完整内容
7. 系统应当使用 gray-matter 解析 Markdown 文件的 frontmatter
8. 系统应当将解析结果转换为统一的 SpecData 格式
9. 当文件不存在或格式无效时，系统应当抛出描述性错误
10. 系统应当从 adapters/source/kiro.ts 导出 KiroAdapter 类

### 需求 14：GitHub 目标适配器实现

**用户故事：** 作为开发者，我希望实现 GitHub 目标适配器，以便系统可以将数据同步到 GitHub Issues。

#### 验收标准

1. 系统应当定义一个 GitHubAdapter 类，实现 TargetAdapter 接口
2. 当调用 init 方法时，系统应当初始化 GitHub API 客户端或 gh CLI 客户端
3. 系统应当支持两种认证方式：GitHub API token 和 gh CLI
4. 当使用 gh CLI 时，系统应当检查 gh 命令是否可用
5. 当使用 API token 时，系统应当使用 @octokit/rest 初始化客户端
6. 系统应当在配置中指定目标仓库的 owner 和 repo
7. 系统应当从 adapters/target/github.ts 导出 GitHubAdapter 类

### 需求 15：GitHub Issue 同步策略

**用户故事：** 作为开发者，我希望定义 GitHub Issue 同步策略，以便系统可以正确地创建和更新 Issues。

#### 验收标准

1. 当同步任务时，系统应当为每个任务创建或更新对应的 GitHub Issue
2. 系统应当使用自定义标签 `specbridge:task-id:{id}` 来标识和查找已同步的 Issue
3. 当 Issue 不存在时，系统应当创建新的 Issue
4. 当 Issue 已存在时，系统应当更新 Issue 的标题、正文和状态
5. 当任务状态为 done 时，系统应当关闭对应的 Issue
6. 当任务状态为 todo 或 in_progress 时，系统应当确保 Issue 处于打开状态
7. 系统应当在 Issue 正文中包含任务的完整描述和元数据
8. 系统应当支持为 Issue 设置 assignee（如果任务指定了负责人）
9. 系统应当支持为 Issue 添加自定义标签（基于任务的 labels 属性）

### 需求 16：同步粒度控制

**用户故事：** 作为用户，我希望控制同步的粒度，以便我可以选择同步整个规格、单个需求或单个任务。

#### 验收标准

1. 系统应当在 sync 命令中支持 --scope 选项，接受值：all、requirements、tasks、single
2. 当 scope 为 all 时，系统应当同步整个规格（需求、设计和任务）
3. 当 scope 为 requirements 时，系统应当仅同步需求
4. 当 scope 为 tasks 时，系统应当仅同步任务
5. 当 scope 为 single 时，系统应当支持 --id 选项指定单个需求或任务的 ID
6. 当未指定 scope 时，系统应当默认同步所有内容
7. 系统应当在日志中清晰显示正在同步的范围

### 需求 17：同步变更记录

**用户故事：** 作为用户，我希望系统记录每次同步的变更内容，以便我可以追踪同步历史。

#### 验收标准

1. 系统应当在每次同步时生成一个 SyncChange 对象，记录变更详情
2. SyncChange 应当包含 timestamp、action（created/updated/closed）、itemType（requirement/task）、itemId 和 changes 属性
3. 当创建新 Issue 时，系统应当记录 action 为 created
4. 当更新现有 Issue 时，系统应当记录 action 为 updated 和具体的变更字段
5. 当关闭 Issue 时，系统应当记录 action 为 closed
6. 系统应当将 SyncChange 对象包含在 SyncResult 的 changes 数组中
7. 系统应当在详细模式下输出每个变更的详细信息

### 需求 18：GitHub Issue 评论同步

**用户故事：** 作为用户，我希望系统在每次同步时在 Issue 评论区添加变更说明，以便我可以在 GitHub 上查看同步历史。

#### 验收标准

1. 当更新现有 Issue 时，系统应当在 Issue 评论区添加一条评论
2. 评论应当包含同步时间戳
3. 评论应当列出本次同步的所有变更内容（例如：标题变更、状态变更、描述更新等）
4. 评论应当使用清晰的格式，便于阅读
5. 评论应当包含 SpecBridge 的标识，例如 "🔄 Synced by SpecBridge"
6. 当创建新 Issue 时，系统不应当添加评论（因为 Issue 本身就是新创建的）
7. 系统应当在配置中支持禁用评论功能（通过 addComments 选项）

### 需求 19：任务内容更新同步

**用户故事：** 作为用户，我希望系统在同步任务进度的同时更新任务的内容，以便 GitHub Issue 始终反映最新的任务信息。

#### 验收标准

1. 当任务的 description 字段发生变化时，系统应当更新 Issue 的正文
2. 当任务的 title 字段发生变化时，系统应当更新 Issue 的标题
3. 当任务的 status 字段发生变化时，系统应当更新 Issue 的状态（打开/关闭）
4. 当任务的 assignee 字段发生变化时，系统应当更新 Issue 的 assignee
5. 当任务的 labels 字段发生变化时，系统应当更新 Issue 的标签
6. 系统应当检测字段变化，仅更新发生变化的字段
7. 系统应当在 SyncChange 中记录每个字段的变更（旧值 → 新值）

### 需求 20：同步状态持久化

**用户故事：** 作为开发者，我希望系统持久化同步状态，以便下次同步时可以识别哪些 Issue 已经同步过。

#### 验收标准

1. 系统应当在项目根目录创建 .specbridge/ 目录用于存储同步状态
2. 系统应当创建 .specbridge/sync-state.json 文件记录同步映射关系
3. sync-state.json 应当包含 taskId 到 GitHub Issue number 的映射
4. 系统应当在每次成功同步后更新 sync-state.json
5. 系统应当在同步前读取 sync-state.json 以识别已同步的 Issue
6. 当 sync-state.json 不存在时，系统应当创建新文件
7. 系统应当将 .specbridge/ 目录添加到 .gitignore 建议中（在 init 命令时提示用户）
