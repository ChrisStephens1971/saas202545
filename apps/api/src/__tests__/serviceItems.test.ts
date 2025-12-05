import { describe, it, expect } from '@jest/globals';

/**
 * Service Items Tests
 *
 * Tests for Service Order V2 functionality:
 * 1. Service item type validation
 * 2. Section validation
 * 3. Duration validation
 * 4. Copy logic
 * 5. Lock enforcement logic
 */

// Service item types from the router
const ServiceItemTypes = [
  'Welcome',
  'CallToWorship',
  'Song',
  'Prayer',
  'Scripture',
  'Sermon',
  'Offering',
  'Communion',
  'Benediction',
  'Announcement',
  'Event',
  'Heading',
  'Other',
  'AnnouncementsPlaceholder',
  'EventsPlaceholder',
] as const;

// Section types from Service Order V2
const SectionTypes = [
  'pre-service',
  'worship',
  'message',
  'response',
  'closing',
  'announcements',
  'other',
] as const;

describe('Service Item Types', () => {
  it('defines all expected service item types', () => {
    expect(ServiceItemTypes).toContain('Welcome');
    expect(ServiceItemTypes).toContain('Song');
    expect(ServiceItemTypes).toContain('Prayer');
    expect(ServiceItemTypes).toContain('Scripture');
    expect(ServiceItemTypes).toContain('Sermon');
    expect(ServiceItemTypes).toContain('Offering');
    expect(ServiceItemTypes).toContain('Communion');
    expect(ServiceItemTypes).toContain('Benediction');
    expect(ServiceItemTypes).toContain('Announcement');
    expect(ServiceItemTypes).toContain('Other');
  });

  it('includes placeholder types for template expansion', () => {
    expect(ServiceItemTypes).toContain('AnnouncementsPlaceholder');
    expect(ServiceItemTypes).toContain('EventsPlaceholder');
  });

  it('has 15 total item types', () => {
    expect(ServiceItemTypes.length).toBe(15);
  });
});

describe('Section Types (Service Order V2)', () => {
  it('defines expected section types for grouping', () => {
    expect(SectionTypes).toContain('pre-service');
    expect(SectionTypes).toContain('worship');
    expect(SectionTypes).toContain('message');
    expect(SectionTypes).toContain('response');
    expect(SectionTypes).toContain('closing');
    expect(SectionTypes).toContain('announcements');
    expect(SectionTypes).toContain('other');
  });

  it('has 7 total section types', () => {
    expect(SectionTypes.length).toBe(7);
  });
});

describe('Duration Validation', () => {
  /**
   * Simulates duration validation logic
   */
  function validateDuration(minutes: number | null | undefined): {
    valid: boolean;
    error?: string;
  } {
    if (minutes === null || minutes === undefined) {
      return { valid: true }; // Duration is optional
    }

    if (!Number.isInteger(minutes)) {
      return { valid: false, error: 'Duration must be an integer' };
    }

    if (minutes < 0) {
      return { valid: false, error: 'Duration cannot be negative' };
    }

    if (minutes > 180) {
      return { valid: false, error: 'Duration cannot exceed 180 minutes' };
    }

    return { valid: true };
  }

  it('allows null/undefined duration (optional field)', () => {
    expect(validateDuration(null).valid).toBe(true);
    expect(validateDuration(undefined).valid).toBe(true);
  });

  it('allows valid duration values', () => {
    expect(validateDuration(0).valid).toBe(true);
    expect(validateDuration(5).valid).toBe(true);
    expect(validateDuration(30).valid).toBe(true);
    expect(validateDuration(60).valid).toBe(true);
    expect(validateDuration(180).valid).toBe(true);
  });

  it('rejects negative duration', () => {
    const result = validateDuration(-1);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('negative');
  });

  it('rejects duration over 180 minutes', () => {
    const result = validateDuration(181);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('180');
  });
});

describe('Lock Enforcement Logic', () => {
  interface BulletinState {
    lockedAt: Date | null;
  }

  /**
   * Simulates checkBulletinLocked helper logic
   */
  function isLocked(bulletin: BulletinState): boolean {
    return bulletin.lockedAt !== null;
  }

  function canEditServiceItems(bulletin: BulletinState): {
    allowed: boolean;
    error?: string;
  } {
    if (isLocked(bulletin)) {
      return {
        allowed: false,
        error: 'This bulletin is locked and cannot be edited.',
      };
    }
    return { allowed: true };
  }

  it('allows editing when bulletin is not locked', () => {
    const bulletin = { lockedAt: null };
    const result = canEditServiceItems(bulletin);
    expect(result.allowed).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('prevents editing when bulletin is locked', () => {
    const bulletin = { lockedAt: new Date('2024-01-15T14:00:00') };
    const result = canEditServiceItems(bulletin);
    expect(result.allowed).toBe(false);
    expect(result.error).toContain('locked');
  });
});

describe('Copy From Bulletin Logic', () => {
  interface ServiceItem {
    id: string;
    type: string;
    title: string;
    sequence: number;
    durationMinutes: number | null;
    section: string | null;
    notes: string | null;
  }

  /**
   * Simulates the copy logic from copyFromBulletin endpoint
   * Notes are cleared when copying (internal and date-specific)
   */
  function copyItemsForNewBulletin(
    sourceItems: ServiceItem[],
    clearExisting: boolean,
    existingMaxSequence: number = 0
  ): Omit<ServiceItem, 'id'>[] {
    const startSequence = clearExisting ? 1 : existingMaxSequence + 1;

    return sourceItems.map((item, index) => ({
      type: item.type,
      title: item.title,
      sequence: startSequence + index,
      durationMinutes: item.durationMinutes,
      section: item.section,
      notes: null, // Notes are cleared when copying
    }));
  }

  const sourceItems: ServiceItem[] = [
    { id: '1', type: 'Welcome', title: 'Welcome', sequence: 1, durationMinutes: 5, section: 'pre-service', notes: 'Mention new visitor' },
    { id: '2', type: 'Song', title: 'Opening Song', sequence: 2, durationMinutes: 4, section: 'worship', notes: null },
    { id: '3', type: 'Sermon', title: 'Message', sequence: 3, durationMinutes: 30, section: 'message', notes: 'Check slides' },
  ];

  it('copies items with cleared notes', () => {
    const copied = copyItemsForNewBulletin(sourceItems, true);

    expect(copied.length).toBe(3);
    // Notes should be cleared
    copied.forEach((item) => {
      expect(item.notes).toBeNull();
    });
  });

  it('preserves type, title, duration, and section', () => {
    const copied = copyItemsForNewBulletin(sourceItems, true);

    expect(copied[0].type).toBe('Welcome');
    expect(copied[0].title).toBe('Welcome');
    expect(copied[0].durationMinutes).toBe(5);
    expect(copied[0].section).toBe('pre-service');
  });

  it('resets sequences to start at 1 when clearing existing', () => {
    const copied = copyItemsForNewBulletin(sourceItems, true);

    expect(copied[0].sequence).toBe(1);
    expect(copied[1].sequence).toBe(2);
    expect(copied[2].sequence).toBe(3);
  });

  it('continues sequence from existing items when not clearing', () => {
    const existingMaxSequence = 5;
    const copied = copyItemsForNewBulletin(sourceItems, false, existingMaxSequence);

    expect(copied[0].sequence).toBe(6);
    expect(copied[1].sequence).toBe(7);
    expect(copied[2].sequence).toBe(8);
  });
});

describe('Batch Save Logic', () => {
  interface BatchItem {
    id: string | null;
    tempId?: string;
    type: string;
    title: string;
    sequence: number;
  }

  /**
   * Simulates batch save categorization
   */
  function categorizeBatchItems(items: BatchItem[]): {
    creates: BatchItem[];
    updates: BatchItem[];
  } {
    const creates = items.filter((item) => item.id === null);
    const updates = items.filter((item) => item.id !== null);
    return { creates, updates };
  }

  it('categorizes new items (id: null) as creates', () => {
    const items: BatchItem[] = [
      { id: null, tempId: 'temp-1', type: 'Song', title: 'New Song', sequence: 1 },
      { id: 'existing-1', type: 'Prayer', title: 'Prayer', sequence: 2 },
    ];

    const { creates, updates } = categorizeBatchItems(items);

    expect(creates.length).toBe(1);
    expect(creates[0].tempId).toBe('temp-1');

    expect(updates.length).toBe(1);
    expect(updates[0].id).toBe('existing-1');
  });

  it('handles all new items', () => {
    const items: BatchItem[] = [
      { id: null, tempId: 'temp-1', type: 'Song', title: 'Song 1', sequence: 1 },
      { id: null, tempId: 'temp-2', type: 'Song', title: 'Song 2', sequence: 2 },
    ];

    const { creates, updates } = categorizeBatchItems(items);

    expect(creates.length).toBe(2);
    expect(updates.length).toBe(0);
  });

  it('handles all existing items', () => {
    const items: BatchItem[] = [
      { id: 'id-1', type: 'Song', title: 'Song 1', sequence: 1 },
      { id: 'id-2', type: 'Song', title: 'Song 2', sequence: 2 },
    ];

    const { creates, updates } = categorizeBatchItems(items);

    expect(creates.length).toBe(0);
    expect(updates.length).toBe(2);
  });
});

describe('Total Duration Calculation', () => {
  interface ServiceItem {
    durationMinutes: number | null;
  }

  function calculateTotalDuration(items: ServiceItem[]): number {
    return items.reduce((total, item) => total + (item.durationMinutes || 0), 0);
  }

  it('sums all duration values', () => {
    const items = [
      { durationMinutes: 5 },
      { durationMinutes: 30 },
      { durationMinutes: 10 },
    ];

    expect(calculateTotalDuration(items)).toBe(45);
  });

  it('handles null duration values', () => {
    const items = [
      { durationMinutes: 5 },
      { durationMinutes: null },
      { durationMinutes: 10 },
    ];

    expect(calculateTotalDuration(items)).toBe(15);
  });

  it('returns 0 for empty list', () => {
    expect(calculateTotalDuration([])).toBe(0);
  });

  it('returns 0 when all durations are null', () => {
    const items = [
      { durationMinutes: null },
      { durationMinutes: null },
    ];

    expect(calculateTotalDuration(items)).toBe(0);
  });
});

describe('Recent Bulletins Query Logic', () => {
  interface Bulletin {
    id: string;
    issueDate: Date;
    status: string;
    itemCount: number;
  }

  /**
   * Simulates filtering for "Copy From" dialog
   */
  function filterBulletinsForCopy(
    bulletins: Bulletin[],
    excludeId: string | undefined,
    limit: number
  ): Bulletin[] {
    return bulletins
      .filter((b) => b.id !== excludeId)
      .slice(0, limit);
  }

  const testBulletins: Bulletin[] = [
    { id: 'b1', issueDate: new Date('2024-01-14'), status: 'locked', itemCount: 10 },
    { id: 'b2', issueDate: new Date('2024-01-07'), status: 'draft', itemCount: 8 },
    { id: 'b3', issueDate: new Date('2023-12-31'), status: 'locked', itemCount: 12 },
    { id: 'b4', issueDate: new Date('2023-12-24'), status: 'draft', itemCount: 0 },
  ];

  it('excludes the specified bulletin ID', () => {
    const result = filterBulletinsForCopy(testBulletins, 'b2', 10);

    expect(result.find((b) => b.id === 'b2')).toBeUndefined();
    expect(result.length).toBe(3);
  });

  it('limits results to specified count', () => {
    const result = filterBulletinsForCopy(testBulletins, undefined, 2);

    expect(result.length).toBe(2);
  });

  it('returns all bulletins when no exclusion', () => {
    const result = filterBulletinsForCopy(testBulletins, undefined, 10);

    expect(result.length).toBe(4);
  });
});

describe('Service Order Panel Item Ordering', () => {
  interface OrderedItem {
    id: string;
    sequence: number;
    section: string | null;
  }

  /**
   * Simulates grouping items by section for display
   */
  function groupBySection(items: OrderedItem[]): Map<string, OrderedItem[]> {
    const groups = new Map<string, OrderedItem[]>();

    // Sort by sequence first
    const sorted = [...items].sort((a, b) => a.sequence - b.sequence);

    for (const item of sorted) {
      const section = item.section || 'other';
      const existing = groups.get(section) || [];
      existing.push(item);
      groups.set(section, existing);
    }

    return groups;
  }

  it('groups items by section', () => {
    const items: OrderedItem[] = [
      { id: '1', sequence: 1, section: 'worship' },
      { id: '2', sequence: 2, section: 'worship' },
      { id: '3', sequence: 3, section: 'message' },
      { id: '4', sequence: 4, section: null },
    ];

    const groups = groupBySection(items);

    expect(groups.get('worship')?.length).toBe(2);
    expect(groups.get('message')?.length).toBe(1);
    expect(groups.get('other')?.length).toBe(1);
  });

  it('maintains sequence order within sections', () => {
    const items: OrderedItem[] = [
      { id: '3', sequence: 3, section: 'worship' },
      { id: '1', sequence: 1, section: 'worship' },
      { id: '2', sequence: 2, section: 'worship' },
    ];

    const groups = groupBySection(items);
    const worshipItems = groups.get('worship')!;

    expect(worshipItems[0].sequence).toBe(1);
    expect(worshipItems[1].sequence).toBe(2);
    expect(worshipItems[2].sequence).toBe(3);
  });

  it('assigns null sections to "other"', () => {
    const items: OrderedItem[] = [
      { id: '1', sequence: 1, section: null },
    ];

    const groups = groupBySection(items);

    expect(groups.has('other')).toBe(true);
    expect(groups.get('other')?.length).toBe(1);
  });
});
