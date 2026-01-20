/**
 * Unit tests for Kiro source adapter
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { KiroAdapter } from './kiro';
import { TaskStatus } from '../../core/models';

describe('KiroAdapter', () => {
  let adapter: KiroAdapter;

  beforeEach(() => {
    adapter = new KiroAdapter();
  });

  describe('name', () => {
    it('should have name "kiro"', () => {
      expect(adapter.name).toBe('kiro');
    });
  });

  describe('detect', () => {
    it('should return false for non-Kiro paths', () => {
      const result = adapter.detect('/some/random/path');
      expect(result).toBe(false);
    });
  });

  describe('parse', () => {
    it('should throw AdapterError for invalid paths', async () => {
      try {
        await adapter.parse('/invalid/path/that/does/not/exist');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.code).toBe('ADAPTER_ERROR');
        expect(error.adapterName).toBe('kiro');
      }
    });
  });

  describe('TaskStatus mapping', () => {
    it('should have correct TaskStatus values', () => {
      expect(TaskStatus.TODO).toBe('todo');
      expect(TaskStatus.IN_PROGRESS).toBe('in_progress');
      expect(TaskStatus.DONE).toBe('done');
      expect(TaskStatus.BLOCKED).toBe('blocked');
    });
  });

  describe('formatEpicTitle', () => {
    it('should format kebab-case to Title Case', () => {
      // Access private method through type assertion for testing
      const formatEpicTitle = (adapter as any).formatEpicTitle.bind(adapter);
      
      expect(formatEpicTitle('user-authentication')).toBe('User Authentication');
      expect(formatEpicTitle('sync-strategy-enhancement')).toBe('Sync Strategy Enhancement');
      expect(formatEpicTitle('test-feature')).toBe('Test Feature');
      expect(formatEpicTitle('api-integration')).toBe('Api Integration');
    });

    it('should handle single word names', () => {
      const formatEpicTitle = (adapter as any).formatEpicTitle.bind(adapter);
      
      expect(formatEpicTitle('authentication')).toBe('Authentication');
      expect(formatEpicTitle('test')).toBe('Test');
    });

    it('should handle empty strings', () => {
      const formatEpicTitle = (adapter as any).formatEpicTitle.bind(adapter);
      
      expect(formatEpicTitle('')).toBe('');
    });
  });
});
