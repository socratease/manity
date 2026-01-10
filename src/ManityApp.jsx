import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { Plus, Users, Clock, TrendingUp, CheckCircle2, Circle, ChevronLeft, ChevronRight, MessageCircle, Sparkles, ArrowLeft, Calendar, AlertCircle, Edit2, Send, ChevronDown, Check, X, MessageSquare, Settings, Lock, Unlock, Trash2, RotateCcw, Search, User, UserCircle } from 'lucide-react';
import { usePortfolioData } from './hooks/usePortfolioData';
import { useInitiatives } from './hooks/useInitiatives';
import { callOpenAIChat } from './lib/llmClient';
import ForceDirectedTimeline from './components/ForceDirectedTimeline';
import PeopleGraph from './components/PeopleGraph';
import PersonPicker from './components/PersonPicker';
import AddPersonCallout from './components/AddPersonCallout';
import PeopleProjectsJuggle from './components/PeopleProjectsJuggle';
import { supportedMomentumActions, validateThrustActions as validateThrustActionsUtil, resolveMomentumProjectRef as resolveMomentumProjectRefUtil } from './lib/momentumValidation';
import { MOMENTUM_THRUST_SYSTEM_PROMPT } from './lib/momentumPrompts';
import { verifyThrustActions } from './lib/momentumVerification';
import { useSeasonalEffect, useSeasonalTheme } from './themes/hooks';
import { parseTaggedText } from './lib/taggedText';
import { getAllTags } from './lib/tagging';
import MomentumChatWithAgent from './components/MomentumChatWithAgent';
import Slides from './components/Slides';
import DataPage from './components/DataPage';

const generateActivityId = () => `act-${Math.random().toString(36).slice(2, 9)}`;

export default function ManityApp({ onOpenSettings = () => {} }) {
  const timelineInputRef = useRef(null);
  const projectUpdateInputRef = useRef(null);
  const recentUpdatesRef = useRef(null);
  const recentlyCompletedRef = useRef(null);
  const nextUpRef = useRef(null);

  const {
    projects,
    setProjects,
    people,
    createPerson,
    updatePerson,
    deletePerson,
    sendEmail,
    createProject: apiCreateProject,
    updateProject,
    deleteProject: apiDeleteProject,
    addTask,
    updateTask,
    deleteTask: apiDeleteTask,
    addSubtask,
    updateSubtask,
    deleteSubtask: apiDeleteSubtask,
    addActivity,
    updateActivity,
    deleteActivity: apiDeleteActivity
  } = usePortfolioData();
  const { initiatives, createInitiative, deleteInitiative } = useInitiatives();

  const [showDailyCheckin, setShowDailyCheckin] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [checkinNote, setCheckinNote] = useState('');
  const [activeView, setActiveView] = useState('people');
  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewInitiative, setShowNewInitiative] = useState(false);
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
  const [taskCommentingOn, setTaskCommentingOn] = useState(null);
  const [taskComment, setTaskComment] = useState('');
  const [hoveredCommentItem, setHoveredCommentItem] = useState(null);
  const [expandedActionMessages, setExpandedActionMessages] = useState({});
  const [addingNewTask, setAddingNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [editingDueDate, setEditingDueDate] = useState(null);
  const [tempDueDate, setTempDueDate] = useState('');
  const [editingCompletedDate, setEditingCompletedDate] = useState(false); // true when editing done date instead of due date
  const [editingAssignee, setEditingAssignee] = useState(null); // 'task-{id}' or 'subtask-{id}' when editing assignee
  const [assigneeSearchTerm, setAssigneeSearchTerm] = useState('');
  const [assigneeFocusedIndex, setAssigneeFocusedIndex] = useState(0);
  const [timelineUpdate, setTimelineUpdate] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [tagSearchTerm, setTagSearchTerm] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedTagIndex, setSelectedTagIndex] = useState(0);
  const [showProjectTagSuggestions, setShowProjectTagSuggestions] = useState(false);
  const [projectTagSearchTerm, setProjectTagSearchTerm] = useState('');
  const [projectUpdateCursorPosition, setProjectUpdateCursorPosition] = useState(0);
  const [selectedProjectTagIndex, setSelectedProjectTagIndex] = useState(0);
  const [showThrustTagSuggestions, setShowThrustTagSuggestions] = useState(false);
  const [thrustTagSearchTerm, setThrustTagSearchTerm] = useState('');
  const [thrustCursorPosition, setThrustCursorPosition] = useState(0);
  const [selectedThrustTagIndex, setSelectedThrustTagIndex] = useState(0);
  const [showCheckinTagSuggestions, setShowCheckinTagSuggestions] = useState(false);
  const [checkinTagSearchTerm, setCheckinTagSearchTerm] = useState('');
  const [checkinCursorPosition, setCheckinCursorPosition] = useState(0);
  const [selectedCheckinTagIndex, setSelectedCheckinTagIndex] = useState(0);
  const [activityEditEnabled, setActivityEditEnabled] = useState(false);
  const [activityEdits, setActivityEdits] = useState({});
  const [projectDeletionEnabled, setProjectDeletionEnabled] = useState(false);
  const [initiativeDeletionEnabled, setInitiativeDeletionEnabled] = useState(false);
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
  const [newInitiativeName, setNewInitiativeName] = useState('');
  const [newInitiativeDescription, setNewInitiativeDescription] = useState('');
  const [newInitiativeStatus, setNewInitiativeStatus] = useState('planning');
  const [newInitiativePriority, setNewInitiativePriority] = useState('medium');
  const [newInitiativeTargetDate, setNewInitiativeTargetDate] = useState('');
  const SIDEBAR_MIN_WIDTH = 200;
  const SIDEBAR_MAX_WIDTH = 360;
  const DEFAULT_SIDEBAR_WIDTH = 238;
  const SIDEBAR_WIDTH_STORAGE_KEY = 'manity_sidebar_width';
  const SEASONAL_THEME_STORAGE_KEY = 'manity_seasonal_theme_enabled';

  const clampSidebarWidth = useCallback(
    (width) => Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width)),
    []
  );

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const storedWidth = localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
    if (storedWidth) {
      const parsed = parseInt(storedWidth, 10);
      if (!Number.isNaN(parsed)) {
        return clampSidebarWidth(parsed);
      }
    }
    return DEFAULT_SIDEBAR_WIDTH;
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [sidebarResizeStart, setSidebarResizeStart] = useState({ x: 0, width: DEFAULT_SIDEBAR_WIDTH });
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [timelineView, setTimelineView] = useState(6); // Timeline zoom in months (1-24)
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectPriority, setNewProjectPriority] = useState('medium');
  const [newProjectStatus, setNewProjectStatus] = useState('planning');
  const [newProjectTargetDate, setNewProjectTargetDate] = useState('');
  const [newProjectStakeholders, setNewProjectStakeholders] = useState([]);
  const [stakeholderSelectionTarget, setStakeholderSelectionTarget] = useState(null);
  const adminUsers = [
    { name: 'Chris Graves', team: 'Admin' }
  ];
  const [loggedInUser, setLoggedInUser] = useState(() => {
    // Load from localStorage on initial mount
    return localStorage.getItem('manity_logged_in_user') || '';
  });
  useEffect(() => {
    if (loggedInUser) {
      localStorage.setItem('manity_logged_in_user', loggedInUser);
    } else {
      localStorage.removeItem('manity_logged_in_user');
    }
  }, [loggedInUser]);
  const resolvedLoggedInUser = loggedInUser?.trim() || '';
  const activityAuthor = resolvedLoggedInUser || undefined;
  const defaultOwnerStakeholder = resolvedLoggedInUser
    ? [{ name: resolvedLoggedInUser, team: 'Owner' }]
    : [];

  const [focusedField, setFocusedField] = useState(null);
  const [taskEditEnabled, setTaskEditEnabled] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');
  const [editingSubtask, setEditingSubtask] = useState(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('');
  const [editingExecSummary, setEditingExecSummary] = useState(null);
  const [execSummaryDraft, setExecSummaryDraft] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [isEditingSlide, setIsEditingSlide] = useState(false);

  // Global search state
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchSelectedIndex, setGlobalSearchSelectedIndex] = useState(0);
  const globalSearchInputRef = useRef(null);
  const globalSearchResultsRef = useRef(null);

  // Persistent portfolio filter (stays after search modal closes)
  const [portfolioFilter, setPortfolioFilter] = useState('');

  // Momentum highlight state - tracks recently updated projects from AI with timestamps
  const [recentlyUpdatedProjects, setRecentlyUpdatedProjects] = useState({});

  // Momentum chat redesign - portfolio panel state
  const [portfolioMinimized, setPortfolioMinimized] = useState(true);
  const [activeProjectInChat, setActiveProjectInChat] = useState(null);
  const [hoveredMessageProject, setHoveredMessageProject] = useState(null);

  // People page featured node (for search navigation)
  const [featuredPersonId, setFeaturedPersonId] = useState(null);
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

  const [seasonalThemeEnabled, setSeasonalThemeEnabled] = useState(() => {
    const saved = localStorage.getItem(SEASONAL_THEME_STORAGE_KEY);
    if (saved === null) {
      return true;
    }
    return saved === 'true';
  });

  const seasonalTheme = useSeasonalTheme(undefined, seasonalThemeEnabled);
  const EffectComponent = useSeasonalEffect(undefined, seasonalThemeEnabled);
  const showSeasonalBanner = seasonalTheme.id !== 'base';
  const seasonalBannerGradient = `linear-gradient(90deg, ${seasonalTheme.colors.earth} 0%, ${seasonalTheme.colors.sage} 25%, ${seasonalTheme.colors.amber} 50%, ${seasonalTheme.colors.coral} 75%, ${seasonalTheme.colors.earth} 100%)`;

  const [showDataPage, setShowDataPage] = useState(() => {
    const saved = localStorage.getItem('manity_show_data_page');
    return saved === 'true';
  });

  const sortActivitiesDesc = (activities = []) =>
    [...activities].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const syncProjectActivity = (project, activities = project.recentActivity || []) => {
    const sorted = sortActivitiesDesc(activities);
    return {
      ...project,
      recentActivity: sorted,
      lastUpdate: sorted[0]?.note || project.lastUpdate || ''
    };
  };

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
                  enum: ["comment", "add_task", "update_task", "add_subtask", "update_subtask", "update_project", "create_project", "add_person", "send_email", "query_portfolio"],
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
                recipients: {
                  description: "Email recipients (comma-separated or array)",
                  anyOf: [
                    { type: "string" },
                    {
                      type: "array",
                      items: { type: "string" }
                    }
                  ]
                },
                subject: {
                  type: "string",
                  description: "Email subject"
                },
                body: {
                  type: "string",
                  description: "Email body content"
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
                  description: "Status of task, subtask, or project. Use todo/in-progress/completed for tasks; planning/active/on-hold/cancelled/completed for projects (use 'active' instead of 'in_progress')."
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
                },
                name: {
                  type: "string",
                  description: "Project name (for create_project action)"
                },
                description: {
                  type: "string",
                  description: "Project description (for create_project action)"
                },
                priority: {
                  type: "string",
                  enum: ["low", "medium", "high"],
                  description: "Project priority (for create_project action)"
                },
                stakeholders: {
                  type: "string",
                  description: "Comma-separated list of stakeholder names (for create_project action)"
                },
                scope: {
                  type: "string",
                  enum: ["portfolio", "project", "people"],
                  description: "Data to fetch when using query_portfolio"
                },
                detailLevel: {
                  type: "string",
                  enum: ["summary", "detailed"],
                  description: "Level of detail for query_portfolio responses"
                },
                includePeople: {
                  type: "boolean",
                  description: "Whether to include People data when querying the portfolio"
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

  useEffect(() => {
    localStorage.setItem('manity_show_data_page', showDataPage ? 'true' : 'false');
    if (!showDataPage && activeView === 'data') {
      setActiveView('people');
      window.location.hash = '#/people';
    }
  }, [activeView, showDataPage]);

  useEffect(() => {
    localStorage.setItem(SEASONAL_THEME_STORAGE_KEY, seasonalThemeEnabled ? 'true' : 'false');
  }, [seasonalThemeEnabled]);

  // Persist sidebar width
  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  useEffect(() => {
    if (!isResizingSidebar) return undefined;

    const initialCursor = document.body.style.cursor;
    const initialUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (event) => {
      const delta = event.clientX - sidebarResizeStart.x;
      setSidebarWidth(clampSidebarWidth(sidebarResizeStart.width + delta));
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.cursor = initialCursor;
      document.body.style.userSelect = initialUserSelect;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [clampSidebarWidth, isResizingSidebar, sidebarResizeStart.x, sidebarResizeStart.width]);

  const startSidebarResize = (event) => {
    if (isSidebarCollapsed) return;

    setSidebarResizeStart({ x: event.clientX, width: sidebarWidth });
    setIsResizingSidebar(true);
    event.preventDefault();
  };

  // URL hash routing - sync URL with app state
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1); // Remove #

      if (!hash) {
        // Default to people view
        setActiveView('people');
        setViewingProjectId(null);
        return;
      }

      // Parse hash patterns:
      // #/portfolio, #/people, #/thrust, #/slides
      // #/portfolio/project-123
      // #/thrust/project-123
      const parts = hash.split('/').filter(Boolean);

      if (parts.length === 0) {
        setActiveView('people');
        setViewingProjectId(null);
      } else if (parts.length === 1) {
        const view = parts[0];
        if (['portfolio', 'overview', 'people', 'thrust', 'slides', 'timeline', 'data'].includes(view)) {
          if (view === 'data' && !showDataPage) {
            window.location.hash = '#/people';
            return;
          }
          setActiveView(view);
          setViewingProjectId(null);
        }
      } else if (parts.length >= 2) {
        const view = parts[0];
        const projectId = parts[1];

        if (view === 'portfolio' || view === 'overview') {
          setActiveView(view);
          setViewingProjectId(projectId);
        } else if (view === 'project') {
          setActiveView('overview');
          setViewingProjectId(projectId);
        } else if (view === 'thrust') {
          setActiveView('thrust');
          setActiveProjectInChat(projectId);
          setPortfolioMinimized(false);
          setExpandedMomentumProjects(prev => ({
            ...prev,
            [projectId]: true
          }));
        }
      }
    };

    // Handle initial load
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [showDataPage]);

  // Helper function to update URL hash
  const updateHash = (view, projectId = null) => {
    if (projectId) {
      window.location.hash = `#/${view}/${projectId}`;
    } else {
      window.location.hash = `#/${view}`;
    }
  };

  // Sync people from projects whenever projects change (handles imports and updates)
  useEffect(() => {
    if (projects.length > 0) {
      syncAllPeopleFromProjects(projects);
    }
  }, [projects]);

  // Handle hash-based navigation (e.g., #/project/:id)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const projectMatch = hash.match(/#\/project\/(.+)/);

      if (projectMatch) {
        const projectId = projectMatch[1];
        setActiveView('overview');
        setViewingProjectId(projectId);
        // Optionally expand the first task
        const project = projects.find(p => p.id === projectId);
        if (project && project.plan.length > 0) {
          setExpandedTasks(prev => ({ ...prev, [project.plan[0].id]: true }));
        }
      }
    };

    // Handle initial hash on mount
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [projects]);

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
        if (e.ctrlKey && e.key === 'Enter' && isEditingSlide && editingExecSummary) {
          e.preventDefault();
          // Save changes via API
          const projectId = editingExecSummary;
          updateProject(projectId, { executiveUpdate: execSummaryDraft }).catch(err =>
            console.error('Failed to save executive summary:', err)
          );
          // Exit edit mode
          setIsEditingSlide(false);
          setEditingExecSummary(null);
          setExecSummaryDraft('');
        }
        // Handle Esc to cancel edit mode without saving
        if (e.key === 'Escape' && isEditingSlide) {
          e.preventDefault();
          setIsEditingSlide(false);
          setEditingExecSummary(null);
          setExecSummaryDraft('');
        }
        return;
      }

      const visibleProjects = projects.filter(p => p.status !== 'deleted');
      if (visibleProjects.length === 0) return;
      const slideProject = visibleProjects[currentSlideIndex % visibleProjects.length];

      // Ctrl+Enter: Save and exit edit mode (when focus is outside textarea)
      if (e.ctrlKey && e.key === 'Enter' && isEditingSlide && editingExecSummary) {
        e.preventDefault();
        // Save changes via API
        const projectId = editingExecSummary;
        updateProject(projectId, { executiveUpdate: execSummaryDraft }).catch(err =>
          console.error('Failed to save executive summary:', err)
        );
        // Exit edit mode
        setIsEditingSlide(false);
        setEditingExecSummary(null);
        setExecSummaryDraft('');
        return;
      }

      // Esc: Cancel edit mode without saving (when focus is outside textarea)
      if (e.key === 'Escape' && isEditingSlide) {
        e.preventDefault();
        setIsEditingSlide(false);
        setEditingExecSummary(null);
        setExecSummaryDraft('');
        return;
      }

      // 'e' key: Enter edit mode
      if (e.key === 'e' && !isEditingSlide) {
        e.preventDefault();
        startEditingExecSummary(slideProject.id, slideProject.executiveUpdate || slideProject.description);
        setIsEditingSlide(true);
        // Focus will be handled by autoFocus on textarea
      }

      // 'g' key: Generate AI summary (only in edit mode)
      if (e.key === 'g' && isEditingSlide && !isGeneratingSummary) {
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
  }, [activeView, isEditingSlide, currentSlideIndex, projects, isGeneratingSummary]);

  // Global search keyboard shortcut (Cmd/Ctrl+K to open, ESC to close)
  useEffect(() => {
    const handleGlobalSearchKeyDown = (e) => {
      // Open search with Cmd/Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setGlobalSearchOpen(true);
        setGlobalSearchQuery('');
        setGlobalSearchSelectedIndex(0);
        setTimeout(() => globalSearchInputRef.current?.focus(), 0);
      }

      // Close search with ESC (when search is open)
      // Keep the portfolio filter active when closing
      if (e.key === 'Escape' && globalSearchOpen) {
        e.preventDefault();
        // Persist the current search query as the portfolio filter (if on portfolio view)
        if (globalSearchQuery.trim() && activeView === 'overview' && !viewingProjectId) {
          setPortfolioFilter(globalSearchQuery);
        }
        setGlobalSearchOpen(false);
        setGlobalSearchQuery('');
      }
    };

    window.addEventListener('keydown', handleGlobalSearchKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalSearchKeyDown);
  }, [globalSearchOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (globalSearchOpen && globalSearchInputRef.current) {
      globalSearchInputRef.current.focus();
    }
  }, [globalSearchOpen]);

  // Scroll selected search result into view
  useEffect(() => {
    if (globalSearchOpen && globalSearchResultsRef.current) {
      const selectedElement = globalSearchResultsRef.current.querySelector(`[data-search-index="${globalSearchSelectedIndex}"]`);
      selectedElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [globalSearchSelectedIndex, globalSearchOpen]);

  // Close assignee dropdown when clicking outside
  useEffect(() => {
    if (!editingAssignee) return;
    const handleClickOutside = (e) => {
      // Check if click is outside the assignee dropdown
      const dropdown = document.querySelector('[data-assignee-dropdown]');
      if (dropdown && !dropdown.contains(e.target)) {
        setEditingAssignee(null);
        setAssigneeSearchTerm('');
        setAssigneeFocusedIndex(0);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editingAssignee]);

  const handleDailyCheckin = async (projectId) => {
    if (checkinNote.trim()) {
      try {
        await addActivity(projectId, {
          date: new Date().toISOString(),
          note: checkinNote,
        author: activityAuthor
        });
      } catch (error) {
        console.error('Failed to add daily checkin:', error);
      }
      setCheckinNote('');

      // Move to next project the user is a contributor on, or close if done
      const currentIndex = userActiveProjects.findIndex(p => p.id === projectId);
      if (currentIndex < userActiveProjects.length - 1) {
        setSelectedProject(userActiveProjects[currentIndex + 1]);
      } else {
        setShowDailyCheckin(false);
        setSelectedProject(null);
      }
    }
  };

  const handleAddUpdate = async () => {
    if (newUpdate.trim() && viewingProjectId) {
      try {
        await addActivity(viewingProjectId, {
          date: new Date().toISOString(),
          note: newUpdate,
        author: activityAuthor
        });
      } catch (error) {
        console.error('Failed to add update:', error);
      }
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
        setSelectedProjectTagIndex(0); // Reset selection when typing
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
    const tagText = `@${tag.display}`;
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

  const updateActivityNote = async (activityId, newNote) => {
    setActivityEdits(prev => ({
      ...prev,
      [activityId]: newNote
    }));

    // Find which project contains this activity
    const projectWithActivity = projects.find(p =>
      p.recentActivity?.some(activity => activity.id === activityId)
    );
    if (!projectWithActivity) return;

    const activity = projectWithActivity.recentActivity.find(a => a.id === activityId);
    if (!activity) return;

    try {
      await updateActivity(projectWithActivity.id, activityId, {
        date: activity.date,
        note: newNote,
        author: activity.author
      });
    } catch (error) {
      console.error('Failed to update activity note:', error);
    }
  };

  const deleteActivity = async (activityId) => {
    // Find which project contains this activity
    const projectWithActivity = projects.find(p =>
      p.recentActivity?.some(activity => activity.id === activityId)
    );

    if (projectWithActivity) {
      try {
        await apiDeleteActivity(projectWithActivity.id, activityId);
      } catch (error) {
        console.error('Failed to delete activity:', error);
      }
    }

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

  const toggleSubtaskStatus = async (taskId, subtaskId) => {
    const project = projects.find(p => p.id === viewingProjectId);
    if (!project) return;

    const task = project.plan.find(t => t.id === taskId);
    if (!task) return;

    const subtask = task.subtasks.find(st => st.id === subtaskId);
    if (!subtask) return;

    const newStatus = subtask.status === 'completed' ? 'todo' :
                      subtask.status === 'in-progress' ? 'completed' :
                      'in-progress';
    const completedDate = subtask.status === 'in-progress'
      ? new Date().toISOString().split('T')[0]
      : subtask.status === 'completed'
      ? null
      : subtask.completedDate;

    try {
      await updateSubtask(viewingProjectId, taskId, subtaskId, {
        title: subtask.title,
        status: newStatus,
        dueDate: subtask.dueDate,
        completedDate: completedDate
      });
    } catch (error) {
      console.error('Failed to update subtask status:', error);
    }
  };

  const enterEditMode = () => {
    const project = projects.find(p => p.id === viewingProjectId);
    if (project) {
      setEditValues({
        name: project.name,
        status: project.status,
        priority: project.priority,
        stakeholders: project.stakeholders, // Keep full objects for PersonPicker
        description: project.description,
        progressMode: project.progressMode || 'manual',
        progress: project.progress || 0
      });
      setEditMode(true);
    }
  };

  const saveEdits = async () => {
    // editValues.stakeholders is now an array of {name, team} objects from PersonPicker
    const stakeholdersArray = (editValues.stakeholders || []).filter(Boolean);

    const finalStakeholders = stakeholdersArray.length > 0
      ? stakeholdersArray
      : defaultOwnerStakeholder;

    // Sync stakeholders to People database
    await syncStakeholdersToPeople(finalStakeholders);

    // Use updateProject API to persist all edited values
    try {
      await updateProject(viewingProjectId, {
        name: editValues.name,
        status: editValues.status,
        priority: editValues.priority,
        progress: editValues.progress || 0,
        progressMode: editValues.progressMode || 'manual',
        stakeholders: finalStakeholders,
        description: editValues.description
      });

      // Add activity noting the update
      await addActivity(viewingProjectId, {
        date: new Date().toISOString(),
        note: 'Updated project details',
        author: activityAuthor
      });
    } catch (error) {
      console.error('Failed to save project edits:', error);
      // Show error to user if it's a duplicate name error
      if (error.message && error.message.includes('already exists')) {
        alert(error.message);
      }
    }

    setEditMode(false);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setEditValues({});
  };

  const handleAddSubtask = async (taskId) => {
    if (newSubtaskTitle.trim()) {
      const dueDate = newSubtaskDueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      try {
        await addSubtask(viewingProjectId, taskId, {
          title: newSubtaskTitle,
          status: 'todo',
          dueDate: dueDate
        });
      } catch (error) {
        console.error('Failed to add subtask:', error);
      }

      setNewSubtaskTitle('');
      setNewSubtaskDueDate('');
      setAddingSubtaskTo(null);
    }
  };

  const handleAddTask = async () => {
    if (newTaskTitle.trim()) {
      const dueDate = newTaskDueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      try {
        await addTask(viewingProjectId, {
          title: newTaskTitle,
          status: 'todo',
          dueDate: dueDate
        });
      } catch (error) {
        console.error('Failed to add task:', error);
      }

      setNewTaskTitle('');
      setNewTaskDueDate('');
      setAddingNewTask(false);
    }
  };

  const handleUpdateDueDate = async (taskId, subtaskId = null) => {
    if (tempDueDate) {
      const project = projects.find(p => p.id === viewingProjectId);
      if (!project) return;

      const task = project.plan.find(t => t.id === taskId);
      if (!task) return;

      const fieldToUpdate = editingCompletedDate ? 'completedDate' : 'dueDate';

      try {
        if (subtaskId) {
          const subtask = task.subtasks.find(st => st.id === subtaskId);
          if (!subtask) return;

          await updateSubtask(viewingProjectId, taskId, subtaskId, {
            title: subtask.title,
            status: subtask.status,
            dueDate: fieldToUpdate === 'dueDate' ? tempDueDate : subtask.dueDate,
            completedDate: fieldToUpdate === 'completedDate' ? tempDueDate : subtask.completedDate
          });
        } else {
          await updateTask(viewingProjectId, taskId, {
            title: task.title,
            status: task.status,
            dueDate: fieldToUpdate === 'dueDate' ? tempDueDate : task.dueDate,
            completedDate: fieldToUpdate === 'completedDate' ? tempDueDate : task.completedDate
          });
        }
      } catch (error) {
        console.error('Failed to update due date:', error);
      }

      setEditingDueDate(null);
      setTempDueDate('');
      setEditingCompletedDate(false);
    }
  };

  const handleUpdateAssignee = async (taskId, subtaskId, person) => {
    const project = projects.find(p => p.id === viewingProjectId);
    if (!project) return;

    const task = project.plan.find(t => t.id === taskId);
    if (!task) return;

    try {
      if (subtaskId) {
        const subtask = task.subtasks.find(st => st.id === subtaskId);
        if (!subtask) return;

        await updateSubtask(viewingProjectId, taskId, subtaskId, {
          title: subtask.title,
          status: subtask.status,
          dueDate: subtask.dueDate,
          completedDate: subtask.completedDate,
          assignee: person
        });
      } else {
        await updateTask(viewingProjectId, taskId, {
          title: task.title,
          status: task.status,
          dueDate: task.dueDate,
          completedDate: task.completedDate,
          assignee: person
        });
      }
    } catch (error) {
      console.error('Failed to update assignee:', error);
    }

    setEditingAssignee(null);
    setAssigneeSearchTerm('');
    setAssigneeFocusedIndex(0);
  };

  const handleSubtaskComment = async (taskId, subtaskId, taskTitle, subtaskTitle) => {
    if (subtaskComment.trim()) {
      // Include task/subtask context in the note for better traceability
      const contextPrefix = subtaskTitle ? `[${taskTitle} > ${subtaskTitle}] ` : `[${taskTitle}] `;
      const noteWithContext = contextPrefix + subtaskComment;

      try {
        await addActivity(viewingProjectId, {
          date: new Date().toISOString(),
          note: noteWithContext,
          author: activityAuthor,
          // Include taskContext for persistent task/subtask association
          taskContext: {
            taskId,
            subtaskId,
            taskTitle,
            subtaskTitle
          }
        });
      } catch (error) {
        console.error('Failed to add subtask comment:', error);
      }

      setSubtaskComment('');
      setCommentingOn(null);
    }
  };

  const handleTaskComment = async (taskId, taskTitle) => {
    if (taskComment.trim()) {
      // Include task context in the note for better traceability
      const noteWithContext = `[${taskTitle}] ${taskComment}`;

      try {
        await addActivity(viewingProjectId, {
          date: new Date().toISOString(),
          note: noteWithContext,
          author: activityAuthor,
          // Include taskContext for persistent task association
          taskContext: {
            taskId,
            taskTitle
          }
        });
      } catch (error) {
        console.error('Failed to add task comment:', error);
      }

      setTaskComment('');
      setTaskCommentingOn(null);
    }
  };

  // Helper function to get comments for a specific task or subtask
  const getCommentsForItem = (taskId, subtaskId = null) => {
    const project = projects.find(p => p.id === viewingProjectId);
    if (!project || !project.recentActivity) return [];

    return project.recentActivity.filter(activity => {
      if (!activity.taskContext) return false;
      if (subtaskId) {
        return activity.taskContext.taskId === taskId && activity.taskContext.subtaskId === subtaskId;
      }
      return activity.taskContext.taskId === taskId;
    });
  };

  const toggleTaskEditing = () => {
    setTaskEditEnabled(prev => !prev);
    if (taskEditEnabled) {
      setEditingTask(null);
      setEditingSubtask(null);
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await apiDeleteTask(viewingProjectId, taskId);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const deleteSubtask = async (taskId, subtaskId) => {
    try {
      await apiDeleteSubtask(viewingProjectId, taskId, subtaskId);
    } catch (error) {
      console.error('Failed to delete subtask:', error);
    }
  };

  const startEditingTask = (taskId, currentTitle) => {
    setEditingTask(taskId);
    setEditingTaskTitle(currentTitle);
  };

  const saveTaskEdit = async (taskId) => {
    if (editingTaskTitle.trim()) {
      const project = projects.find(p => p.id === viewingProjectId);
      if (!project) return;

      const task = project.plan.find(t => t.id === taskId);
      if (!task) return;

      try {
        await updateTask(viewingProjectId, taskId, {
          title: editingTaskTitle,
          status: task.status,
          dueDate: task.dueDate,
          completedDate: task.completedDate
        });
      } catch (error) {
        console.error('Failed to save task edit:', error);
      }
    }
    setEditingTask(null);
    setEditingTaskTitle('');
  };

  const startEditingSubtask = (subtaskId, currentTitle) => {
    setEditingSubtask(subtaskId);
    setEditingSubtaskTitle(currentTitle);
  };

  const saveSubtaskEdit = async (taskId, subtaskId) => {
    if (editingSubtaskTitle.trim()) {
      const project = projects.find(p => p.id === viewingProjectId);
      if (!project) return;

      const task = project.plan.find(t => t.id === taskId);
      if (!task) return;

      const subtask = task.subtasks.find(st => st.id === subtaskId);
      if (!subtask) return;

      try {
        await updateSubtask(viewingProjectId, taskId, subtaskId, {
          title: editingSubtaskTitle,
          status: subtask.status,
          dueDate: subtask.dueDate,
          completedDate: subtask.completedDate
        });
      } catch (error) {
        console.error('Failed to save subtask edit:', error);
      }
    }
    setEditingSubtask(null);
    setEditingSubtaskTitle('');
  };

  const startEditingExecSummary = (projectId, currentDescription) => {
    setEditingExecSummary(projectId);
    setExecSummaryDraft(currentDescription || '');
  };

  const saveExecSummary = async (projectId) => {
    try {
      await updateProject(projectId, {
        executiveUpdate: execSummaryDraft
      });
    } catch (error) {
      console.error('Failed to save executive summary:', error);
    }

    setEditingExecSummary(null);
    setExecSummaryDraft('');
  };

  const generateExecSummary = async (projectId) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

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

      const response = await callOpenAIChat({
        messages: [
          { role: 'user', content: prompt }
        ]
      });

      // Save the generated summary via API
      await updateProject(projectId, {
        executiveUpdate: response.content
      });
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
        updateProject(projectId, { executiveUpdate: execSummaryDraft }).catch(err =>
          console.error('Failed to save executive summary:', err)
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

  // Helper to parse date string as local date (fixes timezone off-by-one bug)
  const parseLocalDate = (dateString) => {
    if (!dateString) return null;
    // Handle ISO format with time (e.g., "2025-12-11T14:30:00")
    const datePart = dateString.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const formatDueDate = (dateString, status, completedDate) => {
    // If completed, show completion date with green checkmark
    if (status === 'completed' && completedDate) {
      const date = parseLocalDate(completedDate);
      return {
        text: `Done ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        color: 'var(--sage)',
        isOverdue: false,
        isCompleted: true,
        formattedDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        isDueSoon: false
      };
    }

    const date = parseLocalDate(dateString);
    if (!date) {
      return { text: 'No date', color: 'var(--stone)', isOverdue: false, isCompleted: false, formattedDate: '', isDueSoon: false };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(date);
    dueDate.setHours(0, 0, 0, 0);
    const diffTime = dueDate - today;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
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

  // Global search - get filtered results based on query
  const getGlobalSearchResults = (query) => {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase();
    const results = [];

    // Search people
    people.forEach(person => {
      if (person.name.toLowerCase().includes(lowerQuery) ||
          (person.team && person.team.toLowerCase().includes(lowerQuery))) {
        results.push({
          type: 'person',
          id: person.id,
          name: person.name,
          team: person.team,
          display: `${person.name} (${person.team || 'Contributor'})`
        });
      }
    });

    // Search projects, tasks, subtasks
    visibleProjects.forEach(project => {
      // Match project name
      if (project.name.toLowerCase().includes(lowerQuery)) {
        results.push({
          type: 'project',
          id: project.id,
          name: project.name,
          display: project.name
        });
      }

      // Match tasks
      project.plan.forEach(task => {
        if (task.title.toLowerCase().includes(lowerQuery)) {
          results.push({
            type: 'task',
            id: task.id,
            projectId: project.id,
            name: task.title,
            display: `${project.name} → ${task.title}`
          });
        }

        // Match subtasks
        task.subtasks.forEach(subtask => {
          if (subtask.title.toLowerCase().includes(lowerQuery)) {
            results.push({
              type: 'subtask',
              id: subtask.id,
              taskId: task.id,
              projectId: project.id,
              name: subtask.title,
              display: `${project.name} → ${task.title} → ${subtask.title}`
            });
          }
        });
      });
    });

    return results.slice(0, 10); // Limit to 10 results
  };

  // Handle selecting a global search result
  const handleGlobalSearchSelect = (result) => {
    setGlobalSearchOpen(false);
    setGlobalSearchQuery('');

    if (result.type === 'person') {
      // Navigate to people page and feature the selected person
      setActiveView('people');
      setViewingProjectId(null);
      setFeaturedPersonId(result.id);
      // Clear featured person after animation completes
      setTimeout(() => setFeaturedPersonId(null), 3000);
    } else if (result.type === 'project') {
      // Navigate to project details
      updateHash('overview', result.id);
      // Expand the first task if any
      const project = visibleProjects.find(p => p.id === result.id);
      if (project && project.plan.length > 0) {
        setExpandedTasks(prev => ({ ...prev, [project.plan[0].id]: true }));
      }
    } else if (result.type === 'task' || result.type === 'subtask') {
      // Navigate to project details and expand the task
      updateHash('overview', result.projectId);
      if (result.taskId) {
        setExpandedTasks(prev => ({ ...prev, [result.taskId]: true }));
      } else if (result.type === 'task') {
        setExpandedTasks(prev => ({ ...prev, [result.id]: true }));
      }
    }
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
        setSelectedTagIndex(0); // Reset selection when typing
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
    const tagText = `@${tag.display}`;
    const newText = beforeAt + tagText + ' ' + textAfterCursor;

    setTimelineUpdate(newText);
    setShowTagSuggestions(false);
    setTagSearchTerm('');

    // Focus back on input
    if (inputRef && inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleThrustDraftChange = (e) => {
    const text = e.target.value;
    const cursorPos = e.target.selectionStart;

    setThrustDraft(text);
    setThrustCursorPosition(cursorPos);

    // Check if we should show tag suggestions
    const textUpToCursor = text.substring(0, cursorPos);
    const lastAtSymbol = textUpToCursor.lastIndexOf('@');

    if (lastAtSymbol !== -1) {
      const textAfterAt = textUpToCursor.substring(lastAtSymbol + 1);
      if (!textAfterAt.includes(' ')) {
        setThrustTagSearchTerm(textAfterAt);
        setShowThrustTagSuggestions(true);
        setSelectedThrustTagIndex(0); // Reset selection when typing
      } else {
        setShowThrustTagSuggestions(false);
      }
    } else {
      setShowThrustTagSuggestions(false);
    }
  };

  const insertThrustTag = (tag) => {
    const textBeforeCursor = thrustDraft.substring(0, thrustCursorPosition);
    const textAfterCursor = thrustDraft.substring(thrustCursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

    const beforeAt = thrustDraft.substring(0, lastAtSymbol);
    const tagText = `@${tag.display}`;
    const newText = beforeAt + tagText + ' ' + textAfterCursor;

    setThrustDraft(newText);
    setShowThrustTagSuggestions(false);
    setThrustTagSearchTerm('');
  };

  const handleCheckinNoteChange = (e) => {
    const text = e.target.value;
    const cursorPos = e.target.selectionStart;

    setCheckinNote(text);
    setCheckinCursorPosition(cursorPos);

    // Check if we should show tag suggestions
    const textUpToCursor = text.substring(0, cursorPos);
    const lastAtSymbol = textUpToCursor.lastIndexOf('@');

    if (lastAtSymbol !== -1) {
      const textAfterAt = textUpToCursor.substring(lastAtSymbol + 1);
      if (!textAfterAt.includes(' ')) {
        setCheckinTagSearchTerm(textAfterAt);
        setShowCheckinTagSuggestions(true);
        setSelectedCheckinTagIndex(0); // Reset selection when typing
      } else {
        setShowCheckinTagSuggestions(false);
      }
    } else {
      setShowCheckinTagSuggestions(false);
    }
  };

  const insertCheckinTag = (tag) => {
    const textBeforeCursor = checkinNote.substring(0, checkinCursorPosition);
    const textAfterCursor = checkinNote.substring(checkinCursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

    const beforeAt = checkinNote.substring(0, lastAtSymbol);
    const tagText = `@${tag.display}`;
    const newText = beforeAt + tagText + ' ' + textAfterCursor;

    setCheckinNote(newText);
    setShowCheckinTagSuggestions(false);
    setCheckinTagSearchTerm('');
  };

  const cloneProjectDeep = (project) => ({
    ...project,
    plan: project.plan.map(task => ({
      ...task,
      subtasks: (task.subtasks || []).map(subtask => ({ ...subtask }))
    })),
    recentActivity: [...project.recentActivity]
  });

  const findPersonByName = (name) => {
    if (!name) return null;
    const lower = name.toLowerCase();
    return people.find(person => person.name.toLowerCase() === lower) || null;
  };

  const normalizeStakeholderEntry = (person) => {
    if (!person || (!person.name && !person.id)) return null;
    const existing = person.id
      ? people.find(p => p.id === person.id) || findPersonByName(person.name)
      : findPersonByName(person.name);
    const name = person.name || existing?.name;
    if (!name) return null;
    return {
      id: person.id || existing?.id || null,
      name,
      team: existing?.team || person.team || 'Contributor',
      email: person.email || existing?.email || null
    };
  };

  const normalizeStakeholderList = (list = []) => {
    const map = new Map();

    list.forEach(entry => {
      const normalized = normalizeStakeholderEntry(entry);
      if (!normalized) return;

      const key = normalized.id || normalized.name.toLowerCase();
      map.set(key, normalized);
    });

    return Array.from(map.values());
  };

  // Helper function to sync stakeholders to People database
  const syncStakeholdersToPeople = async (stakeholders) => {
    if (!stakeholders || stakeholders.length === 0) return;

    for (const stakeholder of stakeholders) {
      const normalized = normalizeStakeholderEntry(stakeholder);
      if (!normalized) continue;

      const existingPerson = findPersonByName(normalized.name);
      const needsSync = !existingPerson || existingPerson.team !== normalized.team;

      if (!needsSync) continue;

      try {
        await createPerson({
          name: normalized.name,
          team: normalized.team,
          email: existingPerson?.email || null
        });
      } catch (error) {
        console.error(`Failed to sync stakeholder ${normalized.name} to People:`, error);
      }
    }
  };

  // Helper function to extract and sync all people from projects
  const syncAllPeopleFromProjects = async (projectsData) => {
    const peopleToSync = new Map(); // Use Map to avoid duplicates

    const ignoredAuthorNames = new Set(['you', 'system', 'unknown', 'anonymous']);

    projectsData.forEach(project => {
      // Add stakeholders
      if (project.stakeholders) {
        project.stakeholders.forEach(stakeholder => {
          const normalized = normalizeStakeholderEntry(stakeholder);
          if (!normalized) return;
          peopleToSync.set(normalized.name.toLowerCase(), normalized);
        });
      }

      // Add authors from activities
      if (project.recentActivity) {
        project.recentActivity.forEach(activity => {
          if (activity.authorPerson && activity.authorPerson.name) {
            const normalized = normalizeStakeholderEntry(activity.authorPerson);
            if (normalized) {
              peopleToSync.set((normalized.id || normalized.name).toString().toLowerCase(), normalized);
            }
          } else if (activity.author && activity.author.trim()) {
            const authorName = activity.author.trim();
            if (ignoredAuthorNames.has(authorName.toLowerCase())) {
              return;
            }
            const normalized = normalizeStakeholderEntry({ name: authorName });
            if (normalized) {
              peopleToSync.set(normalized.name.toLowerCase(), normalized);
            }
          }
        });
      }
    });

    // Sync all unique people to database
    for (const person of peopleToSync.values()) {
      await syncStakeholdersToPeople([person]);
    }
  };

  const resetNewProjectForm = () => {
    setNewProjectName('');
    setNewProjectDescription('');
    setNewProjectPriority('medium');
    setNewProjectStatus('planning');
    setNewProjectTargetDate('');
    setNewProjectStakeholders([]);
  };

  const resetNewInitiativeForm = () => {
    setNewInitiativeName('');
    setNewInitiativeDescription('');
    setNewInitiativeStatus('planning');
    setNewInitiativePriority('medium');
    setNewInitiativeTargetDate('');
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    // newProjectStakeholders is now an array of {name, team} objects from PersonPicker
    const stakeholderEntries = normalizeStakeholderList(newProjectStakeholders.filter(Boolean));

    const createdAt = new Date().toISOString();
    const projectData = {
      name: newProjectName.trim(),
      stakeholders: stakeholderEntries.length > 0
        ? stakeholderEntries
        : normalizeStakeholderList(defaultOwnerStakeholder),
      status: newProjectStatus,
      priority: newProjectPriority,
      progress: 0,
      lastUpdate: newProjectDescription ? newProjectDescription.slice(0, 120) : 'New project created',
      description: newProjectDescription,
      startDate: createdAt.split('T')[0],
      targetDate: newProjectTargetDate
    };

    // Sync stakeholders to People database
    await syncStakeholdersToPeople(projectData.stakeholders);

    try {
      const createdProject = await apiCreateProject(projectData);

      // Add initial activity if description was provided
      if (newProjectDescription) {
        await addActivity(createdProject.id, {
          date: createdAt,
          note: newProjectDescription,
          author: activityAuthor
        });
      }

      setShowNewProject(false);
      resetNewProjectForm();
      updateHash('overview', createdProject.id);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleCreateInitiative = async () => {
    if (!newInitiativeName.trim()) return;

    await createInitiative({
      name: newInitiativeName.trim(),
      description: newInitiativeDescription.trim(),
      status: newInitiativeStatus,
      priority: newInitiativePriority,
      targetDate: newInitiativeTargetDate || undefined,
    });

    setShowNewInitiative(false);
    resetNewInitiativeForm();
  };

  const handleDeleteInitiative = async (initiative) => {
    if (!initiativeDeletionEnabled) return;
    const confirmed = window.confirm(`Delete initiative "${initiative.name}"? This can't be undone.`);
    if (!confirmed) return;
    await deleteInitiative(initiative.id);
  };

  const handleStakeholderSelection = (selectedPeople) => {
    setNewProjectStakeholders(normalizeStakeholderList(selectedPeople));
  };

  const handleEditStakeholderSelection = (selectedPeople) => {
    setEditValues(prev => ({ ...prev, stakeholders: normalizeStakeholderList(selectedPeople) }));
  };

  const handleCreateNewPerson = async (personData) => {
    const created = await createPerson({
      name: personData.name,
      team: personData.team,
      email: personData.email || null
    });

    // Add the newly created person to the appropriate stakeholder list
    const newStakeholder = normalizeStakeholderEntry(created) || { name: created.name, team: created.team };

    if (stakeholderSelectionTarget === 'newProject') {
      setNewProjectStakeholders(prev => {
        const exists = prev.some(p => p.name.toLowerCase() === newStakeholder.name.toLowerCase());
        return exists
          ? prev.map(p => p.name.toLowerCase() === newStakeholder.name.toLowerCase() ? newStakeholder : p)
          : [...prev, newStakeholder];
      });
    } else if (stakeholderSelectionTarget === 'editProject') {
      setEditValues(prev => {
        const currentStakeholders = prev.stakeholders || [];
        const exists = currentStakeholders.some(p => p.name.toLowerCase() === newStakeholder.name.toLowerCase());
        return {
          ...prev,
          stakeholders: exists
            ? currentStakeholders.map(p => p.name.toLowerCase() === newStakeholder.name.toLowerCase() ? newStakeholder : p)
            : [...currentStakeholders, newStakeholder]
        };
      });
    }

    setEditingPerson(null);
    setStakeholderSelectionTarget(null);
  };

  const handleClosePersonModal = () => {
    setEditingPerson(null);
    setStakeholderSelectionTarget(null);
  };

  const buildThrustContext = () => {
    return projects.map(project => {
      const contributors = (project.stakeholders || []).map(person => ({
        name: person.name,
        team: person.team,
        email: person.email || null
      }));

      return {
        id: project.id,
        name: project.name,
        status: project.status,
        progress: project.progress,
        priority: project.priority,
        lastUpdate: project.lastUpdate,
        targetDate: project.targetDate,
        stakeholders: contributors,
        contributors,
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
      };
    });
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

  // Wrapper functions to provide projects context to imported validation utilities
  const resolveMomentumProjectRef = (target) => {
    return resolveMomentumProjectRefUtil(target, projects);
  };

  const validateThrustActions = (actions = []) => {
    return validateThrustActionsUtil(actions, projects);
  };

  const rollbackDeltas = (deltas) => {
    if (!deltas || deltas.length === 0) return;

    setProjects(prevProjects => {
      const working = prevProjects.map(cloneProjectDeep);

      deltas.slice().reverse().forEach(delta => {
        // Handle remove_project separately since it removes the entire project
        if (delta.type === 'remove_project') {
          const index = working.findIndex(p => `${p.id}` === `${delta.projectId}`);
          if (index !== -1) {
            working.splice(index, 1);
          }
          return;
        }

        const project = working.find(p => `${p.id}` === `${delta.projectId}`);
        if (!project) return;

        switch (delta.type) {
          case 'remove_activity':
            Object.assign(
              project,
              syncProjectActivity(project, project.recentActivity.filter(activity => activity.id !== delta.activityId))
            );
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


  const applyThrustActions = async (actions = []) => {
    if (!actions.length) {
      return { deltas: [], actionResults: [], updatedProjectIds: [], verification: { perAction: [], hasFailures: false, summary: 'No actions to verify.' } };
    }

    const result = { deltas: [], actionResults: [], updatedProjectIds: new Set() };
    const originalProjects = projects.map(cloneProjectDeep);
    const workingProjects = projects.map(cloneProjectDeep);
    const projectLookup = new Map();
    workingProjects.forEach(project => {
      projectLookup.set(`${project.id}`.toLowerCase(), project.id);
      projectLookup.set(project.name.toLowerCase(), project.id);
    });

    const appendActionResult = (label, detail, deltas = [], metadata = {}) => {
      const { fallbackLabel, fallbackDetail, ...rest } = metadata;
      const normalizedLabel = (label || '').trim();
      const normalizedDetail = (detail || '').trim();

      result.actionResults.push({
        ...rest,
        label: normalizedLabel || fallbackLabel || 'Action processed',
        detail: normalizedDetail || fallbackDetail || 'No additional details provided.',
      });
      result.deltas.push(...deltas);
    };

    const resolveProject = (target) => {
      if (!target) return null;
      const normalizedTarget = `${target}`.toLowerCase();
      const mappedId = projectLookup.get(normalizedTarget);
      const lookupTarget = mappedId || target;
      const lowerTarget = `${lookupTarget}`.toLowerCase();
      return workingProjects.find(p => `${p.id}` === `${lookupTarget}` || p.name.toLowerCase() === lowerTarget);
    };

    const resolveTask = (project, target) => {
      if (!project || !target) return null;
      const lowerTarget = `${target}`.toLowerCase();
      return project.plan.find(task => `${task.id}` === `${target}` || task.title.toLowerCase() === lowerTarget);
    };

    const describeDueDate = (date) => date ? `due ${new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'no due date set';

    let projectsChanged = false;

    for (const action of actions) {
      const actionDeltas = [];
      let label = '';
      let detail = '';
      const providedLabel = (action.label || '').trim();
      const providedDetail = (action.detail || '').trim();
      let appendedActionResult = false;

      if (action.type === 'query_portfolio') {
        const scope = ['portfolio', 'project', 'people'].includes(action.scope)
          ? action.scope
          : action.projectId || action.projectName
            ? 'project'
            : 'portfolio';
        const detailLevel = ['summary', 'detailed'].includes(action.detailLevel)
          ? action.detailLevel
          : 'summary';
        const includePeople = action.includePeople !== false;
        const portfolioContext = buildThrustContext();
        let scopedProjects = portfolioContext;

        if (scope === 'project' && (action.projectId || action.projectName)) {
          const scopedProject = resolveProject(action.projectId || action.projectName);
          if (!scopedProject) {
            appendActionResult('Skipped action: unknown project', 'Skipped query_portfolio because the project was not found.', actionDeltas);
            continue;
          }
          scopedProjects = portfolioContext.filter(project => `${project.id}` === `${scopedProject.id}`);
        }

        const projectSummary = scopedProjects.map(project => ({
          id: project.id,
          name: project.name,
          status: project.status,
          priority: project.priority,
          progress: project.progress,
          targetDate: project.targetDate,
          lastUpdate: project.lastUpdate,
          contributors: project.contributors || project.stakeholders || []
        }));

        const queryResult = {
          scope,
          detailLevel,
          projects: detailLevel === 'detailed' ? scopedProjects : projectSummary,
          ...(includePeople ? { people: people.map(person => ({ name: person.name, team: person.team, email: person.email || null })) } : {})
        };

        appendActionResult(
          'Shared portfolio data',
          `Portfolio snapshot (${detailLevel}, ${scope}): ${JSON.stringify(queryResult, null, 2)}`,
          actionDeltas
        );
        continue;
      }

      if (action.type === 'add_person') {
        const personName = (action.name || action.personName || '').trim();
        if (!personName) {
          appendActionResult('Skipped action: missing person name', 'Skipped add_person because no name was provided.', actionDeltas);
          continue;
        }

        const targetTeam = action.team || 'Contributor';
        const existing = findPersonByName(personName);
        const saved = await createPerson({
          name: personName,
          team: targetTeam,
          email: action.email || existing?.email || null
        });

        const updatedTeam = existing && saved.team !== existing.team;
        label = existing ? `Updated person ${saved.name}` : `Added person ${saved.name}`;
        detail = updatedTeam
          ? `Ensured ${saved.name} is tracked with team ${saved.team}.`
          : `${saved.name} is available in People.`;

        appendActionResult(label, detail, actionDeltas);
        continue;
      }

      if (action.type === 'create_project') {
        // Check both name and projectName with defensive coercion
        const rawName = action.name ?? action.projectName ?? '';
        const projectName = (typeof rawName === 'string' ? rawName : String(rawName)).trim();
        if (!projectName) {
          // Log for debugging
          console.warn('[ManityApp] create_project action has empty name:', {
            action,
            actionName: action.name,
            actionProjectName: action.projectName,
            rawName
          });
          label = 'Skipped action: missing project name';
          detail = 'Skipped create_project because no name was provided.';
          appendActionResult(label, detail, actionDeltas);
          continue;
        }

        const stakeholderEntries = action.stakeholders
          ? action.stakeholders.split(',').map(name => name.trim()).filter(Boolean).map(name => ({ name, team: 'Contributor' }))
          : [{ name: loggedInUser || 'Momentum', team: 'Owner' }];
        const normalizedStakeholders = normalizeStakeholderList(stakeholderEntries);
        const createdAt = new Date().toISOString();
        const newId = action.projectId || action.id || `ai-project-${Math.random().toString(36).slice(2, 7)}`;
        const newProject = syncProjectActivity({
          id: newId,
          name: projectName,
          priority: action.priority || 'medium',
          status: action.status || 'active',
          progress: typeof action.progress === 'number' ? action.progress : 0,
          stakeholders: normalizedStakeholders,
          description: action.description || '',
          startDate: createdAt.split('T')[0],
          targetDate: action.targetDate || '',
          plan: [],
          recentActivity: action.description
            ? [{ id: generateActivityId(), date: createdAt, note: action.description, author: 'Momentum' }]
            : []
        });

        workingProjects.push(newProject);
        projectLookup.set(`${projectName}`.toLowerCase(), newId);
        projectLookup.set(`${newId}`.toLowerCase(), newId);
        if (action.projectId || action.id) {
          projectLookup.set(`${action.projectId || action.id}`.toLowerCase(), newId);
        }

        actionDeltas.push({ type: 'remove_project', projectId: newId });
        label = `Created new project "${projectName}"`;
        detail = `Created new project "${projectName}" with status ${newProject.status} and priority ${newProject.priority}`;
        projectsChanged = true;
        result.updatedProjectIds.add(newId);

        appendActionResult(label, detail, actionDeltas);
        await syncStakeholdersToPeople(newProject.stakeholders);
        continue;
      }

      let project = null;
      if (action.type !== 'send_email') {
        project = resolveProject(action.projectId || action.projectName);

        if (!project) {
          appendActionResult('Skipped action: unknown project', 'Skipped action because the project was not found.', actionDeltas);
          continue;
        }
      }

      switch (action.type) {
        case 'comment': {
          const activityId = generateActivityId();
          const requestedNote = (action.note || action.content || action.comment || '').trim();
          const note = requestedNote || 'Update logged by Momentum';
          const newActivity = {
            id: activityId,
            date: new Date().toISOString(),
            note,
            author: action.author || activityAuthor || ''
          };
          Object.assign(
            project,
            syncProjectActivity(project, [newActivity, ...project.recentActivity])
          );
          actionDeltas.push({ type: 'remove_activity', projectId: project.id, activityId });
          label = `Commented on ${project.name}`;
          detail = requestedNote
            ? `Comment on ${project.name}: "${newActivity.note}" by ${newActivity.author}`
            : `Comment on ${project.name}: "${newActivity.note}" by ${newActivity.author} (placeholder used because the comment was empty)`;
          projectsChanged = true;
          result.updatedProjectIds.add(project.id);
          break;
        }
        case 'add_task': {
          const taskId = action.taskId || `ai-task-${Math.random().toString(36).slice(2, 7)}`;
          // Resolve assignee if provided
          let taskAssignee = null;
          if (action.assignee) {
            const assigneeName = typeof action.assignee === 'string' ? action.assignee : action.assignee?.name;
            if (assigneeName) {
              const person = findPersonByName(assigneeName);
              taskAssignee = person ? { id: person.id, name: person.name, team: person.team } : { name: assigneeName };
            }
          }
          const newTask = {
            id: taskId,
            title: action.title || 'New task',
            status: action.status || 'todo',
            dueDate: action.dueDate,
            completedDate: action.completedDate,
            assignee: taskAssignee,
            subtasks: (action.subtasks || []).map(subtask => ({
              id: subtask.id || `ai-subtask-${Math.random().toString(36).slice(2, 7)}`,
              title: subtask.title || 'New subtask',
              status: subtask.status || 'todo',
              dueDate: subtask.dueDate
            }))
          };
          project.plan = [...project.plan, newTask];
          actionDeltas.push({ type: 'remove_task', projectId: project.id, taskId });
          const synthesizedLabel = `Added task "${newTask.title}" to ${project.name}`;
          const synthesizedDetail = `Task "${newTask.title}" in ${project.name} (${describeDueDate(newTask.dueDate)})${taskAssignee ? ` assigned to ${taskAssignee.name}` : ''}`;
          label = providedLabel || synthesizedLabel;
          detail = providedDetail || synthesizedDetail;
          projectsChanged = true;
          result.updatedProjectIds.add(project.id);
          appendActionResult(label, detail, actionDeltas, {
            type: action.type,
            projectId: project.id,
            projectName: project.name,
            taskId,
            taskTitle: newTask.title,
            assigneeName: taskAssignee?.name,
            dueDate: newTask.dueDate,
            fallbackLabel: synthesizedLabel,
            fallbackDetail: synthesizedDetail,
          });
          appendedActionResult = true;
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
          // Handle assignee changes
          if (action.assignee !== undefined) {
            const currentAssigneeName = task.assignee?.name || 'unassigned';
            if (action.assignee === null || action.assignee === '') {
              // Clear assignee
              if (task.assignee) {
                changes.push(`unassigned from ${currentAssigneeName}`);
                task.assignee = null;
              }
            } else {
              // Set new assignee - accept name string or object with name
              const newAssigneeName = typeof action.assignee === 'string' ? action.assignee : action.assignee?.name;
              if (newAssigneeName && newAssigneeName !== currentAssigneeName) {
                const person = findPersonByName(newAssigneeName);
                changes.push(`assigned to ${newAssigneeName}`);
                task.assignee = person ? { id: person.id, name: person.name, team: person.team } : { name: newAssigneeName };
              }
            }
          }

          actionDeltas.push({ type: 'restore_task', projectId: project.id, taskId: task.id, previous });
          const diffSummary = changes.join('; ');
          const synthesizedLabel = `Updated task "${task.title}" in ${project.name}`;
          const synthesizedDetail = `${task.title} in ${project.name}: ${diffSummary || 'no tracked changes'}`;
          label = providedLabel || synthesizedLabel;
          detail = providedDetail || synthesizedDetail;
          projectsChanged = true;
          result.updatedProjectIds.add(project.id);
          appendActionResult(label, detail, actionDeltas, {
            type: action.type,
            projectId: project.id,
            projectName: project.name,
            taskId: task.id,
            taskTitle: task.title,
            assigneeName: task.assignee?.name,
            dueDate: task.dueDate,
            diffSummary,
            fallbackLabel: synthesizedLabel,
            fallbackDetail: synthesizedDetail,
          });
          appendedActionResult = true;
          break;
        }
        case 'add_subtask': {
          const task = resolveTask(project, action.taskId || action.taskTitle);
          if (!task) {
            label = `Skipped action: missing task in ${project.name}`;
            detail = `Skipped subtask creation in ${project.name} because the parent task was not found.`;
            break;
          }

          const subtaskId = action.subtaskId || `ai-subtask-${Math.random().toString(36).slice(2, 7)}`;
          // Resolve assignee if provided
          let subtaskAssignee = null;
          if (action.assignee) {
            const assigneeName = typeof action.assignee === 'string' ? action.assignee : action.assignee?.name;
            if (assigneeName) {
              const person = findPersonByName(assigneeName);
              subtaskAssignee = person ? { id: person.id, name: person.name, team: person.team } : { name: assigneeName };
            }
          }
          const newSubtask = {
            id: subtaskId,
            title: action.subtaskTitle || action.title || 'New subtask',
            status: action.status || 'todo',
            dueDate: action.dueDate,
            assignee: subtaskAssignee
          };
          task.subtasks = [...(task.subtasks || []), newSubtask];
          actionDeltas.push({ type: 'remove_subtask', projectId: project.id, taskId: task.id, subtaskId });
          const synthesizedLabel = `Added subtask "${newSubtask.title}" to ${task.title}`;
          const synthesizedDetail = `Subtask "${newSubtask.title}" under ${task.title} in ${project.name} (${describeDueDate(newSubtask.dueDate)})${subtaskAssignee ? ` assigned to ${subtaskAssignee.name}` : ''}`;
          label = providedLabel || synthesizedLabel;
          detail = providedDetail || synthesizedDetail;
          projectsChanged = true;
          result.updatedProjectIds.add(project.id);
          appendActionResult(label, detail, actionDeltas, {
            type: action.type,
            projectId: project.id,
            projectName: project.name,
            taskId: task.id,
            taskTitle: task.title,
            subtaskId,
            subtaskTitle: newSubtask.title,
            assigneeName: subtaskAssignee?.name,
            dueDate: newSubtask.dueDate,
            fallbackLabel: synthesizedLabel,
            fallbackDetail: synthesizedDetail,
          });
          appendedActionResult = true;
          break;
        }
        case 'update_subtask': {
          const task = resolveTask(project, action.taskId || action.taskTitle);
          if (!task) {
            label = `Skipped action: missing task in ${project.name}`;
            detail = `Skipped subtask update in ${project.name} because the parent task was not found.`;
            break;
          }

          const subtask = resolveTask({ plan: task.subtasks || [] }, action.subtaskId || action.subtaskTitle);
          if (!subtask) {
            label = `Skipped action: missing subtask in ${task.title}`;
            detail = `Skipped subtask update in ${task.title} because the subtask was not found.`;
            break;
          }

          const previous = { ...subtask };
          const changes = [];

          if (action.title && action.title !== subtask.title) {
            changes.push(`renamed to "${action.title}"`);
            subtask.title = action.title;
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
          // Handle assignee changes
          if (action.assignee !== undefined) {
            const currentAssigneeName = subtask.assignee?.name || 'unassigned';
            if (action.assignee === null || action.assignee === '') {
              // Clear assignee
              if (subtask.assignee) {
                changes.push(`unassigned from ${currentAssigneeName}`);
                subtask.assignee = null;
              }
            } else {
              // Set new assignee - accept name string or object with name
              const newAssigneeName = typeof action.assignee === 'string' ? action.assignee : action.assignee?.name;
              if (newAssigneeName && newAssigneeName !== currentAssigneeName) {
                const person = findPersonByName(newAssigneeName);
                changes.push(`assigned to ${newAssigneeName}`);
                subtask.assignee = person ? { name: person.name, team: person.team } : { name: newAssigneeName };
              }
            }
          }

          actionDeltas.push({ type: 'restore_subtask', projectId: project.id, taskId: task.id, subtaskId: subtask.id, previous });
          const diffSummary = changes.join('; ');
          const synthesizedLabel = `Updated subtask "${subtask.title}" in ${task.title}`;
          const synthesizedDetail = `${subtask.title} under ${task.title} in ${project.name}: ${diffSummary || 'no tracked changes'}`;
          label = providedLabel || synthesizedLabel;
          detail = providedDetail || synthesizedDetail;
          projectsChanged = true;
          result.updatedProjectIds.add(project.id);
          appendActionResult(label, detail, actionDeltas, {
            type: action.type,
            projectId: project.id,
            projectName: project.name,
            taskId: task.id,
            taskTitle: task.title,
            subtaskId: subtask.id,
            subtaskTitle: subtask.title,
            assigneeName: subtask.assignee?.name,
            dueDate: subtask.dueDate,
            diffSummary,
            fallbackLabel: synthesizedLabel,
            fallbackDetail: synthesizedDetail,
          });
          appendedActionResult = true;
          break;
        }
        case 'add_stakeholders': {
          const rawStakeholders = Array.isArray(action.stakeholders)
            ? action.stakeholders
            : typeof action.stakeholders === 'string'
              ? action.stakeholders.split(',').map(name => name.trim()).filter(Boolean)
              : [];

          const stakeholderEntries = rawStakeholders
            .map(entry => {
              if (!entry) return null;
              if (typeof entry === 'string') {
                return { name: entry };
              }
              return {
                name: entry.name || entry.personName || '',
                team: entry.team
              };
            })
            .filter(entry => entry?.name)
            .map(entry => ({ ...entry, name: entry.name.trim() }));

          if (!stakeholderEntries.length) {
            label = `Skipped action: missing stakeholders for ${project.name}`;
            detail = `Skipped adding stakeholders because no stakeholder names were provided for ${project.name}.`;
            break;
          }

          const normalizedStakeholders = normalizeStakeholderList(stakeholderEntries);
          const existingStakeholders = project.stakeholders || [];
          const existingNames = new Set(existingStakeholders.map(s => s.name.toLowerCase()));
          const addedStakeholders = normalizedStakeholders.filter(s => !existingNames.has(s.name.toLowerCase()));

          if (addedStakeholders.length === 0) {
            label = `No new stakeholders to add for ${project.name}`;
            detail = `No changes made because all provided stakeholders already exist on ${project.name}.`;
            break;
          }

          const previous = {
            stakeholders: [...existingStakeholders],
            lastUpdate: project.lastUpdate
          };

          project.stakeholders = [...existingStakeholders, ...addedStakeholders];
          project.lastUpdate = `Added stakeholders: ${addedStakeholders.map(s => s.name).join(', ')}`;

          actionDeltas.push({ type: 'restore_project', projectId: project.id, previous });
          label = `Added stakeholders to ${project.name}`;
          detail = `Added ${addedStakeholders.map(s => s.name).join(', ')} to ${project.name}.`;
          projectsChanged = true;
          result.updatedProjectIds.add(project.id);
          await syncStakeholdersToPeople(addedStakeholders);
          break;
        }
        case 'update_project': {
          const previous = {
            name: project.name,
            description: project.description,
            executiveUpdate: project.executiveUpdate,
            status: project.status,
            priority: project.priority,
            progress: project.progress,
            targetDate: project.targetDate,
            startDate: project.startDate,
            lastUpdate: project.lastUpdate
          };
          const changes = [];

          if (action.name && action.name !== project.name) {
            changes.push(`renamed "${project.name}" → "${action.name}"`);
            project.name = action.name;
          }
          if (action.description && action.description !== project.description) {
            changes.push(`description updated`);
            project.description = action.description;
          }
          if (action.executiveUpdate && action.executiveUpdate !== project.executiveUpdate) {
            changes.push(`executive update revised`);
            project.executiveUpdate = action.executiveUpdate;
          }
          if (action.status && action.status !== project.status) {
            changes.push(`status ${project.status} → ${action.status}`);
            project.status = action.status;
          }
          if (action.priority && action.priority !== project.priority) {
            changes.push(`priority ${project.priority} → ${action.priority}`);
            project.priority = action.priority;
          }
          if (typeof action.progress === 'number' && action.progress !== project.progress) {
            changes.push(`progress ${project.progress}% → ${action.progress}%`);
            project.progress = action.progress;
          }
          if (action.targetDate && action.targetDate !== project.targetDate) {
            changes.push(`target ${project.targetDate || 'unset'} → ${action.targetDate}`);
            project.targetDate = action.targetDate;
          }
          if (action.startDate && action.startDate !== project.startDate) {
            changes.push(`start date ${project.startDate || 'unset'} → ${action.startDate}`);
            project.startDate = action.startDate;
          }
          if (action.lastUpdate && action.lastUpdate !== project.lastUpdate) {
            changes.push(`last update → ${action.lastUpdate}`);
            project.lastUpdate = action.lastUpdate;
          }

          actionDeltas.push({ type: 'restore_project', projectId: project.id, previous });
          const diffSummary = changes.join('; ');
          const synthesizedLabel = `Updated project ${project.name}`;
          const synthesizedDetail = `${project.name}: ${diffSummary || 'no tracked changes noted'}`;
          label = providedLabel || synthesizedLabel;
          detail = providedDetail || synthesizedDetail;
          projectsChanged = true;
          result.updatedProjectIds.add(project.id);
          appendActionResult(label, detail, actionDeltas, {
            type: action.type,
            projectId: project.id,
            projectName: project.name,
            diffSummary,
            fallbackLabel: synthesizedLabel,
            fallbackDetail: synthesizedDetail,
          });
          appendedActionResult = true;
          break;
        }
        case 'send_email': {
          const recipients = Array.isArray(action.recipients)
            ? action.recipients
            : `${action.recipients || ''}`.split(',');

          const normalizedRecipients = recipients
            .map(recipient => recipient?.trim())
            .filter(Boolean)
            .map(recipient => {
              if (recipient.includes('@')) return recipient;
              const person = findPersonByName(recipient);
              return person?.email || recipient;
            })
            .filter(Boolean);

          if (!normalizedRecipients.length) {
            appendActionResult('Skipped action: missing recipients', 'Skipped send_email because no recipients were provided.', actionDeltas);
            continue;
          }

          if (!action.subject || !action.body) {
            appendActionResult('Skipped action: incomplete email', 'Skipped send_email because subject or body was missing.', actionDeltas);
            continue;
          }

          const signature = '-sent by an AI clerk';
          const normalizedBody = action.body || '';
          // Remove any existing AI clerk signatures to prevent duplicates
          const cleanedBody = normalizedBody
            .replace(/\n*-?\s*sent (with the help of|by) an AI clerk\s*$/gi, '')
            .trim();
          const bodyWithSignature = cleanedBody ? `${cleanedBody}\n\n${signature}` : signature;

          try {
            await sendEmail({
              recipients: normalizedRecipients,
              subject: action.subject,
              body: bodyWithSignature
            });
            label = `Email sent to ${normalizedRecipients.join(', ')}`;
            detail = `Sent email "${action.subject}"`;
            appendActionResult(label, detail, actionDeltas, {
              type: action.type,
              fallbackLabel: label,
              fallbackDetail: detail,
            });
            appendedActionResult = true;
          } catch (error) {
            appendActionResult('Failed to send email', error?.message || 'Email service returned an error.', actionDeltas);
            continue;
          }

          break;
        }
        default:
          label = 'Skipped action: unsupported type';
          detail = `Skipped unsupported action type: ${action.type}`;
      }

      if (!appendedActionResult) {
        const assigneeName = typeof action.assignee === 'string' ? action.assignee : action.assignee?.name;
        const resolvedLabel = providedLabel || label;
        const resolvedDetail = providedDetail || detail;
        appendActionResult(resolvedLabel, resolvedDetail, actionDeltas, {
          type: action.type,
          projectId: project?.id,
          projectName: project?.name,
          taskId: action.taskId,
          taskTitle: action.taskTitle || action.title,
          subtaskId: action.subtaskId,
          subtaskTitle: action.subtaskTitle,
          assigneeName,
          dueDate: action.dueDate,
          fallbackLabel: resolvedLabel,
          fallbackDetail: resolvedDetail,
        });
      }
    }

    if (projectsChanged) {
      setProjects(workingProjects);
    }

    const verification = verifyThrustActions(actions, originalProjects, workingProjects, result.actionResults);
    const annotatedActionResults = result.actionResults.map((actionResult, idx) => {
      const verificationResult = verification.perAction[idx];
      if (!verificationResult) return actionResult;

      const detailParts = [];
      if (actionResult.detail) detailParts.push(actionResult.detail);

      if (verificationResult.status === 'passed') {
        detailParts.push('Verification passed.');
      } else if (verificationResult.status === 'skipped') {
        detailParts.push('Verification skipped.');
      } else if (verificationResult.status === 'failed') {
        const discrepancyText = verificationResult.discrepancies.join('; ');
        detailParts.push(`Verification failed: ${discrepancyText}`);
        if (!actionResult.error) {
          return {
            ...actionResult,
            verification: verificationResult,
            detail: detailParts.join(' '),
            error: `Verification failed: ${discrepancyText}`
          };
        }
      }

      return {
        ...actionResult,
        verification: verificationResult,
        detail: detailParts.join(' ')
      };
    });

    return {
      deltas: result.deltas,
      actionResults: annotatedActionResults,
      updatedProjectIds: Array.from(result.updatedProjectIds),
      verification
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
      case 'add_stakeholders': {
        const stakeholders = Array.isArray(action.stakeholders)
          ? action.stakeholders
          : typeof action.stakeholders === 'string'
            ? action.stakeholders.split(',').map(name => name.trim()).filter(Boolean)
            : [];
        const stakeholderNames = stakeholders.map(entry => typeof entry === 'string' ? entry : entry?.name).filter(Boolean);
        return `Add stakeholders ${stakeholderNames.join(', ') || 'to add'} to ${projectName}`;
      }
      case 'add_person':
        return `Add ${action.name || action.personName || 'a new person'} to People`;
      case 'send_email':
        return `Email ${action.recipients?.join ? action.recipients.join(', ') : action.recipients || 'recipients'} about "${action.subject || ''}"`;
      case 'query_portfolio':
        return action.projectName || action.projectId
          ? `Fetch portfolio context for ${action.projectName || `project ${action.projectId}`}`
          : 'Fetch latest portfolio context';
      default:
        return `Action queued: ${action.type || 'unknown'} for ${projectName}`;
    }
  };

  const getAllStakeholders = () => {
    // Return people from the People database
    // Include admin users for backwards compatibility
    const stakeholderMap = new Map();

    const addStakeholder = (entry) => {
      const normalized = normalizeStakeholderEntry(entry);
      if (!normalized) return;

      const key = normalized.id || normalized.name.toLowerCase();
      const existing = stakeholderMap.get(key);

      if (!existing || (!existing.team && normalized.team)) {
        stakeholderMap.set(key, normalized);
      }
    };

    adminUsers.forEach(addStakeholder);
    people.forEach(addStakeholder);

    // Also include any stakeholders from projects that aren't in the People database yet
    // (for backwards compatibility with existing data)
    projects.forEach(project => {
      project.stakeholders.forEach(addStakeholder);
    });

    return Array.from(stakeholderMap.values());
  };

  const isAdminUser = (name) => adminUsers.some(admin => admin.name === name);

  // Show all projects, but organize by who is on them
  const visibleProjects = projects.filter(project => project.status !== 'deleted');
  const allTags = useMemo(() => getAllTags(people, visibleProjects), [people, visibleProjects]);

  // Filter projects by search query (when search is open) or portfolio filter (persistent)
  const searchFilterProjects = (projectList) => {
    // Determine which query to use: live search or persistent filter
    const activeQuery = globalSearchOpen ? globalSearchQuery : portfolioFilter;

    if (!activeQuery.trim() || activeView !== 'overview' || viewingProjectId) {
      return projectList;
    }
    const lowerQuery = activeQuery.toLowerCase();
    return projectList.filter(project => {
      // Match project name
      if (project.name.toLowerCase().includes(lowerQuery)) return true;
      // Match task titles
      if (project.plan.some(task => task.title.toLowerCase().includes(lowerQuery))) return true;
      // Match subtask titles
      if (project.plan.some(task =>
        task.subtasks.some(subtask => subtask.title.toLowerCase().includes(lowerQuery))
      )) return true;
      // Match stakeholder names
      if (project.stakeholders.some(s => s.name.toLowerCase().includes(lowerQuery))) return true;
      return false;
    });
  };

  // Clear the persistent portfolio filter
  const clearPortfolioFilter = () => {
    setPortfolioFilter('');
  };

  // Projects the logged-in user is on
  const userProjects = visibleProjects.filter(project =>
    isAdminUser(loggedInUser) || project.stakeholders.some(stakeholder => stakeholder.name === loggedInUser)
  );

  // Split active and completed for user's projects (with search filter applied)
  const userActiveProjects = searchFilterProjects(
    userProjects.filter(project => !['completed', 'closed'].includes(project.status))
  );
  const userCompletedProjects = searchFilterProjects(
    userProjects.filter(project => ['completed', 'closed'].includes(project.status))
  );

  // Projects the logged-in user is NOT on
  const otherProjects = visibleProjects.filter(project =>
    !isAdminUser(loggedInUser) && !project.stakeholders.some(stakeholder => stakeholder.name === loggedInUser)
  );

  // Split active and completed for other projects (with search filter applied)
  const otherActiveProjects = searchFilterProjects(
    otherProjects.filter(project => !['completed', 'closed'].includes(project.status))
  );
  const otherCompletedProjects = searchFilterProjects(
    otherProjects.filter(project => ['completed', 'closed'].includes(project.status))
  );

  // For backwards compatibility (used in slides, daily update, etc.)
  const activeProjects = userActiveProjects;
  const completedProjects = userCompletedProjects;

  const handleAddTimelineUpdate = async () => {
    if (timelineUpdate.trim()) {
      const targetProjectId = viewingProjectId || visibleProjects[0]?.id;

      if (targetProjectId) {
        try {
          await addActivity(targetProjectId, {
            date: new Date().toISOString(),
            note: timelineUpdate,
            author: activityAuthor
          });
        } catch (error) {
          console.error('Failed to add timeline update:', error);
        }
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

  const handleConfirmDeleteProject = async () => {
    if (!projectToDelete || deleteConfirmation.trim() !== projectToDelete.name) return;

    try {
      await apiDeleteProject(projectToDelete.id);
    } catch (error) {
      console.error('Failed to delete project:', error);
    }

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
        content: `Your previous response could not be applied because ${errors.join('; ')}. Use only these action types: ${supportedMomentumActions.join(', ')}. Project-targeted actions must include a valid projectId or projectName that exists in the provided portfolio. Respond only with JSON containing "response" and "actions".`
      }
    ];

    return requestMomentumActions(retryMessages, attempt + 1);
  };

  const handleSendThrustMessage = async () => {
    if (!thrustDraft.trim() || thrustIsRequesting) return;

    const userMessage = {
      id: generateActivityId(),
      role: 'user',
      author: resolvedLoggedInUser || 'User',
      note: thrustDraft,
      date: new Date().toISOString(),
    };

    const nextMessages = [...thrustMessages, userMessage];
    setThrustMessages(nextMessages);
    setThrustDraft('');
    setThrustError('');
    setThrustPendingActions([]);

    const systemPrompt = `${MOMENTUM_THRUST_SYSTEM_PROMPT}

LOGGED-IN USER: ${loggedInUser || 'Not set'}
- When the user says "me", "my", "I", or similar pronouns, they are referring to: ${loggedInUser || 'the logged-in user'}
- When adding comments or updates, use the logged-in user's name as the author unless otherwise specified
- When sending emails on behalf of the user, the "from" address will be automatically set to the logged-in user's email

PEOPLE & EMAIL ADDRESSES:
- Each person in the system may have an email address stored in their profile
- People are stored with: name, team, and email (optional)
- When sending emails, you can reference people by name and the system will resolve their email addresses
- To find a person's email, use query_portfolio with scope='people' and includePeople=true
- All project stakeholders/contributors are people with potential email addresses`;
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
      const { deltas, actionResults, updatedProjectIds, verification } = await applyThrustActions(parsed.actions || []);

      if (verification?.hasFailures) {
        setThrustError('Some Momentum actions did not match the requested changes. Review verification notes.');
      } else {
        setThrustError('');
      }

      // Track recently updated projects for highlighting
      if (updatedProjectIds && updatedProjectIds.length > 0) {
        setRecentlyUpdatedProjects(prev => new Set([...prev, ...updatedProjectIds]));
        // Expand all updated projects in the momentum view
        setExpandedMomentumProjects(prev => {
          const newExpanded = { ...prev };
          updatedProjectIds.forEach(id => {
            newExpanded[String(id)] = true;
          });
          return newExpanded;
        });
        // Highlights now persist through the session
      }

      const assistantMessage = {
        id: responseId,
        role: 'assistant',
        author: 'Momentum',
        note: parsed.display || content,
        date: new Date().toISOString(),
        actionResults,
        deltas,
        updatedProjectIds: updatedProjectIds || [],
        verificationSummary: verification?.summary
      };

      // Auto-expand portfolio panel if projects were updated
      if (updatedProjectIds && updatedProjectIds.length > 0) {
        setPortfolioMinimized(false);
        setActiveProjectInChat(updatedProjectIds[0]);
      }

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

  const calculateProjectProgress = (project) => {
    if (!project.plan || project.plan.length === 0) return 0;
    const totalProgress = project.plan.reduce((sum, task) => sum + calculateTaskProgress(task), 0);
    return Math.round(totalProgress / project.plan.length);
  };

  const getProjectProgress = (project) => {
    if (project.progressMode === 'auto') {
      return calculateProjectProgress(project);
    }
    return project.progress || 0;
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
    // Only clear viewingProjectId if projects have loaded and the project doesn't exist
    // This prevents clearing the ID on page refresh before projects are loaded
    if (viewingProjectId && visibleProjects.length > 0 && !visibleProjects.some(p => p.id === viewingProjectId)) {
      setViewingProjectId(null);
    }
  }, [loggedInUser, viewingProjectId, visibleProjects]);

  // Daily Update should only show projects the logged-in user is a contributor on
  useEffect(() => {
    if (!showDailyCheckin) return;

    if (userActiveProjects.length > 0 && (!selectedProject || !userActiveProjects.some(p => p.id === selectedProject.id))) {
      setSelectedProject(userActiveProjects[0]);
    }

    if (showDailyCheckin && userActiveProjects.length === 0) {
      setShowDailyCheckin(false);
      setSelectedProject(null);
    }
  }, [showDailyCheckin, userActiveProjects, selectedProject]);

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

  const getInitiativeStatusColor = (status) => {
    const colors = {
      planning: 'var(--amber)',
      active: 'var(--sage)',
      'on-hold': 'var(--stone)',
      cancelled: 'var(--coral)',
      completed: 'var(--earth)',
    };
    return colors[status] || 'var(--stone)';
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
      data-project-id={project.id}
      onClick={() => updateHash('overview', project.id)}
      style={{
        ...styles.projectCard,
        animationDelay: `${index * 100}ms`,
        cursor: 'pointer',
        position: 'relative', // For avatar positioning
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
          <span style={styles.progressValue}>{getProjectProgress(project)}%</span>
        </div>
        <div style={styles.progressBar}>
          <div
            style={{
              ...styles.progressFill,
              width: `${getProjectProgress(project)}%`,
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
        {(() => {
          const latestActivity = project.recentActivity?.[0];
          const latestUpdate = project.lastUpdate || latestActivity?.note || 'No updates yet';
          return <p style={styles.updateText}>{latestUpdate}</p>;
        })()}
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
              updateHash('overview', project.id);
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
    const tasksWithDueDates = [];
    const dueDates = [];

    const addDueDate = (dateValue) => {
      if (!dateValue) return null;
      const parsed = new Date(dateValue);
      if (Number.isNaN(parsed.getTime())) return null;
      dueDates.push(parsed);
      return parsed;
    };

    project.plan.forEach(task => {
      const parsedTaskDueDate = addDueDate(task.dueDate);

      // Add task itself if it has a due date
      if (parsedTaskDueDate) {
        tasksWithDueDates.push({
          id: task.id,
          title: task.title,
          dueDate: parsedTaskDueDate.toISOString(),
          status: task.status || 'todo',
          taskTitle: task.title
        });
      }

      // Add subtasks with due dates
      task.subtasks.forEach(subtask => {
        const parsedDueDate = addDueDate(subtask.dueDate);
        if (parsedDueDate) {
          tasksWithDueDates.push({
            id: subtask.id || `${task.id}-${subtask.title}`,
            title: subtask.title,
            dueDate: parsedDueDate.toISOString(),
            status: subtask.status || 'todo',
            taskTitle: task.title
          });
        }
      });
    });

    const candidates = [...dueDates];
    const rangeEndCandidates = [...dueDates];
    const addCandidate = (dateValue, target) => {
      const parsed = new Date(dateValue);
      if (!Number.isNaN(parsed.getTime())) {
        target.push(parsed);
      }
    };

    addCandidate(project.startDate, candidates);
    addCandidate(project.targetDate, candidates);
    addCandidate(project.targetDate, rangeEndCandidates);

    const earliestDate = candidates.length > 0
      ? new Date(Math.min(...candidates.map(date => date.getTime())))
      : new Date();

    const latestDate = rangeEndCandidates.length > 0
      ? new Date(Math.max(...rangeEndCandidates.map(date => date.getTime())))
      : new Date(earliestDate);

    const bufferDays = 7;
    const endDate = new Date(latestDate);
    endDate.setDate(endDate.getDate() + bufferDays);

    return (
      <div style={{ marginTop: '24px' }}>
        <ForceDirectedTimeline
          tasks={tasksWithDueDates}
          startDate={earliestDate.toISOString()}
          endDate={endDate.toISOString()}
        />
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

        @keyframes momentumPulse {
          0%, 100% {
            box-shadow: 0 4px 20px rgba(122, 155, 118, 0.25);
          }
          50% {
            box-shadow: 0 4px 30px rgba(122, 155, 118, 0.45);
          }
        }

        @keyframes typingBounce {
          0%, 80%, 100% {
            transform: translateY(0);
            opacity: 0.4;
          }
          40% {
            transform: translateY(-6px);
            opacity: 1;
          }
        }

        @keyframes portfolioPulse {
          0%, 100% {
            border-color: var(--earth);
            box-shadow: 0 2px 12px rgba(139, 111, 71, 0.15);
          }
          50% {
            border-color: var(--sage);
            box-shadow: 0 4px 20px rgba(139, 111, 71, 0.25);
          }
        }

        .momentum-suggestion-chip:hover {
          background-color: var(--cream);
          border-color: var(--earth);
          transform: translateY(-2px);
        }

        .portfolio-toggle-btn:hover {
          background-color: var(--sage);
          color: #FFFFFF;
          border-color: var(--sage);
        }
      `}</style>

      {/* Global Search Modal */}
      {globalSearchOpen && (
        <div
          style={styles.globalSearchOverlay}
          onClick={() => {
            // Persist filter when on portfolio view
            if (globalSearchQuery.trim() && activeView === 'overview' && !viewingProjectId) {
              setPortfolioFilter(globalSearchQuery);
            }
            setGlobalSearchOpen(false);
            setGlobalSearchQuery('');
          }}
        >
          <div
            style={styles.globalSearchModal}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.globalSearchInputWrapper}>
              <Search size={20} style={{ color: 'var(--stone)' }} />
              <input
                ref={globalSearchInputRef}
                type="text"
                value={globalSearchQuery}
                onChange={(e) => {
                  setGlobalSearchQuery(e.target.value);
                  setGlobalSearchSelectedIndex(0);
                }}
                onKeyDown={(e) => {
                  const results = getGlobalSearchResults(globalSearchQuery);
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setGlobalSearchSelectedIndex(prev =>
                      prev < results.length - 1 ? prev + 1 : prev
                    );
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setGlobalSearchSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
                  } else if (e.key === 'Enter' && results[globalSearchSelectedIndex]) {
                    e.preventDefault();
                    handleGlobalSearchSelect(results[globalSearchSelectedIndex]);
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    // Persist filter when on portfolio view
                    if (globalSearchQuery.trim() && activeView === 'overview' && !viewingProjectId) {
                      setPortfolioFilter(globalSearchQuery);
                    }
                    setGlobalSearchOpen(false);
                    setGlobalSearchQuery('');
                  }
                }}
                placeholder="Search projects, tasks, people..."
                style={styles.globalSearchInput}
                autoFocus
              />
              <span style={styles.globalSearchEscHint}>ESC to close{activeView === 'overview' && !viewingProjectId ? ' & keep filter' : ''}</span>
            </div>

            {globalSearchQuery && (
              <div ref={globalSearchResultsRef} style={styles.globalSearchResults}>
                {(() => {
                  const results = getGlobalSearchResults(globalSearchQuery);
                  if (results.length === 0) {
                    return (
                      <div style={styles.globalSearchNoResults}>
                        No results for "{globalSearchQuery}"
                      </div>
                    );
                  }
                  return results.map((result, idx) => (
                    <div
                      key={`${result.type}-${result.id}`}
                      data-search-index={idx}
                      style={{
                        ...styles.globalSearchResultItem,
                        backgroundColor: idx === globalSearchSelectedIndex ? 'var(--cream)' : 'transparent'
                      }}
                      onClick={() => handleGlobalSearchSelect(result)}
                      onMouseEnter={() => setGlobalSearchSelectedIndex(idx)}
                    >
                      <span style={{
                        ...styles.globalSearchResultType,
                        backgroundColor:
                          result.type === 'person' ? 'var(--sage)20' :
                          result.type === 'project' ? 'var(--earth)20' :
                          result.type === 'task' ? 'var(--amber)20' :
                          'var(--coral)20',
                        color:
                          result.type === 'person' ? 'var(--sage)' :
                          result.type === 'project' ? 'var(--earth)' :
                          result.type === 'task' ? 'var(--amber)' :
                          'var(--coral)'
                      }}>
                        {result.type}
                      </span>
                      <span style={styles.globalSearchResultDisplay}>{result.display}</span>
                    </div>
                  ));
                })()}
              </div>
            )}

            {activeView === 'overview' && globalSearchQuery && !viewingProjectId && (
              <div style={styles.globalSearchFilterHint}>
                <span>💡 Search is filtering visible portfolio cards</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Seasonal Banner */}
      {showSeasonalBanner && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: seasonalBannerGradient,
          backgroundSize: '200% 100%',
          animation: 'seasonalSlide 3s linear infinite',
          zIndex: 9999,
        }} />
      )}
      <style>
        {showSeasonalBanner && `
          @keyframes seasonalSlide {
            0% { background-position: 0% 0%; }
            100% { background-position: 200% 0%; }
          }
        `}
      </style>

      <div style={{
        ...styles.container,
        '--earth': seasonalTheme.colors.earth,
        '--sage': seasonalTheme.colors.sage,
        '--coral': seasonalTheme.colors.coral,
        '--amber': seasonalTheme.colors.amber,
        '--cream': seasonalTheme.colors.cream,
        '--cloud': seasonalTheme.colors.cloud,
        '--stone': seasonalTheme.colors.stone,
        '--charcoal': seasonalTheme.colors.charcoal,
        backgroundColor: seasonalTheme.colors.cream,
        transition: 'background-color 0.5s ease',
      }}>
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

              <div style={{ position: 'relative' }}>
                <textarea
                  value={checkinNote}
                  onChange={handleCheckinNoteChange}
                  onKeyDown={(e) => {
                    if (showCheckinTagSuggestions) {
                      const filteredTags = allTags
                        .filter(tag =>
                          tag.display.toLowerCase().includes(checkinTagSearchTerm.toLowerCase())
                        )
                        .slice(0, 8);

                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setSelectedCheckinTagIndex(prev =>
                          prev < filteredTags.length - 1 ? prev + 1 : prev
                        );
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setSelectedCheckinTagIndex(prev => prev > 0 ? prev - 1 : 0);
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (filteredTags[selectedCheckinTagIndex]) {
                          insertCheckinTag(filteredTags[selectedCheckinTagIndex]);
                        }
                        return;
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        setShowCheckinTagSuggestions(false);
                      }
                    } else if (e.ctrlKey && e.key === 'Enter') {
                      e.preventDefault();
                      handleDailyCheckin(selectedProject.id);
                    }
                  }}
                  onFocus={() => setFocusedField('daily-checkin')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Share any updates, blockers, or progress made... Use @ to tag people, projects, or tasks"
                  style={styles.textarea}
                  autoFocus
                />

                {/* Tag Suggestions Dropdown for Daily Check-in */}
                {showCheckinTagSuggestions && (
                  <div style={styles.tagSuggestions}>
                    {allTags
                      .filter(tag =>
                        tag.display.toLowerCase().includes(checkinTagSearchTerm.toLowerCase())
                      )
                      .slice(0, 8)
                      .map((tag, idx) => (
                        <div
                          key={idx}
                          style={{
                            ...styles.tagSuggestionItem,
                            backgroundColor: idx === selectedCheckinTagIndex ? 'var(--cream)' : '#FFFFFF'
                          }}
                          onClick={() => insertCheckinTag(tag)}
                          onMouseEnter={() => setSelectedCheckinTagIndex(idx)}
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

                {renderEditingHint('daily-checkin')}
              </div>

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
                    // Skip to next project the user is a contributor on
                    const currentIndex = userActiveProjects.findIndex(p => p.id === selectedProject.id);
                    if (currentIndex < userActiveProjects.length - 1) {
                      setSelectedProject(userActiveProjects[currentIndex + 1]);
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
                {userActiveProjects.map((p, idx) => (
                  <div
                    key={p.id}
                    style={{
                      ...styles.progressDot,
                      backgroundColor: p.id === selectedProject.id ? 'var(--amber)' : 'var(--cloud)',
                      opacity: idx <= userActiveProjects.indexOf(selectedProject) ? 1 : 0.3
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
      <div
        style={{
          ...styles.sidebar,
          width: `${sidebarWidth}px`,
          ...(isSidebarCollapsed ? styles.sidebarCollapsed : {})
        }}
      >
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
            <button
              onClick={() => {
                setActiveView('thrust');
                setViewingProjectId(null);
              }}
              style={{
                ...styles.navItem,
                ...(activeView === 'thrust' && !viewingProjectId ? styles.navItemActive : {}),
                padding: '12px',
                justifyContent: 'center',
                marginTop: '16px'
              }}
              title="Momentum"
            >
              <TrendingUp size={20} style={{ color: activeView === 'thrust' ? 'var(--earth)' : 'var(--charcoal)' }} />
            </button>
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
                onClick={() => updateHash('people')}
                style={{
                  ...styles.navItem,
                  ...(activeView === 'people' && !viewingProjectId ? styles.navItemActive : {})
                }}
              >
                People
              </button>
              <button
                onClick={() => updateHash('overview')}
                style={{
                  ...styles.navItem,
                  ...(activeView === 'overview' && !viewingProjectId ? styles.navItemActive : {})
                }}
              >
                Portfolio
              </button>
              <button
                onClick={() => updateHash('thrust')}
                style={{
                  ...styles.navItem,
                  ...(activeView === 'thrust' && !viewingProjectId ? styles.navItemActive : {})
                }}
              >
                Momentum
              </button>
              <button
                onClick={() => updateHash('slides')}
                style={{
                  ...styles.navItem,
                  ...(activeView === 'slides' && !viewingProjectId ? styles.navItemActive : {})
                }}
              >
                Slides
              </button>
              <button
                onClick={() => updateHash('timeline')}
                style={{
                  ...styles.navItem,
                  ...(activeView === 'timeline' && !viewingProjectId ? styles.navItemActive : {})
                }}
              >
                Timeline
              </button>
              {showDataPage && (
                <button
                  onClick={() => updateHash('data')}
                  style={{
                    ...styles.navItem,
                    ...(activeView === 'data' && !viewingProjectId ? styles.navItemActive : {}),
                    marginTop: '8px'
                  }}
                >
                  Data
                </button>
              )}
            </nav>
          </div>
        )}

      </div>

      {!isSidebarCollapsed && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-valuemin={SIDEBAR_MIN_WIDTH}
          aria-valuemax={SIDEBAR_MAX_WIDTH}
          aria-valuenow={sidebarWidth}
          style={{
            ...styles.sidebarResizeHandle,
            ...(isResizingSidebar ? styles.sidebarResizeHandleActive : {})
          }}
          onMouseDown={startSidebarResize}
          title="Drag to resize the sidebar"
        >
          <div style={styles.sidebarResizeGrip} />
        </div>
      )}

      <main style={{
        ...styles.main,
        ...(activeView === 'thrust' ? styles.mainMomentum : {}),
      }}>
        <div style={styles.topBar}>
          <div style={styles.topBarLeft}>
            <button
              onClick={() => {
                setGlobalSearchOpen(true);
                setGlobalSearchQuery(portfolioFilter);
                setGlobalSearchSelectedIndex(0);
              }}
              style={styles.searchIconTrigger}
              title="Search (Ctrl+K)"
            >
              <Search size={16} />
              <span style={styles.searchHintText}>Ctrl+K</span>
            </button>

            {/* Active portfolio filter indicator */}
            {portfolioFilter && activeView === 'overview' && !viewingProjectId && (
              <div style={styles.activeFilterBadge}>
                <span style={styles.activeFilterText}>
                  Filtered: "{portfolioFilter}"
                </span>
                <button
                  onClick={clearPortfolioFilter}
                  style={styles.clearFilterButton}
                  title="Clear filter"
                  aria-label="Clear filter"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
          <div style={styles.topBarRight}>
            {activeView === 'thrust' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: '12px' }}>
                <button
                  onClick={() => {
                    if (userActiveProjects.length > 0) {
                      setSelectedProject(userActiveProjects[0]);
                      setShowDailyCheckin(true);
                    }
                  }}
                  style={{
                    ...styles.dailyUpdateButton,
                    opacity: userActiveProjects.length === 0 ? 0.5 : 1,
                    cursor: userActiveProjects.length === 0 ? 'not-allowed' : 'pointer'
                  }}
                  disabled={userActiveProjects.length === 0}
                  title={userActiveProjects.length === 0 ? 'No active projects you are a contributor on' : 'Start a daily check-in for your projects'}
                >
                  Daily Update
                </button>
                <div style={styles.editingAsText}>
                  editing as <span style={styles.editingAsName}>{loggedInUser || 'Guest'}</span>
                </div>
              </div>
            )}
            <button
              onClick={() => onOpenSettings({
                loggedInUser,
                setLoggedInUser: (newUser) => {
                  setLoggedInUser(newUser);
                  localStorage.setItem('manity_logged_in_user', newUser);
                },
                allStakeholders: getAllStakeholders(),
                showDataPage,
                setShowDataPage,
                seasonalThemeEnabled,
                setSeasonalThemeEnabled
              })}
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
              onClick={() => {
                setViewingProjectId(null);
                updateHash('overview');
              }}
              style={styles.backButton}
            >
              <ArrowLeft size={18} />
              Back to Projects
            </button>

            <div style={styles.detailsHeader}>
              <div>
                {editMode ? (
                  <input
                    type="text"
                    value={editValues.name}
                    onChange={(e) => setEditValues({...editValues, name: e.target.value})}
                    onFocus={() => setFocusedField('project-name')}
                    onBlur={() => setFocusedField(null)}
                    style={{
                      ...styles.detailsTitle,
                      border: '2px solid var(--earth)',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      width: '100%',
                      boxSizing: 'border-box',
                      backgroundColor: '#FFFFFF'
                    }}
                    placeholder="Project Name"
                  />
                ) : (
                  <h2 style={styles.detailsTitle}>{viewingProject.name}</h2>
                )}
                <div style={styles.descriptionSection}>
                  <label style={styles.descriptionLabel}>Project Description</label>
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
                  <div style={styles.compactInfoItem}>
                    <Settings size={14} style={{ color: 'var(--stone)' }} />
                    <span style={styles.compactInfoLabel}>Progress Mode:</span>
                    {editMode ? (
                      <select
                        value={editValues.progressMode || 'manual'}
                        onChange={(e) => setEditValues({...editValues, progressMode: e.target.value})}
                        style={styles.compactSelect}
                      >
                        <option value="manual">Manual</option>
                        <option value="auto">Auto (from tasks)</option>
                      </select>
                    ) : (
                      <span style={styles.statusBadgeSmall}>
                        {viewingProject.progressMode === 'auto' ? 'Auto' : 'Manual'}
                      </span>
                    )}
                  </div>
                  {(editMode && editValues.progressMode === 'manual') || (!editMode && viewingProject.progressMode !== 'auto') ? (
                    <div style={styles.compactInfoItem}>
                      <TrendingUp size={14} style={{ color: 'var(--stone)' }} />
                      <span style={styles.compactInfoLabel}>Progress:</span>
                      {editMode ? (
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={editValues.progress || 0}
                          onChange={(e) => {
                            const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                            setEditValues({...editValues, progress: val});
                          }}
                          style={{...styles.compactSelect, width: '80px'}}
                        />
                      ) : (
                        <span style={styles.compactInfoValue}>{viewingProject.progress}%</span>
                      )}
                    </div>
                  ) : null}
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
                    <PersonPicker
                      allPeople={getAllStakeholders()}
                      selectedPeople={editValues.stakeholders || []}
                      onChange={handleEditStakeholderSelection}
                      onAddNewPerson={(name) => {
                        setStakeholderSelectionTarget('editProject');
                        setEditingPerson({});
                      }}
                      placeholder="Type @ to tag people..."
                    />
                    <div style={styles.helperText}>Type @ to search and tag people. Click the X to remove.</div>
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
                                    // Edit completedDate when done, dueDate when not done
                                    const isCompleted = task.status === 'completed';
                                    setEditingCompletedDate(isCompleted);
                                    setTempDueDate(isCompleted ? (task.completedDate || '') : (task.dueDate || ''));
                                  }}
                                  title={task.status === 'completed' ? "Click to edit completion date" : "Click to edit due date"}
                                >
                                  {dueDateInfo.isCompleted && <Check size={12} style={{ color: 'var(--sage)' }} />}
                                  {dueDateInfo.text}
                                </span>
                              )}
                            </div>
                            <div style={styles.taskHeaderRight}>
                              {/* Task Assignee picker */}
                              <div style={{ position: 'relative' }}>
                                {editingAssignee === `task-${task.id}` ? (
                                  <div style={styles.assigneeDropdown} data-assignee-dropdown>
                                    <input
                                      type="text"
                                      value={assigneeSearchTerm}
                                      onChange={(e) => {
                                        setAssigneeSearchTerm(e.target.value);
                                        setAssigneeFocusedIndex(0);
                                      }}
                                      onKeyDown={(e) => {
                                        const filtered = people.filter(p =>
                                          p.name.toLowerCase().includes(assigneeSearchTerm.toLowerCase()) ||
                                          (p.team && p.team.toLowerCase().includes(assigneeSearchTerm.toLowerCase()))
                                        ).slice(0, 5);
                                        if (e.key === 'ArrowDown') {
                                          e.preventDefault();
                                          setAssigneeFocusedIndex(prev => prev < filtered.length - 1 ? prev + 1 : prev);
                                        } else if (e.key === 'ArrowUp') {
                                          e.preventDefault();
                                          setAssigneeFocusedIndex(prev => prev > 0 ? prev - 1 : 0);
                                        } else if (e.key === 'Enter' && filtered[assigneeFocusedIndex]) {
                                          e.preventDefault();
                                          handleUpdateAssignee(task.id, null, filtered[assigneeFocusedIndex]);
                                        } else if (e.key === 'Escape') {
                                          e.preventDefault();
                                          setEditingAssignee(null);
                                          setAssigneeSearchTerm('');
                                        }
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      placeholder="Search people..."
                                      style={styles.assigneeSearchInput}
                                      autoFocus
                                    />
                                    <div style={styles.assigneeList}>
                                      {people
                                        .filter(p =>
                                          p.name.toLowerCase().includes(assigneeSearchTerm.toLowerCase()) ||
                                          (p.team && p.team.toLowerCase().includes(assigneeSearchTerm.toLowerCase()))
                                        )
                                        .slice(0, 5)
                                        .map((person, idx) => (
                                          <div
                                            key={person.id || person.name}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleUpdateAssignee(task.id, null, person);
                                            }}
                                            onMouseEnter={() => setAssigneeFocusedIndex(idx)}
                                            style={{
                                              ...styles.assigneeOption,
                                              backgroundColor: idx === assigneeFocusedIndex ? 'var(--cream)' : 'transparent'
                                            }}
                                          >
                                            <User size={12} style={{ color: 'var(--stone)' }} />
                                            <span>{person.name}</span>
                                            {person.team && <span style={{ color: 'var(--stone)', fontSize: '11px' }}>({person.team})</span>}
                                          </div>
                                        ))}
                                      {task.assignee && (
                                        <div
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleUpdateAssignee(task.id, null, null);
                                          }}
                                          style={{ ...styles.assigneeOption, color: 'var(--coral)' }}
                                        >
                                          <X size={12} />
                                          <span>Remove assignee</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingAssignee(`task-${task.id}`);
                                      setAssigneeSearchTerm('');
                                      setAssigneeFocusedIndex(0);
                                    }}
                                    style={styles.assigneeButton}
                                    title={task.assignee ? `Assigned to ${task.assignee.name}` : "Assign to someone"}
                                  >
                                    {task.assignee ? (
                                      <span style={styles.assigneeBadge}>
                                        {task.assignee.name.split(' ').map(n => n[0]).join('')}
                                      </span>
                                    ) : (
                                      <UserCircle size={16} style={{ color: 'var(--stone)' }} />
                                    )}
                                  </button>
                                )}
                              </div>
                              {/* Task Comment Button with Tooltip */}
                              <div
                                style={{ position: 'relative' }}
                                onMouseEnter={() => setHoveredCommentItem(`task-${task.id}`)}
                                onMouseLeave={() => setHoveredCommentItem(null)}
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTaskCommentingOn(taskCommentingOn === task.id ? null : task.id);
                                    setTaskComment('');
                                  }}
                                  style={{
                                    ...styles.commentButton,
                                    color: getCommentsForItem(task.id).length > 0 ? 'var(--earth)' : 'var(--stone)'
                                  }}
                                  title="Add/view comments"
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--amber)' + '20';
                                    e.currentTarget.style.color = 'var(--earth)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = getCommentsForItem(task.id).length > 0 ? 'var(--earth)' : 'var(--stone)';
                                  }}
                                >
                                  <MessageSquare size={14} />
                                  {getCommentsForItem(task.id).length > 0 && (
                                    <span style={styles.commentCountBadge}>{getCommentsForItem(task.id).length}</span>
                                  )}
                                </button>
                                {/* Comment Tooltip */}
                                {hoveredCommentItem === `task-${task.id}` && getCommentsForItem(task.id).length > 0 && (
                                  <div style={styles.commentTooltip}>
                                    <div style={styles.commentTooltipHeader}>Comments ({getCommentsForItem(task.id).length})</div>
                                    {getCommentsForItem(task.id).slice(0, 5).map((comment, cIdx) => (
                                      <div key={comment.id || cIdx} style={styles.commentTooltipItem}>
                                        <div style={styles.commentTooltipAuthor}>{comment.author || 'Unknown'}</div>
                                        <div style={styles.commentTooltipNote}>{comment.note}</div>
                                        <div style={styles.commentTooltipDate}>{formatDateTime(comment.date)}</div>
                                      </div>
                                    ))}
                                    {getCommentsForItem(task.id).length > 5 && (
                                      <div style={styles.commentTooltipMore}>+{getCommentsForItem(task.id).length - 5} more</div>
                                    )}
                                  </div>
                                )}
                              </div>
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

                          {/* Task Comment Input Box */}
                          {taskCommentingOn === task.id && (
                            <div style={styles.commentBox}>
                              <textarea
                                value={taskComment}
                                onChange={(e) => setTaskComment(e.target.value)}
                                onFocus={() => setFocusedField('task-comment')}
                                onBlur={() => setFocusedField(null)}
                                onKeyDown={(e) => {
                                  if (e.ctrlKey && e.key === 'Enter') {
                                    e.preventDefault();
                                    handleTaskComment(task.id, task.title);
                                  }
                                }}
                                placeholder="Add a comment to this task..."
                                style={styles.commentInput}
                                autoFocus
                              />
                              {renderEditingHint('task-comment')}
                              {renderCtrlEnterHint('send comment')}
                              <div style={styles.commentActions}>
                                <button
                                  onClick={() => handleTaskComment(task.id, task.title)}
                                  disabled={!taskComment.trim()}
                                  style={{
                                    ...styles.commentSubmit,
                                    opacity: taskComment.trim() ? 1 : 0.5,
                                    cursor: taskComment.trim() ? 'pointer' : 'not-allowed'
                                  }}
                                >
                                  <Send size={12} />
                                  Comment
                                </button>
                                <button
                                  onClick={() => setTaskCommentingOn(null)}
                                  style={styles.commentCancel}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

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
                                            // Edit completedDate when done, dueDate when not done
                                            const isCompleted = subtask.status === 'completed';
                                            setEditingCompletedDate(isCompleted);
                                            setTempDueDate(isCompleted ? (subtask.completedDate || '') : (subtask.dueDate || ''));
                                          }}
                                          title={subtask.status === 'completed' ? "Click to edit completion date" : "Click to edit due date"}
                                        >
                                          {subtaskDueDate.isCompleted && <Check size={10} style={{ color: 'var(--sage)' }} />}
                                          {subtaskDueDate.text}
                                        </span>
                                      )}
                                      {/* Assignee picker */}
                                      <div style={{ position: 'relative' }}>
                                        {editingAssignee === `subtask-${subtask.id}` ? (
                                          <div style={styles.assigneeDropdown} data-assignee-dropdown>
                                            <input
                                              type="text"
                                              value={assigneeSearchTerm}
                                              onChange={(e) => {
                                                setAssigneeSearchTerm(e.target.value);
                                                setAssigneeFocusedIndex(0);
                                              }}
                                              onKeyDown={(e) => {
                                                const filtered = people.filter(p =>
                                                  p.name.toLowerCase().includes(assigneeSearchTerm.toLowerCase()) ||
                                                  (p.team && p.team.toLowerCase().includes(assigneeSearchTerm.toLowerCase()))
                                                ).slice(0, 5);
                                                if (e.key === 'ArrowDown') {
                                                  e.preventDefault();
                                                  setAssigneeFocusedIndex(prev => prev < filtered.length - 1 ? prev + 1 : prev);
                                                } else if (e.key === 'ArrowUp') {
                                                  e.preventDefault();
                                                  setAssigneeFocusedIndex(prev => prev > 0 ? prev - 1 : 0);
                                                } else if (e.key === 'Enter' && filtered[assigneeFocusedIndex]) {
                                                  e.preventDefault();
                                                  handleUpdateAssignee(task.id, subtask.id, filtered[assigneeFocusedIndex]);
                                                } else if (e.key === 'Escape') {
                                                  e.preventDefault();
                                                  setEditingAssignee(null);
                                                  setAssigneeSearchTerm('');
                                                }
                                              }}
                                              onClick={(e) => e.stopPropagation()}
                                              placeholder="Search people..."
                                              style={styles.assigneeSearchInput}
                                              autoFocus
                                            />
                                            <div style={styles.assigneeList}>
                                              {people
                                                .filter(p =>
                                                  p.name.toLowerCase().includes(assigneeSearchTerm.toLowerCase()) ||
                                                  (p.team && p.team.toLowerCase().includes(assigneeSearchTerm.toLowerCase()))
                                                )
                                                .slice(0, 5)
                                                .map((person, idx) => (
                                                  <div
                                                    key={person.id || person.name}
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleUpdateAssignee(task.id, subtask.id, person);
                                                    }}
                                                    onMouseEnter={() => setAssigneeFocusedIndex(idx)}
                                                    style={{
                                                      ...styles.assigneeOption,
                                                      backgroundColor: idx === assigneeFocusedIndex ? 'var(--cream)' : 'transparent'
                                                    }}
                                                  >
                                                    <User size={12} style={{ color: 'var(--stone)' }} />
                                                    <span>{person.name}</span>
                                                    {person.team && <span style={{ color: 'var(--stone)', fontSize: '11px' }}>({person.team})</span>}
                                                  </div>
                                                ))}
                                              {subtask.assignee && (
                                                <div
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleUpdateAssignee(task.id, subtask.id, null);
                                                  }}
                                                  style={{ ...styles.assigneeOption, color: 'var(--coral)' }}
                                                >
                                                  <X size={12} />
                                                  <span>Remove assignee</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ) : (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditingAssignee(`subtask-${subtask.id}`);
                                              setAssigneeSearchTerm('');
                                              setAssigneeFocusedIndex(0);
                                            }}
                                            style={styles.assigneeButton}
                                            title={subtask.assignee ? `Assigned to ${subtask.assignee.name}` : "Assign to someone"}
                                          >
                                            {subtask.assignee ? (
                                              <span style={styles.assigneeBadge}>
                                                {subtask.assignee.name.split(' ').map(n => n[0]).join('')}
                                              </span>
                                            ) : (
                                              <UserCircle size={14} style={{ color: 'var(--stone)' }} />
                                            )}
                                          </button>
                                        )}
                                      </div>
                                      {/* Subtask Comment Button with Tooltip */}
                                      <div
                                        style={{ position: 'relative' }}
                                        onMouseEnter={() => setHoveredCommentItem(`subtask-${subtask.id}`)}
                                        onMouseLeave={() => setHoveredCommentItem(null)}
                                      >
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setCommentingOn(isCommenting ? null : subtask.id);
                                            setSubtaskComment('');
                                          }}
                                          style={{
                                            ...styles.commentButton,
                                            color: getCommentsForItem(task.id, subtask.id).length > 0 ? 'var(--earth)' : 'var(--stone)'
                                          }}
                                          title="Add/view comments"
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = 'var(--amber)' + '20';
                                            e.currentTarget.style.color = 'var(--earth)';
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                            e.currentTarget.style.color = getCommentsForItem(task.id, subtask.id).length > 0 ? 'var(--earth)' : 'var(--stone)';
                                          }}
                                        >
                                          <MessageSquare size={14} />
                                          {getCommentsForItem(task.id, subtask.id).length > 0 && (
                                            <span style={styles.commentCountBadge}>{getCommentsForItem(task.id, subtask.id).length}</span>
                                          )}
                                        </button>
                                        {/* Comment Tooltip */}
                                        {hoveredCommentItem === `subtask-${subtask.id}` && getCommentsForItem(task.id, subtask.id).length > 0 && (
                                          <div style={styles.commentTooltip}>
                                            <div style={styles.commentTooltipHeader}>Comments ({getCommentsForItem(task.id, subtask.id).length})</div>
                                            {getCommentsForItem(task.id, subtask.id).slice(0, 5).map((comment, cIdx) => (
                                              <div key={comment.id || cIdx} style={styles.commentTooltipItem}>
                                                <div style={styles.commentTooltipAuthor}>{comment.author || 'Unknown'}</div>
                                                <div style={styles.commentTooltipNote}>{comment.note}</div>
                                                <div style={styles.commentTooltipDate}>{formatDateTime(comment.date)}</div>
                                              </div>
                                            ))}
                                            {getCommentsForItem(task.id, subtask.id).length > 5 && (
                                              <div style={styles.commentTooltipMore}>+{getCommentsForItem(task.id, subtask.id).length - 5} more</div>
                                            )}
                                          </div>
                                        )}
                                      </div>
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
                                <div style={styles.inlineAddSubtask}>
                                  <input
                                    type="text"
                                    value={newSubtaskTitle}
                                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && newSubtaskTitle.trim()) {
                                        e.preventDefault();
                                        handleAddSubtask(task.id);
                                      } else if (e.key === 'Escape') {
                                        e.preventDefault();
                                        setAddingSubtaskTo(null);
                                        setNewSubtaskTitle('');
                                        setNewSubtaskDueDate('');
                                      }
                                    }}
                                    placeholder="Subtask title..."
                                    style={styles.inlineAddInputSmall}
                                    autoFocus
                                  />
                                  <input
                                    type="date"
                                    value={newSubtaskDueDate}
                                    onChange={(e) => setNewSubtaskDueDate(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && newSubtaskTitle.trim()) {
                                        e.preventDefault();
                                        handleAddSubtask(task.id);
                                      } else if (e.key === 'Escape') {
                                        e.preventDefault();
                                        setAddingSubtaskTo(null);
                                        setNewSubtaskTitle('');
                                        setNewSubtaskDueDate('');
                                      }
                                    }}
                                    style={styles.inlineAddDateInputSmall}
                                  />
                                  <button
                                    onClick={() => handleAddSubtask(task.id)}
                                    disabled={!newSubtaskTitle.trim()}
                                    style={{
                                      ...styles.inlineAddConfirmSmall,
                                      opacity: newSubtaskTitle.trim() ? 1 : 0.4,
                                      cursor: newSubtaskTitle.trim() ? 'pointer' : 'not-allowed'
                                    }}
                                    title="Add subtask (Enter)"
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setAddingSubtaskTo(null);
                                      setNewSubtaskTitle('');
                                      setNewSubtaskDueDate('');
                                    }}
                                    style={styles.inlineAddCancelSmall}
                                    title="Cancel (Esc)"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setAddingSubtaskTo(task.id)}
                                  style={styles.minimalAddButtonSmall}
                                  title="Add subtask"
                                >
                                  <Plus size={14} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Add New Task */}
                    {addingNewTask ? (
                      <div style={styles.inlineAddTask}>
                        <input
                          type="text"
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newTaskTitle.trim()) {
                              e.preventDefault();
                              handleAddTask();
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              setAddingNewTask(false);
                              setNewTaskTitle('');
                              setNewTaskDueDate('');
                            }
                          }}
                          placeholder="Task title..."
                          style={styles.inlineAddInput}
                          autoFocus
                        />
                        <input
                          type="date"
                          value={newTaskDueDate}
                          onChange={(e) => setNewTaskDueDate(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newTaskTitle.trim()) {
                              e.preventDefault();
                              handleAddTask();
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              setAddingNewTask(false);
                              setNewTaskTitle('');
                              setNewTaskDueDate('');
                            }
                          }}
                          style={styles.inlineAddDateInput}
                        />
                        <button
                          onClick={handleAddTask}
                          disabled={!newTaskTitle.trim()}
                          style={{
                            ...styles.inlineAddConfirm,
                            opacity: newTaskTitle.trim() ? 1 : 0.4,
                            cursor: newTaskTitle.trim() ? 'pointer' : 'not-allowed'
                          }}
                          title="Add task (Enter)"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setAddingNewTask(false);
                            setNewTaskTitle('');
                            setNewTaskDueDate('');
                          }}
                          style={styles.inlineAddCancel}
                          title="Cancel (Esc)"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingNewTask(true)}
                        style={styles.minimalAddButton}
                        title="Add new task"
                      >
                        <Plus size={16} />
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
                        if (showProjectTagSuggestions) {
                          const filteredTags = allTags
                            .filter(tag =>
                              tag.display.toLowerCase().includes(projectTagSearchTerm.toLowerCase())
                            )
                            .slice(0, 8);

                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setSelectedProjectTagIndex(prev =>
                              prev < filteredTags.length - 1 ? prev + 1 : prev
                            );
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setSelectedProjectTagIndex(prev => prev > 0 ? prev - 1 : 0);
                          } else if (e.key === 'Enter') {
                            e.preventDefault();
                            if (filteredTags[selectedProjectTagIndex]) {
                              insertProjectTag(filteredTags[selectedProjectTagIndex]);
                            }
                            return;
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            setShowProjectTagSuggestions(false);
                          }
                        } else if (e.ctrlKey && e.key === 'Enter') {
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
                        {allTags
                          .filter(tag =>
                            tag.display.toLowerCase().includes(projectTagSearchTerm.toLowerCase())
                          )
                          .slice(0, 8)
                          .map((tag, idx) => (
                            <div
                              key={idx}
                              style={{
                                ...styles.tagSuggestionItem,
                                backgroundColor: idx === selectedProjectTagIndex ? 'var(--cream)' : '#FFFFFF'
                              }}
                              onClick={() => insertProjectTag(tag)}
                              onMouseEnter={() => setSelectedProjectTagIndex(idx)}
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
                  {[...viewingProject.recentActivity].sort((a, b) => new Date(b.date) - new Date(a.date)).map((activity, idx) => (
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
                      if (showTagSuggestions) {
                        const filteredTags = allTags
                          .filter(tag =>
                            tag.display.toLowerCase().includes(tagSearchTerm.toLowerCase())
                          )
                          .slice(0, 8);

                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setSelectedTagIndex(prev =>
                            prev < filteredTags.length - 1 ? prev + 1 : prev
                          );
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setSelectedTagIndex(prev => prev > 0 ? prev - 1 : 0);
                        } else if (e.key === 'Enter') {
                          e.preventDefault();
                          if (filteredTags[selectedTagIndex]) {
                            insertTag(filteredTags[selectedTagIndex], timelineInputRef);
                          }
                          return;
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          setShowTagSuggestions(false);
                        }
                      } else if (e.ctrlKey && e.key === 'Enter') {
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
                      {allTags
                        .filter(tag =>
                          tag.display.toLowerCase().includes(tagSearchTerm.toLowerCase())
                        )
                        .slice(0, 8)
                        .map((tag, idx) => (
                          <div
                            key={idx}
                            style={{
                              ...styles.tagSuggestionItem,
                              backgroundColor: idx === selectedTagIndex ? 'var(--cream)' : '#FFFFFF'
                            }}
                            onClick={() => insertTag(tag, timelineInputRef)}
                            onMouseEnter={() => setSelectedTagIndex(idx)}
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
        ) : activeView === 'data' ? (
          <DataPage
            projects={projects}
            people={people}
            onUpdateProject={updateProject}
            onDeleteProject={apiDeleteProject}
            onUpdateTask={updateTask}
            onDeleteTask={apiDeleteTask}
            onUpdateSubtask={updateSubtask}
            onDeleteSubtask={apiDeleteSubtask}
            onUpdateActivity={updateActivity}
            onDeleteActivity={apiDeleteActivity}
            onUpdatePerson={updatePerson}
            onDeletePerson={deletePerson}
          />
        ) : activeView === 'thrust' ? (
          <div style={styles.momentumViewWrapper}>
            <MomentumChatWithAgent
              messages={getThrustConversation()}
              onSendMessage={(message) => {
                setThrustMessages(prev => [...prev, message]);
              }}
              onApplyActions={(actionResults, updatedProjectIds) => {
                // Track recently updated projects for highlighting with timestamps
                if (updatedProjectIds && updatedProjectIds.length > 0) {
                  const now = Date.now();
                  setRecentlyUpdatedProjects(prev => {
                    const updated = { ...prev };
                    updatedProjectIds.forEach(id => {
                      updated[id] = now;
                    });
                    return updated;
                  });
                  setExpandedMomentumProjects(prev => {
                    const newExpanded = { ...prev };
                    updatedProjectIds.forEach(id => {
                      newExpanded[String(id)] = true;
                    });
                    return newExpanded;
                  });
                }
              }}
              onUndoAction={undoThrustAction}
              loggedInUser={loggedInUser}
              people={people}
              recentlyUpdatedProjects={recentlyUpdatedProjects}
              seasonalThemeEnabled={seasonalThemeEnabled}
            />
          </div>
        ) : activeView === 'slides' ? (
          <Slides
            projects={projects}
            setProjects={setProjects}
            onGenerateExecSummary={generateExecSummary}
            isGeneratingSummary={isGeneratingSummary}
            apiBaseUrl={
              import.meta.env.VITE_API_BASE ||
              import.meta.env.VITE_API_BASE_URL ||
              ''
            }
          />
        ) : activeView === 'people' ? (
          // People View
          <>
            <header style={styles.header}>
              <div>
                <h2 style={styles.pageTitle}>People</h2>
                <p style={styles.pageSubtitle}>
                  Manage people in your portfolio
                </p>
              </div>
              <button
                onClick={() => setEditingPerson({})}
                style={styles.newProjectButton}
              >
                <Plus size={18} />
                Add Person
              </button>
            </header>

            <div style={{ marginTop: '16px' }}>
              <PeopleGraph
                people={people}
                projects={projects}
                onUpdatePerson={updatePerson}
                onDeletePerson={deletePerson}
                onViewProject={(projectId) => {
                  setActiveView('overview');
                  setViewingProjectId(projectId);
                }}
                onLoginAs={(personName) => {
                  setLoggedInUser(personName);
                  localStorage.setItem('manity_logged_in_user', personName);
                }}
                loggedInUser={loggedInUser}
                featuredPersonId={featuredPersonId}
              />
            </div>
          </>
        ) : (
          // Projects Overview
          <>
            <div style={{ marginBottom: '24px' }}>
              <PeopleProjectsJuggle
                projects={visibleProjects}
                people={people}
                seasonalThemeEnabled={seasonalThemeEnabled}
              />
            </div>
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
                    onClick={() => setShowNewInitiative(prev => !prev)}
                    style={styles.secondaryButton}
                  >
                    <Plus size={18} />
                    New Initiative
                  </button>
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

            {showNewInitiative && (
              <div style={styles.newProjectPanel}>
                <div style={styles.sectionHeaderRow}>
                  <div>
                    <h3 style={styles.sectionTitle}>New initiative</h3>
                    <p style={styles.sectionSubtitle}>Define the umbrella effort for related projects.</p>
                  </div>
                </div>
                <div style={styles.newProjectFormGrid}>
                  <div style={styles.formField}>
                    <label style={styles.formLabel}>Name</label>
                    <input
                      type="text"
                      value={newInitiativeName}
                      onChange={(e) => setNewInitiativeName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.ctrlKey && e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateInitiative();
                        }
                      }}
                      placeholder="What are we rallying around?"
                      style={styles.input}
                      autoFocus
                    />
                  </div>
                  <div style={{ ...styles.formField, gridColumn: 'span 2' }}>
                    <label style={styles.formLabel}>Description</label>
                    <textarea
                      value={newInitiativeDescription}
                      onChange={(e) => setNewInitiativeDescription(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.ctrlKey && e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateInitiative();
                        }
                      }}
                      placeholder="What outcome does this initiative drive?"
                      style={styles.projectUpdateInput}
                    />
                  </div>
                  <div style={styles.formField}>
                    <label style={styles.formLabel}>Priority</label>
                    <select
                      value={newInitiativePriority}
                      onChange={(e) => setNewInitiativePriority(e.target.value)}
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
                      value={newInitiativeStatus}
                      onChange={(e) => setNewInitiativeStatus(e.target.value)}
                      style={styles.select}
                    >
                      <option value="planning">Planning</option>
                      <option value="active">Active</option>
                      <option value="on-hold">On Hold</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div style={styles.formField}>
                    <label style={styles.formLabel}>Target date</label>
                    <input
                      type="date"
                      value={newInitiativeTargetDate}
                      onChange={(e) => setNewInitiativeTargetDate(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                </div>
                <div style={styles.newProjectActions}>
                  <button
                    onClick={handleCreateInitiative}
                    disabled={!newInitiativeName.trim()}
                    style={{
                      ...styles.primaryButton,
                      opacity: newInitiativeName.trim() ? 1 : 0.5,
                      cursor: newInitiativeName.trim() ? 'pointer' : 'not-allowed'
                    }}
                  >
                    Create initiative
                  </button>
                  <button
                    onClick={() => {
                      setShowNewInitiative(false);
                      resetNewInitiativeForm();
                    }}
                    style={styles.skipButton}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div style={styles.initiativesSection}>
              <div style={styles.sectionHeaderRow}>
                <div>
                  <h3 style={styles.sectionTitle}>Initiatives</h3>
                  <p style={styles.sectionSubtitle}>{initiatives.length} total</p>
                </div>
                <div style={styles.lockControlGroup}>
                  <div style={styles.lockHint}>
                    <span style={styles.lockHintTitle}>Delete initiatives</span>
                    <span style={styles.lockHintSubtitle}>Unlock to enable deletion</span>
                  </div>
                  <button
                    onClick={() => setInitiativeDeletionEnabled(prev => !prev)}
                    style={{
                      ...styles.activityLockButton,
                      backgroundColor: initiativeDeletionEnabled ? 'var(--coral)' + '12' : '#FFFFFF',
                      borderColor: initiativeDeletionEnabled ? 'var(--coral)' : 'var(--cloud)',
                      color: initiativeDeletionEnabled ? 'var(--coral)' : 'var(--charcoal)'
                    }}
                    title={initiativeDeletionEnabled ? 'Lock to disable initiative deletion' : 'Unlock to delete initiatives'}
                  >
                    {initiativeDeletionEnabled ? <Unlock size={18} /> : <Lock size={18} />}
                  </button>
                </div>
              </div>

              {initiatives.length === 0 ? (
                <div style={styles.emptyState}>
                  No initiatives yet. Create one to group related projects.
                </div>
              ) : (
                <div style={styles.initiativesGrid}>
                  {initiatives.map((initiative) => (
                    <div key={initiative.id} style={styles.initiativeCard}>
                      <div style={styles.initiativeCardHeader}>
                        <div>
                          <h4 style={styles.initiativeTitle}>{initiative.name}</h4>
                          <p style={styles.initiativeDescription}>
                            {initiative.description || 'No description yet.'}
                          </p>
                        </div>
                        <div style={styles.initiativeBadgeRow}>
                          <span
                            style={{
                              ...styles.statusBadgeSmall,
                              backgroundColor: `${getInitiativeStatusColor(initiative.status)}20`,
                              color: getInitiativeStatusColor(initiative.status),
                            }}
                          >
                            {initiative.status}
                          </span>
                          <span
                            style={{
                              ...styles.statusBadgeSmall,
                              backgroundColor: `${getPriorityColor(initiative.priority)}20`,
                              color: getPriorityColor(initiative.priority),
                            }}
                          >
                            {initiative.priority} priority
                          </span>
                        </div>
                      </div>
                      <div style={styles.initiativeMetaRow}>
                        <span style={styles.initiativeMetaItem}>
                          {initiative.projects?.length || 0} projects
                        </span>
                        {initiative.targetDate && (
                          <span style={styles.initiativeMetaItem}>
                            Target {new Date(initiative.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                      {initiativeDeletionEnabled && (
                        <div style={styles.initiativeActions}>
                          <button
                            onClick={() => handleDeleteInitiative(initiative)}
                            style={styles.cardDeleteButton}
                            title={`Delete ${initiative.name}`}
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

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
                    <label style={styles.formLabel}>Project Description</label>
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
                    <PersonPicker
                      allPeople={getAllStakeholders()}
                      selectedPeople={newProjectStakeholders}
                      onChange={handleStakeholderSelection}
                      onAddNewPerson={(name) => {
                        setStakeholderSelectionTarget('newProject');
                        setEditingPerson({});
                      }}
                      placeholder="Type @ to tag people..."
                    />
                    <div style={styles.helperText}>Type @ to search and tag people. Click the X to remove.</div>
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
                  No projects found. Create a new project to get started.
                </div>
              ) : (
                <>
                  {/* Your Active Projects */}
                  <div style={styles.sectionHeaderRow}>
                    <div>
                      <h3 style={styles.sectionTitle}>Your Active Projects</h3>
                      <p style={styles.sectionSubtitle}>{userActiveProjects.length} in progress</p>
                    </div>
                  </div>

                  {userActiveProjects.length === 0 ? (
                    <div style={styles.emptyState}>
                      {loggedInUser ? `No active projects for ${loggedInUser}.` : 'No active projects for you.'}
                    </div>
                  ) : (
                    <div style={styles.projectsGrid}>
                      {userActiveProjects.map((project, index) => renderProjectCard(project, index))}
                    </div>
                  )}

                  {/* Other Active Projects */}
                  {otherActiveProjects.length > 0 && (
                    <div style={{ marginTop: '32px' }}>
                      <div style={styles.sectionHeaderRow}>
                        <div>
                          <h3 style={styles.sectionTitle}>Other Active Projects</h3>
                          <p style={styles.sectionSubtitle}>{otherActiveProjects.length} in progress</p>
                        </div>
                      </div>
                      <div style={styles.projectsGrid}>
                        {otherActiveProjects.map((project, index) => renderProjectCard(project, index + userActiveProjects.length))}
                      </div>
                    </div>
                  )}

                  {/* Your Completed Projects */}
                  {userCompletedProjects.length > 0 && (
                    <div style={{ marginTop: '32px' }}>
                      <div style={styles.sectionHeaderRow}>
                        <div>
                          <h3 style={styles.sectionTitle}>Your Completed & Closed</h3>
                          <p style={styles.sectionSubtitle}>{userCompletedProjects.length} wrapped up</p>
                        </div>
                      </div>
                      <div style={styles.projectsGrid}>
                        {userCompletedProjects.map((project, index) => renderProjectCard(project, index + userActiveProjects.length + otherActiveProjects.length))}
                      </div>
                    </div>
                  )}

                  {/* Other Completed Projects */}
                  {otherCompletedProjects.length > 0 && (
                    <div style={{ marginTop: '32px' }}>
                      <div style={styles.sectionHeaderRow}>
                        <div>
                          <h3 style={styles.sectionTitle}>Other Completed & Closed</h3>
                          <p style={styles.sectionSubtitle}>{otherCompletedProjects.length} wrapped up</p>
                        </div>
                      </div>
                      <div style={styles.projectsGrid}>
                        {otherCompletedProjects.map((project, index) => renderProjectCard(project, index + userActiveProjects.length + otherActiveProjects.length + userCompletedProjects.length))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </main>

      {/* Add New Person Callout */}
      <AddPersonCallout
        isOpen={editingPerson && !editingPerson.id}
        onClose={handleClosePersonModal}
        onSave={handleCreateNewPerson}
      />

      {/* Seasonal Effects */}
      {EffectComponent && (
        <Suspense fallback={null}>
          <EffectComponent />
        </Suspense>
      )}
    </div>
    </>
  );
}

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    height: '100vh',
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
    width: '238px',
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

  sidebarResizeHandle: {
    width: '10px',
    cursor: 'col-resize',
    position: 'relative',
    flexShrink: 0,
    alignSelf: 'stretch',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },

  sidebarResizeHandleActive: {
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },

  sidebarResizeGrip: {
    width: '4px',
    height: '48px',
    borderRadius: '2px',
    background: 'linear-gradient(180deg, #D6D1C4 0%, #C2B8A3 100%)',
    boxShadow: 'inset 0 0 0 1px rgba(0, 0, 0, 0.05)',
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

  dailyUpdateButton: {
    height: '44px',
    padding: '0 20px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: 'var(--sage)',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(122, 155, 118, 0.25)',
  },

  editingAsText: {
    fontSize: '11px',
    color: 'var(--stone)',
    marginTop: '4px',
    fontFamily: "'Inter', sans-serif",
  },

  editingAsName: {
    fontWeight: '600',
    color: 'var(--earth)',
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

  topBarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },

  topBarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },

  // Subtle search trigger
  searchIconTrigger: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 10px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    color: 'var(--stone)',
    fontSize: '12px',
    fontFamily: "'Inter', sans-serif",
    transition: 'all 0.2s ease',
    opacity: 0.6,
  },

  searchHintText: {
    fontSize: '11px',
    color: 'var(--stone)',
    fontWeight: 500,
    opacity: 0.8,
  },

  // Active filter badge
  activeFilterBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 10px 6px 12px',
    backgroundColor: 'var(--sage)15',
    border: '1px solid var(--sage)40',
    borderRadius: '20px',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
  },

  activeFilterText: {
    color: 'var(--charcoal)',
    fontWeight: 500,
  },

  clearFilterButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2px',
    border: 'none',
    borderRadius: '50%',
    backgroundColor: 'var(--stone)20',
    color: 'var(--stone)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },

  globalSearchOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: '120px',
    zIndex: 9999,
  },

  globalSearchModal: {
    width: '100%',
    maxWidth: '560px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    boxShadow: '0 16px 48px rgba(0, 0, 0, 0.2)',
    overflow: 'hidden',
  },

  globalSearchInputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 20px',
    borderBottom: '1px solid var(--cloud)',
  },

  globalSearchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '16px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--charcoal)',
    backgroundColor: 'transparent',
  },

  globalSearchEscHint: {
    fontSize: '11px',
    color: 'var(--stone)',
    opacity: 0.7,
  },

  globalSearchResults: {
    maxHeight: '320px',
    overflowY: 'auto',
    padding: '8px',
  },

  globalSearchResultItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },

  globalSearchResultType: {
    fontSize: '11px',
    fontWeight: 600,
    padding: '3px 8px',
    borderRadius: '4px',
    textTransform: 'capitalize',
    fontFamily: "'Inter', sans-serif",
  },

  globalSearchResultDisplay: {
    fontSize: '14px',
    color: 'var(--charcoal)',
    fontFamily: "'Inter', sans-serif",
  },

  globalSearchNoResults: {
    padding: '24px',
    textAlign: 'center',
    color: 'var(--stone)',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
  },

  globalSearchFilterHint: {
    padding: '12px 16px',
    backgroundColor: 'var(--cream)',
    borderTop: '1px solid var(--cloud)',
    fontSize: '12px',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
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
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },

  mainMomentum: {
    overflowY: 'hidden',
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

  momentumViewWrapper: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
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

  multiSelect: {
    flex: 1,
    minHeight: '120px',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid var(--cloud)',
    backgroundColor: '#FFFFFF',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--charcoal)',
    boxShadow: '0 6px 18px rgba(0,0,0,0.03)',
  },

  stakeholderPicker: {
    display: 'flex',
    gap: '10px',
    alignItems: 'stretch',
  },

  helperText: {
    fontSize: '12px',
    color: 'var(--stone)',
    marginTop: '6px',
    fontFamily: "'Inter', sans-serif",
  },

  addStakeholderButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 12px',
    backgroundColor: 'var(--earth)',
    color: '#fff',
    border: '1px solid var(--earth)',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: '700',
    fontFamily: "'Inter', sans-serif",
    boxShadow: '0 6px 18px rgba(139, 111, 71, 0.25)',
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

  initiativesSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '24px',
  },

  initiativesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
  },

  sectionHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },

  initiativeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '18px',
    border: '1px solid var(--cloud)',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },

  initiativeCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'flex-start',
  },

  initiativeTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--charcoal)',
    margin: 0,
  },

  initiativeDescription: {
    margin: '6px 0 0',
    fontSize: '13px',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
    lineHeight: '1.5',
  },

  initiativeBadgeRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    alignItems: 'flex-end',
  },

  initiativeMetaRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    fontSize: '12px',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
  },

  initiativeMetaItem: {
    padding: '4px 8px',
    borderRadius: '999px',
    backgroundColor: 'var(--cream)',
    border: '1px solid var(--cloud)',
  },

  initiativeActions: {
    display: 'flex',
    justifyContent: 'flex-end',
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

  descriptionSection: {
    marginTop: '12px',
  },

  descriptionLabel: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--stone)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '6px',
    fontFamily: "'Inter', sans-serif",
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
    position: 'relative',
    gap: '2px',
  },

  commentCountBadge: {
    position: 'absolute',
    top: '-2px',
    right: '-2px',
    backgroundColor: 'var(--earth)',
    color: 'white',
    fontSize: '9px',
    fontWeight: '700',
    borderRadius: '50%',
    width: '14px',
    height: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  commentTooltip: {
    position: 'absolute',
    top: '100%',
    right: 0,
    zIndex: 1001,
    backgroundColor: 'white',
    border: '1px solid var(--cloud)',
    borderRadius: '8px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
    minWidth: '280px',
    maxWidth: '350px',
    maxHeight: '300px',
    overflowY: 'auto',
    marginTop: '4px',
  },

  commentTooltipHeader: {
    padding: '10px 12px',
    borderBottom: '1px solid var(--cloud)',
    fontWeight: '600',
    fontSize: '12px',
    color: 'var(--charcoal)',
    backgroundColor: 'var(--cream)',
    borderRadius: '8px 8px 0 0',
  },

  commentTooltipItem: {
    padding: '10px 12px',
    borderBottom: '1px solid var(--cloud)',
  },

  commentTooltipAuthor: {
    fontWeight: '600',
    fontSize: '12px',
    color: 'var(--earth)',
    marginBottom: '4px',
  },

  commentTooltipNote: {
    fontSize: '13px',
    color: 'var(--charcoal)',
    lineHeight: '1.4',
    marginBottom: '4px',
  },

  commentTooltipDate: {
    fontSize: '11px',
    color: 'var(--stone)',
  },

  commentTooltipMore: {
    padding: '8px 12px',
    textAlign: 'center',
    fontSize: '11px',
    color: 'var(--stone)',
    fontStyle: 'italic',
  },

  assigneeButton: {
    padding: '4px 6px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },

  assigneeBadge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: 'var(--sage)',
    color: 'white',
    fontSize: '9px',
    fontWeight: '600',
  },

  assigneeDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    zIndex: 1000,
    backgroundColor: 'white',
    border: '1px solid var(--cloud)',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    minWidth: '200px',
    overflow: 'hidden',
  },

  assigneeSearchInput: {
    width: '100%',
    padding: '8px 12px',
    border: 'none',
    borderBottom: '1px solid var(--cloud)',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
  },

  assigneeList: {
    maxHeight: '200px',
    overflowY: 'auto',
  },

  assigneeOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'background-color 0.15s ease',
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

  // Minimal add button (icon only)
  minimalAddButton: {
    width: '32px',
    height: '32px',
    padding: '0',
    border: '1px dashed var(--cloud)',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    color: 'var(--stone)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    marginTop: '8px',
    opacity: 0.6,
  },

  minimalAddButtonSmall: {
    width: '26px',
    height: '26px',
    padding: '0',
    border: '1px dashed var(--cloud)',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: 'var(--stone)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    marginTop: '4px',
    opacity: 0.5,
  },

  // Inline add task form
  inlineAddTask: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '8px',
    padding: '8px',
    backgroundColor: 'var(--cream)',
    borderRadius: '6px',
  },

  inlineAddSubtask: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '4px',
    padding: '6px',
    backgroundColor: '#FFFFFF',
    borderRadius: '4px',
    border: '1px solid var(--cloud)',
  },

  inlineAddInput: {
    flex: 1,
    padding: '8px 10px',
    border: '1px solid var(--cloud)',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--charcoal)',
    backgroundColor: '#FFFFFF',
    minWidth: '120px',
  },

  inlineAddInputSmall: {
    flex: 1,
    padding: '6px 8px',
    border: '1px solid var(--cloud)',
    borderRadius: '4px',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--charcoal)',
    backgroundColor: 'var(--cream)',
    minWidth: '100px',
  },

  inlineAddDateInput: {
    padding: '8px 10px',
    border: '1px solid var(--cloud)',
    borderRadius: '4px',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--charcoal)',
    backgroundColor: '#FFFFFF',
    width: '130px',
  },

  inlineAddDateInputSmall: {
    padding: '6px 8px',
    border: '1px solid var(--cloud)',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--charcoal)',
    backgroundColor: 'var(--cream)',
    width: '115px',
  },

  inlineAddConfirm: {
    width: '32px',
    height: '32px',
    padding: '0',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: 'var(--sage)',
    color: '#FFFFFF',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },

  inlineAddConfirmSmall: {
    width: '26px',
    height: '26px',
    padding: '0',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: 'var(--sage)',
    color: '#FFFFFF',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },

  inlineAddCancel: {
    width: '32px',
    height: '32px',
    padding: '0',
    border: '1px solid var(--cloud)',
    borderRadius: '4px',
    backgroundColor: '#FFFFFF',
    color: 'var(--stone)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },

  inlineAddCancelSmall: {
    width: '26px',
    height: '26px',
    padding: '0',
    border: '1px solid var(--cloud)',
    borderRadius: '4px',
    backgroundColor: '#FFFFFF',
    color: 'var(--stone)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
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
    bottom: '100%',
    marginBottom: '8px',
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
    display: 'inline-flex',
    padding: '1px 6px',
    borderRadius: '3px',
    backgroundColor: 'var(--amber)' + '20',
    color: 'var(--earth)',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    whiteSpace: 'nowrap',
    width: 'fit-content',
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
  },

  thrustPendingActionsCard: {
    border: '1px solid var(--earth)',
    borderRadius: '10px',
    padding: '12px 14px',
    backgroundColor: 'var(--cream)',
    animation: 'fadeIn 0.3s ease',
  },

  thrustPendingActionsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: '600',
    fontSize: '13px',
    color: 'var(--earth)',
    marginBottom: '8px',
  },

  thrustPendingActionsList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },

  thrustPendingActionsItem: {
    color: 'var(--charcoal)',
    paddingLeft: '22px',
    position: 'relative',
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

  thrustActionsCollapsed: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    backgroundColor: 'var(--cream)',
    border: '1px solid var(--cloud)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  thrustActionsCollapsedText: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--earth)',
  },

  thrustActionsExpandedList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '8px',
    paddingLeft: '8px',
    borderLeft: '3px solid var(--earth)',
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

  momentumProjectCardHighlighted: {
    border: '2px solid var(--sage)',
    boxShadow: '0 4px 20px rgba(122, 155, 118, 0.25)',
    animation: 'momentumPulse 2s ease-in-out infinite',
    backgroundColor: 'rgba(122, 155, 118, 0.05)',
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
    right: '12px',
    top: '12px',
    display: 'flex',
    flexDirection: 'row',
    gap: '8px',
    zIndex: 10,
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

  peopleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '24px',
    padding: '24px',
  },

  personCard: {
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--cloud)',
    borderRadius: '12px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },

  personInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },

  personName: {
    fontSize: '20px',
    fontWeight: '600',
    color: 'var(--charcoal)',
    margin: 0,
  },

  personTeam: {
    fontSize: '14px',
    color: 'var(--stone)',
    margin: 0,
  },

  personEmail: {
    fontSize: '14px',
    color: 'var(--sage)',
    margin: 0,
  },

  personActions: {
    display: 'flex',
    gap: '8px',
    marginTop: 'auto',
  },

  personEditForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },

  editButtonPerson: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '500',
    color: 'var(--earth)',
    backgroundColor: 'transparent',
    border: '1px solid var(--cloud)',
    borderRadius: '8px',
    cursor: 'pointer',
  },

  deleteButtonPerson: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '500',
    color: 'var(--coral)',
    backgroundColor: 'transparent',
    border: '1px solid var(--cloud)',
    borderRadius: '8px',
    cursor: 'pointer',
  },

  saveButtonPerson: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '500',
    color: '#FFFFFF',
    backgroundColor: 'var(--sage)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },

  cancelButtonPerson: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '500',
    color: 'var(--stone)',
    backgroundColor: 'transparent',
    border: '1px solid var(--cloud)',
    borderRadius: '8px',
    cursor: 'pointer',
  },

  // ==========================================
  // Modern Momentum Chat Styles
  // ==========================================

  momentumContainer: {
    display: 'flex',
    height: 'calc(100vh - 100px)',
    gap: '0',
    overflow: 'hidden',
  },

  momentumChatArea: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#FAFAF8',
    borderRadius: '20px 0 0 20px',
    overflow: 'hidden',
    transition: 'flex 0.3s ease',
  },

  momentumChatHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid var(--cloud)',
    flexShrink: 0,
  },

  momentumHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },

  momentumAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, var(--earth) 0%, var(--sage) 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(139, 111, 71, 0.2)',
  },

  momentumHeaderTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--charcoal)',
    letterSpacing: '-0.3px',
  },

  momentumHeaderSubtitle: {
    fontSize: '12px',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
  },

  portfolioToggleButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 14px',
    backgroundColor: 'var(--cream)',
    border: '1px solid var(--cloud)',
    borderRadius: '10px',
    color: 'var(--earth)',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  momentumMessagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
  },

  momentumEmptyChat: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '40px',
    gap: '16px',
  },

  momentumEmptyIcon: {
    width: '80px',
    height: '80px',
    borderRadius: '24px',
    backgroundColor: 'var(--cloud)' + '30',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '8px',
  },

  momentumEmptyTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: 'var(--charcoal)',
    letterSpacing: '-0.3px',
  },

  momentumSuggestions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    justifyContent: 'center',
    marginTop: '12px',
  },

  momentumSuggestionChip: {
    padding: '8px 16px',
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--cloud)',
    borderRadius: '20px',
    color: 'var(--charcoal)',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  momentumMessagesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    paddingBottom: '20px',
  },

  momentumMessageRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    animation: 'fadeInUp 0.4s ease backwards',
  },

  momentumMessageAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '10px',
    backgroundColor: 'var(--cream)',
    border: '1px solid var(--cloud)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  momentumMessageAvatarUser: {
    width: '32px',
    height: '32px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #5B8DEF 0%, #3B6FD9 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(91, 141, 239, 0.3)',
  },

  momentumMessageContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxWidth: '70%',
  },

  momentumBubble: {
    padding: '14px 18px',
    borderRadius: '18px',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    lineHeight: '1.6',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },

  momentumBubbleUser: {
    background: 'linear-gradient(135deg, #5B8DEF 0%, #3B6FD9 100%)',
    color: '#FFFFFF',
    borderBottomRightRadius: '6px',
  },

  momentumBubbleAssistant: {
    backgroundColor: '#FFFFFF',
    color: 'var(--charcoal)',
    border: '1px solid var(--cloud)',
    borderBottomLeftRadius: '6px',
  },

  momentumBubbleText: {
    margin: 0,
    wordBreak: 'break-word',
  },

  momentumBubbleTime: {
    fontSize: '11px',
    marginTop: '6px',
    opacity: 0.7,
    fontFamily: "'Inter', sans-serif",
  },

  momentumInlineProjects: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '4px',
  },

  momentumInlineProjectCard: {
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--cloud)',
    borderRadius: '12px',
    padding: '12px 14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },

  momentumInlineProjectCardActive: {
    borderColor: 'var(--sage)',
    boxShadow: '0 4px 16px rgba(122, 155, 118, 0.2)',
  },

  momentumInlineProjectCardHover: {
    transform: 'translateX(4px)',
    borderColor: 'var(--earth)',
  },

  momentumInlineProjectHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  momentumInlineProjectIcon: {
    width: '22px',
    height: '22px',
    borderRadius: '6px',
    backgroundColor: 'var(--earth)' + '15',
    color: 'var(--earth)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  momentumInlineProjectName: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--charcoal)',
    flex: 1,
  },

  momentumInlineProjectBadge: {
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '10px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },

  momentumInlineProjectMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '6px',
    paddingLeft: '30px',
  },

  momentumInlineProjectStatus: {
    fontSize: '11px',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
    textTransform: 'capitalize',
  },

  momentumInlineProjectProgress: {
    fontSize: '11px',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
  },

  momentumInlineProjectConnector: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px dashed var(--cloud)',
    color: 'var(--earth)',
    fontSize: '11px',
    fontWeight: '600',
  },

  momentumActionPills: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '4px',
  },

  momentumActionPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 10px',
    backgroundColor: 'var(--sage)' + '15',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--charcoal)',
    fontFamily: "'Inter', sans-serif",
    transition: 'opacity 0.2s ease',
  },

  momentumActionPillUndo: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '18px',
    height: '18px',
    padding: 0,
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    color: 'var(--stone)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginLeft: '2px',
  },

  momentumMoreActions: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 10px',
    backgroundColor: 'transparent',
    border: '1px dashed var(--cloud)',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
    cursor: 'pointer',
  },

  momentumExpandedActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginTop: '4px',
    padding: '10px',
    backgroundColor: 'var(--cream)',
    borderRadius: '10px',
  },

  momentumExpandedAction: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },

  momentumExpandedActionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  momentumExpandedActionLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--charcoal)',
    flex: 1,
  },

  momentumExpandedActionDetail: {
    fontSize: '11px',
    color: 'var(--stone)',
    paddingLeft: '22px',
  },

  momentumTypingIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '12px 16px',
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--cloud)',
    borderRadius: '18px',
    borderBottomLeftRadius: '6px',
  },

  momentumTypingDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'var(--stone)',
    animation: 'typingBounce 1.4s ease-in-out infinite',
  },

  momentumPendingCard: {
    backgroundColor: 'var(--amber)' + '10',
    border: '1px solid var(--amber)' + '30',
    borderRadius: '12px',
    padding: '12px 16px',
    maxWidth: '70%',
  },

  momentumPendingHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--charcoal)',
    marginBottom: '8px',
  },

  momentumPendingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },

  momentumPendingItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
  },

  momentumErrorCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    backgroundColor: 'var(--coral)' + '10',
    border: '1px solid var(--coral)' + '30',
    borderRadius: '12px',
    color: 'var(--coral)',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
  },

  momentumInputArea: {
    padding: '16px 24px 20px',
    backgroundColor: '#FFFFFF',
    borderTop: '1px solid var(--cloud)',
    flexShrink: 0,
  },

  momentumInputWrapper: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '12px',
    position: 'relative',
  },

  momentumInput: {
    flex: 1,
    padding: '14px 18px',
    backgroundColor: 'var(--cream)',
    border: '1px solid var(--cloud)',
    borderRadius: '14px',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--charcoal)',
    resize: 'none',
    minHeight: '48px',
    maxHeight: '120px',
    outline: 'none',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  },

  momentumTagSuggestions: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: '60px',
    marginBottom: '8px',
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--cloud)',
    borderRadius: '12px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    padding: '6px',
    zIndex: 100,
    maxHeight: '200px',
    overflowY: 'auto',
  },

  momentumTagItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },

  momentumTagType: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    borderRadius: '6px',
  },

  momentumTagName: {
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--charcoal)',
  },

  momentumSendButton: {
    width: '48px',
    height: '48px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, var(--earth) 0%, var(--sage) 100%)',
    border: 'none',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(139, 111, 71, 0.3)',
    transition: 'all 0.2s ease',
  },

  momentumInputHint: {
    fontSize: '11px',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
    marginTop: '8px',
    textAlign: 'center',
  },

  momentumPortfolioPanel: {
    width: '340px',
    backgroundColor: '#FFFFFF',
    borderLeft: '1px solid var(--cloud)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.3s ease, opacity 0.3s ease',
    overflow: 'hidden',
  },

  momentumPortfolioPanelMinimized: {
    width: '0',
    opacity: 0,
    borderLeft: 'none',
  },

  momentumPortfolioHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 18px',
    borderBottom: '1px solid var(--cloud)',
    flexShrink: 0,
  },

  momentumPortfolioTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--charcoal)',
  },

  momentumPortfolioClose: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    backgroundColor: 'var(--cream)',
    border: 'none',
    color: 'var(--stone)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  momentumPortfolioContent: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },

  momentumPortfolioCard: {
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--cloud)',
    borderRadius: '12px',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
  },

  momentumPortfolioCardActive: {
    borderColor: 'var(--sage)',
    boxShadow: '0 4px 16px rgba(122, 155, 118, 0.15)',
  },

  momentumPortfolioCardHighlight: {
    borderColor: 'var(--earth)',
    animation: 'portfolioPulse 2s ease-in-out infinite',
  },

  momentumPortfolioCardHeader: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px 8px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
  },

  momentumPortfolioCardTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--charcoal)',
  },

  momentumPortfolioCardDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },

  momentumPortfolioCardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  momentumPortfolioCardStatus: {
    fontSize: '11px',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
    textTransform: 'capitalize',
  },

  momentumPortfolioProgress: {
    height: '3px',
    backgroundColor: 'var(--cloud)',
    margin: '0 14px 10px',
    borderRadius: '2px',
    overflow: 'hidden',
  },

  momentumPortfolioProgressFill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.5s ease',
  },

  momentumPortfolioCardBody: {
    padding: '0 14px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },

  momentumPortfolioSection: {
    padding: '10px',
    backgroundColor: 'var(--cream)',
    borderRadius: '8px',
  },

  momentumPortfolioSectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '10px',
    fontWeight: '700',
    color: 'var(--stone)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '8px',
  },

  momentumPortfolioActivity: {
    marginBottom: '8px',
  },

  momentumPortfolioActivityHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '2px',
  },

  momentumPortfolioActivityAuthor: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--charcoal)',
  },

  momentumPortfolioActivityTime: {
    fontSize: '10px',
    color: 'var(--stone)',
  },

  momentumPortfolioActivityText: {
    fontSize: '12px',
    color: 'var(--stone)',
    lineHeight: '1.4',
  },

  momentumPortfolioDueTask: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 0',
    fontSize: '12px',
    color: 'var(--charcoal)',
    borderBottom: '1px dashed var(--cloud)',
  },

  momentumPortfolioEmpty: {
    fontSize: '13px',
    color: 'var(--stone)',
    textAlign: 'center',
    padding: '20px',
  },
};
