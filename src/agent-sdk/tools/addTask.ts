/**
 * Add Task Tool - OpenAI Agents SDK Format
 *
 * Adds a new task to a project's plan.
 */

import { z } from 'zod';
import { tool } from '@openai/agents';
import { getToolContext } from '../context';
import type { RemoveTaskDelta } from '../../agent/types';

export const AddTaskInput = z.object({
  projectId: z.string().optional().describe('ID of the project'),
  projectName: z.string().optional().describe('Name of the project'),
  title: z.string().describe('Title of the new task'),
  status: z.enum(['todo', 'in-progress', 'completed']).optional().default('todo').describe('Task status'),
  dueDate: z.string().optional().describe('Due date (ISO format)'),
  assignee: z.string().optional().describe('Name of the person assigned to this task'),
});

export type AddTaskInputType = z.infer<typeof AddTaskInput>;

export const addTaskTool = tool({
  name: 'add_task',
  description: 'Add a new task to a project plan. Specify the project and task title. Optionally set status, due date, and assignee.',
  parameters: AddTaskInput,
  execute: async (input: AddTaskInputType): Promise<string> => {
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

    // Validate title
    const title = (input.title || '').trim();
    if (!title) {
      return 'Error: Task title is required.';
    }

    // Check for duplicate task
    const existingTask = workingProject.plan.find(
      t => t.title.toLowerCase() === title.toLowerCase()
    );
    if (existingTask) {
      return `Skipped: A task titled "${title}" already exists in ${workingProject.name}.`;
    }

    // Generate task ID
    const taskId = ctx.generateTaskId();

    // Parse assignee
    const assignee = input.assignee
      ? { name: input.assignee, team: ctx.findPersonByName(input.assignee)?.team }
      : undefined;

    // Create the new task
    const newTask = {
      id: taskId,
      title,
      status: input.status || 'todo',
      dueDate: input.dueDate,
      completedDate: input.status === 'completed' ? new Date().toISOString() : undefined,
      assignee,
      subtasks: [],
    };

    // Add to project plan
    workingProject.plan.push(newTask);

    // Create delta for undo
    const delta: RemoveTaskDelta = {
      type: 'remove_task',
      projectId: workingProject.id,
      taskId,
    };
    ctx.trackDelta(delta);
    ctx.trackUpdatedEntity(workingProject.id);

    const dueDateStr = input.dueDate ? ` (due: ${input.dueDate})` : '';
    const assigneeStr = input.assignee ? ` assigned to ${input.assignee}` : '';

    return `Added task "${title}" to ${workingProject.name}${dueDateStr}${assigneeStr}.`;
  },
});

export default addTaskTool;
