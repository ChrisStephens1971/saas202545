'use client';

/**
 * Bulletins Layout
 *
 * Wraps bulletins pages with the Church App Shell.
 * The shell provides consistent TopBar and SidebarRail navigation.
 *
 * NOTE: This replaces the conditional CarbonShellLayout experiment.
 * The Carbon shell experiment is deprecated in favor of ChurchAppShell.
 */

import { ChurchAppShell } from '@/components/layout/church-shell';

export default function BulletinsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ChurchAppShell>{children}</ChurchAppShell>;
}
