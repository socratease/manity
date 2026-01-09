import { create } from 'zustand';

export const useProjectStore = create((set, get) => ({
  // Selected/editing states
  selectedProject: null,
  editingTask: null,
  editingSubtask: null,
  editingExecSummary: null,
  editingPerson: null,

  // Edit values
  editValues: {},
  execSummaryDraft: '',
  editingTaskTitle: '',
  editingSubtaskTitle: '',

  // Expanded states
  expandedTasks: {},
  expandedMomentumProjects: {},
  expandedActionMessages: {},
  expandedInitiatives: {},  // For collapsing/expanding initiative containers

  // New item states
  addingNewTask: false,
  newTaskTitle: '',
  newTaskDueDate: '',
  addingSubtaskTo: null,
  newSubtaskTitle: '',
  newSubtaskDueDate: '',

  // Comment states
  commentingOn: null,
  subtaskComment: '',
  taskCommentingOn: null,
  taskComment: '',
  hoveredCommentItem: null,

  // Date editing
  editingDueDate: null,
  tempDueDate: '',
  editingCompletedDate: false,

  // Assignee editing
  editingAssignee: null,
  assigneeSearchTerm: '',
  assigneeFocusedIndex: 0,

  // Project deletion
  projectToDelete: null,
  deleteConfirmation: '',

  // Activity edits
  activityEdits: {},

  // New project form
  newProjectName: '',
  newProjectDescription: '',
  newProjectPriority: 'medium',
  newProjectStatus: 'planning',
  newProjectTargetDate: '',
  newProjectStakeholders: [],
  stakeholderSelectionTarget: null,

  // Hidden slide items
  hiddenSlideItems: {
    recentUpdates: [],
    recentlyCompleted: [],
    nextUp: []
  },
  slideItemCounts: {
    recentUpdates: 3,
    recentlyCompleted: 3,
    nextUp: 3
  },

  // Actions
  setSelectedProject: (project) => set({ selectedProject: project }),

  setEditingTask: (taskId) => set({ editingTask: taskId }),
  setEditingTaskTitle: (title) => set({ editingTaskTitle: title }),
  setEditingSubtask: (subtaskId) => set({ editingSubtask: subtaskId }),
  setEditingSubtaskTitle: (title) => set({ editingSubtaskTitle: title }),

  setEditingExecSummary: (projectId) => set({ editingExecSummary: projectId }),
  setExecSummaryDraft: (draft) => set({ execSummaryDraft: draft }),
  setEditingPerson: (personId) => set({ editingPerson: personId }),

  setEditValues: (values) => set({ editValues: values }),
  updateEditValue: (key, value) => set((state) => ({
    editValues: { ...state.editValues, [key]: value }
  })),

  toggleTask: (taskId) => set((state) => ({
    expandedTasks: {
      ...state.expandedTasks,
      [taskId]: !state.expandedTasks[taskId]
    }
  })),
  setExpandedTasks: (tasks) => set({ expandedTasks: tasks }),

  toggleMomentumProject: (projectId) => set((state) => ({
    expandedMomentumProjects: {
      ...state.expandedMomentumProjects,
      [projectId]: !state.expandedMomentumProjects[projectId]
    }
  })),
  setExpandedMomentumProjects: (projects) => set({ expandedMomentumProjects: projects }),

  toggleActionMessage: (messageId) => set((state) => ({
    expandedActionMessages: {
      ...state.expandedActionMessages,
      [messageId]: !state.expandedActionMessages[messageId]
    }
  })),

  toggleInitiative: (initiativeId) => set((state) => ({
    expandedInitiatives: {
      ...state.expandedInitiatives,
      [initiativeId]: !state.expandedInitiatives[initiativeId]
    }
  })),
  setExpandedInitiatives: (initiatives) => set({ expandedInitiatives: initiatives }),

  // New task
  setAddingNewTask: (adding) => set({ addingNewTask: adding }),
  setNewTaskTitle: (title) => set({ newTaskTitle: title }),
  setNewTaskDueDate: (date) => set({ newTaskDueDate: date }),
  resetNewTask: () => set({ addingNewTask: false, newTaskTitle: '', newTaskDueDate: '' }),

  // New subtask
  setAddingSubtaskTo: (taskId) => set({ addingSubtaskTo: taskId }),
  setNewSubtaskTitle: (title) => set({ newSubtaskTitle: title }),
  setNewSubtaskDueDate: (date) => set({ newSubtaskDueDate: date }),
  resetNewSubtask: () => set({ addingSubtaskTo: null, newSubtaskTitle: '', newSubtaskDueDate: '' }),

  // Comments
  setCommentingOn: (subtaskId) => set({ commentingOn: subtaskId }),
  setSubtaskComment: (comment) => set({ subtaskComment: comment }),
  setTaskCommentingOn: (taskId) => set({ taskCommentingOn: taskId }),
  setTaskComment: (comment) => set({ taskComment: comment }),
  setHoveredCommentItem: (item) => set({ hoveredCommentItem: item }),

  // Date editing
  setEditingDueDate: (id) => set({ editingDueDate: id }),
  setTempDueDate: (date) => set({ tempDueDate: date }),
  setEditingCompletedDate: (editing) => set({ editingCompletedDate: editing }),

  // Assignee editing
  setEditingAssignee: (id) => set({ editingAssignee: id }),
  setAssigneeSearchTerm: (term) => set({ assigneeSearchTerm: term }),
  setAssigneeFocusedIndex: (index) => set({ assigneeFocusedIndex: index }),
  resetAssigneeEditing: () => set({
    editingAssignee: null,
    assigneeSearchTerm: '',
    assigneeFocusedIndex: 0
  }),

  // Project deletion
  setProjectToDelete: (projectId) => set({ projectToDelete: projectId }),
  setDeleteConfirmation: (text) => set({ deleteConfirmation: text }),
  resetProjectDeletion: () => set({ projectToDelete: null, deleteConfirmation: '' }),

  // Activity edits
  setActivityEdit: (activityId, note) => set((state) => ({
    activityEdits: { ...state.activityEdits, [activityId]: note }
  })),
  clearActivityEdit: (activityId) => set((state) => {
    const { [activityId]: _, ...rest } = state.activityEdits;
    return { activityEdits: rest };
  }),
  resetActivityEdits: () => set({ activityEdits: {} }),

  // New project form
  setNewProjectName: (name) => set({ newProjectName: name }),
  setNewProjectDescription: (desc) => set({ newProjectDescription: desc }),
  setNewProjectPriority: (priority) => set({ newProjectPriority: priority }),
  setNewProjectStatus: (status) => set({ newProjectStatus: status }),
  setNewProjectTargetDate: (date) => set({ newProjectTargetDate: date }),
  setNewProjectStakeholders: (stakeholders) => set({ newProjectStakeholders: stakeholders }),
  setStakeholderSelectionTarget: (target) => set({ stakeholderSelectionTarget: target }),
  resetNewProjectForm: () => set({
    newProjectName: '',
    newProjectDescription: '',
    newProjectPriority: 'medium',
    newProjectStatus: 'planning',
    newProjectTargetDate: '',
    newProjectStakeholders: [],
    stakeholderSelectionTarget: null
  }),

  // Slide items
  hideSlideItem: (section, itemId) => set((state) => ({
    hiddenSlideItems: {
      ...state.hiddenSlideItems,
      [section]: [...state.hiddenSlideItems[section], itemId]
    }
  })),
  setSlideItemCounts: (counts) => set({ slideItemCounts: counts }),
  resetSlideItems: () => set({
    hiddenSlideItems: { recentUpdates: [], recentlyCompleted: [], nextUp: [] },
    slideItemCounts: { recentUpdates: 3, recentlyCompleted: 3, nextUp: 3 }
  }),

  // Reset all editing state
  resetEditingState: () => set({
    selectedProject: null,
    editingTask: null,
    editingSubtask: null,
    editingExecSummary: null,
    editingPerson: null,
    editValues: {},
    execSummaryDraft: '',
    editingTaskTitle: '',
    editingSubtaskTitle: '',
    addingNewTask: false,
    newTaskTitle: '',
    newTaskDueDate: '',
    addingSubtaskTo: null,
    newSubtaskTitle: '',
    newSubtaskDueDate: '',
    commentingOn: null,
    subtaskComment: '',
    taskCommentingOn: null,
    taskComment: '',
    editingDueDate: null,
    tempDueDate: '',
    editingCompletedDate: false,
    editingAssignee: null,
    assigneeSearchTerm: '',
    projectToDelete: null,
    deleteConfirmation: '',
  }),
}));

export default useProjectStore;
