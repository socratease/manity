import React from 'react';
import { ArrowLeft, Clock, Users, MessageSquare, Trash2, Send, Lock, Unlock, Circle, Check, X, Plus } from 'lucide-react';
import ForceDirectedTimeline from '../components/ForceDirectedTimeline';

export default function ProjectDetailView({
  project,
  onBack,
  renderRichTextWithTags,
  activityEditEnabled,
  toggleActivityEditing,
  activityEdits,
  updateActivityNote,
  deleteActivity,
  parseTaggedText,
  formatDateTime,
  setFocusedField,
  renderEditingHint,
  newUpdate,
  handleProjectUpdateChange,
  showProjectTagSuggestions,
  projectTagSearchTerm,
  selectedProjectTagIndex,
  setSelectedProjectTagIndex,
  insertProjectTag,
  handleAddUpdate,
  getAllTags,
  renderCtrlEnterHint,
  projectUpdateInputRef,
  getPriorityColor,
  getStatusColor,
  getProjectProgress,
  getProjectDueSoonTasks,
  addingNewTask,
  setAddingNewTask,
  newTaskTitle,
  setNewTaskTitle,
  newTaskDueDate,
  setNewTaskDueDate,
  handleAddTask
}) {
  if (!project) return null;

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
    <div style={styles.detailsContainer}>
      <button onClick={onBack} style={styles.backButton}>
        <ArrowLeft size={18} />
        Back to Portfolio
      </button>

      <div style={styles.detailsHeader}>
        <div>
          <h1 style={styles.detailsTitle}>{project.name}</h1>
          <div style={styles.descriptionSection}>
            <span style={styles.descriptionLabel}>Description</span>
            <p style={styles.detailsDescription}>{renderRichTextWithTags(project.description)}</p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              ...styles.priorityBadgeLarge,
              backgroundColor:
                project.priority === 'high' ? 'var(--coral)' + '20' :
                project.priority === 'medium' ? 'var(--amber)' + '20' :
                'var(--sage)' + '20',
              color:
                project.priority === 'high' ? 'var(--coral)' :
                project.priority === 'medium' ? 'var(--amber)' :
                'var(--sage)'
            }}
          >
            {project.priority} Priority
          </div>
        </div>
      </div>

      <div style={styles.compactInfoBar}>
        <div style={styles.compactCard}>
          <h4 style={styles.compactCardTitle}>Status & Timeline</h4>
          <div style={styles.compactInfoGrid}>
            <div style={styles.compactInfoItem}>
              <span style={styles.compactInfoLabel}>Status:</span>
              <span style={{
                ...styles.statusBadgeSmall,
                backgroundColor:
                  project.status === 'active' ? 'var(--sage)' + '20' :
                  project.status === 'planning' ? 'var(--amber)' + '20' :
                  project.status === 'completed' ? 'var(--earth)' + '20' :
                  'var(--stone)' + '20',
                color:
                  project.status === 'active' ? 'var(--sage)' :
                  project.status === 'planning' ? 'var(--amber)' :
                  project.status === 'completed' ? 'var(--earth)' :
                  'var(--stone)'
              }}>
                {project.status}
              </span>
            </div>
            <div style={styles.compactInfoItem}>
              <span style={styles.compactInfoLabel}>Target:</span>
              <span style={styles.compactInfoValue}>
                {project.targetDate ? new Date(project.targetDate).toLocaleDateString() : 'Not set'}
              </span>
            </div>
            <div style={styles.compactInfoItem}>
              <span style={styles.compactInfoLabel}>Progress:</span>
              <span style={styles.compactInfoValue}>{getProjectProgress(project)}%</span>
            </div>
          </div>
        </div>

        <div style={styles.compactCard}>
          <h4 style={styles.compactCardTitle}>Team</h4>
          <div style={styles.stakeholderCompactList}>
            {project.stakeholders.map((person, idx) => (
              <div key={idx} style={styles.stakeholderCompactItem}>
                <div style={styles.stakeholderAvatarSmall}>
                  {person.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div style={styles.stakeholderInfo}>
                  <span style={styles.stakeholderNameSmall}>{person.name}</span>
                  <span style={styles.stakeholderTeam}>{person.team || 'Contributor'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.compactCard}>
          <h4 style={styles.compactCardTitle}>Next Actions</h4>
          <div style={styles.nextActionsCompactList}>
            {getProjectDueSoonTasks(project).length > 0 ? (
              <>
                {getProjectDueSoonTasks(project).slice(0, 3).map((task, idx) => (
                  <div key={idx} style={styles.nextActionCompactItem}>
                    <Circle size={8} style={{ color: task.dueDateInfo.color, marginTop: '6px' }} />
                    <div style={styles.nextActionCompactContent}>
                      <span style={styles.nextActionTextSmall}>{task.title}</span>
                      <span style={{
                        ...styles.nextActionDueText,
                        color: task.dueDateInfo.isOverdue ? 'var(--coral)' : 'var(--stone)'
                      }}>
                        {task.dueDateInfo.text}
                      </span>
                    </div>
                  </div>
                ))}
                {getProjectDueSoonTasks(project).length > 3 && (
                  <div style={styles.moreActionsText}>+ {getProjectDueSoonTasks(project).length - 3} more</div>
                )}
              </>
            ) : (
              <div style={styles.noTasksText}>No immediate tasks scheduled.</div>
            )}
          </div>
        </div>
      </div>

      <div style={styles.mainContentGrid}>
        {/* Left: Project Plan */}
        <div style={styles.planSection}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>Project Plan</h3>
            <p style={styles.sectionSubtitle}>Timeline and key milestones</p>
          </div>
          {renderProjectTimeline(project)}

          {/* Minimal Add Task Button */}
          <div style={{ marginTop: '16px', padding: '0 12px' }}>
              {addingNewTask ? (
                <div style={styles.inlineAddTask}>
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
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
                      if (e.key === 'Enter') {
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
                    const filteredTags = getAllTags()
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
                      // Close suggestions logic handled in parent or via state passed down
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
                  {getAllTags()
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
            {[...project.recentActivity].sort((a, b) => new Date(b.date) - new Date(a.date)).map((activity, idx) => (
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
                {idx < project.recentActivity.length - 1 && (
                  <div style={styles.activitySeparator} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
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
  noTasksText: {
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--stone)',
    fontStyle: 'italic',
    margin: 0,
  },
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
  sectionHeader: {
    marginBottom: '20px',
    paddingBottom: '12px',
    borderBottom: '1px solid var(--cloud)',
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
  activitySection: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid var(--cloud)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    height: 'fit-content',
  },
  sectionHeaderCompact: {
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
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
  timelineInputWrapper: {
    position: 'relative',
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
  activityNoteCompact: {
    fontSize: '14px',
    color: 'var(--charcoal)',
    fontFamily: "'Inter', sans-serif",
    lineHeight: '1.6',
    margin: '0',
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
  activitySeparator: {
    height: '1px',
    backgroundColor: 'var(--cloud)',
    opacity: 0.5,
  },
  inlineAddTask: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '8px',
    padding: '8px',
    backgroundColor: 'var(--cream)',
    borderRadius: '6px',
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
};
