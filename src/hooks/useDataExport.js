/**
 * useDataExport Hook
 *
 * Domain-specific hook for data import/export operations.
 */

import { useState, useCallback } from 'react';
import { resolveUrl, normalizeProjects } from './useApi';

/**
 * useDataExport hook for import/export operations
 *
 * @param {Object} options
 * @param {Function} options.onProjectsImported - Callback when projects are imported
 */
export const useDataExport = ({ onProjectsImported } = {}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState(null);

  const handleExport = useCallback((projectId) => {
    setIsExporting(true);
    setError(null);

    try {
      const url = new URL(resolveUrl('/export'));
      if (projectId && projectId !== 'all') {
        url.searchParams.set('project_id', projectId);
      }

      const link = document.createElement('a');
      link.href = url.toString();
      link.download = projectId && projectId !== 'all' ? 'manity-project.json' : 'manity-portfolio.json';
      link.click();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsExporting(false);
    }
  }, []);

  const handleImport = useCallback(async (fileOrText, mode = 'replace') => {
    setIsImporting(true);
    setError(null);

    try {
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
      const importedProjects = normalizeProjects(data?.projects || []);

      // Notify parent of imported projects
      if (onProjectsImported && importedProjects.length > 0) {
        onProjectsImported(importedProjects);
      }

      return importedProjects;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsImporting(false);
    }
  }, [onProjectsImported]);

  return {
    isExporting,
    isImporting,
    error,
    handleExport,
    handleImport,
  };
};

export default useDataExport;
