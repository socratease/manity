/**
 * useProjects Hook
 *
 * Domain-specific hook for project CRUD operations.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { apiRequest, normalizeProjectActivities, normalizeProjects } from './useApi';

/**
 * useProjects hook for managing projects
 *
 * @param {Object} options
 * @param {Function} options.personRefForApi - Function to resolve person references (from usePeople)
 */
export const useProjects = ({ personRefForApi } = {}) => {
  const [projects, setProjectsState] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const hasInitializedRef = useRef(false);

  // Mapping functions for API payloads
  const mapActivityForApi = useCallback((activity = {}) => {
    const authorRef = personRefForApi?.(activity.authorPerson || activity.author || activity.authorId);
    return {
      ...activity,
      author: activity.author || authorRef?.name || '',
      authorId: authorRef?.id || activity.authorId || null,
      authorPerson: undefined
    };
  }, [personRefForApi]);

  const mapSubtaskForApi = useCallback((subtask = {}) => {
    const assigneeRef = personRefForApi?.(subtask.assignee || subtask.assigneeId);
    const mapped = { ...subtask };

    if (Object.prototype.hasOwnProperty.call(subtask, 'assigneeId')) {
      mapped.assigneeId = assigneeRef?.id || subtask.assigneeId || null;
    }

    if (Object.prototype.hasOwnProperty.call(subtask, 'assignee')) {
      mapped.assignee = assigneeRef || null;
    }

    return mapped;
  }, [personRefForApi]);

  const mapTaskForApi = useCallback((task = {}) => {
    const assigneeRef = personRefForApi?.(task.assignee || task.assigneeId);
    const mapped = {
      ...task,
      assigneeId: assigneeRef?.id || task.assigneeId || null,
      assignee: assigneeRef || null
    };

    if (Object.prototype.hasOwnProperty.call(task, 'subtasks') && task.subtasks !== undefined) {
      mapped.subtasks = Array.isArray(task.subtasks)
        ? task.subtasks.map(mapSubtaskForApi)
        : task.subtasks;
    }

    return mapped;
  }, [mapSubtaskForApi, personRefForApi]);

  const mapProjectForApi = useCallback((project = {}) => {
    const name = (project.name ?? project.projectName ?? '').trim();

    return {
      ...project,
      name,
      stakeholders: (project.stakeholders || []).map(s => personRefForApi?.(s)).filter(Boolean),
      plan: (project.plan || []).map(mapTaskForApi),
      recentActivity: (project.recentActivity || []).map(mapActivityForApi)
    };
  }, [mapActivityForApi, mapTaskForApi, personRefForApi]);

  const updateProjects = useCallback((updater) => {
    setProjectsState(prevProjects => {
      const nextProjects = typeof updater === 'function' ? updater(prevProjects) : updater;
      return normalizeProjects(nextProjects);
    });
  }, []);

  const updateProjectFromResponse = useCallback((updatedProject) => {
    const normalized = normalizeProjectActivities(updatedProject);
    updateProjects(prev => prev.map(project => project.id === normalized.id ? normalized : project));
    return normalized;
  }, [updateProjects]);

  const refreshProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/projects');
      if (Array.isArray(data)) {
        setProjectsState(normalizeProjects(data));
        hasInitializedRef.current = true;
      }
    } catch (err) {
      console.error('Failed to load projects', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createProject = useCallback(async (project) => {
    const payload = mapProjectForApi(project);
    const created = await apiRequest('/projects', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const normalized = normalizeProjectActivities(created);
    updateProjects(prev => [...prev, normalized]);
    return normalized;
  }, [mapProjectForApi, updateProjects]);

  const updateProject = useCallback(async (projectId, updates) => {
    const existing = projects.find(project => project.id === projectId) || {};
    const updated = await apiRequest(`/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(mapProjectForApi({ ...existing, ...updates, id: projectId }))
    });
    return updateProjectFromResponse(updated);
  }, [mapProjectForApi, updateProjectFromResponse, projects]);

  const deleteProject = useCallback(async (projectId) => {
    await apiRequest(`/projects/${projectId}`, { method: 'DELETE' });
    updateProjects(prev => prev.filter(project => project.id !== projectId));
  }, [updateProjects]);

  // Task operations
  const addTask = useCallback(async (projectId, task) => {
    const updatedProject = await apiRequest(`/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(mapTaskForApi(task))
    });
    return updateProjectFromResponse(updatedProject);
  }, [mapTaskForApi, updateProjectFromResponse]);

  const updateTask = useCallback(async (projectId, taskId, updates) => {
    const updatedProject = await apiRequest(`/projects/${projectId}/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(mapTaskForApi({ ...updates, id: taskId }))
    });
    return updateProjectFromResponse(updatedProject);
  }, [mapTaskForApi, updateProjectFromResponse]);

  const deleteTask = useCallback(async (projectId, taskId) => {
    await apiRequest(`/projects/${projectId}/tasks/${taskId}`, { method: 'DELETE' });
    updateProjects(prev => prev.map(project =>
      project.id === projectId
        ? { ...project, plan: project.plan.filter(task => task.id !== taskId) }
        : project
    ));
  }, [updateProjects]);

  // Subtask operations
  const addSubtask = useCallback(async (projectId, taskId, subtask) => {
    const updatedProject = await apiRequest(`/projects/${projectId}/tasks/${taskId}/subtasks`, {
      method: 'POST',
      body: JSON.stringify(mapSubtaskForApi(subtask))
    });
    return updateProjectFromResponse(updatedProject);
  }, [mapSubtaskForApi, updateProjectFromResponse]);

  const updateSubtask = useCallback(async (projectId, taskId, subtaskId, updates) => {
    const updatedProject = await apiRequest(`/projects/${projectId}/tasks/${taskId}/subtasks/${subtaskId}`, {
      method: 'PUT',
      body: JSON.stringify(mapSubtaskForApi({ ...updates, id: subtaskId }))
    });
    return updateProjectFromResponse(updatedProject);
  }, [mapSubtaskForApi, updateProjectFromResponse]);

  const deleteSubtask = useCallback(async (projectId, taskId, subtaskId) => {
    await apiRequest(`/projects/${projectId}/tasks/${taskId}/subtasks/${subtaskId}`, { method: 'DELETE' });
    updateProjects(prev => prev.map(project =>
      project.id === projectId
        ? {
            ...project,
            plan: project.plan.map(task =>
              task.id === taskId
                ? { ...task, subtasks: task.subtasks.filter(st => st.id !== subtaskId) }
                : task
            )
          }
        : project
    ));
  }, [updateProjects]);

  // Activity operations
  const addActivity = useCallback(async (projectId, activity) => {
    const updatedProject = await apiRequest(`/projects/${projectId}/activities`, {
      method: 'POST',
      body: JSON.stringify(mapActivityForApi(activity))
    });
    return updateProjectFromResponse(updatedProject);
  }, [mapActivityForApi, updateProjectFromResponse]);

  const updateActivity = useCallback(async (projectId, activityId, updates) => {
    const updatedProject = await apiRequest(`/projects/${projectId}/activities/${activityId}`, {
      method: 'PUT',
      body: JSON.stringify(mapActivityForApi({ ...updates, id: activityId }))
    });
    return updateProjectFromResponse(updatedProject);
  }, [mapActivityForApi, updateProjectFromResponse]);

  const deleteActivity = useCallback(async (projectId, activityId) => {
    await apiRequest(`/projects/${projectId}/activities/${activityId}`, { method: 'DELETE' });
    updateProjects(prev => prev.map(project =>
      project.id === projectId
        ? { ...project, recentActivity: project.recentActivity.filter(activity => activity.id !== activityId) }
        : project
    ));
  }, [updateProjects]);

  // Load projects on mount
  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  return {
    projects,
    setProjects: updateProjects,
    isLoading,
    error,
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
  };
};

export default useProjects;
