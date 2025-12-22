/**
 * Update Subtask Tool
 *
 * Updates an existing subtask.
 */

import type {
  ToolDefinition,
  ToolContext,
  ToolResult,
  UpdateSubtaskInput,
  RestoreSubtaskDelta,
  Task,
} from '../types';

export const updateSubtaskTool: ToolDefinition = {
  name: 'update_subtask',
  description: 'Update an existing subtask',

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
        description: 'ID of the subtask to update',
      },
      subtaskTitle: {
        type: 'string',
        description: 'Title of the subtask to update (alternative to subtaskId)',
      },
      title: {
        type: 'string',
        description: 'New title for the subtask',
      },
      status: {
        type: 'string',
        enum: ['todo', 'in-progress', 'completed'],
        description: 'New status for the subtask',
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
        description: 'Name of the person to assign the subtask to (null to unassign)',
      },
    },
    required: [],
  },

  metadata: {
    mutatesState: true,
    readsState: true,
    sideEffecting: false,
    requiresConfirmation: false,
    tags: ['project', 'task', 'subtask', 'plan', 'update'],
  },

  async execute(ctx: ToolContext, input: UpdateSubtaskInput): Promise<ToolResult> {
    const { helpers, workingProjects } = ctx;

    // Resolve project
    const project = helpers.resolveProject(input.projectId || input.projectName);
    if (!project) {
      return {
        label: 'Skipped action: unknown project',
        detail: 'Skipped update_subtask because the project was not found.',
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
        detail: `Skipped subtask update in ${workingProject.name} because the parent task was not found.`,
        deltas: [],
        updatedEntityIds: [],
        observations: { taskNotFound: true },
        status: 'skipped',
      };
    }

    // Resolve subtask using resolveTask with a pseudo-project containing subtasks
    const subtaskTarget = input.subtaskId || input.subtaskTitle;
    const subtask = helpers.resolveTask({ plan: task.subtasks || [] } as unknown as Task['status'] extends string ? { plan: Task['subtasks'] } : never, subtaskTarget) as unknown as Task['subtasks'][0] | null;

    // Manual resolution if helper doesn't work
    let foundSubtask = subtask;
    if (!foundSubtask && subtaskTarget) {
      const lowerTarget = `${subtaskTarget}`.toLowerCase();
      foundSubtask = (task.subtasks || []).find(
        st => `${st.id}` === `${subtaskTarget}` || st.title.toLowerCase() === lowerTarget
      );
    }

    if (!foundSubtask) {
      return {
        label: `Skipped action: missing subtask in ${task.title}`,
        detail: `Skipped subtask update in ${task.title} because the subtask was not found.`,
        deltas: [],
        updatedEntityIds: [],
        observations: { subtaskNotFound: true },
        status: 'skipped',
      };
    }

    // Store previous state for undo
    const previous = {
      title: foundSubtask.title,
      status: foundSubtask.status,
      dueDate: foundSubtask.dueDate,
      completedDate: foundSubtask.completedDate,
      assignee: foundSubtask.assignee ? { ...foundSubtask.assignee } : null,
    };

    // Track changes for detail message
    const changes: string[] = [];

    // Apply updates
    if (input.title && input.title !== foundSubtask.title) {
      changes.push(`renamed to "${input.title}"`);
      foundSubtask.title = input.title;
    }

    if (input.status && input.status !== foundSubtask.status) {
      changes.push(`status ${foundSubtask.status} → ${input.status}`);
      foundSubtask.status = input.status;
    }

    if (input.dueDate && input.dueDate !== foundSubtask.dueDate) {
      changes.push(`due date ${foundSubtask.dueDate || 'unset'} → ${input.dueDate}`);
      foundSubtask.dueDate = input.dueDate;
    }

    if (input.completedDate && input.completedDate !== foundSubtask.completedDate) {
      changes.push(`completed ${input.completedDate}`);
      foundSubtask.completedDate = input.completedDate;
    }

    // Handle assignee changes
    if (input.assignee !== undefined) {
      const currentAssigneeName = foundSubtask.assignee?.name || 'unassigned';

      if (input.assignee === null || input.assignee === '') {
        // Clear assignee
        if (foundSubtask.assignee) {
          changes.push(`unassigned from ${currentAssigneeName}`);
          foundSubtask.assignee = null;
        }
      } else {
        // Set new assignee
        const newAssigneeName =
          typeof input.assignee === 'string' ? input.assignee : input.assignee?.name;

        if (newAssigneeName && newAssigneeName !== currentAssigneeName) {
          const person = helpers.findPersonByName(newAssigneeName);
          changes.push(`assigned to ${newAssigneeName}`);
          foundSubtask.assignee = person
            ? { name: person.name, team: person.team }
            : { name: newAssigneeName };
        }
      }
    }

    // Create delta for undo
    const delta: RestoreSubtaskDelta = {
      type: 'restore_subtask',
      projectId: workingProject.id,
      taskId: task.id,
      subtaskId: foundSubtask.id,
      previous,
    };

    // Build result
    const label = `Updated subtask "${foundSubtask.title}" in ${task.title}`;
    const detail = `Updated subtask "${foundSubtask.title}" in ${task.title}: ${
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
        subtaskId: foundSubtask.id,
        subtaskTitle: foundSubtask.title,
        changes,
        subtaskUpdated: true,
      },
      status: 'success',
    };
  },
};

export default updateSubtaskTool;
