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
  const [isHovered, setIsHovered] = React.useState(false);

  const projects = initiative.projects || [];
  const completedProjects = projects.filter(p => p.status === 'completed').length;

  return (
    <div style={styles.container}>
      <style>{`
        .initiative-content::-webkit-scrollbar {
          width: 6px;
        }
        .initiative-content::-webkit-scrollbar-track {
          background: transparent;
        }
        .initiative-content::-webkit-scrollbar-thumb {
          background: #E8E3D8;
          border-radius: 3px;
        }
        .initiative-content::-webkit-scrollbar-thumb:hover {
          background: #D1CCBF;
        }
      `}</style>
      {/* Fieldset-style border with legend */}
      <fieldset style={{
        ...styles.fieldset,
        borderColor: getStatusColor(initiative.status) + '60',
      }}>
        <legend style={styles.legend}>
          <button
            onClick={() => toggleInitiative(initiative.id)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
              ...styles.legendButton,
              opacity: isHovered ? 0.7 : 1,
            }}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <span style={styles.expandIcon}>
              {isExpanded ? '−' : '+'}
            </span>
            <span style={styles.initiativeName}>{initiative.name}</span>
            <span style={{
              ...styles.statusBadge,
              backgroundColor: getStatusColor(initiative.status) + '15',
              color: getStatusColor(initiative.status),
            }}>
              {initiative.status}
            </span>
            <span style={styles.projectCount}>
              {completedProjects}/{projects.length}
            </span>
          </button>
        </legend>

        {isExpanded && (
          <div style={styles.content} className="initiative-content">
            <div style={styles.projectsGrid}>
              {children}
            </div>
            {projects.length === 0 && (
              <p style={styles.emptyState}>No projects in this initiative yet.</p>
            )}
          </div>
        )}
      </fieldset>
    </div>
  );
};

const styles = {
  container: {
    marginBottom: '24px',
  },
  fieldset: {
    border: '1px solid',
    borderRadius: '8px',
    padding: '0',
    margin: '0',
    minWidth: '0',
  },
  legend: {
    padding: '0 8px',
    margin: '0',
    float: 'none',
    width: 'auto',
  },
  legendButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'none',
    border: 'none',
    padding: '4px 0',
    cursor: 'pointer',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'opacity 0.2s ease',
  },
  expandIcon: {
    fontSize: '11px',
    color: '#9B9488',
    fontWeight: '400',
    width: '10px',
    textAlign: 'center',
    transition: 'color 0.2s',
  },
  initiativeName: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#6B6554',
    letterSpacing: '0.3px',
  },
  statusBadge: {
    fontSize: '9px',
    fontWeight: '600',
    padding: '2px 6px',
    borderRadius: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  projectCount: {
    fontSize: '10px',
    color: '#9B9488',
    fontWeight: '500',
  },
  content: {
    padding: '16px',
    maxHeight: '600px',
    overflowY: 'auto',
  },
  projectsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px',
  },
  emptyState: {
    fontSize: '11px',
    color: '#9B9488',
    textAlign: 'center',
    padding: '40px 20px',
    margin: 0,
    fontStyle: 'italic',
  },
};

export default InitiativeContainer;
