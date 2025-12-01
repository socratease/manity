export async function callOpenAIChat({ apiKey, messages, model = "gpt-4.1-mini" }) {
  if (!apiKey) {
    throw new Error("Missing API key");
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error: ${text}`);
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content ?? "";
  return { content, raw: json };
}
