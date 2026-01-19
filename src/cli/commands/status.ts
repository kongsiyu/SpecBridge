/**
 * Status command for SpecBridge
 *
 * Displays current sync status and history.
 */

import { Command } from 'commander';
import { SyncStateManager } from '../../core/sync-state';
import { logger } from '../../utils/logger';

/**
 * Status command
 *
 * Shows current sync status and synced items.
 */
export const statusCommand = new Command('status')
  .description('Show current sync status')
  .action(async () => {
    try {
      logger.setVerbose(process.argv.includes('--verbose'));

      logger.info('📊 SpecBridge Sync Status\n');

      // Load sync state
      const stateManager = new SyncStateManager();
      await stateManager.load();

      const syncedCount = stateManager.getSyncedCount();
      const allState = stateManager.getAll();

      if (syncedCount === 0) {
        logger.info('No items have been synced yet.');
        logger.info('Run "specbridge sync" to start syncing.');
        return;
      }

      logger.info(`✓ Total synced items: ${syncedCount}\n`);

      // Show synced items
      logger.info('Synced items:');
      Object.entries(allState).forEach(([itemId, syncId]) => {
        logger.info(`  - ${itemId} → ${syncId}`);
      });

      logger.info('\nRun "specbridge sync" to update synced items.');
    } catch (error: any) {
      logger.error(`Failed to get status: ${error.message}`);
      if (process.argv.includes('--verbose')) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });
