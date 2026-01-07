# Migration Plan: OpenAI Agents SDK

## Executive Summary

This plan outlines the migration from the current custom agent orchestration system to the **OpenAI Agents SDK (JavaScript/TypeScript)**. The migration simplifies the codebase by leveraging the SDK's built-in primitives (Agents, Tools, Runner, Handoffs) while preserving the unique undo/delta system that's critical to this application.

---

## Current Architecture Analysis

### What We Have Today

```
┌─────────────────────────────────────────────────────────────┐
│                    MomentumChatWithAgent                    │
│                    (React Component)                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      AgentRuntime                           │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  Planner │  │ ToolSelector │  │   Execution Loop      │  │
│  └──────────┘  └──────────────┘  │  (plan→act→observe)   │  │
│                                   └───────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     ToolRegistry                            │
│  10 custom tools (comment, add_task, create_project, etc.) │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                Backend LLM Proxy                            │
│          /api/llm/chat (Azure/OpenAI)                       │
└─────────────────────────────────────────────────────────────┘
```

### Key Custom Components to Replace/Adapt

| Component | Lines | Purpose | Migration Strategy |
|-----------|-------|---------|-------------------|
| `AgentRuntime.ts` | 390 | Main orchestrator | **Replace** with SDK Runner |
| `Planner.ts` | 420 | LLM response parsing, prompts | **Remove** - SDK handles this |
| `ToolRegistry.ts` | ~200 | Tool registration | **Replace** with SDK tool() |
| `ToolSelector.ts` | ~150 | Constraint checking | **Adapt** - use guardrails |
| `UndoManager.ts` | ~200 | Delta tracking/rollback | **Keep** - unique feature |
| `tools/*.ts` | ~1000 | 10 domain tools | **Convert** to SDK format |

### What We Keep (Unique Business Logic)

1. **Delta/Undo System** - The reversible state changes are a unique feature not covered by the SDK
2. **Domain Tools** - The tool logic (comment, add_task, etc.) remains the same, just wrapped differently
3. **Project/Task Data Types** - All TypeScript interfaces in `types.ts`
4. **React Hook Integration** - `useAgentRuntime.ts` (will be simplified)

---

## Target Architecture with OpenAI Agents SDK

```
┌─────────────────────────────────────────────────────────────┐
│                    MomentumChatWithAgent                    │
│                    (React Component)                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  useAgentRuntime Hook                       │
│          (simplified, wraps SDK + UndoManager)              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  OpenAI Agents SDK                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  ProjectManagementAgent                                │ │
│  │  - instructions: System prompt                         │ │
│  │  - tools: [comment, addTask, createProject, ...]       │ │
│  │  - handoffs: [] (future: specialized sub-agents)       │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Runner.run(agent, message)                            │ │
│  │  - Automatic tool orchestration                        │ │
│  │  - Built-in retry and error handling                   │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     SDK Tools                               │
│  Wrapped with Zod schemas, execute -> returns Delta[]       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    UndoManager                              │
│              (unchanged - handles deltas)                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Migration Phases

### Phase 1: Setup and Dependencies

**Goal:** Install SDK and set up project structure

**Tasks:**
1. Install `@openai/agents` and `zod` packages
2. Create new `src/agent-sdk/` directory structure:
   ```
   src/agent-sdk/
   ├── agent.ts           # Main agent definition
   ├── tools/             # SDK-format tools
   │   ├── comment.ts
   │   ├── createProject.ts
   │   ├── addTask.ts
   │   ├── updateTask.ts
   │   ├── addSubtask.ts
   │   ├── updateSubtask.ts
   │   ├── updateProject.ts
   │   ├── addPerson.ts
   │   ├── queryPortfolio.ts
   │   └── sendEmail.ts
   ├── types.ts           # Re-export existing types + SDK types
   ├── context.ts         # Tool context provider
   └── index.ts           # Public API
   ```
3. Configure environment for direct OpenAI API access (SDK connects directly)

**Breaking Change Note:** The SDK connects directly to OpenAI's API, not through the backend proxy. Options:
- **Option A**: Use SDK directly with OPENAI_API_KEY in frontend (not recommended for production)
- **Option B (Recommended)**: Create a custom model provider that uses the backend proxy

---

### Phase 2: Convert Tools to SDK Format

**Goal:** Rewrite all 10 tools using the SDK's `tool()` function with Zod schemas

**Current Tool Structure (example: comment.ts):**
```typescript
// Current format
export const commentTool: ToolDefinition = {
  name: 'comment',
  description: 'Add a comment to a project',
  inputSchema: { type: 'object', properties: {...} },  // JSON Schema
  metadata: { mutatesState: true, ... },
  async execute(ctx: ToolContext, input: CommentInput): Promise<ToolResult> {
    // ... implementation returning deltas
  },
};
```

**Target Tool Structure (SDK format):**
```typescript
import { z } from 'zod';
import { tool } from '@openai/agents';

// Zod schema replaces JSON Schema
const CommentInput = z.object({
  projectId: z.string().optional(),
  projectName: z.string().optional(),
  note: z.string().optional(),
  content: z.string().optional(),
  author: z.string().optional(),
});

export const commentTool = tool({
  name: 'comment',
  description: 'Add a comment or activity note to a project',
  parameters: CommentInput,
  execute: async (input, context) => {
    // Access our custom context via closure or context parameter
    const { helpers, workingProjects, loggedInUser } = getToolContext();

    // ... same implementation logic ...

    // Return string result for LLM, but also track deltas separately
    trackDeltas([delta]);
    return `Commented on ${project.name}: "${note}"`;
  },
});
```

**Tool Conversion Checklist:**
- [ ] comment.ts
- [ ] createProject.ts
- [ ] addTask.ts
- [ ] updateTask.ts
- [ ] addSubtask.ts
- [ ] updateSubtask.ts
- [ ] updateProject.ts
- [ ] addPerson.ts
- [ ] queryPortfolio.ts
- [ ] sendEmail.ts

**Key Difference:** SDK tools return strings (for LLM context), not our custom ToolResult. We'll use a side-channel (context or callback) to track deltas.

---

### Phase 3: Create the Agent Definition

**Goal:** Define the main ProjectManagementAgent using SDK primitives

**File: `src/agent-sdk/agent.ts`**

```typescript
import { Agent } from '@openai/agents';
import { commentTool, addTaskTool, ... } from './tools';

// Dynamic instruction builder (replaces Planner.buildSystemPrompt)
function buildInstructions(context: AgentContext): string {
  return `You are an AI project management assistant.

## Current User
${context.loggedInUser}

## Available Projects
${JSON.stringify(context.projects.map(p => ({
  id: p.id, name: p.name, status: p.status, progress: p.progress
})), null, 2)}

## People Database
${JSON.stringify(context.people, null, 2)}

## Guidelines
1. Be concise and direct
2. Only take explicitly requested actions
3. Reference projects by exact name or ID
`;
}

export function createProjectManagementAgent(context: AgentContext) {
  return new Agent({
    name: 'Momentum',
    instructions: buildInstructions(context),
    model: 'gpt-4.1',
    tools: [
      commentTool,
      createProjectTool,
      addTaskTool,
      updateTaskTool,
      addSubtaskTool,
      updateSubtaskTool,
      updateProjectTool,
      addPersonTool,
      queryPortfolioTool,
      sendEmailTool,
    ],
  });
}
```

---

### Phase 4: Implement Delta Tracking

**Goal:** Bridge the SDK's string-based tool returns with our delta tracking system

**Approach:** Create a ToolExecutionContext that tools can access to register deltas

**File: `src/agent-sdk/context.ts`**

```typescript
import type { Delta, Project, Person } from '../agent/types';

interface ToolExecutionContext {
  // State
  projects: Project[];
  workingProjects: Project[];
  people: Person[];
  loggedInUser: string;

  // Helpers (same as current)
  resolveProject: (target: string | number) => Project | null;
  resolveTask: (project: Project, target: string) => Task | null;
  // ...

  // Delta tracking
  trackDelta: (delta: Delta) => void;
  trackDeltas: (deltas: Delta[]) => void;
  getDeltas: () => Delta[];
  clearDeltas: () => void;
}

// Singleton or context provider pattern
let currentContext: ToolExecutionContext | null = null;

export function setToolContext(ctx: ToolExecutionContext) {
  currentContext = ctx;
}

export function getToolContext(): ToolExecutionContext {
  if (!currentContext) throw new Error('Tool context not initialized');
  return currentContext;
}
```

---

### Phase 5: Update React Integration

**Goal:** Simplify useAgentRuntime hook to use SDK Runner

**File: `src/agent-sdk/useAgentRuntime.ts`**

```typescript
import { run } from '@openai/agents';
import { createProjectManagementAgent } from './agent';
import { setToolContext, getToolContext } from './context';
import { UndoManager } from '../agent/UndoManager';

export function useAgentRuntime(props: UseAgentRuntimeProps) {
  const undoManager = useMemo(() => new UndoManager(), []);

  const executeMessage = useCallback(async (message: string) => {
    // Setup context with delta tracking
    const deltas: Delta[] = [];
    const workingProjects = props.projects.map(cloneDeep);

    setToolContext({
      projects: props.projects,
      workingProjects,
      people: props.people,
      loggedInUser: props.loggedInUser,
      // ... helpers ...
      trackDelta: (d) => deltas.push(d),
      trackDeltas: (ds) => deltas.push(...ds),
      getDeltas: () => deltas,
      clearDeltas: () => { deltas.length = 0; },
    });

    // Create agent with current context
    const agent = createProjectManagementAgent({
      projects: workingProjects,
      people: props.people,
      loggedInUser: props.loggedInUser,
    });

    // Run agent (SDK handles the loop)
    const result = await run(agent, message);

    // Collect results
    return {
      response: result.finalOutput,
      deltas: getToolContext().getDeltas(),
      workingProjects,
    };
  }, [props]);

  return {
    executeMessage,
    undoManager,
    // ... other methods
  };
}
```

---

### Phase 6: Update MomentumChatWithAgent Component

**Goal:** Simplify the component to use the new hook

**Changes:**
1. Remove manual LLM calling (SDK handles it)
2. Remove response parsing (SDK handles structured output)
3. Remove retry logic (SDK has built-in retry)
4. Keep undo functionality (uses same UndoManager)

**Simplified flow:**
```typescript
const handleSend = async () => {
  const { response, deltas, workingProjects } = await executeMessage(inputValue);

  // Create assistant message with results
  const assistantMessage = {
    content: response,
    deltas,
    updatedProjectIds: extractUpdatedIds(deltas),
    // ...
  };

  onSendMessage(assistantMessage);

  // Apply changes to actual state
  if (deltas.length > 0) {
    onApplyActions(/* ... */);
  }
};
```

---

### Phase 7: Backend Considerations

**Option A: Direct SDK Connection (Development Only)**
- Set `OPENAI_API_KEY` in frontend environment
- SDK connects directly to OpenAI
- Not recommended for production (exposes API key)

**Option B: Custom Model Provider (Recommended)**
- Create a custom model provider that routes through the backend proxy
- Maintains security by keeping API keys server-side
- Requires implementing SDK's model interface

```typescript
// Custom provider using backend proxy
import { setDefaultModelProvider } from '@openai/agents';

const backendProvider = {
  async createCompletion(params) {
    const response = await fetch('/api/llm/chat', {
      method: 'POST',
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        tools: params.tools,
      }),
    });
    return response.json();
  },
};

setDefaultModelProvider(backendProvider);
```

---

### Phase 8: Advanced Features (Future)

**Potential Enhancements Using SDK Features:**

1. **Multi-Agent with Handoffs**
   - Create specialized sub-agents for different domains
   - Example: EmailAgent for composing and sending emails
   - Example: ReportingAgent for generating status reports

2. **Guardrails**
   - Input validation before tool execution
   - Output validation for safety checks
   - Replace current `ToolSelector` constraints

3. **Sessions**
   - Built-in conversation persistence
   - Could replace manual message history management

4. **Streaming**
   - Real-time response streaming
   - Progressive UI updates

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/agent-sdk/index.ts` | Public API exports |
| `src/agent-sdk/agent.ts` | Main agent definition |
| `src/agent-sdk/context.ts` | Tool execution context |
| `src/agent-sdk/types.ts` | SDK-specific types |
| `src/agent-sdk/tools/index.ts` | Tool exports |
| `src/agent-sdk/tools/comment.ts` | Comment tool |
| `src/agent-sdk/tools/createProject.ts` | Create project tool |
| `src/agent-sdk/tools/addTask.ts` | Add task tool |
| `src/agent-sdk/tools/updateTask.ts` | Update task tool |
| `src/agent-sdk/tools/addSubtask.ts` | Add subtask tool |
| `src/agent-sdk/tools/updateSubtask.ts` | Update subtask tool |
| `src/agent-sdk/tools/updateProject.ts` | Update project tool |
| `src/agent-sdk/tools/addPerson.ts` | Add person tool |
| `src/agent-sdk/tools/queryPortfolio.ts` | Query portfolio tool |
| `src/agent-sdk/tools/sendEmail.ts` | Send email tool |
| `src/agent-sdk/useAgentRuntime.ts` | React hook |
| `src/agent-sdk/modelProvider.ts` | Custom model provider (optional) |

## Files to Modify

| File | Change |
|------|--------|
| `src/components/MomentumChatWithAgent.jsx` | Use new hook, simplify |
| `package.json` | Add `@openai/agents`, `zod` dependencies |
| `.env.example` | Add `OPENAI_API_KEY` if using direct connection |

## Files to Keep (Unchanged)

| File | Reason |
|------|--------|
| `src/agent/types.ts` | Data types still valid |
| `src/agent/UndoManager.ts` | Core business logic |
| `src/agent/context/helpers.ts` | Utility functions |
| `src/lib/llmClient.js` | May still be used for backend proxy |

## Files to Deprecate (After Migration)

| File | Replacement |
|------|-------------|
| `src/agent/AgentRuntime.ts` | SDK Runner |
| `src/agent/Planner.ts` | SDK Agent instructions |
| `src/agent/ToolRegistry.ts` | SDK tool() |
| `src/agent/ToolSelector.ts` | SDK guardrails |
| `src/agent/tools/*.ts` | New SDK-format tools |

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| SDK doesn't support backend proxy | High | Implement custom model provider |
| Delta tracking incompatible | Medium | Side-channel context pattern |
| Breaking existing tests | Medium | Update tests incrementally |
| Performance regression | Low | Benchmark before/after |
| Missing constraint features | Low | Use SDK guardrails |

---

## Success Criteria

1. All 10 tools work correctly with SDK format
2. Delta/Undo functionality preserved
3. Same user experience in MomentumChat
4. Reduced codebase complexity (~500-700 lines removed)
5. Tests pass with new implementation
6. No breaking changes to parent components

---

## Recommended Implementation Order

1. **Phase 1**: Setup (0.5 day)
2. **Phase 2**: Convert tools (2-3 days)
3. **Phase 3**: Create agent (0.5 day)
4. **Phase 4**: Delta tracking (1 day)
5. **Phase 5**: React hook (1 day)
6. **Phase 6**: Component update (1 day)
7. **Phase 7**: Backend integration (1 day)
8. **Testing & Debugging**: (2 days)

**Total Estimated Effort**: ~9-10 days

---

## Questions for Consideration

1. **Direct API vs Backend Proxy**: Which approach for production?
2. **Deprecation Strategy**: Remove old code immediately or keep parallel?
3. **Test Coverage**: What level of test updates are acceptable?
4. **Multi-Agent Future**: Should we plan for handoffs now?
