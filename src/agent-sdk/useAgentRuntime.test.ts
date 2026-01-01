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
});
