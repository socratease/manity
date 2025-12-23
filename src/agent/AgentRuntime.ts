/**
 * Agent Runtime
 *
 * The main orchestrator for the agent layer.
 * Implements the plan → select → execute → observe loop.
 */

import type {
  Plan,
  ToolContext,
  ToolInput,
  ToolResult,
  ExecutionEvent,
  ExecutionLog,
  AgentContext,
  AgentConstraints,
  AgentRuntimeConfig,
  AgentResult,
  ActionResult,
  Delta,
  Project,
  Person,
  StopReason,
  ToolContextServices,
} from './types';
import { ToolRegistry } from './ToolRegistry';
import { ToolSelector } from './ToolSelector';
import { Planner } from './Planner';
import { createToolRegistry } from './tools';
import {
  buildProjectLookup,
  cloneProjectDeep,
  createHelpers,
} from './context/helpers';

/**
 * Default constraints for agent execution.
 */
export const defaultConstraints: AgentConstraints = {
  maxSteps: 5,
  allowSideEffects: false,
  requireConfirmation: true,
};

/**
 * Generate a unique execution ID.
 */
function generateExecutionId(): string {
  return `exec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Agent Runtime class
 *
 * Orchestrates the agent loop: plan → select → execute → observe.
 */
export class AgentRuntime {
  private registry: ToolRegistry;
  private selector: ToolSelector;
  private planner: Planner;

  constructor(registry: ToolRegistry) {
    this.registry = registry;
    this.selector = new ToolSelector(registry);
    this.planner = new Planner(registry);
  }

  /**
   * Run the agent with the given context and plan.
   * This is the main entry point for executing a pre-built plan.
   */
  async runPlan(
    plan: Plan,
    agentContext: AgentContext,
    services: ToolContextServices,
    config: AgentRuntimeConfig = { constraints: defaultConstraints }
  ): Promise<AgentResult> {
    const { constraints, onEvent, onPlanUpdate } = config;
    const executionId = generateExecutionId();
    const startedAt = new Date().toISOString();

    // Initialize state
    const workingProjects = agentContext.projects.map(cloneProjectDeep);
    const projectLookup = buildProjectLookup(workingProjects);
    const executionLog: ExecutionLog = {
      id: executionId,
      userMessage: agentContext.userMessage,
      events: [],
      status: 'in_progress',
      startedAt,
    };

    // Track aggregated results
    const allDeltas: Delta[] = [];
    const allUpdatedEntityIds = new Set<string | number>();
    const actionResults: ActionResult[] = [];

    // Build tool context
    const toolContext: ToolContext = {
      projects: agentContext.projects,
      workingProjects,
      projectLookup,
      people: agentContext.people,
      loggedInUser: agentContext.loggedInUser,
      helpers: createHelpers(
        workingProjects,
        projectLookup,
        agentContext.people
      ),
      services,
    };

    // Update plan status
    plan.status = 'executing';
    if (onPlanUpdate) onPlanUpdate(plan);

    let currentStep = 0;
    let stopReason: StopReason = 'success';

    // Execution loop
    while (currentStep < plan.steps.length && currentStep < constraints.maxSteps) {
      // Select next tool
      const selection = this.selector.selectNextStep(
        plan,
        currentStep,
        toolContext,
        constraints
      );

      // Check if we should stop
      if (selection.shouldStop) {
        stopReason = selection.stopReason as StopReason || 'blocked';

        // Log the blocked step
        const blockedEvent: ExecutionEvent = {
          stepIndex: currentStep,
          toolName: selection.toolCall?.toolName || ('none' as any),
          toolInput: selection.toolCall?.input || ({} as ToolInput),
          timestamp: new Date().toISOString(),
          label: 'Execution stopped',
          detail: selection.reason,
          deltas: [],
          status: 'blocked',
          updatedEntityIds: [],
        };
        executionLog.events.push(blockedEvent);
        if (onEvent) onEvent(blockedEvent);

        break;
      }

      if (!selection.toolCall) {
        currentStep++;
        continue;
      }

      // Execute the selected tool
      const tool = this.registry.get(selection.toolCall.toolName);
      if (!tool) {
        currentStep++;
        continue;
      }

      try {
        // Update helpers with current working projects (they may have changed)
        toolContext.helpers = createHelpers(
          workingProjects,
          projectLookup,
          agentContext.people
        );

        // Execute tool
        const result: ToolResult = await tool.execute(
          toolContext,
          selection.toolCall.input
        );

        // Create execution event
        const event: ExecutionEvent = {
          stepIndex: currentStep,
          toolName: selection.toolCall.toolName,
          toolInput: selection.toolCall.input,
          timestamp: new Date().toISOString(),
          label: result.label,
          detail: result.detail,
          deltas: result.deltas,
          status: result.status === 'success' ? 'success' :
                  result.status === 'skipped' ? 'skipped' : 'failure',
          error: result.error,
          observations: result.observations,
          updatedEntityIds: result.updatedEntityIds,
        };

        // Record event
        executionLog.events.push(event);
        if (onEvent) onEvent(event);

        // Aggregate results
        allDeltas.push(...result.deltas);
        result.updatedEntityIds.forEach(id => allUpdatedEntityIds.add(id));

        // Create action result for UI
        actionResults.push({
          type: selection.toolCall.toolName,
          label: result.label,
          detail: result.detail,
          deltas: result.deltas,
          status: result.status === 'success' ? 'success' :
                  result.status === 'skipped' ? 'skipped' : 'failure',
          error: result.error,
        });

        // Check for execution failure
        if (result.status === 'error') {
          stopReason = 'error';
          break;
        }
      } catch (error) {
        // Handle unexpected errors
        const errorEvent: ExecutionEvent = {
          stepIndex: currentStep,
          toolName: selection.toolCall.toolName,
          toolInput: selection.toolCall.input,
          timestamp: new Date().toISOString(),
          label: 'Execution failed',
          detail: (error as Error).message,
          deltas: [],
          status: 'failure',
          error: (error as Error).message,
          updatedEntityIds: [],
        };

        executionLog.events.push(errorEvent);
        if (onEvent) onEvent(errorEvent);

        actionResults.push({
          type: selection.toolCall.toolName,
          label: 'Failed',
          detail: (error as Error).message,
          deltas: [],
          status: 'failure',
          error: (error as Error).message,
        });

        stopReason = 'error';
        break;
      }

      currentStep++;
    }

    // Check if we hit max steps
    if (currentStep >= constraints.maxSteps && stopReason === 'success') {
      stopReason = 'max_steps';
    }

    // Finalize execution log
    executionLog.status = stopReason === 'success' ? 'success' : 'failure';
    executionLog.completedAt = new Date().toISOString();

    // Update plan status
    plan.status = stopReason === 'success' ? 'completed' : 'failed';
    if (onPlanUpdate) onPlanUpdate(plan);

    return {
      executionLog,
      plan,
      deltas: allDeltas,
      updatedEntityIds: Array.from(allUpdatedEntityIds),
      response: '', // Will be set by caller
      actionResults,
    };
  }

  /**
   * Execute a single action (for backwards compatibility).
   * Wraps the action in a single-step plan.
   */
  async executeAction(
    action: ToolInput,
    agentContext: AgentContext,
    services: ToolContextServices,
    config: AgentRuntimeConfig = { constraints: defaultConstraints }
  ): Promise<AgentResult> {
    // Create a single-step plan
    const plan: Plan = {
      goal: `Execute ${action.type}`,
      steps: [
        {
          rationale: `Execute ${action.type}`,
          toolCandidates: [
            {
              toolName: action.type as any,
              input: action,
            },
          ],
          requiresConfirmation: action.type === 'send_email',
        },
      ],
      status: 'pending',
    };

    return this.runPlan(plan, agentContext, services, config);
  }

  /**
   * Execute multiple actions in sequence (for backwards compatibility).
   */
  async executeActions(
    actions: ToolInput[],
    agentContext: AgentContext,
    services: ToolContextServices,
    config: AgentRuntimeConfig = { constraints: defaultConstraints }
  ): Promise<AgentResult> {
    // Create a multi-step plan
    const plan: Plan = {
      goal: `Execute ${actions.length} actions`,
      steps: actions.map((action, index) => ({
        rationale: `Step ${index + 1}: ${action.type}`,
        toolCandidates: [
          {
            toolName: action.type as any,
            input: action,
          },
        ],
        requiresConfirmation: action.type === 'send_email',
      })),
      status: 'pending',
    };

    return this.runPlan(plan, agentContext, services, config);
  }

  /**
   * Get the planner for building system prompts.
   */
  getPlanner(): Planner {
    return this.planner;
  }

  /**
   * Get the tool registry.
   */
  getRegistry(): ToolRegistry {
    return this.registry;
  }

  /**
   * Get the tool selector.
   */
  getSelector(): ToolSelector {
    return this.selector;
  }

  /**
   * Parse LLM response into a plan.
   */
  parsePlan(content: string): { plan: Plan; response: string } {
    return this.planner.parse(content);
  }

  /**
   * Get the response schema for LLM calls.
   */
  getResponseSchema() {
    return this.planner.getResponseSchema();
  }

  /**
   * Build a system prompt for the LLM.
   */
  buildSystemPrompt(context: AgentContext): string {
    return this.planner.buildSystemPrompt(context);
  }
}

/**
 * Create a new AgentRuntime with a fresh registry.
 */
export function createAgentRuntime(registry: ToolRegistry): AgentRuntime {
  return new AgentRuntime(registry);
}

/**
 * Create an AgentRuntime with all default tools registered.
 */
export function createDefaultAgentRuntime(): AgentRuntime {
  return new AgentRuntime(createToolRegistry());
}
