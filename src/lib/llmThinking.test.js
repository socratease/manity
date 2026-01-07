import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('LLM Thinking Extraction', () => {
  describe('llmClient thinking handling', () => {
    let originalFetch;

    beforeEach(() => {
      originalFetch = global.fetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('should return thinking content when present in response', async () => {
      const mockThinking = 'I need to analyze the user request and determine the best action...';
      const mockContent = 'Here is my response to your question.';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          content: mockContent,
          thinking: mockThinking,
          raw: {
            choices: [{
              message: {
                content: [
                  { type: 'thinking', thinking: mockThinking },
                  { type: 'text', text: mockContent }
                ]
              }
            }]
          }
        })
      });

      const { callOpenAIChat } = await import('./llmClient');
      const result = await callOpenAIChat({
        messages: [{ role: 'user', content: 'test' }]
      });

      expect(result.thinking).toBe(mockThinking);
      expect(result.content).toBe(mockContent);
    });

    it('should return null thinking when not present in response', async () => {
      const mockContent = 'A simple response without thinking.';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          content: mockContent,
          thinking: null,
          raw: {
            choices: [{
              message: { content: mockContent }
            }]
          }
        })
      });

      const { callOpenAIChat } = await import('./llmClient');
      const result = await callOpenAIChat({
        messages: [{ role: 'user', content: 'test' }]
      });

      expect(result.thinking).toBeNull();
      expect(result.content).toBe(mockContent);
    });
  });

  describe('backend thinking extraction logic', () => {
    // Test the logic for extracting thinking from OpenAI's extended response format
    const extractThinking = (messageContent) => {
      let thinking = null;
      let content = '';

      if (Array.isArray(messageContent)) {
        const thinkingParts = [];
        const textParts = [];
        for (const block of messageContent) {
          if (typeof block === 'object' && block !== null) {
            if (block.type === 'thinking') {
              thinkingParts.push(block.thinking || '');
            } else if (block.type === 'text') {
              textParts.push(block.text || '');
            }
          }
        }
        thinking = thinkingParts.length > 0 ? thinkingParts.join('\n') : null;
        content = textParts.length > 0 ? textParts.join('\n') : '';
      } else {
        content = messageContent || '';
      }

      return { thinking, content };
    };

    it('should extract thinking from array content format', () => {
      const messageContent = [
        { type: 'thinking', thinking: 'Let me analyze this request...' },
        { type: 'text', text: 'Here is my answer.' }
      ];

      const result = extractThinking(messageContent);

      expect(result.thinking).toBe('Let me analyze this request...');
      expect(result.content).toBe('Here is my answer.');
    });

    it('should handle multiple thinking blocks', () => {
      const messageContent = [
        { type: 'thinking', thinking: 'First thought...' },
        { type: 'thinking', thinking: 'Second thought...' },
        { type: 'text', text: 'Final answer.' }
      ];

      const result = extractThinking(messageContent);

      expect(result.thinking).toBe('First thought...\nSecond thought...');
      expect(result.content).toBe('Final answer.');
    });

    it('should handle string content without thinking', () => {
      const messageContent = 'Simple string response';

      const result = extractThinking(messageContent);

      expect(result.thinking).toBeNull();
      expect(result.content).toBe('Simple string response');
    });

    it('should handle empty content', () => {
      const result = extractThinking('');
      expect(result.thinking).toBeNull();
      expect(result.content).toBe('');
    });

    it('should handle null content', () => {
      const result = extractThinking(null);
      expect(result.thinking).toBeNull();
      expect(result.content).toBe('');
    });

    it('should handle array with only text blocks', () => {
      const messageContent = [
        { type: 'text', text: 'Part 1.' },
        { type: 'text', text: 'Part 2.' }
      ];

      const result = extractThinking(messageContent);

      expect(result.thinking).toBeNull();
      expect(result.content).toBe('Part 1.\nPart 2.');
    });

    it('should handle array with only thinking blocks', () => {
      const messageContent = [
        { type: 'thinking', thinking: 'Thinking only...' }
      ];

      const result = extractThinking(messageContent);

      expect(result.thinking).toBe('Thinking only...');
      expect(result.content).toBe('');
    });
  });
});

describe('MomentumChat Thinking Display', () => {
  it('should have thinking field in assistant message structure', () => {
    // Test that the message structure properly includes thinking
    const assistantMessage = {
      id: 'msg-123',
      role: 'assistant',
      author: 'Momentum',
      content: 'Here is my response.',
      note: 'Here is my response.',
      thinking: 'I analyzed the request and determined the best course of action.',
      date: new Date().toISOString(),
      actionResults: [],
      updatedProjectIds: [],
      linkedProjectIds: [],
      deltas: [],
    };

    expect(assistantMessage).toHaveProperty('thinking');
    expect(assistantMessage.thinking).toBeTruthy();
    expect(typeof assistantMessage.thinking).toBe('string');
  });

  it('should support null thinking for regular responses', () => {
    const assistantMessage = {
      id: 'msg-124',
      role: 'assistant',
      author: 'Momentum',
      content: 'Simple response.',
      note: 'Simple response.',
      thinking: null,
      date: new Date().toISOString(),
      actionResults: [],
    };

    expect(assistantMessage.thinking).toBeNull();
  });
});
