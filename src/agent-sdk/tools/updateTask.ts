/**
 * Update Task Tool - OpenAI Agents SDK Format
 *
 * Updates an existing task in a project's plan.
 */

import { z } from 'zod';
import { tool } from '@openai/agents';
import { getToolContext } from '../context';
import type { RestoreTaskDelta } from '../../agent/types';

export const UpdateTaskInput = z.object({
  projectId: z.string().optional().describe('ID of the project'),
  projectName: z.string().optional().describe('Name of the project'),
  taskId: z.string().optional().describe('ID of the task to update'),
  taskTitle: z.string().optional().describe('Title of the task to update'),
  title: z.string().optional().describe('New title for the task'),
  status: z.enum(['todo', 'in-progress', 'completed']).optional().describe('New status'),
  dueDate: z.string().optional().describe('New due date (ISO format)'),
  completedDate: z.string().optional().describe('Completion date (ISO format)'),
  assignee: z.string().nullable().optional().describe('New assignee name (null to unassign)'),
});

export type UpdateTaskInputType = z.infer<typeof UpdateTaskInput>;

export const updateTaskTool = tool({
  name: 'update_task',
  description: 'Update an existing task in a project. Specify the project and task (by ID or title), then provide the fields to update.',
  parameters: UpdateTaskInput,
  execute: async (input: UpdateTaskInputType): Promise<string> => {
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

    // Resolve task
    const task = ctx.resolveTask(workingProject, input.taskId || input.taskTitle);
    if (!task) {
      return `Skipped: Task not found in ${workingProject.name}. Please specify a valid task ID or title.`;
    }

    // Store previous values for undo
    const previous = {
      title: task.title,
      status: task.status,
      dueDate: task.dueDate,
      completedDate: task.completedDate,
      assignee: task.assignee ? { ...task.assignee } : null,
    };

    // Track what changed
    const changes: string[] = [];

    // Apply updates
    if (input.title && input.title !== task.title) {
      task.title = input.title;
      changes.push(`renamed to "${input.title}"`);
    }

    if (input.status && input.status !== task.status) {
      const oldStatus = task.status;
      task.status = input.status;
      changes.push(`status: ${oldStatus} -> ${input.status}`);

      // Auto-set completion date if marked completed
      if (input.status === 'completed' && !task.completedDate) {
        task.completedDate = new Date().toISOString();
      }
    }

    if (input.dueDate !== undefined && input.dueDate !== task.dueDate) {
      task.dueDate = input.dueDate;
      changes.push(`due date: ${input.dueDate || 'removed'}`);
    }

    if (input.completedDate !== undefined) {
      task.completedDate = input.completedDate;
    }

    if (input.assignee !== undefined) {
      if (input.assignee === null) {
        task.assignee = null;
        changes.push('unassigned');
      } else {
        const person = ctx.findPersonByName(input.assignee);
        task.assignee = { name: input.assignee, team: person?.team };
        changes.push(`assigned to ${input.assignee}`);
      }
    }

    if (changes.length === 0) {
      return `No changes made to task "${task.title}" in ${workingProject.name}.`;
    }

    // Create delta for undo
    const delta: RestoreTaskDelta = {
      type: 'restore_task',
      projectId: workingProject.id,
      taskId: task.id!,
      previous,
    };
    ctx.trackDelta(delta);
    ctx.trackUpdatedEntity(workingProject.id);

    return `Updated task "${task.title}" in ${workingProject.name}: ${changes.join(', ')}.`;
  },
});

export default updateTaskTool;
