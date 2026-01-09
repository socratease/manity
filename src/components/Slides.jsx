import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Users,
  Edit2,
  Sparkles,
  X,
  Download
} from 'lucide-react';

// Helper functions
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

const getPriorityColor = (priority) => {
  const colors = {
    high: 'var(--coral)',
    medium: 'var(--amber)',
    low: 'var(--sage)'
  };
  return colors[priority] || 'var(--stone)';
};

const formatStakeholderNames = (stakeholders = []) => {
  const names = stakeholders.map(person => person.name);
  if (names.length <= 5) return names.join(', ');
  return `${names.slice(0, 5).join(', ')} +${names.length - 5}`;
};

const parseLocalDate = (dateString) => {
  if (!dateString) return null;
  const datePart = dateString.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const formatDueDate = (dateString, status, completedDate) => {
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

  return tasks.sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0));
};

export default function Slides({
  projects,
  setProjects,
  onGenerateExecSummary,
  isGeneratingSummary = false,
  apiBaseUrl = ''
}) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isEditingSlide, setIsEditingSlide] = useState(false);
  const [editingExecSummary, setEditingExecSummary] = useState(null);
  const [execSummaryDraft, setExecSummaryDraft] = useState('');
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
  const [isExporting, setIsExporting] = useState(false);

  const recentUpdatesRef = useRef(null);
  const recentlyCompletedRef = useRef(null);
  const nextUpRef = useRef(null);

  const visibleProjects = projects.filter(project => project.status !== 'deleted');
  const slideProject = visibleProjects[currentSlideIndex] || null;

  // Reset slide index when projects change
  useEffect(() => {
    if (visibleProjects.length === 0) {
      setCurrentSlideIndex(0);
      return;
    }
    setCurrentSlideIndex(prev => Math.min(prev, visibleProjects.length - 1));
  }, [visibleProjects.length]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't handle if in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        if (e.ctrlKey && e.key === 'Enter' && isEditingSlide && editingExecSummary) {
          e.preventDefault();
          saveAndExitEditMode();
        }
        if (e.key === 'Escape' && isEditingSlide) {
          e.preventDefault();
          cancelEditMode();
        }
        return;
      }

      if (e.ctrlKey && e.key === 'Enter' && isEditingSlide && editingExecSummary) {
        e.preventDefault();
        saveAndExitEditMode();
        return;
      }

      if (e.key === 'Escape' && isEditingSlide) {
        e.preventDefault();
        cancelEditMode();
        return;
      }

      if (e.key === 'e' && !isEditingSlide && slideProject) {
        e.preventDefault();
        startEditingExecSummary(slideProject.id, slideProject.executiveUpdate || slideProject.description);
        setIsEditingSlide(true);
        return;
      }

      if (e.key === 'g' && isEditingSlide && !isGeneratingSummary && slideProject && onGenerateExecSummary) {
        e.preventDefault();
        onGenerateExecSummary(slideProject.id);
        return;
      }

      if (!isEditingSlide) {
        if (e.key === 'ArrowLeft') {
          handleSlideAdvance(-1);
        } else if (e.key === 'ArrowRight') {
          handleSlideAdvance(1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditingSlide, currentSlideIndex, slideProject, isGeneratingSummary]);

  const handleSlideAdvance = (direction) => {
    if (visibleProjects.length === 0) return;
    setCurrentSlideIndex(prev => {
      const nextIndex = (prev + direction + visibleProjects.length) % visibleProjects.length;
      return nextIndex;
    });
  };

  const startEditingExecSummary = (projectId, initialText) => {
    setEditingExecSummary(projectId);
    setExecSummaryDraft(initialText || '');
  };

  const saveAndExitEditMode = () => {
    if (editingExecSummary) {
      setProjects(prevProjects =>
        prevProjects.map(project =>
          project.id === editingExecSummary
            ? { ...project, executiveUpdate: execSummaryDraft }
            : project
        )
      );
    }
    setIsEditingSlide(false);
    setEditingExecSummary(null);
    setExecSummaryDraft('');
  };

  const cancelEditMode = () => {
    setIsEditingSlide(false);
    setEditingExecSummary(null);
    setExecSummaryDraft('');
  };

  const toggleSlideEditMode = () => {
    const wasEditing = isEditingSlide;
    setIsEditingSlide(prev => !prev);

    if (wasEditing) {
      if (editingExecSummary) {
        setProjects(prevProjects =>
          prevProjects.map(project =>
            project.id === editingExecSummary
              ? { ...project, executiveUpdate: execSummaryDraft }
              : project
          )
        );
        setEditingExecSummary(null);
        setExecSummaryDraft('');
      }
    }
  };

  const hideSlideItem = (category, itemId) => {
    setHiddenSlideItems(prev => ({
      ...prev,
      [category]: [...prev[category], itemId]
    }));
  };

  const handleExportPowerPoint = async () => {
    if (visibleProjects.length === 0) return;

    // Validate API base URL is configured
    if (!apiBaseUrl) {
      alert('API base URL not configured. Please check your VITE_API_BASE environment variable.');
      console.error('[PPTX Export] apiBaseUrl is empty - VITE_API_BASE may not be set');
      return;
    }

    setIsExporting(true);
    try {
      // Prepare slide data for all visible projects
      const slidesData = visibleProjects.map(project => {
        const recentlyCompleted = getRecentlyCompletedTasks(project)
          .filter(task => !hiddenSlideItems.recentlyCompleted.includes(task.id))
          .slice(0, slideItemCounts.recentlyCompleted);
        const nextUp = getNextUpTasks(project)
          .filter(task => !hiddenSlideItems.nextUp.includes(task.id))
          .slice(0, slideItemCounts.nextUp);
        const recentUpdates = (project.recentActivity || [])
          .filter(activity => !hiddenSlideItems.recentUpdates.includes(activity.id))
          .slice(0, slideItemCounts.recentUpdates);

        return {
          name: project.name,
          description: project.description || '',
          executiveUpdate: project.executiveUpdate || project.description || '',
          targetDate: project.targetDate,
          priority: project.priority,
          status: project.status,
          stakeholders: (project.stakeholders || []).map(s => ({
            name: s.name || '',
            team: s.team || ''
          })),
          recentlyCompleted: recentlyCompleted.map(t => ({
            title: `${t.taskTitle} → ${t.title}`,
            date: t.dueDateInfo.text
          })),
          nextUp: nextUp.map(t => ({
            title: `${t.taskTitle} → ${t.title}`,
            date: t.dueDateInfo.text
          })),
          recentUpdates: recentUpdates.map(a => ({
            author: a.author,
            date: a.date,
            note: a.note
          }))
        };
      });

      const response = await fetch(`${apiBaseUrl}/api/slides/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slides: slidesData }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to export PowerPoint';

        try {
          const errorData = await response.json();
          if (errorData?.detail) {
            errorMessage = errorData.detail;
          }
        } catch (parseError) {
          const fallbackMessage = await response.text();
          if (fallbackMessage) {
            errorMessage = fallbackMessage;
          }
        }

        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const contentType = response.headers.get('Content-Type')?.toLowerCase() ?? '';
      const isPptx = contentType.startsWith('application/vnd.openxmlformats-officedocument.presentationml.presentation');
      let hasZipSignature = false;

      if (!isPptx && blob.size >= 4) {
        const signatureBytes = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
        hasZipSignature = signatureBytes[0] === 0x50
          && signatureBytes[1] === 0x4b
          && signatureBytes[2] === 0x03
          && signatureBytes[3] === 0x04;
      }

      if (blob.size === 0 || (!isPptx && !hasZipSignature)) {
        console.error('[PPTX Export] Validation failed:', {
          blobSize: blob.size,
          contentType,
          isPptx,
          hasZipSignature,
          apiBaseUrl
        });
        throw new Error(
          `Invalid PowerPoint file received. ` +
          `This may indicate the API URL is misconfigured. ` +
          `(Content-Type: ${contentType || 'none'}, Size: ${blob.size} bytes)`
        );
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `portfolio-slides-${new Date().toISOString().split('T')[0]}.pptx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting PowerPoint:', error);
      alert(error?.message || 'Failed to export PowerPoint. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  if (visibleProjects.length === 0) {
    return (
      <>
        <header style={styles.header}>
          <div>
            <h2 style={styles.pageTitle}>Slides</h2>
            <p style={styles.pageSubtitle}>
              No visible projects to show.
            </p>
          </div>
        </header>
        <div style={styles.emptyState}>No visible projects to show.</div>
      </>
    );
  }

  const allRecentlyCompleted = getRecentlyCompletedTasks(slideProject);
  const allNextUp = getNextUpTasks(slideProject);
  const allRecentUpdates = slideProject.recentActivity || [];

  const slideRecentUpdates = allRecentUpdates
    .filter(activity => !hiddenSlideItems.recentUpdates.includes(activity.id))
    .slice(0, slideItemCounts.recentUpdates);
  const slideRecentlyCompleted = allRecentlyCompleted
    .filter(task => !hiddenSlideItems.recentlyCompleted.includes(task.id))
    .slice(0, slideItemCounts.recentlyCompleted);
  const slideNextUp = allNextUp
    .filter(task => !hiddenSlideItems.nextUp.includes(task.id))
    .slice(0, slideItemCounts.nextUp);

  return (
    <>
      <header style={styles.header}>
        <div>
          <h2 style={styles.pageTitle}>Slides</h2>
          <p style={styles.pageSubtitle}>
            Cycle through {visibleProjects.length} projects in a 16:9 frame, ready for screenshots. Use ← → arrow keys to navigate.
          </p>
        </div>
        <div style={styles.headerActions}>
          <button
            onClick={handleExportPowerPoint}
            style={{
              ...styles.dataButton,
              opacity: isExporting ? 0.6 : 1,
              marginRight: '12px'
            }}
            disabled={isExporting}
            title="Export all slides to PowerPoint"
          >
            <Download size={16} />
            <span style={{ marginLeft: '6px' }}>{isExporting ? 'Exporting...' : 'Export PPTX'}</span>
          </button>
          <div style={styles.slidesCounter}>
            Slide {currentSlideIndex + 1} / {visibleProjects.length}
          </div>
          <div style={styles.slidesControls}>
            <button
              onClick={() => handleSlideAdvance(-1)}
              style={styles.dataButton}
              disabled={visibleProjects.length === 0}
              aria-label="Previous slide"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => handleSlideAdvance(1)}
              style={styles.dataButton}
              disabled={visibleProjects.length === 0}
              aria-label="Next slide"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </header>

      <div style={styles.slideStage}>
        <div style={styles.slideSurface}>
          <div style={styles.slideControlRail}>
            {isEditingSlide && onGenerateExecSummary && (
              <button
                onClick={() => onGenerateExecSummary(slideProject.id)}
                style={{
                  ...styles.slideControlButton,
                  opacity: isGeneratingSummary ? 0.5 : 1,
                }}
                disabled={isGeneratingSummary}
                title={'AI generate summary (g)'}
              >
                <Sparkles size={14} />
                <span>AI generate</span>
                <span style={{ fontSize: '10px', opacity: 0.6, marginLeft: '4px' }}>G</span>
              </button>
            )}
            <button
              onClick={() => {
                if (!isEditingSlide) {
                  startEditingExecSummary(slideProject.id, slideProject.executiveUpdate || slideProject.description);
                }
                toggleSlideEditMode();
              }}
              style={{
                ...styles.slideControlButton,
                backgroundColor: isEditingSlide ? 'var(--coral)' + '15' : 'transparent',
                borderColor: isEditingSlide ? 'var(--coral)' : 'var(--cloud)',
                color: isEditingSlide ? 'var(--coral)' : 'var(--charcoal)'
              }}
              title={isEditingSlide ? 'Save and exit edit mode (Ctrl+Enter)' : 'Edit slide (e)'}
            >
              <Edit2 size={14} />
              <span>{isEditingSlide ? 'Save' : 'Edit'}</span>
              <span style={{ fontSize: '10px', opacity: 0.6, marginLeft: '4px' }}>
                {isEditingSlide ? 'Ctrl+⏎' : 'E'}
              </span>
            </button>
          </div>
          <div style={styles.slideSurfaceInner}>
            {/* Header with name, description subtitle, and project details */}
            <div style={styles.slideCompactHeader}>
              <div style={styles.slideHeaderTop}>
                <h3 style={styles.slideTitle}>{slideProject.name}</h3>
                {slideProject.description && (
                  <p style={styles.slideSubtitle}>{slideProject.description}</p>
                )}
              </div>
              <div style={styles.slideHeaderMeta}>
                <Calendar size={14} style={{ color: 'var(--stone)' }} />
                <span>Target {slideProject.targetDate ? new Date(slideProject.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD'}</span>
                <span style={styles.slideDivider}>•</span>
                <span style={{
                  ...styles.slideInlineBadge,
                  backgroundColor: getPriorityColor(slideProject.priority) + '20',
                  color: getPriorityColor(slideProject.priority)
                }}>
                  {slideProject.priority} priority
                </span>
                <span style={styles.slideInlineBadge}>{slideProject.status}</span>
                {slideProject.stakeholders && slideProject.stakeholders.length > 0 && (
                  <>
                    <span style={styles.slideDivider}>•</span>
                    <Users size={14} style={{ color: 'var(--stone)', marginLeft: '4px' }} />
                    <div style={styles.slideStakeholderNames}>
                      {formatStakeholderNames(slideProject.stakeholders)}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Main content grid - 2 columns */}
            <div style={styles.slideMainGrid}>
              {/* Left column - Executive Summary and Recent Updates */}
              <div style={styles.slideLeftColumn}>
                {/* Executive Update */}
                <div style={{ ...styles.slideSecondaryPanel, ...styles.slideExecSummaryPanel }}>
                  <div style={styles.slidePanelHeader}>
                    <div style={styles.slidePanelTitle}>Executive Update</div>
                  </div>
                  {editingExecSummary === slideProject.id ? (
                    <div>
                      <textarea
                        value={execSummaryDraft}
                        onChange={(e) => setExecSummaryDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.ctrlKey && e.key === 'Enter') {
                            e.preventDefault();
                            saveAndExitEditMode();
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            cancelEditMode();
                          }
                        }}
                        style={styles.execSummaryInput}
                        placeholder="Write executive update..."
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div style={styles.slideExecSummary}>
                      {slideProject.executiveUpdate || slideProject.description || 'No executive update yet.'}
                    </div>
                  )}
                </div>

                {/* Recent updates */}
                <div ref={recentUpdatesRef} style={{ ...styles.slideSecondaryPanel, ...styles.slideUpdatesPanel }}>
                  <div style={styles.slidePanelHeader}>
                    <div style={styles.slidePanelTitle}>Recent updates</div>
                  </div>
                  <div style={styles.slideUpdatesContent}>
                    {slideRecentUpdates.length > 0 ? (
                      <ul style={styles.momentumList}>
                        {slideRecentUpdates.map((activity, idx) => (
                          <li key={activity.id || idx} style={styles.momentumListItem}>
                            <div style={styles.momentumListRow}>
                              <span style={styles.momentumListStrong}>{activity.author}</span>
                              <span style={styles.momentumListMeta}>{formatDateTime(activity.date)}</span>
                              {isEditingSlide && (
                                <button
                                  onClick={() => hideSlideItem('recentUpdates', activity.id)}
                                  style={styles.slideRemoveButton}
                                  title="Remove from slide"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                            <div style={styles.momentumListText}>{activity.note}</div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div style={styles.momentumEmptyText}>No updates yet.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right column - Recently Completed and Next Up */}
              <div style={styles.slideRightColumn}>
                {/* Recently Completed */}
                <div ref={recentlyCompletedRef} style={{ ...styles.slideSecondaryPanel, ...styles.slideTasksPanel }}>
                  <div style={styles.slidePanelHeader}>
                    <div style={styles.slidePanelTitle}>Recently Completed</div>
                  </div>
                  {slideRecentlyCompleted.length > 0 ? (
                    <ul style={styles.momentumList}>
                      {slideRecentlyCompleted.map((task, idx) => (
                        <li key={`${task.taskTitle}-${task.title}-${idx}`} style={styles.momentumListItem}>
                          <div style={styles.momentumListRow}>
                            <span style={styles.momentumListStrong}>{task.taskTitle} → {task.title}</span>
                            <span style={{ ...styles.actionDueText, color: task.dueDateInfo.color }}>
                              {task.dueDateInfo.text}
                            </span>
                            {isEditingSlide && (
                              <button
                                onClick={() => hideSlideItem('recentlyCompleted', task.id)}
                                style={styles.slideRemoveButton}
                                title="Remove from slide"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div style={styles.momentumEmptyText}>No recently completed tasks.</div>
                  )}
                </div>

                {/* Next Up */}
                <div ref={nextUpRef} style={{ ...styles.slideSecondaryPanel, ...styles.slideTasksPanel }}>
                  <div style={styles.slidePanelHeader}>
                    <div style={styles.slidePanelTitle}>Next Up</div>
                  </div>
                  {slideNextUp.length > 0 ? (
                    <ul style={styles.momentumList}>
                      {slideNextUp.map((task, idx) => (
                        <li key={`${task.taskTitle}-${task.title}-${idx}`} style={styles.momentumListItem}>
                          <div style={styles.momentumListRow}>
                            <span style={styles.momentumListStrong}>{task.taskTitle} → {task.title}</span>
                            <span style={{ ...styles.actionDueText, color: task.dueDateInfo.color }}>
                              {task.dueDateInfo.text}
                            </span>
                            {isEditingSlide && (
                              <button
                                onClick={() => hideSlideItem('nextUp', task.id)}
                                style={styles.slideRemoveButton}
                                title="Remove from slide"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div style={styles.momentumEmptyText}>No upcoming tasks.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  pageTitle: {
    margin: 0,
    fontSize: '28px',
    fontWeight: '600',
    color: 'var(--charcoal)',
    letterSpacing: '-0.5px',
  },
  pageSubtitle: {
    margin: '4px 0 0 0',
    fontSize: '14px',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  dataButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 12px',
    border: '1px solid var(--cloud)',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    color: 'var(--stone)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: "'Inter', sans-serif",
    fontSize: '13px',
    fontWeight: '500',
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
    boxSizing: 'border-box',
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
  actionDueText: {
    fontSize: '12px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '500',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 24px',
    color: 'var(--stone)',
    fontFamily: "'Inter', sans-serif",
    fontSize: '15px',
  },
};
