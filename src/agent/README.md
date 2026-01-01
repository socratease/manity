# Agent Layer

The agent layer provides an architecturally distinct runtime for planning, tool selection, and multi-step execution. It separates the agentic logic from the UI layer while preserving all existing behavior and undo capabilities.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         UI Layer                             │
│  (MomentumChat, ManityApp)                                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      AgentRuntime                            │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  Planner │  │ ToolSelector │  │   Execution Loop      │  │
│  └──────────┘  └──────────────┘  │  (plan→act→observe)   │  │
│                                   └───────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     ToolRegistry                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ comment │ │add_task │ │send_mail│ │  ...    │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## Core Concepts

### Tools

Tools are the atomic units of action. Each tool:
- Has a **name** (e.g., `comment`, `add_task`, `update_project`)
- Has a **schema** for input validation
- Has **metadata** (mutatesState, sideEffecting, requiresConfirmation, tags)
- Returns a **ToolResult** with label, detail, deltas, and observations

### Deltas

Deltas are reversible state changes that enable undo:

| Delta Type | Description |
|------------|-------------|
| `remove_project` | Undo project creation |
| `remove_activity` | Undo comment/activity creation |
| `remove_task` | Undo task creation |
| `restore_task` | Restore task to previous state |
| `remove_subtask` | Undo subtask creation |
| `restore_subtask` | Restore subtask to previous state |
| `restore_project` | Restore project fields to previous state |

### Execution Events

Each tool execution produces an `ExecutionEvent`:

```typescript
interface ExecutionEvent {
  stepIndex: number;
  toolName: ToolName;
  toolInput: ToolInput;
  timestamp: string;
  label: string;
  detail: string;
  deltas: Delta[];
  status: 'success' | 'failure' | 'skipped' | 'blocked';
  error?: string;
  observations?: Record<string, unknown>;
  updatedEntityIds: (string | number)[];
}
```

## Available Tools

| Tool | Description | Metadata |
|------|-------------|----------|
| `comment` | Add activity/comment to project | mutates, no side effects |
| `create_project` | Create a new project | mutates, no side effects |
| `add_task` | Add task to project plan | mutates, no side effects |
| `update_task` | Update existing task | mutates, no side effects |
| `add_subtask` | Add subtask to task | mutates, no side effects |
| `update_subtask` | Update existing subtask | mutates, no side effects |
| `update_project` | Update project properties | mutates, no side effects |
| `add_person` | Add person to database | mutates, no side effects |
| `query_portfolio` | Get portfolio context | read-only |
| `send_email` | Send email | side-effecting, requires confirmation |

## Usage

### Basic Execution

```typescript
import { createToolRegistry, AgentRuntime } from './agent';

// Create runtime
const registry = createToolRegistry();
const runtime = new AgentRuntime(registry);

// Build context
const context = {
  userMessage: 'Update project progress',
  projects: [...],
  people: [...],
  loggedInUser: 'User Name',
};

// Execute actions
const result = await runtime.executeActions(
  [{ type: 'update_project', projectId: 'proj-1', progress: 75 }],
  context,
  services,
  { constraints: { maxSteps: 5, allowSideEffects: false, requireConfirmation: false } }
);

// Access results
console.log(result.actionResults);
console.log(result.deltas);
console.log(result.updatedEntityIds);
```

### Using the React Hook

```typescript
import { useAgentRuntime } from './agent/useAgentRuntime';

function MyComponent() {
  const { projects, people, createPerson, sendEmail } = usePortfolioData();

  const {
    executeActions,
    undoAction,
    buildSystemPrompt,
    getResponseSchema,
  } = useAgentRuntime({
    projects,
    people,
    loggedInUser: 'User',
    createPerson,
    sendEmail,
  });

  const handleAction = async () => {
    const result = await executeActions([
      { type: 'comment', projectId: 'proj-1', note: 'Hello!' }
    ]);
    // Handle result...
  };
}
```

### Undo

```typescript
import { UndoManager, rollbackDeltas } from './agent';

// Create undo manager
const undoManager = new UndoManager();

// Undo by action index
const { projects, actionResults } = undoManager.undoActionByIndex(
  currentProjects,
  actionResults,
  actionIndex
);

// Or rollback deltas directly
const restoredProjects = rollbackDeltas(currentProjects, deltas);
```

## Adding New Tools

1. Create a new file in `agent/tools/`:

```typescript
// agent/tools/myTool.ts
import type { ToolDefinition, ToolContext, ToolResult, ToolInput } from '../types';

export const myTool: ToolDefinition = {
  name: 'my_tool',
  description: 'Description of what the tool does',

  inputSchema: {
    type: 'object',
    properties: {
      param1: { type: 'string', description: 'First parameter' },
      param2: { type: 'number', description: 'Second parameter' },
    },
    required: ['param1'],
  },

  metadata: {
    mutatesState: true,
    readsState: false,
    sideEffecting: false,
    requiresConfirmation: false,
    tags: ['custom'],
  },

  async execute(ctx: ToolContext, input: MyToolInput): Promise<ToolResult> {
    // Implementation...

    return {
      label: 'Tool executed',
      detail: 'Detailed description',
      deltas: [], // Add deltas for undo
      updatedEntityIds: [],
      observations: {},
      status: 'success',
    };
  },
};
```

2. Export from `agent/tools/index.ts`:

```typescript
import { myTool } from './myTool';
export { myTool };
export const allTools = [...existingTools, myTool];
```

3. Add input type to `agent/types.ts`:

```typescript
export interface MyToolInput {
  type: 'my_tool';
  param1: string;
  param2?: number;
}

export type ToolInput = ... | MyToolInput;
```

## Delta Format

Each delta must contain enough information to reverse the operation:

```typescript
// For additions: track what to remove
{ type: 'remove_task', projectId: 'proj-1', taskId: 'task-1' }

// For updates: track previous values
{
  type: 'restore_task',
  projectId: 'proj-1',
  taskId: 'task-1',
  previous: { status: 'todo', title: 'Original Title' }
}
```

## Constraints

The `AgentConstraints` control execution behavior:

```typescript
interface AgentConstraints {
  maxSteps: number;         // Maximum execution steps (default: 5)
  allowSideEffects: boolean; // Allow tools like send_email
  requireConfirmation: boolean; // Block confirmation-required tools
  excludeTools?: ToolName[]; // Exclude specific tools
}
```

## Events and Streaming

The runtime supports streaming updates via callbacks:

```typescript
const result = await runtime.executeActions(actions, context, services, {
  constraints: { ... },
  onEvent: (event) => {
    // Called after each tool execution
    console.log(`Step ${event.stepIndex}: ${event.label}`);
  },
  onPlanUpdate: (plan) => {
    // Called when plan status changes
    console.log(`Plan status: ${plan.status}`);
  },
});
```

## Testing

Run tests with:

```bash
npm test -- --filter agent
```

Key test files:
- `__tests__/tools.test.ts` - Unit tests for each tool
- `__tests__/undo.test.ts` - Undo/delta tests
- `__tests__/integration.test.ts` - Multi-step scenarios

## Migration from Legacy

The agent layer is backwards compatible with existing code:

1. **MomentumChat**: Use `MomentumChatWithAgent` for the new implementation
2. **ManityApp**: The `rollbackDeltas` function is compatible with existing deltas
3. **Action Format**: The `type` field maps directly to tool names

To migrate gradually:
1. Import from `agent` instead of inline implementations
2. Replace `applyThrustActions` with `runtime.executeActions`
3. Replace `rollbackDeltas` with the agent's `UndoManager`
