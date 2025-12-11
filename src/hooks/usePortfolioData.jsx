import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { defaultPortfolio } from '../lib/data/portfolio';

const PortfolioContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
const resolveUrl = (path) => {
  if (API_BASE.startsWith('http')) return `${API_BASE}${path}`;
  return `${window.location.origin}${API_BASE}${path}`;
};

export const PortfolioProvider = ({ children }) => {
  const [projects, setProjectsState] = useState([]);
  const [people, setPeopleState] = useState([]);
  const hasInitializedRef = useRef(false);

  const dedupePeople = useCallback((list = []) => {
    const map = new Map();

    list.forEach(person => {
      const key = (person?.name || '').trim().toLowerCase();
      if (!key) return;

      const existing = map.get(key) || {};
      map.set(key, {
        ...existing,
        ...person,
        name: person.name || existing.name,
        team: person.team || existing.team || 'Contributor',
        email: person.email ?? existing.email ?? null
      });
    });

    return Array.from(map.values());
  }, []);

  const apiRequest = useCallback(async (path, options = {}) => {
    const response = await fetch(resolveUrl(path), {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || 'API request failed');
    }

    if (response.status === 204) return null;
    return response.json();
  }, []);

  const persistPortfolio = useCallback(async (nextProjects, nextPeople) => {
    if (!hasInitializedRef.current) return;
    try {
      await apiRequest('/import', {
        method: 'POST',
        body: JSON.stringify({ projects: nextProjects, people: nextPeople || people, mode: 'replace' })
      });
    } catch (error) {
      console.error('Unable to persist portfolio to API', error);
    }
  }, [apiRequest, people]);

  const refreshProjects = useCallback(async () => {
    try {
      const data = await apiRequest('/projects');
      if (Array.isArray(data)) {
        setProjectsState(data);
        hasInitializedRef.current = true;
      }
    } catch (error) {
      console.error('Failed to load projects, seeding defaults', error);
      try {
        const seeded = await apiRequest('/import', {
          method: 'POST',
          body: JSON.stringify({ projects: defaultPortfolio, mode: 'replace' })
        });
        if (Array.isArray(seeded?.projects)) {
          setProjectsState(seeded.projects);
          hasInitializedRef.current = true;
        }
      } catch (seedError) {
        console.error('Unable to seed defaults', seedError);
        setProjectsState(defaultPortfolio);
        hasInitializedRef.current = true;
      }
    }
  }, [apiRequest]);

  const refreshPeople = useCallback(async () => {
    try {
      const data = await apiRequest('/people');
      if (Array.isArray(data)) {
        setPeopleState(dedupePeople(data));
      }
    } catch (error) {
      console.error('Failed to load people', error);
      setPeopleState([]);
    }
  }, [apiRequest, dedupePeople]);

  useEffect(() => {
    refreshProjects();
    refreshPeople();
  }, [refreshProjects, refreshPeople]);

  const updateProjects = useCallback((updater) => {
    setProjectsState(prevProjects => {
      const nextProjects = typeof updater === 'function' ? updater(prevProjects) : updater;
      persistPortfolio(nextProjects);
      return nextProjects;
    });
  }, [persistPortfolio]);

  const handleExport = useCallback((projectId) => {
    const url = new URL(resolveUrl('/export'));
    if (projectId && projectId !== 'all') {
      url.searchParams.set('project_id', projectId);
    }

    const link = document.createElement('a');
    link.href = url.toString();
    link.download = projectId && projectId !== 'all' ? 'manity-project.json' : 'manity-portfolio.json';
    link.click();
  }, []);

  const handleImport = useCallback(async (fileOrText, mode = 'replace') => {
    let body;
    let headers = {};
    const url = new URL(resolveUrl('/import'));
    url.searchParams.set('mode', mode);

    if (fileOrText instanceof File) {
      const formData = new FormData();
      formData.append('file', fileOrText);
      body = formData;
      headers = undefined;
    } else {
      if (typeof fileOrText !== 'string') {
        throw new Error('Unsupported import type');
      }
      const parsed = JSON.parse(fileOrText);
      const projects = parsed.projects || parsed;
      body = JSON.stringify({ projects, mode });
      headers = { 'Content-Type': 'application/json' };
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      body,
      headers
    });

    if (!response.ok) {
      throw new Error('Import failed');
    }

    const data = await response.json();
    if (Array.isArray(data?.projects)) {
      setProjectsState(data.projects);
      hasInitializedRef.current = true;
    }
    return data?.projects || [];
  }, []);

  const createProject = useCallback(async (project) => {
    const created = await apiRequest('/projects', {
      method: 'POST',
      body: JSON.stringify(project)
    });
    updateProjects(prev => [...prev, created]);
    return created;
  }, [apiRequest, updateProjects]);

  const updateProject = useCallback(async (projectId, updates) => {
    const existing = projects.find(project => project.id === projectId) || {};
    const updated = await apiRequest(`/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify({ ...existing, ...updates, id: projectId })
    });
    updateProjects(prev => prev.map(project => project.id === projectId ? updated : project));
    return updated;
  }, [apiRequest, updateProjects, projects]);

  const deleteProject = useCallback(async (projectId) => {
    await apiRequest(`/projects/${projectId}`, { method: 'DELETE' });
    updateProjects(prev => prev.filter(project => project.id !== projectId));
  }, [apiRequest, updateProjects]);

  const updateProjectFromResponse = useCallback((updatedProject) => {
    updateProjects(prev => prev.map(project => project.id === updatedProject.id ? updatedProject : project));
    return updatedProject;
  }, [updateProjects]);

  const addTask = useCallback(async (projectId, task) => {
    const updatedProject = await apiRequest(`/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(task)
    });
    return updateProjectFromResponse(updatedProject);
  }, [apiRequest, updateProjectFromResponse]);

  const updateTask = useCallback(async (projectId, taskId, updates) => {
    const updatedProject = await apiRequest(`/projects/${projectId}/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ ...updates, id: taskId })
    });
    return updateProjectFromResponse(updatedProject);
  }, [apiRequest, updateProjectFromResponse]);

  const deleteTask = useCallback(async (projectId, taskId) => {
    await apiRequest(`/projects/${projectId}/tasks/${taskId}`, { method: 'DELETE' });
    updateProjects(prev => prev.map(project => project.id === projectId ? { ...project, plan: project.plan.filter(task => task.id !== taskId) } : project));
  }, [apiRequest, updateProjects]);

  const addSubtask = useCallback(async (projectId, taskId, subtask) => {
    const updatedProject = await apiRequest(`/projects/${projectId}/tasks/${taskId}/subtasks`, {
      method: 'POST',
      body: JSON.stringify(subtask)
    });
    return updateProjectFromResponse(updatedProject);
  }, [apiRequest, updateProjectFromResponse]);

  const updateSubtask = useCallback(async (projectId, taskId, subtaskId, updates) => {
    const updatedProject = await apiRequest(`/projects/${projectId}/tasks/${taskId}/subtasks/${subtaskId}`, {
      method: 'PUT',
      body: JSON.stringify({ ...updates, id: subtaskId })
    });
    return updateProjectFromResponse(updatedProject);
  }, [apiRequest, updateProjectFromResponse]);

  const deleteSubtask = useCallback(async (projectId, taskId, subtaskId) => {
    await apiRequest(`/projects/${projectId}/tasks/${taskId}/subtasks/${subtaskId}`, { method: 'DELETE' });
    updateProjects(prev => prev.map(project => project.id === projectId ? {
      ...project,
      plan: project.plan.map(task => task.id === taskId ? { ...task, subtasks: task.subtasks.filter(st => st.id !== subtaskId) } : task)
    } : project));
  }, [apiRequest, updateProjects]);

  const addActivity = useCallback(async (projectId, activity) => {
    const updatedProject = await apiRequest(`/projects/${projectId}/activities`, {
      method: 'POST',
      body: JSON.stringify(activity)
    });
    return updateProjectFromResponse(updatedProject);
  }, [apiRequest, updateProjectFromResponse]);

  const updateActivity = useCallback(async (projectId, activityId, updates) => {
    const updatedProject = await apiRequest(`/projects/${projectId}/activities/${activityId}`, {
      method: 'PUT',
      body: JSON.stringify({ ...updates, id: activityId })
    });
    return updateProjectFromResponse(updatedProject);
  }, [apiRequest, updateProjectFromResponse]);

  const deleteActivity = useCallback(async (projectId, activityId) => {
    await apiRequest(`/projects/${projectId}/activities/${activityId}`, { method: 'DELETE' });
    updateProjects(prev => prev.map(project => project.id === projectId ? {
      ...project,
      recentActivity: project.recentActivity.filter(activity => activity.id !== activityId)
    } : project));
  }, [apiRequest, updateProjects]);

  const createPerson = useCallback(async (person) => {
    const existing = people.find(p => p.name.toLowerCase() === person.name.toLowerCase());

    if (existing) {
      const needsUpdate =
        (person.team && person.team !== existing.team) ||
        (person.email && person.email !== existing.email);

      if (needsUpdate) {
        const updated = await apiRequest(`/people/${existing.id}`, {
          method: 'PUT',
          body: JSON.stringify({ ...existing, ...person, id: existing.id })
        });
        setPeopleState(prev => prev.map(p => p.id === existing.id ? updated : p));
        return updated;
      }

      return existing;
    }

    const created = await apiRequest('/people', {
      method: 'POST',
      body: JSON.stringify(person)
    });
    setPeopleState(prev => dedupePeople([...prev, created]));
    return created;
  }, [apiRequest, dedupePeople, people]);

  const updatePerson = useCallback(async (personId, updates) => {
    const updated = await apiRequest(`/people/${personId}`, {
      method: 'PUT',
      body: JSON.stringify({ ...updates, id: personId })
    });
    setPeopleState(prev => prev.map(person => person.id === personId ? updated : person));
    return updated;
  }, [apiRequest]);

  const deletePerson = useCallback(async (personId) => {
    await apiRequest(`/people/${personId}`, { method: 'DELETE' });
    setPeopleState(prev => prev.filter(person => person.id !== personId));
  }, [apiRequest]);

  const value = useMemo(() => ({
    projects,
    setProjects: updateProjects,
    handleExport,
    handleImport,
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
    refreshProjects,
    people,
    createPerson,
    updatePerson,
    deletePerson,
    refreshPeople
  }), [
    projects,
    updateProjects,
    handleExport,
    handleImport,
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
    refreshProjects,
    people,
    createPerson,
    updatePerson,
    deletePerson,
    refreshPeople
  ]);

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
};

export const usePortfolioData = () => {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolioData must be used within a PortfolioProvider');
  }
  return context;
};
