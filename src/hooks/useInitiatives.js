/**
 * useInitiatives Hook
 *
 * Domain-specific hook for initiative CRUD operations.
 * Initiatives are meta-projects that group related projects together.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { apiRequest } from './useApi';

/**
 * useInitiatives hook for managing initiatives
 *
 * @param {Object} options
 * @param {Function} options.personRefForApi - Function to resolve person references (from usePeople)
 */
export const useInitiatives = ({ personRefForApi } = {}) => {
  const [initiatives, setInitiativesState] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const hasInitializedRef = useRef(false);

  const mapInitiativeForApi = useCallback((initiative = {}) => {
    const name = (initiative.name ?? '').trim();

    const owners = (initiative.owners || [])
      .map(o => (personRefForApi ? personRefForApi(o) : o))
      .filter(Boolean);

    return {
      ...initiative,
      name,
      owners,
    };
  }, [personRefForApi]);

  const updateInitiatives = useCallback((updater) => {
    setInitiativesState(prevInitiatives => {
      const nextInitiatives = typeof updater === 'function' ? updater(prevInitiatives) : updater;
      return nextInitiatives;
    });
  }, []);

  const updateInitiativeFromResponse = useCallback((updatedInitiative) => {
    updateInitiatives(prev => prev.map(initiative =>
      initiative.id === updatedInitiative.id ? updatedInitiative : initiative
    ));
    return updatedInitiative;
  }, [updateInitiatives]);

  const refreshInitiatives = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/initiatives');
      if (Array.isArray(data)) {
        setInitiativesState(data);
        hasInitializedRef.current = true;
      }
    } catch (err) {
      console.error('Failed to load initiatives', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createInitiative = useCallback(async (initiative) => {
    const payload = mapInitiativeForApi(initiative);
    const created = await apiRequest('/initiatives', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    updateInitiatives(prev => [...prev, created]);
    return created;
  }, [mapInitiativeForApi, updateInitiatives]);

  const updateInitiative = useCallback(async (initiativeId, updates) => {
    const existing = initiatives.find(initiative => initiative.id === initiativeId) || {};
    const updated = await apiRequest(`/initiatives/${initiativeId}`, {
      method: 'PUT',
      body: JSON.stringify(mapInitiativeForApi({ ...existing, ...updates, id: initiativeId }))
    });
    return updateInitiativeFromResponse(updated);
  }, [mapInitiativeForApi, updateInitiativeFromResponse, initiatives]);

  const deleteInitiative = useCallback(async (initiativeId) => {
    await apiRequest(`/initiatives/${initiativeId}`, { method: 'DELETE' });
    updateInitiatives(prev => prev.filter(initiative => initiative.id !== initiativeId));
  }, [updateInitiatives]);

  // Owner operations
  const addOwnerToInitiative = useCallback(async (initiativeId, personId) => {
    const updated = await apiRequest(`/initiatives/${initiativeId}/owners/${personId}`, {
      method: 'POST'
    });
    return updateInitiativeFromResponse(updated);
  }, [updateInitiativeFromResponse]);

  const removeOwnerFromInitiative = useCallback(async (initiativeId, personId) => {
    await apiRequest(`/initiatives/${initiativeId}/owners/${personId}`, { method: 'DELETE' });
    updateInitiatives(prev => prev.map(initiative =>
      initiative.id === initiativeId
        ? { ...initiative, owners: initiative.owners.filter(o => o.id !== personId) }
        : initiative
    ));
  }, [updateInitiatives]);

  // Project operations
  const addProjectToInitiative = useCallback(async (initiativeId, projectId) => {
    const updated = await apiRequest(`/initiatives/${initiativeId}/projects/${projectId}`, {
      method: 'POST'
    });
    return updateInitiativeFromResponse(updated);
  }, [updateInitiativeFromResponse]);

  const removeProjectFromInitiative = useCallback(async (initiativeId, projectId) => {
    await apiRequest(`/initiatives/${initiativeId}/projects/${projectId}`, { method: 'DELETE' });
    updateInitiatives(prev => prev.map(initiative =>
      initiative.id === initiativeId
        ? { ...initiative, projects: initiative.projects.filter(p => p.id !== projectId) }
        : initiative
    ));
  }, [updateInitiatives]);

  // Load initiatives on mount
  useEffect(() => {
    refreshInitiatives();
  }, [refreshInitiatives]);

  return {
    initiatives,
    setInitiatives: updateInitiatives,
    isLoading,
    error,
    refreshInitiatives,
    createInitiative,
    updateInitiative,
    deleteInitiative,
    addOwnerToInitiative,
    removeOwnerFromInitiative,
    addProjectToInitiative,
    removeProjectFromInitiative,
  };
};

export default useInitiatives;
