# Adapter Development Guide

## Overview

SpecBridge uses a dual adapter pattern:
- **Source Adapters**: Read and parse spec files
- **Target Adapters**: Sync data to project management platforms

## Creating a Source Adapter

### 1. Implement the Interface

```typescript
import { SourceAdapter, SpecData } from '../core/models';

export class MySourceAdapter implements SourceAdapter {
  name = 'my-source';
  
  detect(path: string): boolean {
    // Return true if this adapter can handle the path
    return fs.existsSync(path + '/my-specs');
  }
  
  async parse(path: string): Promise<SpecData> {
    // Parse spec files and return unified data model
    const requirements = await this.parseRequirements(path);
    const tasks = await this.parseTasks(path);
    
    return {
      meta: {
        name: 'my-spec',
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      requirements,
      tasks,
    };
  }
  
  watch(path: string, callback: (data: SpecData) => void): void {
    // Optional: Watch for file changes
    fs.watch(path, async () => {
      const data = await this.parse(path);
      callback(data);
    });
  }
}
```

### 2. Register the Adapter

```typescript
// src/adapters/source/index.ts
import { MySourceAdapter } from './my-source';

export const sourceAdapters = {
  'my-source': MySourceAdapter,
  // ... other adapters
};
```

## Creating a Target Adapter

### 1. Implement the Interface

```typescript
import { TargetAdapter, Task, Requirement, SyncResult } from '../core/models';

export class MyTargetAdapter implements TargetAdapter {
  name = 'my-target';
  private client: any;
  
  async init(config: any): Promise<void> {
    // Initialize API client
    this.client = new MyPlatformClient(config);
  }
  
  async syncRequirements(requirements: Requirement[]): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      created: 0,
      updated: 0,
      failed: 0,
    };
    
    for (const req of requirements) {
      try {
        const existing = await this.findExisting(req.id);
        if (existing) {
          await this.client.update(existing.id, req);
          result.updated++;
        } else {
          await this.client.create(req);
          result.created++;
        }
      } catch (error) {
        result.failed++;
        result.errors = result.errors || [];
        result.errors.push(error.message);
      }
    }
    
    return result;
  }
  
  async syncTasks(tasks: Task[]): Promise<SyncResult> {
    // Similar to syncRequirements
  }
  
  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    const item = await this.client.get(taskId);
    return {
      id: taskId,
      status: this.mapStatus(item.status),
      updatedAt: item.updatedAt,
    };
  }
  
  async getAllTasksStatus(): Promise<Map<string, TaskStatus>> {
    // Batch query all tasks
  }
}
```

### 2. Register the Adapter

```typescript
// src/adapters/target/index.ts
import { MyTargetAdapter } from './my-target';

export const targetAdapters = {
  'my-target': MyTargetAdapter,
  // ... other adapters
};
```

## Plugin System

Users can create custom adapters as plugins:

### 1. Create Plugin File

```typescript
// plugins/my-adapter.ts
import { TargetAdapter } from 'specbridge';

export class MyAdapter implements TargetAdapter {
  // Implementation
}

export default MyAdapter;
```

### 2. Configure Plugin

```yaml
# .specbridge.yaml
targets:
  - name: custom
    type: custom
    plugin: ./plugins/my-adapter.js
    config:
      # Your config
```

## Best Practices

1. **Error Handling**: Always wrap API calls in try-catch
2. **Rate Limiting**: Implement exponential backoff
3. **Idempotency**: Support re-running sync without duplicates
4. **Logging**: Use provided logger for consistent output
5. **Testing**: Write unit tests for your adapter

## Testing

```typescript
import { MyAdapter } from './my-adapter';

describe('MyAdapter', () => {
  it('should sync tasks', async () => {
    const adapter = new MyAdapter();
    await adapter.init({ token: 'test' });
    
    const result = await adapter.syncTasks([
      { id: 'task-1', title: 'Test', status: 'todo' }
    ]);
    
    expect(result.created).toBe(1);
  });
});
```
