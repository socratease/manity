import React, { useMemo } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  MessageCircle,
  RotateCcw,
  Send,
  Sparkles,
  TrendingUp
} from 'lucide-react';

export default function MomentumChatNew({
  styles,
  thrustConversation = [],
  thrustDraft,
  handleThrustDraftChange,
  handleSendThrustMessage,
  showThrustTagSuggestions,
  thrustTagSearchTerm,
  selectedThrustTagIndex,
  insertThrustTag,
  setSelectedThrustTagIndex,
  setShowThrustTagSuggestions,
  getAllTags,
  thrustIsRequesting,
  thrustPendingActions = [],
  thrustError,
  formatDateTime,
  renderRichTextWithTags,
  visibleProjects = [],
  recentlyUpdatedProjects = new Set(),
  activeProjectInChat,
  setActiveProjectInChat,
  hoveredMessageProject,
  setHoveredMessageProject,
  getPriorityColor,
  getStatusColor,
  describeActionPreview,
  undoThrustAction,
  expandedActionMessages,
  setExpandedActionMessages,
  getProjectDueSoonTasks,
  portfolioMinimized,
  setPortfolioMinimized
}) {
  const filteredTags = useMemo(() => {
    if (!showThrustTagSuggestions) return [];
    return getAllTags()
      .filter(tag => tag.display.toLowerCase().includes((thrustTagSearchTerm || '').toLowerCase()))
      .slice(0, 8);
  }, [getAllTags, showThrustTagSuggestions, thrustTagSearchTerm]);

  const resolveProjectsForMessage = (message) => {
    const ids = message.updatedProjectIds || [];
    return visibleProjects.filter(project => ids.includes(project.id) || ids.includes(String(project.id)));
  };

  const renderActionList = (message) => {
    if (!message.actionResults || message.actionResults.length === 0) return null;

    const primaryActions = message.actionResults.slice(0, 3);
    const remainingCount = message.actionResults.length - primaryActions.length;

    return (
      <div style={styles.momentumV2ActionRow}>
        {primaryActions.map((action, idx) => (
          <div
            key={`${message.id}-action-${idx}`}
            style={{
              ...styles.momentumV2ActionPill,
              opacity: action.undone ? 0.55 : 1
            }}
          >
            <CheckCircle2 size={12} />
            <span>{action.label}</span>
            {action.deltas && action.deltas.length > 0 && !action.undone && (
              <button
                style={styles.momentumV2ActionUndo}
                onClick={(e) => {
                  e.stopPropagation();
                  undoThrustAction(message.id, idx);
                }}
                title="Undo"
              >
                <RotateCcw size={10} />
              </button>
            )}
          </div>
        ))}
        {remainingCount > 0 && (
          <button
            style={styles.momentumV2MoreActions}
            onClick={() => setExpandedActionMessages(prev => ({
              ...prev,
              [message.id]: !prev[message.id]
            }))}
          >
            +{remainingCount} more
          </button>
        )}
      </div>
    );
  };

  const renderExpandedActions = (message) => {
    if (!expandedActionMessages[message.id] || !message.actionResults || message.actionResults.length <= 3) return null;

    return (
      <div style={styles.momentumV2ExpandedActions}>
        {message.actionResults.slice(3).map((action, idx) => (
          <div key={`${message.id}-expanded-${idx}`} style={{ ...styles.momentumV2ExpandedAction, opacity: action.undone ? 0.55 : 1 }}>
            <div style={styles.momentumV2ExpandedHeader}>
              <CheckCircle2 size={14} />
              <div style={styles.momentumV2ExpandedTitle}>{action.label}</div>
              {action.deltas && action.deltas.length > 0 && !action.undone && (
                <button
                  style={styles.momentumV2ExpandedUndo}
                  onClick={(e) => {
                    e.stopPropagation();
                    undoThrustAction(message.id, idx + 3);
                  }}
                  title="Undo"
                >
                  <RotateCcw size={12} />
                </button>
              )}
            </div>
            {action.deltas && action.deltas.length > 0 && (
              <ul style={styles.momentumV2DeltaList}>
                {action.deltas.map((delta, deltaIdx) => (
                  <li key={deltaIdx}>{delta}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={styles.momentumV2Container}>
      <div style={{ ...styles.momentumV2ChatPanel, flex: portfolioMinimized ? 1 : '1 1 60%' }}>
        <div style={styles.momentumV2Header}>
          <div style={styles.momentumV2TitleGroup}>
            <div style={styles.momentumV2Avatar}>
              <Sparkles size={18} style={{ color: '#fff' }} />
            </div>
            <div>
              <div style={styles.momentumV2Title}>Momentum</div>
              <div style={styles.momentumV2Subtitle}>{thrustIsRequesting ? 'Analyzing portfolio...' : 'AI Project Partner'}</div>
            </div>
          </div>
          <button
            style={styles.momentumV2Toggle}
            onClick={() => setPortfolioMinimized(!portfolioMinimized)}
          >
            <TrendingUp size={16} />
            <span>{portfolioMinimized ? 'Project canvas' : 'Hide canvas'}</span>
            <ChevronRight
              size={14}
              style={{
                transform: portfolioMinimized ? 'rotate(0deg)' : 'rotate(180deg)',
                transition: 'transform 0.2s ease'
              }}
            />
          </button>
        </div>

        <div style={styles.momentumV2Content}>
          {thrustConversation.length === 0 ? (
            <div style={styles.momentumV2Empty}>
              <div style={styles.momentumV2EmptyIcon}>
                <MessageCircle size={48} />
              </div>
              <div style={styles.momentumV2EmptyTitle}>Start a conversation</div>
              <div style={styles.momentumV2EmptyText}>
                Ask Momentum to update project status, add tasks, or summarize progress.
              </div>
              <div style={styles.momentumV2Suggestions}>
                {['What changed today?', 'Summarize projects due this week', 'Add a task to Website Redesign'].map((suggestion, idx) => (
                  <button key={idx} style={styles.momentumV2SuggestionChip} onClick={() => handleSendThrustMessage(suggestion)}>
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={styles.momentumV2MessageList}>
              {thrustConversation.map((message, idx) => {
                const isUser = message.role === 'user';
                const projectsForMessage = resolveProjectsForMessage(message);

                return (
                  <div
                    key={message.id || idx}
                    style={{
                      ...styles.momentumV2MessageRow,
                      flexDirection: isUser ? 'row-reverse' : 'row'
                    }}
                  >
                    <div
                      style={{
                        ...styles.momentumV2MessageAvatar,
                        background: isUser ? 'linear-gradient(135deg, var(--earth) 0%, var(--sage) 100%)' : 'linear-gradient(135deg, var(--charcoal) 0%, var(--earth) 100%)'
                      }}
                    >
                      {isUser ? message.author?.slice(0, 1) || 'You'[0] : <Sparkles size={14} style={{ color: '#fff' }} />}
                    </div>

                    <div style={{ ...styles.momentumV2Bubble, ...(isUser ? styles.momentumV2BubbleUser : styles.momentumV2BubbleAssistant) }}>
                      <div style={styles.momentumV2MetaRow}>
                        <div style={styles.momentumV2MetaLeft}>
                          <span style={styles.momentumV2Author}>{message.author || (isUser ? 'You' : 'Momentum')}</span>
                          <span style={styles.momentumV2Time}>{formatDateTime(message.date)}</span>
                        </div>
                        {!isUser && recentlyUpdatedProjects.size > 0 && (
                          <div style={styles.momentumV2UpdateBadge}>
                            <Sparkles size={12} /> Updated portfolio
                          </div>
                        )}
                      </div>

                      <div style={styles.momentumV2Text}>{renderRichTextWithTags(message.note || message.content)}</div>

                      {projectsForMessage.length > 0 && (
                        <div style={styles.momentumV2LinkedProjects}>
                          {projectsForMessage.map(project => {
                            const projectId = String(project.id);
                            const isActive = activeProjectInChat === projectId || activeProjectInChat === project.id;
                            const isHovered = hoveredMessageProject === project.id;
                            const statusColor = getStatusColor(project.status);

                            return (
                              <button
                                key={project.id}
                                style={{
                                  ...styles.momentumV2LinkedProject,
                                  borderColor: isActive ? getPriorityColor(project.priority) : 'var(--cloud)',
                                  boxShadow: recentlyUpdatedProjects.has(project.id) ? '0 8px 20px rgba(122, 155, 118, 0.25)' : 'none',
                                  transform: isActive || isHovered ? 'translateY(-2px)' : 'translateY(0)',
                                }}
                                onMouseEnter={() => setHoveredMessageProject(project.id)}
                                onMouseLeave={() => setHoveredMessageProject(null)}
                                onClick={() => {
                                  setActiveProjectInChat(project.id);
                                  setPortfolioMinimized(false);
                                }}
                              >
                                <div style={styles.momentumV2LinkedTop}>
                                  <span style={styles.momentumV2LinkedName}>{project.name}</span>
                                  <span style={{ ...styles.momentumV2StatusBadge, backgroundColor: statusColor + '20', color: statusColor }}>
                                    {project.status}
                                  </span>
                                </div>
                                <div style={styles.momentumV2LinkedMeta}>
                                  <div style={styles.momentumV2ProgressTrack}>
                                    <div style={{ ...styles.momentumV2ProgressFill, backgroundColor: getPriorityColor(project.priority), width: `${project.progress || 0}%` }} />
                                  </div>
                                  <span style={styles.momentumV2ProgressText}>{project.progress}%</span>
                                </div>
                                <div style={styles.momentumV2LinkedFooter}>
                                  <ChevronRight size={12} />
                                  <span>Jump to project</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {!isUser && renderActionList(message)}
                      {renderExpandedActions(message)}
                    </div>
                  </div>
                );
              })}

              {thrustIsRequesting && (
                <div style={styles.momentumV2TypingRow}>
                  <div style={styles.momentumV2MessageAvatar}>
                    <Sparkles size={14} style={{ color: '#fff' }} />
                  </div>
                  <div style={styles.momentumV2TypingDots}>
                    <div style={styles.momentumV2Dot} />
                    <div style={{ ...styles.momentumV2Dot, animationDelay: '0.2s' }} />
                    <div style={{ ...styles.momentumV2Dot, animationDelay: '0.4s' }} />
                  </div>
                </div>
              )}

              {thrustPendingActions.length > 0 && (
                <div style={styles.momentumV2PendingCard}>
                  <div style={styles.momentumV2PendingHeader}>
                    <Clock size={14} />
                    <span>Applying {thrustPendingActions.length} action{thrustPendingActions.length > 1 ? 's' : ''}...</span>
                  </div>
                  <div style={styles.momentumV2PendingList}>
                    {thrustPendingActions.map((action, idx) => (
                      <div key={idx} style={styles.momentumV2PendingItem}>
                        <Circle size={8} />
                        <span>{describeActionPreview(action)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {thrustError && (
                <div style={styles.momentumV2Error}>
                  <AlertCircle size={14} />
                  <span>{thrustError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={styles.momentumV2Composer}>
          <div style={styles.momentumV2InputShell}>
            <textarea
              value={thrustDraft}
              onChange={handleThrustDraftChange}
              onKeyDown={(e) => {
                if (showThrustTagSuggestions) {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedThrustTagIndex(prev => (prev < filteredTags.length - 1 ? prev + 1 : prev));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedThrustTagIndex(prev => (prev > 0 ? prev - 1 : 0));
                  } else if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (filteredTags[selectedThrustTagIndex]) {
                      insertThrustTag(filteredTags[selectedThrustTagIndex]);
                    }
                    return;
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setShowThrustTagSuggestions(false);
                  }
                } else if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendThrustMessage(thrustDraft);
                }
              }}
              placeholder="Ask Momentum to plan, update, or summarize... (@ to mention)"
              style={styles.momentumV2Input}
              rows={1}
            />

            {showThrustTagSuggestions && (
              <div style={styles.momentumV2TagList}>
                {filteredTags.map((tag, idx) => (
                  <button
                    key={idx}
                    style={{
                      ...styles.momentumV2TagItem,
                      backgroundColor: idx === selectedThrustTagIndex ? 'var(--cream)' : '#fff'
                    }}
                    onMouseEnter={() => setSelectedThrustTagIndex(idx)}
                    onClick={() => insertThrustTag(tag)}
                  >
                    <span
                      style={{
                        ...styles.momentumV2TagType,
                        backgroundColor: tag.type === 'person' ? 'var(--sage)20' : 'var(--earth)20',
                        color: tag.type === 'person' ? 'var(--sage)' : 'var(--earth)'
                      }}
                    >
                      {tag.type === 'person' ? '@' : '#'}
                    </span>
                    <span style={styles.momentumV2TagName}>{tag.display}</span>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => handleSendThrustMessage(thrustDraft)}
              disabled={!thrustDraft.trim() || thrustIsRequesting}
              style={{
                ...styles.momentumV2Send,
                opacity: thrustDraft.trim() && !thrustIsRequesting ? 1 : 0.5
              }}
            >
              <Send size={18} />
            </button>
          </div>
          <div style={styles.momentumV2Hint}>Enter to send • Shift+Enter for newline</div>
        </div>
      </div>

      <div style={{ ...styles.momentumV2Canvas, ...(portfolioMinimized ? styles.momentumV2CanvasCollapsed : {}) }}>
        {portfolioMinimized ? (
          <div style={styles.momentumV2CanvasEmpty}>
            <p style={styles.momentumV2CanvasText}>Project canvas hidden</p>
            <button style={styles.momentumV2CanvasButton} onClick={() => setPortfolioMinimized(false)}>
              <TrendingUp size={14} /> Show projects
            </button>
          </div>
        ) : (
          <>
            <div style={styles.momentumV2CanvasHeader}>
              <div>
                <div style={styles.momentumV2CanvasTitle}>Project canvas</div>
                <div style={styles.momentumV2CanvasSubtitle}>Live updates from Momentum</div>
              </div>
              <button style={styles.momentumV2CanvasClose} onClick={() => setPortfolioMinimized(true)}>
                Hide
              </button>
            </div>

            <div style={styles.momentumV2ProjectGrid}>
              {visibleProjects.map(project => {
                const isActive = activeProjectInChat === project.id || activeProjectInChat === String(project.id);
                const isUpdated = recentlyUpdatedProjects.has(project.id);
                const dueSoonTasks = getProjectDueSoonTasks ? getProjectDueSoonTasks(project) : [];
                const statusColor = getStatusColor(project.status);

                return (
                  <button
                    key={project.id}
                    style={{
                      ...styles.momentumV2ProjectCard,
                      borderColor: isActive ? getPriorityColor(project.priority) : 'var(--cloud)',
                      boxShadow: isUpdated ? '0 12px 30px rgba(122, 155, 118, 0.25)' : '0 8px 24px rgba(0,0,0,0.04)',
                      transform: isActive ? 'translateY(-2px)' : 'translateY(0)'
                    }}
                    onClick={() => setActiveProjectInChat(project.id)}
                  >
                    <div style={styles.momentumV2ProjectHeader}>
                      <div style={styles.momentumV2ProjectName}>{project.name}</div>
                      <div style={{ ...styles.momentumV2Priority, color: getPriorityColor(project.priority) }}>{project.priority}</div>
                    </div>
                    <div style={styles.momentumV2StatusRow}>
                      <span style={{ ...styles.momentumV2StatusBadge, backgroundColor: statusColor + '20', color: statusColor }}>
                        {project.status}
                      </span>
                      {project.targetDate && <span style={styles.momentumV2Target}>{project.targetDate}</span>}
                    </div>
                    <div style={styles.momentumV2ProgressTrack}>
                      <div style={{ ...styles.momentumV2ProgressFill, backgroundColor: getPriorityColor(project.priority), width: `${project.progress || 0}%` }} />
                    </div>
                    <div style={styles.momentumV2ProgressMeta}>
                      <span>{project.progress}% complete</span>
                      {project.recentActivity?.[0] && (
                        <span style={styles.momentumV2Recent}>Last update {formatDateTime(project.recentActivity[0].date)}</span>
                      )}
                    </div>

                    {dueSoonTasks.length > 0 ? (
                      <div style={styles.momentumV2DueList}>
                        {dueSoonTasks.slice(0, 2).map((task, idx) => (
                          <div key={idx} style={styles.momentumV2DueItem}>
                            <span>{task.title}</span>
                            <span style={{ color: task.dueDateInfo.color }}>{task.dueDateInfo.text}</span>
                          </div>
                        ))}
                        {dueSoonTasks.length > 2 && (
                          <div style={styles.momentumV2DueMore}>+{dueSoonTasks.length - 2} more tasks</div>
                        )}
                      </div>
                    ) : (
                      <div style={styles.momentumV2Quiet}>No urgent tasks</div>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
