/**
 * Add Initiative Owner Tool - OpenAI Agents SDK Format
 *
 * Adds one or more owners to an existing initiative.
 */

import { z } from 'zod';
import { tool, RunContext } from '@openai/agents';
import { getContextFromRunContext, ToolExecutionContext } from '../context';

const OwnerInput = z.union([
  z.string().describe('Owner name'),
  z.object({
    name: z.string().describe('Owner name'),
  }),
]);

export const AddInitiativeOwnerInput = z.object({
  initiativeId: z.string().optional().describe('ID of the initiative to update'),
  initiativeName: z.string().optional().describe('Name of the initiative to update'),
  owners: z.array(OwnerInput).min(1).describe('Owner name(s) to add to the initiative'),
});

export type AddInitiativeOwnerInputType = z.infer<typeof AddInitiativeOwnerInput>;

export const addInitiativeOwnerTool = tool({
  name: 'add_initiative_owner',
  description: 'Add one or more owners to an initiative. Specify the initiative by ID or name and provide owner names.',
  parameters: AddInitiativeOwnerInput,
  execute: async (input: AddInitiativeOwnerInputType, runContext?: RunContext<ToolExecutionContext>): Promise<string> => {
    const ctx = getContextFromRunContext(runContext);

    const initiative = ctx.resolveInitiative(input.initiativeId || input.initiativeName);
    if (!initiative) {
      return 'Skipped: Initiative not found. Please specify a valid initiative ID or name.';
    }

    const incoming = (input.owners || [])
      .map(entry => (typeof entry === 'string' ? { name: entry } : entry))
      .map(entry => ({
        name: (entry?.name || '').trim(),
      }))
      .filter(entry => entry.name.length > 0);

    if (incoming.length === 0) {
      return 'Error: At least one owner name is required.';
    }

    const existingOwners = initiative.owners || [];
    const existingNames = new Set(existingOwners.map(owner => owner.name.toLowerCase()));
    const existingIds = new Set(
      existingOwners
        .map(owner => owner.id)
        .filter((id): id is string | number => id !== undefined && id !== null)
        .map(id => String(id).toLowerCase())
    );

    const added: string[] = [];
    const skipped: string[] = [];
    const notFound: string[] = [];
    const missingId: string[] = [];
    let updatedInitiative = initiative;

    for (const entry of incoming) {
      const normalizedName = entry.name.toLowerCase();
      if (existingNames.has(normalizedName)) {
        skipped.push(entry.name);
        continue;
      }

      const person = ctx.findPersonByName(entry.name);
      if (!person) {
        notFound.push(entry.name);
        continue;
      }

      if (!person.id) {
        missingId.push(person.name);
        continue;
      }

      const normalizedId = String(person.id).toLowerCase();
      if (existingIds.has(normalizedId)) {
        skipped.push(person.name);
        continue;
      }

      try {
        updatedInitiative = await ctx.services.addOwnerToInitiative(String(updatedInitiative.id), person.id);
        const initiativeIndex = ctx.workingInitiatives.findIndex(item => item.id === updatedInitiative.id);
        if (initiativeIndex >= 0) {
          ctx.workingInitiatives[initiativeIndex] = updatedInitiative;
        } else {
          ctx.workingInitiatives.push(updatedInitiative);
        }
        ctx.trackUpdatedEntity(updatedInitiative.id);
        existingNames.add(normalizedName);
        existingIds.add(normalizedId);
        added.push(person.name);
      } catch (error) {
        return `Error adding owner "${person.name}" to initiative "${initiative.name}": ${(error as Error).message}`;
      }
    }

    if (added.length === 0) {
      const reasons: string[] = [];
      if (skipped.length > 0) {
        reasons.push(`Already owners: ${skipped.join(', ')}`);
      }
      if (notFound.length > 0) {
        reasons.push(`People not found: ${notFound.join(', ')}`);
      }
      if (missingId.length > 0) {
        reasons.push(`Missing person IDs: ${missingId.join(', ')}`);
      }
      if (reasons.length > 0) {
        return `No owners added to initiative "${initiative.name}". ${reasons.join('. ')}.`;
      }
      return `No changes made to initiative "${initiative.name}".`;
    }

    const notes: string[] = [];
    if (skipped.length > 0) {
      notes.push(`Already owners: ${skipped.join(', ')}`);
    }
    if (notFound.length > 0) {
      notes.push(`People not found: ${notFound.join(', ')}`);
    }
    if (missingId.length > 0) {
      notes.push(`Missing person IDs: ${missingId.join(', ')}`);
    }

    return `Added owners to initiative "${initiative.name}": ${added.join(', ')}.${notes.length > 0 ? ` ${notes.join('. ')}.` : ''}`;
  },
});

export default addInitiativeOwnerTool;
