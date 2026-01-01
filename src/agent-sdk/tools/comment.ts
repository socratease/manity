/**
 * Comment Tool - OpenAI Agents SDK Format
 *
 * Adds a comment/activity to a project's recent activity log.
 */

import { z } from 'zod';
import { tool } from '@openai/agents';
import { getToolContext } from '../context';
import type { RemoveActivityDelta } from '../../agent/types';

export const CommentInput = z.object({
  projectId: z.string().optional().describe('ID of the project to comment on'),
  projectName: z.string().optional().describe('Name of the project (alternative to projectId)'),
  note: z.string().optional().describe('The comment text to add'),
  content: z.string().optional().describe('Alternative field for comment text'),
  comment: z.string().optional().describe('Alternative field for comment text'),
  author: z.string().optional().describe('Author of the comment (defaults to logged-in user)'),
});

export type CommentInputType = z.infer<typeof CommentInput>;

export const commentTool = tool({
  name: 'comment',
  description: 'Add a comment or activity note to a project. Use this to log updates, notes, or progress on a project.',
  parameters: CommentInput,
  execute: async (input: CommentInputType): Promise<string> => {
    const ctx = getToolContext();

    // Resolve project
    const project = ctx.resolveProject(input.projectId || input.projectName);
    if (!project) {
      return 'Skipped: Project not found. Please specify a valid project ID or name.';
    }

    // Get the working project for mutation
    const workingProject = ctx.workingProjects.find(p => p.id === project.id);
    if (!workingProject) {
      return 'Error: Project not in working set.';
    }

    // Extract note from various input fields
    const requestedNote = (input.note || input.content || input.comment || '').trim();
    const note = requestedNote || 'Update logged by Momentum';

    // Create the new activity
    const activityId = ctx.generateActivityId();
    const newActivity = {
      id: activityId,
      date: new Date().toISOString(),
      note,
      author: input.author || ctx.loggedInUser || 'You',
    };

    // Update the working project
    workingProject.recentActivity = [newActivity, ...workingProject.recentActivity];
    ctx.syncProjectActivity(workingProject);

    // Create delta for undo
    const delta: RemoveActivityDelta = {
      type: 'remove_activity',
      projectId: workingProject.id,
      activityId,
    };
    ctx.trackDelta(delta);
    ctx.trackUpdatedEntity(workingProject.id);

    return `Commented on ${workingProject.name}: "${note}" by ${newActivity.author}`;
  },
});

export default commentTool;
