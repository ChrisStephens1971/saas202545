'use client';

/**
 * Dashboard Page
 *
 * Main dashboard entry point that renders the UiMode-aware DashboardContainer.
 * The container handles data fetching and selects between Modern and Accessible views.
 *
 * Pattern: Container + Dual Views
 * See: docs/ui/ACCESSIBLE-MODE-ARCHITECTURE.md
 */

import { DashboardContainer } from './_components';

export default function DashboardPage() {
  return <DashboardContainer />;
}
