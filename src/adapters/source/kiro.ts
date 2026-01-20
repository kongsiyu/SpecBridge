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
   * @param specPath - Path to specification directory (.kiro/specs or .kiro/specs/feature-name)
   * @returns Parsed specification data (merged from all specs if directory contains multiple)
   */
  async parse(specPath: string): Promise<SpecData> {
    try {
      // Resolve the actual specs path
      let specsDir = specPath;

      // If specPath is a project root, look for .kiro/specs
      if (!specsDir.includes('.kiro')) {
        specsDir = path.join(specPath, '.kiro', 'specs');
      }

      // Check if specsDir exists
      if (!fs.existsSync(specsDir)) {
        throw new Error(`Specifications directory not found: ${specsDir}`);
      }

      // Check if this is a single spec directory or a specs container
      const entries = fs.readdirSync(specsDir, { withFileTypes: true });
      const hasSpecFiles = entries.some(
        (e) => e.isFile() && ['requirements.md', 'design.md', 'tasks.md'].includes(e.name)
      );

      let specDirs: string[] = [];

      if (hasSpecFiles) {
        // This is a single spec directory
        specDirs = [specsDir];
      } else {
        // This is a specs container, find all subdirectories with spec files
        specDirs = entries
          .filter((e) => e.isDirectory())
          .map((e) => path.join(specsDir, e.name))
          .filter((dir) => {
            const files = fs.readdirSync(dir);
            return files.some((f) => ['requirements.md', 'design.md', 'tasks.md'].includes(f));
          });
      }

      if (specDirs.length === 0) {
        throw new Error(`No specification files found in ${specsDir}`);
      }

      // Parse all specs and merge them
      const allRequirements: Requirement[] = [];
      const allTasks: Task[] = [];
      let mergedDesign: Design | undefined;
      let epicDescription = '';

      for (const specDir of specDirs) {
        const specName = path.basename(specDir);

        // Read three files
        const requirementsPath = path.join(specDir, 'requirements.md');
        const designPath = path.join(specDir, 'design.md');
        const tasksPath = path.join(specDir, 'tasks.md');

        // Read complete requirements.md content for Epic description
        if (await fileExists(requirementsPath)) {
          const requirementsContent = await readFile(requirementsPath);
          // If multiple specs, concatenate with separator
          if (epicDescription) {
            epicDescription += '\n\n---\n\n';
          }
          epicDescription += requirementsContent;
        }

        // Parse each file
        const requirements = await this.parseRequirements(requirementsPath);
        const design = await this.parseDesign(designPath);
        const tasks = await this.parseTasks(tasksPath);

        // Add spec name prefix to IDs to avoid conflicts
        const prefixedRequirements = requirements.map((r) => ({
          ...r,
          id: `${specName}:${r.id}`,
        }));

        // Add spec name prefix to IDs and auto-fill spec information
        const prefixedTasks = tasks.map((t) => ({
          ...t,
          id: `${specName}:${t.id}`,
          specName: specName,
          specPath: specDir,
        }));

        allRequirements.push(...prefixedRequirements);
        allTasks.push(...prefixedTasks);

        if (design && !mergedDesign) {
          mergedDesign = design;
        }
      }

      // Build SpecData
      const specData: SpecData = {
        meta: {
          name: path.basename(specsDir),
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        requirements: allRequirements,
        design: mergedDesign,
        tasks: allTasks,
        epicTitle: this.formatEpicTitle(path.basename(specsDir)),
        epicDescription: epicDescription,
      };

      this.validateSpecData(specData);
      return specData;
    } catch (error: any) {
      throw new AdapterError(this.name, `Failed to parse Kiro spec: ${error.message}`);
    }
  }

  /**
   * 格式化 Epic 标题
   * Format Epic title from kebab-case to readable format
   *
   * @param specName - Spec name in kebab-case (e.g., "user-authentication")
   * @returns Formatted title (e.g., "User Authentication")
   */
  private formatEpicTitle(specName: string): string {
    // Convert kebab-case to Title Case
    return specName
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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

    // Match task lines with two formats:
    // Format 1: - [ ] 1.1 Task title (@assignee)
    // Format 2: - [ ] 1. Task title (@assignee)
    // Status: [ ] = todo, [x] = done, [-] = in_progress
    const taskPattern = /^-\s+\[([ x-~])\](?:\*|\\\*)?\s+(\d+(?:\.\d+)?)\.\s+(.+?)(?:\s+\(@(\w+)\))?$/gm;
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
      } else if (statusChar === '~') {
        status = TaskStatus.TODO; // Queued status maps to TODO for now
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
