/**
 * MomentumProjectCard Component
 *
 * Project card shown in the Momentum chat sidebar.
 */

import React from 'react';

const MomentumProjectCard = ({
  project,
  index,
  isHovered,
  isLinked,
  isActivelyLinked,
  isRecentlyUpdated,
  onHover,
  onLeave,
  colors,
  getPriorityColor,
  getStatusColor,
}) => {
  const handleCardClick = (e) => {
    e.preventDefault();
    window.location.hash = `#/project/${project.id}`;
  };

  return (
    <div
      onClick={handleCardClick}
      style={{
        ...styles.card,
        ...(isHovered ? styles.cardHovered : {}),
        ...(isLinked ? { borderColor: colors.amber, borderWidth: 2 } : {}),
        ...(isActivelyLinked ? { backgroundColor: '#FFFBF5', boxShadow: `0 0 16px ${colors.amber}40` } : {}),
        ...(isRecentlyUpdated ? { boxShadow: `0 0 12px ${colors.sage}60`, borderColor: colors.sage } : {}),
      }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {isLinked && (
        <div style={{
          ...styles.connectionIndicator,
          backgroundColor: isActivelyLinked ? colors.amber : colors.earth,
          opacity: isActivelyLinked ? 1 : 0.5,
        }} />
      )}

      <div style={{ ...styles.priorityDot, backgroundColor: getPriorityColor(project.priority) }} />

      <div style={styles.compact}>
        <span style={styles.name}>
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
        <div style={styles.expanded}>
          <p style={styles.description}>{project.description}</p>
          {isRecentlyUpdated && project.recentActivity?.length > 0 && project.recentActivity[0]?.note && (
            <div style={styles.recentActivity}>
              <span style={styles.recentActivityLabel}>Latest update:</span>
              <span style={styles.recentActivityText}>{project.recentActivity[0].note}</span>
            </div>
          )}
          <div style={styles.meta}>
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

const styles = {
  card: {
    position: 'relative',
    padding: '12px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #E8E3D8',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    animation: 'slideIn 0.3s ease',
  },
  cardHovered: {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  },
  connectionIndicator: {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    border: '2px solid #FFFFFF',
    transition: 'all 0.2s',
  },
  priorityDot: {
    position: 'absolute',
    top: '8px',
    left: '8px',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    transition: 'box-shadow 0.2s',
  },
  compact: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: '16px',
  },
  name: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#3A3631',
    flex: 1,
  },
  progressRing: {
    position: 'relative',
    width: '32px',
    height: '32px',
    flexShrink: 0,
  },
  progressText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '8px',
    fontWeight: '700',
    color: '#6B6554',
  },
  expanded: {
    marginTop: '10px',
    paddingTop: '10px',
    borderTop: '1px solid #E8E3D8',
  },
  description: {
    margin: '0 0 8px',
    fontSize: '11px',
    color: '#6B6554',
    lineHeight: '1.4',
  },
  recentActivity: {
    backgroundColor: '#FFFBF5',
    border: '1px solid #E8A75D40',
    borderRadius: '6px',
    padding: '6px 8px',
    marginBottom: '8px',
  },
  recentActivityLabel: {
    fontSize: '9px',
    fontWeight: '600',
    color: '#8B6F47',
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: '2px',
  },
  recentActivityText: {
    fontSize: '11px',
    color: '#3A3631',
    lineHeight: '1.3',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '6px',
  },
  statusBadge: {
    fontSize: '9px',
    fontWeight: '600',
    padding: '2px 6px',
    borderRadius: '10px',
    textTransform: 'uppercase',
  },
  targetDate: {
    fontSize: '10px',
    color: '#6B6554',
  },
  stakeholderRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
  },
  stakeholderBadge: {
    fontSize: '9px',
    padding: '2px 6px',
    backgroundColor: '#FAF8F3',
    borderRadius: '10px',
    color: '#6B6554',
    border: '1px solid #E8E3D8',
  },
};

export default MomentumProjectCard;
