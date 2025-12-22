/**
 * Add Subtask Tool
 *
 * Adds a new subtask to an existing task.
 */

import type {
  ToolDefinition,
  ToolContext,
  ToolResult,
  AddSubtaskInput,
  RemoveSubtaskDelta,
  Subtask,
} from '../types';
import { generateSubtaskId, describeDueDate } from '../context/helpers';

export const addSubtaskTool: ToolDefinition = {
  name: 'add_subtask',
  description: 'Add a new subtask to an existing task',

  inputSchema: {
    type: 'object',
    properties: {
      projectId: {
        type: 'string',
        description: 'ID of the project containing the task',
      },
      projectName: {
        type: 'string',
        description: 'Name of the project (alternative to projectId)',
      },
      taskId: {
        type: 'string',
        description: 'ID of the parent task',
      },
      taskTitle: {
        type: 'string',
        description: 'Title of the parent task (alternative to taskId)',
      },
      subtaskId: {
        type: 'string',
        description: 'Optional custom ID for the subtask',
      },
      subtaskTitle: {
        type: 'string',
        description: 'Title of the new subtask',
      },
      title: {
        type: 'string',
        description: 'Alternative field for subtask title',
      },
      status: {
        type: 'string',
        enum: ['todo', 'in-progress', 'completed'],
        description: 'Initial subtask status',
      },
      dueDate: {
        type: 'string',
        description: 'Due date in ISO format',
      },
      assignee: {
        type: 'string',
        description: 'Name of the person to assign the subtask to',
      },
    },
    required: [],
  },

  metadata: {
    mutatesState: true,
    readsState: true,
    sideEffecting: false,
    requiresConfirmation: false,
    tags: ['project', 'task', 'subtask', 'plan', 'add'],
  },

  async execute(ctx: ToolContext, input: AddSubtaskInput): Promise<ToolResult> {
    const { helpers, workingProjects } = ctx;

    // Resolve project
    const project = helpers.resolveProject(input.projectId || input.projectName);
    if (!project) {
      return {
        label: 'Skipped action: unknown project',
        detail: 'Skipped add_subtask because the project was not found.',
        deltas: [],
        updatedEntityIds: [],
        observations: { projectNotFound: true },
        status: 'skipped',
      };
    }

    // Get the working project for mutation
    const workingProject = workingProjects.find(p => p.id === project.id);
    if (!workingProject) {
      return {
        label: 'Skipped action: project not in working set',
        detail: 'Internal error: project not found in working set.',
        deltas: [],
        updatedEntityIds: [],
        observations: {},
        status: 'error',
        error: 'Project not in working set',
      };
    }

    // Resolve parent task
    const task = helpers.resolveTask(workingProject, input.taskId || input.taskTitle);
    if (!task) {
      return {
        label: `Skipped action: missing task in ${workingProject.name}`,
        detail: `Skipped subtask creation in ${workingProject.name} because the parent task was not found.`,
        deltas: [],
        updatedEntityIds: [],
        observations: { taskNotFound: true },
        status: 'skipped',
      };
    }

    // Generate subtask ID
    const subtaskId = input.subtaskId || generateSubtaskId();

    // Resolve assignee if provided
    let subtaskAssignee: { name: string; team?: string } | null = null;
    if (input.assignee) {
      const assigneeName =
        typeof input.assignee === 'string' ? input.assignee : input.assignee?.name;
      if (assigneeName) {
        const person = helpers.findPersonByName(assigneeName);
        subtaskAssignee = person
          ? { name: person.name, team: person.team }
          : { name: assigneeName };
      }
    }

    // Create the new subtask
    const trimmedTitle = (input.subtaskTitle || input.title || '').trim();
    const newSubtask: Subtask = {
      id: subtaskId,
      title: trimmedTitle || 'New subtask',
      status: input.status || 'todo',
      dueDate: input.dueDate,
      assignee: subtaskAssignee,
    };

    // Add to task's subtasks
    task.subtasks = [...(task.subtasks || []), newSubtask];

    // Create delta for undo
    const delta: RemoveSubtaskDelta = {
      type: 'remove_subtask',
      projectId: workingProject.id,
      taskId: task.id,
      subtaskId,
    };

    // Build result
    const label = `Added subtask "${newSubtask.title}" to ${task.title}`;
    const detail = `Added subtask "${newSubtask.title}" (${describeDueDate(newSubtask.dueDate)})${
      subtaskAssignee ? ` assigned to ${subtaskAssignee.name}` : ''
    } under ${task.title} in ${workingProject.name}`;

    return {
      label,
      detail,
      deltas: [delta],
      updatedEntityIds: [workingProject.id],
      observations: {
        projectId: workingProject.id,
        projectName: workingProject.name,
        taskId: task.id,
        taskTitle: task.title,
        subtaskId,
        subtaskTitle: newSubtask.title,
        subtaskAdded: true,
      },
      status: 'success',
    };
  },
};

export default addSubtaskTool;
