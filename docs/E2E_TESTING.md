# 端到端测试指南

本文档提供了 SpecBridge 端到端测试的完整步骤。这些测试验证整个同步流程从规格文档到项目管理平台的工作情况。

## 前置条件

1. **Node.js 18+** 已安装
2. **GitHub 账户** 和个人访问令牌（PAT）
3. **测试仓库** 在 GitHub 上创建（用于测试，避免影响生产数据）
4. **SpecBridge 已构建**：运行 `npm run build`

## 环境设置

### 1. 创建 GitHub 个人访问令牌

1. 访问 https://github.com/settings/tokens
2. 点击 "Generate new token" → "Generate new token (classic)"
3. 选择以下权限：
   - `repo` - 完整的仓库访问
   - `workflow` - 工作流程访问
4. 复制生成的令牌

### 2. 创建测试仓库

1. 在 GitHub 上创建一个新的公开仓库（例如 `specbridge-test`）
2. 记下仓库的 owner 和 name

### 3. 设置环境变量

```bash
# Windows (PowerShell)
$env:GITHUB_TOKEN = "your-token-here"

# Windows (CMD)
set GITHUB_TOKEN=your-token-here

# Linux/macOS
export GITHUB_TOKEN="your-token-here"
```

## 测试步骤

### 步骤 1：初始化配置

```bash
# 进入项目目录
cd /path/to/specbridge

# 运行 init 命令
npm run dev -- init

# 或者直接运行编译后的版本
node dist/index.js init
```

**预期结果：**
- 创建 `.specbridge.yaml` 配置文件
- 显示配置示例
- 提示添加 `.specbridge/` 到 `.gitignore`

### 步骤 2：编辑配置文件

编辑 `.specbridge.yaml`，配置 GitHub 目标：

```yaml
version: "1.0"

source:
  type: kiro
  path: .kiro/specs

targets:
  - name: github-test
    type: github
    enabled: true
    config:
      owner: your-github-username
      repo: specbridge-test
      token: ${GITHUB_TOKEN}
      authMethod: token
      addComments: true
    mapping:
      requirements: issue
      tasks: issue
```

### 步骤 3：创建测试规格文档

使用现有的测试规格文档（位于 `.test-specs/test-feature/`）或创建新的：

```bash
# 使用现有的测试规格
# .test-specs/test-feature/ 已包含：
# - requirements.md
# - design.md
# - tasks.md
```

### 步骤 4：执行首次同步

```bash
# 运行同步命令
npm run dev -- sync

# 或者使用编译后的版本
node dist/index.js sync

# 使用详细模式查看更多信息
npm run dev -- sync --verbose
```

**预期结果：**
- 显示同步进度
- 创建新的 GitHub Issues
- 显示创建的 Issue 数量
- 生成 `.specbridge/sync-state.json` 文件

### 步骤 5：验证 GitHub Issues

1. 访问你的测试仓库：`https://github.com/your-username/specbridge-test/issues`
2. 验证以下内容：
   - ✅ 创建了对应的 Issues
   - ✅ Issue 标题正确
   - ✅ Issue 描述包含任务详情
   - ✅ Issue 标签包含 `specbridge:task-id:*`
   - ✅ Issue 状态正确（打开/关闭）

### 步骤 6：修改规格文档

编辑 `.test-specs/test-feature/tasks.md`，进行以下修改：

```markdown
# 修改前
- [ ] 1.1 创建用户模型

# 修改后
- [x] 1.1 创建用户模型  # 标记为完成

# 修改任务标题
- [ ] 2.1 创建注册表单 → - [ ] 2.1 创建高级注册表单
```

### 步骤 7：执行第二次同步

```bash
npm run dev -- sync --verbose
```

**预期结果：**
- 显示更新的 Issues
- 显示更新数量
- 不创建新的 Issues（因为已存在）

### 步骤 8：验证 GitHub Issues 更新

1. 刷新 GitHub Issues 页面
2. 验证以下内容：
   - ✅ Issue 标题已更新
   - ✅ Issue 状态已更新（完成的任务应该关闭）
   - ✅ Issue 评论中显示了同步时间戳
   - ✅ 评论中列出了变更内容

### 步骤 9：测试同步粒度

```bash
# 仅同步任务
npm run dev -- sync --scope tasks

# 仅同步需求
npm run dev -- sync --scope requirements

# 同步单个项目
npm run dev -- sync --scope single --id task-1

# 模拟同步（不实际修改）
npm run dev -- sync --dry-run
```

### 步骤 10：验证同步状态持久化

```bash
# 查看同步状态文件
cat .specbridge/sync-state.json

# 预期内容：
# {
#   "task-1": 123,
#   "task-2": 124,
#   ...
# }
```

## 测试检查清单

- [ ] 初始化配置成功
- [ ] 首次同步创建了所有 Issues
- [ ] GitHub Issues 显示正确的标题和描述
- [ ] Issues 包含正确的标签
- [ ] Issues 状态正确（打开/关闭）
- [ ] 修改规格后，Issues 正确更新
- [ ] 更新时添加了同步评论
- [ ] 同步评论包含变更详情
- [ ] 同步状态文件正确生成
- [ ] 同步粒度选项正常工作
- [ ] 干运行模式不修改任何内容
- [ ] 详细模式显示详细日志

## 故障排除

### 问题：认证失败

**症状：** `Authentication failed for GitHub`

**解决方案：**
1. 检查 `GITHUB_TOKEN` 环境变量是否设置
2. 验证令牌是否有效（未过期）
3. 验证令牌有 `repo` 权限

### 问题：仓库访问失败

**症状：** `Failed to access repository`

**解决方案：**
1. 检查 `.specbridge.yaml` 中的 `owner` 和 `repo` 是否正确
2. 验证仓库是否存在
3. 验证令牌对该仓库有访问权限

### 问题：规格文件未找到

**症状：** `Failed to parse Kiro spec`

**解决方案：**
1. 检查 `.specbridge.yaml` 中的 `source.path` 是否正确
2. 验证规格文件是否存在（requirements.md、design.md、tasks.md）
3. 检查文件格式是否正确

### 问题：Issues 未创建

**症状：** 同步成功但 GitHub 上没有新 Issues

**解决方案：**
1. 检查 GitHub 仓库的 Issues 选项是否启用
2. 验证令牌权限
3. 查看详细日志：`npm run dev -- sync --verbose`

## 清理测试数据

完成测试后，清理测试数据：

```bash
# 删除本地同步状态
rm -r .specbridge/

# 删除配置文件（可选）
rm .specbridge.yaml

# 在 GitHub 上删除测试 Issues（手动操作）
# 访问仓库 → Issues → 选择所有 → Delete
```

## 自动化测试

对于持续集成，可以使用以下脚本：

```bash
#!/bin/bash

# 设置环境
export GITHUB_TOKEN="your-token"

# 构建
npm run build

# 初始化
node dist/index.js init

# 同步
node dist/index.js sync --verbose

# 验证
if [ $? -eq 0 ]; then
  echo "✅ E2E 测试通过"
else
  echo "❌ E2E 测试失败"
  exit 1
fi
```

## 注意事项

1. **测试仓库**：始终使用专门的测试仓库，避免影响生产数据
2. **令牌安全**：不要在代码中硬编码令牌，使用环境变量
3. **清理**：测试完成后清理测试数据
4. **频率**：避免频繁同步到同一仓库，以免触发 GitHub API 速率限制
5. **权限**：确保令牌有必要的权限，但不要授予过多权限

## 相关文档

- [配置参考](./CONFIGURATION.md)
- [CLI 使用指南](./CLI_USAGE.md)
- [架构设计](./ARCHITECTURE.md)
