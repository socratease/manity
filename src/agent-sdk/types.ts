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
  /** Current initiatives state */
  initiatives: import('../types/portfolio').Initiative[];
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
  /** Create an initiative in the database */
  createInitiative: (initiative: Partial<import('../types/portfolio').Initiative>) => Promise<import('../types/portfolio').Initiative>;
  /** Add a project to an initiative */
  addProjectToInitiative: (initiativeId: string, projectId: string | number) => Promise<import('../types/portfolio').Initiative>;
  /** Add an owner to an initiative */
  addOwnerToInitiative: (initiativeId: string, personId: string | number) => Promise<import('../types/portfolio').Initiative>;
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

/**
 * Thinking step during agent execution
 */
export interface ThinkingStep {
  id: string;
  type: 'reasoning' | 'planning' | 'tool_call' | 'tool_result' | 'user_question';
  content: string;
  timestamp: number;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolResult?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'awaiting_user';
}

/**
 * Question from the agent to the user
 */
export interface UserQuestion {
  id: string;
  question: string;
  context?: string;
  options?: string[];
  timestamp: number;
}

/**
 * Execution state for tracking agent progress
 */
export interface ExecutionState {
  status: 'idle' | 'running' | 'awaiting_user' | 'completed' | 'error';
  thinkingSteps: ThinkingStep[];
  pendingQuestion?: UserQuestion;
  error?: string;
}

/**
 * Tool category for permission handling
 */
export type ToolCategory = 'safe' | 'sensitive' | 'destructive';

/**
 * Metadata about a tool
 */
export interface ToolMetadata {
  name: string;
  category: ToolCategory;
  requiresConfirmation?: boolean;
  description?: string;
}

/**
 * Callback for streaming updates during execution
 */
export interface ExecutionCallbacks {
  onThinkingStep?: (step: ThinkingStep) => void;
  onUserQuestion?: (question: UserQuestion) => Promise<string>;
  onToolStart?: (toolName: string, input: Record<string, unknown>) => void;
  onToolComplete?: (toolName: string, result: string) => void;
}

/**
 * Extended result with thinking steps
 */
export interface AgentExecutionResultWithThinking extends AgentExecutionResult {
  thinkingSteps: ThinkingStep[];
  pendingQuestion?: UserQuestion;
}
