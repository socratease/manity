import React, { useState, useEffect, useRef } from 'react';

/**
 * ThinkingProcess Component
 *
 * Displays the AI's planning and execution process in a collapsible UI.
 * Shows real-time streaming content, reasoning, and tool interactions.
 * Auto-expands when in progress and auto-scrolls to show latest updates.
 */
export default function ThinkingProcess({ steps = [], colors, autoExpand = true }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentRef = useRef(null);
  const prevStepsLengthRef = useRef(0);

  if (!steps || steps.length === 0) {
    return null;
  }

  const sortedSteps = [...steps].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  const styles = getStyles(colors);

  const headerStatus = (() => {
    const statuses = sortedSteps.map((step) => step.status);
    if (statuses.includes('failed')) return 'failed';
    if (statuses.includes('awaiting_user')) return 'awaiting_user';
    if (statuses.includes('in_progress')) return 'in_progress';
    if (statuses.every((status) => status === 'completed')) return 'completed';
    return 'pending';
  })();

  // Auto-expand when in progress
  useEffect(() => {
    if (autoExpand && headerStatus === 'in_progress' && !isExpanded) {
      setIsExpanded(true);
    }
  }, [headerStatus, autoExpand, isExpanded]);

  // Auto-scroll to bottom when new steps are added
  useEffect(() => {
    if (isExpanded && contentRef.current && steps.length > prevStepsLengthRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
    prevStepsLengthRef.current = steps.length;
  }, [steps, isExpanded]);

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
      case 'in_progress': return colors.sky || '#4A90D9';
      case 'pending': return colors.stone;
      default: return colors.earth;
    }
  };

  // Get step type icon
  const getStepTypeIcon = (type) => {
    switch (type) {
      case 'reasoning': return '💭';
      case 'planning': return '📋';
      case 'tool_call': return '🔧';
      case 'tool_result': return '📤';
      case 'user_question': return '❓';
      default: return '•';
    }
  };

  const headerColor = getStatusColor(headerStatus);

  // Filter out empty reasoning steps (no content and not in progress)
  const visibleSteps = sortedSteps.filter(step => {
    if (step.type === 'reasoning' && !step.content && step.status !== 'in_progress') {
      return false;
    }
    return true;
  });

  return (
    <div style={styles.container}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={styles.toggleButton}
        aria-expanded={isExpanded}
      >
        <span style={{
          ...styles.toggleIcon,
          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
        }}>▶</span>
        <span style={styles.toggleText}>
          {headerStatus === 'in_progress' ? 'Thinking...' : 'Thinking Process'}
        </span>
        <span style={{
          ...styles.badge,
          backgroundColor: headerColor + '25',
          color: headerColor,
        }}>
          {headerStatus === 'completed' ? 'Done'
            : headerStatus === 'failed' ? 'Failed'
            : headerStatus === 'awaiting_user' ? 'Waiting'
            : headerStatus === 'in_progress' ? 'Active'
            : 'Pending'}
        </span>
        {headerStatus === 'in_progress' && (
          <span style={styles.pulsingDot} />
        )}
      </button>

      {isExpanded && (
        <div ref={contentRef} style={styles.content}>
          {visibleSteps.map((step, index) => {
            const statusColor = getStatusColor(step.status);
            const isInProgress = step.status === 'in_progress';

            return (
              <div
                key={step.id || index}
                style={{
                  ...styles.step,
                  borderLeftColor: statusColor,
                  opacity: step.status === 'pending' ? 0.6 : 1,
                }}
              >
                <div style={styles.stepHeader}>
                  <span style={styles.stepTypeIcon}>
                    {getStepTypeIcon(step.type)}
                  </span>
                  <span style={styles.stepType}>{formatStepType(step.type)}</span>
                  <span style={{
                    ...styles.statusIcon,
                    color: statusColor,
                    animation: isInProgress ? 'spin 1s linear infinite' : 'none',
                  }}>
                    {getStatusIcon(step.status)}
                  </span>
                </div>

                {/* Reasoning/content display with streaming support */}
                {(step.content || isInProgress) && step.type === 'reasoning' && (
                  <div style={styles.reasoningContent}>
                    {step.content || ''}
                    {isInProgress && (
                      <span style={styles.cursor}>▊</span>
                    )}
                  </div>
                )}

                {/* Non-reasoning step content */}
                {step.content && step.type !== 'reasoning' && step.type !== 'tool_call' && step.type !== 'tool_result' && (
                  <div style={styles.stepContent}>{step.content}</div>
                )}

                {/* Tool call display */}
                {step.type === 'tool_call' && step.toolName && (
                  <div style={styles.toolSection}>
                    <span style={styles.toolName}>{step.toolName}</span>
                    {step.toolInput && Object.keys(step.toolInput).length > 0 && (
                      <div style={styles.toolInput}>
                        {Object.entries(step.toolInput).map(([key, value]) => (
                          <div key={key} style={styles.inputParam}>
                            <span style={styles.paramKey}>{key}:</span>
                            <span style={styles.paramValue}>
                              {typeof value === 'object'
                                ? JSON.stringify(value)
                                : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {step.toolResult && (
                      <div style={styles.toolResult}>
                        <span style={styles.resultArrow}>→</span>
                        <span style={styles.resultText}>{step.toolResult}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Tool result (standalone) */}
                {step.type === 'tool_result' && step.content && (
                  <div style={styles.toolResultStandalone}>
                    {step.toolName && (
                      <span style={styles.resultToolName}>{step.toolName}:</span>
                    )}
                    <span style={styles.resultContent}>{step.content}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
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
      return 'Result';
    case 'user_question':
      return 'Awaiting User';
    default:
      return type;
  }
};

const getStyles = (colors) => ({
  container: {
    marginTop: '8px',
    border: `1px solid ${colors.earth}30`,
    borderRadius: '10px',
    backgroundColor: '#FDFCFA',
    overflow: 'hidden',
  },
  toggleButton: {
    width: '100%',
    padding: '10px 14px',
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
  },
  toggleIcon: {
    fontSize: '8px',
    color: colors.stone,
    transition: 'transform 0.2s',
  },
  toggleText: {
    flex: 1,
    textAlign: 'left',
    color: colors.earth,
    fontSize: '12px',
  },
  badge: {
    fontSize: '9px',
    fontWeight: '700',
    padding: '2px 8px',
    borderRadius: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  pulsingDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: colors.sky || '#4A90D9',
    animation: 'pulse 1.5s infinite',
    marginLeft: '4px',
  },
  content: {
    padding: '8px 12px 12px',
    borderTop: `1px solid ${colors.earth}15`,
    maxHeight: '300px',
    overflowY: 'auto',
  },
  step: {
    marginBottom: '8px',
    padding: '8px 10px',
    backgroundColor: '#FFF',
    borderRadius: '6px',
    borderLeft: '3px solid',
    borderLeftColor: colors.stone,
  },
  stepHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '4px',
  },
  stepTypeIcon: {
    fontSize: '12px',
  },
  stepType: {
    fontSize: '10px',
    fontWeight: '600',
    color: colors.stone,
    flex: 1,
  },
  statusIcon: {
    fontSize: '11px',
    fontWeight: '700',
  },
  reasoningContent: {
    fontSize: '12px',
    color: colors.earth,
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  cursor: {
    display: 'inline-block',
    color: colors.sky || '#4A90D9',
    animation: 'blink 1s step-end infinite',
    marginLeft: '2px',
  },
  stepContent: {
    fontSize: '11px',
    color: colors.earth,
    lineHeight: '1.4',
  },
  toolSection: {
    marginTop: '4px',
  },
  toolName: {
    fontSize: '11px',
    fontWeight: '700',
    color: colors.amber,
    fontFamily: 'ui-monospace, monospace',
    backgroundColor: colors.amber + '15',
    padding: '2px 6px',
    borderRadius: '4px',
    display: 'inline-block',
  },
  toolInput: {
    marginTop: '6px',
    paddingLeft: '10px',
    borderLeft: `2px solid ${colors.cloud || '#E8E3D8'}`,
    fontSize: '10px',
  },
  inputParam: {
    color: colors.stone,
    marginBottom: '2px',
    display: 'flex',
    gap: '4px',
    flexWrap: 'wrap',
  },
  paramKey: {
    fontWeight: '600',
    color: colors.stone,
  },
  paramValue: {
    fontFamily: 'ui-monospace, monospace',
    color: colors.earth,
    wordBreak: 'break-word',
  },
  toolResult: {
    marginTop: '6px',
    padding: '6px 8px',
    backgroundColor: colors.sage + '10',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '6px',
  },
  resultArrow: {
    color: colors.sage,
    fontWeight: '700',
    fontSize: '12px',
  },
  resultText: {
    fontSize: '10px',
    color: colors.earth,
    lineHeight: '1.4',
    flex: 1,
    wordBreak: 'break-word',
  },
  toolResultStandalone: {
    fontSize: '10px',
    color: colors.earth,
    lineHeight: '1.4',
    padding: '6px 8px',
    backgroundColor: colors.sage + '10',
    borderRadius: '4px',
  },
  resultToolName: {
    fontWeight: '600',
    color: colors.sage,
    marginRight: '6px',
  },
  resultContent: {
    color: colors.earth,
    wordBreak: 'break-word',
  },
});
