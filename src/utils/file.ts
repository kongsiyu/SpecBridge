/**
 * File utility functions for SpecBridge
 *
 * This module provides safe file operations with unified error handling.
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

/**
 * 检查文件是否存在
 * Check if a file exists
 *
 * @param filePath - Path to the file
 * @returns True if file exists, false otherwise
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 读取文件内容
 * Read file content as string
 *
 * @param filePath - Path to the file
 * @returns File content as string
 * @throws Error if file cannot be read
 */
export async function readFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error: any) {
    throw new Error(`Failed to read file ${filePath}: ${error.message}`);
  }
}

/**
 * 写入文件内容
 * Write content to file
 *
 * @param filePath - Path to the file
 * @param content - Content to write
 * @throws Error if file cannot be written
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  try {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error: any) {
    throw new Error(`Failed to write file ${filePath}: ${error.message}`);
  }
}

/**
 * 读取 YAML 文件
 * Read and parse YAML file
 *
 * @param filePath - Path to the YAML file
 * @returns Parsed YAML content
 * @throws Error if file cannot be read or parsed
 */
export async function readYaml<T = any>(filePath: string): Promise<T> {
  try {
    const content = await readFile(filePath);
    return yaml.parse(content) as T;
  } catch (error: any) {
    throw new Error(`Failed to parse YAML file ${filePath}: ${error.message}`);
  }
}

/**
 * 写入 YAML 文件
 * Serialize and write YAML file
 *
 * @param filePath - Path to the YAML file
 * @param data - Data to serialize
 * @throws Error if file cannot be written
 */
export async function writeYaml(filePath: string, data: any): Promise<void> {
  try {
    const content = yaml.stringify(data);
    await writeFile(filePath, content);
  } catch (error: any) {
    throw new Error(`Failed to write YAML file ${filePath}: ${error.message}`);
  }
}

/**
 * 确保目录存在
 * Ensure directory exists, create if not
 *
 * @param dirPath - Path to the directory
 * @throws Error if directory cannot be created
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}
