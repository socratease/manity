# Agentic Chat Framework Audit & Fixes Plan

## Executive Summary

After auditing the agentic chat framework, I've identified **critical architectural issues** where the OpenAI Agents SDK is imported but **not actually used correctly**. The code implements a completely custom agent loop that bypasses the SDK's core features, resulting in:

1. Tool calling that works but uses non-standard message formats
2. Thinking process updates that are synthetic/fake (not from actual LLM reasoning)
3. Backend `thinking` extraction that is completely ignored by the frontend
4. Missing SDK features (streaming, guardrails, tracing, handoffs)

---

## Detailed Findings

### Issue 1: SDK Agent Created But Not Used Properly

**Location:** `src/agent-sdk/useAgentRuntime.ts:286-438`

**Problem:** The code creates an OpenAI Agents SDK `Agent` object but does NOT use the SDK's `Runner.run()` method. Instead, it implements a completely custom agent loop:

```typescript
// Agent is created (line 513)
const agent = createProjectManagementAgent(agentContext);

// But then ONLY agent.model and agent.instructions are accessed (line 321-325)
const response = await backendModelProvider.createChatCompletion({
  model: agent.model,
  messages: [
    { role: 'system', content: agent.instructions },
    ...conversationHistory,
  ],
  tools: allTools.map(t => ({...})),  // NOT agent.tools!
  ...
});
```

**Impact:**
- Bypasses SDK's streaming capabilities
- Bypasses SDK's guardrails and safety features
- Bypasses SDK's tracing/observability
- Bypasses SDK's handoff support
- Bypasses SDK's proper tool execution context

**Fix Required:** Either:
- A) Use the SDK's `Runner.run()` with proper hooks/callbacks
- B) OR remove the SDK dependency entirely and document the custom implementation

---

### Issue 2: Thinking Process Shows Fake/Synthetic Updates

**Location:** `src/agent-sdk/useAgentRuntime.ts:314-318`

**Problem:** The "thinking steps" shown to users are **fabricated**, not extracted from actual LLM reasoning:

```typescript
// This is a FAKE planning step - not from LLM
const planningStep = createThinkingStep('planning', 'Analyzing request and deciding on actions...', {
  status: 'in_progress',
});
```

The backend DOES extract real `thinking` content from OpenAI's extended thinking format:

```python
# backend/main.py:2354-2367
if block.get("type") == "thinking":
    thinking_parts.append(block.get("thinking", ""))
...
return {"content": content, "thinking": thinking, "raw": data}
```

But this `thinking` is **completely ignored** by the frontend:

```typescript
// modelProvider.ts:38-62 - parseResponse() ignores thinking!
function parseResponse(data: any): ModelResponse {
  const choice = data.choices?.[0];
  const message = choice?.message;
  // No extraction of thinking content
  return {
    content: message.content || '',
    toolCalls,  // thinking is lost here
    finishReason: choice.finish_reason || 'stop',
  };
}
```

**Impact:**
- Users see "Analyzing request and deciding on actions..." for every request
- Real LLM reasoning is never displayed
- ThinkingProcess component shows tool calls but no actual reasoning

**Fix Required:**
- Pass `thinking` through `ModelResponse` type
- Display actual LLM thinking in ThinkingProcess component
- Keep tool call steps but add genuine reasoning steps

---

### Issue 3: Non-Standard Conversation History Format

**Location:** `src/agent-sdk/useAgentRuntime.ts:398-428`

**Problem:** Tool calls and results are stored as JSON-stringified content rather than proper OpenAI message format:

```typescript
// WRONG - Storing as JSON string (lines 398-401, 413-415)
conversationHistory.push({
  role: 'assistant',
  content: JSON.stringify({ content, toolCalls: parsedToolCalls }),
});

// Tool results also wrong (lines 419-426)
conversationHistory.push({
  role: 'tool',
  content: JSON.stringify({
    tool_call_id: parsedToolCalls[i].id,
    name: parsedToolCalls[i].name,
    result: results[i],
  }),
});
```

**Correct OpenAI format should be:**
```typescript
// Assistant message with tool_calls
{
  role: 'assistant',
  content: content || null,
  tool_calls: [...toolCalls]  // separate field, not in content
}

// Tool result message
{
  role: 'tool',
  tool_call_id: 'call_xxx',
  content: 'result string'  // just the result, not JSON
}
```

**Impact:**
- LLM may have difficulty parsing its own conversation history
- Multi-turn tool conversations may not work correctly
- Could cause confusion in complex tool chains

**Fix Required:** Use proper OpenAI message format for tool calls

---

### Issue 4: Model Provider Doesn't Return Full Response

**Location:** `src/agent-sdk/modelProvider.ts:38-62`

**Problem:** The `parseResponse` function loses important data:

```typescript
function parseResponse(data: any): ModelResponse {
  // Loses: thinking, usage stats, full choices array
  return {
    content: message.content || '',
    toolCalls,
    finishReason: choice.finish_reason || 'stop',
  };
}
```

But it receives this from backend:
```json
{
  "content": "...",
  "thinking": "...",  // LOST
  "raw": {
    "choices": [...],
    "usage": {...}    // LOST
  }
}
```

**Impact:**
- Thinking content never reaches the UI
- Usage stats not available for monitoring
- Raw response data lost

**Fix Required:** Extend `ModelResponse` type to include `thinking` and pass it through

---

### Issue 5: No Real-Time Streaming

**Location:** `src/agent-sdk/useAgentRuntime.ts` and `src/agent-sdk/modelProvider.ts`

**Problem:** There is no streaming implementation. All requests wait for complete response:

```typescript
// modelProvider.ts:99-105
const response = await fetch(resolveUrl('/api/llm/chat'), {
  method: 'POST',
  // No streaming headers or handling
  body: JSON.stringify(requestBody),
});
const json = await response.json();  // Waits for complete response
```

The UI shows a typing indicator with fake thinking steps, but the actual LLM response isn't streamed.

**Impact:**
- User waits with no progress indication
- Long-running requests feel slow
- Can't show incremental reasoning

**Fix Required:** Implement SSE or WebSocket streaming for LLM responses

---

### Issue 6: Tools Array Duplicated

**Location:** `src/agent-sdk/agent.ts:114` and `src/agent-sdk/useAgentRuntime.ts:327`

**Problem:** Tools are configured on the Agent but a separate `allTools` array is used in the custom loop:

```typescript
// In agent.ts - Agent has tools
return new Agent({
  ...
  tools: allTools,
});

// In useAgentRuntime.ts - But we use a different reference
tools: allTools.map(t => ({  // Using imported allTools, not agent.tools
  ...
})),
```

**Impact:**
- Agent configuration is ignored
- Changes to agent tools won't take effect
- Confusing code structure

**Fix Required:** Either use `agent.tools` or document why separate array is needed

---

## Component Wiring Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                             │
├─────────────────────────────────────────────────────────────────────┤
│  MomentumChatWithAgent.jsx                                          │
│  └── useAgentRuntime hook                                           │
│      ├── Creates Agent (but doesn't use Runner)                     │
│      ├── Calls backendModelProvider.createChatCompletion() directly │
│      ├── Manually parses tool_calls                                 │
│      ├── Manually executes tools via allTools array                 │
│      ├── Creates FAKE thinking steps                                │
│      └── Stores conversation in non-standard format                 │
│                                                                     │
│  ThinkingProcess.jsx                                                │
│  └── Displays synthetic steps (not real LLM thinking)              │
├─────────────────────────────────────────────────────────────────────┤
│                              ↓                                       │
│                    backendModelProvider                              │
│                    (fetch to /api/llm/chat)                         │
│                              ↓                                       │
├─────────────────────────────────────────────────────────────────────┤
│                         BACKEND (FastAPI)                            │
├─────────────────────────────────────────────────────────────────────┤
│  /api/llm/chat                                                      │
│  ├── Proxies to Azure OpenAI / OpenAI                               │
│  ├── Extracts 'thinking' from extended thinking format ✓            │
│  ├── Returns { content, thinking, raw }                             │
│  └── But thinking is IGNORED by frontend                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Recommended Fixes (Priority Order)

### Priority 1: Fix Thinking Process Display

1. **Extend ModelResponse type** to include `thinking?: string`
2. **Update modelProvider.ts** to extract and return thinking
3. **Update useAgentRuntime** to create genuine "reasoning" steps from thinking
4. **Keep tool_call/tool_result steps** but add real LLM reasoning before them

**Files to modify:**
- `src/agent-sdk/modelProvider.ts` - Add thinking to parseResponse
- `src/agent-sdk/useAgentRuntime.ts` - Use thinking in steps

### Priority 2: Fix Conversation History Format

1. **Use proper OpenAI message format** for tool calls
2. **Assistant messages** should have `tool_calls` as separate field
3. **Tool messages** should have `tool_call_id` as field, not in stringified content

**Files to modify:**
- `src/agent-sdk/useAgentRuntime.ts` - Fix message format in runAgentLoop

### Priority 3: Decide on SDK Usage

**Option A: Use SDK Properly**
- Implement custom ModelProvider that uses backend proxy
- Use `Runner.run()` with proper hooks
- Get streaming, guardrails, tracing for free

**Option B: Remove SDK Dependency**
- Remove `@openai/agents` dependency
- Document the custom implementation
- Keep tools using Zod but without SDK wrappers

**Recommendation:** Option B may be simpler given current architecture, but Option A would provide more robust features.

### Priority 4: Add Streaming Support

1. **Backend:** Add SSE endpoint for streaming LLM responses
2. **Frontend:** Use EventSource or fetch with ReadableStream
3. **UI:** Stream tokens to ThinkingProcess component in real-time

---

## Files Affected

| File | Issue | Priority |
|------|-------|----------|
| `src/agent-sdk/modelProvider.ts` | Ignores thinking content | P1 |
| `src/agent-sdk/useAgentRuntime.ts` | Custom loop, fake steps, bad format | P1, P2 |
| `src/agent-sdk/types.ts` | Missing thinking in ModelResponse | P1 |
| `src/agent-sdk/agent.ts` | Agent tools ignored | P3 |
| `src/components/ThinkingProcess.jsx` | Shows fake data | P1 |
| `backend/main.py` | No streaming endpoint | P4 |

---

## Testing Checklist

After fixes, verify:

- [ ] Thinking process shows actual LLM reasoning (if model supports extended thinking)
- [ ] Tool calls display correctly with input/output
- [ ] Multi-turn conversations work correctly
- [ ] Undo/redo still works
- [ ] Human-in-the-loop (ask_user) still pauses correctly
- [ ] Error handling works for LLM failures
- [ ] Conversation history is in correct format for multi-turn

---

## Conclusion

The agentic chat framework **works** but with significant issues:

1. **Tool calling works** but uses non-standard message format
2. **Thinking process is fake** - shows synthetic steps, not real LLM reasoning
3. **SDK is not used properly** - custom loop bypasses SDK features
4. **Backend extracts thinking but frontend ignores it**

The most impactful fix is Priority 1 (thinking process) as it directly affects user experience. The conversation format (Priority 2) is important for reliability in complex interactions.
