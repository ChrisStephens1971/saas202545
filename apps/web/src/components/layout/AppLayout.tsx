'use client';

/**
 * AppLayout - Root Layout Wrapper
 *
 * Routes to either:
 * - Public pages: No shell (login, landing)
 * - Church shell pages: No legacy shell (they use ChurchAppShell via layout.tsx)
 * - Authenticated pages: AppShell (uses UiMode to pick Modern or Accessible)
 *
 * The AppShell handles all navigation chrome; this component just decides
 * whether to show it based on the current route.
 */

import { usePathname } from 'next/navigation';
import { AppShell } from './appshell';

/**
 * Routes that use the new ChurchAppShell (icon-only SidebarRail).
 * These routes have their own layout.tsx that wraps content in ChurchAppShell,
 * so we skip the legacy AppShell to avoid duplicate sidebars.
 *
 * To add a new church shell route:
 * 1. Add the route prefix to this array
 * 2. Create a layout.tsx that wraps with ChurchAppShell
 * 3. Add to CHURCH_NAV_ITEMS in SidebarRail.tsx if it should appear in nav
 *
 * See: docs/ui/CHURCH-UI-DIRECTION.md
 */
const CHURCH_SHELL_ROUTES = [
  '/dashboard',
  '/sunday-planner',
  '/bulletins',
  '/sermons',
  '/people',
  '/settings',
];

/**
 * Check if a pathname starts with any of the church shell route prefixes
 */
function isChurchShellRoute(pathname: string): boolean {
  return CHURCH_SHELL_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Don't show shell on public pages
  const publicPages = ['/', '/login'];
  const isPublicPage = publicPages.includes(pathname);

  // For public pages, render children directly (no nav)
  if (isPublicPage) {
    return <>{children}</>;
  }

  // Church shell routes use ChurchAppShell directly in their page.tsx,
  // so we skip the legacy AppShell to avoid duplicate sidebars.
  if (isChurchShellRoute(pathname)) {
    return <>{children}</>;
  }

  // For other authenticated pages, render the UiMode-aware AppShell
  return <AppShell>{children}</AppShell>;
}
