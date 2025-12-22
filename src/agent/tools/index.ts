/**
 * Tools Index
 *
 * Exports all tool definitions and provides a function to register all tools.
 */

import type { ToolDefinition } from '../types';
import { ToolRegistry } from '../ToolRegistry';

// Import all tools
import { commentTool } from './comment';
import { createProjectTool } from './createProject';
import { addTaskTool } from './addTask';
import { updateTaskTool } from './updateTask';
import { addSubtaskTool } from './addSubtask';
import { updateSubtaskTool } from './updateSubtask';
import { updateProjectTool } from './updateProject';
import { addPersonTool } from './addPerson';
import { queryPortfolioTool } from './queryPortfolio';
import { sendEmailTool } from './sendEmail';

// Export individual tools
export {
  commentTool,
  createProjectTool,
  addTaskTool,
  updateTaskTool,
  addSubtaskTool,
  updateSubtaskTool,
  updateProjectTool,
  addPersonTool,
  queryPortfolioTool,
  sendEmailTool,
};

/**
 * All available tool definitions.
 */
export const allTools: ToolDefinition[] = [
  commentTool,
  createProjectTool,
  addTaskTool,
  updateTaskTool,
  addSubtaskTool,
  updateSubtaskTool,
  updateProjectTool,
  addPersonTool,
  queryPortfolioTool,
  sendEmailTool,
];

/**
 * Register all tools with a registry.
 */
export function registerAllTools(registry: ToolRegistry): void {
  registry.registerAll(allTools);
}

/**
 * Create a new registry with all tools registered.
 */
export function createToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  registerAllTools(registry);
  return registry;
}

/**
 * Supported action types (matches existing supportedMomentumActions).
 */
export const supportedActionTypes = allTools.map(t => t.name);
