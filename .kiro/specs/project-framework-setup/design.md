# 设计文档

## 简介

本文档描述了 SpecBridge 项目框架的完整技术设计。SpecBridge 是一个轻量级 CLI 工具，采用双适配器架构将 AI 生成的规格文档同步到项目管理平台。本设计涵盖核心数据模型、适配器接口、同步引擎、配置系统、CLI 框架以及 Kiro 和 GitHub 适配器的完整实现。

## 系统架构

### 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                      SpecBridge CLI                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐              ┌──────────────┐            │
│  │ 源适配器      │              │ 目标适配器    │            │
│  ├──────────────┤              ├──────────────┤            │
│  │ - Kiro       │              │ - GitHub     │            │
│  │ - OpenSpec   │              │ - Jira       │            │
│  │ - 自定义     │              │ - CodeUp     │            │
│  └──────┬───────┘              └──────┬───────┘            │
│         │                             │                    │
│         └──────────┬──────────────────┘                    │
│                    │                                       │
│         ┌──────────▼──────────┐                            │
│         │   同步引擎           │                            │
│         │  (核心逻辑)          │                            │
│         └──────────┬──────────┘                            │
│                    │                                       │
│         ┌──────────▼──────────┐                            │
│         │   配置管理器         │                            │
│         └─────────────────────┘                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 数据流

```
1. 用户执行 CLI 命令
   ↓
2. 配置管理器加载 .specbridge.yaml
   ↓
3. 源适配器解析规格文件 → 统一数据模型 (SpecData)
   ↓
4. 同步引擎协调同步过程
   ↓
5. 目标适配器将数据同步到平台
   ↓
6. 返回同步结果并记录变更
```

## 核心组件设计

### 1. 统一数据模型 (需求 1)

**设计决策**：使用统一的数据模型作为所有适配器之间的中间表示，确保源和目标适配器解耦。


#### 数据模型结构

```typescript
// src/core/models.ts

/**
 * 规格元数据
 */
export interface SpecMeta {
  name: string;           // 规格名称（如 "user-authentication"）
  version: string;        // 版本号（如 "1.0.0"）
  createdAt: string;      // ISO 8601 时间戳
  updatedAt: string;      // ISO 8601 时间戳
}

/**
 * 任务状态枚举
 */
export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
  BLOCKED = 'blocked'
}

/**
 * 需求定义
 */
export interface Requirement {
  id: string;             // 唯一标识符
  title: string;          // 需求标题
  description: string;    // 需求描述
  priority?: string;      // 优先级（high/medium/low）
  labels?: string[];      // 标签数组
  syncId?: string;        // 同步到目标平台的 ID（如 GitHub Issue #123）
}

/**
 * 任务定义
 */
export interface Task {
  id: string;             // 唯一标识符
  title: string;          // 任务标题
  description?: string;   // 任务描述
  status: TaskStatus;     // 任务状态
  assignee?: string;      // 负责人
  parentId?: string;      // 父任务 ID（用于子任务）
  labels?: string[];      // 标签数组
  syncId?: string;        // 同步到目标平台的 ID
}

/**
 * 设计文档
 */
export interface Design {
  content: string;        // 设计文档的完整内容（Markdown）
  sections?: {            // 可选的结构化章节
    [key: string]: string;
  };
}

/**
 * 同步变更记录
 */
export interface SyncChange {
  timestamp: string;      // ISO 8601 时间戳
  action: 'created' | 'updated' | 'closed';  // 操作类型
  itemType: 'requirement' | 'task' | 'design';  // 项目类型
  itemId: string;         // 项目 ID
  changes?: {             // 具体变更内容
    field: string;        // 变更字段
    oldValue?: any;       // 旧值
    newValue?: any;       // 新值
  }[];
}

/**
 * 同步结果
 */
export interface SyncResult {
  success: boolean;       // 是否成功
  created: number;        // 创建数量
  updated: number;        // 更新数量
  failed: number;         // 失败数量
  changes: SyncChange[];  // 变更详情
  errors?: string[];      // 错误消息
}

/**
 * 规格数据（顶层容器）
 */
export interface SpecData {
  meta: SpecMeta;
  requirements: Requirement[];
  design?: Design;
  tasks: Task[];
}
```

**设计理由**：
- 使用 TypeScript 接口确保类型安全
- 所有 ID 使用字符串类型以支持不同平台的 ID 格式
- syncId 字段用于跟踪同步状态，避免重复创建
- SyncChange 提供详细的变更追踪，便于审计和调试

### 2. 源适配器接口 (需求 2)

**设计决策**：定义统一的源适配器接口，支持多种规格文档格式。

#### 接口定义

```typescript
// src/adapters/source/base.ts

/**
 * 源适配器接口
 * 负责从各种来源读取和解析规格文档
 */
export interface SourceAdapter {
  /** 适配器名称 */
  name: string;
  
  /**
   * 检测是否可以处理指定路径
   * @param path 规格文档路径
   * @returns 是否支持该路径
   */
  detect(path: string): boolean;
  
  /**
   * 解析规格文档
   * @param path 规格文档路径
   * @returns 解析后的规格数据
   */
  parse(path: string): Promise<SpecData>;
  
  /**
   * 监听文件变化（可选）
   * @param path 规格文档路径
   * @param callback 变化回调函数
   */
  watch?(path: string, callback: (data: SpecData) => void): void;
}

/**
 * 基础源适配器抽象类
 * 提供通用功能实现
 */
export abstract class BaseSourceAdapter implements SourceAdapter {
  abstract name: string;
  abstract detect(path: string): boolean;
  abstract parse(path: string): Promise<SpecData>;
  
  /**
   * 验证解析结果
   */
  protected validateSpecData(data: SpecData): void {
    if (!data.meta || !data.meta.name) {
      throw new Error('Invalid SpecData: missing meta.name');
    }
    if (!Array.isArray(data.tasks)) {
      throw new Error('Invalid SpecData: tasks must be an array');
    }
  }
}
```

**设计理由**：
- detect 方法允许自动检测适配器类型
- parse 方法返回 Promise 支持异步文件读取
- watch 方法为可选，支持实时同步场景
- BaseSourceAdapter 提供通用验证逻辑，减少重复代码

### 3. 目标适配器接口 (需求 3)

**设计决策**：定义统一的目标适配器接口，支持多种项目管理平台。


#### 接口定义

```typescript
// src/adapters/target/base.ts

/**
 * 目标适配器接口
 * 负责将数据同步到项目管理平台
 */
export interface TargetAdapter {
  /** 适配器名称 */
  name: string;
  
  /**
   * 初始化适配器
   * @param config 适配器配置
   */
  init(config: any): Promise<void>;
  
  /**
   * 同步需求
   * @param requirements 需求数组
   * @returns 同步结果
   */
  syncRequirements(requirements: Requirement[]): Promise<SyncResult>;
  
  /**
   * 同步任务
   * @param tasks 任务数组
   * @returns 同步结果
   */
  syncTasks(tasks: Task[]): Promise<SyncResult>;
  
  /**
   * 同步设计文档（可选）
   * @param design 设计文档
   * @returns 同步结果
   */
  syncDesign?(design: Design): Promise<SyncResult>;
  
  /**
   * 获取任务状态
   * @param taskId 任务 ID
   * @returns 任务状态
   */
  getTaskStatus(taskId: string): Promise<TaskStatus>;
}

/**
 * 基础目标适配器抽象类
 */
export abstract class BaseTargetAdapter implements TargetAdapter {
  abstract name: string;
  protected config: any;
  
  abstract init(config: any): Promise<void>;
  abstract syncRequirements(requirements: Requirement[]): Promise<SyncResult>;
  abstract syncTasks(tasks: Task[]): Promise<SyncResult>;
  abstract getTaskStatus(taskId: string): Promise<TaskStatus>;
  
  /**
   * 创建同步结果对象
   */
  protected createSyncResult(): SyncResult {
    return {
      success: true,
      created: 0,
      updated: 0,
      failed: 0,
      changes: [],
      errors: []
    };
  }
}
```

**设计理由**：
- init 方法分离初始化逻辑，支持延迟配置
- 分离 syncRequirements、syncTasks、syncDesign 方法，提供细粒度控制
- getTaskStatus 支持状态查询，便于双向同步
- BaseTargetAdapter 提供通用工具方法

### 4. 配置管理系统 (需求 4)

**设计决策**：使用 YAML 配置文件，支持环境变量替换和配置验证。

#### 配置接口

```typescript
// src/core/config.ts

/**
 * 源配置
 */
export interface SourceConfig {
  type: string;           // 适配器类型（kiro/openspec/custom）
  path?: string;          // 规格文档路径（可选，自动检测）
  plugin?: string;        // 自定义插件路径
}

/**
 * 目标配置
 */
export interface TargetConfig {
  name: string;           // 目标名称
  type: string;           // 适配器类型（github/jira/custom）
  enabled: boolean;       // 是否启用
  config: any;            // 平台特定配置
  mapping?: {             // 映射配置
    requirements?: string;  // 需求映射类型
    tasks?: string;         // 任务映射类型
    design?: string;        // 设计映射类型
  };
  plugin?: string;        // 自定义插件路径
}

/**
 * 通知配置
 */
export interface NotificationConfig {
  type: string;           // 通知类型（slack/email）
  config: any;            // 通知配置
  events?: string[];      // 监听的事件
}

/**
 * 主配置
 */
export interface Config {
  version: string;        // 配置版本
  source: SourceConfig;
  targets: TargetConfig[];
  notifications?: NotificationConfig[];
}

/**
 * 加载配置文件
 * @param configPath 配置文件路径（默认 .specbridge.yaml）
 * @returns 配置对象
 */
export async function loadConfig(configPath?: string): Promise<Config>;

/**
 * 验证配置
 * @param config 配置对象
 * @throws ConfigParseError 如果配置无效
 */
export function validateConfig(config: Config): void;

/**
 * 替换环境变量
 * @param value 包含 ${VAR} 的字符串
 * @returns 替换后的字符串
 */
export function replaceEnvVars(value: string): string;
```

#### 配置文件示例

```yaml
# .specbridge.yaml
version: "1.0"

source:
  type: kiro
  path: .kiro/specs

targets:
  - name: github-issues
    type: github
    enabled: true
    config:
      owner: your-org
      repo: your-repo
      token: ${GITHUB_TOKEN}
      authMethod: token  # token | gh-cli
      addComments: true  # 是否添加同步评论
    mapping:
      requirements: issue
      tasks: issue

notifications:
  - type: slack
    config:
      webhook: ${SLACK_WEBHOOK}
    events:
      - task_completed
      - sync_failed
```

**设计理由**：
- YAML 格式易读易写
- 环境变量替换避免敏感信息泄露
- 支持多目标配置，实现一对多同步
- mapping 配置提供灵活的数据映射策略

### 5. 同步引擎 (需求 5)

**设计决策**：同步引擎作为核心协调器，管理源和目标适配器之间的数据流。


#### 同步引擎设计

```typescript
// src/core/sync-engine.ts

/**
 * 同步状态
 */
export interface SyncStatus {
  lastSync?: string;      // 上次同步时间
  status: 'idle' | 'syncing' | 'error';
  results?: SyncResult[];
}

/**
 * 同步选项
 */
export interface SyncOptions {
  scope?: 'all' | 'requirements' | 'tasks' | 'single';
  itemId?: string;        // 当 scope 为 single 时指定
  dryRun?: boolean;       // 仅模拟，不实际同步
}

/**
 * 同步引擎
 */
export class SyncEngine {
  private status: SyncStatus;
  private history: SyncResult[];
  
  constructor() {
    this.status = { status: 'idle' };
    this.history = [];
  }
  
  /**
   * 执行同步
   * @param source 源适配器
   * @param targets 目标适配器数组
   * @param options 同步选项
   */
  async sync(
    source: SourceAdapter,
    targets: TargetAdapter[],
    options?: SyncOptions
  ): Promise<SyncResult[]>;
  
  /**
   * 获取当前同步状态
   */
  getStatus(): SyncStatus;
  
  /**
   * 获取同步历史
   */
  getHistory(): SyncResult[];
}
```

#### 同步流程

```
1. 更新状态为 'syncing'
2. 调用源适配器解析规格
3. 根据 scope 过滤数据
4. 遍历所有启用的目标适配器：
   a. 调用 init 初始化
   b. 根据 mapping 配置调用相应的 sync 方法
   c. 收集同步结果
   d. 如果失败，记录错误但继续处理其他目标
5. 更新同步历史
6. 更新状态为 'idle' 或 'error'
7. 返回所有同步结果
```

**设计理由**：
- 集中管理同步逻辑，简化 CLI 命令实现
- 支持多目标并行同步，提高效率
- 错误隔离：单个目标失败不影响其他目标
- 同步历史记录便于调试和审计

### 6. CLI 命令结构 (需求 6)

**设计决策**：使用 Commander.js 构建清晰的命令行界面。

#### CLI 架构

```typescript
// src/index.ts

#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './cli/commands/init';
import { syncCommand } from './cli/commands/sync';
import { statusCommand } from './cli/commands/status';

const program = new Command();

program
  .name('specbridge')
  .description('AI-driven spec to project management platform sync tool')
  .version('0.1.0');

// 全局选项
program.option('-v, --verbose', 'Enable verbose logging');

// 注册命令
program.addCommand(initCommand);
program.addCommand(syncCommand);
program.addCommand(statusCommand);

// 错误处理
program.exitOverride();

try {
  program.parse(process.argv);
} catch (error) {
  handleError(error);
  process.exit(1);
}
```

#### 命令实现

```typescript
// src/cli/commands/init.ts
export const initCommand = new Command('init')
  .description('Initialize SpecBridge configuration')
  .option('-f, --force', 'Overwrite existing configuration')
  .action(async (options) => {
    // 实现初始化逻辑
  });

// src/cli/commands/sync.ts
export const syncCommand = new Command('sync')
  .description('Sync specs to project management platforms')
  .option('--scope <type>', 'Sync scope: all|requirements|tasks|single', 'all')
  .option('--id <id>', 'Item ID when scope is single')
  .option('--dry-run', 'Simulate sync without making changes')
  .action(async (options) => {
    // 实现同步逻辑
  });

// src/cli/commands/status.ts
export const statusCommand = new Command('status')
  .description('Show current sync status')
  .action(async () => {
    // 实现状态查询逻辑
  });
```

**设计理由**：
- Commander.js 提供强大的命令解析能力
- 分离命令实现，保持代码组织清晰
- 全局选项（如 --verbose）适用于所有命令
- 统一的错误处理机制

### 7. 日志工具 (需求 7)

**设计决策**：使用 chalk 和 ora 提供美观的控制台输出。

#### 日志工具设计

```typescript
// src/utils/logger.ts
import chalk from 'chalk';
import ora, { Ora } from 'ora';

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

/**
 * 日志器
 */
export class Logger {
  private level: LogLevel;
  private spinner?: Ora;
  
  constructor(verbose: boolean = false) {
    this.level = verbose ? LogLevel.DEBUG : LogLevel.INFO;
  }
  
  /**
   * 信息日志（蓝色）
   */
  info(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log(chalk.blue('ℹ'), message, ...args);
    }
  }
  
  /**
   * 警告日志（黄色）
   */
  warn(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.WARN) {
      console.log(chalk.yellow('⚠'), message, ...args);
    }
  }
  
  /**
   * 错误日志（红色）
   */
  error(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(chalk.red('✖'), message, ...args);
    }
  }
  
  /**
   * 成功日志（绿色）
   */
  success(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log(chalk.green('✔'), message, ...args);
    }
  }
  
  /**
   * 调试日志（灰色）
   */
  debug(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.log(chalk.gray('⚙'), message, ...args);
    }
  }
  
  /**
   * 启动加载动画
   */
  startSpinner(text: string): void {
    this.spinner = ora(text).start();
  }
  
  /**
   * 停止加载动画（成功）
   */
  succeedSpinner(text?: string): void {
    this.spinner?.succeed(text);
  }
  
  /**
   * 停止加载动画（失败）
   */
  failSpinner(text?: string): void {
    this.spinner?.fail(text);
  }
}

// 导出全局实例
export const logger = new Logger();
```

**设计理由**：
- 使用图标和颜色提高可读性
- 支持详细模式，便于调试
- ora spinner 提供友好的长时间操作反馈
- 单例模式便于全局使用

### 8. 错误处理 (需求 8)

**设计决策**：定义自定义错误类，提供清晰的错误上下文。


#### 错误类定义

```typescript
// src/utils/errors.ts

/**
 * SpecBridge 基础错误类
 */
export class SpecBridgeError extends Error {
  code: string;
  
  constructor(message: string, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 配置文件未找到错误
 */
export class ConfigNotFoundError extends SpecBridgeError {
  constructor(path: string) {
    super(
      `Configuration file not found: ${path}`,
      'CONFIG_NOT_FOUND'
    );
  }
}

/**
 * 配置解析错误
 */
export class ConfigParseError extends SpecBridgeError {
  constructor(message: string) {
    super(
      `Failed to parse configuration: ${message}`,
      'CONFIG_PARSE_ERROR'
    );
  }
}

/**
 * 认证错误
 */
export class AuthenticationError extends SpecBridgeError {
  constructor(platform: string) {
    super(
      `Authentication failed for ${platform}. Please check your credentials.`,
      'AUTH_ERROR'
    );
  }
}

/**
 * API 速率限制错误
 */
export class RateLimitError extends SpecBridgeError {
  retryAfter?: number;
  
  constructor(platform: string, retryAfter?: number) {
    super(
      `Rate limit exceeded for ${platform}. ${retryAfter ? `Retry after ${retryAfter}s` : ''}`,
      'RATE_LIMIT_ERROR'
    );
    this.retryAfter = retryAfter;
  }
}

/**
 * 适配器错误
 */
export class AdapterError extends SpecBridgeError {
  adapterName: string;
  
  constructor(adapterName: string, message: string) {
    super(
      `Adapter '${adapterName}' error: ${message}`,
      'ADAPTER_ERROR'
    );
    this.adapterName = adapterName;
  }
}
```

**设计理由**：
- 继承 Error 类保持标准错误处理兼容性
- 错误代码便于程序化处理
- 特定错误类携带额外上下文信息（如 retryAfter）
- 清晰的错误消息提高用户体验

### 9. TypeScript 配置 (需求 9)

**设计决策**：使用严格的 TypeScript 配置确保代码质量。

#### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

**设计理由**：
- strict 模式启用所有严格类型检查
- ES2020 目标支持现代 JavaScript 特性
- CommonJS 模块系统兼容 Node.js
- 源映射和声明文件便于调试和类型提示
- 路径别名简化导入语句

### 10. 文件工具函数 (需求 10)

**设计决策**：封装常用文件操作，提供统一的错误处理。

#### 文件工具实现

```typescript
// src/utils/file.ts
import { promises as fs } from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

/**
 * 检查文件是否存在
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 读取文件内容
 */
export async function readFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read file ${filePath}: ${error.message}`);
  }
}

/**
 * 写入文件内容
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  try {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write file ${filePath}: ${error.message}`);
  }
}

/**
 * 读取 YAML 文件
 */
export async function readYaml<T = any>(filePath: string): Promise<T> {
  try {
    const content = await readFile(filePath);
    return yaml.parse(content) as T;
  } catch (error) {
    throw new Error(`Failed to parse YAML file ${filePath}: ${error.message}`);
  }
}

/**
 * 写入 YAML 文件
 */
export async function writeYaml(filePath: string, data: any): Promise<void> {
  try {
    const content = yaml.stringify(data);
    await writeFile(filePath, content);
  } catch (error) {
    throw new Error(`Failed to write YAML file ${filePath}: ${error.message}`);
  }
}

/**
 * 确保目录存在
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}
```

**设计理由**：
- 使用 async/await 保持代码简洁
- 统一的错误处理和消息格式
- 自动创建目录避免写入失败
- YAML 工具函数简化配置文件操作

### 11. CLI 入口点 (需求 11)

**设计决策**：提供健壮的 CLI 入口，包含完善的错误处理。


#### CLI 入口实现

```typescript
// src/index.ts
#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './cli/commands/init';
import { syncCommand } from './cli/commands/sync';
import { statusCommand } from './cli/commands/status';
import { logger } from './utils/logger';
import {
  SpecBridgeError,
  ConfigNotFoundError,
  AuthenticationError,
  RateLimitError
} from './utils/errors';

const program = new Command();

program
  .name('specbridge')
  .description('AI-driven spec to project management platform sync tool')
  .version('0.1.0')
  .option('-v, --verbose', 'Enable verbose logging');

// 注册命令
program.addCommand(initCommand);
program.addCommand(syncCommand);
program.addCommand(statusCommand);

// 显示帮助信息（无命令时）
if (process.argv.length === 2) {
  program.help();
}

// 全局错误处理
function handleError(error: Error): void {
  if (error instanceof ConfigNotFoundError) {
    logger.error('Configuration file not found.');
    logger.info('Run "specbridge init" to create a configuration file.');
  } else if (error instanceof AuthenticationError) {
    logger.error(error.message);
    logger.info('Please check your API tokens in the configuration file.');
  } else if (error instanceof RateLimitError) {
    logger.error(error.message);
    if (error.retryAfter) {
      logger.info(`Please wait ${error.retryAfter} seconds before retrying.`);
    }
  } else if (error instanceof SpecBridgeError) {
    logger.error(`[${error.code}] ${error.message}`);
  } else {
    logger.error('An unexpected error occurred:', error.message);
    if (program.opts().verbose) {
      console.error(error.stack);
    }
  }
}

// 捕获未处理的异常
process.on('unhandledRejection', (error: Error) => {
  handleError(error);
  process.exit(1);
});

process.on('uncaughtException', (error: Error) => {
  handleError(error);
  process.exit(1);
});

// 解析命令
try {
  program.parse(process.argv);
} catch (error) {
  handleError(error as Error);
  process.exit(1);
}
```

**设计理由**：
- shebang 支持直接执行
- 无命令时显示帮助信息
- 全局错误处理提供友好的错误消息
- 捕获未处理的异常避免程序崩溃
- 详细模式下显示堆栈跟踪

### 12. 代码质量标准 (需求 12)

**设计决策**：使用 ESLint 和 Prettier 确保代码质量和一致性。

#### ESLint 配置

```json
// .eslintrc.json
{
  "parser": "@typescript-eslint/parser",
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "parserOptions": {
    "ecmaVersion": 2020,
    "sourceType": "module"
  },
  "rules": {
    "@typescript-eslint/explicit-function-return-type": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": "error",
    "no-console": "off"
  }
}
```

#### Prettier 配置

```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

#### 命名规范

- **文件名**：kebab-case（如 `sync-engine.ts`）
- **类名**：PascalCase（如 `SyncEngine`）
- **接口名**：PascalCase，不使用 I 前缀（如 `SourceAdapter`）
- **函数/变量**：camelCase（如 `syncTasks`）
- **常量**：UPPER_SNAKE_CASE（如 `MAX_RETRY_COUNT`）
- **枚举**：PascalCase，成员 UPPER_SNAKE_CASE（如 `TaskStatus.IN_PROGRESS`）

**设计理由**：
- 自动化代码检查减少人工审查负担
- 统一的代码风格提高可读性
- 明确的命名规范避免混淆

## Kiro 源适配器实现 (需求 13)

**设计决策**：实现 Kiro 规格文档的完整解析逻辑。

### Kiro 规格文件结构

```
.kiro/specs/feature-name/
├── requirements.md  # 需求文档
├── design.md        # 设计文档
└── tasks.md         # 任务列表
```

### 适配器实现

```typescript
// src/adapters/source/kiro.ts
import * as path from 'path';
import matter from 'gray-matter';
import { BaseSourceAdapter } from './base';
import { SpecData, Requirement, Task, Design, TaskStatus } from '../../core/models';
import { fileExists, readFile } from '../../utils/file';
import { AdapterError } from '../../utils/errors';

export class KiroAdapter extends BaseSourceAdapter {
  name = 'kiro';
  
  /**
   * 检测是否为 Kiro 规格目录
   */
  detect(specPath: string): boolean {
    // 检查是否存在 .kiro/specs 目录
    const kiroPath = path.join(specPath, '.kiro', 'specs');
    return fileExists(kiroPath);
  }
  
  /**
   * 解析 Kiro 规格文档
   * @param specPath 规格目录路径（如 .kiro/specs/user-authentication）
   */
  async parse(specPath: string): Promise<SpecData> {
    try {
      const specName = path.basename(specPath);
      
      // 读取三个文件
      const requirementsPath = path.join(specPath, 'requirements.md');
      const designPath = path.join(specPath, 'design.md');
      const tasksPath = path.join(specPath, 'tasks.md');
      
      // 解析需求
      const requirements = await this.parseRequirements(requirementsPath);
      
      // 解析设计
      const design = await this.parseDesign(designPath);
      
      // 解析任务
      const tasks = await this.parseTasks(tasksPath);
      
      // 构建 SpecData
      const specData: SpecData = {
        meta: {
          name: specName,
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        requirements,
        design,
        tasks
      };
      
      this.validateSpecData(specData);
      return specData;
      
    } catch (error) {
      throw new AdapterError(this.name, `Failed to parse Kiro spec: ${error.message}`);
    }
  }
  
  /**
   * 解析 requirements.md
   */
  private async parseRequirements(filePath: string): Promise<Requirement[]> {
    if (!await fileExists(filePath)) {
      return [];
    }
    
    const content = await readFile(filePath);
    const { data: frontmatter, content: markdown } = matter(content);
    
    const requirements: Requirement[] = [];
    
    // 使用正则匹配需求章节
    const reqPattern = /###?\s+需求\s+(\d+)[：:]\s*(.+?)$/gm;
    let match;
    
    while ((match = reqPattern.exec(markdown)) !== null) {
      const id = `req-${match[1]}`;
      const title = match[2].trim();
      
      // 提取描述（下一段内容）
      const startIndex = match.index + match[0].length;
      const nextHeading = markdown.indexOf('###', startIndex);
      const description = markdown
        .substring(startIndex, nextHeading > 0 ? nextHeading : undefined)
        .trim();
      
      requirements.push({
        id,
        title,
        description,
        priority: frontmatter.priority,
        labels: frontmatter.labels || []
      });
    }
    
    return requirements;
  }
  
  /**
   * 解析 design.md
   */
  private async parseDesign(filePath: string): Promise<Design | undefined> {
    if (!await fileExists(filePath)) {
      return undefined;
    }
    
    const content = await readFile(filePath);
    const { content: markdown } = matter(content);
    
    return {
      content: markdown
    };
  }
  
  /**
   * 解析 tasks.md
   */
  private async parseTasks(filePath: string): Promise<Task[]> {
    if (!await fileExists(filePath)) {
      return [];
    }
    
    const content = await readFile(filePath);
    const tasks: Task[] = [];
    
    // 匹配任务行：- [ ] 1.1 任务标题 (@assignee)
    const taskPattern = /^-\s+\[([ x-])\]\s+(\d+(?:\.\d+)?)\s+(.+?)(?:\s+\(@(\w+)\))?$/gm;
    let match;
    
    while ((match = taskPattern.exec(content)) !== null) {
      const statusChar = match[1];
      const taskId = match[2];
      const title = match[3].trim();
      const assignee = match[4];
      
      // 映射状态
      let status: TaskStatus;
      if (statusChar === 'x') {
        status = TaskStatus.DONE;
      } else if (statusChar === '-') {
        status = TaskStatus.IN_PROGRESS;
      } else {
        status = TaskStatus.TODO;
      }
      
      tasks.push({
        id: taskId,
        title,
        status,
        assignee
      });
    }
    
    return tasks;
  }
}
```

**设计理由**：
- 使用 gray-matter 解析 frontmatter 元数据
- 正则表达式提取结构化内容
- 支持任务状态映射（[ ] → todo, [x] → done, [-] → in_progress）
- 支持任务负责人提取（@username）
- 错误处理包装为 AdapterError

## GitHub 目标适配器实现 (需求 14-15)

**设计决策**：支持两种认证方式（API token 和 gh CLI），实现完整的 Issue 同步逻辑。


### GitHub 适配器实现

```typescript
// src/adapters/target/github.ts
import { Octokit } from '@octokit/rest';
import { exec } from 'child_process';
import { promisify } from 'util';
import { BaseTargetAdapter } from './base';
import {
  Requirement,
  Task,
  Design,
  SyncResult,
  TaskStatus,
  SyncChange
} from '../../core/models';
import { AuthenticationError, AdapterError } from '../../utils/errors';

const execAsync = promisify(exec);

/**
 * GitHub 适配器配置
 */
interface GitHubConfig {
  owner: string;           // 仓库所有者
  repo: string;            // 仓库名称
  token?: string;          // GitHub API token
  authMethod: 'token' | 'gh-cli';  // 认证方式
  addComments?: boolean;   // 是否添加同步评论
}

/**
 * GitHub 适配器
 */
export class GitHubAdapter extends BaseTargetAdapter {
  name = 'github';
  private octokit?: Octokit;
  private ghConfig?: GitHubConfig;
  
  /**
   * 初始化适配器
   */
  async init(config: GitHubConfig): Promise<void> {
    this.ghConfig = config;
    
    if (config.authMethod === 'token') {
      if (!config.token) {
        throw new AuthenticationError('GitHub: token is required');
      }
      this.octokit = new Octokit({ auth: config.token });
    } else if (config.authMethod === 'gh-cli') {
      // 检查 gh CLI 是否可用
      try {
        await execAsync('gh --version');
      } catch {
        throw new AdapterError(
          this.name,
          'gh CLI is not installed or not in PATH'
        );
      }
    }
    
    // 验证仓库访问权限
    await this.validateAccess();
  }
  
  /**
   * 验证仓库访问权限
   */
  private async validateAccess(): Promise<void> {
    try {
      if (this.octokit) {
        await this.octokit.repos.get({
          owner: this.ghConfig!.owner,
          repo: this.ghConfig!.repo
        });
      } else {
        await execAsync(
          `gh repo view ${this.ghConfig!.owner}/${this.ghConfig!.repo}`
        );
      }
    } catch (error) {
      throw new AuthenticationError('GitHub: failed to access repository');
    }
  }
  
  /**
   * 同步需求（可选功能）
   */
  async syncRequirements(requirements: Requirement[]): Promise<SyncResult> {
    const result = this.createSyncResult();
    
    for (const req of requirements) {
      try {
        const existingIssue = await this.findIssueByLabel(
          `specbridge:req-id:${req.id}`
        );
        
        if (existingIssue) {
          // 更新现有 Issue
          await this.updateIssue(existingIssue.number, {
            title: req.title,
            body: this.formatRequirementBody(req),
            labels: this.buildLabels(req.labels, `specbridge:req-id:${req.id}`)
          });
          result.updated++;
          result.changes.push({
            timestamp: new Date().toISOString(),
            action: 'updated',
            itemType: 'requirement',
            itemId: req.id
          });
        } else {
          // 创建新 Issue
          const issue = await this.createIssue({
            title: req.title,
            body: this.formatRequirementBody(req),
            labels: this.buildLabels(req.labels, `specbridge:req-id:${req.id}`)
          });
          req.syncId = `#${issue.number}`;
          result.created++;
          result.changes.push({
            timestamp: new Date().toISOString(),
            action: 'created',
            itemType: 'requirement',
            itemId: req.id
          });
        }
      } catch (error) {
        result.failed++;
        result.errors?.push(`Failed to sync requirement ${req.id}: ${error.message}`);
      }
    }
    
    result.success = result.failed === 0;
    return result;
  }
  
  /**
   * 同步任务
   */
  async syncTasks(tasks: Task[]): Promise<SyncResult> {
    const result = this.createSyncResult();
    
    for (const task of tasks) {
      try {
        const label = `specbridge:task-id:${task.id}`;
        const existingIssue = await this.findIssueByLabel(label);
        
        if (existingIssue) {
          // 检测变更
          const changes = this.detectTaskChanges(existingIssue, task);
          
          if (changes.length > 0) {
            // 更新 Issue
            await this.updateIssue(existingIssue.number, {
              title: task.title,
              body: this.formatTaskBody(task),
              state: task.status === TaskStatus.DONE ? 'closed' : 'open',
              assignees: task.assignee ? [task.assignee] : undefined,
              labels: this.buildLabels(task.labels, label)
            });
            
            // 添加评论记录变更
            if (this.ghConfig?.addComments) {
              await this.addComment(
                existingIssue.number,
                this.formatChangeComment(changes)
              );
            }
            
            result.updated++;
            result.changes.push({
              timestamp: new Date().toISOString(),
              action: 'updated',
              itemType: 'task',
              itemId: task.id,
              changes
            });
          }
        } else {
          // 创建新 Issue
          const issue = await this.createIssue({
            title: task.title,
            body: this.formatTaskBody(task),
            labels: this.buildLabels(task.labels, label),
            assignees: task.assignee ? [task.assignee] : undefined
          });
          
          task.syncId = `#${issue.number}`;
          result.created++;
          result.changes.push({
            timestamp: new Date().toISOString(),
            action: 'created',
            itemType: 'task',
            itemId: task.id
          });
        }
      } catch (error) {
        result.failed++;
        result.errors?.push(`Failed to sync task ${task.id}: ${error.message}`);
      }
    }
    
    result.success = result.failed === 0;
    return result;
  }
  
  /**
   * 同步设计文档（可选）
   */
  async syncDesign(design: Design): Promise<SyncResult> {
    // 设计文档同步为可选功能，可以创建一个特殊的 Issue
    const result = this.createSyncResult();
    // 实现逻辑...
    return result;
  }
  
  /**
   * 获取任务状态
   */
  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    const label = `specbridge:task-id:${taskId}`;
    const issue = await this.findIssueByLabel(label);
    
    if (!issue) {
      throw new AdapterError(this.name, `Task ${taskId} not found`);
    }
    
    return issue.state === 'closed' ? TaskStatus.DONE : TaskStatus.TODO;
  }
  
  /**
   * 查找带有特定标签的 Issue
   */
  private async findIssueByLabel(label: string): Promise<any | null> {
    if (this.octokit) {
      const { data } = await this.octokit.issues.listForRepo({
        owner: this.ghConfig!.owner,
        repo: this.ghConfig!.repo,
        labels: label,
        state: 'all'
      });
      return data[0] || null;
    } else {
      // 使用 gh CLI
      const { stdout } = await execAsync(
        `gh issue list --repo ${this.ghConfig!.owner}/${this.ghConfig!.repo} --label "${label}" --state all --json number,title,state,body`
      );
      const issues = JSON.parse(stdout);
      return issues[0] || null;
    }
  }
  
  /**
   * 创建 Issue
   */
  private async createIssue(options: {
    title: string;
    body: string;
    labels?: string[];
    assignees?: string[];
  }): Promise<any> {
    if (this.octokit) {
      const { data } = await this.octokit.issues.create({
        owner: this.ghConfig!.owner,
        repo: this.ghConfig!.repo,
        ...options
      });
      return data;
    } else {
      // 使用 gh CLI
      const labelsArg = options.labels?.map(l => `--label "${l}"`).join(' ') || '';
      const assigneesArg = options.assignees?.map(a => `--assignee ${a}`).join(' ') || '';
      
      const { stdout } = await execAsync(
        `gh issue create --repo ${this.ghConfig!.owner}/${this.ghConfig!.repo} --title "${options.title}" --body "${options.body}" ${labelsArg} ${assigneesArg}`
      );
      
      // 提取 Issue 编号
      const match = stdout.match(/#(\d+)/);
      return { number: match ? parseInt(match[1]) : 0 };
    }
  }
  
  /**
   * 更新 Issue
   */
  private async updateIssue(issueNumber: number, options: any): Promise<void> {
    if (this.octokit) {
      await this.octokit.issues.update({
        owner: this.ghConfig!.owner,
        repo: this.ghConfig!.repo,
        issue_number: issueNumber,
        ...options
      });
    } else {
      // 使用 gh CLI
      const args: string[] = [];
      if (options.title) args.push(`--title "${options.title}"`);
      if (options.body) args.push(`--body "${options.body}"`);
      if (options.state) args.push(`--state ${options.state}`);
      
      await execAsync(
        `gh issue edit ${issueNumber} --repo ${this.ghConfig!.owner}/${this.ghConfig!.repo} ${args.join(' ')}`
      );
    }
  }
  
  /**
   * 添加评论
   */
  private async addComment(issueNumber: number, body: string): Promise<void> {
    if (this.octokit) {
      await this.octokit.issues.createComment({
        owner: this.ghConfig!.owner,
        repo: this.ghConfig!.repo,
        issue_number: issueNumber,
        body
      });
    } else {
      await execAsync(
        `gh issue comment ${issueNumber} --repo ${this.ghConfig!.owner}/${this.ghConfig!.repo} --body "${body}"`
      );
    }
  }
  
  /**
   * 检测任务变更
   */
  private detectTaskChanges(existingIssue: any, task: Task): Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }> {
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
    
    if (existingIssue.title !== task.title) {
      changes.push({
        field: 'title',
        oldValue: existingIssue.title,
        newValue: task.title
      });
    }
    
    const expectedState = task.status === TaskStatus.DONE ? 'closed' : 'open';
    if (existingIssue.state !== expectedState) {
      changes.push({
        field: 'status',
        oldValue: existingIssue.state,
        newValue: expectedState
      });
    }
    
    return changes;
  }
  
  /**
   * 格式化任务正文
   */
  private formatTaskBody(task: Task): string {
    let body = task.description || '';
    body += '\n\n---\n';
    body += `**状态**: ${task.status}\n`;
    if (task.assignee) body += `**负责人**: @${task.assignee}\n`;
    if (task.parentId) body += `**父任务**: ${task.parentId}\n`;
    body += '\n_🔄 由 SpecBridge 同步_';
    return body;
  }
  
  /**
   * 格式化需求正文
   */
  private formatRequirementBody(req: Requirement): string {
    let body = req.description;
    body += '\n\n---\n';
    if (req.priority) body += `**优先级**: ${req.priority}\n`;
    body += '\n_🔄 由 SpecBridge 同步_';
    return body;
  }
  
  /**
   * 构建标签数组
   */
  private buildLabels(customLabels?: string[], syncLabel?: string): string[] {
    const labels = ['specbridge'];
    if (syncLabel) labels.push(syncLabel);
    if (customLabels) labels.push(...customLabels);
    return labels;
  }
  
  /**
   * 格式化变更评论
   */
  private formatChangeComment(changes: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>): string {
    let comment = '🔄 **SpecBridge 同步更新**\n\n';
    comment += `_同步时间: ${new Date().toISOString()}_\n\n`;
    comment += '**变更内容**:\n';
    
    for (const change of changes) {
      comment += `- **${change.field}**: \`${change.oldValue}\` → \`${change.newValue}\`\n`;
    }
    
    return comment;
  }
}
```

**设计理由**：
- 支持两种认证方式提高灵活性
- 使用自定义标签（specbridge:task-id:xxx）追踪同步状态
- 变更检测避免不必要的 API 调用
- 评论功能提供详细的同步历史
- 错误处理确保单个任务失败不影响整体同步

## 同步粒度控制 (需求 16)

**设计决策**：通过 CLI 选项控制同步范围。


### 同步粒度实现

```typescript
// src/cli/commands/sync.ts
import { Command } from 'commander';
import { loadConfig } from '../../core/config';
import { SyncEngine } from '../../core/sync-engine';
import { KiroAdapter } from '../../adapters/source/kiro';
import { GitHubAdapter } from '../../adapters/target/github';
import { logger } from '../../utils/logger';

export const syncCommand = new Command('sync')
  .description('Sync specs to project management platforms')
  .option('--scope <type>', 'Sync scope: all|requirements|tasks|single', 'all')
  .option('--id <id>', 'Item ID when scope is single')
  .option('--dry-run', 'Simulate sync without making changes')
  .action(async (options) => {
    try {
      logger.startSpinner('Loading configuration...');
      const config = await loadConfig();
      logger.succeedSpinner('Configuration loaded');
      
      // 初始化源适配器
      const sourceAdapter = new KiroAdapter();
      logger.info(`Using source adapter: ${sourceAdapter.name}`);
      
      // 解析规格
      logger.startSpinner('Parsing spec files...');
      const specData = await sourceAdapter.parse(config.source.path || '.kiro/specs');
      logger.succeedSpinner(`Parsed ${specData.tasks.length} tasks, ${specData.requirements.length} requirements`);
      
      // 根据 scope 过滤数据
      const filteredData = filterByScope(specData, options.scope, options.id);
      
      // 初始化目标适配器
      const targetAdapters = [];
      for (const targetConfig of config.targets) {
        if (!targetConfig.enabled) continue;
        
        if (targetConfig.type === 'github') {
          const adapter = new GitHubAdapter();
          await adapter.init(targetConfig.config);
          targetAdapters.push(adapter);
        }
      }
      
      if (targetAdapters.length === 0) {
        logger.warn('No enabled target adapters found');
        return;
      }
      
      // 执行同步
      const syncEngine = new SyncEngine();
      logger.startSpinner('Syncing...');
      
      const results = await syncEngine.sync(
        sourceAdapter,
        targetAdapters,
        { scope: options.scope, itemId: options.id, dryRun: options.dryRun }
      );
      
      logger.succeedSpinner('Sync completed');
      
      // 显示结果
      for (const result of results) {
        logger.success(`Created: ${result.created}, Updated: ${result.updated}, Failed: ${result.failed}`);
        
        if (options.verbose && result.changes.length > 0) {
          logger.info('Changes:');
          for (const change of result.changes) {
            logger.info(`  - ${change.action} ${change.itemType} ${change.itemId}`);
          }
        }
      }
      
    } catch (error) {
      logger.failSpinner('Sync failed');
      throw error;
    }
  });

/**
 * 根据 scope 过滤数据
 */
function filterByScope(specData: SpecData, scope: string, itemId?: string): SpecData {
  const filtered = { ...specData };
  
  switch (scope) {
    case 'requirements':
      filtered.tasks = [];
      filtered.design = undefined;
      break;
    case 'tasks':
      filtered.requirements = [];
      filtered.design = undefined;
      break;
    case 'single':
      if (!itemId) {
        throw new Error('--id is required when scope is single');
      }
      filtered.requirements = specData.requirements.filter(r => r.id === itemId);
      filtered.tasks = specData.tasks.filter(t => t.id === itemId);
      filtered.design = undefined;
      break;
    case 'all':
    default:
      // 不过滤
      break;
  }
  
  return filtered;
}
```

**设计理由**：
- --scope 选项提供灵活的同步控制
- --id 选项支持单项同步，便于测试和增量更新
- --dry-run 选项允许预览同步结果
- 清晰的日志输出提供同步进度反馈

## 同步变更记录 (需求 17)

**设计决策**：在 SyncResult 中详细记录每次同步的变更。

### 变更记录实现

变更记录已集成在 SyncResult 接口和 GitHub 适配器的 detectTaskChanges 方法中。每次同步操作都会：

1. 记录操作类型（created/updated/closed）
2. 记录项目类型（requirement/task/design）
3. 记录项目 ID
4. 记录具体变更字段（field、oldValue、newValue）

示例变更记录：

```json
{
  "timestamp": "2026-01-16T12:00:00Z",
  "action": "updated",
  "itemType": "task",
  "itemId": "1.1",
  "changes": [
    {
      "field": "title",
      "oldValue": "创建登录 API",
      "newValue": "实现登录 API 端点"
    },
    {
      "field": "status",
      "oldValue": "open",
      "newValue": "closed"
    }
  ]
}
```

## GitHub Issue 评论同步 (需求 18)

**设计决策**：在配置中提供 addComments 选项控制评论功能。

### 评论功能实现

评论功能已在 GitHubAdapter 的 syncTasks 方法中实现：

```typescript
// 添加评论记录变更
if (this.ghConfig?.addComments) {
  await this.addComment(
    existingIssue.number,
    this.formatChangeComment(changes)
  );
}
```

评论格式示例：

```markdown
🔄 **SpecBridge 同步更新**

_同步时间: 2026-01-16T12:00:00Z_

**变更内容**:
- **title**: `创建登录 API` → `实现登录 API 端点`
- **status**: `open` → `closed`
```

**设计理由**：
- 可配置的评论功能避免过多通知
- 清晰的格式便于追踪变更历史
- 时间戳提供审计追踪

## 任务内容更新同步 (需求 19)

**设计决策**：在 detectTaskChanges 方法中检测所有字段变更。

### 内容更新检测

```typescript
private detectTaskChanges(existingIssue: any, task: Task): Array<{
  field: string;
  oldValue: any;
  newValue: any;
}> {
  const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
  
  // 检测标题变更
  if (existingIssue.title !== task.title) {
    changes.push({
      field: 'title',
      oldValue: existingIssue.title,
      newValue: task.title
    });
  }
  
  // 检测描述变更
  const expectedBody = this.formatTaskBody(task);
  if (existingIssue.body !== expectedBody) {
    changes.push({
      field: 'description',
      oldValue: existingIssue.body,
      newValue: expectedBody
    });
  }
  
  // 检测状态变更
  const expectedState = task.status === TaskStatus.DONE ? 'closed' : 'open';
  if (existingIssue.state !== expectedState) {
    changes.push({
      field: 'status',
      oldValue: existingIssue.state,
      newValue: expectedState
    });
  }
  
  // 检测负责人变更
  const currentAssignee = existingIssue.assignees?.[0]?.login;
  if (currentAssignee !== task.assignee) {
    changes.push({
      field: 'assignee',
      oldValue: currentAssignee,
      newValue: task.assignee
    });
  }
  
  // 检测标签变更
  const currentLabels = existingIssue.labels.map(l => l.name);
  const expectedLabels = this.buildLabels(task.labels, `specbridge:task-id:${task.id}`);
  if (JSON.stringify(currentLabels.sort()) !== JSON.stringify(expectedLabels.sort())) {
    changes.push({
      field: 'labels',
      oldValue: currentLabels,
      newValue: expectedLabels
    });
  }
  
  return changes;
}
```

**设计理由**：
- 全面的字段检测确保同步完整性
- 仅更新变更字段减少 API 调用
- 详细的变更记录便于调试

## 同步状态持久化 (需求 20)

**设计决策**：使用本地 JSON 文件存储同步状态映射。

### 状态持久化实现

```typescript
// src/core/sync-state.ts
import * as path from 'path';
import { readFile, writeFile, fileExists, ensureDir } from '../utils/file';

/**
 * 同步状态映射
 */
interface SyncStateMap {
  [taskId: string]: {
    issueNumber: number;
    platform: string;
    lastSync: string;
  };
}

/**
 * 同步状态管理器
 */
export class SyncStateManager {
  private stateFilePath: string;
  private state: SyncStateMap = {};
  
  constructor(projectRoot: string = process.cwd()) {
    this.stateFilePath = path.join(projectRoot, '.specbridge', 'sync-state.json');
  }
  
  /**
   * 加载同步状态
   */
  async load(): Promise<void> {
    if (await fileExists(this.stateFilePath)) {
      const content = await readFile(this.stateFilePath);
      this.state = JSON.parse(content);
    }
  }
  
  /**
   * 保存同步状态
   */
  async save(): Promise<void> {
    await ensureDir(path.dirname(this.stateFilePath));
    await writeFile(this.stateFilePath, JSON.stringify(this.state, null, 2));
  }
  
  /**
   * 获取任务的同步 ID
   */
  getSyncId(taskId: string, platform: string): number | undefined {
    const entry = this.state[taskId];
    return entry?.platform === platform ? entry.issueNumber : undefined;
  }
  
  /**
   * 设置任务的同步 ID
   */
  setSyncId(taskId: string, platform: string, issueNumber: number): void {
    this.state[taskId] = {
      issueNumber,
      platform,
      lastSync: new Date().toISOString()
    };
  }
  
  /**
   * 删除任务的同步状态
   */
  removeSyncId(taskId: string): void {
    delete this.state[taskId];
  }
}
```

### 集成到 GitHub 适配器

```typescript
// 在 GitHubAdapter 中使用 SyncStateManager
import { SyncStateManager } from '../../core/sync-state';

export class GitHubAdapter extends BaseTargetAdapter {
  private stateManager: SyncStateManager;
  
  async init(config: GitHubConfig): Promise<void> {
    // ... 现有初始化代码
    this.stateManager = new SyncStateManager();
    await this.stateManager.load();
  }
  
  async syncTasks(tasks: Task[]): Promise<SyncResult> {
    // ... 同步逻辑
    
    // 保存同步状态
    for (const task of tasks) {
      if (task.syncId) {
        const issueNumber = parseInt(task.syncId.replace('#', ''));
        this.stateManager.setSyncId(task.id, 'github', issueNumber);
      }
    }
    
    await this.stateManager.save();
    return result;
  }
}
```

### .gitignore 建议

在 init 命令中提示用户添加到 .gitignore：

```typescript
// src/cli/commands/init.ts
logger.info('Configuration created successfully!');
logger.info('');
logger.warn('Remember to add the following to your .gitignore:');
logger.info('  .specbridge/');
logger.info('  .specbridge.yaml  # if it contains sensitive tokens');
```

**设计理由**：
- JSON 格式易于读写和调试
- 本地存储避免依赖外部服务
- 包含 lastSync 时间戳便于追踪
- .gitignore 建议避免敏感信息泄露

## 项目结构

最终的项目文件结构：

```
specbridge/
├── src/
│   ├── index.ts                    # CLI 入口
│   ├── core/
│   │   ├── models.ts              # 统一数据模型
│   │   ├── sync-engine.ts         # 同步引擎
│   │   ├── config.ts              # 配置管理
│   │   └── sync-state.ts          # 同步状态管理
│   ├── adapters/
│   │   ├── source/
│   │   │   ├── base.ts           # 源适配器接口
│   │   │   └── kiro.ts           # Kiro 适配器实现
│   │   └── target/
│   │       ├── base.ts           # 目标适配器接口
│   │       └── github.ts         # GitHub 适配器实现
│   ├── cli/
│   │   └── commands/
│   │       ├── init.ts           # init 命令
│   │       ├── sync.ts           # sync 命令
│   │       └── status.ts         # status 命令
│   └── utils/
│       ├── logger.ts             # 日志工具
│       ├── file.ts               # 文件工具
│       └── errors.ts             # 错误类
├── dist/                          # 编译输出
├── docs/                          # 文档
├── examples/
│   └── .specbridge.yaml          # 示例配置
├── .eslintrc.json                # ESLint 配置
├── .prettierrc                   # Prettier 配置
├── tsconfig.json                 # TypeScript 配置
├── package.json
└── README.md
```

## 技术决策总结

### 1. 为什么选择 TypeScript？
- 强类型系统减少运行时错误
- 优秀的 IDE 支持提高开发效率
- 丰富的生态系统和类型定义

### 2. 为什么使用双适配器架构？
- 解耦源和目标，提高可扩展性
- 统一数据模型简化转换逻辑
- 支持多对多同步场景

### 3. 为什么支持两种 GitHub 认证方式？
- API token：适合 CI/CD 和自动化场景
- gh CLI：适合本地开发，无需管理 token

### 4. 为什么使用自定义标签追踪同步状态？
- 避免依赖外部数据库
- 利用平台原生功能
- 支持手动查询和管理

### 5. 为什么使用本地 JSON 文件存储状态？
- 简单可靠，无需额外依赖
- 易于调试和手动修改
- 支持版本控制（可选）

## 性能考虑

### API 调用优化
- 使用标签查询减少 API 调用次数
- 批量操作（如果平台支持）
- 变更检测避免不必要的更新

### 错误处理和重试
- 实现指数退避重试机制
- 速率限制检测和等待
- 单个失败不影响整体同步

### 并发控制
- 并行同步到多个目标平台
- 限制并发 API 请求数量
- 使用连接池管理 HTTP 连接

## 安全考虑

### 凭证管理
- 环境变量存储敏感信息
- 配置文件中使用 ${VAR} 语法
- 提示用户添加到 .gitignore

### API 权限
- 使用最小必需权限
- 验证仓库访问权限
- 错误消息不泄露敏感信息

### 输入验证
- 验证配置文件格式
- 验证用户输入参数
- 防止路径遍历攻击

## 测试策略

### 单元测试
- 测试数据模型转换
- 测试工具函数
- 测试错误处理逻辑

### 集成测试
- 测试适配器与 API 交互
- 使用 mock 服务器模拟响应
- 测试配置加载和验证

### 端到端测试
- 测试完整同步流程
- 使用测试仓库和账号
- 验证同步结果正确性

## 未来扩展

### 短期目标
- 实现 Jira 适配器
- 实现 CodeUp 适配器
- 添加 watch 模式支持实时同步

### 中期目标
- VSCode 扩展集成
- 双向同步（从平台拉取更新）
- Web 仪表板

### 长期目标
- AI 辅助任务描述生成
- 同步分析和报告
- 多团队协作支持

## 正确性属性

本设计确保以下正确性属性：

1. **数据一致性**：源规格和目标平台的数据保持一致
2. **幂等性**：多次同步产生相同结果
3. **原子性**：单个项目的同步操作是原子的
4. **可追溯性**：所有变更都有详细记录
5. **错误隔离**：单个失败不影响其他项目

