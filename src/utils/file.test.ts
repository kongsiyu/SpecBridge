/**
 * Unit tests for file utility functions
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import { promises as fs } from 'fs';
import {
  fileExists,
  readFile,
  writeFile,
  readYaml,
  writeYaml,
  ensureDir,
} from './file';

const TEST_DIR = path.join(process.cwd(), '.test-temp');
const TEST_FILE = path.join(TEST_DIR, 'test.txt');
const TEST_YAML_FILE = path.join(TEST_DIR, 'test.yaml');

describe('File Utilities', () => {
  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      await writeFile(TEST_FILE, 'test content');
      const exists = await fileExists(TEST_FILE);
      expect(exists).toBe(true);
    });

    it('should return false for non-existing file', async () => {
      const exists = await fileExists(path.join(TEST_DIR, 'non-existent.txt'));
      expect(exists).toBe(false);
    });

    it('should return false for non-existing directory', async () => {
      const exists = await fileExists(path.join(TEST_DIR, 'non-existent-dir'));
      expect(exists).toBe(false);
    });
  });

  describe('readFile', () => {
    it('should read file content', async () => {
      const content = 'test content';
      await writeFile(TEST_FILE, content);
      const result = await readFile(TEST_FILE);
      expect(result).toBe(content);
    });

    it('should read file with multiple lines', async () => {
      const content = 'line1\nline2\nline3';
      await writeFile(TEST_FILE, content);
      const result = await readFile(TEST_FILE);
      expect(result).toBe(content);
    });

    it('should throw error for non-existing file', async () => {
      await expect(readFile(path.join(TEST_DIR, 'non-existent.txt'))).rejects.toThrow(
        'Failed to read file'
      );
    });

    it('should read empty file', async () => {
      await writeFile(TEST_FILE, '');
      const result = await readFile(TEST_FILE);
      expect(result).toBe('');
    });
  });

  describe('writeFile', () => {
    it('should write content to file', async () => {
      const content = 'test content';
      await writeFile(TEST_FILE, content);
      const result = await readFile(TEST_FILE);
      expect(result).toBe(content);
    });

    it('should create parent directories', async () => {
      const nestedFile = path.join(TEST_DIR, 'nested', 'deep', 'file.txt');
      const content = 'nested content';
      await writeFile(nestedFile, content);
      const result = await readFile(nestedFile);
      expect(result).toBe(content);
    });

    it('should overwrite existing file', async () => {
      await writeFile(TEST_FILE, 'old content');
      await writeFile(TEST_FILE, 'new content');
      const result = await readFile(TEST_FILE);
      expect(result).toBe('new content');
    });

    it('should write empty string', async () => {
      await writeFile(TEST_FILE, '');
      const result = await readFile(TEST_FILE);
      expect(result).toBe('');
    });

    it('should write unicode content', async () => {
      const content = '你好世界 🌍';
      await writeFile(TEST_FILE, content);
      const result = await readFile(TEST_FILE);
      expect(result).toBe(content);
    });
  });

  describe('readYaml', () => {
    it('should read and parse YAML file', async () => {
      const yamlContent = 'name: test\nversion: 1.0\n';
      await writeFile(TEST_YAML_FILE, yamlContent);
      const result = await readYaml(TEST_YAML_FILE);
      expect(result).toEqual({ name: 'test', version: 1.0 });
    });

    it('should parse YAML with arrays', async () => {
      const yamlContent = 'items:\n  - name: item1\n  - name: item2\n';
      await writeFile(TEST_YAML_FILE, yamlContent);
      const result = await readYaml(TEST_YAML_FILE);
      expect(result).toEqual({
        items: [{ name: 'item1' }, { name: 'item2' }],
      });
    });

    it('should parse YAML with nested objects', async () => {
      const yamlContent = 'config:\n  source:\n    type: kiro\n    path: .kiro/specs\n';
      await writeFile(TEST_YAML_FILE, yamlContent);
      const result = await readYaml(TEST_YAML_FILE);
      expect(result).toEqual({
        config: {
          source: {
            type: 'kiro',
            path: '.kiro/specs',
          },
        },
      });
    });

    it('should throw error for non-existing file', async () => {
      await expect(readYaml(path.join(TEST_DIR, 'non-existent.yaml'))).rejects.toThrow(
        'Failed to parse YAML file'
      );
    });

    it('should throw error for invalid YAML', async () => {
      const invalidYaml = 'invalid: yaml: content:';
      await writeFile(TEST_YAML_FILE, invalidYaml);
      await expect(readYaml(TEST_YAML_FILE)).rejects.toThrow('Failed to parse YAML file');
    });

    it('should parse empty YAML file', async () => {
      await writeFile(TEST_YAML_FILE, '');
      const result = await readYaml(TEST_YAML_FILE);
      expect(result).toBeNull();
    });
  });

  describe('writeYaml', () => {
    it('should write YAML file', async () => {
      const data = { name: 'test', version: '1.0' };
      await writeYaml(TEST_YAML_FILE, data);
      const result = await readYaml(TEST_YAML_FILE);
      expect(result).toEqual(data);
    });

    it('should write YAML with arrays', async () => {
      const data = {
        items: [{ name: 'item1' }, { name: 'item2' }],
      };
      await writeYaml(TEST_YAML_FILE, data);
      const result = await readYaml(TEST_YAML_FILE);
      expect(result).toEqual(data);
    });

    it('should write YAML with nested objects', async () => {
      const data = {
        config: {
          source: {
            type: 'kiro',
            path: '.kiro/specs',
          },
        },
      };
      await writeYaml(TEST_YAML_FILE, data);
      const result = await readYaml(TEST_YAML_FILE);
      expect(result).toEqual(data);
    });

    it('should overwrite existing YAML file', async () => {
      await writeYaml(TEST_YAML_FILE, { old: 'data' });
      await writeYaml(TEST_YAML_FILE, { new: 'data' });
      const result = await readYaml(TEST_YAML_FILE);
      expect(result).toEqual({ new: 'data' });
    });

    it('should write empty object', async () => {
      await writeYaml(TEST_YAML_FILE, {});
      const result = await readYaml(TEST_YAML_FILE);
      expect(result).toEqual({});
    });
  });

  describe('ensureDir', () => {
    it('should create directory', async () => {
      const newDir = path.join(TEST_DIR, 'new-dir');
      await ensureDir(newDir);
      const exists = await fileExists(newDir);
      expect(exists).toBe(true);
    });

    it('should create nested directories', async () => {
      const nestedDir = path.join(TEST_DIR, 'a', 'b', 'c');
      await ensureDir(nestedDir);
      const exists = await fileExists(nestedDir);
      expect(exists).toBe(true);
    });

    it('should not fail if directory already exists', async () => {
      const dir = path.join(TEST_DIR, 'existing-dir');
      await ensureDir(dir);
      await ensureDir(dir); // Should not throw
      const exists = await fileExists(dir);
      expect(exists).toBe(true);
    });
  });
});
