/**
 * Update Project Tool - OpenAI Agents SDK Format
 *
 * Updates an existing project's properties.
 */

import { z } from 'zod';
import { tool } from '@openai/agents';
import { getToolContext } from '../context';
import type { RestoreProjectDelta } from '../../agent/types';

export const UpdateProjectInput = z.object({
  projectId: z.string().optional().describe('ID of the project to update'),
  projectName: z.string().optional().describe('Name of the project to update'),
  name: z.string().optional().describe('New name for the project'),
  description: z.string().optional().describe('New description'),
  executiveUpdate: z.string().optional().describe('Executive update summary'),
  status: z.enum(['planning', 'active', 'on-hold', 'cancelled', 'completed']).optional().describe('New status'),
  priority: z.enum(['high', 'medium', 'low']).optional().describe('New priority'),
  progress: z.number().min(0).max(100).optional().describe('New progress percentage'),
  targetDate: z.string().optional().describe('New target date (ISO format)'),
  startDate: z.string().optional().describe('New start date (ISO format)'),
});

export type UpdateProjectInputType = z.infer<typeof UpdateProjectInput>;

export const updateProjectTool = tool({
  name: 'update_project',
  description: 'Update an existing project. Specify the project by ID or name, then provide the fields to update.',
  parameters: UpdateProjectInput,
  execute: async (input: UpdateProjectInputType): Promise<string> => {
    const ctx = getToolContext();

    // Resolve project
    const project = ctx.resolveProject(input.projectId || input.projectName);
    if (!project) {
      return 'Skipped: Project not found. Please specify a valid project ID or name.';
    }

    // Get working project
    const workingProject = ctx.workingProjects.find(p => p.id === project.id);
    if (!workingProject) {
      return 'Error: Project not in working set.';
    }

    // Store previous values for undo
    const previous: Record<string, unknown> = {};
    const changes: string[] = [];

    // Apply updates
    if (input.name && input.name !== workingProject.name) {
      previous.name = workingProject.name;
      workingProject.name = input.name;
      changes.push(`renamed to "${input.name}"`);
    }

    if (input.description !== undefined && input.description !== workingProject.description) {
      previous.description = workingProject.description;
      workingProject.description = input.description;
      changes.push('description updated');
    }

    if (input.executiveUpdate !== undefined && input.executiveUpdate !== workingProject.executiveUpdate) {
      previous.executiveUpdate = workingProject.executiveUpdate;
      workingProject.executiveUpdate = input.executiveUpdate;
      changes.push('executive update added');
    }

    if (input.status && input.status !== workingProject.status) {
      previous.status = workingProject.status;
      const oldStatus = workingProject.status;
      workingProject.status = input.status;
      changes.push(`status: ${oldStatus} -> ${input.status}`);
    }

    if (input.priority && input.priority !== workingProject.priority) {
      previous.priority = workingProject.priority;
      const oldPriority = workingProject.priority;
      workingProject.priority = input.priority;
      changes.push(`priority: ${oldPriority} -> ${input.priority}`);
    }

    if (input.progress !== undefined && input.progress !== workingProject.progress) {
      previous.progress = workingProject.progress;
      const oldProgress = workingProject.progress;
      workingProject.progress = input.progress;
      changes.push(`progress: ${oldProgress}% -> ${input.progress}%`);
    }

    if (input.targetDate !== undefined && input.targetDate !== workingProject.targetDate) {
      previous.targetDate = workingProject.targetDate;
      workingProject.targetDate = input.targetDate;
      changes.push(`target date: ${input.targetDate || 'removed'}`);
    }

    if (input.startDate !== undefined && input.startDate !== workingProject.startDate) {
      previous.startDate = workingProject.startDate;
      workingProject.startDate = input.startDate;
      changes.push(`start date: ${input.startDate || 'removed'}`);
    }

    if (changes.length === 0) {
      return `No changes made to project "${workingProject.name}".`;
    }

    // Update lastUpdate
    previous.lastUpdate = workingProject.lastUpdate;
    workingProject.lastUpdate = changes.join(', ');

    // Create delta for undo
    const delta: RestoreProjectDelta = {
      type: 'restore_project',
      projectId: workingProject.id,
      previous: previous as RestoreProjectDelta['previous'],
    };
    ctx.trackDelta(delta);
    ctx.trackUpdatedEntity(workingProject.id);

    return `Updated project "${workingProject.name}": ${changes.join(', ')}.`;
  },
});

export default updateProjectTool;
