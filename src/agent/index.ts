/**
 * Agent Layer
 *
 * Main entry point for the agent module.
 * Exports all public types, classes, and utilities.
 */

// Types
export type {
  // Delta types
  DeltaType,
  Delta,
  BaseDelta,
  RemoveProjectDelta,
  RemoveActivityDelta,
  RemoveTaskDelta,
  RestoreTaskDelta,
  RemoveSubtaskDelta,
  RestoreSubtaskDelta,
  RestoreProjectDelta,

  // Tool types
  ToolName,
  ToolMetadata,
  ToolInputSchema,
  ToolResult,
  ToolContext,
  ToolContextHelpers,
  ToolContextServices,
  ToolDefinition,

  // Input types
  ToolInput,
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

  // Execution types
  ExecutionStatus,
  ExecutionEvent,
  ExecutionLog,

  // Planning types
  PlanStep,
  ToolCall,
  Plan,

  // Agent types
  AgentConstraints,
  AgentContext,
  AgentRuntimeConfig,
  AgentResult,
  ActionResult,
  StopReason,

  // Data types
  Stakeholder,
  StakeholderEntry,
  Activity,
  Subtask,
  Task,
  Project,
  Person,
  PortfolioSummary,
  ConversationMessage,
} from './types';

// Tool Registry
export {
  ToolRegistry,
  validateToolInput,
  getDefaultRegistry,
  createRegistry,
} from './ToolRegistry';

// Tools
export {
  allTools,
  registerAllTools,
  createToolRegistry,
  supportedActionTypes,
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
} from './tools';

// Context helpers
export {
  resolveProject,
  resolveTask,
  resolveSubtask,
  findPersonByName,
  cloneProjectDeep,
  generateActivityId,
  generateTaskId,
  generateSubtaskId,
  generateProjectId,
  syncProjectActivity,
  normalizeStakeholderEntry,
  normalizeStakeholderList,
  describeDueDate,
  buildProjectLookup,
  createHelpers,
} from './context/helpers';

// Undo Manager
export {
  UndoManager,
  applyDelta,
  rollbackDeltas,
  createUndoManager,
  getDefaultUndoManager,
} from './UndoManager';

// Planner
export {
  Planner,
  planningResponseSchema,
  legacyResponseSchema,
  parsePlanningResponse,
  convertLegacyActionsToPlan,
  responseToPlan,
  createNoOpPlan,
  validatePlan,
  buildPlanningSystemPrompt,
  createPlanner,
} from './Planner';

// Tool Selector
export {
  ToolSelector,
  createToolSelector,
} from './ToolSelector';
export type { SelectionResult } from './ToolSelector';

// Agent Runtime
export {
  AgentRuntime,
  defaultConstraints,
  createAgentRuntime,
  createDefaultAgentRuntime,
} from './AgentRuntime';
