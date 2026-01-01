/**
 * Comment Tool
 *
 * Adds a comment/activity to a project's recent activity log.
 */

import type {
  ToolDefinition,
  ToolContext,
  ToolResult,
  CommentInput,
  RemoveActivityDelta,
} from '../types';

export const commentTool: ToolDefinition = {
  name: 'comment',
  description: 'Add a comment or activity note to a project',

  inputSchema: {
    type: 'object',
    properties: {
      projectId: {
        type: 'string',
        description: 'ID of the project to comment on',
      },
      projectName: {
        type: 'string',
        description: 'Name of the project to comment on (alternative to projectId)',
      },
      note: {
        type: 'string',
        description: 'The comment text to add',
      },
      content: {
        type: 'string',
        description: 'Alternative field for comment text',
      },
      comment: {
        type: 'string',
        description: 'Alternative field for comment text',
      },
      author: {
        type: 'string',
        description: 'Author of the comment (defaults to logged-in user)',
      },
    },
    required: [],
  },

  metadata: {
    mutatesState: true,
    readsState: true,
    sideEffecting: false,
    requiresConfirmation: false,
    tags: ['project', 'activity', 'comment', 'note'],
  },

  async execute(ctx: ToolContext, input: CommentInput): Promise<ToolResult> {
    const { helpers, loggedInUser, workingProjects } = ctx;

    // Resolve project
    const project = helpers.resolveProject(input.projectId || input.projectName);
    if (!project) {
      return {
        label: 'Skipped action: unknown project',
        detail: 'Skipped comment because the project was not found.',
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

    // Extract note from various input fields
    const requestedNote = (input.note || input.content || input.comment || '').trim();
    const note = requestedNote || 'Update logged by Momentum';

    // Create the new activity
    const activityId = helpers.generateActivityId();
    const newActivity = {
      id: activityId,
      date: new Date().toISOString(),
      note,
      author: input.author || loggedInUser || 'You',
    };

    // Update the working project
    Object.assign(
      workingProject,
      helpers.syncProjectActivity(workingProject, [newActivity, ...workingProject.recentActivity])
    );

    // Create delta for undo
    const delta: RemoveActivityDelta = {
      type: 'remove_activity',
      projectId: workingProject.id,
      activityId,
    };

    // Build result
    const label = `Commented on ${workingProject.name}`;
    const detail = requestedNote
      ? `Comment on ${workingProject.name}: "${newActivity.note}" by ${newActivity.author}`
      : `Comment on ${workingProject.name}: "${newActivity.note}" by ${newActivity.author} (placeholder used because the comment was empty)`;

    return {
      label,
      detail,
      deltas: [delta],
      updatedEntityIds: [workingProject.id],
      observations: {
        projectId: workingProject.id,
        projectName: workingProject.name,
        commentAdded: true,
        activityId,
      },
      status: 'success',
    };
  },
};

export default commentTool;
