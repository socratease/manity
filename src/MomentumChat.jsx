import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock,
  MessageCircle,
  RotateCcw,
  Send,
  Sparkles,
  TrendingUp,
  User,
  X
} from 'lucide-react';

export default function MomentumChat({
  styles,
  portfolioMinimized,
  setPortfolioMinimized,
  thrustConversation,
  thrustIsRequesting,
  thrustPendingActions,
  thrustError,
  thrustDraft,
  handleThrustDraftChange,
  showThrustTagSuggestions,
  thrustTagSearchTerm,
  selectedThrustTagIndex,
  insertThrustTag,
  setSelectedThrustTagIndex,
  setShowThrustTagSuggestions,
  getAllTags,
  handleSendThrustMessage,
  setFocusedField,
  setThrustDraft,
  activeProjectInChat,
  setActiveProjectInChat,
  visibleProjects,
  recentlyUpdatedProjects,
  expandedMomentumProjects,
  setExpandedMomentumProjects,
  expandedActionMessages,
  setExpandedActionMessages,
  getProjectDueSoonTasks,
  formatDateTime,
  renderRichTextWithTags,
  hoveredMessageProject,
  setHoveredMessageProject,
  getPriorityColor,
  describeActionPreview,
  undoThrustAction
}) {
  return (
    <div style={styles.momentumContainer}>
      <div
        style={{
          ...styles.momentumChatArea,
          flex: portfolioMinimized ? 1 : '1 1 65%'
        }}
      >
        <div style={styles.momentumChatHeader}>
          <div style={styles.momentumHeaderLeft}>
            <div style={styles.momentumAvatar}>
              <Sparkles size={18} style={{ color: '#FFFFFF' }} />
            </div>
            <div>
              <div style={styles.momentumHeaderTitle}>Momentum</div>
              <div style={styles.momentumHeaderSubtitle}>
                {thrustIsRequesting ? 'thinking...' : 'AI Project Manager'}
              </div>
            </div>
          </div>
          <button
            style={styles.portfolioToggleButton}
            onClick={() => setPortfolioMinimized(!portfolioMinimized)}
            title={portfolioMinimized ? 'Show portfolio' : 'Hide portfolio'}
          >
            <TrendingUp size={16} />
            <span>{portfolioMinimized ? 'Portfolio' : 'Hide'}</span>
            <ChevronRight
              size={14}
              style={{
                transform: portfolioMinimized ? 'rotate(0deg)' : 'rotate(180deg)',
                transition: 'transform 0.2s ease'
              }}
            />
          </button>
        </div>

        <div style={styles.momentumMessagesContainer}>
          {thrustConversation.length === 0 ? (
            <div style={styles.momentumEmptyChat}>
              <div style={styles.momentumEmptyIcon}>
                <MessageCircle size={48} style={{ color: 'var(--cloud)' }} />
              </div>
              <div style={styles.momentumEmptyTitle}>Start a conversation</div>
              <div style={styles.momentumEmptyText}>
                Share updates, ask questions, or request changes to your projects.
                Momentum can add tasks, update statuses, and keep your portfolio organized.
              </div>
              <div style={styles.momentumSuggestions}>
                {['What tasks are overdue?', 'Add a new task to...', 'Update the status of...'].map((suggestion, idx) => (
                  <button
                    key={idx}
                    style={styles.momentumSuggestionChip}
                    onClick={() => setThrustDraft(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={styles.momentumMessagesList}>
              {thrustConversation.map((message, idx) => {
                const isUser = message.role === 'user';
                const messageProjects = message.updatedProjectIds || [];
                const projectsForMessage = visibleProjects.filter(p =>
                  messageProjects.includes(p.id) || messageProjects.includes(String(p.id))
                );

                return (
                  <div
                    key={message.id || idx}
                    style={{
                      ...styles.momentumMessageRow,
                      justifyContent: isUser ? 'flex-end' : 'flex-start',
                      animationDelay: `${idx * 50}ms`
                    }}
                  >
                    {!isUser && (
                      <div style={styles.momentumMessageAvatar}>
                        <Sparkles size={14} style={{ color: 'var(--earth)' }} />
                      </div>
                    )}

                    <div style={styles.momentumMessageContent}>
                      <div
                        style={{
                          ...styles.momentumBubble,
                          ...(isUser ? styles.momentumBubbleUser : styles.momentumBubbleAssistant)
                        }}
                      >
                        <div style={styles.momentumBubbleText}>
                          {renderRichTextWithTags(message.note || message.content)}
                        </div>
                        <div
                          style={{
                            ...styles.momentumBubbleTime,
                            textAlign: isUser ? 'right' : 'left'
                          }}
                        >
                          {formatDateTime(message.date)}
                        </div>
                      </div>

                      {!isUser && projectsForMessage.length > 0 && (
                        <div style={styles.momentumInlineProjects}>
                          {projectsForMessage.map(project => {
                            const isActive = activeProjectInChat === project.id || activeProjectInChat === String(project.id);
                            const isHovered = hoveredMessageProject === project.id;

                            return (
                              <div
                                key={project.id}
                                style={{
                                  ...styles.momentumInlineProjectCard,
                                  ...(isActive ? styles.momentumInlineProjectCardActive : {}),
                                  ...(isHovered ? styles.momentumInlineProjectCardHover : {})
                                }}
                                onMouseEnter={() => setHoveredMessageProject(project.id)}
                                onMouseLeave={() => setHoveredMessageProject(null)}
                                onClick={() => {
                                  setActiveProjectInChat(project.id);
                                  setPortfolioMinimized(false);
                                  setExpandedMomentumProjects(prev => ({
                                    ...prev,
                                    [String(project.id)]: true
                                  }));
                                }}
                              >
                                <div style={styles.momentumInlineProjectHeader}>
                                  <div style={styles.momentumInlineProjectIcon}>
                                    <TrendingUp size={12} />
                                  </div>
                                  <span style={styles.momentumInlineProjectName}>{project.name}</span>
                                  <div
                                    style={{
                                      ...styles.momentumInlineProjectBadge,
                                      backgroundColor: getPriorityColor(project.priority) + '20',
                                      color: getPriorityColor(project.priority)
                                    }}
                                  >
                                    {project.priority}
                                  </div>
                                </div>
                                <div style={styles.momentumInlineProjectMeta}>
                                  <span style={styles.momentumInlineProjectStatus}>{project.status}</span>
                                  <span style={styles.momentumInlineProjectProgress}>
                                    {project.progress}% complete
                                  </span>
                                </div>
                                <div style={styles.momentumInlineProjectConnector}>
                                  <ChevronRight size={12} />
                                  <span>View in portfolio</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {!isUser && message.actionResults && message.actionResults.length > 0 && (
                        <div style={styles.momentumActionPills}>
                          {message.actionResults.slice(0, 3).map((action, actionIdx) => (
                            <div
                              key={`${message.id}-action-${actionIdx}`}
                              style={{
                                ...styles.momentumActionPill,
                                opacity: action.undone ? 0.5 : 1
                              }}
                            >
                              <CheckCircle2 size={12} style={{ color: action.undone ? 'var(--stone)' : 'var(--sage)' }} />
                              <span>{action.label}</span>
                              {action.deltas && action.deltas.length > 0 && !action.undone && (
                                <button
                                  style={styles.momentumActionPillUndo}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    undoThrustAction(message.id, actionIdx);
                                  }}
                                  title="Undo"
                                >
                                  <RotateCcw size={10} />
                                </button>
                              )}
                            </div>
                          ))}
                          {message.actionResults.length > 3 && (
                            <button
                              style={styles.momentumMoreActions}
                              onClick={() => setExpandedActionMessages(prev => ({
                                ...prev,
                                [message.id]: !prev[message.id]
                              }))}
                            >
                              +{message.actionResults.length - 3} more
                            </button>
                          )}
                        </div>
                      )}

                      {!isUser && expandedActionMessages[message.id] && message.actionResults && message.actionResults.length > 3 && (
                        <div style={styles.momentumExpandedActions}>
                          {message.actionResults.slice(3).map((action, actionIdx) => (
                            <div
                              key={`${message.id}-action-exp-${actionIdx}`}
                              style={{
                                ...styles.momentumExpandedAction,
                                opacity: action.undone ? 0.5 : 1
                              }}
                            >
                              <div style={styles.momentumExpandedActionRow}>
                                <div style={styles.momentumExpandedActionIcon}>
                                  <CheckCircle2 size={12} />
                                </div>
                                <div style={styles.momentumExpandedActionContent}>
                                  <div style={styles.momentumExpandedActionTitle}>{action.label}</div>
                                  {action.deltas && action.deltas.length > 0 && (
                                    <ul style={styles.momentumDeltasList}>
                                      {action.deltas.map((delta, deltaIdx) => (
                                        <li key={deltaIdx}>{delta}</li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                                {action.deltas && action.deltas.length > 0 && !action.undone && (
                                  <button
                                    style={styles.momentumExpandedUndo}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      undoThrustAction(message.id, actionIdx + 3);
                                    }}
                                    title="Undo"
                                  >
                                    <RotateCcw size={12} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {thrustIsRequesting && (
                <div style={styles.momentumMessageRow}>
                  <div style={styles.momentumMessageAvatar}>
                    <Sparkles size={14} style={{ color: 'var(--earth)' }} />
                  </div>
                  <div style={styles.momentumTypingIndicator}>
                    <div style={styles.momentumTypingDot} />
                    <div style={{ ...styles.momentumTypingDot, animationDelay: '0.2s' }} />
                    <div style={{ ...styles.momentumTypingDot, animationDelay: '0.4s' }} />
                  </div>
                </div>
              )}

              {thrustPendingActions.length > 0 && (
                <div style={styles.momentumMessageRow}>
                  <div style={styles.momentumMessageAvatar}>
                    <Sparkles size={14} style={{ color: 'var(--earth)' }} />
                  </div>
                  <div style={styles.momentumPendingCard}>
                    <div style={styles.momentumPendingHeader}>
                      <Clock size={14} style={{ color: 'var(--amber)' }} />
                      <span>Applying {thrustPendingActions.length} action{thrustPendingActions.length > 1 ? 's' : ''}...</span>
                    </div>
                    <div style={styles.momentumPendingList}>
                      {thrustPendingActions.map((action, idx) => (
                        <div key={idx} style={styles.momentumPendingItem}>
                          <Circle size={8} style={{ color: 'var(--amber)' }} />
                          <span>{describeActionPreview(action)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {thrustError && (
                <div style={styles.momentumErrorCard}>
                  <AlertCircle size={16} style={{ color: 'var(--coral)' }} />
                  <span>{thrustError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={styles.momentumInputArea}>
          <div style={styles.momentumInputWrapper}>
            <textarea
              value={thrustDraft}
              onChange={handleThrustDraftChange}
              onFocus={() => setFocusedField('thrust-draft')}
              onBlur={() => setFocusedField(null)}
              onKeyDown={(e) => {
                if (showThrustTagSuggestions) {
                  const filteredTags = getAllTags()
                    .filter(tag =>
                      tag.display.toLowerCase().includes(thrustTagSearchTerm.toLowerCase())
                    )
                    .slice(0, 8);

                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedThrustTagIndex(prev =>
                      prev < filteredTags.length - 1 ? prev + 1 : prev
                    );
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedThrustTagIndex(prev => prev > 0 ? prev - 1 : 0);
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
              placeholder="Message Momentum... (@ to mention)"
              style={styles.momentumInput}
              rows={1}
            />

            {showThrustTagSuggestions && (
              <div style={styles.momentumTagSuggestions}>
                {getAllTags()
                  .filter(tag =>
                    tag.display.toLowerCase().includes(thrustTagSearchTerm.toLowerCase())
                  )
                  .slice(0, 6)
                  .map((tag, idx) => (
                    <div
                      key={idx}
                      style={{
                        ...styles.momentumTagItem,
                        backgroundColor: idx === selectedThrustTagIndex ? 'var(--cream)' : 'transparent'
                      }}
                      onClick={() => insertThrustTag(tag)}
                      onMouseEnter={() => setSelectedThrustTagIndex(idx)}
                    >
                      <span style={{
                        ...styles.momentumTagType,
                        backgroundColor:
                          tag.type === 'person' ? 'var(--sage)' + '25' :
                          tag.type === 'project' ? 'var(--earth)' + '25' :
                          'var(--amber)' + '25',
                        color:
                          tag.type === 'person' ? 'var(--sage)' :
                          tag.type === 'project' ? 'var(--earth)' :
                          'var(--amber)'
                      }}>
                        {tag.type === 'person' ? <User size={10} /> : <TrendingUp size={10} />}
                      </span>
                      <span style={styles.momentumTagName}>{tag.display}</span>
                    </div>
                  ))}
              </div>
            )}

            <button
              onClick={() => handleSendThrustMessage(thrustDraft)}
              disabled={!thrustDraft.trim() || thrustIsRequesting}
              style={{
                ...styles.momentumSendButton,
                opacity: thrustDraft.trim() && !thrustIsRequesting ? 1 : 0.4,
                cursor: thrustDraft.trim() && !thrustIsRequesting ? 'pointer' : 'not-allowed'
              }}
              title="Send message"
            >
              <Send size={18} />
            </button>
          </div>
          <div style={styles.momentumInputHint}>
            Press Enter to send, Shift+Enter for new line
          </div>
        </div>
      </div>

      <div
        style={{
          ...styles.momentumPortfolioPanel,
          ...(portfolioMinimized ? styles.momentumPortfolioPanelMinimized : {})
        }}
      >
        {!portfolioMinimized && (
          <>
            <div style={styles.momentumPortfolioHeader}>
              <div style={styles.momentumPortfolioTitle}>
                <TrendingUp size={16} style={{ color: 'var(--earth)' }} />
                <span>Portfolio</span>
              </div>
              <button
                style={styles.momentumPortfolioClose}
                onClick={() => setPortfolioMinimized(true)}
              >
                <X size={16} />
              </button>
            </div>

            <div style={styles.momentumPortfolioContent}>
              {visibleProjects.length > 0 ? (
                [...visibleProjects].sort((a, b) => {
                  const aActive = activeProjectInChat === a.id || activeProjectInChat === String(a.id);
                  const bActive = activeProjectInChat === b.id || activeProjectInChat === String(b.id);
                  if (aActive && !bActive) return -1;
                  if (!aActive && bActive) return 1;
                  const aUpdated = recentlyUpdatedProjects.has(a.id);
                  const bUpdated = recentlyUpdatedProjects.has(b.id);
                  if (aUpdated && !bUpdated) return -1;
                  if (!aUpdated && bUpdated) return 1;
                  return 0;
                }).map(project => {
                  const projectId = String(project.id);
                  const isExpanded = expandedMomentumProjects[projectId] ?? false;
                  const isActive = activeProjectInChat === project.id || activeProjectInChat === projectId;
                  const isRecentlyUpdated = recentlyUpdatedProjects.has(project.id);
                  const dueSoonTasks = getProjectDueSoonTasks(project);
                  const recentUpdates = project.recentActivity.slice(0, 2);

                  return (
                    <div
                      key={project.id}
                      style={{
                        ...styles.momentumPortfolioCard,
                        ...(isActive ? styles.momentumPortfolioCardActive : {}),
                        ...(isRecentlyUpdated ? styles.momentumPortfolioCardHighlight : {})
                      }}
                    >
                      <button
                        style={styles.momentumPortfolioCardHeader}
                        onClick={() => {
                          setExpandedMomentumProjects(prev => ({
                            ...prev,
                            [projectId]: !isExpanded
                          }));
                          setActiveProjectInChat(project.id);
                        }}
                      >
                        <div style={styles.momentumPortfolioCardTitle}>
                          <div
                            style={{
                              ...styles.momentumPortfolioCardDot,
                              backgroundColor: getPriorityColor(project.priority)
                            }}
                          />
                          <span>{project.name}</span>
                        </div>
                        <div style={styles.momentumPortfolioCardMeta}>
                          <span style={styles.momentumPortfolioCardStatus}>{project.status}</span>
                          <ChevronDown
                            size={14}
                            style={{
                              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s ease',
                              color: 'var(--stone)'
                            }}
                          />
                        </div>
                      </button>

                      <div style={styles.momentumPortfolioProgress}>
                        <div
                          style={{
                            ...styles.momentumPortfolioProgressFill,
                            width: `${project.progress || 0}%`,
                            backgroundColor: getPriorityColor(project.priority)
                          }}
                        />
                      </div>

                      {isExpanded && (
                        <div style={styles.momentumPortfolioCardBody}>
                          <div style={styles.momentumPortfolioSection}>
                            <div style={styles.momentumPortfolioSectionTitle}>Recent Updates</div>
                            {recentUpdates.length > 0 ? (
                              recentUpdates.map((activity, idx) => (
                                <div key={activity.id || idx} style={styles.momentumPortfolioActivity}>
                                  <div style={styles.momentumPortfolioActivityHeader}>
                                    <span style={styles.momentumPortfolioActivityAuthor}>{activity.author}</span>
                                    <span style={styles.momentumPortfolioActivityTime}>{formatDateTime(activity.date)}</span>
                                  </div>
                                  <div style={styles.momentumPortfolioActivityText}>{activity.note}</div>
                                </div>
                              ))
                            ) : (
                              <div style={styles.momentumPortfolioEmpty}>No updates yet</div>
                            )}
                          </div>

                          {dueSoonTasks.length > 0 && (
                            <div style={styles.momentumPortfolioSection}>
                              <div
                                style={{
                                  ...styles.momentumPortfolioSectionTitle,
                                  color: dueSoonTasks.some(t => t.dueDateInfo.isOverdue) ? 'var(--coral)' : 'var(--amber)'
                                }}
                              >
                                <AlertCircle size={12} />
                                <span>Due Soon</span>
                              </div>
                              {dueSoonTasks.slice(0, 2).map((task, idx) => (
                                <div key={idx} style={styles.momentumPortfolioDueTask}>
                                  <span>{task.title}</span>
                                  <span style={{ color: task.dueDateInfo.color, fontSize: '11px' }}>
                                    {task.dueDateInfo.text}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div style={styles.momentumPortfolioEmpty}>
                  No projects to display
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
