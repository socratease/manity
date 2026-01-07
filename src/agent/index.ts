/**
 * Agent Layer (Legacy)
 *
 * This module is deprecated. Use agent-sdk instead.
 * Kept for backwards compatibility - exports types and UndoManager.
 *
 * Types have been moved to src/types/portfolio.ts
 * UndoManager has been moved to src/lib/UndoManager.ts
 * Helpers have been moved to src/lib/agentHelpers.ts
 */

// Types - re-export from new location
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
} from '../types/portfolio';

// Undo Manager - re-export from new location
export {
  UndoManager,
  applyDelta,
  rollbackDeltas,
  createUndoManager,
  getDefaultUndoManager,
} from '../lib/UndoManager';

// Context helpers - re-export from new location
export {
  cloneProjectDeep,
  buildProjectLookup,
} from '../lib/agentHelpers';
