/**
 * Unit tests for configuration management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'path';
import { promises as fs } from 'fs';
import {
  replaceEnvVars,
  validateConfig,
  loadConfig,
  validateSyncLevel,
  validateChannelConfig,
} from './config';
import { ConfigParseError, ConfigNotFoundError } from '../utils/errors';
import { writeYaml } from '../utils/file';

const TEST_DIR = path.join(process.cwd(), '.test-config-temp');
const TEST_CONFIG_FILE = path.join(TEST_DIR, '.specbridge.yaml');

describe('Configuration Management', () => {
  beforeEach(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('replaceEnvVars', () => {
    it('should replace single environment variable', () => {
      process.env.TEST_VAR = 'test-value';
      const result = replaceEnvVars('prefix-${TEST_VAR}-suffix');
      expect(result).toBe('prefix-test-value-suffix');
    });

    it('should replace multiple environment variables', () => {
      process.env.VAR1 = 'value1';
      process.env.VAR2 = 'value2';
      const result = replaceEnvVars('${VAR1}-${VAR2}');
      expect(result).toBe('value1-value2');
    });

    it('should handle strings without variables', () => {
      const result = replaceEnvVars('plain-string');
      expect(result).toBe('plain-string');
    });

    it('should throw error for undefined variables', () => {
      delete process.env.UNDEFINED_VAR_XYZ;
      expect(() => {
        replaceEnvVars('${UNDEFINED_VAR_XYZ}');
      }).toThrow(ConfigParseError);
    });

    it('should handle empty string', () => {
      const result = replaceEnvVars('');
      expect(result).toBe('');
    });

    it('should handle variable at start', () => {
      process.env.START_VAR = 'start';
      const result = replaceEnvVars('${START_VAR}-middle');
      expect(result).toBe('start-middle');
    });

    it('should handle variable at end', () => {
      process.env.END_VAR = 'end';
      const result = replaceEnvVars('middle-${END_VAR}');
      expect(result).toBe('middle-end');
    });

    it('should handle consecutive variables', () => {
      process.env.VAR_A = 'a';
      process.env.VAR_B = 'b';
      const result = replaceEnvVars('${VAR_A}${VAR_B}');
      expect(result).toBe('ab');
    });
  });

  describe('validateConfig', () => {
    it('should accept valid config', () => {
      expect(() => {
        validateConfig({
          version: '1.0',
          source: { type: 'kiro' },
          targets: [
            { name: 'github', type: 'github', enabled: true, syncLevel: 'task', config: {} },
          ],
        });
      }).not.toThrow();
    });

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

    it('should throw error for empty targets array', () => {
      expect(() => {
        validateConfig({
          version: '1.0',
          source: { type: 'kiro' },
          targets: [],
        });
      }).toThrow(ConfigParseError);
    });

    it('should throw error for missing target name', () => {
      expect(() => {
        validateConfig({
          version: '1.0',
          source: { type: 'kiro' },
          targets: [{ name: '', type: 'github', enabled: true, config: {} }],
        });
      }).toThrow(ConfigParseError);
    });

    it('should throw error for missing target type', () => {
      expect(() => {
        validateConfig({
          version: '1.0',
          source: { type: 'kiro' },
          targets: [{ name: 'test', type: '', enabled: true, config: {} }],
        });
      }).toThrow(ConfigParseError);
    });

    it('should throw error for non-boolean enabled field', () => {
      expect(() => {
        validateConfig({
          version: '1.0',
          source: { type: 'kiro' },
          targets: [{ name: 'test', type: 'github', enabled: 'yes' as any, config: {} }],
        });
      }).toThrow(ConfigParseError);
    });

    it('should throw error for missing target config', () => {
      expect(() => {
        validateConfig({
          version: '1.0',
          source: { type: 'kiro' },
          targets: [{ name: 'test', type: 'github', enabled: true, config: undefined as any }],
        });
      }).toThrow(ConfigParseError);
    });

    it('should accept multiple targets', () => {
      expect(() => {
        validateConfig({
          version: '1.0',
          source: { type: 'kiro' },
          targets: [
            { name: 'github', type: 'github', enabled: true, syncLevel: 'task', config: {} },
            { name: 'jira', type: 'jira', enabled: false, syncLevel: 'epic', config: {} },
          ],
        });
      }).not.toThrow();
    });

    it('should accept config with notifications', () => {
      expect(() => {
        validateConfig({
          version: '1.0',
          source: { type: 'kiro' },
          targets: [
            { name: 'github', type: 'github', enabled: true, syncLevel: 'task', config: {} },
          ],
          notifications: [{ type: 'slack', config: {} }],
        });
      }).not.toThrow();
    });
  });

  describe('loadConfig', () => {
    it('should load valid config file', async () => {
      const configData = {
        version: '1.0',
        source: { type: 'kiro' },
        targets: [
          { name: 'github', type: 'github', enabled: true, syncLevel: 'task', config: {} },
        ],
      };
      await writeYaml(TEST_CONFIG_FILE, configData);

      const config = await loadConfig(TEST_CONFIG_FILE);
      expect(config.version).toBe('1.0');
      expect(config.source.type).toBe('kiro');
      expect(config.targets).toHaveLength(1);
    });

    it('should throw ConfigNotFoundError for missing file', async () => {
      await expect(loadConfig(path.join(TEST_DIR, 'non-existent.yaml'))).rejects.toThrow(
        ConfigNotFoundError
      );
    });

    it('should throw ConfigParseError for invalid config', async () => {
      const invalidConfig = {
        version: '1.0',
        source: { type: 'kiro' },
        targets: [],
      };
      await writeYaml(TEST_CONFIG_FILE, invalidConfig);

      await expect(loadConfig(TEST_CONFIG_FILE)).rejects.toThrow(ConfigParseError);
    });

    it('should replace environment variables in config', async () => {
      process.env.GITHUB_TOKEN = 'test-token-123';
      const configData = {
        version: '1.0',
        source: { type: 'kiro' },
        targets: [
          {
            name: 'github',
            type: 'github',
            enabled: true,
            syncLevel: 'task',
            config: { token: '${GITHUB_TOKEN}' },
          },
        ],
      };
      await writeYaml(TEST_CONFIG_FILE, configData);

      const config = await loadConfig(TEST_CONFIG_FILE);
      expect(config.targets[0].config.token).toBe('test-token-123');
    });

    it('should replace nested environment variables', async () => {
      process.env.OWNER = 'my-org';
      process.env.REPO = 'my-repo';
      const configData = {
        version: '1.0',
        source: { type: 'kiro' },
        targets: [
          {
            name: 'github',
            type: 'github',
            enabled: true,
            syncLevel: 'task',
            config: {
              owner: '${OWNER}',
              repo: '${REPO}',
            },
          },
        ],
      };
      await writeYaml(TEST_CONFIG_FILE, configData);

      const config = await loadConfig(TEST_CONFIG_FILE);
      expect(config.targets[0].config.owner).toBe('my-org');
      expect(config.targets[0].config.repo).toBe('my-repo');
    });

    it('should throw error for undefined environment variable in config', async () => {
      delete process.env.UNDEFINED_TOKEN;
      const configData = {
        version: '1.0',
        source: { type: 'kiro' },
        targets: [
          {
            name: 'github',
            type: 'github',
            enabled: true,
            config: { token: '${UNDEFINED_TOKEN}' },
          },
        ],
      };
      await writeYaml(TEST_CONFIG_FILE, configData);

      await expect(loadConfig(TEST_CONFIG_FILE)).rejects.toThrow(ConfigParseError);
    });

    it('should load config with complex structure', async () => {
      const configData = {
        version: '1.0',
        source: { type: 'kiro', path: '.kiro/specs' },
        targets: [
          {
            name: 'github',
            type: 'github',
            enabled: true,
            syncLevel: 'task',
            config: { owner: 'org', repo: 'repo' },
            mapping: { tasks: 'issue', requirements: 'issue' },
          },
        ],
        notifications: [{ type: 'slack', config: { webhook: 'url' } }],
      };
      await writeYaml(TEST_CONFIG_FILE, configData);

      const config = await loadConfig(TEST_CONFIG_FILE);
      expect(config.source.path).toBe('.kiro/specs');
      expect(config.targets[0].mapping?.tasks).toBe('issue');
      expect(config.notifications).toHaveLength(1);
    });
  });

  describe('validateSyncLevel', () => {
    it('should accept epic syncLevel', () => {
      const result = validateSyncLevel('epic', 'test-target');
      expect(result).toBe('epic');
    });

    it('should accept task syncLevel', () => {
      const result = validateSyncLevel('task', 'test-target');
      expect(result).toBe('task');
    });

    it('should auto-downgrade story to task with warning', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = validateSyncLevel('story', 'test-target');
      expect(result).toBe('task');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("'story' syncLevel is no longer supported")
      );
      consoleSpy.mockRestore();
    });

    it('should throw error for invalid syncLevel', () => {
      expect(() => {
        validateSyncLevel('invalid', 'test-target');
      }).toThrow(ConfigParseError);
      expect(() => {
        validateSyncLevel('invalid', 'test-target');
      }).toThrow(/invalid syncLevel/);
    });

    it('should throw error for missing syncLevel', () => {
      expect(() => {
        validateSyncLevel(undefined, 'test-target');
      }).toThrow(ConfigParseError);
      expect(() => {
        validateSyncLevel(undefined, 'test-target');
      }).toThrow(/missing required field 'syncLevel'/);
    });

    it('should include target name in error message', () => {
      expect(() => {
        validateSyncLevel('invalid', 'my-target');
      }).toThrow(/my-target/);
    });
  });

  describe('validateChannelConfig', () => {
    it('should accept target without channels', () => {
      const target = {
        name: 'test',
        type: 'github',
        enabled: true,
        syncLevel: 'task' as const,
        config: {},
      };
      expect(() => validateChannelConfig(target)).not.toThrow();
    });

    it('should accept target with issue channel enabled', () => {
      const target = {
        name: 'test',
        type: 'github',
        enabled: true,
        syncLevel: 'task' as const,
        config: {},
        channels: {
          issue: { enabled: true },
        },
      };
      expect(() => validateChannelConfig(target)).not.toThrow();
    });

    it('should accept target with project channel enabled', () => {
      const target = {
        name: 'test',
        type: 'github',
        enabled: true,
        syncLevel: 'task' as const,
        config: {},
        channels: {
          project: { enabled: true },
        },
      };
      expect(() => validateChannelConfig(target)).not.toThrow();
    });

    it('should accept target with both channels enabled', () => {
      const target = {
        name: 'test',
        type: 'github',
        enabled: true,
        syncLevel: 'task' as const,
        config: {},
        channels: {
          issue: { enabled: true },
          project: { enabled: true },
        },
      };
      expect(() => validateChannelConfig(target)).not.toThrow();
    });

    it('should throw error when no channel is enabled', () => {
      const target = {
        name: 'test',
        type: 'github',
        enabled: true,
        syncLevel: 'task' as const,
        config: {},
        channels: {
          issue: { enabled: false },
          project: { enabled: false },
        },
      };
      expect(() => validateChannelConfig(target)).toThrow(ConfigParseError);
      expect(() => validateChannelConfig(target)).toThrow(
        /at least one channel.*must be enabled/
      );
    });

    it('should throw error when autoLink is enabled without issue channel', () => {
      const target = {
        name: 'test',
        type: 'github',
        enabled: true,
        syncLevel: 'task' as const,
        config: {},
        channels: {
          project: { enabled: true, autoLink: true },
        },
      };
      expect(() => validateChannelConfig(target)).toThrow(ConfigParseError);
      expect(() => validateChannelConfig(target)).toThrow(
        /autoLink requires both issue and project channels/
      );
    });

    it('should accept autoLink when both channels are enabled', () => {
      const target = {
        name: 'test',
        type: 'github',
        enabled: true,
        syncLevel: 'task' as const,
        config: {},
        channels: {
          issue: { enabled: true },
          project: { enabled: true, autoLink: true },
        },
      };
      expect(() => validateChannelConfig(target)).not.toThrow();
    });

    it('should validate syncLevel in issue channel', () => {
      const target = {
        name: 'test',
        type: 'github',
        enabled: true,
        syncLevel: 'task' as const,
        config: {},
        channels: {
          issue: { enabled: true, syncLevel: 'invalid' as any },
        },
      };
      expect(() => validateChannelConfig(target)).toThrow(ConfigParseError);
    });

    it('should validate syncLevel in project channel', () => {
      const target = {
        name: 'test',
        type: 'github',
        enabled: true,
        syncLevel: 'task' as const,
        config: {},
        channels: {
          project: { enabled: true, syncLevel: 'invalid' as any },
        },
      };
      expect(() => validateChannelConfig(target)).toThrow(ConfigParseError);
    });

    it('should validate groupBy option', () => {
      const target = {
        name: 'test',
        type: 'github',
        enabled: true,
        syncLevel: 'task' as const,
        config: {},
        channels: {
          project: { enabled: true, groupBy: 'invalid' as any },
        },
      };
      expect(() => validateChannelConfig(target)).toThrow(ConfigParseError);
      expect(() => validateChannelConfig(target)).toThrow(/invalid groupBy value/);
    });

    it('should accept valid groupBy values', () => {
      const target1 = {
        name: 'test',
        type: 'github',
        enabled: true,
        syncLevel: 'task' as const,
        config: {},
        channels: {
          project: { enabled: true, groupBy: 'spec' as const },
        },
      };
      expect(() => validateChannelConfig(target1)).not.toThrow();

      const target2 = {
        name: 'test',
        type: 'github',
        enabled: true,
        syncLevel: 'task' as const,
        config: {},
        channels: {
          project: { enabled: true, groupBy: 'none' as const },
        },
      };
      expect(() => validateChannelConfig(target2)).not.toThrow();
    });
  });

  describe('validateConfig with syncLevel', () => {
    it('should accept config with epic syncLevel', () => {
      expect(() => {
        validateConfig({
          version: '1.0',
          source: { type: 'kiro' },
          targets: [
            { name: 'github', type: 'github', enabled: true, syncLevel: 'epic', config: {} },
          ],
        });
      }).not.toThrow();
    });

    it('should accept config with task syncLevel', () => {
      expect(() => {
        validateConfig({
          version: '1.0',
          source: { type: 'kiro' },
          targets: [
            { name: 'github', type: 'github', enabled: true, syncLevel: 'task', config: {} },
          ],
        });
      }).not.toThrow();
    });

    it('should auto-downgrade story syncLevel', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const config: any = {
        version: '1.0',
        source: { type: 'kiro' },
        targets: [
          { name: 'github', type: 'github', enabled: true, syncLevel: 'story', config: {} },
        ],
      };
      validateConfig(config);
      expect(config.targets[0].syncLevel).toBe('task');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should throw error for missing syncLevel', () => {
      expect(() => {
        validateConfig({
          version: '1.0',
          source: { type: 'kiro' },
          targets: [{ name: 'github', type: 'github', enabled: true, config: {} } as any],
        });
      }).toThrow(ConfigParseError);
    });

    it('should validate channel config in targets', () => {
      expect(() => {
        validateConfig({
          version: '1.0',
          source: { type: 'kiro' },
          targets: [
            {
              name: 'github',
              type: 'github',
              enabled: true,
              syncLevel: 'task',
              config: {},
              channels: {
                issue: { enabled: false },
                project: { enabled: false },
              },
            },
          ],
        });
      }).toThrow(ConfigParseError);
    });
  });
});
