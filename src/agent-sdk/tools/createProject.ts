/**
 * Create Project Tool - OpenAI Agents SDK Format
 *
 * Creates a new project in the portfolio.
 */

import { z } from 'zod';
import { tool, RunContext } from '@openai/agents';
import { getContextFromRunContext, ToolExecutionContext } from '../context';
import type { RemoveProjectDelta } from '../../agent/types';

export const CreateProjectInput = z.object({
  name: z.string().describe('Name of the new project'),
  projectName: z.string().optional().describe('Alternative field for project name'),
  description: z.string().optional().describe('Project description'),
  priority: z.enum(['high', 'medium', 'low']).optional().default('medium').describe('Project priority'),
  status: z.enum(['planning', 'active', 'on-hold', 'cancelled', 'completed']).optional().default('active').describe('Project status'),
  progress: z.number().min(0).max(100).optional().default(0).describe('Initial progress percentage'),
  targetDate: z.string().optional().describe('Target completion date (ISO format)'),
  startDate: z.string().optional().describe('Project start date (ISO format)'),
  stakeholders: z.string().optional().describe('Comma-separated list of stakeholder names'),
});

export type CreateProjectInputType = z.infer<typeof CreateProjectInput>;

export const createProjectTool = tool({
  name: 'create_project',
  description: 'Create a new project in the portfolio. Provide at least a name and optionally description, priority, status, and target date.',
  parameters: CreateProjectInput,
  execute: async (input: CreateProjectInputType, runContext?: RunContext<ToolExecutionContext>): Promise<string> => {
    const ctx = getContextFromRunContext(runContext);

    // Get project name
    const projectName = (input.name || input.projectName || '').trim();
    if (!projectName) {
      return 'Error: Project name is required.';
    }

    // Check for duplicate
    const existing = ctx.resolveProject(projectName);
    if (existing) {
      return `Skipped: A project named "${projectName}" already exists.`;
    }

    // Generate project ID
    const projectId = `project-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Parse stakeholders
    const stakeholders = input.stakeholders
      ? input.stakeholders.split(',').map(s => ({
          name: s.trim(),
          team: '',
          email: undefined,
        }))
      : [];

    // Create the new project
    const newProject = {
      id: projectId,
      name: projectName,
      description: input.description || '',
      priority: input.priority || 'medium',
      status: input.status || 'active',
      progress: input.progress ?? 0,
      progressMode: 'manual' as const,
      targetDate: input.targetDate,
      startDate: input.startDate || new Date().toISOString().split('T')[0],
      lastUpdate: `Project "${projectName}" created`,
      executiveUpdate: input.description || '',
      stakeholders,
      plan: [],
      recentActivity: [{
        id: ctx.generateActivityId(),
        date: new Date().toISOString(),
        note: `Project "${projectName}" created`,
        author: ctx.loggedInUser || 'You',
      }],
    };

    // Add to working projects
    ctx.workingProjects.push(newProject);

    // Create delta for undo
    const delta: RemoveProjectDelta = {
      type: 'remove_project',
      projectId,
    };
    ctx.trackDelta(delta);
    ctx.trackUpdatedEntity(projectId);

    return `Created project "${projectName}" with ${input.priority || 'medium'} priority and ${input.status || 'active'} status.`;
  },
});

export default createProjectTool;
