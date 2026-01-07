/**
 * PersonTooltip Component
 *
 * Hover tooltip for person nodes in the PeopleGraph.
 */

import React from 'react';
import { Briefcase, Users } from 'lucide-react';

const PersonTooltip = ({
  node,
  dimensions,
  getTeamColor,
  getAvatarInitials,
}) => {
  if (!node) return null;

  return (
    <div
      style={{
        ...styles.tooltip,
        left: Math.min(node.x + node.radius + 20, dimensions.width - 220),
        top: Math.max(20, Math.min(node.y - 40, dimensions.height - 120))
      }}
    >
      <div style={styles.tooltipHeader}>
        <div
          style={{
            ...styles.tooltipAvatar,
            backgroundColor: `${getTeamColor(node.team)}20`,
            color: getTeamColor(node.team)
          }}
        >
          {getAvatarInitials(node.name)}
        </div>
        <div>
          <div style={styles.tooltipName}>{node.name}</div>
          <div style={styles.tooltipTeam}>{node.team}</div>
        </div>
      </div>
      <div style={styles.tooltipStats}>
        <div style={styles.tooltipStat}>
          <Briefcase size={12} />
          <span>{node.projectCount} project{node.projectCount !== 1 ? 's' : ''}</span>
        </div>
        <div style={styles.tooltipStat}>
          <Users size={12} />
          <span>{node.connections.size} connection{node.connections.size !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  );
};

const styles = {
  tooltip: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
    border: '1px solid #E8E3D8',
    minWidth: '180px',
    zIndex: 100,
    pointerEvents: 'none',
    animation: 'fadeIn 0.2s ease'
  },
  tooltipHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px'
  },
  tooltipAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '700',
    fontFamily: "'Inter', sans-serif"
  },
  tooltipName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#3A3631',
    fontFamily: "'Inter', sans-serif"
  },
  tooltipTeam: {
    fontSize: '12px',
    color: '#6B6554',
    fontFamily: "'Inter', sans-serif"
  },
  tooltipStats: {
    display: 'flex',
    gap: '16px',
    paddingTop: '12px',
    borderTop: '1px solid #E8E3D8'
  },
  tooltipStat: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#6B6554',
    fontFamily: "'Inter', sans-serif"
  },
};

export default PersonTooltip;
