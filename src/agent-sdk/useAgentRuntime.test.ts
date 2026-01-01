import { describe, expect, it } from 'vitest';

import { EMPTY_RESPONSE_ERROR, getAssistantMessage } from './responseUtils';

describe('getAssistantMessage', () => {
  it('throws a descriptive error when no choices are provided', () => {
    expect(() => getAssistantMessage({})).toThrowError(EMPTY_RESPONSE_ERROR);
    expect(() => getAssistantMessage({ choices: [] })).toThrowError(EMPTY_RESPONSE_ERROR);
    expect(() => getAssistantMessage(undefined)).toThrowError(EMPTY_RESPONSE_ERROR);
  });

  it('returns the first assistant message when choices are present', () => {
    const assistantMessage = { content: 'Hello' };
    const response = { choices: [{ message: assistantMessage }] };

    expect(getAssistantMessage(response)).toBe(assistantMessage);
  });

  it('supports ModelProvider responses with content and tool calls', () => {
    const response = {
      content: 'Working on it',
      toolCalls: [
        {
          id: 'call_1',
          name: 'addTask',
          arguments: { projectId: '1', title: 'New task' },
        },
      ],
    };

    const assistantMessage = getAssistantMessage(response);

    expect(assistantMessage.content).toBe('Working on it');
    expect(assistantMessage.tool_calls?.[0]).toMatchObject({
      id: 'call_1',
      type: 'function',
      function: {
        name: 'addTask',
      },
    });
    expect(typeof assistantMessage.tool_calls?.[0].function.arguments).toBe('string');
  });
});
