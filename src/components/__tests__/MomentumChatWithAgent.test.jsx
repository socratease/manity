import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MomentumChatWithAgent from '../MomentumChatWithAgent';

vi.mock('../../hooks/usePortfolioData', () => ({
  usePortfolioData: () => ({
    projects: [],
    createProject: vi.fn(),
    updateProject: vi.fn(),
    addActivity: vi.fn(),
    addTask: vi.fn(),
    updateTask: vi.fn(),
    addSubtask: vi.fn(),
    updateSubtask: vi.fn(),
    createPerson: vi.fn(),
    sendEmail: vi.fn(),
  }),
}));

vi.mock('../../hooks/useInitiatives', () => ({
  useInitiatives: () => ({ initiatives: [], createInitiative: vi.fn() }),
}));

vi.mock('../../themes/hooks', () => ({
  useSeasonalTheme: () => ({
    colors: { coral: '#f00', amber: '#fa0', sage: '#0a0', stone: '#888', earth: '#654' },
  }),
}));

vi.mock('../../agent-sdk', () => ({
  useAgentRuntime: () => ({
    executeMessage: vi.fn(),
    continueWithUserResponse: vi.fn(),
    undoManager: { push: vi.fn(), undo: vi.fn() },
    undoDeltas: vi.fn(),
    isAwaitingUser: false,
    pendingQuestion: null,
  }),
}));

describe('MomentumChatWithAgent', () => {
  it('renders without throwing a ReferenceError', () => {
    expect(() =>
      render(
        <MomentumChatWithAgent
          messages={[]}
          onSendMessage={vi.fn()}
          onApplyActions={vi.fn()}
          onUndoAction={vi.fn()}
          people={[]}
          recentlyUpdatedProjects={{}}
        />
      )
    ).not.toThrow();
  });
});
