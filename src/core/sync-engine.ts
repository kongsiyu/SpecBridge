/**
 * Sync engine for SpecBridge
 *
 * This module coordinates the synchronization process between
 * source adapters and target adapters.
 */

import { SourceAdapter } from '../adapters/source/base';
import { TargetAdapter } from '../adapters/target/base';
import { SpecData, SyncResult } from './models';
import { logger } from '../utils/logger';

/**
 * 同步状态
 * Sync status
 */
export interface SyncStatus {
  /** 上次同步时间 */
  lastSync?: string;
  /** 当前状态 */
  status: 'idle' | 'syncing' | 'error';
  /** 同步结果 */
  results?: SyncResult[];
}

/**
 * 同步选项
 * Sync options
 */
export interface SyncOptions {
  /** 同步范围 */
  scope?: 'all' | 'requirements' | 'tasks' | 'single';
  /** 当 scope 为 single 时指定项目 ID */
  itemId?: string;
  /** 仅模拟，不实际同步 */
  dryRun?: boolean;
}

/**
 * 同步引擎
 * Sync engine
 *
 * Coordinates synchronization between source and target adapters.
 * Handles error isolation, history tracking, and scope filtering.
 */
export class SyncEngine {
  private status: SyncStatus;
  private history: SyncResult[];

  constructor() {
    this.status = { status: 'idle' };
    this.history = [];
  }

  /**
   * 执行同步
   * Execute synchronization
   *
   * @param source - Source adapter
   * @param targets - Array of target adapters
   * @param options - Sync options
   * @returns Array of sync results (one per target)
   */
  async sync(
    source: SourceAdapter,
    targets: TargetAdapter[],
    options?: SyncOptions
  ): Promise<SyncResult[]> {
    const opts = options || {};

    try {
      // Update status to syncing
      this.status = { status: 'syncing' };

      logger.debug('Starting sync process...');
      logger.debug(`Source adapter: ${source.name}`);
      logger.debug(`Target adapters: ${targets.map((t) => t.name).join(', ')}`);
      logger.debug(`Options: ${JSON.stringify(opts)}`);

      // Parse spec data from source
      logger.debug('Parsing spec data from source...');
      const specData = await source.parse(opts.itemId || process.cwd());

      // Filter data based on scope
      const filteredData = this.filterByScope(specData, opts);

      logger.debug(
        `Filtered data: ${filteredData.requirements.length} requirements, ${filteredData.tasks.length} tasks`
      );

      // Sync to all targets
      const results: SyncResult[] = [];

      for (const target of targets) {
        try {
          logger.debug(`Syncing to target: ${target.name}`);

          // Sync based on scope
          const targetResults = await this.syncToTarget(target, filteredData, opts);

          results.push(...targetResults);
        } catch (error: any) {
          // Error isolation: single target failure doesn't affect others
          logger.error(`Failed to sync to ${target.name}: ${error.message}`);

          const errorResult: SyncResult = {
            success: false,
            created: 0,
            updated: 0,
            failed: 1,
            changes: [],
            errors: [error.message],
          };

          results.push(errorResult);
        }
      }

      // Update history
      this.history.push(...results);

      // Update status
      const hasErrors = results.some((r) => !r.success);
      this.status = {
        status: hasErrors ? 'error' : 'idle',
        lastSync: new Date().toISOString(),
        results,
      };

      logger.debug('Sync process completed');

      return results;
    } catch (error: any) {
      logger.error(`Sync process failed: ${error.message}`);

      this.status = {
        status: 'error',
        lastSync: new Date().toISOString(),
      };

      throw error;
    }
  }

  /**
   * 同步到单个目标
   * Sync to a single target
   *
   * @param target - Target adapter
   * @param data - Filtered spec data
   * @param options - Sync options
   * @returns Array of sync results
   */
  private async syncToTarget(
    target: TargetAdapter,
    data: SpecData,
    options: SyncOptions
  ): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    // Dry run mode
    if (options.dryRun) {
      logger.info(`[DRY RUN] Would sync to ${target.name}`);
      return [
        {
          success: true,
          created: 0,
          updated: 0,
          failed: 0,
          changes: [],
        },
      ];
    }

    // Sync requirements
    if (
      (options.scope === 'all' || options.scope === 'requirements') &&
      data.requirements.length > 0
    ) {
      logger.debug(`Syncing ${data.requirements.length} requirements...`);
      const result = await target.syncRequirements(data.requirements);
      results.push(result);
    }

    // Sync tasks
    if (
      (options.scope === 'all' || options.scope === 'tasks' || !options.scope) &&
      data.tasks.length > 0
    ) {
      logger.debug(`Syncing ${data.tasks.length} tasks...`);
      const result = await target.syncTasks(data.tasks);
      results.push(result);
    }

    // Sync design (if supported)
    if (options.scope === 'all' && data.design && target.syncDesign) {
      logger.debug('Syncing design document...');
      const result = await target.syncDesign(data.design);
      results.push(result);
    }

    return results;
  }

  /**
   * 根据范围过滤数据
   * Filter data by scope
   *
   * @param data - Original spec data
   * @param options - Sync options
   * @returns Filtered spec data
   */
  private filterByScope(data: SpecData, options: SyncOptions): SpecData {
    const scope = options.scope || 'all';

    if (scope === 'all') {
      return data;
    }

    const filtered: SpecData = {
      meta: data.meta,
      requirements: [],
      tasks: [],
      design: data.design,
    };

    if (scope === 'requirements') {
      filtered.requirements = data.requirements;
    } else if (scope === 'tasks') {
      filtered.tasks = data.tasks;
    } else if (scope === 'single' && options.itemId) {
      // Filter single item
      const req = data.requirements.find((r) => r.id === options.itemId);
      if (req) {
        filtered.requirements = [req];
      }

      const task = data.tasks.find((t) => t.id === options.itemId);
      if (task) {
        filtered.tasks = [task];
      }
    }

    return filtered;
  }

  /**
   * 获取当前同步状态
   * Get current sync status
   *
   * @returns Current sync status
   */
  getStatus(): SyncStatus {
    return { ...this.status };
  }

  /**
   * 获取同步历史
   * Get sync history
   *
   * @returns Array of all sync results
   */
  getHistory(): SyncResult[] {
    return [...this.history];
  }

  /**
   * 清空同步历史
   * Clear sync history
   */
  clearHistory(): void {
    this.history = [];
  }
}
