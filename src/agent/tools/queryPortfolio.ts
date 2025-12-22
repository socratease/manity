/**
 * Query Portfolio Tool
 *
 * Retrieves portfolio/project context information.
 * This is a read-only tool used for gathering information before other actions.
 */

import type {
  ToolDefinition,
  ToolContext,
  ToolResult,
  QueryPortfolioInput,
} from '../types';

export const queryPortfolioTool: ToolDefinition = {
  name: 'query_portfolio',
  description: 'Query portfolio or project information for context gathering',

  inputSchema: {
    type: 'object',
    properties: {
      scope: {
        type: 'string',
        enum: ['portfolio', 'project', 'people'],
        description: 'Scope of the query',
      },
      detailLevel: {
        type: 'string',
        enum: ['summary', 'detailed'],
        description: 'Level of detail to return',
      },
      includePeople: {
        type: 'boolean',
        description: 'Whether to include people information',
      },
      projectId: {
        type: 'string',
        description: 'ID of a specific project to query',
      },
      projectName: {
        type: 'string',
        description: 'Name of a specific project to query',
      },
    },
    required: [],
  },

  metadata: {
    mutatesState: false,
    readsState: true,
    sideEffecting: false,
    requiresConfirmation: false,
    tags: ['portfolio', 'query', 'read', 'context'],
  },

  async execute(ctx: ToolContext, input: QueryPortfolioInput): Promise<ToolResult> {
    const { helpers, people, services } = ctx;

    // Determine scope
    const scope = ['portfolio', 'project', 'people'].includes(input.scope || '')
      ? input.scope!
      : input.projectId || input.projectName
        ? 'project'
        : 'portfolio';

    // Determine detail level
    const detailLevel = ['summary', 'detailed'].includes(input.detailLevel || '')
      ? input.detailLevel!
      : 'summary';

    // Whether to include people
    const includePeople = input.includePeople !== false;

    // Build portfolio context
    const portfolioContext = services.buildThrustContext();
    let scopedProjects = portfolioContext;

    // Handle project-specific queries
    if (scope === 'project' && (input.projectId || input.projectName)) {
      const scopedProject = helpers.resolveProject(input.projectId || input.projectName);
      if (!scopedProject) {
        return {
          label: 'Skipped action: unknown project',
          detail: 'Skipped query_portfolio because the project was not found.',
          deltas: [],
          updatedEntityIds: [],
          observations: { projectNotFound: true },
          status: 'skipped',
        };
      }
      scopedProjects = portfolioContext.filter(
        project => `${project.id}` === `${scopedProject.id}`
      );
    }

    // Build project summary for summary mode
    const projectSummary = scopedProjects.map(project => ({
      id: project.id,
      name: project.name,
      status: project.status,
      priority: project.priority,
      progress: project.progress,
      targetDate: project.targetDate,
      lastUpdate: project.lastUpdate,
      contributors: project.stakeholders || [],
    }));

    // Build query result
    const queryResult = {
      scope,
      detailLevel,
      projects: detailLevel === 'detailed' ? scopedProjects : projectSummary,
      ...(includePeople
        ? {
            people: people.map(person => ({
              name: person.name,
              team: person.team,
              email: person.email || null,
            })),
          }
        : {}),
    };

    // Build result
    const label = 'Shared portfolio data';
    const detail = `Portfolio snapshot (${detailLevel}, ${scope}): ${JSON.stringify(
      queryResult,
      null,
      2
    )}`;

    return {
      label,
      detail,
      deltas: [], // Read-only, no deltas
      updatedEntityIds: [],
      observations: {
        scope,
        detailLevel,
        projectCount: scopedProjects.length,
        peopleCount: includePeople ? people.length : 0,
        queryResult,
      },
      status: 'success',
    };
  },
};

export default queryPortfolioTool;
