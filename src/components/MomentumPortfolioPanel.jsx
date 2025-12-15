import React from 'react';
import { AlertCircle, ChevronDown, TrendingUp, X } from 'lucide-react';

export default function MomentumPortfolioPanel({
  styles,
  visibleProjects,
  activeProjectInChat,
  setActiveProjectInChat,
  recentlyUpdatedProjects,
  expandedMomentumProjects,
  setExpandedMomentumProjects,
  getProjectDueSoonTasks,
  formatDateTime,
  getPriorityColor,
  setPortfolioMinimized
}) {
  const sortedProjects = [...visibleProjects].sort((a, b) => {
    const aActive = activeProjectInChat === a.id || activeProjectInChat === String(a.id);
    const bActive = activeProjectInChat === b.id || activeProjectInChat === String(b.id);
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    const aUpdated = recentlyUpdatedProjects.has(a.id);
    const bUpdated = recentlyUpdatedProjects.has(b.id);
    if (aUpdated && !bUpdated) return -1;
    if (!aUpdated && bUpdated) return 1;
    return 0;
  });

  return (
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
        {sortedProjects.length > 0 ? (
          sortedProjects.map(project => {
            const projectId = String(project.id);
            const isExpanded = expandedMomentumProjects[projectId] ?? false;
            const isActive = activeProjectInChat === project.id || activeProjectInChat === projectId;
            const isRecentlyUpdated = recentlyUpdatedProjects.has(project.id);
            const dueSoonTasks = getProjectDueSoonTasks(project);
            const recentUpdates = (project.recentActivity || []).slice(0, 2);

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
  );
}
