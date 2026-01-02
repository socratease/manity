import React from 'react';
import { ArrowLeft, Clock, Users, MessageSquare, Trash2, Send, Lock, Unlock, Circle, Check, X, Plus } from 'lucide-react';
import ForceDirectedTimeline from '../components/ForceDirectedTimeline';
import './ProjectDetailView.css';

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
    <div className="project-details-container">
      <button onClick={onBack} className="back-button">
        <ArrowLeft size={18} />
        Back to Portfolio
      </button>

      <div className="details-header">
        <div>
          <h1 className="details-title">{project.name}</h1>
          <div className="description-section">
            <span className="description-label">Description</span>
            <p className="details-description">{renderRichTextWithTags(project.description)}</p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            className="priority-badge-large"
            style={{
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

      <div className="compact-info-bar">
        <div className="compact-card">
          <h4 className="compact-card-title">Status & Timeline</h4>
          <div className="compact-info-grid">
            <div className="compact-info-item">
              <span className="compact-info-label">Status:</span>
              <span className="status-badge-small" style={{
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
            <div className="compact-info-item">
              <span className="compact-info-label">Target:</span>
              <span className="compact-info-value">
                {project.targetDate ? new Date(project.targetDate).toLocaleDateString() : 'Not set'}
              </span>
            </div>
            <div className="compact-info-item">
              <span className="compact-info-label">Progress:</span>
              <span className="compact-info-value">{getProjectProgress(project)}%</span>
            </div>
          </div>
        </div>

        <div className="compact-card">
          <h4 className="compact-card-title">Team</h4>
          <div className="stakeholder-compact-list">
            {project.stakeholders.map((person, idx) => (
              <div key={idx} className="stakeholder-compact-item">
                <div className="stakeholder-avatar-small">
                  {person.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="stakeholder-info">
                  <span className="stakeholder-name-small">{person.name}</span>
                  <span className="stakeholder-team">{person.team || 'Contributor'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="compact-card">
          <h4 className="compact-card-title">Next Actions</h4>
          <div className="next-actions-compact-list">
            {getProjectDueSoonTasks(project).length > 0 ? (
              <>
                {getProjectDueSoonTasks(project).slice(0, 3).map((task, idx) => (
                  <div key={idx} className="next-action-compact-item">
                    <Circle size={8} style={{ color: task.dueDateInfo.color, marginTop: '6px' }} />
                    <div className="next-action-compact-content">
                      <span className="next-action-text-small">{task.title}</span>
                      <span className="next-action-due-text" style={{
                        color: task.dueDateInfo.isOverdue ? 'var(--coral)' : 'var(--stone)'
                      }}>
                        {task.dueDateInfo.text}
                      </span>
                    </div>
                  </div>
                ))}
                {getProjectDueSoonTasks(project).length > 3 && (
                  <div className="more-actions-text">+ {getProjectDueSoonTasks(project).length - 3} more</div>
                )}
              </>
            ) : (
              <div className="no-tasks-text">No immediate tasks scheduled.</div>
            )}
          </div>
        </div>
      </div>

      <div className="main-content-grid">
        {/* Left: Project Plan */}
        <div className="plan-section">
          <div className="section-header">
            <h3 className="section-title">Project Plan</h3>
            <p className="section-subtitle">Timeline and key milestones</p>
          </div>
          {renderProjectTimeline(project)}

          {/* Minimal Add Task Button */}
          <div style={{ marginTop: '16px', padding: '0 12px' }}>
              {addingNewTask ? (
                <div className="inline-add-task">
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
                    className="inline-add-input"
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
                    className="inline-add-date-input"
                  />
                  <button
                    onClick={handleAddTask}
                    disabled={!newTaskTitle.trim()}
                    className="inline-add-confirm"
                    style={{
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
                    className="inline-add-cancel"
                    title="Cancel (Esc)"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingNewTask(true)}
                  className="minimal-add-button"
                  title="Add new task"
                >
                  <Plus size={16} />
                </button>
              )}
            </div>
        </div>

        {/* Right: Activity Feed */}
        <div className="activity-section">
          <div className="section-header-compact">
            <h3 className="section-title">Activity</h3>
            <button
              onClick={toggleActivityEditing}
              className="activity-lock-button"
              title={activityEditEnabled ? 'Unlock to stop editing' : 'Unlock to edit activity feed'}
            >
              {activityEditEnabled ? <Unlock size={18} /> : <Lock size={18} />}
            </button>
          </div>

          {/* Add Update Section */}
          <div className="project-update-wrapper">
            <div className="timeline-input-wrapper">
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
                className="project-update-input"
              />
              {renderEditingHint('project-update')}
              {renderCtrlEnterHint('post update')}

              {/* Tag Suggestions Dropdown */}
              {showProjectTagSuggestions && (
                <div className="tag-suggestions">
                  {getAllTags()
                    .filter(tag =>
                      tag.display.toLowerCase().includes(projectTagSearchTerm.toLowerCase())
                    )
                    .slice(0, 8)
                    .map((tag, idx) => (
                      <div
                        key={idx}
                        className="tag-suggestion-item"
                        style={{
                          backgroundColor: idx === selectedProjectTagIndex ? 'var(--cream)' : '#FFFFFF'
                        }}
                        onClick={() => insertProjectTag(tag)}
                        onMouseEnter={() => setSelectedProjectTagIndex(idx)}
                      >
                        <span className="tag-type-label" style={{
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
                        <span className="tag-suggestion-display">{tag.display}</span>
                      </div>
                    ))}
                </div>
              )}

              <button
                onClick={handleAddUpdate}
                disabled={!newUpdate.trim()}
                className="timeline-submit-button-compact"
                style={{
                  opacity: newUpdate.trim() ? 1 : 0.4
                }}
                title="Post update"
              >
                <Send size={18} />
              </button>
            </div>
          </div>

          <div className="activity-list-compact">
            {[...project.recentActivity].sort((a, b) => new Date(b.date) - new Date(a.date)).map((activity, idx) => (
              <div key={activity.id || idx}>
                <div
                  className="activity-item-compact"
                  style={{
                    animationDelay: `${idx * 30}ms`
                  }}
                >
                  <div className="activity-header-compact">
                    <div className="activity-author-compact">
                      <div className="activity-avatar-small">
                        {activity.author.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="activity-author-name-compact">{activity.author}</span>
                    </div>
                    <span className="activity-time-compact">{formatDateTime(activity.date)}</span>
                  </div>
                  {activity.taskContext && (
                    <div className="task-context-badge-compact">
                      <MessageSquare size={11} />
                      {activity.taskContext.taskTitle} → {activity.taskContext.subtaskTitle}
                    </div>
                  )}
                  <div className="activity-note-row">
                    {activityEditEnabled ? (
                      <div className="activity-edit-row">
                        <textarea
                          value={activityEdits[activity.id] ?? activity.note}
                          onChange={(e) => updateActivityNote(activity.id, e.target.value)}
                          onFocus={() => setFocusedField(`activity-${activity.id}`)}
                          onBlur={() => setFocusedField(null)}
                          className="activity-note-input"
                        />
                        {renderEditingHint(`activity-${activity.id}`)}
                        <button
                          className="activity-delete-button"
                          onClick={() => deleteActivity(activity.id)}
                          aria-label="Delete activity"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ) : (
                      <p className="activity-note-compact">
                        {parseTaggedText(activity.note).map((part, idx) => (
                          part.type === 'tag' ? (
                            <span key={idx} className="tag-inline-compact">
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
                  <div className="activity-separator" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
