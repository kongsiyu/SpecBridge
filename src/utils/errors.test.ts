/**
 * Unit tests for error handling
 */

import { describe, it, expect } from 'vitest';
import {
  SpecBridgeError,
  ConfigNotFoundError,
  ConfigParseError,
  AuthenticationError,
  RateLimitError,
  AdapterError,
} from './errors';

describe('Error Classes', () => {
  describe('SpecBridgeError', () => {
    it('should create error with message and code', () => {
      const error = new SpecBridgeError('Test message', 'TEST_CODE');
      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('SpecBridgeError');
    });

    it('should be instanceof Error', () => {
      const error = new SpecBridgeError('Test', 'TEST');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('ConfigNotFoundError', () => {
    it('should have correct code', () => {
      const error = new ConfigNotFoundError('/path/to/config');
      expect(error.code).toBe('CONFIG_NOT_FOUND');
      expect(error.message).toContain('/path/to/config');
    });
  });

  describe('ConfigParseError', () => {
    it('should have correct code', () => {
      const error = new ConfigParseError('Invalid YAML');
      expect(error.code).toBe('CONFIG_PARSE_ERROR');
      expect(error.message).toContain('Invalid YAML');
    });
  });

  describe('AuthenticationError', () => {
    it('should have correct code', () => {
      const error = new AuthenticationError('GitHub');
      expect(error.code).toBe('AUTH_ERROR');
      expect(error.message).toContain('GitHub');
    });
  });

  describe('RateLimitError', () => {
    it('should have correct code', () => {
      const error = new RateLimitError('GitHub', 60);
      expect(error.code).toBe('RATE_LIMIT_ERROR');
      expect(error.retryAfter).toBe(60);
      expect(error.message).toContain('60s');
    });

    it('should handle missing retryAfter', () => {
      const error = new RateLimitError('GitHub');
      expect(error.retryAfter).toBeUndefined();
    });
  });

  describe('AdapterError', () => {
    it('should have correct code and adapter name', () => {
      const error = new AdapterError('kiro', 'Parse failed');
      expect(error.code).toBe('ADAPTER_ERROR');
      expect(error.adapterName).toBe('kiro');
      expect(error.message).toContain('kiro');
      expect(error.message).toContain('Parse failed');
    });
  });
});
