/**
 * Add Project to Initiative Tool - OpenAI Agents SDK Format
 *
 * Links an existing project to an initiative.
 */

import { z } from 'zod';
import { tool, RunContext } from '@openai/agents';
import { getContextFromRunContext, ToolExecutionContext } from '../context';

export const AddProjectToInitiativeInput = z.object({
  projectId: z.string().optional().describe('ID of the project to add'),
  projectName: z.string().optional().describe('Name of the project to add'),
  initiativeId: z.string().optional().describe('ID of the initiative to update'),
  initiativeName: z.string().optional().describe('Name of the initiative to update'),
});

export type AddProjectToInitiativeInputType = z.infer<typeof AddProjectToInitiativeInput>;

export const addProjectToInitiativeTool = tool({
  name: 'add_project_to_initiative',
  description: 'Add an existing project to an initiative. Specify both the project and initiative by ID or name.',
  parameters: AddProjectToInitiativeInput,
  execute: async (input: AddProjectToInitiativeInputType, runContext?: RunContext<ToolExecutionContext>): Promise<string> => {
    const ctx = getContextFromRunContext(runContext);

    const project = ctx.resolveProject(input.projectId || input.projectName);
    if (!project) {
      return 'Skipped: Project not found. Please specify a valid project ID or name.';
    }

    const initiative = ctx.resolveInitiative(input.initiativeId || input.initiativeName);
    if (!initiative) {
      return 'Skipped: Initiative not found. Please specify a valid initiative ID or name.';
    }

    const alreadyLinked = initiative.projects?.some(
      linkedProject => String(linkedProject.id) === String(project.id)
    );
    if (alreadyLinked) {
      return `Skipped: Project "${project.name}" is already linked to initiative "${initiative.name}".`;
    }

    try {
      const updatedInitiative = await ctx.services.addProjectToInitiative(String(initiative.id), String(project.id));
      const initiativeIndex = ctx.workingInitiatives.findIndex(item => item.id === initiative.id);
      if (initiativeIndex >= 0) {
        ctx.workingInitiatives[initiativeIndex] = updatedInitiative;
      } else {
        ctx.workingInitiatives.push(updatedInitiative);
      }
      ctx.trackUpdatedEntity(updatedInitiative.id);
      return `Added project "${project.name}" to initiative "${initiative.name}".`;
    } catch (error) {
      return `Error adding project to initiative: ${(error as Error).message}`;
    }
  },
});

export default addProjectToInitiativeTool;
