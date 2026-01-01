/**
 * Add Task Tool
 *
 * Adds a new task to a project's plan.
 */

import type {
  ToolDefinition,
  ToolContext,
  ToolResult,
  AddTaskInput,
  RemoveTaskDelta,
  Task,
} from '../types';
import { generateTaskId, generateSubtaskId, describeDueDate } from '../context/helpers';

export const addTaskTool: ToolDefinition = {
  name: 'add_task',
  description: 'Add a new task to a project plan',

  inputSchema: {
    type: 'object',
    properties: {
      projectId: {
        type: 'string',
        description: 'ID of the project to add the task to',
      },
      projectName: {
        type: 'string',
        description: 'Name of the project (alternative to projectId)',
      },
      taskId: {
        type: 'string',
        description: 'Optional custom ID for the task',
      },
      title: {
        type: 'string',
        description: 'Title of the task',
      },
      status: {
        type: 'string',
        enum: ['todo', 'in-progress', 'completed'],
        description: 'Initial task status',
      },
      dueDate: {
        type: 'string',
        description: 'Due date in ISO format',
      },
      completedDate: {
        type: 'string',
        description: 'Completion date in ISO format',
      },
      assignee: {
        type: 'string',
        description: 'Name of the person to assign the task to',
      },
      subtasks: {
        type: 'array',
        description: 'Array of subtask objects',
      },
    },
    required: [],
  },

  metadata: {
    mutatesState: true,
    readsState: true,
    sideEffecting: false,
    requiresConfirmation: false,
    tags: ['project', 'task', 'plan', 'add'],
  },

  async execute(ctx: ToolContext, input: AddTaskInput): Promise<ToolResult> {
    const { helpers, workingProjects, people } = ctx;

    // Resolve project
    const project = helpers.resolveProject(input.projectId || input.projectName);
    if (!project) {
      return {
        label: 'Skipped action: unknown project',
        detail: 'Skipped add_task because the project was not found.',
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

    // Generate task ID
    const taskId = input.taskId || generateTaskId();

    // Resolve assignee if provided
    let taskAssignee: { name: string; team?: string } | null = null;
    if (input.assignee) {
      const assigneeName =
        typeof input.assignee === 'string' ? input.assignee : input.assignee?.name;
      if (assigneeName) {
        const person = helpers.findPersonByName(assigneeName);
        taskAssignee = person
          ? { name: person.name, team: person.team }
          : { name: assigneeName };
      }
    }

    // Create the new task
    const newTask: Task = {
      id: taskId,
      title: input.title || 'New task',
      status: input.status || 'todo',
      dueDate: input.dueDate,
      completedDate: input.completedDate,
      assignee: taskAssignee,
      subtasks: (input.subtasks || []).map(subtask => ({
        id: subtask.id || generateSubtaskId(),
        title: subtask.title || 'New subtask',
        status: (subtask.status as Task['status']) || 'todo',
        dueDate: subtask.dueDate,
      })),
    };

    // Add to project plan
    workingProject.plan = [...workingProject.plan, newTask];

    // Create delta for undo
    const delta: RemoveTaskDelta = {
      type: 'remove_task',
      projectId: workingProject.id,
      taskId,
    };

    // Build result
    const label = `Added task "${newTask.title}" to ${workingProject.name}`;
    const detail = `Added task "${newTask.title}" (${describeDueDate(newTask.dueDate)})${
      taskAssignee ? ` assigned to ${taskAssignee.name}` : ''
    } to ${workingProject.name}`;

    return {
      label,
      detail,
      deltas: [delta],
      updatedEntityIds: [workingProject.id],
      observations: {
        projectId: workingProject.id,
        projectName: workingProject.name,
        taskId,
        taskTitle: newTask.title,
        taskAdded: true,
      },
      status: 'success',
    };
  },
};

export default addTaskTool;
