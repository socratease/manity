/**
 * Add Person Tool - OpenAI Agents SDK Format
 *
 * Adds a new person to the people database.
 */

import { z } from 'zod';
import { tool, RunContext } from '@openai/agents';
import { getContextFromRunContext, ToolExecutionContext } from '../context';

export const AddPersonInput = z.object({
  name: z.string().describe('Name of the person'),
  personName: z.string().optional().describe('Alternative field for name'),
  team: z.string().optional().describe('Team or department'),
  email: z.string().email().optional().describe('Email address'),
});

export type AddPersonInputType = z.infer<typeof AddPersonInput>;

export const addPersonTool = tool({
  name: 'add_person',
  description: 'Add a new person to the database. Provide their name and optionally team and email.',
  parameters: AddPersonInput,
  execute: async (input: AddPersonInputType, runContext?: RunContext<ToolExecutionContext>): Promise<string> => {
    const ctx = getContextFromRunContext(runContext);

    // Get person name
    const name = (input.name || input.personName || '').trim();
    if (!name) {
      return 'Error: Person name is required.';
    }

    // Check if person already exists
    const existing = ctx.findPersonByName(name);
    if (existing) {
      return `Skipped: A person named "${name}" already exists in the database.`;
    }

    // Create the new person via service
    try {
      const newPerson = await ctx.services.createPerson({
        name,
        team: input.team || '',
        email: input.email,
      });

      // Add to local people array for this session
      ctx.people.push(newPerson);

      const teamStr = input.team ? ` (${input.team})` : '';
      const emailStr = input.email ? ` <${input.email}>` : '';

      return `Added person "${name}"${teamStr}${emailStr} to the database.`;
    } catch (error) {
      return `Error adding person: ${(error as Error).message}`;
    }
  },
});

export default addPersonTool;
