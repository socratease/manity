/**
 * Tests for usePeople hook utilities
 */

import { describe, it, expect } from 'vitest';
import { dedupePeople } from '../usePeople';

describe('usePeople utilities', () => {
  describe('dedupePeople', () => {
    it('removes duplicates by name (case-insensitive)', () => {
      const people = [
        { id: '1', name: 'John Doe', team: 'Engineering', email: 'john@test.com' },
        { id: '2', name: 'john doe', team: 'Design', email: 'john2@test.com' },
      ];

      const deduped = dedupePeople(people);

      expect(deduped).toHaveLength(1);
      expect(deduped[0].name).toBe('john doe'); // Last one wins for name
      expect(deduped[0].id).toBe('2'); // Later ID wins when present
    });

    it('preserves unique people', () => {
      const people = [
        { id: '1', name: 'John Doe', team: 'Engineering' },
        { id: '2', name: 'Jane Smith', team: 'Design' },
        { id: '3', name: 'Bob Wilson', team: 'Product' },
      ];

      const deduped = dedupePeople(people);

      expect(deduped).toHaveLength(3);
    });

    it('merges properties from duplicates (later values override)', () => {
      const people = [
        { id: '1', name: 'John Doe', team: 'Engineering' },
        { id: '2', name: 'John Doe', email: 'john@test.com' },
      ];

      const deduped = dedupePeople(people);

      expect(deduped).toHaveLength(1);
      expect(deduped[0].id).toBe('2'); // Later ID wins
      expect(deduped[0].team).toBe('Engineering'); // Preserved (second has no team)
      expect(deduped[0].email).toBe('john@test.com'); // From second
    });

    it('uses default team Contributor when not specified', () => {
      const people = [
        { id: '1', name: 'John Doe' },
      ];

      const deduped = dedupePeople(people);

      expect(deduped[0].team).toBe('Contributor');
    });

    it('handles empty array', () => {
      const deduped = dedupePeople([]);
      expect(deduped).toEqual([]);
    });

    it('handles undefined', () => {
      const deduped = dedupePeople(undefined);
      expect(deduped).toEqual([]);
    });

    it('filters out people with empty names', () => {
      const people = [
        { id: '1', name: 'John Doe' },
        { id: '2', name: '' },
        { id: '3', name: '   ' },
      ];

      const deduped = dedupePeople(people);

      expect(deduped).toHaveLength(1);
      expect(deduped[0].name).toBe('John Doe');
    });

    it('handles null person objects', () => {
      const people = [
        { id: '1', name: 'John Doe' },
        null,
        undefined,
      ];

      // The function should handle these gracefully
      const deduped = dedupePeople(people);

      expect(deduped.length).toBeGreaterThanOrEqual(1);
    });

    it('preserves email as null if not provided', () => {
      const people = [
        { id: '1', name: 'John Doe', team: 'Engineering' },
      ];

      const deduped = dedupePeople(people);

      expect(deduped[0].email).toBeNull();
    });
  });
});
