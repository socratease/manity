# Timeline Zoom Task Bubble Fix - Diagnosis & Plan

## Problem Statement
In the force-directed timeline, when the user changes the zoom slider:
- ✅ Month labels and tick marks update correctly
- ❌ Task bubbles do NOT update (they stay in old positions)

## Root Cause Analysis

### The Bug: Race Condition Between Effects

The issue is a **one-render delay** between when zoom changes and when the physics simulation is cancelled/restarted, allowing the old simulation to overwrite the new node positions.

**Trace of what happens:**

1. **User changes zoom slider** → `setTimelineZoom()` called

2. **Render B** (triggered by zoom change):
   - `seededNodes` useMemo recalculates with **new targetX values** ✅
   - `nodes` state = still **old values** (setNodes hasn't happened yet)
   - `simulationVersion` = still **old value**

3. **Effects run in Render B:**
   - **Effect 1** (line 135-138) runs because `seededNodes` changed:
     - Calls `setNodes(seededNodes)` → schedules state update
     - Calls `setSimulationVersion++` → schedules state update
   - **Effect 3** (physics, line 145) checks its deps: `[nodes.length, dimensions.width, draggedNode, simulationVersion]`
     - `simulationVersion` hasn't changed YET (it's scheduled, not applied)
     - **Effect 3 DOES NOT run cleanup!**
     - **Old simulation keeps running!**

4. **Old simulation (still running) overwrites nodes:**
   - Calls `setNodes(newNodes)` where `newNodes` has **old targetX** values
   - This competes with the `setNodes(seededNodes)` from Effect 1
   - React batches state updates, but the simulation may win

5. **Render C** (triggered by batched state updates):
   - By now, `nodes` may have been overwritten by the old simulation
   - Even if not, `simulationVersion` finally changes
   - Effect 3 cleanup runs (cancels animation)
   - New simulation starts - but with potentially corrupted node state

### Why Month Labels Work But Tasks Don't

Month labels are computed **synchronously during render**:
```javascript
const monthLabels = getMonthLabels();  // Uses getTimelineRange() directly
```

Task bubbles are rendered from `nodes` **state**, which depends on the async effect/simulation chain that has the race condition.

## Key Code Locations

| Component | Line | Issue |
|-----------|------|-------|
| `seededNodes` useMemo | 101-132 | Correctly computes new targetX ✅ |
| Node init effect | 135-138 | Schedules setNodes and setSimulationVersion |
| nodesRef sync effect | 140-142 | Updates nodesRef after nodes changes |
| Physics simulation effect | 145-351 | **Missing dependency on zoom/seededNodes** |
| Simulation deps array | 351 | `[nodes.length, dimensions.width, draggedNode, simulationVersion]` |

## The Fix

### Option A: Add `timelineZoom` to Simulation Effect Dependencies (Recommended)

Add `timelineZoom` to the physics simulation effect's dependency array so it immediately cancels and restarts when zoom changes:

```javascript
// Line 351 - change from:
}, [nodes.length, dimensions.width, draggedNode, simulationVersion]);

// To:
}, [nodes.length, dimensions.width, draggedNode, simulationVersion, timelineZoom]);
```

**Why this works:** When zoom changes, the simulation cleanup runs immediately in the same render, preventing the old simulation from overwriting the new seededNodes.

### Option B: Use a Version Number from seededNodes

Create a `seededVersion` that updates when seededNodes changes, and add it to the simulation effect deps:

```javascript
const [seededVersion, setSeededVersion] = useState(0);

useEffect(() => {
  setNodes(seededNodes);
  setSeededVersion(v => v + 1);
}, [seededNodes]);

// Physics effect deps:
}, [nodes.length, dimensions.width, draggedNode, seededVersion]);
```

This eliminates the separate `simulationVersion` state.

### Option C: Use a Ref to Block Stale Updates

Add a flag that the simulation checks before updating nodes:

```javascript
const pendingReset = useRef(false);

useEffect(() => {
  pendingReset.current = true;
  setNodes(seededNodes);
  // Simulation checks this before setNodes
}, [seededNodes]);
```

Then in simulate():
```javascript
if (pendingReset.current) {
  pendingReset.current = false;
  return; // Skip this frame, let new nodes settle
}
```

## Recommended Implementation

**Use Option A** - it's the simplest fix with minimal code change:

1. Add `timelineZoom` to the physics effect dependency array (line 351)
2. This ensures the simulation is cancelled immediately when zoom changes
3. The new simulation will start fresh with the correct seededNodes

## Additional Considerations

### Why `simulationVersion` Alone Isn't Sufficient

The `simulationVersion` is incremented inside an effect, meaning the increment is a **scheduled state update**. It takes effect on the next render, creating the one-render delay where the old simulation can still run.

### Testing the Fix

After implementing the fix:
1. Zoom from 3 months to 1 month - tasks should filter and reposition
2. Zoom from 3 months to 12 months - tasks should spread out
3. Rapidly drag the zoom slider - tasks should smoothly update without glitching
4. Check that physics animation still works (spring effect when tasks settle)

## Files to Modify

- `src/components/ForceDirectedTimeline.jsx` - Line 351 (simulation effect deps)
