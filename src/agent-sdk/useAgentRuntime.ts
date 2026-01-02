/**
 * useAgentRuntime Hook - OpenAI Agents SDK
 *
 * React hook that provides a simple interface for running the agent.
 * Uses the SDK's context injection pattern for tools.
 * Features:
 * - Context passed via SDK's RunContext (no global singleton)
 * - Sequential tool execution (fixes task/subtask race condition)
 * - Thinking process capture and exposure
 * - Human-in-the-loop support via ask_user tool
 */

import { Agent, RunContext, setDefaultModelProvider } from '@openai/agents';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createProjectManagementAgent, defaultAgentConfig, type AgentConfig } from './agent';
import { EMPTY_RESPONSE_ERROR, getAssistantMessage } from './responseUtils';
import {
  createToolExecutionContext,
  cloneProjectDeep,
  ToolExecutionContext,
} from './context';
import { backendModelProvider } from './modelProvider';
import { UndoManager, rollbackDeltas } from '../agent/UndoManager';
import { allTools, isAskUserResponse, parseAskUserResponse } from './tools';
import type { Project, Person, Delta, ActionResult } from '../agent/types';
import type {
  AgentContext,
  ToolServices,
  ThinkingStep,
  UserQuestion,
  ExecutionCallbacks,
  AgentExecutionResultWithThinking,
} from './types';

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
  /** Optional starting conversation history */
  initialConversationHistory?: Array<{ role: string; content: string }>;
}

/**
 * Return type from the hook
 */
export interface UseAgentRuntimeReturn {
  /** Execute a user message through the agent */
  executeMessage: (message: string, callbacks?: ExecutionCallbacks) => Promise<AgentExecutionResultWithThinking>;
  /** Continue execution after user responds to a question */
  continueWithUserResponse: (response: string) => Promise<AgentExecutionResultWithThinking>;
  /** Undo manager for reversing actions */
  undoManager: UndoManager;
  /** Undo deltas on projects */
  undoDeltas: (projects: Project[], deltas: Delta[]) => Project[];
  /** Build context for external use */
  buildContext: (message: string) => AgentContext;
  /** Whether execution is paused waiting for user input */
  isAwaitingUser: boolean;
  /** Current pending question if any */
  pendingQuestion: UserQuestion | null;
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Create a thinking step
 */
function createThinkingStep(
  type: ThinkingStep['type'],
  content: string,
  extra?: Partial<ThinkingStep>
): ThinkingStep {
  return {
    id: generateId(),
    type,
    content,
    timestamp: Date.now(),
    status: 'pending',
    ...extra,
  };
}

/**
 * Hook for running the OpenAI Agents SDK-based agent
 * with SDK context injection and sequential tool execution
 */
export function useAgentRuntime(props: UseAgentRuntimeProps): UseAgentRuntimeReturn {
  const {
    projects,
    people,
    loggedInUser,
    createPerson,
    sendEmail,
    config = defaultAgentConfig,
    initialConversationHistory = [],
  } = props;

  // Create undo manager
  const undoManager = useMemo(() => new UndoManager(), []);

  // State for human-in-the-loop
  const [isAwaitingUser, setIsAwaitingUser] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<UserQuestion | null>(null);

  // Keep track of the full conversation history across runs
  const conversationHistoryRef = useRef<Array<{ role: string; content: string }>>([]);
  const hasSeededHistoryRef = useRef(false);

  // Seed conversation history from provided initial messages
  useEffect(() => {
    if (hasSeededHistoryRef.current) return;
    if (initialConversationHistory.length > 0) {
      conversationHistoryRef.current = [...initialConversationHistory];
      hasSeededHistoryRef.current = true;
    }
  }, [initialConversationHistory]);

  // Refs for resumable execution
  const pausedExecutionRef = useRef<{
    agent: Agent<ToolExecutionContext>;
    conversationHistory: Array<{ role: string; content: string }>;
    runContext: RunContext<ToolExecutionContext>;
    thinkingSteps: ThinkingStep[];
    callbacks?: ExecutionCallbacks;
  } | null>(null);

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

  /**
   * Execute tools sequentially from a list of tool calls.
   * Tools receive the RunContext for dependency injection.
   */
  const executeToolsSequentially = useCallback(async (
    toolCalls: Array<{ id: string; name: string; arguments: Record<string, unknown> }>,
    runContext: RunContext<ToolExecutionContext>,
    thinkingSteps: ThinkingStep[],
    callbacks?: ExecutionCallbacks
  ): Promise<{ results: string[]; paused: boolean; pausedQuestion?: UserQuestion }> => {
    const results: string[] = [];

    for (const toolCall of toolCalls) {
      const toolName = toolCall.name;
      const toolInput = toolCall.arguments;

      console.debug('[Momentum] Starting tool', toolName, toolInput);

      // Create thinking step for tool call
      const toolStep = createThinkingStep('tool_call', `Calling ${toolName}`, {
        toolName,
        toolInput: toolInput as Record<string, unknown>,
        status: 'in_progress',
      });
      thinkingSteps.push(toolStep);
      callbacks?.onThinkingStep?.(toolStep);
      callbacks?.onToolStart?.(toolName, toolInput as Record<string, unknown>);

      // Find the tool
      const tool = allTools.find(t => t.name === toolName);
      if (!tool) {
        const errorResult = `Error: Tool ${toolName} not found`;
        results.push(errorResult);
        toolStep.status = 'failed';
        toolStep.toolResult = errorResult;
        callbacks?.onThinkingStep?.(toolStep);
        continue;
      }

      try {
        // Execute the tool with RunContext (SDK's dependency injection)
        // The tool's execute function signature: (input, runContext?, details?)
        const rawResult = await tool.execute(toolInput, runContext);
        const result = String(rawResult);

        console.debug('[Momentum] Tool result', { toolName, result });

        // Check if this is an ask_user response that should pause execution
        if (isAskUserResponse(result)) {
          const askUserData = parseAskUserResponse(result);
          if (askUserData) {
            const question: UserQuestion = {
              id: generateId(),
              question: askUserData.question,
              context: askUserData.context,
              options: askUserData.options,
              timestamp: Date.now(),
            };

            toolStep.status = 'awaiting_user';
            toolStep.toolResult = 'Waiting for user response';
            callbacks?.onThinkingStep?.(toolStep);

            // Return with pause flag
            return { results, paused: true, pausedQuestion: question };
          }
        }

        results.push(result);
        toolStep.status = 'completed';
        toolStep.toolResult = result;
        callbacks?.onThinkingStep?.(toolStep);
        callbacks?.onToolComplete?.(toolName, result);

        // Add result thinking step
        const resultStep = createThinkingStep('tool_result', result, {
          toolName,
          status: 'completed',
        });
        thinkingSteps.push(resultStep);
        callbacks?.onThinkingStep?.(resultStep);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorResult = `Error executing ${toolName}: ${errorMessage}`;
        results.push(errorResult);
        toolStep.status = 'failed';
        toolStep.toolResult = errorResult;
        callbacks?.onThinkingStep?.(toolStep);
      }
    }

    return { results, paused: false };
  }, []);

  /**
   * Run the agent loop with sequential tool execution.
   * Uses SDK's RunContext for tool dependency injection.
   */
  const runAgentLoop = useCallback(async (
    agent: Agent<ToolExecutionContext>,
    initialMessage: string,
    runContext: RunContext<ToolExecutionContext>,
    callbacks?: ExecutionCallbacks,
    existingHistory?: Array<{ role: string; content: string }>,
    existingThinkingSteps?: ThinkingStep[]
  ): Promise<{
    response: string;
    thinkingSteps: ThinkingStep[];
    paused: boolean;
    pausedQuestion?: UserQuestion;
    conversationHistory: Array<{ role: string; content: string }>;
  }> => {
    const thinkingSteps: ThinkingStep[] = existingThinkingSteps || [];
    const seededHistory = existingHistory || [];
    const conversationHistory: Array<{ role: string; content: string }> = [
      ...seededHistory,
      ...(initialMessage ? [{ role: 'user', content: initialMessage }] : []),
    ];

    let turns = 0;
    const maxTurns = config.maxToolCalls || 10;

    while (turns < maxTurns) {
      turns++;

      // Add planning thinking step
      const planningStep = createThinkingStep('planning', 'Analyzing request and deciding on actions...', {
        status: 'in_progress',
      });
      thinkingSteps.push(planningStep);
      callbacks?.onThinkingStep?.(planningStep);

      // Call the LLM through our model provider
      const response = await backendModelProvider.createChatCompletion({
        model: agent.model,
        messages: [
          { role: 'system', content: agent.instructions },
          ...conversationHistory,
        ],
        tools: allTools.map(t => ({
          type: 'function' as const,
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          },
        })),
        tool_choice: 'auto',
      });

      console.debug('[Momentum] Agent completion response', {
        choicesCount: response?.choices?.length,
        contentPreview: response?.choices?.[0]?.message?.content || response?.content,
        toolCallCount: response?.choices?.[0]?.message?.tool_calls?.length || response?.toolCalls?.length,
      });

      // Extract content and tool calls from response
      const assistantMessage = getAssistantMessage(response);
      if (!assistantMessage) {
        planningStep.status = 'failed';
        planningStep.content = EMPTY_RESPONSE_ERROR;
        callbacks?.onThinkingStep?.(planningStep);
        throw new Error(EMPTY_RESPONSE_ERROR);
      }
      const content = assistantMessage?.content || '';
      const toolCalls = assistantMessage?.tool_calls || [];

      // Update planning step
      planningStep.status = 'completed';
      planningStep.content = content || 'Processing...';
      callbacks?.onThinkingStep?.(planningStep);

      // Add reasoning step if there's content
      if (content) {
        const reasoningStep = createThinkingStep('reasoning', content, {
          status: 'completed',
        });
        thinkingSteps.push(reasoningStep);
        callbacks?.onThinkingStep?.(reasoningStep);
      }

      // If no tool calls, we're done
      if (!toolCalls || toolCalls.length === 0) {
        conversationHistory.push({ role: 'assistant', content });
        return {
          response: content,
          thinkingSteps,
          paused: false,
          conversationHistory,
        };
      }

      // Parse tool calls
      const parsedToolCalls = toolCalls.map(tc => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments || '{}'),
      }));

      // Execute tools sequentially with RunContext
      const { results, paused, pausedQuestion } = await executeToolsSequentially(
        parsedToolCalls,
        runContext,
        thinkingSteps,
        callbacks
      );

      // If execution was paused for user input
      if (paused) {
        // Save the partial assistant message and tool calls to history
        conversationHistory.push({
          role: 'assistant',
          content: JSON.stringify({ content, toolCalls: parsedToolCalls }),
        });

        return {
          response: content,
          thinkingSteps,
          paused: true,
          pausedQuestion,
          conversationHistory,
        };
      }

      // Add assistant message and tool results to history
      conversationHistory.push({
        role: 'assistant',
        content: JSON.stringify({ content, toolCalls: parsedToolCalls }),
      });

      // Add tool results
      for (let i = 0; i < parsedToolCalls.length; i++) {
        conversationHistory.push({
          role: 'tool',
          content: JSON.stringify({
            tool_call_id: parsedToolCalls[i].id,
            name: parsedToolCalls[i].name,
            result: results[i],
          }),
        });
      }
    }

    // Max turns reached
    return {
      response: 'Maximum execution turns reached.',
      thinkingSteps,
      paused: false,
      conversationHistory,
    };
  }, [config.maxToolCalls, executeToolsSequentially]);

  /**
   * Build action results from deltas
   */
  const buildActionResults = useCallback((deltas: Delta[]): ActionResult[] => {
    return deltas.map((delta) => {
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
  }, []);

  // Execute a message through the agent
  const executeMessage = useCallback(async (
    message: string,
    callbacks?: ExecutionCallbacks
  ): Promise<AgentExecutionResultWithThinking> => {
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

    // Create SDK RunContext wrapping our ToolExecutionContext
    const runContext = new RunContext<ToolExecutionContext>(toolContext);

    try {
      // Create agent with current context
      const agent = createProjectManagementAgent(agentContext);

      // Run the agent loop with sequential execution
      const result = await runAgentLoop(
        agent as Agent<ToolExecutionContext>,
        message,
        runContext,
        callbacks,
        conversationHistoryRef.current
      );

      // If paused for user input
      if (result.paused && result.pausedQuestion) {
        // Save state for resumption
        pausedExecutionRef.current = {
          agent: agent as Agent<ToolExecutionContext>,
          conversationHistory: result.conversationHistory,
          runContext,
          thinkingSteps: result.thinkingSteps,
          callbacks,
        };

        conversationHistoryRef.current = result.conversationHistory;

        setIsAwaitingUser(true);
        setPendingQuestion(result.pausedQuestion);

        // Return partial result
        const deltas = toolContext.getDeltas();
        return {
          response: result.response,
          deltas,
          workingProjects: toolContext.workingProjects,
          updatedEntityIds: toolContext.getUpdatedEntityIds(),
          actionResults: buildActionResults(deltas),
          thinkingSteps: result.thinkingSteps,
          pendingQuestion: result.pausedQuestion,
        };
      }

      // Get the results from context
      const deltas = toolContext.getDeltas();
      const updatedEntityIds = toolContext.getUpdatedEntityIds();
      const workingProjects = toolContext.workingProjects;

      conversationHistoryRef.current = result.conversationHistory;

      return {
        response: result.response,
        deltas,
        workingProjects,
        updatedEntityIds,
        actionResults: buildActionResults(deltas),
        thinkingSteps: result.thinkingSteps,
      };
    } catch (error) {
      console.error('[Momentum] Agent execution error:', error);
      throw error;
    }
  }, [buildContext, buildServices, runAgentLoop, buildActionResults]);

  // Continue execution after user responds to a question
  const continueWithUserResponse = useCallback(async (
    userResponse: string
  ): Promise<AgentExecutionResultWithThinking> => {
    if (!pausedExecutionRef.current) {
      throw new Error('No paused execution to continue');
    }

    const { agent, conversationHistory, runContext, thinkingSteps, callbacks } = pausedExecutionRef.current;
    const toolContext = runContext.context;

    // Clear paused state
    setIsAwaitingUser(false);
    setPendingQuestion(null);

    try {
      // Add user response to thinking steps
      const userResponseStep = createThinkingStep('tool_result', userResponse, {
        toolName: 'ask_user',
        status: 'completed',
      });
      thinkingSteps.push(userResponseStep);
      callbacks?.onThinkingStep?.(userResponseStep);

      // Add user response to conversation history
      conversationHistory.push({
        role: 'tool',
        content: JSON.stringify({
          tool_call_id: 'ask_user_response',
          name: 'ask_user',
          result: userResponse,
        }),
      });

      // Continue the agent loop
      const result = await runAgentLoop(
        agent,
        '', // Empty message since we're continuing
        runContext,
        callbacks,
        conversationHistory,
        thinkingSteps
      );

      // If paused again for user input
      if (result.paused && result.pausedQuestion) {
        pausedExecutionRef.current = {
          agent,
          conversationHistory: result.conversationHistory,
          runContext,
          thinkingSteps: result.thinkingSteps,
          callbacks,
        };

        conversationHistoryRef.current = result.conversationHistory;

        setIsAwaitingUser(true);
        setPendingQuestion(result.pausedQuestion);

        const deltas = toolContext.getDeltas();
        return {
          response: result.response,
          deltas,
          workingProjects: toolContext.workingProjects,
          updatedEntityIds: toolContext.getUpdatedEntityIds(),
          actionResults: buildActionResults(deltas),
          thinkingSteps: result.thinkingSteps,
          pendingQuestion: result.pausedQuestion,
        };
      }

      // Clear paused execution ref
      pausedExecutionRef.current = null;

      conversationHistoryRef.current = result.conversationHistory;

      const deltas = toolContext.getDeltas();
      return {
        response: result.response,
        deltas,
        workingProjects: toolContext.workingProjects,
        updatedEntityIds: toolContext.getUpdatedEntityIds(),
        actionResults: buildActionResults(deltas),
        thinkingSteps: result.thinkingSteps,
      };
    } catch (error) {
      console.error('[Momentum] Continue execution error:', error);
      throw error;
    }
  }, [runAgentLoop, buildActionResults]);

  // Undo helper
  const undoDeltas = useCallback((currentProjects: Project[], deltas: Delta[]): Project[] => {
    return rollbackDeltas(currentProjects, deltas);
  }, []);

  return {
    executeMessage,
    continueWithUserResponse,
    undoManager,
    undoDeltas,
    buildContext,
    isAwaitingUser,
    pendingQuestion,
  };
}

export default useAgentRuntime;
