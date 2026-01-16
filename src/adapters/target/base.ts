/**
 * Base target adapter interface and implementation
 *
 * This module defines the interface that all target adapters must implement.
 * Target adapters are responsible for syncing specification data to
 * project management platforms (GitHub, Jira, etc.).
 */

import { Requirement, Task, Design, SyncResult, TaskStatus } from '../../core/models';

/**
 * 目标适配器接口
 * Target adapter interface
 *
 * All target adapters must implement this interface to be compatible
 * with the SpecBridge sync engine.
 */
export interface TargetAdapter {
  /** 适配器名称 */
  name: string;

  /**
   * 初始化适配器
   * Initialize adapter with configuration
   *
   * @param config - Platform-specific configuration
   */
  init(config: any): Promise<void>;

  /**
   * 同步需求
   * Sync requirements to platform
   *
   * @param requirements - Array of requirements to sync
   * @returns Sync result with statistics
   */
  syncRequirements(requirements: Requirement[]): Promise<SyncResult>;

  /**
   * 同步任务
   * Sync tasks to platform
   *
   * @param tasks - Array of tasks to sync
   * @returns Sync result with statistics
   */
  syncTasks(tasks: Task[]): Promise<SyncResult>;

  /**
   * 同步设计文档（可选）
   * Sync design document to platform (optional)
   *
   * @param design - Design document to sync
   * @returns Sync result with statistics
   */
  syncDesign?(design: Design): Promise<SyncResult>;

  /**
   * 获取任务状态
   * Get task status from platform
   *
   * @param taskId - Task ID
   * @returns Current task status
   */
  getTaskStatus(taskId: string): Promise<TaskStatus>;
}

/**
 * 基础目标适配器抽象类
 * Base target adapter abstract class
 *
 * Provides common functionality for all target adapters.
 * Concrete adapters should extend this class.
 */
export abstract class BaseTargetAdapter implements TargetAdapter {
  abstract name: string;
  protected config: any;

  abstract init(config: any): Promise<void>;
  abstract syncRequirements(requirements: Requirement[]): Promise<SyncResult>;
  abstract syncTasks(tasks: Task[]): Promise<SyncResult>;
  abstract getTaskStatus(taskId: string): Promise<TaskStatus>;

  /**
   * 创建同步结果对象
   * Create a sync result object with default values
   *
   * @returns Empty sync result object
   */
  protected createSyncResult(): SyncResult {
    return {
      success: true,
      created: 0,
      updated: 0,
      failed: 0,
      changes: [],
      errors: [],
    };
  }

  /**
   * 合并同步结果
   * Merge multiple sync results into one
   *
   * @param results - Array of sync results to merge
   * @returns Merged sync result
   */
  protected mergeSyncResults(results: SyncResult[]): SyncResult {
    const merged = this.createSyncResult();

    results.forEach((result) => {
      merged.success = merged.success && result.success;
      merged.created += result.created;
      merged.updated += result.updated;
      merged.failed += result.failed;
      merged.changes.push(...result.changes);
      if (result.errors) {
        merged.errors = merged.errors || [];
        merged.errors.push(...result.errors);
      }
    });

    return merged;
  }

  /**
   * 记录错误到同步结果
   * Add error to sync result
   *
   * @param result - Sync result object
   * @param error - Error message
   */
  protected addError(result: SyncResult, error: string): void {
    result.success = false;
    result.failed++;
    result.errors = result.errors || [];
    result.errors.push(error);
  }
}
