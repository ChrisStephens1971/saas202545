/**
 * Bulletins Filter Tests
 *
 * Tests for the bulletins.list filter functionality:
 * 1. BulletinFilterSchema validation
 * 2. Filter enum values
 * 3. Default filter behavior ('active')
 * 4. Filter logic for each option
 */

import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';

// =============================================================================
// Bulletin Filter Schema (mirrored from router)
// =============================================================================

// Bulletin status enum (from database schema)
const BulletinStatusSchema = z.enum(['draft', 'approved', 'built', 'locked']);

// Bulletin list filter enum
// - 'active': Published/upcoming bulletins (approved, built, locked) - excludes drafts
// - 'drafts': Only draft bulletins
// - 'deleted': Only soft-deleted bulletins
// - 'all': All bulletins including drafts (but not deleted unless explicitly using 'deleted')
const BulletinFilterSchema = z.enum(['active', 'drafts', 'deleted', 'all']);

type BulletinFilter = z.infer<typeof BulletinFilterSchema>;

// =============================================================================
// TESTS: Filter Schema Validation
// =============================================================================

describe('BulletinFilterSchema', () => {
  it('accepts "active" as valid filter', () => {
    const result = BulletinFilterSchema.safeParse('active');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('active');
    }
  });

  it('accepts "drafts" as valid filter', () => {
    const result = BulletinFilterSchema.safeParse('drafts');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('drafts');
    }
  });

  it('accepts "deleted" as valid filter', () => {
    const result = BulletinFilterSchema.safeParse('deleted');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('deleted');
    }
  });

  it('accepts "all" as valid filter', () => {
    const result = BulletinFilterSchema.safeParse('all');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('all');
    }
  });

  it('rejects invalid filter values', () => {
    expect(BulletinFilterSchema.safeParse('invalid').success).toBe(false);
    expect(BulletinFilterSchema.safeParse('published').success).toBe(false);
    expect(BulletinFilterSchema.safeParse('').success).toBe(false);
    expect(BulletinFilterSchema.safeParse(null).success).toBe(false);
    expect(BulletinFilterSchema.safeParse(undefined).success).toBe(false);
  });

  it('has exactly 4 filter options', () => {
    const options = BulletinFilterSchema.options;
    expect(options).toHaveLength(4);
    expect(options).toContain('active');
    expect(options).toContain('drafts');
    expect(options).toContain('deleted');
    expect(options).toContain('all');
  });
});

// =============================================================================
// TESTS: Bulletin Status Schema
// =============================================================================

describe('BulletinStatusSchema', () => {
  it('accepts all valid status values', () => {
    expect(BulletinStatusSchema.safeParse('draft').success).toBe(true);
    expect(BulletinStatusSchema.safeParse('approved').success).toBe(true);
    expect(BulletinStatusSchema.safeParse('built').success).toBe(true);
    expect(BulletinStatusSchema.safeParse('locked').success).toBe(true);
  });

  it('has exactly 4 status values', () => {
    const options = BulletinStatusSchema.options;
    expect(options).toHaveLength(4);
  });
});

// =============================================================================
// TESTS: Filter Logic
// =============================================================================

/**
 * Helper function to simulate the filter logic from the bulletins router
 * Returns the WHERE conditions that would be used in the query
 */
function getFilterConditions(filter: BulletinFilter): {
  includesDeleted: boolean;
  statusFilter: string[] | null;
} {
  switch (filter) {
    case 'active':
      return {
        includesDeleted: false,
        statusFilter: ['approved', 'built', 'locked'],
      };
    case 'drafts':
      return {
        includesDeleted: false,
        statusFilter: ['draft'],
      };
    case 'deleted':
      return {
        includesDeleted: true,
        statusFilter: null, // All statuses, but only deleted items
      };
    case 'all':
      return {
        includesDeleted: false,
        statusFilter: null, // All statuses, but not deleted
      };
    default:
      // Default to 'active' behavior
      return {
        includesDeleted: false,
        statusFilter: ['approved', 'built', 'locked'],
      };
  }
}

describe('Filter Logic - Active', () => {
  const conditions = getFilterConditions('active');

  it('excludes deleted bulletins', () => {
    expect(conditions.includesDeleted).toBe(false);
  });

  it('includes only approved, built, and locked statuses', () => {
    expect(conditions.statusFilter).toEqual(['approved', 'built', 'locked']);
  });

  it('does NOT include draft status', () => {
    expect(conditions.statusFilter).not.toContain('draft');
  });
});

describe('Filter Logic - Drafts', () => {
  const conditions = getFilterConditions('drafts');

  it('excludes deleted bulletins', () => {
    expect(conditions.includesDeleted).toBe(false);
  });

  it('includes only draft status', () => {
    expect(conditions.statusFilter).toEqual(['draft']);
  });
});

describe('Filter Logic - Deleted', () => {
  const conditions = getFilterConditions('deleted');

  it('includes ONLY deleted bulletins', () => {
    expect(conditions.includesDeleted).toBe(true);
  });

  it('does not filter by status (shows all deleted regardless of status)', () => {
    expect(conditions.statusFilter).toBeNull();
  });
});

describe('Filter Logic - All', () => {
  const conditions = getFilterConditions('all');

  it('excludes deleted bulletins', () => {
    expect(conditions.includesDeleted).toBe(false);
  });

  it('includes all statuses (no status filter)', () => {
    expect(conditions.statusFilter).toBeNull();
  });
});

// =============================================================================
// TESTS: Default Behavior
// =============================================================================

describe('Default Filter Behavior', () => {
  it('defaults to "active" when no filter is specified', () => {
    // Simulating input schema with default
    const InputSchema = z.object({
      filter: BulletinFilterSchema.default('active'),
    });

    const result = InputSchema.parse({});
    expect(result.filter).toBe('active');
  });

  it('respects explicit filter when provided', () => {
    const InputSchema = z.object({
      filter: BulletinFilterSchema.default('active'),
    });

    expect(InputSchema.parse({ filter: 'drafts' }).filter).toBe('drafts');
    expect(InputSchema.parse({ filter: 'deleted' }).filter).toBe('deleted');
    expect(InputSchema.parse({ filter: 'all' }).filter).toBe('all');
  });
});

// =============================================================================
// TESTS: Bulletin Visibility Matrix
// =============================================================================

describe('Bulletin Visibility Matrix', () => {
  // Test data representing different bulletin states
  //
  // CANONICAL RULE (enforced by CHECK constraint):
  //   (status = 'deleted') ⟺ (deletedAt IS NOT NULL)
  //
  // This means:
  //   - If deletedAt is set, status MUST be 'deleted'
  //   - If status is 'deleted', deletedAt MUST be set
  //   - Orphaned states are impossible after migration 039
  //
  // The filter logic now uses only `deleted_at` as the canonical flag.
  const testBulletins = [
    { id: 1, status: 'draft', deletedAt: null },
    { id: 2, status: 'approved', deletedAt: null },
    { id: 3, status: 'built', deletedAt: null },
    { id: 4, status: 'locked', deletedAt: null },
    // Deleted bulletins: CHECK constraint ensures both fields are set
    { id: 5, status: 'deleted', deletedAt: '2025-01-01' },
    { id: 6, status: 'deleted', deletedAt: '2025-01-02' },
  ];

  /**
   * Helper to filter bulletins based on filter value
   * Matches the actual router logic which uses deleted_at as the canonical flag
   */
  function filterBulletins(
    bulletins: typeof testBulletins,
    filter: BulletinFilter
  ) {
    const conditions = getFilterConditions(filter);

    return bulletins.filter((b) => {
      // deleted_at IS NOT NULL is the canonical check (CHECK constraint keeps status in sync)
      const isDeleted = b.deletedAt !== null;

      if (filter === 'deleted') {
        // Show only deleted records
        return isDeleted;
      }

      // All other filters exclude deleted bulletins
      if (isDeleted) {
        return false;
      }

      if (conditions.statusFilter) {
        return conditions.statusFilter.includes(b.status);
      }

      return true;
    });
  }

  describe('Active filter', () => {
    const filtered = filterBulletins(testBulletins, 'active');

    it('returns only approved, built, and locked non-deleted bulletins', () => {
      expect(filtered.map((b) => b.id)).toEqual([2, 3, 4]);
    });

    it('returns 3 bulletins', () => {
      expect(filtered).toHaveLength(3);
    });
  });

  describe('Drafts filter', () => {
    const filtered = filterBulletins(testBulletins, 'drafts');

    it('returns only draft non-deleted bulletins', () => {
      expect(filtered.map((b) => b.id)).toEqual([1]);
    });

    it('returns 1 bulletin', () => {
      expect(filtered).toHaveLength(1);
    });
  });

  describe('Deleted filter', () => {
    const filtered = filterBulletins(testBulletins, 'deleted');

    it('returns all deleted bulletins (by deleted_at canonical flag)', () => {
      expect(filtered.map((b) => b.id)).toEqual([5, 6]);
    });

    it('returns 2 deleted bulletins total', () => {
      expect(filtered).toHaveLength(2);
    });

    it('all deleted bulletins have deletedAt set', () => {
      expect(filtered.every((b) => b.deletedAt !== null)).toBe(true);
    });

    it('all deleted bulletins have status=deleted (CHECK constraint)', () => {
      expect(filtered.every((b) => b.status === 'deleted')).toBe(true);
    });
  });

  describe('All filter', () => {
    const filtered = filterBulletins(testBulletins, 'all');

    it('returns all non-deleted bulletins regardless of status', () => {
      expect(filtered.map((b) => b.id)).toEqual([1, 2, 3, 4]);
    });

    it('returns 4 bulletins', () => {
      expect(filtered).toHaveLength(4);
    });

    it('includes drafts', () => {
      expect(filtered.some((b) => b.status === 'draft')).toBe(true);
    });

    it('excludes deleted bulletins', () => {
      expect(filtered.some((b) => b.deletedAt !== null)).toBe(false);
    });
  });
});

// =============================================================================
// TESTS: CHECK Constraint Behavior
// =============================================================================

describe('CHECK Constraint: bulletin_deleted_consistent', () => {
  // This test documents the CHECK constraint behavior
  // The constraint enforces: (status = 'deleted') = (deleted_at IS NOT NULL)

  it('valid: non-deleted record (status != deleted, deletedAt = null)', () => {
    const valid = { status: 'draft', deletedAt: null };
    const isValid = (valid.status === 'deleted') === (valid.deletedAt !== null);
    expect(isValid).toBe(true);
  });

  it('valid: deleted record (status = deleted, deletedAt set)', () => {
    const valid = { status: 'deleted', deletedAt: '2025-01-01' };
    const isValid = (valid.status === 'deleted') === (valid.deletedAt !== null);
    expect(isValid).toBe(true);
  });

  it('INVALID: orphan - status=deleted but deletedAt null (blocked by CHECK)', () => {
    const orphan = { status: 'deleted', deletedAt: null };
    const isValid = (orphan.status === 'deleted') === (orphan.deletedAt !== null);
    expect(isValid).toBe(false); // Would be rejected by DB CHECK constraint
  });

  it('INVALID: orphan - deletedAt set but status != deleted (blocked by CHECK)', () => {
    const orphan = { status: 'draft', deletedAt: '2025-01-01' };
    const isValid = (orphan.status === 'deleted') === (orphan.deletedAt !== null);
    expect(isValid).toBe(false); // Would be rejected by DB CHECK constraint
  });
});
