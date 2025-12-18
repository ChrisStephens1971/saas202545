/**
 * AppShell Types
 *
 * Shared types for the dual AppShell architecture.
 * Both Modern and Accessible shells use these same props.
 */

import type { ReactNode } from 'react';
import type { NavItem, RoleContext } from '@/config/navigation';

/**
 * User info passed to AppShell for display purposes.
 */
export interface AppShellUser {
  name: string | null;
  role: string | null;
}

/**
 * Common props for all AppShell variants.
 * Both AppShellModern and AppShellAccessible accept these same props.
 */
export interface AppShellProps {
  /** Filtered nav items appropriate for the current user's role */
  navItems: NavItem[];
  /** Current authenticated user info */
  user: AppShellUser | null;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Role context for additional checks */
  roleContext: RoleContext;
  /** Current pathname for active state */
  pathname: string;
  /** Sign out handler */
  onSignOut: () => void;
  /** Page content to render in main area */
  children: ReactNode;
}

/**
 * Check if a nav item is active based on pathname.
 * Exact match for dashboard, prefix match for other routes.
 */
export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === '/dashboard') {
    return pathname === '/dashboard';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
