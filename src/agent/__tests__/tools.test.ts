/**
 * Tool Unit Tests
 *
 * Tests for individual tool execution and delta correctness.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ToolContext, Project, Person } from '../types';
import { commentTool } from '../tools/comment';
import { createProjectTool } from '../tools/createProject';
import { addTaskTool } from '../tools/addTask';
import { updateTaskTool } from '../tools/updateTask';
import { updateProjectTool } from '../tools/updateProject';
import { createHelpers, buildProjectLookup, cloneProjectDeep } from '../context/helpers';

// Mock services
const mockServices = {
  createPerson: vi.fn().mockResolvedValue({ name: 'Test User', team: 'Test', id: 1 }),
  sendEmail: vi.fn().mockResolvedValue(undefined),
  buildThrustContext: vi.fn().mockReturnValue([]),
};

// Sample data
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
      subtasks: [],
    },
  ],
  recentActivity: [],
};

const samplePeople: Person[] = [
  { name: 'Alice', team: 'Engineering', email: 'alice@test.com' },
  { name: 'Bob', team: 'Design', email: 'bob@test.com' },
];

function createTestContext(projects: Project[] = [sampleProject]): ToolContext {
  const workingProjects = projects.map(cloneProjectDeep);
  const projectLookup = buildProjectLookup(workingProjects);

  return {
    projects: projects.map(cloneProjectDeep),
    workingProjects,
    projectLookup,
    people: [...samplePeople],
    loggedInUser: 'Test User',
    helpers: createHelpers(workingProjects, projectLookup, samplePeople),
    services: mockServices,
  };
}

describe('Comment Tool', () => {
  it('should add a comment to a project', async () => {
    const ctx = createTestContext();
    const result = await commentTool.execute(ctx, {
      type: 'comment',
      projectId: 'proj-1',
      note: 'Test comment',
    });

    expect(result.status).toBe('success');
    expect(result.label).toContain('Commented on');
    expect(result.deltas).toHaveLength(1);
    expect(result.deltas[0].type).toBe('remove_activity');
    expect(result.updatedEntityIds).toContain('proj-1');
  });

  it('should skip if project not found', async () => {
    const ctx = createTestContext();
    const result = await commentTool.execute(ctx, {
      type: 'comment',
      projectId: 'nonexistent',
      note: 'Test comment',
    });

    expect(result.status).toBe('skipped');
    expect(result.deltas).toHaveLength(0);
  });

  it('should use default note if none provided', async () => {
    const ctx = createTestContext();
    const result = await commentTool.execute(ctx, {
      type: 'comment',
      projectId: 'proj-1',
    });

    expect(result.status).toBe('success');
    expect(result.detail).toContain('placeholder used');
  });
});

describe('Create Project Tool', () => {
  it('should create a new project', async () => {
    const ctx = createTestContext([]);
    const result = await createProjectTool.execute(ctx, {
      type: 'create_project',
      name: 'New Project',
      priority: 'high',
      status: 'planning',
    });

    expect(result.status).toBe('success');
    expect(result.label).toContain('Created new project');
    expect(result.deltas).toHaveLength(1);
    expect(result.deltas[0].type).toBe('remove_project');
    expect(ctx.workingProjects).toHaveLength(1);
    expect(ctx.workingProjects[0].name).toBe('New Project');
  });

  it('should skip if name is missing', async () => {
    const ctx = createTestContext([]);
    const result = await createProjectTool.execute(ctx, {
      type: 'create_project',
    });

    expect(result.status).toBe('skipped');
    expect(result.deltas).toHaveLength(0);
  });
});

describe('Add Task Tool', () => {
  it('should add a task to a project', async () => {
    const ctx = createTestContext();
    const result = await addTaskTool.execute(ctx, {
      type: 'add_task',
      projectId: 'proj-1',
      title: 'New Task',
      status: 'todo',
    });

    expect(result.status).toBe('success');
    expect(result.label).toContain('Added task');
    expect(result.deltas).toHaveLength(1);
    expect(result.deltas[0].type).toBe('remove_task');

    const project = ctx.workingProjects.find(p => p.id === 'proj-1');
    expect(project?.plan).toHaveLength(2);
  });

  it('should resolve assignee by name', async () => {
    const ctx = createTestContext();
    const result = await addTaskTool.execute(ctx, {
      type: 'add_task',
      projectId: 'proj-1',
      title: 'Assigned Task',
      assignee: 'Alice',
    });

    expect(result.status).toBe('success');
    expect(result.detail).toContain('assigned to Alice');
  });
});

describe('Update Task Tool', () => {
  it('should update a task', async () => {
    const ctx = createTestContext();
    const result = await updateTaskTool.execute(ctx, {
      type: 'update_task',
      projectId: 'proj-1',
      taskId: 'task-1',
      status: 'in-progress',
    });

    expect(result.status).toBe('success');
    expect(result.deltas).toHaveLength(1);
    expect(result.deltas[0].type).toBe('restore_task');

    const project = ctx.workingProjects.find(p => p.id === 'proj-1');
    const task = project?.plan.find(t => t.id === 'task-1');
    expect(task?.status).toBe('in-progress');
  });

  it('should store previous state in delta', async () => {
    const ctx = createTestContext();
    const result = await updateTaskTool.execute(ctx, {
      type: 'update_task',
      projectId: 'proj-1',
      taskId: 'task-1',
      status: 'completed',
    });

    const delta = result.deltas[0];
    expect(delta.type).toBe('restore_task');
    if (delta.type === 'restore_task') {
      expect(delta.previous.status).toBe('todo');
    }
  });
});

describe('Update Project Tool', () => {
  it('should update project fields', async () => {
    const ctx = createTestContext();
    const result = await updateProjectTool.execute(ctx, {
      type: 'update_project',
      projectId: 'proj-1',
      progress: 75,
      status: 'completed',
    });

    expect(result.status).toBe('success');
    expect(result.deltas).toHaveLength(1);
    expect(result.deltas[0].type).toBe('restore_project');

    const project = ctx.workingProjects.find(p => p.id === 'proj-1');
    expect(project?.progress).toBe(75);
    expect(project?.status).toBe('completed');
  });

  it('should track all changes in detail', async () => {
    const ctx = createTestContext();
    const result = await updateProjectTool.execute(ctx, {
      type: 'update_project',
      projectId: 'proj-1',
      progress: 100,
      priority: 'low',
    });

    expect(result.detail).toContain('progress');
    expect(result.detail).toContain('priority');
  });
});
