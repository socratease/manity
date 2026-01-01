/**
 * Add Person Tool
 *
 * Adds a new person to the People database.
 */

import type {
  ToolDefinition,
  ToolContext,
  ToolResult,
  AddPersonInput,
} from '../types';

export const addPersonTool: ToolDefinition = {
  name: 'add_person',
  description: 'Add a new person to the People database',

  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name of the person',
      },
      personName: {
        type: 'string',
        description: 'Alternative field for person name',
      },
      team: {
        type: 'string',
        description: 'Team the person belongs to',
      },
      email: {
        type: 'string',
        description: 'Email address of the person',
      },
    },
    required: [],
  },

  metadata: {
    mutatesState: true,
    readsState: true,
    sideEffecting: false,
    requiresConfirmation: false,
    tags: ['people', 'person', 'add', 'team'],
  },

  async execute(ctx: ToolContext, input: AddPersonInput): Promise<ToolResult> {
    const { helpers, services } = ctx;

    // Get person name
    const personName = (input.name || input.personName || '').trim();
    if (!personName) {
      return {
        label: 'Skipped action: missing person name',
        detail: 'Skipped add_person because no name was provided.',
        deltas: [],
        updatedEntityIds: [],
        observations: { missingName: true },
        status: 'skipped',
      };
    }

    // Check if person already exists
    const existing = helpers.findPersonByName(personName);
    const targetTeam = input.team || 'Contributor';

    // Create or update person
    const saved = await services.createPerson({
      name: personName,
      team: targetTeam,
      email: input.email || existing?.email || null,
    });

    // Determine what changed
    const updatedTeam = existing && saved.team !== existing.team;

    // Build result
    const label = existing ? `Updated person ${saved.name}` : `Added person ${saved.name}`;
    const detail = updatedTeam
      ? `Ensured ${saved.name} is tracked with team ${saved.team}.`
      : `${saved.name} is available in People.`;

    return {
      label,
      detail,
      deltas: [], // No undo for person operations currently
      updatedEntityIds: saved.id ? [saved.id] : [],
      observations: {
        personName: saved.name,
        personTeam: saved.team,
        personEmail: saved.email,
        personAdded: !existing,
        personUpdated: !!existing,
      },
      status: 'success',
    };
  },
};

export default addPersonTool;
