/**
 * Send Email Tool
 *
 * Sends an email to specified recipients.
 * This is a side-effecting tool that requires confirmation.
 */

import type {
  ToolDefinition,
  ToolContext,
  ToolResult,
  SendEmailInput,
} from '../types';

export const sendEmailTool: ToolDefinition = {
  name: 'send_email',
  description: 'Send an email to specified recipients',

  inputSchema: {
    type: 'object',
    properties: {
      recipients: {
        type: 'array',
        description: 'List of email recipients (names or email addresses)',
      },
      subject: {
        type: 'string',
        description: 'Email subject line',
      },
      body: {
        type: 'string',
        description: 'Email body content',
      },
    },
    required: ['recipients', 'subject', 'body'],
  },

  metadata: {
    mutatesState: false,
    readsState: true,
    sideEffecting: true,
    requiresConfirmation: true,
    tags: ['email', 'communication', 'external', 'send'],
  },

  async execute(ctx: ToolContext, input: SendEmailInput): Promise<ToolResult> {
    const { helpers, services } = ctx;

    // Parse recipients
    const recipients = Array.isArray(input.recipients)
      ? input.recipients
      : `${input.recipients || ''}`.split(',');

    // Normalize recipients (resolve names to emails)
    const normalizedRecipients = recipients
      .map(recipient => recipient?.trim())
      .filter(Boolean)
      .map(recipient => {
        if (recipient.includes('@')) return recipient;
        const person = helpers.findPersonByName(recipient);
        return person?.email || recipient;
      })
      .filter(Boolean);

    // Validate recipients
    if (!normalizedRecipients.length) {
      return {
        label: 'Skipped action: missing recipients',
        detail: 'Skipped send_email because no recipients were provided.',
        deltas: [],
        updatedEntityIds: [],
        observations: { missingRecipients: true },
        status: 'skipped',
      };
    }

    // Validate subject and body
    if (!input.subject || !input.body) {
      return {
        label: 'Skipped action: incomplete email',
        detail: 'Skipped send_email because subject or body was missing.',
        deltas: [],
        updatedEntityIds: [],
        observations: { incompleteEmail: true },
        status: 'skipped',
      };
    }

    // Add signature
    const signature = '-sent by an AI clerk';
    const normalizedBody = input.body || '';
    // Remove any existing AI clerk signatures to prevent duplicates
    const cleanedBody = normalizedBody
      .replace(/\n*-?\s*sent (with the help of|by) an AI clerk\s*$/gi, '')
      .trim();
    const bodyWithSignature = cleanedBody ? `${cleanedBody}\n\n${signature}` : signature;

    // Send the email
    try {
      await services.sendEmail({
        recipients: normalizedRecipients,
        subject: input.subject,
        body: bodyWithSignature,
      });

      const label = `Email sent to ${normalizedRecipients.join(', ')}`;
      const detail = `Sent email "${input.subject}"`;

      return {
        label,
        detail,
        deltas: [], // Cannot undo email
        updatedEntityIds: [],
        observations: {
          recipients: normalizedRecipients,
          subject: input.subject,
          emailSent: true,
        },
        status: 'success',
      };
    } catch (error) {
      return {
        label: 'Failed to send email',
        detail: (error as Error)?.message || 'Email service returned an error.',
        deltas: [],
        updatedEntityIds: [],
        observations: {
          recipients: normalizedRecipients,
          subject: input.subject,
          emailSent: false,
        },
        status: 'error',
        error: (error as Error)?.message || 'Email service returned an error.',
      };
    }
  },
};

export default sendEmailTool;
