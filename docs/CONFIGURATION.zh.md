# SpecBridge 配置参考

## 配置文件

SpecBridge 使用 `.specbridge.yaml` 作为配置文件。

## 完整示例

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
    mapping:
      requirements: issue
      tasks: issue
    labels:
      prefix: "spec"
      requirement: "requirement"
      task: "task"
      
  - name: jira-project
    type: jira
    enabled: false
    config:
      url: https://company.atlassian.net
      project: PROJ
      email: ${JIRA_EMAIL}
      token: ${JIRA_TOKEN}
    mapping:
      requirements: epic
      tasks: story
      design: confluence

notifications:
  - type: slack
    webhook: ${SLACK_WEBHOOK}
    events:
      - task_completed
      - requirement_updated
    recipients:
      - "@product-manager"
      - "@project-manager"
```

## 配置章节

### version
- **类型**：string
- **必需**：是
- **描述**：配置架构版本

### source
- **type**：源适配器类型（kiro、openspec、custom）
- **path**：规格文件路径（可选，自动检测）

### targets
目标平台配置数组。

#### GitHub 目标
```yaml
- name: github-issues
  type: github
  enabled: true
  config:
    owner: organization-name
    repo: repository-name
    token: ${GITHUB_TOKEN}
  mapping:
    requirements: issue
    tasks: issue
```

#### Jira 目标
```yaml
- name: jira-project
  type: jira
  enabled: true
  config:
    url: https://company.atlassian.net
    project: PROJECT_KEY
    email: user@company.com
    token: ${JIRA_API_TOKEN}
  mapping:
    requirements: epic
    tasks: story
    design: confluence
```

### notifications
可选的通知配置。

## 环境变量

将敏感数据存储在环境变量中：

```bash
# .env
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
JIRA_EMAIL=user@company.com
JIRA_TOKEN=xxxxxxxxxxxxx
SLACK_WEBHOOK=https://hooks.slack.com/services/xxx
```
