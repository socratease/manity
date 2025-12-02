export async function callOpenAIChat({ apiKey, messages, model = "gpt-5.1", responseFormat = null }) {
  if (!apiKey) {
    throw new Error("Missing API key");
  }

  const requestBody = {
    model,
    messages,
  };

  // Add structured output if provided
  if (responseFormat) {
    requestBody.response_format = responseFormat;
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error: ${text}`);
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content ?? "";
  return { content, raw: json };
}
