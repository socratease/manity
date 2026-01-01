/**
 * Add Subtask Tool - OpenAI Agents SDK Format
 *
 * Adds a new subtask to a task in a project's plan.
 */

import { z } from 'zod';
import { tool } from '@openai/agents';
import { getToolContext } from '../context';
import type { RemoveSubtaskDelta } from '../../agent/types';

export const AddSubtaskInput = z.object({
  projectId: z.string().optional().describe('ID of the project'),
  projectName: z.string().optional().describe('Name of the project'),
  taskId: z.string().optional().describe('ID of the parent task'),
  taskTitle: z.string().optional().describe('Title of the parent task'),
  title: z.string().describe('Title of the new subtask'),
  subtaskTitle: z.string().optional().describe('Alternative field for subtask title'),
  status: z.enum(['todo', 'in-progress', 'completed']).optional().default('todo').describe('Subtask status'),
  dueDate: z.string().optional().describe('Due date (ISO format)'),
  assignee: z.string().optional().describe('Name of the person assigned'),
});

export type AddSubtaskInputType = z.infer<typeof AddSubtaskInput>;

export const addSubtaskTool = tool({
  name: 'add_subtask',
  description: 'Add a new subtask to a task. Specify the project, parent task, and subtask title.',
  parameters: AddSubtaskInput,
  execute: async (input: AddSubtaskInputType): Promise<string> => {
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
    const taskRef = input.taskId || input.taskTitle;
    const task = ctx.resolveTask(workingProject, taskRef);
    if (!task) {
      const availableTasks = workingProject.plan.map(t => `"${t.title}"`).join(', ');
      const taskList = availableTasks || 'none';
      return `Skipped: Task "${taskRef}" not found in ${workingProject.name}. Available tasks: ${taskList}. Please specify a valid task ID or title.`;
    }

    // Get subtask title
    const title = (input.title || input.subtaskTitle || '').trim();
    if (!title) {
      return 'Error: Subtask title is required.';
    }

    // Check for duplicate
    const existing = task.subtasks?.find(
      st => st.title.toLowerCase() === title.toLowerCase()
    );
    if (existing) {
      return `Skipped: A subtask titled "${title}" already exists in task "${task.title}".`;
    }

    // Generate subtask ID
    const subtaskId = ctx.generateSubtaskId();

    // Parse assignee
    const assignee = input.assignee
      ? { name: input.assignee, team: ctx.findPersonByName(input.assignee)?.team }
      : undefined;

    // Create the new subtask
    const newSubtask = {
      id: subtaskId,
      title,
      status: input.status || 'todo',
      dueDate: input.dueDate,
      completedDate: input.status === 'completed' ? new Date().toISOString() : undefined,
      assignee,
    };

    // Ensure subtasks array exists
    if (!task.subtasks) {
      task.subtasks = [];
    }

    // Add subtask
    task.subtasks.push(newSubtask);

    // Create delta for undo
    const delta: RemoveSubtaskDelta = {
      type: 'remove_subtask',
      projectId: workingProject.id,
      taskId: task.id!,
      subtaskId,
    };
    ctx.trackDelta(delta);
    ctx.trackUpdatedEntity(workingProject.id);

    const dueDateStr = input.dueDate ? ` (due: ${input.dueDate})` : '';

    return `Added subtask "${title}" to task "${task.title}" in ${workingProject.name}${dueDateStr}.`;
  },
});

export default addSubtaskTool;
