/**
 * Base source adapter interface and implementation
 *
 * This module defines the interface that all source adapters must implement.
 * Source adapters are responsible for reading and parsing specification documents
 * from various sources and converting them to the unified SpecData format.
 */

import { SpecData } from '../../core/models';

/**
 * 源适配器接口
 * Source adapter interface
 *
 * All source adapters must implement this interface to be compatible
 * with the SpecBridge sync engine.
 */
export interface SourceAdapter {
  /** 适配器名称 */
  name: string;

  /**
   * 检测是否可以处理指定路径
   * Detect if this adapter can handle the given path
   *
   * @param path - Path to specification documents
   * @returns True if adapter can handle this path
   */
  detect(path: string): boolean;

  /**
   * 解析规格文档
   * Parse specification documents
   *
   * @param path - Path to specification documents
   * @returns Parsed specification data
   */
  parse(path: string): Promise<SpecData>;

  /**
   * 监听文件变化（可选）
   * Watch for file changes (optional)
   *
   * @param path - Path to specification documents
   * @param callback - Callback function called when changes are detected
   */
  watch?(path: string, callback: (data: SpecData) => void): void;
}

/**
 * 基础源适配器抽象类
 * Base source adapter abstract class
 *
 * Provides common functionality for all source adapters.
 * Concrete adapters should extend this class.
 */
export abstract class BaseSourceAdapter implements SourceAdapter {
  abstract name: string;
  abstract detect(path: string): boolean;
  abstract parse(path: string): Promise<SpecData>;

  /**
   * 验证解析结果
   * Validate parsed specification data
   *
   * @param data - Specification data to validate
   * @throws Error if data is invalid
   */
  protected validateSpecData(data: SpecData): void {
    // Validate meta
    if (!data.meta || !data.meta.name) {
      throw new Error('Invalid SpecData: missing meta.name');
    }

    if (!data.meta.version) {
      throw new Error('Invalid SpecData: missing meta.version');
    }

    if (!data.meta.createdAt) {
      throw new Error('Invalid SpecData: missing meta.createdAt');
    }

    if (!data.meta.updatedAt) {
      throw new Error('Invalid SpecData: missing meta.updatedAt');
    }

    // Validate requirements
    if (!Array.isArray(data.requirements)) {
      throw new Error('Invalid SpecData: requirements must be an array');
    }

    // Validate tasks
    if (!Array.isArray(data.tasks)) {
      throw new Error('Invalid SpecData: tasks must be an array');
    }

    // Validate each requirement
    data.requirements.forEach((req, index) => {
      if (!req.id) {
        throw new Error(`Invalid requirement at index ${index}: missing id`);
      }
      if (!req.title) {
        throw new Error(`Invalid requirement at index ${index}: missing title`);
      }
      if (!req.description) {
        throw new Error(`Invalid requirement at index ${index}: missing description`);
      }
    });

    // Validate each task
    data.tasks.forEach((task, index) => {
      if (!task.id) {
        throw new Error(`Invalid task at index ${index}: missing id`);
      }
      if (!task.title) {
        throw new Error(`Invalid task at index ${index}: missing title`);
      }
      if (!task.status) {
        throw new Error(`Invalid task at index ${index}: missing status`);
      }
    });
  }
}
