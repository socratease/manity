/**
 * ChatMessage Component
 *
 * Renders a single chat message bubble in the Momentum chat.
 */

import React, { forwardRef } from 'react';
import ThinkingProcess from '../ThinkingProcess';
import UserQuestionPrompt from '../UserQuestionPrompt';
import ActionCard from './ActionCard';

const ChatMessage = forwardRef(({
  message,
  linkedMessageId,
  setLinkedMessageId,
  onUndoAction,
  onUserQuestionResponse,
  onUserQuestionCancel,
  colors,
  isTyping,
}, ref) => {
  const isUser = message.role === 'user';
  const isLinked = (message.linkedProjectIds?.length > 0) || (message.updatedProjectIds?.length > 0);

  const formatTime = (ts) => new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <div
      ref={ref}
      style={{ ...styles.wrapper, justifyContent: isUser ? 'flex-end' : 'flex-start' }}
      onMouseEnter={() => isLinked && setLinkedMessageId(message.id)}
      onMouseLeave={() => setLinkedMessageId(null)}
    >
      <div style={{
        ...styles.bubble,
        flexDirection: isUser ? 'row-reverse' : 'row',
        ...(isLinked && linkedMessageId === message.id ? { transform: 'scale(1.01)' } : {}),
      }}>
        {!isUser && <div style={styles.avatar}>M</div>}
        <div style={styles.content}>
          <div style={{
            ...styles.text,
            ...(isUser ? styles.userText : styles.assistantText),
          }}>
            {message.note || message.content}
          </div>

          {/* Thinking Process - shows agent's reasoning */}
          {message.thinkingSteps?.length > 0 && (
            <ThinkingProcess
              plan={{
                goal: message.content,
                steps: message.thinkingSteps.map(step => ({
                  rationale: step.content,
                  toolCandidates: step.toolName ? [{
                    toolName: step.toolName,
                    input: step.toolInput || {},
                  }] : [],
                })),
                status: message.pendingQuestion ? 'in_progress' : 'completed',
              }}
              executionLog={{
                id: message.id,
                events: message.thinkingSteps.map(step => ({
                  status: step.status,
                  label: step.toolResult || step.content,
                })),
              }}
              colors={colors}
            />
          )}

          {/* User Question Prompt - when agent needs clarification */}
          {message.pendingQuestion && (
            <UserQuestionPrompt
              question={message.pendingQuestion}
              onRespond={onUserQuestionResponse}
              onCancel={onUserQuestionCancel}
              colors={colors}
              isLoading={isTyping}
            />
          )}

          {/* Action Results */}
          {message.actionResults?.length > 0 && (
            <div style={styles.actionsContainer}>
              {message.actionResults.map((action, i) => (
                <ActionCard
                  key={i}
                  action={action}
                  index={i}
                  messageId={message.id}
                  onUndo={onUndoAction}
                  colors={colors}
                />
              ))}
            </div>
          )}

          <span style={{ ...styles.timestamp, alignSelf: isUser ? 'flex-end' : 'flex-start' }}>
            {formatTime(message.date || message.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
});

ChatMessage.displayName = 'ChatMessage';

const styles = {
  wrapper: {
    display: 'flex',
    width: '100%',
    animation: 'fadeIn 0.3s ease',
  },
  bubble: {
    maxWidth: '78%',
    display: 'flex',
    gap: '10px',
    transition: 'transform 0.15s',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #8B6F47, #E8A75D)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#FFF',
    fontSize: '14px',
    fontFamily: 'Georgia, serif',
    fontWeight: '700',
    flexShrink: 0,
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  text: {
    padding: '12px 16px',
    borderRadius: '18px',
    fontSize: '14px',
    lineHeight: '1.5',
  },
  userText: {
    background: 'linear-gradient(135deg, #8B6F47, #A68559)',
    color: '#FFFFFF',
    borderBottomRightRadius: '4px',
  },
  assistantText: {
    background: '#F7F4EE',
    border: '1px solid #E8E3D8',
    color: '#3A3631',
    borderBottomLeftRadius: '4px',
  },
  actionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '4px',
  },
  timestamp: {
    fontSize: '10px',
    color: '#6B6554',
    marginTop: '2px',
  },
};

export default ChatMessage;
