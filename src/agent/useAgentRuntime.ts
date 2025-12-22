/**
 * useAgentRuntime Hook
 *
 * React hook that provides access to the agent runtime layer.
 * This is the primary interface for UI components to use the agent.
 */

import { useCallback, useMemo, useRef } from 'react';
import type {
  AgentContext,
  AgentResult,
  AgentRuntimeConfig,
  ExecutionEvent,
  Plan,
  Project,
  Person,
  ToolInput,
  ActionResult,
  Delta,
  ToolContextServices,
} from './types';
import { AgentRuntime, defaultConstraints } from './AgentRuntime';
import { createToolRegistry } from './tools';
import { UndoManager } from './UndoManager';
import { cloneProjectDeep } from './context/helpers';

/**
 * Options for the useAgentRuntime hook.
 */
export interface UseAgentRuntimeOptions {
  /** Projects state */
  projects: Project[];
  /** People state */
  people: Person[];
  /** Logged-in user name */
  loggedInUser: string;
  /** Service for creating people */
  createPerson: (person: Partial<Person>) => Promise<Person>;
  /** Service for sending emails */
  sendEmail: (params: { recipients: string[]; subject: string; body: string }) => Promise<void>;
  /** Function to sync project activity (for lastUpdate calculation) */
  syncProjectActivity?: (project: Project, activities?: any[]) => Project;
  /** Callback when projects are updated */
  onProjectsUpdate?: (projects: Project[]) => void;
  /** Callback for execution events (for streaming UI updates) */
  onExecutionEvent?: (event: ExecutionEvent) => void;
  /** Callback for plan updates */
  onPlanUpdate?: (plan: Plan) => void;
}

/**
 * Return type for the useAgentRuntime hook.
 */
export interface UseAgentRuntimeReturn {
  /** Execute a list of actions (backwards compatible with existing UI) */
  executeActions: (
    actions: ToolInput[],
    userMessage?: string
  ) => Promise<AgentResult>;

  /** Execute a single action */
  executeAction: (action: ToolInput) => Promise<AgentResult>;

  /** Parse LLM response and execute the resulting plan */
  executeFromLLMResponse: (
    content: string,
    userMessage: string
  ) => Promise<AgentResult>;

  /** Undo an action by index from action results */
  undoAction: (
    actionResults: ActionResult[],
    actionIndex: number
  ) => { projects: Project[]; actionResults: ActionResult[] };

  /** Undo all deltas from an execution result */
  undoExecution: (deltas: Delta[]) => Project[];

  /** Build system prompt for LLM */
  buildSystemPrompt: (conversationHistory?: { role: string; content: string }[]) => string;

  /** Get response schema for LLM structured output */
  getResponseSchema: () => object;

  /** Get the agent runtime instance */
  runtime: AgentRuntime;

  /** Get the undo manager instance */
  undoManager: UndoManager;
}

/**
 * Hook for using the agent runtime in React components.
 */
export function useAgentRuntime(options: UseAgentRuntimeOptions): UseAgentRuntimeReturn {
  const {
    projects,
    people,
    loggedInUser,
    createPerson,
    sendEmail,
    syncProjectActivity: syncProjectActivityFn,
    onProjectsUpdate,
    onExecutionEvent,
    onPlanUpdate,
  } = options;

  // Create stable references
  const runtimeRef = useRef<AgentRuntime | null>(null);
  const undoManagerRef = useRef<UndoManager | null>(null);

  // Initialize runtime and undo manager
  if (!runtimeRef.current) {
    const registry = createToolRegistry();
    runtimeRef.current = new AgentRuntime(registry);
  }

  if (!undoManagerRef.current) {
    undoManagerRef.current = new UndoManager(syncProjectActivityFn);
  }

  const runtime = runtimeRef.current;
  const undoManager = undoManagerRef.current;

  // Build services object
  const services: ToolContextServices = useMemo(
    () => ({
      createPerson,
      sendEmail,
      buildThrustContext: () =>
        projects.map(project => ({
          id: project.id,
          name: project.name,
          status: project.status,
          progress: project.progress,
          priority: project.priority,
          lastUpdate: project.lastUpdate,
          targetDate: project.targetDate,
          stakeholders: project.stakeholders,
          plan: project.plan.map(task => ({
            id: task.id,
            title: task.title,
            status: task.status,
            dueDate: task.dueDate,
            subtasks: (task.subtasks || []).map(subtask => ({
              id: subtask.id,
              title: subtask.title,
              status: subtask.status,
              dueDate: subtask.dueDate,
            })),
          })),
          recentActivity: project.recentActivity.slice(0, 3),
        })),
    }),
    [createPerson, sendEmail, projects]
  );

  // Build agent context
  const buildAgentContext = useCallback(
    (userMessage: string): AgentContext => ({
      userMessage,
      projects: projects.map(cloneProjectDeep),
      people: [...people],
      loggedInUser,
    }),
    [projects, people, loggedInUser]
  );

  // Build runtime config
  const buildConfig = useCallback(
    (overrides?: Partial<AgentRuntimeConfig>): AgentRuntimeConfig => ({
      constraints: {
        ...defaultConstraints,
        allowSideEffects: true, // Allow side effects by default in UI context
        requireConfirmation: false, // Don't require confirmation in UI context
        ...overrides?.constraints,
      },
      onEvent: onExecutionEvent,
      onPlanUpdate,
    }),
    [onExecutionEvent, onPlanUpdate]
  );

  // Execute actions (backwards compatible)
  const executeActions = useCallback(
    async (
      actions: ToolInput[],
      userMessage: string = 'Execute actions'
    ): Promise<AgentResult> => {
      const context = buildAgentContext(userMessage);
      const config = buildConfig();

      const result = await runtime.executeActions(actions, context, services, config);

      // Update projects if there were changes
      if (result.updatedEntityIds.length > 0 && onProjectsUpdate) {
        // Get the working projects from the execution
        const workingProjects = context.projects.map((project, index) => {
          // Find if this project was updated
          if (result.updatedEntityIds.includes(project.id)) {
            // Find the updated project from action results
            // For now, we need to re-execute to get the updated state
            // This is handled by the caller updating state from deltas
          }
          return project;
        });
      }

      return result;
    },
    [buildAgentContext, buildConfig, runtime, services, onProjectsUpdate]
  );

  // Execute single action
  const executeAction = useCallback(
    async (action: ToolInput): Promise<AgentResult> => {
      return executeActions([action], `Execute ${action.type}`);
    },
    [executeActions]
  );

  // Execute from LLM response
  const executeFromLLMResponse = useCallback(
    async (content: string, userMessage: string): Promise<AgentResult> => {
      const { plan, response } = runtime.parsePlan(content);
      const context = buildAgentContext(userMessage);
      const config = buildConfig();

      const result = await runtime.runPlan(plan, context, services, config);
      result.response = response;

      return result;
    },
    [runtime, buildAgentContext, buildConfig, services]
  );

  // Undo action by index
  const undoAction = useCallback(
    (
      actionResults: ActionResult[],
      actionIndex: number
    ): { projects: Project[]; actionResults: ActionResult[] } => {
      return undoManager.undoActionByIndex(
        projects.map(cloneProjectDeep),
        actionResults,
        actionIndex
      );
    },
    [undoManager, projects]
  );

  // Undo execution
  const undoExecution = useCallback(
    (deltas: Delta[]): Project[] => {
      const { rollbackDeltas } = require('./UndoManager');
      return rollbackDeltas(
        projects.map(cloneProjectDeep),
        deltas,
        syncProjectActivityFn
      );
    },
    [projects, syncProjectActivityFn]
  );

  // Build system prompt
  const buildSystemPrompt = useCallback(
    (conversationHistory?: { role: string; content: string }[]): string => {
      const context = buildAgentContext('');
      if (conversationHistory) {
        (context as any).conversationHistory = conversationHistory;
      }
      return runtime.buildSystemPrompt(context);
    },
    [runtime, buildAgentContext]
  );

  // Get response schema
  const getResponseSchema = useCallback((): object => {
    return runtime.getResponseSchema();
  }, [runtime]);

  return {
    executeActions,
    executeAction,
    executeFromLLMResponse,
    undoAction,
    undoExecution,
    buildSystemPrompt,
    getResponseSchema,
    runtime,
    undoManager,
  };
}

export default useAgentRuntime;
