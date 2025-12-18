'use client';

/**
 * AppShell - UiMode-Aware Shell Switcher
 *
 * This component reads the current UiMode from context and renders
 * the appropriate shell variant:
 * - 'modern' → AppShellModern (compact, current behavior)
 * - 'accessible' → AppShellAccessible (elder-friendly, simplified)
 *
 * Business logic, data fetching, and routing remain SHARED.
 * Only the presentational shell differs.
 *
 * See: docs/ui/ACCESSIBLE-MODE-ARCHITECTURE.md
 */

import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useAuth, useRole } from '@/hooks/useAuth';
import { useUiMode } from '@/ui/UiModeContext';
import {
  NAV_ITEMS,
  KIOSK_NAV_ITEMS,
  type RoleContext,
  type UserRole,
} from '@/config/navigation';
import { AppShellModern } from './AppShellModern';
import { AppShellAccessible } from './AppShellAccessible';
import type { AppShellUser } from './types';

interface AppShellContainerProps {
  children: React.ReactNode;
}

/**
 * AppShell container that handles:
 * 1. Auth context (user, roles)
 * 2. UiMode selection
 * 3. Nav item filtering
 * 4. Shell variant rendering
 */
export function AppShell({ children }: AppShellContainerProps) {
  const pathname = usePathname();
  const { mode } = useUiMode();
  const { user, isAuthenticated } = useAuth();
  const { isAdmin, isEditor, isSubmitter, isViewer, isKiosk } = useRole();

  // Build role context for filtering nav items
  const roleContext: RoleContext = {
    isAuthenticated,
    role: (user?.role as UserRole) ?? null,
    isAdmin,
    isEditor,
    isSubmitter,
    isViewer,
    isKiosk,
  };

  // Get appropriate nav items based on role
  const navItems = isKiosk()
    ? KIOSK_NAV_ITEMS.filter((item) => item.isVisible(roleContext))
    : NAV_ITEMS.filter((item) => item.isVisible(roleContext));

  // Sign out handler
  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  // Prepare user info for shell
  const shellUser: AppShellUser | null = user
    ? {
        name: user.name || null,
        role: user.role || null,
      }
    : null;

  // Common props for both shell variants
  const shellProps = {
    navItems,
    user: shellUser,
    isAuthenticated,
    roleContext,
    pathname,
    onSignOut: handleSignOut,
    children,
  };

  // Render appropriate shell based on UiMode
  if (mode === 'accessible') {
    return <AppShellAccessible {...shellProps} />;
  }

  return <AppShellModern {...shellProps} />;
}
