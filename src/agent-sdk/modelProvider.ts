/**
 * Custom Model Provider for Backend Proxy
 *
 * Routes all LLM calls through the backend endpoints to keep API keys secure.
 * Supports both streaming and non-streaming modes.
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
const LLM_PROVIDER = (import.meta.env.VITE_LLM_PROVIDER || 'azure').toLowerCase();
const LLM_MODEL = import.meta.env.VITE_LLM_MODEL || 'gpt-4.1';

function resolveUrl(path: string): string {
  if (API_BASE.startsWith('http')) return `${API_BASE}${path}`;
  return `${window.location.origin}${API_BASE}${path}`;
}

/**
 * Tool call structure
 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Message in OpenAI format
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

/**
 * Tool definition for function calling
 */
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/**
 * Request to the LLM
 */
export interface LLMRequest {
  model?: string;
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  tool_choice?: string;
}

/**
 * Response from non-streaming endpoint
 */
export interface LLMResponse {
  content: string;
  thinking?: string | null;
  tool_calls?: ToolCall[] | null;
  finish_reason?: string;
}

/**
 * Streaming event types
 */
export type StreamEventType = 'content' | 'tool_call_start' | 'done' | 'error';

export interface StreamEvent {
  type: StreamEventType;
  content?: string;
  tool_calls?: ToolCall[] | null;
  finish_reason?: string;
  index?: number;
  id?: string;
  name?: string;
  error?: string;
}

/**
 * Callbacks for streaming
 */
export interface StreamCallbacks {
  onContent?: (content: string) => void;
  onToolCallStart?: (index: number, id: string, name: string) => void;
  onDone?: (response: LLMResponse) => void;
  onError?: (error: Error) => void;
}

/**
 * Convert tool definitions to OpenAI format
 */
function formatTools(tools?: ToolDefinition[]): ToolDefinition[] | undefined {
  if (!tools || tools.length === 0) return undefined;
  return tools;
}

/**
 * Build request body for backend
 */
function buildRequestBody(request: LLMRequest): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: request.model || LLM_MODEL,
    provider: LLM_PROVIDER,
    messages: request.messages,
  };

  if (request.tools && request.tools.length > 0) {
    body.tools = formatTools(request.tools);
    if (request.tool_choice) {
      body.tool_choice = request.tool_choice;
    }
  }

  return body;
}

/**
 * Non-streaming chat completion
 */
export async function createChatCompletion(request: LLMRequest): Promise<LLMResponse> {
  const requestBody = buildRequestBody(request);

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
  const raw = json.raw;

  // Extract from raw OpenAI response
  const choice = raw?.choices?.[0];
  const message = choice?.message;

  return {
    content: json.content || message?.content || '',
    thinking: json.thinking || null,
    tool_calls: message?.tool_calls || null,
    finish_reason: choice?.finish_reason || 'stop',
  };
}

/**
 * Streaming chat completion using SSE
 */
export async function createStreamingChatCompletion(
  request: LLMRequest,
  callbacks: StreamCallbacks
): Promise<LLMResponse> {
  const requestBody = buildRequestBody(request);

  const response = await fetch(resolveUrl('/api/llm/chat/stream'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`LLM error: ${text}`);
    callbacks.onError?.(error);
    throw error;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let finalResponse: LLMResponse = {
    content: '',
    thinking: null,
    tool_calls: null,
    finish_reason: 'stop',
  };

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE events
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim();
          if (!dataStr) continue;

          try {
            const event: StreamEvent = JSON.parse(dataStr);

            switch (event.type) {
              case 'content':
                if (event.content) {
                  callbacks.onContent?.(event.content);
                }
                break;

              case 'tool_call_start':
                if (event.index !== undefined && event.id && event.name) {
                  callbacks.onToolCallStart?.(event.index, event.id, event.name);
                }
                break;

              case 'done':
                finalResponse = {
                  content: event.content || '',
                  thinking: null, // Streaming doesn't include thinking blocks currently
                  tool_calls: event.tool_calls || null,
                  finish_reason: event.finish_reason || 'stop',
                };
                callbacks.onDone?.(finalResponse);
                break;

              case 'error':
                const error = new Error(event.error || 'Unknown streaming error');
                callbacks.onError?.(error);
                throw error;
            }
          } catch (e) {
            // Ignore parse errors for incomplete chunks
            if (!(e instanceof SyntaxError)) {
              throw e;
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return finalResponse;
}

/**
 * Legacy ModelProvider interface for SDK compatibility
 * Note: The SDK's ModelProvider interface may not support streaming,
 * so this is provided for backwards compatibility.
 */
export const backendModelProvider = {
  async createChatCompletion(request: {
    model?: string;
    messages: Array<{
      role: string;
      content?: string | null;
      toolCalls?: Array<{ id: string; name: string; arguments: string }>;
      toolCallId?: string;
    }>;
    tools?: Array<{
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    }>;
    toolChoice?: string;
    responseFormat?: unknown;
  }): Promise<{
    content: string;
    toolCalls: Array<{ id: string; name: string; arguments: string }>;
    finishReason: string;
  }> {
    // Convert SDK format to our format
    const messages: ChatMessage[] = request.messages.map((m) => {
      const msg: ChatMessage = {
        role: m.role as ChatMessage['role'],
        content: m.content ?? undefined,
      };

      if (m.toolCalls) {
        msg.tool_calls = m.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.name,
            arguments: tc.arguments,
          },
        }));
      }

      if (m.toolCallId) {
        msg.tool_call_id = m.toolCallId;
      }

      return msg;
    });

    const tools: ToolDefinition[] | undefined = request.tools?.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    const response = await createChatCompletion({
      model: request.model,
      messages,
      tools,
      tool_choice: request.toolChoice,
    });

    // Convert back to SDK format
    const toolCalls =
      response.tool_calls?.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: tc.function.arguments,
      })) || [];

    return {
      content: response.content,
      toolCalls,
      finishReason: response.finish_reason || 'stop',
    };
  },
};

export default backendModelProvider;
