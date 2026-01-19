/**
 * Integration tests for Kiro source adapter
 *
 * Tests parsing of real Kiro spec files
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as path from 'path';
import { KiroAdapter } from './kiro';
import { TaskStatus } from '../../core/models';

describe('KiroAdapter Integration', () => {
  let adapter: KiroAdapter;
  const testSpecPath = path.join(process.cwd(), '.test-specs', 'test-feature');

  beforeEach(() => {
    adapter = new KiroAdapter();
  });

  describe('detect', () => {
    it('should detect Kiro spec directory', () => {
      const result = adapter.detect(process.cwd());
      // Should detect if .kiro/specs exists in current directory
      expect(typeof result).toBe('boolean');
    });

    it('should not detect non-Kiro paths', () => {
      const result = adapter.detect('/tmp/random/path');
      expect(result).toBe(false);
    });
  });

  describe('parse', () => {
    it('should parse test spec files', async () => {
      const specData = await adapter.parse(testSpecPath);

      // Verify meta
      expect(specData.meta).toBeDefined();
      expect(specData.meta.name).toBe('test-feature');
      expect(specData.meta.version).toBe('1.0.0');
      expect(specData.meta.createdAt).toBeDefined();
      expect(specData.meta.updatedAt).toBeDefined();

      // Verify requirements
      expect(specData.requirements).toBeDefined();
      expect(Array.isArray(specData.requirements)).toBe(true);

      // Verify tasks
      expect(specData.tasks).toBeDefined();
      expect(Array.isArray(specData.tasks)).toBe(true);

      // Verify design
      expect(specData.design).toBeDefined();
      expect(specData.design?.content).toBeDefined();
    });

    it('should parse requirements correctly', async () => {
      const specData = await adapter.parse(testSpecPath);

      expect(specData.requirements.length).toBeGreaterThan(0);

      const req = specData.requirements[0];
      expect(req.id).toBeDefined();
      expect(req.title).toBeDefined();
      expect(req.description).toBeDefined();
    });

    it('should parse tasks correctly', async () => {
      const specData = await adapter.parse(testSpecPath);

      expect(specData.tasks.length).toBeGreaterThan(0);

      const task = specData.tasks[0];
      expect(task.id).toBeDefined();
      expect(task.title).toBeDefined();
      expect(task.status).toBeDefined();
      expect(Object.values(TaskStatus)).toContain(task.status);
    });

    it('should map task status correctly', async () => {
      const specData = await adapter.parse(testSpecPath);

      // Check for different statuses
      const statuses = specData.tasks.map((t) => t.status);
      expect(statuses.length).toBeGreaterThan(0);

      // All statuses should be valid
      statuses.forEach((status) => {
        expect(Object.values(TaskStatus)).toContain(status);
      });
    });

    it('should extract assignee from tasks', async () => {
      const specData = await adapter.parse(testSpecPath);

      // Find task with assignee
      const taskWithAssignee = specData.tasks.find((t) => t.assignee);

      if (taskWithAssignee) {
        expect(taskWithAssignee.assignee).toBeDefined();
        expect(typeof taskWithAssignee.assignee).toBe('string');
      }
    });

    it('should parse design document', async () => {
      const specData = await adapter.parse(testSpecPath);

      expect(specData.design).toBeDefined();
      expect(specData.design?.content).toBeDefined();
      expect(specData.design?.content.length).toBeGreaterThan(0);
    });

    it('should throw error for non-existent path', async () => {
      const invalidPath = path.join(process.cwd(), 'non-existent-spec');

      await expect(adapter.parse(invalidPath)).rejects.toThrow();
    });

    it('should throw error with ADAPTER_ERROR code', async () => {
      const invalidPath = path.join(process.cwd(), 'non-existent-spec');

      try {
        await adapter.parse(invalidPath);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.code).toBe('ADAPTER_ERROR');
        expect(error.adapterName).toBe('kiro');
      }
    });
  });

  describe('data model validation', () => {
    it('should return valid SpecData structure', async () => {
      const specData = await adapter.parse(testSpecPath);

      // Check required fields
      expect(specData.meta).toBeDefined();
      expect(specData.requirements).toBeDefined();
      expect(specData.tasks).toBeDefined();

      // Check meta fields
      expect(specData.meta.name).toBeDefined();
      expect(specData.meta.version).toBeDefined();
      expect(specData.meta.createdAt).toBeDefined();
      expect(specData.meta.updatedAt).toBeDefined();

      // Check arrays
      expect(Array.isArray(specData.requirements)).toBe(true);
      expect(Array.isArray(specData.tasks)).toBe(true);
    });

    it('should have valid requirement structure', async () => {
      const specData = await adapter.parse(testSpecPath);

      specData.requirements.forEach((req) => {
        expect(req.id).toBeDefined();
        expect(typeof req.id).toBe('string');

        expect(req.title).toBeDefined();
        expect(typeof req.title).toBe('string');

        expect(req.description).toBeDefined();
        expect(typeof req.description).toBe('string');
      });
    });

    it('should have valid task structure', async () => {
      const specData = await adapter.parse(testSpecPath);

      specData.tasks.forEach((task) => {
        expect(task.id).toBeDefined();
        expect(typeof task.id).toBe('string');

        expect(task.title).toBeDefined();
        expect(typeof task.title).toBe('string');

        expect(task.status).toBeDefined();
        expect(Object.values(TaskStatus)).toContain(task.status);
      });
    });
  });

  describe('multiple parse calls', () => {
    it('should parse consistently across multiple calls', async () => {
      const result1 = await adapter.parse(testSpecPath);
      const result2 = await adapter.parse(testSpecPath);

      expect(result1.meta.name).toBe(result2.meta.name);
      expect(result1.requirements.length).toBe(result2.requirements.length);
      expect(result1.tasks.length).toBe(result2.tasks.length);
    });

    it('should have same task IDs across calls', async () => {
      const result1 = await adapter.parse(testSpecPath);
      const result2 = await adapter.parse(testSpecPath);

      const ids1 = result1.tasks.map((t) => t.id).sort();
      const ids2 = result2.tasks.map((t) => t.id).sort();

      expect(ids1).toEqual(ids2);
    });
  });
});
