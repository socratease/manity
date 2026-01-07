/**
 * Project Management Agent - OpenAI Agents SDK
 *
 * Main agent definition for the Momentum project management assistant.
 * Supports specialized sub-agents via handoffs for future extensibility.
 */

import { Agent } from '@openai/agents';
import { allTools } from './tools';
import type { AgentContext } from './types';
import type { Project, Person, PortfolioSummary } from '../agent/types';

const LLM_MODEL = import.meta.env.VITE_LLM_MODEL || 'gpt-4.1';

/**
 * Build dynamic instructions based on current context
 */
function buildInstructions(context: AgentContext): string {
  // Build project summary
  const projectSummary = context.projects.map((p: Project) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    priority: p.priority,
    progress: p.progress,
  }));

  // Build people summary
  const peopleSummary = context.people.map((p: Person) => ({
    name: p.name,
    team: p.team,
    email: p.email || null,
  }));

  return `You are Momentum, an AI project management assistant that helps manage a portfolio of projects.

## Your Capabilities
You can:
- Add comments and activity updates to projects
- Create new projects with customizable settings
- Add, update, and complete tasks and subtasks
- Update project properties (status, priority, progress, dates)
- Add people to the database
- Add stakeholders to projects
- Query portfolio information
- Send emails (use with caution - this is irreversible)
- Ask the user clarifying questions when needed

## Current User
The logged-in user is: ${context.loggedInUser || 'Unknown'}
When the user says "me", "my", or "I", they refer to: ${context.loggedInUser || 'the logged-in user'}
Use "${context.loggedInUser || 'You'}" as the default author for comments.

## Available Projects
${JSON.stringify(projectSummary, null, 2)}

## People Database
${JSON.stringify(peopleSummary, null, 2)}

## Guidelines
1. Be concise and direct in your responses
2. Only take actions that are explicitly requested or clearly necessary
3. Reference projects by their exact name or ID
4. For project-related actions, always identify the target project first
5. When updating tasks, specify both the project and the task
6. For send_email, ensure recipients are valid email addresses or known people
7. If you cannot complete a request, explain why clearly
8. When creating projects, always include name, status, priority, and progress

## Human-in-the-Loop Interactions
Use the ask_user tool to pause and ask the user when:

1. **Clarification needed** - The request is ambiguous:
   - Multiple projects/tasks could match (e.g., "Update the API project" when there are multiple)
   - Missing required information (e.g., "Add a task" without specifying which project)
   - Unclear intent (e.g., "fix it" without context)

2. **Permission required** - Before sensitive actions:
   - Before sending emails: Show the draft and recipient list, ask for confirmation
   - Before making changes that affect multiple stakeholders

3. **Confirmation for bulk operations** - When affecting 3+ items:
   - "Mark all tasks as complete" - confirm the count first
   - "Update all project statuses" - list what will change

When asking questions:
- Provide helpful context explaining why you need the information
- When there are clear options, include them in the options array
- Be specific about what you're asking

Example: If the user says "update the API project" and there are projects named "API Gateway" and "REST API":
Use ask_user with:
- question: "Which project would you like me to update?"
- context: "I found multiple projects matching 'API'"
- options: ["API Gateway", "REST API"]

## Response Style
- Keep responses brief and action-focused
- Summarize what you did after completing actions
- If multiple actions are needed, execute them in logical order
- Use ask_user instead of refusing when you need more information`;
}

/**
 * Create the main Project Management Agent
 *
 * This agent handles all project management tasks directly.
 * Future: Can delegate to specialized sub-agents via handoffs.
 */
export function createProjectManagementAgent(context: AgentContext): Agent {
  return new Agent({
    name: 'Momentum',
    model: LLM_MODEL,
    instructions: buildInstructions(context),
    tools: allTools,
    // Future: Add handoffs for specialized sub-agents
    // handoffs: [emailDraftAgent, reportingAgent],
  });
}

/**
 * Agent configuration for different use cases
 */
export interface AgentConfig {
  /** Maximum number of tool calls per run */
  maxToolCalls?: number;
  /** Whether to allow side-effecting tools like send_email */
  allowSideEffects?: boolean;
}

/**
 * Default agent configuration
 */
export const defaultAgentConfig: AgentConfig = {
  maxToolCalls: 10,
  allowSideEffects: true,
};

// Future sub-agent definitions for handoffs
// These can be enabled later without much additional complexity

/**
 * Email Draft Agent (Future)
 *
 * Specialized agent for composing and reviewing emails
 * before sending. Can provide suggestions and formatting.
 */
// export const emailDraftAgent = new Agent({
//   name: 'EmailAssistant',
//   model: LLM_MODEL,
//   instructions: 'You help draft and review emails for project communications.',
//   handoffDescription: 'Delegate email composition and review tasks',
//   tools: [sendEmailTool, queryPortfolioTool],
// });

/**
 * Reporting Agent (Future)
 *
 * Specialized agent for generating status reports
 * and portfolio summaries.
 */
// export const reportingAgent = new Agent({
//   name: 'ReportingAssistant',
//   model: LLM_MODEL,
//   instructions: 'You generate status reports and portfolio summaries.',
//   handoffDescription: 'Delegate reporting and summary generation tasks',
//   tools: [queryPortfolioTool],
// });

export default createProjectManagementAgent;
