/**
 * Tests for Zustand stores
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../uiStore';
import { useProjectStore } from '../projectStore';
import { useMomentumStore } from '../momentumStore';

describe('Zustand Stores', () => {
  describe('useUIStore', () => {
    beforeEach(() => {
      // Reset store state before each test
      useUIStore.setState({
        activeView: 'people',
        sidebarWidth: 238,
        isSidebarCollapsed: false,
        globalSearchQuery: '',
        globalSearchOpen: false,
        isSantafied: true,
        featuredPersonId: null,
        recentlyUpdatedProjects: {},
      });
    });

    it('has correct initial state', () => {
      const state = useUIStore.getState();

      expect(state.activeView).toBe('people');
      expect(state.isSidebarCollapsed).toBe(false);
      expect(state.globalSearchQuery).toBe('');
      expect(state.isSantafied).toBe(true);
    });

    it('setActiveView updates view', () => {
      const { setActiveView } = useUIStore.getState();

      setActiveView('timeline');

      expect(useUIStore.getState().activeView).toBe('timeline');
    });

    it('setIsSidebarCollapsed toggles sidebar state', () => {
      const { setIsSidebarCollapsed } = useUIStore.getState();

      setIsSidebarCollapsed(true);
      expect(useUIStore.getState().isSidebarCollapsed).toBe(true);

      setIsSidebarCollapsed(false);
      expect(useUIStore.getState().isSidebarCollapsed).toBe(false);
    });

    it('setGlobalSearchQuery updates search', () => {
      const { setGlobalSearchQuery } = useUIStore.getState();

      setGlobalSearchQuery('test query');

      expect(useUIStore.getState().globalSearchQuery).toBe('test query');
    });

    it('setGlobalSearchOpen manages search panel state', () => {
      const { setGlobalSearchOpen } = useUIStore.getState();

      setGlobalSearchOpen(true);
      expect(useUIStore.getState().globalSearchOpen).toBe(true);

      setGlobalSearchOpen(false);
      expect(useUIStore.getState().globalSearchOpen).toBe(false);
    });

    it('setIsSantafied updates theme mode', () => {
      const { setIsSantafied } = useUIStore.getState();

      setIsSantafied(false);
      expect(useUIStore.getState().isSantafied).toBe(false);

      setIsSantafied(true);
      expect(useUIStore.getState().isSantafied).toBe(true);
    });

    it('markProjectUpdated tracks recently updated projects', () => {
      const { markProjectUpdated } = useUIStore.getState();

      const before = Date.now();
      markProjectUpdated('proj1');
      const after = Date.now();

      const timestamp = useUIStore.getState().recentlyUpdatedProjects['proj1'];
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('clearProjectHighlight removes project from recently updated', () => {
      const { markProjectUpdated, clearProjectHighlight } = useUIStore.getState();

      markProjectUpdated('proj1');
      expect(useUIStore.getState().recentlyUpdatedProjects['proj1']).toBeDefined();

      clearProjectHighlight('proj1');
      expect(useUIStore.getState().recentlyUpdatedProjects['proj1']).toBeUndefined();
    });
  });

  describe('useProjectStore', () => {
    beforeEach(() => {
      useProjectStore.setState({
        expandedTasks: {},
        editValues: {},
        editingTask: null,
        editingSubtask: null,
        addingNewTask: false,
        newTaskTitle: '',
      });
    });

    it('has correct initial state', () => {
      const state = useProjectStore.getState();

      expect(state.expandedTasks).toEqual({});
      expect(state.editValues).toEqual({});
      expect(state.editingTask).toBeNull();
    });

    it('toggleTask manages task expansion', () => {
      const { toggleTask } = useProjectStore.getState();

      toggleTask('task1');
      expect(useProjectStore.getState().expandedTasks['task1']).toBe(true);

      toggleTask('task1');
      expect(useProjectStore.getState().expandedTasks['task1']).toBe(false);
    });

    it('setEditingTask and setEditingTaskTitle manage edit state', () => {
      const { setEditingTask, setEditingTaskTitle } = useProjectStore.getState();

      setEditingTask('task1');
      setEditingTaskTitle('New Title');

      expect(useProjectStore.getState().editingTask).toBe('task1');
      expect(useProjectStore.getState().editingTaskTitle).toBe('New Title');
    });

    it('updateEditValue stores edit values', () => {
      const { updateEditValue } = useProjectStore.getState();

      updateEditValue('task1-title', 'New Title');

      expect(useProjectStore.getState().editValues['task1-title']).toBe('New Title');
    });

    it('resetEditingState clears all editing state', () => {
      const { setEditingTask, setEditingTaskTitle, resetEditingState } = useProjectStore.getState();

      setEditingTask('task1');
      setEditingTaskTitle('New Title');

      resetEditingState();

      expect(useProjectStore.getState().editingTask).toBeNull();
      expect(useProjectStore.getState().editingTaskTitle).toBe('');
    });

    it('setAddingNewTask and setNewTaskTitle manage new task form', () => {
      const { setAddingNewTask, setNewTaskTitle } = useProjectStore.getState();

      setAddingNewTask(true);
      setNewTaskTitle('New Task');

      expect(useProjectStore.getState().addingNewTask).toBe(true);
      expect(useProjectStore.getState().newTaskTitle).toBe('New Task');
    });

    it('resetNewTask clears new task form', () => {
      const { setAddingNewTask, setNewTaskTitle, resetNewTask } = useProjectStore.getState();

      setAddingNewTask(true);
      setNewTaskTitle('New Task');

      resetNewTask();

      expect(useProjectStore.getState().addingNewTask).toBe(false);
      expect(useProjectStore.getState().newTaskTitle).toBe('');
    });
  });

  describe('useMomentumStore', () => {
    beforeEach(() => {
      useMomentumStore.setState({
        messages: [],
        draft: '',
        error: '',
        isRequesting: false,
        pendingActions: [],
      });
    });

    it('has correct initial state', () => {
      const state = useMomentumStore.getState();

      expect(state.messages).toEqual([]);
      expect(state.draft).toBe('');
      expect(state.isRequesting).toBe(false);
    });

    it('addMessage adds to messages array', () => {
      const { addMessage } = useMomentumStore.getState();

      const message = { id: 'msg1', role: 'user', content: 'Hello' };
      addMessage(message);

      expect(useMomentumStore.getState().messages).toHaveLength(1);
      expect(useMomentumStore.getState().messages[0]).toEqual(message);
    });

    it('setDraft updates draft', () => {
      const { setDraft } = useMomentumStore.getState();

      setDraft('Draft content');

      expect(useMomentumStore.getState().draft).toBe('Draft content');
    });

    it('setIsRequesting updates requesting state', () => {
      const { setIsRequesting } = useMomentumStore.getState();

      setIsRequesting(true);
      expect(useMomentumStore.getState().isRequesting).toBe(true);

      setIsRequesting(false);
      expect(useMomentumStore.getState().isRequesting).toBe(false);
    });

    it('setError updates error state', () => {
      const { setError } = useMomentumStore.getState();

      setError('Something went wrong');
      expect(useMomentumStore.getState().error).toBe('Something went wrong');
    });

    it('clearMessages empties messages array', () => {
      const { addMessage, clearMessages } = useMomentumStore.getState();

      addMessage({ id: 'msg1', role: 'user', content: 'Hello' });
      addMessage({ id: 'msg2', role: 'assistant', content: 'Hi' });

      clearMessages();

      expect(useMomentumStore.getState().messages).toHaveLength(0);
    });

    it('updateLastMessage modifies the last message', () => {
      const { addMessage, updateLastMessage } = useMomentumStore.getState();

      addMessage({ id: 'msg1', role: 'assistant', content: 'Processing...' });

      updateLastMessage({ content: 'Done!' });

      expect(useMomentumStore.getState().messages[0].content).toBe('Done!');
    });

    it('resetMomentum clears all state', () => {
      const { addMessage, setDraft, setError, resetMomentum } = useMomentumStore.getState();

      addMessage({ id: 'msg1', role: 'user', content: 'Hello' });
      setDraft('Some draft');
      setError('Some error');

      resetMomentum();

      const state = useMomentumStore.getState();
      expect(state.messages).toHaveLength(0);
      expect(state.draft).toBe('');
      expect(state.error).toBe('');
    });
  });
});
