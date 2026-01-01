# Plan: Sequential Tool Execution & Thinking Process Exposure

## Problem Summary

### Issue 1: Race Condition in Task/Subtask Creation
When the LLM returns multiple tool calls (e.g., `addTask` + `addSubtask`) in a single response, the OpenAI Agents SDK executes them in parallel. This causes `addSubtask` to fail with "Task not found" because the parent task hasn't been created yet.

**Root Cause:**
- `src/agent-sdk/useAgentRuntime.ts:135-137`: Uses `run()` which processes tool calls in parallel
- `src/agent-sdk/tools/addSubtask.ts:46-48`: `ctx.resolveTask()` checks `project.plan` synchronously
- `src/agent-sdk/tools/addTask.ts:56-77`: Creates task and adds to plan, but this completes after `addSubtask` already checked

### Issue 2: Thinking/Planning Process Not Exposed
The AI's reasoning process is not visible in the chat interface, even though the SDK provides this data.

**Root Cause:**
- `src/components/MomentumChatWithAgent.jsx:251`: Comment shows `ThinkingProcess` was removed
- `src/agent-sdk/useAgentRuntime.ts:135`: The `run()` function is not configured to stream or expose intermediate thinking
- The existing `ThinkingProcess.jsx` component is designed for this but not connected to SDK output

---

## Solution Approach

### Part 1: Sequential Tool Execution

**Option A (Recommended): Use SDK Streaming with Sequential Tool Handling**

The OpenAI Agents SDK provides streaming capabilities that allow fine-grained control over tool execution. By using the streaming API, we can:
1. Intercept each tool call before execution
2. Execute tools sequentially (wait for one to complete before next)
3. Capture intermediate reasoning/thinking steps (solves both issues)

**Key Changes:**
1. **Replace `run()` with streaming approach** in `useAgentRuntime.ts`
   - Use SDK's streaming/event-based execution
   - Queue tool calls and execute sequentially
   - File: `src/agent-sdk/useAgentRuntime.ts`

2. **Add a tool execution queue/coordinator**
   - Process one tool at a time
   - Await completion before proceeding
   - Ensures parent tasks exist before subtask creation

**Alternative Option B: Pending Tasks Buffer**

If streaming is too complex, add a "pending tasks" buffer:
1. When `addTask` is called, immediately add task ID to a pending set
2. Modify `resolveTask` to check pending tasks buffer
3. Wait for pending task completion before proceeding

This is simpler but doesn't solve Issue 2 (thinking exposure).

---

### Part 2: Expose Thinking/Planning Process

**Implementation Steps:**

1. **Update `useAgentRuntime.ts` to capture reasoning data**
   - Add state/callback for thinking steps
   - Extract reasoning tokens from streaming events
   - File: `src/agent-sdk/useAgentRuntime.ts`

2. **Update return type to include thinking data**
   - Add `thinkingSteps: ThinkingStep[]` to `AgentExecutionResult`
   - File: `src/agent-sdk/types.ts`

3. **Connect `ThinkingProcess.jsx` to agent output**
   - Pass thinking data from `executeMessage` result
   - Render in chat message
   - File: `src/components/MomentumChatWithAgent.jsx`

4. **Add streaming state updates**
   - Show thinking in real-time as agent processes
   - Update UI progressively during execution
   - File: `src/components/MomentumChatWithAgent.jsx`

---

## Detailed Implementation Plan

### Step 1: Update `useAgentRuntime.ts` - Sequential Execution with Streaming

**Current code (lines 134-137):**
```typescript
const result = await run(agent, message, {
  maxTurns: config.maxToolCalls || 10,
});
```

**New approach:**
```typescript
// Use streaming runner or custom execution loop
// Process tool calls one at a time
// Capture thinking/reasoning events

interface ExecutionState {
  thinkingSteps: ThinkingStep[];
  toolCalls: ToolCallEvent[];
  currentTool: string | null;
}

// Stream-based execution that:
// 1. Yields each LLM response chunk
// 2. Captures reasoning_item events
// 3. Queues and executes tool calls sequentially
// 4. Collects all data for final result
```

### Step 2: Define Thinking Data Types

**File: `src/agent-sdk/types.ts`**

Add new types:
```typescript
export interface ThinkingStep {
  id: string;
  type: 'reasoning' | 'planning' | 'tool_call' | 'result';
  content: string;
  timestamp: number;
  toolName?: string;
  toolInput?: Record<string, any>;
  status?: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface AgentExecutionResult {
  response: string;
  deltas: Delta[];
  workingProjects: Project[];
  updatedEntityIds: string[];
  actionResults: ActionResult[];
  thinkingSteps: ThinkingStep[];  // NEW
}
```

### Step 3: Update `MomentumChatWithAgent.jsx`

**Changes needed:**

1. Import and use `ThinkingProcess` component:
```jsx
import ThinkingProcess from './ThinkingProcess';
```

2. Add thinking data to message state:
```javascript
const assistantMessage = {
  // ... existing fields
  thinkingSteps: result.thinkingSteps,  // NEW
};
```

3. Render thinking process in messages:
```jsx
{message.thinkingSteps?.length > 0 && (
  <ThinkingProcess
    plan={{
      goal: message.content,
      steps: message.thinkingSteps,
      status: 'completed'
    }}
    colors={colors}
  />
)}
```

4. Add real-time streaming state:
```javascript
const [streamingThinking, setStreamingThinking] = useState([]);

// Update during execution via callback
const handleThinkingUpdate = (step) => {
  setStreamingThinking(prev => [...prev, step]);
};
```

### Step 4: Adapt `ThinkingProcess.jsx` (if needed)

The existing component expects:
- `plan.goal` - string
- `plan.steps` - array with `rationale`, `toolCandidates`
- `plan.status` - 'completed' | 'failed' | 'in_progress'
- `executionLog.events` - execution results

May need to adapt props interface to match SDK output format.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/agent-sdk/useAgentRuntime.ts` | Replace `run()` with streaming/sequential execution, add thinking capture |
| `src/agent-sdk/types.ts` | Add `ThinkingStep` interface, update `AgentExecutionResult` |
| `src/components/MomentumChatWithAgent.jsx` | Import ThinkingProcess, pass thinking data, add streaming state |
| `src/components/ThinkingProcess.jsx` | Possibly adapt to SDK output format (verify first) |

---

## Implementation Order

1. **Phase 1: Sequential Tool Execution**
   - Modify `useAgentRuntime.ts` to execute tools sequentially
   - Test that task/subtask creation works correctly
   - Ensure backward compatibility

2. **Phase 2: Thinking Process Capture**
   - Add thinking step types
   - Capture reasoning from SDK during execution
   - Return thinking data in result

3. **Phase 3: UI Integration**
   - Connect `ThinkingProcess` component
   - Add real-time streaming updates
   - Style and polish the thinking display

---

## Testing Considerations

1. **Sequential execution test:**
   - Request: "Create a task 'Deploy API' and add subtasks 'Update docs' and 'Run tests'"
   - Expected: All tasks and subtasks created successfully
   - Previously: Subtasks failed with "Task not found"

2. **Thinking process visibility:**
   - Any request should show the thinking process in collapsible UI
   - Should see: reasoning steps, tool selections, execution results

3. **Performance:**
   - Sequential execution may be slightly slower but more reliable
   - Streaming should make the UI feel more responsive

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| SDK streaming API changes | Pin SDK version, wrap in abstraction layer |
| Performance impact | Sequential is acceptable trade-off for reliability |
| ThinkingProcess component mismatch | Adapt component or create adapter |
| Breaking existing functionality | Comprehensive testing before merge |

---

## Open Questions

1. Does the JavaScript SDK (`@openai/agents` v0.3.7) have the same streaming API as Python?
2. What's the exact format of reasoning events in the SDK?
3. Should thinking be opt-in (collapsed by default) or always visible?
