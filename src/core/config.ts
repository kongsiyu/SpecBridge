/**
 * Configuration management for SpecBridge
 *
 * This module handles loading, validating, and managing YAML configuration files.
 */

import * as path from 'path';
import { readYaml, fileExists } from '../utils/file';
import { ConfigNotFoundError, ConfigParseError } from '../utils/errors';

/**
 * 源配置
 * Source adapter configuration
 */
export interface SourceConfig {
  /** 适配器类型（kiro/openspec/custom） */
  type: string;
  /** 规格文档路径（可选，自动检测） */
  path?: string;
  /** 自定义插件路径 */
  plugin?: string;
}

/**
 * 目标配置
 * Target adapter configuration
 */
export interface TargetConfig {
  /** 目标名称 */
  name: string;
  /** 适配器类型（github/jira/custom） */
  type: string;
  /** 是否启用 */
  enabled: boolean;
  /** 平台特定配置 */
  config: any;
  /** 映射配置 */
  mapping?: {
    /** 需求映射类型 */
    requirements?: string;
    /** 任务映射类型 */
    tasks?: string;
    /** 设计映射类型 */
    design?: string;
  };
  /** 自定义插件路径 */
  plugin?: string;
}

/**
 * 通知配置
 * Notification configuration
 */
export interface NotificationConfig {
  /** 通知类型（slack/email） */
  type: string;
  /** 通知配置 */
  config: any;
  /** 监听的事件 */
  events?: string[];
}

/**
 * 主配置
 * Main configuration
 */
export interface Config {
  /** 配置版本 */
  version: string;
  /** 源配置 */
  source: SourceConfig;
  /** 目标配置数组 */
  targets: TargetConfig[];
  /** 通知配置（可选） */
  notifications?: NotificationConfig[];
}

/**
 * 支持的配置版本
 */
const SUPPORTED_VERSIONS = ['1.0'];

/**
 * 默认配置文件名
 */
const DEFAULT_CONFIG_FILE = '.specbridge.yaml';

/**
 * 加载配置文件
 * Load configuration file
 *
 * @param configPath - Path to configuration file (defaults to .specbridge.yaml)
 * @returns Parsed configuration object
 * @throws ConfigNotFoundError if file doesn't exist
 * @throws ConfigParseError if configuration is invalid
 */
export async function loadConfig(configPath?: string): Promise<Config> {
  const filePath = configPath || path.join(process.cwd(), DEFAULT_CONFIG_FILE);

  // Check if file exists
  if (!(await fileExists(filePath))) {
    throw new ConfigNotFoundError(filePath);
  }

  try {
    // Read and parse YAML
    const config = await readYaml<Config>(filePath);

    // Replace environment variables
    const processedConfig = replaceEnvVarsInConfig(config);

    // Validate configuration
    validateConfig(processedConfig);

    return processedConfig;
  } catch (error: any) {
    if (error instanceof ConfigNotFoundError) {
      throw error;
    }
    throw new ConfigParseError(error.message);
  }
}

/**
 * 验证配置
 * Validate configuration
 *
 * @param config - Configuration object to validate
 * @throws ConfigParseError if configuration is invalid
 */
export function validateConfig(config: Config): void {
  // Check version
  if (!config.version) {
    throw new ConfigParseError('Missing required field: version');
  }

  if (!SUPPORTED_VERSIONS.includes(config.version)) {
    throw new ConfigParseError(
      `Unsupported version: ${config.version}. Supported versions: ${SUPPORTED_VERSIONS.join(', ')}`
    );
  }

  // Check source
  if (!config.source) {
    throw new ConfigParseError('Missing required field: source');
  }

  if (!config.source.type) {
    throw new ConfigParseError('Missing required field: source.type');
  }

  // Check targets
  if (!config.targets || !Array.isArray(config.targets)) {
    throw new ConfigParseError('Missing or invalid field: targets (must be an array)');
  }

  if (config.targets.length === 0) {
    throw new ConfigParseError('At least one target must be configured');
  }

  // Validate each target
  config.targets.forEach((target, index) => {
    if (!target.name) {
      throw new ConfigParseError(`Target ${index}: missing required field 'name'`);
    }

    if (!target.type) {
      throw new ConfigParseError(`Target ${index}: missing required field 'type'`);
    }

    if (typeof target.enabled !== 'boolean') {
      throw new ConfigParseError(`Target ${index}: 'enabled' must be a boolean`);
    }

    if (!target.config) {
      throw new ConfigParseError(`Target ${index}: missing required field 'config'`);
    }
  });
}

/**
 * 替换环境变量
 * Replace environment variables in a string
 *
 * Replaces ${VAR_NAME} with the value of process.env.VAR_NAME
 *
 * @param value - String containing ${VAR} placeholders
 * @returns String with environment variables replaced
 */
export function replaceEnvVars(value: string): string {
  return value.replace(/\$\{([^}]+)\}/g, (_match, varName) => {
    const envValue = process.env[varName];
    if (envValue === undefined) {
      throw new ConfigParseError(`Environment variable ${varName} is not defined`);
    }
    return envValue;
  });
}

/**
 * 递归替换配置对象中的环境变量
 * Recursively replace environment variables in configuration object
 *
 * @param obj - Configuration object
 * @returns Configuration object with environment variables replaced
 */
function replaceEnvVarsInConfig(obj: any): any {
  if (typeof obj === 'string') {
    return replaceEnvVars(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => replaceEnvVarsInConfig(item));
  }

  if (obj !== null && typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = replaceEnvVarsInConfig(obj[key]);
      }
    }
    return result;
  }

  return obj;
}
