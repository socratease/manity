/**
 * Query Portfolio Tool - OpenAI Agents SDK Format
 *
 * Retrieves portfolio information for context.
 */

import { z } from 'zod';
import { tool } from '@openai/agents';
import { getToolContext } from '../context';

export const QueryPortfolioInput = z.object({
  scope: z.enum(['portfolio', 'project', 'people']).optional().default('portfolio').describe('What to query'),
  detailLevel: z.enum(['summary', 'detailed']).optional().default('summary').describe('Level of detail'),
  includePeople: z.boolean().optional().default(false).describe('Include people in response'),
  projectId: z.string().optional().describe('Specific project ID to query'),
  projectName: z.string().optional().describe('Specific project name to query'),
});

export type QueryPortfolioInputType = z.infer<typeof QueryPortfolioInput>;

export const queryPortfolioTool = tool({
  name: 'query_portfolio',
  description: 'Query portfolio information. Use this to get context about projects, tasks, or people before taking actions.',
  parameters: QueryPortfolioInput,
  execute: async (input: QueryPortfolioInputType): Promise<string> => {
    const ctx = getToolContext();

    // If querying a specific project
    if (input.scope === 'project' || input.projectId || input.projectName) {
      const project = ctx.resolveProject(input.projectId || input.projectName);
      if (!project) {
        return 'Project not found.';
      }

      if (input.detailLevel === 'detailed') {
        return JSON.stringify({
          id: project.id,
          name: project.name,
          status: project.status,
          priority: project.priority,
          progress: project.progress,
          description: project.description,
          executiveUpdate: project.executiveUpdate,
          targetDate: project.targetDate,
          startDate: project.startDate,
          stakeholders: project.stakeholders,
          plan: project.plan.map(t => ({
            id: t.id,
            title: t.title,
            status: t.status,
            dueDate: t.dueDate,
            subtasks: t.subtasks?.map(st => ({
              id: st.id,
              title: st.title,
              status: st.status,
              dueDate: st.dueDate,
            })),
          })),
          recentActivity: project.recentActivity.slice(0, 5),
        }, null, 2);
      }

      return JSON.stringify({
        id: project.id,
        name: project.name,
        status: project.status,
        priority: project.priority,
        progress: project.progress,
        taskCount: project.plan.length,
        completedTasks: project.plan.filter(t => t.status === 'completed').length,
      }, null, 2);
    }

    // Query people
    if (input.scope === 'people') {
      return JSON.stringify(
        ctx.people.map(p => ({
          name: p.name,
          team: p.team,
          email: p.email,
        })),
        null,
        2
      );
    }

    // Query full portfolio
    const summaries = ctx.services.buildThrustContext();

    if (input.detailLevel === 'detailed') {
      const result: Record<string, unknown> = {
        projects: summaries,
        totalProjects: summaries.length,
        byStatus: {
          active: summaries.filter(p => p.status === 'active').length,
          planning: summaries.filter(p => p.status === 'planning').length,
          'on-hold': summaries.filter(p => p.status === 'on-hold').length,
          completed: summaries.filter(p => p.status === 'completed').length,
        },
        byPriority: {
          high: summaries.filter(p => p.priority === 'high').length,
          medium: summaries.filter(p => p.priority === 'medium').length,
          low: summaries.filter(p => p.priority === 'low').length,
        },
      };

      if (input.includePeople) {
        result.people = ctx.people.map(p => ({
          name: p.name,
          team: p.team,
        }));
      }

      return JSON.stringify(result, null, 2);
    }

    // Summary view
    return JSON.stringify(
      summaries.map(p => ({
        id: p.id,
        name: p.name,
        status: p.status,
        priority: p.priority,
        progress: p.progress,
      })),
      null,
      2
    );
  },
});

export default queryPortfolioTool;
