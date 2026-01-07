# Plan: Sequential Tool Execution, Thinking Process & Human-in-the-Loop

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

### Issue 3: No Ability for Clarification or Permission Requests
Currently, the agent executes all tool calls automatically without user input. There's no mechanism for:
- Asking clarifying questions before acting ("Which project did you mean?")
- Requesting permission for sensitive actions ("This will send an email to 5 people. Proceed?")
- Confirming destructive operations ("Delete all completed tasks?")

**Root Cause:**
- `run()` executes the full agent loop without pausing
- No interruption mechanism between LLM response and tool execution
- Tools execute immediately without user confirmation

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

### Part 3: Human-in-the-Loop Interactions

Sequential execution unlocks the ability for the LLM to pause and interact with the user before proceeding. This enables a conversational, collaborative workflow.

**Key Capabilities:**

1. **Clarifying Questions**
   - LLM can ask for missing information before acting
   - "You mentioned 'the API project' but I found 'API Gateway' and 'REST API'. Which one?"
   - User responds, conversation continues

2. **Permission Requests**
   - Sensitive actions require explicit approval
   - "I'm about to send an email to 5 stakeholders. Here's the draft: [...] Should I send it?"
   - User can approve, modify, or cancel

3. **Confirmation for Bulk/Destructive Actions**
   - Actions affecting multiple items need confirmation
   - "This will mark 12 tasks as completed. Proceed?"
   - Prevents accidental bulk changes

**Implementation Approach:**

1. **Add special tool for user interaction**
   ```typescript
   // New tool: ask_user
   const askUserTool = {
     name: 'ask_user',
     description: 'Ask the user a question and wait for their response',
     parameters: {
       question: { type: 'string', description: 'The question to ask' },
       context: { type: 'string', description: 'Why you need this info' },
       options: { type: 'array', description: 'Optional list of choices' },
     },
     execute: async (input) => {
       // This pauses execution and returns control to the UI
       // The UI displays the question and waits for user input
       // User's response is fed back into the agent loop
     }
   };
   ```

2. **Modify execution loop to handle pauses**
   ```typescript
   interface ExecutionState {
     status: 'running' | 'awaiting_user' | 'completed' | 'error';
     pendingQuestion?: UserQuestion;
     conversationHistory: Message[];
   }

   // When ask_user tool is called:
   // 1. Pause execution
   // 2. Return partial result with pending question
   // 3. UI displays question to user
   // 4. User responds
   // 5. Resume execution with user's answer
   ```

3. **Add tool categories for automatic permission prompts**
   ```typescript
   interface ToolMetadata {
     name: string;
     category: 'safe' | 'sensitive' | 'destructive';
     requiresConfirmation?: boolean;
   }

   const toolCategories = {
     'comment': { category: 'safe' },
     'add_task': { category: 'safe' },
     'send_email': { category: 'sensitive', requiresConfirmation: true },
     'update_project': { category: 'safe' },
     // Future: delete operations would be 'destructive'
   };
   ```

4. **Update agent instructions to use clarification**
   ```
   ## Interaction Guidelines
   - If the user's request is ambiguous, use ask_user to clarify
   - Before sending emails, show the draft and ask for confirmation
   - For bulk operations (3+ items), confirm before proceeding
   - When unsure which entity the user means, present options
   ```

**UI Changes for Human-in-the-Loop:**

1. **Question display component**
   - Shows LLM's question prominently in chat
   - Displays context/reasoning
   - If options provided, show as buttons for quick selection
   - Free-text input for open questions

2. **Pending action indicator**
   - Visual indicator that agent is waiting for user
   - "Momentum is waiting for your response..."
   - Timeout handling (optional)

3. **Approval UI for sensitive actions**
   - Preview of action to be taken
   - Approve / Modify / Cancel buttons
   - Ability to edit before confirming (e.g., email draft)

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
| `src/agent-sdk/useAgentRuntime.ts` | Replace `run()` with streaming/sequential execution, add thinking capture, handle paused states |
| `src/agent-sdk/types.ts` | Add `ThinkingStep`, `UserQuestion`, `ExecutionState` interfaces |
| `src/agent-sdk/tools/askUser.ts` | **NEW** - Tool for LLM to ask user questions |
| `src/agent-sdk/tools/index.ts` | Add `askUserTool` to tool list, add tool categories |
| `src/agent-sdk/agent.ts` | Update instructions with clarification guidelines |
| `src/components/MomentumChatWithAgent.jsx` | Import ThinkingProcess, handle awaiting_user state, question UI |
| `src/components/ThinkingProcess.jsx` | Possibly adapt to SDK output format (verify first) |
| `src/components/UserQuestionPrompt.jsx` | **NEW** - Component for displaying LLM questions with options |

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

3. **Phase 3: Thinking UI Integration**
   - Connect `ThinkingProcess` component
   - Add real-time streaming updates
   - Style and polish the thinking display

4. **Phase 4: Human-in-the-Loop**
   - Create `askUser` tool
   - Modify execution loop to handle paused states
   - Add `UserQuestionPrompt` component
   - Update agent instructions for clarification behavior
   - Add tool categories and auto-confirmation for sensitive tools
   - Test conversation flow with questions and approvals

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

4. **Clarifying questions test:**
   - Request: "Update the API project" (when multiple projects contain "API")
   - Expected: LLM asks "Which project? API Gateway or REST API?"
   - User selects, action proceeds on correct project

5. **Permission request test:**
   - Request: "Send a status update email to all stakeholders"
   - Expected: LLM shows email draft, asks "Send this email to 5 recipients?"
   - User can approve, edit, or cancel

6. **Conversation continuity test:**
   - After clarification, agent should continue with original intent
   - Multi-turn conversations should maintain context
   - Undo should still work across question/answer turns

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| SDK streaming API changes | Pin SDK version, wrap in abstraction layer |
| Performance impact | Sequential is acceptable trade-off for reliability |
| ThinkingProcess component mismatch | Adapt component or create adapter |
| Breaking existing functionality | Comprehensive testing before merge |
| LLM asks too many questions | Tune instructions, add "confidence threshold" |
| User abandons mid-conversation | Add timeout, allow cancellation, persist partial state |
| Question UI complexity | Start simple (text input), enhance with options later |
| Context loss in multi-turn | Ensure conversation history passed correctly to SDK |

---

## Open Questions

1. Does the JavaScript SDK (`@openai/agents` v0.3.7) have the same streaming API as Python?
2. What's the exact format of reasoning events in the SDK?
3. Should thinking be opt-in (collapsed by default) or always visible?
4. What actions should always require confirmation? (Proposed: `send_email`, future delete operations)
5. Should there be a "trust mode" that skips confirmations for power users?
6. How should we handle timeouts when waiting for user response?
7. Should the LLM be instructed to batch related questions or ask one at a time?
