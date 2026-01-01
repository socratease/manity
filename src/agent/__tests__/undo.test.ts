/**
 * Undo Tests
 *
 * Tests for the UndoManager and delta rollback functionality.
 * Verifies that applying a tool then undoing returns state to exact prior snapshot.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Project, Delta, ExecutionEvent } from '../types';
import { UndoManager, rollbackDeltas, applyDelta } from '../UndoManager';
import { cloneProjectDeep } from '../context/helpers';

const sampleProject: Project = {
  id: 'proj-1',
  name: 'Test Project',
  stakeholders: [{ name: 'Owner', team: 'Engineering' }],
  status: 'active',
  priority: 'high',
  progress: 50,
  description: 'A test project',
  plan: [
    {
      id: 'task-1',
      title: 'Test Task',
      status: 'todo',
      subtasks: [
        { id: 'subtask-1', title: 'Test Subtask', status: 'todo' },
      ],
    },
  ],
  recentActivity: [
    { id: 'activity-1', date: '2024-01-01', note: 'First activity', author: 'User' },
  ],
};

describe('UndoManager', () => {
  let undoManager: UndoManager;

  beforeEach(() => {
    undoManager = new UndoManager();
  });

  describe('applyDelta', () => {
    it('should remove a project with remove_project delta', () => {
      const projects = [cloneProjectDeep(sampleProject)];
      const delta: Delta = { type: 'remove_project', projectId: 'proj-1' };

      const result = applyDelta(projects, delta);
      expect(result).toHaveLength(0);
    });

    it('should remove an activity with remove_activity delta', () => {
      const projects = [cloneProjectDeep(sampleProject)];
      const delta: Delta = {
        type: 'remove_activity',
        projectId: 'proj-1',
        activityId: 'activity-1',
      };

      const result = applyDelta(projects, delta);
      expect(result[0].recentActivity).toHaveLength(0);
    });

    it('should remove a task with remove_task delta', () => {
      const projects = [cloneProjectDeep(sampleProject)];
      const delta: Delta = {
        type: 'remove_task',
        projectId: 'proj-1',
        taskId: 'task-1',
      };

      const result = applyDelta(projects, delta);
      expect(result[0].plan).toHaveLength(0);
    });

    it('should restore a task with restore_task delta', () => {
      const projects = [cloneProjectDeep(sampleProject)];
      projects[0].plan[0].status = 'completed';
      projects[0].plan[0].title = 'Updated Title';

      const delta: Delta = {
        type: 'restore_task',
        projectId: 'proj-1',
        taskId: 'task-1',
        previous: { status: 'todo', title: 'Test Task' },
      };

      const result = applyDelta(projects, delta);
      expect(result[0].plan[0].status).toBe('todo');
      expect(result[0].plan[0].title).toBe('Test Task');
    });

    it('should remove a subtask with remove_subtask delta', () => {
      const projects = [cloneProjectDeep(sampleProject)];
      const delta: Delta = {
        type: 'remove_subtask',
        projectId: 'proj-1',
        taskId: 'task-1',
        subtaskId: 'subtask-1',
      };

      const result = applyDelta(projects, delta);
      expect(result[0].plan[0].subtasks).toHaveLength(0);
    });

    it('should restore a subtask with restore_subtask delta', () => {
      const projects = [cloneProjectDeep(sampleProject)];
      projects[0].plan[0].subtasks[0].status = 'completed';

      const delta: Delta = {
        type: 'restore_subtask',
        projectId: 'proj-1',
        taskId: 'task-1',
        subtaskId: 'subtask-1',
        previous: { status: 'todo' },
      };

      const result = applyDelta(projects, delta);
      expect(result[0].plan[0].subtasks[0].status).toBe('todo');
    });

    it('should restore project fields with restore_project delta', () => {
      const projects = [cloneProjectDeep(sampleProject)];
      projects[0].progress = 100;
      projects[0].status = 'completed';

      const delta: Delta = {
        type: 'restore_project',
        projectId: 'proj-1',
        previous: { progress: 50, status: 'active' },
      };

      const result = applyDelta(projects, delta);
      expect(result[0].progress).toBe(50);
      expect(result[0].status).toBe('active');
    });
  });

  describe('rollbackDeltas', () => {
    it('should apply multiple deltas in reverse order', () => {
      const projects = [cloneProjectDeep(sampleProject)];

      // Simulate: added activity, then updated task
      projects[0].recentActivity.unshift({
        id: 'activity-2',
        date: '2024-01-02',
        note: 'New activity',
        author: 'User',
      });
      projects[0].plan[0].status = 'completed';

      const deltas: Delta[] = [
        { type: 'remove_activity', projectId: 'proj-1', activityId: 'activity-2' },
        { type: 'restore_task', projectId: 'proj-1', taskId: 'task-1', previous: { status: 'todo' } },
      ];

      const result = rollbackDeltas(projects, deltas);

      // Should undo in reverse: first restore task, then remove activity
      expect(result[0].plan[0].status).toBe('todo');
      expect(result[0].recentActivity.find(a => a.id === 'activity-2')).toBeUndefined();
    });

    it('should handle empty deltas array', () => {
      const projects = [cloneProjectDeep(sampleProject)];
      const result = rollbackDeltas(projects, []);
      expect(result).toEqual(projects);
    });
  });

  describe('UndoManager.undoActionByIndex', () => {
    it('should undo a specific action and mark it as undone', () => {
      const projects = [cloneProjectDeep(sampleProject)];
      projects[0].progress = 75;

      const actionResults = [
        {
          type: 'update_project' as const,
          label: 'Updated project',
          deltas: [
            {
              type: 'restore_project' as const,
              projectId: 'proj-1',
              previous: { progress: 50 },
            },
          ],
        },
      ];

      const { projects: updatedProjects, updatedActionResults: updatedResults } =
        undoManager.undoActionByIndex(projects, actionResults, 0);

      expect(updatedProjects[0].progress).toBe(50);
      expect(updatedResults[0].undone).toBe(true);
    });

    it('should not undo already undone actions', () => {
      const projects = [cloneProjectDeep(sampleProject)];

      const actionResults = [
        {
          type: 'update_project' as const,
          label: 'Updated project',
          deltas: [
            {
              type: 'restore_project' as const,
              projectId: 'proj-1',
              previous: { progress: 50 },
            },
          ],
          undone: true,
        },
      ];

      const { projects: updatedProjects } = undoManager.undoActionByIndex(
        projects,
        actionResults,
        0
      );

      // Projects should be unchanged
      expect(updatedProjects).toEqual(projects);
    });
  });

  describe('Undo parity', () => {
    it('should return to exact prior state after undo (comment)', () => {
      const original = cloneProjectDeep(sampleProject);
      const projects = [cloneProjectDeep(sampleProject)];

      // Simulate adding a comment
      const newActivity = {
        id: 'activity-new',
        date: new Date().toISOString(),
        note: 'New comment',
        author: 'Test',
      };
      projects[0].recentActivity.unshift(newActivity);

      const deltas: Delta[] = [
        { type: 'remove_activity', projectId: 'proj-1', activityId: 'activity-new' },
      ];

      const result = rollbackDeltas(projects, deltas);

      // Should be back to original (minus the new activity)
      expect(result[0].recentActivity).toEqual(original.recentActivity);
    });

    it('should return to exact prior state after undo (task update)', () => {
      const original = cloneProjectDeep(sampleProject);
      const projects = [cloneProjectDeep(sampleProject)];

      // Simulate updating a task
      const previousTask = { ...projects[0].plan[0] };
      projects[0].plan[0].status = 'completed';
      projects[0].plan[0].title = 'Updated Title';

      const deltas: Delta[] = [
        {
          type: 'restore_task',
          projectId: 'proj-1',
          taskId: 'task-1',
          previous: { status: previousTask.status, title: previousTask.title },
        },
      ];

      const result = rollbackDeltas(projects, deltas);

      expect(result[0].plan[0].status).toBe(original.plan[0].status);
      expect(result[0].plan[0].title).toBe(original.plan[0].title);
    });

    it('should return to exact prior state after undo (project update)', () => {
      const original = cloneProjectDeep(sampleProject);
      const projects = [cloneProjectDeep(sampleProject)];

      // Simulate updating project
      projects[0].progress = 100;
      projects[0].status = 'completed';
      projects[0].priority = 'low';

      const deltas: Delta[] = [
        {
          type: 'restore_project',
          projectId: 'proj-1',
          previous: {
            progress: original.progress,
            status: original.status,
            priority: original.priority,
          },
        },
      ];

      const result = rollbackDeltas(projects, deltas);

      expect(result[0].progress).toBe(original.progress);
      expect(result[0].status).toBe(original.status);
      expect(result[0].priority).toBe(original.priority);
    });
  });
});
