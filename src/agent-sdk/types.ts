/**
 * Agent SDK Types
 *
 * Re-exports core types from the original agent layer and adds SDK-specific types.
 */

// Re-export all data types from original agent
export type {
  Delta,
  DeltaType,
  BaseDelta,
  RemoveProjectDelta,
  RemoveActivityDelta,
  RemoveTaskDelta,
  RestoreTaskDelta,
  RemoveSubtaskDelta,
  RestoreSubtaskDelta,
  RestoreProjectDelta,
  Project,
  Task,
  Subtask,
  Activity,
  Person,
  Stakeholder,
  StakeholderEntry,
  PortfolioSummary,
  ConversationMessage,
  ExecutionStatus,
  ActionResult,
} from '../agent/types';

/**
 * Context for agent execution
 */
export interface AgentContext {
  /** User's message/request */
  userMessage: string;
  /** Current portfolio state */
  projects: import('../agent/types').Project[];
  /** People database */
  people: import('../agent/types').Person[];
  /** Logged-in user */
  loggedInUser: string;
  /** Conversation history */
  conversationHistory?: import('../agent/types').ConversationMessage[];
}

/**
 * Services available to tools during execution
 */
export interface ToolServices {
  /** Create a person in the database */
  createPerson: (person: Partial<import('../agent/types').Person>) => Promise<import('../agent/types').Person>;
  /** Send an email */
  sendEmail: (params: { recipients: string[]; subject: string; body: string }) => Promise<void>;
  /** Build portfolio context for queries */
  buildThrustContext: () => import('../agent/types').PortfolioSummary[];
}

/**
 * Result from agent execution
 */
export interface AgentExecutionResult {
  /** LLM response text */
  response: string;
  /** All deltas produced during execution */
  deltas: import('../agent/types').Delta[];
  /** Updated projects state */
  workingProjects: import('../agent/types').Project[];
  /** IDs of entities that were modified */
  updatedEntityIds: (string | number)[];
  /** Action results for UI display */
  actionResults: import('../agent/types').ActionResult[];
}

/**
 * Handoff description for sub-agents
 */
export interface HandoffConfig {
  name: string;
  description: string;
}
