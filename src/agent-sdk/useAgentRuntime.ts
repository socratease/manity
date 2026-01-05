/**
 * useAgentRuntime Hook - Streaming Agent Execution
 *
 * React hook that provides a streaming interface for running the agent.
 * Features:
 * - Real-time streaming of LLM responses
 * - Proper OpenAI message format for tool calls
 * - Sequential tool execution (fixes task/subtask race condition)
 * - Thinking process capture from actual LLM reasoning
 * - Human-in-the-loop support via ask_user tool
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createProjectManagementAgent, defaultAgentConfig, type AgentConfig } from './agent';
import {
  createToolExecutionContext,
  cloneProjectDeep,
  ToolExecutionContext,
} from './context';
import {
  createStreamingChatCompletion,
  createChatCompletion,
  type ChatMessage,
  type ToolDefinition,
  type ToolCall,
  type LLMResponse,
} from './modelProvider';
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

const LLM_MODEL = import.meta.env.VITE_LLM_MODEL || 'gpt-4.1';

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
  initialConversationHistory?: ChatMessage[];
  /** Enable streaming mode (default: true) */
  enableStreaming?: boolean;
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
 * Convert our tools to OpenAI format
 */
function getToolDefinitions(): ToolDefinition[] {
  return allTools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

/**
 * Hook for running the agent with real-time streaming
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
    enableStreaming = true,
  } = props;

  // Create undo manager
  const undoManager = useMemo(() => new UndoManager(), []);

  // State for human-in-the-loop
  const [isAwaitingUser, setIsAwaitingUser] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<UserQuestion | null>(null);

  // Keep track of the full conversation history across runs
  const conversationHistoryRef = useRef<ChatMessage[]>([]);
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
    toolContext: ToolExecutionContext;
    conversationHistory: ChatMessage[];
    thinkingSteps: ThinkingStep[];
    callbacks?: ExecutionCallbacks;
    systemPrompt: string;
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
   */
  const executeToolsSequentially = useCallback(async (
    toolCalls: ToolCall[],
    toolContext: ToolExecutionContext,
    thinkingSteps: ThinkingStep[],
    callbacks?: ExecutionCallbacks
  ): Promise<{ results: Array<{ tool_call_id: string; content: string }>; paused: boolean; pausedQuestion?: UserQuestion }> => {
    const results: Array<{ tool_call_id: string; content: string }> = [];

    for (const toolCall of toolCalls) {
      const toolName = toolCall.function.name;
      const toolInput = JSON.parse(toolCall.function.arguments || '{}');

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
        results.push({ tool_call_id: toolCall.id, content: errorResult });
        toolStep.status = 'failed';
        toolStep.toolResult = errorResult;
        callbacks?.onThinkingStep?.(toolStep);
        continue;
      }

      try {
        // Execute the tool - tools expect (input, runContext?)
        // We pass a mock RunContext that has our toolContext
        const mockRunContext = { context: toolContext };
        const rawResult = await tool.execute(toolInput, mockRunContext as any);
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

        results.push({ tool_call_id: toolCall.id, content: result });
        toolStep.status = 'completed';
        toolStep.toolResult = result;
        callbacks?.onThinkingStep?.(toolStep);
        callbacks?.onToolComplete?.(toolName, result);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorResult = `Error executing ${toolName}: ${errorMessage}`;
        results.push({ tool_call_id: toolCall.id, content: errorResult });
        toolStep.status = 'failed';
        toolStep.toolResult = errorResult;
        callbacks?.onThinkingStep?.(toolStep);
      }
    }

    return { results, paused: false };
  }, []);

  /**
   * Run the agent loop with streaming.
   */
  const runAgentLoop = useCallback(async (
    systemPrompt: string,
    userMessage: string,
    toolContext: ToolExecutionContext,
    callbacks?: ExecutionCallbacks,
    existingHistory?: ChatMessage[],
    existingThinkingSteps?: ThinkingStep[]
  ): Promise<{
    response: string;
    thinkingSteps: ThinkingStep[];
    paused: boolean;
    pausedQuestion?: UserQuestion;
    conversationHistory: ChatMessage[];
  }> => {
    const thinkingSteps: ThinkingStep[] = existingThinkingSteps || [];
    const conversationHistory: ChatMessage[] = existingHistory ? [...existingHistory] : [];

    // Add user message if provided
    if (userMessage) {
      conversationHistory.push({
        role: 'user',
        content: userMessage,
      });
    }

    let turns = 0;
    const maxTurns = config.maxToolCalls || 10;

    while (turns < maxTurns) {
      turns++;

      // Build messages array with system prompt
      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
      ];

      // Add reasoning step to show we're thinking
      const reasoningStep = createThinkingStep('reasoning', '', {
        status: 'in_progress',
      });
      thinkingSteps.push(reasoningStep);
      callbacks?.onThinkingStep?.(reasoningStep);

      let response: LLMResponse;
      let streamedContent = '';

      if (enableStreaming) {
        // Streaming mode - show content as it arrives
        response = await createStreamingChatCompletion(
          {
            model: LLM_MODEL,
            messages,
            tools: getToolDefinitions(),
            tool_choice: 'auto',
          },
          {
            onContent: (chunk) => {
              streamedContent += chunk;
              // Update reasoning step with streamed content
              reasoningStep.content = streamedContent;
              callbacks?.onThinkingStep?.(reasoningStep);
            },
            onToolCallStart: (index, id, name) => {
              // Could emit tool start events here
              console.debug('[Momentum] Tool call starting:', { index, id, name });
            },
            onDone: (finalResponse) => {
              reasoningStep.content = finalResponse.content || streamedContent;
              reasoningStep.status = 'completed';
              callbacks?.onThinkingStep?.(reasoningStep);
            },
            onError: (error) => {
              reasoningStep.status = 'failed';
              reasoningStep.content = error.message;
              callbacks?.onThinkingStep?.(reasoningStep);
            },
          }
        );
      } else {
        // Non-streaming mode
        response = await createChatCompletion({
          model: LLM_MODEL,
          messages,
          tools: getToolDefinitions(),
          tool_choice: 'auto',
        });

        // Update reasoning step with content
        reasoningStep.content = response.content || 'Processing...';
        reasoningStep.status = 'completed';
        callbacks?.onThinkingStep?.(reasoningStep);

        // If we got thinking content from extended thinking, add it
        if (response.thinking) {
          const thinkingStep = createThinkingStep('reasoning', response.thinking, {
            status: 'completed',
          });
          thinkingSteps.push(thinkingStep);
          callbacks?.onThinkingStep?.(thinkingStep);
        }
      }

      const content = response.content || '';
      const toolCalls = response.tool_calls || [];

      // If no tool calls, we're done
      if (!toolCalls || toolCalls.length === 0) {
        // Add assistant message to history
        conversationHistory.push({
          role: 'assistant',
          content,
        });

        return {
          response: content,
          thinkingSteps,
          paused: false,
          conversationHistory,
        };
      }

      // Add assistant message with tool calls to history (proper OpenAI format)
      conversationHistory.push({
        role: 'assistant',
        content: content || undefined,
        tool_calls: toolCalls,
      });

      // Execute tools sequentially
      const { results, paused, pausedQuestion } = await executeToolsSequentially(
        toolCalls,
        toolContext,
        thinkingSteps,
        callbacks
      );

      // Add tool results to conversation history (proper OpenAI format)
      for (const result of results) {
        conversationHistory.push({
          role: 'tool',
          tool_call_id: result.tool_call_id,
          content: result.content,
        });
      }

      // If execution was paused for user input
      if (paused) {
        return {
          response: content,
          thinkingSteps,
          paused: true,
          pausedQuestion,
          conversationHistory,
        };
      }
    }

    // Max turns reached
    return {
      response: 'Maximum execution turns reached.',
      thinkingSteps,
      paused: false,
      conversationHistory,
    };
  }, [config.maxToolCalls, executeToolsSequentially, enableStreaming]);

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

    try {
      // Create agent to get system prompt
      const agent = createProjectManagementAgent(agentContext);
      const systemPrompt = agent.instructions;

      // Run the agent loop with streaming
      const result = await runAgentLoop(
        systemPrompt,
        message,
        toolContext,
        callbacks,
        conversationHistoryRef.current
      );

      // If paused for user input
      if (result.paused && result.pausedQuestion) {
        // Save state for resumption
        pausedExecutionRef.current = {
          toolContext,
          conversationHistory: result.conversationHistory,
          thinkingSteps: result.thinkingSteps,
          callbacks,
          systemPrompt,
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

    const { toolContext, conversationHistory, thinkingSteps, callbacks, systemPrompt } = pausedExecutionRef.current;

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

      // Add user response as tool result to conversation history
      // Find the last ask_user tool call
      const lastAssistantMsg = [...conversationHistory].reverse().find(
        m => m.role === 'assistant' && m.tool_calls
      );
      const askUserToolCall = lastAssistantMsg?.tool_calls?.find(
        tc => tc.function.name === 'ask_user'
      );

      if (askUserToolCall) {
        conversationHistory.push({
          role: 'tool',
          tool_call_id: askUserToolCall.id,
          content: userResponse,
        });
      }

      // Continue the agent loop
      const result = await runAgentLoop(
        systemPrompt,
        '', // Empty message since we're continuing
        toolContext,
        callbacks,
        conversationHistory,
        thinkingSteps
      );

      // If paused again for user input
      if (result.paused && result.pausedQuestion) {
        pausedExecutionRef.current = {
          toolContext,
          conversationHistory: result.conversationHistory,
          thinkingSteps: result.thinkingSteps,
          callbacks,
          systemPrompt,
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
