/**
 * Core data models for SpecBridge
 *
 * This module defines the unified data model used across all adapters.
 * All source adapters convert their input to SpecData format,
 * and all target adapters consume SpecData format.
 */

/**
 * 规格元数据
 * Metadata for a specification document
 */
export interface SpecMeta {
  /** 规格名称（如 "user-authentication"） */
  name: string;
  /** 版本号（如 "1.0.0"） */
  version: string;
  /** ISO 8601 时间戳 */
  createdAt: string;
  /** ISO 8601 时间戳 */
  updatedAt: string;
}

/**
 * 任务状态枚举
 * Task status enumeration
 */
export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
  BLOCKED = 'blocked',
}

/**
 * 需求定义
 * Requirement definition
 */
export interface Requirement {
  /** 唯一标识符 */
  id: string;
  /** 需求标题 */
  title: string;
  /** 需求描述 */
  description: string;
  /** 优先级（high/medium/low） */
  priority?: string;
  /** 标签数组 */
  labels?: string[];
  /** 同步到目标平台的 ID（如 GitHub Issue #123） */
  syncId?: string;
}

/**
 * 任务定义
 * Task definition
 */
export interface Task {
  /** 唯一标识符 */
  id: string;
  /** 任务标题 */
  title: string;
  /** 任务描述 */
  description?: string;
  /** 任务状态 */
  status: TaskStatus;
  /** 负责人 */
  assignee?: string;
  /** 父任务 ID（用于子任务） */
  parentId?: string;
  /** 标签数组 */
  labels?: string[];
  /** 同步到目标平台的 ID */
  syncId?: string;
  /** 所属 Spec 名称（自动从文件路径提取，如 "user-authentication"） */
  specName?: string;
  /** 所属 Spec 路径（如 ".kiro/specs/user-authentication"） */
  specPath?: string;
}

/**
 * Epic 状态模型
 * Epic status model
 * 
 * 用于追踪 Epic（Spec）的整体完成状态和进度
 * Tracks the overall completion status and progress of an Epic (Spec)
 */
export interface EpicStatus {
  /** Epic 状态（todo: 全部待办, in_progress: 进行中或部分完成, done: 全部完成） */
  status: 'todo' | 'in_progress' | 'done';
  /** 完成进度百分比（0-100） */
  progress: number;
  /** 任务总数 */
  total: number;
  /** 已完成任务数 */
  completed: number;
  /** 进行中任务数 */
  inProgress: number;
  /** 待办任务数 */
  todo: number;
}

/**
 * 设计文档
 * Design document
 */
export interface Design {
  /** 设计文档的完整内容（Markdown） */
  content: string;
  /** 可选的结构化章节 */
  sections?: {
    [key: string]: string;
  };
}

/**
 * 同步变更记录
 * Sync change record
 */
export interface SyncChange {
  /** ISO 8601 时间戳 */
  timestamp: string;
  /** 操作类型 */
  action: 'created' | 'updated' | 'closed';
  /** 项目类型 */
  itemType: 'requirement' | 'task' | 'design';
  /** 项目 ID */
  itemId: string;
  /** 具体变更内容 */
  changes?: {
    /** 变更字段 */
    field: string;
    /** 旧值 */
    oldValue?: any;
    /** 新值 */
    newValue?: any;
  }[];
}

/**
 * 同步结果
 * Sync result
 */
export interface SyncResult {
  /** 是否成功 */
  success: boolean;
  /** 创建数量 */
  created: number;
  /** 更新数量 */
  updated: number;
  /** 失败数量 */
  failed: number;
  /** 变更详情 */
  changes: SyncChange[];
  /** 错误消息 */
  errors?: string[];
}

/**
 * 规格数据（顶层容器）
 * Specification data (top-level container)
 *
 * This is the unified data model that all adapters use.
 * Source adapters parse their input and convert to this format.
 * Target adapters consume this format and sync to their platforms.
 */
export interface SpecData {
  /** 规格元数据 */
  meta: SpecMeta;
  /** 需求列表 */
  requirements: Requirement[];
  /** 设计文档（可选） */
  design?: Design;
  /** 任务列表 */
  tasks: Task[];
  /** Epic 标题（通常为 Spec 名称） */
  epicTitle: string;
  /** Epic 描述（存储 requirements.md 的完整内容） */
  epicDescription: string;
  /** Epic 状态（根据任务完成情况自动计算） */
  epicStatus?: EpicStatus;
}
