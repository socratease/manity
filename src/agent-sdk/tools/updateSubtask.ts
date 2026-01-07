/**
 * Update Subtask Tool - OpenAI Agents SDK Format
 *
 * Updates an existing subtask in a task.
 */

import { z } from 'zod';
import { tool, RunContext } from '@openai/agents';
import { getContextFromRunContext, ToolExecutionContext } from '../context';
import type { RestoreSubtaskDelta } from '../../agent/types';

export const UpdateSubtaskInput = z.object({
  projectId: z.string().optional().describe('ID of the project'),
  projectName: z.string().optional().describe('Name of the project'),
  taskId: z.string().optional().describe('ID of the parent task'),
  taskTitle: z.string().optional().describe('Title of the parent task'),
  subtaskId: z.string().optional().describe('ID of the subtask to update'),
  subtaskTitle: z.string().optional().describe('Title of the subtask to update'),
  title: z.string().optional().describe('New title for the subtask'),
  status: z.enum(['todo', 'in-progress', 'completed']).optional().describe('New status'),
  dueDate: z.string().optional().describe('New due date (ISO format)'),
  completedDate: z.string().optional().describe('Completion date (ISO format)'),
  assignee: z.string().nullable().optional().describe('New assignee name (null to unassign)'),
});

export type UpdateSubtaskInputType = z.infer<typeof UpdateSubtaskInput>;

export const updateSubtaskTool = tool({
  name: 'update_subtask',
  description: 'Update an existing subtask. Specify the project, parent task, and subtask (by ID or title), then provide fields to update.',
  parameters: UpdateSubtaskInput,
  execute: async (input: UpdateSubtaskInputType, runContext?: RunContext<ToolExecutionContext>): Promise<string> => {
    const ctx = getContextFromRunContext(runContext);

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

    // Resolve subtask
    const subtask = ctx.resolveSubtask(task, input.subtaskId || input.subtaskTitle);
    if (!subtask) {
      return `Skipped: Subtask not found in task "${task.title}". Please specify a valid subtask ID or title.`;
    }

    // Store previous values for undo
    const previous = {
      title: subtask.title,
      status: subtask.status,
      dueDate: subtask.dueDate,
      completedDate: subtask.completedDate,
      assignee: subtask.assignee ? { ...subtask.assignee } : null,
    };

    // Track what changed
    const changes: string[] = [];

    // Apply updates
    if (input.title && input.title !== subtask.title) {
      subtask.title = input.title;
      changes.push(`renamed to "${input.title}"`);
    }

    if (input.status && input.status !== subtask.status) {
      const oldStatus = subtask.status;
      subtask.status = input.status;
      changes.push(`status: ${oldStatus} -> ${input.status}`);

      // Auto-set completion date if marked completed
      if (input.status === 'completed' && !subtask.completedDate) {
        subtask.completedDate = new Date().toISOString();
      }
    }

    if (input.dueDate !== undefined && input.dueDate !== subtask.dueDate) {
      subtask.dueDate = input.dueDate;
      changes.push(`due date: ${input.dueDate || 'removed'}`);
    }

    if (input.completedDate !== undefined) {
      subtask.completedDate = input.completedDate;
    }

    if (input.assignee !== undefined) {
      if (input.assignee === null) {
        subtask.assignee = null;
        changes.push('unassigned');
      } else {
        const person = ctx.findPersonByName(input.assignee);
        subtask.assignee = { name: input.assignee, team: person?.team };
        changes.push(`assigned to ${input.assignee}`);
      }
    }

    if (changes.length === 0) {
      return `No changes made to subtask "${subtask.title}" in task "${task.title}".`;
    }

    // Create delta for undo
    const delta: RestoreSubtaskDelta = {
      type: 'restore_subtask',
      projectId: workingProject.id,
      taskId: task.id!,
      subtaskId: subtask.id!,
      previous,
    };
    ctx.trackDelta(delta);
    ctx.trackUpdatedEntity(workingProject.id);

    return `Updated subtask "${subtask.title}" in task "${task.title}": ${changes.join(', ')}.`;
  },
});

export default updateSubtaskTool;
