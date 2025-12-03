import React, { useState, useEffect, useRef } from 'react';
import { Plus, Users, Clock, TrendingUp, CheckCircle2, Circle, ChevronLeft, ChevronRight, MessageCircle, Sparkles, ArrowLeft, Calendar, AlertCircle, Edit2, Send, ChevronDown, Check, X, MessageSquare, Settings, Lock, Unlock, Trash2, RotateCcw } from 'lucide-react';
import { usePortfolioData } from './hooks/usePortfolioData';
import { callOpenAIChat } from './lib/llmClient';

const generateActivityId = () => `act-${Math.random().toString(36).slice(2, 9)}`;

export default function ManityApp({ onOpenSettings = () => {}, apiKey = '' }) {
  const timelineInputRef = useRef(null);
  const projectUpdateInputRef = useRef(null);
  const recentUpdatesRef = useRef(null);
  const recentlyCompletedRef = useRef(null);
  const nextUpRef = useRef(null);

  const { projects, setProjects } = usePortfolioData();

  const [showDailyCheckin, setShowDailyCheckin] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [checkinNote, setCheckinNote] = useState('');
  const [activeView, setActiveView] = useState('overview');
  const [showNewProject, setShowNewProject] = useState(false);
  const [viewingProjectId, setViewingProjectId] = useState(null);
  const [newUpdate, setNewUpdate] = useState('');
  const [expandedTasks, setExpandedTasks] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState({});
  const [addingSubtaskTo, setAddingSubtaskTo] = useState(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskDueDate, setNewSubtaskDueDate] = useState('');
  const [commentingOn, setCommentingOn] = useState(null);
  const [subtaskComment, setSubtaskComment] = useState('');
  const [addingNewTask, setAddingNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [editingDueDate, setEditingDueDate] = useState(null);
  const [tempDueDate, setTempDueDate] = useState('');
  const [timelineUpdate, setTimelineUpdate] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [tagSearchTerm, setTagSearchTerm] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [showProjectTagSuggestions, setShowProjectTagSuggestions] = useState(false);
  const [projectTagSearchTerm, setProjectTagSearchTerm] = useState('');
  const [projectUpdateCursorPosition, setProjectUpdateCursorPosition] = useState(0);
  const [activityEditEnabled, setActivityEditEnabled] = useState(false);
  const [activityEdits, setActivityEdits] = useState({});
  const [projectDeletionEnabled, setProjectDeletionEnabled] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [thrustMessages, setThrustMessages] = useState([]);
  const [thrustDraft, setThrustDraft] = useState('');
  const [thrustError, setThrustError] = useState('');
  const [thrustPendingActions, setThrustPendingActions] = useState([]);
  const [thrustIsRequesting, setThrustIsRequesting] = useState(false);
  const [thrustRequestStart, setThrustRequestStart] = useState(null);
  const [thrustElapsedMs, setThrustElapsedMs] = useState(0);
  const [expandedMomentumProjects, setExpandedMomentumProjects] = useState({});
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [timelineView, setTimelineView] = useState(6); // Timeline zoom in months (1-24)
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectPriority, setNewProjectPriority] = useState('medium');
  const [newProjectStatus, setNewProjectStatus] = useState('planning');
  const [newProjectTargetDate, setNewProjectTargetDate] = useState('');
  const [newProjectStakeholders, setNewProjectStakeholders] = useState('');
  const adminUsers = [
    { name: 'Chris Graves', team: 'Admin' }
  ];
  const [loggedInUser, setLoggedInUser] = useState('');
  const [focusedField, setFocusedField] = useState(null);
  const [taskEditEnabled, setTaskEditEnabled] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');
  const [editingSubtask, setEditingSubtask] = useState(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('');
  const [editingExecSummary, setEditingExecSummary] = useState(null);
  const [execSummaryDraft, setExecSummaryDraft] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [hoveredTimelineGroup, setHoveredTimelineGroup] = useState(null);
  const [isEditingSlide, setIsEditingSlide] = useState(false);
  const [hiddenSlideItems, setHiddenSlideItems] = useState({
    recentUpdates: [],
    recentlyCompleted: [],
    nextUp: []
  });
  const [slideItemCounts, setSlideItemCounts] = useState({
    recentUpdates: 3,
    recentlyCompleted: 3,
    nextUp: 3
  });
  const supportedMomentumActions = ['comment', 'add_task', 'update_task', 'add_subtask', 'update_subtask', 'update_project'];

  // JSON Schema for structured output - ensures LLM returns properly formatted actions
  const momentumResponseSchema = {
    type: "json_schema",
    json_schema: {
      name: "momentum_response",
      schema: {
        type: "object",
        properties: {
          response: {
            type: "string",
            description: "The assistant's message to the user"
          },
          actions: {
            type: "array",
            description: "Array of atomic actions to perform",
            items: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  enum: ["comment", "add_task", "update_task", "add_subtask", "update_subtask", "update_project"],
                  description: "The type of action"
                },
                projectId: {
                  type: "string",
                  description: "Project ID or name to target"
                },
                projectName: {
                  type: "string",
                  description: "Project name (alternative to projectId)"
                },
                note: {
                  type: "string",
                  description: "Comment content (for comment action)"
                },
                content: {
                  type: "string",
                  description: "Alternative to note for comment action"
                },
                author: {
                  type: "string",
                  description: "Author of the comment"
                },
                title: {
                  type: "string",
                  description: "Task or subtask title"
                },
                taskId: {
                  type: "string",
                  description: "Task ID to target"
                },
                taskTitle: {
                  type: "string",
                  description: "Task title (alternative to taskId)"
                },
                subtaskId: {
                  type: "string",
                  description: "Subtask ID to target"
                },
                subtaskTitle: {
                  type: "string",
                  description: "Subtask title (alternative to subtaskId)"
                },
                status: {
                  type: "string",
                  enum: ["todo", "in-progress", "completed", "planning", "active", "on-hold", "cancelled"],
                  description: "Status of task, subtask, or project"
                },
                dueDate: {
                  type: "string",
                  description: "Due date in ISO format"
                },
                completedDate: {
                  type: "string",
                  description: "Completion date in ISO format"
                },
                progress: {
                  type: "number",
                  description: "Progress percentage (0-100)"
                },
                targetDate: {
                  type: "string",
                  description: "Target completion date for project"
                },
                lastUpdate: {
                  type: "string",
                  description: "Last update timestamp"
                }
              },
              required: ["type"],
              additionalProperties: false
            }
          }
        },
        required: ["response", "actions"],
        additionalProperties: false
      }
    }
  };

  const formatStakeholderNames = (stakeholders = []) => {
    const names = stakeholders.map(person => person.name);
    // Show all names unless there are more than 5
    if (names.length <= 5) return names.join(', ');
    return `${names.slice(0, 5).join(', ')} +${names.length - 5}`;
  };

  useEffect(() => {
    if (activityEditEnabled) {
      setActivityEdits(prev => {
        const updated = { ...prev };
        projects.forEach(project => {
          project.recentActivity.forEach(activity => {
            if (!updated[activity.id]) {
              updated[activity.id] = activity.note;
            }
          });
        });
        return updated;
      });
    } else {
      setActivityEdits({});
    }
  }, [activityEditEnabled, projects]);

  // Reset item counts when slide changes or when switching to slides view
  useEffect(() => {
    setSlideItemCounts({
      recentUpdates: 3,
      recentlyCompleted: 3,
      nextUp: 3
    });
  }, [currentSlideIndex, activeView]);

  // Overflow detection for slide panels
  useEffect(() => {
    if (activeView !== 'slides') return;

    const checkOverflow = () => {
      const panels = [
        { ref: recentUpdatesRef, key: 'recentUpdates' },
        { ref: recentlyCompletedRef, key: 'recentlyCompleted' },
        { ref: nextUpRef, key: 'nextUp' }
      ];

      let needsUpdate = false;
      const newCounts = { ...slideItemCounts };

      panels.forEach(({ ref, key }) => {
        if (!ref.current) return;

        const element = ref.current;
        const isOverflowing = element.scrollHeight > element.clientHeight;
        const hasRoom = element.scrollHeight < element.clientHeight * 0.8;

        // Get current visible items for this section
        const visibleProjects = projects.filter(p => p.status !== 'deleted');
        if (visibleProjects.length === 0) return;

        const slideProject = visibleProjects[currentSlideIndex % visibleProjects.length];
        if (!slideProject) return;

        // Get all available items
        let allItems = [];
        if (key === 'recentUpdates') {
          allItems = slideProject.recentActivity.filter(
            activity => !hiddenSlideItems.recentUpdates.includes(activity.id)
          );
        } else if (key === 'recentlyCompleted') {
          const allRecentlyCompleted = slideProject.plan
            .flatMap(task =>
              task.subtasks
                .filter(sub => sub.completed)
                .map(sub => ({
                  id: `${task.id}-${sub.id}`,
                  title: sub.title,
                  taskTitle: task.title,
                  completedDate: sub.completedDate,
                  dueDate: sub.dueDate
                }))
            )
            .sort((a, b) => new Date(b.completedDate) - new Date(a.completedDate));
          allItems = allRecentlyCompleted.filter(
            task => !hiddenSlideItems.recentlyCompleted.includes(task.id)
          );
        } else if (key === 'nextUp') {
          const allNextUp = slideProject.plan
            .flatMap(task =>
              task.subtasks
                .filter(sub => !sub.completed && sub.dueDate)
                .map(sub => ({
                  id: `${task.id}-${sub.id}`,
                  title: sub.title,
                  taskTitle: task.title,
                  dueDate: sub.dueDate
                }))
            )
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
          allItems = allNextUp.filter(
            task => !hiddenSlideItems.nextUp.includes(task.id)
          );
        }

        const currentCount = newCounts[key];
        const maxPossible = allItems.length;

        // If overflowing, reduce count
        if (isOverflowing && currentCount > 1) {
          newCounts[key] = Math.max(1, currentCount - 1);
          needsUpdate = true;
        }
        // If plenty of room and more items available, increase count
        else if (hasRoom && currentCount < maxPossible && currentCount < 10) {
          newCounts[key] = currentCount + 1;
          needsUpdate = true;
        }
      });

      if (needsUpdate) {
        setSlideItemCounts(newCounts);
      }
    };

    // Run check after render with a small delay to ensure DOM is updated
    const timeoutId = setTimeout(checkOverflow, 100);

    return () => clearTimeout(timeoutId);
  }, [activeView, currentSlideIndex, slideItemCounts, projects, hiddenSlideItems]);

  // Keyboard shortcuts for slides view
  useEffect(() => {
    if (activeView !== 'slides') return;

    const handleKeyDown = (e) => {
      // Don't interfere with typing in inputs/textareas
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') {
        // Only handle Ctrl+Enter when in textarea to save and exit edit mode
        if (e.ctrlKey && e.key === 'Enter' && isEditingSlide) {
          e.preventDefault();
          toggleSlideEditMode();
        }
        return;
      }

      const visibleProjects = projects.filter(p => p.status !== 'deleted');
      if (visibleProjects.length === 0) return;
      const slideProject = visibleProjects[currentSlideIndex % visibleProjects.length];

      // 'e' key: Enter edit mode
      if (e.key === 'e' && !isEditingSlide) {
        e.preventDefault();
        startEditingExecSummary(slideProject.id, slideProject.executiveUpdate || slideProject.description);
        setIsEditingSlide(true);
        // Focus will be handled by autoFocus on textarea
      }

      // 'g' key: Generate AI summary (only in edit mode)
      if (e.key === 'g' && isEditingSlide && !isGeneratingSummary && apiKey) {
        e.preventDefault();
        generateExecSummary(slideProject.id);
      }

      // Arrow keys: Navigate slides (only when not editing)
      if (!isEditingSlide) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handleSlideAdvance(-1);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleSlideAdvance(1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeView, isEditingSlide, currentSlideIndex, projects, isGeneratingSummary, apiKey]);

  const handleDailyCheckin = (projectId) => {
    if (checkinNote.trim()) {
      setProjects(projects.map(p =>
        p.id === projectId
          ? {
              ...p,
              recentActivity: [
                { id: generateActivityId(), date: new Date().toISOString(), note: checkinNote, author: loggedInUser },
                ...p.recentActivity
              ]
            }
          : p
      ));
      setCheckinNote('');

      // Move to next project or close if done
      const currentIndex = visibleProjects.findIndex(p => p.id === projectId);
      if (currentIndex < visibleProjects.length - 1) {
        setSelectedProject(visibleProjects[currentIndex + 1]);
      } else {
        setShowDailyCheckin(false);
        setSelectedProject(null);
      }
    }
  };

  const handleAddUpdate = () => {
    if (newUpdate.trim() && viewingProjectId) {
      setProjects(projects.map(p =>
        p.id === viewingProjectId
          ? {
              ...p,
              recentActivity: [
                { id: generateActivityId(), date: new Date().toISOString(), note: newUpdate, author: loggedInUser },
                ...p.recentActivity
              ]
            }
          : p
      ));
      setNewUpdate('');
    }
  };

  const handleProjectUpdateChange = (e) => {
    const text = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    setNewUpdate(text);
    setProjectUpdateCursorPosition(cursorPos);
    
    // Check if we should show tag suggestions
    const textUpToCursor = text.substring(0, cursorPos);
    const lastAtSymbol = textUpToCursor.lastIndexOf('@');
    
    if (lastAtSymbol !== -1) {
      const textAfterAt = textUpToCursor.substring(lastAtSymbol + 1);
      // Only show if there's no space after @ (we're still in the tag)
      if (!textAfterAt.includes(' ')) {
        setProjectTagSearchTerm(textAfterAt);
        setShowProjectTagSuggestions(true);
      } else {
        setShowProjectTagSuggestions(false);
      }
    } else {
      setShowProjectTagSuggestions(false);
    }
  };

  const insertProjectTag = (tag) => {
    const textBeforeCursor = newUpdate.substring(0, projectUpdateCursorPosition);
    const textAfterCursor = newUpdate.substring(projectUpdateCursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');
    
    const beforeAt = newUpdate.substring(0, lastAtSymbol);
    const tagText = `@[${tag.display}](${tag.type}:${tag.value})`;
    const newText = beforeAt + tagText + ' ' + textAfterCursor;
    
    setNewUpdate(newText);
    setShowProjectTagSuggestions(false);
    setProjectTagSearchTerm('');
    
    // Focus back on input
    if (projectUpdateInputRef && projectUpdateInputRef.current) {
      projectUpdateInputRef.current.focus();
    }
  };

  const toggleActivityEditing = () => {
    setActivityEditEnabled(prev => !prev);
  };

  const updateActivityNote = (activityId, newNote) => {
    setActivityEdits(prev => ({
      ...prev,
      [activityId]: newNote
    }));

    setProjects(prevProjects =>
      prevProjects.map(project => ({
        ...project,
        recentActivity: project.recentActivity.map(activity =>
          activity.id === activityId ? { ...activity, note: newNote } : activity
        )
      }))
    );
  };

  const deleteActivity = (activityId) => {
    setProjects(prevProjects =>
      prevProjects.map(project => ({
        ...project,
        recentActivity: project.recentActivity.filter(activity => activity.id !== activityId)
      }))
    );

    setActivityEdits(prev => {
      const { [activityId]: _, ...rest } = prev;
      return rest;
    });
  };

  const toggleTask = (taskId) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const toggleSubtaskStatus = (taskId, subtaskId) => {
    setProjects(projects.map(p =>
      p.id === viewingProjectId
        ? {
            ...p,
            plan: p.plan.map(task =>
              task.id === taskId
                ? {
                    ...task,
                    subtasks: task.subtasks.map(subtask =>
                      subtask.id === subtaskId
                        ? {
                            ...subtask,
                            status: subtask.status === 'completed' ? 'todo' : 
                                   subtask.status === 'in-progress' ? 'completed' :
                                   'in-progress',
                            completedDate: subtask.status === 'in-progress' 
                              ? new Date().toISOString().split('T')[0]
                              : subtask.status === 'completed'
                              ? undefined
                              : subtask.completedDate
                          }
                        : subtask
                    )
                  }
                : task
            )
          }
        : p
    ));
  };

  const enterEditMode = () => {
    const project = projects.find(p => p.id === viewingProjectId);
    if (project) {
      setEditValues({
        status: project.status,
        priority: project.priority,
        stakeholders: project.stakeholders.map(s => `${s.name}, ${s.team}`).join('\n'),
        description: project.description
      });
      setEditMode(true);
    }
  };

  const saveEdits = () => {
    const stakeholdersArray = editValues.stakeholders
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const parts = line.split(',').map(p => p.trim());
        return { name: parts[0] || '', team: parts[1] || '' };
      });

    setProjects(projects.map(p =>
      p.id === viewingProjectId
        ? {
            ...p,
            status: editValues.status,
            priority: editValues.priority,
            stakeholders: stakeholdersArray,
            description: editValues.description,
            recentActivity: [
              { id: generateActivityId(), date: new Date().toISOString(), note: 'Updated project details', author: loggedInUser },
              ...p.recentActivity
            ]
          }
        : p
    ));
    setEditMode(false);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setEditValues({});
  };

  const handleAddSubtask = (taskId) => {
    if (newSubtaskTitle.trim()) {
      const newSubtaskId = `${taskId}-${Date.now()}`;
      const dueDate = newSubtaskDueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      setProjects(projects.map(p =>
        p.id === viewingProjectId
          ? {
              ...p,
              plan: p.plan.map(task =>
                task.id === taskId
                  ? {
                      ...task,
                      subtasks: [
                        ...task.subtasks,
                        {
                          id: newSubtaskId,
                          title: newSubtaskTitle,
                          status: 'todo',
                          dueDate: dueDate
                        }
                      ]
                    }
                  : task
              )
            }
          : p
      ));
      setNewSubtaskTitle('');
      setNewSubtaskDueDate('');
      setAddingSubtaskTo(null);
    }
  };

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      const newTaskId = `t${Date.now()}`;
      const dueDate = newTaskDueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      setProjects(projects.map(p =>
        p.id === viewingProjectId
          ? {
              ...p,
              plan: [
                ...p.plan,
                {
                  id: newTaskId,
                  title: newTaskTitle,
                  status: 'todo',
                  dueDate: dueDate,
                  subtasks: []
                }
              ]
            }
          : p
      ));
      setNewTaskTitle('');
      setNewTaskDueDate('');
      setAddingNewTask(false);
    }
  };

  const handleUpdateDueDate = (taskId, subtaskId = null) => {
    if (tempDueDate) {
      setProjects(projects.map(p =>
        p.id === viewingProjectId
          ? {
              ...p,
              plan: p.plan.map(task =>
                task.id === taskId
                  ? subtaskId
                    ? {
                        ...task,
                        subtasks: task.subtasks.map(st =>
                          st.id === subtaskId
                            ? { ...st, dueDate: tempDueDate }
                            : st
                        )
                      }
                    : { ...task, dueDate: tempDueDate }
                  : task
              )
            }
          : p
      ));
      setEditingDueDate(null);
      setTempDueDate('');
    }
  };

  const handleSubtaskComment = (taskId, subtaskId, taskTitle, subtaskTitle) => {
    if (subtaskComment.trim()) {
      setProjects(projects.map(p =>
        p.id === viewingProjectId
          ? {
              ...p,
              recentActivity: [
                {
                  id: generateActivityId(),
                  date: new Date().toISOString(),
                  note: subtaskComment, // Just the comment text, not the prefix
                  author: loggedInUser,
                  taskContext: { taskId, subtaskId, taskTitle, subtaskTitle }
                },
                ...p.recentActivity
              ]
            }
          : p
      ));
      setSubtaskComment('');
      setCommentingOn(null);
    }
  };

  const toggleTaskEditing = () => {
    setTaskEditEnabled(prev => !prev);
    if (taskEditEnabled) {
      setEditingTask(null);
      setEditingSubtask(null);
    }
  };

  const deleteTask = (taskId) => {
    setProjects(prevProjects =>
      prevProjects.map(project =>
        project.id === viewingProjectId
          ? {
              ...project,
              plan: project.plan.filter(task => task.id !== taskId)
            }
          : project
      )
    );
  };

  const deleteSubtask = (taskId, subtaskId) => {
    setProjects(prevProjects =>
      prevProjects.map(project =>
        project.id === viewingProjectId
          ? {
              ...project,
              plan: project.plan.map(task =>
                task.id === taskId
                  ? {
                      ...task,
                      subtasks: task.subtasks.filter(st => st.id !== subtaskId)
                    }
                  : task
              )
            }
          : project
      )
    );
  };

  const startEditingTask = (taskId, currentTitle) => {
    setEditingTask(taskId);
    setEditingTaskTitle(currentTitle);
  };

  const saveTaskEdit = (taskId) => {
    if (editingTaskTitle.trim()) {
      setProjects(prevProjects =>
        prevProjects.map(project =>
          project.id === viewingProjectId
            ? {
                ...project,
                plan: project.plan.map(task =>
                  task.id === taskId
                    ? { ...task, title: editingTaskTitle }
                    : task
                )
              }
            : project
        )
      );
    }
    setEditingTask(null);
    setEditingTaskTitle('');
  };

  const startEditingSubtask = (subtaskId, currentTitle) => {
    setEditingSubtask(subtaskId);
    setEditingSubtaskTitle(currentTitle);
  };

  const saveSubtaskEdit = (taskId, subtaskId) => {
    if (editingSubtaskTitle.trim()) {
      setProjects(prevProjects =>
        prevProjects.map(project =>
          project.id === viewingProjectId
            ? {
                ...project,
                plan: project.plan.map(task =>
                  task.id === taskId
                    ? {
                        ...task,
                        subtasks: task.subtasks.map(st =>
                          st.id === subtaskId
                            ? { ...st, title: editingSubtaskTitle }
                            : st
                        )
                      }
                    : task
                )
              }
            : project
        )
      );
    }
    setEditingSubtask(null);
    setEditingSubtaskTitle('');
  };

  const startEditingExecSummary = (projectId, currentDescription) => {
    setEditingExecSummary(projectId);
    setExecSummaryDraft(currentDescription || '');
  };

  const saveExecSummary = (projectId) => {
    setProjects(prevProjects =>
      prevProjects.map(project =>
        project.id === projectId
          ? { ...project, executiveUpdate: execSummaryDraft }
          : project
      )
    );
    setEditingExecSummary(null);
    setExecSummaryDraft('');
  };

  const generateExecSummary = async (projectId) => {
    const project = projects.find(p => p.id === projectId);
    if (!project || !apiKey) return;

    setIsGeneratingSummary(true);
    try {
      // Gather recent and upcoming project data
      const recentActivities = project.recentActivity.slice(0, 10).map(a => a.note).join('; ');
      const upcomingTasks = project.plan
        .flatMap(task => task.subtasks)
        .filter(st => {
          const dueDate = new Date(st.dueDate);
          const now = new Date();
          return dueDate > now;
        })
        .slice(0, 10)
        .map(st => st.title)
        .join('; ');

      const prompt = `Based on this project data, write a concise 2-3 sentence executive summary:

Project: ${project.name}
Status: ${project.status}
Priority: ${project.priority}
Recent Activities: ${recentActivities || 'None'}
Upcoming Tasks: ${upcomingTasks || 'None'}

Write a professional executive summary that highlights the project's current state and key activities.`;

      const response = await callOpenAIChat(apiKey, [
        { role: 'user', content: prompt }
      ]);

      setProjects(prevProjects =>
        prevProjects.map(p =>
          p.id === projectId
            ? { ...p, executiveUpdate: response }
            : p
        )
      );
    } catch (error) {
      console.error('Error generating summary:', error);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const toggleSlideEditMode = () => {
    const wasEditing = isEditingSlide;
    setIsEditingSlide(prev => !prev);

    if (wasEditing) {
      // Save exec summary when exiting edit mode
      if (editingExecSummary) {
        const projectId = editingExecSummary;
        setProjects(prevProjects =>
          prevProjects.map(project =>
            project.id === projectId
              ? { ...project, executiveUpdate: execSummaryDraft }
              : project
          )
        );
        setEditingExecSummary(null);
        setExecSummaryDraft('');
      }

      // Don't reset hidden items - keep the changes persistent
    }
  };

  const hideSlideItem = (category, itemId) => {
    setHiddenSlideItems(prev => ({
      ...prev,
      [category]: [...prev[category], itemId]
    }));
  };

  const formatDueDate = (dateString, status, completedDate) => {
    // If completed, show completion date with green checkmark
    if (status === 'completed' && completedDate) {
      const date = new Date(completedDate);
      return {
        text: `Done ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        color: 'var(--sage)',
        isOverdue: false,
        isCompleted: true,
        formattedDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        isDueSoon: false
      };
    }

    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(date);
    dueDate.setHours(0, 0, 0, 0);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const isDueSoon = diffDays >= 0 && diffDays <= 7;

    if (diffDays < 0) {
      return {
        text: `${Math.abs(diffDays)}d overdue`,
        color: 'var(--coral)',
        isOverdue: true,
        isCompleted: false,
        formattedDate,
        isDueSoon
      };
    } else if (diffDays === 0) {
      return { text: 'Due today', color: 'var(--amber)', isOverdue: false, isCompleted: false, formattedDate, isDueSoon };
    } else if (diffDays === 1) {
      return { text: 'Due tomorrow', color: 'var(--amber)', isOverdue: false, isCompleted: false, formattedDate, isDueSoon };
    } else if (diffDays <= 7) {
      return { text: `Due in ${diffDays}d`, color: 'var(--stone)', isOverdue: false, isCompleted: false, formattedDate, isDueSoon };
    } else {
      return { text: formattedDate, color: 'var(--stone)', isOverdue: false, isCompleted: false, formattedDate, isDueSoon };
    }
  };

  const getProjectDueSoonTasks = (project) => {
    const tasks = [];

    project.plan.forEach(task => {
      task.subtasks.forEach(subtask => {
        if (subtask.status !== 'completed') {
          const dueDateInfo = formatDueDate(subtask.dueDate, subtask.status, subtask.completedDate);
          if (dueDateInfo.isOverdue || dueDateInfo.isDueSoon) {
            tasks.push({
              title: subtask.title,
              taskTitle: task.title,
              dueDate: subtask.dueDate,
              dueDateInfo
            });
          }
        }
      });
    });

    return tasks.sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0));
  };

  const getRecentlyCompletedTasks = (project) => {
    const tasks = [];

    project.plan.forEach(task => {
      task.subtasks.forEach(subtask => {
        if (subtask.status === 'completed' && subtask.completedDate) {
          const dueDateInfo = formatDueDate(subtask.dueDate, subtask.status, subtask.completedDate);
          tasks.push({
            title: subtask.title,
            taskTitle: task.title,
            completedDate: subtask.completedDate,
            dueDateInfo,
            id: subtask.id
          });
        }
      });
    });

    // Sort by completion date, most recent first
    return tasks.sort((a, b) => new Date(b.completedDate || 0) - new Date(a.completedDate || 0));
  };

  const getNextUpTasks = (project) => {
    const tasks = [];

    project.plan.forEach(task => {
      task.subtasks.forEach(subtask => {
        if (subtask.status !== 'completed' && subtask.dueDate) {
          const dueDateInfo = formatDueDate(subtask.dueDate, subtask.status, subtask.completedDate);
          tasks.push({
            title: subtask.title,
            taskTitle: task.title,
            dueDate: subtask.dueDate,
            dueDateInfo,
            id: subtask.id
          });
        }
      });
    });

    // Sort by due date, earliest first
    return tasks.sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0));
  };

  // Get all possible tags for autocomplete
  const getAllTags = () => {
    const tags = [];

    // Add all unique stakeholders
    const allStakeholders = new Set();
    visibleProjects.forEach(p => {
      p.stakeholders.forEach(s => {
        const stakeholderString = `${s.name} (${s.team})`;
        allStakeholders.add(stakeholderString);
      });
    });
    allStakeholders.forEach(name => {
      tags.push({ type: 'person', value: name, display: name });
    });
    
    // Add all projects
    visibleProjects.forEach(p => {
      tags.push({ type: 'project', value: p.id, display: p.name });

      // Add all tasks and subtasks
      p.plan.forEach(task => {
        tags.push({ type: 'task', value: task.id, display: `${p.name} → ${task.title}`, projectId: p.id });
        
        task.subtasks.forEach(subtask => {
          tags.push({ 
            type: 'subtask', 
            value: subtask.id, 
            display: `${p.name} → ${task.title} → ${subtask.title}`,
            projectId: p.id,
            taskId: task.id
          });
        });
      });
    });
    
    return tags;
  };

  const handleTimelineUpdateChange = (e) => {
    const text = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    setTimelineUpdate(text);
    setCursorPosition(cursorPos);
    
    // Check if we should show tag suggestions
    const textUpToCursor = text.substring(0, cursorPos);
    const lastAtSymbol = textUpToCursor.lastIndexOf('@');
    
    if (lastAtSymbol !== -1) {
      const textAfterAt = textUpToCursor.substring(lastAtSymbol + 1);
      // Only show if there's no space after @ (we're still in the tag)
      if (!textAfterAt.includes(' ')) {
        setTagSearchTerm(textAfterAt);
        setShowTagSuggestions(true);
      } else {
        setShowTagSuggestions(false);
      }
    } else {
      setShowTagSuggestions(false);
    }
  };

  const insertTag = (tag, inputRef) => {
    const textBeforeCursor = timelineUpdate.substring(0, cursorPosition);
    const textAfterCursor = timelineUpdate.substring(cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');
    
    const beforeAt = timelineUpdate.substring(0, lastAtSymbol);
    const tagText = `@[${tag.display}](${tag.type}:${tag.value})`;
    const newText = beforeAt + tagText + ' ' + textAfterCursor;
    
    setTimelineUpdate(newText);
    setShowTagSuggestions(false);
    setTagSearchTerm('');
    
    // Focus back on input
    if (inputRef && inputRef.current) {
      inputRef.current.focus();
    }
  };

  const parseTaggedText = (text) => {
    if (!text) return [];
    
    // Parse text with tags in format @[Display Name](type:value)
    const parts = [];
    let currentIndex = 0;
    const tagRegex = /@\[([^\]]+)\]\(([^:]+):([^)]+)\)/g;
    let match;
    
    while ((match = tagRegex.exec(text)) !== null) {
      // Add text before the tag
      if (match.index > currentIndex) {
        parts.push({
          type: 'text',
          content: text.substring(currentIndex, match.index)
        });
      }
      
      // Add the tag
      parts.push({
        type: 'tag',
        tagType: match[2],
        display: match[1],
        value: match[3]
      });
      
      currentIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (currentIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.substring(currentIndex)
      });
    }
    
    return parts.length > 0 ? parts : [{ type: 'text', content: text }];
  };

  const cloneProjectDeep = (project) => ({
    ...project,
    plan: project.plan.map(task => ({
      ...task,
      subtasks: (task.subtasks || []).map(subtask => ({ ...subtask }))
    })),
    recentActivity: [...project.recentActivity]
  });

  const resetNewProjectForm = () => {
    setNewProjectName('');
    setNewProjectDescription('');
    setNewProjectPriority('medium');
    setNewProjectStatus('planning');
    setNewProjectTargetDate('');
    setNewProjectStakeholders('');
  };

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;

    const stakeholderEntries = newProjectStakeholders
      .split(',')
      .map(name => name.trim())
      .filter(Boolean)
      .map(name => ({ name, team: 'Contributor' }));

    const createdAt = new Date().toISOString();
    const newId = `proj-${Date.now()}`;
    const newProject = {
      id: newId,
      name: newProjectName.trim(),
      stakeholders: stakeholderEntries.length > 0
        ? stakeholderEntries
        : [{ name: loggedInUser || 'You', team: 'Owner' }],
      status: newProjectStatus,
      priority: newProjectPriority,
      progress: 0,
      lastUpdate: newProjectDescription ? newProjectDescription.slice(0, 120) : 'New project created',
      description: newProjectDescription,
      startDate: createdAt.split('T')[0],
      targetDate: newProjectTargetDate,
      plan: [],
      recentActivity: newProjectDescription
        ? [{ id: generateActivityId(), date: createdAt, note: newProjectDescription, author: loggedInUser || 'You' }]
        : []
    };

    setProjects(prev => [...prev, newProject]);
    setShowNewProject(false);
    resetNewProjectForm();
    setViewingProjectId(newProject.id);
    setActiveView('overview');
  };

  const buildThrustContext = () => {
    return projects.map(project => ({
      id: project.id,
      name: project.name,
      status: project.status,
      progress: project.progress,
      priority: project.priority,
      lastUpdate: project.lastUpdate,
      targetDate: project.targetDate,
      plan: project.plan.map(task => ({
        id: task.id,
        title: task.title,
        status: task.status,
        dueDate: task.dueDate,
        subtasks: (task.subtasks || []).map(subtask => ({
          id: subtask.id,
          title: subtask.title,
          status: subtask.status,
          dueDate: subtask.dueDate
        }))
      })),
      recentActivity: project.recentActivity.slice(0, 3)
    }));
  };

  const parseAssistantResponse = (content) => {
    // With structured output, content should already be valid JSON
    // but we still handle markdown code blocks as fallback
    const match = content.match(/```json\s*([\s\S]*?)```/);
    const maybeJson = match ? match[1] : content;

    try {
      const parsed = JSON.parse(maybeJson);
      return {
        display: parsed.response || parsed.message || parsed.summary || content,
        actions: Array.isArray(parsed.actions) ? parsed.actions : []
      };
    } catch (error) {
      console.error('Failed to parse LLM response as JSON:', error, 'Content:', content);
      // Return content as display message with empty actions
      // The validation will catch any issues with missing actions
      return { display: content, actions: [] };
    }
  };

  const resolveMomentumProjectRef = (target) => {
    if (!target) return null;
    const lowerTarget = `${target}`.toLowerCase();
    return projects.find(project => `${project.id}` === `${target}` || project.name.toLowerCase() === lowerTarget) || null;
  };

  const validateThrustActions = (actions = []) => {
    const errors = [];

    if (!Array.isArray(actions)) {
      return { validActions: [], errors: ['Momentum returned an invalid actions payload (not an array).'] };
    }

    const validActions = [];

    actions.forEach((action, idx) => {
      if (!action || typeof action !== 'object') {
        errors.push(`Action ${idx + 1} was not an object.`);
        return;
      }

      if (!action.type) {
        errors.push(`Action ${idx + 1} is missing a type.`);
        return;
      }

      if (!supportedMomentumActions.includes(action.type)) {
        errors.push(`Action ${idx + 1} uses unsupported type "${action.type}".`);
        return;
      }

      const projectRef = action.projectId ?? action.projectName;
      if (!projectRef) {
        errors.push(`Action ${idx + 1} (${action.type}) is missing a projectId or projectName.`);
        return;
      }

      const resolvedProject = resolveMomentumProjectRef(projectRef);
      if (!resolvedProject) {
        errors.push(`Action ${idx + 1} (${action.type}) references unknown project "${projectRef}".`);
        return;
      }

      validActions.push({
        ...action,
        projectId: resolvedProject.id,
        projectName: resolvedProject.name
      });
    });

    return { validActions, errors };
  };

  const rollbackDeltas = (deltas) => {
    if (!deltas || deltas.length === 0) return;

    setProjects(prevProjects => {
      const working = prevProjects.map(cloneProjectDeep);

      deltas.slice().reverse().forEach(delta => {
        const project = working.find(p => `${p.id}` === `${delta.projectId}`);
        if (!project) return;

        switch (delta.type) {
          case 'remove_activity':
            project.recentActivity = project.recentActivity.filter(activity => activity.id !== delta.activityId);
            break;
          case 'remove_task':
            project.plan = project.plan.filter(task => task.id !== delta.taskId);
            break;
          case 'restore_task':
            project.plan = project.plan.map(task => task.id === delta.taskId ? { ...task, ...delta.previous } : task);
            break;
          case 'remove_subtask':
            project.plan = project.plan.map(task =>
              task.id === delta.taskId
                ? { ...task, subtasks: task.subtasks.filter(st => st.id !== delta.subtaskId) }
                : task
            );
            break;
          case 'restore_subtask':
            project.plan = project.plan.map(task =>
              task.id === delta.taskId
                ? {
                    ...task,
                    subtasks: task.subtasks.map(subtask =>
                      subtask.id === delta.subtaskId ? { ...subtask, ...delta.previous } : subtask
                    )
                  }
                : task
            );
            break;
          case 'restore_project':
            project.status = delta.previous.status;
            project.progress = delta.previous.progress;
            project.targetDate = delta.previous.targetDate;
            project.lastUpdate = delta.previous.lastUpdate;
            break;
          default:
            break;
        }
      });

      return working;
    });
  };

  const applyThrustActions = (actions = []) => {
    if (!actions.length) {
      return { deltas: [], actionResults: [] };
    }

    const result = { deltas: [], actionResults: [] };

    setProjects(prevProjects => {
      const workingProjects = prevProjects.map(cloneProjectDeep);

      const appendActionResult = (label, detail, deltas = []) => {
        result.actionResults.push({
          label: label || 'Action processed',
          detail: detail || 'No additional details provided.',
          deltas
        });
        result.deltas.push(...deltas);
      };

      const resolveProject = (target) => {
        if (!target) return null;
        const lowerTarget = `${target}`.toLowerCase();
        return workingProjects.find(p => `${p.id}` === `${target}` || p.name.toLowerCase() === lowerTarget);
      };

      const resolveTask = (project, target) => {
        if (!project || !target) return null;
        const lowerTarget = `${target}`.toLowerCase();
        return project.plan.find(task => `${task.id}` === `${target}` || task.title.toLowerCase() === lowerTarget);
      };

      const describeDueDate = (date) => date ? `due ${new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'no due date set';

      actions.forEach(action => {
        const project = resolveProject(action.projectId || action.projectName);
        const actionDeltas = [];
        let label = '';
        let detail = '';

        if (!project) {
          appendActionResult('Skipped action: unknown project', 'Skipped action because the project was not found.', actionDeltas);
          return;
        }

        switch (action.type) {
          case 'comment': {
            const activityId = generateActivityId();
            const newActivity = {
              id: activityId,
              date: new Date().toISOString(),
              note: action.note || action.content || 'Update logged by Momentum',
              author: action.author || 'Momentum'
            };
            project.recentActivity = [newActivity, ...project.recentActivity];
            actionDeltas.push({ type: 'remove_activity', projectId: project.id, activityId });
            label = `Commented on ${project.name}`;
            detail = `Comment on ${project.name}: "${newActivity.note}" by ${newActivity.author}`;
            break;
          }
          case 'add_task': {
            const taskId = action.taskId || `ai-task-${Math.random().toString(36).slice(2, 7)}`;
            const newTask = {
              id: taskId,
              title: action.title || 'New task',
              status: action.status || 'todo',
              dueDate: action.dueDate,
              completedDate: action.completedDate,
              subtasks: (action.subtasks || []).map(subtask => ({
                id: subtask.id || `ai-subtask-${Math.random().toString(36).slice(2, 7)}`,
                title: subtask.title || 'New subtask',
                status: subtask.status || 'todo',
                dueDate: subtask.dueDate
              }))
            };
            project.plan = [...project.plan, newTask];
            actionDeltas.push({ type: 'remove_task', projectId: project.id, taskId });
            label = `Added task "${newTask.title}" to ${project.name}`;
            detail = `Added task "${newTask.title}" (${describeDueDate(newTask.dueDate)}) to ${project.name}`;
            break;
          }
          case 'update_task': {
            const task = resolveTask(project, action.taskId || action.taskTitle);
            if (!task) {
              label = `Skipped action: missing task in ${project.name}`;
              detail = `Skipped task update in ${project.name} because the task was not found.`;
              break;
            }

            const previous = { ...task };
            const changes = [];

            if (action.title && action.title !== task.title) {
              changes.push(`renamed to "${action.title}"`);
              task.title = action.title;
            }
            if (action.status && action.status !== task.status) {
              changes.push(`status ${task.status} → ${action.status}`);
              task.status = action.status;
            }
            if (action.dueDate && action.dueDate !== task.dueDate) {
              changes.push(`due date ${task.dueDate || 'unset'} → ${action.dueDate}`);
              task.dueDate = action.dueDate;
            }
            if (action.completedDate && action.completedDate !== task.completedDate) {
              changes.push(`completed ${action.completedDate}`);
              task.completedDate = action.completedDate;
            }

            actionDeltas.push({ type: 'restore_task', projectId: project.id, taskId: task.id, previous });
            label = `Updated task "${task.title}" in ${project.name}`;
            detail = `Updated task "${task.title}" in ${project.name}: ${changes.join('; ') || 'no tracked changes'}`;
            break;
          }
          case 'add_subtask': {
            const task = resolveTask(project, action.taskId || action.taskTitle);
            if (!task) {
              label = `Skipped action: missing parent task in ${project.name}`;
              detail = `Skipped subtask add in ${project.name} because the parent task was not found.`;
              break;
            }

            const subtaskId = action.subtaskId || `ai-subtask-${Math.random().toString(36).slice(2, 7)}`;
            const newSubtask = {
              id: subtaskId,
              title: action.title || action.subtaskTitle || 'New subtask',
              status: action.status || 'todo',
              dueDate: action.dueDate
            };
            task.subtasks = [...task.subtasks, newSubtask];
            actionDeltas.push({ type: 'remove_subtask', projectId: project.id, taskId: task.id, subtaskId });
            label = `Added subtask "${newSubtask.title}" to ${task.title}`;
            detail = `Added subtask "${newSubtask.title}" (${describeDueDate(newSubtask.dueDate)}) under ${task.title}`;
            break;
          }
          case 'update_subtask': {
            const task = resolveTask(project, action.taskId || action.taskTitle);
            if (!task) {
              label = `Skipped action: missing parent task in ${project.name}`;
              detail = `Skipped subtask update in ${project.name} because the parent task was not found.`;
              break;
            }
            const subtask = task.subtasks.find(st => `${st.id}` === `${action.subtaskId}` || st.title.toLowerCase() === `${action.subtaskTitle || action.title || ''}`.toLowerCase());
            if (!subtask) {
              label = `Skipped action: missing subtask in ${task.title}`;
              detail = `Skipped subtask update because no subtask matched in ${task.title}.`;
              break;
            }

            const previous = { ...subtask };
            const changes = [];

            if ((action.title || action.subtaskTitle) && (action.title || action.subtaskTitle) !== subtask.title) {
              changes.push(`renamed to "${action.title || action.subtaskTitle}"`);
              subtask.title = action.title || action.subtaskTitle;
            }
            if (action.status && action.status !== subtask.status) {
              changes.push(`status ${subtask.status} → ${action.status}`);
              subtask.status = action.status;
            }
            if (action.dueDate && action.dueDate !== subtask.dueDate) {
              changes.push(`due date ${subtask.dueDate || 'unset'} → ${action.dueDate}`);
              subtask.dueDate = action.dueDate;
            }
            if (action.completedDate && action.completedDate !== subtask.completedDate) {
              changes.push(`completed ${action.completedDate}`);
              subtask.completedDate = action.completedDate;
            }

            actionDeltas.push({ type: 'restore_subtask', projectId: project.id, taskId: task.id, subtaskId: subtask.id, previous });
            label = `Updated subtask "${subtask.title}" in ${task.title}`;
            detail = `Updated subtask "${subtask.title}" in ${task.title}: ${changes.join('; ') || 'no tracked changes'}`;
            break;
          }
          case 'update_project': {
            const previous = {
              status: project.status,
              progress: project.progress,
              targetDate: project.targetDate,
              lastUpdate: project.lastUpdate
            };
            const changes = [];

            if (action.status && action.status !== project.status) {
              changes.push(`status ${project.status} → ${action.status}`);
              project.status = action.status;
            }
            if (typeof action.progress === 'number' && action.progress !== project.progress) {
              changes.push(`progress ${project.progress}% → ${action.progress}%`);
              project.progress = action.progress;
            }
            if (action.targetDate && action.targetDate !== project.targetDate) {
              changes.push(`target ${project.targetDate || 'unset'} → ${action.targetDate}`);
              project.targetDate = action.targetDate;
            }
            if (action.lastUpdate && action.lastUpdate !== project.lastUpdate) {
              changes.push(`last update → ${action.lastUpdate}`);
              project.lastUpdate = action.lastUpdate;
            }

            actionDeltas.push({ type: 'restore_project', projectId: project.id, previous });
            label = `Updated ${project.name}`;
            detail = `Updated ${project.name}: ${changes.join('; ') || 'no tracked changes noted'}`;
            break;
          }
          default:
            label = 'Skipped action: unsupported type';
            detail = `Skipped unsupported action type: ${action.type}`;
        }

        appendActionResult(label, detail, actionDeltas);
      });

      return workingProjects;
    });

    return {
      deltas: result.deltas,
      actionResults: result.actionResults
    };
  };

  const describeActionPreview = (action) => {
    const project = projects.find(p => `${p.id}` === `${action.projectId}` || p.name.toLowerCase() === `${action.projectName || ''}`.toLowerCase());
    const projectName = project?.name || action.projectName || `Project ${action.projectId || '?'}`;
    const dueLabel = action.dueDate ? `due ${new Date(action.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'no due date set';

    switch (action.type) {
      case 'comment':
        return `Comment on ${projectName}: "${action.note || action.content || ''}"`;
      case 'add_task':
        return `Add task "${action.title || 'New task'}" (${dueLabel}) to ${projectName}`;
      case 'update_task':
        return `Update task "${action.title || action.taskTitle || action.taskId || ''}" in ${projectName}`;
      case 'add_subtask':
        return `Add subtask "${action.subtaskTitle || action.title || ''}" (${dueLabel}) under ${action.taskTitle || action.taskId || 'task'} in ${projectName}`;
      case 'update_subtask':
        return `Update subtask "${action.subtaskTitle || action.title || action.subtaskId || ''}" in ${projectName}`;
      case 'update_project':
        return `Update project ${projectName}: status/progress/date tweaks`;
      default:
        return `Action queued: ${action.type || 'unknown'} for ${projectName}`;
    }
  };

  const getAllStakeholders = () => {
    const stakeholderMap = new Map();
    adminUsers.forEach(admin => {
      stakeholderMap.set(admin.name, admin);
    });
    projects.forEach(project => {
      project.stakeholders.forEach(stakeholder => {
        if (!stakeholderMap.has(stakeholder.name)) {
          stakeholderMap.set(stakeholder.name, stakeholder);
        }
      });
    });
    return Array.from(stakeholderMap.values());
  };

  const isAdminUser = (name) => adminUsers.some(admin => admin.name === name);

  const visibleProjects = projects.filter(project =>
    isAdminUser(loggedInUser) || project.stakeholders.some(stakeholder => stakeholder.name === loggedInUser)
  );

  const activeProjects = visibleProjects.filter(project => !['completed', 'closed'].includes(project.status));
  const completedProjects = visibleProjects.filter(project => ['completed', 'closed'].includes(project.status));

  const handleAddTimelineUpdate = () => {
    if (timelineUpdate.trim()) {
      const targetProjectId = viewingProjectId || visibleProjects[0]?.id;

      if (targetProjectId) {
        setProjects(projects.map(p =>
          p.id === targetProjectId
            ? {
                ...p,
                recentActivity: [
                  { id: generateActivityId(), date: new Date().toISOString(), note: timelineUpdate, author: loggedInUser },
                  ...p.recentActivity
                ]
              }
            : p
        ));
      }
      
      setTimelineUpdate('');
    }
  };

  const openDeleteProject = (project) => {
    if (!projectDeletionEnabled) return;
    setProjectToDelete(project);
    setDeleteConfirmation('');
  };

  const closeDeleteModal = () => {
    setProjectToDelete(null);
    setDeleteConfirmation('');
  };

  const handleConfirmDeleteProject = () => {
    if (!projectToDelete || deleteConfirmation.trim() !== projectToDelete.name) return;

    setProjects(prevProjects => prevProjects.filter(p => p.id !== projectToDelete.id));

    if (viewingProjectId === projectToDelete.id) {
      setViewingProjectId(null);
    }

    if (selectedProject?.id === projectToDelete.id) {
      setSelectedProject(null);
    }

    setProjectToDelete(null);
    setDeleteConfirmation('');
  };

  const getAllActivities = () => {
    const allActivities = [];

    visibleProjects.forEach(project => {
      project.recentActivity.forEach(activity => {
        allActivities.push({
          ...activity,
          projectId: project.id,
          projectName: project.name
        });
      });
    });
    
    // Sort by date, newest first
    return allActivities.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const requestMomentumActions = async (messages, attempt = 1) => {
    const maxAttempts = 3;
    const { content } = await callOpenAIChat({
      apiKey,
      messages,
      responseFormat: momentumResponseSchema
    });
    const parsed = parseAssistantResponse(content);
    const { validActions, errors } = validateThrustActions(parsed.actions);

    if (errors.length === 0) {
      return { parsed: { ...parsed, actions: validActions }, content, attempt };
    }

    if (attempt >= maxAttempts) {
      throw new Error(`Momentum response was invalid after ${maxAttempts} attempts: ${errors.join(' ')}`);
    }

    const retryMessages = [
      ...messages,
      { role: 'assistant', content },
      {
        role: 'system',
        content: `Your previous response could not be applied because ${errors.join('; ')}. Use only these action types: ${supportedMomentumActions.join(', ')}. Each action must include a valid projectId or projectName that exists in the provided portfolio. Respond only with JSON containing "response" and "actions".`
      }
    ];

    return requestMomentumActions(retryMessages, attempt + 1);
  };

  const handleSendThrustMessage = async () => {
    if (!thrustDraft.trim() || thrustIsRequesting) return;

    const userMessage = {
      id: generateActivityId(),
      role: 'user',
      author: loggedInUser || 'You',
      note: thrustDraft,
      date: new Date().toISOString(),
    };

    const nextMessages = [...thrustMessages, userMessage];
    setThrustMessages(nextMessages);
    setThrustDraft('');
    setThrustError('');
    setThrustPendingActions([]);

    if (!apiKey) {
      setThrustError('Add an API key in Settings to chat with Momentum.');
      return;
    }

    const systemPrompt = `You are Momentum, an experienced technical project manager using dialectic project planning. Be concise but explicit about what you are doing, offer guiding prompts such as "have you thought of X yet?", and rely on the provided project data for context. Respond with a JSON object containing a 'response' string and an 'actions' array.

Supported atomic actions (never combine multiple changes into one action):
- comment: log a project activity. Fields: projectId, note (or content), author (optional).
- add_task: create a new task in a project. Fields: projectId, title, dueDate (optional), status (todo/in-progress/completed), completedDate (optional).
- update_task: adjust a task. Fields: projectId, taskId or taskTitle, title (optional), status, dueDate, completedDate.
- add_subtask: create a subtask. Fields: projectId, taskId or taskTitle, subtaskTitle or title, status, dueDate.
- update_subtask: adjust a subtask. Fields: projectId, taskId or taskTitle, subtaskId or subtaskTitle, title, status, dueDate, completedDate.
- update_project: change project status/progress/dates. Fields: projectId, status, progress (0-100), targetDate, lastUpdate.

Keep tool calls granular (one discrete change per action), explain each action clearly, and ensure every action references the correct project.`;
    const context = buildThrustContext();
    const orderedMessages = [...nextMessages].sort((a, b) => new Date(a.date) - new Date(b.date));
    const messages = [
      { role: 'system', content: `${systemPrompt}\n\nCurrent portfolio context: ${JSON.stringify(context)}` },
      ...orderedMessages.map(message => ({
        role: message.role === 'user' ? 'user' : 'assistant',
        content: message.note || message.content || ''
      }))
    ];

    setThrustIsRequesting(true);
    setThrustRequestStart(Date.now());
    const responseId = generateActivityId();

    try {
      const { parsed, content } = await requestMomentumActions(messages);
      setThrustPendingActions(parsed.actions || []);
      const { deltas, actionResults } = applyThrustActions(parsed.actions || []);

      const assistantMessage = {
        id: responseId,
        role: 'assistant',
        author: 'Momentum',
        note: parsed.display || content,
        date: new Date().toISOString(),
        actionResults,
        deltas
      };

      setThrustMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      setThrustError(error?.message || 'Failed to send Momentum request.');
    } finally {
      setThrustRequestStart(null);
      setThrustPendingActions([]);
      setThrustIsRequesting(false);
    }
  };

  const getThrustConversation = () => {
    return [...thrustMessages].sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const undoThrustAction = (messageId, actionIndex) => {
    setThrustMessages(prev => prev.map(message => {
      if (message.id !== messageId || !message.actionResults || !message.actionResults[actionIndex]) {
        return message;
      }

      const targetAction = message.actionResults[actionIndex];
      if (targetAction.undone || !targetAction.deltas || targetAction.deltas.length === 0) {
        return message;
      }

      rollbackDeltas(targetAction.deltas);

      const updatedActions = message.actionResults.map((action, idx) =>
        idx === actionIndex ? { ...action, undone: true } : action
      );

      const remainingDeltas = (message.deltas || []).filter(delta => !targetAction.deltas.includes(delta));

      return {
        ...message,
        actionResults: updatedActions,
        deltas: remainingDeltas
      };
    }));
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
             ' at ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
  };

  const formatElapsedTime = (ms) => {
    const safeMs = Math.max(0, ms || 0);
    const totalSeconds = Math.floor(safeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const getStatusIcon = (status) => {
    if (status === 'completed') {
      return <CheckCircle2 size={16} style={{ color: 'var(--sage)' }} />;
    } else if (status === 'in-progress') {
      return <Clock size={16} style={{ color: 'var(--amber)' }} />;
    } else {
      return <Circle size={16} style={{ color: 'var(--stone)' }} />;
    }
  };

  const calculateTaskProgress = (task) => {
    if (!task.subtasks || task.subtasks.length === 0) return 0;
    const completed = task.subtasks.filter(st => st.status === 'completed').length;
    return Math.round((completed / task.subtasks.length) * 100);
  };

  const viewingProject = viewingProjectId ? projects.find(p => p.id === viewingProjectId) : null;

  useEffect(() => {
    const stakeholders = getAllStakeholders();
    if (!loggedInUser && stakeholders.length > 0) {
      setLoggedInUser(stakeholders[0].name);
    } else if (loggedInUser && stakeholders.length > 0 && !stakeholders.some(s => s.name === loggedInUser)) {
      setLoggedInUser(stakeholders[0].name);
    }
  }, [projects, loggedInUser]);

  useEffect(() => {
    if (viewingProjectId && !visibleProjects.some(p => p.id === viewingProjectId)) {
      setViewingProjectId(null);
    }
  }, [loggedInUser, viewingProjectId, visibleProjects]);

  useEffect(() => {
    if (!showDailyCheckin) return;

    if (visibleProjects.length > 0 && (!selectedProject || !visibleProjects.some(p => p.id === selectedProject.id))) {
      setSelectedProject(visibleProjects[0]);
    }

    if (showDailyCheckin && visibleProjects.length === 0) {
      setShowDailyCheckin(false);
      setSelectedProject(null);
    }
  }, [showDailyCheckin, visibleProjects, selectedProject]);

  useEffect(() => {
    if (visibleProjects.length === 0) {
      setExpandedMomentumProjects(prev => {
        if (Object.keys(prev).length === 0) {
          return prev;
        }
        return {};
      });
      return;
    }

    setExpandedMomentumProjects(prev => {
      const visibleIds = new Set(visibleProjects.map(p => String(p.id)));
      const filteredPrev = Object.fromEntries(
        Object.entries(prev).filter(([id]) => visibleIds.has(id))
      );

      const next = { ...filteredPrev };

      if (Object.keys(prev).length === 0) {
        visibleProjects.forEach(project => {
          next[String(project.id)] = true;
        });
      } else {
        visibleProjects.forEach(project => {
          const projectId = String(project.id);
          if (!(projectId in next)) {
            next[projectId] = true;
          }
        });
      }

      const nextKeys = Object.keys(next);

      const isSame =
        Object.keys(prev).length === nextKeys.length &&
        nextKeys.every(key => prev[key] === next[key]);

      if (isSame) {
        return prev;
      }

      return next;
    });
  }, [visibleProjects]);

  useEffect(() => {
    if (visibleProjects.length === 0) {
      setCurrentSlideIndex(0);
      return;
    }

    setCurrentSlideIndex(prev => Math.min(prev, visibleProjects.length - 1));
  }, [visibleProjects]);

  useEffect(() => {
    if (activeView === 'slides' && visibleProjects.length > 0) {
      setCurrentSlideIndex(0);
    }
  }, [activeView, visibleProjects.length]);

  useEffect(() => {
    if (thrustIsRequesting && thrustRequestStart) {
      const timer = setInterval(() => {
        setThrustElapsedMs(Date.now() - thrustRequestStart);
      }, 250);

      return () => clearInterval(timer);
    }

    setThrustElapsedMs(0);
  }, [thrustIsRequesting, thrustRequestStart]);

  useEffect(() => {
    // Auto-expand all tasks when viewing a project
    if (viewingProjectId) {
      const project = projects.find(p => p.id === viewingProjectId);
      if (project && project.plan) {
        const expanded = {};
        project.plan.forEach(task => {
          expanded[task.id] = true;
        });
        setExpandedTasks(expanded);
      }
      // Reset edit mode when switching projects
      setEditMode(false);
      setEditValues({});
    }
  }, [viewingProjectId]);

  const thrustConversation = getThrustConversation();

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'var(--coral)',
      medium: 'var(--amber)',
      low: 'var(--sage)'
    };
    return colors[priority] || 'var(--stone)';
  };

  const handleSlideAdvance = (direction) => {
    if (visibleProjects.length === 0) return;

    setCurrentSlideIndex(prev => {
      const nextIndex = (prev + direction + visibleProjects.length) % visibleProjects.length;
      return nextIndex;
    });
  };

  const slideProject = visibleProjects[currentSlideIndex] || null;

  const renderEditingHint = (field) =>
    focusedField === field ? (
      <div style={styles.editingAsHint}>
        editing as <span style={styles.editingAsName}>{loggedInUser}</span>
      </div>
    ) : null;

  const renderCtrlEnterHint = (action = 'submit') => (
    <div style={styles.shortcutHint}>Ctrl + Enter to {action}</div>
  );

  const renderInlineFormatting = (text, keyPrefix = 'inline') => {
    const parts = [];
    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
    let lastIndex = 0;
    let match;
    let idx = 0;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={`${keyPrefix}-text-${idx++}`}>{text.substring(lastIndex, match.index)}</span>);
      }

      const token = match[0];
      if (token.startsWith('**')) {
        parts.push(
          <strong key={`${keyPrefix}-bold-${idx++}`} style={styles.strongText}>
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith('*')) {
        parts.push(
          <em key={`${keyPrefix}-italic-${idx++}`} style={styles.emText}>
            {token.slice(1, -1)}
          </em>
        );
      } else if (token.startsWith('`')) {
        parts.push(
          <code key={`${keyPrefix}-code-${idx++}`} style={styles.inlineCode}>
            {token.slice(1, -1)}
          </code>
        );
      }

      lastIndex = match.index + token.length;
    }

    if (lastIndex < text.length) {
      parts.push(<span key={`${keyPrefix}-text-${idx++}`}>{text.substring(lastIndex)}</span>);
    }

    return parts;
  };

  const renderRichTextWithTags = (text) => {
    const lines = (text || '').split(/\r?\n/);
    const elements = [];
    let listItems = [];

    const renderParts = (parts, keyPrefix) =>
      parts.map((part, idx) =>
        part.type === 'tag' ? (
          <span key={`${keyPrefix}-tag-${idx}`} style={styles.tagInlineCompact}>
            {part.display}
          </span>
        ) : (
          renderInlineFormatting(part.content, `${keyPrefix}-text-${idx}`)
        )
      );

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} style={styles.richList}>
            {listItems}
          </ul>
        );
        listItems = [];
      }
    };

    lines.forEach((line, lineIdx) => {
      const trimmed = line.trim();

      if (/^[-*]\s+/.test(trimmed)) {
        const content = line.replace(/^\s*[-*]\s+/, '');
        listItems.push(
          <li key={`li-${lineIdx}`} style={styles.richListItem}>
            {renderParts(parseTaggedText(content), `list-${lineIdx}`)}
          </li>
        );
        return;
      }

      flushList();

      if (!trimmed) {
        elements.push(<div key={`spacer-${lineIdx}`} style={{ height: 6 }} />);
        return;
      }

      const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const content = headingMatch[2];
        const HeadingTag = level === 1 ? 'h3' : level === 2 ? 'h4' : 'h5';

        elements.push(
          <HeadingTag key={`heading-${lineIdx}`} style={styles.richHeading}>
            {renderParts(parseTaggedText(content), `heading-${lineIdx}`)}
          </HeadingTag>
        );
        return;
      }

      elements.push(
        <p key={`p-${lineIdx}`} style={styles.richParagraph}>
          {renderParts(parseTaggedText(line), `p-${lineIdx}`)}
        </p>
      );
    });

    flushList();
    return elements;
  };

  const renderProjectCard = (project, index) => (
    <div
      key={project.id}
      onClick={() => setViewingProjectId(project.id)}
      style={{
        ...styles.projectCard,
        animationDelay: `${index * 100}ms`,
        cursor: 'pointer'
      }}
    >
      <div style={styles.cardHeader}>
        <div style={styles.cardTitleRow}>
          <h3 style={styles.projectTitle}>{project.name}</h3>
          <div
            style={{
              ...styles.priorityBadge,
              backgroundColor: getPriorityColor(project.priority) + '20',
              color: getPriorityColor(project.priority)
            }}
          >
            {project.priority}
          </div>
        </div>
        <div style={styles.stakeholders}>
          <Users size={14} style={{ color: 'var(--stone)' }} />
          <span style={styles.stakeholderText}>
            {project.stakeholders.slice(0, 2).map(s => s.name).join(', ')}
            {project.stakeholders.length > 2 && ` +${project.stakeholders.length - 2}`}
          </span>
        </div>
      </div>

      <div style={styles.progressSection}>
        <div style={styles.progressHeader}>
          <span style={styles.progressLabel}>Progress</span>
          <span style={styles.progressValue}>{project.progress}%</span>
        </div>
        <div style={styles.progressBar}>
          <div
            style={{
              ...styles.progressFill,
              width: `${project.progress}%`,
              backgroundColor: getPriorityColor(project.priority)
            }}
          />
        </div>
      </div>

      <div style={styles.updateSection}>
        <div style={styles.updateLabel}>
          <MessageCircle size={14} style={{ color: 'var(--stone)' }} />
          Latest Update
        </div>
        <p style={styles.updateText}>{project.lastUpdate}</p>
      </div>

      {(() => {
        const tasksNeedingAttention = [];
        project.plan.forEach(task => {
          task.subtasks.forEach(subtask => {
            if (subtask.status !== 'completed') {
              const dueDateInfo = formatDueDate(subtask.dueDate, subtask.status, subtask.completedDate);
              if (dueDateInfo.isOverdue || dueDateInfo.isDueSoon) {
                tasksNeedingAttention.push({
                  title: subtask.title,
                  dueDateInfo: dueDateInfo
                });
              }
            }
          });
        });

        if (tasksNeedingAttention.length > 0) {
          return (
            <div style={styles.actionsSection}>
              <h4 style={styles.actionsSectionTitle}>Tasks Needing Attention</h4>
              {tasksNeedingAttention.slice(0, 3).map((task, idx) => (
                <div key={idx} style={styles.actionItemSmall}>
                  <Circle size={8} style={{ color: task.dueDateInfo.color, marginTop: '6px' }} />
                  <div style={styles.actionTextContent}>
                    <span style={{
                      ...styles.actionTextSmall,
                      color: task.dueDateInfo.isOverdue ? 'var(--coral)' : 'var(--charcoal)'
                    }}>
                      {task.title}
                    </span>
                    <span style={styles.actionDueText}>Due {task.dueDateInfo.formattedDate} • {task.dueDateInfo.text}</span>
                  </div>
                </div>
              ))}
            </div>
          );
        }
        return null;
      })()}

      <div style={styles.cardFooter}>
        <span style={styles.lastActivityText}>
          Last activity: {formatDateTime(project.recentActivity[0]?.date)}
        </span>
        <div style={styles.cardFooterActions}>
          {projectDeletionEnabled && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                openDeleteProject(project);
              }}
              style={styles.cardDeleteButton}
              title="Delete project"
            >
              <Trash2 size={14} />
              Delete
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setViewingProjectId(project.id);
            }}
            style={styles.cardButton}
          >
            View Details
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  const renderProjectTimeline = (project) => {
    // Gather all tasks with due dates
    const tasksWithDueDates = [];
    project.plan.forEach(task => {
      task.subtasks.forEach(subtask => {
        if (subtask.dueDate) {
          tasksWithDueDates.push({
            title: subtask.title,
            dueDate: new Date(subtask.dueDate),
            status: subtask.status,
            taskTitle: task.title
          });
        }
      });
    });

    // Calculate timeline range
    const now = new Date();
    const startDate = new Date(now);
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + timelineView);

    // Filter tasks within the timeline range
    const timelineTasks = tasksWithDueDates
      .filter(task => task.dueDate >= startDate && task.dueDate <= endDate)
      .sort((a, b) => a.dueDate - b.dueDate);

    // Calculate position for each task on the timeline
    const getTaskPosition = (taskDate) => {
      const totalMs = endDate - startDate;
      const taskMs = taskDate - startDate;
      return (taskMs / totalMs) * 100;
    };

    // Generate month labels with smart collision detection
    const generateMonthLabels = () => {
      const allLabels = [];
      const current = new Date(startDate);
      current.setDate(1); // Start at the first of the month

      // Generate all potential month labels
      while (current <= endDate) {
        const position = getTaskPosition(current);
        if (position >= 0 && position <= 100) {
          allLabels.push({
            month: current.toLocaleDateString('en-US', { month: 'short' }),
            year: current.getFullYear(),
            position: position,
            date: new Date(current)
          });
        }
        current.setMonth(current.getMonth() + 1);
      }

      // Calculate minimum spacing based on zoom level
      // Estimate: each label is roughly 30-40px wide, and we need some padding
      // Assume timeline width is around 800-1000px, so 1% ≈ 8-10px
      // Therefore, minimum spacing between labels ≈ 5% (50px)
      const minSpacing = 5; // percentage points

      // Filter labels to prevent collisions
      const visibleLabels = [];
      let lastPosition = -minSpacing;

      for (const label of allLabels) {
        if (label.position - lastPosition >= minSpacing) {
          visibleLabels.push(label);
          lastPosition = label.position;
        }
      }

      return visibleLabels;
    };

    const monthLabels = generateMonthLabels();

    // Check for overlaps and assign vertical positions
    const assignVerticalPositions = (tasks) => {
      const minSpacing = 15; // Minimum horizontal spacing in percentage points
      const positions = tasks.map((task, idx) => ({
        task,
        position: getTaskPosition(task.dueDate),
        idx,
        verticalOffset: 0,
        isAbove: idx % 2 === 0 // Alternate above/below
      }));

      // Sort by position for overlap detection
      const sorted = [...positions].sort((a, b) => a.position - b.position);

      // Stagger heights to avoid overlaps
      for (let i = 0; i < sorted.length; i++) {
        const current = sorted[i];
        let maxOffset = 0;

        // Check all previous tasks
        for (let j = 0; j < i; j++) {
          const prev = sorted[j];
          // If on same side (above/below) and within spacing threshold
          if (prev.isAbove === current.isAbove &&
              Math.abs(current.position - prev.position) < minSpacing) {
            maxOffset = Math.max(maxOffset, prev.verticalOffset + 1);
          }
        }
        current.verticalOffset = maxOffset;
      }

      return positions;
    };

    const taskPositions = assignVerticalPositions(timelineTasks);

    // Group tasks that are very close together
    const groupTasks = (positions) => {
      const groupThreshold = 8; // Group tasks within 8% of timeline
      const maxItemsBeforeGrouping = 2; // Show up to 2 items, then "+N more"
      const groups = [];
      const sorted = [...positions].sort((a, b) => a.position - b.position);

      let currentGroup = null;

      for (let i = 0; i < sorted.length; i++) {
        const current = sorted[i];

        if (!currentGroup) {
          currentGroup = {
            items: [current],
            position: current.position,
            isAbove: current.isAbove
          };
        } else {
          const distance = current.position - currentGroup.position;

          if (distance < groupThreshold && current.isAbove === currentGroup.isAbove) {
            // Add to current group
            currentGroup.items.push(current);
          } else {
            // Save current group and start new one
            groups.push(currentGroup);
            currentGroup = {
              items: [current],
              position: current.position,
              isAbove: current.isAbove
            };
          }
        }
      }

      if (currentGroup) {
        groups.push(currentGroup);
      }

      return groups.map((group, groupIdx) => ({
        ...group,
        id: `group-${groupIdx}`,
        isGrouped: group.items.length > maxItemsBeforeGrouping
      }));
    };

    const taskGroups = groupTasks(taskPositions);

    return (
      <div style={styles.timelineSection}>
        <div style={styles.timelineHeader}>
          <h3 style={styles.timelineSectionTitle}>Project Timeline</h3>
          <div style={styles.timelineZoomControl}>
            <span style={styles.timelineZoomLabel}>
              {timelineView === 1 ? '1 Month' : timelineView === 12 ? '1 Year' : `${timelineView} Months`}
            </span>
            <input
              type="range"
              min="1"
              max="24"
              value={timelineView}
              onChange={(e) => setTimelineView(parseInt(e.target.value))}
              style={styles.timelineZoomSlider}
            />
            <div style={styles.timelineZoomTicks}>
              <span style={styles.timelineZoomTick}>1M</span>
              <span style={styles.timelineZoomTick}>24M</span>
            </div>
          </div>
        </div>

        <div style={styles.timelineContainer}>
          {/* Timeline bar */}
          <div style={styles.timelineBar}>
            <div style={styles.timelineBarFill} />

            {/* Month labels */}
            {monthLabels.map((label, idx) => (
              <div
                key={idx}
                style={{
                  position: 'absolute',
                  left: `${label.position}%`,
                  top: '-18px',
                  transform: 'translateX(-50%)',
                  fontSize: '10px',
                  color: 'var(--stone)',
                  opacity: 0.5,
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: '500',
                  letterSpacing: '0.3px',
                  textTransform: 'uppercase',
                }}
              >
                {label.month}
              </div>
            ))}

            {/* Task markers - now with grouping support */}
            {taskGroups.map((group) => {
              const { items, position, isAbove, id, isGrouped } = group;
              const firstItem = items[0];
              const isCompleted = items.every(item => item.task.status === 'completed');
              const lineHeight = 20 + (firstItem.verticalOffset * 12);
              const isHovered = hoveredTimelineGroup === id;
              const maxItemsBeforeGrouping = 2;

              return (
                <div
                  key={id}
                  style={{
                    ...styles.timelineMarker,
                    left: `${position}%`
                  }}
                  onMouseEnter={() => setHoveredTimelineGroup(id)}
                  onMouseLeave={() => setHoveredTimelineGroup(null)}
                >
                  <div
                    style={{
                      ...styles.timelineMarkerDot,
                      backgroundColor: isCompleted ? 'var(--earth)' : 'var(--amber)'
                    }}
                  />

                  {/* Connector line - positioned above or below, pointing to left edge */}
                  <div style={{
                    position: 'absolute',
                    left: '0',
                    width: '1px',
                    height: `${lineHeight}px`,
                    backgroundColor: isCompleted ? 'var(--earth)' : 'var(--amber)',
                    opacity: 0.3,
                    ...(isAbove
                      ? { bottom: '6px' }
                      : { top: '6px' }
                    )
                  }} />

                  {/* Callout text - with overflow handling and grouping */}
                  <div style={{
                    position: 'absolute',
                    left: '0',
                    fontSize: '11px',
                    fontFamily: "'Inter', sans-serif",
                    padding: '2px 0',
                    cursor: isGrouped ? 'pointer' : 'default',
                    transition: 'all 0.2s ease',
                    zIndex: isHovered ? 10 : 1,
                    whiteSpace: 'nowrap',
                    ...(isAbove
                      ? { bottom: `${lineHeight + 6}px` }
                      : { top: `${lineHeight + 6}px` }
                    )
                  }}>
                    {isHovered && isGrouped ? (
                      // Show all items on hover
                      <div>
                        {items.map((item, itemIdx) => (
                          <div key={itemIdx} style={{ marginBottom: itemIdx < items.length - 1 ? '4px' : '0' }}>
                            <span style={{
                              color: 'var(--charcoal)',
                              fontWeight: '600',
                              display: 'block'
                            }}>
                              {item.task.title}
                            </span>
                            <span style={{
                              color: 'var(--stone)',
                              fontWeight: '400',
                              fontSize: '10px'
                            }}>
                              {item.task.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      // Show summary or individual items
                      <div>
                        {items.slice(0, maxItemsBeforeGrouping).map((item, itemIdx) => (
                          <span key={itemIdx}>
                            <span style={{
                              color: 'var(--charcoal)',
                              fontWeight: '600',
                            }}>
                              {item.task.title}
                            </span>
                            {itemIdx < Math.min(maxItemsBeforeGrouping, items.length) - 1 && ', '}
                          </span>
                        ))}
                        {isGrouped && (
                          <span style={{
                            color: 'var(--earth)',
                            fontWeight: '600',
                            marginLeft: '4px'
                          }}>
                            +{items.length - maxItemsBeforeGrouping} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Timeline labels */}
          <div style={styles.timelineLabels}>
            <span style={styles.timelineLabel}>
              {startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
            <span style={styles.timelineLabel}>
              {endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes fadeInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
      
      <div style={styles.container}>
      {/* Daily Check-in Modal */}
      {showDailyCheckin && selectedProject && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div style={styles.modalIconWrapper}>
                <Sparkles size={24} style={{ color: 'var(--amber)' }} />
              </div>
              <h2 style={styles.modalTitle}>Good Morning! Let's catch up on your projects</h2>
              <p style={styles.modalSubtitle}>
                What happened yesterday on <strong>{selectedProject.name}</strong>?
              </p>
            </div>

            <div style={styles.modalBody}>
              {/* Last 3 Updates */}
              {selectedProject.recentActivity.length > 0 && (
                <div style={styles.recentUpdatesSection}>
                  <h4 style={styles.recentUpdatesTitle}>Recent Updates</h4>
                  {selectedProject.recentActivity.slice(0, 3).map((activity, idx) => (
                    <div 
                      key={idx} 
                      style={{
                        ...styles.recentUpdateItem,
                        borderBottom: idx === Math.min(2, selectedProject.recentActivity.length - 1) ? 'none' : '1px solid var(--cloud)',
                        marginBottom: idx === Math.min(2, selectedProject.recentActivity.length - 1) ? '0' : '12px',
                        paddingBottom: idx === Math.min(2, selectedProject.recentActivity.length - 1) ? '0' : '12px'
                      }}
                    >
                      <div style={styles.recentUpdateHeader}>
                        <span style={styles.recentUpdateAuthor}>{activity.author}</span>
                        <span style={styles.recentUpdateTime}>{formatDateTime(activity.date)}</span>
                      </div>
                      <p style={styles.recentUpdateText}>{activity.note}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Overdue and Upcoming Tasks */}
              {(() => {
                const allTasks = [];
                selectedProject.plan.forEach(task => {
                  task.subtasks.forEach(subtask => {
                    if (subtask.status !== 'completed') {
                      const dueDateInfo = formatDueDate(subtask.dueDate, subtask.status, subtask.completedDate);
                      if (dueDateInfo.isOverdue || dueDateInfo.isDueSoon) {
                        allTasks.push({
                          title: subtask.title,
                          taskTitle: task.title,
                          dueDateInfo: dueDateInfo
                        });
                      }
                    }
                  });
                });
                
                if (allTasks.length > 0) {
                  return (
                    <div style={styles.tasksSection}>
                      <h4 style={styles.tasksSectionTitle}>Tasks Needing Attention</h4>
                      {allTasks.map((task, idx) => (
                        <div 
                          key={idx} 
                          style={{
                            ...styles.taskNeedingAttention,
                            borderBottom: idx === allTasks.length - 1 ? 'none' : '1px solid #F5E6D3',
                            paddingBottom: idx === allTasks.length - 1 ? '0' : '8px'
                          }}
                        >
                          <div style={styles.taskNeedingAttentionContent}>
                            <span style={styles.taskNeedingAttentionTitle}>{task.title}</span>
                            <span style={styles.taskNeedingAttentionTask}>in {task.taskTitle}</span>
                            <span style={styles.taskNeedingAttentionDate}>Due {task.dueDateInfo.formattedDate}</span>
                          </div>
                          <span style={{
                            ...styles.taskNeedingAttentionDue,
                            color: task.dueDateInfo.color,
                            fontWeight: task.dueDateInfo.isOverdue ? '700' : '600'
                          }}>
                            {task.dueDateInfo.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }
                return null;
              })()}

              <textarea
                value={checkinNote}
                onChange={(e) => setCheckinNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.ctrlKey && e.key === 'Enter') {
                    e.preventDefault();
                    handleDailyCheckin(selectedProject.id);
                  }
                }}
                onFocus={() => setFocusedField('daily-checkin')}
                onBlur={() => setFocusedField(null)}
                placeholder="Share any updates, blockers, or progress made..."
                style={styles.textarea}
                autoFocus
              />

              {renderEditingHint('daily-checkin')}

              <div style={styles.modalActions}>
                <button
                  onClick={() => handleDailyCheckin(selectedProject.id)}
                  style={styles.primaryButton}
                  disabled={!checkinNote.trim()}
                >
                  Continue
                  <ChevronRight size={18} />
                </button>
                <button
                  onClick={() => {
                    // Skip to next project
                    const currentIndex = visibleProjects.findIndex(p => p.id === selectedProject.id);
                    if (currentIndex < visibleProjects.length - 1) {
                      setSelectedProject(visibleProjects[currentIndex + 1]);
                      setCheckinNote('');
                    } else {
                      setShowDailyCheckin(false);
                      setSelectedProject(null);
                    }
                  }}
                  style={styles.skipButton}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--cream)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                  }}
                >
                  Skip This Project
                </button>
                <button
                  onClick={() => {
                    setShowDailyCheckin(false);
                    setSelectedProject(null);
                    setCheckinNote('');
                  }}
                  style={styles.skipAllButton}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--coral)' + '10';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                  }}
                >
                  Skip All for Today
                </button>
              </div>

              <p style={styles.keyboardHint}>
                💡 Press <strong>Ctrl+Enter</strong> to submit and continue
              </p>

              <div style={styles.progressIndicator}>
                {visibleProjects.map((p, idx) => (
                  <div
                    key={p.id}
                    style={{
                      ...styles.progressDot,
                      backgroundColor: p.id === selectedProject.id ? 'var(--amber)' : 'var(--cloud)',
                      opacity: idx <= visibleProjects.indexOf(selectedProject) ? 1 : 0.3
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {projectToDelete && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modal, maxWidth: '520px' }}>
            <div style={styles.modalHeader}>
              <div style={{ ...styles.modalIconWrapper, backgroundColor: 'var(--coral)' + '15' }}>
                <Trash2 size={24} style={{ color: 'var(--coral)' }} />
              </div>
              <h2 style={styles.modalTitle}>Delete this project?</h2>
              <p style={styles.modalSubtitle}>
                Deleting "{projectToDelete.name}" is permanent. Type the project name to confirm.
              </p>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.dangerNote}>
                <AlertCircle size={16} />
                <span>All tasks, updates, and activity will be removed.</span>
              </div>
              <label style={styles.confirmLabel}>
                Type <strong>{projectToDelete.name}</strong> to confirm deletion.
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                style={styles.confirmInput}
                placeholder={projectToDelete.name}
                autoFocus
              />
            </div>

            <div style={styles.modalActions}>
              <button
                onClick={handleConfirmDeleteProject}
                style={{
                  ...styles.dangerButton,
                  opacity: deleteConfirmation.trim() === projectToDelete.name ? 1 : 0.5,
                  cursor: deleteConfirmation.trim() === projectToDelete.name ? 'pointer' : 'not-allowed'
                }}
                disabled={deleteConfirmation.trim() !== projectToDelete.name}
              >
                Delete Project
              </button>
              <button
                onClick={closeDeleteModal}
                style={styles.skipButton}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--cream)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Interface */}
      <div style={{ ...styles.sidebar, ...(isSidebarCollapsed ? styles.sidebarCollapsed : {}) }}>
        <button
          style={styles.sidebarCollapseToggle}
          onClick={() => setIsSidebarCollapsed(prev => !prev)}
          aria-label={isSidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}
        >
          {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {isSidebarCollapsed ? (
          <div style={styles.sidebarCollapsedContent}>
            <div style={styles.logoIcon}>
              <TrendingUp size={20} style={{ color: '#FFFFFF' }} />
            </div>
          </div>
        ) : (
          <div style={styles.sidebarContent}>
            <div style={styles.logo}>
              <div style={styles.logoIcon}>
                <TrendingUp size={24} style={{ color: 'var(--earth)' }} />
              </div>
              <h1 style={styles.logoText}>Momentum</h1>
            </div>

            <nav style={styles.nav}>
              <button
                onClick={() => {
                  setActiveView('overview');
                  setViewingProjectId(null);
                }}
                style={{
                  ...styles.navItem,
                  ...(activeView === 'overview' && !viewingProjectId ? styles.navItemActive : {})
                }}
              >
                Overview
              </button>
              <button
                onClick={() => {
                  setActiveView('thrust');
                  setViewingProjectId(null);
                }}
                style={{
                  ...styles.navItem,
                  ...(activeView === 'thrust' && !viewingProjectId ? styles.navItemActive : {})
                }}
              >
                Momentum
              </button>
              <button
                onClick={() => {
                  setActiveView('slides');
                  setViewingProjectId(null);
                }}
                style={{
                  ...styles.navItem,
                  ...(activeView === 'slides' && !viewingProjectId ? styles.navItemActive : {})
                }}
              >
                Slides
              </button>
              <button
                onClick={() => {
                  setActiveView('timeline');
                  setViewingProjectId(null);
                }}
                style={{
                  ...styles.navItem,
                  ...(activeView === 'timeline' && !viewingProjectId ? styles.navItemActive : {})
                }}
              >
                Timeline
              </button>
            </nav>
          </div>
        )}

      </div>

      <main style={styles.main}>
        <div style={styles.topBar}>
          <div />
          <div style={styles.topBarRight}>
            <div style={styles.userIndicator}>
              <div style={styles.userAvatar}>{(loggedInUser || '?').split(' ').map(n => n[0]).join('')}</div>
              <div style={styles.userDetails}>
                <span style={styles.userLabel}>Logged in</span>
                <select
                  value={loggedInUser}
                  onChange={(e) => setLoggedInUser(e.target.value)}
                  style={styles.userSelect}
                  aria-label="Select logged in user"
                >
                  {getAllStakeholders().map(stakeholder => (
                    <option key={stakeholder.name} value={stakeholder.name}>
                      {stakeholder.name} ({stakeholder.team})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={onOpenSettings}
              style={styles.settingsIconButton}
              aria-label="Open settings"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>

        {viewingProject ? (
          // Project Details View
          <div style={styles.detailsContainer}>
            <button 
              onClick={() => setViewingProjectId(null)}
              style={styles.backButton}
            >
              <ArrowLeft size={18} />
              Back to Projects
            </button>

            <div style={styles.detailsHeader}>
              <div>
                <h2 style={styles.detailsTitle}>{viewingProject.name}</h2>
                {editMode ? (
                  <>
                    <textarea
                      value={editValues.description}
                      onChange={(e) => setEditValues({...editValues, description: e.target.value})}
                      onFocus={() => setFocusedField('project-description')}
                      onBlur={() => setFocusedField(null)}
                      style={{...styles.detailsDescription, ...styles.editTextarea, minHeight: '80px'}}
                    />
                    {renderEditingHint('project-description')}
                  </>
                ) : (
                  <p style={styles.detailsDescription}>{viewingProject.description}</p>
                )}
              </div>
              <div style={styles.headerActions}>
                {editMode ? (
                  <>
                    <button 
                      onClick={saveEdits} 
                      style={styles.saveButton}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(122, 155, 118, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(122, 155, 118, 0.3)';
                      }}
                    >
                      <Check size={18} />
                      Save
                    </button>
                    <button 
                      onClick={cancelEdit} 
                      style={styles.cancelButton}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--cream)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                      }}
                    >
                      <X size={18} />
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <div
                      style={{
                        ...styles.priorityBadgeLarge,
                        backgroundColor: getPriorityColor(viewingProject.priority) + '20',
                        color: getPriorityColor(viewingProject.priority)
                      }}
                    >
                      {viewingProject.priority} priority
                    </div>
                    <button 
                      onClick={enterEditMode} 
                      style={styles.editButton}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--cream)';
                        e.currentTarget.style.borderColor = 'var(--earth)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                        e.currentTarget.style.borderColor = 'var(--cloud)';
                      }}
                    >
                      <Edit2 size={18} />
                      Edit Project
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Project Timeline */}
            {renderProjectTimeline(viewingProject)}

            {/* Compact Info Bar */}
            <div style={styles.compactInfoBar}>
              {/* Project Details Card */}
              <div style={styles.compactCard}>
                <h4 style={styles.compactCardTitle}>Details</h4>
                <div style={styles.compactInfoGrid}>
                  <div style={styles.compactInfoItem}>
                    <Calendar size={14} style={{ color: 'var(--stone)' }} />
                    <span style={styles.compactInfoLabel}>Target:</span>
                    <span style={styles.compactInfoValue}>
                      {new Date(viewingProject.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div style={styles.compactInfoItem}>
                    <TrendingUp size={14} style={{ color: 'var(--stone)' }} />
                    <span style={styles.compactInfoLabel}>Status:</span>
                    {editMode ? (
                      <select
                        value={editValues.status}
                        onChange={(e) => setEditValues({...editValues, status: e.target.value})}
                        style={styles.compactSelect}
                      >
                        <option value="planning">Planning</option>
                        <option value="active">Active</option>
                        <option value="on-hold">On Hold</option>
                        <option value="completed">Completed</option>
                        <option value="closed">Closed</option>
                      </select>
                    ) : (
                      <span style={styles.statusBadgeSmall}>{viewingProject.status}</span>
                    )}
                  </div>
                  <div style={styles.compactInfoItem}>
                    <AlertCircle size={14} style={{ color: 'var(--stone)' }} />
                    <span style={styles.compactInfoLabel}>Priority:</span>
                    {editMode ? (
                      <select
                        value={editValues.priority}
                        onChange={(e) => setEditValues({...editValues, priority: e.target.value})}
                        style={styles.compactSelect}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    ) : (
                      <span style={{
                        ...styles.statusBadgeSmall,
                        backgroundColor: getPriorityColor(viewingProject.priority) + '20',
                        color: getPriorityColor(viewingProject.priority)
                      }}>
                        {viewingProject.priority}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tasks Needing Attention Card */}
              <div style={styles.compactCard}>
                <h4 style={styles.compactCardTitle}>Tasks Needing Attention</h4>
                {(() => {
                  const tasksNeedingAttention = [];
                  viewingProject.plan.forEach(task => {
                    task.subtasks.forEach(subtask => {
                      if (subtask.status !== 'completed') {
                        const dueDateInfo = formatDueDate(subtask.dueDate, subtask.status, subtask.completedDate);
                        if (dueDateInfo.isOverdue || dueDateInfo.isDueSoon) {
                          tasksNeedingAttention.push({
                            title: subtask.title,
                            taskTitle: task.title,
                            dueDateInfo: dueDateInfo
                          });
                        }
                      }
                    });
                  });

                  if (tasksNeedingAttention.length === 0) {
                    return <p style={styles.noTasksText}>No urgent tasks</p>;
                  }

                  return (
                    <div style={styles.nextActionsCompactList}>
                      {tasksNeedingAttention.slice(0, 3).map((task, idx) => (
                        <div key={idx} style={styles.nextActionCompactItem}>
                          <Circle size={6} style={{ color: task.dueDateInfo.color, marginTop: '4px' }} />
                          <div style={styles.nextActionCompactContent}>
                            <span style={{
                              ...styles.nextActionTextSmall,
                              color: task.dueDateInfo.isOverdue ? 'var(--coral)' : 'var(--charcoal)'
                            }}>
                              {task.title}
                            </span>
                            <span style={styles.nextActionDueText}>Due {task.dueDateInfo.formattedDate} • {task.dueDateInfo.text}</span>
                          </div>
                        </div>
                      ))}
                      {tasksNeedingAttention.length > 3 && (
                        <span style={styles.moreActionsText}>+{tasksNeedingAttention.length - 3} more</span>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Stakeholders Card */}
              <div style={styles.compactCard}>
                <h4 style={styles.compactCardTitle}>Stakeholders</h4>
                {editMode ? (
                  <>
                    <textarea
                      value={editValues.stakeholders}
                      onChange={(e) => setEditValues({...editValues, stakeholders: e.target.value})}
                      onFocus={() => setFocusedField('stakeholders')}
                      onBlur={() => setFocusedField(null)}
                      style={{...styles.editTextarea, minHeight: '60px', fontSize: '13px'}}
                      placeholder="Name, Team (one per line)"
                    />
                    {renderEditingHint('stakeholders')}
                  </>
                ) : (
                  <div style={styles.stakeholderCompactList}>
                    {viewingProject.stakeholders.map((stakeholder, idx) => (
                      <div key={idx} style={styles.stakeholderCompactItem}>
                        <div style={styles.stakeholderAvatarSmall}>
                          {stakeholder.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div style={styles.stakeholderInfo}>
                          <span style={styles.stakeholderNameSmall}>{stakeholder.name}</span>
                          <span style={styles.stakeholderTeam}>{stakeholder.team}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Main Content Grid */}
            <div style={styles.mainContentGrid}>
              {/* Left: Project Plan */}
              <div style={styles.planSection}>
                <div style={styles.sectionHeaderCompact}>
                  <div>
                    <h3 style={styles.sectionTitle}>Project Plan</h3>
                    <span style={styles.sectionSubtitle}>
                      {viewingProject.plan.reduce((acc, task) => acc + task.subtasks.length, 0)} total tasks
                    </span>
                  </div>
                  <button
                    onClick={toggleTaskEditing}
                    style={styles.activityLockButton}
                    title={taskEditEnabled ? 'Lock to disable editing tasks' : 'Unlock to edit tasks'}
                  >
                    {taskEditEnabled ? <Unlock size={18} /> : <Lock size={18} />}
                  </button>
                </div>

                <div style={styles.planList}>
                    {viewingProject.plan.map((task, idx) => {
                      const progress = calculateTaskProgress(task);
                      const isExpanded = expandedTasks[task.id];
                      const dueDateInfo = formatDueDate(task.dueDate, task.status, task.completedDate);
                      const isEditingTaskDate = editingDueDate === `task-${task.id}`;
                      
                      return (
                        <div key={task.id} style={styles.taskItem}>
                          <div 
                            style={styles.taskHeader}
                            onClick={() => toggleTask(task.id)}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--cream)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                          >
                            <div style={styles.taskHeaderLeft}>
                              {getStatusIcon(task.status)}
                              {editingTask === task.id ? (
                                <input
                                  type="text"
                                  value={editingTaskTitle}
                                  onChange={(e) => setEditingTaskTitle(e.target.value)}
                                  onBlur={() => saveTaskEdit(task.id)}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') saveTaskEdit(task.id);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  style={styles.taskTitleInput}
                                  autoFocus
                                />
                              ) : (
                                <span style={styles.taskTitle}>{task.title}</span>
                              )}
                              {isEditingTaskDate ? (
                                <input
                                  type="date"
                                  value={tempDueDate}
                                  onChange={(e) => setTempDueDate(e.target.value)}
                                  onBlur={() => handleUpdateDueDate(task.id)}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') handleUpdateDueDate(task.id);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  style={styles.dueDateInput}
                                  autoFocus
                                />
                              ) : (
                                <span 
                                  style={{
                                    ...styles.dueDateBadge, 
                                    color: dueDateInfo.color,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingDueDate(`task-${task.id}`);
                                    setTempDueDate(task.dueDate);
                                  }}
                                  title="Click to edit due date"
                                >
                                  {dueDateInfo.isCompleted && <Check size={12} style={{ color: 'var(--sage)' }} />}
                                  {dueDateInfo.text}
                                </span>
                              )}
                            </div>
                            <div style={styles.taskHeaderRight}>
                              {taskEditEnabled && (
                                <>
                                  <button
                                    style={styles.taskActionButton}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startEditingTask(task.id, task.title);
                                    }}
                                    title="Edit task"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    style={styles.activityDeleteButton}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteTask(task.id);
                                    }}
                                    title="Delete task"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                              <span style={styles.taskProgress}>{progress}%</span>
                              <ChevronDown
                                size={18}
                                style={{
                                  color: 'var(--stone)',
                                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                  transition: 'transform 0.2s ease'
                                }}
                              />
                            </div>
                          </div>
                          
                          {isExpanded && task.subtasks && (
                            <div style={styles.subtaskList}>
                              {task.subtasks.map((subtask, subIdx) => {
                                const subtaskDueDate = formatDueDate(subtask.dueDate, subtask.status, subtask.completedDate);
                                const isCommenting = commentingOn === subtask.id;
                                const isEditingSubtaskDate = editingDueDate === `subtask-${subtask.id}`;
                                
                                return (
                                  <div key={subtask.id}>
                                    <div 
                                      style={{
                                        ...styles.subtaskItem,
                                        marginBottom: subIdx === task.subtasks.length - 1 && !isCommenting ? '0' : '6px'
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--cloud)'}
                                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                                    >
                                      <div
                                        style={styles.subtaskCheckbox}
                                        onClick={() => toggleSubtaskStatus(task.id, subtask.id)}
                                      >
                                        {getStatusIcon(subtask.status)}
                                      </div>
                                      {editingSubtask === subtask.id ? (
                                        <input
                                          type="text"
                                          value={editingSubtaskTitle}
                                          onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                                          onBlur={() => saveSubtaskEdit(task.id, subtask.id)}
                                          onKeyPress={(e) => {
                                            if (e.key === 'Enter') saveSubtaskEdit(task.id, subtask.id);
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                          style={styles.subtaskTitleInput}
                                          autoFocus
                                        />
                                      ) : (
                                        <span
                                          style={{
                                            ...styles.subtaskTitle,
                                            textDecoration: subtask.status === 'completed' ? 'line-through' : 'none',
                                            opacity: subtask.status === 'completed' ? 0.6 : 1
                                          }}
                                          onClick={() => toggleSubtaskStatus(task.id, subtask.id)}
                                        >
                                          {subtask.title}
                                        </span>
                                      )}
                                      {isEditingSubtaskDate ? (
                                        <input
                                          type="date"
                                          value={tempDueDate}
                                          onChange={(e) => setTempDueDate(e.target.value)}
                                          onBlur={() => handleUpdateDueDate(task.id, subtask.id)}
                                          onKeyPress={(e) => {
                                            if (e.key === 'Enter') handleUpdateDueDate(task.id, subtask.id);
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                          style={styles.subtaskDueDateInput}
                                          autoFocus
                                        />
                                      ) : (
                                        <span 
                                          style={{
                                            ...styles.subtaskDueDate,
                                            color: subtaskDueDate.color,
                                            fontWeight: subtaskDueDate.isOverdue ? '700' : '500',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '3px'
                                          }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingDueDate(`subtask-${subtask.id}`);
                                            setTempDueDate(subtask.dueDate);
                                          }}
                                          title="Click to edit due date"
                                        >
                                          {subtaskDueDate.isCompleted && <Check size={10} style={{ color: 'var(--sage)' }} />}
                                          {subtaskDueDate.text}
                                        </span>
                                      )}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setCommentingOn(isCommenting ? null : subtask.id);
                                          setSubtaskComment('');
                                        }}
                                        style={styles.commentButton}
                                        title="Add comment"
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.backgroundColor = 'var(--amber)' + '20';
                                          e.currentTarget.style.color = 'var(--earth)';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.backgroundColor = 'transparent';
                                          e.currentTarget.style.color = 'var(--stone)';
                                        }}
                                      >
                                        <MessageSquare size={14} />
                                      </button>
                                      {taskEditEnabled && (
                                        <>
                                          <button
                                            style={styles.subtaskActionButton}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              startEditingSubtask(subtask.id, subtask.title);
                                            }}
                                            title="Edit subtask"
                                          >
                                            <Edit2 size={12} />
                                          </button>
                                          <button
                                            style={styles.subtaskDeleteButton}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              deleteSubtask(task.id, subtask.id);
                                            }}
                                            title="Delete subtask"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                    
                                    {isCommenting && (
                                      <div style={styles.commentBox}>
                                        <textarea
                                          value={subtaskComment}
                                          onChange={(e) => setSubtaskComment(e.target.value)}
                                          onFocus={() => setFocusedField('subtask-comment')}
                                          onBlur={() => setFocusedField(null)}
                                          onKeyDown={(e) => {
                                            if (e.ctrlKey && e.key === 'Enter') {
                                              e.preventDefault();
                                              handleSubtaskComment(task.id, subtask.id, task.title, subtask.title);
                                            }
                                          }}
                                          placeholder="Add a comment..."
                                          style={styles.commentInput}
                                          autoFocus
                                        />
                                        {renderEditingHint('subtask-comment')}
                                        {renderCtrlEnterHint('send comment')}
                                        <div style={styles.commentActions}>
                                          <button
                                            onClick={() => handleSubtaskComment(task.id, subtask.id, task.title, subtask.title)}
                                            disabled={!subtaskComment.trim()}
                                            style={{
                                              ...styles.commentSubmit,
                                              opacity: subtaskComment.trim() ? 1 : 0.5,
                                              cursor: subtaskComment.trim() ? 'pointer' : 'not-allowed'
                                            }}
                                          >
                                            <Send size={12} />
                                            Comment
                                          </button>
                                          <button
                                            onClick={() => setCommentingOn(null)}
                                            style={styles.commentCancel}
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              
                              {/* Add Subtask */}
                              {addingSubtaskTo === task.id ? (
                                <div style={styles.addSubtaskBox}>
                                  <input
                                    type="text"
                                    value={newSubtaskTitle}
                                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.ctrlKey && e.key === 'Enter' && newSubtaskTitle.trim()) {
                                        e.preventDefault();
                                        handleAddSubtask(task.id);
                                      }
                                    }}
                                    placeholder="New subtask title..."
                                    style={styles.addSubtaskInput}
                                    autoFocus
                                  />
                                  <input
                                    type="date"
                                    value={newSubtaskDueDate}
                                    onChange={(e) => setNewSubtaskDueDate(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.ctrlKey && e.key === 'Enter' && newSubtaskTitle.trim()) {
                                        e.preventDefault();
                                        handleAddSubtask(task.id);
                                      }
                                    }}
                                    style={styles.addSubtaskInput}
                                    placeholder="Due date"
                                  />
                                  {renderCtrlEnterHint('add subtask')}
                                  <div style={styles.addSubtaskActions}>
                                    <button
                                      onClick={() => handleAddSubtask(task.id)}
                                      disabled={!newSubtaskTitle.trim()}
                                      style={{
                                        ...styles.addSubtaskSubmit,
                                        opacity: newSubtaskTitle.trim() ? 1 : 0.5,
                                        cursor: newSubtaskTitle.trim() ? 'pointer' : 'not-allowed'
                                      }}
                                    >
                                      Add
                                    </button>
                                    <button
                                      onClick={() => {
                                        setAddingSubtaskTo(null);
                                        setNewSubtaskTitle('');
                                        setNewSubtaskDueDate('');
                                      }}
                                      style={styles.addSubtaskCancel}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setAddingSubtaskTo(task.id)}
                                  style={styles.addSubtaskButton}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--sage)' + '10';
                                    e.currentTarget.style.borderColor = 'var(--sage)';
                                    e.currentTarget.style.color = 'var(--sage)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.borderColor = 'var(--cloud)';
                                    e.currentTarget.style.color = 'var(--stone)';
                                  }}
                                >
                                  <Plus size={14} />
                                  Add subtask
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Add New Task */}
                    {addingNewTask ? (
                      <div style={styles.addTaskBox}>
                        <input
                          type="text"
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.ctrlKey && e.key === 'Enter' && newTaskTitle.trim()) {
                              e.preventDefault();
                              handleAddTask();
                            }
                          }}
                          placeholder="New task title..."
                          style={styles.addTaskInput}
                          autoFocus
                        />
                        <input
                          type="date"
                          value={newTaskDueDate}
                          onChange={(e) => setNewTaskDueDate(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.ctrlKey && e.key === 'Enter' && newTaskTitle.trim()) {
                              e.preventDefault();
                              handleAddTask();
                            }
                          }}
                          style={styles.addTaskInput}
                          placeholder="Due date"
                        />
                        {renderCtrlEnterHint('add task')}
                        <div style={styles.addTaskActions}>
                          <button
                            onClick={handleAddTask}
                            disabled={!newTaskTitle.trim()}
                            style={{
                              ...styles.addTaskSubmit,
                              opacity: newTaskTitle.trim() ? 1 : 0.5,
                              cursor: newTaskTitle.trim() ? 'pointer' : 'not-allowed'
                            }}
                          >
                            Add Task
                          </button>
                          <button
                            onClick={() => {
                              setAddingNewTask(false);
                              setNewTaskTitle('');
                              setNewTaskDueDate('');
                            }}
                            style={styles.addTaskCancel}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingNewTask(true)}
                        style={styles.addTaskButton}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--earth)' + '10';
                          e.currentTarget.style.borderColor = 'var(--earth)';
                          e.currentTarget.style.color = 'var(--earth)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.borderColor = 'var(--cloud)';
                          e.currentTarget.style.color = 'var(--stone)';
                        }}
                      >
                        <Plus size={16} />
                        Add New Task
                      </button>
                    )}
                  </div>
              </div>

              {/* Right: Activity Feed */}
              <div style={styles.activitySection}>
                <div style={styles.sectionHeaderCompact}>
                  <h3 style={styles.sectionTitle}>Activity</h3>
                  <button
                    onClick={toggleActivityEditing}
                    style={styles.activityLockButton}
                    title={activityEditEnabled ? 'Unlock to stop editing' : 'Unlock to edit activity feed'}
                  >
                    {activityEditEnabled ? <Unlock size={18} /> : <Lock size={18} />}
                  </button>
                </div>

                {/* Add Update Section */}
                <div style={styles.projectUpdateWrapper}>
                  <div style={styles.timelineInputWrapper}>
                    <textarea
                      ref={projectUpdateInputRef}
                      value={newUpdate}
                      onChange={handleProjectUpdateChange}
                      onFocus={() => setFocusedField('project-update')}
                      onBlur={() => setFocusedField(null)}
                      onKeyDown={(e) => {
                        if (e.ctrlKey && e.key === 'Enter') {
                          e.preventDefault();
                          handleAddUpdate();
                        }
                      }}
                    placeholder="Add an update... Use @ to tag"
                    style={styles.projectUpdateInput}
                  />
                  {renderEditingHint('project-update')}
                  {renderCtrlEnterHint('post update')}

                  {/* Tag Suggestions Dropdown */}
                  {showProjectTagSuggestions && (
                      <div style={styles.tagSuggestions}>
                        {getAllTags()
                          .filter(tag => 
                            tag.display.toLowerCase().includes(projectTagSearchTerm.toLowerCase())
                          )
                          .slice(0, 8)
                          .map((tag, idx) => (
                            <div
                              key={idx}
                              style={styles.tagSuggestionItem}
                              onClick={() => insertProjectTag(tag)}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--cream)'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                            >
                              <span style={{
                                ...styles.tagTypeLabel,
                                backgroundColor: 
                                  tag.type === 'person' ? 'var(--sage)' + '20' :
                                  tag.type === 'project' ? 'var(--earth)' + '20' :
                                  tag.type === 'task' ? 'var(--amber)' + '20' :
                                  'var(--coral)' + '20',
                                color:
                                  tag.type === 'person' ? 'var(--sage)' :
                                  tag.type === 'project' ? 'var(--earth)' :
                                  tag.type === 'task' ? 'var(--amber)' :
                                  'var(--coral)'
                              }}>
                                {tag.type}
                              </span>
                              <span style={styles.tagSuggestionDisplay}>{tag.display}</span>
                            </div>
                          ))}
                      </div>
                    )}
                    
                    <button
                      onClick={handleAddUpdate}
                      disabled={!newUpdate.trim()}
                      style={{
                        ...styles.timelineSubmitButtonCompact,
                        opacity: newUpdate.trim() ? 1 : 0.4
                      }}
                      title="Post update"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>

                <div style={styles.activityListCompact}>
                  {viewingProject.recentActivity.map((activity, idx) => (
                    <div key={activity.id || idx}>
                      <div
                        style={{
                          ...styles.activityItemCompact,
                          animationDelay: `${idx * 30}ms`
                        }}
                      >
                        <div style={styles.activityHeaderCompact}>
                          <div style={styles.activityAuthorCompact}>
                            <div style={styles.activityAvatarSmall}>
                              {activity.author.split(' ').map(n => n[0]).join('')}
                            </div>
                            <span style={styles.activityAuthorNameCompact}>{activity.author}</span>
                          </div>
                          <span style={styles.activityTimeCompact}>{formatDateTime(activity.date)}</span>
                        </div>
                        {activity.taskContext && (
                          <div style={styles.taskContextBadgeCompact}>
                            <MessageSquare size={11} />
                            {activity.taskContext.taskTitle} → {activity.taskContext.subtaskTitle}
                          </div>
                        )}
                        <div style={styles.activityNoteRow}>
                          {activityEditEnabled ? (
                            <div style={styles.activityEditRow}>
                              <textarea
                                value={activityEdits[activity.id] ?? activity.note}
                                onChange={(e) => updateActivityNote(activity.id, e.target.value)}
                                onFocus={() => setFocusedField(`activity-${activity.id}`)}
                                onBlur={() => setFocusedField(null)}
                                style={styles.activityNoteInput}
                              />
                              {renderEditingHint(`activity-${activity.id}`)}
                              <button
                                style={styles.activityDeleteButton}
                                onClick={() => deleteActivity(activity.id)}
                                aria-label="Delete activity"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          ) : (
                            <p style={styles.activityNoteCompact}>
                              {parseTaggedText(activity.note).map((part, idx) => (
                                part.type === 'tag' ? (
                                  <span key={idx} style={styles.tagInlineCompact}>
                                    {part.display}
                                  </span>
                                ) : (
                                  <span key={idx}>{part.content}</span>
                                )
                              ))}
                            </p>
                          )}
                        </div>
                      </div>
                      {idx < viewingProject.recentActivity.length - 1 && (
                        <div style={styles.activitySeparator} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : activeView === 'timeline' ? (
          // Timeline View - All Projects Activity
          <>
            <header style={styles.header}>
              <div>
                <h2 style={styles.pageTitle}>Timeline</h2>
                <p style={styles.pageSubtitle}>
                  Activity across all {visibleProjects.length} projects
                </p>
              </div>
            </header>

            <div style={styles.timelineViewContainer}>
              <div style={styles.activityControlsRow}>
                <button
                  onClick={toggleActivityEditing}
                  style={styles.activityLockButton}
                  title={activityEditEnabled ? 'Unlock to stop editing' : 'Unlock to edit activity feed'}
                >
                  {activityEditEnabled ? <Unlock size={18} /> : <Lock size={18} />}
                </button>
              </div>

              {/* Add Update Section with Tagging */}
              <div style={styles.timelineUpdateSection}>
                <div style={styles.timelineInputWrapper}>
                  <textarea
                    ref={timelineInputRef}
                    value={timelineUpdate}
                    onChange={handleTimelineUpdateChange}
                    onFocus={() => setFocusedField('timeline-update')}
                    onBlur={() => setFocusedField(null)}
                    onKeyDown={(e) => {
                      if (e.ctrlKey && e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTimelineUpdate();
                      }
                    }}
                    placeholder="What's new? Use @ to tag people, projects, or tasks..."
                    style={styles.timelineInput}
                  />
                  {renderEditingHint('timeline-update')}
                  {renderCtrlEnterHint('post update')}

                  {/* Tag Suggestions Dropdown */}
                  {showTagSuggestions && (
                    <div style={styles.tagSuggestions}>
                      {getAllTags()
                        .filter(tag => 
                          tag.display.toLowerCase().includes(tagSearchTerm.toLowerCase())
                        )
                        .slice(0, 8)
                        .map((tag, idx) => (
                          <div
                            key={idx}
                            style={styles.tagSuggestionItem}
                            onClick={() => insertTag(tag, timelineInputRef)}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--cream)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                          >
                            <span style={{
                              ...styles.tagTypeLabel,
                              backgroundColor: 
                                tag.type === 'person' ? 'var(--sage)' + '20' :
                                tag.type === 'project' ? 'var(--earth)' + '20' :
                                tag.type === 'task' ? 'var(--amber)' + '20' :
                                'var(--coral)' + '20',
                              color:
                                tag.type === 'person' ? 'var(--sage)' :
                                tag.type === 'project' ? 'var(--earth)' :
                                tag.type === 'task' ? 'var(--amber)' :
                                'var(--coral)'
                            }}>
                              {tag.type}
                            </span>
                            <span style={styles.tagSuggestionDisplay}>{tag.display}</span>
                          </div>
                        ))}
                    </div>
                  )}
                  
                  <button
                    onClick={handleAddTimelineUpdate}
                    disabled={!timelineUpdate.trim()}
                    style={{
                      ...styles.timelineSubmitButtonCompact,
                      opacity: timelineUpdate.trim() ? 1 : 0.4
                    }}
                    title="Post update"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>

              {/* All Activities Feed */}
              <div style={styles.timelineFeed}>
                {getAllActivities().map((activity, idx) => (
                  <div key={activity.id || idx}>
                    <div
                      style={{
                        ...styles.timelineActivityItemCompact,
                        animationDelay: `${idx * 30}ms`
                      }}
                    >
                      <div style={styles.timelineActivityHeader}>
                        <div style={styles.activityAuthorCompact}>
                          <div style={styles.activityAvatarSmall}>
                            {activity.author.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span style={styles.activityAuthorNameCompact}>{activity.author}</span>
                        </div>
                        <div style={styles.projectBadgeSmall}>
                          {activity.projectName}
                        </div>
                        <span style={styles.activityTimeCompact}>{formatDateTime(activity.date)}</span>
                      </div>
                      
                      {activity.taskContext && (
                        <div style={styles.taskContextBadgeCompact}>
                          <MessageSquare size={11} />
                          {activity.taskContext.taskTitle} → {activity.taskContext.subtaskTitle}
                        </div>
                      )}
                      
                      <div style={styles.activityNoteRow}>
                        {activityEditEnabled ? (
                          <div style={styles.activityEditRow}>
                            <textarea
                              value={activityEdits[activity.id] ?? activity.note}
                              onChange={(e) => updateActivityNote(activity.id, e.target.value)}
                              onFocus={() => setFocusedField(`activity-${activity.id}`)}
                              onBlur={() => setFocusedField(null)}
                              style={styles.activityNoteInput}
                            />
                            {renderEditingHint(`activity-${activity.id}`)}
                            <button
                              style={styles.activityDeleteButton}
                              onClick={() => deleteActivity(activity.id)}
                              aria-label="Delete activity"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        ) : (
                          <p style={styles.activityNoteCompact}>
                            {parseTaggedText(activity.note).map((part, idx) => (
                              part.type === 'tag' ? (
                                <span key={idx} style={styles.tagInlineCompact}>
                                  {part.display}
                                </span>
                              ) : (
                                <span key={idx}>{part.content}</span>
                              )
                            ))}
                          </p>
                        )}
                      </div>
                    </div>
                    {idx < getAllActivities().length - 1 && (
                      <div style={styles.timelineSeparator} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : activeView === 'thrust' ? (
          <>
            <header style={styles.header}>
              <div>
                <h2 style={styles.pageTitle}>Momentum</h2>
                <p style={styles.pageSubtitle}>
                  dialectic project planning
                </p>
              </div>
              <div style={styles.headerActions}>
                <button
                  onClick={() => {
                    if (visibleProjects.length > 0) {
                      setSelectedProject(visibleProjects[0]);
                      setShowDailyCheckin(true);
                    }
                  }}
                  style={styles.secondaryButton}
                  disabled={visibleProjects.length === 0}
                  title={visibleProjects.length === 0 ? 'No projects available for check-in' : 'Start a daily check-in'}
                >
                  Daily check-in
                </button>
              </div>
            </header>

            <div style={styles.thrustLayout}>
                <div style={styles.thrustChatPanel}>
                  <div style={styles.sectionHeaderRow}>
                    <div>
                      <h3 style={styles.sectionTitle}>Chat</h3>
                      <p style={styles.sectionSubtitle}>Threaded updates stay aligned with project momentum</p>
                    </div>
                    <div style={styles.thrustPill}>Live</div>
                  </div>

                  {thrustPendingActions.length > 0 && (
                    <div style={styles.thrustStatusRow}>
                      <div style={styles.thrustStatusHeading}>Applying actions:</div>
                      <ul style={styles.thrustActionList}>
                        {thrustPendingActions.map((action, idx) => (
                          <li key={idx} style={styles.thrustActionListItem}>
                            {describeActionPreview(action)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div style={styles.thrustChatFeed}>
                    {thrustConversation.length === 0 ? (
                      <div style={styles.emptyState}>
                        Start the conversation with a quick update.
                      </div>
                  ) : (
                    <>
                      {thrustConversation.map((message, idx) => {
                        const authorName = message.author || (message.role === 'assistant' ? 'Momentum' : 'You');

                        return (
                          <div
                            key={message.id || idx}
                            style={{
                              ...styles.thrustMessageCard,
                              animationDelay: `${idx * 30}ms`
                            }}
                          >
                            <div style={styles.thrustMessageHeader}>
                              <div style={styles.activityAuthorCompact}>
                                <div style={styles.activityAvatarSmall}>
                                  {authorName.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                  <span style={styles.activityAuthorNameCompact}>{authorName}</span>
                                  <div style={styles.thrustMetaRow}>
                                    <span style={styles.activityTimeCompact}>{formatDateTime(message.date)}</span>
                                    {message.projectName && (
                                      <span style={styles.projectBadgeSmall}>{message.projectName}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div style={styles.thrustMessageBody}>
                              {renderRichTextWithTags(message.note || message.content)}
                            </div>
                            {message.actionResults && message.actionResults.length > 0 && (
                              <div style={styles.thrustActionStack}>
                                {message.actionResults.map((action, actionIdx) => (
                                  <div key={`${message.id}-action-${actionIdx}`} style={styles.thrustActionCard}>
                                    <div style={styles.thrustActionRow}>
                                      <span style={styles.thrustActionLabel}>{action.label}</span>
                                      {action.deltas && action.deltas.length > 0 ? (
                                        action.undone ? (
                                          <span style={styles.thrustUndoTag}>Undone</span>
                                        ) : (
                                          <button
                                            style={styles.thrustActionUndo}
                                            onClick={() => undoThrustAction(message.id, actionIdx)}
                                            aria-label="Undo AI changes"
                                          >
                                            <RotateCcw size={14} />
                                            <span style={{ marginLeft: 6 }}>Undo</span>
                                          </button>
                                        )
                                      ) : null}
                                    </div>
                                    <div style={styles.thrustActionDetailText}>{action.detail}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {(thrustIsRequesting || thrustError) && (
                        <div style={styles.thrustStatusCard}>
                          <div style={styles.thrustStatusInline}>
                            {thrustIsRequesting ? (
                              <>
                                <Clock size={16} style={{ color: 'var(--earth)' }} />
                                <span style={styles.thrustStatusText}>
                                  Momentum is planning… <strong>{formatElapsedTime(thrustElapsedMs)}</strong>
                                </span>
                              </>
                            ) : (
                              <>
                                <AlertCircle size={16} style={{ color: 'var(--coral)' }} />
                                <span style={styles.thrustStatusText}>Momentum couldn't respond: {thrustError}</span>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div style={styles.timelineInputWrapper}>
                  <textarea
                    value={thrustDraft}
                    onChange={(e) => setThrustDraft(e.target.value)}
                    onFocus={() => setFocusedField('thrust-draft')}
                    onBlur={() => setFocusedField(null)}
                    onKeyDown={(e) => {
                      if (e.ctrlKey && e.key === 'Enter') {
                        e.preventDefault();
                        handleSendThrustMessage();
                      }
                    }}
                    placeholder="Share a Momentum update..."
                    style={{ ...styles.timelineInput, minHeight: '96px' }}
                  />
                  {renderEditingHint('thrust-draft')}
                  {renderCtrlEnterHint('send to Momentum')}
                  <button
                    onClick={handleSendThrustMessage}
                    disabled={!thrustDraft.trim() || thrustIsRequesting}
                    style={{
                      ...styles.timelineSubmitButtonCompact,
                      opacity: thrustDraft.trim() && !thrustIsRequesting ? 1 : 0.4
                    }}
                    title="Send update"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>

              <div style={styles.thrustInfoPanel}>
                <div style={styles.thrustInfoHeader}>
                  <div style={styles.thrustInfoTitle}>
                    <Sparkles size={16} style={{ color: 'var(--earth)' }} />
                    <div>
                      <div style={styles.thrustInfoLabel}>Projects</div>
                      <div style={styles.thrustInfoSubtle}>Expand a project for a daily update snapshot</div>
                    </div>
                  </div>
                </div>

                {visibleProjects.length > 0 ? (
                  <div style={styles.thrustInfoContent}>
                    {visibleProjects.map(project => {
                      const projectId = String(project.id);
                      const isExpanded = expandedMomentumProjects[projectId] ?? true;
                      const dueSoonTasks = getProjectDueSoonTasks(project);
                      const recentUpdates = project.recentActivity.slice(0, 3);

                      return (
                        <div key={project.id} style={styles.momentumProjectCard}>
                          <button
                            style={styles.momentumProjectToggle}
                            onClick={() => setExpandedMomentumProjects(prev => ({
                              ...prev,
                              [projectId]: !(prev[projectId] ?? true)
                            }))}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--cream)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            type="button"
                            aria-expanded={isExpanded}
                          >
                            <div style={styles.momentumProjectHeader}>
                              <div>
                                <div style={styles.momentumProjectName}>{project.name}</div>
                                <div style={styles.momentumProjectMeta}>
                                  <Calendar size={14} style={{ color: 'var(--stone)' }} />
                                  Target {new Date(project.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </div>
                              </div>
                              <div style={styles.momentumProjectMetaRight}>
                                <div style={{
                                  ...styles.priorityBadgeLarge,
                                  backgroundColor: getPriorityColor(project.priority) + '20',
                                  color: getPriorityColor(project.priority)
                                }}>
                                  {project.priority} priority
                                </div>
                                <div style={styles.statusBadgeSmall}>{project.status}</div>
                              </div>
                            </div>
                            <ChevronDown
                              size={16}
                              style={{
                                transition: 'transform 0.2s ease',
                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                color: 'var(--stone)'
                              }}
                            />
                          </button>

                          {isExpanded && (
                            <div style={styles.momentumProjectBody}>
                              <div style={styles.momentumSummarySection}>
                                <div style={styles.momentumSummaryTitle}>Recent updates</div>
                                {recentUpdates.length > 0 ? (
                                  <ul style={styles.momentumList}>
                                    {recentUpdates.map((activity, idx) => (
                                      <li key={activity.id || idx} style={styles.momentumListItem}>
                                        <div style={styles.momentumListRow}>
                                          <span style={styles.momentumListStrong}>{activity.author}</span>
                                          <span style={styles.momentumListMeta}>{formatDateTime(activity.date)}</span>
                                        </div>
                                        <div style={styles.momentumListText}>{activity.note}</div>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <div style={styles.momentumEmptyText}>No updates yet.</div>
                                )}
                              </div>

                              <div style={{
                                ...styles.momentumSummarySection,
                                borderLeft: dueSoonTasks.some(task => task.dueDateInfo.isOverdue)
                                  ? '3px solid var(--coral)'
                                  : '3px solid var(--amber)'
                              }}>
                                <div style={styles.momentumSummaryTitle}>Due soon or overdue</div>
                                {dueSoonTasks.length > 0 ? (
                                  <ul style={styles.momentumList}>
                                    {dueSoonTasks.map((task, idx) => (
                                      <li key={`${task.taskTitle}-${task.title}-${idx}`} style={styles.momentumListItem}>
                                        <div style={styles.momentumListRow}>
                                          <span style={styles.momentumListStrong}>{task.taskTitle} → {task.title}</span>
                                          <span style={{ ...styles.actionDueText, color: task.dueDateInfo.color }}>
                                            {task.dueDateInfo.text}
                                          </span>
                                        </div>
                                        <div style={styles.momentumListText}>Due {task.dueDateInfo.formattedDate}</div>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <div style={styles.momentumEmptyText}>No near-term work flagged.</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={styles.emptyState}>No visible projects to summarize.</div>
                )}
              </div>
            </div>
          </>
        ) : activeView === 'slides' ? (
          <>
            <header style={styles.header}>
              <div>
                <h2 style={styles.pageTitle}>Slides</h2>
                <p style={styles.pageSubtitle}>
                  Cycle through {visibleProjects.length} projects in a 16:9 frame, ready for screenshots. Use ← → arrow keys to navigate.
                </p>
              </div>
              <div style={styles.headerActions}>
                <div style={styles.slidesCounter}>
                  Slide {visibleProjects.length > 0 ? currentSlideIndex + 1 : 0} / {visibleProjects.length}
                </div>
                <div style={styles.slidesControls}>
                  <button
                    onClick={() => handleSlideAdvance(-1)}
                    style={styles.dataButton}
                    disabled={visibleProjects.length === 0}
                    aria-label="Previous slide"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => handleSlideAdvance(1)}
                    style={styles.dataButton}
                    disabled={visibleProjects.length === 0}
                    aria-label="Next slide"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </header>

            {visibleProjects.length === 0 ? (
              <div style={styles.emptyState}>No visible projects to show.</div>
            ) : (
              (() => {
                const allRecentlyCompleted = getRecentlyCompletedTasks(slideProject);
                const allNextUp = getNextUpTasks(slideProject);
                const allRecentUpdates = slideProject.recentActivity;

                // Filter out hidden items and take the first N visible ones that fit
                const slideRecentUpdates = allRecentUpdates
                  .filter(activity => !hiddenSlideItems.recentUpdates.includes(activity.id))
                  .slice(0, slideItemCounts.recentUpdates);
                const slideRecentlyCompleted = allRecentlyCompleted
                  .filter(task => !hiddenSlideItems.recentlyCompleted.includes(task.id))
                  .slice(0, slideItemCounts.recentlyCompleted);
                const slideNextUp = allNextUp
                  .filter(task => !hiddenSlideItems.nextUp.includes(task.id))
                  .slice(0, slideItemCounts.nextUp);

                return (
                  <div style={styles.slideStage}>
                    <div style={styles.slideControlRail}>
                      {isEditingSlide && (
                        <button
                          onClick={() => generateExecSummary(slideProject.id)}
                          style={{
                            ...styles.slideControlButton,
                            opacity: isGeneratingSummary ? 0.5 : 1,
                          }}
                          disabled={isGeneratingSummary || !apiKey}
                          title={!apiKey ? 'API key required' : 'AI generate summary (g)'}
                        >
                          <Sparkles size={14} />
                          <span>AI generate</span>
                          <span style={{ fontSize: '10px', opacity: 0.6, marginLeft: '4px' }}>G</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (!isEditingSlide) {
                            startEditingExecSummary(slideProject.id, slideProject.executiveUpdate || slideProject.description);
                          }
                          toggleSlideEditMode();
                        }}
                        style={{
                          ...styles.slideControlButton,
                          backgroundColor: isEditingSlide ? 'var(--coral)' + '15' : 'transparent',
                          borderColor: isEditingSlide ? 'var(--coral)' : 'var(--cloud)',
                          color: isEditingSlide ? 'var(--coral)' : 'var(--charcoal)'
                        }}
                        title={isEditingSlide ? 'Save and exit edit mode (Ctrl+Enter)' : 'Edit slide (e)'}
                      >
                        <Edit2 size={14} />
                        <span>{isEditingSlide ? 'Save' : 'Edit'}</span>
                        <span style={{ fontSize: '10px', opacity: 0.6, marginLeft: '4px' }}>
                          {isEditingSlide ? 'Ctrl+⏎' : 'E'}
                        </span>
                      </button>
                    </div>
                    <div style={styles.slideSurface}>
                      <div style={styles.slideSurfaceInner}>
                        {/* Header with name, description subtitle, and project details */}
                        <div style={styles.slideCompactHeader}>
                          <div style={styles.slideHeaderTop}>
                            <h3 style={styles.slideTitle}>{slideProject.name}</h3>
                            {slideProject.description && (
                              <p style={styles.slideSubtitle}>{slideProject.description}</p>
                            )}
                          </div>
                          <div style={styles.slideHeaderMeta}>
                            <Calendar size={14} style={{ color: 'var(--stone)' }} />
                            <span>Target {slideProject.targetDate ? new Date(slideProject.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD'}</span>
                            <span style={styles.slideDivider}>•</span>
                            <span style={{
                              ...styles.slideInlineBadge,
                              backgroundColor: getPriorityColor(slideProject.priority) + '20',
                              color: getPriorityColor(slideProject.priority)
                            }}>
                              {slideProject.priority} priority
                            </span>
                            <span style={styles.slideInlineBadge}>{slideProject.status}</span>
                            {slideProject.stakeholders.length > 0 && (
                              <>
                                <span style={styles.slideDivider}>•</span>
                                <Users size={14} style={{ color: 'var(--stone)', marginLeft: '4px' }} />
                                <div style={styles.slideStakeholderNames}>
                                  {formatStakeholderNames(slideProject.stakeholders)}
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Main content grid - 2 columns */}
                        <div style={styles.slideMainGrid}>
                          {/* Left column - Executive Summary and Recent Updates */}
                          <div style={styles.slideLeftColumn}>
                            {/* Executive Update */}
                            <div style={{ ...styles.slideSecondaryPanel, ...styles.slideExecSummaryPanel }}>
                              <div style={styles.slidePanelHeader}>
                                <div style={styles.slidePanelTitle}>Executive Update</div>
                              </div>
                              {editingExecSummary === slideProject.id ? (
                                <div>
                                  <textarea
                                    value={execSummaryDraft}
                                    onChange={(e) => setExecSummaryDraft(e.target.value)}
                                    style={styles.execSummaryInput}
                                    placeholder="Write executive update..."
                                    autoFocus
                                  />
                                </div>
                              ) : (
                                <div style={styles.slideExecSummary}>
                                  {slideProject.executiveUpdate || slideProject.description || 'No executive update yet.'}
                                </div>
                              )}
                            </div>

                            {/* Recent updates */}
                            <div ref={recentUpdatesRef} style={{ ...styles.slideSecondaryPanel, ...styles.slideUpdatesPanel }}>
                              <div style={styles.slidePanelHeader}>
                                <div style={styles.slidePanelTitle}>Recent updates</div>
                              </div>
                              <div style={styles.slideUpdatesContent}>
                                {slideRecentUpdates.length > 0 ? (
                                  <ul style={styles.momentumList}>
                                    {slideRecentUpdates.map((activity, idx) => (
                                      <li key={activity.id || idx} style={styles.momentumListItem}>
                                        <div style={styles.momentumListRow}>
                                          <span style={styles.momentumListStrong}>{activity.author}</span>
                                          <span style={styles.momentumListMeta}>{formatDateTime(activity.date)}</span>
                                          {isEditingSlide && (
                                            <button
                                              onClick={() => hideSlideItem('recentUpdates', activity.id)}
                                              style={styles.slideRemoveButton}
                                              title="Remove from slide"
                                            >
                                              <X size={14} />
                                            </button>
                                          )}
                                        </div>
                                        <div style={styles.momentumListText}>{activity.note}</div>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <div style={styles.momentumEmptyText}>No updates yet.</div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right column - Recently Completed and Next Up */}
                          <div style={styles.slideRightColumn}>
                            {/* Recently Completed */}
                            <div ref={recentlyCompletedRef} style={{ ...styles.slideSecondaryPanel, ...styles.slideTasksPanel }}>
                              <div style={styles.slidePanelHeader}>
                                <div style={styles.slidePanelTitle}>Recently Completed</div>
                              </div>
                              {slideRecentlyCompleted.length > 0 ? (
                                <ul style={styles.momentumList}>
                                  {slideRecentlyCompleted.map((task, idx) => (
                                    <li key={`${task.taskTitle}-${task.title}-${idx}`} style={styles.momentumListItem}>
                                      <div style={styles.momentumListRow}>
                                        <span style={styles.momentumListStrong}>{task.taskTitle} → {task.title}</span>
                                        <span style={{ ...styles.actionDueText, color: task.dueDateInfo.color }}>
                                          {task.dueDateInfo.text}
                                        </span>
                                        {isEditingSlide && (
                                          <button
                                            onClick={() => hideSlideItem('recentlyCompleted', task.id)}
                                            style={styles.slideRemoveButton}
                                            title="Remove from slide"
                                          >
                                            <X size={14} />
                                          </button>
                                        )}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <div style={styles.momentumEmptyText}>No recently completed tasks.</div>
                              )}
                            </div>

                            {/* Next Up */}
                            <div ref={nextUpRef} style={{ ...styles.slideSecondaryPanel, ...styles.slideTasksPanel }}>
                              <div style={styles.slidePanelHeader}>
                                <div style={styles.slidePanelTitle}>Next Up</div>
                              </div>
                              {slideNextUp.length > 0 ? (
                                <ul style={styles.momentumList}>
                                  {slideNextUp.map((task, idx) => (
                                    <li key={`${task.taskTitle}-${task.title}-${idx}`} style={styles.momentumListItem}>
                                      <div style={styles.momentumListRow}>
                                        <span style={styles.momentumListStrong}>{task.taskTitle} → {task.title}</span>
                                        <span style={{ ...styles.actionDueText, color: task.dueDateInfo.color }}>
                                          {task.dueDateInfo.text}
                                        </span>
                                        {isEditingSlide && (
                                          <button
                                            onClick={() => hideSlideItem('nextUp', task.id)}
                                            style={styles.slideRemoveButton}
                                            title="Remove from slide"
                                          >
                                            <X size={14} />
                                          </button>
                                        )}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <div style={styles.momentumEmptyText}>No upcoming tasks.</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </>
        ) : (
          // Projects Overview
          <>
            <header style={styles.header}>
              <div>
                <h2 style={styles.pageTitle}>Your Projects</h2>
                <p style={styles.pageSubtitle}>
                  {activeProjects.length} active · {completedProjects.length} completed/closed · {visibleProjects.length} total
                </p>
              </div>
              <div style={styles.headerActions}>
                <div style={styles.primaryActionGroup}>
                  <button
                    onClick={() => setShowNewProject(prev => !prev)}
                    style={styles.newProjectButton}
                  >
                    <Plus size={18} />
                    New Project
                  </button>
                </div>
                <div style={styles.lockControlGroup}>
                  <div style={styles.lockHint}>
                    <span style={styles.lockHintTitle}>Delete projects</span>
                    <span style={styles.lockHintSubtitle}>Unlock to enable deletion</span>
                  </div>
                  <button
                    onClick={() => setProjectDeletionEnabled(prev => !prev)}
                    style={{
                      ...styles.activityLockButton,
                      backgroundColor: projectDeletionEnabled ? 'var(--coral)' + '12' : '#FFFFFF',
                      borderColor: projectDeletionEnabled ? 'var(--coral)' : 'var(--cloud)',
                      color: projectDeletionEnabled ? 'var(--coral)' : 'var(--charcoal)'
                    }}
                    title={projectDeletionEnabled ? 'Lock to disable project deletion' : 'Unlock to delete projects'}
                  >
                    {projectDeletionEnabled ? <Unlock size={18} /> : <Lock size={18} />}
                  </button>
                </div>
              </div>
            </header>

            {showNewProject && (
              <div style={styles.newProjectPanel}>
                <div style={styles.sectionHeaderRow}>
                  <div>
                    <h3 style={styles.sectionTitle}>New project</h3>
                    <p style={styles.sectionSubtitle}>Capture the basics and start planning.</p>
                  </div>
                </div>
                <div style={styles.newProjectFormGrid}>
                  <div style={styles.formField}>
                    <label style={styles.formLabel}>Name</label>
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.ctrlKey && e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateProject();
                        }
                      }}
                      placeholder="What are we shipping?"
                      style={styles.input}
                      autoFocus
                    />
                  </div>
                  <div style={{ ...styles.formField, gridColumn: 'span 2' }}>
                    <label style={styles.formLabel}>Description</label>
                    <textarea
                      value={newProjectDescription}
                      onChange={(e) => setNewProjectDescription(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.ctrlKey && e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateProject();
                        }
                      }}
                      placeholder="Objectives, scope, or the decision driving this work"
                      style={styles.projectUpdateInput}
                    />
                  </div>
                  <div style={styles.formField}>
                    <label style={styles.formLabel}>Priority</label>
                    <select
                      value={newProjectPriority}
                      onChange={(e) => setNewProjectPriority(e.target.value)}
                      style={styles.select}
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div style={styles.formField}>
                    <label style={styles.formLabel}>Status</label>
                    <select
                      value={newProjectStatus}
                      onChange={(e) => setNewProjectStatus(e.target.value)}
                      style={styles.select}
                    >
                      <option value="planning">Planning</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div style={styles.formField}>
                    <label style={styles.formLabel}>Target date</label>
                    <input
                      type="date"
                      value={newProjectTargetDate}
                      onChange={(e) => setNewProjectTargetDate(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formField}>
                    <label style={styles.formLabel}>Stakeholders</label>
                    <input
                      type="text"
                      value={newProjectStakeholders}
                      onChange={(e) => setNewProjectStakeholders(e.target.value)}
                      placeholder="Comma-separated names"
                      style={styles.input}
                    />
                  </div>
                </div>
                <div style={styles.newProjectActions}>
                  <button
                    onClick={handleCreateProject}
                    disabled={!newProjectName.trim()}
                    style={{
                      ...styles.primaryButton,
                      opacity: newProjectName.trim() ? 1 : 0.5,
                      cursor: newProjectName.trim() ? 'pointer' : 'not-allowed'
                    }}
                  >
                    Create project
                  </button>
                  <button
                    onClick={() => {
                      setShowNewProject(false);
                      resetNewProjectForm();
                    }}
                    style={styles.skipButton}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div style={styles.projectsSection}>
              {visibleProjects.length === 0 ? (
                <div style={styles.emptyState}>
                  No projects assigned to {loggedInUser}. Select another person to see their work.
                </div>
              ) : (
                <>
                  <div style={styles.sectionHeaderRow}>
                    <div>
                      <h3 style={styles.sectionTitle}>Active & Upcoming</h3>
                      <p style={styles.sectionSubtitle}>{activeProjects.length} in progress</p>
                    </div>
                  </div>

                  {activeProjects.length === 0 ? (
                    <div style={styles.emptyState}>
                      All projects for {loggedInUser} are finished. Completed and closed work is listed below.
                    </div>
                  ) : (
                    <div style={styles.projectsGrid}>
                      {activeProjects.map((project, index) => renderProjectCard(project, index))}
                    </div>
                  )}

                  {completedProjects.length > 0 && (
                    <div style={{ marginTop: '32px' }}>
                      <div style={styles.sectionHeaderRow}>
                        <div>
                          <h3 style={styles.sectionTitle}>Completed & Closed</h3>
                          <p style={styles.sectionSubtitle}>{completedProjects.length} wrapped up</p>
                        </div>
                      </div>
                      <div style={styles.projectsGrid}>
                        {completedProjects.map((project, index) => renderProjectCard(project, index + activeProjects.length))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </main>
    </div>
    </>
  );
}

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    width: '100%',
    backgroundColor: 'var(--cream)',
    fontFamily: "'Crimson Pro', Georgia, serif",
    position: 'relative',
    '--earth': '#8B6F47',
    '--sage': '#7A9B76',
    '--coral': '#D67C5C',
    '--amber': '#E8A75D',
    '--cream': '#FAF8F3',
    '--cloud': '#E8E3D8',
    '--stone': '#6B6554',
    '--charcoal': '#3A3631',
  },

  sidebar: {
    width: '280px',
    backgroundColor: '#FFFFFF',
    borderRight: '1px solid var(--cloud)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: '24px',
    padding: '32px clamp(16px, 3vw, 24px)',
    boxSizing: 'border-box',
    flexShrink: 0,
    transition: 'width 0.2s ease, padding 0.2s ease, transform 0.2s ease',
    position: 'relative',
  },

  sidebarCollapsed: {
    width: '68px',
    padding: '32px 12px',
  },

  sidebarContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
    flex: 1,
    transition: 'opacity 0.2s ease',
  },

  sidebarCollapseToggle: {
    position: 'absolute',
    top: '16px',
    right: '-12px',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: '1px solid var(--cloud)',
    backgroundColor: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
    zIndex: 2,
  },

  sidebarCollapsedContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },

  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '48px',
  },

  logoIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    backgroundColor: 'var(--earth)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, var(--earth) 0%, var(--amber) 100%)',
  },

  logoText: {
    fontSize: '24px',
    fontWeight: '600',
    color: 'var(--charcoal)',
    margin: 0,
    letterSpacing: '-0.5px',
  },

  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },

  navItem: {
    padding: '12px 16px',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--stone)',
    fontSize: '15px',
    fontFamily: "'Inter', sans-serif",
    textAlign: 'left',
    cursor: 'pointer',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    fontWeight: '500',
  },

  navItemActive: {
    backgroundColor: 'var(--cream)',
    color: 'var(--earth)',
  },

  sidebarActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },

  newProjectButton: {
    padding: '12px 18px',
    border: '1px solid var(--earth)',
    backgroundColor: 'var(--earth)',
    color: '#FFFFFF',
    fontSize: '15px',
    fontFamily: "'Inter', sans-serif",
    cursor: 'pointer',
    borderRadius: '999px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
    fontWeight: '700',
    boxShadow: '0 10px 30px rgba(139, 111, 71, 0.25)',
  },

  settingsIconButton: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    border: '1px solid var(--cloud)',
    backgroundColor: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--stone)',
    transition: 'all 0.2s ease',
    alignSelf: 'flex-start',
  },

  dataButton: {
    padding: '8px 12px',
    borderRadius: '10px',
    border: '1px solid var(--cloud)',
    backgroundColor: '#fff',
    color: 'var(--charcoal)',
    cursor: 'pointer',
    fontWeight: 600,
    letterSpacing: '0.2px',
    transition: 'all 0.2s ease',
  },

  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },

  topBarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },


  userIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 12px',
    border: '1px solid var(--cloud)',
    borderRadius: '12px',
    backgroundColor: '#fff',
    boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
  },

  userAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: 'var(--earth)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontFamily: "'Inter', sans-serif",
    letterSpacing: '0.2px',
  },

  userDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },

  userLabel: {
    fontSize: '12px',
    color: 'var(--stone)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontFamily: "'Inter', sans-serif",
  },

  userSelect: {
    border: '1px solid var(--cloud)',
    borderRadius: '8px',
    padding: '6px 8px',
    fontFamily: "'Inter', sans-serif",
    fontSize: '14px',
    color: 'var(--charcoal)',
    backgroundColor: '#fff',
    minWidth: '180px',
  },

  editingAsHint: {
    marginTop: '6px',
    fontSize: '12px',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
  },

  editingAsName: {
    fontWeight: 600,
    color: 'var(--charcoal)',
  },

  shortcutHint: {
    marginTop: '4px',
    fontSize: '12px',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
  },

  strongText: {
    color: 'var(--charcoal)',
  },

  emText: {
    color: 'var(--charcoal)',
    fontStyle: 'italic',
  },

  inlineCode: {
    backgroundColor: '#F4F1EB',
    borderRadius: '6px',
    padding: '2px 6px',
    fontSize: '13px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },

  richList: {
    margin: '8px 0 12px 0',
    paddingLeft: '20px',
    color: 'var(--charcoal)',
    fontFamily: "'Inter', sans-serif",
  },

  richListItem: {
    marginBottom: '6px',
    lineHeight: 1.5,
  },

  richHeading: {
    margin: '10px 0 6px 0',
    color: 'var(--charcoal)',
    fontFamily: "'Inter', sans-serif",
  },

  richParagraph: {
    margin: '4px 0 10px 0',
    color: 'var(--charcoal)',
    fontFamily: "'Inter', sans-serif",
    lineHeight: 1.6,
  },

  emptyState: {
    gridColumn: '1 / -1',
    padding: '24px',
    border: '1px dashed var(--cloud)',
    borderRadius: '12px',
    textAlign: 'center',
    backgroundColor: '#fff',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
  },

  main: {
    flex: 1,
    padding: '48px clamp(24px, 4vw, 64px)',
    overflowY: 'auto',
    minWidth: 0,
    transition: 'padding 0.2s ease',
  },

  header: {
    marginBottom: '32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  pageTitle: {
    fontSize: '28px',
    fontWeight: '600',
    color: 'var(--charcoal)',
    margin: '0 0 4px 0',
    letterSpacing: '-0.5px',
  },

  pageSubtitle: {
    fontSize: '14px',
    color: 'var(--stone)',
    margin: 0,
    fontFamily: "'Inter', sans-serif",
  },

  lockHint: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    alignItems: 'flex-end',
  },

  lockHintTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--charcoal)',
    fontFamily: "'Inter', sans-serif",
  },

  lockHintSubtitle: {
    fontSize: '12px',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
  },

  newProjectPanel: {
    marginTop: '16px',
    padding: '20px 24px',
    borderRadius: '16px',
    border: '1px solid var(--cloud)',
    background: 'linear-gradient(135deg, #FFFFFF 0%, #F7F1E9 100%)',
    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.06)',
  },

  newProjectFormGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '14px 16px',
    marginTop: '12px',
  },

  formField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },

  formLabel: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--charcoal)',
    fontFamily: "'Inter', sans-serif",
    letterSpacing: '0.2px',
  },

  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid var(--cloud)',
    backgroundColor: '#FFFFFF',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--charcoal)',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    boxShadow: '0 6px 18px rgba(0,0,0,0.03)',
  },

  select: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid var(--cloud)',
    backgroundColor: '#FFFFFF',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--charcoal)',
    boxShadow: '0 6px 18px rgba(0,0,0,0.03)',
  },

  newProjectActions: {
    marginTop: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },

  projectsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
    gap: '24px',
  },

  projectsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },

  sectionHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },

  projectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    border: '1px solid var(--cloud)',
    animation: 'fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) backwards',
    cursor: 'pointer',
  },

  '@keyframes fadeInUp': {
    from: {
      opacity: 0,
      transform: 'translateY(20px)',
    },
    to: {
      opacity: 1,
      transform: 'translateY(0)',
    },
  },

  cardHeader: {
    marginBottom: '14px',
    paddingBottom: '14px',
    borderBottom: '1px solid var(--cloud)',
  },

  cardTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px',
  },

  projectTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--charcoal)',
    margin: 0,
    letterSpacing: '-0.3px',
  },

  priorityBadge: {
    padding: '3px 10px',
    borderRadius: '16px',
    fontSize: '11px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  stakeholders: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  stakeholderText: {
    fontSize: '14px',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
  },

  progressSection: {
    marginBottom: '20px',
  },

  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },

  progressLabel: {
    fontSize: '13px',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  progressValue: {
    fontSize: '14px',
    color: 'var(--charcoal)',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
  },

  progressBar: {
    height: '8px',
    backgroundColor: 'var(--cloud)',
    borderRadius: '4px',
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
    borderRadius: '4px',
  },

  // Timeline styles
  timelineSection: {
    marginBottom: '32px',
    padding: '24px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid var(--cloud)',
  },

  timelineHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },

  timelineSectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--charcoal)',
    margin: 0,
    fontFamily: "'Inter', sans-serif",
  },

  timelineZoomControl: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px',
    minWidth: '200px',
  },

  timelineZoomLabel: {
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    color: 'var(--charcoal)',
  },

  timelineZoomSlider: {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    outline: 'none',
    appearance: 'none',
    WebkitAppearance: 'none',
    background: 'linear-gradient(90deg, var(--cream) 0%, var(--earth) 100%)',
    cursor: 'pointer',
  },

  timelineZoomTicks: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: '-2px',
  },

  timelineZoomTick: {
    fontSize: '10px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '500',
    color: 'var(--stone)',
    opacity: 0.6,
  },

  timelineContainer: {
    position: 'relative',
    paddingTop: '80px',
    paddingBottom: '80px',
    overflow: 'hidden',
  },

  timelineBar: {
    position: 'relative',
    height: '8px',
    backgroundColor: 'var(--cloud)',
    borderRadius: '4px',
    marginBottom: '12px',
  },

  timelineBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
    background: 'linear-gradient(90deg, var(--cloud) 0%, var(--earth) 100%)',
    borderRadius: '4px',
    opacity: 0.3,
  },

  timelineMarker: {
    position: 'absolute',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 2,
  },

  timelineMarkerDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    border: '2px solid #FFFFFF',
    boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },


  timelineLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '8px',
  },

  timelineLabel: {
    fontSize: '12px',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '500',
  },

  updateSection: {
    marginBottom: '20px',
    padding: '16px',
    backgroundColor: 'var(--cream)',
    borderRadius: '8px',
    borderLeft: '3px solid var(--amber)',
  },

  updateLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '8px',
  },

  updateText: {
    fontSize: '14px',
    color: 'var(--charcoal)',
    margin: 0,
    fontFamily: "'Inter', sans-serif",
    lineHeight: '1.6',
  },

  actionsSection: {
    marginBottom: '20px',
  },

  actionsSectionTitle: {
    fontSize: '13px',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '12px',
    margin: '0 0 12px 0',
  },

  actionItemSmall: {
    display: 'flex',
    gap: '10px',
    marginBottom: '8px',
    alignItems: 'flex-start',
  },

  actionTextContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },

  actionTextSmall: {
    fontSize: '14px',
    color: 'var(--charcoal)',
    fontFamily: "'Inter', sans-serif",
    lineHeight: '1.5',
  },

  actionDueText: {
    fontSize: '12px',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
  },

  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '20px',
    borderTop: '1px solid var(--cloud)',
  },

  cardFooterActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },

  lastActivityText: {
    fontSize: '13px',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
  },

  cardButton: {
    padding: '8px 16px',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--earth)',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'all 0.2s ease',
  },

  cardDeleteButton: {
    padding: '8px 10px',
    border: '1px solid var(--coral)',
    backgroundColor: 'var(--coral)' + '12',
    color: 'var(--coral)',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '700',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s ease',
  },

  // Modal Styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(58, 54, 49, 0.6)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.3s ease',
  },

  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: '24px',
    width: '90%',
    maxWidth: '640px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    animation: 'scaleIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  },

  modalHeader: {
    padding: '40px 40px 32px',
    borderBottom: '1px solid var(--cloud)',
    textAlign: 'center',
  },

  modalIconWrapper: {
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, var(--amber) 0%, var(--coral) 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
  },

  modalTitle: {
    fontSize: '28px',
    fontWeight: '600',
    color: 'var(--charcoal)',
    margin: '0 0 12px 0',
    letterSpacing: '-0.5px',
  },

  modalSubtitle: {
    fontSize: '16px',
    color: 'var(--stone)',
    margin: 0,
    fontFamily: "'Inter', sans-serif",
  },

  modalBody: {
    padding: '32px 40px 40px',
  },

  dangerNote: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'var(--coral)' + '12',
    color: 'var(--coral)',
    padding: '10px 12px',
    borderRadius: '10px',
    fontWeight: '700',
  },

  confirmLabel: {
    fontSize: '13px',
    color: 'var(--stone)',
    fontWeight: '600',
    fontFamily: "'Inter', sans-serif",
  },

  confirmInput: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid var(--cloud)',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--charcoal)',
  },

  recentUpdatesSection: {
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: 'var(--cream)',
    borderRadius: '8px',
  },

  recentUpdatesTitle: {
    fontSize: '12px',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    margin: '0 0 12px 0',
  },

  recentUpdateItem: {
    marginBottom: '12px',
    paddingBottom: '12px',
  },

  recentUpdateHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },

  recentUpdateAuthor: {
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    color: 'var(--charcoal)',
  },

  recentUpdateTime: {
    fontSize: '12px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--stone)',
  },

  recentUpdateText: {
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--charcoal)',
    margin: 0,
    lineHeight: '1.5',
  },

  tasksSection: {
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: '#FFFBF5',
    borderRadius: '8px',
    border: '1px solid #F5E6D3',
  },

  tasksSectionTitle: {
    fontSize: '12px',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    margin: '0 0 12px 0',
  },

  taskNeedingAttention: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
  },

  taskNeedingAttentionContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },

  taskNeedingAttentionTitle: {
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    color: 'var(--charcoal)',
  },

  taskNeedingAttentionTask: {
    fontSize: '11px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--stone)',
    fontStyle: 'italic',
  },

  taskNeedingAttentionDate: {
    fontSize: '11px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--charcoal)',
    fontWeight: '600',
  },

  taskNeedingAttentionDue: {
    fontSize: '12px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },

  projectContext: {
    backgroundColor: 'var(--cream)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
  },

  contextRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '12px',
  },

  contextText: {
    fontSize: '14px',
    color: 'var(--charcoal)',
    fontFamily: "'Inter', sans-serif",
    lineHeight: '1.6',
  },

  nextActions: {
    marginBottom: '24px',
    padding: '20px',
    backgroundColor: '#FFFBF5',
    borderRadius: '12px',
    border: '1px solid #F5E6D3',
  },

  nextActionsTitle: {
    fontSize: '14px',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    margin: '0 0 16px 0',
  },

  actionItem: {
    display: 'flex',
    gap: '12px',
    marginBottom: '12px',
    alignItems: 'flex-start',
  },

  actionText: {
    fontSize: '15px',
    color: 'var(--charcoal)',
    fontFamily: "'Inter', sans-serif",
    lineHeight: '1.6',
  },

  textarea: {
    width: '100%',
    minHeight: '140px',
    padding: '16px',
    border: '2px solid var(--cloud)',
    borderRadius: '12px',
    fontSize: '15px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--charcoal)',
    resize: 'vertical',
    transition: 'border-color 0.2s ease',
    backgroundColor: '#FFFFFF',
    lineHeight: '1.6',
  },

  modalActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
    marginBottom: '16px',
  },

  primaryButton: {
    flex: 1,
    padding: '14px 24px',
    border: 'none',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, var(--earth) 0%, var(--amber) 100%)',
    color: '#FFFFFF',
    fontSize: '15px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(139, 111, 71, 0.3)',
  },

  secondaryButton: {
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid var(--cloud)',
    backgroundColor: '#FFFFFF',
    color: 'var(--charcoal)',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  dangerButton: {
    padding: '12px 18px',
    border: 'none',
    borderRadius: '10px',
    backgroundColor: 'var(--coral)',
    color: '#FFFFFF',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 8px 16px rgba(214, 124, 92, 0.2)',
    transition: 'all 0.2s ease',
  },

  skipButton: {
    padding: '14px 20px',
    border: '1px solid var(--cloud)',
    borderRadius: '10px',
    backgroundColor: '#FFFFFF',
    color: 'var(--stone)',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
  },

  skipAllButton: {
    padding: '14px 20px',
    border: '1px solid var(--coral)',
    borderRadius: '10px',
    backgroundColor: '#FFFFFF',
    color: 'var(--coral)',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
  },

  keyboardHint: {
    fontSize: '12px',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
    margin: '0 0 16px 0',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  progressIndicator: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '32px',
  },

  progressDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    transition: 'all 0.3s ease',
  },

  // Project Details Styles
  detailsContainer: {
    animation: 'fadeIn 0.4s ease',
  },

  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--stone)',
    fontSize: '15px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '500',
    cursor: 'pointer',
    marginBottom: '24px',
    transition: 'color 0.2s ease',
  },

  detailsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '28px',
    paddingBottom: '20px',
    borderBottom: '1px solid var(--cloud)',
  },

  detailsTitle: {
    fontSize: '36px',
    fontWeight: '600',
    color: 'var(--charcoal)',
    margin: '0 0 8px 0',
    letterSpacing: '-0.8px',
  },

  detailsDescription: {
    fontSize: '16px',
    color: 'var(--stone)',
    margin: 0,
    fontFamily: "'Inter', sans-serif",
    lineHeight: '1.6',
    maxWidth: '600px',
  },

  priorityBadgeLarge: {
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '12px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: '380px 1fr',
    gap: '32px',
  },

  // Compact Info Bar Styles
  compactInfoBar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },

  compactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '10px',
    padding: '16px',
    border: '1px solid var(--cloud)',
  },

  compactCardTitle: {
    fontSize: '11px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: 'var(--stone)',
    margin: '0 0 10px 0',
  },

  compactInfoGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },

  compactInfoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  compactInfoLabel: {
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--stone)',
    fontWeight: '500',
  },

  compactInfoValue: {
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--charcoal)',
    fontWeight: '600',
  },

  compactSelect: {
    padding: '4px 8px',
    border: '2px solid var(--cloud)',
    borderRadius: '6px',
    fontSize: '12px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--charcoal)',
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
    fontWeight: '600',
  },

  statusBadgeSmall: {
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '700',
    backgroundColor: 'var(--sage)' + '20',
    color: 'var(--sage)',
    textTransform: 'capitalize',
  },

  stakeholderCompactList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },

  stakeholderCompactItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '6px',
  },

  stakeholderAvatarSmall: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--earth) 0%, var(--amber) 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#FFFFFF',
    fontSize: '10px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    flexShrink: 0,
  },

  stakeholderInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },

  stakeholderNameSmall: {
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--charcoal)',
    fontWeight: '500',
  },

  stakeholderTeam: {
    fontSize: '11px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--stone)',
    fontWeight: '500',
  },

  noTasksText: {
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--stone)',
    fontStyle: 'italic',
    margin: 0,
  },

  nextActionsCompactList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },

  nextActionCompactItem: {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-start',
  },

  nextActionCompactContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },

  nextActionTextSmall: {
    fontSize: '13px',
    color: 'var(--charcoal)',
    fontFamily: "'Inter', sans-serif",
    lineHeight: '1.5',
  },

  nextActionDueText: {
    fontSize: '12px',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
  },

  moreActionsText: {
    fontSize: '12px',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
    fontStyle: 'italic',
    marginTop: '4px',
  },

  // Main Content Grid
  mainContentGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },

  planSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid var(--cloud)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    height: 'fit-content',
  },

  activitySection: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid var(--cloud)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    height: 'fit-content',
  },

  sectionHeader: {
    marginBottom: '20px',
    paddingBottom: '12px',
    borderBottom: '1px solid var(--cloud)',
  },

  sectionHeaderCompact: {
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },

  sectionTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--charcoal)',
    margin: 0,
    letterSpacing: '-0.3px',
  },

  sectionSubtitle: {
    fontSize: '13px',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
  },

  activityControlsRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: '12px'
  },

  activityLockButton: {
    border: '1px solid var(--cloud)',
    backgroundColor: '#FFFFFF',
    borderRadius: '10px',
    padding: '6px',
    cursor: 'pointer',
    color: 'var(--charcoal)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease'
  },

  projectUpdateWrapper: {
    marginBottom: '20px',
  },

  projectUpdateInput: {
    width: '100%',
    minHeight: '70px',
    padding: '10px 44px 10px 10px',
    border: '1px solid var(--cloud)',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--charcoal)',
    resize: 'vertical',
    lineHeight: '1.5',
    backgroundColor: '#FFFFFF',
  },

  activityListCompact: {
    display: 'flex',
    flexDirection: 'column',
  },

  activityItemCompact: {
    padding: '12px 0',
    animation: 'fadeIn 0.3s ease backwards',
  },

  activityNoteRow: {
    marginTop: '8px',
  },

  activityEditRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-start',
  },

  activityNoteInput: {
    flex: 1,
    minHeight: '64px',
    border: '1px solid var(--cloud)',
    borderRadius: '10px',
    padding: '10px',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--charcoal)',
    resize: 'vertical',
    backgroundColor: '#FFFFFF',
  },

  activityDeleteButton: {
    border: 'none',
    background: '#FFECEC',
    color: 'var(--coral)',
    borderRadius: '10px',
    cursor: 'pointer',
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  activityHeaderCompact: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '6px',
  },

  activitySeparator: {
    height: '1px',
    backgroundColor: 'var(--cloud)',
    opacity: 0.5,
  },

  detailsLeftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },

  detailsRightColumn: {
    display: 'flex',
    flexDirection: 'column',
  },

  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid var(--cloud)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },

  infoCardTitle: {
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: 'var(--stone)',
    margin: '0 0 20px 0',
  },

  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '16px',
    marginBottom: '16px',
    borderBottom: '1px solid var(--cloud)',
  },

  infoLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--stone)',
    fontWeight: '500',
  },

  infoValue: {
    fontSize: '15px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--charcoal)',
    fontWeight: '600',
  },

  statusBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    backgroundColor: 'var(--sage)' + '20',
    color: 'var(--sage)',
    textTransform: 'capitalize',
  },

  stakeholderItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 0',
    borderBottom: '1px solid var(--cloud)',
  },

  stakeholderAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--earth) 0%, var(--amber) 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#FFFFFF',
    fontSize: '12px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
  },

  stakeholderName: {
    fontSize: '15px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--charcoal)',
    fontWeight: '500',
  },

  actionItemLarge: {
    display: 'flex',
    gap: '12px',
    marginBottom: '14px',
    alignItems: 'flex-start',
    paddingBottom: '14px',
    borderBottom: '1px solid var(--cloud)',
  },

  actionTextLarge: {
    fontSize: '15px',
    color: 'var(--charcoal)',
    fontFamily: "'Inter', sans-serif",
    lineHeight: '1.6',
  },

  activityFeed: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    padding: '32px',
    border: '1px solid var(--cloud)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    height: 'fit-content',
  },

  activityFeedTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: 'var(--charcoal)',
    margin: '0 0 8px 0',
    letterSpacing: '-0.3px',
  },

  activityFeedSubtitle: {
    fontSize: '14px',
    color: 'var(--stone)',
    margin: '0 0 28px 0',
    fontFamily: "'Inter', sans-serif",
  },

  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },

  activityItem: {
    paddingBottom: '24px',
    borderBottom: '1px solid var(--cloud)',
    animation: 'fadeInLeft 0.5s ease backwards',
  },

  activityItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },

  activityAuthor: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },

  activityAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--sage) 0%, var(--earth) 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#FFFFFF',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
  },

  activityAuthorName: {
    fontSize: '15px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    color: 'var(--charcoal)',
    marginBottom: '4px',
  },

  activityTime: {
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--stone)',
  },

  activityNote: {
    fontSize: '15px',
    color: 'var(--charcoal)',
    fontFamily: "'Inter', sans-serif",
    lineHeight: '1.7',
    margin: '0 0 0 52px',
  },

  // Edit Mode Styles
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },

  primaryActionGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },

  lockControlGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    border: '1px solid var(--cloud)',
    borderRadius: '12px',
    backgroundColor: '#FFFFFF',
    boxShadow: '0 8px 24px rgba(58, 54, 49, 0.06)',
  },

  editButton: {
    padding: '8px 14px',
    border: '1px solid var(--cloud)',
    borderRadius: '8px',
    backgroundColor: '#FFFFFF',
    color: 'var(--earth)',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s ease',
  },

  saveButton: {
    padding: '8px 14px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: 'var(--sage)',
    color: '#FFFFFF',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s ease',
  },

  cancelButton: {
    padding: '8px 14px',
    border: '1px solid var(--cloud)',
    borderRadius: '8px',
    backgroundColor: '#FFFFFF',
    color: 'var(--stone)',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s ease',
  },

  editTextarea: {
    width: '100%',
    padding: '12px',
    border: '2px solid var(--cloud)',
    borderRadius: '8px',
    fontSize: '15px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--charcoal)',
    resize: 'vertical',
    lineHeight: '1.6',
    backgroundColor: '#FFFFFF',
  },

  editSelect: {
    padding: '8px 12px',
    border: '2px solid var(--cloud)',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--charcoal)',
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
    fontWeight: '600',
  },

  // Plan Styles
  planList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },

  taskItem: {
    borderRadius: '8px',
    border: '1px solid var(--cloud)',
    overflow: 'hidden',
  },

  taskHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    backgroundColor: '#FFFFFF',
  },

  taskHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },

  taskTitle: {
    fontSize: '15px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    color: 'var(--charcoal)',
  },

  dueDateBadge: {
    fontSize: '12px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    marginLeft: '8px',
  },

  dueDateInput: {
    padding: '4px 8px',
    border: '2px solid var(--amber)',
    borderRadius: '6px',
    fontSize: '12px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    marginLeft: '8px',
  },

  subtaskDueDateInput: {
    padding: '3px 6px',
    border: '2px solid var(--amber)',
    borderRadius: '4px',
    fontSize: '11px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
  },

  taskHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },

  taskProgress: {
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    color: 'var(--stone)',
  },

  subtaskList: {
    backgroundColor: 'var(--cream)',
    padding: '12px',
    borderTop: '1px solid var(--cloud)',
  },

  subtaskItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: '6px',
    transition: 'background-color 0.2s ease',
    backgroundColor: '#FFFFFF',
    marginBottom: '6px',
  },

  subtaskCheckbox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },

  subtaskTitle: {
    flex: 1,
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--charcoal)',
    lineHeight: '1.5',
    cursor: 'pointer',
  },

  subtaskDueDate: {
    fontSize: '11px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    padding: '3px 8px',
    borderRadius: '4px',
    backgroundColor: 'var(--cloud)',
  },

  commentButton: {
    padding: '6px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: 'var(--stone)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },

  taskTitleInput: {
    flex: 1,
    fontSize: '15px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    color: 'var(--charcoal)',
    border: '2px solid var(--earth)',
    borderRadius: '4px',
    padding: '4px 8px',
    backgroundColor: '#FFFFFF',
  },

  subtaskTitleInput: {
    flex: 1,
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--charcoal)',
    border: '2px solid var(--earth)',
    borderRadius: '4px',
    padding: '4px 8px',
    backgroundColor: '#FFFFFF',
  },

  taskActionButton: {
    padding: '6px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: 'var(--stone)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },

  subtaskActionButton: {
    padding: '4px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: 'var(--stone)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },

  subtaskDeleteButton: {
    padding: '4px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: 'var(--coral)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },

  commentBox: {
    backgroundColor: '#FFFFFF',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '6px',
    border: '2px solid var(--amber)',
  },

  commentInput: {
    width: '100%',
    minHeight: '60px',
    padding: '8px',
    border: '1px solid var(--cloud)',
    borderRadius: '4px',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--charcoal)',
    resize: 'vertical',
    lineHeight: '1.5',
    marginBottom: '8px',
  },

  commentActions: {
    display: 'flex',
    gap: '8px',
  },

  commentSubmit: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '6px',
    background: 'linear-gradient(135deg, var(--earth) 0%, var(--amber) 100%)',
    color: '#FFFFFF',
    fontSize: '12px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'all 0.2s ease',
  },

  commentCancel: {
    padding: '6px 12px',
    border: '1px solid var(--cloud)',
    borderRadius: '6px',
    backgroundColor: '#FFFFFF',
    color: 'var(--stone)',
    fontSize: '12px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  addSubtaskButton: {
    width: '100%',
    padding: '8px 12px',
    border: '2px dashed var(--cloud)',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    color: 'var(--stone)',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'all 0.2s ease',
    marginTop: '6px',
  },

  addSubtaskBox: {
    backgroundColor: '#FFFFFF',
    padding: '12px',
    borderRadius: '6px',
    marginTop: '6px',
    border: '2px solid var(--sage)',
  },

  addSubtaskInput: {
    width: '100%',
    padding: '8px',
    border: '1px solid var(--cloud)',
    borderRadius: '4px',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--charcoal)',
    marginBottom: '8px',
  },

  addSubtaskActions: {
    display: 'flex',
    gap: '8px',
  },

  addSubtaskSubmit: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '6px',
    background: 'linear-gradient(135deg, var(--sage) 0%, var(--earth) 100%)',
    color: '#FFFFFF',
    fontSize: '12px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  addSubtaskCancel: {
    padding: '6px 12px',
    border: '1px solid var(--cloud)',
    borderRadius: '6px',
    backgroundColor: '#FFFFFF',
    color: 'var(--stone)',
    fontSize: '12px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  addTaskButton: {
    width: '100%',
    padding: '12px 16px',
    border: '2px dashed var(--cloud)',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    color: 'var(--stone)',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
    marginTop: '16px',
  },

  addTaskBox: {
    backgroundColor: '#FFFFFF',
    padding: '16px',
    borderRadius: '8px',
    marginTop: '16px',
    border: '2px solid var(--earth)',
  },

  addTaskInput: {
    width: '100%',
    padding: '10px',
    border: '1px solid var(--cloud)',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--charcoal)',
    marginBottom: '10px',
  },

  addTaskActions: {
    display: 'flex',
    gap: '10px',
  },

  addTaskSubmit: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    background: 'linear-gradient(135deg, var(--earth) 0%, var(--amber) 100%)',
    color: '#FFFFFF',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  addTaskCancel: {
    padding: '8px 16px',
    border: '1px solid var(--cloud)',
    borderRadius: '6px',
    backgroundColor: '#FFFFFF',
    color: 'var(--stone)',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  taskContextBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '6px',
    backgroundColor: 'var(--amber)' + '20',
    color: 'var(--earth)',
    fontSize: '12px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    marginBottom: '8px',
  },

  // Add Update Styles
  addUpdateSection: {
    marginBottom: '32px',
    padding: '20px',
    backgroundColor: 'var(--cream)',
    borderRadius: '12px',
    border: '2px dashed var(--cloud)',
  },

  updateInput: {
    width: '100%',
    minHeight: '80px',
    padding: '12px',
    border: '2px solid var(--cloud)',
    borderRadius: '8px',
    fontSize: '15px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--charcoal)',
    resize: 'vertical',
    lineHeight: '1.6',
    marginBottom: '12px',
    backgroundColor: '#FFFFFF',
  },

  addUpdateButton: {
    padding: '10px 18px',
    border: 'none',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, var(--earth) 0%, var(--amber) 100%)',
    color: '#FFFFFF',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
  },

  // Timeline View Styles
  timelineViewContainer: {
    maxWidth: '800px',
    margin: '0 auto',
  },

  timelineUpdateSection: {
    marginBottom: '24px',
  },

  timelineInputWrapper: {
    position: 'relative',
  },

  timelineInput: {
    width: '100%',
    minHeight: '80px',
    padding: '12px 48px 12px 12px',
    border: '1px solid var(--cloud)',
    borderRadius: '8px',
    fontSize: '15px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--charcoal)',
    resize: 'vertical',
    lineHeight: '1.5',
    backgroundColor: '#FFFFFF',
    transition: 'border-color 0.2s ease',
  },

  tagSuggestions: {
    position: 'absolute',
    bottom: '48px',
    left: '0',
    right: '48px',
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--cloud)',
    borderRadius: '6px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    maxHeight: '200px',
    overflowY: 'auto',
    zIndex: 1000,
  },

  tagSuggestionItem: {
    padding: '8px 12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderBottom: '1px solid var(--cloud)',
    transition: 'background-color 0.15s ease',
  },

  tagTypeLabel: {
    padding: '2px 6px',
    borderRadius: '3px',
    fontSize: '9px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },

  tagSuggestionDisplay: {
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--charcoal)',
    fontWeight: '500',
  },

  timelineSubmitButtonCompact: {
    position: 'absolute',
    bottom: '10px',
    right: '10px',
    width: '32px',
    height: '32px',
    padding: '0',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: 'var(--earth)',
    color: '#FFFFFF',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },

  timelineFeed: {
    display: 'flex',
    flexDirection: 'column',
  },

  timelineActivityItemCompact: {
    padding: '14px 0',
    animation: 'fadeIn 0.3s ease backwards',
  },

  timelineActivityHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '8px',
  },

  activityAuthorCompact: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  activityAvatarSmall: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--sage) 0%, var(--earth) 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#FFFFFF',
    fontSize: '10px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
  },

  activityAuthorNameCompact: {
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    color: 'var(--charcoal)',
  },

  projectBadgeSmall: {
    padding: '3px 8px',
    borderRadius: '4px',
    backgroundColor: 'var(--earth)' + '15',
    color: 'var(--earth)',
    fontSize: '11px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
  },

  activityTimeCompact: {
    fontSize: '12px',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
    marginLeft: 'auto',
  },

  taskContextBadgeCompact: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 8px',
    borderRadius: '4px',
    backgroundColor: 'var(--amber)' + '15',
    color: 'var(--amber)',
    fontSize: '11px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    marginBottom: '6px',
  },

  activityNoteCompact: {
    fontSize: '14px',
    color: 'var(--charcoal)',
    fontFamily: "'Inter', sans-serif",
    lineHeight: '1.6',
    margin: '0',
  },

  timelineSeparator: {
    height: '1px',
    backgroundColor: 'var(--cloud)',
    opacity: 0.5,
  },

  tagInlineCompact: {
    padding: '1px 6px',
    borderRadius: '3px',
    backgroundColor: 'var(--amber)' + '20',
    color: 'var(--earth)',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
  },

  // Thrust View
  thrustLayout: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    alignItems: 'start',
  },

  thrustChatPanel: {
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--cloud)',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 10px 30px rgba(139, 111, 71, 0.08)',
  },

  thrustPill: {
    padding: '6px 12px',
    borderRadius: '999px',
    backgroundColor: 'var(--sage)' + '20',
    color: 'var(--earth)',
    fontSize: '12px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '700',
    letterSpacing: '0.3px',
  },

  thrustChatFeed: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    margin: '16px 0 12px',
    maxHeight: '520px',
    overflowY: 'auto',
    paddingRight: '4px',
  },

  thrustAlert: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'var(--coral)' + '15',
    color: 'var(--earth)',
    border: '1px solid var(--coral)' + '40',
    borderRadius: '10px',
    padding: '10px 12px',
    marginTop: '12px',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
  },

  thrustStatusRow: {
    padding: '8px 10px',
    backgroundColor: 'var(--cloud)' + '30',
    color: 'var(--stone)',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 600,
    fontFamily: "'Inter', sans-serif",
    marginTop: '10px',
  },

  thrustStatusCard: {
    border: '1px dashed var(--cloud)',
    borderRadius: '10px',
    padding: '12px',
    backgroundColor: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },

  thrustStatusInline: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
    fontSize: '13px',
  },

  thrustStatusText: {
    fontSize: '13px',
    color: 'var(--charcoal)',
    fontFamily: "'Inter', sans-serif",
  },

  thrustStatusHeading: {
    fontSize: '12px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: 700,
    color: 'var(--stone)',
    marginBottom: '6px',
  },

  thrustActionList: {
    margin: 0,
    paddingLeft: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    color: 'var(--charcoal)',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
  },

  thrustActionListItem: {
    lineHeight: 1.5,
  },

  thrustMessageCard: {
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid var(--cloud)',
    backgroundColor: 'var(--cream)',
    animation: 'fadeIn 0.25s ease backwards',
  },

  thrustMessageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '6px',
  },

  thrustMessageBody: {
    margin: 0,
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--charcoal)',
    lineHeight: '1.6',
  },

  thrustActionStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '12px',
  },

  thrustActionCard: {
    border: '1px solid var(--cloud)',
    borderRadius: '10px',
    padding: '10px',
    backgroundColor: '#FFFFFF',
  },

  thrustActionRow: {
    marginTop: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },

  thrustActionLabel: {
    backgroundColor: 'var(--sage)' + '20',
    color: 'var(--earth)',
    borderRadius: '6px',
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: 700,
    fontFamily: "'Inter', sans-serif",
  },

  thrustActionUndo: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 10px',
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--cloud)',
    borderRadius: '6px',
    color: 'var(--charcoal)',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 600,
    fontFamily: "'Inter', sans-serif",
    gap: '4px',
  },

  thrustActionDetailText: {
    marginTop: '8px',
    fontSize: '13px',
    color: 'var(--charcoal)',
    fontFamily: "'Inter', sans-serif",
    lineHeight: 1.5,
  },

  thrustActionDetailList: {
    margin: '8px 0 0',
    paddingLeft: '18px',
    color: 'var(--charcoal)',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
  },

  thrustActionDetailItem: {
    marginBottom: '4px',
    lineHeight: 1.5,
  },

  thrustUndoTag: {
    backgroundColor: 'var(--cloud)' + '40',
    color: 'var(--stone)',
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '12px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: 600,
  },

  thrustMetaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '4px',
  },

  thrustInfoPanel: {
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--cloud)',
    borderRadius: '16px',
    boxShadow: '0 10px 30px rgba(58, 54, 49, 0.06)',
    overflow: 'hidden',
    transition: 'all 0.2s ease',
  },

  thrustInfoHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 18px',
    borderBottom: '1px solid var(--cloud)',
  },

  thrustInfoTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },

  thrustInfoLabel: {
    fontSize: '14px',
    color: 'var(--charcoal)',
    fontWeight: '700',
    margin: 0,
  },

  thrustInfoSubtle: {
    fontSize: '12px',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
    marginTop: '2px',
  },

  thrustInfoContent: {
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxHeight: '500px',
    overflowY: 'auto',
  },

  momentumProjectCard: {
    border: '1px solid var(--cloud)',
    borderRadius: '12px',
    backgroundColor: '#FFFFFF',
    padding: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    animation: 'fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) backwards',
  },

  momentumProjectToggle: {
    width: '100%',
    background: 'transparent',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    cursor: 'pointer',
    padding: '6px',
    margin: '-6px',
    borderRadius: '8px',
    transition: 'background-color 0.2s ease',
  },

  momentumProjectHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '10px',
    flex: 1,
  },

  momentumProjectName: {
    margin: 0,
    fontSize: '17px',
    fontWeight: '600',
    color: 'var(--charcoal)',
    textAlign: 'left',
    letterSpacing: '-0.3px',
  },

  momentumProjectMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: 'var(--stone)',
    fontSize: '12px',
    fontFamily: "'Inter', sans-serif",
    marginTop: '4px',
  },

  momentumProjectMetaRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  momentumProjectBody: {
    borderTop: '1px solid var(--cloud)',
    marginTop: '12px',
    paddingTop: '12px',
    display: 'grid',
    gap: '12px',
  },

  momentumSummarySection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '10px',
    backgroundColor: 'var(--cream)',
    borderRadius: '8px',
    borderLeft: '3px solid var(--amber)',
  },

  momentumSummaryTitle: {
    fontSize: '11px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    color: 'var(--stone)',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    marginBottom: '2px',
  },

  momentumList: {
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },

  momentumListItem: {
    listStyle: 'none',
    marginLeft: '0',
    paddingLeft: '0',
    paddingBottom: '6px',
  },

  momentumListRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },

  momentumListStrong: {
    fontWeight: 700,
    color: 'var(--charcoal)',
    fontFamily: "'Inter', sans-serif",
    fontSize: '14px',
  },

  momentumListMeta: {
    fontSize: '12px',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
  },

  momentumListText: {
    fontSize: '13px',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
    lineHeight: 1.5,
    marginTop: '3px',
  },

  momentumEmptyText: {
    fontSize: '13px',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
  },

  slidesCounter: {
    fontSize: '13px',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
    marginRight: '12px',
  },

  slidesControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  slideStage: {
    display: 'flex',
    justifyContent: 'center',
    padding: '12px 0',
    position: 'relative',
  },

  slideControlRail: {
    position: 'absolute',
    left: '-84px',
    top: '30px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    zIndex: 2,
  },

  slideControlButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 10px',
    border: '1px solid var(--cloud)',
    borderRadius: '8px',
    backgroundColor: '#fff',
    color: 'var(--stone)',
    cursor: 'pointer',
    boxShadow: '0 6px 14px rgba(0,0,0,0.08)',
    fontSize: '12px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    transition: 'all 0.2s ease',
  },

  slideRemoveButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: 'var(--coral)',
    color: '#fff',
    cursor: 'pointer',
    marginLeft: '8px',
    transition: 'all 0.15s ease',
    flexShrink: 0,
  },

  slideSurface: {
    width: '100%',
    maxWidth: '1100px',
    aspectRatio: '16 / 9',
    borderRadius: '18px',
    border: '1px solid var(--cloud)',
    background: 'linear-gradient(135deg, #FFFFFF 0%, #F7F2EA 100%)',
    boxShadow: '0 18px 50px rgba(0,0,0,0.08)',
    overflow: 'hidden',
    position: 'relative',
  },

  slideSurfaceInner: {
    position: 'absolute',
    inset: '0',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    boxSizing: 'border-box',
  },

  slideCompactHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    paddingBottom: '12px',
    borderBottom: '1px solid var(--cloud)',
  },

  slideHeaderTop: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },

  slideHeaderLeft: {
    flex: 1,
    minWidth: 0,
  },

  slideTitle: {
    margin: 0,
    fontSize: '22px',
    fontWeight: '600',
    color: 'var(--charcoal)',
    letterSpacing: '-0.4px',
  },

  slideSubtitle: {
    margin: 0,
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--charcoal)',
    lineHeight: '1.5',
  },

  slideHeaderMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--stone)',
  },

  slideDivider: {
    color: 'var(--cloud)',
    fontSize: '12px',
  },

  slideInlineBadge: {
    padding: '4px 10px',
    borderRadius: '999px',
    backgroundColor: 'var(--cloud)',
    color: 'var(--charcoal)',
    fontSize: '12px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  slideStakeholdersCompact: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },

  slideStakeholderCompact: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },

  slideStakeholderName: {
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    color: 'var(--charcoal)',
    whiteSpace: 'nowrap',
  },

  slideStakeholderNames: {
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    color: 'var(--charcoal)',
    marginLeft: '2px',
  },

  slideMainGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '14px',
    flex: 1,
    minHeight: 0,
    alignItems: 'stretch',
  },

  slideSecondaryPanel: {
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--cloud)',
    borderRadius: '10px',
    padding: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    display: 'flex',
    flexDirection: 'column',
  },

  slideLeftColumn: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    gap: '14px',
  },

  slideRightColumn: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    gap: '14px',
  },

  slidePanelHeader: {
    marginBottom: '10px',
  },

  slidePanelTitle: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--stone)',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    margin: 0,
    fontFamily: "'Inter', sans-serif",
  },

  slideExecSummary: {
    fontSize: '13px',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
    lineHeight: 1.6,
    padding: '8px',
    borderRadius: '10px',
    backgroundColor: 'var(--cloud)' + '30',
  },

  slideExecSummaryPanel: {
    flexShrink: 0,
  },

  slideUpdatesPanel: {
    flex: 1,
    overflow: 'hidden',
    minHeight: 0,
  },

  slideUpdatesContent: {
    overflow: 'hidden',
  },

  slideTasksPanel: {
    background: 'linear-gradient(180deg, #FFFFFF 0%, #F6F8F2 100%)',
    borderColor: 'var(--sage)',
    boxShadow: '0 6px 16px rgba(0,0,0,0.06)',
    flex: 1,
    overflow: 'hidden',
    minHeight: 0,
  },

  iconButton: {
    padding: '6px',
    border: '1px solid var(--cloud)',
    borderRadius: '6px',
    backgroundColor: '#FFFFFF',
    color: 'var(--stone)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },

  execSummaryInput: {
    width: '100%',
    minHeight: '80px',
    padding: '8px',
    border: '1px solid var(--cloud)',
    borderRadius: '6px',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--charcoal)',
    resize: 'vertical',
    lineHeight: '1.6',
  },

  thrustProjectHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },

  thrustProjectName: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--charcoal)',
  },

  thrustProjectMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'var(--stone)',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    marginTop: '6px',
  },

  thrustStatGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '12px',
  },

  thrustStatCard: {
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid var(--cloud)',
    backgroundColor: 'var(--cream)',
  },

  thrustStatLabel: {
    fontSize: '12px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--stone)',
    fontWeight: '700',
    letterSpacing: '0.3px',
    textTransform: 'uppercase',
    marginBottom: '6px',
  },

  thrustStakeholders: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
  },

  avatarCircle: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    backgroundColor: 'var(--earth)' + '15',
    color: 'var(--earth)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '700',
  },

  thrustOverflow: {
    fontSize: '12px',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '700',
  },

  thrustProgressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: 'var(--cloud)',
    borderRadius: '999px',
    overflow: 'hidden',
  },

  thrustProgressFill: {
    height: '100%',
    background: 'linear-gradient(135deg, var(--earth) 0%, var(--sage) 100%)',
  },

  thrustProgressHint: {
    fontSize: '12px',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
    marginTop: '6px',
  },
};
