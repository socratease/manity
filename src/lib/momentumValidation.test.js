import { describe, it, expect } from 'vitest';
import { validateThrustActions, resolveMomentumProjectRef, supportedMomentumActions } from './momentumValidation';

describe('resolveMomentumProjectRef', () => {
  const mockProjects = [
    { id: '1', name: 'Website Redesign' },
    { id: '2', name: 'Q4 Marketing Campaign' },
    { id: '3', name: 'Customer Portal v2' }
  ];

  it('should resolve project by exact ID match', () => {
    const result = resolveMomentumProjectRef('1', mockProjects);
    expect(result).toEqual({ id: '1', name: 'Website Redesign' });
  });

  it('should resolve project by name (case-insensitive)', () => {
    const result = resolveMomentumProjectRef('website redesign', mockProjects);
    expect(result).toEqual({ id: '1', name: 'Website Redesign' });
  });

  it('should resolve project by exact name', () => {
    const result = resolveMomentumProjectRef('Q4 Marketing Campaign', mockProjects);
    expect(result).toEqual({ id: '2', name: 'Q4 Marketing Campaign' });
  });

  it('should return null for non-existent project', () => {
    const result = resolveMomentumProjectRef('NonExistent', mockProjects);
    expect(result).toBeNull();
  });

  it('should return null for empty target', () => {
    const result = resolveMomentumProjectRef('', mockProjects);
    expect(result).toBeNull();
  });

  it('should return null for null target', () => {
    const result = resolveMomentumProjectRef(null, mockProjects);
    expect(result).toBeNull();
  });
});

describe('validateThrustActions', () => {
  const mockProjects = [
    { id: '1', name: 'Website Redesign' },
    { id: '2', name: 'Marketing Campaign' }
  ];

  describe('basic validation', () => {
    it('should return error for non-array input', () => {
      const result = validateThrustActions('not-an-array', mockProjects);
      expect(result.validActions).toEqual([]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('not an array');
    });

    it('should return error for non-object action', () => {
      const result = validateThrustActions(['string-action'], mockProjects);
      expect(result.validActions).toEqual([]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('not an object');
    });

    it('should return error for action missing type', () => {
      const result = validateThrustActions([{ projectId: '1' }], mockProjects);
      expect(result.validActions).toEqual([]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('missing a type');
    });

    it('should return error for unsupported action type', () => {
      const result = validateThrustActions([{ type: 'unsupported_action' }], mockProjects);
      expect(result.validActions).toEqual([]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('unsupported type');
    });
  });

  describe('create_project validation', () => {
    it('should validate create_project with name', () => {
      const actions = [{ type: 'create_project', name: 'New Project' }];
      const result = validateThrustActions(actions, mockProjects);
      expect(result.validActions).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate create_project with projectName', () => {
      const actions = [{ type: 'create_project', projectName: 'New Project' }];
      const result = validateThrustActions(actions, mockProjects);
      expect(result.validActions).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should trim whitespace-only project names and surface an error', () => {
      const actions = [{ type: 'create_project', name: '   ' }];
      const result = validateThrustActions(actions, mockProjects);
      expect(result.validActions).toEqual([]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('missing a name');
    });

    it('should trim whitespace around project names', () => {
      const actions = [{ type: 'create_project', name: '  New Project  ' }];
      const result = validateThrustActions(actions, mockProjects);
      expect(result.validActions).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      expect(result.validActions[0].name).toBe('New Project');
      expect(result.validActions[0].projectName).toBe('New Project');
    });

    it('should return error for create_project without name', () => {
      const actions = [{ type: 'create_project' }];
      const result = validateThrustActions(actions, mockProjects);
      expect(result.validActions).toEqual([]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('missing a name');
    });
  });

  describe('project reference validation', () => {
    it('should validate action with valid projectId', () => {
      const actions = [{ type: 'add_task', projectId: '1', title: 'New Task' }];
      const result = validateThrustActions(actions, mockProjects);
      expect(result.validActions).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      expect(result.validActions[0].projectId).toBe('1');
      expect(result.validActions[0].projectName).toBe('Website Redesign');
    });

    it('should validate action with valid projectName', () => {
      const actions = [{ type: 'add_task', projectName: 'Marketing Campaign', title: 'New Task' }];
      const result = validateThrustActions(actions, mockProjects);
      expect(result.validActions).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      expect(result.validActions[0].projectId).toBe('2');
    });

    it('should return error for action with missing projectId/projectName', () => {
      const actions = [{ type: 'add_task', title: 'New Task' }];
      const result = validateThrustActions(actions, mockProjects);
      expect(result.validActions).toEqual([]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('missing a projectId or projectName');
    });

    it('should return error for action referencing unknown project', () => {
      const actions = [{ type: 'add_task', projectName: 'Unknown Project', title: 'New Task' }];
      const result = validateThrustActions(actions, mockProjects);
      expect(result.validActions).toEqual([]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('unknown project');
    });

    it('should validate query_portfolio without a project reference', () => {
      const actions = [{ type: 'query_portfolio', scope: 'portfolio', detailLevel: 'summary', includePeople: true }];
      const result = validateThrustActions(actions, mockProjects);
      expect(result.validActions).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      expect(result.validActions[0].scope).toBe('portfolio');
      expect(result.validActions[0].detailLevel).toBe('summary');
    });

    it('should return error for query_portfolio with unknown project', () => {
      const actions = [{ type: 'query_portfolio', projectName: 'Unknown Project' }];
      const result = validateThrustActions(actions, mockProjects);
      expect(result.validActions).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('unknown project');
    });
  });

  describe('pending project tracking (same-batch creation)', () => {
    it('should allow referencing a project created in the same batch', () => {
      const actions = [
        { type: 'create_project', name: 'New Project' },
        { type: 'add_task', projectName: 'New Project', title: 'First Task' }
      ];
      const result = validateThrustActions(actions, mockProjects);
      expect(result.validActions).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow case-insensitive reference to pending project', () => {
      const actions = [
        { type: 'create_project', name: 'New Project' },
        { type: 'add_task', projectName: 'new project', title: 'First Task' }
      ];
      const result = validateThrustActions(actions, mockProjects);
      expect(result.validActions).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow multiple actions on newly created project', () => {
      const actions = [
        { type: 'create_project', name: 'New Project' },
        { type: 'add_task', projectName: 'New Project', title: 'Task 1' },
        { type: 'add_task', projectName: 'New Project', title: 'Task 2' },
        { type: 'comment', projectName: 'New Project', note: 'Great start!' }
      ];
      const result = validateThrustActions(actions, mockProjects);
      expect(result.validActions).toHaveLength(4);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow referencing a trimmed project name created in the same batch', () => {
      const actions = [
        { type: 'create_project', name: '  New Project  ' },
        { type: 'add_task', projectName: 'New Project', title: 'Task 1' }
      ];
      const result = validateThrustActions(actions, mockProjects);
      expect(result.validActions).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(result.validActions[1].projectName).toBe('New Project');
    });

    it('should handle creating multiple projects and referencing each', () => {
      const actions = [
        { type: 'create_project', name: 'Project A' },
        { type: 'add_task', projectName: 'Project A', title: 'Task A1' },
        { type: 'create_project', name: 'Project B' },
        { type: 'add_task', projectName: 'Project B', title: 'Task B1' }
      ];
      const result = validateThrustActions(actions, mockProjects);
      expect(result.validActions).toHaveLength(4);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow referencing a pending project by provided projectId', () => {
      const actions = [
        { type: 'create_project', name: 'Project X', projectId: 'temp-123' },
        { type: 'add_task', projectId: 'temp-123', title: 'Task on pending project' }
      ];
      const result = validateThrustActions(actions, mockProjects);
      expect(result.validActions).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow referencing a pending project by provided id field', () => {
      const actions = [
        { type: 'create_project', name: 'Project Y', id: 'temp-999' },
        { type: 'add_task', projectId: 'temp-999', title: 'Follow-up task' }
      ];
      const result = validateThrustActions(actions, mockProjects);
      expect(result.validActions).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('out-of-order create/reference handling', () => {
    it('should reorder actions so create_project runs before dependent actions', () => {
      const actions = [
        { type: 'add_task', projectName: 'New Project', title: 'Task 1' },
        { type: 'create_project', name: 'New Project' },
        { type: 'comment', projectName: 'New Project', note: 'Excited to start!' }
      ];

      const result = validateThrustActions(actions, mockProjects);

      expect(result.errors).toHaveLength(0);
      expect(result.validActions).toHaveLength(3);
      expect(result.validActions[0].type).toBe('create_project');
      expect(result.validActions[1].type).toBe('add_task');
      expect(result.validActions[1].projectName).toBe('New Project');
      expect(result.validActions[2].type).toBe('comment');
    });

    it('should report errors when dependent actions cannot be reordered due to invalid create_project', () => {
      const actions = [
        { type: 'add_task', projectName: 'Future Project', title: 'Task 1' },
        { type: 'create_project' }
      ];

      const result = validateThrustActions(actions, mockProjects);

      expect(result.validActions).toHaveLength(0);
      expect(result.errors).toHaveLength(2);
      expect(result.errors.some(err => err.includes('unknown project'))).toBe(true);
      expect(result.errors.some(err => err.includes('missing a name'))).toBe(true);
    });
  });

  describe('comment validation', () => {
    it('should reject comments without a body', () => {
      const actions = [
        { type: 'comment', projectId: '1', note: '   ' },
        { type: 'comment', projectId: '1', content: '' },
        { type: 'comment', projectId: '1' }
      ];

      const result = validateThrustActions(actions, mockProjects);

      expect(result.validActions).toHaveLength(0);
      expect(result.errors).toHaveLength(actions.length);
      expect(result.errors[0]).toContain('missing a note');
    });
  });

  describe('all action types', () => {
    it('should validate all supported action types', () => {
      const actions = supportedMomentumActions
        .filter(type => type !== 'create_project')
        .map(type => {
          switch (type) {
            case 'comment':
              return { type, projectId: '1', note: 'Test comment' };
            case 'add_task':
              return { type, projectId: '1', title: 'Task' };
            case 'update_task':
              return { type, projectId: '1', taskId: 'task-1', title: 'Renamed', status: 'todo' };
            case 'add_subtask':
              return { type, projectId: '1', taskId: 'task-1', subtaskTitle: 'Subtask', status: 'todo' };
            case 'update_subtask':
              return { type, projectId: '1', taskId: 'task-1', subtaskId: 'subtask-1', title: 'Updated subtask', status: 'todo' };
            case 'update_project':
              return { type, projectId: '1', status: 'active', progress: 50 };
            case 'add_person':
              return { type, name: 'Jamie Example', email: 'jamie@example.com' };
            case 'send_email':
              return { type, recipients: ['team@example.com'], subject: 'Hello', body: 'Update ready' };
            case 'query_portfolio':
              return { type, projectId: '1', scope: 'project', detailLevel: 'detailed', includePeople: true };
            default:
              return { type, projectId: '1' };
          }
        });

      const result = validateThrustActions(actions, mockProjects);
      expect(result.validActions).toHaveLength(actions.length);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('mixed scenarios', () => {
    it('should handle mix of valid and invalid actions', () => {
      const actions = [
        { type: 'create_project', name: 'Valid Project' },
        { type: 'add_task' }, // Missing projectId/projectName
        { type: 'add_task', projectId: '1', title: 'Valid Task' },
        { type: 'unsupported_action', projectId: '1' } // Unsupported type
      ];
      const result = validateThrustActions(actions, mockProjects);
      expect(result.validActions).toHaveLength(2);
      expect(result.errors).toHaveLength(2);
    });

    it('should continue validation after encountering errors', () => {
      const actions = [
        { type: 'add_task' }, // Error: missing project ref
        { type: 'add_task', projectId: '1', title: 'Valid' }, // Valid
        'invalid', // Error: not an object
        { type: 'create_project', name: 'Another Project' } // Valid
      ];
      const result = validateThrustActions(actions, mockProjects);
      expect(result.validActions).toHaveLength(2);
      expect(result.errors).toHaveLength(2);
    });
  });
});
