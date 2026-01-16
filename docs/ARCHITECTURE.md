# SpecBridge Architecture Design

## Overview

SpecBridge is a lightweight, client-side CLI tool that synchronizes AI-generated specifications (from tools like Kiro) to project management platforms (GitHub, Jira, CodeUp, etc.).

## Core Principles

1. **Lightweight**: No server required, runs entirely on client
2. **Dual Adapter Pattern**: Source adapters (read specs) + Target adapters (sync to platforms)
3. **Configuration-Driven**: Simple YAML configuration
4. **Extensible**: Plugin-based architecture for custom adapters

## Architecture Diagram

```

                      SpecBridge CLI                          

                                                               
                             
     Source                 Target                       
    Adapters      Adapters                      
                             
                                                            
                                                            
                                     
    Kiro                    GitHub                       
  OpenSpec                   Jira                        
   Custom                   CodeUp                       
                                     
                                                               
                                          
                Sync Engine                                 
                (Core Logic)                                
                                          
                                                               
                                          
                Config Manager                              
                                          

```

## Data Flow

```
1. Read Spec Files (Source Adapter)
    Parse to Unified Data Model
        Transform per Target Config
            Sync to Platform (Target Adapter)
                Update Status & Notify
```

## Core Components

### 1. Unified Data Model

Central data structure that all adapters convert to/from:

```typescript
interface SpecData {
  meta: SpecMeta;
  requirements: Requirement[];
  design?: Design;
  tasks: Task[];
}
```

### 2. Source Adapter Interface

Reads and parses spec files from various sources:

```typescript
interface SourceAdapter {
  name: string;
  detect(path: string): boolean;
  parse(path: string): Promise<SpecData>;
  watch?(path: string, callback: (data: SpecData) => void): void;
}
```

**Implementations:**
- `KiroAdapter`: Reads from `.kiro/specs/*.md`
- `OpenSpecAdapter`: (Planned) Reads OpenSpec format
- `CustomAdapter`: User-defined adapters

### 3. Target Adapter Interface

Syncs data to project management platforms:

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

**Implementations:**
- `GitHubAdapter`: Syncs to GitHub Issues
- `JiraAdapter`: (Planned) Syncs to Jira Stories/Epics
- `CodeUpAdapter`: (Planned) Syncs to CodeUp

### 4. Sync Engine

Core synchronization logic:

```typescript
class SyncEngine {
  async sync(source: SourceAdapter, targets: TargetAdapter[]): Promise<void>
  async watch(source: SourceAdapter, targets: TargetAdapter[]): Promise<void>
  async getStatus(): Promise<SyncStatus>
}
```

### 5. Config Manager

Handles configuration loading and validation:

```typescript
interface Config {
  version: string;
  source: SourceConfig;
  targets: TargetConfig[];
  notifications?: NotificationConfig[];
}
```

## File Structure

```
specbridge/
 src/
    index.ts                    # CLI entry point
    core/
       models.ts               # Unified data models
       sync-engine.ts          # Core sync logic
       config.ts               # Configuration management
    adapters/
       source/
          base.ts            # Source adapter interface
          kiro.ts            # Kiro implementation
          openspec.ts        # OpenSpec implementation
       target/
           base.ts            # Target adapter interface
           github.ts          # GitHub implementation
           jira.ts            # Jira implementation
           codeup.ts          # CodeUp implementation
    cli/
       commands/
          init.ts            # Initialize config
          sync.ts            # One-time sync
          watch.ts           # Continuous sync
          status.ts          # Check sync status
       utils.ts
    utils/
        logger.ts
        file.ts
 docs/
    ARCHITECTURE.md             # This file
    ADAPTER_GUIDE.md            # How to create adapters
    CONFIGURATION.md            # Config reference
    CLI_USAGE.md                # CLI commands
 examples/
    .specbridge.yaml            # Example config
 plugins/                        # User custom adapters
```

## Configuration Format

```yaml
version: "1.0"

# Source configuration
source:
  type: kiro  # kiro | openspec | custom
  path: .kiro/specs  # Optional, auto-detected

# Target platforms (multiple supported)
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
      
  - name: jira-project
    type: jira
    enabled: false
    config:
      url: https://company.atlassian.net
      project: PROJ
      token: ${JIRA_TOKEN}
    mapping:
      requirements: epic
      tasks: story

# Notifications (optional)
notifications:
  - type: slack
    webhook: ${SLACK_WEBHOOK}
    events: [task_completed, requirement_updated]
```

## Kiro Adapter Implementation

### Spec File Structure

Kiro stores specs in `.kiro/specs/[feature-name]/`:
- `requirements.md` - Feature requirements
- `design.md` - Design documentation
- `tasks.md` - Task breakdown

### Parsing Strategy

1. **requirements.md**:
   ```markdown
   ## Requirement 1: User Authentication
   Users should be able to log in with email/password
   
   Priority: high
   Labels: auth, security
   ```

2. **tasks.md**:
   ```markdown
   - [ ] Task 1: Create login API (@john)
   - [x] Task 2: Add JWT validation
   - [ ] Task 3: Implement password reset
   ```

3. **design.md**:
   ```markdown
   ## Architecture
   REST API with JWT authentication
   
   ## Components
   - AuthController
   - UserService
   - TokenManager
   ```

### Mapping to Unified Model

```typescript
{
  meta: {
    name: "user-authentication",
    version: "1.0.0",
    createdAt: "2026-01-16T00:00:00Z",
    updatedAt: "2026-01-16T12:00:00Z"
  },
  requirements: [
    {
      id: "user-authentication",
      title: "User Authentication",
      description: "Users should be able to log in...",
      priority: "high",
      labels: ["auth", "security"]
    }
  ],
  tasks: [
    {
      id: "create-login-api",
      title: "Create login API",
      description: "",
      status: "todo",
      assignee: "john"
    },
    {
      id: "add-jwt-validation",
      title: "Add JWT validation",
      description: "",
      status: "done"
    }
  ]
}
```

## GitHub Adapter Implementation

### Sync Strategy

1. **Issue Creation**:
   - Create GitHub Issue for each task
   - Add custom label: `specbridge:task-id:{id}`
   - Set assignee if specified

2. **Issue Update**:
   - Find existing issue by custom label
   - Update title, body, status
   - Close issue if task status is "done"

3. **Status Tracking**:
   - Query issues by label
   - Map GitHub state to unified status
   - Return status map

### Example Issue Body

```markdown
Create login API endpoint

---
**Status**: todo
**Estimate**: 4h
**Dependencies**: database-setup

_Synced by SpecBridge_
```

## Extension Points

### 1. Custom Source Adapter

Users can create custom adapters:

```typescript
// plugins/my-source-adapter.ts
import { SourceAdapter, SpecData } from 'specbridge';

export class MySourceAdapter implements SourceAdapter {
  name = 'my-source';
  
  detect(path: string): boolean {
    // Detection logic
  }
  
  async parse(path: string): Promise<SpecData> {
    // Parsing logic
  }
}
```

### 2. Custom Target Adapter

```typescript
// plugins/my-target-adapter.ts
import { TargetAdapter, Task, SyncResult } from 'specbridge';

export class MyTargetAdapter implements TargetAdapter {
  name = 'my-target';
  
  async init(config: any): Promise<void> {
    // Initialize API client
  }
  
  async syncTasks(tasks: Task[]): Promise<SyncResult> {
    // Sync logic
  }
}
```

### 3. Plugin Loading

```yaml
# .specbridge.yaml
source:
  type: custom
  plugin: ./plugins/my-source-adapter.js

targets:
  - name: custom-platform
    type: custom
    plugin: ./plugins/my-target-adapter.js
```

## Technology Stack

- **Language**: TypeScript
- **Runtime**: Node.js 18+
- **CLI Framework**: Commander.js
- **GitHub API**: @octokit/rest
- **Jira API**: jira-client
- **Config**: YAML parser
- **Logging**: chalk + ora
- **Build**: TypeScript Compiler
- **Package**: pkg (single binary)

## Development Workflow

```bash
# 1. Install dependencies
npm install

# 2. Run in dev mode
npm run dev -- sync

# 3. Build
npm run build

# 4. Package as executable
npm run package

# 5. Test
./dist/bin/specbridge-win.exe sync
```

## Deployment

### NPM Package

```bash
npm publish
npm install -g specbridge
```

### Binary Distribution

```bash
# Build for all platforms
npm run package

# Distribute binaries
dist/bin/specbridge-win.exe
dist/bin/specbridge-linux
dist/bin/specbridge-macos
```

## Security Considerations

1. **Credentials**: Store in environment variables, never in config files
2. **Token Permissions**: Use minimal required scopes
3. **Local Storage**: Config stored in `.specbridge.yaml` (add to .gitignore)
4. **API Rate Limits**: Implement exponential backoff

## Performance

- **Parsing**: Async file reading with streaming for large specs
- **Syncing**: Batch API calls where possible
- **Caching**: Cache parsed specs to avoid re-parsing
- **Concurrency**: Parallel sync to multiple targets

## Error Handling

```typescript
try {
  await syncEngine.sync(source, targets);
} catch (error) {
  if (error instanceof AuthenticationError) {
    logger.error('Authentication failed. Check your tokens.');
  } else if (error instanceof RateLimitError) {
    logger.warn('Rate limit exceeded. Retrying in 60s...');
  } else {
    logger.error('Sync failed:', error.message);
  }
}
```

## Future Enhancements

1. **VSCode Extension**: Integrate directly into IDE
2. **Web Dashboard**: Optional web UI for status monitoring
3. **Bidirectional Sync**: Pull updates from platforms back to specs
4. **AI Integration**: Auto-generate task descriptions
5. **Analytics**: Track sync history and metrics
