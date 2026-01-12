import React, { useCallback } from 'react';
import MomentumChatWithAgent from '../components/MomentumChatWithAgent';
import { useUIStore, useProjectStore, useMomentumStore } from '../store';
import { usePortfolioData } from '../hooks/usePortfolioData';

export default function MomentumView() {
  // Get UI state from stores
  const {
    recentlyUpdatedProjects,
    markProjectUpdated,
  } = useUIStore();

  const {
    expandedMomentumProjects,
    setExpandedMomentumProjects,
  } = useProjectStore();

  const {
    messages,
    addMessage,
    setMessages,
  } = useMomentumStore();

  // Get portfolio data and operations
  const { people } = usePortfolioData();

  // Get logged in user from localStorage (fallback to empty string)
  const loggedInUser = localStorage.getItem('manity_logged_in_user') || '';

  // Get sorted conversation messages
  const getConversation = useCallback(() => {
    return [...messages].sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [messages]);

  // Handle new messages
  const handleSendMessage = useCallback((message) => {
    addMessage(message);
  }, [addMessage]);

  // Handle applied actions
  const handleApplyActions = useCallback((actionResults, updatedProjectIds) => {
    // Track recently updated projects for highlighting with timestamps
    if (updatedProjectIds && updatedProjectIds.length > 0) {
      updatedProjectIds.forEach(id => {
        markProjectUpdated(id);
      });

      // Expand updated momentum projects
      setExpandedMomentumProjects({
        ...expandedMomentumProjects,
        ...Object.fromEntries(
          updatedProjectIds.map(id => [String(id), true])
        )
      });
    }
  }, [markProjectUpdated, expandedMomentumProjects, setExpandedMomentumProjects]);

  // Handle undo action
  const handleUndoAction = useCallback((messageId, actionIndex) => {
    // Find and update the message with the undone action
    const updatedMessages = messages.map(message => {
      if (message.id !== messageId || !message.actionResults || !message.actionResults[actionIndex]) {
        return message;
      }

      const targetAction = message.actionResults[actionIndex];
      if (targetAction.undone || !targetAction.deltas || targetAction.deltas.length === 0) {
        return message;
      }

      // Mark the action as undone
      const updatedActionResults = [...message.actionResults];
      updatedActionResults[actionIndex] = {
        ...targetAction,
        undone: true
      };

      return {
        ...message,
        actionResults: updatedActionResults
      };
    });

    // Update messages in store
    setMessages(updatedMessages);
  }, [messages, setMessages]);

  return (
    <div style={styles.wrapper}>
      <MomentumChatWithAgent
        messages={getConversation()}
        onSendMessage={handleSendMessage}
        onApplyActions={handleApplyActions}
        onUndoAction={handleUndoAction}
        loggedInUser={loggedInUser}
        people={people}
        recentlyUpdatedProjects={recentlyUpdatedProjects}
      />
    </div>
  );
}

const styles = {
  wrapper: {
    width: '100%',
    height: '100%',
  }
};
