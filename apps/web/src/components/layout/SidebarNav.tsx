'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { LogOut, Menu, X } from 'lucide-react';
import { useAuth, useRole } from '@/hooks/useAuth';
import {
  NAV_ITEMS,
  KIOSK_NAV_ITEMS,
  type RoleContext,
  type UserRole,
} from '@/config/navigation';
import { cn } from '@/lib/utils';

/**
 * SidebarNav Component
 *
 * Left-hand vertical navigation with:
 * - Logo/brand at top
 * - Navigation items with icons
 * - Active state styling based on pathname
 * - Role-based visibility
 * - User info and sign out at bottom
 * - Mobile hamburger menu toggle
 */
export function SidebarNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();
  const { isAdmin, isEditor, isSubmitter, isViewer, isKiosk } = useRole();

  // Close mobile menu when pathname changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  /**
   * Check if a nav item is active.
   * Exact match for dashboard, prefix match for other routes.
   */
  const isActive = (href: string): boolean => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  // Shared navigation content (used in both desktop and mobile)
  const NavContent = () => (
    <>
      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 flex-shrink-0',
                      active ? 'text-primary-600' : 'text-gray-500'
                    )}
                  />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Info & Sign Out */}
      {isAuthenticated && user && (
        <div className="border-t border-gray-200 p-4">
          <div className="mb-3">
            <p className="text-sm font-semibold text-gray-900">
              {user.name || 'User'}
            </p>
            <p className="text-xs capitalize text-gray-500">
              {user.role || 'Member'}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            <LogOut className="h-4 w-4 text-gray-500" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-lg font-bold text-primary-600">Elder-First</span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="rounded-lg p-2 text-gray-700 hover:bg-gray-100"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar (slide-in drawer) */}
      <aside
        className={cn(
          'fixed left-0 top-14 z-40 flex h-[calc(100vh-3.5rem)] w-64 flex-col border-r border-gray-200 bg-white transition-transform md:hidden',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <NavContent />
      </aside>

      {/* Desktop Sidebar (always visible) */}
      <aside className="hidden h-screen w-64 flex-col border-r border-gray-200 bg-white md:flex">
        {/* Logo/Brand */}
        <div className="flex h-16 items-center border-b border-gray-200 px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary-600">Elder-First</span>
          </Link>
        </div>
        <NavContent />
      </aside>
    </>
  );
}
