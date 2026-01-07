/**
 * Add Stakeholders Tool - OpenAI Agents SDK Format
 *
 * Adds stakeholders to an existing project without overwriting existing ones.
 */

import { z } from 'zod';
import { tool, RunContext } from '@openai/agents';
import { getContextFromRunContext, ToolExecutionContext } from '../context';
import type { RestoreProjectDelta, Stakeholder } from '../../agent/types';

const StakeholderInput = z.union([
  z.string().describe('Stakeholder name'),
  z.object({
    name: z.string().describe('Stakeholder name'),
    team: z.string().optional().describe('Team or role'),
  }),
]);

export const AddStakeholdersInput = z.object({
  projectId: z.string().optional().describe('ID of the project'),
  projectName: z.string().optional().describe('Name of the project'),
  stakeholders: z.array(StakeholderInput).min(1).describe('Stakeholders to add to the project'),
});

export type AddStakeholdersInputType = z.infer<typeof AddStakeholdersInput>;

export const addStakeholdersTool = tool({
  name: 'add_stakeholders',
  description: 'Add one or more stakeholders to a project without removing existing stakeholders.',
  parameters: AddStakeholdersInput,
  execute: async (input: AddStakeholdersInputType, runContext?: RunContext<ToolExecutionContext>): Promise<string> => {
    const ctx = getContextFromRunContext(runContext);

    const project = ctx.resolveProject(input.projectId || input.projectName);
    if (!project) {
      return 'Skipped: Project not found. Please specify a valid project ID or name.';
    }

    const workingProject = ctx.workingProjects.find(p => p.id === project.id);
    if (!workingProject) {
      return 'Error: Project not in working set.';
    }

    const incoming = (input.stakeholders || [])
      .map(entry => (typeof entry === 'string' ? { name: entry } : entry))
      .map(entry => ({
        name: (entry?.name || '').trim(),
        team: entry?.team?.trim(),
      }))
      .filter(entry => entry.name.length > 0);

    if (incoming.length === 0) {
      return 'Error: At least one stakeholder name is required.';
    }

    const existing = workingProject.stakeholders || [];
    const existingNames = new Set(existing.map(s => s.name.toLowerCase()));
    const added: Stakeholder[] = [];

    for (const entry of incoming) {
      const normalizedName = entry.name.toLowerCase();
      if (existingNames.has(normalizedName)) {
        continue;
      }
      const person = ctx.findPersonByName(entry.name);
      const stakeholder: Stakeholder = {
        name: entry.name,
        team: entry.team || person?.team || '',
        email: person?.email || undefined,
      };
      existingNames.add(normalizedName);
      added.push(stakeholder);
    }

    if (added.length === 0) {
      return `No changes made to project "${workingProject.name}".`;
    }

    const previous = {
      stakeholders: [...existing],
      lastUpdate: workingProject.lastUpdate,
    };

    workingProject.stakeholders = [...existing, ...added];
    workingProject.lastUpdate = `Added stakeholders: ${added.map(s => s.name).join(', ')}`;

    const delta: RestoreProjectDelta = {
      type: 'restore_project',
      projectId: workingProject.id,
      previous,
    };
    ctx.trackDelta(delta);
    ctx.trackUpdatedEntity(workingProject.id);

    return `Added stakeholders to "${workingProject.name}": ${added.map(s => s.name).join(', ')}.`;
  },
});

export default addStakeholdersTool;
