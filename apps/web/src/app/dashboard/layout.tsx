'use client';

/**
 * Dashboard Layout
 *
 * Wraps dashboard pages with the Church App Shell.
 * The shell provides consistent TopBar and SidebarRail navigation.
 */

import { ChurchAppShell } from '@/components/layout/church-shell';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ChurchAppShell>{children}</ChurchAppShell>;
}
