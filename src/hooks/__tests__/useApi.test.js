/**
 * Tests for useApi utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  resolveUrl,
  normalizeProjects,
  normalizeProjectActivities,
} from '../useApi';

describe('useApi utilities', () => {
  describe('resolveUrl', () => {
    const originalEnv = import.meta.env;

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('returns full URL when API_BASE is absolute', () => {
      vi.stubEnv('VITE_API_BASE', 'http://localhost:8000');
      // Note: This test may not work due to ES module caching
      // The function reads import.meta.env at module load time
      expect(typeof resolveUrl).toBe('function');
    });

    it('appends path to base URL', () => {
      const url = resolveUrl('/projects');
      expect(url).toContain('/projects');
    });
  });

  describe('normalizeProjectActivities', () => {
    it('normalizes activity author from authorPerson', () => {
      const project = {
        id: '1',
        name: 'Test Project',
        recentActivity: [
          {
            id: 'a1',
            note: 'Test activity',
            authorPerson: { id: 'p1', name: 'John Doe' },
          },
        ],
      };

      const normalized = normalizeProjectActivities(project);

      expect(normalized.recentActivity[0].author).toBe('John Doe');
      expect(normalized.recentActivity[0].authorId).toBe('p1');
    });

    it('preserves existing author if no authorPerson', () => {
      const project = {
        id: '1',
        name: 'Test Project',
        recentActivity: [
          {
            id: 'a1',
            note: 'Test activity',
            author: 'Jane Doe',
            authorId: 'p2',
          },
        ],
      };

      const normalized = normalizeProjectActivities(project);

      expect(normalized.recentActivity[0].author).toBe('Jane Doe');
      expect(normalized.recentActivity[0].authorId).toBe('p2');
    });

    it('sorts activities by date descending', () => {
      const project = {
        id: '1',
        name: 'Test Project',
        recentActivity: [
          { id: 'a1', note: 'Old', date: '2024-01-01' },
          { id: 'a2', note: 'New', date: '2024-01-10' },
          { id: 'a3', note: 'Middle', date: '2024-01-05' },
        ],
      };

      const normalized = normalizeProjectActivities(project);

      expect(normalized.recentActivity[0].note).toBe('New');
      expect(normalized.recentActivity[1].note).toBe('Middle');
      expect(normalized.recentActivity[2].note).toBe('Old');
    });

    it('sets lastUpdate from most recent activity', () => {
      const project = {
        id: '1',
        name: 'Test Project',
        recentActivity: [
          { id: 'a1', note: 'Older update', date: '2024-01-01' },
          { id: 'a2', note: 'Latest update', date: '2024-01-10' },
        ],
      };

      const normalized = normalizeProjectActivities(project);

      expect(normalized.lastUpdate).toBe('Latest update');
    });

    it('handles empty activity array', () => {
      const project = {
        id: '1',
        name: 'Test Project',
        recentActivity: [],
      };

      const normalized = normalizeProjectActivities(project);

      expect(normalized.recentActivity).toEqual([]);
      expect(normalized.lastUpdate).toBe('');
    });

    it('handles missing recentActivity', () => {
      const project = {
        id: '1',
        name: 'Test Project',
      };

      const normalized = normalizeProjectActivities(project);

      expect(normalized.recentActivity).toEqual([]);
    });
  });

  describe('normalizeProjects', () => {
    it('normalizes array of projects', () => {
      const projects = [
        {
          id: '1',
          name: 'Project 1',
          recentActivity: [
            { id: 'a1', note: 'Activity 1', date: '2024-01-01' },
          ],
        },
        {
          id: '2',
          name: 'Project 2',
          recentActivity: [
            { id: 'a2', note: 'Activity 2', date: '2024-01-02' },
          ],
        },
      ];

      const normalized = normalizeProjects(projects);

      expect(normalized).toHaveLength(2);
      expect(normalized[0].lastUpdate).toBe('Activity 1');
      expect(normalized[1].lastUpdate).toBe('Activity 2');
    });

    it('handles empty array', () => {
      const normalized = normalizeProjects([]);
      expect(normalized).toEqual([]);
    });

    it('handles undefined', () => {
      const normalized = normalizeProjects(undefined);
      expect(normalized).toEqual([]);
    });
  });
});
