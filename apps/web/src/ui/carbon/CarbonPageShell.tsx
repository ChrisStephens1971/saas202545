'use client';

/**
 * CarbonPageShell
 *
 * Layout component that composes:
 * - CarbonTopBar (fixed at top)
 * - CarbonSidebar (left, below topbar)
 * - Main content area (scrollable, on the right)
 *
 * Respects UiDensity for base padding/font size.
 */

import { CarbonTopBar } from './CarbonTopBar';
import { CarbonSidebar } from './CarbonSidebar';
import { colors } from './tokens';
import type { UiDensity } from '@/config/uiShellVariant';

interface CarbonPageShellProps {
  children: React.ReactNode;
  density: UiDensity;
  activeSection?: string;
}

export function CarbonPageShell({
  children,
  density,
  activeSection,
}: CarbonPageShellProps) {
  const contentPadding = density === 'elder' ? 'p-8' : 'p-6';
  const topOffset = density === 'elder' ? 'pt-14' : 'pt-12';
  const sidebarOffset = 'pl-56'; // matches sidebar width

  return (
    <div className="min-h-screen">
      {/* Debug marker for DOM inspection */}
      <div data-carbon-debug="carbon-shell-active" className="hidden" />

      {/* Top bar */}
      <CarbonTopBar density={density} />

      {/* Sidebar */}
      <CarbonSidebar density={density} activeSection={activeSection} />

      {/* Main content area */}
      <main
        className={`
          ${topOffset}
          ${sidebarOffset}
          min-h-screen
          ${colors.background.page}
        `}
      >
        <div className={contentPadding}>{children}</div>
      </main>
    </div>
  );
}
