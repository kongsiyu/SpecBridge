/**
 * Kiro source adapter for SpecBridge
 *
 * This adapter reads and parses Kiro specification documents
 * (requirements.md, design.md, tasks.md) and converts them to
 * the unified SpecData format.
 */

import * as path from 'path';
import * as fs from 'fs';
import matter from 'gray-matter';
import { BaseSourceAdapter } from './base';
import { SpecData, Requirement, Task, Design, TaskStatus } from '../../core/models';
import { fileExists, readFile } from '../../utils/file';
import { AdapterError } from '../../utils/errors';

/**
 * Kiro 源适配器
 * Kiro source adapter
 *
 * Reads Kiro specification documents from .kiro/specs directory
 * and converts them to unified SpecData format.
 */
export class KiroAdapter extends BaseSourceAdapter {
  name = 'kiro';

  /**
   * 检测是否为 Kiro 规格目录
   * Detect if path contains Kiro specifications
   *
   * @param specPath - Path to check
   * @returns True if Kiro specs are found
   */
  detect(specPath: string): boolean {
    const kiroPath = path.join(specPath, '.kiro', 'specs');
    try {
      return fs.existsSync(kiroPath);
    } catch {
      return false;
    }
  }

  /**
   * 解析 Kiro 规格文档
   * Parse Kiro specification documents
   *
   * @param specPath - Path to specification directory (e.g., .kiro/specs/feature-name)
   * @returns Parsed specification data
   */
  async parse(specPath: string): Promise<SpecData> {
    try {
      const specName = path.basename(specPath);

      // Read three files
      const requirementsPath = path.join(specPath, 'requirements.md');
      const designPath = path.join(specPath, 'design.md');
      const tasksPath = path.join(specPath, 'tasks.md');

      // Check if at least one file exists
      const hasRequirements = await fileExists(requirementsPath);
      const hasDesign = await fileExists(designPath);
      const hasTasks = await fileExists(tasksPath);

      if (!hasRequirements && !hasDesign && !hasTasks) {
        throw new Error(`No specification files found in ${specPath}`);
      }

      // Parse each file
      const requirements = await this.parseRequirements(requirementsPath);
      const design = await this.parseDesign(designPath);
      const tasks = await this.parseTasks(tasksPath);

      // Build SpecData
      const specData: SpecData = {
        meta: {
          name: specName,
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        requirements,
        design,
        tasks,
      };

      this.validateSpecData(specData);
      return specData;
    } catch (error: any) {
      throw new AdapterError(this.name, `Failed to parse Kiro spec: ${error.message}`);
    }
  }

  /**
   * 解析 requirements.md
   * Parse requirements.md file
   *
   * @param filePath - Path to requirements.md
   * @returns Array of requirements
   */
  private async parseRequirements(filePath: string): Promise<Requirement[]> {
    if (!(await fileExists(filePath))) {
      return [];
    }

    const content = await readFile(filePath);
    const { content: markdown } = matter(content);

    const requirements: Requirement[] = [];

    // Match requirement sections: ### 需求 1: Title
    const reqPattern = /###?\s+需求\s+(\d+)[：:]\s*(.+?)$/gm;
    let match;

    while ((match = reqPattern.exec(markdown)) !== null) {
      const id = `req-${match[1]}`;
      const title = match[2].trim();

      // Extract description (content until next heading)
      const startIndex = match.index + match[0].length;
      const nextHeading = markdown.indexOf('###', startIndex);
      const description = markdown
        .substring(startIndex, nextHeading > 0 ? nextHeading : undefined)
        .trim();

      requirements.push({
        id,
        title,
        description,
      });
    }

    return requirements;
  }

  /**
   * 解析 design.md
   * Parse design.md file
   *
   * @param filePath - Path to design.md
   * @returns Design document or undefined
   */
  private async parseDesign(filePath: string): Promise<Design | undefined> {
    if (!(await fileExists(filePath))) {
      return undefined;
    }

    const content = await readFile(filePath);
    const { content: markdown } = matter(content);

    return {
      content: markdown,
    };
  }

  /**
   * 解析 tasks.md
   * Parse tasks.md file
   *
   * @param filePath - Path to tasks.md
   * @returns Array of tasks
   */
  private async parseTasks(filePath: string): Promise<Task[]> {
    if (!(await fileExists(filePath))) {
      return [];
    }

    const content = await readFile(filePath);
    const tasks: Task[] = [];

    // Match task lines: - [ ] 1.1 Task title (@assignee)
    // Status: [ ] = todo, [x] = done, [-] = in_progress
    const taskPattern = /^-\s+\[([ x-])\]\s+(\d+(?:\.\d+)?)\s+(.+?)(?:\s+\(@(\w+)\))?$/gm;
    let match;

    while ((match = taskPattern.exec(content)) !== null) {
      const statusChar = match[1];
      const taskId = match[2];
      const title = match[3].trim();
      const assignee = match[4];

      // Map status
      let status: TaskStatus;
      if (statusChar === 'x') {
        status = TaskStatus.DONE;
      } else if (statusChar === '-') {
        status = TaskStatus.IN_PROGRESS;
      } else {
        status = TaskStatus.TODO;
      }

      tasks.push({
        id: taskId,
        title,
        status,
        assignee,
      });
    }

    return tasks;
  }
}
