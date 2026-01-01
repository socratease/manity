/**
 * Agent SDK - OpenAI Agents SDK Integration
 *
 * This module provides the OpenAI Agents SDK-based implementation
 * for the Momentum project management assistant.
 */

// Export agent
export {
  createProjectManagementAgent,
  defaultAgentConfig,
  type AgentConfig,
} from './agent';

// Export hook
export {
  useAgentRuntime,
  type UseAgentRuntimeProps,
  type UseAgentRuntimeReturn,
} from './useAgentRuntime';

// Export context utilities
export {
  setToolContext,
  getToolContext,
  clearToolContext,
  hasToolContext,
  createToolExecutionContext,
  buildProjectLookup,
  cloneProjectDeep,
  type ToolExecutionContext,
} from './context';

// Export model provider
export { backendModelProvider } from './modelProvider';

// Export all tools
export {
  allTools,
  toolNames,
  type ToolName,
  // Individual tools
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
  // Input types
  CommentInput,
  CreateProjectInput,
  AddTaskInput,
  UpdateTaskInput,
  AddSubtaskInput,
  UpdateSubtaskInput,
  UpdateProjectInput,
  AddPersonInput,
  QueryPortfolioInput,
  SendEmailInput,
} from './tools';

// Export types
export type {
  AgentContext,
  ToolServices,
  AgentExecutionResult,
  HandoffConfig,
} from './types';

// Re-export core types from original agent layer
export type {
  Delta,
  DeltaType,
  Project,
  Task,
  Subtask,
  Activity,
  Person,
  Stakeholder,
  ActionResult,
  ExecutionStatus,
} from '../agent/types';

// Re-export UndoManager (keeping this from original)
export { UndoManager, rollbackDeltas, applyDelta } from '../agent/UndoManager';
