'use client';

/**
 * CarbonShellLayout
 *
 * Wrapper component that conditionally applies the Carbon shell
 * based on the NEXT_PUBLIC_CHURCH_UI_SHELL_VARIANT environment variable.
 *
 * Usage:
 *   <CarbonShellLayout activeSection="bulletins">
 *     <PageContent />
 *   </CarbonShellLayout>
 *
 * If variant !== 'carbon', children are returned unchanged.
 * If variant === 'carbon', children are wrapped in CarbonPageShell.
 *
 * See: docs/ui/CARBON-SHELL-EXPERIMENT.md
 */

import { getUiShellVariant, getUiDensity } from '@/config/uiShellVariant';
import { CarbonPageShell } from '@/ui/carbon';

interface CarbonShellLayoutProps {
  children: React.ReactNode;
  activeSection?: string;
}

export function CarbonShellLayout({
  children,
  activeSection,
}: CarbonShellLayoutProps) {
  const variant = getUiShellVariant();
  const density = getUiDensity();

  // If not carbon variant, return children unchanged
  if (variant !== 'carbon') {
    return <>{children}</>;
  }

  // Wrap in Carbon shell
  return (
    <CarbonPageShell density={density} activeSection={activeSection}>
      {children}
    </CarbonPageShell>
  );
}
