/**
 * PersonDetailPanel Component
 *
 * Detailed callout panel for selected person in PeopleGraph.
 */

import React from 'react';
import {
  X,
  Mail,
  Users,
  Briefcase,
  MessageCircle,
  ChevronRight,
  Edit2,
  Check,
  Trash2,
  Calendar,
  Clock,
  LogIn
} from 'lucide-react';

const PersonDetailPanel = ({
  selectedNode,
  node,
  nodes,
  graphOffset,
  dimensions,
  isEditing,
  editForm,
  setEditForm,
  setIsEditing,
  setSelectedNode,
  loginFeedback,
  setLoginFeedback,
  loggedInUser,
  getTeamColor,
  getAvatarInitials,
  getPriorityColor,
  formatDate,
  onUpdatePerson,
  onDeletePerson,
  onViewProject,
  onLoginAs,
}) => {
  if (!node) return null;

  const calloutWidth = 340;
  const calloutMaxHeight = Math.min(500, dimensions.height - 60);
  const padding = 20;

  const nodeX = node.x + graphOffset.x;
  const nodeY = node.y + graphOffset.y;

  const showOnRight = nodeX < dimensions.width / 2;
  const calloutX = showOnRight
    ? nodeX + node.radius + 30
    : nodeX - node.radius - calloutWidth - 30;

  let calloutY = nodeY - 100;
  calloutY = Math.max(padding, Math.min(dimensions.height - calloutMaxHeight - padding, calloutY));

  const connectorStartX = showOnRight ? nodeX + node.radius + 4 : nodeX - node.radius - 4;
  const connectorEndX = showOnRight ? calloutX : calloutX + calloutWidth;
  const connectorY = Math.min(Math.max(nodeY, calloutY + 40), calloutY + calloutMaxHeight - 40);

  const teamColor = getTeamColor(selectedNode.team);

  const handleSaveEdit = async () => {
    if (selectedNode && onUpdatePerson) {
      await onUpdatePerson(selectedNode.id, editForm);
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (selectedNode && onDeletePerson) {
      if (window.confirm(`Delete ${selectedNode.name}?`)) {
        await onDeletePerson(selectedNode.id);
        setSelectedNode(null);
      }
    }
  };

  return (
    <>
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 299,
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <path
          d={`M ${connectorStartX} ${nodeY}
          Q ${(connectorStartX + connectorEndX) / 2} ${nodeY},
            ${connectorEndX} ${connectorY}`}
          fill="none"
          stroke={teamColor}
          strokeWidth="2"
          strokeDasharray="6 4"
          opacity="0.6"
          style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
        <circle
          cx={connectorStartX}
          cy={nodeY}
          r="4"
          fill={teamColor}
          style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
        <circle
          cx={connectorEndX}
          cy={connectorY}
          r="4"
          fill={teamColor}
          style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>

      <div
        style={{
          position: 'absolute',
          left: calloutX,
          top: calloutY,
          width: calloutWidth,
          maxHeight: calloutMaxHeight,
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          boxShadow: `0 20px 60px rgba(0, 0, 0, 0.2), 0 0 0 1px ${teamColor}30`,
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 300,
          overflow: 'hidden',
          animation: 'scaleIn 0.25s ease',
          transformOrigin: showOnRight ? 'left center' : 'right center'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ maxHeight: calloutMaxHeight, overflowY: 'auto' }}>
          {/* Header */}
          <div style={{
            background: `linear-gradient(135deg, ${teamColor}15 0%, ${teamColor}05 100%)`,
            padding: '20px 20px 16px',
            borderBottom: `1px solid ${teamColor}20`,
            position: 'relative'
          }}>
            <button
              style={styles.closeButton}
              onClick={() => setSelectedNode(null)}
            >
              <X size={16} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  ...styles.avatar,
                  backgroundColor: `${teamColor}20`,
                  border: `3px solid ${teamColor}`,
                  color: teamColor,
                }}
              >
                {getAvatarInitials(selectedNode.name)}
              </div>

              {isEditing ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Name"
                    style={styles.input}
                    autoFocus
                  />
                  <input
                    type="text"
                    value={editForm.team}
                    onChange={e => setEditForm(f => ({ ...f, team: e.target.value }))}
                    placeholder="Team"
                    style={styles.input}
                  />
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="Email"
                    style={styles.input}
                  />
                </div>
              ) : (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={styles.name}>{selectedNode.name}</h3>
                  <div style={{ ...styles.team, color: teamColor }}>
                    <span style={{ ...styles.teamDot, backgroundColor: teamColor }} />
                    {selectedNode.team}
                  </div>
                  {selectedNode.email && (
                    <div style={styles.email}>
                      <Mail size={12} />
                      {selectedNode.email}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              {isEditing ? (
                <>
                  <button style={styles.saveBtn} onClick={handleSaveEdit}>
                    <Check size={14} />
                    Save
                  </button>
                  <button style={styles.cancelBtn} onClick={() => setIsEditing(false)}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    style={{
                      ...styles.loginBtn,
                      ...(loggedInUser === selectedNode.name ? styles.loginBtnActive : {}),
                      ...(loginFeedback === selectedNode.name ? styles.loginBtnFeedback : {})
                    }}
                    onClick={() => {
                      onLoginAs?.(selectedNode.name);
                      setLoginFeedback(selectedNode.name);
                      setTimeout(() => setLoginFeedback(null), 2000);
                    }}
                    title="Log in as this person"
                  >
                    <LogIn size={14} />
                    {loginFeedback === selectedNode.name ? 'Logged in!' :
                     loggedInUser === selectedNode.name ? 'Logged in' : 'Log in'}
                  </button>
                  <button
                    style={styles.editBtn}
                    onClick={() => setIsEditing(true)}
                    title="Edit person"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    style={styles.deleteBtn}
                    onClick={handleDelete}
                    title="Delete person"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div style={styles.statsGrid}>
            {[
              { icon: Briefcase, value: selectedNode.projectCount, label: 'Projects', color: '#8B6F47' },
              { icon: Users, value: selectedNode.connections.size, label: 'Connections', color: '#7A9B76' },
              { icon: MessageCircle, value: selectedNode.activities.length, label: 'Activities', color: '#E8A75D' }
            ].map(({ icon: Icon, value, label, color }) => (
              <div key={label} style={styles.statItem}>
                <Icon size={16} style={{ color, marginBottom: '4px' }} />
                <div style={styles.statValue}>{value}</div>
                <div style={styles.statLabel}>{label}</div>
              </div>
            ))}
          </div>

          {/* Projects */}
          <div style={{ padding: '16px 20px' }}>
            <h4 style={styles.sectionTitle}>
              <Briefcase size={14} />
              Projects
            </h4>
            {selectedNode.projects.length === 0 ? (
              <div style={styles.emptyText}>No projects yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {selectedNode.projects.slice(0, 4).map(project => (
                  <div
                    key={project.id}
                    style={styles.projectItem}
                    onClick={() => onViewProject?.(project.id)}
                  >
                    <span style={{ ...styles.projectDot, backgroundColor: getPriorityColor(project.priority) }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={styles.projectName}>{project.name}</div>
                      <div style={styles.projectStatus}>{project.status}</div>
                    </div>
                    <ChevronRight size={14} style={{ color: '#6B6554', flexShrink: 0 }} />
                  </div>
                ))}
                {selectedNode.projects.length > 4 && (
                  <div style={{ fontSize: '12px', color: '#6B6554', fontStyle: 'italic', paddingLeft: '18px' }}>
                    +{selectedNode.projects.length - 4} more
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div style={{ padding: '0 20px 16px', borderTop: '1px solid #E8E3D8', marginTop: '-1px', paddingTop: '16px' }}>
            <h4 style={styles.sectionTitle}>
              <Clock size={14} />
              Recent Activity
            </h4>
            {selectedNode.activities.length === 0 ? (
              <div style={styles.emptyText}>No recent activity</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedNode.activities.slice(0, 3).map((activity, idx) => (
                  <div key={activity.id || idx} style={{ display: 'flex', gap: '10px' }}>
                    <div style={styles.activityDot} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={styles.activityProject}>{activity.projectName}</div>
                      <div style={styles.activityNote}>{activity.note}</div>
                      <div style={styles.activityDate}>
                        <Calendar size={10} />
                        {formatDate(activity.date)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Connections */}
          {selectedNode.connections.size > 0 && (
            <div style={{ padding: '0 20px 20px', borderTop: '1px solid #E8E3D8', marginTop: '-1px', paddingTop: '16px' }}>
              <h4 style={styles.sectionTitle}>
                <Users size={14} />
                Works With
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {Array.from(selectedNode.connections).slice(0, 6).map(connId => {
                  const connNode = nodes.find(n => n.id === connId);
                  if (!connNode) return null;

                  return (
                    <div
                      key={connId}
                      style={styles.connectionChip}
                      onClick={() => {
                        setSelectedNode(connNode);
                        setEditForm({
                          name: connNode.name,
                          team: connNode.team,
                          email: connNode.email || ''
                        });
                        setIsEditing(false);
                      }}
                    >
                      <div
                        style={{
                          ...styles.connectionAvatar,
                          backgroundColor: `${getTeamColor(connNode.team)}20`,
                          color: getTeamColor(connNode.team),
                        }}
                      >
                        {getAvatarInitials(connNode.name)}
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: '500', color: '#3A3631' }}>
                        {connNode.name.split(' ')[0]}
                      </span>
                    </div>
                  );
                })}
                {selectedNode.connections.size > 6 && (
                  <div style={{ ...styles.connectionChip, backgroundColor: '#E8E3D8', cursor: 'default' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#6B6554' }}>
                      +{selectedNode.connections.size - 6}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const styles = {
  closeButton: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'rgba(255,255,255,0.8)',
    color: '#6B6554',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease'
  },
  avatar: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: '700',
    fontFamily: "'Inter', sans-serif",
    flexShrink: 0
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #E8E3D8',
    borderRadius: '8px',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    outline: 'none',
    boxSizing: 'border-box'
  },
  name: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#3A3631',
    letterSpacing: '-0.3px'
  },
  team: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '4px',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600'
  },
  teamDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%'
  },
  email: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '6px',
    fontSize: '12px',
    color: '#6B6554',
    fontFamily: "'Inter', sans-serif"
  },
  saveBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '8px 16px',
    backgroundColor: '#7A9B76',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    fontFamily: "'Inter', sans-serif",
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  cancelBtn: {
    padding: '8px 16px',
    backgroundColor: '#FAF8F3',
    color: '#6B6554',
    border: '1px solid #E8E3D8',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    fontFamily: "'Inter', sans-serif",
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  loginBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '8px 16px',
    backgroundColor: '#FAF8F3',
    color: '#6B6554',
    border: '1px solid #E8E3D8',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    fontFamily: "'Inter', sans-serif",
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  loginBtnActive: {
    backgroundColor: '#7A9B76',
    color: '#FFFFFF',
    border: 'none'
  },
  loginBtnFeedback: {
    backgroundColor: '#7A9B76',
    color: '#FFFFFF',
    border: 'none',
    animation: 'pulse 0.5s ease'
  },
  editBtn: {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF8F3',
    color: '#6B6554',
    border: '1px solid #E8E3D8',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  deleteBtn: {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF8F3',
    color: '#D67C5C',
    border: '1px solid #E8E3D8',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1px',
    backgroundColor: '#E8E3D8',
    borderBottom: '1px solid #E8E3D8'
  },
  statItem: {
    backgroundColor: '#FFFFFF',
    padding: '12px 8px',
    textAlign: 'center'
  },
  statValue: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#3A3631'
  },
  statLabel: {
    fontSize: '10px',
    color: '#6B6554',
    fontFamily: "'Inter', sans-serif",
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '0 0 12px 0',
    fontSize: '12px',
    fontWeight: '700',
    color: '#6B6554',
    fontFamily: "'Inter', sans-serif",
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  emptyText: {
    fontSize: '13px',
    color: '#6B6554',
    fontStyle: 'italic',
    fontFamily: "'Inter', sans-serif"
  },
  projectItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 12px',
    backgroundColor: '#FAF8F3',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  projectDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0
  },
  projectName: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#3A3631',
    fontFamily: "'Inter', sans-serif",
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  projectStatus: {
    fontSize: '11px',
    color: '#6B6554',
    fontFamily: "'Inter', sans-serif",
    textTransform: 'capitalize'
  },
  activityDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#E8A75D',
    marginTop: '6px',
    flexShrink: 0
  },
  activityProject: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#8B6F47',
    fontFamily: "'Inter', sans-serif"
  },
  activityNote: {
    fontSize: '12px',
    color: '#3A3631',
    fontFamily: "'Inter', sans-serif",
    lineHeight: '1.4',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical'
  },
  activityDate: {
    fontSize: '10px',
    color: '#6B6554',
    marginTop: '2px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  connectionChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 10px 4px 4px',
    backgroundColor: '#FAF8F3',
    borderRadius: '999px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  connectionAvatar: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '9px',
    fontWeight: '700',
    fontFamily: "'Inter', sans-serif"
  },
};

export default PersonDetailPanel;
