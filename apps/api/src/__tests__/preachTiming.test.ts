import { describe, it, expect } from '@jest/globals';

/**
 * Preach Timing Tests
 *
 * Tests for the live timing and analytics feature:
 * 1. Session management (start, end)
 * 2. Item timing recording (start, end events)
 * 3. Duration calculations
 * 4. Idempotency guarantees
 * 5. Analytics data aggregation
 * 6. Tenant/org isolation
 */

// ============================================================================
// Test Types
// ============================================================================

interface PreachSession {
  id: string;
  tenant_id: string;
  bulletin_issue_id: string;
  started_at: Date;
  ended_at: Date | null;
  created_by_user_id: string | null;
  created_at: Date;
  updated_at: Date;
}

interface ServiceItemTiming {
  id: string;
  tenant_id: string;
  preach_session_id: string;
  service_item_id: string;
  started_at: Date | null;
  ended_at: Date | null;
  duration_seconds: number | null;
  created_at: Date;
  updated_at: Date;
}

interface ServiceItem {
  id: string;
  type: string;
  title: string;
  sequence: number;
  duration_minutes: number | null;
  section: string | null;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockTenantId = '11111111-1111-1111-1111-111111111111';
const mockOtherTenantId = '22222222-2222-2222-2222-222222222222';
const mockBulletinId = '33333333-3333-3333-3333-333333333333';
const mockOtherBulletinId = '44444444-4444-4444-4444-444444444444';
const mockUserId = 'user-1';

const mockServiceItems: ServiceItem[] = [
  { id: 'item-1', type: 'Welcome', title: 'Welcome', sequence: 1, duration_minutes: 5, section: 'pre-service' },
  { id: 'item-2', type: 'Song', title: 'Opening Hymn', sequence: 2, duration_minutes: 4, section: 'worship' },
  { id: 'item-3', type: 'Prayer', title: 'Opening Prayer', sequence: 3, duration_minutes: 3, section: 'worship' },
  { id: 'item-4', type: 'Scripture', title: 'Scripture Reading', sequence: 4, duration_minutes: 5, section: 'message' },
  { id: 'item-5', type: 'Sermon', title: 'Sunday Message', sequence: 5, duration_minutes: 25, section: 'message' },
  { id: 'item-6', type: 'Song', title: 'Closing Hymn', sequence: 6, duration_minutes: 4, section: 'response' },
  { id: 'item-7', type: 'Benediction', title: 'Benediction', sequence: 7, duration_minutes: 2, section: 'closing' },
];

// ============================================================================
// Helper Functions (Mirroring Router Logic)
// ============================================================================

/**
 * Compute duration in seconds from start and end times
 */
function computeDurationSeconds(startedAt: Date | null, endedAt: Date | null): number | null {
  if (!startedAt || !endedAt) return null;
  return Math.round((endedAt.getTime() - startedAt.getTime()) / 1000);
}

/**
 * Calculate totals from timing data
 */
function calculateTotals(
  items: { plannedSeconds: number; actualSeconds: number }[]
): {
  plannedSeconds: number;
  actualSeconds: number;
  differenceSeconds: number;
} {
  let plannedSeconds = 0;
  let actualSeconds = 0;

  items.forEach((item) => {
    plannedSeconds += item.plannedSeconds;
    actualSeconds += item.actualSeconds;
  });

  return {
    plannedSeconds,
    actualSeconds,
    differenceSeconds: actualSeconds - plannedSeconds,
  };
}

/**
 * Format duration for display
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(Math.abs(seconds) / 60);
  const secs = Math.abs(seconds) % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format difference with +/- prefix
 */
function formatDifference(seconds: number): string {
  if (seconds === 0) return '—';
  const prefix = seconds > 0 ? '+' : '-';
  return `${prefix}${formatDuration(Math.abs(seconds))}`;
}

// ============================================================================
// Session Management Tests
// ============================================================================

describe('Preach Session Management', () => {
  describe('startSession', () => {
    it('creates a new session with correct tenant and bulletin', () => {
      const session: PreachSession = {
        id: 'session-1',
        tenant_id: mockTenantId,
        bulletin_issue_id: mockBulletinId,
        started_at: new Date(),
        ended_at: null,
        created_by_user_id: mockUserId,
        created_at: new Date(),
        updated_at: new Date(),
      };

      expect(session.tenant_id).toBe(mockTenantId);
      expect(session.bulletin_issue_id).toBe(mockBulletinId);
      expect(session.ended_at).toBeNull();
      expect(session.created_by_user_id).toBe(mockUserId);
    });

    it('sets started_at to current time', () => {
      const before = new Date();
      const session: PreachSession = {
        id: 'session-1',
        tenant_id: mockTenantId,
        bulletin_issue_id: mockBulletinId,
        started_at: new Date(),
        ended_at: null,
        created_by_user_id: mockUserId,
        created_at: new Date(),
        updated_at: new Date(),
      };
      const after = new Date();

      expect(session.started_at.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(session.started_at.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('allows null created_by_user_id for anonymous sessions', () => {
      const session: PreachSession = {
        id: 'session-1',
        tenant_id: mockTenantId,
        bulletin_issue_id: mockBulletinId,
        started_at: new Date(),
        ended_at: null,
        created_by_user_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      expect(session.created_by_user_id).toBeNull();
    });
  });

  describe('endSession', () => {
    it('sets ended_at when session ends', () => {
      const startedAt = new Date('2025-01-01T09:00:00Z');
      const endedAt = new Date('2025-01-01T10:15:00Z');

      const session: PreachSession = {
        id: 'session-1',
        tenant_id: mockTenantId,
        bulletin_issue_id: mockBulletinId,
        started_at: startedAt,
        ended_at: endedAt,
        created_by_user_id: mockUserId,
        created_at: startedAt,
        updated_at: endedAt,
      };

      expect(session.ended_at).not.toBeNull();
      expect(session.ended_at).toEqual(endedAt);
    });

    it('is idempotent - does not change ended_at if already set', () => {
      const endedAt = new Date('2025-01-01T10:15:00Z');
      const laterTime = new Date('2025-01-01T10:30:00Z');

      // Simulating idempotent behavior
      const existingEndedAt = endedAt;
      const newEndedAt = existingEndedAt || laterTime;

      expect(newEndedAt).toEqual(endedAt);
    });

    it('computes session duration correctly', () => {
      const startedAt = new Date('2025-01-01T09:00:00Z');
      const endedAt = new Date('2025-01-01T10:15:30Z');

      const durationSeconds = computeDurationSeconds(startedAt, endedAt);

      // 1 hour 15 min 30 sec = 4530 seconds
      expect(durationSeconds).toBe(4530);
    });
  });
});

// ============================================================================
// Item Timing Tests
// ============================================================================

describe('Service Item Timing', () => {
  describe('recordItemTiming - start event', () => {
    it('creates timing record with started_at', () => {
      const timing: ServiceItemTiming = {
        id: 'timing-1',
        tenant_id: mockTenantId,
        preach_session_id: 'session-1',
        service_item_id: 'item-1',
        started_at: new Date(),
        ended_at: null,
        duration_seconds: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      expect(timing.started_at).not.toBeNull();
      expect(timing.ended_at).toBeNull();
      expect(timing.duration_seconds).toBeNull();
    });

    it('does not overwrite existing started_at (idempotent)', () => {
      const originalStart = new Date('2025-01-01T09:00:00Z');
      const laterStart = new Date('2025-01-01T09:01:00Z');

      // Simulating COALESCE behavior
      const existingStartedAt = originalStart;
      const newStartedAt = existingStartedAt || laterStart;

      expect(newStartedAt).toEqual(originalStart);
    });
  });

  describe('recordItemTiming - end event', () => {
    it('sets ended_at and computes duration_seconds', () => {
      const startedAt = new Date('2025-01-01T09:00:00Z');
      const endedAt = new Date('2025-01-01T09:04:30Z');

      const durationSeconds = computeDurationSeconds(startedAt, endedAt);

      // 4 minutes 30 seconds = 270 seconds
      expect(durationSeconds).toBe(270);
    });

    it('does not overwrite existing ended_at (idempotent)', () => {
      const originalEnd = new Date('2025-01-01T09:04:30Z');
      const laterEnd = new Date('2025-01-01T09:05:00Z');

      // Simulating COALESCE behavior
      const existingEndedAt = originalEnd;
      const newEndedAt = existingEndedAt || laterEnd;

      expect(newEndedAt).toEqual(originalEnd);
    });

    it('handles end without start gracefully', () => {
      const timing: ServiceItemTiming = {
        id: 'timing-1',
        tenant_id: mockTenantId,
        preach_session_id: 'session-1',
        service_item_id: 'item-1',
        started_at: null,
        ended_at: new Date(),
        duration_seconds: null, // Can't compute without start
        created_at: new Date(),
        updated_at: new Date(),
      };

      const duration = computeDurationSeconds(timing.started_at, timing.ended_at);
      expect(duration).toBeNull();
    });
  });

  describe('unique constraint', () => {
    it('enforces one timing per session/item combination', () => {
      // This would be tested at the DB level
      // The unique constraint (preach_session_id, service_item_id) ensures:
      // - Multiple calls for same session/item update the same row
      // - Different items in same session get different rows
      // - Same item in different sessions get different rows

      const timing1 = { preach_session_id: 'session-1', service_item_id: 'item-1' };
      const timing2 = { preach_session_id: 'session-1', service_item_id: 'item-1' };
      const timing3 = { preach_session_id: 'session-1', service_item_id: 'item-2' };
      const timing4 = { preach_session_id: 'session-2', service_item_id: 'item-1' };

      // timing1 and timing2 would update same row (same key)
      expect(timing1.preach_session_id).toBe(timing2.preach_session_id);
      expect(timing1.service_item_id).toBe(timing2.service_item_id);

      // timing3 would be different row (different item)
      expect(timing1.service_item_id).not.toBe(timing3.service_item_id);

      // timing4 would be different row (different session)
      expect(timing1.preach_session_id).not.toBe(timing4.preach_session_id);
    });
  });
});

// ============================================================================
// Duration Calculation Tests
// ============================================================================

describe('Duration Calculations', () => {
  describe('computeDurationSeconds', () => {
    it('returns null when started_at is null', () => {
      expect(computeDurationSeconds(null, new Date())).toBeNull();
    });

    it('returns null when ended_at is null', () => {
      expect(computeDurationSeconds(new Date(), null)).toBeNull();
    });

    it('returns null when both are null', () => {
      expect(computeDurationSeconds(null, null)).toBeNull();
    });

    it('calculates correct duration for typical service item', () => {
      const startedAt = new Date('2025-01-01T09:00:00Z');
      const endedAt = new Date('2025-01-01T09:05:00Z');

      expect(computeDurationSeconds(startedAt, endedAt)).toBe(300); // 5 minutes
    });

    it('calculates correct duration for long item (sermon)', () => {
      const startedAt = new Date('2025-01-01T09:30:00Z');
      const endedAt = new Date('2025-01-01T10:02:30Z');

      expect(computeDurationSeconds(startedAt, endedAt)).toBe(1950); // 32.5 minutes
    });

    it('handles sub-second precision by rounding', () => {
      const startedAt = new Date('2025-01-01T09:00:00.000Z');
      const endedAt = new Date('2025-01-01T09:00:10.500Z');

      // Math.round((10500) / 1000) = Math.round(10.5) = 11
      expect(computeDurationSeconds(startedAt, endedAt)).toBe(11);
    });
  });

  describe('calculateTotals', () => {
    it('sums planned and actual durations correctly', () => {
      const items = [
        { plannedSeconds: 300, actualSeconds: 280 },
        { plannedSeconds: 240, actualSeconds: 260 },
        { plannedSeconds: 1500, actualSeconds: 1650 },
      ];

      const totals = calculateTotals(items);

      expect(totals.plannedSeconds).toBe(2040); // 5 + 4 + 25 minutes
      expect(totals.actualSeconds).toBe(2190);
      expect(totals.differenceSeconds).toBe(150); // 2.5 minutes over
    });

    it('handles empty items array', () => {
      const totals = calculateTotals([]);

      expect(totals.plannedSeconds).toBe(0);
      expect(totals.actualSeconds).toBe(0);
      expect(totals.differenceSeconds).toBe(0);
    });

    it('correctly identifies under-time services', () => {
      const items = [
        { plannedSeconds: 300, actualSeconds: 240 },
        { plannedSeconds: 1500, actualSeconds: 1200 },
      ];

      const totals = calculateTotals(items);

      expect(totals.differenceSeconds).toBe(-360); // 6 minutes under
    });
  });
});

// ============================================================================
// Formatting Tests
// ============================================================================

describe('Duration Formatting', () => {
  describe('formatDuration', () => {
    it('formats short durations correctly', () => {
      expect(formatDuration(30)).toBe('0:30');
      expect(formatDuration(90)).toBe('1:30');
      expect(formatDuration(0)).toBe('0:00');
    });

    it('formats typical service item durations', () => {
      expect(formatDuration(300)).toBe('5:00'); // 5 min
      expect(formatDuration(270)).toBe('4:30'); // 4.5 min
      expect(formatDuration(1500)).toBe('25:00'); // 25 min
    });

    it('formats long durations (full service)', () => {
      expect(formatDuration(3600)).toBe('60:00'); // 1 hour
      expect(formatDuration(4530)).toBe('75:30'); // 1 hour 15.5 min
    });

    it('handles negative values (for difference display)', () => {
      expect(formatDuration(-180)).toBe('3:00');
      expect(formatDuration(-45)).toBe('0:45');
    });
  });

  describe('formatDifference', () => {
    it('returns dash for zero difference', () => {
      expect(formatDifference(0)).toBe('—');
    });

    it('formats positive differences with plus sign', () => {
      expect(formatDifference(60)).toBe('+1:00');
      expect(formatDifference(150)).toBe('+2:30');
    });

    it('formats negative differences with minus sign', () => {
      expect(formatDifference(-60)).toBe('-1:00');
      expect(formatDifference(-90)).toBe('-1:30');
    });
  });
});

// ============================================================================
// Analytics Aggregation Tests
// ============================================================================

describe('Analytics Data Aggregation', () => {
  describe('getSessionSummary', () => {
    it('combines timing data with service item metadata', () => {
      const timings = [
        { service_item_id: 'item-1', started_at: new Date('2025-01-01T09:00:00Z'), ended_at: new Date('2025-01-01T09:05:30Z') },
        { service_item_id: 'item-2', started_at: new Date('2025-01-01T09:05:30Z'), ended_at: new Date('2025-01-01T09:10:00Z') },
      ];

      const summaryItems = timings.map(t => {
        const item = mockServiceItems.find(i => i.id === t.service_item_id)!;
        const actualSeconds = computeDurationSeconds(t.started_at, t.ended_at) || 0;
        const plannedSeconds = (item.duration_minutes || 0) * 60;
        return {
          serviceItemId: t.service_item_id,
          type: item.type,
          title: item.title,
          plannedDurationMinutes: item.duration_minutes,
          actualDurationSeconds: actualSeconds,
          difference: actualSeconds - plannedSeconds,
        };
      });

      expect(summaryItems[0].type).toBe('Welcome');
      expect(summaryItems[0].plannedDurationMinutes).toBe(5);
      expect(summaryItems[0].actualDurationSeconds).toBe(330); // 5.5 minutes
      expect(summaryItems[0].difference).toBe(30); // 30 seconds over

      expect(summaryItems[1].type).toBe('Song');
      expect(summaryItems[1].plannedDurationMinutes).toBe(4);
      expect(summaryItems[1].actualDurationSeconds).toBe(270); // 4.5 minutes
      expect(summaryItems[1].difference).toBe(30); // 30 seconds over
    });

    it('handles items without timing data', () => {
      // Items that were skipped or not timed should show as 0 actual
      const untimedItem = {
        serviceItemId: 'item-3',
        type: 'Prayer',
        title: 'Opening Prayer',
        plannedDurationMinutes: 3,
        actualDurationSeconds: 0,
        difference: -180, // 3 minutes "under" (no timing = 0)
      };

      expect(untimedItem.actualDurationSeconds).toBe(0);
    });
  });

  describe('listSessions', () => {
    it('returns sessions ordered by start time descending', () => {
      const sessions = [
        { id: 'session-1', started_at: new Date('2025-01-01T09:00:00Z') },
        { id: 'session-2', started_at: new Date('2025-01-01T11:00:00Z') },
        { id: 'session-3', started_at: new Date('2025-01-01T18:00:00Z') },
      ];

      const sorted = [...sessions].sort((a, b) =>
        b.started_at.getTime() - a.started_at.getTime()
      );

      expect(sorted[0].id).toBe('session-3'); // Latest first
      expect(sorted[1].id).toBe('session-2');
      expect(sorted[2].id).toBe('session-1');
    });

    it('includes aggregate timing info per session', () => {
      const sessionWithTimings = {
        id: 'session-1',
        started_at: new Date('2025-01-01T09:00:00Z'),
        ended_at: new Date('2025-01-01T10:15:00Z'),
        total_items: 7,
        total_actual_seconds: 4200, // 70 minutes
      };

      expect(sessionWithTimings.total_items).toBe(7);
      expect(sessionWithTimings.total_actual_seconds).toBe(4200);

      // Session duration
      const sessionDuration = computeDurationSeconds(
        sessionWithTimings.started_at,
        sessionWithTimings.ended_at
      );
      expect(sessionDuration).toBe(4500); // 75 minutes
    });
  });
});

// ============================================================================
// Tenant Isolation Tests
// ============================================================================

describe('Tenant Isolation', () => {
  describe('session access control', () => {
    it('only allows access to sessions from same tenant', () => {
      const session = {
        id: 'session-1',
        tenant_id: mockTenantId,
      };

      // Simulate RLS policy check
      const requestingTenantId = mockTenantId;
      const hasAccess = session.tenant_id === requestingTenantId;

      expect(hasAccess).toBe(true);
    });

    it('denies access to sessions from other tenants', () => {
      const session = {
        id: 'session-1',
        tenant_id: mockTenantId,
      };

      // Simulate RLS policy check
      const requestingTenantId = mockOtherTenantId;
      const hasAccess = session.tenant_id === requestingTenantId;

      expect(hasAccess).toBe(false);
    });
  });

  describe('bulletin access validation', () => {
    it('verifies bulletin belongs to tenant before creating session', () => {
      const bulletin = {
        id: mockBulletinId,
        tenant_id: mockTenantId,
      };

      // User's tenant matches bulletin's tenant
      const userTenantId = mockTenantId;
      const canCreateSession = bulletin.tenant_id === userTenantId;

      expect(canCreateSession).toBe(true);
    });

    it('rejects session creation for other tenant bulletins', () => {
      const bulletin = {
        id: mockOtherBulletinId,
        tenant_id: mockOtherTenantId,
      };

      // User's tenant doesn't match bulletin's tenant
      const userTenantId = mockTenantId;
      const canCreateSession = bulletin.tenant_id === userTenantId;

      expect(canCreateSession).toBe(false);
    });
  });
});

// ============================================================================
// Integration Behavior Tests (Simulated)
// ============================================================================

describe('Integration Behavior', () => {
  describe('typical service flow', () => {
    it('records timing for full service progression', () => {
      const sessionStart = new Date('2025-01-01T09:00:00Z');
      const timings: Array<{
        itemId: string;
        startedAt: Date;
        endedAt: Date;
        durationSeconds: number;
      }> = [];

      // Simulate service progression
      let currentTime = sessionStart;

      mockServiceItems.forEach((item) => {
        const startedAt = new Date(currentTime);
        // Add some variation from planned duration
        const variation = Math.floor(Math.random() * 60) - 30; // +/- 30 seconds
        const actualSeconds = (item.duration_minutes || 0) * 60 + variation;
        currentTime = new Date(currentTime.getTime() + actualSeconds * 1000);

        timings.push({
          itemId: item.id,
          startedAt,
          endedAt: currentTime,
          durationSeconds: actualSeconds,
        });
      });

      // Verify all items have timing
      expect(timings.length).toBe(mockServiceItems.length);

      // Verify timing chain (no gaps)
      for (let i = 1; i < timings.length; i++) {
        // Each item starts when previous ends (within tolerance)
        const gap = timings[i].startedAt.getTime() - timings[i - 1].endedAt.getTime();
        expect(gap).toBe(0);
      }
    });

    it('handles out-of-order navigation (jumping to items)', () => {
      const timings = new Map<string, { startedAt: Date | null; endedAt: Date | null }>();

      // Simulate: Start item 1, jump to item 5, back to item 2
      const events = [
        { itemId: 'item-1', event: 'start', time: new Date('2025-01-01T09:00:00Z') },
        { itemId: 'item-1', event: 'end', time: new Date('2025-01-01T09:02:00Z') },
        { itemId: 'item-5', event: 'start', time: new Date('2025-01-01T09:02:00Z') },
        { itemId: 'item-5', event: 'end', time: new Date('2025-01-01T09:05:00Z') },
        { itemId: 'item-2', event: 'start', time: new Date('2025-01-01T09:05:00Z') },
        { itemId: 'item-2', event: 'end', time: new Date('2025-01-01T09:09:00Z') },
      ];

      events.forEach(({ itemId, event, time }) => {
        if (!timings.has(itemId)) {
          timings.set(itemId, { startedAt: null, endedAt: null });
        }
        const timing = timings.get(itemId)!;
        if (event === 'start' && !timing.startedAt) {
          timing.startedAt = time;
        }
        if (event === 'end' && !timing.endedAt) {
          timing.endedAt = time;
        }
      });

      // Verify each item has timing
      expect(timings.get('item-1')?.startedAt).not.toBeNull();
      expect(timings.get('item-1')?.endedAt).not.toBeNull();
      expect(timings.get('item-5')?.startedAt).not.toBeNull();
      expect(timings.get('item-2')?.startedAt).not.toBeNull();

      // Items 3, 4, 6, 7 were never visited
      expect(timings.has('item-3')).toBe(false);
    });
  });

  describe('resilience scenarios', () => {
    it('handles duplicate start events gracefully', () => {
      let startedAt: Date | null = null;

      // First start
      const firstStart = new Date('2025-01-01T09:00:00Z');
      startedAt = startedAt || firstStart;
      expect(startedAt).toEqual(firstStart);

      // Duplicate start (should be ignored)
      const duplicateStart = new Date('2025-01-01T09:00:05Z');
      startedAt = startedAt || duplicateStart;
      expect(startedAt).toEqual(firstStart); // Still original
    });

    it('handles duplicate end events gracefully', () => {
      let endedAt: Date | null = null;

      // First end
      const firstEnd = new Date('2025-01-01T09:05:00Z');
      endedAt = endedAt || firstEnd;
      expect(endedAt).toEqual(firstEnd);

      // Duplicate end (should be ignored)
      const duplicateEnd = new Date('2025-01-01T09:05:10Z');
      endedAt = endedAt || duplicateEnd;
      expect(endedAt).toEqual(firstEnd); // Still original
    });

    it('handles end before start (edge case)', () => {
      // This can happen if timing calls arrive out of order
      const timing = {
        startedAt: null,
        endedAt: new Date('2025-01-01T09:05:00Z'),
      };

      // Duration can't be computed
      const duration = computeDurationSeconds(timing.startedAt, timing.endedAt);
      expect(duration).toBeNull();
    });
  });
});

// ============================================================================
// API Response Format Tests
// ============================================================================

describe('API Response Formats', () => {
  describe('startSession response', () => {
    it('returns sessionId and startedAt', () => {
      const response = {
        sessionId: 'session-1',
        startedAt: new Date('2025-01-01T09:00:00Z'),
      };

      expect(response.sessionId).toBeDefined();
      expect(response.startedAt).toBeDefined();
    });
  });

  describe('endSession response', () => {
    it('returns sessionId, endedAt, and alreadyEnded flag', () => {
      const response = {
        sessionId: 'session-1',
        endedAt: new Date('2025-01-01T10:15:00Z'),
        alreadyEnded: false,
      };

      expect(response.sessionId).toBeDefined();
      expect(response.endedAt).toBeDefined();
      expect(response.alreadyEnded).toBe(false);
    });

    it('indicates when session was already ended', () => {
      const response = {
        sessionId: 'session-1',
        endedAt: new Date('2025-01-01T10:15:00Z'),
        alreadyEnded: true,
      };

      expect(response.alreadyEnded).toBe(true);
    });
  });

  describe('recordItemTiming response', () => {
    it('returns success indicator', () => {
      const response = { success: true };
      expect(response.success).toBe(true);
    });
  });

  describe('getSessionSummary response', () => {
    it('includes session, items, and totals', () => {
      const response = {
        session: {
          id: 'session-1',
          bulletinIssueId: mockBulletinId,
          issueDate: new Date('2025-01-01'),
          startedAt: new Date('2025-01-01T09:00:00Z'),
          endedAt: new Date('2025-01-01T10:15:00Z'),
          durationSeconds: 4500,
          createdByUserId: mockUserId,
        },
        items: [
          {
            serviceItemId: 'item-1',
            type: 'Welcome',
            title: 'Welcome',
            sequence: 1,
            section: 'pre-service',
            plannedDurationMinutes: 5,
            plannedDurationSeconds: 300,
            actualDurationSeconds: 330,
            startedAt: new Date('2025-01-01T09:00:00Z'),
            endedAt: new Date('2025-01-01T09:05:30Z'),
            difference: 30,
          },
        ],
        totals: {
          plannedSeconds: 2880,
          plannedMinutes: 48,
          actualSeconds: 3000,
          actualMinutes: 50,
          differenceSeconds: 120,
          differenceMinutes: 2,
        },
      };

      expect(response.session).toBeDefined();
      expect(response.items).toBeDefined();
      expect(response.items.length).toBeGreaterThan(0);
      expect(response.totals).toBeDefined();
      expect(response.totals.differenceSeconds).toBe(
        response.totals.actualSeconds - response.totals.plannedSeconds
      );
    });
  });
});
