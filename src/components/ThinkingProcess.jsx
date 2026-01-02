import React, { useState } from 'react';

/**
 * ThinkingProcess Component
 *
 * Displays the AI's planning and execution process in a collapsible UI.
 * Shows planning, reasoning, and tool interactions.
 */
export default function ThinkingProcess({ steps = [], colors }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!steps || steps.length === 0) {
    return null;
  }

  const sortedSteps = [...steps].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  const styles = getStyles(colors);

  const headerStatus = (() => {
    const statuses = sortedSteps.map((step) => step.status);
    if (statuses.includes('failed')) return 'failed';
    if (statuses.includes('awaiting_user')) return 'awaiting_user';
    if (statuses.every((status) => status === 'completed')) return 'completed';
    return 'in_progress';
  })();

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return '✓';
      case 'failed': return '✗';
      case 'awaiting_user': return '⏸';
      case 'in_progress': return '⟳';
      case 'pending': return '…';
      default: return '○';
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return colors.sage;
      case 'failed': return colors.coral;
      case 'awaiting_user': return colors.amber;
      case 'in_progress': return colors.sky || colors.earth;
      case 'pending': return colors.stone;
      default: return colors.earth;
    }
  };

  const headerColor = getStatusColor(headerStatus);

  return (
    <div style={styles.container}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={styles.toggleButton}
        aria-expanded={isExpanded}
      >
        <span style={styles.toggleIcon}>{isExpanded ? '▼' : '▶'}</span>
        <span style={styles.toggleText}>Thinking Process</span>
        <span style={{
          ...styles.badge,
          backgroundColor: headerColor + '25',
          color: headerColor,
        }}>
          {headerStatus === 'completed' ? 'Completed'
            : headerStatus === 'failed' ? 'Failed'
            : headerStatus === 'awaiting_user' ? 'Awaiting User'
            : 'In Progress'}
        </span>
      </button>

      {isExpanded && (
        <div style={styles.content}>
          {/* Steps */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              Steps ({sortedSteps.length})
            </div>
            {sortedSteps.map((step, index) => {
              const statusColor = getStatusColor(step.status);

              return (
                <div key={step.id || index} style={styles.step}>
                  <div style={styles.stepHeader}>
                    <span style={{
                      ...styles.stepNumber,
                      backgroundColor: statusColor + '25',
                      color: statusColor,
                    }}>
                      {index + 1}
                    </span>
                    <span style={{
                      ...styles.statusIcon,
                      color: statusColor,
                    }}>
                      {getStatusIcon(step.status)}
                    </span>
                    <span style={styles.stepType}>{formatStepType(step.type)}</span>
                  </div>

                  {step.content && (
                    <div style={styles.stepRationale}>{step.content}</div>
                  )}

                  {step.type === 'tool_call' && step.toolName && (
                    <div style={styles.toolCandidates}>
                      <div style={styles.toolCandidate}>
                        <span style={styles.toolName}>{step.toolName}</span>
                        {step.toolInput && Object.keys(step.toolInput).length > 0 && (
                          <div style={styles.toolInput}>
                            {Object.entries(step.toolInput).map(([key, value]) => (
                              <div key={key} style={styles.inputParam}>
                                <span style={styles.paramKey}>{key}:</span>
                                <span style={styles.paramValue}>
                                  {typeof value === 'object'
                                    ? JSON.stringify(value, null, 2)
                                    : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {step.type === 'tool_result' && (step.toolResult || step.toolName) && (
                    <div style={styles.executionResult}>
                      {step.toolName && (
                        <div style={styles.resultLabel}>{step.toolName} result</div>
                      )}
                      {step.toolResult && (
                        <div style={styles.resultDetail}>{step.toolResult}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const formatStepType = (type) => {
  switch (type) {
    case 'planning':
      return 'Planning';
    case 'reasoning':
      return 'Reasoning';
    case 'tool_call':
      return 'Tool Call';
    case 'tool_result':
      return 'Tool Result';
    case 'user_question':
      return 'Awaiting User';
    default:
      return type;
  }
};

const getStyles = (colors) => ({
  container: {
    marginTop: '8px',
    border: `1px solid ${colors.earth}40`,
    borderRadius: '8px',
    backgroundColor: '#FDFCFA',
    overflow: 'hidden',
  },
  toggleButton: {
    width: '100%',
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    color: colors.earth,
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: colors.earth + '10',
    },
  },
  toggleIcon: {
    fontSize: '10px',
    color: colors.earth,
    transition: 'transform 0.2s',
  },
  toggleText: {
    flex: 1,
    textAlign: 'left',
    color: colors.earth,
  },
  badge: {
    fontSize: '9px',
    fontWeight: '700',
    padding: '2px 6px',
    borderRadius: '8px',
    backgroundColor: colors.sage + '25',
    color: colors.sage,
    textTransform: 'uppercase',
  },
  content: {
    padding: '12px',
    borderTop: `1px solid ${colors.earth}20`,
    animation: 'fadeIn 0.3s ease',
  },
  section: {
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '10px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: colors.stone,
    marginBottom: '8px',
  },
  goalText: {
    fontSize: '12px',
    color: colors.earth,
    lineHeight: '1.5',
    fontStyle: 'italic',
    padding: '8px 12px',
    backgroundColor: colors.amber + '10',
    borderLeft: `3px solid ${colors.amber}`,
    borderRadius: '4px',
  },
  step: {
    marginBottom: '12px',
    padding: '10px',
    backgroundColor: '#FFF',
    border: `1px solid ${colors.cloud}`,
    borderRadius: '6px',
  },
  stepHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  stepNumber: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontWeight: '700',
    flexShrink: 0,
  },
  statusIcon: {
    fontSize: '12px',
    fontWeight: '700',
    flexShrink: 0,
  },
  stepRationale: {
    fontSize: '11px',
    color: colors.earth,
    fontWeight: '500',
    lineHeight: '1.4',
    marginBottom: '6px',
  },
  stepType: {
    fontSize: '10px',
    fontWeight: '700',
    color: colors.stone,
  },
  toolCandidates: {
    marginTop: '8px',
    paddingLeft: '30px',
  },
  toolCandidate: {
    marginBottom: '6px',
  },
  toolName: {
    fontSize: '10px',
    fontWeight: '700',
    color: colors.amber,
    fontFamily: 'monospace',
    backgroundColor: colors.amber + '15',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  toolInput: {
    marginTop: '4px',
    marginLeft: '8px',
    paddingLeft: '8px',
    borderLeft: `2px solid ${colors.cloud}`,
  },
  inputParam: {
    fontSize: '10px',
    color: colors.stone,
    marginBottom: '2px',
    display: 'flex',
    gap: '6px',
  },
  paramKey: {
    fontWeight: '600',
    color: colors.stone,
  },
  paramValue: {
    fontFamily: 'monospace',
    color: colors.earth,
    wordBreak: 'break-word',
  },
  executionResult: {
    marginTop: '8px',
    paddingLeft: '30px',
    paddingTop: '8px',
    borderTop: `1px solid ${colors.cloud}`,
  },
  resultLabel: {
    fontSize: '10px',
    fontWeight: '600',
    color: colors.sage,
    marginBottom: '4px',
  },
  resultDetail: {
    fontSize: '10px',
    color: colors.stone,
    lineHeight: '1.4',
  },
});
