import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { defaultPortfolio } from '../lib/data/portfolio';

const PortfolioContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
const resolveUrl = (path) => {
  if (API_BASE.startsWith('http')) return `${API_BASE}${path}`;
  return `${window.location.origin}${API_BASE}${path}`;
};

// Local storage key for email settings
const EMAIL_SETTINGS_KEY = 'manity_email_settings';

// Clean up any stored credentials from localStorage (migration)
const cleanupStoredCredentials = () => {
  try {
    const stored = localStorage.getItem(EMAIL_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Remove credentials if they exist
      if (parsed.username || parsed.password) {
        const cleaned = {
          smtpServer: parsed.smtpServer || '',
          smtpPort: parsed.smtpPort || 25,
          fromAddress: parsed.fromAddress || '',
          useTLS: parsed.useTLS ?? false
        };
        localStorage.setItem(EMAIL_SETTINGS_KEY, JSON.stringify(cleaned));
        console.log('Cleaned up stored email credentials from localStorage');
      }
    }
  } catch (e) {
    console.error('Failed to clean up stored credentials', e);
  }
};

// Load email settings from localStorage (no credentials)
const loadEmailSettingsFromStorage = () => {
  // Clean up any legacy stored credentials first
  cleanupStoredCredentials();

  try {
    const stored = localStorage.getItem(EMAIL_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        smtpServer: parsed.smtpServer || '',
        smtpPort: parsed.smtpPort || 25,
        fromAddress: parsed.fromAddress || '',
        useTLS: parsed.useTLS ?? false
      };
    }
  } catch (e) {
    console.error('Failed to load email settings from localStorage', e);
  }
  return {
    smtpServer: '',
    smtpPort: 25,
    fromAddress: '',
    useTLS: false
  };
};

export const PortfolioProvider = ({ children }) => {
  const [projects, setProjectsState] = useState([]);
  const [people, setPeopleState] = useState([]);
  // Email settings stored in localStorage (browser-specific)
  const [emailSettings, setEmailSettings] = useState(loadEmailSettingsFromStorage);
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

  // Email settings are stored in localStorage (browser-specific, not shared across machines)
  const refreshEmailSettings = useCallback(() => {
    const loaded = loadEmailSettingsFromStorage();
    setEmailSettings(loaded);
    return loaded;
  }, []);

  const saveEmailSettings = useCallback((settings) => {
    const toSave = {
      smtpServer: settings.smtpServer || '',
      smtpPort: settings.smtpPort || 25,
      fromAddress: settings.fromAddress || '',
      useTLS: settings.useTLS ?? false
    };

    try {
      localStorage.setItem(EMAIL_SETTINGS_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.error('Failed to save email settings to localStorage', e);
      throw new Error('Unable to save email settings');
    }

    setEmailSettings(toSave);
    return toSave;
  }, []);

  const sendEmail = useCallback(async ({ recipients, subject, body }) => {
    // Include email settings from localStorage with each request
    // Emails are sent anonymously without credentials
    const settings = loadEmailSettingsFromStorage();

    if (!settings.smtpServer) {
      throw new Error('Email server not configured. Please configure SMTP settings first.');
    }

    return apiRequest('/actions/email', {
      method: 'POST',
      body: JSON.stringify({
        recipients,
        subject,
        body,
        // Pass SMTP settings with request (no credentials - anonymous sending)
        smtp_server: settings.smtpServer,
        smtp_port: settings.smtpPort,
        from_address: settings.fromAddress,
        use_tls: settings.useTLS
      })
    });
  }, [apiRequest]);

  useEffect(() => {
    refreshProjects();
    refreshPeople();
    // Email settings are loaded from localStorage on initial state, no need to fetch
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
    refreshPeople,
    emailSettings,
    refreshEmailSettings,
    saveEmailSettings,
    sendEmail
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
    refreshPeople,
    emailSettings,
    refreshEmailSettings,
    saveEmailSettings,
    sendEmail
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
