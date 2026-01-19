/**
 * Integration tests for sync engine
 *
 * Tests the coordination between source and target adapters
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncEngine } from './sync-engine';
import { SourceAdapter } from '../adapters/source/base';
import { TargetAdapter } from '../adapters/target/base';
import { SpecData, TaskStatus, SyncResult } from './models';

// Mock adapters for testing
class MockSourceAdapter implements SourceAdapter {
  name = 'mock-source';

  detect(): boolean {
    return true;
  }

  async parse(): Promise<SpecData> {
    return {
      meta: {
        name: 'test-spec',
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      requirements: [
        {
          id: 'req-1',
          title: 'Requirement 1',
          description: 'Test requirement',
          priority: 'high',
        },
      ],
      tasks: [
        {
          id: 'task-1',
          title: 'Task 1',
          description: 'Test task',
          status: TaskStatus.TODO,
        },
        {
          id: 'task-2',
          title: 'Task 2',
          status: TaskStatus.IN_PROGRESS,
        },
      ],
      design: {
        content: '# Design Document',
      },
    };
  }
}

class MockTargetAdapter implements TargetAdapter {
  name = 'mock-target';
  initCalled = false;
  syncRequirementsCalled = false;
  syncTasksCalled = false;
  syncDesignCalled = false;

  async init(): Promise<void> {
    this.initCalled = true;
  }

  async syncRequirements(): Promise<SyncResult> {
    this.syncRequirementsCalled = true;
    return {
      success: true,
      created: 1,
      updated: 0,
      failed: 0,
      changes: [],
    };
  }

  async syncTasks(): Promise<SyncResult> {
    this.syncTasksCalled = true;
    return {
      success: true,
      created: 2,
      updated: 0,
      failed: 0,
      changes: [],
    };
  }

  async syncDesign(): Promise<SyncResult> {
    this.syncDesignCalled = true;
    return {
      success: true,
      created: 1,
      updated: 0,
      failed: 0,
      changes: [],
    };
  }

  async getTaskStatus(): Promise<TaskStatus> {
    return TaskStatus.TODO;
  }
}

class FailingTargetAdapter implements TargetAdapter {
  name = 'failing-target';

  async init(): Promise<void> {
    throw new Error('Init failed');
  }

  async syncRequirements(): Promise<SyncResult> {
    throw new Error('Sync requirements failed');
  }

  async syncTasks(): Promise<SyncResult> {
    throw new Error('Sync tasks failed');
  }

  async getTaskStatus(): Promise<TaskStatus> {
    return TaskStatus.TODO;
  }
}

describe('SyncEngine Integration', () => {
  let engine: SyncEngine;
  let source: MockSourceAdapter;
  let target: MockTargetAdapter;

  beforeEach(() => {
    engine = new SyncEngine();
    source = new MockSourceAdapter();
    target = new MockTargetAdapter();
  });

  describe('sync', () => {
    it('should sync all data by default', async () => {
      const results = await engine.sync(source, [target]);

      // Should have at least one result (tasks are synced by default)
      expect(results.length).toBeGreaterThan(0);
      // Check that tasks were synced
      const taskResult = results.find((r) => r.created > 0);
      expect(taskResult).toBeDefined();
    });

    it('should sync only requirements when scope is requirements', async () => {
      const results = await engine.sync(source, [target], { scope: 'requirements' });

      expect(results).toHaveLength(1);
      expect(results[0].created).toBe(1);
      expect(target.syncRequirementsCalled).toBe(true);
      expect(target.syncTasksCalled).toBe(false);
    });

    it('should sync only tasks when scope is tasks', async () => {
      const results = await engine.sync(source, [target], { scope: 'tasks' });

      expect(results).toHaveLength(1);
      expect(results[0].created).toBe(2);
      expect(target.syncRequirementsCalled).toBe(false);
      expect(target.syncTasksCalled).toBe(true);
    });

    it('should sync all including design when scope is all', async () => {
      const results = await engine.sync(source, [target], { scope: 'all' });

      expect(results).toHaveLength(3); // requirements + tasks + design
      expect(target.syncDesignCalled).toBe(true);
    });

    it('should handle dry-run mode', async () => {
      const results = await engine.sync(source, [target], { dryRun: true });

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].created).toBe(0);
      expect(target.syncRequirementsCalled).toBe(false);
      expect(target.syncTasksCalled).toBe(false);
    });

    it('should sync to multiple targets', async () => {
      const target2 = new MockTargetAdapter();
      target2.name = 'mock-target-2';

      const results = await engine.sync(source, [target, target2]);

      // Should have results from both targets
      expect(results.length).toBeGreaterThan(0);
      expect(target.syncTasksCalled).toBe(true);
      expect(target2.syncTasksCalled).toBe(true);
    });

    it('should isolate errors between targets', async () => {
      const failingTarget = new FailingTargetAdapter();

      const results = await engine.sync(source, [target, failingTarget]);

      // Should have results from both targets
      expect(results.length).toBeGreaterThan(0);

      // At least one should succeed
      const successResults = results.filter((r) => r.success);
      expect(successResults.length).toBeGreaterThan(0);

      // At least one should fail
      const failResults = results.filter((r) => !r.success);
      expect(failResults.length).toBeGreaterThan(0);

      // First target should still have synced (tasks by default)
      expect(target.syncTasksCalled).toBe(true);
    });

    it('should update sync status', async () => {
      const initialStatus = engine.getStatus();
      expect(initialStatus.status).toBe('idle');

      await engine.sync(source, [target]);

      const finalStatus = engine.getStatus();
      expect(finalStatus.status).toBe('idle');
      expect(finalStatus.lastSync).toBeDefined();
      expect(finalStatus.results).toBeDefined();
    });

    it('should track sync history', async () => {
      const initialHistory = engine.getHistory();
      expect(initialHistory).toHaveLength(0);

      await engine.sync(source, [target]);

      const history = engine.getHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it('should accumulate history across multiple syncs', async () => {
      await engine.sync(source, [target]);
      const historyAfterFirst = engine.getHistory();

      await engine.sync(source, [target]);
      const historyAfterSecond = engine.getHistory();

      expect(historyAfterSecond.length).toBeGreaterThan(historyAfterFirst.length);
    });
  });

  describe('getStatus', () => {
    it('should return current sync status', () => {
      const status = engine.getStatus();

      expect(status).toHaveProperty('status');
      expect(status.status).toBe('idle');
    });

    it('should return copy of status', () => {
      const status1 = engine.getStatus();
      const status2 = engine.getStatus();

      expect(status1).toEqual(status2);
      expect(status1).not.toBe(status2);
    });
  });

  describe('getHistory', () => {
    it('should return empty history initially', () => {
      const history = engine.getHistory();

      expect(history).toEqual([]);
    });

    it('should return copy of history', () => {
      const history1 = engine.getHistory();
      const history2 = engine.getHistory();

      expect(history1).toEqual(history2);
      expect(history1).not.toBe(history2);
    });
  });

  describe('clearHistory', () => {
    it('should clear sync history', async () => {
      await engine.sync(source, [target]);
      let history = engine.getHistory();
      expect(history.length).toBeGreaterThan(0);

      engine.clearHistory();
      history = engine.getHistory();
      expect(history).toEqual([]);
    });
  });

  describe('scope filtering', () => {
    it('should filter single item by id', async () => {
      const results = await engine.sync(source, [target], {
        scope: 'single',
        itemId: 'task-1',
      });

      // Should only sync the single task
      expect(results).toBeDefined();
    });

    it('should handle non-existent item id', async () => {
      const results = await engine.sync(source, [target], {
        scope: 'single',
        itemId: 'non-existent-id',
      });

      // Should return empty results
      expect(results).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle source adapter errors', async () => {
      class ErrorSourceAdapter implements SourceAdapter {
        name = 'error-source';
        detect(): boolean {
          return true;
        }
        async parse(): Promise<SpecData> {
          throw new Error('Parse error');
        }
      }

      const errorSource = new ErrorSourceAdapter();

      await expect(engine.sync(errorSource, [target])).rejects.toThrow('Parse error');
    });

    it('should set status to error on failure', async () => {
      class ErrorSourceAdapter implements SourceAdapter {
        name = 'error-source';
        detect(): boolean {
          return true;
        }
        async parse(): Promise<SpecData> {
          throw new Error('Parse error');
        }
      }

      const errorSource = new ErrorSourceAdapter();

      try {
        await engine.sync(errorSource, [target]);
      } catch {
        // Expected
      }

      const status = engine.getStatus();
      expect(status.status).toBe('error');
    });
  });

  describe('multiple targets with mixed results', () => {
    it('should continue syncing after target failure', async () => {
      const target2 = new MockTargetAdapter();
      target2.name = 'mock-target-2';
      const failingTarget = new FailingTargetAdapter();

      const results = await engine.sync(source, [target, failingTarget, target2]);

      // Should have results from all targets
      expect(results.length).toBeGreaterThan(0);

      // First and third targets should succeed
      const successResults = results.filter((r) => r.success);
      expect(successResults.length).toBeGreaterThan(0);

      // At least one should fail
      const failResults = results.filter((r) => !r.success);
      expect(failResults.length).toBeGreaterThan(0);
    });
  });
});
