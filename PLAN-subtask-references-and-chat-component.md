# Plan: Fix Subtask References and Chat Component Issues

## Summary

This plan addresses two related issues based on analysis of the **dev branch**:
1. Subtasks fail when created via agent chat because they reference tasks that aren't visible in the data yet
2. MomentumChatWithAgent shows "cannot read properties of undefined (reading 0)" error
3. Remove deprecated MomentumChat component if redundant

---

## Current State (Dev Branch)

The dev branch already has significant infrastructure:

- **MomentumChatWithAgent** exists at `src/components/MomentumChatWithAgent.jsx`
- **Agent SDK** exists at `src/agent-sdk/` with tool implementations
- **MomentumChat** still exists at `src/components/MomentumChat.jsx` (old component)
- `ManityApp.jsx` already uses `MomentumChatWithAgent` (line 5842)

---

## Issue 1: Subtask References Failing

### Root Cause Analysis

The agent SDK has proper architecture for sequential tool execution, BUT there's a potential issue in how task references are resolved when both task and subtask are created in the same agent run.

**Relevant Code Paths:**

1. **addTask tool** (`src/agent-sdk/tools/addTask.ts:57-76`):
   - Generates new task ID: `const taskId = ctx.generateTaskId()`
   - Adds to working project: `workingProject.plan.push(newTask)`
   - LLM does NOT know this generated ID

2. **addSubtask tool** (`src/agent-sdk/tools/addSubtask.ts:46-48`):
   - Resolves task: `ctx.resolveTask(workingProject, input.taskId || input.taskTitle)`
   - Uses `taskId OR taskTitle` - should work with title

3. **resolveTask function** (`src/agent-sdk/context.ts:146-155`):
   - Looks up by ID or title in `project.plan`
   - Should find newly added tasks by title

**Potential Issues:**

| Issue | Location | Description |
|-------|----------|-------------|
| **LLM doesn't wait** | Agent behavior | LLM might call add_subtask before add_task response is processed |
| **Title mismatch** | Agent output | LLM might use different title format than what was passed to add_task |
| **Empty plan array** | New projects | When creating project + task + subtask, project.plan might start empty |

### Debugging Steps

1. [ ] Add logging to `addSubtask.ts` to see what `taskId`/`taskTitle` is being passed
2. [ ] Add logging to `resolveTask` to see what's in `project.plan` at lookup time
3. [ ] Verify the agent is executing tools sequentially (check `executeToolsSequentially` in useAgentRuntime.ts)

### Potential Fixes

#### Fix 1A: Ensure Sequential Execution Is Working
- Verify `executeToolsSequentially` processes tools one at a time
- Current code (useAgentRuntime.ts:174-256) looks correct - uses `for...of` loop with `await`

#### Fix 1B: Add Pending Task Tracking (Similar to Pending Projects)
**File**: `src/agent-sdk/context.ts`

Create a registry for tasks being created in the current run:
```typescript
// In createToolExecutionContext:
const pendingTasks = new Map<string, Task>(); // taskTitle -> task

// After addTask creates a task:
pendingTasks.set(task.title.toLowerCase(), task);

// In resolveTask, also check pendingTasks:
if (!foundTask) {
  foundTask = pendingTasks.get(target.toLowerCase()) || null;
}
```

#### Fix 1C: Improve Error Messages
**File**: `src/agent-sdk/tools/addSubtask.ts`

Enhance the error message when task not found:
```typescript
if (!task) {
  const availableTasks = workingProject.plan.map(t => t.title).join(', ');
  return `Skipped: Task "${input.taskId || input.taskTitle}" not found in ${workingProject.name}. Available tasks: ${availableTasks || 'none'}`;
}
```

---

## Issue 2: "Cannot Read Properties of Undefined (reading 0)"

### Root Cause Analysis

Found potential unsafe array accesses:

| Location | Code | Risk |
|----------|------|------|
| `context.ts:186` | `project.recentActivity.sort(...)` | Fails if `recentActivity` is undefined |
| `context.ts:188` | `project.recentActivity[0].note` | Guarded by length check, but `.note` might be undefined |
| `MomentumChatWithAgent.jsx:549` | `project.recentActivity[0].note` | Guarded, but `recentActivity[0]` might lack `.note` |

**Most Likely Cause:**
`context.ts:186` calls `.sort()` on `project.recentActivity` without first checking if it exists:
```typescript
project.recentActivity.sort((a, b) => ...)
```

If a project has no `recentActivity` field, this throws:
```
TypeError: Cannot read properties of undefined (reading 'sort')
```

Then the stack might show "reading 0" if something tries to access index after.

### Fixes

#### Fix 2A: Guard recentActivity in context.ts
**File**: `src/agent-sdk/context.ts`

```typescript
const syncProjectActivity = (project: Project, activities?: Activity[]): Project => {
  if (activities) {
    project.recentActivity = activities;
  }
  // Ensure recentActivity exists
  if (!project.recentActivity) {
    project.recentActivity = [];
  }
  project.recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  if (project.recentActivity.length > 0 && project.recentActivity[0]?.note) {
    project.lastUpdate = project.recentActivity[0].note;
  }
  return project;
};
```

#### Fix 2B: Guard in MomentumChatWithAgent.jsx
**File**: `src/components/MomentumChatWithAgent.jsx`

Update line 549:
```jsx
<span style={styles.recentActivityText}>
  {project.recentActivity?.[0]?.note || 'No recent activity'}
</span>
```

#### Fix 2C: Add Default Values in Type Definitions
**File**: `src/agent-sdk/types.ts` or `src/agent/types.ts`

Ensure Project type has recentActivity default:
```typescript
interface Project {
  // ... other fields
  recentActivity: Activity[];  // Always array, never undefined
}
```

---

## Issue 3: Remove Old MomentumChat Component

### Analysis

| Aspect | MomentumChat | MomentumChatWithAgent |
|--------|-------------|----------------------|
| **Location** | `src/components/MomentumChat.jsx` | `src/components/MomentumChatWithAgent.jsx` |
| **Used In** | Not currently imported in ManityApp | ManityApp.jsx:15, 5842 |
| **Features** | OpenAI direct calls | Agent SDK with sequential execution |
| **Size** | ~1300 lines | ~1137 lines |

**Current State:**
- `ManityApp.jsx` imports `MomentumChatWithAgent` (line 15)
- `ManityApp.jsx` renders `<MomentumChatWithAgent>` (line 5842)
- The old `MomentumChat` is NOT imported but file still exists

### Removal Steps

1. [ ] Verify `MomentumChat.jsx` is not imported anywhere else
2. [ ] Delete `src/components/MomentumChat.jsx`
3. [ ] Run tests to confirm nothing breaks
4. [ ] Update any documentation referencing the old component

---

## Implementation Order

### Phase 1: Fix the "undefined reading 0" Error (High Priority)
This is causing immediate user-facing failures.

1. [ ] Add null guard in `context.ts:syncProjectActivity`
2. [ ] Add optional chaining in `MomentumChatWithAgent.jsx:549`
3. [ ] Test by creating projects and using the chat

### Phase 2: Investigate & Fix Subtask References (Medium Priority)
After fixing the crash, investigate the subtask issue.

1. [ ] Add debug logging to `addSubtask.ts` and `resolveTask`
2. [ ] Test: Create project with task and subtask in single chat message
3. [ ] If still failing, implement pending task tracking

### Phase 3: Remove Old Component (Low Priority)
Cleanup after main issues are fixed.

1. [ ] Verify no imports of MomentumChat
2. [ ] Delete the file
3. [ ] Test full application

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/agent-sdk/context.ts` | Add null guards for recentActivity |
| `src/components/MomentumChatWithAgent.jsx` | Add optional chaining for array access |
| `src/agent-sdk/tools/addSubtask.ts` | Better error messages, possibly pending task tracking |
| `src/components/MomentumChat.jsx` | **DELETE** after verification |

---

## Testing Strategy

1. **Error reproduction test:**
   - Navigate to Momentum chat
   - Send a message that triggers project/task creation
   - Verify no "reading 0" errors in console

2. **Subtask creation test:**
   - Chat: "Create a new project called Test with a task Setup and a subtask Install"
   - Verify subtask is properly linked to task

3. **Regression test:**
   - Test all existing chat functionality
   - Verify undo/redo still works
   - Verify project cards display correctly

---

## Questions Resolved

Based on dev branch analysis:

1. **MomentumChatWithAgent**: Already exists and is in use
2. **Agent features**: Already has sequential tool execution, thinking process visualization, human-in-the-loop
3. **Component removal**: Old MomentumChat can be safely removed (not imported anywhere)
