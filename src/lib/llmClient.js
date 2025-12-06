export async function callOpenAIChat({ messages, model = "gpt-5.1", responseFormat = null }) {
  const requestBody = {
    model,
    messages,
  };

  if (responseFormat) {
    requestBody.response_format = responseFormat;
  }

  const res = await fetch("/api/llm/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error: ${text}`);
  }

  const json = await res.json();
  const content = json.content ?? json.choices?.[0]?.message?.content ?? "";
  return { content, raw: json.raw ?? json };
}
