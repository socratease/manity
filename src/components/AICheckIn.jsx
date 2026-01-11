/**
 * AICheckIn Component
 *
 * AI-powered daily check-in that helps users craft professional project updates.
 * Features:
 * - Walk through projects sequentially
 * - AI rephrases updates professionally
 * - Back-and-forth conversation for refinement
 * - Real-time display of saved updates
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  ChevronRight,
  Send,
  Check,
  Edit3,
  MessageCircle,
  Loader2,
  X,
  SkipForward,
} from 'lucide-react';
import { useCheckInAgent } from '../agent-sdk/useCheckInAgent';

/**
 * Format date/time for display
 */
function formatDateTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format due date with status
 */
function formatDueDate(dueDate, status, completedDate) {
  if (!dueDate) return { text: '', formattedDate: '', color: 'inherit', isOverdue: false, isDueSoon: false };

  const due = new Date(dueDate);
  const now = new Date();
  const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

  const formattedDate = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (status === 'completed') {
    return { text: 'Completed', formattedDate, color: 'var(--sage)', isOverdue: false, isDueSoon: false };
  }

  if (diffDays < 0) {
    return { text: 'Overdue', formattedDate, color: 'var(--coral)', isOverdue: true, isDueSoon: false };
  }
  if (diffDays <= 3) {
    return { text: 'Due soon', formattedDate, color: 'var(--amber)', isOverdue: false, isDueSoon: true };
  }

  return { text: '', formattedDate, color: 'inherit', isOverdue: false, isDueSoon: false };
}

/**
 * Extract text content from AI response (without tags)
 */
function extractDisplayContent(content) {
  // Remove <proposed-update> tags for display, showing just the explanation
  return content.replace(/<proposed-update>[\s\S]*?<\/proposed-update>/g, '').trim();
}

/**
 * AICheckIn Component
 */
export default function AICheckIn({
  projects,
  selectedProject,
  setSelectedProject,
  onClose,
  onSaveActivity,
  loggedInUser,
  activityAuthor,
}) {
  const [inputValue, setInputValue] = useState('');
  const [localActivities, setLocalActivities] = useState([]);
  const [savedInSession, setSavedInSession] = useState([]);
  const [showDirectInput, setShowDirectInput] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize check-in agent
  const {
    messages,
    sendMessage,
    proposedUpdate,
    acceptUpdate,
    clearProposal,
    resetConversation,
    isProcessing,
    streamingContent,
  } = useCheckInAgent({
    project: selectedProject,
    loggedInUser: loggedInUser || activityAuthor || 'You',
  });

  // Update local activities when project changes
  useEffect(() => {
    if (selectedProject) {
      setLocalActivities(selectedProject.recentActivity || []);
      setSavedInSession([]);
      setInputValue('');
      setShowDirectInput(false);
    }
  }, [selectedProject?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, [selectedProject?.id]);

  /**
   * Handle sending a message
   */
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isProcessing) return;
    const message = inputValue;
    setInputValue('');
    await sendMessage(message);
  }, [inputValue, isProcessing, sendMessage]);

  /**
   * Handle accepting the proposed update
   */
  const handleAcceptUpdate = useCallback(async () => {
    const update = acceptUpdate();
    if (update && selectedProject) {
      // Create activity
      const newActivity = {
        id: `activity-${Date.now()}`,
        date: new Date().toISOString(),
        note: update,
        author: activityAuthor || loggedInUser || 'You',
      };

      // Update local state immediately
      setLocalActivities(prev => [newActivity, ...prev]);
      setSavedInSession(prev => [...prev, newActivity.id]);

      // Persist to backend
      try {
        await onSaveActivity(selectedProject.id, newActivity);
      } catch (error) {
        console.error('Failed to save activity:', error);
        // Rollback on error
        setLocalActivities(prev => prev.filter(a => a.id !== newActivity.id));
        setSavedInSession(prev => prev.filter(id => id !== newActivity.id));
      }
    }
  }, [acceptUpdate, selectedProject, activityAuthor, loggedInUser, onSaveActivity]);

  /**
   * Handle direct save (skip AI)
   */
  const handleDirectSave = useCallback(async () => {
    if (!inputValue.trim() || !selectedProject) return;

    const newActivity = {
      id: `activity-${Date.now()}`,
      date: new Date().toISOString(),
      note: inputValue.trim(),
      author: activityAuthor || loggedInUser || 'You',
    };

    setInputValue('');
    setLocalActivities(prev => [newActivity, ...prev]);
    setSavedInSession(prev => [...prev, newActivity.id]);

    try {
      await onSaveActivity(selectedProject.id, newActivity);
    } catch (error) {
      console.error('Failed to save activity:', error);
      setLocalActivities(prev => prev.filter(a => a.id !== newActivity.id));
      setSavedInSession(prev => prev.filter(id => id !== newActivity.id));
    }
  }, [inputValue, selectedProject, activityAuthor, loggedInUser, onSaveActivity]);

  /**
   * Move to next project
   */
  const handleContinue = useCallback(() => {
    const currentIndex = projects.findIndex(p => p.id === selectedProject?.id);
    if (currentIndex < projects.length - 1) {
      resetConversation();
      setSelectedProject(projects[currentIndex + 1]);
    } else {
      onClose();
    }
  }, [projects, selectedProject, setSelectedProject, resetConversation, onClose]);

  /**
   * Skip current project
   */
  const handleSkip = useCallback(() => {
    const currentIndex = projects.findIndex(p => p.id === selectedProject?.id);
    if (currentIndex < projects.length - 1) {
      resetConversation();
      setSelectedProject(projects[currentIndex + 1]);
    } else {
      onClose();
    }
  }, [projects, selectedProject, setSelectedProject, resetConversation, onClose]);

  // Get tasks needing attention
  const tasksNeedingAttention = [];
  selectedProject?.plan?.forEach(task => {
    task.subtasks?.forEach(subtask => {
      if (subtask.status !== 'completed') {
        const dueDateInfo = formatDueDate(subtask.dueDate, subtask.status);
        if (dueDateInfo.isOverdue || dueDateInfo.isDueSoon) {
          tasksNeedingAttention.push({
            title: subtask.title,
            taskTitle: task.title,
            dueDateInfo,
          });
        }
      }
    });
  });

  if (!selectedProject) return null;

  const currentIndex = projects.findIndex(p => p.id === selectedProject.id);
  const isLastProject = currentIndex === projects.length - 1;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTop}>
            <div style={styles.iconWrapper}>
              <Sparkles size={24} style={{ color: 'var(--amber)' }} />
            </div>
            <button onClick={onClose} style={styles.closeButton}>
              <X size={20} />
            </button>
          </div>
          <h2 style={styles.title}>Good Morning! Let's catch up on your projects</h2>
          <p style={styles.subtitle}>
            What happened yesterday on <strong>{selectedProject.name}</strong>?
          </p>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {/* Recent Updates Section - Real-time */}
          <div style={styles.recentSection}>
            <h4 style={styles.sectionTitle}>Recent Updates</h4>
            {localActivities.length === 0 ? (
              <p style={styles.noUpdates}>No updates yet</p>
            ) : (
              <div style={styles.activitiesList}>
                {localActivities.slice(0, 4).map((activity, idx) => (
                  <div
                    key={activity.id || idx}
                    style={{
                      ...styles.activityItem,
                      ...(savedInSession.includes(activity.id) ? styles.newActivity : {}),
                    }}
                  >
                    <div style={styles.activityHeader}>
                      <span style={styles.activityAuthor}>{activity.author}</span>
                      <span style={styles.activityTime}>
                        {savedInSession.includes(activity.id) ? (
                          <span style={styles.justSaved}>Just saved</span>
                        ) : (
                          formatDateTime(activity.date)
                        )}
                      </span>
                    </div>
                    <p style={styles.activityNote}>{activity.note}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tasks Needing Attention */}
          {tasksNeedingAttention.length > 0 && (
            <div style={styles.tasksSection}>
              <h4 style={styles.sectionTitle}>Tasks Needing Attention</h4>
              {tasksNeedingAttention.slice(0, 3).map((task, idx) => (
                <div key={idx} style={styles.taskItem}>
                  <span style={styles.taskTitle}>{task.title}</span>
                  <span style={{ ...styles.taskDue, color: task.dueDateInfo.color }}>
                    {task.dueDateInfo.text}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Chat Section */}
          <div style={styles.chatSection}>
            <div style={styles.chatHeader}>
              <MessageCircle size={16} style={{ color: 'var(--earth)' }} />
              <span style={styles.chatHeaderText}>AI Writing Assistant</span>
              <button
                onClick={() => setShowDirectInput(!showDirectInput)}
                style={styles.toggleButton}
              >
                {showDirectInput ? 'Use AI' : 'Skip AI'}
              </button>
            </div>

            {!showDirectInput ? (
              <>
                {/* Messages */}
                <div style={styles.messagesContainer}>
                  {messages.length === 0 && !streamingContent && (
                    <div style={styles.emptyState}>
                      <p>Type your update below. I'll help polish it for you!</p>
                      <p style={styles.exampleText}>
                        Example: "finished the api work, had some issues with auth"
                      </p>
                    </div>
                  )}

                  {messages.map((message) => (
                    <div
                      key={message.id}
                      style={{
                        ...styles.message,
                        ...(message.role === 'user' ? styles.userMessage : styles.assistantMessage),
                      }}
                    >
                      {message.role === 'user' ? (
                        <p style={styles.messageContent}>{message.content}</p>
                      ) : (
                        <p style={styles.messageContent}>
                          {extractDisplayContent(message.content) || 'Here\'s your refined update:'}
                        </p>
                      )}
                    </div>
                  ))}

                  {/* Streaming content */}
                  {streamingContent && (
                    <div style={{ ...styles.message, ...styles.assistantMessage }}>
                      <p style={styles.messageContent}>
                        {extractDisplayContent(streamingContent)}
                        <span style={styles.cursor}>|</span>
                      </p>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Proposed Update Preview */}
                {proposedUpdate && (
                  <div style={styles.proposalBox}>
                    <div style={styles.proposalHeader}>
                      <Check size={16} style={{ color: 'var(--sage)' }} />
                      <span>Refined Update</span>
                    </div>
                    <p style={styles.proposalText}>{proposedUpdate}</p>
                    <div style={styles.proposalActions}>
                      <button onClick={handleAcceptUpdate} style={styles.acceptButton}>
                        <Check size={16} />
                        Save Update
                      </button>
                      <button onClick={clearProposal} style={styles.editButton}>
                        <Edit3 size={16} />
                        Refine More
                      </button>
                    </div>
                  </div>
                )}

                {/* Input */}
                <div style={styles.inputContainer}>
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={proposedUpdate ? "Ask for changes or type a new update..." : "What's your update?"}
                    style={styles.input}
                    disabled={isProcessing}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isProcessing}
                    style={{
                      ...styles.sendButton,
                      opacity: !inputValue.trim() || isProcessing ? 0.5 : 1,
                    }}
                  >
                    {isProcessing ? (
                      <Loader2 size={18} style={styles.spinner} />
                    ) : (
                      <Send size={18} />
                    )}
                  </button>
                </div>
              </>
            ) : (
              /* Direct Input Mode */
              <div style={styles.directInputContainer}>
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type your update directly..."
                  style={styles.directTextarea}
                  rows={3}
                />
                <button
                  onClick={handleDirectSave}
                  disabled={!inputValue.trim()}
                  style={{
                    ...styles.directSaveButton,
                    opacity: !inputValue.trim() ? 0.5 : 1,
                  }}
                >
                  <Check size={18} />
                  Save Update
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <div style={styles.footerActions}>
            <button onClick={handleContinue} style={styles.continueButton}>
              {isLastProject ? 'Finish' : 'Continue'}
              <ChevronRight size={18} />
            </button>
            <button onClick={handleSkip} style={styles.skipButton}>
              <SkipForward size={16} />
              Skip Project
            </button>
            <button onClick={onClose} style={styles.skipAllButton}>
              Skip All
            </button>
          </div>

          {/* Progress */}
          <div style={styles.progress}>
            {projects.map((p, idx) => (
              <div
                key={p.id}
                style={{
                  ...styles.progressDot,
                  backgroundColor: p.id === selectedProject.id ? 'var(--amber)' : 'var(--cloud)',
                  opacity: idx <= currentIndex ? 1 : 0.3,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Styles
 */
const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    width: '600px',
    maxWidth: '95vw',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
  },
  header: {
    padding: '24px 24px 16px',
    borderBottom: '1px solid var(--cloud)',
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  iconWrapper: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    backgroundColor: 'var(--amber)15',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    padding: '8px',
    cursor: 'pointer',
    color: 'var(--slate)',
    borderRadius: '8px',
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    color: 'var(--charcoal)',
    margin: '0 0 4px 0',
    fontFamily: 'var(--font-heading)',
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--slate)',
    margin: 0,
  },
  body: {
    flex: 1,
    overflow: 'auto',
    padding: '16px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  recentSection: {
    backgroundColor: 'var(--cream)',
    borderRadius: '12px',
    padding: '16px',
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--slate)',
    margin: '0 0 12px 0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  noUpdates: {
    fontSize: '14px',
    color: 'var(--slate)',
    margin: 0,
    fontStyle: 'italic',
  },
  activitiesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  activityItem: {
    padding: '12px',
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    transition: 'all 0.3s ease',
  },
  newActivity: {
    backgroundColor: 'var(--sage)10',
    border: '1px solid var(--sage)30',
    animation: 'fadeIn 0.3s ease',
  },
  activityHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  activityAuthor: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--charcoal)',
  },
  activityTime: {
    fontSize: '12px',
    color: 'var(--slate)',
  },
  justSaved: {
    color: 'var(--sage)',
    fontWeight: '500',
  },
  activityNote: {
    fontSize: '14px',
    color: 'var(--charcoal)',
    margin: 0,
    lineHeight: 1.4,
  },
  tasksSection: {
    padding: '12px 16px',
    backgroundColor: 'var(--amber)08',
    borderRadius: '12px',
    border: '1px solid var(--amber)20',
  },
  taskItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid var(--amber)15',
  },
  taskTitle: {
    fontSize: '14px',
    color: 'var(--charcoal)',
  },
  taskDue: {
    fontSize: '12px',
    fontWeight: '600',
  },
  chatSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid var(--cloud)',
    borderRadius: '12px',
    overflow: 'hidden',
    minHeight: '250px',
  },
  chatHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    borderBottom: '1px solid var(--cloud)',
    backgroundColor: 'var(--cream)',
  },
  chatHeaderText: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--earth)',
    flex: 1,
  },
  toggleButton: {
    fontSize: '12px',
    color: 'var(--slate)',
    background: 'none',
    border: '1px solid var(--cloud)',
    padding: '4px 12px',
    borderRadius: '12px',
    cursor: 'pointer',
  },
  messagesContainer: {
    flex: 1,
    padding: '16px',
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  emptyState: {
    textAlign: 'center',
    color: 'var(--slate)',
    padding: '24px',
  },
  exampleText: {
    fontSize: '13px',
    fontStyle: 'italic',
    color: 'var(--slate)',
    marginTop: '8px',
  },
  message: {
    padding: '12px 16px',
    borderRadius: '12px',
    maxWidth: '85%',
  },
  userMessage: {
    backgroundColor: 'var(--earth)',
    color: '#FFFFFF',
    alignSelf: 'flex-end',
    marginLeft: 'auto',
  },
  assistantMessage: {
    backgroundColor: 'var(--cream)',
    color: 'var(--charcoal)',
    alignSelf: 'flex-start',
  },
  messageContent: {
    margin: 0,
    fontSize: '14px',
    lineHeight: 1.5,
  },
  cursor: {
    animation: 'blink 1s step-end infinite',
    color: 'var(--slate)',
  },
  proposalBox: {
    margin: '0 16px 12px',
    padding: '16px',
    backgroundColor: 'var(--sage)10',
    border: '2px solid var(--sage)40',
    borderRadius: '12px',
  },
  proposalHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
    color: 'var(--sage)',
    fontWeight: '600',
    fontSize: '13px',
  },
  proposalText: {
    fontSize: '15px',
    color: 'var(--charcoal)',
    margin: '0 0 16px 0',
    lineHeight: 1.5,
    fontStyle: 'italic',
  },
  proposalActions: {
    display: 'flex',
    gap: '12px',
  },
  acceptButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 20px',
    backgroundColor: 'var(--sage)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  editButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 20px',
    backgroundColor: '#FFFFFF',
    color: 'var(--charcoal)',
    border: '1px solid var(--cloud)',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  inputContainer: {
    display: 'flex',
    gap: '8px',
    padding: '12px 16px',
    borderTop: '1px solid var(--cloud)',
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    border: '1px solid var(--cloud)',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
  },
  sendButton: {
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--earth)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  spinner: {
    animation: 'spin 1s linear infinite',
  },
  directInputContainer: {
    flex: 1,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  directTextarea: {
    flex: 1,
    padding: '12px',
    border: '1px solid var(--cloud)',
    borderRadius: '8px',
    fontSize: '14px',
    resize: 'none',
    outline: 'none',
    minHeight: '100px',
  },
  directSaveButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: 'var(--sage)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    alignSelf: 'flex-end',
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid var(--cloud)',
    backgroundColor: 'var(--cream)',
  },
  footerActions: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
  },
  continueButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '12px 24px',
    backgroundColor: 'var(--earth)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  skipButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '12px 20px',
    backgroundColor: '#FFFFFF',
    color: 'var(--charcoal)',
    border: '1px solid var(--cloud)',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  skipAllButton: {
    padding: '12px 20px',
    backgroundColor: 'transparent',
    color: 'var(--coral)',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    marginLeft: 'auto',
  },
  progress: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
  },
  progressDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    transition: 'all 0.3s ease',
  },
};

// Add keyframe animations via style tag
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes blink {
      50% { opacity: 0; }
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);
}
