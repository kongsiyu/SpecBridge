/**
 * Unit tests for GitHub target adapter
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GitHubAdapter } from './github';
import { TaskStatus } from '../../core/models';

describe('GitHubAdapter', () => {
  let adapter: GitHubAdapter;

  beforeEach(() => {
    adapter = new GitHubAdapter();
  });

  describe('name', () => {
    it('should have name "github"', () => {
      expect(adapter.name).toBe('github');
    });
  });

  describe('init', () => {
    it('should throw AuthenticationError when token is missing', async () => {
      try {
        await adapter.init({
          owner: 'test',
          repo: 'test',
          authMethod: 'token',
        });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.code).toBe('AUTH_ERROR');
      }
    });
  });

  describe('syncRequirements', () => {
    it('should return empty result for empty requirements', async () => {
      const result = await adapter.syncRequirements([]);
      expect(result.created).toBe(0);
      expect(result.updated).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.changes).toEqual([]);
    });
  });

  describe('syncTasks', () => {
    it('should return empty result for empty tasks', async () => {
      const result = await adapter.syncTasks([]);
      expect(result.created).toBe(0);
      expect(result.updated).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.changes).toEqual([]);
    });
  });

  describe('getTaskStatus', () => {
    it('should return TODO for non-existent task', async () => {
      const status = await adapter.getTaskStatus('non-existent-id');
      expect(status).toBe(TaskStatus.TODO);
    });
  });
});
