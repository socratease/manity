/**
 * usePeople Hook
 *
 * Domain-specific hook for people/person CRUD operations.
 */

import { useState, useCallback, useEffect } from 'react';
import { apiRequest } from './useApi';

/**
 * Deduplicate people by name (case-insensitive)
 */
export const dedupePeople = (list = []) => {
  const map = new Map();

  list.forEach(person => {
    const key = (person?.name || '').trim().toLowerCase();
    if (!key) return;

    const existing = map.get(key) || {};
    map.set(key, {
      ...existing,
      ...person,
      id: person.id || existing.id,
      name: person.name || existing.name,
      team: person.team || existing.team || 'Contributor',
      email: person.email ?? existing.email ?? null
    });
  });

  return Array.from(map.values());
};

/**
 * usePeople hook for managing people/persons
 */
export const usePeople = () => {
  const [people, setPeopleState] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const findPersonByName = useCallback((name) => {
    if (!name) return null;
    const lower = name.toLowerCase();
    return people.find(person => person.name.toLowerCase() === lower) || null;
  }, [people]);

  const findPersonById = useCallback((id) => {
    if (!id) return null;
    return people.find(person => person.id === id) || null;
  }, [people]);

  /**
   * Resolve a person reference for API calls
   * Handles string names, IDs, or person objects
   */
  const personRefForApi = useCallback((input) => {
    if (!input) return null;

    if (typeof input === 'string') {
      const existing = findPersonByName(input);
      return existing
        ? { id: existing.id, name: existing.name, team: existing.team, email: existing.email ?? null }
        : { name: input, team: 'Contributor' };
    }

    const source = input.id ? findPersonById(input.id) || input : input;
    const fallbackByName = source.name ? findPersonByName(source.name) : null;
    const resolved = source || fallbackByName;

    if (!resolved?.name && fallbackByName) {
      return {
        id: fallbackByName.id,
        name: fallbackByName.name,
        team: fallbackByName.team || 'Contributor',
        email: fallbackByName.email ?? null
      };
    }

    if (!resolved?.name) return null;

    return {
      id: resolved.id || fallbackByName?.id || null,
      name: resolved.name,
      team: resolved.team || fallbackByName?.team || 'Contributor',
      email: resolved.email ?? fallbackByName?.email ?? null
    };
  }, [findPersonById, findPersonByName]);

  const refreshPeople = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/people');
      if (Array.isArray(data)) {
        setPeopleState(dedupePeople(data));
      }
    } catch (err) {
      console.error('Failed to load people', err);
      setError(err.message);
      setPeopleState([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
  }, [people]);

  const updatePerson = useCallback(async (personId, updates) => {
    const updated = await apiRequest(`/people/${personId}`, {
      method: 'PUT',
      body: JSON.stringify({ ...updates, id: personId })
    });
    setPeopleState(prev => prev.map(person => person.id === personId ? updated : person));
    return updated;
  }, []);

  const deletePerson = useCallback(async (personId) => {
    await apiRequest(`/people/${personId}`, { method: 'DELETE' });
    setPeopleState(prev => prev.filter(person => person.id !== personId));
  }, []);

  // Load people on mount
  useEffect(() => {
    refreshPeople();
  }, [refreshPeople]);

  return {
    people,
    isLoading,
    error,
    findPersonByName,
    findPersonById,
    personRefForApi,
    refreshPeople,
    createPerson,
    updatePerson,
    deletePerson,
  };
};

export default usePeople;
