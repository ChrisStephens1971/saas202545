'use client';

/**
 * CarbonSidebar
 *
 * Left vertical navigation for the Carbon shell.
 * - Light gray background
 * - Nav items with active state (bold text + primary left border)
 */

import Link from 'next/link';
import {
  Calendar,
  FileText,
  Mic,
  Users,
  DollarSign,
  Settings,
} from 'lucide-react';
import {
  colors,
  borders,
  layout,
  getTypography,
} from './tokens';
import type { UiDensity } from '@/config/uiShellVariant';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { id: 'sunday', label: 'Sunday', href: '/dashboard', icon: Calendar },
  { id: 'bulletins', label: 'Bulletins', href: '/bulletins', icon: FileText },
  { id: 'sermons', label: 'Sermons', href: '/sermons', icon: Mic },
  { id: 'people', label: 'People', href: '/people', icon: Users },
  { id: 'giving', label: 'Giving', href: '/donations', icon: DollarSign },
];

interface CarbonSidebarProps {
  density: UiDensity;
  activeSection?: string;
}

export function CarbonSidebar({ density, activeSection }: CarbonSidebarProps) {
  const navTextStyle = getTypography('navItem', density);
  const navTextActiveStyle = getTypography('navItemActive', density);
  const itemPadding = density === 'elder' ? 'py-3 px-4' : 'py-2.5 px-4';

  return (
    <aside
      className={`
        fixed left-0 z-40
        ${layout.sidebar.width}
        ${colors.background.sidebar}
        border-r border-gray-200
        flex flex-col
      `}
      style={{
        top: density === 'elder' ? '3.5rem' : '3rem',
        height: density === 'elder' ? 'calc(100vh - 3.5rem)' : 'calc(100vh - 3rem)',
      }}
    >
      {/* Main navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            const Icon = item.icon;

            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3
                    ${itemPadding}
                    ${isActive ? navTextActiveStyle : navTextStyle}
                    ${isActive ? 'text-blue-600' : 'text-gray-700'}
                    ${isActive ? borders.left.primary : borders.left.neutral}
                    ${isActive ? 'bg-gray-50' : ''}
                    hover:bg-gray-50
                    transition-colors
                  `}
                >
                  <Icon
                    className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Settings at bottom */}
      <div className="border-t border-gray-200 py-4">
        <Link
          href="/settings"
          className={`
            flex items-center gap-3
            ${itemPadding}
            ${activeSection === 'settings' ? navTextActiveStyle : navTextStyle}
            ${activeSection === 'settings' ? 'text-blue-600' : 'text-gray-700'}
            ${activeSection === 'settings' ? borders.left.primary : borders.left.neutral}
            ${activeSection === 'settings' ? 'bg-gray-50' : ''}
            hover:bg-gray-50
            transition-colors
          `}
        >
          <Settings
            className={`h-5 w-5 ${activeSection === 'settings' ? 'text-blue-600' : 'text-gray-500'}`}
            aria-hidden="true"
          />
          <span>Settings</span>
        </Link>
      </div>
    </aside>
  );
}
