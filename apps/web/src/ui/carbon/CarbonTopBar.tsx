'use client';

/**
 * CarbonTopBar
 *
 * Thin horizontal bar at the top of the Carbon shell.
 * - Left: App name and tenant name placeholder
 * - Right: User avatar/initials placeholder
 */

import { Home, User } from 'lucide-react';
import { colors, getLayoutHeight, getTypography } from './tokens';
import type { UiDensity } from '@/config/uiShellVariant';

interface CarbonTopBarProps {
  density: UiDensity;
  appName?: string;
  tenantName?: string;
}

export function CarbonTopBar({
  density,
  appName = 'Elder-First',
  tenantName = 'Church Platform',
}: CarbonTopBarProps) {
  const height = getLayoutHeight('topbar', density);
  const textStyle = getTypography('body', density);

  return (
    <header
      className={`
        fixed top-0 left-0 right-0 z-50
        ${colors.background.topbar}
        ${height}
        flex items-center justify-between
        px-4
        border-b border-gray-200
      `}
    >
      {/* Left: App branding */}
      <div className="flex items-center gap-3">
        <Home className="h-5 w-5 text-blue-600" aria-hidden="true" />
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900">{appName}</span>
          <span className={`${colors.neutral.text400}`}>|</span>
          <span className={`${colors.neutral.text600} ${textStyle}`}>
            {tenantName}
          </span>
        </div>
      </div>

      {/* Right: User avatar placeholder */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          className={`
            flex items-center justify-center
            h-8 w-8
            rounded-full
            bg-gray-100
            hover:bg-gray-200
            transition-colors
          `}
          aria-label="User menu"
        >
          <User className="h-4 w-4 text-gray-600" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
