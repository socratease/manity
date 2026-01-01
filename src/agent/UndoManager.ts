/**
 * Undo Manager
 *
 * Manages undo operations by applying inverse deltas to restore previous state.
 * This preserves exact parity with the existing undo behavior.
 */

import type {
  Delta,
  Project,
  ExecutionEvent,
  ExecutionLog,
  Activity,
} from './types';
import { cloneProjectDeep, syncProjectActivity } from './context/helpers';

/**
 * Apply a single delta to undo a change.
 * Returns the updated projects array.
 */
export function applyDelta(
  projects: Project[],
  delta: Delta,
  syncProjectActivityFn?: (project: Project, activities?: Activity[]) => Project
): Project[] {
  const syncFn = syncProjectActivityFn || syncProjectActivity;

  // Handle remove_project separately since it removes the entire project
  if (delta.type === 'remove_project') {
    const index = projects.findIndex(p => `${p.id}` === `${delta.projectId}`);
    if (index !== -1) {
      return [...projects.slice(0, index), ...projects.slice(index + 1)];
    }
    return projects;
  }

  // Find the project to modify
  const projectIndex = projects.findIndex(p => `${p.id}` === `${delta.projectId}`);
  if (projectIndex === -1) {
    return projects;
  }

  const project = { ...projects[projectIndex] };
  let modified = false;

  switch (delta.type) {
    case 'remove_activity': {
      const updatedProject = syncFn(
        project,
        project.recentActivity.filter(activity => activity.id !== delta.activityId)
      );
      Object.assign(project, updatedProject);
      modified = true;
      break;
    }

    case 'remove_task': {
      project.plan = project.plan.filter(task => task.id !== delta.taskId);
      modified = true;
      break;
    }

    case 'restore_task': {
      project.plan = project.plan.map(task =>
        task.id === delta.taskId ? { ...task, ...delta.previous } : task
      );
      modified = true;
      break;
    }

    case 'remove_subtask': {
      project.plan = project.plan.map(task =>
        task.id === delta.taskId
          ? { ...task, subtasks: task.subtasks.filter(st => st.id !== delta.subtaskId) }
          : task
      );
      modified = true;
      break;
    }

    case 'restore_subtask': {
      project.plan = project.plan.map(task =>
        task.id === delta.taskId
          ? {
              ...task,
              subtasks: task.subtasks.map(subtask =>
                subtask.id === delta.subtaskId
                  ? { ...subtask, ...delta.previous }
                  : subtask
              ),
            }
          : task
      );
      modified = true;
      break;
    }

    case 'restore_project': {
      // Restore all the previous values
      if (delta.previous.name !== undefined) project.name = delta.previous.name;
      if (delta.previous.description !== undefined) project.description = delta.previous.description;
      if (delta.previous.executiveUpdate !== undefined) project.executiveUpdate = delta.previous.executiveUpdate;
      if (delta.previous.status !== undefined) project.status = delta.previous.status as Project['status'];
      if (delta.previous.priority !== undefined) project.priority = delta.previous.priority as Project['priority'];
      if (delta.previous.progress !== undefined) project.progress = delta.previous.progress;
      if (delta.previous.targetDate !== undefined) project.targetDate = delta.previous.targetDate;
      if (delta.previous.startDate !== undefined) project.startDate = delta.previous.startDate;
      if (delta.previous.lastUpdate !== undefined) project.lastUpdate = delta.previous.lastUpdate;
      modified = true;
      break;
    }

    default:
      // Unknown delta type, ignore
      break;
  }

  if (modified) {
    return [
      ...projects.slice(0, projectIndex),
      project,
      ...projects.slice(projectIndex + 1),
    ];
  }

  return projects;
}

/**
 * Apply multiple deltas in reverse order to undo changes.
 * This is the main undo operation.
 */
export function rollbackDeltas(
  projects: Project[],
  deltas: Delta[],
  syncProjectActivityFn?: (project: Project, activities?: Activity[]) => Project
): Project[] {
  if (!deltas || deltas.length === 0) {
    return projects;
  }

  // Clone projects deeply for safe mutation
  let working = projects.map(cloneProjectDeep);

  // Apply deltas in reverse order
  for (const delta of deltas.slice().reverse()) {
    working = applyDelta(working, delta, syncProjectActivityFn);
  }

  return working;
}

/**
 * UndoManager class
 *
 * Provides methods for undoing execution events and managing undo state.
 */
export class UndoManager {
  private syncProjectActivityFn?: (project: Project, activities?: Activity[]) => Project;

  constructor(
    syncProjectActivityFn?: (project: Project, activities?: Activity[]) => Project
  ) {
    this.syncProjectActivityFn = syncProjectActivityFn;
  }

  /**
   * Undo a single execution event.
   * Returns the updated projects array.
   */
  undoEvent(projects: Project[], event: ExecutionEvent): Project[] {
    return rollbackDeltas(projects, event.deltas, this.syncProjectActivityFn);
  }

  /**
   * Undo multiple execution events (from an execution log).
   * Can optionally undo up to a specific step index.
   */
  undoLog(
    projects: Project[],
    log: ExecutionLog,
    uptoStep?: number
  ): Project[] {
    // Get events to undo
    const eventsToUndo = uptoStep !== undefined
      ? log.events.filter(e => e.stepIndex <= uptoStep)
      : log.events;

    // Collect all deltas from events to undo
    const allDeltas = eventsToUndo.flatMap(e => e.deltas);

    return rollbackDeltas(projects, allDeltas, this.syncProjectActivityFn);
  }

  /**
   * Undo a specific action by index from a message's action results.
   * This is for compatibility with the existing UI undo pattern.
   */
  undoActionByIndex(
    projects: Project[],
    actionResults: Array<{ deltas: Delta[]; undone?: boolean }>,
    actionIndex: number
  ): { projects: Project[]; updatedActionResults: typeof actionResults } {
    const action = actionResults[actionIndex];
    if (!action || action.undone || !action.deltas.length) {
      return { projects, updatedActionResults: actionResults };
    }

    const updatedProjects = rollbackDeltas(projects, action.deltas, this.syncProjectActivityFn);

    const updatedActionResults = actionResults.map((ar, idx) =>
      idx === actionIndex ? { ...ar, undone: true } : ar
    );

    return { projects: updatedProjects, updatedActionResults };
  }

  /**
   * Check if an execution event can be undone.
   */
  canUndo(event: ExecutionEvent): boolean {
    return event.deltas.length > 0 && event.status === 'success';
  }

  /**
   * Get all undoable events from an execution log.
   */
  getUndoableEvents(log: ExecutionLog): ExecutionEvent[] {
    return log.events.filter(e => this.canUndo(e));
  }
}

/**
 * Create a new UndoManager instance.
 */
export function createUndoManager(
  syncProjectActivityFn?: (project: Project, activities?: Activity[]) => Project
): UndoManager {
  return new UndoManager(syncProjectActivityFn);
}

// Default instance
let defaultUndoManager: UndoManager | null = null;

/**
 * Get the default UndoManager instance.
 */
export function getDefaultUndoManager(): UndoManager {
  if (!defaultUndoManager) {
    defaultUndoManager = new UndoManager();
  }
  return defaultUndoManager;
}
