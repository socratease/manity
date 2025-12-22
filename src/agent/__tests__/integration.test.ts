/**
 * Integration Tests
 *
 * Tests for multi-step execution scenarios.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { AgentContext, Plan, ToolContextServices } from '../types';
import { AgentRuntime } from '../AgentRuntime';
import { createToolRegistry } from '../tools';
import { cloneProjectDeep } from '../context/helpers';

// Mock services
const createMockServices = (): ToolContextServices => ({
  createPerson: vi.fn().mockResolvedValue({ name: 'Test User', team: 'Test', id: 1 }),
  sendEmail: vi.fn().mockResolvedValue(undefined),
  buildThrustContext: vi.fn().mockReturnValue([]),
});

describe('AgentRuntime Integration', () => {
  let runtime: AgentRuntime;
  let mockServices: ToolContextServices;

  beforeEach(() => {
    const registry = createToolRegistry();
    runtime = new AgentRuntime(registry);
    mockServices = createMockServices();
  });

  describe('Multi-step execution', () => {
    it('should execute multiple actions in sequence', async () => {
      const context: AgentContext = {
        userMessage: 'Create a project and add a task',
        projects: [],
        people: [{ name: 'Alice', team: 'Eng', email: 'alice@test.com' }],
        loggedInUser: 'Test User',
      };

      const actions = [
        {
          type: 'create_project' as const,
          name: 'New Project',
          priority: 'high' as const,
        },
        {
          type: 'add_task' as const,
          projectName: 'New Project',
          title: 'First Task',
        },
      ];

      const result = await runtime.executeActions(
        actions,
        context,
        mockServices,
        { constraints: { maxSteps: 5, allowSideEffects: false, requireConfirmation: false } }
      );

      expect(result.actionResults).toHaveLength(2);
      expect(result.actionResults[0].status).toBe('success');
      expect(result.actionResults[1].status).toBe('success');
      expect(result.updatedEntityIds.length).toBeGreaterThan(0);
    });

    it('should stop on max steps', async () => {
      const context: AgentContext = {
        userMessage: 'Do many things',
        projects: [
          {
            id: 'proj-1',
            name: 'Test Project',
            stakeholders: [],
            status: 'active',
            priority: 'high',
            progress: 0,
            description: '',
            plan: [],
            recentActivity: [],
          },
        ],
        people: [],
        loggedInUser: 'Test User',
      };

      const actions = Array(10).fill(null).map((_, i) => ({
        type: 'comment' as const,
        projectId: 'proj-1',
        note: `Comment ${i + 1}`,
      }));

      const result = await runtime.executeActions(
        actions,
        context,
        mockServices,
        { constraints: { maxSteps: 3, allowSideEffects: false, requireConfirmation: false } }
      );

      // Should only execute 3 actions due to maxSteps
      expect(result.actionResults.length).toBeLessThanOrEqual(3);
    });

    it('should block side-effecting tools when not allowed', async () => {
      const context: AgentContext = {
        userMessage: 'Send an email',
        projects: [],
        people: [{ name: 'Alice', team: 'Eng', email: 'alice@test.com' }],
        loggedInUser: 'Test User',
      };

      const actions = [
        {
          type: 'send_email' as const,
          recipients: ['alice@test.com'],
          subject: 'Test',
          body: 'Test body',
        },
      ];

      const result = await runtime.executeActions(
        actions,
        context,
        mockServices,
        { constraints: { maxSteps: 5, allowSideEffects: false, requireConfirmation: false } }
      );

      // Should be blocked due to side effects
      expect(result.executionLog.events[0]?.status).toBe('blocked');
    });

    it('should allow side-effecting tools when allowed', async () => {
      const context: AgentContext = {
        userMessage: 'Send an email',
        projects: [],
        people: [{ name: 'Alice', team: 'Eng', email: 'alice@test.com' }],
        loggedInUser: 'Test User',
      };

      const actions = [
        {
          type: 'send_email' as const,
          recipients: ['alice@test.com'],
          subject: 'Test',
          body: 'Test body',
        },
      ];

      const result = await runtime.executeActions(
        actions,
        context,
        mockServices,
        { constraints: { maxSteps: 5, allowSideEffects: true, requireConfirmation: false } }
      );

      expect(result.actionResults[0].status).toBe('success');
      expect(mockServices.sendEmail).toHaveBeenCalled();
    });
  });

  describe('Plan execution', () => {
    it('should execute a structured plan', async () => {
      const context: AgentContext = {
        userMessage: 'Update project',
        projects: [
          {
            id: 'proj-1',
            name: 'Test Project',
            stakeholders: [],
            status: 'active',
            priority: 'medium',
            progress: 25,
            description: '',
            plan: [],
            recentActivity: [],
          },
        ],
        people: [],
        loggedInUser: 'Test User',
      };

      const plan: Plan = {
        goal: 'Update project progress',
        steps: [
          {
            rationale: 'Update the project progress',
            toolCandidates: [
              {
                toolName: 'update_project',
                input: {
                  type: 'update_project',
                  projectId: 'proj-1',
                  progress: 75,
                },
              },
            ],
            requiresConfirmation: false,
          },
          {
            rationale: 'Add a comment about the update',
            toolCandidates: [
              {
                toolName: 'comment',
                input: {
                  type: 'comment',
                  projectId: 'proj-1',
                  note: 'Progress updated to 75%',
                },
              },
            ],
            requiresConfirmation: false,
          },
        ],
        status: 'pending',
      };

      const result = await runtime.runPlan(
        plan,
        context,
        mockServices,
        { constraints: { maxSteps: 5, allowSideEffects: false, requireConfirmation: false } }
      );

      expect(result.actionResults).toHaveLength(2);
      expect(result.actionResults[0].label).toContain('Updated');
      expect(result.actionResults[1].label).toContain('Commented');
      expect(result.plan.status).toBe('completed');
    });

    it('should handle plan with query then update pattern', async () => {
      const context: AgentContext = {
        userMessage: 'Check project and update',
        projects: [
          {
            id: 'proj-1',
            name: 'Query Target',
            stakeholders: [],
            status: 'active',
            priority: 'high',
            progress: 50,
            description: 'Test project',
            plan: [
              { id: 'task-1', title: 'Task 1', status: 'todo', subtasks: [] },
            ],
            recentActivity: [],
          },
        ],
        people: [],
        loggedInUser: 'Test User',
      };

      const plan: Plan = {
        goal: 'Query portfolio then update project',
        steps: [
          {
            rationale: 'Get current portfolio state',
            toolCandidates: [
              {
                toolName: 'query_portfolio',
                input: {
                  type: 'query_portfolio',
                  scope: 'portfolio',
                  detailLevel: 'summary',
                },
              },
            ],
            requiresConfirmation: false,
          },
          {
            rationale: 'Update project based on findings',
            toolCandidates: [
              {
                toolName: 'update_project',
                input: {
                  type: 'update_project',
                  projectId: 'proj-1',
                  progress: 100,
                  status: 'completed',
                },
              },
            ],
            requiresConfirmation: false,
          },
        ],
        status: 'pending',
      };

      const result = await runtime.runPlan(
        plan,
        context,
        mockServices,
        { constraints: { maxSteps: 5, allowSideEffects: false, requireConfirmation: false } }
      );

      // Query should succeed
      expect(result.actionResults[0].status).toBe('success');
      expect(result.actionResults[0].label).toContain('portfolio');

      // Update should succeed
      expect(result.actionResults[1].status).toBe('success');
      expect(result.actionResults[1].label).toContain('Updated');
    });
  });

  describe('Error handling', () => {
    it('should handle missing project gracefully', async () => {
      const context: AgentContext = {
        userMessage: 'Comment on project',
        projects: [],
        people: [],
        loggedInUser: 'Test User',
      };

      const actions = [
        {
          type: 'comment' as const,
          projectId: 'nonexistent',
          note: 'Test comment',
        },
      ];

      const result = await runtime.executeActions(
        actions,
        context,
        mockServices,
        { constraints: { maxSteps: 5, allowSideEffects: false, requireConfirmation: false } }
      );

      expect(result.actionResults[0].status).toBe('skipped');
      expect(result.actionResults[0].label).toContain('unknown project');
    });

    it('should continue after non-fatal errors', async () => {
      const context: AgentContext = {
        userMessage: 'Multiple actions',
        projects: [
          {
            id: 'proj-1',
            name: 'Test Project',
            stakeholders: [],
            status: 'active',
            priority: 'high',
            progress: 0,
            description: '',
            plan: [],
            recentActivity: [],
          },
        ],
        people: [],
        loggedInUser: 'Test User',
      };

      const actions = [
        {
          type: 'comment' as const,
          projectId: 'nonexistent', // Will be skipped
          note: 'Comment 1',
        },
        {
          type: 'comment' as const,
          projectId: 'proj-1', // Will succeed
          note: 'Comment 2',
        },
      ];

      const result = await runtime.executeActions(
        actions,
        context,
        mockServices,
        { constraints: { maxSteps: 5, allowSideEffects: false, requireConfirmation: false } }
      );

      expect(result.actionResults[0].status).toBe('skipped');
      expect(result.actionResults[1].status).toBe('success');
    });
  });

  describe('Streaming events', () => {
    it('should call onEvent callback for each execution', async () => {
      const onEvent = vi.fn();

      const context: AgentContext = {
        userMessage: 'Add comments',
        projects: [
          {
            id: 'proj-1',
            name: 'Test Project',
            stakeholders: [],
            status: 'active',
            priority: 'high',
            progress: 0,
            description: '',
            plan: [],
            recentActivity: [],
          },
        ],
        people: [],
        loggedInUser: 'Test User',
      };

      const actions = [
        { type: 'comment' as const, projectId: 'proj-1', note: 'Comment 1' },
        { type: 'comment' as const, projectId: 'proj-1', note: 'Comment 2' },
      ];

      await runtime.executeActions(
        actions,
        context,
        mockServices,
        {
          constraints: { maxSteps: 5, allowSideEffects: false, requireConfirmation: false },
          onEvent,
        }
      );

      expect(onEvent).toHaveBeenCalledTimes(2);
      expect(onEvent.mock.calls[0][0].stepIndex).toBe(0);
      expect(onEvent.mock.calls[1][0].stepIndex).toBe(1);
    });
  });
});
