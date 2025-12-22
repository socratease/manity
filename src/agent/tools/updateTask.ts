/**
 * Update Task Tool
 *
 * Updates an existing task in a project's plan.
 */

import type {
  ToolDefinition,
  ToolContext,
  ToolResult,
  UpdateTaskInput,
  RestoreTaskDelta,
} from '../types';

export const updateTaskTool: ToolDefinition = {
  name: 'update_task',
  description: 'Update an existing task in a project plan',

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
        description: 'ID of the task to update',
      },
      taskTitle: {
        type: 'string',
        description: 'Title of the task to update (alternative to taskId)',
      },
      title: {
        type: 'string',
        description: 'New title for the task',
      },
      status: {
        type: 'string',
        enum: ['todo', 'in-progress', 'completed'],
        description: 'New status for the task',
      },
      dueDate: {
        type: 'string',
        description: 'New due date in ISO format',
      },
      completedDate: {
        type: 'string',
        description: 'Completion date in ISO format',
      },
      assignee: {
        type: 'string',
        description: 'Name of the person to assign the task to (null to unassign)',
      },
    },
    required: [],
  },

  metadata: {
    mutatesState: true,
    readsState: true,
    sideEffecting: false,
    requiresConfirmation: false,
    tags: ['project', 'task', 'plan', 'update'],
  },

  async execute(ctx: ToolContext, input: UpdateTaskInput): Promise<ToolResult> {
    const { helpers, workingProjects } = ctx;

    // Resolve project
    const project = helpers.resolveProject(input.projectId || input.projectName);
    if (!project) {
      return {
        label: 'Skipped action: unknown project',
        detail: 'Skipped update_task because the project was not found.',
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

    // Resolve task
    const task = helpers.resolveTask(workingProject, input.taskId || input.taskTitle);
    if (!task) {
      return {
        label: `Skipped action: missing task in ${workingProject.name}`,
        detail: `Skipped task update in ${workingProject.name} because the task was not found.`,
        deltas: [],
        updatedEntityIds: [],
        observations: { taskNotFound: true },
        status: 'skipped',
      };
    }

    // Store previous state for undo
    const previous = {
      title: task.title,
      status: task.status,
      dueDate: task.dueDate,
      completedDate: task.completedDate,
      assignee: task.assignee ? { ...task.assignee } : null,
    };

    // Track changes for detail message
    const changes: string[] = [];

    // Apply updates
    if (input.title && input.title !== task.title) {
      changes.push(`renamed to "${input.title}"`);
      task.title = input.title;
    }

    if (input.status && input.status !== task.status) {
      changes.push(`status ${task.status} → ${input.status}`);
      task.status = input.status;
    }

    if (input.dueDate && input.dueDate !== task.dueDate) {
      changes.push(`due date ${task.dueDate || 'unset'} → ${input.dueDate}`);
      task.dueDate = input.dueDate;
    }

    if (input.completedDate && input.completedDate !== task.completedDate) {
      changes.push(`completed ${input.completedDate}`);
      task.completedDate = input.completedDate;
    }

    // Handle assignee changes
    if (input.assignee !== undefined) {
      const currentAssigneeName = task.assignee?.name || 'unassigned';

      if (input.assignee === null || input.assignee === '') {
        // Clear assignee
        if (task.assignee) {
          changes.push(`unassigned from ${currentAssigneeName}`);
          task.assignee = null;
        }
      } else {
        // Set new assignee
        const newAssigneeName =
          typeof input.assignee === 'string' ? input.assignee : input.assignee?.name;

        if (newAssigneeName && newAssigneeName !== currentAssigneeName) {
          const person = helpers.findPersonByName(newAssigneeName);
          changes.push(`assigned to ${newAssigneeName}`);
          task.assignee = person
            ? { name: person.name, team: person.team }
            : { name: newAssigneeName };
        }
      }
    }

    // Create delta for undo
    const delta: RestoreTaskDelta = {
      type: 'restore_task',
      projectId: workingProject.id,
      taskId: task.id,
      previous,
    };

    // Build result
    const label = `Updated task "${task.title}" in ${workingProject.name}`;
    const detail = `Updated task "${task.title}" in ${workingProject.name}: ${
      changes.join('; ') || 'no tracked changes'
    }`;

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
        changes,
        taskUpdated: true,
      },
      status: 'success',
    };
  },
};

export default updateTaskTool;
