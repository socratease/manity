/**
 * Query Portfolio Tool - OpenAI Agents SDK Format
 *
 * Retrieves portfolio information for context.
 */

import { z } from 'zod';
import { tool, RunContext } from '@openai/agents';
import { getContextFromRunContext, ToolExecutionContext } from '../context';

export const QueryPortfolioInput = z.object({
  scope: z.enum(['portfolio', 'project', 'people', 'initiatives', 'initiative']).optional().default('portfolio').describe('What to query: portfolio, project, people, initiatives, or initiative'),
  detailLevel: z.enum(['summary', 'detailed']).optional().default('summary').describe('Level of detail'),
  includePeople: z.boolean().optional().default(false).describe('Include people in response'),
  projectId: z.string().optional().describe('Specific project ID to query'),
  projectName: z.string().optional().describe('Specific project name to query'),
  initiativeId: z.string().optional().describe('Specific initiative ID to query'),
  initiativeName: z.string().optional().describe('Specific initiative name to query'),
});

export type QueryPortfolioInputType = z.infer<typeof QueryPortfolioInput>;

export const queryPortfolioTool = tool({
  name: 'query_portfolio',
  description: 'Query portfolio information. Use this to get context about projects, tasks, people, or initiatives before taking actions. Initiatives are meta-projects that group related projects together. Each initiative has owners (directly responsible people) and stakeholders (aggregated from all projects in the initiative).',
  parameters: QueryPortfolioInput,
  execute: async (input: QueryPortfolioInputType, runContext?: RunContext<ToolExecutionContext>): Promise<string> => {
    const ctx = getContextFromRunContext(runContext);

    // If querying a specific initiative
    if (input.scope === 'initiative' || input.initiativeId || input.initiativeName) {
      const initiatives = ctx.workingInitiatives || [];
      const searchTerm = (input.initiativeId || input.initiativeName || '').toLowerCase();
      const initiative = initiatives.find(
        (i: { id: string; name: string }) =>
          i.id === searchTerm ||
          i.name.toLowerCase() === searchTerm ||
          i.name.toLowerCase().includes(searchTerm)
      );

      if (!initiative) {
        return 'Initiative not found.';
      }

      if (input.detailLevel === 'detailed') {
        return JSON.stringify({
          id: initiative.id,
          name: initiative.name,
          description: initiative.description,
          status: initiative.status,
          priority: initiative.priority,
          targetDate: initiative.targetDate,
          startDate: initiative.startDate,
          owners: initiative.owners,
          stakeholders: initiative.stakeholders,
          projects: initiative.projects?.map((p: { id: string; name: string; status: string; priority: string; progress: number }) => ({
            id: p.id,
            name: p.name,
            status: p.status,
            priority: p.priority,
            progress: p.progress,
          })),
        }, null, 2);
      }

      return JSON.stringify({
        id: initiative.id,
        name: initiative.name,
        status: initiative.status,
        priority: initiative.priority,
        projectCount: initiative.projects?.length || 0,
        ownerCount: initiative.owners?.length || 0,
      }, null, 2);
    }

    // Query all initiatives
    if (input.scope === 'initiatives') {
      const initiatives = ctx.workingInitiatives || [];

      if (input.detailLevel === 'detailed') {
        return JSON.stringify({
          initiatives: initiatives.map((i: { id: string; name: string; description: string; status: string; priority: string; owners: unknown[]; projects: unknown[] }) => ({
            id: i.id,
            name: i.name,
            description: i.description,
            status: i.status,
            priority: i.priority,
            ownerCount: i.owners?.length || 0,
            projectCount: i.projects?.length || 0,
            owners: i.owners,
          })),
          totalInitiatives: initiatives.length,
        }, null, 2);
      }

      return JSON.stringify(
        initiatives.map((i: { id: string; name: string; status: string; priority: string; projects: unknown[] }) => ({
          id: i.id,
          name: i.name,
          status: i.status,
          priority: i.priority,
          projectCount: i.projects?.length || 0,
        })),
        null,
        2
      );
    }

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
