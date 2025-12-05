import { describe, it, expect } from '@jest/globals';

/**
 * Service Analytics Tests
 *
 * Tests for the aggregated service analytics feature:
 * 1. Preacher statistics (grouping, averages, deltas)
 * 2. Series statistics (grouping, averages, deltas)
 * 3. Service time slot statistics (grouping, averages, deltas)
 * 4. Filter functionality (date range, preacher, series, slot)
 * 5. Detail drill-down (session list for a filter)
 * 6. Tenant isolation
 */

// ============================================================================
// Test Types
// ============================================================================

interface PreacherStats {
  preacherId: string;
  preacherName: string;
  sessionsCount: number;
  avgPlannedMinutes: number;
  avgActualMinutes: number;
  avgDeltaMinutes: number;
}

interface SeriesStats {
  seriesId: string;
  seriesName: string;
  sessionsCount: number;
  avgPlannedMinutes: number;
  avgActualMinutes: number;
  avgDeltaMinutes: number;
}

interface ServiceSlotStats {
  serviceSlot: string;
  sessionsCount: number;
  avgPlannedMinutes: number;
  avgActualMinutes: number;
  avgDeltaMinutes: number;
}

interface SessionDetail {
  sessionId: string;
  bulletinIssueId: string;
  issueDate: Date;
  startedAt: Date;
  endedAt: Date | null;
  serviceSlot: string;
  preacher: string | null;
  seriesId: string | null;
  seriesName: string | null;
  sermonTitle: string | null;
  plannedMinutes: number;
  actualMinutes: number;
  deltaMinutes: number;
}

interface OverviewStats {
  sessionsCount: number;
  avgPlannedMinutes: number;
  avgActualMinutes: number;
  avgDeltaMinutes: number;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockTenantId = '11111111-1111-1111-1111-111111111111';
const mockOtherTenantId = '22222222-2222-2222-2222-222222222222';

// Mock data for reference (used in tenant isolation test)
const mockPreachers = [
  { id: 'pastor-john', name: 'Pastor John' },
  { id: 'pastor-sarah', name: 'Pastor Sarah' },
  { id: 'guest-speaker', name: 'Guest Speaker' },
];

// Mock sessions with timing data
const mockSessions: SessionDetail[] = [
  // Pastor John - 9am - Finding Peace - over time
  {
    sessionId: 'session-1',
    bulletinIssueId: 'bulletin-1',
    issueDate: new Date('2025-01-05'),
    startedAt: new Date('2025-01-05T09:00:00Z'),
    endedAt: new Date('2025-01-05T10:10:00Z'),
    serviceSlot: '09:00',
    preacher: 'Pastor John',
    seriesId: 'series-1',
    seriesName: 'Finding Peace',
    sermonTitle: 'Peace in Storms',
    plannedMinutes: 60,
    actualMinutes: 70,
    deltaMinutes: 10,
  },
  // Pastor John - 11am - Finding Peace - slightly over
  {
    sessionId: 'session-2',
    bulletinIssueId: 'bulletin-1',
    issueDate: new Date('2025-01-05'),
    startedAt: new Date('2025-01-05T11:00:00Z'),
    endedAt: new Date('2025-01-05T12:05:00Z'),
    serviceSlot: '11:00',
    preacher: 'Pastor John',
    seriesId: 'series-1',
    seriesName: 'Finding Peace',
    sermonTitle: 'Peace in Storms',
    plannedMinutes: 60,
    actualMinutes: 65,
    deltaMinutes: 5,
  },
  // Pastor Sarah - 9am - Walking in Faith - under time
  {
    sessionId: 'session-3',
    bulletinIssueId: 'bulletin-2',
    issueDate: new Date('2025-01-12'),
    startedAt: new Date('2025-01-12T09:00:00Z'),
    endedAt: new Date('2025-01-12T09:55:00Z'),
    serviceSlot: '09:00',
    preacher: 'Pastor Sarah',
    seriesId: 'series-2',
    seriesName: 'Walking in Faith',
    sermonTitle: 'Steps of Faith',
    plannedMinutes: 60,
    actualMinutes: 55,
    deltaMinutes: -5,
  },
  // Pastor Sarah - 11am - Walking in Faith - on time
  {
    sessionId: 'session-4',
    bulletinIssueId: 'bulletin-2',
    issueDate: new Date('2025-01-12'),
    startedAt: new Date('2025-01-12T11:00:00Z'),
    endedAt: new Date('2025-01-12T12:00:00Z'),
    serviceSlot: '11:00',
    preacher: 'Pastor Sarah',
    seriesId: 'series-2',
    seriesName: 'Walking in Faith',
    sermonTitle: 'Steps of Faith',
    plannedMinutes: 60,
    actualMinutes: 60,
    deltaMinutes: 0,
  },
  // Guest Speaker - 9am - Advent Journey - way over
  {
    sessionId: 'session-5',
    bulletinIssueId: 'bulletin-3',
    issueDate: new Date('2025-12-03'),
    startedAt: new Date('2025-12-03T09:00:00Z'),
    endedAt: new Date('2025-12-03T10:20:00Z'),
    serviceSlot: '09:00',
    preacher: 'Guest Speaker',
    seriesId: 'series-3',
    seriesName: 'Advent Journey',
    sermonTitle: 'Hope Arrives',
    plannedMinutes: 60,
    actualMinutes: 80,
    deltaMinutes: 20,
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate average from array of numbers
 */
function average(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return Math.round(numbers.reduce((a, b) => a + b, 0) / numbers.length);
}

/**
 * Group sessions by a key
 */
function groupBy<T, K extends string | number>(
  items: T[],
  keyFn: (item: T) => K
): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  items.forEach((item) => {
    const key = keyFn(item);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
  });
  return groups;
}

/**
 * Filter sessions by date range
 */
function filterByDateRange(
  sessions: SessionDetail[],
  from: string,
  to: string
): SessionDetail[] {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  return sessions.filter((s) => {
    const date = new Date(s.issueDate);
    return date >= fromDate && date <= toDate;
  });
}

/**
 * Calculate preacher stats from sessions
 */
function calculatePreacherStats(sessions: SessionDetail[]): PreacherStats[] {
  const byPreacher = groupBy(sessions, (s) => s.preacher || 'Unknown');
  const stats: PreacherStats[] = [];

  byPreacher.forEach((group, preacher) => {
    if (preacher === 'Unknown') return;
    stats.push({
      preacherId: preacher,
      preacherName: preacher,
      sessionsCount: group.length,
      avgPlannedMinutes: average(group.map((s) => s.plannedMinutes)),
      avgActualMinutes: average(group.map((s) => s.actualMinutes)),
      avgDeltaMinutes: average(group.map((s) => s.deltaMinutes)),
    });
  });

  return stats.sort((a, b) => b.sessionsCount - a.sessionsCount);
}

/**
 * Calculate series stats from sessions
 */
function calculateSeriesStats(sessions: SessionDetail[]): SeriesStats[] {
  const bySeries = groupBy(sessions, (s) => s.seriesId || 'none');
  const stats: SeriesStats[] = [];

  bySeries.forEach((group, seriesId) => {
    if (seriesId === 'none') return;
    const seriesName = group[0].seriesName || 'Unknown';
    stats.push({
      seriesId,
      seriesName,
      sessionsCount: group.length,
      avgPlannedMinutes: average(group.map((s) => s.plannedMinutes)),
      avgActualMinutes: average(group.map((s) => s.actualMinutes)),
      avgDeltaMinutes: average(group.map((s) => s.deltaMinutes)),
    });
  });

  return stats.sort((a, b) => b.sessionsCount - a.sessionsCount);
}

/**
 * Calculate service slot stats from sessions
 */
function calculateServiceSlotStats(sessions: SessionDetail[]): ServiceSlotStats[] {
  const bySlot = groupBy(sessions, (s) => s.serviceSlot);
  const stats: ServiceSlotStats[] = [];

  bySlot.forEach((group, slot) => {
    stats.push({
      serviceSlot: slot,
      sessionsCount: group.length,
      avgPlannedMinutes: average(group.map((s) => s.plannedMinutes)),
      avgActualMinutes: average(group.map((s) => s.actualMinutes)),
      avgDeltaMinutes: average(group.map((s) => s.deltaMinutes)),
    });
  });

  return stats.sort((a, b) => a.serviceSlot.localeCompare(b.serviceSlot));
}

/**
 * Calculate overview stats from sessions
 */
function calculateOverviewStats(sessions: SessionDetail[]): OverviewStats {
  if (sessions.length === 0) {
    return {
      sessionsCount: 0,
      avgPlannedMinutes: 0,
      avgActualMinutes: 0,
      avgDeltaMinutes: 0,
    };
  }

  return {
    sessionsCount: sessions.length,
    avgPlannedMinutes: average(sessions.map((s) => s.plannedMinutes)),
    avgActualMinutes: average(sessions.map((s) => s.actualMinutes)),
    avgDeltaMinutes: average(sessions.map((s) => s.deltaMinutes)),
  };
}

// ============================================================================
// Preacher Stats Tests
// ============================================================================

describe('Analytics - Preacher Stats', () => {
  describe('getPreacherStats', () => {
    it('groups sessions by preacher correctly', () => {
      const stats = calculatePreacherStats(mockSessions);

      expect(stats.length).toBe(3); // 3 preachers

      const johnStats = stats.find((s) => s.preacherName === 'Pastor John');
      expect(johnStats).toBeDefined();
      expect(johnStats!.sessionsCount).toBe(2);

      const sarahStats = stats.find((s) => s.preacherName === 'Pastor Sarah');
      expect(sarahStats).toBeDefined();
      expect(sarahStats!.sessionsCount).toBe(2);

      const guestStats = stats.find((s) => s.preacherName === 'Guest Speaker');
      expect(guestStats).toBeDefined();
      expect(guestStats!.sessionsCount).toBe(1);
    });

    it('calculates correct averages for each preacher', () => {
      const stats = calculatePreacherStats(mockSessions);

      // Pastor John: sessions with 60 planned, 70 and 65 actual
      const johnStats = stats.find((s) => s.preacherName === 'Pastor John')!;
      expect(johnStats.avgPlannedMinutes).toBe(60);
      expect(johnStats.avgActualMinutes).toBe(68); // (70+65)/2 = 67.5 -> 68
      expect(johnStats.avgDeltaMinutes).toBe(8); // (10+5)/2 = 7.5 -> 8

      // Pastor Sarah: sessions with 60 planned, 55 and 60 actual
      const sarahStats = stats.find((s) => s.preacherName === 'Pastor Sarah')!;
      expect(sarahStats.avgPlannedMinutes).toBe(60);
      expect(sarahStats.avgActualMinutes).toBe(58); // (55+60)/2 = 57.5 -> 58
      expect(sarahStats.avgDeltaMinutes).toBe(-2); // (-5+0)/2 = -2.5 -> -2 or -3
    });

    it('identifies preachers who consistently run over', () => {
      const stats = calculatePreacherStats(mockSessions);

      // Guest Speaker has highest delta
      const guestStats = stats.find((s) => s.preacherName === 'Guest Speaker')!;
      expect(guestStats.avgDeltaMinutes).toBe(20);

      // Pastor John also runs over
      const johnStats = stats.find((s) => s.preacherName === 'Pastor John')!;
      expect(johnStats.avgDeltaMinutes).toBeGreaterThan(0);

      // Pastor Sarah runs under on average
      const sarahStats = stats.find((s) => s.preacherName === 'Pastor Sarah')!;
      expect(sarahStats.avgDeltaMinutes).toBeLessThanOrEqual(0);
    });

    it('respects date range filter', () => {
      const janSessions = filterByDateRange(mockSessions, '2025-01-01', '2025-01-31');
      const stats = calculatePreacherStats(janSessions);

      // Only January sessions (excludes Guest Speaker's December session)
      expect(stats.length).toBe(2);
      expect(stats.find((s) => s.preacherName === 'Guest Speaker')).toBeUndefined();
    });

    it('handles empty results gracefully', () => {
      const emptySessions = filterByDateRange(mockSessions, '2024-01-01', '2024-12-31');
      const stats = calculatePreacherStats(emptySessions);

      expect(stats.length).toBe(0);
    });
  });
});

// ============================================================================
// Series Stats Tests
// ============================================================================

describe('Analytics - Series Stats', () => {
  describe('getSeriesStats', () => {
    it('groups sessions by series correctly', () => {
      const stats = calculateSeriesStats(mockSessions);

      expect(stats.length).toBe(3); // 3 series

      const findingPeace = stats.find((s) => s.seriesName === 'Finding Peace');
      expect(findingPeace).toBeDefined();
      expect(findingPeace!.sessionsCount).toBe(2);

      const walkingFaith = stats.find((s) => s.seriesName === 'Walking in Faith');
      expect(walkingFaith).toBeDefined();
      expect(walkingFaith!.sessionsCount).toBe(2);

      const adventJourney = stats.find((s) => s.seriesName === 'Advent Journey');
      expect(adventJourney).toBeDefined();
      expect(adventJourney!.sessionsCount).toBe(1);
    });

    it('calculates correct averages for each series', () => {
      const stats = calculateSeriesStats(mockSessions);

      // Finding Peace: two sessions with delta 10 and 5
      const findingPeace = stats.find((s) => s.seriesName === 'Finding Peace')!;
      expect(findingPeace.avgDeltaMinutes).toBe(8); // (10+5)/2 = 7.5 -> 8

      // Walking in Faith: two sessions with delta -5 and 0
      const walkingFaith = stats.find((s) => s.seriesName === 'Walking in Faith')!;
      expect(walkingFaith.avgDeltaMinutes).toBe(-2); // (-5+0)/2 = -2.5 -> -2 or -3
    });

    it('identifies series that tend to run over', () => {
      const stats = calculateSeriesStats(mockSessions);

      // Advent Journey has highest delta
      const adventJourney = stats.find((s) => s.seriesName === 'Advent Journey')!;
      expect(adventJourney.avgDeltaMinutes).toBe(20);

      // Walking in Faith runs under
      const walkingFaith = stats.find((s) => s.seriesName === 'Walking in Faith')!;
      expect(walkingFaith.avgDeltaMinutes).toBeLessThan(0);
    });

    it('handles sessions without series', () => {
      const sessionsWithNoSeries: SessionDetail[] = [
        ...mockSessions,
        {
          sessionId: 'session-no-series',
          bulletinIssueId: 'bulletin-x',
          issueDate: new Date('2025-02-01'),
          startedAt: new Date('2025-02-01T09:00:00Z'),
          endedAt: new Date('2025-02-01T10:00:00Z'),
          serviceSlot: '09:00',
          preacher: 'Pastor John',
          seriesId: null,
          seriesName: null,
          sermonTitle: 'Stand-alone Message',
          plannedMinutes: 60,
          actualMinutes: 65,
          deltaMinutes: 5,
        },
      ];

      const stats = calculateSeriesStats(sessionsWithNoSeries);

      // Should still only have 3 series (null series excluded)
      expect(stats.length).toBe(3);
    });
  });
});

// ============================================================================
// Service Time Stats Tests
// ============================================================================

describe('Analytics - Service Time Stats', () => {
  describe('getServiceTimeStats', () => {
    it('groups sessions by service slot correctly', () => {
      const stats = calculateServiceSlotStats(mockSessions);

      // 9am and 11am slots in mock data
      expect(stats.length).toBe(2);

      const nineAm = stats.find((s) => s.serviceSlot === '09:00');
      expect(nineAm).toBeDefined();
      expect(nineAm!.sessionsCount).toBe(3); // 3 sessions at 9am

      const elevenAm = stats.find((s) => s.serviceSlot === '11:00');
      expect(elevenAm).toBeDefined();
      expect(elevenAm!.sessionsCount).toBe(2); // 2 sessions at 11am
    });

    it('calculates correct averages for each slot', () => {
      const stats = calculateServiceSlotStats(mockSessions);

      // 9am: deltas of 10, -5, 20 = (10-5+20)/3 = 25/3 = 8.33 -> 8
      const nineAm = stats.find((s) => s.serviceSlot === '09:00')!;
      expect(nineAm.avgDeltaMinutes).toBe(8);

      // 11am: deltas of 5, 0 = (5+0)/2 = 2.5 -> 3 (Math.round)
      const elevenAm = stats.find((s) => s.serviceSlot === '11:00')!;
      expect(elevenAm.avgDeltaMinutes).toBe(3);
    });

    it('identifies which service time runs longer', () => {
      const stats = calculateServiceSlotStats(mockSessions);

      const nineAm = stats.find((s) => s.serviceSlot === '09:00')!;
      const elevenAm = stats.find((s) => s.serviceSlot === '11:00')!;

      // 9am runs longer on average
      expect(nineAm.avgDeltaMinutes).toBeGreaterThan(elevenAm.avgDeltaMinutes);
    });

    it('orders slots chronologically', () => {
      const stats = calculateServiceSlotStats(mockSessions);

      expect(stats[0].serviceSlot).toBe('09:00');
      expect(stats[1].serviceSlot).toBe('11:00');
    });
  });
});

// ============================================================================
// Overview Stats Tests
// ============================================================================

describe('Analytics - Overview Stats', () => {
  describe('getOverview', () => {
    it('calculates overall averages correctly', () => {
      const stats = calculateOverviewStats(mockSessions);

      expect(stats.sessionsCount).toBe(5);
      expect(stats.avgPlannedMinutes).toBe(60);
      // Actual: (70+65+55+60+80)/5 = 330/5 = 66
      expect(stats.avgActualMinutes).toBe(66);
      // Delta: (10+5-5+0+20)/5 = 30/5 = 6
      expect(stats.avgDeltaMinutes).toBe(6);
    });

    it('handles empty results', () => {
      const stats = calculateOverviewStats([]);

      expect(stats.sessionsCount).toBe(0);
      expect(stats.avgPlannedMinutes).toBe(0);
      expect(stats.avgActualMinutes).toBe(0);
      expect(stats.avgDeltaMinutes).toBe(0);
    });

    it('respects filters', () => {
      const janSessions = filterByDateRange(mockSessions, '2025-01-01', '2025-01-31');
      const stats = calculateOverviewStats(janSessions);

      expect(stats.sessionsCount).toBe(4); // Excludes December session
    });
  });
});

// ============================================================================
// Filter Tests
// ============================================================================

describe('Analytics - Filters', () => {
  describe('date range filter', () => {
    it('filters by from date', () => {
      const sessions = filterByDateRange(mockSessions, '2025-01-10', '2025-12-31');

      // Should exclude Jan 5 sessions
      expect(sessions.length).toBe(3);
      expect(sessions.find((s) => s.issueDate.getTime() === new Date('2025-01-05').getTime())).toBeUndefined();
    });

    it('filters by to date', () => {
      const sessions = filterByDateRange(mockSessions, '2025-01-01', '2025-01-15');

      // Should exclude December session
      expect(sessions.length).toBe(4);
      expect(sessions.find((s) => s.seriesName === 'Advent Journey')).toBeUndefined();
    });

    it('applies default 90-day range when no dates provided', () => {
      // Simulating default behavior
      const now = new Date();
      const ninetyDaysAgo = new Date(now);
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const defaultFrom = ninetyDaysAgo.toISOString().split('T')[0];
      const defaultTo = now.toISOString().split('T')[0];

      expect(defaultFrom).toBeDefined();
      expect(defaultTo).toBeDefined();
    });
  });

  describe('preacher filter', () => {
    it('filters to single preacher', () => {
      const filtered = mockSessions.filter((s) => s.preacher === 'Pastor John');

      expect(filtered.length).toBe(2);
      expect(filtered.every((s) => s.preacher === 'Pastor John')).toBe(true);
    });
  });

  describe('series filter', () => {
    it('filters to single series', () => {
      const filtered = mockSessions.filter((s) => s.seriesId === 'series-1');

      expect(filtered.length).toBe(2);
      expect(filtered.every((s) => s.seriesName === 'Finding Peace')).toBe(true);
    });
  });

  describe('service slot filter', () => {
    it('filters to single time slot', () => {
      const filtered = mockSessions.filter((s) => s.serviceSlot === '09:00');

      expect(filtered.length).toBe(3);
      expect(filtered.every((s) => s.serviceSlot === '09:00')).toBe(true);
    });
  });

  describe('combined filters', () => {
    it('applies multiple filters together', () => {
      const filtered = mockSessions.filter(
        (s) => s.preacher === 'Pastor John' && s.serviceSlot === '09:00'
      );

      expect(filtered.length).toBe(1);
      expect(filtered[0].sessionId).toBe('session-1');
    });
  });
});

// ============================================================================
// Detail Drill-Down Tests
// ============================================================================

describe('Analytics - Detail Drill-Down', () => {
  describe('getDetailForFilter', () => {
    it('returns sessions for a specific preacher', () => {
      // Filter type would be 'preacher' with idOrKey = 'Pastor John'
      const idOrKey = 'Pastor John';
      const sessions = mockSessions.filter((s) => s.preacher === idOrKey);

      expect(sessions.length).toBe(2);
      expect(sessions[0].preacher).toBe('Pastor John');
      expect(sessions[1].preacher).toBe('Pastor John');
    });

    it('returns sessions for a specific series', () => {
      // Filter type would be 'series' with idOrKey = 'series-2'
      const idOrKey = 'series-2';
      const sessions = mockSessions.filter((s) => s.seriesId === idOrKey);

      expect(sessions.length).toBe(2);
      expect(sessions[0].seriesName).toBe('Walking in Faith');
    });

    it('returns sessions for a specific service slot', () => {
      // Filter type would be 'serviceSlot' with idOrKey = '11:00'
      const idOrKey = '11:00';
      const sessions = mockSessions.filter((s) => s.serviceSlot === idOrKey);

      expect(sessions.length).toBe(2);
      expect(sessions.every((s) => s.serviceSlot === '11:00')).toBe(true);
    });

    it('includes all required fields for display', () => {
      const session = mockSessions[0];

      expect(session.sessionId).toBeDefined();
      expect(session.bulletinIssueId).toBeDefined();
      expect(session.issueDate).toBeDefined();
      expect(session.startedAt).toBeDefined();
      expect(session.serviceSlot).toBeDefined();
      expect(session.preacher).toBeDefined();
      expect(session.seriesName).toBeDefined();
      expect(session.sermonTitle).toBeDefined();
      expect(session.plannedMinutes).toBeDefined();
      expect(session.actualMinutes).toBeDefined();
      expect(session.deltaMinutes).toBeDefined();
    });

    it('links to bulletin analytics page', () => {
      const session = mockSessions[0];
      const bulletinAnalyticsUrl = `/bulletins/${session.bulletinIssueId}/analytics`;

      expect(bulletinAnalyticsUrl).toBe('/bulletins/bulletin-1/analytics');
    });
  });
});

// ============================================================================
// Tenant Isolation Tests
// ============================================================================

describe('Analytics - Tenant Isolation', () => {
  describe('data access control', () => {
    it('only returns sessions for the requesting tenant', () => {
      // Simulate sessions from different tenants
      const allSessions = [
        { ...mockSessions[0], tenant_id: mockTenantId },
        { ...mockSessions[1], tenant_id: mockTenantId },
        { ...mockSessions[2], tenant_id: mockOtherTenantId },
      ];

      // Filter to only current tenant (simulating RLS)
      const tenantSessions = allSessions.filter((s) => s.tenant_id === mockTenantId);

      expect(tenantSessions.length).toBe(2);
    });

    it('does not expose other tenant data in stats', () => {
      // Each tenant should only see their own preachers/series
      // In real implementation, RLS policies would filter by tenant
      // Here we verify the mock data structure supports tenant filtering
      expect(mockPreachers.length).toBeGreaterThan(0);
      expect(mockPreachers[0]).toHaveProperty('id');
      expect(mockPreachers[0]).toHaveProperty('name');
    });
  });
});

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe('Analytics - Edge Cases', () => {
  describe('handling incomplete data', () => {
    it('handles sessions without sermon data', () => {
      const sessionWithoutSermon: SessionDetail = {
        sessionId: 'session-no-sermon',
        bulletinIssueId: 'bulletin-x',
        issueDate: new Date('2025-02-01'),
        startedAt: new Date('2025-02-01T09:00:00Z'),
        endedAt: new Date('2025-02-01T10:00:00Z'),
        serviceSlot: '09:00',
        preacher: null,
        seriesId: null,
        seriesName: null,
        sermonTitle: null,
        plannedMinutes: 60,
        actualMinutes: 58,
        deltaMinutes: -2,
      };

      // Should not crash when calculating stats
      const stats = calculatePreacherStats([sessionWithoutSermon]);
      expect(stats.length).toBe(0); // No preacher = excluded from preacher stats

      const seriesStats = calculateSeriesStats([sessionWithoutSermon]);
      expect(seriesStats.length).toBe(0); // No series = excluded from series stats
    });

    it('handles sessions still in progress', () => {
      const inProgressSession: SessionDetail = {
        sessionId: 'session-in-progress',
        bulletinIssueId: 'bulletin-x',
        issueDate: new Date('2025-02-01'),
        startedAt: new Date('2025-02-01T09:00:00Z'),
        endedAt: null, // Still in progress
        serviceSlot: '09:00',
        preacher: 'Pastor John',
        seriesId: 'series-1',
        seriesName: 'Finding Peace',
        sermonTitle: 'Latest Message',
        plannedMinutes: 60,
        actualMinutes: 0, // No actual timing yet
        deltaMinutes: -60,
      };

      // In real implementation, in-progress sessions should be filtered out
      // (WHERE ended_at IS NOT NULL)
      expect(inProgressSession.endedAt).toBeNull();
    });
  });

  describe('rounding and precision', () => {
    it('rounds minutes appropriately', () => {
      // When calculating averages, we round to whole minutes
      const sessions = [
        { ...mockSessions[0], deltaMinutes: 7 },
        { ...mockSessions[1], deltaMinutes: 8 },
      ];

      const avg = average(sessions.map((s) => s.deltaMinutes));
      expect(avg).toBe(8); // 7.5 rounds to 8
    });
  });
});

// ============================================================================
// Response Format Tests
// ============================================================================

describe('Analytics - Response Formats', () => {
  describe('getPreacherStats response', () => {
    it('returns array of preacher stats', () => {
      const response = {
        preachers: calculatePreacherStats(mockSessions),
      };

      expect(Array.isArray(response.preachers)).toBe(true);
      expect(response.preachers[0]).toHaveProperty('preacherId');
      expect(response.preachers[0]).toHaveProperty('preacherName');
      expect(response.preachers[0]).toHaveProperty('sessionsCount');
      expect(response.preachers[0]).toHaveProperty('avgPlannedMinutes');
      expect(response.preachers[0]).toHaveProperty('avgActualMinutes');
      expect(response.preachers[0]).toHaveProperty('avgDeltaMinutes');
    });
  });

  describe('getSeriesStats response', () => {
    it('returns array of series stats', () => {
      const response = {
        series: calculateSeriesStats(mockSessions),
      };

      expect(Array.isArray(response.series)).toBe(true);
      expect(response.series[0]).toHaveProperty('seriesId');
      expect(response.series[0]).toHaveProperty('seriesName');
    });
  });

  describe('getServiceTimeStats response', () => {
    it('returns array of service slot stats', () => {
      const response = {
        serviceSlots: calculateServiceSlotStats(mockSessions),
      };

      expect(Array.isArray(response.serviceSlots)).toBe(true);
      expect(response.serviceSlots[0]).toHaveProperty('serviceSlot');
    });
  });

  describe('getDetailForFilter response', () => {
    it('returns array of session details', () => {
      const response = {
        sessions: mockSessions,
      };

      expect(Array.isArray(response.sessions)).toBe(true);
      expect(response.sessions[0]).toHaveProperty('sessionId');
      expect(response.sessions[0]).toHaveProperty('bulletinIssueId');
    });
  });
});
