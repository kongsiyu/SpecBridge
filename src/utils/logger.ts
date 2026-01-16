/**
 * Logger utility for SpecBridge
 *
 * This module provides formatted console output with colors and spinners.
 */

import chalk from 'chalk';
import ora, { Ora } from 'ora';

/**
 * 日志级别
 * Log level enumeration
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * 日志器
 * Logger class for formatted console output
 */
export class Logger {
  private level: LogLevel;
  private spinner?: Ora;

  constructor(verbose: boolean = false) {
    this.level = verbose ? LogLevel.DEBUG : LogLevel.INFO;
  }

  /**
   * 信息日志（蓝色）
   * Info log (blue)
   */
  info(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log(chalk.blue('ℹ'), message, ...args);
    }
  }

  /**
   * 警告日志（黄色）
   * Warning log (yellow)
   */
  warn(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.WARN) {
      console.log(chalk.yellow('⚠'), message, ...args);
    }
  }

  /**
   * 错误日志（红色）
   * Error log (red)
   */
  error(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(chalk.red('✖'), message, ...args);
    }
  }

  /**
   * 成功日志（绿色）
   * Success log (green)
   */
  success(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log(chalk.green('✔'), message, ...args);
    }
  }

  /**
   * 调试日志（灰色）
   * Debug log (gray)
   */
  debug(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.log(chalk.gray('⚙'), message, ...args);
    }
  }

  /**
   * 启动加载动画
   * Start spinner animation
   */
  startSpinner(text: string): void {
    this.spinner = ora(text).start();
  }

  /**
   * 停止加载动画（成功）
   * Stop spinner with success
   */
  succeedSpinner(text?: string): void {
    this.spinner?.succeed(text);
  }

  /**
   * 停止加载动画（失败）
   * Stop spinner with failure
   */
  failSpinner(text?: string): void {
    this.spinner?.fail(text);
  }

  /**
   * 设置日志级别
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * 设置详细模式
   * Set verbose mode
   */
  setVerbose(verbose: boolean): void {
    this.level = verbose ? LogLevel.DEBUG : LogLevel.INFO;
  }
}

/**
 * 全局日志器实例
 * Global logger instance
 */
export const logger = new Logger();
