import React, { useEffect, useMemo, useState } from 'react';
import { Database, Lock, Unlock, Trash2, Save } from 'lucide-react';

export default function DataPage({
  projects,
  people,
  onUpdateProject,
  onDeleteProject,
  onUpdateTask,
  onDeleteTask,
  onUpdateSubtask,
  onDeleteSubtask,
  onUpdateActivity,
  onDeleteActivity,
  onUpdatePerson,
  onDeletePerson
}) {
  const [isEditable, setIsEditable] = useState(false);
  const [projectDrafts, setProjectDrafts] = useState({});
  const [taskDrafts, setTaskDrafts] = useState({});
  const [subtaskDrafts, setSubtaskDrafts] = useState({});
  const [activityDrafts, setActivityDrafts] = useState({});
  const [personDrafts, setPersonDrafts] = useState({});

  useEffect(() => {
    setProjectDrafts({});
    setTaskDrafts({});
    setSubtaskDrafts({});
    setActivityDrafts({});
    setPersonDrafts({});
  }, [projects, people]);

  const taskRows = useMemo(() => {
    return projects.flatMap(project =>
      project.plan.map(task => ({
        ...task,
        projectId: project.id,
        projectName: project.name
      }))
    );
  }, [projects]);

  const subtaskRows = useMemo(() => {
    return projects.flatMap(project =>
      project.plan.flatMap(task =>
        task.subtasks.map(subtask => ({
          ...subtask,
          projectId: project.id,
          projectName: project.name,
          taskId: task.id,
          taskTitle: task.title
        }))
      )
    );
  }, [projects]);

  const activityRows = useMemo(() => {
    return projects.flatMap(project =>
      (project.recentActivity || []).map(activity => ({
        ...activity,
        projectId: project.id,
        projectName: project.name
      }))
    );
  }, [projects]);

  const getDraft = (draftMap, id, fallback) => draftMap[id] ?? fallback;

  const handleProjectChange = (id, field, value) => {
    setProjectDrafts(prev => ({
      ...prev,
      [id]: {
        ...getDraft(prev, id, {
          name: '',
          status: '',
          priority: '',
          targetDate: '',
          progress: 0
        }),
        [field]: value
      }
    }));
  };

  const handleTaskChange = (id, field, value) => {
    setTaskDrafts(prev => ({
      ...prev,
      [id]: {
        ...getDraft(prev, id, {
          title: '',
          status: '',
          dueDate: ''
        }),
        [field]: value
      }
    }));
  };

  const handleSubtaskChange = (id, field, value) => {
    setSubtaskDrafts(prev => ({
      ...prev,
      [id]: {
        ...getDraft(prev, id, {
          title: '',
          status: '',
          dueDate: ''
        }),
        [field]: value
      }
    }));
  };

  const handleActivityChange = (id, field, value) => {
    setActivityDrafts(prev => ({
      ...prev,
      [id]: {
        ...getDraft(prev, id, {
          note: '',
          date: ''
        }),
        [field]: value
      }
    }));
  };

  const handlePersonChange = (id, field, value) => {
    setPersonDrafts(prev => ({
      ...prev,
      [id]: {
        ...getDraft(prev, id, {
          name: '',
          team: '',
          email: ''
        }),
        [field]: value
      }
    }));
  };

  const saveProject = async (project) => {
    const draft = getDraft(projectDrafts, project.id, project);
    try {
      await onUpdateProject(project.id, {
        name: draft.name || project.name,
        status: draft.status || project.status,
        priority: draft.priority || project.priority,
        targetDate: draft.targetDate ?? project.targetDate,
        progress: draft.progress !== undefined ? Number(draft.progress) : project.progress
      });
      setProjectDrafts(prev => {
        const next = { ...prev };
        delete next[project.id];
        return next;
      });
    } catch (error) {
      console.error('Unable to update project', error);
      alert('Unable to update project');
    }
  };

  const saveTask = async (task) => {
    const draft = getDraft(taskDrafts, task.id, task);
    try {
      await onUpdateTask(task.projectId, task.id, {
        title: draft.title || task.title,
        status: draft.status || task.status,
        dueDate: draft.dueDate ?? task.dueDate
      });
      setTaskDrafts(prev => {
        const next = { ...prev };
        delete next[task.id];
        return next;
      });
    } catch (error) {
      console.error('Unable to update task', error);
      alert('Unable to update task');
    }
  };

  const saveSubtask = async (subtask) => {
    const draft = getDraft(subtaskDrafts, subtask.id, subtask);
    try {
      await onUpdateSubtask(subtask.projectId, subtask.taskId, subtask.id, {
        title: draft.title || subtask.title,
        status: draft.status || subtask.status,
        dueDate: draft.dueDate ?? subtask.dueDate
      });
      setSubtaskDrafts(prev => {
        const next = { ...prev };
        delete next[subtask.id];
        return next;
      });
    } catch (error) {
      console.error('Unable to update subtask', error);
      alert('Unable to update subtask');
    }
  };

  const saveActivity = async (activity) => {
    const draft = getDraft(activityDrafts, activity.id, activity);
    try {
      await onUpdateActivity(activity.projectId, activity.id, {
        note: draft.note || activity.note,
        date: draft.date || activity.date,
        author: activity.author || 'system'
      });
      setActivityDrafts(prev => {
        const next = { ...prev };
        delete next[activity.id];
        return next;
      });
    } catch (error) {
      console.error('Unable to update activity', error);
      alert('Unable to update activity');
    }
  };

  const savePerson = async (person) => {
    const draft = getDraft(personDrafts, person.id, person);
    try {
      await onUpdatePerson(person.id, {
        name: draft.name || person.name,
        team: draft.team || person.team,
        email: draft.email || person.email
      });
      setPersonDrafts(prev => {
        const next = { ...prev };
        delete next[person.id];
        return next;
      });
    } catch (error) {
      console.error('Unable to update person', error);
      alert('Unable to update person');
    }
  };

  const renderInput = (value, onChange, placeholder = '', type = 'text') => (
    <input
      type={type}
      value={value ?? ''}
      disabled={!isEditable}
      onChange={(e) => onChange(e.target.value)}
      style={{
        ...styles.input,
        ...(isEditable ? {} : styles.inputDisabled)
      }}
      placeholder={placeholder}
    />
  );

  const renderSelect = (value, onChange, options) => (
    <select
      value={value}
      disabled={!isEditable}
      onChange={(e) => onChange(e.target.value)}
      style={{
        ...styles.select,
        ...(isEditable ? {} : styles.inputDisabled)
      }}
    >
      {options.map(option => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );

  const renderActions = (onSave, onDelete, disableDelete = false) => (
    <div style={styles.actionsCell}>
      <button
        onClick={onSave}
        style={styles.saveButton}
        disabled={!isEditable}
      >
        <Save size={14} />
        Save
      </button>
      <button
        onClick={onDelete}
        style={styles.deleteButton}
        disabled={!isEditable || disableDelete}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );

  return (
    <div style={styles.wrapper}>
      <header style={styles.header}>
        <div style={styles.headerText}>
          <div style={styles.headerLabel}>Data</div>
          <h2 style={styles.headerTitle}>Database tables</h2>
          <p style={styles.headerSubtitle}>
            Browse and adjust data directly. Unlock editing to enable changes and deletion using the existing API.
          </p>
        </div>
        <button
          onClick={() => setIsEditable(prev => !prev)}
          style={styles.lockButton}
          aria-label={isEditable ? 'Disable editing' : 'Enable editing'}
          title={isEditable ? 'Lock to prevent edits' : 'Unlock to edit and delete rows'}
        >
          {isEditable ? <Unlock size={18} /> : <Lock size={18} />}
        </button>
      </header>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <div style={styles.sectionTitleRow}>
            <Database size={18} style={styles.sectionIcon} />
            <h3 style={styles.sectionTitle}>Projects</h3>
          </div>
          <span style={styles.sectionHint}>{projects.length} records</span>
        </div>
        <div style={styles.table}>
          <div style={styles.tableHeader}>
            <div style={{ ...styles.cell, flex: 1.3 }}>Name</div>
            <div style={{ ...styles.cell, flex: 0.9 }}>Status</div>
            <div style={{ ...styles.cell, flex: 0.9 }}>Priority</div>
            <div style={{ ...styles.cell, flex: 0.8 }}>Target</div>
            <div style={{ ...styles.cell, flex: 0.6 }}>Progress</div>
            <div style={{ ...styles.cell, width: 120 }}>Actions</div>
          </div>
          {projects.map(project => {
            const draft = getDraft(projectDrafts, project.id, project);
            return (
              <div key={project.id} style={styles.tableRow}>
                <div style={{ ...styles.cell, flex: 1.3 }}>
                  {renderInput(draft.name ?? project.name, (value) => handleProjectChange(project.id, 'name', value), 'Project name')}
                </div>
                <div style={{ ...styles.cell, flex: 0.9 }}>
                  {renderSelect(draft.status || project.status, (value) => handleProjectChange(project.id, 'status', value), ['planning', 'active', 'completed'])}
                </div>
                <div style={{ ...styles.cell, flex: 0.9 }}>
                  {renderSelect(draft.priority || project.priority, (value) => handleProjectChange(project.id, 'priority', value), ['high', 'medium', 'low'])}
                </div>
                <div style={{ ...styles.cell, flex: 0.8 }}>
                  {renderInput(draft.targetDate ?? project.targetDate ?? '', (value) => handleProjectChange(project.id, 'targetDate', value), 'YYYY-MM-DD', 'date')}
                </div>
                <div style={{ ...styles.cell, flex: 0.6 }}>
                  {renderInput(draft.progress ?? project.progress ?? 0, (value) => handleProjectChange(project.id, 'progress', value), '0', 'number')}
                </div>
                <div style={{ ...styles.cell, width: 120 }}>
                  {renderActions(() => saveProject(project), () => onDeleteProject(project.id))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={styles.grid}>
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionTitleRow}>
              <h3 style={styles.sectionTitle}>Tasks</h3>
            </div>
            <span style={styles.sectionHint}>{taskRows.length} records</span>
          </div>
          <div style={styles.table}>
            <div style={styles.tableHeader}>
              <div style={{ ...styles.cell, flex: 1.2 }}>Title</div>
              <div style={{ ...styles.cell, flex: 0.9 }}>Status</div>
              <div style={{ ...styles.cell, flex: 0.8 }}>Due</div>
              <div style={{ ...styles.cell, flex: 1 }}>Project</div>
              <div style={{ ...styles.cell, width: 120 }}>Actions</div>
            </div>
            {taskRows.map(task => {
              const draft = getDraft(taskDrafts, task.id, task);
              return (
                <div key={task.id} style={styles.tableRow}>
                  <div style={{ ...styles.cell, flex: 1.2 }}>
                    {renderInput(draft.title ?? task.title, (value) => handleTaskChange(task.id, 'title', value), 'Task title')}
                  </div>
                  <div style={{ ...styles.cell, flex: 0.9 }}>
                    {renderSelect(draft.status || task.status, (value) => handleTaskChange(task.id, 'status', value), ['todo', 'in-progress', 'completed'])}
                  </div>
                  <div style={{ ...styles.cell, flex: 0.8 }}>
                    {renderInput(draft.dueDate ?? task.dueDate ?? '', (value) => handleTaskChange(task.id, 'dueDate', value), 'YYYY-MM-DD', 'date')}
                  </div>
                  <div style={{ ...styles.cell, flex: 1 }}>
                    <span style={styles.badge}>{task.projectName}</span>
                  </div>
                  <div style={{ ...styles.cell, width: 120 }}>
                    {renderActions(() => saveTask(task), () => onDeleteTask(task.projectId, task.id))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionTitleRow}>
              <h3 style={styles.sectionTitle}>Subtasks</h3>
            </div>
            <span style={styles.sectionHint}>{subtaskRows.length} records</span>
          </div>
          <div style={styles.table}>
            <div style={styles.tableHeader}>
              <div style={{ ...styles.cell, flex: 1 }}>Title</div>
              <div style={{ ...styles.cell, flex: 0.9 }}>Status</div>
              <div style={{ ...styles.cell, flex: 0.8 }}>Due</div>
              <div style={{ ...styles.cell, flex: 1 }}>Task</div>
              <div style={{ ...styles.cell, width: 120 }}>Actions</div>
            </div>
            {subtaskRows.map(subtask => {
              const draft = getDraft(subtaskDrafts, subtask.id, subtask);
              return (
                <div key={subtask.id} style={styles.tableRow}>
                  <div style={{ ...styles.cell, flex: 1 }}>
                    {renderInput(draft.title ?? subtask.title, (value) => handleSubtaskChange(subtask.id, 'title', value), 'Subtask title')}
                  </div>
                  <div style={{ ...styles.cell, flex: 0.9 }}>
                    {renderSelect(draft.status || subtask.status, (value) => handleSubtaskChange(subtask.id, 'status', value), ['todo', 'in-progress', 'completed'])}
                  </div>
                  <div style={{ ...styles.cell, flex: 0.8 }}>
                    {renderInput(draft.dueDate ?? subtask.dueDate ?? '', (value) => handleSubtaskChange(subtask.id, 'dueDate', value), 'YYYY-MM-DD', 'date')}
                  </div>
                  <div style={{ ...styles.cell, flex: 1 }}>
                    <span style={styles.badge}>{subtask.taskTitle}</span>
                  </div>
                  <div style={{ ...styles.cell, width: 120 }}>
                    {renderActions(() => saveSubtask(subtask), () => onDeleteSubtask(subtask.projectId, subtask.taskId, subtask.id))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={styles.grid}>
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionTitleRow}>
              <h3 style={styles.sectionTitle}>Activities</h3>
            </div>
            <span style={styles.sectionHint}>{activityRows.length} records</span>
          </div>
          <div style={styles.table}>
            <div style={styles.tableHeader}>
              <div style={{ ...styles.cell, flex: 1.3 }}>Note</div>
              <div style={{ ...styles.cell, flex: 0.8 }}>Date</div>
              <div style={{ ...styles.cell, flex: 1 }}>Project</div>
              <div style={{ ...styles.cell, width: 120 }}>Actions</div>
            </div>
            {activityRows.map(activity => {
              const draft = getDraft(activityDrafts, activity.id, activity);
              return (
                <div key={activity.id} style={styles.tableRow}>
                  <div style={{ ...styles.cell, flex: 1.3 }}>
                    <textarea
                      value={draft.note ?? activity.note}
                      disabled={!isEditable}
                      onChange={(e) => handleActivityChange(activity.id, 'note', e.target.value)}
                      style={{
                        ...styles.textarea,
                        ...(isEditable ? {} : styles.inputDisabled)
                      }}
                      rows={2}
                    />
                  </div>
                  <div style={{ ...styles.cell, flex: 0.8 }}>
                    {renderInput(draft.date ?? activity.date, (value) => handleActivityChange(activity.id, 'date', value), 'YYYY-MM-DD', 'datetime-local')}
                  </div>
                  <div style={{ ...styles.cell, flex: 1 }}>
                    <span style={styles.badge}>{activity.projectName}</span>
                  </div>
                  <div style={{ ...styles.cell, width: 120 }}>
                    {renderActions(() => saveActivity(activity), () => onDeleteActivity(activity.projectId, activity.id))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionTitleRow}>
              <h3 style={styles.sectionTitle}>People</h3>
            </div>
            <span style={styles.sectionHint}>{people.length} records</span>
          </div>
          <div style={styles.table}>
            <div style={styles.tableHeader}>
              <div style={{ ...styles.cell, flex: 1 }}>Name</div>
              <div style={{ ...styles.cell, flex: 0.8 }}>Team</div>
              <div style={{ ...styles.cell, flex: 1 }}>Email</div>
              <div style={{ ...styles.cell, width: 120 }}>Actions</div>
            </div>
            {people.map(person => {
              const draft = getDraft(personDrafts, person.id, person);
              return (
                <div key={person.id} style={styles.tableRow}>
                  <div style={{ ...styles.cell, flex: 1 }}>
                    {renderInput(draft.name ?? person.name, (value) => handlePersonChange(person.id, 'name', value), 'Name')}
                  </div>
                  <div style={{ ...styles.cell, flex: 0.8 }}>
                    {renderInput(draft.team ?? person.team, (value) => handlePersonChange(person.id, 'team', value), 'Team')}
                  </div>
                  <div style={{ ...styles.cell, flex: 1 }}>
                    {renderInput(draft.email ?? person.email ?? '', (value) => handlePersonChange(person.id, 'email', value), 'Email', 'email')}
                  </div>
                  <div style={{ ...styles.cell, width: 120 }}>
                    {renderActions(() => savePerson(person), () => onDeletePerson(person.id))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    color: 'var(--charcoal)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: '16px 18px',
    border: '1px solid var(--cloud)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
  },
  headerText: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  headerLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--stone)',
    letterSpacing: '0.2px',
    textTransform: 'uppercase',
  },
  headerTitle: {
    margin: 0,
    fontSize: '24px',
    letterSpacing: '-0.5px',
  },
  headerSubtitle: {
    margin: 0,
    color: 'var(--stone)',
    fontSize: '14px',
  },
  lockButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    border: '1px solid var(--cloud)',
    backgroundColor: '#fff',
    color: 'var(--stone)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: '14px',
    border: '1px solid var(--cloud)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  sectionIcon: {
    color: 'var(--earth)',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '16px',
    letterSpacing: '-0.2px',
  },
  sectionHint: {
    color: 'var(--stone)',
    fontSize: '12px',
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  tableHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 12px',
    backgroundColor: 'var(--cream)',
    borderRadius: 10,
    border: '1px solid var(--cloud)',
    fontWeight: 600,
    fontSize: '12px',
    color: 'var(--stone)',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  tableRow: {
    display: 'flex',
    alignItems: 'stretch',
    padding: '10px 12px',
    backgroundColor: '#fff',
    borderRadius: 10,
    border: '1px solid var(--cloud)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
    gap: 8,
  },
  cell: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: '13px',
    color: 'var(--charcoal)',
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid var(--cloud)',
    backgroundColor: '#fff',
    fontSize: '13px',
    color: 'var(--charcoal)',
  },
  inputDisabled: {
    backgroundColor: '#f4f1ea',
    cursor: 'not-allowed',
  },
  select: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid var(--cloud)',
    backgroundColor: '#fff',
    fontSize: '13px',
    color: 'var(--charcoal)',
  },
  textarea: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid var(--cloud)',
    backgroundColor: '#fff',
    fontSize: '13px',
    color: 'var(--charcoal)',
    resize: 'vertical',
  },
  actionsCell: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'flex-end',
    width: '100%',
  },
  saveButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 10px',
    borderRadius: 8,
    border: '1px solid var(--cloud)',
    background: 'linear-gradient(135deg, #7a9b76 0%, #8b6f47 100%)',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '12px',
    minWidth: 72,
  },
  deleteButton: {
    width: 36,
    height: 32,
    borderRadius: 8,
    border: '1px solid var(--cloud)',
    backgroundColor: '#fff',
    color: 'var(--stone)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 10px',
    backgroundColor: 'var(--cream)',
    borderRadius: 999,
    border: '1px solid var(--cloud)',
    fontSize: '12px',
    color: 'var(--stone)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
    gap: 16,
  },
};
