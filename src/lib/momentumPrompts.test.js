import { describe, it, expect } from 'vitest';
import { MOMENTUM_CHAT_SYSTEM_PROMPT, MOMENTUM_THRUST_SYSTEM_PROMPT } from './momentumPrompts';

describe('momentumPrompts', () => {
  it('exports the chat system prompt with Momentum guidance', () => {
    expect(MOMENTUM_CHAT_SYSTEM_PROMPT).toContain('You are Momentum, an experienced technical project manager');
    expect(MOMENTUM_CHAT_SYSTEM_PROMPT).toContain("Respond with a JSON object containing a 'response' string and an 'actions' array.");
  });

  it('exports the thrust system prompt with portfolio-specific context', () => {
    expect(MOMENTUM_THRUST_SYSTEM_PROMPT).toContain('supporting the Data Science and AI team at BCBST');
    expect(MOMENTUM_THRUST_SYSTEM_PROMPT).toContain('Supported atomic actions');
    expect(MOMENTUM_THRUST_SYSTEM_PROMPT).not.toContain('LOGGED-IN USER');
  });
});
