/**
 * Custom error classes for SpecBridge
 *
 * This module defines custom error types for better error handling
 * and user-friendly error messages.
 */

/**
 * SpecBridge 基础错误类
 * Base error class for all SpecBridge errors
 */
export class SpecBridgeError extends Error {
  /** 错误代码 */
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 配置文件未找到错误
 * Error thrown when configuration file is not found
 */
export class ConfigNotFoundError extends SpecBridgeError {
  constructor(path: string) {
    super(`Configuration file not found: ${path}`, 'CONFIG_NOT_FOUND');
  }
}

/**
 * 配置解析错误
 * Error thrown when configuration file cannot be parsed
 */
export class ConfigParseError extends SpecBridgeError {
  constructor(message: string) {
    super(`Failed to parse configuration: ${message}`, 'CONFIG_PARSE_ERROR');
  }
}

/**
 * 认证错误
 * Error thrown when authentication fails
 */
export class AuthenticationError extends SpecBridgeError {
  constructor(platform: string) {
    super(`Authentication failed for ${platform}. Please check your credentials.`, 'AUTH_ERROR');
  }
}

/**
 * API 速率限制错误
 * Error thrown when API rate limit is exceeded
 */
export class RateLimitError extends SpecBridgeError {
  /** 重试等待时间（秒） */
  retryAfter?: number;

  constructor(platform: string, retryAfter?: number) {
    super(
      `Rate limit exceeded for ${platform}.${retryAfter ? ` Retry after ${retryAfter}s` : ''}`,
      'RATE_LIMIT_ERROR'
    );
    this.retryAfter = retryAfter;
  }
}

/**
 * 适配器错误
 * Error thrown when an adapter encounters an error
 */
export class AdapterError extends SpecBridgeError {
  /** 适配器名称 */
  adapterName: string;

  constructor(adapterName: string, message: string) {
    super(`Adapter '${adapterName}' error: ${message}`, 'ADAPTER_ERROR');
    this.adapterName = adapterName;
  }
}
