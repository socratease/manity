import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePortfolioData } from '../hooks/usePortfolioData';
import { callOpenAIChat } from '../lib/llmClient';
import { supportedMomentumActions, validateThrustActions as validateThrustActionsUtil } from '../lib/momentumValidation';
import { MOMENTUM_CHAT_SYSTEM_PROMPT } from '../lib/momentumPrompts';
import { getTheme, getPriorityColor as getThemePriorityColor, getStatusColor as getThemeStatusColor } from '../lib/theme';

// Default to base theme, can be overridden by props
const getColors = (isSantafied = false) => getTheme(isSantafied ? 'santa' : 'base');

// JSON Schema for structured output - ensures LLM returns properly formatted actions
const momentumResponseSchema = {
  type: "json_schema",
  json_schema: {
    name: "momentum_response",
    schema: {
      type: "object",
      properties: {
        response: { type: "string" },
        actions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string" },
              projectId: { type: "string" },
              projectName: { type: "string" },
              // Other action-specific fields will be validated by validateThrustActions
            }
          }
        }
      },
      required: ["response", "actions"]
    }
  }
};

export default function MomentumChat({
  messages = [],
  onSendMessage,
  onApplyActions,
  onUndoAction,
  loggedInUser = 'You',
  people = [],
  isSantafied = false,
  recentlyUpdatedProjects = {}
}) {
  const colors = getColors(isSantafied);
  const styles = getStyles(colors);
  const getPriorityColor = (priority) => {
    const map = { high: colors.coral, medium: colors.amber, low: colors.sage };
    return map[priority] || colors.stone;
  };
  const getStatusColor = (status) => {
    const map = { active: colors.sage, planning: colors.amber, 'on-hold': colors.stone, completed: colors.earth };
    return map[status] || colors.stone;
  };
  const { projects, addTask, updateTask, addSubtask, updateSubtask, updateProject, createProject, addActivity, createPerson, sendEmail } = usePortfolioData();
  const [inputValue, setInputValue] = useState('');
  const [hoveredProject, setHoveredProject] = useState(null);
  const [linkedMessageId, setLinkedMessageId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [projectPositions, setProjectPositions] = useState({});
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const messageRefs = useRef({});

  const updateProjectPositions = useCallback(() => {
    const newPositions = {};
    messages.forEach((msg) => {
      if (msg.linkedProjectIds?.length > 0 || msg.updatedProjectIds?.length > 0) {
        const msgElement = messageRefs.current[msg.id];
        if (msgElement && chatContainerRef.current) {
          const rect = msgElement.getBoundingClientRect();
          const containerRect = chatContainerRef.current.getBoundingClientRect();
          const projectIds = msg.linkedProjectIds || msg.updatedProjectIds || [];
          projectIds.forEach((projId) => {
            newPositions[projId] = {
              messageId: msg.id,
              y: rect.top - containerRect.top + rect.height / 2,
            };
          });
        }
      }
    });
    setProjectPositions(newPositions);
  }, [messages]);

  useEffect(() => {
    updateProjectPositions();
    const container = chatContainerRef.current;
    if (container) {
      container.addEventListener('scroll', updateProjectPositions);
      return () => container.removeEventListener('scroll', updateProjectPositions);
    }
  }, [messages, updateProjectPositions]);

  // Track previous messages length to only auto-scroll when new messages are added
  const prevMessagesLengthRef = useRef(0);

  useEffect(() => {
    // Only scroll if messages were actually added (not just on mount/navigation)
    if (messages.length > prevMessagesLengthRef.current && prevMessagesLengthRef.current > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  const generateActivityId = () => {
    return `activity-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  };

  const findPersonByName = useCallback((name) => {
    if (!name) return null;
    const lower = name.toLowerCase();
    return people.find(person => person.name?.toLowerCase() === lower) || null;
  }, [people]);

  const parseAssistantResponse = (content) => {
    try {
      const parsed = JSON.parse(content);
      return {
        display: parsed.response || parsed.display || content,
        actions: parsed.actions || []
      };
    } catch {
      return { display: content, actions: [] };
    }
  };

  const validateThrustActions = (actions = []) => {
    return validateThrustActionsUtil(actions, projects);
  };

  const requestMomentumActions = async (messages, attempt = 1) => {
    const maxAttempts = 3;
    const { content } = await callOpenAIChat({
      messages,
      responseFormat: momentumResponseSchema
    });
    const parsed = parseAssistantResponse(content);
    const { validActions, errors } = validateThrustActions(parsed.actions);

    if (!errors || errors.length === 0) {
      return { parsed, content };
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

  const applyThrustActions = async (actions = []) => {
    const deltas = [];
    const actionResults = [];
    const updatedProjectIds = [];

    for (const action of actions) {
      try {
        let label = '';
        let projectId = action.projectId;
        const actionDeltas = [];

        if (action.type === 'create_project') {
          const newProject = {
            name: action.name || action.projectName,
            priority: action.priority || 'medium',
            status: action.status || 'planning',
            progress: action.progress || 0,
            description: action.description || '',
            stakeholders: action.stakeholders
              ? action.stakeholders.split(',').map(name => ({ name: name.trim(), team: 'Contributor' }))
              : [{ name: loggedInUser || 'Momentum', team: 'Owner' }],
            targetDate: action.targetDate || '',
            plan: [],
            recentActivity: action.description
              ? [{ id: generateActivityId(), date: new Date().toISOString(), note: action.description, author: 'Momentum' }]
              : []
          };

          const created = await createProject(newProject);
          projectId = created.id;
          updatedProjectIds.push(projectId);
          label = `Created project "${created.name}"`;

          // Track delta for undo
          actionDeltas.push({
            type: 'remove_project',
            projectId: created.id
          });

          actionResults.push({ type: 'create_project', label, deltas: actionDeltas });

        } else if (action.type === 'update_project') {
          const project = projects.find(p => p.id === projectId);
          if (project) {
            const updates = {};
            const previous = {};
            const changesList = [];

            if (action.progress !== undefined) {
              updates.progress = action.progress;
              previous.progress = project.progress;
              changesList.push(`Progress: ${previous.progress}% → ${action.progress}%`);
            }
            if (action.status !== undefined) {
              updates.status = action.status;
              previous.status = project.status;
              changesList.push(`Status: ${previous.status} → ${action.status}`);
            }
            if (action.priority !== undefined) {
              updates.priority = action.priority;
              previous.priority = project.priority;
              changesList.push(`Priority: ${previous.priority} → ${action.priority}`);
            }
            if (action.targetDate !== undefined) {
              updates.targetDate = action.targetDate;
              previous.targetDate = project.targetDate;
              changesList.push(`Target: ${previous.targetDate || 'none'} → ${action.targetDate}`);
            }

            await updateProject(projectId, updates);
            updatedProjectIds.push(projectId);
            label = `Updated "${project.name}"`;

            // Track delta for undo
            actionDeltas.push({
              type: 'restore_project',
              projectId: projectId,
              previous: previous
            });

            actionResults.push({ type: 'update_project', label, deltas: actionDeltas, detail: changesList.join(', ') });
          }

        } else if (action.type === 'comment') {
          const project = projects.find(p => p.id === projectId);
          if (project) {
            const requestedNote = (action.note || action.content || action.comment || '').trim();
            const note = requestedNote || 'Update logged by Momentum';
            const detail = requestedNote
              ? note
              : `${note} (placeholder used because the comment was empty)`;

            const newActivity = {
              id: generateActivityId(),
              date: new Date().toISOString(),
              note,
              author: loggedInUser || 'You'
            };
            await addActivity(projectId, newActivity);
            updatedProjectIds.push(projectId);
            label = `Added comment to "${project.name}"`;

            // Track delta for undo
            actionDeltas.push({
              type: 'remove_activity',
              projectId: projectId,
              activityId: newActivity.id
            });

            actionResults.push({ type: 'comment', label, deltas: actionDeltas, detail });
          }

        } else if (action.type === 'add_task') {
          const project = projects.find(p => p.id === projectId);
          if (project) {
            const title = (action.title || action.name || '').trim();
            // Don't create tasks with empty titles
            if (!title) {
              console.warn('Skipping task creation - no title provided');
              actionResults.push({
                type: 'add_task',
                label: `Skipped empty task in "${project.name}"`,
                deltas: [],
                detail: 'Task must have a title'
              });
              continue;
            }

            const newTask = {
              id: action.id || `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              title: title,
              dueDate: action.dueDate || '',
              completed: false,
              assignedTo: action.assignedTo || '',
              subtasks: []
            };
            await addTask(projectId, newTask);
            updatedProjectIds.push(projectId);
            label = `Added task "${newTask.title}" to "${project.name}"`;

            // Track delta for undo
            actionDeltas.push({
              type: 'remove_task',
              projectId: projectId,
              taskId: newTask.id
            });

            actionResults.push({ type: 'add_task', label, deltas: actionDeltas, detail: `Task: ${newTask.title}${newTask.dueDate ? `, Due: ${newTask.dueDate}` : ''}` });
          }

        } else if (action.type === 'update_task') {
          const project = projects.find(p => p.id === projectId);
          if (project) {
            // Resolve taskId from taskTitle if needed
            let taskId = action.taskId;
            if (!taskId && action.taskTitle) {
              const task = project.plan?.find(t => t.title.toLowerCase() === action.taskTitle.toLowerCase());
              if (task) {
                taskId = task.id;
              } else {
                console.warn(`Task "${action.taskTitle}" not found in project "${project.name}"`);
                actionResults.push({
                  type: 'update_task',
                  label: `Failed to update task - "${action.taskTitle}" not found in "${project.name}"`,
                  deltas: [],
                  detail: 'Referenced task does not exist'
                });
                continue;
              }
            }

            const task = project.plan?.find(t => t.id === taskId);
            const updates = {};
            const previous = {};

            if (task) {
              if (action.completed !== undefined) {
                updates.completed = action.completed;
                previous.completed = task.completed;
              }
              if (action.title !== undefined) {
                updates.title = action.title;
                previous.title = task.title;
              }
              if (action.dueDate !== undefined) {
                updates.dueDate = action.dueDate;
                previous.dueDate = task.dueDate;
              }
              if (action.assignedTo !== undefined) {
                updates.assignedTo = action.assignedTo;
                previous.assignedTo = task.assignedTo;
              }
            }

            await updateTask(projectId, taskId, updates);
            updatedProjectIds.push(projectId);
            label = `Updated task in "${project.name}"`;

            // Track delta for undo
            actionDeltas.push({
              type: 'restore_task',
              projectId: projectId,
              taskId: taskId,
              previous: previous
            });

            actionResults.push({ type: 'update_task', label, deltas: actionDeltas });
          }

        } else if (action.type === 'add_subtask') {
          const project = projects.find(p => p.id === projectId);
          if (project) {
            // Resolve taskId from taskTitle if needed
            let taskId = action.taskId;
            if (!taskId && action.taskTitle) {
              const task = project.plan?.find(t => t.title.toLowerCase() === action.taskTitle.toLowerCase());
              if (task) {
                taskId = task.id;
              } else {
                console.warn(`Task "${action.taskTitle}" not found in project "${project.name}"`);
                actionResults.push({
                  type: 'add_subtask',
                  label: `Failed to add subtask - task "${action.taskTitle}" not found in "${project.name}"`,
                  deltas: [],
                  detail: 'Referenced task does not exist'
                });
                continue;
              }
            }

            if (!taskId) {
              console.warn('Skipping subtask creation - no taskId or taskTitle provided');
              actionResults.push({
                type: 'add_subtask',
                label: `Skipped subtask in "${project.name}"`,
                deltas: [],
                detail: 'Subtask must reference a task'
              });
              continue;
            }

            const title = (action.title || action.subtaskTitle || action.name || '').trim();
            if (!title) {
              console.warn('Skipping subtask creation - no title provided');
              actionResults.push({
                type: 'add_subtask',
                label: `Skipped empty subtask in "${project.name}"`,
                deltas: [],
                detail: 'Subtask must have a title'
              });
              continue;
            }

            const newSubtask = {
              id: `subtask-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              title: title,
              dueDate: action.dueDate || '',
              completed: false,
              assignedTo: action.assignedTo || ''
            };
            await addSubtask(projectId, taskId, newSubtask);
            updatedProjectIds.push(projectId);
            label = `Added subtask "${newSubtask.title}" to "${project.name}"`;

            // Track delta for undo
            actionDeltas.push({
              type: 'remove_subtask',
              projectId: projectId,
              taskId: taskId,
              subtaskId: newSubtask.id
            });

            actionResults.push({ type: 'add_subtask', label, deltas: actionDeltas });
          }

        } else if (action.type === 'add_person') {
          const personName = action.name || action.personName;
          if (personName) {
            await createPerson({
              name: personName,
              team: action.team || 'Contributor',
              email: action.email || null
            });
            label = `Added person "${personName}"`;
            // Note: No undo tracking for add_person yet
            actionResults.push({ type: 'add_person', label, deltas: [] });
          }

        } else if (action.type === 'send_email') {
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
            actionResults.push({
              type: 'send_email',
              label: 'Skipped send_email: no recipients',
              deltas: actionDeltas,
              detail: 'No recipients were provided for the email.'
            });
            continue;
          }

          const subject = (action.subject || '').trim();
          const body = (action.body || '').trim();

          if (!subject || !body) {
            actionResults.push({
              type: 'send_email',
              label: 'Skipped send_email: missing content',
              deltas: actionDeltas,
              detail: 'Both subject and body are required to send an email.'
            });
            continue;
          }

          const signature = '-sent by an AI clerk';
          const cleanedBody = body
            .replace(/\n*-?\s*sent (with the help of|by) an AI clerk\s*$/gi, '')
            .trim();
          const bodyWithSignature = cleanedBody ? `${cleanedBody}\n\n${signature}` : signature;

          try {
            await sendEmail({
              recipients: normalizedRecipients,
              subject,
              body: bodyWithSignature
            });

            label = `Email sent to ${normalizedRecipients.join(', ')}`;
            actionResults.push({
              type: 'send_email',
              label,
              deltas: actionDeltas,
              detail: `Sent email "${subject}"`
            });
          } catch (error) {
            actionResults.push({
              type: 'send_email',
              label: 'Failed to send email',
              deltas: actionDeltas,
              error: error.message
            });
          }
        }

        // Collect all deltas
        deltas.push(...actionDeltas);

      } catch (error) {
        console.error('Error applying action:', action, error);
        actionResults.push({
          type: action.type,
          label: `Failed: ${action.type}`,
          deltas: [],
          error: error.message
        });
      }
    }

    return { deltas, actionResults, updatedProjectIds };
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputValue,
      note: inputValue,
      date: new Date().toISOString(),
    };

    // Call parent handler to add user message
    if (onSendMessage) {
      onSendMessage(userMessage);
    }

    setInputValue('');
    setIsTyping(true);

    try {
      // Prepare system prompt with portfolio context
      const portfolioContext = projects.map(p => ({
        id: p.id,
        name: p.name,
        status: p.status,
        priority: p.priority,
        progress: p.progress,
        description: p.description
      }));

      const peopleContext = people.map(p => ({
        name: p.name,
        team: p.team,
        email: p.email || null
      }));

      const systemPrompt = `${MOMENTUM_CHAT_SYSTEM_PROMPT}

LOGGED-IN USER: ${loggedInUser || 'Not set'}
- When the user says "me", "my", "I", or similar pronouns, they are referring to: ${loggedInUser || 'the logged-in user'}
- When adding comments or updates, use "${loggedInUser || 'You'}" as the author unless otherwise specified
- You may send emails on the user's behalf when it moves the work forward (status updates, requests, reminders); the system will handle the From address.

PEOPLE & EMAIL ADDRESSES:
- Each person in the system may have an email address stored in their profile
- When referencing people, you can look up their email addresses from the people list below
- All project stakeholders/contributors are people with potential email addresses

Available action types: ${supportedMomentumActions.join(', ')}.

Current portfolio:
${JSON.stringify(portfolioContext, null, 2)}

People database:
${JSON.stringify(peopleContext, null, 2)}
`;

      const conversationMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.note || m.content })),
        { role: 'user', content: inputValue }
      ];

      const { parsed, content } = await requestMomentumActions(conversationMessages);
      // Use validated actions with resolved project IDs
      const { validActions } = validateThrustActions(parsed.actions || []);
      const { actionResults, updatedProjectIds } = await applyThrustActions(validActions);

      const assistantMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        author: 'Momentum',
        content: parsed.display || content,
        note: parsed.display || content,
        date: new Date().toISOString(),
        actionResults,
        updatedProjectIds,
        linkedProjectIds: updatedProjectIds,
        deltas: actionResults.flatMap(ar => ar.deltas || []),
      };

      // Call parent handler to add assistant message
      if (onSendMessage) {
        onSendMessage(assistantMessage);
      }

      // Notify parent of applied actions
      if (onApplyActions && actionResults.length > 0) {
        onApplyActions(actionResults, updatedProjectIds);
      }

    } catch (error) {
      console.error('Failed to send Momentum request:', error);

      const errorMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        author: 'Momentum',
        content: `Sorry, I encountered an error: ${error.message}`,
        note: `Sorry, I encountered an error: ${error.message}`,
        date: new Date().toISOString(),
        actionResults: [],
      };

      if (onSendMessage) {
        onSendMessage(errorMessage);
      }
    } finally {
      setIsTyping(false);
    }
  };

  const formatTime = (ts) => new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const handleUndoAction = (messageId, actionIndex) => {
    if (onUndoAction) {
      onUndoAction(messageId, actionIndex);
    }
  };

  const renderAction = (action, index, messageId) => {
    const icons = { update_project: '↻', update_task: '✓', comment: '💬', create_project: '✦', add_task: '➕' };
    const labels = { update_project: 'Updated', update_task: 'Task updated', comment: 'Commented', create_project: 'Created', add_task: 'Added task' };

    return (
      <div key={index} style={styles.actionCard}>
        <div style={styles.actionHeader}>
          <span style={styles.actionIcon}>{icons[action.type] || '•'}</span>
          <span style={styles.actionLabel}>{labels[action.type] || 'Action'}</span>
          <span style={styles.actionProject}>{action.label || action.type}</span>
          <span style={{
            ...styles.actionStatus,
            backgroundColor: action.undone ? colors.stone + '25' : action.error ? colors.coral + '25' : colors.sage + '25',
            color: action.undone ? colors.stone : action.error ? colors.coral : colors.sage,
          }}>
            {action.undone ? 'undone' : action.error ? 'failed' : 'completed'}
          </span>
          {!action.undone && !action.error && onUndoAction && (
            <button
              onClick={() => handleUndoAction(messageId, index)}
              style={styles.undoButton}
              title="Undo this action"
            >
              ↶
            </button>
          )}
        </div>
        {action.error && (
          <div style={styles.actionContent}>{action.error}</div>
        )}
        {action.detail && !action.error && (
          <div style={styles.actionDetail}>{action.detail}</div>
        )}
      </div>
    );
  };

  const renderMessage = (message) => {
    const isUser = message.role === 'user';
    const isLinked = (message.linkedProjectIds?.length > 0) || (message.updatedProjectIds?.length > 0);

    return (
      <div
        key={message.id}
        ref={(el) => (messageRefs.current[message.id] = el)}
        style={{ ...styles.messageWrapper, justifyContent: isUser ? 'flex-end' : 'flex-start' }}
        onMouseEnter={() => isLinked && setLinkedMessageId(message.id)}
        onMouseLeave={() => setLinkedMessageId(null)}
      >
        <div style={{
          ...styles.messageBubble,
          flexDirection: isUser ? 'row-reverse' : 'row',
          ...(isLinked && linkedMessageId === message.id ? { transform: 'scale(1.01)' } : {}),
        }}>
          {!isUser && <div style={styles.aiAvatar}>M</div>}
          <div style={styles.messageContent}>
            <div style={{
              ...styles.messageText,
              ...(isUser ? styles.userText : styles.assistantText),
            }}>
              {message.note || message.content}
            </div>
            {message.actionResults?.length > 0 && (
              <div style={styles.actionsContainer}>
                {message.actionResults.map((a, i) => renderAction(a, i, message.id))}
              </div>
            )}
            <span style={{ ...styles.timestamp, alignSelf: isUser ? 'flex-end' : 'flex-start' }}>
              {formatTime(message.date || message.timestamp)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderProjectCard = (project, index) => {
    const isHovered = hoveredProject === project.id;
    const isLinked = project.id in projectPositions || String(project.id) in projectPositions;
    const linkInfo = projectPositions[project.id] || projectPositions[String(project.id)];
    const isActivelyLinked = linkInfo && linkedMessageId === linkInfo.messageId;
    const isRecentlyUpdated = project.id in recentlyUpdatedProjects;

    const handleCardClick = (e) => {
      e.preventDefault();
      window.location.hash = `#/project/${project.id}`;
    };

    return (
      <div
        key={project.id}
        onClick={handleCardClick}
        style={{
          ...styles.projectCard,
          ...(isHovered ? styles.projectCardHovered : {}),
          ...(isLinked ? { borderColor: colors.amber, borderWidth: 2 } : {}),
          ...(isActivelyLinked ? { backgroundColor: '#FFFBF5', boxShadow: `0 0 16px ${colors.amber}40` } : {}),
          ...(isRecentlyUpdated ? { boxShadow: `0 0 12px ${colors.sage}60`, borderColor: colors.sage } : {}),
        }}
        onMouseEnter={() => setHoveredProject(project.id)}
        onMouseLeave={() => setHoveredProject(null)}
      >
        {isLinked && (
          <div style={{
            ...styles.connectionIndicator,
            backgroundColor: isActivelyLinked ? colors.amber : colors.earth,
            opacity: isActivelyLinked ? 1 : 0.5,
          }} />
        )}

        <div style={{
          ...styles.priorityDot,
          backgroundColor: getPriorityColor(project.priority),
          boxShadow: isHovered ? `0 0 10px ${getPriorityColor(project.priority)}` : 'none',
        }} />

        <div style={styles.projectCompact}>
          <span style={styles.projectName}>
            {project.name.length > 14 ? project.name.substring(0, 12) + '…' : project.name}
          </span>
          <div style={styles.progressRing}>
            <svg width="32" height="32" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="12" fill="none" stroke={colors.cloud} strokeWidth="3" />
              <circle
                cx="16" cy="16" r="12"
                fill="none"
                stroke={getPriorityColor(project.priority)}
                strokeWidth="3"
                strokeDasharray={`${((project.progress || 0) / 100) * 75.4} 75.4`}
                strokeLinecap="round"
                transform="rotate(-90 16 16)"
                style={{ transition: 'stroke-dasharray 0.4s' }}
              />
            </svg>
            <span style={styles.progressText}>{project.progress || 0}</span>
          </div>
        </div>

        {(isHovered || isRecentlyUpdated) && (
          <div style={styles.projectExpanded}>
            <p style={styles.projectDescription}>{project.description}</p>
            {isRecentlyUpdated && project.recentActivity && project.recentActivity.length > 0 && (
              <div style={styles.recentActivityPreview}>
                <span style={styles.recentActivityLabel}>Latest update:</span>
                <span style={styles.recentActivityText}>{project.recentActivity[0].note}</span>
              </div>
            )}
            <div style={styles.projectMeta}>
              <span style={{
                ...styles.statusBadge,
                backgroundColor: getStatusColor(project.status) + '25',
                color: getStatusColor(project.status),
              }}>
                {project.status}
              </span>
              {project.targetDate && (
                <span style={styles.targetDate}>
                  {new Date(project.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
            {project.stakeholders?.length > 0 && (
              <div style={styles.stakeholderRow}>
                {project.stakeholders.slice(0, 3).map((s, i) => (
                  <span key={i} style={styles.stakeholderBadge}>{s.name}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={styles.container} className="momentum-container">
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: translateX(0); } }

        /* Fix chat input positioning on small screens */
        @media (max-height: 600px) {
          .momentum-input-container {
            position: sticky !important;
            bottom: 0 !important;
            z-index: 10 !important;
          }
        }

        @media (max-height: 800px) {
          .momentum-chat-header {
            padding: 12px 18px !important;
          }

          .momentum-messages {
            padding: 14px 18px !important;
            max-height: calc(100vh - 170px);
          }

          .momentum-input-container {
            padding: 12px 18px !important;
          }
        }

        @media (max-height: 650px) {
          .momentum-chat-header {
            padding: 10px 14px !important;
          }

          .momentum-messages {
            padding: 10px 14px !important;
            max-height: calc(100vh - 140px);
          }

          .momentum-input-container {
            padding: 10px 14px !important;
          }
        }
      `}</style>

      {/* Chat Column */}
      <div style={styles.chatColumn}>
        <div style={styles.chatHeader} className="momentum-chat-header">
          <div style={styles.headerLeft}>
            <span style={styles.logoIcon}>⚡</span>
            <span style={styles.logoText}>Momentum</span>
            <span style={styles.headerSubtitle}>AI Project Assistant</span>
          </div>
          <span style={styles.connectionStatus}>● Connected</span>
        </div>

        <div ref={chatContainerRef} style={styles.messagesContainer} className="momentum-messages">
          {messages.map(renderMessage)}
          {isTyping && (
            <div style={styles.typingWrapper}>
              <div style={styles.aiAvatar}>M</div>
              <div style={styles.typingIndicator}>
                <div style={styles.typingDot} />
                <div style={{ ...styles.typingDot, animationDelay: '0.2s' }} />
                <div style={{ ...styles.typingDot, animationDelay: '0.4s' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={styles.inputContainer} className="momentum-input-container">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask Momentum to update projects..."
            style={styles.input}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isTyping}
            style={{
              ...styles.sendButton,
              opacity: inputValue.trim() && !isTyping ? 1 : 0.4,
              cursor: inputValue.trim() && !isTyping ? 'pointer' : 'not-allowed',
            }}
          >
            ↑
          </button>
        </div>
      </div>

      {/* Project Canvas */}
      <div style={styles.canvasColumn}>
        <div style={styles.canvasHeader}>
          <h3 style={styles.canvasTitle}>Projects</h3>
          <span style={styles.projectCount}>{projects.length} total</span>
        </div>
        <div style={styles.projectsContainer}>
          {[...projects]
            .sort((a, b) => {
              // Sort by recently updated projects first
              const aTime = recentlyUpdatedProjects[a.id] || 0;
              const bTime = recentlyUpdatedProjects[b.id] || 0;
              if (aTime !== bTime) return bTime - aTime;
              // Then by priority (high > medium > low)
              const priorityOrder = { high: 3, medium: 2, low: 1 };
              return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
            })
            .map((p, i) => renderProjectCard(p, i))
          }
        </div>
        <div style={styles.canvasLegend}>
          <div style={styles.legendItem}><span style={{ ...styles.legendDot, backgroundColor: colors.coral }} />High</div>
          <div style={styles.legendItem}><span style={{ ...styles.legendDot, backgroundColor: colors.amber }} />Medium</div>
          <div style={styles.legendItem}><span style={{ ...styles.legendDot, backgroundColor: colors.sage }} />Low</div>
        </div>
      </div>
    </div>
  );
}

const getStyles = (colors) => ({
  container: {
    display: 'flex',
    height: '100vh',
    width: '100%',
    backgroundColor: '#FAF8F3',
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  chatColumn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid #E8E3D8',
    backgroundColor: '#FFFFFF',
    minWidth: 0,
  },
  chatHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderBottom: '1px solid #E8E3D8',
    backgroundColor: '#FDFCFA',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoIcon: {
    fontSize: '22px',
  },
  logoText: {
    fontSize: '20px',
    fontFamily: "Georgia, serif",
    fontWeight: '600',
    color: '#3A3631',
  },
  headerSubtitle: {
    fontSize: '12px',
    color: '#6B6554',
    paddingLeft: '12px',
    borderLeft: '1px solid #E8E3D8',
  },
  connectionStatus: {
    fontSize: '11px',
    color: '#7A9B76',
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  messageWrapper: {
    display: 'flex',
    width: '100%',
    animation: 'fadeIn 0.3s ease',
  },
  messageBubble: {
    maxWidth: '78%',
    display: 'flex',
    gap: '10px',
    transition: 'transform 0.15s',
  },
  aiAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #8B6F47, #E8A75D)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#FFF',
    fontSize: '14px',
    fontFamily: 'Georgia, serif',
    fontWeight: '700',
    flexShrink: 0,
  },
  messageContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  messageText: {
    padding: '12px 16px',
    borderRadius: '18px',
    fontSize: '14px',
    lineHeight: '1.5',
  },
  userText: {
    background: 'linear-gradient(135deg, #8B6F47, #A68559)',
    color: '#FFFFFF',
    borderBottomRightRadius: '4px',
  },
  assistantText: {
    background: '#F7F4EE',
    border: '1px solid #E8E3D8',
    color: '#3A3631',
    borderBottomLeftRadius: '4px',
  },
  actionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '4px',
  },
  actionCard: {
    backgroundColor: '#F9F7F3',
    border: '1px solid #E8E3D8',
    borderRadius: '10px',
    padding: '10px 12px',
    borderLeft: '3px solid #E8A75D',
  },
  actionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  actionIcon: {
    fontSize: '13px',
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderRadius: '5px',
    border: '1px solid #E8E3D8',
  },
  actionLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#6B6554',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  actionProject: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#3A3631',
  },
  actionStatus: {
    fontSize: '9px',
    fontWeight: '700',
    padding: '2px 6px',
    borderRadius: '10px',
    textTransform: 'uppercase',
    marginLeft: 'auto',
  },
  actionContent: {
    marginTop: '6px',
    fontSize: '12px',
    color: '#D67C5C',
    paddingLeft: '8px',
    borderLeft: '2px solid #E8E3D8',
  },
  actionDetail: {
    marginTop: '6px',
    fontSize: '11px',
    color: '#6B6554',
    paddingLeft: '8px',
    borderLeft: '2px solid #E8A75D',
    fontStyle: 'italic',
  },
  timestamp: {
    fontSize: '10px',
    color: '#6B6554',
    marginTop: '2px',
  },
  typingWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  typingIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '14px 18px',
    backgroundColor: '#F7F4EE',
    borderRadius: '18px',
  },
  typingDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: '#8B6F47',
    animation: 'pulse 1s infinite',
  },
  inputContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '16px 24px',
    borderTop: '1px solid #E8E3D8',
    backgroundColor: '#FDFCFA',
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    borderRadius: '14px',
    border: '2px solid #E8E3D8',
    backgroundColor: '#FFF',
    fontSize: '14px',
    color: '#3A3631',
    outline: 'none',
  },
  sendButton: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #8B6F47, #E8A75D)',
    color: '#FFF',
    fontSize: '18px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 3px 10px rgba(139, 111, 71, 0.25)',
  },
  canvasColumn: {
    width: '300px',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#FAF8F3',
    flexShrink: 0,
  },
  canvasHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #E8E3D8',
  },
  canvasTitle: {
    fontSize: '15px',
    fontFamily: 'Georgia, serif',
    fontWeight: '600',
    color: '#3A3631',
    margin: 0,
  },
  projectCount: {
    fontSize: '11px',
    color: '#6B6554',
  },
  projectsContainer: {
    flex: 1,
    padding: '16px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    overflowY: 'auto',
  },
  projectCard: {
    position: 'relative',
    backgroundColor: '#FFF',
    border: '1px solid #E8E3D8',
    borderRadius: '12px',
    padding: '12px 14px',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    animation: 'slideIn 0.4s ease backwards',
  },
  projectCardHovered: {
    backgroundColor: '#FDFCFA',
    boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
    transform: 'translateX(-3px)',
  },
  connectionIndicator: {
    position: 'absolute',
    left: '-6px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '12px',
    height: '3px',
    borderRadius: '2px',
  },
  priorityDot: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    width: '9px',
    height: '9px',
    borderRadius: '50%',
    transition: 'box-shadow 0.2s',
  },
  projectCompact: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
  },
  projectName: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#3A3631',
    flex: 1,
  },
  progressRing: {
    position: 'relative',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    position: 'absolute',
    fontSize: '8px',
    fontWeight: '700',
    color: '#6B6554',
  },
  projectExpanded: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #E8E3D8',
    animation: 'fadeIn 0.25s ease',
  },
  projectDescription: {
    margin: '0 0 10px',
    fontSize: '12px',
    color: '#6B6554',
    lineHeight: '1.45',
  },
  recentActivityPreview: {
    margin: '0 0 10px',
    padding: '8px',
    backgroundColor: colors.sage + '15',
    borderLeft: `3px solid ${colors.sage}`,
    borderRadius: '6px',
  },
  recentActivityLabel: {
    display: 'block',
    fontSize: '9px',
    fontWeight: '700',
    color: colors.sage,
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
    marginBottom: '4px',
  },
  recentActivityText: {
    display: 'block',
    fontSize: '11px',
    color: '#3A3631',
    lineHeight: '1.4',
  },
  projectMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  statusBadge: {
    fontSize: '9px',
    fontWeight: '700',
    padding: '3px 8px',
    borderRadius: '10px',
    textTransform: 'uppercase',
  },
  targetDate: {
    fontSize: '11px',
    color: '#6B6554',
  },
  stakeholderRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '5px',
  },
  stakeholderBadge: {
    fontSize: '10px',
    padding: '3px 8px',
    borderRadius: '6px',
    backgroundColor: '#F7F4EE',
    color: '#3A3631',
    fontWeight: '500',
  },
  canvasLegend: {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
    padding: '14px',
    borderTop: '1px solid #E8E3D8',
    backgroundColor: '#FFF',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '10px',
    color: '#6B6554',
  },
  legendDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
  },
  undoButton: {
    marginLeft: 'auto',
    padding: '4px 8px',
    fontSize: '14px',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: colors.stone + '25',
    color: colors.stone,
    cursor: 'pointer',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: colors.stone + '40',
    }
  },
});
