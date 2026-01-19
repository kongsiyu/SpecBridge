/**
 * Unit tests for core data models
 */

import { describe, it, expect } from 'vitest';
import { TaskStatus } from './models';

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
  });
});
