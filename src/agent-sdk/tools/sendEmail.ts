/**
 * Send Email Tool - OpenAI Agents SDK Format
 *
 * Sends an email through the backend email service.
 * This is a side-effecting tool that should require confirmation.
 */

import { z } from 'zod';
import { tool, RunContext } from '@openai/agents';
import { getContextFromRunContext, ToolExecutionContext } from '../context';

export const SendEmailInput = z.object({
  recipients: z.union([
    z.string().describe('Comma-separated email addresses'),
    z.array(z.string()).describe('Array of email addresses'),
  ]).describe('Email recipients'),
  subject: z.string().describe('Email subject line'),
  body: z.string().describe('Email body content'),
});

export type SendEmailInputType = z.infer<typeof SendEmailInput>;

export const sendEmailTool = tool({
  name: 'send_email',
  description: 'Send an email to one or more recipients. This action cannot be undone. Provide recipients (comma-separated or array), subject, and body.',
  parameters: SendEmailInput,
  execute: async (input: SendEmailInputType, runContext?: RunContext<ToolExecutionContext>): Promise<string> => {
    const ctx = getContextFromRunContext(runContext);

    // Normalize recipients to array
    let recipients: string[];
    if (typeof input.recipients === 'string') {
      recipients = input.recipients
        .split(',')
        .map(r => r.trim())
        .filter(r => r.length > 0);
    } else {
      recipients = input.recipients.filter(r => r && r.trim().length > 0);
    }

    if (recipients.length === 0) {
      return 'Error: At least one recipient email address is required.';
    }

    if (!input.subject || input.subject.trim().length === 0) {
      return 'Error: Email subject is required.';
    }

    if (!input.body || input.body.trim().length === 0) {
      return 'Error: Email body is required.';
    }

    // Resolve email addresses from person names if needed
    const resolvedRecipients: string[] = [];
    for (const recipient of recipients) {
      // Check if it's an email address
      if (recipient.includes('@')) {
        resolvedRecipients.push(recipient);
      } else {
        // Try to find person by name
        const person = ctx.findPersonByName(recipient);
        if (person?.email) {
          resolvedRecipients.push(person.email);
        } else {
          return `Error: Could not find email address for "${recipient}". Please provide an email address or ensure the person exists in the database with an email.`;
        }
      }
    }

    try {
      await ctx.services.sendEmail({
        recipients: resolvedRecipients,
        subject: input.subject.trim(),
        body: input.body.trim(),
      });

      const recipientStr = resolvedRecipients.length === 1
        ? resolvedRecipients[0]
        : `${resolvedRecipients.length} recipients`;

      return `Email sent successfully to ${recipientStr} with subject "${input.subject}".`;
    } catch (error) {
      return `Error sending email: ${(error as Error).message}`;
    }
  },
});

export default sendEmailTool;
