/**
 * Create Initiative Tool - OpenAI Agents SDK Format
 *
 * Creates a new initiative (meta-project) in the portfolio.
 * Initiatives group related projects together.
 */

import { z } from 'zod';
import { tool, RunContext } from '@openai/agents';
import { getContextFromRunContext, ToolExecutionContext } from '../context';

export const CreateInitiativeInput = z.object({
  name: z.string().describe('Name of the new initiative'),
  description: z.string().optional().describe('Initiative description'),
  priority: z.enum(['high', 'medium', 'low']).optional().default('medium').describe('Initiative priority'),
  status: z.enum(['planning', 'active', 'on-hold', 'cancelled', 'completed']).optional().default('planning').describe('Initiative status'),
  targetDate: z.string().optional().describe('Target completion date (ISO format)'),
  startDate: z.string().optional().describe('Initiative start date (ISO format)'),
  owners: z.string().optional().describe('Comma-separated list of owner names'),
});

export type CreateInitiativeInputType = z.infer<typeof CreateInitiativeInput>;

export const createInitiativeTool = tool({
  name: 'create_initiative',
  description: 'Create a new initiative (meta-project) that groups related projects together. Initiatives have owners who are responsible for overseeing the grouped projects. Provide at least a name.',
  parameters: CreateInitiativeInput,
  execute: async (input: CreateInitiativeInputType, runContext?: RunContext<ToolExecutionContext>): Promise<string> => {
    const ctx = getContextFromRunContext(runContext);

    // Get initiative name
    const initiativeName = (input.name || '').trim();
    if (!initiativeName) {
      return 'Error: Initiative name is required.';
    }

    // Check for duplicate (case-insensitive)
    const existingInitiatives = ctx.initiatives || [];
    const existing = existingInitiatives.find(
      (i: { name: string }) => i.name.toLowerCase() === initiativeName.toLowerCase()
    );
    if (existing) {
      return `Skipped: An initiative named "${initiativeName}" already exists.`;
    }

    // Generate initiative ID
    const initiativeId = `initiative-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Parse owners
    const owners = input.owners
      ? input.owners.split(',').map(s => ({
          name: s.trim(),
          team: '',
          email: undefined,
        }))
      : [];

    // Create the new initiative
    const newInitiative = {
      id: initiativeId,
      name: initiativeName,
      description: input.description || '',
      priority: input.priority || 'medium',
      status: input.status || 'planning',
      targetDate: input.targetDate,
      startDate: input.startDate || new Date().toISOString().split('T')[0],
      owners,
      stakeholders: [], // Will be populated from projects
      projects: [],
    };

    // Add to working initiatives
    if (!ctx.workingInitiatives) {
      ctx.workingInitiatives = [];
    }
    ctx.workingInitiatives.push(newInitiative);

    // Track for persistence (the API will handle the actual creation)
    ctx.trackUpdatedEntity(initiativeId);

    return `Created initiative "${initiativeName}" with ${input.priority || 'medium'} priority and ${input.status || 'planning'} status.${owners.length > 0 ? ` Owners: ${owners.map(o => o.name).join(', ')}.` : ''}`;
  },
});

export default createInitiativeTool;
