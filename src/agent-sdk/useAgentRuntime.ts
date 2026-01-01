/**
 * useAgentRuntime Hook - OpenAI Agents SDK
 *
 * React hook that provides a simple interface for running the agent.
 * Wraps the SDK's Runner with delta tracking and state management.
 */

import { useCallback, useMemo } from 'react';
import { run, setDefaultModelProvider } from '@openai/agents';
import { createProjectManagementAgent, defaultAgentConfig, type AgentConfig } from './agent';
import {
  setToolContext,
  clearToolContext,
  createToolExecutionContext,
  cloneProjectDeep,
} from './context';
import { backendModelProvider } from './modelProvider';
import { UndoManager, rollbackDeltas } from '../agent/UndoManager';
import type { Project, Person, Delta, ActionResult } from '../agent/types';
import type { AgentContext, ToolServices, AgentExecutionResult } from './types';

// Set the model provider to use our backend proxy
setDefaultModelProvider(backendModelProvider);

/**
 * Props for the useAgentRuntime hook
 */
export interface UseAgentRuntimeProps {
  /** Current projects */
  projects: Project[];
  /** People database */
  people: Person[];
  /** Logged-in user name */
  loggedInUser: string;
  /** Create person callback */
  createPerson: (person: Partial<Person>) => Promise<Person>;
  /** Send email callback */
  sendEmail: (params: { recipients: string[]; subject: string; body: string }) => Promise<void>;
  /** Callback when projects are updated */
  onProjectsUpdate?: (projects: Project[]) => void;
  /** Agent configuration */
  config?: AgentConfig;
}

/**
 * Return type from the hook
 */
export interface UseAgentRuntimeReturn {
  /** Execute a user message through the agent */
  executeMessage: (message: string) => Promise<AgentExecutionResult>;
  /** Undo manager for reversing actions */
  undoManager: UndoManager;
  /** Undo deltas on projects */
  undoDeltas: (projects: Project[], deltas: Delta[]) => Project[];
  /** Build context for external use */
  buildContext: (message: string) => AgentContext;
}

/**
 * Hook for running the OpenAI Agents SDK-based agent
 */
export function useAgentRuntime(props: UseAgentRuntimeProps): UseAgentRuntimeReturn {
  const {
    projects,
    people,
    loggedInUser,
    createPerson,
    sendEmail,
    config = defaultAgentConfig,
  } = props;

  // Create undo manager
  const undoManager = useMemo(() => new UndoManager(), []);

  // Build services for tools
  const buildServices = useCallback((): ToolServices => ({
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
  }), [createPerson, sendEmail, projects]);

  // Build agent context
  const buildContext = useCallback((message: string): AgentContext => ({
    userMessage: message,
    projects: projects.map(cloneProjectDeep),
    people: [...people],
    loggedInUser,
  }), [projects, people, loggedInUser]);

  // Execute a message through the agent
  const executeMessage = useCallback(async (message: string): Promise<AgentExecutionResult> => {
    // Build context and services
    const services = buildServices();
    const agentContext = buildContext(message);

    // Create tool execution context with delta tracking
    const toolContext = createToolExecutionContext(
      agentContext.projects,
      agentContext.people,
      agentContext.loggedInUser,
      services
    );

    // Set the global context for tools to access
    setToolContext(toolContext);

    try {
      // Create agent with current context
      const agent = createProjectManagementAgent(agentContext);

      // Run the agent
      const result = await run(agent, message, {
        maxTurns: config.maxToolCalls || 10,
      });

      // Get the results from context
      const deltas = toolContext.getDeltas();
      const updatedEntityIds = toolContext.getUpdatedEntityIds();
      const workingProjects = toolContext.workingProjects;

      // Build action results for UI
      const actionResults: ActionResult[] = deltas.map((delta, index) => {
        let type: string;
        let label: string;

        switch (delta.type) {
          case 'remove_project':
            type = 'create_project';
            label = 'Created project';
            break;
          case 'remove_activity':
            type = 'comment';
            label = 'Added comment';
            break;
          case 'remove_task':
            type = 'add_task';
            label = 'Added task';
            break;
          case 'restore_task':
            type = 'update_task';
            label = 'Updated task';
            break;
          case 'remove_subtask':
            type = 'add_subtask';
            label = 'Added subtask';
            break;
          case 'restore_subtask':
            type = 'update_subtask';
            label = 'Updated subtask';
            break;
          case 'restore_project':
            type = 'update_project';
            label = 'Updated project';
            break;
          default:
            type = 'unknown';
            label = 'Action completed';
        }

        return {
          type: type as any,
          label,
          deltas: [delta],
          status: 'success' as const,
        };
      });

      return {
        response: result.finalOutput || '',
        deltas,
        workingProjects,
        updatedEntityIds,
        actionResults,
      };
    } finally {
      // Always clear context when done
      clearToolContext();
    }
  }, [buildContext, buildServices, config]);

  // Undo helper
  const undoDeltas = useCallback((currentProjects: Project[], deltas: Delta[]): Project[] => {
    return rollbackDeltas(currentProjects, deltas);
  }, []);

  return {
    executeMessage,
    undoManager,
    undoDeltas,
    buildContext,
  };
}

export default useAgentRuntime;
