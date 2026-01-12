/**
 * Tools Index - OpenAI Agents SDK Format
 *
 * Exports all tools and utility functions.
 */

import type { ToolMetadata, ToolCategory } from '../types';

// Export all tools
export { commentTool, CommentInput, type CommentInputType } from './comment';
export { createProjectTool, CreateProjectInput, type CreateProjectInputType } from './createProject';
export { createInitiativeTool, CreateInitiativeInput, type CreateInitiativeInputType } from './createInitiative';
export { addProjectToInitiativeTool, AddProjectToInitiativeInput, type AddProjectToInitiativeInputType } from './addProjectToInitiative';
export { addInitiativeOwnerTool, AddInitiativeOwnerInput, type AddInitiativeOwnerInputType } from './addInitiativeOwner';
export { addTaskTool, AddTaskInput, type AddTaskInputType } from './addTask';
export { updateTaskTool, UpdateTaskInput, type UpdateTaskInputType } from './updateTask';
export { addSubtaskTool, AddSubtaskInput, type AddSubtaskInputType } from './addSubtask';
export { updateSubtaskTool, UpdateSubtaskInput, type UpdateSubtaskInputType } from './updateSubtask';
export { updateProjectTool, UpdateProjectInput, type UpdateProjectInputType } from './updateProject';
export { addStakeholdersTool, AddStakeholdersInput, type AddStakeholdersInputType } from './addStakeholders';
export { addPersonTool, AddPersonInput, type AddPersonInputType } from './addPerson';
export { queryPortfolioTool, QueryPortfolioInput, type QueryPortfolioInputType } from './queryPortfolio';
export { sendEmailTool, SendEmailInput, type SendEmailInputType } from './sendEmail';
export { askUserTool, AskUserInput, type AskUserInputType, ASK_USER_MARKER, isAskUserResponse, parseAskUserResponse } from './askUser';

// Import all tools for the allTools array
import { commentTool } from './comment';
import { createProjectTool } from './createProject';
import { createInitiativeTool } from './createInitiative';
import { addProjectToInitiativeTool } from './addProjectToInitiative';
import { addInitiativeOwnerTool } from './addInitiativeOwner';
import { addTaskTool } from './addTask';
import { updateTaskTool } from './updateTask';
import { addSubtaskTool } from './addSubtask';
import { updateSubtaskTool } from './updateSubtask';
import { updateProjectTool } from './updateProject';
import { addStakeholdersTool } from './addStakeholders';
import { addPersonTool } from './addPerson';
import { queryPortfolioTool } from './queryPortfolio';
import { sendEmailTool } from './sendEmail';
import { askUserTool } from './askUser';

/**
 * All available tools for the agent
 */
export const allTools = [
  commentTool,
  createProjectTool,
  createInitiativeTool,
  addProjectToInitiativeTool,
  addInitiativeOwnerTool,
  addTaskTool,
  updateTaskTool,
  addSubtaskTool,
  updateSubtaskTool,
  updateProjectTool,
  addStakeholdersTool,
  addPersonTool,
  queryPortfolioTool,
  sendEmailTool,
  askUserTool,
];

/**
 * Tool names for reference
 */
export type ToolName =
  | 'comment'
  | 'create_project'
  | 'create_initiative'
  | 'add_project_to_initiative'
  | 'add_initiative_owner'
  | 'add_task'
  | 'update_task'
  | 'add_subtask'
  | 'update_subtask'
  | 'update_project'
  | 'add_stakeholders'
  | 'add_person'
  | 'query_portfolio'
  | 'send_email'
  | 'ask_user';

export const toolNames: ToolName[] = [
  'comment',
  'create_project',
  'create_initiative',
  'add_project_to_initiative',
  'add_initiative_owner',
  'add_task',
  'update_task',
  'add_subtask',
  'update_subtask',
  'update_project',
  'add_stakeholders',
  'add_person',
  'query_portfolio',
  'send_email',
  'ask_user',
];

/**
 * Tool categories for permission handling
 * - safe: Can be executed without confirmation
 * - sensitive: Should show a confirmation prompt
 * - destructive: Requires explicit user approval
 */
export const toolCategories: Record<ToolName, ToolMetadata> = {
  'comment': { name: 'comment', category: 'safe', description: 'Add a comment to a project' },
  'create_project': { name: 'create_project', category: 'safe', description: 'Create a new project' },
  'create_initiative': { name: 'create_initiative', category: 'safe', description: 'Create a new initiative (meta-project)' },
  'add_project_to_initiative': { name: 'add_project_to_initiative', category: 'safe', description: 'Add a project to an initiative' },
  'add_initiative_owner': { name: 'add_initiative_owner', category: 'safe', description: 'Add owners to an initiative' },
  'add_task': { name: 'add_task', category: 'safe', description: 'Add a task to a project' },
  'update_task': { name: 'update_task', category: 'safe', description: 'Update a task' },
  'add_subtask': { name: 'add_subtask', category: 'safe', description: 'Add a subtask to a task' },
  'update_subtask': { name: 'update_subtask', category: 'safe', description: 'Update a subtask' },
  'update_project': { name: 'update_project', category: 'safe', description: 'Update project properties' },
  'add_stakeholders': { name: 'add_stakeholders', category: 'safe', description: 'Add stakeholders to a project' },
  'add_person': { name: 'add_person', category: 'safe', description: 'Add a person to the database' },
  'query_portfolio': { name: 'query_portfolio', category: 'safe', description: 'Query portfolio information' },
  'send_email': { name: 'send_email', category: 'sensitive', requiresConfirmation: true, description: 'Send an email (irreversible)' },
  'ask_user': { name: 'ask_user', category: 'safe', description: 'Ask the user a question' },
};

/**
 * Get tool category
 */
export function getToolCategory(toolName: string): ToolCategory {
  return toolCategories[toolName as ToolName]?.category || 'safe';
}

/**
 * Check if a tool requires confirmation
 */
export function toolRequiresConfirmation(toolName: string): boolean {
  return toolCategories[toolName as ToolName]?.requiresConfirmation || false;
}
