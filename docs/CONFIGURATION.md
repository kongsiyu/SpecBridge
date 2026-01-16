# SpecBridge Configuration Reference

## Configuration File

SpecBridge uses `.specbridge.yaml` for configuration.

## Full Example

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

## Configuration Sections

### version
- **Type**: string
- **Required**: Yes
- **Description**: Configuration schema version

### source
- **type**: Source adapter type (kiro, openspec, custom)
- **path**: Path to spec files (optional, auto-detected)

### targets
Array of target platform configurations.

#### GitHub Target
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

#### Jira Target
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
Optional notification configurations.

## Environment Variables

Store sensitive data in environment variables:

```bash
# .env
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
JIRA_EMAIL=user@company.com
JIRA_TOKEN=xxxxxxxxxxxxx
SLACK_WEBHOOK=https://hooks.slack.com/services/xxx
```
