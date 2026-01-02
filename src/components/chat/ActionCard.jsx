/**
 * ActionCard Component
 *
 * Displays an action result in the chat (create, update, comment, etc).
 */

import React from 'react';

const ActionCard = ({
  action,
  index,
  messageId,
  onUndo,
  colors,
}) => {
  const icons = {
    update_project: '↻',
    update_task: '✓',
    comment: '💬',
    create_project: '✦',
    add_task: '➕'
  };

  const labels = {
    update_project: 'Updated',
    update_task: 'Task updated',
    comment: 'Commented',
    create_project: 'Created',
    add_task: 'Added task'
  };

  const statusColor = action.undone
    ? colors.stone
    : action.error
    ? colors.coral
    : colors.sage;

  const statusBg = action.undone
    ? colors.stone + '25'
    : action.error
    ? colors.coral + '25'
    : colors.sage + '25';

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.icon}>{icons[action.type] || '•'}</span>
        <span style={styles.label}>{labels[action.type] || 'Action'}</span>
        <span style={styles.project}>{action.label || action.type}</span>
        <span style={{ ...styles.status, backgroundColor: statusBg, color: statusColor }}>
          {action.undone ? 'undone' : action.error ? 'failed' : 'completed'}
        </span>
        {!action.undone && !action.error && onUndo && (
          <button
            onClick={() => onUndo(messageId, index)}
            style={styles.undoButton}
            title="Undo this action"
          >
            ↶
          </button>
        )}
      </div>
      {action.error && (
        <div style={styles.content}>{action.error}</div>
      )}
      {action.detail && !action.error && (
        <div style={styles.detail}>{action.detail}</div>
      )}
    </div>
  );
};

const styles = {
  card: {
    backgroundColor: '#F9F7F3',
    border: '1px solid #E8E3D8',
    borderRadius: '10px',
    padding: '10px 12px',
    borderLeft: '3px solid #E8A75D',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  icon: {
    fontSize: '13px',
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderRadius: '5px',
    border: '1px solid #E8E3D8',
  },
  label: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#6B6554',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  project: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#3A3631',
  },
  status: {
    fontSize: '9px',
    fontWeight: '700',
    padding: '2px 6px',
    borderRadius: '10px',
    textTransform: 'uppercase',
    marginLeft: 'auto',
  },
  undoButton: {
    width: '22px',
    height: '22px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    border: '1px solid #E8E3D8',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    color: '#6B6554',
    transition: 'all 0.2s ease',
  },
  content: {
    marginTop: '6px',
    fontSize: '12px',
    color: '#D67C5C',
    paddingLeft: '8px',
    borderLeft: '2px solid #E8E3D8',
  },
  detail: {
    marginTop: '6px',
    fontSize: '11px',
    color: '#6B6554',
    paddingLeft: '8px',
    borderLeft: '2px solid #E8A75D',
    fontStyle: 'italic',
  },
};

export default ActionCard;
