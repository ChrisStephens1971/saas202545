'use client';

/**
 * AppShellAccessible - Elder-Friendly Layout Shell
 *
 * The "accessible" variant of the app shell designed for older adults with:
 * - Always-visible navigation (no hamburger-only menu on tablet/mobile)
 * - Larger touch targets using CSS variable min-h-touch (48px+)
 * - Clear labels on all nav items (no icon-only navigation)
 * - Simpler, more linear layout with better visual hierarchy
 * - High contrast text and clear section boundaries
 *
 * Key differences from Modern:
 * - Desktop: Wider sidebar with larger text and icons
 * - Tablet: Always-visible horizontal nav bar instead of hamburger
 * - Mobile: Bottom tab bar for core nav + expandable drawer for more options
 *
 * Both UiModes remain P15-compliant; this is simply more accommodating.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LogOut, Settings, MoreHorizontal, X, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AppShellProps } from './types';
import { isNavItemActive } from './types';

export function AppShellAccessible({
  navItems,
  user,
  isAuthenticated,
  pathname,
  onSignOut,
  children,
}: AppShellProps) {
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // Close more menu when pathname changes
  useEffect(() => {
    setMoreMenuOpen(false);
  }, [pathname]);

  // Split nav items: first 4 go in primary nav, rest in "More" menu
  const primaryNavItems = navItems.slice(0, 4);
  const secondaryNavItems = navItems.slice(4);
  const hasSecondaryNav = secondaryNavItems.length > 0;

  // Desktop sidebar content
  const DesktopNavContent = () => (
    <>
      {/* Navigation Items - larger touch targets */}
      <nav className="flex-1 overflow-y-auto px-4 py-6">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const active = isNavItemActive(item.href, pathname);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-4 rounded-xl px-4 py-3 min-h-touch font-medium transition-colors',
                    'text-base', // Uses CSS variable: 18px in accessible mode
                    active
                      ? 'bg-primary-100 text-primary-800 border-2 border-primary-300'
                      : 'text-gray-800 hover:bg-gray-100 hover:text-gray-900 border-2 border-transparent'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-6 w-6 flex-shrink-0',
                      active ? 'text-primary-700' : 'text-gray-600'
                    )}
                  />
                  <span className="font-semibold">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Settings Link - prominent in accessible mode */}
      <div className="px-4 pb-2">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-4 rounded-xl px-4 py-3 min-h-touch font-medium transition-colors',
            'text-base',
            pathname.startsWith('/settings')
              ? 'bg-gray-200 text-gray-900'
              : 'text-gray-700 hover:bg-gray-100'
          )}
        >
          <Settings className="h-6 w-6 text-gray-600" />
          <span className="font-semibold">Settings</span>
        </Link>
      </div>

      {/* User Info & Sign Out */}
      {isAuthenticated && user && (
        <div className="border-t-2 border-gray-200 p-4">
          <div className="mb-4 px-2">
            <p className="text-lg font-bold text-gray-900">
              {user.name || 'User'}
            </p>
            <p className="text-base capitalize text-gray-600">
              {user.role || 'Member'}
            </p>
          </div>
          <button
            onClick={onSignOut}
            className="flex w-full items-center gap-4 rounded-xl px-4 py-3 min-h-touch text-base font-semibold text-gray-700 transition-colors hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="h-6 w-6" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop Sidebar - wider with larger elements */}
      <aside className="hidden lg:flex h-screen w-72 flex-col border-r-2 border-gray-200 bg-white">
        {/* Logo/Brand - larger */}
        <div className="flex h-20 items-center border-b-2 border-gray-200 px-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Home className="h-8 w-8 text-primary-600" />
            <span className="text-2xl font-bold text-primary-600">Elder-First</span>
          </Link>
        </div>
        <DesktopNavContent />
      </aside>

      {/* Tablet Horizontal Nav Bar - always visible, no hamburger */}
      <div className="hidden md:flex lg:hidden fixed top-0 left-0 right-0 z-40 flex-col border-b-2 border-gray-200 bg-white">
        {/* Header row */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-gray-100">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Home className="h-7 w-7 text-primary-600" />
            <span className="text-xl font-bold text-primary-600">Elder-First</span>
          </Link>
          <div className="flex items-center gap-3">
            {isAuthenticated && user && (
              <span className="text-base font-semibold text-gray-700">
                {user.name}
              </span>
            )}
            <Link
              href="/settings"
              className="p-2 min-h-touch min-w-touch flex items-center justify-center rounded-lg hover:bg-gray-100"
              aria-label="Settings"
            >
              <Settings className="h-6 w-6 text-gray-600" />
            </Link>
          </div>
        </div>
        {/* Nav row - horizontal scrollable */}
        <nav className="overflow-x-auto px-2 py-2">
          <ul className="flex gap-1 min-w-max">
            {primaryNavItems.map((item) => {
              const active = isNavItemActive(item.href, pathname);
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-4 py-2 min-h-touch font-medium whitespace-nowrap transition-colors',
                      active
                        ? 'bg-primary-100 text-primary-800'
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
            {hasSecondaryNav && (
              <li>
                <button
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-4 py-2 min-h-touch font-medium whitespace-nowrap transition-colors',
                    moreMenuOpen
                      ? 'bg-gray-200 text-gray-900'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                  aria-expanded={moreMenuOpen}
                  aria-label="More navigation options"
                >
                  <MoreHorizontal className="h-5 w-5" />
                  <span>More</span>
                </button>
              </li>
            )}
          </ul>
        </nav>
        {/* More menu dropdown */}
        {moreMenuOpen && hasSecondaryNav && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setMoreMenuOpen(false)}
            />
            <div className="absolute top-full left-0 right-0 z-40 bg-white border-b-2 border-gray-200 shadow-lg p-4">
              <ul className="grid grid-cols-2 gap-2">
                {secondaryNavItems.map((item) => {
                  const active = isNavItemActive(item.href, pathname);
                  const Icon = item.icon;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMoreMenuOpen(false)}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-4 py-3 min-h-touch font-medium transition-colors',
                          active
                            ? 'bg-primary-100 text-primary-800'
                            : 'text-gray-700 hover:bg-gray-100'
                        )}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}
      </div>

      {/* Mobile Bottom Tab Bar - always visible core nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t-2 border-gray-200 bg-white safe-area-inset-bottom">
        <nav className="flex justify-around py-2">
          {primaryNavItems.slice(0, 4).map((item) => {
            const active = isNavItemActive(item.href, pathname);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 min-h-touch min-w-[64px] rounded-lg transition-colors',
                  active
                    ? 'text-primary-700 bg-primary-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                )}
              >
                <Icon className="h-6 w-6" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
          {/* More button for additional nav */}
          <button
            onClick={() => setMoreMenuOpen(!moreMenuOpen)}
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-2 min-h-touch min-w-[64px] rounded-lg transition-colors',
              moreMenuOpen
                ? 'text-gray-900 bg-gray-100'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            )}
            aria-expanded={moreMenuOpen}
            aria-label="More options"
          >
            <MoreHorizontal className="h-6 w-6" />
            <span className="text-xs font-medium">More</span>
          </button>
        </nav>
      </div>

      {/* Mobile More Menu (slide-up drawer) */}
      {moreMenuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-30 bg-black/50"
            onClick={() => setMoreMenuOpen(false)}
          />
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl border-t-2 border-gray-200 max-h-[70vh] overflow-y-auto safe-area-inset-bottom">
            {/* Drawer header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <span className="text-lg font-bold text-gray-900">More Options</span>
              <button
                onClick={() => setMoreMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 min-h-touch min-w-touch flex items-center justify-center"
                aria-label="Close menu"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            {/* Additional nav items */}
            <nav className="p-4">
              <ul className="space-y-2">
                {secondaryNavItems.map((item) => {
                  const active = isNavItemActive(item.href, pathname);
                  const Icon = item.icon;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMoreMenuOpen(false)}
                        className={cn(
                          'flex items-center gap-4 rounded-xl px-4 py-4 min-h-touch font-medium transition-colors',
                          active
                            ? 'bg-primary-100 text-primary-800'
                            : 'text-gray-700 hover:bg-gray-100'
                        )}
                      >
                        <Icon className="h-6 w-6 flex-shrink-0" />
                        <span className="text-lg">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
                {/* Settings in more menu for mobile */}
                <li>
                  <Link
                    href="/settings"
                    onClick={() => setMoreMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-4 rounded-xl px-4 py-4 min-h-touch font-medium transition-colors',
                      pathname.startsWith('/settings')
                        ? 'bg-gray-200 text-gray-900'
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    <Settings className="h-6 w-6 flex-shrink-0" />
                    <span className="text-lg">Settings</span>
                  </Link>
                </li>
              </ul>
            </nav>
            {/* User info and sign out */}
            {isAuthenticated && user && (
              <div className="border-t-2 border-gray-200 p-4">
                <div className="mb-3 px-2">
                  <p className="text-lg font-bold text-gray-900">
                    {user.name || 'User'}
                  </p>
                  <p className="text-base capitalize text-gray-600">
                    {user.role || 'Member'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setMoreMenuOpen(false);
                    onSignOut();
                  }}
                  className="flex w-full items-center gap-4 rounded-xl px-4 py-4 min-h-touch text-lg font-semibold text-red-600 transition-colors hover:bg-red-50"
                >
                  <LogOut className="h-6 w-6" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Mobile Header Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex h-16 items-center justify-between border-b-2 border-gray-200 bg-white px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Home className="h-7 w-7 text-primary-600" />
          <span className="text-xl font-bold text-primary-600">Elder-First</span>
        </Link>
        {isAuthenticated && user && (
          <span className="text-base font-semibold text-gray-700 truncate max-w-[120px]">
            {user.name}
          </span>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col w-full">
        {/* Tablet: account for top nav */}
        {/* Mobile: account for top header + bottom nav */}
        {/* Desktop: no extra padding needed */}
        <main className="flex-1 overflow-y-auto p-6 pt-20 pb-24 md:pt-36 md:pb-6 lg:pt-6 lg:pb-6">
          {children}
        </main>
      </div>
    </div>
  );
}
