/**
 * InitiativeContainer Component
 *
 * A collapsible container that groups projects under an initiative.
 * Shows initiative name, status, owners, and contains child project cards.
 */

import React from 'react';
import { useProjectStore } from '../store/projectStore';

const InitiativeContainer = ({
  initiative,
  children,
  getPriorityColor,
  getStatusColor,
}) => {
  const { expandedInitiatives, toggleInitiative } = useProjectStore();
  const isExpanded = expandedInitiatives[initiative.id] !== false; // Default to expanded

  // Calculate aggregate progress from projects
  const projects = initiative.projects || [];
  const avgProgress = projects.length > 0
    ? Math.round(projects.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.length)
    : 0;

  const completedProjects = projects.filter(p => p.status === 'completed').length;

  return (
    <div style={styles.container}>
      <div
        style={styles.header}
        onClick={() => toggleInitiative(initiative.id)}
      >
        <div style={styles.headerLeft}>
          <span style={styles.expandIcon}>
            {isExpanded ? '▼' : '▶'}
          </span>
          <div style={{
            ...styles.priorityDot,
            backgroundColor: getPriorityColor(initiative.priority),
          }} />
          <span style={styles.initiativeName}>{initiative.name}</span>
        </div>

        <div style={styles.headerRight}>
          {/* Status badge */}
          <span style={{
            ...styles.statusBadge,
            backgroundColor: getStatusColor(initiative.status) + '25',
            color: getStatusColor(initiative.status),
          }}>
            {initiative.status}
          </span>

          {/* Progress indicator */}
          <div style={styles.progressContainer}>
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${avgProgress}%`,
                  backgroundColor: getPriorityColor(initiative.priority),
                }}
              />
            </div>
            <span style={styles.progressText}>{avgProgress}%</span>
          </div>

          {/* Project count */}
          <span style={styles.projectCount}>
            {completedProjects}/{projects.length} projects
          </span>

          {/* Owners */}
          {initiative.owners?.length > 0 && (
            <div style={styles.owners}>
              {initiative.owners.slice(0, 3).map((owner, i) => (
                <span key={owner.id || i} style={styles.ownerBadge} title={owner.name}>
                  {owner.name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              ))}
              {initiative.owners.length > 3 && (
                <span style={styles.ownerOverflow}>+{initiative.owners.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {isExpanded && (
        <div style={styles.content}>
          {initiative.description && (
            <p style={styles.description}>{initiative.description}</p>
          )}
          <div style={styles.projectsGrid}>
            {children}
          </div>
          {projects.length === 0 && (
            <p style={styles.emptyState}>No projects in this initiative yet.</p>
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: '#FAFAF8',
    border: '1px solid #E8E3D8',
    borderRadius: '16px',
    marginBottom: '16px',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    backgroundColor: '#F5F3EE',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    borderBottom: '1px solid #E8E3D8',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  expandIcon: {
    fontSize: '10px',
    color: '#6B6554',
    width: '12px',
    transition: 'transform 0.2s',
  },
  priorityDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  initiativeName: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#3A3631',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  statusBadge: {
    fontSize: '10px',
    fontWeight: '600',
    padding: '3px 8px',
    borderRadius: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  progressBar: {
    width: '60px',
    height: '6px',
    backgroundColor: '#E8E3D8',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#6B6554',
    minWidth: '32px',
  },
  projectCount: {
    fontSize: '11px',
    color: '#6B6554',
  },
  owners: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  ownerBadge: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#E8E3D8',
    color: '#6B6554',
    fontSize: '11px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #FFFFFF',
  },
  ownerOverflow: {
    fontSize: '10px',
    color: '#6B6554',
    marginLeft: '2px',
  },
  content: {
    padding: '16px',
  },
  description: {
    fontSize: '12px',
    color: '#6B6554',
    lineHeight: '1.5',
    margin: '0 0 12px 0',
    paddingBottom: '12px',
    borderBottom: '1px solid #E8E3D8',
  },
  projectsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px',
  },
  emptyState: {
    fontSize: '12px',
    color: '#9B9488',
    textAlign: 'center',
    padding: '20px',
    margin: 0,
  },
};

export default InitiativeContainer;
