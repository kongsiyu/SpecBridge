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

    it('should have stack trace', () => {
      const error = new SpecBridgeError('Test', 'TEST');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('SpecBridgeError');
    });

    it('should preserve error chain', () => {
      const originalError = new Error('Original error');
      const error = new SpecBridgeError(`Wrapped: ${originalError.message}`, 'WRAPPED');
      expect(error.message).toContain('Original error');
    });
  });

  describe('ConfigNotFoundError', () => {
    it('should have correct code', () => {
      const error = new ConfigNotFoundError('/path/to/config');
      expect(error.code).toBe('CONFIG_NOT_FOUND');
    });

    it('should include path in message', () => {
      const error = new ConfigNotFoundError('/path/to/config');
      expect(error.message).toContain('/path/to/config');
    });

    it('should be instanceof SpecBridgeError', () => {
      const error = new ConfigNotFoundError('/path/to/config');
      expect(error).toBeInstanceOf(SpecBridgeError);
    });

    it('should be instanceof Error', () => {
      const error = new ConfigNotFoundError('/path/to/config');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('ConfigParseError', () => {
    it('should have correct code', () => {
      const error = new ConfigParseError('Invalid YAML');
      expect(error.code).toBe('CONFIG_PARSE_ERROR');
    });

    it('should include details in message', () => {
      const error = new ConfigParseError('Invalid YAML syntax');
      expect(error.message).toContain('Invalid YAML syntax');
    });

    it('should be instanceof SpecBridgeError', () => {
      const error = new ConfigParseError('Invalid YAML');
      expect(error).toBeInstanceOf(SpecBridgeError);
    });
  });

  describe('AuthenticationError', () => {
    it('should have correct code', () => {
      const error = new AuthenticationError('GitHub');
      expect(error.code).toBe('AUTH_ERROR');
    });

    it('should include platform name in message', () => {
      const error = new AuthenticationError('GitHub');
      expect(error.message).toContain('GitHub');
    });

    it('should mention credentials in message', () => {
      const error = new AuthenticationError('GitHub');
      expect(error.message).toContain('credentials');
    });

    it('should be instanceof SpecBridgeError', () => {
      const error = new AuthenticationError('GitHub');
      expect(error).toBeInstanceOf(SpecBridgeError);
    });

    it('should work with different platforms', () => {
      const platforms = ['GitHub', 'Jira', 'CodeUp'];
      platforms.forEach((platform) => {
        const error = new AuthenticationError(platform);
        expect(error.message).toContain(platform);
      });
    });
  });

  describe('RateLimitError', () => {
    it('should have correct code', () => {
      const error = new RateLimitError('GitHub', 60);
      expect(error.code).toBe('RATE_LIMIT_ERROR');
    });

    it('should include platform name in message', () => {
      const error = new RateLimitError('GitHub', 60);
      expect(error.message).toContain('GitHub');
    });

    it('should include retry time in message', () => {
      const error = new RateLimitError('GitHub', 60);
      expect(error.message).toContain('60s');
    });

    it('should store retryAfter value', () => {
      const error = new RateLimitError('GitHub', 60);
      expect(error.retryAfter).toBe(60);
    });

    it('should handle missing retryAfter', () => {
      const error = new RateLimitError('GitHub');
      expect(error.retryAfter).toBeUndefined();
    });

    it('should not include retry time when retryAfter is undefined', () => {
      const error = new RateLimitError('GitHub');
      expect(error.message).not.toContain('Retry after');
    });

    it('should be instanceof SpecBridgeError', () => {
      const error = new RateLimitError('GitHub', 60);
      expect(error).toBeInstanceOf(SpecBridgeError);
    });

    it('should work with different retry times', () => {
      const times = [30, 60, 120, 3600];
      times.forEach((time) => {
        const error = new RateLimitError('GitHub', time);
        expect(error.retryAfter).toBe(time);
      });
    });
  });

  describe('AdapterError', () => {
    it('should have correct code', () => {
      const error = new AdapterError('kiro', 'Parse failed');
      expect(error.code).toBe('ADAPTER_ERROR');
    });

    it('should include adapter name in message', () => {
      const error = new AdapterError('kiro', 'Parse failed');
      expect(error.message).toContain('kiro');
    });

    it('should include error details in message', () => {
      const error = new AdapterError('kiro', 'Parse failed');
      expect(error.message).toContain('Parse failed');
    });

    it('should store adapter name', () => {
      const error = new AdapterError('kiro', 'Parse failed');
      expect(error.adapterName).toBe('kiro');
    });

    it('should be instanceof SpecBridgeError', () => {
      const error = new AdapterError('kiro', 'Parse failed');
      expect(error).toBeInstanceOf(SpecBridgeError);
    });

    it('should work with different adapters', () => {
      const adapters = ['kiro', 'github', 'jira'];
      adapters.forEach((adapter) => {
        const error = new AdapterError(adapter, 'Error');
        expect(error.adapterName).toBe(adapter);
        expect(error.message).toContain(adapter);
      });
    });

    it('should work with different error messages', () => {
      const messages = ['Parse failed', 'Connection timeout', 'Invalid format'];
      messages.forEach((msg) => {
        const error = new AdapterError('kiro', msg);
        expect(error.message).toContain(msg);
      });
    });
  });

  describe('Error hierarchy', () => {
    it('should maintain error hierarchy', () => {
      const errors = [
        new ConfigNotFoundError('/path'),
        new ConfigParseError('Invalid'),
        new AuthenticationError('GitHub'),
        new RateLimitError('GitHub', 60),
        new AdapterError('kiro', 'Error'),
      ];

      errors.forEach((error) => {
        expect(error).toBeInstanceOf(SpecBridgeError);
        expect(error).toBeInstanceOf(Error);
        expect(error.code).toBeDefined();
      });
    });

    it('should have unique error codes', () => {
      const errors = [
        new ConfigNotFoundError('/path'),
        new ConfigParseError('Invalid'),
        new AuthenticationError('GitHub'),
        new RateLimitError('GitHub', 60),
        new AdapterError('kiro', 'Error'),
      ];

      const codes = errors.map((e) => e.code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });
  });
});
