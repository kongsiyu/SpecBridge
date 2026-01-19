#!/usr/bin/env node

/**
 * SpecBridge CLI entry point
 *
 * Main entry point for the SpecBridge command-line interface.
 */

import { Command } from 'commander';
import { initCommand } from './cli/commands/init';
import { syncCommand } from './cli/commands/sync';
import { statusCommand } from './cli/commands/status';
import { logger } from './utils/logger';
import {
  SpecBridgeError,
  ConfigNotFoundError,
  AuthenticationError,
  RateLimitError,
} from './utils/errors';

const program = new Command();

program
  .name('specbridge')
  .description('AI-driven spec to project management platform sync tool')
  .version('0.1.0')
  .option('-v, --verbose', 'Enable verbose logging');

// Register commands
program.addCommand(initCommand);
program.addCommand(syncCommand);
program.addCommand(statusCommand);

// Show help if no command provided
if (process.argv.length === 2) {
  program.help();
}

// Global error handler
function handleError(error: Error): void {
  if (error instanceof ConfigNotFoundError) {
    logger.error('Configuration file not found.');
    logger.info('Run "specbridge init" to create a configuration file.');
  } else if (error instanceof AuthenticationError) {
    logger.error(error.message);
    logger.info('Please check your API tokens in the configuration file.');
  } else if (error instanceof RateLimitError) {
    logger.error(error.message);
    if (error.retryAfter) {
      logger.info(`Please wait ${error.retryAfter} seconds before retrying.`);
    }
  } else if (error instanceof SpecBridgeError) {
    logger.error(`[${error.code}] ${error.message}`);
  } else {
    logger.error('An unexpected error occurred:', error.message);
    if (program.opts().verbose) {
      console.error(error.stack);
    }
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (error: Error) => {
  handleError(error);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  handleError(error);
  process.exit(1);
});

// Parse and execute
try {
  program.parse(process.argv);
} catch (error) {
  handleError(error as Error);
  process.exit(1);
}
