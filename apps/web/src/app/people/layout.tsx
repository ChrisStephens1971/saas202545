'use client';

/**
 * People Layout
 *
 * Wraps people/directory pages with the Church App Shell.
 * The shell provides consistent TopBar and SidebarRail navigation.
 */

import { ChurchAppShell } from '@/components/layout/church-shell';

export default function PeopleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ChurchAppShell>{children}</ChurchAppShell>;
}
