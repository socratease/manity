const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
const LLM_PROVIDER = (import.meta.env.VITE_LLM_PROVIDER || 'azure').toLowerCase();
const LLM_MODEL = import.meta.env.VITE_LLM_MODEL || 'gpt-4.1';
const DEFAULT_RESPONSE_FORMAT = import.meta.env.VITE_LLM_RESPONSE_FORMAT
  ? JSON.parse(import.meta.env.VITE_LLM_RESPONSE_FORMAT)
  : null;
const resolveUrl = (path) => {
  if (API_BASE.startsWith('http')) return `${API_BASE}${path}`;
  return `${window.location.origin}${API_BASE}${path}`;
};

export async function callOpenAIChat({
  messages,
  model = LLM_MODEL,
  responseFormat = DEFAULT_RESPONSE_FORMAT,
  provider = LLM_PROVIDER,
} = {}) {
  const requestBody = {
    model,
    provider,
    messages,
  };

  if (responseFormat) {
    requestBody.response_format = responseFormat;
  }

  const res = await fetch(resolveUrl("/api/llm/chat"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM error: ${text}`);
  }

  const json = await res.json();
  const content = json.content ?? json.choices?.[0]?.message?.content ?? "";
  return { content, raw: json.raw ?? json };
}
