'use client';

/**
 * SidebarRail - Icon-Only Vertical Navigation Rail
 *
 * Features:
 * - Compact mode: 72px wide, icons only, tooltips on hover
 * - Expanded mode: ~200px wide, icons + labels (pinned)
 * - Pin button at bottom to toggle between modes
 * - Persists user preference to localStorage
 * - Mobile: slide-out drawer with icons + labels
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  CalendarRange,
  FileText,
  BookOpen,
  Users,
  Settings,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SIDEBAR_STORAGE_KEY = 'church-sidebar-expanded';

export interface SidebarNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface SidebarRailProps {
  /** Currently active pathname */
  pathname: string;
  /** Mobile drawer open state */
  isMobileOpen?: boolean;
  /** Close mobile drawer */
  onMobileClose?: () => void;
}

/**
 * Default navigation items for the Church Platform
 */
export const CHURCH_NAV_ITEMS: SidebarNavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/sunday-planner', label: 'Sunday Planner', icon: CalendarRange },
  { href: '/bulletins', label: 'Bulletins', icon: FileText },
  { href: '/sermons', label: 'Sermons', icon: BookOpen },
  { href: '/people', label: 'People', icon: Users },
];

export const CHURCH_NAV_BOTTOM: SidebarNavItem[] = [
  { href: '/settings', label: 'Settings', icon: Settings },
  // TODO: Re-enable when /help page is implemented
  // { href: '/help', label: 'Help', icon: HelpCircle },
];

/**
 * Check if a nav item is active based on pathname
 */
function isNavItemActive(href: string, pathname: string): boolean {
  if (href === '/dashboard') {
    return pathname === '/dashboard' || pathname === '/';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Single navigation icon with tooltip
 */
function NavIconButton({
  item,
  isActive,
  isExpanded,
  onClick,
}: {
  item: SidebarNavItem;
  isActive: boolean;
  isExpanded: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'group relative flex items-center rounded-xl transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2',
        isExpanded ? 'w-full gap-3 px-3 py-3' : 'h-12 w-12 justify-center',
        isActive
          ? 'bg-teal-600 text-white shadow-md'
          : 'text-gray-600 hover:bg-gray-100 hover:text-teal-600'
      )}
      aria-label={item.label}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon
        className={cn(
          'flex-shrink-0 transition-colors',
          isExpanded ? 'h-5 w-5' : 'h-6 w-6',
          isActive ? 'text-white' : 'text-gray-500 group-hover:text-teal-600'
        )}
      />

      {/* Label (shown when expanded) */}
      {isExpanded && (
        <span
          className={cn(
            'text-sm font-medium',
            isActive ? 'text-white' : 'text-gray-700'
          )}
        >
          {item.label}
        </span>
      )}

      {/* Tooltip (shown on hover when collapsed) */}
      {!isExpanded && (
        <div className="pointer-events-none absolute left-full ml-3 hidden whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 md:block">
          {item.label}
          {/* Tooltip arrow */}
          <div className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 bg-gray-900" />
        </div>
      )}
    </Link>
  );
}

export function SidebarRail({
  pathname,
  isMobileOpen = false,
  onMobileClose,
}: SidebarRailProps) {
  // Initialize from localStorage or default to collapsed
  const [isPinned, setIsPinned] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load preference from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored !== null) {
      setIsPinned(stored === 'true');
    }
    setIsHydrated(true);
  }, []);

  // Save preference to localStorage when changed
  const handlePinToggle = () => {
    const newState = !isPinned;
    setIsPinned(newState);
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(newState));
  };

  // Desktop sidebar content
  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => {
    const showExpanded = isPinned || isMobile;

    return (
      <div className="flex h-full flex-col">
        {/* Main navigation items */}
        <nav className="flex-1 px-3 py-4">
          <ul className={cn('space-y-2', !showExpanded && 'items-center')}>
            {CHURCH_NAV_ITEMS.map((item) => (
              <li key={item.href} className={cn(!showExpanded && 'flex justify-center')}>
                <NavIconButton
                  item={item}
                  isActive={isNavItemActive(item.href, pathname)}
                  isExpanded={showExpanded}
                  onClick={isMobile ? onMobileClose : undefined}
                />
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom navigation (Settings, Help) */}
        <div className="border-t border-gray-200 px-3 py-4">
          <ul className={cn('space-y-2', !showExpanded && 'items-center')}>
            {CHURCH_NAV_BOTTOM.map((item) => (
              <li key={item.href} className={cn(!showExpanded && 'flex justify-center')}>
                <NavIconButton
                  item={item}
                  isActive={isNavItemActive(item.href, pathname)}
                  isExpanded={showExpanded}
                  onClick={isMobile ? onMobileClose : undefined}
                />
              </li>
            ))}
          </ul>

          {/* Pin/Expand toggle (desktop only) */}
          {!isMobile && (
            <button
              onClick={handlePinToggle}
              className={cn(
                'mt-4 flex items-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600',
                showExpanded ? 'w-full gap-3 px-3 py-2' : 'mx-auto h-10 w-10 justify-center'
              )}
              aria-label={isPinned ? 'Collapse sidebar' : 'Expand sidebar'}
              title={isPinned ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {isPinned ? (
                <>
                  <PanelLeftClose className="h-5 w-5" />
                  {showExpanded && <span className="text-sm">Collapse</span>}
                </>
              ) : (
                <PanelLeftOpen className="h-5 w-5" />
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  // Prevent flash of wrong state during hydration
  if (!isHydrated) {
    return (
      <aside className="fixed left-0 top-14 z-30 hidden h-[calc(100vh-3.5rem)] w-[72px] flex-col border-r border-gray-200 bg-white md:flex">
        {/* Placeholder during hydration */}
      </aside>
    );
  }

  return (
    <>
      {/* Desktop Sidebar Rail */}
      <aside
        className={cn(
          'fixed left-0 top-14 z-30 hidden h-[calc(100vh-3.5rem)] flex-col border-r border-gray-200 bg-white transition-all duration-300 md:flex',
          isPinned ? 'w-52' : 'w-[72px]'
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={cn(
          'fixed left-0 top-14 z-50 flex h-[calc(100vh-3.5rem)] w-72 flex-col border-r border-gray-200 bg-white transition-transform duration-300 md:hidden',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Close button */}
        <div className="flex h-14 items-center justify-between border-b border-gray-200 px-4">
          <span className="text-lg font-semibold text-gray-900">Menu</span>
          <button
            onClick={onMobileClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close menu"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <SidebarContent isMobile />
      </aside>
    </>
  );
}
