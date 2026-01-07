export const EMPTY_RESPONSE_ERROR = 'Momentum response was empty';

export function getAssistantMessage(response: any) {
  // OpenAI-style response
  if (response?.choices?.length) {
    return response.choices[0]?.message;
  }

  // ModelProvider (SDK) response shape
  if (response?.content !== undefined || response?.toolCalls?.length) {
    return {
      content: response.content || '',
      tool_calls: (response.toolCalls || []).map((tc: any) => ({
        id: tc.id,
        type: 'function',
        function: {
          name: tc.name,
          arguments:
            typeof tc.arguments === 'string'
              ? tc.arguments
              : JSON.stringify(tc.arguments || {}),
        },
      })),
    };
  }

  throw new Error(EMPTY_RESPONSE_ERROR);
}
