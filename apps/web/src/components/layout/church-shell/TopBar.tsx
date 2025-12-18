'use client';

/**
 * TopBar - Teal Header Navigation Bar
 *
 * Contains:
 * - Area name (current page label)
 * - Global search input
 * - View mode toggle (Admin View)
 * - User avatar with dropdown (including density toggle)
 */

import { useState } from 'react';
import { Search, Menu, LogOut, Settings, User, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDensityPreference, type DensityMode } from '@/hooks/useDensityPreference';

export interface TopBarProps {
  /** Current area/page name displayed on the left */
  areaName: string;
  /** User info for avatar */
  user: {
    name: string | null;
    role: string | null;
    initials?: string;
  } | null;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Callback when hamburger menu is clicked (mobile) */
  onMenuClick?: () => void;
  /** Callback when sign out is clicked */
  onSignOut?: () => void;
  /** Whether mobile menu is open */
  isMobileMenuOpen?: boolean;
}

export function TopBar({
  areaName,
  user,
  isAuthenticated,
  onMenuClick,
  onSignOut,
  isMobileMenuOpen,
}: TopBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdminView, setIsAdminView] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { density, setDensity, isHydrated } = useDensityPreference();

  // Generate initials from user name
  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const initials = user?.initials || getInitials(user?.name ?? null);

  const handleDensityChange = (mode: DensityMode) => {
    setDensity(mode);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-teal-600 shadow-md">
      <div className="flex h-full items-center justify-between px-4">
        {/* Left: Mobile menu + Area name */}
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            onClick={onMenuClick}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-teal-600 md:hidden"
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Area name */}
          <h1 className="text-lg font-semibold text-white">{areaName}</h1>
        </div>

        {/* Center-right: Search + Toggle + Avatar */}
        <div className="flex items-center gap-4">
          {/* Search input (hidden on small mobile) */}
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-200" />
            <input
              type="text"
              placeholder="Search by name, mobile, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-64 rounded-lg bg-teal-700 pl-9 pr-4 text-sm text-white placeholder-teal-200 focus:outline-none focus:ring-2 focus:ring-white lg:w-80"
            />
          </div>

          {/* Admin View Toggle */}
          <button
            onClick={() => setIsAdminView(!isAdminView)}
            className={cn(
              'hidden h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors sm:flex',
              isAdminView
                ? 'bg-white text-teal-700'
                : 'bg-teal-700 text-white hover:bg-teal-800'
            )}
          >
            <span>Admin View</span>
          </button>

          {/* User Avatar */}
          {isAuthenticated && user && (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-700 text-sm font-semibold text-white hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-teal-600"
                aria-label="User menu"
              >
                {initials}
              </button>

              {/* User dropdown menu */}
              {isUserMenuOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsUserMenuOpen(false)}
                  />
                  {/* Menu */}
                  <div className="absolute right-0 top-12 z-50 w-64 rounded-lg bg-white py-2 shadow-lg ring-1 ring-black ring-opacity-5">
                    <div className="border-b border-gray-100 px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">
                        {user.name || 'User'}
                      </p>
                      <p className="text-xs capitalize text-gray-500">
                        {user.role || 'Member'}
                      </p>
                    </div>

                    {/* Density toggle section */}
                    {isHydrated && (
                      <div className="border-b border-gray-100 px-4 py-3">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                          Interface Size
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDensityChange('standard')}
                            className={cn(
                              'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                              density === 'standard'
                                ? 'bg-teal-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            )}
                          >
                            <ZoomOut className="h-4 w-4" />
                            <span>Standard</span>
                          </button>
                          <button
                            onClick={() => handleDensityChange('elder')}
                            className={cn(
                              'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                              density === 'elder'
                                ? 'bg-teal-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            )}
                          >
                            <ZoomIn className="h-4 w-4" />
                            <span>Elder</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          // Navigate to profile - would use router in real implementation
                          console.log('TODO: Navigate to profile');
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <User className="h-4 w-4 text-gray-500" />
                        <span>Your Profile</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          // Navigate to settings
                          console.log('TODO: Navigate to settings');
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Settings className="h-4 w-4 text-gray-500" />
                        <span>Settings</span>
                      </button>
                    </div>
                    <div className="border-t border-gray-100 py-1">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onSignOut?.();
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <LogOut className="h-4 w-4 text-gray-500" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
