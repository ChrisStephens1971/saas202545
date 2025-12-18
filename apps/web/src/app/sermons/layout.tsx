'use client';

/**
 * Sermons Layout
 *
 * Wraps sermons pages with the Church App Shell.
 * The shell provides consistent TopBar and SidebarRail navigation.
 */

import { ChurchAppShell } from '@/components/layout/church-shell';

export default function SermonsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ChurchAppShell>{children}</ChurchAppShell>;
}
