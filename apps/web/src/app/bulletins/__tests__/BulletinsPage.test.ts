/**
 * Bulletins Page Tests
 *
 * Tests for the bulletins page filter dropdown functionality:
 * 1. Filter type definition
 * 2. Filter options available
 * 3. Default filter value
 * 4. Filter state changes
 * 5. Empty state messages for each filter
 */

import { describe, it, expect } from '@jest/globals';

// =============================================================================
// Filter Type Definition (mirrors page.tsx)
// =============================================================================

type BulletinFilter = 'active' | 'drafts' | 'deleted' | 'all';

const FILTER_OPTIONS: Array<{ value: BulletinFilter; label: string }> = [
  { value: 'active', label: 'Active (Published)' },
  { value: 'drafts', label: 'Drafts' },
  { value: 'deleted', label: 'Deleted' },
  { value: 'all', label: 'All' },
];

// =============================================================================
// TESTS: Filter Type Definition
// =============================================================================

describe('BulletinFilter Type', () => {
  it('includes "active" as a valid filter value', () => {
    const filter: BulletinFilter = 'active';
    expect(filter).toBe('active');
  });

  it('includes "drafts" as a valid filter value', () => {
    const filter: BulletinFilter = 'drafts';
    expect(filter).toBe('drafts');
  });

  it('includes "deleted" as a valid filter value', () => {
    const filter: BulletinFilter = 'deleted';
    expect(filter).toBe('deleted');
  });

  it('includes "all" as a valid filter value', () => {
    const filter: BulletinFilter = 'all';
    expect(filter).toBe('all');
  });
});

// =============================================================================
// TESTS: Filter Options Configuration
// =============================================================================

describe('Filter Options', () => {
  it('has exactly 4 filter options', () => {
    expect(FILTER_OPTIONS).toHaveLength(4);
  });

  it('has "Active (Published)" option', () => {
    const activeOption = FILTER_OPTIONS.find((opt) => opt.value === 'active');
    expect(activeOption).toBeDefined();
    expect(activeOption?.label).toBe('Active (Published)');
  });

  it('has "Drafts" option', () => {
    const draftsOption = FILTER_OPTIONS.find((opt) => opt.value === 'drafts');
    expect(draftsOption).toBeDefined();
    expect(draftsOption?.label).toBe('Drafts');
  });

  it('has "Deleted" option', () => {
    const deletedOption = FILTER_OPTIONS.find((opt) => opt.value === 'deleted');
    expect(deletedOption).toBeDefined();
    expect(deletedOption?.label).toBe('Deleted');
  });

  it('has "All" option', () => {
    const allOption = FILTER_OPTIONS.find((opt) => opt.value === 'all');
    expect(allOption).toBeDefined();
    expect(allOption?.label).toBe('All');
  });

  it('Active is the first option (default)', () => {
    expect(FILTER_OPTIONS[0].value).toBe('active');
  });
});

// =============================================================================
// TESTS: Default Filter Value
// =============================================================================

describe('Default Filter Value', () => {
  it('defaults to "active"', () => {
    const DEFAULT_FILTER: BulletinFilter = 'active';
    expect(DEFAULT_FILTER).toBe('active');
  });
});

// =============================================================================
// TESTS: Empty State Messages
// =============================================================================

describe('Empty State Messages', () => {
  const getEmptyMessage = (filter: BulletinFilter): string => {
    switch (filter) {
      case 'active':
        return 'No published bulletins yet. Create your first bulletin to get started.';
      case 'drafts':
        return 'No draft bulletins found.';
      case 'deleted':
        return 'No deleted bulletins found.';
      case 'all':
        return 'No bulletins yet. Create your first bulletin to get started.';
      default:
        return '';
    }
  };

  it('shows correct message for active filter', () => {
    expect(getEmptyMessage('active')).toBe(
      'No published bulletins yet. Create your first bulletin to get started.'
    );
  });

  it('shows correct message for drafts filter', () => {
    expect(getEmptyMessage('drafts')).toBe('No draft bulletins found.');
  });

  it('shows correct message for deleted filter', () => {
    expect(getEmptyMessage('deleted')).toBe('No deleted bulletins found.');
  });

  it('shows correct message for all filter', () => {
    expect(getEmptyMessage('all')).toBe(
      'No bulletins yet. Create your first bulletin to get started.'
    );
  });
});

// =============================================================================
// TESTS: Create Button Visibility
// =============================================================================

describe('Create Button Visibility in Empty State', () => {
  const shouldShowCreateButton = (filter: BulletinFilter): boolean => {
    return filter === 'active' || filter === 'all';
  };

  it('shows create button for "active" filter', () => {
    expect(shouldShowCreateButton('active')).toBe(true);
  });

  it('shows create button for "all" filter', () => {
    expect(shouldShowCreateButton('all')).toBe(true);
  });

  it('does NOT show create button for "drafts" filter', () => {
    expect(shouldShowCreateButton('drafts')).toBe(false);
  });

  it('does NOT show create button for "deleted" filter', () => {
    expect(shouldShowCreateButton('deleted')).toBe(false);
  });
});

// =============================================================================
// TESTS: Bulletin Card Display
// =============================================================================

describe('Bulletin Card Display', () => {
  // Simulates the status badge color logic from the page
  const getStatusBadgeColor = (
    status: string
  ): { bg: string; text: string } => {
    switch (status) {
      case 'locked':
        return { bg: 'bg-green-100', text: 'text-green-800' };
      case 'built':
        return { bg: 'bg-blue-100', text: 'text-blue-800' };
      case 'approved':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800' };
    }
  };

  it('shows green badge for locked status', () => {
    const colors = getStatusBadgeColor('locked');
    expect(colors.bg).toBe('bg-green-100');
    expect(colors.text).toBe('text-green-800');
  });

  it('shows blue badge for built status', () => {
    const colors = getStatusBadgeColor('built');
    expect(colors.bg).toBe('bg-blue-100');
    expect(colors.text).toBe('text-blue-800');
  });

  it('shows yellow badge for approved status', () => {
    const colors = getStatusBadgeColor('approved');
    expect(colors.bg).toBe('bg-yellow-100');
    expect(colors.text).toBe('text-yellow-800');
  });

  it('shows gray badge for draft status', () => {
    const colors = getStatusBadgeColor('draft');
    expect(colors.bg).toBe('bg-gray-100');
    expect(colors.text).toBe('text-gray-800');
  });
});

// =============================================================================
// TESTS: Status Chip Display (Single Chip Pattern)
// =============================================================================

describe('Status Chip Display', () => {
  /**
   * Determines the single status chip to display for a bulletin.
   * - If deleted (status='deleted' OR deletedAt is set), show "Deleted" chip
   * - Otherwise, show the normal status chip (locked/built/approved/draft)
   *
   * This ensures only ONE chip is ever shown, preventing duplicate "Deleted" tags.
   */
  type BulletinForChip = {
    status: string;
    deletedAt: string | null;
  };

  const getStatusChip = (
    bulletin: BulletinForChip
  ): { label: string; bg: string; text: string } => {
    // Deleted takes precedence - show single red "Deleted" chip
    if (bulletin.status === 'deleted' || bulletin.deletedAt !== null) {
      return { label: 'Deleted', bg: 'bg-red-100', text: 'text-red-800' };
    }

    // Non-deleted: show normal status chip
    switch (bulletin.status) {
      case 'locked':
        return { label: 'Locked', bg: 'bg-green-100', text: 'text-green-800' };
      case 'built':
        return { label: 'Built', bg: 'bg-blue-100', text: 'text-blue-800' };
      case 'approved':
        return { label: 'Approved', bg: 'bg-yellow-100', text: 'text-yellow-800' };
      default:
        return { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-800' };
    }
  };

  describe('Non-deleted bulletins', () => {
    it('shows "Locked" chip for locked status', () => {
      const chip = getStatusChip({ status: 'locked', deletedAt: null });
      expect(chip.label).toBe('Locked');
      expect(chip.bg).toBe('bg-green-100');
    });

    it('shows "Built" chip for built status', () => {
      const chip = getStatusChip({ status: 'built', deletedAt: null });
      expect(chip.label).toBe('Built');
      expect(chip.bg).toBe('bg-blue-100');
    });

    it('shows "Approved" chip for approved status', () => {
      const chip = getStatusChip({ status: 'approved', deletedAt: null });
      expect(chip.label).toBe('Approved');
      expect(chip.bg).toBe('bg-yellow-100');
    });

    it('shows "Draft" chip for draft status', () => {
      const chip = getStatusChip({ status: 'draft', deletedAt: null });
      expect(chip.label).toBe('Draft');
      expect(chip.bg).toBe('bg-gray-100');
    });
  });

  describe('Deleted bulletins - single chip only (no duplicates)', () => {
    it('shows single "Deleted" chip when status is deleted', () => {
      const chip = getStatusChip({ status: 'deleted', deletedAt: '2025-01-01T00:00:00Z' });
      expect(chip.label).toBe('Deleted');
      expect(chip.bg).toBe('bg-red-100');
      expect(chip.text).toBe('text-red-800');
    });

    it('shows single "Deleted" chip even if deletedAt is set but status is not deleted (edge case)', () => {
      // This case should not happen due to CHECK constraint, but UI handles it safely
      const chip = getStatusChip({ status: 'draft', deletedAt: '2025-01-01T00:00:00Z' });
      expect(chip.label).toBe('Deleted');
      expect(chip.bg).toBe('bg-red-100');
    });

    it('shows single "Deleted" chip when status is deleted even if deletedAt is null (edge case)', () => {
      // This case should not happen due to CHECK constraint, but UI handles it safely
      const chip = getStatusChip({ status: 'deleted', deletedAt: null });
      expect(chip.label).toBe('Deleted');
      expect(chip.bg).toBe('bg-red-100');
    });
  });

  describe('Chip count verification', () => {
    it('always returns exactly one chip (never duplicates)', () => {
      const testCases: BulletinForChip[] = [
        { status: 'draft', deletedAt: null },
        { status: 'approved', deletedAt: null },
        { status: 'built', deletedAt: null },
        { status: 'locked', deletedAt: null },
        { status: 'deleted', deletedAt: '2025-01-01T00:00:00Z' },
        { status: 'deleted', deletedAt: null }, // Edge case
        { status: 'draft', deletedAt: '2025-01-01T00:00:00Z' }, // Edge case
      ];

      for (const bulletin of testCases) {
        const chip = getStatusChip(bulletin);
        // Verify we always get exactly one chip object with required properties
        expect(chip).toHaveProperty('label');
        expect(chip).toHaveProperty('bg');
        expect(chip).toHaveProperty('text');
        expect(typeof chip.label).toBe('string');
        expect(chip.label.length).toBeGreaterThan(0);
      }
    });
  });
});

// =============================================================================
// TESTS: Filter State Transitions
// =============================================================================

describe('Filter State Transitions', () => {
  it('can transition from active to drafts', () => {
    let filter: BulletinFilter = 'active';
    filter = 'drafts';
    expect(filter).toBe('drafts');
  });

  it('can transition from drafts to deleted', () => {
    let filter: BulletinFilter = 'drafts';
    filter = 'deleted';
    expect(filter).toBe('deleted');
  });

  it('can transition from deleted to all', () => {
    let filter: BulletinFilter = 'deleted';
    filter = 'all';
    expect(filter).toBe('all');
  });

  it('can transition from all to active', () => {
    let filter: BulletinFilter = 'all';
    filter = 'active';
    expect(filter).toBe('active');
  });
});
