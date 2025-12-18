'use client';

/**
 * ChurchAppShell - Main App Shell for Church Platform
 *
 * Combines:
 * - TopBar (teal header with search, avatar)
 * - SidebarRail (icon navigation with pin/expand)
 * - Content area (light background, centered column)
 *
 * This is the canonical shell for the Church Platform UI direction.
 */

import { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useAuth } from '@/hooks/useAuth';
import { TopBar } from './TopBar';
import { SidebarRail } from './SidebarRail';

interface ChurchAppShellProps {
  children: React.ReactNode;
}

/**
 * Get area name from pathname
 */
function getAreaName(pathname: string): string {
  // Map routes to area names
  const areaNames: Record<string, string> = {
    '/dashboard': 'Home',
    '/sunday-planner': 'Sunday Planner',
    '/bulletins': 'Bulletins',
    '/sermons': 'Sermons',
    '/people': 'People',
    '/events': 'Events',
    '/donations': 'Giving',
    '/settings': 'Settings',
    '/help': 'Help',
    '/prayers': 'Prayers',
    '/communications': 'Communications',
    '/thank-yous': 'Thank Yous',
    '/attendance': 'Attendance',
    '/analytics': 'Analytics',
    '/groups': 'Groups',
    '/forms': 'Forms',
    '/announcements': 'Announcements',
    '/songs': 'Songs',
  };

  // Check exact match first
  if (areaNames[pathname]) {
    return areaNames[pathname];
  }

  // Check prefix match (for nested routes like /sermons/123)
  const basePath = '/' + pathname.split('/')[1];
  if (areaNames[basePath]) {
    return areaNames[basePath];
  }

  return 'Elder-First';
}

export function ChurchAppShell({ children }: ChurchAppShellProps) {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when pathname changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Sign out handler
  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  // Get area name from pathname
  const areaName = useMemo(() => getAreaName(pathname), [pathname]);

  // Prepare user info for TopBar
  const topBarUser = user
    ? {
        name: user.name || null,
        role: user.role || null,
      }
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Teal Top Bar */}
      <TopBar
        areaName={areaName}
        user={topBarUser}
        isAuthenticated={isAuthenticated}
        onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        onSignOut={handleSignOut}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      {/* Sidebar Rail (manages its own expand/pin state) */}
      <SidebarRail
        pathname={pathname}
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <main
        className={`
          min-h-[calc(100vh-3.5rem)]
          pt-14
          transition-all duration-300
          md:pl-[72px]
        `}
      >
        {children}
      </main>
    </div>
  );
}
