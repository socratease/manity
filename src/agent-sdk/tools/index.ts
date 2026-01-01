/**
 * Tools Index - OpenAI Agents SDK Format
 *
 * Exports all tools and utility functions.
 */

// Export all tools
export { commentTool, CommentInput, type CommentInputType } from './comment';
export { createProjectTool, CreateProjectInput, type CreateProjectInputType } from './createProject';
export { addTaskTool, AddTaskInput, type AddTaskInputType } from './addTask';
export { updateTaskTool, UpdateTaskInput, type UpdateTaskInputType } from './updateTask';
export { addSubtaskTool, AddSubtaskInput, type AddSubtaskInputType } from './addSubtask';
export { updateSubtaskTool, UpdateSubtaskInput, type UpdateSubtaskInputType } from './updateSubtask';
export { updateProjectTool, UpdateProjectInput, type UpdateProjectInputType } from './updateProject';
export { addPersonTool, AddPersonInput, type AddPersonInputType } from './addPerson';
export { queryPortfolioTool, QueryPortfolioInput, type QueryPortfolioInputType } from './queryPortfolio';
export { sendEmailTool, SendEmailInput, type SendEmailInputType } from './sendEmail';

// Import all tools for the allTools array
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

/**
 * All available tools for the agent
 */
export const allTools = [
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
 * Tool names for reference
 */
export type ToolName =
  | 'comment'
  | 'create_project'
  | 'add_task'
  | 'update_task'
  | 'add_subtask'
  | 'update_subtask'
  | 'update_project'
  | 'add_person'
  | 'query_portfolio'
  | 'send_email';

export const toolNames: ToolName[] = [
  'comment',
  'create_project',
  'add_task',
  'update_task',
  'add_subtask',
  'update_subtask',
  'update_project',
  'add_person',
  'query_portfolio',
  'send_email',
];
