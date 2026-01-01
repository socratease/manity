/**
 * Agent Layer (Legacy)
 *
 * This module is deprecated. Use agent-sdk instead.
 * Kept for backwards compatibility - exports types and UndoManager.
 */

// Types - still used by agent-sdk and UI
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

  // Execution types
  ExecutionStatus,
  ActionResult,

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

// Undo Manager - still used by agent-sdk
export {
  UndoManager,
  applyDelta,
  rollbackDeltas,
  createUndoManager,
  getDefaultUndoManager,
} from './UndoManager';

// Context helpers - some utilities still useful
export {
  cloneProjectDeep,
  buildProjectLookup,
} from './context/helpers';
