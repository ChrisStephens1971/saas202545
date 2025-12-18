'use client';

/**
 * BulletinsContainer - Data Fetching + View Selection
 *
 * This container component:
 * 1. Manages filter state
 * 2. Fetches bulletin data using tRPC
 * 3. Transforms API responses into a view model
 * 4. Uses UiMode to select the appropriate view
 *
 * Data fetching and business logic are SHARED.
 * Only the presentational view differs based on UiMode.
 *
 * Pattern: Container + Dual Views
 * See: docs/ui/ACCESSIBLE-UI-CURRENT-STATE.md (Dual-View Eligibility Rules)
 */

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { useUiMode } from '@/ui/UiModeContext';
import { BulletinsModernView } from './BulletinsModernView';
import { BulletinsAccessibleView } from './BulletinsAccessibleView';
import type { BulletinsViewModel, BulletinsViewActions, BulletinFilter, BulletinListItem } from './types';

export function BulletinsContainer() {
  const { mode } = useUiMode();
  const [filter, setFilter] = useState<BulletinFilter>('active');

  // ============================================================================
  // Data Fetching - shared across both views
  // ============================================================================

  const { data, isLoading, error } = trpc.bulletins.list.useQuery(
    {
      filter,
      limit: 50,
      offset: 0,
    },
    {
      staleTime: 30000, // 30s stale time to reduce unnecessary refetches
    }
  );

  // ============================================================================
  // Transform to View Model
  // ============================================================================

  const bulletins: BulletinListItem[] = (data?.bulletins || []).map((b) => ({
    id: b.id,
    serviceDate: b.serviceDate,
    status: b.status as BulletinListItem['status'],
    createdAt: b.createdAt,
    deletedAt: b.deletedAt,
  }));

  const viewModel: BulletinsViewModel = {
    bulletins,
    total: data?.total || 0,
    filter,
    isLoading,
    error: error?.message || null,
  };

  const actions: BulletinsViewActions = {
    onFilterChange: setFilter,
  };

  // ============================================================================
  // Render appropriate view based on UiMode
  // ============================================================================

  if (mode === 'accessible') {
    return <BulletinsAccessibleView viewModel={viewModel} actions={actions} />;
  }

  return <BulletinsModernView viewModel={viewModel} actions={actions} />;
}
