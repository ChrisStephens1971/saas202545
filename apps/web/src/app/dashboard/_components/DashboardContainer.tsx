'use client';

/**
 * DashboardContainer - Data Fetching + View Selection
 *
 * This container component:
 * 1. Fetches all dashboard data using tRPC
 * 2. Transforms API responses into a view model
 * 3. Uses UiMode to select the appropriate view
 *
 * Data fetching and business logic are SHARED.
 * Only the presentational view differs based on UiMode.
 *
 * Pattern: Container + Dual Views
 * See: docs/ui/ACCESSIBLE-MODE-ARCHITECTURE.md
 */

import { useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';
import { useUiMode } from '@/ui/UiModeContext';
import { DashboardModernView } from './DashboardModernView';
import { DashboardAccessibleView } from './DashboardAccessibleView';
import type { DashboardViewModel, DashboardBulletin, DashboardEvent, DashboardPerson, DashboardAnnouncement } from './types';

export function DashboardContainer() {
  const { mode } = useUiMode();

  // ============================================================================
  // Data Fetching - shared across both views
  // ============================================================================

  // Memoize date range to prevent unstable query keys causing infinite refetches
  const eventDateRange = useMemo(() => {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    return {
      startDate: startDate.toISOString().split('T')[0], // Use date-only for stable key
      endDate: endDate.toISOString().split('T')[0],
    };
  }, []); // Empty deps - only compute once per mount

  const { data: bulletinsData, isLoading: bulletinsLoading } = trpc.bulletins.list.useQuery(
    { limit: 5 },
    { staleTime: 30000 } // 30s stale time to reduce refetches
  );
  const { data: peopleData, isLoading: peopleLoading } = trpc.people.list.useQuery(
    { limit: 5 },
    { staleTime: 30000 }
  );
  const { data: eventsData, isLoading: eventsLoading } = trpc.events.list.useQuery(
    {
      startDate: eventDateRange.startDate,
      endDate: eventDateRange.endDate,
      limit: 5
    },
    { staleTime: 30000 }
  );
  const { data: announcementsData, isLoading: announcementsLoading } = trpc.announcements.listActive.useQuery(
    undefined,
    { staleTime: 30000 }
  );

  // ============================================================================
  // Transform to View Model
  // ============================================================================

  const isLoading = bulletinsLoading || peopleLoading || eventsLoading || announcementsLoading;

  // Transform bulletins
  const bulletins: DashboardBulletin[] = (bulletinsData?.bulletins || []).map((b) => ({
    id: b.id,
    serviceDate: b.serviceDate,
    status: b.status,
  }));

  // Transform events
  const events: DashboardEvent[] = (eventsData?.events || []).map((e) => ({
    id: e.id,
    title: e.title,
    startAt: e.startAt,
    allDay: e.allDay,
  }));

  // Transform people
  const people: DashboardPerson[] = (peopleData?.people || []).map((p) => ({
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    membershipStatus: p.membershipStatus,
  }));

  // Transform announcements
  const announcements: DashboardAnnouncement[] = (announcementsData?.announcements || []).map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    priority: a.priority as 'Normal' | 'High' | 'Urgent',
  }));

  // Build view model
  const viewModel: DashboardViewModel = {
    bulletins,
    bulletinTotal: bulletinsData?.total || 0,
    events,
    eventTotal: eventsData?.events?.length || 0,
    people,
    peopleTotal: peopleData?.total || 0,
    announcements,
    isLoading,
  };

  // ============================================================================
  // Render appropriate view based on UiMode
  // ============================================================================

  if (mode === 'accessible') {
    return <DashboardAccessibleView viewModel={viewModel} />;
  }

  return <DashboardModernView viewModel={viewModel} />;
}
