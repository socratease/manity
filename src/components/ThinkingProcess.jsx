import React, { useState } from 'react';

/**
 * ThinkingProcess Component
 *
 * Displays the AI's planning and execution process in a collapsible UI.
 * Shows the goal, steps, rationales, and execution status.
 */
export default function ThinkingProcess({ plan, executionLog, colors }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!plan && !executionLog) {
    return null;
  }

  const styles = getStyles(colors);

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return '✓';
      case 'failure': return '✗';
      case 'skipped': return '⊘';
      case 'blocked': return '⏸';
      default: return '○';
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return colors.sage;
      case 'failure': return colors.coral;
      case 'skipped': return colors.stone;
      case 'blocked': return colors.amber;
      default: return colors.earth;
    }
  };

  return (
    <div style={styles.container}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={styles.toggleButton}
        aria-expanded={isExpanded}
      >
        <span style={styles.toggleIcon}>{isExpanded ? '▼' : '▶'}</span>
        <span style={styles.toggleText}>Thinking Process</span>
        <span style={styles.badge}>
          {plan?.status === 'completed' ? 'Completed' :
           plan?.status === 'failed' ? 'Failed' :
           'In Progress'}
        </span>
      </button>

      {isExpanded && (
        <div style={styles.content}>
          {/* Goal */}
          {plan?.goal && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Goal</div>
              <div style={styles.goalText}>{plan.goal}</div>
            </div>
          )}

          {/* Steps */}
          {plan?.steps && plan.steps.length > 0 && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>
                Planning Steps ({plan.steps.length})
              </div>
              {plan.steps.map((step, index) => {
                const executionEvent = executionLog?.events?.[index];
                const status = executionEvent?.status || 'pending';

                return (
                  <div key={index} style={styles.step}>
                    <div style={styles.stepHeader}>
                      <span style={{
                        ...styles.stepNumber,
                        backgroundColor: getStatusColor(status) + '25',
                        color: getStatusColor(status),
                      }}>
                        {index + 1}
                      </span>
                      <span style={{
                        ...styles.statusIcon,
                        color: getStatusColor(status),
                      }}>
                        {getStatusIcon(status)}
                      </span>
                      <span style={styles.stepRationale}>{step.rationale}</span>
                    </div>

                    {/* Tool candidates */}
                    {step.toolCandidates && step.toolCandidates.length > 0 && (
                      <div style={styles.toolCandidates}>
                        {step.toolCandidates.map((candidate, tcIndex) => (
                          <div key={tcIndex} style={styles.toolCandidate}>
                            <span style={styles.toolName}>
                              {candidate.toolName}
                            </span>
                            {Object.keys(candidate.input || {}).length > 0 && (
                              <div style={styles.toolInput}>
                                {Object.entries(candidate.input).map(([key, value]) => (
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
                        ))}
                      </div>
                    )}

                    {/* Execution result */}
                    {executionEvent && (
                      <div style={styles.executionResult}>
                        <div style={styles.resultLabel}>
                          {executionEvent.label}
                        </div>
                        {executionEvent.detail && (
                          <div style={styles.resultDetail}>
                            {executionEvent.detail}
                          </div>
                        )}
                        {executionEvent.error && (
                          <div style={styles.resultError}>
                            Error: {executionEvent.error}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Execution metadata */}
          {executionLog && (
            <div style={styles.metadata}>
              <div style={styles.metadataItem}>
                <span style={styles.metadataLabel}>Execution ID:</span>
                <span style={styles.metadataValue}>{executionLog.id}</span>
              </div>
              {executionLog.startedAt && (
                <div style={styles.metadataItem}>
                  <span style={styles.metadataLabel}>Started:</span>
                  <span style={styles.metadataValue}>
                    {new Date(executionLog.startedAt).toLocaleTimeString()}
                  </span>
                </div>
              )}
              {executionLog.completedAt && (
                <div style={styles.metadataItem}>
                  <span style={styles.metadataLabel}>Completed:</span>
                  <span style={styles.metadataValue}>
                    {new Date(executionLog.completedAt).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
  resultError: {
    fontSize: '10px',
    color: colors.coral,
    fontWeight: '500',
    marginTop: '4px',
  },
  metadata: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: `1px solid ${colors.cloud}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  metadataItem: {
    fontSize: '9px',
    color: colors.stone,
    display: 'flex',
    gap: '6px',
  },
  metadataLabel: {
    fontWeight: '600',
  },
  metadataValue: {
    fontFamily: 'monospace',
  },
});
