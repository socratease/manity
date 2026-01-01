/**
 * Update Project Tool
 *
 * Updates an existing project's properties.
 */

import type {
  ToolDefinition,
  ToolContext,
  ToolResult,
  UpdateProjectInput,
  RestoreProjectDelta,
} from '../types';

export const updateProjectTool: ToolDefinition = {
  name: 'update_project',
  description: 'Update an existing project properties',

  inputSchema: {
    type: 'object',
    properties: {
      projectId: {
        type: 'string',
        description: 'ID of the project to update',
      },
      projectName: {
        type: 'string',
        description: 'Name of the project (alternative to projectId)',
      },
      name: {
        type: 'string',
        description: 'New name for the project',
      },
      description: {
        type: 'string',
        description: 'New description for the project',
      },
      executiveUpdate: {
        type: 'string',
        description: 'New executive update/summary',
      },
      status: {
        type: 'string',
        description: 'New status (planning, active, on-hold, cancelled, completed)',
      },
      priority: {
        type: 'string',
        enum: ['high', 'medium', 'low'],
        description: 'New priority level',
      },
      progress: {
        type: 'number',
        description: 'New progress percentage (0-100)',
      },
      targetDate: {
        type: 'string',
        description: 'New target completion date (ISO format)',
      },
      startDate: {
        type: 'string',
        description: 'New start date (ISO format)',
      },
      lastUpdate: {
        type: 'string',
        description: 'New last update timestamp',
      },
    },
    required: [],
  },

  metadata: {
    mutatesState: true,
    readsState: true,
    sideEffecting: false,
    requiresConfirmation: false,
    tags: ['project', 'update', 'portfolio'],
  },

  async execute(ctx: ToolContext, input: UpdateProjectInput): Promise<ToolResult> {
    const { helpers, workingProjects } = ctx;

    // Resolve project
    const project = helpers.resolveProject(input.projectId || input.projectName);
    if (!project) {
      return {
        label: 'Skipped action: unknown project',
        detail: 'Skipped update_project because the project was not found.',
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

    // Store previous state for undo
    const previous = {
      name: workingProject.name,
      description: workingProject.description,
      executiveUpdate: workingProject.executiveUpdate,
      status: workingProject.status,
      priority: workingProject.priority,
      progress: workingProject.progress,
      targetDate: workingProject.targetDate,
      startDate: workingProject.startDate,
      lastUpdate: workingProject.lastUpdate,
    };

    // Track changes for detail message
    const changes: string[] = [];

    // Apply updates
    if (input.name && input.name !== workingProject.name) {
      changes.push(`renamed "${workingProject.name}" → "${input.name}"`);
      workingProject.name = input.name;
    }

    if (input.description && input.description !== workingProject.description) {
      changes.push(`description updated`);
      workingProject.description = input.description;
    }

    if (input.executiveUpdate && input.executiveUpdate !== workingProject.executiveUpdate) {
      changes.push(`executive update revised`);
      workingProject.executiveUpdate = input.executiveUpdate;
    }

    if (input.status && input.status !== workingProject.status) {
      changes.push(`status ${workingProject.status} → ${input.status}`);
      workingProject.status = input.status as typeof workingProject.status;
    }

    if (input.priority && input.priority !== workingProject.priority) {
      changes.push(`priority ${workingProject.priority} → ${input.priority}`);
      workingProject.priority = input.priority;
    }

    if (typeof input.progress === 'number' && input.progress !== workingProject.progress) {
      changes.push(`progress ${workingProject.progress}% → ${input.progress}%`);
      workingProject.progress = input.progress;
    }

    if (input.targetDate && input.targetDate !== workingProject.targetDate) {
      changes.push(`target ${workingProject.targetDate || 'unset'} → ${input.targetDate}`);
      workingProject.targetDate = input.targetDate;
    }

    if (input.startDate && input.startDate !== workingProject.startDate) {
      changes.push(`start date ${workingProject.startDate || 'unset'} → ${input.startDate}`);
      workingProject.startDate = input.startDate;
    }

    if (input.lastUpdate && input.lastUpdate !== workingProject.lastUpdate) {
      changes.push(`last update → ${input.lastUpdate}`);
      workingProject.lastUpdate = input.lastUpdate;
    }

    // Create delta for undo
    const delta: RestoreProjectDelta = {
      type: 'restore_project',
      projectId: workingProject.id,
      previous,
    };

    // Build result
    const label = `Updated ${workingProject.name}`;
    const detail = `Updated ${workingProject.name}: ${
      changes.join('; ') || 'no tracked changes noted'
    }`;

    return {
      label,
      detail,
      deltas: [delta],
      updatedEntityIds: [workingProject.id],
      observations: {
        projectId: workingProject.id,
        projectName: workingProject.name,
        changes,
        projectUpdated: true,
      },
      status: 'success',
    };
  },
};

export default updateProjectTool;
