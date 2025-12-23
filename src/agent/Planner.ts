/**
 * Planner
 *
 * Handles the planning phase of the agent loop.
 * Produces structured plans from LLM output.
 */

import type {
  Plan,
  PlanStep,
  ToolCall,
  ToolName,
  AgentContext,
  PortfolioSummary,
} from './types';
import { ToolRegistry } from './ToolRegistry';

/**
 * JSON schema for structured LLM output during planning.
 */
export const planningResponseSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'agent_plan',
    schema: {
      type: 'object',
      properties: {
        response: {
          type: 'string',
          description: 'Human-readable response to the user',
        },
        goal: {
          type: 'string',
          description: 'The goal this plan aims to achieve',
        },
        steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              rationale: {
                type: 'string',
                description: 'Why this step is needed',
              },
              toolCandidates: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    toolName: {
                      type: 'string',
                      description: 'Name of the tool to use',
                    },
                    input: {
                      type: 'object',
                      description: 'Input parameters for the tool',
                    },
                  },
                },
              },
              requiresConfirmation: {
                type: 'boolean',
                description: 'Whether this step needs user confirmation',
              },
              stopIf: {
                type: 'array',
                items: { type: 'string' },
                description: 'Conditions that would stop execution',
              },
            },
          },
        },
      },
      required: ['response', 'goal', 'steps'],
    },
  },
};

/**
 * Legacy response schema for backwards compatibility.
 * This matches the existing momentum response format.
 */
export const legacyResponseSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'momentum_response',
    schema: {
      type: 'object',
      properties: {
        response: { type: 'string' },
        actions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              projectId: { type: 'string' },
              projectName: { type: 'string' },
            },
          },
        },
      },
      required: ['response', 'actions'],
    },
  },
};

/**
 * Raw planning response from LLM.
 */
export interface PlanningResponse {
  response: string;
  goal?: string;
  steps?: Array<{
    rationale?: string;
    toolCandidates?: Array<{
      toolName: string;
      input: Record<string, unknown>;
    }>;
    requiresConfirmation?: boolean;
    stopIf?: string[];
  }>;
  // Legacy format support
  actions?: Array<{
    type: string;
    [key: string]: unknown;
  }>;
}

/**
 * Parse a planning response from LLM output.
 */
export function parsePlanningResponse(content: string): PlanningResponse | null {
  try {
    const parsed = JSON.parse(content);
    return parsed as PlanningResponse;
  } catch {
    return null;
  }
}

/**
 * Convert legacy actions array to modern plan format.
 */
export function convertLegacyActionsToPlan(
  actions: Array<{ type: string; [key: string]: unknown }>,
  goal: string
): Plan {
  const steps: PlanStep[] = actions.map((action, index) => {
    const toolName = action.type as ToolName;
    const input = { ...action };

    return {
      rationale: `Step ${index + 1}: Execute ${toolName}`,
      toolCandidates: [
        {
          toolName,
          input: input as ToolCall['input'],
        },
      ],
      requiresConfirmation: toolName === 'send_email',
      stopIf: [],
    };
  });

  return {
    goal,
    steps,
    status: 'pending',
  };
}

/**
 * Convert a planning response to a Plan object.
 */
export function responseToPlan(response: PlanningResponse): Plan {
  // If we have legacy actions, convert them
  if (response.actions && !response.steps) {
    return convertLegacyActionsToPlan(
      response.actions,
      response.goal || 'Execute requested actions'
    );
  }

  // Modern plan format
  const steps: PlanStep[] = (response.steps || []).map((step, index) => ({
    rationale: step.rationale || `Step ${index + 1}`,
    toolCandidates: (step.toolCandidates || []).map(tc => ({
      toolName: tc.toolName as ToolName,
      input: tc.input as ToolCall['input'],
    })),
    requiresConfirmation: step.requiresConfirmation || false,
    stopIf: step.stopIf || [],
  }));

  return {
    goal: response.goal || 'Execute plan',
    steps,
    status: 'pending',
  };
}

/**
 * Create a safe no-op plan (used when LLM output is invalid).
 */
export function createNoOpPlan(reason: string): Plan {
  return {
    goal: 'Unable to plan',
    steps: [
      {
        rationale: reason,
        toolCandidates: [],
        requiresConfirmation: false,
        stopIf: ['always'],
      },
    ],
    status: 'blocked',
  };
}

/**
 * Validate that a plan's tool calls reference valid tools.
 */
export function validatePlan(plan: Plan, registry: ToolRegistry): string[] {
  const errors: string[] = [];

  for (const step of plan.steps) {
    for (const candidate of step.toolCandidates) {
      if (!registry.has(candidate.toolName)) {
        errors.push(`Unknown tool: ${candidate.toolName}`);
      } else {
        // Validate input schema
        const inputErrors = registry.validateInput(
          candidate.toolName,
          candidate.input
        );
        errors.push(...inputErrors);
      }
    }
  }

  return errors;
}

/**
 * Build the planning system prompt.
 */
export function buildPlanningSystemPrompt(
  registry: ToolRegistry,
  context: AgentContext
): string {
  const toolDescriptions = registry.getToolDescriptionsForPrompt();
  const supportedTools = registry.getNames().join(', ');

  return `You are an AI project management assistant that helps manage a portfolio of projects.

## Your Role
- You help users manage projects, tasks, and team members
- You can add comments, create tasks, update progress, and send emails
- Always think step-by-step about what actions are needed

## Available Tools
${toolDescriptions}

Supported tool names: ${supportedTools}

## Response Format
You MUST respond with valid JSON containing:
- "response": A friendly, concise message to the user
- "actions": An array of actions to perform

Each action must have a "type" field matching one of the supported tools.
For project-related actions, include either "projectId" or "projectName".

## Context
LOGGED-IN USER: ${context.loggedInUser || 'Not set'}
- When the user says "me", "my", "I", they refer to: ${context.loggedInUser || 'the logged-in user'}
- Use "${context.loggedInUser || 'You'}" as the author for comments unless otherwise specified

## Guidelines
1. Be concise and direct in your responses
2. Only take actions that are explicitly requested or clearly necessary
3. Reference projects by their exact name or ID
4. For send_email, ensure recipients, subject, and body are provided
5. If you cannot complete a request, explain why in your response
6. For create_project actions, always include a non-empty "name" and specify status, priority, and progress (use status:"active", priority:"medium", progress:0 if the user does not specify). Provide fields directly on the action object, e.g., {"type":"create_project","name":"New Project","status":"active","priority":"medium","progress":0,"description":"..."}.

## Current Portfolio
${JSON.stringify(
  context.projects.map((p: PortfolioSummary) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    priority: p.priority,
    progress: p.progress,
  })),
  null,
  2
)}

## People Database
${JSON.stringify(
  context.people.map(p => ({
    name: p.name,
    team: p.team,
    email: p.email || null,
  })),
  null,
  2
)}`;
}

/**
 * Planner class
 *
 * Orchestrates the planning process.
 */
export class Planner {
  private registry: ToolRegistry;

  constructor(registry: ToolRegistry) {
    this.registry = registry;
  }

  /**
   * Parse LLM output into a plan.
   */
  parse(content: string): { plan: Plan; response: string } {
    const parsed = parsePlanningResponse(content);

    if (!parsed) {
      return {
        plan: createNoOpPlan('Failed to parse LLM response'),
        response: 'I apologize, but I encountered an error processing your request.',
      };
    }

    const plan = responseToPlan(parsed);
    const errors = validatePlan(plan, this.registry);

    if (errors.length > 0) {
      return {
        plan: createNoOpPlan(`Validation errors: ${errors.join(', ')}`),
        response: parsed.response || 'I encountered validation errors.',
      };
    }

    return {
      plan,
      response: parsed.response || '',
    };
  }

  /**
   * Get the schema for LLM structured output.
   */
  getResponseSchema(): typeof legacyResponseSchema {
    // Use legacy schema for backwards compatibility
    return legacyResponseSchema;
  }

  /**
   * Build a system prompt for the LLM.
   */
  buildSystemPrompt(context: AgentContext): string {
    return buildPlanningSystemPrompt(this.registry, context);
  }

  /**
   * Validate a plan before execution.
   */
  validate(plan: Plan): string[] {
    return validatePlan(plan, this.registry);
  }
}

/**
 * Create a new Planner instance.
 */
export function createPlanner(registry: ToolRegistry): Planner {
  return new Planner(registry);
}
