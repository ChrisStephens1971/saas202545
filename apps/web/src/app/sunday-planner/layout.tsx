'use client';

/**
 * Sunday Planner Layout
 *
 * Wraps sunday planner pages with the Church App Shell.
 * The shell provides consistent TopBar and SidebarRail navigation.
 */

import { ChurchAppShell } from '@/components/layout/church-shell';

export default function SundayPlannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ChurchAppShell>{children}</ChurchAppShell>;
}
