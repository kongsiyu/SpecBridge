/**
 * GitHub target adapter for SpecBridge
 *
 * This adapter syncs specification data to GitHub Issues.
 * Supports both GitHub API token and gh CLI authentication.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { Octokit } from '@octokit/rest';
import { BaseTargetAdapter } from './base';
import { Requirement, Task, SyncResult, TaskStatus, SyncChange } from '../../core/models';
import { AuthenticationError, AdapterError } from '../../utils/errors';
import { logger } from '../../utils/logger';

const execAsync = promisify(exec);

/**
 * GitHub 适配器配置
 * GitHub adapter configuration
 */
export interface GitHubConfig {
  /** 仓库所有者 */
  owner: string;
  /** 仓库名称 */
  repo: string;
  /** GitHub API token (for token auth) */
  token?: string;
  /** 认证方式 */
  authMethod: 'token' | 'gh-cli';
  /** 是否添加同步评论 */
  addComments?: boolean;
}

/**
 * GitHub Issue 信息
 * GitHub Issue information
 */
interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  labels: string[];
  assignee?: string;
}

/**
 * GitHub 适配器
 * GitHub target adapter
 *
 * Syncs tasks and requirements to GitHub Issues.
 * Supports both API token and gh CLI authentication.
 */
export class GitHubAdapter extends BaseTargetAdapter {
  name = 'github';
  private octokit?: Octokit;
  private ghConfig?: GitHubConfig;

  /**
   * 初始化适配器
   * Initialize adapter
   *
   * @param config - GitHub configuration
   */
  async init(config: GitHubConfig): Promise<void> {
    this.ghConfig = config;

    if (config.authMethod === 'token') {
      if (!config.token) {
        throw new AuthenticationError('GitHub: token is required');
      }
      this.octokit = new Octokit({ auth: config.token });
    } else if (config.authMethod === 'gh-cli') {
      // Check if gh CLI is available
      try {
        await execAsync('gh --version');
      } catch {
        throw new AdapterError(this.name, 'gh CLI is not installed or not in PATH');
      }
    }

    // Validate repository access
    await this.validateAccess();
  }

  /**
   * 验证仓库访问权限
   * Validate repository access
   */
  private async validateAccess(): Promise<void> {
    try {
      if (this.octokit) {
        await this.octokit.repos.get({
          owner: this.ghConfig!.owner,
          repo: this.ghConfig!.repo,
        });
      } else {
        await execAsync(`gh repo view ${this.ghConfig!.owner}/${this.ghConfig!.repo}`);
      }
    } catch (error: any) {
      throw new AuthenticationError('GitHub: failed to access repository');
    }
  }

  /**
   * 同步需求
   * Sync requirements
   *
   * @param requirements - Array of requirements
   * @returns Sync result
   */
  async syncRequirements(requirements: Requirement[]): Promise<SyncResult> {
    const result = this.createSyncResult();

    for (const req of requirements) {
      try {
        const existingIssue = await this.findIssueByLabel(`specbridge:req-id:${req.id}`);

        if (existingIssue) {
          // Update existing issue
          await this.updateIssue(existingIssue.number, {
            title: req.title,
            body: this.formatRequirementBody(req),
            labels: this.buildLabels(req.labels, `specbridge:req-id:${req.id}`),
          });
          result.updated++;
        } else {
          // Create new issue
          await this.createIssue({
            title: req.title,
            body: this.formatRequirementBody(req),
            labels: this.buildLabels(req.labels, `specbridge:req-id:${req.id}`),
          });
          result.created++;
        }

        // Record change
        result.changes.push({
          timestamp: new Date().toISOString(),
          action: existingIssue ? 'updated' : 'created',
          itemType: 'requirement',
          itemId: req.id,
        });
      } catch (error: any) {
        this.addError(result, `Failed to sync requirement ${req.id}: ${error.message}`);
      }
    }

    return result;
  }

  /**
   * 同步任务
   * Sync tasks
   *
   * @param tasks - Array of tasks
   * @returns Sync result
   */
  async syncTasks(tasks: Task[]): Promise<SyncResult> {
    const result = this.createSyncResult();

    for (const task of tasks) {
      try {
        const existingIssue = await this.findIssueByLabel(`specbridge:task-id:${task.id}`);

        if (existingIssue) {
          // Detect changes
          const changes = this.detectTaskChanges(existingIssue, task);

          // Update existing issue
          await this.updateIssue(existingIssue.number, {
            title: task.title,
            body: this.formatTaskBody(task),
            state: task.status === TaskStatus.DONE ? 'closed' : 'open',
            labels: this.buildLabels(task.labels, `specbridge:task-id:${task.id}`),
            assignee: task.assignee,
          });

          // Add comment if changes detected
          if (changes.length > 0 && this.ghConfig?.addComments !== false) {
            await this.addComment(existingIssue.number, this.formatChangeComment(changes));
          }

          result.updated++;
        } else {
          // Create new issue
          await this.createIssue({
            title: task.title,
            body: this.formatTaskBody(task),
            state: task.status === TaskStatus.DONE ? 'closed' : 'open',
            labels: this.buildLabels(task.labels, `specbridge:task-id:${task.id}`),
            assignee: task.assignee,
          });
          result.created++;
        }

        // Record change
        result.changes.push({
          timestamp: new Date().toISOString(),
          action: existingIssue ? 'updated' : 'created',
          itemType: 'task',
          itemId: task.id,
        });
      } catch (error: any) {
        this.addError(result, `Failed to sync task ${task.id}: ${error.message}`);
      }
    }

    return result;
  }

  /**
   * 获取任务状态
   * Get task status
   *
   * @param taskId - Task ID
   * @returns Task status
   */
  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    const issue = await this.findIssueByLabel(`specbridge:task-id:${taskId}`);

    if (!issue) {
      return TaskStatus.TODO;
    }

    return issue.state === 'closed' ? TaskStatus.DONE : TaskStatus.TODO;
  }

  /**
   * 查找 Issue
   * Find issue by label
   *
   * @param label - Label to search for
   * @returns Issue if found, undefined otherwise
   */
  private async findIssueByLabel(label: string): Promise<GitHubIssue | undefined> {
    try {
      if (this.octokit) {
        const response = await this.octokit.issues.listForRepo({
          owner: this.ghConfig!.owner,
          repo: this.ghConfig!.repo,
          labels: label,
          state: 'all',
        });

        if (response.data.length > 0) {
          const issue = response.data[0];
          return {
            number: issue.number,
            title: issue.title,
            body: issue.body || '',
            state: issue.state as 'open' | 'closed',
            labels: issue.labels.map((l) => (typeof l === 'string' ? l : l.name)) as string[],
            assignee: issue.assignee?.login,
          };
        }
      } else {
        // Use gh CLI
        const cmd = `gh issue list --repo ${this.ghConfig!.owner}/${this.ghConfig!.repo} --label "${label}" --json number,title,body,state,labels,assignee`;
        const { stdout } = await execAsync(cmd);
        const issues = JSON.parse(stdout);

        if (issues.length > 0) {
          const issue = issues[0];
          return {
            number: issue.number,
            title: issue.title,
            body: issue.body || '',
            state: issue.state,
            labels: issue.labels.map((l: any) => l.name),
            assignee: issue.assignee?.login,
          };
        }
      }
    } catch (error: any) {
      logger.debug(`Failed to find issue with label ${label}: ${error.message}`);
    }

    return undefined;
  }

  /**
   * 创建 Issue
   * Create issue
   *
   * @param options - Issue options
   */
  private async createIssue(options: any): Promise<void> {
    if (this.octokit) {
      await this.octokit.issues.create({
        owner: this.ghConfig!.owner,
        repo: this.ghConfig!.repo,
        title: options.title,
        body: options.body,
        labels: options.labels,
        assignee: options.assignee,
      });
    } else {
      // Use gh CLI
      const cmd = `gh issue create --repo ${this.ghConfig!.owner}/${this.ghConfig!.repo} --title "${options.title}" --body "${options.body.replace(/"/g, '\\"')}" ${
        options.labels.length > 0 ? `--label "${options.labels.join(',')}"` : ''
      } ${options.assignee ? `--assignee "${options.assignee}"` : ''}`;
      await execAsync(cmd);
    }
  }

  /**
   * 更新 Issue
   * Update issue
   *
   * @param issueNumber - Issue number
   * @param options - Update options
   */
  private async updateIssue(issueNumber: number, options: any): Promise<void> {
    if (this.octokit) {
      await this.octokit.issues.update({
        owner: this.ghConfig!.owner,
        repo: this.ghConfig!.repo,
        issue_number: issueNumber,
        title: options.title,
        body: options.body,
        state: options.state,
        labels: options.labels,
        assignee: options.assignee,
      });
    } else {
      // Use gh CLI
      const cmd = `gh issue edit ${issueNumber} --repo ${this.ghConfig!.owner}/${this.ghConfig!.repo} --title "${options.title}" --body "${options.body.replace(/"/g, '\\"')}" ${
        options.state ? `--${options.state}` : ''
      } ${options.labels.length > 0 ? `--label "${options.labels.join(',')}"` : ''} ${
        options.assignee ? `--assignee "${options.assignee}"` : ''
      }`;
      await execAsync(cmd);
    }
  }

  /**
   * 添加评论
   * Add comment to issue
   *
   * @param issueNumber - Issue number
   * @param body - Comment body
   */
  private async addComment(issueNumber: number, body: string): Promise<void> {
    if (this.octokit) {
      await this.octokit.issues.createComment({
        owner: this.ghConfig!.owner,
        repo: this.ghConfig!.repo,
        issue_number: issueNumber,
        body,
      });
    } else {
      // Use gh CLI
      const cmd = `gh issue comment ${issueNumber} --repo ${this.ghConfig!.owner}/${this.ghConfig!.repo} --body "${body.replace(/"/g, '\\"')}"`;
      await execAsync(cmd);
    }
  }

  /**
   * 检测任务变更
   * Detect task changes
   *
   * @param existingIssue - Existing GitHub issue
   * @param task - New task data
   * @returns Array of changes
   */
  private detectTaskChanges(existingIssue: GitHubIssue, task: Task): SyncChange[] {
    const changes: SyncChange[] = [];

    if (existingIssue.title !== task.title) {
      changes.push({
        timestamp: new Date().toISOString(),
        action: 'updated',
        itemType: 'task',
        itemId: task.id,
        changes: [
          {
            field: 'title',
            oldValue: existingIssue.title,
            newValue: task.title,
          },
        ],
      });
    }

    if (existingIssue.assignee !== task.assignee) {
      changes.push({
        timestamp: new Date().toISOString(),
        action: 'updated',
        itemType: 'task',
        itemId: task.id,
        changes: [
          {
            field: 'assignee',
            oldValue: existingIssue.assignee,
            newValue: task.assignee,
          },
        ],
      });
    }

    return changes;
  }

  /**
   * 格式化任务正文
   * Format task body
   *
   * @param task - Task to format
   * @returns Formatted body
   */
  private formatTaskBody(task: Task): string {
    let body = `# ${task.title}\n\n`;

    if (task.description) {
      body += `${task.description}\n\n`;
    }

    body += `**Status:** ${task.status}\n`;

    if (task.assignee) {
      body += `**Assignee:** @${task.assignee}\n`;
    }

    if (task.parentId) {
      body += `**Parent Task:** ${task.parentId}\n`;
    }

    body += `\n---\n*Synced by SpecBridge*`;

    return body;
  }

  /**
   * 格式化需求正文
   * Format requirement body
   *
   * @param req - Requirement to format
   * @returns Formatted body
   */
  private formatRequirementBody(req: Requirement): string {
    let body = `# ${req.title}\n\n`;

    if (req.description) {
      body += `${req.description}\n\n`;
    }

    if (req.priority) {
      body += `**Priority:** ${req.priority}\n`;
    }

    body += `\n---\n*Synced by SpecBridge*`;

    return body;
  }

  /**
   * 构建标签数组
   * Build labels array
   *
   * @param labels - Original labels
   * @param syncLabel - Sync identifier label
   * @returns Array of labels
   */
  private buildLabels(labels?: string[], syncLabel?: string): string[] {
    const result: string[] = [];

    if (labels) {
      result.push(...labels);
    }

    if (syncLabel) {
      result.push(syncLabel);
    }

    return result;
  }

  /**
   * 格式化变更评论
   * Format change comment
   *
   * @param changes - Array of changes
   * @returns Formatted comment
   */
  private formatChangeComment(changes: SyncChange[]): string {
    let comment = '🔄 **Synced by SpecBridge**\n\n';
    comment += `**Time:** ${new Date().toISOString()}\n\n`;
    comment += '**Changes:**\n';

    changes.forEach((change) => {
      if (change.changes) {
        change.changes.forEach((c) => {
          comment += `- **${c.field}:** ${c.oldValue} → ${c.newValue}\n`;
        });
      }
    });

    return comment;
  }
}
