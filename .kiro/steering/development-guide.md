---
inclusion: always
---

# SpecBridge 开发指南

## 项目概述

SpecBridge 是一个轻量级的 CLI 工具，用于将 AI 生成的规格文档（如 Kiro）同步到项目管理平台（GitHub、Jira、CodeUp 等）。

## 核心原则

1. **轻量化**：无需服务器，完全在客户端运行
2. **双适配器模式**：源适配器（读取规格）+ 目标适配器（同步到平台）
3. **配置驱动**：简单的 YAML 配置
4. **可扩展**：基于插件的架构，支持自定义适配器

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

## 代码规范

### 文件组织

```
src/
  ├── index.ts                 # CLI 入口
  ├── core/                    # 核心逻辑
  │   ├── models.ts           # 统一数据模型
  │   ├── sync-engine.ts      # 同步引擎
  │   └── config.ts           # 配置管理
  ├── adapters/               # 适配器
  │   ├── source/             # 源适配器
  │   └── target/             # 目标适配器
  ├── cli/                    # CLI 命令
  │   └── commands/
  └── utils/                  # 工具函数
```

### TypeScript 规范

- 使用严格模式（strict: true）
- 所有函数必须有明确的返回类型
- 使用 interface 定义数据结构
- 优先使用 async/await 而非 Promise.then()
- 使用 ESLint 和 Prettier 保持代码风格一致

### 命名规范

- **文件名**：kebab-case（如 `sync-engine.ts`）
- **类名**：PascalCase（如 `SyncEngine`）
- **函数/变量**：camelCase（如 `syncTasks`）
- **常量**：UPPER_SNAKE_CASE（如 `MAX_RETRY_COUNT`）
- **接口**：PascalCase，不使用 I 前缀（如 `SourceAdapter`）

### 错误处理

- 使用自定义错误类
- 提供清晰的错误消息
- 实现重试机制（API 调用）
- 记录详细的错误日志

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

## 开发工作流

### 1. 环境设置

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，添加必要的 API 令牌
```

### 2. 开发模式

```bash
# 运行开发模式
npm run dev -- sync

# 监听文件变化
npm run dev -- watch
```

### 3. 代码检查

```bash
# 运行 ESLint
npm run lint

# 格式化代码
npm run format
```

### 4. 构建和打包

```bash
# 编译 TypeScript
npm run build

# 打包为可执行文件
npm run package
```

## 适配器开发

### 源适配器接口

```typescript
interface SourceAdapter {
  name: string;
  detect(path: string): boolean;
  parse(path: string): Promise<SpecData>;
  watch?(path: string, callback: (data: SpecData) => void): void;
}
```

### 目标适配器接口

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

### 创建自定义适配器

1. 在 `plugins/` 目录创建适配器文件
2. 实现相应的接口
3. 在配置文件中引用

```yaml
source:
  type: custom
  plugin: ./plugins/my-source-adapter.js
```

## 测试策略

- 单元测试：测试核心逻辑和工具函数
- 集成测试：测试适配器与外部 API 的交互
- 端到端测试：测试完整的同步流程

## 安全考虑

1. **凭证管理**：使用环境变量，永远不要在配置文件中硬编码
2. **令牌权限**：使用最小必需的权限范围
3. **本地存储**：配置存储在 `.specbridge.yaml`（添加到 .gitignore）
4. **API 速率限制**：实现指数退避策略

## 性能优化

- **解析**：使用流式读取处理大型规格文件
- **同步**：尽可能批量调用 API
- **缓存**：缓存已解析的规格以避免重复解析
- **并发**：并行同步到多个目标平台

## 文档要求

- 所有公共 API 必须有 JSDoc 注释
- 复杂逻辑需要添加行内注释
- 更新相关的 Markdown 文档
- 在 CHANGELOG.md 中记录重要变更

## Git 工作流

- 使用语义化提交消息（Conventional Commits）
- 功能开发在独立分支进行
- 提交前运行 lint 和 format
- PR 需要通过代码审查

## 发布流程

1. 更新版本号（package.json）
2. 更新 CHANGELOG.md
3. 运行完整测试套件
4. 构建和打包
5. 发布到 NPM
6. 创建 GitHub Release

## 常见问题

### 如何调试适配器？

使用 `--verbose` 标志查看详细日志：
```bash
specbridge sync --verbose
```

### 如何测试 API 集成？

使用测试账号和沙箱环境，避免影响生产数据。

### 如何处理大型规格文件？

实现流式解析和分批同步，避免内存溢出。

## 资源链接

- [架构设计文档](./ARCHITECTURE.md)
- [CLI 使用指南](./CLI_USAGE.md)
- [配置参考](./CONFIGURATION.md)
- [GitHub API 文档](https://docs.github.com/rest)
- [Jira API 文档](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
