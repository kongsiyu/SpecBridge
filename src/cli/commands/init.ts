/**
 * Init command for SpecBridge
 *
 * Creates a default .specbridge.yaml configuration file.
 */

import { Command } from 'commander';
import * as path from 'path';
import { fileExists, writeFile, readFile } from '../../utils/file';
import { logger } from '../../utils/logger';

const DEFAULT_CONFIG = `# SpecBridge Configuration
# 
# This file configures how SpecBridge syncs your specifications
# to project management platforms.

version: "1.0"

# Source configuration
# Specifies where to read specifications from
source:
  type: kiro
  path: .kiro/specs

# Target configurations
# Specifies where to sync specifications to
targets:
  - name: github-issues
    type: github
    enabled: true
    config:
      owner: your-org
      repo: your-repo
      token: \${GITHUB_TOKEN}
      authMethod: token  # token | gh-cli
      addComments: true  # Add sync comments to issues
    mapping:
      requirements: issue
      tasks: issue

# Optional: Notification configuration
# notifications:
#   - type: slack
#     config:
#       webhook: \${SLACK_WEBHOOK}
#     events:
#       - task_completed
#       - sync_failed
`;

/**
 * Init command
 *
 * Creates a default configuration file and sets up the project.
 */
export const initCommand = new Command('init')
  .description('Initialize SpecBridge configuration')
  .option('-f, --force', 'Overwrite existing configuration')
  .action(async (options) => {
    try {
      const configPath = path.join(process.cwd(), '.specbridge.yaml');

      // Check if config already exists
      if (await fileExists(configPath)) {
        if (!options.force) {
          logger.warn('Configuration file already exists.');
          logger.info('Use --force to overwrite.');
          return;
        }
        logger.info('Overwriting existing configuration...');
      }

      // Write default config
      await writeFile(configPath, DEFAULT_CONFIG);
      logger.success('Configuration file created: .specbridge.yaml');

      // Suggest adding to .gitignore
      const gitignorePath = path.join(process.cwd(), '.gitignore');
      if (await fileExists(gitignorePath)) {
        const gitignoreContent = await readFile(gitignorePath);
        if (!gitignoreContent.includes('.specbridge/')) {
          logger.info('Add .specbridge/ to .gitignore to exclude sync state:');
          logger.info('  echo ".specbridge/" >> .gitignore');
        }
      } else {
        logger.info('Create .gitignore and add:');
        logger.info('  .specbridge/');
      }

      // Show next steps
      logger.info('\nNext steps:');
      logger.info('1. Edit .specbridge.yaml to configure your targets');
      logger.info('2. Set environment variables (e.g., GITHUB_TOKEN)');
      logger.info('3. Run: specbridge sync');
    } catch (error: any) {
      logger.error(`Failed to initialize: ${error.message}`);
      process.exit(1);
    }
  });
