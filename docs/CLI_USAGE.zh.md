# CLI 使用指南

## 安装

```bash
npm install -g specbridge
```

## 命令

### init

在当前目录初始化 SpecBridge 配置。

```bash
specbridge init
```

创建默认配置的 `.specbridge.yaml` 文件。

### sync

执行一次性同步。

```bash
specbridge sync
```

选项：
- `--dry-run`：预览更改而不实际同步
- `--target <name>`：仅同步到指定目标

### watch

持续监视规格文件变化并自动同步。

```bash
specbridge watch
```

### status

检查同步状态。

```bash
specbridge status
```

显示：
- 上次同步时间
- 已同步项目数量
- 失败项目
- 目标平台状态

### validate

验证配置文件。

```bash
specbridge validate
```

## 示例

```bash
# 在项目中初始化
cd my-project
specbridge init

# 编辑 .specbridge.yaml 配置

# 测试同步（试运行）
specbridge sync --dry-run

# 执行实际同步
specbridge sync

# 监视变化
specbridge watch
```

## 详细选项

### sync 命令

```bash
specbridge sync [options]

选项：
  --dry-run              预览更改而不实际同步
  --target <name>        仅同步到指定目标
  --verbose              显示详细日志
  --config <path>        使用自定义配置文件路径
```

### watch 命令

```bash
specbridge watch [options]

选项：
  --interval <seconds>   检查间隔（默认：5秒）
  --target <name>        仅监视指定目标
  --verbose              显示详细日志
```

### status 命令

```bash
specbridge status [options]

选项：
  --target <name>        仅显示指定目标的状态
  --json                 以 JSON 格式输出
```

## 环境变量

SpecBridge 支持通过环境变量配置敏感信息：

```bash
# 设置 GitHub 令牌
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxx

# 设置 Jira 凭证
export JIRA_EMAIL=user@company.com
export JIRA_TOKEN=xxxxxxxxxxxxx

# 设置 Slack Webhook
export SLACK_WEBHOOK=https://hooks.slack.com/services/xxx
```

或使用 `.env` 文件：

```bash
# .env
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
JIRA_EMAIL=user@company.com
JIRA_TOKEN=xxxxxxxxxxxxx
SLACK_WEBHOOK=https://hooks.slack.com/services/xxx
```

## 配置文件

默认配置文件为 `.specbridge.yaml`，可以使用 `--config` 选项指定其他路径：

```bash
specbridge sync --config ./config/production.yaml
```

## 日志级别

使用 `--verbose` 标志查看详细日志：

```bash
specbridge sync --verbose
```

日志级别：
- **默认**：仅显示重要信息和错误
- **详细**：显示所有操作和 API 调用

## 退出代码

- `0`：成功
- `1`：一般错误
- `2`：配置错误
- `3`：认证错误
- `4`：网络错误

## 常见用法

### 首次设置

```bash
# 1. 安装
npm install -g specbridge

# 2. 初始化配置
cd your-project
specbridge init

# 3. 编辑配置文件
# 添加您的 API 令牌和平台配置

# 4. 验证配置
specbridge validate

# 5. 测试同步
specbridge sync --dry-run

# 6. 执行同步
specbridge sync
```

### 持续集成

```bash
# 在 CI/CD 管道中使用
specbridge sync --target github-issues
```

### 开发工作流

```bash
# 在后台运行监视模式
specbridge watch &

# 继续开发，更改会自动同步
```

## 故障排除

### 认证失败

```bash
# 检查令牌是否正确设置
echo $GITHUB_TOKEN

# 验证配置
specbridge validate
```

### 同步失败

```bash
# 使用详细模式查看错误详情
specbridge sync --verbose

# 检查状态
specbridge status
```

### 配置错误

```bash
# 验证配置文件
specbridge validate

# 查看示例配置
specbridge init --example
```

## 高级用法

### 多目标同步

```bash
# 同步到所有启用的目标
specbridge sync

# 仅同步到 GitHub
specbridge sync --target github-issues

# 仅同步到 Jira
specbridge sync --target jira-project
```

### 自定义适配器

```bash
# 使用自定义源适配器
specbridge sync --source-plugin ./plugins/my-adapter.js

# 使用自定义目标适配器
specbridge sync --target-plugin ./plugins/my-target.js
```

### 批量操作

```bash
# 同步多个项目
for dir in project1 project2 project3; do
  cd $dir
  specbridge sync
  cd ..
done
```

## 获取帮助

```bash
# 查看所有命令
specbridge --help

# 查看特定命令的帮助
specbridge sync --help
specbridge watch --help
specbridge status --help
```
