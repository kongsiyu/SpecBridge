# SpecBridge

[English](#english) | [中文](#中文)

---

## 中文

AI 驱动的规格文档到项目管理平台同步工具

### 快速开始

```bash
npm install -g specbridge
specbridge init
specbridge sync
```

### 功能特性

- 🚀 轻量级 CLI 工具，无需服务器
- 🔄 支持多平台同步（GitHub、Jira、CodeUp 等）
- 🎯 双适配器架构：源适配器 + 目标适配器
- ⚙️ 配置驱动，简单易用
- 🔌 插件化设计，支持自定义适配器
- 🤖 专为 AI 编码工具（如 Kiro）优化
- 📊 完整的同步历史和状态追踪
- 🔐 安全的凭证管理（环境变量）

### 核心概念

**SpecBridge** 使用双适配器架构：

1. **源适配器**：从各种来源读取规格文档
   - Kiro 适配器：读取 `.kiro/specs` 目录
   - 支持自定义适配器

2. **目标适配器**：将数据同步到项目管理平台
   - GitHub 适配器：同步到 GitHub Issues
   - 支持 Jira、CodeUp 等（可扩展）

3. **统一数据模型**：所有适配器使用一致的数据结构
   - 需求（Requirements）
   - 任务（Tasks）
   - 设计文档（Design）

### 工作流程

```
规格文件 → 源适配器 → 统一数据模型 → 目标适配器 → 项目管理平台
```

### 文档

- [架构设计](./docs/ARCHITECTURE.md)
- [CLI 使用指南](./docs/CLI_USAGE.md)
- [配置参考](./docs/CONFIGURATION.md)
- [适配器开发指南](./docs/ADAPTER_GUIDE.md)
- [端到端测试指南](./docs/E2E_TESTING.md)

### 使用示例

#### 1. 初始化配置

```bash
specbridge init
```

这会创建 `.specbridge.yaml` 配置文件。

#### 2. 编辑配置

```yaml
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
```

#### 3. 执行同步

```bash
# 一次性同步
specbridge sync

# 模拟同步（不实际修改）
specbridge sync --dry-run

# 仅同步任务
specbridge sync --scope tasks

# 查看详细日志
specbridge sync --verbose
```

#### 4. 查看状态

```bash
specbridge status
```

### 环境变量

敏感信息应存储在环境变量中：

```bash
export GITHUB_TOKEN="your-token-here"
export JIRA_TOKEN="your-token-here"
```

### 支持的平台

- ✅ **GitHub** - 同步到 GitHub Issues
- 🔄 **Jira** - 计划中
- 🔄 **CodeUp** - 计划中
- 🔌 **自定义** - 支持插件开发

### 项目结构

```
.
├── .specbridge.yaml          # 配置文件
├── .specbridge/              # 同步状态（自动生成）
│   └── sync-state.json
├── .kiro/
│   └── specs/
│       └── feature-name/
│           ├── requirements.md
│           ├── design.md
│           └── tasks.md
└── plugins/                  # 自定义适配器（可选）
```

### 常见问题

**Q: 如何创建自定义适配器？**

A: 参考 [适配器开发指南](./docs/ADAPTER_GUIDE.md)

**Q: 如何安全地存储 API 令牌？**

A: 使用环境变量，不要在配置文件中硬编码

**Q: 支持双向同步吗？**

A: 目前仅支持单向同步（规格 → 平台），双向同步计划中

**Q: 如何测试同步？**

A: 使用 `--dry-run` 选项进行模拟同步

---

## English

AI-driven spec to project management platform sync tool

### Quick Start

```bash
npm install -g specbridge
specbridge init
specbridge sync
```

### Features

- 🚀 Lightweight CLI tool, no server required
- 🔄 Multi-platform sync support (GitHub, Jira, CodeUp, etc.)
- 🎯 Dual adapter architecture: Source + Target adapters
- ⚙️ Configuration-driven, simple to use
- 🔌 Plugin-based design, custom adapters supported
- 🤖 Optimized for AI coding tools (like Kiro)
- 📊 Complete sync history and status tracking
- 🔐 Secure credential management (environment variables)

### Core Concepts

**SpecBridge** uses a dual adapter architecture:

1. **Source Adapters**: Read specifications from various sources
   - Kiro Adapter: Reads from `.kiro/specs` directory
   - Custom adapters supported

2. **Target Adapters**: Sync data to project management platforms
   - GitHub Adapter: Syncs to GitHub Issues
   - Jira, CodeUp, etc. (extensible)

3. **Unified Data Model**: Consistent data structure across all adapters
   - Requirements
   - Tasks
   - Design Documents

### Workflow

```
Spec Files → Source Adapter → Unified Model → Target Adapter → Platform
```

### Documentation

- [Architecture Design](./docs/ARCHITECTURE.md)
- [CLI Usage Guide](./docs/CLI_USAGE.md)
- [Configuration Reference](./docs/CONFIGURATION.md)
- [Adapter Development Guide](./docs/ADAPTER_GUIDE.md)
- [End-to-End Testing Guide](./docs/E2E_TESTING.md)

### Usage Examples

#### 1. Initialize Configuration

```bash
specbridge init
```

Creates `.specbridge.yaml` configuration file.

#### 2. Edit Configuration

```yaml
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
```

#### 3. Perform Sync

```bash
# One-time sync
specbridge sync

# Dry run (preview changes)
specbridge sync --dry-run

# Sync only tasks
specbridge sync --scope tasks

# Verbose logging
specbridge sync --verbose
```

#### 4. Check Status

```bash
specbridge status
```

### Environment Variables

Store sensitive information in environment variables:

```bash
export GITHUB_TOKEN="your-token-here"
export JIRA_TOKEN="your-token-here"
```

### Supported Platforms

- ✅ **GitHub** - Sync to GitHub Issues
- 🔄 **Jira** - Planned
- 🔄 **CodeUp** - Planned
- 🔌 **Custom** - Plugin development supported

### Project Structure

```
.
├── .specbridge.yaml          # Configuration file
├── .specbridge/              # Sync state (auto-generated)
│   └── sync-state.json
├── .kiro/
│   └── specs/
│       └── feature-name/
│           ├── requirements.md
│           ├── design.md
│           └── tasks.md
└── plugins/                  # Custom adapters (optional)
```

### FAQ

**Q: How do I create a custom adapter?**

A: See [Adapter Development Guide](./docs/ADAPTER_GUIDE.md)

**Q: How do I securely store API tokens?**

A: Use environment variables, never hardcode in config files

**Q: Does it support bidirectional sync?**

A: Currently one-way only (spec → platform), bidirectional planned

**Q: How do I test sync?**

A: Use `--dry-run` option for preview mode

### License

MIT

### Contributing

Contributions welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md)

### Support

- 📖 [Documentation](./docs)
- 🐛 [Issue Tracker](https://github.com/your-org/specbridge/issues)
- 💬 [Discussions](https://github.com/your-org/specbridge/discussions)
