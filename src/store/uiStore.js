import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_MAX_WIDTH = 360;
const DEFAULT_SIDEBAR_WIDTH = 238;

const clampSidebarWidth = (width) =>
  Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width));

export const useUIStore = create(
  persist(
    (set, get) => ({
      // View state
      activeView: 'people',
      viewingProjectId: null,

      // Sidebar state
      sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
      isSidebarCollapsed: false,

      // Modal/panel state
      showDailyCheckin: false,
      showNewProject: false,
      globalSearchOpen: false,
      globalSearchQuery: '',
      globalSearchSelectedIndex: 0,
      portfolioFilter: '',

      // Slides state
      currentSlideIndex: 0,
      isEditingSlide: false,

      // Timeline state
      timelineView: 6,

      // Santa mode
      isSantafied: true,

      // Data page visibility
      showDataPage: false,

      // Edit modes
      editMode: false,
      activityEditEnabled: false,
      taskEditEnabled: false,
      projectDeletionEnabled: false,

      // Featured/highlighted items
      featuredPersonId: null,
      recentlyUpdatedProjects: {},

      // Momentum chat state
      portfolioMinimized: true,
      activeProjectInChat: null,
      hoveredMessageProject: null,

      // Actions
      setActiveView: (view) => set({ activeView: view }),
      setViewingProjectId: (id) => set({ viewingProjectId: id }),

      setSidebarWidth: (width) => set({ sidebarWidth: clampSidebarWidth(width) }),
      setIsSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),

      setShowDailyCheckin: (show) => set({ showDailyCheckin: show }),
      setShowNewProject: (show) => set({ showNewProject: show }),

      setGlobalSearchOpen: (open) => set({ globalSearchOpen: open }),
      setGlobalSearchQuery: (query) => set({ globalSearchQuery: query }),
      setGlobalSearchSelectedIndex: (index) => set({ globalSearchSelectedIndex: index }),
      setPortfolioFilter: (filter) => set({ portfolioFilter: filter }),

      setCurrentSlideIndex: (index) => set({ currentSlideIndex: index }),
      setIsEditingSlide: (editing) => set({ isEditingSlide: editing }),

      setTimelineView: (months) => set({ timelineView: months }),

      setIsSantafied: (santafied) => set({ isSantafied: santafied }),
      setShowDataPage: (show) => set({ showDataPage: show }),

      setEditMode: (mode) => set({ editMode: mode }),
      setActivityEditEnabled: (enabled) => set({ activityEditEnabled: enabled }),
      setTaskEditEnabled: (enabled) => set({ taskEditEnabled: enabled }),
      setProjectDeletionEnabled: (enabled) => set({ projectDeletionEnabled: enabled }),

      setFeaturedPersonId: (id) => set({ featuredPersonId: id }),
      markProjectUpdated: (projectId) => set((state) => ({
        recentlyUpdatedProjects: {
          ...state.recentlyUpdatedProjects,
          [projectId]: Date.now()
        }
      })),
      clearProjectHighlight: (projectId) => set((state) => {
        const { [projectId]: _, ...rest } = state.recentlyUpdatedProjects;
        return { recentlyUpdatedProjects: rest };
      }),

      setPortfolioMinimized: (minimized) => set({ portfolioMinimized: minimized }),
      setActiveProjectInChat: (projectId) => set({ activeProjectInChat: projectId }),
      setHoveredMessageProject: (projectId) => set({ hoveredMessageProject: projectId }),

      // Navigation helpers
      navigateTo: (view, projectId = null) => {
        set({ activeView: view, viewingProjectId: projectId });
        if (projectId) {
          window.location.hash = `#/${view}/${projectId}`;
        } else {
          window.location.hash = `#/${view}`;
        }
      },

      // Reset UI state
      resetUIState: () => set({
        editMode: false,
        activityEditEnabled: false,
        taskEditEnabled: false,
        projectDeletionEnabled: false,
        globalSearchOpen: false,
        globalSearchQuery: '',
      }),
    }),
    {
      name: 'manity-ui-storage',
      partialize: (state) => ({
        sidebarWidth: state.sidebarWidth,
        isSantafied: state.isSantafied,
        showDataPage: state.showDataPage,
        timelineView: state.timelineView,
      }),
    }
  )
);

export default useUIStore;
