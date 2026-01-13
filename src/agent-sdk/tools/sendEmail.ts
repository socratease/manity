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
  cc: z.union([
    z.string().describe('Comma-separated email addresses'),
    z.array(z.string()).describe('Array of email addresses'),
  ]).optional().describe('Email CC recipients'),
  bcc: z.union([
    z.string().describe('Comma-separated email addresses'),
    z.array(z.string()).describe('Array of email addresses'),
  ]).optional().describe('Email BCC recipients'),
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

    const normalizeRecipients = (value?: string | string[]) => {
      if (!value) return [];
      if (typeof value === 'string') {
        return value
          .split(',')
          .map(r => r.trim())
          .filter(r => r.length > 0);
      }
      return value.filter(r => r && r.trim().length > 0);
    };

    // Normalize recipients to array
    const recipients = normalizeRecipients(input.recipients);
    const cc = normalizeRecipients(input.cc);
    const bcc = normalizeRecipients(input.bcc);

    if (recipients.length === 0 && cc.length === 0 && bcc.length === 0) {
      return 'Error: At least one recipient email address is required.';
    }

    if (!input.subject || input.subject.trim().length === 0) {
      return 'Error: Email subject is required.';
    }

    if (!input.body || input.body.trim().length === 0) {
      return 'Error: Email body is required.';
    }

    // Resolve email addresses from person names if needed
    const resolveEntries = (entries: string[]) => {
      const resolved: string[] = [];
      for (const recipient of entries) {
        if (recipient.includes('@')) {
          resolved.push(recipient);
          continue;
        }
        const person = ctx.findPersonByName(recipient);
        if (person?.email) {
          resolved.push(person.email);
          continue;
        }
        return {
          error: `Error: Could not find email address for "${recipient}". Please provide an email address or ensure the person exists in the database with an email.`
        };
      }
      return { resolved };
    };

    const resolvedRecipients: string[] = [];
    const resolvedCc: string[] = [];
    const resolvedBcc: string[] = [];
    for (const [entries, target] of [
      [recipients, resolvedRecipients],
      [cc, resolvedCc],
      [bcc, resolvedBcc],
    ] as const) {
      const resolved = resolveEntries(entries);
      if ('error' in resolved) {
        return resolved.error;
      }
      target.push(...resolved.resolved);
    }

    try {
      await ctx.services.sendEmail({
        recipients: resolvedRecipients,
        cc: resolvedCc.length ? resolvedCc : undefined,
        bcc: resolvedBcc.length ? resolvedBcc : undefined,
        subject: input.subject.trim(),
        body: input.body.trim(),
      });

      const totalCount = resolvedRecipients.length + resolvedCc.length + resolvedBcc.length;
      const recipientStr = totalCount === 1
        ? (resolvedRecipients[0] || resolvedCc[0] || resolvedBcc[0])
        : `${totalCount} recipients`;

      return `Email sent successfully to ${recipientStr} with subject "${input.subject}".`;
    } catch (error) {
      return `Error sending email: ${(error as Error).message}`;
    }
  },
});

export default sendEmailTool;
