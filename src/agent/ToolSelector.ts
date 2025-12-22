/**
 * Tool Selector
 *
 * Selects the next tool to execute based on plan, context, and registry metadata.
 */

import type {
  Plan,
  PlanStep,
  ToolCall,
  ToolContext,
  ToolName,
  AgentConstraints,
} from './types';
import { ToolRegistry } from './ToolRegistry';

/**
 * Selection result from the tool selector.
 */
export interface SelectionResult {
  /** The selected tool call, or null if blocked */
  toolCall: ToolCall | null;
  /** Index of the step being executed */
  stepIndex: number;
  /** Reason for selection or blocking */
  reason: string;
  /** Whether execution should stop */
  shouldStop: boolean;
  /** Stop reason if applicable */
  stopReason?: 'blocked' | 'safety' | 'completed' | 'no_candidates';
}

/**
 * Tool Selector class
 *
 * Implements the selection policy for choosing which tool to execute next.
 */
export class ToolSelector {
  private registry: ToolRegistry;

  constructor(registry: ToolRegistry) {
    this.registry = registry;
  }

  /**
   * Select the next tool call to execute from the plan.
   */
  selectNextStep(
    plan: Plan,
    stepIndex: number,
    context: ToolContext,
    constraints: AgentConstraints
  ): SelectionResult {
    // Check if plan is complete
    if (stepIndex >= plan.steps.length) {
      return {
        toolCall: null,
        stepIndex,
        reason: 'Plan completed',
        shouldStop: true,
        stopReason: 'completed',
      };
    }

    const step = plan.steps[stepIndex];

    // Check if step requires confirmation
    if (step.requiresConfirmation && constraints.requireConfirmation) {
      return {
        toolCall: null,
        stepIndex,
        reason: 'Step requires user confirmation',
        shouldStop: true,
        stopReason: 'blocked',
      };
    }

    // Check for candidates
    if (!step.toolCandidates || step.toolCandidates.length === 0) {
      return {
        toolCall: null,
        stepIndex,
        reason: 'No tool candidates for this step',
        shouldStop: true,
        stopReason: 'no_candidates',
      };
    }

    // Evaluate each candidate
    for (const candidate of step.toolCandidates) {
      const selectionResult = this.evaluateCandidate(
        candidate,
        context,
        constraints
      );

      if (selectionResult.eligible) {
        return {
          toolCall: candidate,
          stepIndex,
          reason: selectionResult.reason,
          shouldStop: false,
        };
      }

      // If blocked by safety, stop execution
      if (selectionResult.blockedBySafety) {
        return {
          toolCall: null,
          stepIndex,
          reason: selectionResult.reason,
          shouldStop: true,
          stopReason: 'safety',
        };
      }
    }

    // No eligible candidates
    return {
      toolCall: null,
      stepIndex,
      reason: 'No eligible tool candidates',
      shouldStop: true,
      stopReason: 'blocked',
    };
  }

  /**
   * Evaluate whether a tool candidate is eligible for execution.
   */
  private evaluateCandidate(
    candidate: ToolCall,
    context: ToolContext,
    constraints: AgentConstraints
  ): {
    eligible: boolean;
    reason: string;
    blockedBySafety: boolean;
  } {
    const { toolName, input } = candidate;

    // Check if tool exists
    const tool = this.registry.get(toolName);
    if (!tool) {
      return {
        eligible: false,
        reason: `Unknown tool: ${toolName}`,
        blockedBySafety: false,
      };
    }

    // Check if tool is excluded
    if (constraints.excludeTools?.includes(toolName)) {
      return {
        eligible: false,
        reason: `Tool ${toolName} is excluded`,
        blockedBySafety: false,
      };
    }

    // Check side-effect constraints
    if (tool.metadata.sideEffecting && !constraints.allowSideEffects) {
      return {
        eligible: false,
        reason: `Tool ${toolName} has side effects and side effects are not allowed`,
        blockedBySafety: true,
      };
    }

    // Check confirmation requirement
    if (tool.metadata.requiresConfirmation && constraints.requireConfirmation) {
      return {
        eligible: false,
        reason: `Tool ${toolName} requires confirmation`,
        blockedBySafety: true,
      };
    }

    // Validate input
    const validationErrors = this.registry.validateInput(toolName, input);
    if (validationErrors.length > 0) {
      return {
        eligible: false,
        reason: `Invalid input for ${toolName}: ${validationErrors.join(', ')}`,
        blockedBySafety: false,
      };
    }

    // Check context-specific conditions
    const contextCheck = this.checkContextConditions(candidate, context);
    if (!contextCheck.valid) {
      return {
        eligible: false,
        reason: contextCheck.reason,
        blockedBySafety: false,
      };
    }

    return {
      eligible: true,
      reason: `Eligible to execute ${toolName}`,
      blockedBySafety: false,
    };
  }

  /**
   * Check context-specific conditions for a tool candidate.
   */
  private checkContextConditions(
    candidate: ToolCall,
    context: ToolContext
  ): { valid: boolean; reason: string } {
    const { toolName, input } = candidate;

    // For project-related tools, check that project exists or will be created
    const projectRelatedTools: ToolName[] = [
      'comment',
      'add_task',
      'update_task',
      'add_subtask',
      'update_subtask',
      'update_project',
      'query_portfolio',
    ];

    if (projectRelatedTools.includes(toolName)) {
      const projectRef =
        (input as Record<string, unknown>).projectId ||
        (input as Record<string, unknown>).projectName;

      // Skip check for query_portfolio without project filter
      if (toolName === 'query_portfolio' && !projectRef) {
        return { valid: true, reason: 'Portfolio-wide query' };
      }

      // For other tools, project reference is required
      if (!projectRef && toolName !== 'query_portfolio') {
        return {
          valid: false,
          reason: `${toolName} requires a projectId or projectName`,
        };
      }
    }

    return { valid: true, reason: 'Context conditions met' };
  }

  /**
   * Get tools that would be allowed given the current constraints.
   */
  getAllowedTools(constraints: AgentConstraints): ToolName[] {
    return this.registry.getNames().filter(name => {
      if (constraints.excludeTools?.includes(name)) {
        return false;
      }

      const tool = this.registry.get(name);
      if (!tool) return false;

      if (tool.metadata.sideEffecting && !constraints.allowSideEffects) {
        return false;
      }

      if (tool.metadata.requiresConfirmation && constraints.requireConfirmation) {
        return false;
      }

      return true;
    });
  }

  /**
   * Suggest the best tool for a given context.
   */
  suggestTool(
    context: ToolContext,
    constraints: AgentConstraints,
    intent: 'read' | 'mutate' | 'communicate'
  ): ToolName | null {
    const allowedTools = this.getAllowedTools(constraints);

    if (intent === 'read') {
      const readTools = allowedTools.filter(name => {
        const tool = this.registry.get(name);
        return tool?.metadata.readsState && !tool.metadata.mutatesState;
      });
      return readTools[0] || null;
    }

    if (intent === 'communicate') {
      const commTools = allowedTools.filter(name => {
        const tool = this.registry.get(name);
        return tool?.metadata.tags.includes('communication');
      });
      return commTools[0] || null;
    }

    // Default to mutating tools
    const mutateTools = allowedTools.filter(name => {
      const tool = this.registry.get(name);
      return tool?.metadata.mutatesState;
    });
    return mutateTools[0] || null;
  }
}

/**
 * Create a new ToolSelector instance.
 */
export function createToolSelector(registry: ToolRegistry): ToolSelector {
  return new ToolSelector(registry);
}
