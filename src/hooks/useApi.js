/**
 * API Utilities
 *
 * Shared utilities for API requests used across all domain hooks.
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
const LOGGED_IN_USER_KEY = 'manity_logged_in_user';

/**
 * Resolve a path to a full API URL
 */
export const resolveUrl = (path) => {
  if (API_BASE.startsWith('http')) return `${API_BASE}${path}`;
  return `${window.location.origin}${API_BASE}${path}`;
};

/**
 * Get the logged-in user from localStorage
 */
export const getLoggedInUser = () => {
  if (typeof localStorage === 'undefined') return '';
  return localStorage.getItem(LOGGED_IN_USER_KEY) || '';
};

/**
 * Make an API request with standard headers
 */
export const apiRequest = async (path, options = {}) => {
  const loggedInUser = getLoggedInUser();
  const userHeader = loggedInUser.trim()
    ? { 'X-Logged-In-User': loggedInUser.trim() }
    : {};

  const response = await fetch(resolveUrl(path), {
    headers: {
      'Content-Type': 'application/json',
      ...userHeader,
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
};

/**
 * Sort activities by date descending
 */
export const sortActivitiesDesc = (activities = []) =>
  [...activities].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

/**
 * Normalize project activities
 */
export const normalizeProjectActivities = (project = {}) => {
  const normalizedActivity = (project.recentActivity || []).map(activity => ({
    ...activity,
    author: activity.author || activity.authorPerson?.name || '',
    authorId: activity.authorId || activity.authorPerson?.id || null
  }));
  const sortedActivity = sortActivitiesDesc(normalizedActivity);
  return {
    ...project,
    recentActivity: sortedActivity,
    lastUpdate: sortedActivity[0]?.note || project.lastUpdate || ''
  };
};

/**
 * Normalize an array of projects
 */
export const normalizeProjects = (projects = []) =>
  projects.map(normalizeProjectActivities);

export default {
  resolveUrl,
  getLoggedInUser,
  apiRequest,
  sortActivitiesDesc,
  normalizeProjectActivities,
  normalizeProjects,
};
