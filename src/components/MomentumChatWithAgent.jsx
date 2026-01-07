/**
 * MomentumChat with OpenAI Agents SDK
 *
 * This component uses the OpenAI Agents SDK for agent orchestration.
 * It provides a chat interface for project management with:
 * - Sequential tool execution (fixes task/subtask race conditions)
 * - Thinking process visualization
 * - Human-in-the-loop support (clarification, permission requests)
 * - Undo capabilities
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { usePortfolioData } from '../hooks/usePortfolioData';
import { getTheme } from '../lib/theme';

// Import the new agent SDK
import { useAgentRuntime } from '../agent-sdk';

// Import UI components
import ThinkingProcess from './ThinkingProcess';
import UserQuestionPrompt from './UserQuestionPrompt';

// Default to base theme, can be overridden by props
const getColors = (isSantafied = false) => getTheme(isSantafied ? 'santa' : 'base');

export default function MomentumChatWithAgent({
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

  const seededAgentHistory = useMemo(
    () =>
      messages
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .map(msg => ({
          role: msg.role,
          content: msg.note || msg.content || '',
        })),
    [messages]
  );

  const getPriorityColor = (priority) => {
    const map = { high: colors.coral, medium: colors.amber, low: colors.sage };
    return map[priority] || colors.stone;
  };

  const getStatusColor = (status) => {
    const map = { active: colors.sage, planning: colors.amber, 'on-hold': colors.stone, completed: colors.earth };
    return map[status] || colors.stone;
  };

  // Get data and services from portfolio hook
  const {
    projects,
    createProject,
    updateProject,
    addActivity,
    addTask,
    updateTask,
    addSubtask,
    updateSubtask,
    createPerson,
    sendEmail,
  } = usePortfolioData();

  // Component state
  const [inputValue, setInputValue] = useState('');
  const [hoveredProject, setHoveredProject] = useState(null);
  const [linkedMessageId, setLinkedMessageId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [projectPositions, setProjectPositions] = useState({});
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const messageRefs = useRef({});
  const activeAssistantMessageId = useRef(null);

  // Initialize agent runtime using the new SDK hook
  const {
    executeMessage,
    continueWithUserResponse,
    undoManager,
    undoDeltas,
    isAwaitingUser,
    pendingQuestion,
  } = useAgentRuntime({
    projects,
    people,
    loggedInUser,
    createPerson,
    sendEmail,
    initialConversationHistory: seededAgentHistory,
  });

  // State for streaming thinking steps during execution
  const [streamingThinkingSteps, setStreamingThinkingSteps] = useState([]);
  const [inProgressAssistantMessage, setInProgressAssistantMessage] = useState(null);

  // Persist agent deltas to the backend (projects, tasks, subtasks, comments)
  const persistAgentResults = useCallback(
    async (result) => {
      const { deltas, workingProjects } = result || {};
      if (!deltas || deltas.length === 0 || !workingProjects) return;

      const findProject = (projectId) =>
        workingProjects.find((project) => `${project.id}` === `${projectId}`);

      for (const delta of deltas) {
        try {
          switch (delta.type) {
            case 'remove_project': {
              const project = findProject(delta.projectId);
              if (project) {
                await createProject(project);
              }
              break;
            }
            case 'remove_activity': {
              const project = findProject(delta.projectId);
              const activity = project?.recentActivity?.find((a) => a.id === delta.activityId);
              if (project && activity) {
                await addActivity(project.id, activity);
              }
              break;
            }
            case 'remove_task': {
              const project = findProject(delta.projectId);
              const task = project?.plan?.find((t) => t.id === delta.taskId);
              if (project && task) {
                await addTask(project.id, task);
              }
              break;
            }
            case 'restore_task': {
              const project = findProject(delta.projectId);
              const task = project?.plan?.find((t) => t.id === delta.taskId);
              if (project && task) {
                await updateTask(project.id, task.id, task);
              }
              break;
            }
            case 'remove_subtask': {
              const project = findProject(delta.projectId);
              const task = project?.plan?.find((t) => t.id === delta.taskId);
              const subtask = task?.subtasks?.find((st) => st.id === delta.subtaskId);
              if (project && task && subtask) {
                await addSubtask(project.id, task.id, subtask);
              }
              break;
            }
            case 'restore_subtask': {
              const project = findProject(delta.projectId);
              const task = project?.plan?.find((t) => t.id === delta.taskId);
              const subtask = task?.subtasks?.find((st) => st.id === delta.subtaskId);
              if (project && task && subtask) {
                await updateSubtask(project.id, task.id, subtask.id, subtask);
              }
              break;
            }
            case 'restore_project': {
              const project = findProject(delta.projectId);
              if (project) {
                await updateProject(project.id, project);
              }
              break;
            }
            default:
              break;
          }
        } catch (error) {
          console.error('Failed to persist agent delta', delta, error);
        }
      }
    },
    [addActivity, addSubtask, addTask, createProject, updateProject, updateSubtask, updateTask]
  );

  // Update project positions for link visualization
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
    if (messages.length > prevMessagesLengthRef.current && prevMessagesLengthRef.current > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  const displayedMessages = useMemo(() => {
    if (!inProgressAssistantMessage) return messages;

    const hasRenderableAssistantContent = Boolean(
      inProgressAssistantMessage.note?.trim() ||
      inProgressAssistantMessage.content?.trim() ||
      (inProgressAssistantMessage.thinkingSteps?.length ?? 0) > 0 ||
      inProgressAssistantMessage.pendingQuestion
    );

    if (!hasRenderableAssistantContent) return messages;

    const filteredMessages = messages.filter(m => m.id !== inProgressAssistantMessage.id);
    return [...filteredMessages, inProgressAssistantMessage];
  }, [messages, inProgressAssistantMessage]);

  // Callbacks for streaming thinking updates
  const thinkingCallbacks = {
    onThinkingStep: (step) => {
      setStreamingThinkingSteps(prev => {
        // Update existing step or add new one
        const existing = prev.findIndex(s => s.id === step.id);
        const updated = existing >= 0 ? Object.assign([...prev], { [existing]: step }) : [...prev, step];

        setInProgressAssistantMessage(current => {
          const baseMessage =
            current || {
              id: activeAssistantMessageId.current || `msg-${Date.now()}`,
              role: 'assistant',
              author: 'Momentum',
              content: '',
              note: '',
              date: new Date().toISOString(),
              actionResults: [],
              updatedProjectIds: [],
              linkedProjectIds: [],
              deltas: [],
              pendingQuestion: null,
            };

          return { ...baseMessage, thinkingSteps: updated };
        });

        return updated;
      });
    },
  };

  // Handle send message - now uses OpenAI Agents SDK with sequential execution
  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputValue,
      note: inputValue,
      date: new Date().toISOString(),
    };

    if (onSendMessage) {
      onSendMessage(userMessage);
    }

    setInputValue('');
    setIsTyping(true);
    setStreamingThinkingSteps([]); // Reset thinking steps
    const assistantId = `msg-${Date.now() + 1}`;
    activeAssistantMessageId.current = assistantId;
    setInProgressAssistantMessage({
      id: assistantId,
      role: 'assistant',
      author: 'Momentum',
      content: '',
      note: '',
      date: new Date().toISOString(),
      actionResults: [],
      updatedProjectIds: [],
      linkedProjectIds: [],
      deltas: [],
      thinkingSteps: [],
      pendingQuestion: null,
    });

    try {
      // Execute message through the SDK agent with callbacks
      const result = await executeMessage(inputValue, thinkingCallbacks);

      // Persist the agent's changes to the backend so created tasks/projects are stored
      await persistAgentResults(result);

      const assistantMessage = {
        id: assistantId,
        role: 'assistant',
        author: 'Momentum',
        content: result.response,
        note: result.response,
        date: new Date().toISOString(),
        actionResults: result.actionResults,
        updatedProjectIds: result.updatedEntityIds,
        linkedProjectIds: result.updatedEntityIds,
        deltas: result.deltas,
        thinkingSteps: result.thinkingSteps, // Include thinking steps
        pendingQuestion: result.pendingQuestion, // Include pending question if any
      };

      setInProgressAssistantMessage(assistantMessage);

      if (onSendMessage) {
        onSendMessage(assistantMessage);
      }

      if (onApplyActions && result.actionResults.length > 0) {
        onApplyActions(result.actionResults, result.updatedEntityIds);
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

      setInProgressAssistantMessage(errorMessage);

      if (onSendMessage) {
        onSendMessage(errorMessage);
      }
    } finally {
      // Clear streaming steps after the run completes (success or error)
      setStreamingThinkingSteps([]);
      activeAssistantMessageId.current = null;
      setIsTyping(false);
    }
  };

  // Handle user response to agent question
  const handleUserQuestionResponse = async (response) => {
    setIsTyping(true);
    setStreamingThinkingSteps([]);

    const assistantId = activeAssistantMessageId.current || `msg-${Date.now()}`;
    const existingMessage =
      inProgressAssistantMessage ||
      messages.find(m => m.id === assistantId) || {
        id: assistantId,
        role: 'assistant',
        author: 'Momentum',
        content: '',
        note: '',
        date: new Date().toISOString(),
        actionResults: [],
        updatedProjectIds: [],
        linkedProjectIds: [],
        deltas: [],
        thinkingSteps: [],
        pendingQuestion: null,
      };

    activeAssistantMessageId.current = assistantId;
    setInProgressAssistantMessage(existingMessage);

    try {
      const result = await continueWithUserResponse(response);

      // Persist follow-up actions (e.g., tasks/subtasks) to the backend
      await persistAgentResults(result);

      // Update the last message with continued results
      const assistantMessage = {
        ...existingMessage,
        id: assistantId,
        content: result.response,
        note: result.response,
        date: new Date().toISOString(),
        actionResults: result.actionResults,
        updatedProjectIds: result.updatedEntityIds,
        linkedProjectIds: result.updatedEntityIds,
        deltas: result.deltas,
        thinkingSteps: result.thinkingSteps,
        pendingQuestion: result.pendingQuestion,
      };

      setInProgressAssistantMessage(assistantMessage);

      if (onSendMessage) {
        onSendMessage(assistantMessage);
      }

      if (onApplyActions && result.actionResults.length > 0) {
        onApplyActions(result.actionResults, result.updatedEntityIds);
      }

    } catch (error) {
      console.error('Failed to continue with user response:', error);

      const errorMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        author: 'Momentum',
        content: `Sorry, I encountered an error: ${error.message}`,
        note: `Sorry, I encountered an error: ${error.message}`,
        date: new Date().toISOString(),
        actionResults: [],
      };

      setInProgressAssistantMessage(errorMessage);

      if (onSendMessage) {
        onSendMessage(errorMessage);
      }
    } finally {
      // Clear streaming steps when the resumed run finishes
      setStreamingThinkingSteps([]);
      activeAssistantMessageId.current = null;
      setIsTyping(false);
    }
  };

  // Handle cancellation of user question
  const handleUserQuestionCancel = () => {
    // Just add a message indicating the action was cancelled
    const cancelMessage = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      author: 'Momentum',
      content: 'Action cancelled.',
      note: 'Action cancelled.',
      date: new Date().toISOString(),
      actionResults: [],
    };

    if (onSendMessage) {
      onSendMessage(cancelMessage);
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

    const formatDueDate = (date) => {
      if (!date) return null;
      const parsed = new Date(date);
      if (Number.isNaN(parsed.getTime())) return date;
      return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const summaryParts = [];
    if (action.projectName) summaryParts.push(action.projectName);
    if (action.taskTitle) summaryParts.push(action.taskTitle);
    if (action.subtaskTitle) summaryParts.push(`Subtask: ${action.subtaskTitle}`);
    if (action.assigneeName) summaryParts.push(`Assignee: ${action.assigneeName}`);
    const dueDate = formatDueDate(action.dueDate);
    if (dueDate) summaryParts.push(`Due ${dueDate}`);
    const structuredSummary = summaryParts.filter(Boolean).join(' • ');
    const secondaryLine = action.diffSummary
      ? structuredSummary
        ? `${structuredSummary} • ${action.diffSummary}`
        : action.diffSummary
      : structuredSummary;

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
        {secondaryLine && (
          <div style={styles.actionSecondary}>{secondaryLine}</div>
        )}
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

    const isActiveAssistantStream =
      !isUser &&
      isTyping &&
      inProgressAssistantMessage?.id === message.id;

    const thinkingStepsToShow = isActiveAssistantStream ? [] : message.thinkingSteps;

    const hasRenderableContent = Boolean(
      message.note?.trim() ||
      message.content?.trim() ||
      (thinkingStepsToShow?.length ?? 0) > 0 ||
      message.pendingQuestion ||
      (message.actionResults?.length ?? 0) > 0
    );

    if (isActiveAssistantStream && !hasRenderableContent) {
      return null;
    }

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
            {/* Thinking Process - shows agent's reasoning */}
            {thinkingStepsToShow?.length > 0 && (
              <ThinkingProcess
                steps={thinkingStepsToShow}
                colors={colors}
              />
            )}
            {(message.note || message.content) && (
              <div
                style={{
                  ...styles.messageText,
                  ...(isUser ? styles.userText : styles.assistantText),
                }}
              >
                {renderMarkdownBlocks(message.note || message.content)}
              </div>
            )}
            {/* User Question Prompt - when agent needs clarification */}
            {message.pendingQuestion && (
              <UserQuestionPrompt
                question={message.pendingQuestion}
                onRespond={handleUserQuestionResponse}
                onCancel={handleUserQuestionCancel}
                colors={colors}
                isLoading={isTyping}
              />
            )}
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
          <span style={styles.projectName}>{project.name}</span>
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
            {isRecentlyUpdated && project.recentActivity?.length > 0 && project.recentActivity[0]?.note && (
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

        @media (max-height: 600px) {
          .momentum-input-container {
            position: sticky !important;
            bottom: 0 !important;
            z-index: 10 !important;
          }
        }

        @media (max-height: 800px) {
          .momentum-chat-header { padding: 12px 18px !important; }
          .momentum-messages { padding: 14px 18px !important; max-height: calc(100vh - 170px); }
          .momentum-input-container { padding: 12px 18px !important; }
        }

        @media (max-height: 650px) {
          .momentum-chat-header { padding: 10px 14px !important; }
          .momentum-messages { padding: 10px 14px !important; max-height: calc(100vh - 140px); }
          .momentum-input-container { padding: 10px 14px !important; }
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
          {displayedMessages.map(renderMessage)}
          {isTyping && (
            <div style={styles.typingWrapper}>
              <div style={styles.aiAvatar}>M</div>
              <div style={styles.messageContent}>
                {/* Show streaming thinking steps while typing */}
                {streamingThinkingSteps.length > 0 && (
                  <ThinkingProcess
                    steps={streamingThinkingSteps}
                    colors={colors}
                  />
                )}
                <div style={styles.typingIndicator}>
                  <div style={styles.typingDot} />
                  <div style={{ ...styles.typingDot, animationDelay: '0.2s' }} />
                  <div style={{ ...styles.typingDot, animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}
          {/* Show question prompt when awaiting user input */}
          {isAwaitingUser && pendingQuestion && !isTyping && (
            <div style={styles.typingWrapper}>
              <div style={styles.aiAvatar}>M</div>
              <div style={styles.messageContent}>
                <UserQuestionPrompt
                  question={pendingQuestion}
                  onRespond={handleUserQuestionResponse}
                  onCancel={handleUserQuestionCancel}
                  colors={colors}
                  isLoading={isTyping}
                />
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
              const aTime = recentlyUpdatedProjects[a.id] || 0;
              const bTime = recentlyUpdatedProjects[b.id] || 0;
              if (aTime !== bTime) return bTime - aTime;
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

function renderInlineMarkdown(text, keyPrefix) {
  const segments = [];
  const boldRegex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push(text.slice(lastIndex, match.index));
    }

    segments.push(<strong key={`${keyPrefix}-bold-${segments.length}`}>{match[1]}</strong>);
    lastIndex = boldRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push(text.slice(lastIndex));
  }

  return segments;
}

function renderMarkdownBlocks(text) {
  const lines = text.split(/\r?\n/);
  const blocks = [];
  let currentList = null;

  const flushList = () => {
    if (!currentList) return;

    const ListTag = currentList.type === 'ol' ? 'ol' : 'ul';
    blocks.push(
      <ListTag
        key={`list-${blocks.length}`}
        style={{ paddingLeft: 20, margin: '8px 0' }}
      >
        {currentList.items.map((item, idx) => (
          <li key={`${currentList.type}-${idx}`} style={{ marginBottom: 4 }}>
            {renderInlineMarkdown(item, `${currentList.type}-${idx}`)}
          </li>
        ))}
      </ListTag>
    );

    currentList = null;
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    const unorderedMatch = /^[-*]\s+(.*)/.exec(trimmed);
    const orderedMatch = /^\d+\.\s+(.*)/.exec(trimmed);

    if (unorderedMatch) {
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(unorderedMatch[1]);
      return;
    }

    if (orderedMatch) {
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(orderedMatch[1]);
      return;
    }

    flushList();

    if (trimmed.length > 0) {
      blocks.push(
        <p key={`p-${idx}`} style={{ margin: '8px 0' }}>
          {renderInlineMarkdown(trimmed, `p-${idx}`)}
        </p>
      );
    }
  });

  flushList();

  return blocks.length > 0 ? blocks : [text];
}

// Styles (same as original MomentumChat)
const getStyles = (colors) => ({
  container: {
    display: 'flex',
    height: '100%',
    minHeight: 0,
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
  logoIcon: { fontSize: '22px' },
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
  actionSecondary: {
    marginTop: '2px',
    fontSize: '11px',
    color: '#3A3631',
    paddingLeft: '28px',
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
    alignItems: 'flex-start',
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
    minWidth: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
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
  },
});
