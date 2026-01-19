/**
 * Unit tests for configuration management
 */

import { describe, it, expect } from 'vitest';
import { replaceEnvVars, validateConfig } from './config';
import { ConfigParseError } from '../utils/errors';

describe('Configuration Management', () => {
  describe('replaceEnvVars', () => {
    it('should replace environment variables', () => {
      process.env.TEST_VAR = 'test-value';
      const result = replaceEnvVars('prefix-${TEST_VAR}-suffix');
      expect(result).toBe('prefix-test-value-suffix');
    });

    it('should throw error for undefined variables', () => {
      expect(() => {
        replaceEnvVars('${UNDEFINED_VAR_XYZ}');
      }).toThrow();
    });

    it('should handle multiple variables', () => {
      process.env.VAR1 = 'value1';
      process.env.VAR2 = 'value2';
      const result = replaceEnvVars('${VAR1}-${VAR2}');
      expect(result).toBe('value1-value2');
    });

    it('should handle strings without variables', () => {
      const result = replaceEnvVars('plain-string');
      expect(result).toBe('plain-string');
    });
  });

  describe('validateConfig', () => {
    it('should throw error for missing version', () => {
      expect(() => {
        validateConfig({
          version: '',
          source: { type: 'kiro' },
          targets: [{ name: 'test', type: 'github', enabled: true, config: {} }],
        });
      }).toThrow(ConfigParseError);
    });

    it('should throw error for unsupported version', () => {
      expect(() => {
        validateConfig({
          version: '99.0',
          source: { type: 'kiro' },
          targets: [{ name: 'test', type: 'github', enabled: true, config: {} }],
        });
      }).toThrow(ConfigParseError);
    });

    it('should throw error for missing source', () => {
      expect(() => {
        validateConfig({
          version: '1.0',
          source: { type: '' },
          targets: [{ name: 'test', type: 'github', enabled: true, config: {} }],
        });
      }).toThrow(ConfigParseError);
    });

    it('should throw error for empty targets', () => {
      expect(() => {
        validateConfig({
          version: '1.0',
          source: { type: 'kiro' },
          targets: [],
        });
      }).toThrow(ConfigParseError);
    });

    it('should throw error for invalid target', () => {
      expect(() => {
        validateConfig({
          version: '1.0',
          source: { type: 'kiro' },
          targets: [{ name: '', type: 'github', enabled: true, config: {} }],
        });
      }).toThrow(ConfigParseError);
    });

    it('should accept valid config', () => {
      expect(() => {
        validateConfig({
          version: '1.0',
          source: { type: 'kiro' },
          targets: [{ name: 'test', type: 'github', enabled: true, config: {} }],
        });
      }).not.toThrow();
    });
  });
});
