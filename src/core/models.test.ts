/**
 * Unit tests for core data models
 */

import { describe, it, expect } from 'vitest';
import {
  TaskStatus,
  SpecMeta,
  Requirement,
  Task,
  Design,
  SyncChange,
  SyncResult,
  SpecData,
  EpicStatus,
} from './models';

describe('Core Models', () => {
  describe('TaskStatus enum', () => {
    it('should have correct values', () => {
      expect(TaskStatus.TODO).toBe('todo');
      expect(TaskStatus.IN_PROGRESS).toBe('in_progress');
      expect(TaskStatus.DONE).toBe('done');
      expect(TaskStatus.BLOCKED).toBe('blocked');
    });

    it('should have all required statuses', () => {
      const statuses = Object.values(TaskStatus);
      expect(statuses).toContain('todo');
      expect(statuses).toContain('in_progress');
      expect(statuses).toContain('done');
      expect(statuses).toContain('blocked');
    });

    it('should have exactly 4 statuses', () => {
      const statuses = Object.values(TaskStatus);
      expect(statuses).toHaveLength(4);
    });
  });

  describe('SpecMeta interface', () => {
    it('should create valid SpecMeta', () => {
      const meta: SpecMeta = {
        name: 'user-authentication',
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(meta.name).toBe('user-authentication');
      expect(meta.version).toBe('1.0.0');
      expect(meta.createdAt).toBeTruthy();
      expect(meta.updatedAt).toBeTruthy();
    });
  });

  describe('Requirement interface', () => {
    it('should create valid Requirement with required fields', () => {
      const req: Requirement = {
        id: 'req-1',
        title: 'User Login',
        description: 'Users should be able to login',
      };

      expect(req.id).toBe('req-1');
      expect(req.title).toBe('User Login');
      expect(req.description).toBe('Users should be able to login');
    });

    it('should create Requirement with optional fields', () => {
      const req: Requirement = {
        id: 'req-1',
        title: 'User Login',
        description: 'Users should be able to login',
        priority: 'high',
        labels: ['auth', 'security'],
        syncId: 'github-123',
      };

      expect(req.priority).toBe('high');
      expect(req.labels).toEqual(['auth', 'security']);
      expect(req.syncId).toBe('github-123');
    });
  });

  describe('Task interface', () => {
    it('should create valid Task with required fields', () => {
      const task: Task = {
        id: 'task-1',
        title: 'Implement login form',
        status: TaskStatus.TODO,
      };

      expect(task.id).toBe('task-1');
      expect(task.title).toBe('Implement login form');
      expect(task.status).toBe(TaskStatus.TODO);
    });

    it('should create Task with optional fields', () => {
      const task: Task = {
        id: 'task-1',
        title: 'Implement login form',
        description: 'Create a login form component',
        status: TaskStatus.IN_PROGRESS,
        assignee: 'john',
        parentId: 'task-0',
        labels: ['frontend', 'ui'],
        syncId: 'github-456',
      };

      expect(task.description).toBe('Create a login form component');
      expect(task.assignee).toBe('john');
      expect(task.parentId).toBe('task-0');
      expect(task.labels).toEqual(['frontend', 'ui']);
      expect(task.syncId).toBe('github-456');
    });

    it('should support all task statuses', () => {
      const statuses = [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE, TaskStatus.BLOCKED];

      statuses.forEach((status) => {
        const task: Task = {
          id: 'task-1',
          title: 'Test task',
          status,
        };
        expect(task.status).toBe(status);
      });
    });

    it('should create Task with specName and specPath', () => {
      const task: Task = {
        id: 'task-1',
        title: 'Implement login form',
        status: TaskStatus.TODO,
        specName: 'user-authentication',
        specPath: '.kiro/specs/user-authentication',
      };

      expect(task.specName).toBe('user-authentication');
      expect(task.specPath).toBe('.kiro/specs/user-authentication');
    });

    it('should allow Task without specName and specPath', () => {
      const task: Task = {
        id: 'task-1',
        title: 'Implement login form',
        status: TaskStatus.TODO,
      };

      expect(task.specName).toBeUndefined();
      expect(task.specPath).toBeUndefined();
    });
  });

  describe('EpicStatus interface', () => {
    it('should create valid EpicStatus with todo status', () => {
      const epicStatus: EpicStatus = {
        status: 'todo',
        progress: 0,
        total: 5,
        completed: 0,
        inProgress: 0,
        todo: 5,
      };

      expect(epicStatus.status).toBe('todo');
      expect(epicStatus.progress).toBe(0);
      expect(epicStatus.total).toBe(5);
      expect(epicStatus.completed).toBe(0);
      expect(epicStatus.inProgress).toBe(0);
      expect(epicStatus.todo).toBe(5);
    });

    it('should create valid EpicStatus with in_progress status', () => {
      const epicStatus: EpicStatus = {
        status: 'in_progress',
        progress: 50,
        total: 10,
        completed: 5,
        inProgress: 2,
        todo: 3,
      };

      expect(epicStatus.status).toBe('in_progress');
      expect(epicStatus.progress).toBe(50);
      expect(epicStatus.total).toBe(10);
      expect(epicStatus.completed).toBe(5);
      expect(epicStatus.inProgress).toBe(2);
      expect(epicStatus.todo).toBe(3);
    });

    it('should create valid EpicStatus with done status', () => {
      const epicStatus: EpicStatus = {
        status: 'done',
        progress: 100,
        total: 8,
        completed: 8,
        inProgress: 0,
        todo: 0,
      };

      expect(epicStatus.status).toBe('done');
      expect(epicStatus.progress).toBe(100);
      expect(epicStatus.total).toBe(8);
      expect(epicStatus.completed).toBe(8);
      expect(epicStatus.inProgress).toBe(0);
      expect(epicStatus.todo).toBe(0);
    });

    it('should support all epic status values', () => {
      const statuses: Array<'todo' | 'in_progress' | 'done'> = ['todo', 'in_progress', 'done'];

      statuses.forEach((status) => {
        const epicStatus: EpicStatus = {
          status,
          progress: 0,
          total: 1,
          completed: 0,
          inProgress: 0,
          todo: 1,
        };
        expect(epicStatus.status).toBe(status);
      });
    });

    it('should validate progress is between 0 and 100', () => {
      const epicStatus0: EpicStatus = {
        status: 'todo',
        progress: 0,
        total: 5,
        completed: 0,
        inProgress: 0,
        todo: 5,
      };

      const epicStatus100: EpicStatus = {
        status: 'done',
        progress: 100,
        total: 5,
        completed: 5,
        inProgress: 0,
        todo: 0,
      };

      expect(epicStatus0.progress).toBeGreaterThanOrEqual(0);
      expect(epicStatus0.progress).toBeLessThanOrEqual(100);
      expect(epicStatus100.progress).toBeGreaterThanOrEqual(0);
      expect(epicStatus100.progress).toBeLessThanOrEqual(100);
    });

    it('should validate task counts sum to total', () => {
      const epicStatus: EpicStatus = {
        status: 'in_progress',
        progress: 40,
        total: 10,
        completed: 4,
        inProgress: 3,
        todo: 3,
      };

      const sum = epicStatus.completed + epicStatus.inProgress + epicStatus.todo;
      expect(sum).toBe(epicStatus.total);
    });
  });

  describe('Design interface', () => {
    it('should create valid Design with content', () => {
      const design: Design = {
        content: '# Design Document\n\nThis is the design.',
      };

      expect(design.content).toContain('# Design Document');
    });

    it('should create Design with sections', () => {
      const design: Design = {
        content: '# Design Document',
        sections: {
          architecture: '## Architecture\n...',
          database: '## Database\n...',
        },
      };

      expect(design.sections).toHaveProperty('architecture');
      expect(design.sections).toHaveProperty('database');
    });
  });

  describe('SyncChange interface', () => {
    it('should create valid SyncChange for created action', () => {
      const change: SyncChange = {
        timestamp: new Date().toISOString(),
        action: 'created',
        itemType: 'task',
        itemId: 'task-1',
      };

      expect(change.action).toBe('created');
      expect(change.itemType).toBe('task');
      expect(change.itemId).toBe('task-1');
    });

    it('should create SyncChange with changes details', () => {
      const change: SyncChange = {
        timestamp: new Date().toISOString(),
        action: 'updated',
        itemType: 'task',
        itemId: 'task-1',
        changes: [
          {
            field: 'title',
            oldValue: 'Old Title',
            newValue: 'New Title',
          },
          {
            field: 'status',
            oldValue: 'todo',
            newValue: 'in_progress',
          },
        ],
      };

      expect(change.changes).toHaveLength(2);
      expect(change.changes?.[0].field).toBe('title');
      expect(change.changes?.[1].field).toBe('status');
    });

    it('should support all action types', () => {
      const actions: Array<'created' | 'updated' | 'closed'> = ['created', 'updated', 'closed'];

      actions.forEach((action) => {
        const change: SyncChange = {
          timestamp: new Date().toISOString(),
          action,
          itemType: 'task',
          itemId: 'task-1',
        };
        expect(change.action).toBe(action);
      });
    });

    it('should support all item types', () => {
      const itemTypes: Array<'requirement' | 'task' | 'design'> = ['requirement', 'task', 'design'];

      itemTypes.forEach((itemType) => {
        const change: SyncChange = {
          timestamp: new Date().toISOString(),
          action: 'created',
          itemType,
          itemId: 'item-1',
        };
        expect(change.itemType).toBe(itemType);
      });
    });
  });

  describe('SyncResult interface', () => {
    it('should create valid SyncResult', () => {
      const result: SyncResult = {
        success: true,
        created: 5,
        updated: 3,
        failed: 0,
        changes: [],
      };

      expect(result.success).toBe(true);
      expect(result.created).toBe(5);
      expect(result.updated).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.changes).toEqual([]);
    });

    it('should create SyncResult with errors', () => {
      const result: SyncResult = {
        success: false,
        created: 2,
        updated: 1,
        failed: 2,
        changes: [],
        errors: ['Error 1', 'Error 2'],
      };

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(2);
    });

    it('should create SyncResult with changes', () => {
      const changes: SyncChange[] = [
        {
          timestamp: new Date().toISOString(),
          action: 'created',
          itemType: 'task',
          itemId: 'task-1',
        },
      ];

      const result: SyncResult = {
        success: true,
        created: 1,
        updated: 0,
        failed: 0,
        changes,
      };

      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].action).toBe('created');
    });
  });

  describe('SpecData interface', () => {
    it('should create valid SpecData', () => {
      const specData: SpecData = {
        meta: {
          name: 'user-auth',
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        requirements: [
          {
            id: 'req-1',
            title: 'Login',
            description: 'User login',
          },
        ],
        tasks: [
          {
            id: 'task-1',
            title: 'Implement login',
            status: TaskStatus.TODO,
          },
        ],
        epicTitle: 'User Authentication',
        epicDescription: '# Requirements\n\nUser authentication feature',
      };

      expect(specData.meta.name).toBe('user-auth');
      expect(specData.requirements).toHaveLength(1);
      expect(specData.tasks).toHaveLength(1);
      expect(specData.epicTitle).toBe('User Authentication');
      expect(specData.epicDescription).toContain('# Requirements');
    });

    it('should create SpecData with design', () => {
      const specData: SpecData = {
        meta: {
          name: 'user-auth',
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        requirements: [],
        design: {
          content: '# Design',
        },
        tasks: [],
        epicTitle: 'User Auth',
        epicDescription: 'Description',
      };

      expect(specData.design).toBeDefined();
      expect(specData.design?.content).toBe('# Design');
    });

    it('should create SpecData with empty arrays', () => {
      const specData: SpecData = {
        meta: {
          name: 'empty-spec',
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        requirements: [],
        tasks: [],
        epicTitle: 'Empty Spec',
        epicDescription: '',
      };

      expect(specData.requirements).toEqual([]);
      expect(specData.tasks).toEqual([]);
      expect(specData.epicTitle).toBe('Empty Spec');
      expect(specData.epicDescription).toBe('');
    });

    it('should create SpecData with multiple items', () => {
      const specData: SpecData = {
        meta: {
          name: 'complex-spec',
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        requirements: [
          { id: 'req-1', title: 'Req 1', description: 'Description 1' },
          { id: 'req-2', title: 'Req 2', description: 'Description 2' },
        ],
        tasks: [
          { id: 'task-1', title: 'Task 1', status: TaskStatus.TODO },
          { id: 'task-2', title: 'Task 2', status: TaskStatus.IN_PROGRESS },
          { id: 'task-3', title: 'Task 3', status: TaskStatus.DONE },
        ],
        epicTitle: 'Complex Spec',
        epicDescription: '# Complex Requirements',
      };

      expect(specData.requirements).toHaveLength(2);
      expect(specData.tasks).toHaveLength(3);
    });

    it('should create SpecData with epicStatus', () => {
      const specData: SpecData = {
        meta: {
          name: 'user-auth',
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        requirements: [],
        tasks: [
          { id: 'task-1', title: 'Task 1', status: TaskStatus.DONE },
          { id: 'task-2', title: 'Task 2', status: TaskStatus.TODO },
        ],
        epicTitle: 'User Auth',
        epicDescription: 'Description',
        epicStatus: {
          status: 'in_progress',
          progress: 50,
          total: 2,
          completed: 1,
          inProgress: 0,
          todo: 1,
        },
      };

      expect(specData.epicStatus).toBeDefined();
      expect(specData.epicStatus?.status).toBe('in_progress');
      expect(specData.epicStatus?.progress).toBe(50);
      expect(specData.epicStatus?.completed).toBe(1);
      expect(specData.epicStatus?.total).toBe(2);
    });

    it('should allow SpecData without epicStatus', () => {
      const specData: SpecData = {
        meta: {
          name: 'user-auth',
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        requirements: [],
        tasks: [],
        epicTitle: 'User Auth',
        epicDescription: 'Description',
      };

      expect(specData.epicStatus).toBeUndefined();
    });
  });
});
