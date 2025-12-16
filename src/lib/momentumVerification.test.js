import { describe, it, expect } from 'vitest';
import { verifyThrustActions } from './momentumVerification';

const baseProjects = [
  {
    id: '1',
    name: 'Alpha',
    status: 'active',
    priority: 'high',
    progress: 10,
    description: 'Alpha desc',
    targetDate: '2024-12-01',
    plan: [
      {
        id: 't1',
        title: 'Task One',
        status: 'todo',
        dueDate: '',
        subtasks: [
          { id: 's1', title: 'Subtask A', status: 'todo' }
        ]
      }
    ],
    recentActivity: []
  }
];

describe('verifyThrustActions', () => {
  it('passes verification when project changes are applied', () => {
    const actions = [
      { type: 'update_project', projectId: '1', status: 'completed', progress: 100 }
    ];

    const updatedProjects = [
      { ...baseProjects[0], status: 'completed', progress: 100 }
    ];

    const actionResults = [{ label: 'Updated project' }];

    const verification = verifyThrustActions(actions, baseProjects, updatedProjects, actionResults);
    expect(verification.hasFailures).toBe(false);
    expect(verification.perAction[0].status).toBe('passed');
  });

  it('captures discrepancies for missed task updates', () => {
    const actions = [
      { type: 'update_task', projectId: '1', taskId: 't1', status: 'in_progress' }
    ];

    const updatedProjects = [...baseProjects];
    const actionResults = [{ label: 'Updated task' }];

    const verification = verifyThrustActions(actions, baseProjects, updatedProjects, actionResults);
    expect(verification.hasFailures).toBe(true);
    expect(verification.perAction[0].status).toBe('failed');
    expect(verification.perAction[0].discrepancies[0]).toContain('Expected status');
  });

  it('marks skipped actions as skipped', () => {
    const actions = [
      { type: 'add_task', projectId: '1', title: 'New Task' }
    ];

    const updatedProjects = [...baseProjects];
    const actionResults = [{ label: 'Skipped action: missing project' }];

    const verification = verifyThrustActions(actions, baseProjects, updatedProjects, actionResults);
    expect(verification.perAction[0].status).toBe('skipped');
  });
});
