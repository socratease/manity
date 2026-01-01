/**
 * Create Project Tool
 *
 * Creates a new project with the specified properties.
 */

import type {
  ToolDefinition,
  ToolContext,
  ToolResult,
  CreateProjectInput,
  RemoveProjectDelta,
  Project,
} from '../types';
import { generateProjectId, generateActivityId } from '../context/helpers';

export const createProjectTool: ToolDefinition = {
  name: 'create_project',
  description: 'Create a new project in the portfolio',

  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name of the new project',
      },
      projectName: {
        type: 'string',
        description: 'Alternative field for project name',
      },
      projectId: {
        type: 'string',
        description: 'Optional custom ID for the project',
      },
      id: {
        type: 'string',
        description: 'Alternative field for custom project ID',
      },
      description: {
        type: 'string',
        description: 'Project description',
      },
      priority: {
        type: 'string',
        enum: ['high', 'medium', 'low'],
        description: 'Project priority level',
      },
      status: {
        type: 'string',
        description: 'Project status (planning, active, on-hold, cancelled, completed)',
      },
      progress: {
        type: 'number',
        description: 'Initial progress percentage (0-100)',
      },
      targetDate: {
        type: 'string',
        description: 'Target completion date (ISO format)',
      },
      stakeholders: {
        type: 'string',
        description: 'Comma-separated list of stakeholder names',
      },
    },
    required: [],
  },

  metadata: {
    mutatesState: true,
    readsState: false,
    sideEffecting: false,
    requiresConfirmation: false,
    tags: ['project', 'create', 'portfolio'],
  },

  async execute(ctx: ToolContext, input: CreateProjectInput): Promise<ToolResult> {
    const { helpers, loggedInUser, workingProjects, projectLookup } = ctx;

    // Get project name with defensive coercion
    const rawName = input.name ?? input.projectName ?? '';
    const projectName = (typeof rawName === 'string' ? rawName : String(rawName)).trim();
    if (!projectName) {
      // Log for debugging
      console.warn('[Agent createProject] create_project action has empty name:', {
        inputName: input.name,
        inputProjectName: input.projectName,
        rawName
      });
      return {
        label: 'Skipped action: missing project name',
        detail: 'Skipped create_project because no name was provided.',
        deltas: [],
        updatedEntityIds: [],
        observations: { missingName: true, inputReceived: input },
        status: 'skipped',
      };
    }

    // Parse stakeholders
    const stakeholderEntries = input.stakeholders
      ? input.stakeholders
          .split(',')
          .map(name => name.trim())
          .filter(Boolean)
          .map(name => ({ name, team: 'Contributor' }))
      : [{ name: loggedInUser || 'Momentum', team: 'Owner' }];

    const normalizedStakeholders = helpers.normalizeStakeholderList(stakeholderEntries);

    // Generate IDs and timestamps
    const createdAt = new Date().toISOString();
    const newId = input.projectId || input.id || generateProjectId();

    // Create the new project
    const newProject: Project = helpers.syncProjectActivity({
      id: newId,
      name: projectName,
      priority: input.priority || 'medium',
      status: (input.status as Project['status']) || 'active',
      progress: typeof input.progress === 'number' ? input.progress : 0,
      progressMode: 'manual',
      stakeholders: normalizedStakeholders,
      description: input.description || '',
      startDate: createdAt.split('T')[0],
      targetDate: input.targetDate || '',
      plan: [],
      recentActivity: input.description
        ? [
            {
              id: generateActivityId(),
              date: createdAt,
              note: input.description,
              author: 'Momentum',
            },
          ]
        : [],
    });

    // Add to working projects
    workingProjects.push(newProject);

    // Update lookup map
    projectLookup.set(projectName.toLowerCase(), newId);
    projectLookup.set(`${newId}`.toLowerCase(), newId);
    if (input.projectId || input.id) {
      projectLookup.set(`${input.projectId || input.id}`.toLowerCase(), newId);
    }

    // Create delta for undo
    const delta: RemoveProjectDelta = {
      type: 'remove_project',
      projectId: newId,
    };

    // Build result
    const label = `Created new project "${projectName}"`;
    const detail = `Created new project "${projectName}" with status ${newProject.status} and priority ${newProject.priority}`;

    return {
      label,
      detail,
      deltas: [delta],
      updatedEntityIds: [newId],
      observations: {
        projectId: newId,
        projectName,
        projectCreated: true,
        stakeholders: normalizedStakeholders.map(s => s.name),
      },
      status: 'success',
    };
  },
};

export default createProjectTool;
