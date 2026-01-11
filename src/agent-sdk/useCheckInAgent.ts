/**
 * useCheckInAgent Hook - Specialized Agent for Daily Check-in
 *
 * A focused agent hook that helps users craft professional project updates
 * during the daily check-in flow. Features:
 * - Rephrases informal updates into professional language
 * - Supports back-and-forth conversation for refinement
 * - Maintains conversation context per project
 * - Lightweight - uses direct LLM calls without full tool execution
 */

import { useCallback, useRef, useState } from 'react';
import {
  createStreamingChatCompletion,
  type ChatMessage,
  type LLMResponse,
} from './modelProvider';
import type { Project, Activity } from '../agent/types';

const LLM_MODEL = import.meta.env.VITE_LLM_MODEL || 'gpt-4.1';

/**
 * Message in the check-in conversation
 */
export interface CheckInMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  proposedUpdate?: string; // If this message contains a refined update
}

/**
 * Props for the useCheckInAgent hook
 */
export interface UseCheckInAgentProps {
  /** Current project being checked in */
  project: Project | null;
  /** Logged-in user name */
  loggedInUser: string;
}

/**
 * Return type from the hook
 */
export interface UseCheckInAgentReturn {
  /** Messages in current conversation */
  messages: CheckInMessage[];
  /** Send a message to the agent */
  sendMessage: (content: string) => Promise<void>;
  /** Currently proposed update (if any) */
  proposedUpdate: string | null;
  /** Accept the proposed update */
  acceptUpdate: () => string | null;
  /** Clear the proposed update */
  clearProposal: () => void;
  /** Reset conversation for new project */
  resetConversation: () => void;
  /** Whether agent is processing */
  isProcessing: boolean;
  /** Current streaming content */
  streamingContent: string;
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Build system prompt for check-in refinement
 */
function buildCheckInPrompt(project: Project, loggedInUser: string): string {
  // Get recent context
  const recentActivities = project.recentActivity?.slice(0, 3) || [];
  const recentContext = recentActivities.length > 0
    ? recentActivities.map(a => `- ${a.author}: ${a.note}`).join('\n')
    : 'No recent updates';

  // Get tasks needing attention
  const urgentTasks: string[] = [];
  project.plan?.forEach(task => {
    task.subtasks?.forEach(subtask => {
      if (subtask.status !== 'completed' && subtask.dueDate) {
        const dueDate = new Date(subtask.dueDate);
        const now = new Date();
        const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 3) {
          urgentTasks.push(`- ${subtask.title} (${diffDays < 0 ? 'overdue' : `due in ${diffDays} days`})`);
        }
      }
    });
  });

  return `You are a professional writing assistant helping ${loggedInUser} write project status updates for "${project.name}".

Your role is to take informal, brief updates and rephrase them into clear, professional status updates suitable for team communication.

## Project Context
- Project: ${project.name}
- Status: ${project.status}
- Progress: ${project.progress}%

## Recent Updates
${recentContext}

${urgentTasks.length > 0 ? `## Tasks Needing Attention\n${urgentTasks.join('\n')}` : ''}

## Guidelines
1. Keep the original meaning completely intact
2. Fix grammar, spelling, and clarity issues
3. Use professional but natural language (not overly formal)
4. Be concise - status updates should be 1-3 sentences typically
5. Preserve any @mentions exactly as written (e.g., @John, @Project Name)
6. If the update is unclear or you need more details, ask ONE specific clarifying question
7. Don't add information that wasn't in the original update
8. Match the tone of the project context

## Response Format
When you provide a refined update, wrap it in <proposed-update> tags like this:
<proposed-update>Your refined update text here</proposed-update>

You can include a brief explanation before or after the tags.

If you need clarification, just ask your question directly without the tags.`;
}

/**
 * Extract proposed update from response
 */
function extractProposedUpdate(content: string): string | null {
  const match = content.match(/<proposed-update>([\s\S]*?)<\/proposed-update>/);
  return match ? match[1].trim() : null;
}

/**
 * Hook for running the check-in agent
 */
export function useCheckInAgent(props: UseCheckInAgentProps): UseCheckInAgentReturn {
  const { project, loggedInUser } = props;

  const [messages, setMessages] = useState<CheckInMessage[]>([]);
  const [proposedUpdate, setProposedUpdate] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  // Track project ID to reset conversation when project changes
  const currentProjectIdRef = useRef<string | number | null>(null);

  // Reset conversation if project changes
  if (project && project.id !== currentProjectIdRef.current) {
    currentProjectIdRef.current = project.id;
    setMessages([]);
    setProposedUpdate(null);
    setStreamingContent('');
  }

  /**
   * Send a message to the agent
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!project || !content.trim() || isProcessing) return;

    setIsProcessing(true);
    setStreamingContent('');

    // Add user message
    const userMessage: CheckInMessage = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    try {
      // Build conversation history for LLM
      const chatMessages: ChatMessage[] = [
        { role: 'system', content: buildCheckInPrompt(project, loggedInUser) },
        ...updatedMessages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ];

      let fullContent = '';

      // Stream the response
      const response = await createStreamingChatCompletion(
        {
          model: LLM_MODEL,
          messages: chatMessages,
        },
        {
          onContent: (chunk) => {
            fullContent += chunk;
            setStreamingContent(fullContent);
          },
          onDone: () => {
            setStreamingContent('');
          },
          onError: (error) => {
            console.error('[CheckInAgent] Streaming error:', error);
            setStreamingContent('');
          },
        }
      );

      const responseContent = response.content || fullContent;

      // Extract proposed update if present
      const extracted = extractProposedUpdate(responseContent);
      if (extracted) {
        setProposedUpdate(extracted);
      }

      // Add assistant message
      const assistantMessage: CheckInMessage = {
        id: generateId(),
        role: 'assistant',
        content: responseContent,
        timestamp: Date.now(),
        proposedUpdate: extracted || undefined,
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('[CheckInAgent] Error:', error);

      // Add error message
      const errorMessage: CheckInMessage = {
        id: generateId(),
        role: 'assistant',
        content: 'Sorry, I had trouble processing that. You can try again or proceed with your original update.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  }, [project, loggedInUser, messages, isProcessing]);

  /**
   * Accept the proposed update
   */
  const acceptUpdate = useCallback((): string | null => {
    const update = proposedUpdate;
    setProposedUpdate(null);
    return update;
  }, [proposedUpdate]);

  /**
   * Clear the proposed update
   */
  const clearProposal = useCallback(() => {
    setProposedUpdate(null);
  }, []);

  /**
   * Reset conversation for new project
   */
  const resetConversation = useCallback(() => {
    setMessages([]);
    setProposedUpdate(null);
    setStreamingContent('');
    currentProjectIdRef.current = null;
  }, []);

  return {
    messages,
    sendMessage,
    proposedUpdate,
    acceptUpdate,
    clearProposal,
    resetConversation,
    isProcessing,
    streamingContent,
  };
}

export default useCheckInAgent;
