# Agent Layer (Legacy)

> **Note:** This module is deprecated. The new implementation uses the OpenAI Agents SDK in `src/agent-sdk/`.

This directory contains legacy types and the UndoManager that are still used by the new agent-sdk module.

## What's Here

- **types.ts** - Core TypeScript interfaces for projects, tasks, deltas, etc.
- **UndoManager.ts** - Manages reversible state changes via deltas
- **context/helpers.ts** - Utility functions for entity resolution and cloning

## Migration

The agent orchestration has been migrated to the OpenAI Agents SDK. See `src/agent-sdk/` for the new implementation.

### Key Changes

| Old (agent/) | New (agent-sdk/) |
|--------------|------------------|
| AgentRuntime | SDK Runner + useAgentRuntime hook |
| Planner | SDK Agent instructions |
| ToolRegistry | SDK tool() function |
| ToolSelector | SDK built-in |
| tools/*.ts | SDK-format tools with Zod schemas |

### Preserved Features

- **Delta/Undo System** - The reversible state change system is preserved
- **TypeScript Types** - All data interfaces remain unchanged

## Deltas

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

## Usage

For new development, import from `agent-sdk`:

```typescript
import { useAgentRuntime, createProjectManagementAgent } from '../agent-sdk';
```

For types and undo functionality that's still shared:

```typescript
import { UndoManager, rollbackDeltas } from '../agent';
import type { Delta, Project, Task } from '../agent/types';
```

### Undo Example

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
