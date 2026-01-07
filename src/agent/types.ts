/**
 * Agent Layer Core Types
 *
 * Defines the interfaces for tools, execution events, deltas, and the agent runtime.
 */

// =============================================================================
// Delta Types (for undo capability)
// =============================================================================

export type DeltaType =
  | 'remove_project'
  | 'remove_activity'
  | 'remove_task'
  | 'restore_task'
  | 'remove_subtask'
  | 'restore_subtask'
  | 'restore_project';

export interface BaseDelta {
  type: DeltaType;
  projectId: string | number;
}

export interface RemoveProjectDelta extends BaseDelta {
  type: 'remove_project';
}

export interface RemoveActivityDelta extends BaseDelta {
  type: 'remove_activity';
  activityId: string;
}

export interface RemoveTaskDelta extends BaseDelta {
  type: 'remove_task';
  taskId: string;
}

export interface RestoreTaskDelta extends BaseDelta {
  type: 'restore_task';
  taskId: string;
  previous: Record<string, unknown>;
}

export interface RemoveSubtaskDelta extends BaseDelta {
  type: 'remove_subtask';
  taskId: string;
  subtaskId: string;
}

export interface RestoreSubtaskDelta extends BaseDelta {
  type: 'restore_subtask';
  taskId: string;
  subtaskId: string;
  previous: Record<string, unknown>;
}

export interface RestoreProjectDelta extends BaseDelta {
  type: 'restore_project';
  previous: {
    name?: string;
    description?: string;
    executiveUpdate?: string;
    status?: string;
    priority?: string;
    progress?: number;
    targetDate?: string;
    startDate?: string;
    lastUpdate?: string;
    stakeholders?: Stakeholder[];
  };
}

export type Delta =
  | RemoveProjectDelta
  | RemoveActivityDelta
  | RemoveTaskDelta
  | RestoreTaskDelta
  | RemoveSubtaskDelta
  | RestoreSubtaskDelta
  | RestoreProjectDelta;

// =============================================================================
// Tool Types
// =============================================================================

export type ToolName =
  | 'comment'
  | 'create_project'
  | 'add_task'
  | 'update_task'
  | 'add_subtask'
  | 'update_subtask'
  | 'update_project'
  | 'add_stakeholders'
  | 'add_person'
  | 'query_portfolio'
  | 'send_email';

export interface ToolMetadata {
  /** Whether this tool mutates state */
  mutatesState: boolean;
  /** Whether this tool only reads state */
  readsState: boolean;
  /** Whether this tool has external side effects (e.g., sending email) */
  sideEffecting: boolean;
  /** Whether this tool requires user confirmation before execution */
  requiresConfirmation: boolean;
  /** Tags for categorization and selection */
  tags: string[];
}

export interface ToolInputSchema {
  type: 'object';
  properties: Record<string, {
    type: string;
    description?: string;
    enum?: string[];
    items?: { type: string };
    required?: boolean;
  }>;
  required?: string[];
}

export interface ToolResult {
  /** Short label for the action (displayed in UI) */
  label: string;
  /** Detailed description of what happened */
  detail: string;
  /** Reversible deltas for undo capability */
  deltas: Delta[];
  /** IDs of entities that were modified */
  updatedEntityIds: (string | number)[];
  /** Observations to feed back into next planning step */
  observations: Record<string, unknown>;
  /** Status of execution */
  status: 'success' | 'skipped' | 'error';
  /** Error message if status is 'error' */
  error?: string;
}

export interface ToolContext {
  /** Current projects state */
  projects: Project[];
  /** Working copy of projects (mutable during execution) */
  workingProjects: Project[];
  /** Project lookup map for name/ID resolution */
  projectLookup: Map<string, string | number>;
  /** People database */
  people: Person[];
  /** Currently logged-in user */
  loggedInUser: string;
  /** Utility functions */
  helpers: ToolContextHelpers;
  /** External services */
  services: ToolContextServices;
}

export interface ToolContextHelpers {
  /** Resolve a project by ID or name */
  resolveProject: (target: string | number | undefined) => Project | null;
  /** Resolve a task within a project by ID or title */
  resolveTask: (project: Project | null, target: string | undefined) => Task | null;
  /** Find a person by name */
  findPersonByName: (name: string) => Person | null;
  /** Clone a project deeply */
  cloneProjectDeep: (project: Project) => Project;
  /** Generate a unique activity ID */
  generateActivityId: () => string;
  /** Sync project activity (recalculate lastUpdate, etc.) */
  syncProjectActivity: (project: Project, activities?: Activity[]) => Project;
  /** Normalize stakeholder list */
  normalizeStakeholderList: (stakeholders: StakeholderEntry[]) => Stakeholder[];
  /** Describe a due date for display */
  describeDueDate: (date: string | undefined) => string;
}

export interface ToolContextServices {
  /** Create a person in the database */
  createPerson: (person: Partial<Person>) => Promise<Person>;
  /** Send an email */
  sendEmail: (params: { recipients: string[]; subject: string; body: string }) => Promise<void>;
  /** Build thrust context for query_portfolio */
  buildThrustContext: () => PortfolioSummary[];
}

export interface ToolDefinition {
  /** Tool name - must map to existing action types */
  name: ToolName;
  /** Human-readable description */
  description: string;
  /** JSON schema for input validation */
  inputSchema: ToolInputSchema;
  /** Metadata for tool selection */
  metadata: ToolMetadata;
  /** Execute the tool */
  execute: (ctx: ToolContext, input: ToolInput) => Promise<ToolResult>;
}

// =============================================================================
// Execution Types
// =============================================================================

export type ExecutionStatus = 'pending' | 'in_progress' | 'success' | 'failure' | 'skipped' | 'blocked';

export interface ExecutionEvent {
  /** Step index in the execution sequence */
  stepIndex: number;
  /** Tool that was executed */
  toolName: ToolName;
  /** Input provided to the tool */
  toolInput: ToolInput;
  /** Timestamp of execution */
  timestamp: string;
  /** Short label for display */
  label: string;
  /** Detailed description */
  detail: string;
  /** Reversible deltas for undo */
  deltas: Delta[];
  /** Execution status */
  status: ExecutionStatus;
  /** Error message if failed */
  error?: string;
  /** Observations from execution */
  observations?: Record<string, unknown>;
  /** Entity IDs that were updated */
  updatedEntityIds: (string | number)[];
}

export interface ExecutionLog {
  /** Unique ID for this execution */
  id: string;
  /** User message that triggered execution */
  userMessage: string;
  /** All execution events */
  events: ExecutionEvent[];
  /** Overall status */
  status: ExecutionStatus;
  /** Start timestamp */
  startedAt: string;
  /** End timestamp */
  completedAt?: string;
  /** Final observations */
  finalObservations?: Record<string, unknown>;
}

// =============================================================================
// Planning Types
// =============================================================================

export interface PlanStep {
  /** Human-readable rationale for this step */
  rationale: string;
  /** Tool call candidates for this step */
  toolCandidates: ToolCall[];
  /** Whether this step requires user confirmation */
  requiresConfirmation: boolean;
  /** Conditions that would stop execution at this step */
  stopIf?: string[];
}

export interface ToolCall {
  /** Name of the tool to call */
  toolName: ToolName;
  /** Input for the tool */
  input: ToolInput;
}

export interface Plan {
  /** Goal of this plan */
  goal: string;
  /** Ordered steps to achieve the goal */
  steps: PlanStep[];
  /** Whether the plan is complete or needs refinement */
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'blocked';
}

// =============================================================================
// Agent Runtime Types
// =============================================================================

export interface AgentConstraints {
  /** Maximum steps to execute (default: 5) */
  maxSteps: number;
  /** Whether side-effecting tools are allowed */
  allowSideEffects: boolean;
  /** Whether to require confirmation for mutating tools */
  requireConfirmation: boolean;
  /** Tools to exclude from selection */
  excludeTools?: ToolName[];
}

export interface AgentContext {
  /** User's message/request */
  userMessage: string;
  /** Current portfolio state */
  projects: Project[];
  /** People database */
  people: Person[];
  /** Current view context (optional) */
  currentView?: string;
  /** Logged-in user */
  loggedInUser: string;
  /** Conversation history */
  conversationHistory?: ConversationMessage[];
}

export interface AgentRuntimeConfig {
  /** Constraints for execution */
  constraints: AgentConstraints;
  /** Callback for streaming events */
  onEvent?: (event: ExecutionEvent) => void;
  /** Callback for plan updates */
  onPlanUpdate?: (plan: Plan) => void;
}

export interface AgentResult {
  /** Execution log with all events */
  executionLog: ExecutionLog;
  /** Final plan (may have been refined during execution) */
  plan: Plan;
  /** Aggregated deltas for undo */
  deltas: Delta[];
  /** Updated entity IDs */
  updatedEntityIds: (string | number)[];
  /** Human-readable response */
  response: string;
  /** Action results for UI display */
  actionResults: ActionResult[];
}

export interface ActionResult {
  type: ToolName;
  label: string;
  detail?: string;
  deltas: Delta[];
  status: ExecutionStatus;
  error?: string;
  undone?: boolean;
}

export type StopReason =
  | 'success'           // Plan completed successfully
  | 'blocked'           // Requires confirmation or missing data
  | 'safety'            // Tool is side-effecting and not allowed
  | 'max_steps'         // Maximum steps reached
  | 'error';            // Tool execution failed

// =============================================================================
// Data Types (from existing codebase)
// =============================================================================

export interface Stakeholder {
  name: string;
  team?: string;
  email?: string;
}

export interface StakeholderEntry {
  name: string;
  team?: string;
}

export interface Activity {
  id: string;
  date: string;
  note: string;
  author: string;
}

export interface Subtask {
  id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'completed';
  dueDate?: string;
  completedDate?: string;
  assignee?: { name: string; team?: string } | null;
}

export interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'completed';
  dueDate?: string;
  completedDate?: string;
  assignee?: { name: string; team?: string } | null;
  subtasks: Subtask[];
}

export interface Project {
  id: string | number;
  name: string;
  stakeholders: Stakeholder[];
  status: 'planning' | 'active' | 'on-hold' | 'cancelled' | 'completed';
  priority: 'high' | 'medium' | 'low';
  progress: number;
  progressMode?: 'auto' | 'manual';
  description: string;
  executiveUpdate?: string;
  startDate?: string;
  targetDate?: string;
  lastUpdate?: string;
  plan: Task[];
  recentActivity: Activity[];
}

export interface Person {
  id?: string | number;
  name: string;
  team?: string;
  email?: string | null;
}

export interface PortfolioSummary {
  id: string | number;
  name: string;
  status: string;
  priority: string;
  progress: number;
  targetDate?: string;
  lastUpdate?: string;
  stakeholders?: Stakeholder[];
  plan?: {
    id: string;
    title: string;
    status: string;
    dueDate?: string;
    subtasks?: { id: string; title: string; status: string; dueDate?: string }[];
  }[];
  recentActivity?: Activity[];
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// =============================================================================
// Tool Input Type (union of all possible inputs)
// =============================================================================

export interface CommentInput {
  type: 'comment';
  projectId?: string | number;
  projectName?: string;
  note?: string;
  content?: string;
  comment?: string;
  author?: string;
}

export interface CreateProjectInput {
  type: 'create_project';
  name?: string;
  projectName?: string;
  projectId?: string;
  id?: string;
  description?: string;
  priority?: 'high' | 'medium' | 'low';
  status?: string;
  progress?: number;
  targetDate?: string;
  stakeholders?: string;
}

export interface AddTaskInput {
  type: 'add_task';
  projectId?: string | number;
  projectName?: string;
  taskId?: string;
  title?: string;
  status?: 'todo' | 'in-progress' | 'completed';
  dueDate?: string;
  completedDate?: string;
  assignee?: string | { name: string; team?: string };
  subtasks?: { id?: string; title: string; status?: string; dueDate?: string }[];
}

export interface UpdateTaskInput {
  type: 'update_task';
  projectId?: string | number;
  projectName?: string;
  taskId?: string;
  taskTitle?: string;
  title?: string;
  status?: 'todo' | 'in-progress' | 'completed';
  dueDate?: string;
  completedDate?: string;
  assignee?: string | { name: string; team?: string } | null;
}

export interface AddSubtaskInput {
  type: 'add_subtask';
  projectId?: string | number;
  projectName?: string;
  taskId?: string;
  taskTitle?: string;
  subtaskId?: string;
  subtaskTitle?: string;
  title?: string;
  status?: 'todo' | 'in-progress' | 'completed';
  dueDate?: string;
  assignee?: string | { name: string; team?: string };
}

export interface UpdateSubtaskInput {
  type: 'update_subtask';
  projectId?: string | number;
  projectName?: string;
  taskId?: string;
  taskTitle?: string;
  subtaskId?: string;
  subtaskTitle?: string;
  title?: string;
  status?: 'todo' | 'in-progress' | 'completed';
  dueDate?: string;
  completedDate?: string;
  assignee?: string | { name: string; team?: string } | null;
}

export interface UpdateProjectInput {
  type: 'update_project';
  projectId?: string | number;
  projectName?: string;
  name?: string;
  description?: string;
  executiveUpdate?: string;
  status?: string;
  priority?: 'high' | 'medium' | 'low';
  progress?: number;
  targetDate?: string;
  startDate?: string;
  lastUpdate?: string;
}

export interface AddPersonInput {
  type: 'add_person';
  name?: string;
  personName?: string;
  team?: string;
  email?: string;
}

export interface QueryPortfolioInput {
  type: 'query_portfolio';
  scope?: 'portfolio' | 'project' | 'people';
  detailLevel?: 'summary' | 'detailed';
  includePeople?: boolean;
  projectId?: string | number;
  projectName?: string;
}

export interface SendEmailInput {
  type: 'send_email';
  recipients?: string | string[];
  subject?: string;
  body?: string;
}

export type ToolInput =
  | CommentInput
  | CreateProjectInput
  | AddTaskInput
  | UpdateTaskInput
  | AddSubtaskInput
  | UpdateSubtaskInput
  | UpdateProjectInput
  | AddPersonInput
  | QueryPortfolioInput
  | SendEmailInput;
