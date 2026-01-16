/**
 * Sync state management for SpecBridge
 *
 * This module manages the persistence of sync state, tracking which
 * items have been synced to which platforms and their corresponding IDs.
 */

import * as path from 'path';
import { fileExists, readFile, writeFile, ensureDir } from '../utils/file';

/**
 * 同步状态映射
 * Sync state map
 *
 * Maps item IDs to their synced platform IDs
 * Format: { "task-1": "123", "req-1": "456" }
 */
export interface SyncStateMap {
  [itemId: string]: string;
}

/**
 * 同步状态管理器
 * Sync state manager
 *
 * Manages persistence of sync state to track which items
 * have been synced and their corresponding platform IDs.
 */
export class SyncStateManager {
  private stateFilePath: string;
  private state: SyncStateMap;

  /**
   * 创建同步状态管理器
   * Create sync state manager
   *
   * @param projectRoot - Project root directory (defaults to current working directory)
   */
  constructor(projectRoot?: string) {
    const root = projectRoot || process.cwd();
    this.stateFilePath = path.join(root, '.specbridge', 'sync-state.json');
    this.state = {};
  }

  /**
   * 加载同步状态
   * Load sync state from file
   *
   * @returns Sync state map
   */
  async load(): Promise<SyncStateMap> {
    try {
      if (await fileExists(this.stateFilePath)) {
        const content = await readFile(this.stateFilePath);
        this.state = JSON.parse(content);
      } else {
        this.state = {};
      }
    } catch (error: any) {
      // If file is corrupted or invalid, start with empty state
      this.state = {};
    }

    return this.state;
  }

  /**
   * 保存同步状态
   * Save sync state to file
   */
  async save(): Promise<void> {
    // Ensure directory exists
    const dir = path.dirname(this.stateFilePath);
    await ensureDir(dir);

    // Write state to file
    const content = JSON.stringify(this.state, null, 2);
    await writeFile(this.stateFilePath, content);
  }

  /**
   * 获取同步 ID
   * Get sync ID for an item
   *
   * @param itemId - Item ID (e.g., "task-1", "req-1")
   * @returns Sync ID if exists, undefined otherwise
   */
  getSyncId(itemId: string): string | undefined {
    return this.state[itemId];
  }

  /**
   * 设置同步 ID
   * Set sync ID for an item
   *
   * @param itemId - Item ID (e.g., "task-1", "req-1")
   * @param syncId - Platform-specific sync ID (e.g., GitHub Issue number)
   */
  setSyncId(itemId: string, syncId: string): void {
    this.state[itemId] = syncId;
  }

  /**
   * 移除同步 ID
   * Remove sync ID for an item
   *
   * @param itemId - Item ID to remove
   */
  removeSyncId(itemId: string): void {
    delete this.state[itemId];
  }

  /**
   * 获取所有同步状态
   * Get all sync state
   *
   * @returns Complete sync state map
   */
  getAll(): SyncStateMap {
    return { ...this.state };
  }

  /**
   * 清空所有同步状态
   * Clear all sync state
   */
  clear(): void {
    this.state = {};
  }

  /**
   * 检查项目是否已同步
   * Check if an item has been synced
   *
   * @param itemId - Item ID to check
   * @returns True if item has been synced
   */
  hasSynced(itemId: string): boolean {
    return itemId in this.state;
  }

  /**
   * 获取已同步项目数量
   * Get count of synced items
   *
   * @returns Number of synced items
   */
  getSyncedCount(): number {
    return Object.keys(this.state).length;
  }
}
