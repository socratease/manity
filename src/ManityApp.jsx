import React, { useState, useEffect, useRef } from 'react';
import { Plus, Users, Clock, TrendingUp, CheckCircle2, Circle, ChevronRight, MessageCircle, Sparkles, ArrowLeft, Calendar, AlertCircle, Edit2, Send, ChevronDown, Check, X, MessageSquare, Settings } from 'lucide-react';

export default function ManityApp({ onOpenSettings = () => {} }) {
  const timelineInputRef = useRef(null);
  const projectUpdateInputRef = useRef(null);
  
  const [projects, setProjects] = useState([
    {
      id: 1,
      name: 'Website Redesign',
      stakeholders: [
        { name: 'Sarah Chen', team: 'Design' },
        { name: 'Marcus Rodriguez', team: 'Development' },
        { name: 'Emma Williams', team: 'Product' }
      ],
      status: 'active',
      priority: 'high',
      progress: 65,
      lastUpdate: 'Completed homepage mockups and user testing',
      description: 'Complete overhaul of company website with focus on improved user experience and modern design standards.',
      startDate: '2025-10-15',
      targetDate: '2025-12-20',
      plan: [
        {
          id: 't1',
          title: 'Discovery & Research',
          status: 'completed',
          dueDate: '2025-11-01',
          completedDate: '2025-11-01',
          subtasks: [
            { id: 't1-1', title: 'Competitive analysis', status: 'completed', dueDate: '2025-10-22', completedDate: '2025-10-22' },
            { id: 't1-2', title: 'User interviews', status: 'completed', dueDate: '2025-10-28', completedDate: '2025-10-28' },
            { id: 't1-3', title: 'Analytics review', status: 'completed', dueDate: '2025-11-01', completedDate: '2025-11-01' }
          ]
        },
        {
          id: 't2',
          title: 'Design Phase',
          status: 'in-progress',
          dueDate: '2025-12-05',
          subtasks: [
            { id: 't2-1', title: 'Wireframes for all pages', status: 'completed', dueDate: '2025-11-20', completedDate: '2025-11-20' },
            { id: 't2-2', title: 'Homepage mockups', status: 'completed', dueDate: '2025-11-28', completedDate: '2025-11-28' },
            { id: 't2-3', title: 'Product page designs', status: 'in-progress', dueDate: '2025-12-03' },
            { id: 't2-4', title: 'Mobile responsive layouts', status: 'todo', dueDate: '2025-12-05' }
          ]
        },
        {
          id: 't3',
          title: 'Development',
          status: 'todo',
          dueDate: '2025-12-20',
          subtasks: [
            { id: 't3-1', title: 'Set up development environment', status: 'todo', dueDate: '2025-12-08' },
            { id: 't3-2', title: 'Build component library', status: 'todo', dueDate: '2025-12-12' },
            { id: 't3-3', title: 'Implement homepage', status: 'todo', dueDate: '2025-12-17' },
            { id: 't3-4', title: 'QA and testing', status: 'todo', dueDate: '2025-12-20' }
          ]
        }
      ],
      recentActivity: [
        { date: '2025-11-29T14:30:00', note: 'Received positive feedback from CEO on homepage design direction', author: 'You' },
        { date: '2025-11-28T16:15:00', note: 'Completed homepage mockups and shared with stakeholder group', author: 'You' },
        { date: '2025-11-28T09:00:00', note: 'Sarah suggested we explore darker color palette for contrast', author: 'Sarah Chen' },
        { date: '2025-11-25T11:30:00', note: 'User testing session with 12 participants - 85% positive feedback on navigation', author: 'You' },
        { date: '2025-11-22T15:45:00', note: 'Marcus raised concerns about mobile responsiveness in current mockups', author: 'Marcus Rodriguez' },
        { date: '2025-11-20T10:00:00', note: 'Completed first round of wireframes for all main pages', author: 'You' }
      ]
    },
    {
      id: 2,
      name: 'Q4 Marketing Campaign',
      stakeholders: [
        { name: 'Jennifer Liu', team: 'Marketing' },
        { name: 'Alex Thompson', team: 'Creative' }
      ],
      status: 'active',
      priority: 'medium',
      progress: 40,
      lastUpdate: 'Draft content calendar completed, awaiting approval',
      description: 'Multi-channel marketing campaign to drive Q4 sales and brand awareness across social media, email, and paid advertising.',
      startDate: '2025-11-01',
      targetDate: '2025-12-31',
      plan: [
        {
          id: 't1',
          title: 'Campaign Strategy',
          status: 'completed',
          dueDate: '2025-11-15',
          completedDate: '2025-11-15',
          subtasks: [
            { id: 't1-1', title: 'Define target audience', status: 'completed', dueDate: '2025-11-05', completedDate: '2025-11-05' },
            { id: 't1-2', title: 'Set campaign goals', status: 'completed', dueDate: '2025-11-10', completedDate: '2025-11-10' },
            { id: 't1-3', title: 'Budget planning', status: 'completed', dueDate: '2025-11-15', completedDate: '2025-11-14' }
          ]
        },
        {
          id: 't2',
          title: 'Content Creation',
          status: 'in-progress',
          dueDate: '2025-12-10',
          subtasks: [
            { id: 't2-1', title: 'Social media content calendar', status: 'completed', dueDate: '2025-11-29', completedDate: '2025-11-29' },
            { id: 't2-2', title: 'Email templates', status: 'in-progress', dueDate: '2025-12-05' },
            { id: 't2-3', title: 'Ad creative development', status: 'todo', dueDate: '2025-12-10' }
          ]
        },
        {
          id: 't3',
          title: 'Launch & Optimization',
          status: 'todo',
          dueDate: '2025-12-31',
          subtasks: [
            { id: 't3-1', title: 'Campaign launch', status: 'todo', dueDate: '2025-12-15' },
            { id: 't3-2', title: 'Monitor performance', status: 'todo', dueDate: '2025-12-25' },
            { id: 't3-3', title: 'A/B testing', status: 'todo', dueDate: '2025-12-31' }
          ]
        }
      ],
      recentActivity: [
        { date: '2025-11-29T13:00:00', note: 'Submitted content calendar for review by Jennifer and Alex', author: 'You' },
        { date: '2025-11-27T16:30:00', note: 'Met with marketing team to discuss strategy and timeline alignment', author: 'You' },
        { date: '2025-11-26T10:15:00', note: 'Jennifer approved the social media creative concepts', author: 'Jennifer Liu' },
        { date: '2025-11-24T14:00:00', note: 'Received initial budget estimates from finance team', author: 'You' }
      ]
    },
    {
      id: 3,
      name: 'Customer Portal v2',
      stakeholders: [
        { name: 'David Park', team: 'Engineering' },
        { name: 'Lisa Anderson', team: 'Product' },
        { name: 'Tom Harris', team: 'Customer Success' }
      ],
      status: 'planning',
      priority: 'high',
      progress: 15,
      lastUpdate: 'Requirements gathering phase, initial wireframes drafted',
      description: 'Build next generation customer portal with enhanced self-service features, real-time support chat, and personalized dashboard.',
      startDate: '2025-11-15',
      targetDate: '2026-02-28',
      plan: [
        {
          id: 't1',
          title: 'Requirements & Planning',
          status: 'in-progress',
          dueDate: '2025-12-15',
          subtasks: [
            { id: 't1-1', title: 'Stakeholder interviews', status: 'in-progress', dueDate: '2025-12-05' },
            { id: 't1-2', title: 'Technical requirements doc', status: 'todo', dueDate: '2025-12-10' },
            { id: 't1-3', title: 'Architecture design', status: 'todo', dueDate: '2025-12-15' }
          ]
        },
        {
          id: 't2',
          title: 'Design & Prototyping',
          status: 'todo',
          dueDate: '2026-01-15',
          subtasks: [
            { id: 't2-1', title: 'User flows', status: 'todo', dueDate: '2025-12-20' },
            { id: 't2-2', title: 'UI designs', status: 'todo', dueDate: '2026-01-10' },
            { id: 't2-3', title: 'Interactive prototype', status: 'todo', dueDate: '2026-01-15' }
          ]
        }
      ],
      recentActivity: [
        { date: '2025-11-29T11:00:00', note: 'Interviewed 5 key customers about pain points with current portal', author: 'You' },
        { date: '2025-11-27T15:00:00', note: 'Product Lead suggested prioritizing mobile experience in v2', author: 'Product Lead' },
        { date: '2025-11-26T09:30:00', note: 'Initial wireframes shared with Customer Success team for feedback', author: 'You' }
      ]
    }
  ]);

  const [showDailyCheckin, setShowDailyCheckin] = useState(true);
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

  const handleDailyCheckin = (projectId) => {
    if (checkinNote.trim()) {
      setProjects(projects.map(p => 
        p.id === projectId 
          ? {
              ...p,
              recentActivity: [
                { date: new Date().toISOString(), note: checkinNote, author: 'You' },
                ...p.recentActivity
              ]
            }
          : p
      ));
      setCheckinNote('');
      
      // Move to next project or close if done
      const currentIndex = projects.findIndex(p => p.id === projectId);
      if (currentIndex < projects.length - 1) {
        setSelectedProject(projects[currentIndex + 1]);
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
                { date: new Date().toISOString(), note: newUpdate, author: 'You' },
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
              { date: new Date().toISOString(), note: 'Updated project details', author: 'You' },
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
                  date: new Date().toISOString(), 
                  note: subtaskComment, // Just the comment text, not the prefix
                  author: 'You', 
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

  const formatDueDate = (dateString, status, completedDate) => {
    // If completed, show completion date with green checkmark
    if (status === 'completed' && completedDate) {
      const date = new Date(completedDate);
      return { 
        text: `Done ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, 
        color: 'var(--sage)', 
        isOverdue: false,
        isCompleted: true
      };
    }
    
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(date);
    dueDate.setHours(0, 0, 0, 0);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `${Math.abs(diffDays)}d overdue`, color: 'var(--coral)', isOverdue: true, isCompleted: false };
    } else if (diffDays === 0) {
      return { text: 'Due today', color: 'var(--amber)', isOverdue: false, isCompleted: false };
    } else if (diffDays === 1) {
      return { text: 'Due tomorrow', color: 'var(--amber)', isOverdue: false, isCompleted: false };
    } else if (diffDays <= 7) {
      return { text: `Due in ${diffDays}d`, color: 'var(--stone)', isOverdue: false, isCompleted: false };
    } else {
      return { text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), color: 'var(--stone)', isOverdue: false, isCompleted: false };
    }
  };

  // Get all possible tags for autocomplete
  const getAllTags = () => {
    const tags = [];
    
    // Add all unique stakeholders
    const allStakeholders = new Set();
    projects.forEach(p => {
      p.stakeholders.forEach(s => {
        const stakeholderString = `${s.name} (${s.team})`;
        allStakeholders.add(stakeholderString);
      });
    });
    allStakeholders.forEach(name => {
      tags.push({ type: 'person', value: name, display: name });
    });
    
    // Add all projects
    projects.forEach(p => {
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

  const handleAddTimelineUpdate = () => {
    if (timelineUpdate.trim()) {
      // Determine which project to add to (for now, add to first project)
      // In a real app, you might want to let user select or detect from tags
      const targetProjectId = projects[0]?.id;
      
      if (targetProjectId) {
        setProjects(projects.map(p =>
          p.id === targetProjectId
            ? {
                ...p,
                recentActivity: [
                  { date: new Date().toISOString(), note: timelineUpdate, author: 'You' },
                  ...p.recentActivity
                ]
              }
            : p
        ));
      }
      
      setTimelineUpdate('');
    }
  };

  const getAllActivities = () => {
    const allActivities = [];
    
    projects.forEach(project => {
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
    if (showDailyCheckin && projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0]);
    }
  }, [showDailyCheckin]);

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

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'var(--coral)',
      medium: 'var(--amber)',
      low: 'var(--sage)'
    };
    return colors[priority] || 'var(--stone)';
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
                      if (dueDateInfo.isOverdue || dueDateInfo.text.includes('today') || dueDateInfo.text.includes('tomorrow') || dueDateInfo.text.includes('Due in')) {
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
                    handleDailyCheckin(selectedProject.id);
                  }
                }}
                placeholder="Share any updates, blockers, or progress made..."
                style={styles.textarea}
                autoFocus
              />

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
                    const currentIndex = projects.findIndex(p => p.id === selectedProject.id);
                    if (currentIndex < projects.length - 1) {
                      setSelectedProject(projects[currentIndex + 1]);
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
                {projects.map((p, idx) => (
                  <div
                    key={p.id}
                    style={{
                      ...styles.progressDot,
                      backgroundColor: p.id === selectedProject.id ? 'var(--amber)' : 'var(--cloud)',
                      opacity: idx <= projects.indexOf(selectedProject) ? 1 : 0.3
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Interface */}
      <div style={styles.sidebar}>
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
          <button
            onClick={() => setShowDailyCheckin(true)}
            style={styles.navItem}
          >
            Daily Check-in
          </button>
        </nav>

        <div style={styles.sidebarFooter}>
          <button
            onClick={() => setShowNewProject(true)}
            style={styles.newProjectButton}
          >
            <Plus size={18} />
            New Project
          </button>
          <button
            onClick={onOpenSettings}
            style={{ ...styles.navItem, ...styles.settingsButton }}
          >
            <Settings size={18} />
            API Settings
          </button>
        </div>
      </div>

      <main style={styles.main}>
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
                  <textarea
                    value={editValues.description}
                    onChange={(e) => setEditValues({...editValues, description: e.target.value})}
                    style={{...styles.detailsDescription, ...styles.editTextarea, minHeight: '80px'}}
                  />
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
                        if (dueDateInfo.isOverdue || dueDateInfo.text.includes('today') || dueDateInfo.text.includes('tomorrow') || dueDateInfo.text.includes('Due in')) {
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
                          <span style={{
                            ...styles.nextActionTextSmall,
                            color: task.dueDateInfo.isOverdue ? 'var(--coral)' : 'var(--charcoal)'
                          }}>
                            {task.title}
                          </span>
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
                  <textarea
                    value={editValues.stakeholders}
                    onChange={(e) => setEditValues({...editValues, stakeholders: e.target.value})}
                    style={{...styles.editTextarea, minHeight: '60px', fontSize: '13px'}}
                    placeholder="Name, Team (one per line)"
                  />
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
                <div style={styles.sectionHeader}>
                  <h3 style={styles.sectionTitle}>Project Plan</h3>
                  <span style={styles.sectionSubtitle}>
                    {viewingProject.plan.reduce((acc, task) => acc + task.subtasks.length, 0)} total tasks
                  </span>
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
                              <span style={styles.taskTitle}>{task.title}</span>
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
                                    </div>
                                    
                                    {isCommenting && (
                                      <div style={styles.commentBox}>
                                        <textarea
                                          value={subtaskComment}
                                          onChange={(e) => setSubtaskComment(e.target.value)}
                                          placeholder="Add a comment..."
                                          style={styles.commentInput}
                                          autoFocus
                                        />
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
                                    placeholder="New subtask title..."
                                    style={styles.addSubtaskInput}
                                    autoFocus
                                  />
                                  <input
                                    type="date"
                                    value={newSubtaskDueDate}
                                    onChange={(e) => setNewSubtaskDueDate(e.target.value)}
                                    style={styles.addSubtaskInput}
                                    placeholder="Due date"
                                  />
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
                          placeholder="New task title..."
                          style={styles.addTaskInput}
                          autoFocus
                        />
                        <input
                          type="date"
                          value={newTaskDueDate}
                          onChange={(e) => setNewTaskDueDate(e.target.value)}
                          style={styles.addTaskInput}
                          placeholder="Due date"
                        />
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
                </div>

                {/* Add Update Section */}
                <div style={styles.projectUpdateWrapper}>
                  <div style={styles.timelineInputWrapper}>
                    <textarea
                      ref={projectUpdateInputRef}
                      value={newUpdate}
                      onChange={handleProjectUpdateChange}
                      placeholder="Add an update... Use @ to tag"
                      style={styles.projectUpdateInput}
                    />
                    
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
                    <div key={idx}>
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
                  Activity across all {projects.length} projects
                </p>
              </div>
            </header>

            <div style={styles.timelineContainer}>
              {/* Add Update Section with Tagging */}
              <div style={styles.timelineUpdateSection}>
                <div style={styles.timelineInputWrapper}>
                  <textarea
                    ref={timelineInputRef}
                    value={timelineUpdate}
                    onChange={handleTimelineUpdateChange}
                    placeholder="What's new? Use @ to tag people, projects, or tasks..."
                    style={styles.timelineInput}
                  />
                  
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
                  <div key={idx}>
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
                    </div>
                    {idx < getAllActivities().length - 1 && (
                      <div style={styles.timelineSeparator} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          // Projects Overview
          <>
            <header style={styles.header}>
              <div>
                <h2 style={styles.pageTitle}>Your Projects</h2>
                <p style={styles.pageSubtitle}>
                  {projects.filter(p => p.status === 'active').length} active · {projects.length} total
                </p>
              </div>
            </header>

            <div style={styles.projectsGrid}>
              {projects.map((project, index) => (
                <div
                  key={project.id}
                  style={{
                    ...styles.projectCard,
                    animationDelay: `${index * 100}ms`
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

                  {/* Tasks Needing Attention */}
                  {(() => {
                    const tasksNeedingAttention = [];
                    project.plan.forEach(task => {
                      task.subtasks.forEach(subtask => {
                        if (subtask.status !== 'completed') {
                          const dueDateInfo = formatDueDate(subtask.dueDate, subtask.status, subtask.completedDate);
                          if (dueDateInfo.isOverdue || dueDateInfo.text.includes('today') || dueDateInfo.text.includes('tomorrow') || dueDateInfo.text.includes('Due in')) {
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
                              <span style={{
                                ...styles.actionTextSmall,
                                color: task.dueDateInfo.isOverdue ? 'var(--coral)' : 'var(--charcoal)'
                              }}>
                                {task.title}
                              </span>
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
                    <button 
                      onClick={() => setViewingProjectId(project.id)}
                      style={styles.cardButton}
                    >
                      View Details
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              ))}
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
    backgroundColor: 'var(--cream)',
    fontFamily: "'Crimson Pro', Georgia, serif",
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
    padding: '32px 24px',
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

  sidebarFooter: {
    marginTop: 'auto',
    paddingTop: '24px',
  },

  newProjectButton: {
    width: '100%',
    padding: '12px 16px',
    border: '2px dashed var(--cloud)',
    backgroundColor: 'transparent',
    color: 'var(--earth)',
    fontSize: '15px',
    fontFamily: "'Inter', sans-serif",
    cursor: 'pointer',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
    fontWeight: '500',
  },

  settingsButton: {
    marginTop: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    border: '1px solid var(--cloud)',
  },

  main: {
    flex: 1,
    padding: '48px 64px',
    overflowY: 'auto',
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

  projectsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
    gap: '24px',
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

  actionTextSmall: {
    fontSize: '14px',
    color: 'var(--charcoal)',
    fontFamily: "'Inter', sans-serif",
    lineHeight: '1.5',
  },

  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '20px',
    borderTop: '1px solid var(--cloud)',
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

  secondaryButton: {
    padding: '14px 24px',
    border: '2px solid var(--cloud)',
    borderRadius: '10px',
    backgroundColor: 'transparent',
    color: 'var(--stone)',
    fontSize: '15px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
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

  nextActionTextSmall: {
    fontSize: '13px',
    color: 'var(--charcoal)',
    fontFamily: "'Inter', sans-serif",
    lineHeight: '1.5',
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

  // Timeline Styles
  timelineContainer: {
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
};
