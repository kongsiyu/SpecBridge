/**
 * Status command for SpecBridge
 *
 * Displays current sync status, last sync time, and sync history.
 */

import { Command } from 'commander';
import * as path from 'path';
import { SyncStateManager } from '../../core/sync-state';
import { logger } from '../../utils/logger';
import { fileExists, readFile } from '../../utils/file';

/**
 * Status command
 *
 * Shows current sync status, last sync time, and summary of synced items.
 */
export const statusCommand = new Command('status')
  .description('Show current sync status and history')
  .action(async () => {
    try {
      logger.setVerbose(process.argv.includes('--verbose'));

      logger.info('\n📊 SpecBridge Sync Status\n');

      // Load sync state
      const stateManager = new SyncStateManager();
      await stateManager.load();

      const syncedCount = stateManager.getSyncedCount();
      const syncState = stateManager.getAll();

      // Display sync state summary
      logger.info('Synced Items:');
      if (syncedCount === 0) {
        logger.info('  No items have been synced yet.');
      } else {
        logger.info(`  Total: ${syncedCount} items`);

        // Show synced items in verbose mode
        if (process.argv.includes('--verbose')) {
          logger.debug('\n  Synced items:');
          Object.entries(syncState).forEach(([itemId, syncId]) => {
            logger.debug(`    - ${itemId} → ${syncId}`);
          });
        }
      }

      // Try to read sync history from .specbridge directory
      const syncHistoryPath = path.join(process.cwd(), '.specbridge', 'sync-history.json');
      let lastSyncTime: string | undefined;
      let syncHistory: any[] = [];

      if (await fileExists(syncHistoryPath)) {
        try {
          const historyContent = await readFile(syncHistoryPath);
          syncHistory = JSON.parse(historyContent);

          if (syncHistory.length > 0) {
            // Get the most recent sync
            const lastSync = syncHistory[syncHistory.length - 1];
            lastSyncTime = lastSync.timestamp;

            if (lastSyncTime) {
              logger.info('\nLast Sync:');
              logger.info(`  Time: ${new Date(lastSyncTime).toLocaleString()}`);
              logger.info(`  Status: ${lastSync.status || 'completed'}`);

              if (lastSync.summary) {
                logger.info(`  Created: ${lastSync.summary.created || 0}`);
                logger.info(`  Updated: ${lastSync.summary.updated || 0}`);
                logger.info(`  Failed: ${lastSync.summary.failed || 0}`);
              }
            }
          }
        } catch (error: any) {
          logger.debug(`Failed to read sync history: ${error.message}`);
        }
      }

      // Display sync history summary
      if (syncHistory.length > 0) {
        logger.info('\nSync History Summary:');
        logger.info(`  Total syncs: ${syncHistory.length}`);

        if (process.argv.includes('--verbose')) {
          logger.debug('\n  Recent syncs:');
          syncHistory.slice(-5).forEach((sync, index) => {
            const syncTime = new Date(sync.timestamp).toLocaleString();
            const status = sync.status || 'completed';
            logger.debug(`    ${index + 1}. ${syncTime} - ${status}`);
          });
        }
      } else {
        logger.info('\nSync History:');
        logger.info('  No sync history available.');
      }

      // Display configuration status
      const configPath = path.join(process.cwd(), '.specbridge.yaml');
      logger.info('\nConfiguration:');
      if (await fileExists(configPath)) {
        logger.info(`  ✓ Configuration file found: .specbridge.yaml`);
      } else {
        logger.warn(`  ✗ Configuration file not found: .specbridge.yaml`);
        logger.info('  Run "specbridge init" to create a configuration file.');
      }

      // Display .specbridge directory status
      const specbridgeDir = path.join(process.cwd(), '.specbridge');
      if (await fileExists(specbridgeDir)) {
        logger.info(`  ✓ State directory found: .specbridge/`);
      } else {
        logger.info(`  ℹ State directory not found: .specbridge/`);
      }

      logger.info('');
    } catch (error: any) {
      logger.error(`Failed to get status: ${error.message}`);
      if (process.argv.includes('--verbose')) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });
