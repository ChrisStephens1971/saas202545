'use client';

/**
 * Settings Layout
 *
 * Wraps settings pages with the Church App Shell.
 * The shell provides consistent TopBar and SidebarRail navigation.
 */

import { ChurchAppShell } from '@/components/layout/church-shell';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ChurchAppShell>{children}</ChurchAppShell>;
}
