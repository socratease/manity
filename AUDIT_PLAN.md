# Agentic Chat & Tool Calling Audit Plan

## Executive Summary

After auditing the `agent-sdk/` codebase against the OpenAI Agents SDK best practices, I've identified **significant deviations from the recommended patterns**. The current implementation manually reimplements what the SDK provides out-of-the-box, adding complexity and potential bugs.

**Verdict: Changes are needed to align with SDK best practices and simplify the code.**

---

## Current Architecture Issues

### Issue 1: Not Using the SDK's Built-in Agent Runner ⚠️ **CRITICAL**

**Location:** `src/agent-sdk/useAgentRuntime.ts:269-420`

**Problem:** The codebase creates an `Agent` using the SDK but then **completely bypasses the SDK's execution mechanism**. Instead of using the SDK's `run()` function, it:

1. Manually calls the model provider directly (`backendModelProvider.createChatCompletion()`)
2. Manually implements the agent loop (`runAgentLoop()`)
3. Manually parses tool calls from responses
4. Manually executes tools and manages conversation history

**Current Pattern (lines 303-319):**
```typescript
// ❌ WRONG: Bypasses SDK's run() function entirely
const response = await backendModelProvider.createChatCompletion({
  model: agent.model,
  messages: [...],
  tools: allTools.map(t => ({...})),
  tool_choice: 'auto',
});
```

**SDK Best Practice:**
```typescript
// ✅ CORRECT: Use SDK's run() function
import { run } from '@openai/agents';

const result = await run(agent, userMessage, {
  context: toolContext,
  maxTurns: 10,
});
```

**Impact:** ~150 lines of code that replicate what the SDK does automatically.

---

### Issue 2: Singleton Context Anti-Pattern ⚠️ **HIGH**

**Location:** `src/agent-sdk/context.ts:64-96`

**Problem:** Tools access state through a global singleton (`getToolContext()`) instead of receiving context via dependency injection.

**Current Pattern:**
```typescript
// In context.ts - global singleton
let currentContext: ToolExecutionContext | null = null;

export function setToolContext(ctx: ToolExecutionContext): void {
  currentContext = ctx;
}

export function getToolContext(): ToolExecutionContext {
  if (!currentContext) throw new Error('Tool context not initialized');
  return currentContext;
}

// In every tool file:
export const addTaskTool = tool({
  execute: async (input) => {
    const ctx = getToolContext();  // ❌ Global singleton access
    // ...
  },
});
```

**SDK Best Practice:**
```typescript
// Context is passed to run() and automatically available to tools
const agent = new Agent<ToolExecutionContext>({
  name: 'Momentum',
  tools: [addTaskTool],
});

// Tool receives context as second parameter
export const addTaskTool = tool({
  execute: async (input, context: RunContext<ToolExecutionContext>) => {
    const ctx = context.context;  // ✅ Injected, not global
  },
});

// Context passed to run()
await run(agent, message, { context: toolContext });
```

**Impact:**
- Makes testing difficult (can't easily inject mock context)
- Risk of stale context if not cleared properly
- Violates dependency injection principles

---

### Issue 3: Message Format Inconsistency ⚠️ **MEDIUM**

**Location:** `src/agent-sdk/useAgentRuntime.ts:379-410`

**Problem:** Tool results and assistant messages are serialized as JSON strings in the conversation history, which doesn't match OpenAI's expected format.

**Current Pattern:**
```typescript
// ❌ Serializes as JSON string - not standard format
conversationHistory.push({
  role: 'assistant',
  content: JSON.stringify({ content, toolCalls: parsedToolCalls }),
});

conversationHistory.push({
  role: 'tool',
  content: JSON.stringify({
    tool_call_id: parsedToolCalls[i].id,
    name: parsedToolCalls[i].name,
    result: results[i],
  }),
});
```

**OpenAI API Expected Format:**
```typescript
// ✅ Standard OpenAI message format
{
  role: 'assistant',
  content: content,
  tool_calls: [{ id, type: 'function', function: { name, arguments } }]
}

{
  role: 'tool',
  tool_call_id: 'call_xxx',
  content: 'result string'
}
```

**Impact:** May cause parsing issues or unexpected LLM behavior.

---

### Issue 4: Duplicated Tool Schema Conversion ⚠️ **LOW**

**Location:**
- `src/agent-sdk/useAgentRuntime.ts:310-318`
- `src/agent-sdk/modelProvider.ts:22-33`

**Problem:** Tool schemas are converted to OpenAI format in two places, duplicating logic.

---

### Issue 5: Custom Human-in-the-Loop Implementation ⚠️ **MEDIUM**

**Location:** `src/agent-sdk/tools/askUser.ts`

**Problem:** The `ask_user` tool uses a custom marker string (`__ASK_USER__`) to signal that execution should pause. This is a workaround because the code doesn't use the SDK's proper interruption mechanisms.

**Current Pattern:**
```typescript
export const ASK_USER_MARKER = '__ASK_USER__';

export const askUserTool = tool({
  execute: async (input) => {
    return ASK_USER_MARKER + JSON.stringify(input);  // ❌ Magic string
  },
});

// Then in useAgentRuntime.ts:
if (isAskUserResponse(result)) {  // Checks for magic string
  // pause execution...
}
```

**Impact:** Fragile, relies on string parsing, not type-safe.

---

## What's Done Well ✅

1. **Tool definitions with Zod** - Correct pattern using `tool()` with Zod schemas
2. **Delta tracking for undo/redo** - Clean architecture for reversible mutations
3. **Backend proxy pattern** - Good security practice keeping API keys server-side
4. **Sequential execution** - Correct decision to avoid race conditions with mutations
5. **Tool categorization** - Clean separation of safe/sensitive tools

---

## Recommended Changes

### Priority 1: Use SDK's run() Function

**Goal:** Eliminate the manual agent loop and use the SDK's built-in runner.

**Changes Required:**
1. Replace `runAgentLoop()` with SDK's `run()` function
2. Configure model provider at SDK level (already partially done with `setDefaultModelProvider`)
3. Pass context to `run()` instead of using singleton
4. Use `maxTurns` parameter instead of custom loop counter

**Estimated Impact:**
- Delete ~150 lines of manual loop code
- Simpler, more maintainable code
- Automatic handling of tool call/response flow

**Blockers/Considerations:**
- Need to verify SDK supports custom model providers for backend proxy
- Need to check if SDK's runner supports the human-in-the-loop pause pattern
- Sequential tool execution might need to be configured (SDK may run tools in parallel by default)

---

### Priority 2: Migrate to Context Dependency Injection

**Goal:** Pass context to tools through SDK's DI mechanism instead of singleton.

**Changes Required:**

1. Define typed Agent with context:
   ```typescript
   const agent = new Agent<ToolExecutionContext>({ ... });
   ```

2. Update all tools to receive context as parameter:
   ```typescript
   export const addTaskTool = tool({
     execute: async (input, runContext: RunContext<ToolExecutionContext>) => {
       const ctx = runContext.context;
       // ... rest of tool logic
     },
   });
   ```

3. Pass context when calling run():
   ```typescript
   await run(agent, message, { context: toolContext });
   ```

4. Remove singleton context functions (`setToolContext`, `getToolContext`, `clearToolContext`)

**Estimated Impact:**
- Modify 11 tool files
- Delete context singleton code
- Better testability
- Proper dependency injection

---

### Priority 3: Fix Message Format

**Goal:** Use standard OpenAI message format for conversation history.

**Changes Required:**
1. Structure assistant messages with proper `tool_calls` array
2. Structure tool messages with `tool_call_id` and `content` fields
3. Remove JSON.stringify wrappers

**Note:** If using SDK's `run()`, this becomes automatic.

---

### Priority 4: Simplify Human-in-the-Loop

**Goal:** Replace magic string marker with proper SDK mechanism or cleaner pattern.

**Options:**
1. Check if SDK has built-in interrupt/pause mechanism
2. If not, use a typed result object instead of string marker:
   ```typescript
   type ToolResult =
     | { type: 'success'; data: string }
     | { type: 'pause'; question: UserQuestion };
   ```

---

## Investigation Required Before Implementation

### Question 1: Does SDK's run() support custom model providers?

The codebase uses a backend proxy for API security. Need to verify:
- Can `setDefaultModelProvider()` work with `run()`?
- Or does `run()` require direct OpenAI API access?

**How to verify:** Check SDK source or documentation for model provider customization.

### Question 2: Does SDK support sequential tool execution?

The codebase intentionally executes tools sequentially to prevent race conditions. Need to verify:
- Does SDK execute tools in parallel by default?
- Is there a configuration option for sequential execution?

**How to verify:** Test with multiple tool calls or check SDK documentation.

### Question 3: How does SDK handle human-in-the-loop?

Need to understand:
- Does SDK have built-in pause/resume mechanism?
- Can tools signal that they need user input?
- How to resume execution after user responds?

**How to verify:** Look for interrupts, breakpoints, or pause-related APIs in SDK.

---

## Implementation Plan

### Phase 1: Investigation & Proof of Concept
1. Create test branch
2. Verify SDK's run() works with backend proxy model provider
3. Test sequential vs parallel tool execution
4. Document findings

### Phase 2: Core Migration (if POC succeeds)
1. Migrate to SDK's run() function
2. Update tool context to use DI pattern
3. Update all 11 tools to receive context as parameter
4. Remove singleton context code

### Phase 3: Cleanup
1. Fix message format (should be automatic with SDK's run())
2. Improve human-in-the-loop implementation
3. Remove deprecated code in `agent/` directory
4. Update tests

### Phase 4: Testing
1. Test all tools function correctly
2. Test undo/redo still works
3. Test human-in-the-loop flow
4. Test error handling

---

## Alternatives Considered

### Alternative A: Keep Custom Implementation

**Pros:**
- No risk of breaking changes
- Already working in production

**Cons:**
- ~150 lines of code that SDK provides
- Harder to maintain
- Miss out on SDK improvements/fixes
- Singleton anti-pattern remains

### Alternative B: Partial Migration

**Description:** Use SDK's `run()` but keep singleton context.

**Pros:**
- Smaller change
- Less risk

**Cons:**
- Still has singleton anti-pattern
- Incomplete migration

### Alternative C: Full Migration (Recommended)

**Description:** Fully adopt SDK patterns including run(), context DI, and proper message format.

**Pros:**
- Cleanest architecture
- Easiest to maintain
- Follows SDK best practices
- Better testability

**Cons:**
- Larger change
- Risk of introducing bugs
- Requires investigation of SDK capabilities

---

## Summary Table

| Issue | Severity | Effort | Priority |
|-------|----------|--------|----------|
| Not using SDK's run() | Critical | Medium | P1 |
| Singleton context | High | Medium | P2 |
| Message format | Medium | Low | P3 |
| Duplicated schema conversion | Low | Low | P4 |
| Human-in-the-loop hack | Medium | Medium | P4 |

---

## References

- [OpenAI Agents SDK Documentation](https://openai.github.io/openai-agents-js/)
- [OpenAI Agents SDK GitHub](https://github.com/openai/openai-agents-js)
- [Tools Guide](https://openai.github.io/openai-agents-js/guides/tools/)
- [Context Management](https://openai.github.io/openai-agents-js/guides/context/)
- [Running Agents](https://openai.github.io/openai-agents-js/guides/running-agents/)
