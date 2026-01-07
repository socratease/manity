/**
 * Hooks Index
 *
 * Re-exports all domain-specific hooks for easy importing.
 */

// Shared API utilities
export { apiRequest, resolveUrl, normalizeProjects, normalizeProjectActivities } from './useApi';

// Domain hooks
export { usePeople, dedupePeople } from './usePeople';
export { useProjects } from './useProjects';
export { useEmailSettings } from './useEmailSettings';
export { useDataExport } from './useDataExport';

// Legacy hook (composed from domain hooks)
export { usePortfolioData } from './usePortfolioData';
