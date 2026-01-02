/**
 * usePortfolioData Hook & Provider
 *
 * Composed from domain-specific hooks for backward compatibility.
 * New code should prefer importing individual hooks directly.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { usePeople } from './usePeople';
import { useProjects } from './useProjects';
import { useEmailSettings } from './useEmailSettings';
import { useDataExport } from './useDataExport';

const PortfolioContext = createContext(null);

/**
 * PortfolioProvider - Composes domain hooks into a single context
 *
 * This provides backward compatibility for existing components.
 * New components can import individual hooks directly for better
 * code splitting and clearer dependencies.
 */
export const PortfolioProvider = ({ children }) => {
  // People management
  const {
    people,
    isLoading: isPeopleLoading,
    error: peopleError,
    findPersonByName,
    findPersonById,
    personRefForApi,
    refreshPeople,
    createPerson,
    updatePerson,
    deletePerson,
  } = usePeople();

  // Projects management (depends on personRefForApi for mapping)
  const {
    projects,
    setProjects,
    isLoading: isProjectsLoading,
    error: projectsError,
    refreshProjects,
    createProject,
    updateProject,
    deleteProject,
    addTask,
    updateTask,
    deleteTask,
    addSubtask,
    updateSubtask,
    deleteSubtask,
    addActivity,
    updateActivity,
    deleteActivity,
  } = useProjects({ personRefForApi });

  // Email settings (localStorage-based)
  const {
    emailSettings,
    isSending,
    error: emailError,
    refreshEmailSettings,
    saveEmailSettings,
    sendEmail,
  } = useEmailSettings();

  // Data import/export
  const {
    isExporting,
    isImporting,
    error: exportError,
    handleExport,
    handleImport,
  } = useDataExport({
    onProjectsImported: (importedProjects) => {
      // When projects are imported, update the projects state
      setProjects(importedProjects);
    }
  });

  // Compose the context value for backward compatibility
  const value = useMemo(() => ({
    // Projects
    projects,
    setProjects,
    refreshProjects,
    createProject,
    updateProject,
    deleteProject,
    projectsError,

    // Tasks
    addTask,
    updateTask,
    deleteTask,

    // Subtasks
    addSubtask,
    updateSubtask,
    deleteSubtask,

    // Activities
    addActivity,
    updateActivity,
    deleteActivity,

    // People
    people,
    refreshPeople,
    createPerson,
    updatePerson,
    deletePerson,

    // Email
    emailSettings,
    refreshEmailSettings,
    saveEmailSettings,
    sendEmail,

    // Import/Export
    handleExport,
    handleImport,

    // Loading states (combined for backward compatibility)
    isLoading: isPeopleLoading || isProjectsLoading,
    isSending,
    isExporting,
    isImporting,
  }), [
    projects,
    setProjects,
    refreshProjects,
    createProject,
    updateProject,
    deleteProject,
    projectsError,
    addTask,
    updateTask,
    deleteTask,
    addSubtask,
    updateSubtask,
    deleteSubtask,
    addActivity,
    updateActivity,
    deleteActivity,
    people,
    refreshPeople,
    createPerson,
    updatePerson,
    deletePerson,
    emailSettings,
    refreshEmailSettings,
    saveEmailSettings,
    sendEmail,
    handleExport,
    handleImport,
    isPeopleLoading,
    isProjectsLoading,
    isSending,
    isExporting,
    isImporting,
  ]);

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
};

/**
 * usePortfolioData hook
 *
 * Returns the composed portfolio context. For new code, consider using
 * individual hooks (usePeople, useProjects, etc.) directly.
 */
export const usePortfolioData = () => {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolioData must be used within a PortfolioProvider');
  }
  return context;
};

export default usePortfolioData;
