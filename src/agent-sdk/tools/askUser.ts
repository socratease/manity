/**
 * Ask User Tool - OpenAI Agents SDK Format
 *
 * Allows the agent to pause and ask the user for clarification or permission.
 * This tool triggers a pause in execution until the user responds.
 */

import { z } from 'zod';
import { tool } from '@openai/agents';

export const AskUserInput = z.object({
  question: z.string().describe('The question to ask the user'),
  context: z.string().optional().describe('Additional context explaining why this question is needed'),
  options: z.array(z.string()).optional().describe('Optional list of suggested answers/choices for the user'),
  type: z.enum(['clarification', 'permission', 'confirmation']).optional().default('clarification')
    .describe('Type of question: clarification for ambiguous requests, permission for sensitive actions, confirmation for bulk operations'),
});

export type AskUserInputType = z.infer<typeof AskUserInput>;

/**
 * Special marker used to identify ask_user responses that need to pause execution
 */
export const ASK_USER_MARKER = '__ASK_USER__';

/**
 * Parse the response to check if it's an ask_user pause
 */
export function isAskUserResponse(response: string): boolean {
  return response.startsWith(ASK_USER_MARKER);
}

/**
 * Parse ask_user response data
 */
export function parseAskUserResponse(response: string): AskUserInputType | null {
  if (!isAskUserResponse(response)) return null;
  try {
    const json = response.slice(ASK_USER_MARKER.length);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export const askUserTool = tool({
  name: 'ask_user',
  description: `Ask the user a question and wait for their response. Use this when:
- The user's request is ambiguous (e.g., multiple projects match)
- You need permission before a sensitive action (e.g., sending email)
- You want to confirm a bulk operation (e.g., updating many tasks)

The user will see your question and can respond. Their answer will be provided to you.`,
  parameters: AskUserInput,
  execute: async (input: AskUserInputType): Promise<string> => {
    // Return a special marker that the execution loop will detect
    // This causes execution to pause and return control to the UI
    return ASK_USER_MARKER + JSON.stringify(input);
  },
});

export default askUserTool;
