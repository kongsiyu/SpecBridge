/**
 * Sync command for SpecBridge
 *
 * Executes synchronization of specifications to target platforms.
 */

import { Command } from 'commander';
import { loadConfig } from '../../core/config';
import { SyncEngine, SyncOptions } from '../../core/sync-engine';
import { SyncStateManager } from '../../core/sync-state';
import { KiroAdapter } from '../../adapters/source/kiro';
import { GitHubAdapter } from '../../adapters/target/github';
import { logger } from '../../utils/logger';

/**
 * Sync command
 *
 * Syncs specifications from source to configured targets.
 */
export const syncCommand = new Command('sync')
  .description('Sync specifications to project management platforms')
  .option('--scope <type>', 'Sync scope: all|requirements|tasks|single', 'all')
  .option('--id <id>', 'Item ID when scope is single')
  .option('--dry-run', 'Simulate sync without making changes')
  .action(async (options) => {
    try {
      logger.setVerbose(process.argv.includes('--verbose'));

      // Load configuration
      logger.startSpinner('Loading configuration...');
      const config = await loadConfig();
      logger.succeedSpinner('Configuration loaded');

      // Initialize source adapter
      logger.debug('Initializing source adapter...');
      let sourceAdapter;

      if (config.source.type === 'kiro') {
        sourceAdapter = new KiroAdapter();
      } else {
        throw new Error(`Unsupported source adapter: ${config.source.type}`);
      }

      // Initialize target adapters
      logger.debug('Initializing target adapters...');
      const targetAdapters: any[] = [];

      for (const targetConfig of config.targets) {
        if (!targetConfig.enabled) {
          logger.debug(`Skipping disabled target: ${targetConfig.name}`);
          continue;
        }

        if (targetConfig.type === 'github') {
          const adapter = new GitHubAdapter();
          await adapter.init(targetConfig.config);
          targetAdapters.push(adapter);
        } else {
          logger.warn(`Unsupported target adapter: ${targetConfig.type}`);
        }
      }

      if (targetAdapters.length === 0) {
        logger.error('No enabled target adapters found');
        process.exit(1);
      }

      // Prepare sync options
      const syncOptions: SyncOptions = {
        scope: options.scope as any,
        itemId: options.id,
        dryRun: options.dryRun,
      };

      // Execute sync
      logger.startSpinner('Syncing specifications...');
      const syncEngine = new SyncEngine();
      const results = await syncEngine.sync(sourceAdapter, targetAdapters, syncOptions);
      logger.succeedSpinner('Sync completed');

      // Display results
      logger.info('\n📊 Sync Results:');

      let totalCreated = 0;
      let totalUpdated = 0;
      let totalFailed = 0;

      results.forEach((result, index) => {
        const targetName = targetAdapters[index]?.name || `Target ${index}`;
        logger.info(`\n${targetName}:`);
        logger.info(`  ✓ Created: ${result.created}`);
        logger.info(`  ↻ Updated: ${result.updated}`);
        logger.info(`  ✗ Failed: ${result.failed}`);

        totalCreated += result.created;
        totalUpdated += result.updated;
        totalFailed += result.failed;

        // Show errors if any
        if (result.errors && result.errors.length > 0) {
          logger.warn('  Errors:');
          result.errors.forEach((error) => {
            logger.warn(`    - ${error}`);
          });
        }

        // Show changes in verbose mode
        if (process.argv.includes('--verbose') && result.changes.length > 0) {
          logger.debug('  Changes:');
          result.changes.forEach((change) => {
            logger.debug(`    - ${change.action}: ${change.itemType} ${change.itemId}`);
          });
        }
      });

      // Summary
      logger.info('\n📈 Summary:');
      logger.info(`  Total Created: ${totalCreated}`);
      logger.info(`  Total Updated: ${totalUpdated}`);
      logger.info(`  Total Failed: ${totalFailed}`);

      // Update sync state
      if (!options.dryRun) {
        logger.debug('Updating sync state...');
        const stateManager = new SyncStateManager();
        await stateManager.load();

        results.forEach((result) => {
          result.changes.forEach((change) => {
            if (change.action === 'created' || change.action === 'updated') {
              // In a real implementation, we would store the platform ID
              // For now, just mark as synced
              stateManager.setSyncId(change.itemId, change.itemId);
            }
          });
        });

        await stateManager.save();
      }

      // Exit with appropriate code
      if (totalFailed > 0) {
        process.exit(1);
      }
    } catch (error: any) {
      logger.error(`Sync failed: ${error.message}`);
      if (process.argv.includes('--verbose')) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });
