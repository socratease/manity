/**
 * Custom Model Provider for Backend Proxy
 *
 * Routes all LLM calls through the backend /api/llm/chat endpoint
 * to keep API keys secure on the server side.
 */

import type { ModelProvider, ModelRequest, ModelResponse } from '@openai/agents';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
const LLM_PROVIDER = (import.meta.env.VITE_LLM_PROVIDER || 'azure').toLowerCase();
const LLM_MODEL = import.meta.env.VITE_LLM_MODEL || 'gpt-4.1';

function resolveUrl(path: string): string {
  if (API_BASE.startsWith('http')) return `${API_BASE}${path}`;
  return `${window.location.origin}${API_BASE}${path}`;
}

/**
 * Convert SDK tool definitions to OpenAI function format
 */
function toolsToFunctions(tools: ModelRequest['tools']): any[] {
  if (!tools || tools.length === 0) return [];

  return tools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

/**
 * Convert OpenAI response to SDK format
 */
function parseResponse(data: any): ModelResponse {
  const choice = data.choices?.[0];
  const message = choice?.message;

  if (!message) {
    return {
      content: '',
      toolCalls: [],
      finishReason: 'stop',
    };
  }

  // Parse tool calls if present
  const toolCalls = (message.tool_calls || []).map((tc: any) => ({
    id: tc.id,
    name: tc.function.name,
    arguments: tc.function.arguments,
  }));

  return {
    content: message.content || '',
    toolCalls,
    finishReason: choice.finish_reason || 'stop',
  };
}

/**
 * Backend proxy model provider
 *
 * This provider sends requests to our FastAPI backend which then
 * forwards them to Azure OpenAI or OpenAI, keeping API keys secure.
 */
export const backendModelProvider: ModelProvider = {
  async createChatCompletion(request: ModelRequest): Promise<ModelResponse> {
    const { messages, tools, toolChoice, responseFormat } = request;

    // Build request body for our backend proxy
    const requestBody: Record<string, any> = {
      model: request.model || LLM_MODEL,
      provider: LLM_PROVIDER,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        tool_calls: m.toolCalls,
        tool_call_id: m.toolCallId,
      })),
    };

    // Add tools if present
    if (tools && tools.length > 0) {
      requestBody.tools = toolsToFunctions(tools);
      if (toolChoice) {
        requestBody.tool_choice = toolChoice;
      }
    }

    // Add response format if present
    if (responseFormat) {
      requestBody.response_format = responseFormat;
    }

    const response = await fetch(resolveUrl('/api/llm/chat'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`LLM error: ${text}`);
    }

    const json = await response.json();
    return parseResponse(json.raw ?? json);
  },
};

export default backendModelProvider;
