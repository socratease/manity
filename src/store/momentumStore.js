import { create } from 'zustand';

export const useMomentumStore = create((set, get) => ({
  // Chat messages
  messages: [],
  draft: '',
  error: '',

  // Request state
  isRequesting: false,
  requestStart: null,
  elapsedMs: 0,

  // Pending actions
  pendingActions: [],

  // Tag suggestions
  showTagSuggestions: false,
  tagSearchTerm: '',
  cursorPosition: 0,
  selectedTagIndex: 0,

  // Actions
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),
  updateLastMessage: (updates) => set((state) => {
    const messages = [...state.messages];
    if (messages.length > 0) {
      messages[messages.length - 1] = { ...messages[messages.length - 1], ...updates };
    }
    return { messages };
  }),
  clearMessages: () => set({ messages: [] }),

  setDraft: (draft) => set({ draft }),
  setError: (error) => set({ error }),

  setIsRequesting: (isRequesting) => set({ isRequesting }),
  setRequestStart: (start) => set({ requestStart: start }),
  setElapsedMs: (ms) => set({ elapsedMs: ms }),

  setPendingActions: (actions) => set({ pendingActions: actions }),
  clearPendingActions: () => set({ pendingActions: [] }),

  setShowTagSuggestions: (show) => set({ showTagSuggestions: show }),
  setTagSearchTerm: (term) => set({ tagSearchTerm: term }),
  setCursorPosition: (pos) => set({ cursorPosition: pos }),
  setSelectedTagIndex: (index) => set({ selectedTagIndex: index }),

  // Reset momentum state
  resetMomentum: () => set({
    messages: [],
    draft: '',
    error: '',
    isRequesting: false,
    requestStart: null,
    elapsedMs: 0,
    pendingActions: [],
    showTagSuggestions: false,
    tagSearchTerm: '',
    cursorPosition: 0,
    selectedTagIndex: 0,
  }),
}));

export default useMomentumStore;
