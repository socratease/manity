# Plan: Fix Subtask Reference Issue When Created via Agent Chat

## Problem Summary

When creating a task and related subtasks via agent chat in a single batch, the subtasks fail with a 404 "Task not found" error. This happens because:

1. The LLM cannot know the task ID before the task is created
2. The system prompt says `taskId or taskTitle` can be used, but the code only handles `taskId`
3. There's no mechanism to track "pending tasks" created in the same batch

## Root Cause Analysis

### Issue 1: Missing Task Title Resolution in Action Handler (CRITICAL)
**Location**: `src/components/MomentumChat.jsx` (lines 343-366)

The `add_subtask` action handler only uses `action.taskId` and completely ignores `action.taskTitle`. When the LLM creates a task and subtask in the same response, it uses `taskTitle` to reference the newly-created task, but this lookup is never performed.

```javascript
// Current code (broken)
} else if (action.type === 'add_subtask') {
  const project = projects.find(p => p.id === projectId);
  if (project) {
    const newSubtask = { /* ... */ };
    await addSubtask(projectId, action.taskId, newSubtask);  // <-- Only taskId used
```

### Issue 2: No Pending Task Tracking in Validation (CRITICAL)
**Location**: `src/lib/momentumValidation.js` (lines 41-203)

The validation function has a `pendingProjects` map to track projects being created in the same batch, allowing later actions to reference newly-created projects. **But there's no equivalent for tasks.**

```javascript
const pendingProjects = new Map(); // projectName -> temporary project object
// No equivalent pendingTasks map exists!
```

### Issue 3: System Prompt vs Implementation Mismatch (HIGH)
**Location**: `src/lib/momentumPrompts.js` (line 19)

The prompt explicitly allows `taskTitle`:
```
- add_subtask: create a subtask. Fields: projectId, taskId or taskTitle, subtaskTitle or title, ...
```

But the frontend doesn't implement taskTitle lookup, causing the LLM's actions to fail.

---

## Fix Implementation Steps

### Step 1: Add Pending Task Tracking in Validation
**File**: `src/lib/momentumValidation.js`

Add a `pendingTasks` map similar to `pendingProjects`:
- When processing `add_task` actions, store the task title → temporary task object mapping
- Key should be composite: `${projectId.toLowerCase()}:${taskTitle.toLowerCase()}`
- This allows `add_subtask` validation to recognize tasks being created in the same batch

### Step 2: Add Task Validation for Subtask Actions
**File**: `src/lib/momentumValidation.js`

Add special validation for `add_subtask` actions (currently falls through to default case):
- Check if `action.taskId` refers to an existing task in the project
- If not, check if `action.taskTitle` matches a task in the project OR a pending task
- Resolve the task reference and attach the correct `taskId` to the validated action
- Report error if neither lookup succeeds

### Step 3: Implement Task Title Lookup in Action Handler
**File**: `src/components/MomentumChat.jsx`

Modify the `add_subtask` handler to support taskTitle lookup:
```javascript
} else if (action.type === 'add_subtask') {
  const project = projects.find(p => p.id === projectId);
  if (project) {
    // Resolve taskId from taskTitle if needed
    let taskId = action.taskId;
    if (!taskId && action.taskTitle) {
      const task = project.plan?.find(t =>
        t.title?.toLowerCase() === action.taskTitle.toLowerCase()
      );
      taskId = task?.id;
    }

    if (!taskId) {
      console.error('Cannot find task for subtask:', action);
      continue; // Or handle error appropriately
    }

    const newSubtask = { /* ... */ };
    await addSubtask(projectId, taskId, newSubtask);
  }
}
```

### Step 4: Handle Same-Batch Task Creation
**File**: `src/components/MomentumChat.jsx`

Since actions are processed sequentially with `await`, a task created earlier in the batch should be available when the subtask is processed. However, we need to ensure the project state is refreshed after each task creation:

- After `addTask()` returns, the returned project has the new task with its ID
- Use this updated project for subsequent lookups within the same batch
- Consider maintaining a local "just created tasks" map during batch processing

### Step 5: Improve Error Messages (Optional)
**File**: `backend/main.py` (line 1022)

Enhance the 404 error to include context:
```python
detail=f"Task '{task_id}' not found in project '{project_id}'"
```

### Step 6: Add Test Coverage
**File**: `backend/test_backend_integration.py` or new frontend test

Add a test for the scenario where both task and subtask are created in the same agent chat batch, verifying that:
- Task is created successfully
- Subtask references task by title
- Both entities exist in final state

---

## Data Flow After Fix

```
┌─────────────────────────────────────────────┐
│ LLM Response (Agent Chat)                   │
│ {                                           │
│   "actions": [                              │
│     { "type": "add_task",                   │
│       "projectId": "p1",                    │
│       "title": "Parent Task" },             │
│     { "type": "add_subtask",                │
│       "projectId": "p1",                    │
│       "taskTitle": "Parent Task",  ← Uses title │
│       "title": "Subtask" }                  │
│   ]                                         │
│ }                                           │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ validateThrustActions() - momentumValidation│
│ - Tracks pending tasks by title: ✓ (NEW!)  │
│ - Resolves taskTitle → taskId: ✓ (NEW!)    │
│ - Both actions pass with resolved refs      │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ applyThrustActions() - MomentumChat.jsx     │
│ 1. add_task: Creates with ID "t-123"       │
│    → POST /projects/p1/tasks                │
│    → Backend stores, returns project        │
│    → Local state updated with new task      │
│                                             │
│ 2. add_subtask: Looks up task by title      │
│    → Finds "Parent Task" with ID "t-123"    │
│    → POST /projects/p1/tasks/t-123/subtasks │
│    → Success!                               │
└─────────────────────────────────────────────┘
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/momentumValidation.js` | Add pendingTasks map, add task validation for subtask actions |
| `src/components/MomentumChat.jsx` | Add taskTitle lookup in add_subtask handler, track created tasks during batch |
| `backend/main.py` | Improve error messages (optional) |
| Test file (TBD) | Add test for batch task+subtask creation |

---

## Additional Issue: "Cannot read properties of undefined (reading '0')" Error

### Symptoms
When using the MomentumChat component, the app displays: "I encountered an error: cannot read properties of undefined (reading '0')."

### Potential Causes (Needs Further Debugging)

1. **Accessing undefined array index** - Somewhere in the code, `someArray[0]` is called where `someArray` is undefined (not empty, but undefined).

2. **Possible locations to investigate**:
   - `src/lib/momentumVerification.js:123` - `actionResults[idx]` where `actionResults` might be undefined
   - However, MomentumChat doesn't use `verifyThrustActions`, so this is likely in ManityApp's embedded handling
   - Initial render when `projects` or `people` from `usePortfolioData()` haven't loaded yet

3. **The error may be related to duplicate implementations** - There are TWO separate chat/thrust implementations:
   - **ManityApp.jsx** has embedded thrust handling (lines 2923-3018: `handleSendThrustMessage`, `applyThrustActions`, etc.)
   - **MomentumChat.jsx** is a self-contained component with its OWN `handleSend` and `applyThrustActions`

   When MomentumChat is rendered, both implementations might conflict or have mismatched expectations.

### Recommended Debug Steps
1. Add error boundary or try/catch around MomentumChat render
2. Check browser console for full stack trace to identify exact line
3. Verify that `usePortfolioData()` is returning arrays (not undefined) before first render

---

## Code Cleanup: Remove Duplicate Thrust Implementation

### Problem
ManityApp.jsx contains ~500+ lines of thrust/chat handling code that duplicates what MomentumChat.jsx provides. This creates:
- Confusion about which code path is active
- Maintenance burden
- Potential for bugs when one is updated but not the other

### Files with Duplicate Code

**ManityApp.jsx contains unused thrust logic:**
- Lines 93-112: Thrust state variables (`thrustMessages`, `thrustDraft`, `thrustError`, etc.)
- Lines 2027-2090: `buildThrustContext()`
- Lines 2087-2157: `validateThrustActions()`, `requestMomentumActions()`
- Lines 2158-2681: `applyThrustActions()` (massive function)
- Lines 2923-3018: `handleSendThrustMessage()`
- Lines 3020-3100: `getThrustConversation()`, `undoThrustAction()`

**MomentumChat.jsx has its own complete implementation:**
- Uses `usePortfolioData()` for data operations
- Has its own `handleSend`, `applyThrustActions`, `validateThrustActions`
- Self-contained, doesn't rely on ManityApp state

### Cleanup Steps

#### Step 7: Determine Which Implementation to Keep
Decision: Keep MomentumChat.jsx (it's cleaner, self-contained)

#### Step 8: Remove Unused ManityApp Thrust Code
**File**: `src/ManityApp.jsx`

Remove or comment out:
1. State variables (lines 93-112):
   - `showThrustTagSuggestions`, `thrustTagSearchTerm`, `thrustCursorPosition`, `selectedThrustTagIndex`
   - `thrustMessages`, `thrustDraft`, `thrustError`, `thrustPendingActions`
   - `thrustIsRequesting`, `thrustRequestStart`, `thrustElapsedMs`

2. Functions (can be fully removed):
   - `buildThrustContext()`
   - `validateThrustActions()` (ManityApp version - keep the import)
   - `applyThrustActions()` (ManityApp version)
   - `handleSendThrustMessage()`
   - `handleThrustDraftChange()`
   - `insertThrustTag()`

3. Keep only:
   - `getThrustConversation()` if still needed for message persistence
   - `undoThrustAction()` if MomentumChat doesn't handle it internally

4. Verify MomentumChat props are correctly wired after cleanup

---

## Updated Files to Modify

| File | Changes |
|------|---------|
| `src/lib/momentumValidation.js` | Add pendingTasks map, add task validation for subtask actions |
| `src/components/MomentumChat.jsx` | Add taskTitle lookup in add_subtask handler, track created tasks during batch |
| `src/ManityApp.jsx` | Remove duplicate thrust handling code (~500 lines) |
| `backend/main.py` | Improve error messages (optional) |
| Test file (TBD) | Add test for batch task+subtask creation |

---

## Risk Assessment

- **Low Risk**: Changes are localized to validation and action handling
- **Backward Compatible**: Existing `taskId` usage continues to work
- **No Database Changes**: Schema remains unchanged
- **Frontend Only**: Primary fix is in frontend JavaScript (validation and action handler)
- **Code Cleanup Risk**: Medium - removing ~500 lines of ManityApp code requires testing to ensure MomentumChat handles all cases
